# FounderLink Frontend — Master Test Plan

> **Author**: Senior QA Architect  
> **Target**: Production-Ready Angular Application  
> **Objective**: End-to-end resilience and correctness verification  

---

## 🧩 PHASE 0: SYSTEM FOUNDATION TESTS

> **Prerequisite**: None. Backend offline or returning 500s.

### 0.1 Application Boot & Routing
1. **Actions**: Navigate to `/`, `/startups`, and a random invalid URL `/does-not-exist`.
2. **Expected**: App loads shell. `/` redirects to `/startups`. Invalid URL navigates to the Not Found page.
3. **Failure Indicator**: Blank white screen, console errors, 404 from server instead of Angular router.
4. **Severity**: 🔴 HIGH

### 0.2 Global Error Handling
1. **Actions**: Simulate a network disconnection in DevTools, then trigger any route navigation that requires an API call.
2. **Expected**: App routing succeeds if lazy-loaded chunks are cached. API calls fail gracefully. Console logs an intercepted error message instead of a raw unhandled exception. UI does not crash.
3. **Failure Indicator**: Blank screen, `Uncaught (in promise)` errors in console.
4. **Severity**: 🔴 HIGH

### 0.3 Initial Session Hydration
1. **Actions**: Load app with an expired token in `localStorage`/cookies (or whatever persists the session).
2. **Expected**: `APP_INITIALIZER` attempts refresh, receives 401, catches error, and boots the app in an `anonymous` state cleanly.
3. **Failure Indicator**: App gets stuck on a loading screen waiting for `firstValueFrom(refresh())` to resolve.
4. **Severity**: 🔴 HIGH

---

## 🔐 PHASE 1: AUTHENTICATION TESTS

> **Prerequisite**: Foundation tests pass. Backend running.

### 1.1 Login & Navigation Guard
1. **Actions**: As a guest, try to access `/my-startups`. Then log in with valid credentials.
2. **Expected**: Guest is redirected to `/auth/login`. After successful login, session state updates to `authenticated`, and user is redirected back to the attempted URL or dashboard.
3. **Failure Indicator**: Route allows guest access, or login succeeds but UI still shows "Login" button.
4. **Severity**: 🔴 HIGH

### 1.2 Token Refresh Queueing (Parallel 401s)
1. **Actions**: Login. Wait for token to expire (or forcefully expire it in DB). Navigate to a page that fires 3 parallel API calls.
2. **Expected**: The first API call gets a 401 and triggers `refresh()`. The other two wait in the interceptor queue. `refresh()` succeeds, and all 3 original calls are retried with the new token.
3. **Failure Indicator**: 3 separate `refresh()` calls are made, or the queued calls are dropped.
4. **Severity**: 🔴 HIGH

### 1.3 Logout Mid-Flight
1. **Actions**: Trigger a slow API request (e.g., fetch dashboard). Immediately click "Logout" before it completes.
2. **Expected**: Session clears immediately, user is routed to login. The in-flight request finishes in the background but its result is ignored or rejected by the cleared session.
3. **Failure Indicator**: The slow request completes and accidentally re-hydrates part of the state, or throws a permissions error that triggers an unexpected UI flash.
4. **Severity**: 🟡 MEDIUM

---

## 🧠 PHASE 2: DATA LAYER TESTS

> **Prerequisite**: Authentication verified.

### 2.1 ApiEnvelope Normalization
1. **Actions**: Intercept an API response and change it from `{ data: { id: 1 } }` to just `{ id: 1 }`.
2. **Expected**: `ApiNormalizerService` detects the missing wrap and standardizes the output without breaking the consuming facade.
3. **Failure Indicator**: Facade throws `TypeError: Cannot read properties of undefined`.
4. **Severity**: 🔴 HIGH

### 2.2 Enum Fallback Handling
1. **Actions**: Intercept a Startup API response and change `stage: 'MVP'` to `stage: 'UNKNOWN_NEW_STAGE'`.
2. **Expected**: The mapper (`parseStartupStage`) intercepts the unknown string and falls back to a safe default (e.g., `IDEA`). UI renders without crashing.
3. **Failure Indicator**: UI flashes red, component fails to render entirely.
4. **Severity**: 🟡 MEDIUM

### 2.3 Null Required Fields
1. **Actions**: Intercept an API response and set a required list to `null` instead of `[]`.
2. **Expected**: The system handles it safely (facade/mapper falls back to empty array).
3. **Failure Indicator**: `.map() is not a function` or `.filter() is not a function` console errors.
4. **Severity**: 🟡 MEDIUM

---

## 🚀 PHASE 3: STARTUP SYSTEM TESTS

> **Prerequisite**: Core data layer stable.

### 3.1 Startup Discovery Filter
1. **Actions**: Go to Discover. Apply an exact industry filter (e.g., "Fintech"). Toggle between filters rapidly.
2. **Expected**: UI shows loading state. Results match the final selected filter. Race conditions (first request finishing after the second) are handled by `switchMap` or by ignoring stale data.
3. **Failure Indicator**: Incorrect data displayed (race condition).
4. **Severity**: 🔴 HIGH

### 3.2 Founder CRUD
1. **Actions**: As a Founder, create a startup. Edit it. Then delete it while simulating high latency. 
2. **Expected**: Optimistic UI immediately removes the deleted item from the list (`reconciling` state). If backend fails, the item reappears.
3. **Failure Indicator**: Item stays on screen forever if backend fails, or disappears but requires a manual refresh to show the change.
4. **Severity**: 🟡 MEDIUM

---

## 💰 PHASE 4: INVESTMENT SYSTEM TESTS

> **Prerequisite**: Startups exist.

