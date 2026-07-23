# Test Credentials

## CuminJar

### Google Auth (Emergent-managed)
- Flow: `/login` or `/get-started` → "Continue with Google" → `https://auth.emergentagent.com/?redirect=<origin>/app` → returns to `/app#session_id=…` → `AuthCallback` posts to `/api/auth/session` which sets an httpOnly `session_token` cookie for 7 days.
- No app-managed passwords for Google Auth. Any Google account works — do NOT store passwords.
- After sign-in, real user data is persisted in the `users` collection with a UUID `user_id` and MongoDB `_id` is never returned.
- Logout: user dropdown → **Log out** → `POST /api/auth/logout` clears cookie + DB session.

### Legacy demo user (still used by /app routes for now)
- Hardcoded user: `Meera R.` (id `demo-user`, email `meera.rao@family.com`). Backend `smart-record`, `/recipes`, `/stories`, `/families` still operate under this demo user regardless of Google Auth. Full data migration to per-user auth-gated APIs is a P1 follow-up.

### Email OTP signup
- `POST /api/auth/request-otp` → sends 6-digit code via Resend (10-min expiry, max 3 requests/10 min, 5 verify attempts/code)
- `POST /api/auth/verify-otp` → marks the OTP verified
- Resend account is currently in sandbox → real delivery only to the account owner's verified email
