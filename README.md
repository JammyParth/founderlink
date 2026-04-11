# FounderLink — Microservices Platform

**FounderLink** is a full-stack platform that connects founders, investors, and co-founders. It enables startup discovery, team building, investment tracking, messaging, notifications, payments, and wallet management — all built on a cloud-native, event-driven microservices architecture.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Services](#services)
- [Tech Stack](#tech-stack)
- [Infrastructure](#infrastructure)
- [Monitoring & Observability](#monitoring--observability)
- [CI/CD Pipeline](#cicd-pipeline)
- [Configuration Management](#configuration-management)
- [Running Locally with Docker](#running-locally-with-docker)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure)

---

## Architecture Overview

```
                        ┌─────────────────┐
                        │  Angular Frontend│
                        │   (Port 4200)    │
                        └────────┬────────┘
                                 │ HTTP
                        ┌────────▼────────┐
                        │   API Gateway   │
                        │   (Port 8090)   │
                        └────────┬────────┘
                                 │ lb:// (Eureka-routed)
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
   ┌──────▼──────┐      ┌────────▼──────┐      ┌───────▼──────┐
   │auth-service │      │  user-service │      │startup-service│
   │ (Port 8089) │      │  (Port 8082)  │      │  (Port 8083)  │
   └─────────────┘      └───────────────┘      └──────────────┘
          │                      │                      │
   ┌──────▼──────┐      ┌────────▼──────┐      ┌───────▼──────┐
   │  investment │      │  team-service │      │  messaging   │
   │ (Port 8084) │      │  (Port 8085)  │      │ (Port 8086)  │
   └─────────────┘      └───────────────┘      └──────────────┘
          │                      │                      │
   ┌──────▼──────┐      ┌────────▼──────┐      ┌───────▼──────┐
   │notification │      │   payment     │      │    wallet    │
   │ (Port 8087) │      │  (Port 8088)  │      │ (Port 8089)  │
   └─────────────┘      └───────────────┘      └──────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │                   Infrastructure Layer                       │
  │  Config Server (8888) │ Eureka Server (8761) │ RabbitMQ     │
  │  Redis Cache          │ MySQL (per service)   │ Zipkin       │
  └─────────────────────────────────────────────────────────────┘
```

---

## Services

| Service | Port | Description |
|---|---|---|
| **api-gateway** | 8090 | Spring Cloud Gateway — single entry point, JWT validation, RBAC routing |
| **auth-service** | 8089 | JWT authentication, refresh tokens, user sync via Feign + RabbitMQ |
| **user-service** | 8082 | User profile management, CQRS pattern, Redis caching |
| **startup-service** | 8083 | Startup listing, search, and management |
| **investment-service** | 8084 | Investment tracking, Feign-based startup lookups with circuit breaker |
| **team-service** | 8085 | Team formation and membership management |
| **messaging-service** | 8086 | Direct messaging between users via RabbitMQ |
| **notification-service** | 8087 | Email + in-app notifications, event-driven via RabbitMQ |
| **payment-service** | 8088 | Payment processing and investment payment flow |
| **wallet-service** | 8089 | Wallet balance, transactions, Feign-based payment integration |
| **Config-Server** | 8888 | Spring Cloud Config Server — serves config from Git repo |
| **eureka-server** | 8761 | Netflix Eureka — service registry and discovery |

---

## Tech Stack

### Backend
| Technology | Version | Usage |
|---|---|---|
| **Java** | 21 | Language for all backend services |
| **Spring Boot** | 3.5.11 | Application framework |
| **Spring Cloud** | 2025.0.1 | Microservices patterns (Config, Gateway, Eureka, Feign) |
| **Spring Security** | (Boot-managed) | JWT authentication, RBAC |
| **Spring Data JPA** | (Boot-managed) | ORM / persistence layer |
| **Spring Data Redis** | (Boot-managed) | Caching layer (user-service) |
| **Spring AMQP** | (Boot-managed) | RabbitMQ event-driven messaging |
| **Spring Cloud Gateway** | (Cloud-managed) | API Gateway with reactive routing |
| **Spring Cloud Config** | (Cloud-managed) | Centralised external configuration |
| **Spring Cloud Eureka** | (Cloud-managed) | Service registry and discovery |
| **OpenFeign** | (Cloud-managed) | Declarative HTTP client for inter-service calls |
| **Resilience4j** | (Cloud-managed) | Circuit breaker, retry, rate limiting |
| **jjwt** | 0.13.0 | JWT token creation and validation |
| **ModelMapper** | 3.1.1 | DTO ↔ Entity mapping |
| **Lombok** | (Boot-managed) | Boilerplate reduction |
| **SpringDoc OpenAPI** | 2.8.8 | Auto-generated Swagger UI per service |
| **MySQL** | 8.0 | Primary relational database (one DB per service) |
| **Redis** | (latest) | Distributed cache for user-service |
| **RabbitMQ** | (latest) | Message broker for async event processing |
| **Micrometer + Prometheus** | (Boot-managed) | Metrics collection |
| **Micrometer Tracing (Brave)** | (Boot-managed) | Distributed tracing |
| **Zipkin** | (latest) | Distributed trace collection and UI |
| **H2** | (Boot-managed) | In-memory DB for unit/integration tests |
| **JaCoCo** | 0.8.12 | Code coverage reporting |
| **Maven** | 3.x | Build tool (Maven Wrapper included per service) |

### Frontend
| Technology | Version | Usage |
|---|---|---|
| **Angular** | 21.2.x | SPA frontend framework |
| **TypeScript** | 5.9.x | Language |
| **RxJS** | 7.8.x | Reactive programming |
| **Angular Router** | (Angular-managed) | Client-side routing |
| **Angular Forms** | (Angular-managed) | Reactive forms |
| **Vitest** | 4.x | Unit testing |
| **Prettier** | 3.x | Code formatting |

### Infrastructure & DevOps
| Technology | Usage |
|---|---|
| **Docker** | Containerisation of all services |
| **Docker Compose** | Multi-container orchestration (infra / services / monitoring) |
| **Jenkins** | CI/CD pipeline — smart change detection, build, push, deploy |
| **Docker Hub** | Container image registry |
| **Grafana** | Metrics and log visualisation dashboards |
| **Loki** | Log aggregation |
| **Promtail** | Log shipping from containers to Loki |
| **Prometheus** | Metrics scraping and storage |

---

## Infrastructure

Infrastructure is split across three Docker Compose files for independent lifecycle management:

### `docker-compose.infra.yml`
Databases and messaging infrastructure:
- MySQL 8.0 instances per service (auth-db, user-db, startup-db, investment-db, team-db, messaging-db, notification-db, payment-db, wallet-db)
- Redis (user-service cache)
- RabbitMQ (message broker)

### `docker-compose.services.yml`
All backend microservices:
- api-gateway, auth-service, user-service, startup-service, investment-service, team-service, messaging-service, notification-service, payment-service, wallet-service
- Config Server, Eureka Server

### `docker-compose.monitoring.yml`
Observability stack:
- Prometheus, Grafana, Loki, Promtail, Zipkin

---

## Monitoring & Observability

| Tool | Port | Purpose |
|---|---|---|
| **Prometheus** | 9090 | Metrics scraping from all `/actuator/prometheus` endpoints |
| **Grafana** | 3000 | Dashboards for service metrics and logs |
| **Loki** | — | Centralised log storage |
| **Promtail** | — | Ships container log files to Loki |
| **Zipkin** | 9411 | Distributed tracing UI |

All services expose `/actuator/health`, `/actuator/info`, and `/actuator/prometheus`. Distributed tracing is configured with 100% sampling probability (`micrometer-tracing-bridge-brave` + `zipkin-reporter-brave`).

---

## CI/CD Pipeline

The `Jenkinsfile` implements an intelligent pipeline with:

- **Smart change detection** — diffs against the previous successful commit; only rebuilds services whose source directories changed
- **Force build** — `FORCE_BUILD=true` rebuilds all services
- **Rollback mode** — `ROLLBACK=true` + `ROLLBACK_TAG=<tag>` re-deploys a prior Docker image tag
- **Docker Hub push** — images tagged with the short git commit SHA
- **Deploy** — SSH-based `docker compose pull && docker compose up -d` on the target host

A separate `Jenkinsfile.monitoring` manages the monitoring stack lifecycle independently.

---

## Configuration Management

All service runtime configuration is stored in a dedicated Git repository served by the Spring Cloud Config Server:

- **Config repo**: `https://github.com/JammyParth/founderlink_config`
- Each service fetches its config at startup via `spring.config.import: configserver:http://config-server:8888`
- Shared config in `application.yml` — per-service overrides in `<service-name>.yml`
- Secrets injected at runtime via environment variables (e.g. `${DB_USERNAME}`, `${JWT_SECRET}`, `${RABBITMQ_PASSWORD}`)

---

## Running Locally with Docker

### Prerequisites
- Docker & Docker Compose
- A `.env` file in the project root (see [Environment Variables](#environment-variables))

### Step 1 — Create required Docker networks
```bash
docker network create founderlink-internal
docker network create proxy-net
```

### Step 2 — Start infrastructure (databases, Redis, RabbitMQ)
```bash
docker compose -f docker-compose.infra.yml up -d
```

### Step 3 — Start application services
```bash
docker compose -f docker-compose.services.yml up -d
```

### Step 4 — Start monitoring stack (optional)
```bash
docker compose -f docker-compose.monitoring.yml up -d
```

### Step 5 — Access the platform
| Service | URL |
|---|---|
| API Gateway | http://localhost:8090 |
| Eureka Dashboard | http://localhost:8761 |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Swagger UI (auth) | http://localhost:8090/auth/swagger-ui.html |
| Swagger UI (user) | http://localhost:8090/users/swagger-ui.html |

---

## Environment Variables

Create a `.env` file at the project root. **Never commit this file.**

```env
# Image tag (set by CI/CD, or use 'latest' locally)
TAG=latest

# Database
DB_ROOT_PASSWORD=your_root_password
DB_USERNAME=founderlink
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_base64_encoded_jwt_secret_min_256_bits

# Internal service secret
INTERNAL_SECRET=your_internal_api_secret

# RabbitMQ
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest

# Admin seed account
SEED_ADMIN_ENABLED=true
SEED_ADMIN_NAME=Admin
SEED_ADMIN_EMAIL=admin@founderlink.com
SEED_ADMIN_PASSWORD=Admin@Pass1

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
```

---

## API Documentation

Swagger UI is available per service via the API Gateway:

| Service | Swagger URL |
|---|---|
| auth-service | `/auth/swagger-ui.html` |
| user-service | `/users/swagger-ui.html` |
| startup-service | `/startup/swagger-ui.html` |
| investment-service | `/investments/swagger-ui.html` |
| team-service | `/teams/swagger-ui.html` |
| messaging-service | `/messages/swagger-ui.html` |
| notification-service | `/notifications/swagger-ui.html` |
| payment-service | `/payments/swagger-ui.html` |
| wallet-service | `/wallet/swagger-ui.html` |

---

## Testing

All backend services use **JUnit 5 + Mockito** with **JaCoCo** for coverage reporting.

```bash
# Run tests for a specific service
cd auth-service
./mvnw test

# Run tests and generate JaCoCo coverage report
./mvnw test jacoco:report
# Report: target/site/jacoco/index.html
```

| Service | Coverage Target | Test Types |
|---|---|---|
| auth-service | ≥ 90% | Unit, Integration, WebMvc |
| user-service | ≥ 90% | Unit, Integration, WebMvc |
| Other services | — | Unit, Integration |

Test profiles use an **H2 in-memory database** and disable Spring Cloud Config Server and Eureka so tests run without any external infrastructure.

---

## Project Structure

```
FounderLink/
├── api-gateway/                  # Spring Cloud Gateway
├── auth-service/                 # Authentication & JWT
├── user-service/                 # User profile management
├── Startup-Service/              # Startup listings
├── investment-service/           # Investment management
├── team-service/                 # Team formation
├── messaging-service/            # Direct messaging
├── notification-service/         # Notifications (email + in-app)
├── payment-service/              # Payment processing
├── wallet-service/               # Wallet & transactions
├── Config-Server/                # Spring Cloud Config Server
├── eureka-server/                # Netflix Eureka registry
├── founderlink-frontend/         # Angular 21 SPA
├── config-repo/                  # Externalised service configs (Git-backed)
├── grafana/                      # Grafana dashboard provisioning
├── docker-compose.infra.yml      # Databases, Redis, RabbitMQ
├── docker-compose.services.yml   # All microservices
├── docker-compose.monitoring.yml # Prometheus, Grafana, Loki, Zipkin
├── prometheus.yml                # Prometheus scrape config
├── promtail-config.yml           # Log shipping config
├── Jenkinsfile                   # Main CI/CD pipeline
├── Jenkinsfile.monitoring        # Monitoring stack pipeline
└── .gitignore
```

---

## Security Notes

- JWT secrets, DB passwords, and internal API secrets are injected at runtime via environment variables — never hardcoded
- The `.env` file is excluded from version control via `.gitignore`
- The API Gateway enforces JWT validation and role-based access control (RBAC) on all upstream routes
- Internal service-to-service calls use an `X-Internal-Secret` header validated against `${INTERNAL_SECRET}`

