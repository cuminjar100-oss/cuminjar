# CuminJar — Test Credentials

## Verified test user (Email + Password)
- Email: `testuser2@example.com`
- Password: `TestPass123`
- Name: `Test User Two`
- user_id: `user_c79e76b8e9d9`
- Email is force-marked as verified in the DB (bypass Resend `example.com` block)
- Created: 2026-08-07

## Existing seeded demo user (auto-provisioned by ContextVar defaults)
- Name: `Sameera R.`
- Email: `sameera.rao@family.com` (no password — anonymous demo access)
- user_id: `demo-user`
- Used by default when no auth cookie is present, so smart-record and /recipes still work for anonymous demo browsing

## Auth flow / endpoints
1. `POST /api/auth/request-otp` — Sends 6-digit OTP via Resend (10-min expiry, max 3/10min, 5 verify attempts). **⚠️ Resend sandbox REJECTS `@example.com` and generic test domains.** Use real inboxes for E2E tests.
2. `POST /api/auth/verify-otp` — Marks OTP verified, sets `verified=true` in `db.email_otps`
3. `POST /api/auth/register` — Requires PRIOR verified OTP for same email. Creates user with `email_verified: true`, hashes password with bcrypt, issues 7-day session cookie
4. `POST /api/auth/login` — Verifies password, brute-force check (5 attempts / 15 min lock), issues session cookie
5. `GET /api/auth/me` — Returns current user based on `session_token` cookie
6. `PATCH /api/auth/me` — Updates name / picture / preferred_language
7. `POST /api/auth/forgot-password` — Sends 6-digit reset OTP via Resend
8. `POST /api/auth/reset-password` — Verifies OTP + sets new password + logs in
9. `POST /api/auth/logout` — Clears cookie + deletes DB session
10. `POST /api/auth/logout-all-devices` — Clears every session for the user

## Google Sign-In (Emergent-managed)
- Flow: `/login` → "Continue with Google" → `https://auth.emergentagent.com/?redirect=<origin>/app` → returns to `/app#session_id=…` → `AuthCallback` posts to `/api/auth/session` which sets an httpOnly `session_token` cookie for 7 days.
- No app-managed passwords for Google Auth. Any Google account works — do NOT store passwords.
- Session data collection: `db.user_sessions` (indexed by `session_token`)
- Logout: user dropdown → **Log out** → `POST /api/auth/logout` clears cookie + DB session

## Session cookie config
- Name: `session_token`
- httpOnly: true
- secure: true
- samesite: `none` (cross-origin cookie for CORS setup)
- Path: `/`
- Max age: 7 days
- Storage: `db.user_sessions` with `expires_at` field

## Rate limits & security
- Brute force: 5 failed login attempts per email → 15-minute lockout (see `_check_brute_force`)
- Password: bcrypt via passlib
- Password min length: 6 chars
- Session token: `secrets.token_urlsafe(32)`
- Reset OTP: SHA256 hash stored in DB; 5-attempt limit per code

## How to seed a verified test user quickly (bypass Resend for local test)
```python
from pymongo import MongoClient
from datetime import datetime, timezone
c = MongoClient('mongodb://localhost:27017')
db = c['test_database']
db.email_otps.insert_one({
  'email': 'my_test@example.com',
  'verified': True,
  'verified_at': datetime.now(timezone.utc).isoformat(),
  'created_at': datetime.now(timezone.utc).isoformat(),
})
# Then POST /api/auth/register — will succeed
```

## Resend
- Domain `cuminjar.com` is fully verified (as of 2026-07-28)
- From-address: `CuminJar <hello@cuminjar.com>`
- Real inboxes (Gmail, Yahoo etc.) receive OTPs fine
- Sandbox blocks `@example.com`, `@test.com`, generic test domains
