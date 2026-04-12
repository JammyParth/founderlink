# FounderLink Frontend — Code Flow & Edge Cases

---

## 1. Application Entry Point

### `src/main.ts`
- Bootstraps the Angular application using `appConfig`.

### `src/app/app.ts`
- The root component (`<app-root>`).
- Contains only `<router-outlet />` in its template, acting as the shell where all routed views are rendered.

### `src/app/app.config.ts`
- Configures global Angular providers:
  - `provideBrowserGlobalErrorListeners()` — catches unhandled global errors.
  - `provideRouter(routes)` — sets up Angular routing.
  - `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` — configures the HTTP client to use Fetch API and attaches the auth interceptor for every outgoing request.

---

## 2. Routing (`src/app/app.routes.ts`)

All routes use **lazy loading** (`loadComponent`) for performance — components are only downloaded when needed.

| Path | Component | Access |
|------|-----------|--------|
| `` (empty) | LandingComponent | Public |
| `startup/:id` | StartupDetailComponent | Public |
| `auth/login` | LoginComponent | Public |
| `auth/register` | RegisterComponent | Public |
| `auth/forgot-password` | ForgotPasswordComponent | Public |
| `dashboard` | DashboardComponent (shell) | Protected (authGuard) |
| `dashboard/startups` | StartupsComponent | Protected |
| `dashboard/my-startup` | MyStartupComponent | Protected |
| `dashboard/team` | TeamComponent | Protected |
| `dashboard/invitations` | InvitationsComponent | Protected |
| `dashboard/investments` | InvestmentsComponent | Protected |
| `dashboard/portfolio` | PortfolioComponent | Protected |
| `dashboard/payments` | PaymentsComponent | Protected |
| `dashboard/wallet` | WalletComponent | Protected |
| `dashboard/messages` | MessagesComponent | Protected |
| `dashboard/notifications` | NotificationsComponent | Protected |
| `dashboard/profile` | ProfileComponent | Protected |
| `**` | Redirects to `/` | — |

**Edge Case:** Any unknown URL (`**`) redirects to the landing page, preventing 404 pages.

---

## 3. Core Layer

### 3.1 Guards (`src/app/core/guards/`)

#### `auth.guard.ts`
- Checks `authService.isLoggedIn()`.
- If not logged in, redirects to `/auth/login` and blocks route activation.
- **Edge Case:** If a user manually navigates to `/dashboard` without a token, they are always redirected to login.

#### `role.guard.ts`
- A factory guard: takes allowed roles as input and returns a `CanActivateFn`.
- Strips the `ROLE_` prefix from the JWT role before comparing (e.g., `ROLE_FOUNDER` → `FOUNDER`).
- If no role found (not logged in) → redirects to `/auth/login`.
- If role doesn't match allowed roles → redirects to `/dashboard`.
- **Edge Case:** Role comparison is case-sensitive; the prefix stripping ensures parity with navItem role strings.

---

### 3.2 Interceptor (`src/app/core/interceptors/auth.interceptor.ts`)

Intercepts every outgoing HTTP request:
1. Reads the JWT token from `AuthService`.
2. Skips attaching the token for public auth endpoints (`/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/refresh`).
3. Attaches `Authorization: Bearer <token>` header to all other requests.
4. On HTTP **401** errors:
   - Attempts a token refresh via `/auth/refresh`.
   - Uses a shared `BehaviorSubject` (`refreshSubject`) to prevent concurrent refresh races — multiple 401s result in only one refresh call.
   - Replays the original request with the new token after refresh.
   - If refresh fails → calls `authService.clearSession()` and redirects to login.
5. Public endpoints (like `/startup` and `/users/public/stats`) do NOT trigger 401 redirects.

**Edge Cases:**
- Concurrent requests that all 401 → only one refresh is triggered; others wait for the refresh to complete.
- Network errors on logout → session is still cleared locally.

---

### 3.3 Services (`src/app/core/services/`)

All services use **`ApiEnvelope<T>`** as a normalized response wrapper `{ success, data, error }`.

#### `api-normalizer.ts`
Contains helper functions to normalize different backend response formats:
- `normalizeWrapped` — `{ message, data }` pattern.
- `normalizePlain` — Plain DTO.
- `normalizeArray` — Plain array.
- `normalizeEmpty` — Empty (204) responses.
- `normalizeError` — Converts any backend error into a human-readable string.

**Edge Case:** Handles multiple backend error shapes (validation errors, field maps, plain strings, generic objects) so the UI always gets a consistent error message.

#### `auth.service.ts`
- Stores token, userId, role, email in **Angular signals**, initialized from `localStorage` on app load.
- Exposes `isLoggedIn` as a computed signal (`!!token`).
- `login()` → stores session in `localStorage` + signals via `storeSession()`.
- `logout()` → calls backend, then `clearSession()` (even on network error).
- `clearSession()` → clears `localStorage`, nullifies all signals, navigates to `/auth/login`.
- **Edge Case:** If the logout API call fails (e.g., network error), the session is still cleared locally to ensure the user is logged out on the frontend.

