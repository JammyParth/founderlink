# Angular Frontend Implementation Plan

Use a standalone Angular app with lazy-loaded feature routes, typed reactive forms, and RxJS facade stores. Enforce one data path everywhere: `HttpClient -> interceptor -> response normalizer -> DTO mapper -> facade/store -> page/component`. No feature UI should bypass that chain.

---

# 🧩 PHASE 0: PROJECT SETUP & FOUNDATIONS

## Goals

- Establish the Angular app skeleton and non-negotiable core runtime pieces before any feature work starts.
- Lock in one consistent HTTP, auth, error, and environment configuration strategy.
- Ensure the app can be incrementally tested before secured business features are added.

## Exact components/pages to build

- `AppShell`
- `NotFoundPage`
- `ForbiddenPage`
- Global loading/error shell placeholders

## Core modules/services to build

- `core/http/api-client.service`
- `core/http/auth.interceptor`
- `core/http/api-normalizer.service`
- `core/errors/global-error-handler`
- `core/auth/auth.service`
- `core/auth/session.facade`
- `core/guards/auth.guard`
- `core/guards/role.guard`
- `core/guards/guest.guard`
- `shared/models`
- `shared/mappers`
- `shared/utils/date.adapter`
- `shared/utils/enum-labels`

## Folder structure

Use a domain-based structure with a shared core:

```text
src/app/
  core/
    auth/
    errors/
    guards/
    http/
    config/
  shared/
    models/
    mappers/
    ui/
    utils/
  layout/
  features/
    auth/
    startups/
    investments/
    payments/
    team/
    messaging/
    notifications/
    profile/
  app.routes.ts
```

## Environment config

- `apiBaseUrl = http://localhost:8090`
- `razorpayKeyId = <frontend environment value>`
- enable `withCredentials` for `/auth/refresh` and `/auth/logout`
- do not send `X-User-Id`, `X-User-Role`, or `X-Auth-Source` from Angular

## APIs used

- None for business features yet
- Foundational support for all future gateway-routed APIs

## State management approach

- Root-only app bootstrap/session state
- No feature-specific business state yet
- Define the canonical request flow now:
  - `HttpClient -> interceptor -> normalizer -> mapper -> facade/store -> component`

## Dependencies on previous phases

- None

## What must be completed before moving forward

- Angular project bootstrapped and routed
- Environment switching works
- Every HTTP request goes through one centralized API client
- Wrapped, raw, array, and `204` responses normalize into one canonical envelope
- Global error handling and forbidden/not-found routing are wired

## What to test before moving forward

- HTTP interceptor token attachment behavior
- Response normalization for:
  - wrapped `{ message, data }`
  - raw DTO
  - raw array
  - empty `204`
- Global error handler for `401`, `403`, `404`, and generic failures
- App shell navigation and lazy-route loading

---

# 🔐 PHASE 1: AUTHENTICATION SYSTEM

## Goals

- Make authentication reliable before any secured feature is built.
- Ensure login, registration, logout, token refresh, and route protection are stable.
- Prevent invalid sessions from leaking into feature modules.

## Exact components/pages to build

- `LoginPage`
- `RegisterPage`
- `ForgotPasswordPage`
- `ResetPasswordPage`

## APIs used

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## State management approach

- Create `AuthSessionFacade` with states:
  - `anonymous`
  - `authenticating`
  - `authenticated`
  - `refreshing`
  - `expired`
- Keep access token in auth session state
- Keep `email`, `role`, and `userId` in auth store
- Clear all feature stores on logout

## API integration points

- `login()` stores access token from response body
- `refresh()` runs on first `401` only, then retries the failed request once
- `logout()` clears local session even if backend returns `204` without a body
- Use cookie-based refresh when available, but support header fallback because `Secure=true` cookies may not work over plain `http://localhost`

## Edge cases

- Invalid login returns `401`
- Duplicate registration returns `409`
- Expired/invalid refresh token triggers session clear and redirect to login
- `403` should not trigger retry
- Refresh must happen once per failed request, not in a loop