### 4.1 Create Investment (Double-Click Test)
1. **Actions**: As an Investor, click "Invest" and rapidly double-click the confirmation button.
2. **Expected**: Only one API call is made. The facade's loading guard blocks the second click.
3. **Failure Indicator**: Two identical investments appear in the portfolio.
4. **Severity**: 🔴 HIGH

### 4.2 Founder Approval Rollback
1. **Actions**: As a Founder, click "Approve" on an investment. Simulate a backend 500 error.
2. **Expected**: UI optimistically changes to "Approved". When the 500 returns, UI rolls back to "Pending" and shows an error toast.
3. **Failure Indicator**: UI stays stuck on "Approved" despite the backend failure.
4. **Severity**: 🟡 MEDIUM

---

## 💳 PHASE 4B: PAYMENT FLOW TESTS

> **Prerequisite**: Approved investment exists.

### 4.1 Async Payment Synchronization (404 Retries)
1. **Actions**: Approve an investment. Intercept the `payment/investment/{id}` API call to return 404 for the first 3 seconds.
2. **Expected**: The facade retries the 404 up to 5 times. The "Pay" button stays disabled (`canStartPayment: false`) until the payment object is fully ready.
3. **Failure Indicator**: The UI presents an error immediately without retrying, or the Pay button is violently flickering.
4. **Severity**: 🔴 HIGH

### 4.2 Razorpay Order Creation
1. **Actions**: Click "Pay". Rapidly double-click.
2. **Expected**: State goes to `loading`. Only ONE Razorpay order ID is generated. Modal opens.
3. **Failure Indicator**: Multiple orders generated in backend.
4. **Severity**: 🔴 HIGH

### 4.3 Payment Confirmation Interruption
1. **Actions**: Complete Razorpay flow. When `confirmPayment` is called, simulate network drop.
2. **Expected**: Facade stays in `reconciling` state. System allows user to manually hit a "Verify Payment" button later to retry synchronization.
3. **Failure Indicator**: User is charged but app thinks it's unpaid with no way to force a sync.
4. **Severity**: 🔴 HIGH

---

## 👥 PHASE 5A: TEAM MANAGEMENT TESTS

> **Prerequisite**: Startups exist.

### 5.1 Duplicate Invitation Prevention
1. **Actions**: Send an invite to an email. Double click "Send".
2. **Expected**: Second click is ignored due to facade loading guard.
3. **Failure Indicator**: Two identical pending invites appear.
4. **Severity**: 🟡 MEDIUM

### 5.2 Accept/Reject Idempotency
1. **Actions**: As an invitee, double-click "Accept".
2. **Expected**: First click processes. Second click returns early.
3. **Failure Indicator**: 409 Conflict error surfaces to user, or user occupies two seats.
4. **Severity**: 🔴 HIGH

---

## 💬 PHASE 5B: MESSAGING TESTS

> **Prerequisite**: Two users exist.

### 6.1 Message Send Race
1. **Actions**: Type a message. Press Enter, click Send, press Enter repeatedly extremely fast.
2. **Expected**: One message is appended optimistically. API receives exactly one request. Input clears immediately upon first trigger.
3. **Failure Indicator**: Message appears in UI 3 times.
4. **Severity**: 🟡 MEDIUM

### 6.2 Polling vs Socket Refresh
1. **Actions**: Open conversation. Send message from another browser.
2. **Expected**: Conversation updates passively.
3. **Failure Indicator**: Messages bleed into wrong conversations if routing changes quickly.
4. **Severity**: 🔴 HIGH

---

## 🔔 PHASE 5C: NOTIFICATIONS TESTS

> **Prerequisite**: Logged in user.

### 7.1 Polling Failure Resilience
1. **Actions**: Block network traffic to `/notifications/unread`. Wait 2 minutes. Unblock network.
2. **Expected**: Polling fails gracefully without crashing the UI. When network returns, polling resumes successfully.
3. **Failure Indicator**: Polling completely dies and never recovers, even when network returns.
4. **Severity**: 🔴 HIGH

### 7.2 Stale Data Indicator
1. **Actions**: Block network traffic to `/notifications/unread` for 4 minutes (4 missed cycles).
2. **Expected**: UI detects consecutive failures and adds a "sync warning" icon or error payload to the notification facade.
3. **Failure Indicator**: UI silently shows old numbers indefinitely.
4. **Severity**: 🟡 MEDIUM

---

## 🔁 CROSS-CUTTING TESTS (CRITICAL)

### C.1 Network Timeout Verification
1. **Actions**: Throttle network to 20 seconds of latency per request. Try to load dashboard.
2. **Expected**: After 30 seconds, `api-client.service.ts` timeout kicks in. Facade transitions from `loading` to `error`. Error boundary displays standard timeout message.
3. **Failure Indicator**: Infinite spinner.
4. **Severity**: 🔴 HIGH

### C.2 Multi-Tab Identity Sync
1. **Actions**: Open App in Tab A and Tab B. In Tab A, click "Logout". Switch to Tab B.
2. **Expected**: Tab B detects `storage` event and immediately redirects to `/auth/login`.
3. **Failure Indicator**: Tab B remains sitting on an authenticated page using a stale UI.
4. **Severity**: 🔴 HIGH

### C.3 Browser Battery/Visibility Saves
1. **Actions**: Open Developer Tools -> Sensors. Switch visibility to "hidden". Watch Network tab.
2. **Expected**: Polling endpoints (notifications) stop firing when the tab is hidden. They resume immediately upon visibility restore.
3. **Failure Indicator**: Unnecessary background network churn.
4. **Severity**: 🟢 LOW