#### `startup.service.ts`
- CRUD operations for startups.
- `search()` accepts optional filters: `industry`, `stage`, `minFunding`, `maxFunding`.
- **Edge Case:** `getMyStartups()` is for founders only; calling it as another role will result in a backend error.

#### `investment.service.ts`
- `create()` — Investor creates an investment request.
- `updateStatus()` — Founder approves/rejects/completes an investment.
- **Edge Case:** Minimum investment amount is enforced on the frontend (₹1,000) before calling this service.

#### `payment.service.ts`
- `createOrder()` — Creates a Razorpay order for an approved investment.
- `confirmPayment()` — Confirms payment after Razorpay checkout.
- `pollPaymentAvailability()` — Polls for payment availability after investment approval; retries every 2s up to 5 times on 404. Hard errors (403, 502, 503) stop polling immediately.
- **Edge Case:** Payment rows are created asynchronously after investment approval; polling ensures the frontend waits for them.

#### `notification.service.ts`
- Fetches all/unread notifications for the logged-in user.
- `markAsRead()` — marks a specific notification as read.
- **Edge Case:** Uses `auth.userId()!` — will throw if called when user is not logged in.

#### `messaging.service.ts`
- `sendMessage()` — `senderId` is always derived from the session (never user-controlled) to prevent spoofing.
- `getConversation()` — Fetches all messages between two users.
- `getPartnerIds()` — Gets all user IDs the current user has conversations with.

#### `team.service.ts`
- Founder: `sendInvitation()`, `cancelInvitation()`, `getStartupInvitations()`, `removeMember()`.
- CoFounder: `rejectInvitation()`, `joinTeam()`, `getMyInvitations()`.
- `getTeamMembers()` — Active team members for a startup.

#### `user.service.ts`
- `updateMyProfile()` — Always uses session userId (never manually passed).
- `getPublicStats()` — Public endpoint; used on landing and login/register pages.
- **Edge Case:** `getPublicStats()` does not require authentication and returns fallback defaults in the UI if it fails.

#### `wallet.service.ts`
- `getWallet()` — Fetch wallet for a startup.
- `createWallet()` — Idempotent: creates a wallet or returns the existing one.

---

## 4. Features

### 4.1 Landing (`features/landing/landing.ts`)
- Public page showing all startups.
- Loads public stats (`founders`, `investors`, `cofounders`) from backend; falls back to hardcoded defaults if it fails.
- Supports search (by name/industry/description) and stage/industry filters.
- `totalFunding` is a `computed` signal that auto-recalculates when `startups` changes.
- **Edge Case:** If a user is already logged in, a "Go to Dashboard" button is shown instead of login/register links (checked via `authService.isLoggedIn()`).

### 4.2 Auth

#### `login/login.ts`
- Reactive form with `email` and `password` fields.
- On success → navigates to `/dashboard`.
- Loads public stats for display.
- **Edge Case:** `markAllAsTouched()` is called on submit if form is invalid, to show all validation errors at once.

#### `register/register.ts`
- Reactive form with `name`, `email`, `password`, `role` fields.
- Role can be pre-selected via query param (e.g., `?role=FOUNDER`) and locked from changing.
- **Edge Case:** If a role is passed via query param, the dropdown is locked to that role.

#### `forgot-password/forgot-password.ts`
- Two-step flow: `request` (ask for PIN) → `reset` (use PIN to reset password).
- Managed by a `step` signal.
- On successful PIN request, the email is pre-filled in the reset form.
- **Edge Case:** Network errors are caught and shown as user-friendly messages; the loading state is always reset.

### 4.3 Dashboard (`features/dashboard/dashboard.ts`)
- Shell component that holds `<app-sidebar>` + `<app-navbar>` + `<router-outlet>`.
- Tracks the current route and updates the page title dynamically using `NavigationEnd` events.
- Sidebar can be toggled open/closed via `sidebarOpen` signal.

### 4.4 Startups (`features/startups/startups.ts`)
- Shows all startups with filter controls (stage, industry, min/max funding).
- Invest modal: investors can submit an investment directly from this page.
- **Edge Case:** Minimum investment is ₹1,000 — validated on the frontend before calling the API.
- `isInvestor`/`isFounder` computed properties control which actions are visible per role.

### 4.5 Investments (`features/investments/investments.ts`)
- Founder view: shows investments across their startups; can approve/reject/complete each.
- Loads each startup's investments lazily when the founder selects a startup.
- Builds a `userNames` map so investor names are shown instead of raw IDs.