## Dependencies on previous phases

- Requires Phase 0 foundations

## What must be completed before moving forward

- Login, register, forgot password, reset password, logout, and refresh all work
- Protected routes redirect anonymous users correctly
- Role guard blocks unauthorized roles before page render
- Auth state survives refresh/rehydration in the intended environment

## What to test before moving forward

- Successful login and redirect
- Invalid credentials
- Expired token with successful refresh
- Expired token with failed refresh
- Role-protected route access
- Logout cleanup across app state

---

# 🧠 PHASE 2: CORE DATA LAYER & SHARED STATE

## Goals

- Freeze the data contracts so features never consume raw backend response shapes directly.
- Centralize DTO mapping, enum labeling, date handling, and error normalization.
- Establish a shared RxJS facade pattern before building business screens.

## Exact components/pages to build

- No major feature pages yet
- Build shared state primitives and reusable empty/loading/error UI blocks

## APIs used

- `GET /users/{id}` for current-user bootstrap
- Typed client definitions for:
  - `/users`
  - `/startup`
  - `/investments`
  - `/teams`
  - `/messages`
  - `/notifications`
  - `/payments`

## State management approach

- Use RxJS facades per domain instead of introducing a heavier state library
- Keep shared current-user state in a dedicated facade
- Cache only stable or session-scoped data
- Prefer refetch over optimistic mutation for async/event-driven flows

## Centralized API normalization implementation

- Normalize all responses into:

```ts
interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
```

- Support backend patterns:
  - wrapped `{ message, data }`
  - plain DTO
  - plain array
  - empty `204`
  - gateway/service error formats

## Shared models/interfaces

- `AuthSession`
- `UserProfile`
- `Startup`
- `Investment`
- `Invitation`
- `TeamMember`
- `Message`
- `AppNotification`
- `Payment`
- `Wallet`

## How data flows from API to UI

Use one strict path:

1. `HttpClient` sends request
2. Auth interceptor attaches token and handles refresh
3. Normalizer converts response into canonical envelope
4. Mapper converts DTO/wire data into domain models
5. Facade/store manages loading, loaded, error, and reconciling states
6. Components consume only facade outputs

## Caching strategy

- Cache auth session and current user
- Keep startup discovery cache short-lived and invalidated after mutations
- Do not over-cache investments, payments, or team data because async events can stale them quickly
- Use explicit refetch after mutations with async side effects

## Dependencies on previous phases

- Requires Phases 0 and 1

## What must be completed before moving forward

- All API clients use the same normalization and mapping layer
- No component parses raw response shapes
- Shared enum/date/money formatting rules are implemented once
- Error flattening is deterministic for field-map validations

## What to test before moving forward

- DTO mapper unit tests
- Date adapter consistency for `LocalDateTime` strings
- Enum label mapping
- Validation error flattening for investment/team/payment services
- Shared facade state transitions for `idle/loading/loaded/error/reconciling`

---

# 🚀 PHASE 3: STARTUP DISCOVERY & MANAGEMENT

## Goals

- Deliver startup discovery and founder startup CRUD only after the API and shared state layers are stable.
- Support read flows for all roles and mutation flows for founders only.

## Exact components/pages to build

- `StartupDiscoveryPage`
- `StartupFilterBar`
- `StartupCard`
- `StartupDetailPage`
- `MyStartupsPage`
- `StartupFormPage` for create/edit

## APIs used

- `GET /startup`
- `GET /startup/search`
- `GET /startup/details/{id}`
- `GET /startup/founder`
- `POST /startup`
- `PUT /startup/{id}`
- `DELETE /startup/{id}`

## State management approach

- `StartupDiscoveryFacade`
- `StartupDetailFacade`
- `FounderStartupFacade`
- Keep search state local to startup feature facade
- On delete success, remove startup from active lists immediately and mark related data as reconciling

## API calls per screen

- Discovery page:
  - `GET /startup`
  - `GET /startup/search`
