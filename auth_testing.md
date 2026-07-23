# Auth Testing Playbook (Emergent Google OAuth)

See the integration_playbook_expert response captured in the current session. Key steps:

1. Frontend redirects to `https://auth.emergentagent.com/?redirect=<origin>/app` — no hardcoding, use `window.location.origin`.
2. Emergent returns to `<origin>/app#session_id=<id>`.
3. AppRouter synchronously detects the hash and renders `AuthCallback`, which POSTs `session_id` to backend `/api/auth/session`.
4. Backend calls `GET https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` with `X-Session-ID` header, stores `user_id`/`session_token` (7 days) in MongoDB, sets an httpOnly cookie.
5. Frontend redirects to `/app`. Protected routes use `GET /api/auth/me` (with cookie) to load the user.
6. Logout: frontend calls `POST /api/auth/logout`, backend removes session & clears cookie.

Test users are stored with a UUID `user_id`; MongoDB `_id` is never exposed.
