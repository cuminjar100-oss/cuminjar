# CuminJar — PRD

## Original problem statement
Pixel-perfect replica of CuminJar: mobile-friendly family memory app where users record voice/photos of family recipes, stories & festivals. App auto-transcribes (Sarvam AI), translates (Gemini), and structures into complete recipe cards or stories. Supports family groups, email invites (Resend), realistic AI-generated recipe covers, and printable hardbound heirloom books with QR-code voice playback.

## Personas
- **Meera (primary demo user)**: A daughter preserving her Paati's recipes and family stories, records voice/photos on mobile.
- **Family members (invitees)**: Join via email invite (Resend), view/contribute to shared recipes and stories.

## Core requirements
- Mobile-first UI (bottom nav, drawer, big Record FAB)
- Family group management + email invites via Resend
- One-tap Smart Record: voice → Sarvam STT (chunked with pydub) → Gemini translation → Gemini structured JSON (title/ingredients/steps/serves/time/tags)
- Photo capture path: Gemini vision OCR → same structuring pipeline
- Realistic AI cover images for recipes via Gemini Nano Banana (gemini-3.1-flash-image-preview); emoji SVG for stories/festivals (per user preference) and as fallback
- Recipe/Story detail modals accessible from Dashboard and full list pages
- Heirloom hardbound book highlight with QR-code voice playback marketing
- No paid plan restrictions — unlimited recipes/stories/families for the demo user
- WhatsApp share (deep-link `https://wa.me/?text=…`) on cards

## What's implemented (2026-02)
- **[2026-02] Emergent Google Sign-In**: Full OAuth flow (`/api/auth/session`, `/auth/me`, `/auth/logout`), synchronous `#session_id=` router detection, `AuthCallback` page, Google button on `/login` + `/get-started`, httpOnly session cookie (7-day expiry). Documentation: `/app/auth_testing.md`.
- **[2026-02] Per-user data scoping**: New `AuthContextMiddleware` reads the session cookie/bearer on every request and sets `current_uid` / `current_user_name` / `current_user_picture` ContextVars. All 42 route touch-points now scope to the signed-in Google user (empty jar for new users); anonymous browsers still see the demo user's data (backward compat).
- **[2026-02] Header shows Google profile**: `AppShell` fetches `/api/auth/me` on mount and swaps the avatar & name with the signed-in user's Google picture + name (falls back to demo user when anonymous).
- **[2026-02] Resend domain setup docs**: `/app/docs/RESEND_DOMAIN_SETUP.md` shows the exact DNS steps for verifying the cuminjar.com domain so OTP emails deliver to any recipient.
- **[2026-02] OTP signup**: `/api/auth/request-otp` + `/api/auth/verify-otp` wired to the `/get-started` screen with a 6-digit OTP UI, 45s resend timer, and rate limits.
- **[2026-02] Cookbook WhatsApp share + branding**: Native Web Share with cover-image ribbon watermark ("CuminJar 🫙"), branded fallback card via Nano Banana at `/cuminjar-share.png`, dedicated WhatsApp button on Dashboard + PublicCookbook.
- **[2026-02] Cookbook printable PDF**: `/api/public/cookbook/{token}/book.pdf` generates a warm cookbook (cover + TOC + recipe pages with cover image + QR-voice code + ingredients + numbered steps + story pages) using reportlab + qrcode. QR codes route to `/api/public/cookbook/{token}/voice/{kind}/{id}` — a small autoplay page.
- **[2026-02] Public cookbook**: `/cookbook/:token` route + `POST /family/{id}/share` for the family owner + `readOnly` RecipeDetailModal.
- **[2026-02] Logout works**: shadcn user dropdown in AppShell with red "Log out" that calls `/api/auth/logout` and clears local storage.
- **[2026-02] "?" tooltip**: HelpCircle in header now has a "Help & support" tooltip and routes to /contact.
- **[2026-02] Recipe/Story delete + inline edit**: Both modals now support open, share (with image), delete (story), and inline edit (recipe).
- **[2026-02] Realistic AI recipe covers via Gemini Nano Banana** with regenerate button.
- **[2026-02] Fixed double-save + empty ingredients/steps** via uploadingRef guard and non-streaming Gemini structuring.
- **[2026-02] About page hero** now uses a custom Nano Banana portrait of a fair-skinned Indian grandmother with grandchild in a warm upper-middle-class living room.
- Base app: pixel-perfect landing/auth pages, Sarvam STT with pydub chunking, Gemini translation & structuring, Resend invites, mobile-first bottom nav & FAB.

## Prioritized backlog

### P1 (next up)
- **Semantic HTML cleanup on recipe cards**: replace outer `<button>` wrapper on Recipes page cards with `div[role=button]` to avoid nested interactive elements (like/share `<span role=button>` inside). Add `data-testid="recipe-like-{id}"` and `"recipe-share-{id}"`.
- **Voice playback** for stories & recipes in detail modal (Play button currently non-functional).
- **Delete story** endpoint + UI (no `DELETE /stories/{id}` currently exists).
- **PATCH /recipes allow-list**: include `liked` for API consistency (frontend uses `POST /recipes/{id}/like`, works today).

### P2 (refactor / polish)
- Split `server.py` (~1000 lines) into routers: `recipes.py`, `stories.py`, `families.py`, `smart_record.py`, `media.py`; extract `ai_helpers.py`.
- Migrate FastAPI `@app.on_event` to `lifespan` handlers (deprecation warning).
- Refactor `Dashboard.jsx` (>240 lines) — extract `RecentRecipesSection`, `RecentStoriesSection`, `HeirloomBookCard`.
- Split `Landing.jsx` into hero / features / testimonials / footer sections.
- Extract `CreateFamilyModal` into own file.

### P3 (product enhancements)
- Real JWT / Emergent Google auth (currently hardcoded demo user)
- Multiple photo upload → single recipe (currently one file per Smart Record)
- Family member roles & permissions
- Public share link for individual recipes/stories
- Print-ready PDF export for hardbound book

## Tech stack & integrations
- Frontend: React 18, Tailwind, Shadcn UI, lucide-react
- Backend: FastAPI, MongoDB (motor), pydub + ffmpeg
- LLMs: `emergentintegrations` → Gemini 2.5-flash (text/OCR), Gemini 3.1-flash-image-preview / Nano Banana (image)
- STT: Sarvam AI (user API key)
- Email: Resend (user API key)

## Key DB schemas
- `users`: {id, email, name, plan, limits}
- `families`: {id, user_id, name, description, language, coverPhoto, members[], created_at, updated_at}
- `recipes`: {id, user_id, family_id, title, author, region, serves, time, tags[], cover, ingredients[], steps[], transcript_en, source_kind, source_language, liked, created_at}
- `stories`: {id, user_id, family_id, title, author, excerpt, mins, kind, cover, transcript_en, source_kind, source_language, created_at}
- `invites`: {id, family_id, email, status, email_provider_id}

## Test credentials
Demo user is hardcoded — no login required. See `/app/memory/test_credentials.md`.