- Startup detail page:
  - `GET /startup/details/{id}`
- Founder startup page:
  - `GET /startup/founder`
  - `POST /startup`
  - `PUT /startup/{id}`
  - `DELETE /startup/{id}`

## State transitions

- Discovery list:
  - `idle -> loading -> loaded | error`
- Startup detail:
  - `loading -> loaded | error`
- Create/edit form:
  - `idle -> submitting -> success | error`
- Delete:
  - `idle -> deleting -> success/reconciling | error`

## Role-based UI behavior

- Investors, founders, cofounders, and admins can view discovery and details
- Founders only can create, edit, and delete their own startups
- Hide founder mutation controls for non-founders

## Dependencies on previous phases

- Requires Phases 0, 1, and 2

## What must be completed before moving forward

- Startup list, search, detail, create, update, and delete work through facades only
- Founder ownership checks are reflected in route guards and UI controls
- Delete flow handles async downstream cleanup without pretending it is immediate

## What to test before moving forward

- Search filters and validation
- Startup create/edit validation
- Founder-only CRUD visibility
- Unauthorized mutation handling
- Startup deletion reconciling banner and list refresh behavior

---

# 💰 PHASE 4: INVESTMENT SYSTEM

## Goals

- Build the core investment CRUD and review flow before adding payment.
- Make founder review and investor portfolio screens stable first.

## Exact components/pages to build

- `CreateInvestmentForm`
- `InvestorPortfolioPage`
- `InvestmentDetailPage`
- `FounderInvestmentReviewPage`
- `InvestmentStatusBadge`

## APIs used

- `POST /investments`
- `GET /investments/investor`
- `GET /investments/{id}`
- `GET /investments/startup/{startupId}`
- `PUT /investments/{id}/status`

## State management approach

- `InvestorInvestmentFacade`
- `FounderInvestmentFacade`
- Keep investment list and detail states separate
- Use backend status as source of truth for:
  - `PENDING`
  - `APPROVED`
  - `REJECTED`
  - `COMPLETED`
  - `STARTUP_CLOSED`
- Do not expose manual founder-driven `COMPLETED` in normal UI

## API calls per screen

- Investor portfolio:
  - `GET /investments/investor`
- Investment detail:
  - `GET /investments/{id}`
- Founder review:
  - `GET /startup/founder`
  - `GET /investments/startup/{startupId}`
  - `PUT /investments/{id}/status`
- Startup detail CTA:
  - `POST /investments`

## State transitions

- Create investment:
  - `idle -> submitting -> success | error`
- Investor portfolio:
  - `idle -> loading -> loaded | error`
- Founder review action:
  - `PENDING -> APPROVED`
  - `PENDING -> REJECTED`
  - later async possibility:
    - `APPROVED -> COMPLETED`
    - `PENDING/APPROVED -> STARTUP_CLOSED`

## UI states for each status

- `PENDING`: waiting for founder review
- `APPROVED`: payment not started yet
- `REJECTED`: terminal, view-only
- `COMPLETED`: final success state
- `STARTUP_CLOSED`: startup deleted, terminal

## Dependencies on previous phases

- Requires Phase 3 because startup discovery/detail is the entry point

## What must be completed before moving forward

- Investors can create and track investments
- Founders can review startup investments and approve/reject them
- Portfolio and founder review stay consistent after status changes

## What to test before moving forward

- Duplicate pending investment conflict `409`
- Founder ownership enforcement
- Investor-only creation flow
- Approval and rejection transitions
- Startup deletion eventually producing `STARTUP_CLOSED`

---

# 💳 PHASE 5: PAYMENT FLOW (ASYNC CRITICAL)

## Goals

- Add payment only after investment approval/review is stable.
- Handle eventual consistency safely between approved investment and payment record creation.
- Keep payment state localized and resilient to retries and stale reads.

## Exact components/pages to build

- `PaymentPanel`
- `PaymentStatusCard`
- `PaymentActionSection`
- Razorpay launcher/integration service
- Reconciling banners for payment sync

