# Project Changes & Fixes Log (Student Name: Yashraj)

## 📋 Security Challenge Summary

This file documents all six interconnected auth vulnerabilities found in the Fragments app and the fixes applied to each. The vulnerabilities form a chain — each one enabling the next. The fix order was strictly: Token Integrity → Enforcement → Session & Origin.

---

### Vulnerability 1: Hardcoded JWT Secret & No Token Expiry

- **Found in**: `server/auth/jwt.js`
- **Description of the Problem**:
  The JWT signing secret was hardcoded as a string literal `'fragments-secret-key'` directly in source code. Anyone with repository access could copy this secret and sign their own forged tokens — including admin-level tokens — that the server would accept as genuine. Additionally, no `expiresIn` option was set when calling `jwt.sign()`, meaning every issued token was valid indefinitely. A stolen or intercepted token from any point in history would remain a working credential forever.
- **Description of the Fix**:
  Moved `JWT_SECRET` to a `.env` file and loaded it via `process.env.JWT_SECRET` using the `dotenv` package. Added a startup guard that throws a fatal error if the variable is missing — the server cannot start without it. Added `expiresIn: '1h'` to `jwt.sign()` so all new tokens expire after one hour, bounding the abuse window for any stolen token.

---

### Vulnerability 2: Role Missing from JWT Payload

- **Found in**: `server/routes/auth.js`
- **Description of the Problem**:
  Both the `/signup` and `/login` handlers called `jwt.sign({ userId: user.id })` — only the user's ID was encoded into the token. The `role` field was never included. This meant that after any middleware decoded the token, `req.user.role` was always `undefined`. The `roleCheck` middleware existed and had correct logic, but it could never work because there was nothing to check. Every role-based access decision on the backend was silently broken.
- **Description of the Fix**:
  Updated both `jwt.sign()` calls to include `role: user.role` in the payload: `jwt.sign({ userId: user.id, role: user.role }, ...)`. Now `req.user.role` is reliably set on every request, and the `roleCheck` middleware functions correctly.

---

### Vulnerability 3: Frontend Reads Role from localStorage

- **Found in**: `client/src/context/AuthContext.jsx`
- **Description of the Problem**:
  After login, the frontend stored the user's role in `localStorage` under the key `'role'` and read from it to make all UI decisions (showing/hiding edit, approve, and delete buttons). Any user could open DevTools → Application → Local Storage, change `role` to `'admin'`, and refresh — instantly seeing every admin UI control. While this alone doesn't grant actual backend powers, it gives attackers a perfect map of privileged endpoints to probe.
- **Description of the Fix**:
  Removed all `localStorage.setItem('role', ...)` and `localStorage.getItem('role')` calls. Added a `decodeJwtPayload()` helper using the browser's built-in `atob()` to base64-decode the JWT's second segment. Role is now derived exclusively from the decoded token payload. An attacker editing `localStorage` cannot affect the role value the frontend uses — it always comes from the server-signed token.

---

### Vulnerability 4: Missing Role Checks on Critical Endpoints

- **Found in**: `server/routes/fragments.js`
- **Description of the Problem**:
  All four mutating endpoints (`POST /`, `PUT /:id`, `POST /:id/approve`, `DELETE /:id`) only used the `auth` middleware to verify that *a* valid token existed. No `roleCheck` middleware was applied. This meant any authenticated user — including Readers — could submit, edit, approve, and delete fragments by calling the API directly (e.g., via Postman or `curl`). Authentication (verifying identity) was present; authorisation (verifying permission) was completely absent.
- **Description of the Fix**:
  Applied `roleCheck` middleware to every endpoint with appropriate role sets:
  - `POST /` → `['contributor', 'curator', 'admin']`
  - `PUT /:id` → `['contributor', 'curator', 'admin']` + ownership check (contributors can only edit their own fragments)
  - `POST /:id/approve` → `['curator', 'admin']`
  - `DELETE /:id` → `['admin']` only
  
  Also corrected the default fragment status from `'published'` to `'pending'` so new fragments require curator approval before appearing.

---

### Vulnerability 5: CSRF Vulnerability (Wildcard CORS)

- **Found in**: `server/index.js`
- **Description of the Problem**:
  CORS was configured with `origin: '*'`, accepting requests from any domain. There was no CSRF token mechanism, no `SameSite` cookie policy, and no origin validation on state-changing routes. A malicious website at any origin could craft a `fetch()` call with a logged-in user's session credentials and trigger fragment creation, deletion, or approval on their behalf — without the user knowing.
- **Description of the Fix**:
  Replaced `origin: '*'` with an explicit allowlist (`http://localhost:5173`, `http://localhost:3000`). Added `credentials: true` and restricted `allowedHeaders`. Added a `csrfGuard` middleware on all `/api/fragments` routes that requires an `X-Requested-With: XMLHttpRequest` custom header on all `POST`, `PUT`, `DELETE`, and `PATCH` requests. Browsers cannot set custom headers on cross-origin requests without a CORS preflight (which is now blocked), making it impossible for a malicious site to forge a valid state-changing request. Updated the Axios client to include this header on every request automatically.

---

### Vulnerability 6: Logout Does Not Invalidate Token Server-Side

- **Found in**: `client/src/context/AuthContext.jsx`, `client/src/components/LogoutButton.jsx`, `server/middleware/auth.js`
- **Description of the Problem**:
  The logout flow only called `localStorage.removeItem('token')` on the client. The JWT remained cryptographically valid on the server with no record of the logout. If a token was copied before logout (e.g., from DevTools, a packet sniffer, or a stolen device), it could be replayed indefinitely — or until the 1-hour expiry (which didn't exist before Fix 1). The in-memory `blacklist` array existed in `store.js` but was never consulted by the auth middleware.
- **Description of the Fix**:
  Added `POST /api/auth/logout` route that extracts the bearer token from the `Authorization` header and pushes it to the `blacklist` array. Updated `server/middleware/auth.js` to check `blacklist.includes(rawToken)` before verifying the token — blacklisted tokens get a `401` immediately. Updated `AuthContext.jsx` to call the logout API endpoint before clearing localStorage. Updated `LogoutButton.jsx` to handle the now-async logout gracefully with a loading state.

---

## 🔗 Fix Dependency Chain

```
F1 (JWT secret + expiry)
  → F2 (role in JWT payload)
    → F4 (role checks actually work now)
      → F3 (frontend decodes role from token)
        → F6 (server blacklist + async logout)
          → F5 (CORS restriction + CSRF guard)
```

---

## ✅ Verification Tests

After all fixes:

1. **Decode fresh login token at jwt.io** — `role` is present, `exp` is set ~1h from now
2. **Contributor token → `DELETE /api/fragments/1`** → returns `403 Forbidden`
3. **Log out → replay old token** → returns `401` (token is blacklisted)
4. **Edit `localStorage` role to `'admin'` → refresh** → UI role does NOT change (decoded from token)
5. **Request from `evil.example.com`** → blocked by CORS policy
6. **State-changing request without `X-Requested-With` header** → `403 CSRF check failed`