### 4.6 Team (`features/team/team.ts`)
- **Founder:** Can discover users (filtered by role/search), invite them to the team, view team members, and remove members.
- **CoFounder:** Can view their pending invitations and accept/reject them.
- Builds `startupNames` and `userNames` maps for display.
- **Edge Case:** Role-specific UI sections are shown/hidden based on the current user's role using `hasRole()`.

### 4.7 Messages (`features/messages/messages.ts`)
- Real-time-like messaging with polling every 30 seconds.
- `ngOnDestroy` clears the polling interval to prevent memory leaks.
- `ngAfterViewChecked` auto-scrolls the messages container to the bottom.
- Supports deep-linking: opening from a notification with `?user=<id>` query param pre-selects a conversation partner.
- **Edge Case:** If the user navigates away, the poll is cleared. If `?user` is in the URL, that conversation is auto-opened.

### 4.8 Notifications (`features/notifications/notifications.ts`)
- Polls every 30 seconds for new notifications.
- Supports filter: `all`, `unread`, `read`.
- Clicking a notification marks it as read and navigates to the relevant section.
- **Edge Case:** `ngOnDestroy` clears the polling interval. Notifications already read are skipped in `markAsRead()`.

### 4.9 Payments (`features/payments/payments.ts`)
- Shows investor's approved/completed/failed investment payments.
- Integrates with Razorpay for payment checkout.
- Polls for payment availability after investment approval.
- **Edge Case:** Only investments with status `APPROVED`, `COMPLETED`, or `PAYMENT_FAILED` are shown. Raw Razorpay key defaults to a placeholder if `environment.razorpayKey` is not set.

### 4.10 Profile (`features/profile/profile.ts`)
- Loads and edits the current user's profile.
- Edit mode is toggled via `editing` signal.
- Only sends fields that have changed.
- **Edge Case:** Uses `authService.userId()!` — assumes user is always logged in when accessing this page (protected by `authGuard`).

### 4.11 Wallet (`features/wallet/wallet.ts`)
- Founder-only feature.
- Shows wallet balance per startup; founder can switch between their startups.
- `selectedStartup` is a `computed` signal that finds the matching startup object from the list.
- **Edge Case:** If a founder has no startups, an empty state is shown. `createWallet()` is idempotent — safe to call multiple times.

---

## 5. Shared Components

### `shared/components/navbar/navbar.ts`
- Displays the top navigation bar with the page title, notification bell, and user role.
- Polls unread notification count every 30 seconds.
- Notification panel: clicking a notification marks it read and navigates contextually (messages go to `/dashboard/messages?user=<id>`, others go to `/dashboard/notifications`).
- **Edge Case:** `ngOnDestroy` clears the poll interval. Notification type parsing uses regex to extract user IDs from message strings for deep-linking.

### `shared/components/sidebar/sidebar.ts`
- Displays navigation links filtered by the current user's role.
- `visibleItems` is a `computed` signal that re-filters when the role signal changes.
- Emits `closeMenu` output event when a nav item is clicked (used by dashboard to close the sidebar on mobile).
- **Edge Case:** If no role is found, all nav items are shown as a fallback.

---

## 6. Models (`src/app/models/index.ts`)

All TypeScript interfaces and union types for the entire app are centralized here:
- **Enums/Types:** `UserRole`, `StartupStage`, `InvestmentStatus`, `PaymentStatus`, `InvitationStatus`, `TeamRole`.
- **API Envelopes:** `ApiEnvelope<T>` (normalized), `ApiResponse<T>` (raw backend).
- **Feature Models:** Auth, User, Startup, Investment, Team, Messaging, Notification, Payment, Wallet.

---

## 7. General Edge Cases & Patterns

| Scenario | Handling |
|----------|----------|
| Token expired (401) | Interceptor attempts refresh; on failure clears session and redirects to login |
| Concurrent 401 responses | Only one refresh is triggered; others wait using `BehaviorSubject` |
| Backend error formats vary | `normalizeError()` handles all patterns into a single user-friendly string |
| Role prefix mismatch (`ROLE_FOUNDER` vs `FOUNDER`) | All guards and sidebar strip the `ROLE_` prefix before comparing |
| Logout API failure | Session is cleared locally regardless |
| Component destruction with intervals | Both `MessagesComponent` and `NotificationsComponent` clear their poll intervals in `ngOnDestroy` |
| Navigation to unknown routes | `**` wildcard redirects to landing page |
| Public stats API failure | UI falls back to hardcoded values (350 founders, 200 investors, 120 cofounders) |
| senderId spoofing prevention | `MessagingService.sendMessage()` always derives `senderId` from the session |
| Payment row async creation | `pollPaymentAvailability()` retries up to 5 times with 2s delay on 404 |
| Form submission with invalid data | `markAllAsTouched()` ensures all validation errors are shown immediately |