## APIs used

- `GET /payments/investment/{investmentId}`
- `POST /payments/create-order`
- `POST /payments/confirm`
- `GET /payments/{paymentId}`
- `GET /investments/{id}` for post-confirm reconciliation

## State management approach

- `PaymentFacade` owns payment polling, order creation, confirm, and retry logic
- Derive composite investment UI state from:
  - `investment.status`
  - `payment.status` when payment exists
- Keep prior confirmed investment data visible while payment is reconciling

## API calls per screen

- Investor investment detail:
  - `GET /investments/{id}`
  - `GET /payments/investment/{investmentId}`
  - `POST /payments/create-order`
  - `POST /payments/confirm`
- Optional payment detail:
  - `GET /payments/{paymentId}`

## Handling async race condition

- After `APPROVED`, call `GET /payments/investment/{investmentId}`
- If `404`, retry every `2s`
- Maximum retries: `5`
- Stop immediately on `403`, `502`, `503`, or other hard errors
- After max retries, show:
  - `"Payment setup is taking longer than expected. Please refresh or try again later."`
- Keep investment detail visible during polling

## Loading states

- Localized loading only for payment section
- Do not replace full investment screen with a full-page spinner
- After successful confirm, show localized "finalizing investment" state while polling `GET /investments/{id}`

## Failure handling

- If `create-order` returns existing order for `INITIATED`, treat as success
- If checkout closes before confirmation, allow re-open via `POST /payments/create-order`
- If payment becomes `FAILED`, show retry only after a fresh successful `create-order`
- If investment does not become `COMPLETED` after confirm polling, keep payment as success and show syncing status instead of downgrading to failure

## Investment state machine usage

- `PENDING`
- `APPROVED`
- `INITIATED`
- `SUCCESS`
- `COMPLETED`
- `REJECTED`
- `STARTUP_CLOSED`

## UI states for each status

- `APPROVED`: payment can begin, payment record may still be loading
- `INITIATED`: checkout started, resume payment available
- `SUCCESS`: payment confirmed, investment synchronization pending
- `COMPLETED`: fully funded and finalized
- `FAILED`: payment failed, retry only through fresh order creation

## Dependencies on previous phases

- Requires Phase 4

## What must be completed before moving forward

- Approved investment can move through order creation, checkout, confirmation, and reconciliation
- Payment polling logic is isolated in facade/store, not repeated in components
- Retry behavior is deterministic and consistent

## What to test before moving forward

- Payment-row-not-found race after approval
- Reused order handling for repeated `create-order`
- Successful confirm followed by delayed investment completion
- Failed payment and retry behavior
- Hard error handling for `403`, `502`, `503`

---

# 👥 PHASE 6: TEAM MANAGEMENT

## Goals

- Build team workflows only after startup ownership and auth guards are proven.
- Support invitation lifecycle, acceptance/rejection, and active team views.

## Exact components/pages to build

- `InviteMemberPage` or modal
- `StartupInvitationsPage`
- `MyInvitationsPage`
- `TeamMembersPage`
- `MyActiveRolesPage`
- `MyTeamHistoryPage`

## APIs used

- `POST /teams/invite`
- `PUT /teams/invitations/{id}/cancel`
- `PUT /teams/invitations/{id}/reject`
- `GET /teams/invitations/user`
- `GET /teams/invitations/startup/{startupId}`
- `POST /teams/join`
- `GET /teams/startup/{startupId}`
- `DELETE /teams/{teamMemberId}`
- `GET /teams/member/history`
- `GET /teams/member/active`
- `GET /users/role/{role}` for cofounder selection

## State management approach

- `FounderTeamFacade`
- `CofounderInvitationFacade`
- Separate invitation and active-member stores
- Refetch invitation list and team roster after accept/reject/cancel/remove actions

## API calls per screen

- Founder invitation management:
  - `GET /startup/founder`
  - `GET /teams/invitations/startup/{startupId}`
  - `POST /teams/invite`
  - `PUT /teams/invitations/{id}/cancel`
