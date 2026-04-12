# FounderLink — Complete Codebase Documentation

> A deep-dive into the architecture, execution flow, technology stack, and CI/CD pipeline of the FounderLink microservices platform.

---

## Table of Contents

1. [Codebase Execution Flow — Start to Finish](#1-codebase-execution-flow--start-to-finish)
   - 1.1 [Infrastructure Boot Sequence](#11-infrastructure-boot-sequence)
   - 1.2 [Service Startup Sequence](#12-service-startup-sequence)
   - 1.3 [Request Lifecycle — User Registration](#13-request-lifecycle--user-registration)
   - 1.4 [Request Lifecycle — Authenticated API Call](#14-request-lifecycle--authenticated-api-call)
   - 1.5 [Event-Driven Flows via RabbitMQ](#15-event-driven-flows-via-rabbitmq)
   - 1.6 [Inter-Service Communication via Feign](#16-inter-service-communication-via-feign)
2. [Technologies Used — Explanations & Where They're Used](#2-technologies-used--explanations--where-theyre-used)
   - 2.1 [Core Backend](#21-core-backend)
   - 2.2 [Spring Cloud Ecosystem](#22-spring-cloud-ecosystem)
   - 2.3 [Security & Authentication](#23-security--authentication)
   - 2.4 [Messaging & Caching](#24-messaging--caching)
   - 2.5 [Persistence](#25-persistence)
   - 2.6 [Observability & Monitoring](#26-observability--monitoring)
   - 2.7 [Frontend](#27-frontend)
   - 2.8 [Testing](#28-testing)
   - 2.9 [Infrastructure & Containerisation](#29-infrastructure--containerisation)
3. [CI/CD Pipeline — How It Was Built](#3-cicd-pipeline--how-it-was-built)
   - 3.1 [Pipeline Overview](#31-pipeline-overview)
   - 3.2 [Main Pipeline — Jenkinsfile](#32-main-pipeline--jenkinsfile)
   - 3.3 [Monitoring Pipeline — Jenkinsfile.monitoring](#33-monitoring-pipeline--jenkinsfilemonitoring)
   - 3.4 [Docker Image Strategy](#34-docker-image-strategy)
   - 3.5 [Rollback Mechanism](#35-rollback-mechanism)

---

## 1. Codebase Execution Flow — Start to Finish

### 1.1 Infrastructure Boot Sequence

Before any application service starts, the infrastructure layer must be healthy. This is managed by `docker-compose.infra.yml`.

```
docker compose -f docker-compose.infra.yml up -d
```

Boot order and what starts:

| Container | Role | Health Check |
|---|---|---|
| `auth-db` | MySQL 8.0 for auth-service | `mysqladmin ping` |
| `user-db` | MySQL 8.0 for user-service | `mysqladmin ping` |
| `startup-db` | MySQL 8.0 for startup-service | `mysqladmin ping` |
| `investment-db` | MySQL 8.0 for investment-service | `mysqladmin ping` |
| `team-db` | MySQL 8.0 for team-service | `mysqladmin ping` |
| `messaging-db` | MySQL 8.0 for messaging-service | `mysqladmin ping` |
| `notification-db` | MySQL 8.0 for notification-service | `mysqladmin ping` |
| `payment-db` | MySQL 8.0 for payment-service | `mysqladmin ping` |
| `wallet-db` | MySQL 8.0 for wallet-service | `mysqladmin ping` |
| `redis` | Shared Redis cache | — |
| `rabbitmq` | Message broker for all async events | — |

Each MySQL instance is a completely isolated database — this enforces the **database-per-service** pattern, where no two services share a schema or connection pool. All databases are backed by named Docker volumes so data persists across container restarts.

---

### 1.2 Service Startup Sequence

```
docker compose -f docker-compose.services.yml up -d
```

Services start in the following logical order (Docker Compose resolves dependencies):

```
Config-Server (8888)
       ↓
Eureka Server (8761)
       ↓
All domain microservices (parallel)
       ↓
API Gateway (8090)  ← only port exposed to outside world
```

**Step-by-step what happens when a service starts:**

1. **JVM boots** → Spring Boot `main()` method runs.
2. **Config Client activates** → The service calls `http://config-server:8888/<service-name>/default` to fetch its full `application.yml` config from the GitHub config repo (`https://github.com/JammyParth/founderlink_config`). This includes DB URLs, RabbitMQ credentials, JWT secrets, Resilience4j settings, etc.
3. **DataSource initialises** → Spring Data JPA connects to the service's dedicated MySQL database. Hibernate runs `ddl-auto: update` to sync the schema.
4. **RabbitMQ bindings created** → Each service that publishes or consumes events declares its queues, exchanges, and binding keys on startup.
5. **Eureka registration** → The service sends a heartbeat to `http://eureka-server:8761/eureka/` and registers its hostname and port. All other services can now discover it by logical name.
6. **Redis connection** → Services that use Redis (user-service, investment-service, notification-service, wallet-service) establish a connection pool to `redis:6379`.
7. **Actuator endpoints go live** → `/actuator/health`, `/actuator/prometheus`, `/actuator/info` become available for Prometheus scraping and health checks.
8. **Admin seed runs** (auth-service only) → If `SEED_ADMIN_ENABLED=true`, a default admin account is created in the auth DB on first startup.

---

### 1.3 Request Lifecycle — User Registration

This is the most complex flow, involving synchronous Feign calls and asynchronous RabbitMQ events.

```
Angular Frontend (POST /auth/register)
         │
         ▼
  API Gateway (8090)
  ┌─────────────────────────────────────┐
  │ AuthenticationFilter (GlobalFilter) │
  │  → RouteValidator: /auth/register   │
  │    is a PUBLIC endpoint → skip JWT  │
  │  → Forward request to auth-service  │
  └─────────────────────────────────────┘
         │  lb://auth-service (Eureka resolves → 8089)
         ▼
  auth-service
  ┌──────────────────────────────────────────────────────┐
  │ AuthController → AuthService.register()              │
  │  1. Check email uniqueness in auth DB                │
  │  2. Hash password with BCrypt                        │
  │  3. Persist User entity to auth_service_db (MySQL)   │
  │  4. SyncService.syncUser() → Feign call to           │
  │     user-service POST /users/internal                │
  │     (with X-Internal-Secret header)                  │
  │     + Resilience4j Retry (3 attempts, exponential)   │
  │     + Circuit Breaker (fallback on failure)          │
  │  5. Publish UserRegisteredEvent to RabbitMQ          │
  │     Exchange: founderlink.exchange                   │
  │     Routing key: user.registered                     │
  │  6. Return RegisterResponse (email, role)            │
  └──────────────────────────────────────────────────────┘
         │ (async, via RabbitMQ)
         ▼
  notification-service
  ┌──────────────────────────────────────────────┐
  │ Listens on queue bound to user.registered    │
  │  → Creates welcome notification in DB        │
  │  → Sends welcome email via EmailService      │
  └──────────────────────────────────────────────┘
```

---

### 1.4 Request Lifecycle — Authenticated API Call

Example: `GET /investments/my` (investor fetching their investments)

```
Angular Frontend
  → Attaches JWT in Authorization: Bearer <token> header
         │
         ▼
  API Gateway (8090)
  ┌──────────────────────────────────────────────────────┐
  │ AuthenticationFilter                                 │
  │  1. RouteValidator: /investments/** → SECURED        │
  │  2. Extract Bearer token from header                 │
  │  3. JwtService.validateToken() → parse claims        │
  │  4. RbacService.isAuthorized(role, path, method)     │
  │     → checks RBAC rules from config                  │
  │  5. HeaderService.mutateRequest()                    │
  │     → injects X-User-Id, X-User-Role headers        │
  │     downstream so services don't re-validate JWT     │
  │  6. Forward to investment-service lb://              │
  └──────────────────────────────────────────────────────┘
         │  lb://investment-service (Eureka resolves → 8084)
         ▼
  investment-service
  ┌──────────────────────────────────────────────────────┐
  │ InvestmentController → InvestmentQueryService        │
  │  → reads X-User-Id from header (no JWT re-parse)     │
  │  → queries investment DB for user's investments      │
  │  → Feign call to startup-service for startup details │
  │    (with circuit breaker + fallback)                 │
  │  → returns InvestmentResponseDto list                │
  └──────────────────────────────────────────────────────┘
         │  response
         ▼
  API Gateway → Angular Frontend
```

**Key security principle:** The JWT is only validated once at the Gateway. Downstream services trust the injected `X-User-Id` / `X-User-Role` headers. Internal service-to-service calls that bypass the gateway use the `X-Internal-Secret` header for authentication.

---

### 1.5 Event-Driven Flows via RabbitMQ

All asynchronous operations are handled through a single topic exchange (`founderlink.exchange`) with routing keys. The notification-service is the primary consumer but other services also listen.

| Event | Publisher | Routing Key | Consumer(s) |
|---|---|---|---|
| User registered | auth-service | `user.registered` | notification-service |
| Password reset requested | auth-service | `password.reset` | notification-service |
| Investment approved | investment-service | `investment.approved` | notification-service |
| Investment rejected | investment-service | `investment.rejected` | notification-service |
| Team member accepted | team-service | `team.member.accepted` | notification-service |
| Team member rejected | team-service | `team.member.rejected` | notification-service |
| Payment completed | payment-service | `payment.completed` | notification-service, wallet-service |
| Payment failed | payment-service | `payment.failed` | notification-service |

**Flow example — Investment Approved:**
```
investor-service publishes InvestmentApprovedEvent
        ↓ (RabbitMQ routing)
notification-service consumer
  → createNotification(investorId, "INVESTMENT_APPROVED", message)
  → send email via EmailService
  → persist Notification entity to notification DB
```

---

### 1.6 Inter-Service Communication via Feign

Feign clients make synchronous HTTP calls between services. Every Feign call is protected by:
- **Circuit Breaker** (Resilience4j) — opens after repeated failures, routes to fallback
- **Retry** — retries on transient network errors with exponential backoff
- **Timeout** — connect timeout 2s, read timeout 5s

| Caller | Target | What It Calls | Fallback Behaviour |
|---|---|---|---|
| auth-service | user-service | `POST /users/internal` — sync new user | Throws `UserServiceUnavailableException` |
| investment-service | startup-service | `GET /startup/{id}` — get startup details | Returns empty/null StartupResponseDto |
| notification-service | user-service | `GET /users/{id}` — get user details for email | Returns null, skips email personalisation |
| notification-service | startup-service | `GET /startup/{id}` — startup details for notification | Returns null, uses generic message |
| wallet-service | payment-service | Payment verification calls | Throws exception, transaction rolls back |

---

## 2. Technologies Used — Explanations & Where They're Used

### 2.1 Core Backend

#### Java 21
**What it is:** The language runtime for all 10+ backend services.

**Why Java 21:** Leverages virtual threads (Project Loom), modern switch expressions, records, and sealed classes. Spring Boot 3.x requires Java 17+ and is fully optimised for Java 21.

**Where used:** Every service under `auth-service/`, `user-service/`, `startup-service/`, `investment-service/`, `team-service/`, `messaging-service/`, `notification-service/`, `payment-service/`, `wallet-service/`, `api-gateway/`, `Config-Server/`, `eureka-server/`.

---

#### Spring Boot 3.5.11
**What it is:** An opinionated framework that auto-configures a production-ready Spring application with embedded Tomcat/Netty and a massive ecosystem of starters.

**Why Spring Boot:** Eliminates boilerplate configuration. A `@SpringBootApplication` class and a `pom.xml` is all that's needed to get a fully functional web service with DB connectivity, security, metrics, and health checks.

**Where used:** Every service's `pom.xml` has `spring-boot-starter-parent` as parent. Key starters used per service:

| Starter | Services using it | What it provides |
|---|---|---|
| `spring-boot-starter-web` | All services except api-gateway | Embedded Tomcat, `@RestController`, JSON serialisation |
| `spring-boot-starter-webflux` | api-gateway | Reactive (Netty) engine for non-blocking I/O |
| `spring-boot-starter-data-jpa` | All domain services | Hibernate ORM, `@Repository`, `@Entity` support |
| `spring-boot-starter-security` | auth-service, api-gateway | Filter chain, BCrypt, `SecurityConfig` |
| `spring-boot-starter-amqp` | auth, user, investment, team, payment, notification | RabbitMQ `RabbitTemplate` + `@RabbitListener` |
| `spring-boot-starter-validation` | All services | Bean Validation (`@NotBlank`, `@Email`, etc.) |
| `spring-boot-starter-actuator` | All services | `/actuator/health`, `/actuator/prometheus` endpoints |

---

#### Lombok
**What it is:** A compile-time annotation processor that generates boilerplate Java code (getters, setters, constructors, builders, loggers).

**Why used:** Cuts down on repetitive code — a `@Data` annotation on a DTO replaces 50+ lines of getters/setters/`equals`/`hashCode`.

**Key annotations used:**
- `@RequiredArgsConstructor` — generates constructor-based dependency injection (used in every service class)
- `@Builder` — used on event DTOs like `UserRegisteredEvent`, `RegisterResponse`
- `@Slf4j` — injects a `log` field

**Where used:** All backend services — every entity, DTO, and service class.

---

#### ModelMapper 3.1.1
**What it is:** A library that automatically maps fields between two object types (e.g., `User` entity → `UserResponseDto`).

**Why used:** Eliminates manual field-by-field mapping code. A single `modelMapper.map(entity, Dto.class)` call handles the conversion.

**Where used:** `User-Service` (`ModelMapperConfig.java`), `notification-service`, `wallet-service` — anywhere that converts between JPA entities and API response DTOs.

---

#### SpringDoc OpenAPI 2.8.8
**What it is:** Auto-generates interactive Swagger UI and OpenAPI 3.0 JSON from Spring controllers and DTOs using reflection.

**Why used:** Every service gets a live API explorer at `/swagger-ui.html` with zero manual documentation effort. The API Gateway aggregates all service docs.

**Where used:** All domain services and `api-gateway` (uses the `webflux` variant for the reactive gateway). Swagger routes are configured in `config-repo/api-gateway.yml` to rewrite paths like `/auth/v3/api-docs/**`.

---

### 2.2 Spring Cloud Ecosystem

#### Spring Cloud Config Server & Client (2025.0.1)
**What it is:** A central server that serves YAML/properties configuration files to all client services. Config files live in a separate Git repository.

**Why used:** Centralises all environment-specific config (DB URLs, secrets, timeouts) in one place. Services fetch config at startup rather than bundling it in their Docker images — enabling config changes without rebuilding.

**How it works:**
1. `Config-Server` (port 8888) points to `https://github.com/JammyParth/founderlink_config`
2. On startup, `auth-service` calls `http://config-server:8888/auth-service/default`
3. Config Server fetches `auth-service.yml` and `application.yml` from GitHub and serves them
4. The service merges these with its local `bootstrap.yml`

**Where used:**
- **Server:** `Config-Server/` — `@EnableConfigServer` in main class, Git URI configured in `application.yml`
- **Client:** Every other service via `spring-cloud-starter-config` dependency and `spring.config.import: configserver:http://config-server:8888` in their bootstrap config

**Config files in `config-repo/`:**

| File | Purpose |
|---|---|
| `application.yml` | Shared config: RabbitMQ, Eureka, Redis, Actuator, Zipkin, logging |
| `auth-service.yml` | Port 8089, JWT settings, DB URL, seed admin, Resilience4j |
| `api-gateway.yml` | Port 8090, all route definitions, CORS config |
| `user-service.yml` | Port 8082, Redis cache config |
| `investment-service.yml` | Port 8084, Feign timeouts |
| `*-service.yml` | Per-service port, DB URL, any service-specific configuration |

---

#### Spring Cloud Netflix Eureka
**What it is:** A service registry — a directory where all microservices announce their address and health status. Other services look up logical names (e.g., `startup-service`) rather than hardcoded IPs.

**Why used:** In a Docker/cloud environment, containers can restart with new IP addresses. Eureka decouples service consumers from specific host:port values.

**How it works:**
1. `eureka-server` (port 8761) runs as the registry
2. Every service has `spring-cloud-starter-netflix-eureka-client` — on startup, it registers `instanceId`, `hostname`, `port`, and `health-check-url`
3. The API Gateway uses `lb://auth-service` URIs — Spring Cloud LoadBalancer resolves `auth-service` through Eureka to get actual instances
4. Heartbeats are sent every 30s; stale registrations expire

**Where used:**
- **Server:** `eureka-server/` — `@EnableEurekaServer`
- **Client:** All services — `eureka.client.service-url.defaultZone: http://eureka-server:8761/eureka/`

---

#### Spring Cloud Gateway
**What it is:** A reactive (Project Reactor / Netty) API gateway built on Spring WebFlux. Routes HTTP requests to downstream services based on path predicates.

**Why used:** Single entry point for all client traffic. Handles JWT validation, RBAC, CORS, and request mutation before forwarding — so individual services don't need to implement these cross-cutting concerns.

**Key components in `api-gateway/`:**

| Class | Role |
|---|---|
| `AuthenticationFilter` | Global pre-filter — validates JWT, checks RBAC, injects user headers |
| `RouteValidator` | Determines if a path requires authentication (public vs secured) |
| `JwtService` | Parses and validates JWT tokens using the shared `JWT_SECRET` |
| `RbacService` | Checks role-based access using `RbacProperties` from config |
| `HeaderService` | Mutates the downstream request — adds `X-User-Id`, `X-User-Role` |

**Route configuration (in `config-repo/api-gateway.yml`):**
```yaml
- id: auth-service
  uri: lb://auth-service        # lb:// = load-balanced via Eureka
  predicates:
    - Path=/auth/**             # all /auth/* requests go to auth-service
```

**Where used:** `api-gateway/` only.

---

#### OpenFeign (Spring Cloud OpenFeign)
**What it is:** A declarative HTTP client. You define an interface with `@FeignClient` and `@GetMapping`/`@PostMapping` methods, and Spring generates the implementation at runtime.

**Why used:** Makes inter-service REST calls look like local Java method calls. Integrates natively with Eureka (resolves service names) and Resilience4j (circuit breaker wrapping).

**Example from `investment-service`:**
```java
@FeignClient(name = "startup-service", fallback = StartupServiceClientFallback.class)
public interface StartupServiceClient {
    @GetMapping("/startup/{id}")
    StartupResponseDto getStartupById(@PathVariable Long id);
}
```

**Where used:**
- `auth-service` → calls `user-service` (`UserClient`)
- `investment-service` → calls `startup-service` (`StartupServiceClient`)
- `notification-service` → calls `user-service` + `startup-service`
- `wallet-service` → calls `payment-service`

---

#### Resilience4j
**What it is:** A fault-tolerance library that provides Circuit Breaker, Retry, Rate Limiter, and Bulkhead patterns as Java annotations.

**Why used:** Prevents cascading failures. If `user-service` is down, `auth-service` shouldn't hang indefinitely or fail every request — the circuit breaker opens, routes to a fallback, and allows the system to degrade gracefully.

**Patterns used:**

| Pattern | Annotation | Configuration |
|---|---|---|
| **Retry** | `@Retry(name = "userServiceSync")` | 3 attempts, 1s wait, exponential backoff (×2) |
| **Circuit Breaker** | `@CircuitBreaker(name = "userServiceSync")` | Opens after repeated failures, half-open recovery |

**Where used:** `auth-service` (`SyncService`), `investment-service` (`InvestmentCommandService`), `notification-service` (`NotificationService`).

---

### 2.3 Security & Authentication

#### Spring Security
**What it is:** The standard security framework for Spring applications — provides authentication, authorisation, filter chains, and cryptography utilities.

**Where used:**
- **`auth-service`** — Full `SecurityConfig` with `UsernamePasswordAuthenticationToken` flow, BCrypt password encoding, `CustomUserDetailsService` loading users from DB, `JwtAuthFilter` for stateless API endpoints
- **`api-gateway`** — Spring Security integrated with WebFlux (reactive); the `AuthenticationFilter` handles gateway-level JWT validation and CORS

---

#### JWT (jjwt 0.12.5)
**What it is:** JSON Web Tokens — a compact, URL-safe method of representing claims between two parties. A JWT is digitally signed with a secret (HMAC-SHA256) so its integrity can be verified without a database lookup.

**How it's used in FounderLink:**
1. On login, `auth-service` generates a short-lived **access token** (15 minutes) and a long-lived **refresh token** (30 days)
2. The access token contains claims: `userId`, `email`, `role`
3. The refresh token is stored as an HttpOnly cookie (`/auth` path, `SameSite=None; Secure`)
4. The API Gateway validates every access token using `JwtService` (shared `JWT_SECRET` from env)
5. On token expiry, the frontend hits `/auth/refresh` — auth-service validates the refresh cookie and issues a new access token

**Where used:** `auth-service` (`JwtService`, `RefreshTokenService`, `RefreshTokenRepository`), `api-gateway` (`JwtService`)

---

#### BCrypt Password Encoding
**What it is:** An adaptive one-way hash algorithm for passwords. The "adaptive" nature means the cost factor can be increased as hardware gets faster.

**Where used:** `auth-service` — `PasswordEncoder` bean configured in `SecurityConfig`, used in `AuthService.register()` to hash passwords before saving to DB.

---

#### RBAC (Role-Based Access Control)
**What it is:** Controls which HTTP endpoints each user role can access.

**How implemented:** `RbacProperties` loads role-permission mappings from config. The `RbacService` checks `(role, path, method)` triples against these rules. The gateway enforces this before forwarding any request.

**Roles defined:** `FOUNDER`, `INVESTOR`, `COFOUNDER`, `ADMIN`

**Where used:** `api-gateway` (`RbacService`, `RbacProperties`, `Role` enum), `config-repo/api-gateway.yml` (RBAC rules in config)

---

### 2.4 Messaging & Caching

#### RabbitMQ (Spring AMQP)
**What it is:** A message broker implementing the AMQP (Advanced Message Queuing Protocol). Publishers send messages to an exchange with a routing key; RabbitMQ routes them to bound queues; consumers read from queues.

**Why used:** Decouples services. When a user registers, `auth-service` doesn't need to wait for `notification-service` to send a welcome email. The event is published to RabbitMQ and auth-service returns immediately. Notification-service processes it asynchronously.

**Topology used:**
- **Exchange type:** Topic (`founderlink.exchange`) — routes by routing key patterns
- **Publishers:** `auth-service` (`UserRegisteredEventPublisher`, `PasswordResetEventPublisher`), `investment-service`, `team-service`, `payment-service`
- **Consumers:** `notification-service` (primary consumer for all events), `wallet-service` (payment events)

**How consumers are defined:**
```java
@RabbitListener(queues = "user.registered.queue")
public void handleUserRegistered(UserRegisteredEvent event) { ... }
```

**Where used:** `auth-service`, `investment-service`, `team-service`, `payment-service`, `messaging-service`, `notification-service`, `wallet-service`

---

#### Redis (Spring Data Redis)
**What it is:** An in-memory data structure store used as a distributed cache. Dramatically reduces database load for frequently read data.

**Why used:** User lookups (`GET /users/{id}`) are called from multiple services (investment-service, notification-service, team-service all call user-service via Feign). Redis caches these responses so repeated calls return in microseconds instead of hitting MySQL.

**Cache regions used:**

| Cache Name | Service | TTL | What's Cached |
|---|---|---|---|
| `userById` | user-service | 600s | Single user by ID |
| `allUsers` | user-service | 600s | All users list |
| `usersByRole` | user-service | 600s | Users filtered by role |

**Cache invalidation:** Uses `@CacheEvict` on write operations (create, update) to ensure stale data is flushed.

**Where used:** `User-Service` (`RedisConfig`, `UserQueryService` with `@Cacheable`), `investment-service` (`RedisConfig`), `wallet-service` (`RedisConfig`), `notification-service`

---

### 2.5 Persistence

#### MySQL 8.0 (Spring Data JPA / Hibernate)
**What it is:** A relational database management system. Spring Data JPA provides a repository abstraction over Hibernate ORM.

**Database-per-service pattern:** Each service has its own MySQL container and schema — they never share tables or join across databases. This enables independent scaling, deployment, and schema evolution per service.

| Database | Service | Key Tables |
|---|---|---|
| `auth_service_db` | auth-service | `users`, `refresh_tokens`, `password_reset_pins` |
| `user_db` | user-service | `users` (profile data) |
| `startup_db` | startup-service | `startups` |
| `investment_db` | investment-service | `investments` |
| `team_db` | team-service | `teams`, `team_members` |
| `messaging_db` | messaging-service | `messages` |
| `notification_db` | notification-service | `notifications` |
| `payment_db` | payment-service | `payments` |
| `wallet_db` | wallet-service | `wallets`, `wallet_transactions` |

**Where used:** All domain services via `spring-boot-starter-data-jpa` + `mysql-connector-j`.

---

#### H2 (Test Profile)
**What it is:** An in-memory relational database that runs inside the JVM — no external process needed.

**Why used:** Unit and integration tests use H2 instead of MySQL. This means tests run without any Docker infrastructure, making them fast and portable (including in CI/CD).

**Where used:** All services' `test/resources/application.yml` files — H2 replaces MySQL; Spring Cloud Config and Eureka are disabled in the test profile.

---

#### CQRS Pattern (Command Query Responsibility Segregation)
**What it is:** An architectural pattern that separates read operations (queries) from write operations (commands) into distinct classes/methods.

**Why used:** Write operations invalidate caches; read operations leverage caching. Keeping them separate makes cache management predictable and the code cleaner.

**Implementation:**
- **Command side:** `UserCommandService`, `NotificationCommandService`, `WalletCommandService` — handle creates/updates, use `@CacheEvict`
- **Query side:** `UserQueryService`, `NotificationQueryService`, `WalletQueryService` — handle reads, use `@Cacheable`
- **Facade:** `UserService`, `NotificationService`, `WalletService` — preserve the public API contract, delegate to command/query sides

**Where used:** `User-Service`, `notification-service`, `wallet-service`

---

### 2.6 Observability & Monitoring

#### Prometheus
**What it is:** A time-series metrics database that scrapes HTTP endpoints at regular intervals and stores the data. Used for alerting and feeding Grafana dashboards.

**How it's configured:** `prometheus.yml` defines a `scrape_config` for every service:
```yaml
- job_name: auth-service
  metrics_path: /actuator/prometheus
  static_configs:
    - targets: ['auth-service:8089']
```

Prometheus scrapes every 15 seconds (`scrape_interval: 15s`).

**Where used:** `prometheus.yml`, `docker-compose.monitoring.yml` (port 9090)

---

#### Grafana
**What it is:** A visualisation and analytics platform. Connects to Prometheus (metrics) and Loki (logs) as data sources and renders dashboards.

**Where used:** `docker-compose.monitoring.yml` (port 3000). Dashboard provisioning configs live in `grafana/provisioning/`. Login credentials injected via `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` env vars.

---

#### Loki
**What it is:** A horizontally-scalable log aggregation system by Grafana Labs. Unlike Elasticsearch, it indexes only metadata (labels), not the full log text — making it very storage-efficient.

**Where used:** `docker-compose.monitoring.yml`, `promtail-config.yml`. Logs from all services are shipped to Loki and queryable in Grafana using LogQL.

---

#### Promtail
**What it is:** The log shipping agent for Loki. It reads log files, attaches labels (e.g., `service: auth-service`), and pushes them to Loki.

**How it works:** All services write logs to a shared Docker volume (`service-logs`) at `/var/log/founderlink/<service-name>.log`. Promtail mounts this volume (read-only) and tails each file.

**`promtail-config.yml` example:**
```yaml
- job_name: auth-service
  static_configs:
    - targets: [localhost]
      labels:
        service: auth-service
        __path__: /var/log/founderlink/auth-service.log
```

**Where used:** `docker-compose.monitoring.yml`, `promtail-config.yml`

---

#### Micrometer + Zipkin (Distributed Tracing)
**What it is:** Distributed tracing assigns a unique `traceId` to every incoming request. As the request flows through multiple services, all spans are tagged with the same `traceId`, enabling end-to-end request tracking.

**How configured:** `micrometer-tracing-bridge-brave` (Brave implementation), `zipkin-reporter-brave` (sends traces to Zipkin). Configured in `application.yml`:
```yaml
management:
  tracing:
    sampling:
      probability: 1.0   # trace 100% of requests
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

**Where used:** All services (`application.yml` in `config-repo`). Zipkin UI available at port 9411.

---

#### Spring Boot Actuator
**What it is:** Provides production-ready HTTP endpoints for health checks, metrics, info, and environment inspection.

**Endpoints exposed:**

| Endpoint | Purpose |
|---|---|
| `/actuator/health` | Service health status (DB, RabbitMQ, Eureka connectivity) |
| `/actuator/prometheus` | Prometheus metrics in plain-text format |
| `/actuator/info` | Application version and metadata |

**Where used:** All services — enabled via `management.endpoints.web.exposure.include: health, info, prometheus` in `config-repo/application.yml`

---

### 2.7 Frontend

#### Angular 21 + TypeScript 5.9
**What it is:** A component-based SPA (Single Page Application) framework. TypeScript adds static typing to JavaScript.

**Where used:** `founderlink-frontend/` — renders all user-facing pages. Communicates with the platform exclusively through the API Gateway at `http://localhost:8090`.

**Feature modules in `src/app/features/`:**

| Module | Corresponding Backend Service |
|---|---|
| `auth/` | auth-service |
| `dashboard/` | Multiple services |
| `investments/` | investment-service |
| `messages/` | messaging-service |
| `notifications/` | notification-service |
| `payments/` | payment-service |
| `profile/` | user-service |
| `startups/` | startup-service |
| `team/` | team-service |
| `wallet/` | wallet-service |

---

#### RxJS 7.8
**What it is:** A reactive programming library using Observables. Angular uses it for HTTP calls, event streams, forms, and routing.

**Where used:** `founderlink-frontend/` — all HTTP calls via Angular's `HttpClient` return `Observable<T>`. Used for auth token refresh interceptors, real-time notification polling.

---

#### Vitest
**What it is:** A Vite-native unit testing framework — fast, compatible with Jest's API.

**Where used:** `founderlink-frontend/` — frontend unit tests.

---

### 2.8 Testing

#### JUnit 5 + Mockito
**What it is:** JUnit 5 is the standard Java testing framework. Mockito creates mock objects so you can test classes in isolation without starting the full Spring context.

**Where used:** All backend services under `src/test/java/`.

---

#### JaCoCo 0.8.12
**What it is:** Java Code Coverage library — instruments bytecode to track which lines are executed during tests, generating HTML/XML coverage reports.

**Targets:**
- `auth-service`: ≥ 90% instruction coverage
- `user-service`: ≥ 90% instruction coverage

**How to generate:**
```bash
cd auth-service
./mvnw test jacoco:report
# Report: target/site/jacoco/index.html
```

**Where used:** `auth-service/pom.xml`, `user-service/pom.xml` — JaCoCo plugin configured in the `<build>` section with coverage enforcement rules.

---

#### Spring Boot Test / MockMvc / WebMvcTest
**What it is:** Spring's testing support — `@SpringBootTest` loads the full context; `@WebMvcTest` loads only the web layer with mocked services; `MockMvc` lets you send HTTP requests to controllers without a real server.

**Where used:** `auth-service` integration tests, `User-Service` controller tests.

---

### 2.9 Infrastructure & Containerisation

#### Docker
**What it is:** A containerisation platform. Each service is packaged with its JRE and app JAR into a portable image.

**Multi-stage Dockerfile pattern used by all services:**
```dockerfile
# Stage 1: Build
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline      # cache dependencies layer
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime (smaller image — no Maven/compiler)
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

**JVM flags explained:**
- `-XX:+UseContainerSupport` — JVM reads CPU/memory limits from Docker cgroups instead of the host machine
- `-XX:MaxRAMPercentage=75.0` — cap heap at 75% of the container's memory limit

**Where used:** Every service has a `Dockerfile` in its root directory.

---

#### Docker Compose
**What it is:** A tool for defining and running multi-container Docker applications using YAML files.

**Three-file split:**

| File | Contents | When to start |
|---|---|---|
| `docker-compose.infra.yml` | MySQL DBs, Redis, RabbitMQ | First — always required |
| `docker-compose.services.yml` | All 12 microservices | Second — after infra is healthy |
| `docker-compose.monitoring.yml` | Prometheus, Grafana, Loki, Promtail, Zipkin | Optional — for observability |

**Networks:**
- `founderlink-internal` — private Docker network for service-to-service communication (no external access)
- `proxy-net` — exposed network, only `api-gateway` (8090), `prometheus` (9090), and `grafana` (3000) are attached

---

#### Maven (Maven Wrapper)
**What it is:** Java's standard build tool. Each service has `mvnw` / `mvnw.cmd` (Maven Wrapper) so no system Maven installation is required.

**Key lifecycle phases used:**
- `mvn dependency:go-offline` — pre-download all dependencies into the Docker cache layer
- `mvn clean package -DskipTests` — compile and package JAR (tests run separately by Jenkins)
- `mvn test` — run unit + integration tests
- `mvn jacoco:report` — generate coverage HTML report

---

## 3. CI/CD Pipeline — How It Was Built

### 3.1 Pipeline Overview

The CI/CD system is built with **Jenkins** and **Docker Hub**. There are two separate pipelines:

| Pipeline | File | Trigger | Purpose |
|---|---|---|---|
| **Main** | `Jenkinsfile` | Git push to any branch | Build, test, push, deploy backend services |
| **Monitoring** | `Jenkinsfile.monitoring` | Git push affecting monitoring config | Deploy observability stack |

---

### 3.2 Main Pipeline — Jenkinsfile

The main pipeline has **9 stages** and implements three operating modes: **Normal Build**, **Force Build**, and **Rollback**.

#### Pipeline Parameters

```groovy
parameters {
    booleanParam(name: 'ROLLBACK',    defaultValue: false)
    string(name:  'ROLLBACK_TAG',     defaultValue: '')
    booleanParam(name: 'FORCE_BUILD', defaultValue: false)
}
```

---

#### Stage 1: Checkout

```groovy
stage('Checkout') {
    checkout scm
    env.COMMIT_TAG = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
}
```

- Checks out the source code from Git
- Captures the short Git commit SHA (e.g., `a3f91c2`) as the Docker image tag
- This tag is used throughout to uniquely identify this build's images

---

#### Stage 2: Rollback Mode (conditional)

If `ROLLBACK=true`:
- Skips all build/test/push stages
- Sets `COMMIT_TAG = ROLLBACK_TAG` (the target historical tag)
- Marks all services for deployment — so the previously-pushed images at that tag are re-deployed

---

#### Stage 3: Detect Changed Services

**This is the most important stage for efficiency.** It uses git diff to determine which services actually changed and only rebuilds those.

```
git diff --name-only FETCH_HEAD HEAD
```

The output (changed file paths) is mapped to service names:

```
auth-service/...        → rebuild auth-service
user-service/...        → rebuild user-service
config-repo/...         → restart config-server (picks up new config)
api-gateway/...         → rebuild api-gateway
... etc
```

Results are written to plain-text pipeline state files:
- `.pipeline_services` — comma-separated app services to build/deploy
- `.pipeline_infra` — infrastructure services (config-server, eureka-server)
- `.pipeline_restart` — services to restart (not rebuild) because config changed
- `.pipeline_skip` — `true` if nothing changed (skips all downstream stages)

**Edge cases handled:**
- First build (no previous commit): all files treated as changed
- Can't fetch previous commit: full rebuild
- Same SHA twice: skip (no new commits)
- Only frontend files changed: skip backend pipeline

---

#### Stage 4: Run Tests

For each changed service, runs:
```bash
cd <service> && chmod +x mvnw && ./mvnw test
```

Tests run **sequentially** (not in parallel) to prevent OOM crashes — each Spring Boot test context needs 300-500MB RAM. Tests use the H2 in-memory DB profile so no external infrastructure is needed.

Failures are soft — the pipeline uses `|| echo "Tests failed"` so a single failing service doesn't block the deploy of other services.

---

#### Stage 5: Build Images

For each changed service:
```bash
docker pull founderlink/<service>:cache || true
docker build \
  --cache-from founderlink/<service>:cache \
  -t founderlink/<service>:<commit-sha> \
  ./<service>
```

**Cache strategy:** The `:cache` tag on Docker Hub stores the last successful build's layers. `--cache-from` means unchanged layers (e.g., Maven dependencies) are reused, dramatically speeding up builds.

The multi-stage Dockerfile means the `RUN mvn dependency:go-offline` layer is only invalidated when `pom.xml` changes.

---

#### Stage 6: Push Images

**Two-phase push:**

Phase 1 — Commit-tagged images pushed **in parallel** (fast):
```bash
docker push founderlink/<service>:<commit-sha>
```

Phase 2 — Cache tags updated **sequentially** (safe, avoids race conditions):
```bash
docker tag founderlink/<service>:<commit-sha> founderlink/<service>:cache
docker push founderlink/<service>:cache
```

Docker Hub credentials are injected securely from Jenkins credentials store (`dockerhub-creds`) using `withCredentials` — the password is never printed to logs.

---

#### Stage 7: Prepare Environment

```groovy
withCredentials([file(credentialsId: 'env-file', variable: 'ENV_FILE')]) {
    sh 'cp $ENV_FILE .env'
}
```

The `.env` file (containing all secrets) is stored as a Jenkins **secret file** credential — never committed to Git. It's copied to the workspace just before deployment.

---

#### Stage 8: Deploy

Three conditional deployment sub-stages:

**Deploy Infrastructure Services** (config-server, eureka-server if changed):
```bash
export TAG=<commit-sha>
docker compose -f docker-compose.services.yml up -d --no-deps --force-recreate <service>
```

**Deploy Application Services** (all domain microservices that changed):
```bash
docker compose -f docker-compose.services.yml pull <service>
docker compose -f docker-compose.services.yml up -d --no-deps --force-recreate <service>
```

**Restart Config Services** (if only `config-repo/` changed — no rebuild needed, just restart to pick up new config):
```bash
docker compose -f docker-compose.infra.yml restart config-server
```

`--no-deps` ensures only the target service is restarted, not its docker-compose dependencies.
`--force-recreate` ensures a new container is started even if the image didn't change.

---

#### Stage 9: Health Check

For each deployed service, polls `docker ps` every 2 seconds for up to 60 seconds:
```bash
for i in $(seq 1 30); do
    docker ps --filter "name=<service>" --filter "status=running" | grep -q <service> && exit 0
    sleep 2
done
```

---

#### Stage 10: Cleanup Old Images

Removes stale build artifacts to prevent disk exhaustion on the Jenkins agent:
```bash
docker builder prune -f --filter "until=72h"
docker container prune -f
docker image prune -f --filter 'until=72h'
```

---

#### Post Actions

| Result | Action |
|---|---|
| Success | Prints deployed services and commit tag |
| Failure | Prints rollback instructions with the rollback parameters to use |
| Always | `docker logout`, `cleanWs()` (wipes Jenkins workspace) |

---

### 3.3 Monitoring Pipeline — Jenkinsfile.monitoring

A lightweight separate pipeline for the observability stack. Triggered by any Git push that changes monitoring-related files.

**Change detection:**
```bash
git diff --name-only HEAD~1 HEAD | grep -E 'docker-compose.monitoring.yml|prometheus.yml|promtail-config.yml|grafana/'
```

**Deploy:**
```bash
docker compose -p founderlink -f docker-compose.monitoring.yml pull
docker compose -p founderlink -f docker-compose.monitoring.yml up -d
```

**Verify:**
```bash
docker ps | grep -E 'grafana|prometheus|loki|promtail'
```

This pipeline keeps the observability stack lifecycle completely independent from the application services — a Grafana config change doesn't trigger a full service rebuild.

---

### 3.4 Docker Image Strategy

```
Docker Hub Repository:  founderlink/<service-name>

Tags:
  founderlink/auth-service:a3f91c2   ← commit-tagged (immutable, for rollback)
  founderlink/auth-service:cache     ← mutable, always latest successful build
  founderlink/auth-service:latest    ← (not explicitly used; cache fulfils this role)
```

**Immutability:** Each commit produces a uniquely tagged image that is never overwritten. This enables precise rollbacks to any prior deployment.

**Registry:** Docker Hub (public registry). Images pulled by `docker-compose.services.yml` on the deployment host using the `TAG` environment variable.

---

### 3.5 Rollback Mechanism

To roll back to a previous deployment:

1. Go to Jenkins → **FounderLink pipeline** → **Build with Parameters**
2. Set `ROLLBACK = true`
3. Set `ROLLBACK_TAG = <previous commit SHA>` (e.g., `a3f91c2`)
4. Click **Build**

The pipeline will:
- Skip checkout/diff/test/build/push stages
- Set all services as targets for deployment
- Pull images from Docker Hub tagged `<ROLLBACK_TAG>`
- Re-deploy with `docker compose up --force-recreate`
- Run health checks

No code changes are needed. The previously-published Docker images are pulled directly from Docker Hub.

---

## Architecture Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Developer Machine / Git                         │
│  git push → GitHub → Jenkins webhook trigger                            │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │       Jenkins Pipeline      │
                    │  Detect → Test → Build →   │
                    │  Push → Deploy → Health    │
                    └─────────────┬──────────────┘
                                  │ docker push
                    ┌─────────────▼──────────────┐
                    │         Docker Hub         │
                    │  founderlink/<svc>:<sha>   │
                    └─────────────┬──────────────┘
                                  │ docker compose pull
┌─────────────────────────────────▼───────────────────────────────────────┐
│                         Production Host (Docker)                        │
│                                                                         │
│  founderlink-internal (private Docker network)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Config-Server│  │ Eureka-Server│  │   RabbitMQ   │                  │
│  │    :8888     │  │    :8761     │  │    :5672     │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│  │auth-svc│ │user-svc│ │startup │ │invest. │ │ team   │ │messaging │  │
│  │ :8089  │ │ :8082  │ │ :8083  │ │ :8084  │ │ :8085  │ │  :8086   │  │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └──────────┘  │
│  ┌────────┐ ┌────────┐ ┌────────┐    ┌───────┐ ┌───────┐              │
│  │notif.  │ │payment │ │wallet  │    │ Redis │ │MySQL  │              │
│  │ :8087  │ │ :8088  │ │ :8091  │    │ :6379 │ │(×9)   │              │
│  └────────┘ └────────┘ └────────┘    └───────┘ └───────┘              │
│                                                                         │
│  proxy-net (external-facing)                                            │
│  ┌──────────────────┐                                                   │
│  │   API Gateway    │ :8090 ← Angular Frontend / External clients       │
│  └──────────────────┘                                                   │
│  ┌────────┐ ┌────────┐                                                  │
│  │Grafana │ │Promethe│  (monitoring stack)                              │
│  │ :3000  │ │ :9090  │                                                  │
│  └────────┘ └────────┘                                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

*Generated for FounderLink — April 2026*
