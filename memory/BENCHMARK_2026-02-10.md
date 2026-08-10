# CuminJar — Baseline Benchmark (Feb 10, 2026)

This is a snapshot of the "known-good" CuminJar production build before forking
the codebase to "CuminJar Baseline" for further experimentation.

## Code Metrics
- **Backend:** `server.py` — **2,707 lines** (monolithic FastAPI app, pending refactor)
- **Frontend total:** **9,729 lines** across 24 pages + 15 top-level components
  - Marketing pages (14): `/`, `/how-it-works`, `/features`, `/stories`, `/pricing`, `/about`, `/terms`, `/privacy`, `/contact`, `/faq`
  - Auth pages: `/login`, `/get-started`
  - Authenticated app (10): `/app`, `/app/recipes`, `/app/stories`, `/app/voice-recipes`, `/app/albums`, `/app/family-tree`, `/app/search`, `/app/settings`, `/app/notifications`
  - Public share links: `/cookbook/:token`, `/join/:token`, `/record/:token`

## API Surface
- **59 endpoints** across `/api/auth/*`, `/api/recipes/*`, `/api/stories/*`, `/api/family/*`, `/api/smart-record`, `/api/transcribe`, `/api/payments/razorpay/*`, `/api/recipe-requests/*`, `/api/public/*`, `/api/contact`, `/api/notifications`, etc.

## MongoDB Collections
`users`, `user_sessions`, `login_attempts`, `email_otps`, `password_reset_otps`,
`families`, `family_tree`, `invites`, `recipes`, `stories`, `albums`,
`voice_recipes`, `recipe_requests`, `notifications`, `contact_messages`, `payments`

## Third-party Integrations
- **Emergent LLM Key** — Claude Sonnet + Gemini + Nano Banana (image gen)
- **Emergent Google Auth** — platform-managed OAuth
- **Sarvam AI** — Indic speech engine (parallel STT, 28s chunks, 4-way concurrency)
- **Resend** — transactional emails (OTP, invites, contact form) from `admin@cuminjar.com`
- **Razorpay** — ₹2,999 Family Legacy checkout (order + verify + webhook)
- **Google Analytics** — GA4 gtag with router-based page views

## Deploy Targets
- **Preview (dev):** https://ui-template-build.preview.emergentagent.com
- **Production:** https://cuminjar.com (Emergent Deploy, 50 credits/mo slot)

## Performance Snapshot (Landing page, 1440×900)
| Metric | Value |
|---|---|
| Full network-idle load | **1,028 ms** |
| DOMContentLoaded | 298 ms |
| First Paint | 300 ms |
| First Contentful Paint | 496 ms |

Great numbers — under 1 s to interactive on a preview cold cache.

## Pipeline speed (post optimizations from Aug 2026)
- Smart-Record endpoint returns in **~10-17 s** for a typical 2-min recipe (down from ~45 s pre-optimization)
- Sarvam STT chunks now fire in **parallel** (semaphore=4, 28s chunks)
- AI cover image runs in **background task** after response returns; emoji placeholder shown instantly

## Feature Completeness (as of Feb 10, 2026)
- Voice recording + multi-language STT + auto-translation ✅
- Auto-provisioned family jars, WhatsApp invites + email invites ✅
- Recipe requests via WhatsApp to non-users (public /record/:token) ✅
- Print-ready PDF cookbook export with QR voice codes ✅
- 30-recipe unlock for hardbound heirloom book ✅
- Streak progress card + "Welcome back {name}" cache + multi-account chips ✅
- Razorpay ₹2,999 Family Legacy checkout ✅
- Sameera R. testimonials + landing page + FAQ (23 entries) ✅
- Google Sign-In + Email/Password + brute-force protection + session cookies ✅
- Marketing footer on every page (including authenticated /app/*) ✅

## Known Deferred Work
1. **Refactor `server.py`** — split 2,707-line monolith into `routes/auth.py`, `routes/recipes.py`, `routes/payments.py`, `routes/family.py`, `routes/cookbook.py` (P2 backlog)
2. **SMS/WhatsApp OTP login** — infrastructure investigated with MSG91/Twilio/Meta Cloud API, no code shipped (user chose to defer)
3. **Password strength meter** on signup (P3)
4. **Chip long-press sign-out** on mobile (P3)
5. **Login funnel GA events** — no analytics wired on login/signup/forgot-password interactions (P3)

## Rollback / Version Control
Emergent maintains a chat-fork/rollback flow — if the new "CuminJar Baseline"
diverges badly, you can either:
1. Rollback this session's chat to a previous checkpoint (free)
2. Restore from GitHub main branch (if Save-to-GitHub was used)