- Cofounder invitation center:
  - `GET /teams/invitations/user`
  - `POST /teams/join`
  - `PUT /teams/invitations/{id}/reject`
- Team roster:
  - `GET /teams/startup/{startupId}`
  - `DELETE /teams/{teamMemberId}`
- My roles/history:
  - `GET /teams/member/active`
  - `GET /teams/member/history`

## Invitation lifecycle mapping

- `PENDING -> ACCEPTED`
- `PENDING -> REJECTED`
- `PENDING -> CANCELLED`
- `ACCEPTED`, `REJECTED`, and `CANCELLED` are terminal

## Role-based UI logic

- Founder:
  - invite users
  - cancel pending invites
  - view startup invitations
  - remove active team members
- Cofounder:
  - view own invitations
  - accept/reject pending invites
  - view own active roles and history
- Admin:
  - can access certain reads supported by backend, but do not invent admin-only flows unless explicitly required

## Dependencies on previous phases

- Requires Phases 2 and 3

## What must be completed before moving forward

- Invitation flows are stable end to end
- Founder and cofounder screens enforce backend ownership rules
- Team roster updates correctly after invitation actions

## What to test before moving forward

- Self-invite prevention
- Duplicate invitation conflict
- Accept creating active member
- Reject and cancel terminal states
- Founder remove-member restrictions
- Startup deletion propagation to invitations/members

---

# 💬 PHASE 7: MESSAGING SYSTEM

## Goals

- Add messaging only after auth, current-user state, and shared user lookup capabilities exist.
- Protect the frontend against sender spoofing.

## Exact components/pages to build

- `ConversationPartnersPage`
- `ConversationPage`
- `MessageComposer`
- Empty state and manual refresh UI

## APIs used

- `POST /messages`
- `GET /messages/{id}`
- `GET /messages/conversation/{user1}/{user2}`
- `GET /messages/partners/{userId}`
- `GET /users/{id}` or `GET /users` for partner identity display

## State management approach

- `MessagingFacade`
- Store current conversation, partner list, send state, and refresh state separately
- Use lightweight polling or manual refresh only while conversation view is active

## API calls per screen

- Partner list:
  - `GET /messages/partners/{currentUserId}`
  - resolve user display data through user endpoints
- Conversation page:
  - `GET /messages/conversation/{currentUserId}/{partnerId}`
  - `POST /messages`

## Polling or refresh strategy

- Prefer manual refresh first
- If polling is added, scope it to the active conversation screen only
- Do not poll globally in the background

## Handling empty fallback responses

- Messaging conversation and partner endpoints may return `[]` via fallback
- On first load, treat `[]` as empty state
- After prior successful data exists, do not instantly erase visible history on one fallback response
- Show a refresh/reconnect hint when an unexpected empty result appears after previous data existed

## Security rule

- Never bind `senderId` to editable UI state
- Always derive `senderId` from authenticated session in the messaging facade

## Dependencies on previous phases

- Requires Phases 1 and 2

## What must be completed before moving forward

- Send and read conversation flows are working safely
- Sender spoofing is impossible from the normal UI path
- Empty fallback responses are handled without confusing data loss

## What to test before moving forward

- Self-message validation
- Empty first-load conversation
- Unexpected empty fallback after prior messages
- Conversation partner identity mapping
- Sender derivation from auth state only

---

# 🔔 PHASE 8: NOTIFICATIONS SYSTEM

## Goals

- Add notification UX after enough async platform features exist to generate meaningful events.
- Support unread count, full list, and mark-as-read with safe ownership enforcement.

## Exact components/pages to build

- `NotificationBell`
- `UnreadBadge`
- `NotificationsPage`

## APIs used

- `GET /notifications/{userId}`
- `GET /notifications/{userId}/unread`
- `PUT /notifications/{id}/read`

## State management approach

- `NotificationFacade`
- Keep unread count in app shell state
- Keep full notification list in feature state
- Derive `userId` only from current auth session

## API calls per screen

- App shell:
  - `GET /notifications/{currentUserId}/unread`
- Notifications page:
  - `GET /notifications/{currentUserId}`
  - `PUT /notifications/{id}/read`

## Refresh strategy

- Poll unread notifications every `60s` only while:
  - user is authenticated
  - page is visible
- Full list page supports manual refresh
- Do not over-poll the full notification list globally

## UX behavior for new notifications

- Update unread badge non-intrusively
- On notifications page, new unread items should appear on refresh without resetting scroll unexpectedly
- Mark-as-read should update local state only after successful backend response

## Security rule

- Never accept notification `userId` from route or editable local state
- If a route includes a user id, validate against auth session and redirect if mismatched

## Dependencies on previous phases

- Best placed after Phases 5, 6, and 7 because those features generate many async events

## What must be completed before moving forward

- Unread count and notifications list stay consistent across navigation
- Ownership rules are enforced from auth state
- Mark-as-read is reliable

## What to test before moving forward

- Current-user-only notification loading
- Unread badge refresh
- Mark-as-read success and `404`
- Route/user mismatch handling

---

# ⚙️ PHASE 9: FINAL INTEGRATION & HARDENING

## Goals

- Standardize UX and error handling across the application.
- Harden async flows, edge cases, and role-based navigation.
- Improve performance without introducing unnecessary abstraction.

## Exact components/pages to build

- No new business pages
- Shared skeleton/loading/error components where still missing
- Reconciling banners and retry widgets where async flows need them

## APIs used

- No new APIs
- Harden and verify existing integrations only

## State management approach

- Standardize all facades on:
  - `idle`
  - `loading`
  - `loaded`
  - `error`
  - `reconciling`
- Ensure logout clears all stores
- Ensure stale confirmed data remains visible during async reconciliation

## Error handling consistency

- One normalized error model for all pages
- One strategy for field-level form errors
- `401` refresh once, then fail closed
- `403` show authorization state without retry

## Loading states across app

- Use localized loading for partial refreshes
- Reserve full-page loading for first-load screens only
- Use reconciling indicators for async event propagation

## Edge case handling

- Token expires mid-journey
- Startup deleted while user is viewing related records
- Payment success but investment completion delayed
- Messaging/notification fallback empty arrays
- Ownership-sensitive endpoints guarded in the frontend

## Performance improvements

- Lazy-load all feature areas
- Preload likely post-login routes if needed
- Avoid repeated duplicate refetches across sibling components
- Scope polling to active screens only

## Dependencies on previous phases

- Requires all previous phases

## What must be completed before moving forward

- All role-based journeys work end to end
- Error, loading, and reconciling behavior is consistent across modules
- No component bypasses the shared HTTP/state architecture

## What to test before moving forward

- Founder flow:
  - login -> create startup -> review investments -> invite team
- Investor flow:
  - discover startup -> invest -> await approval -> pay -> see completion
- Cofounder flow:
  - receive invite -> accept/reject -> view active role/history
- Messaging and notification smoke tests
- Token expiry during active session
- Startup deletion async propagation
- Payment reconciliation under delayed downstream completion

---

# Execution Rules

- Do not start a new phase until the previous phase passes its test gate.
- Do not build feature UI before the API client, normalization, and facade/store layers for that feature exist.
- Do not build secured business features before authentication and guards are stable.
- Do not build async payment flows before core investment CRUD is complete.
- Do not invent backend APIs or assume backend changes.
- Prefer simple, explicit RxJS facades over unnecessary abstraction.

# Recommended Build Order Summary

1. Phase 0: foundations
2. Phase 1: authentication
3. Phase 2: data contracts and shared state
4. Phase 3: startup discovery and founder startup CRUD
5. Phase 4: investment review and portfolio
6. Phase 5: Razorpay payment flow and async reconciliation
7. Phase 6: team invitations and roster management
8. Phase 7: messaging
9. Phase 8: notifications
10. Phase 9: hardening and end-to-end stabilization
