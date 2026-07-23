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
- **[2026-02] Recipe & Story detail modals restored** — Fixed P0: recipe cards on Dashboard, Recipes page, and story cards on Dashboard & Stories page are now clickable and open `RecipeDetailModal` / `StoryDetailModal`. Modals include cover, ingredients, steps, tags, share-on-WhatsApp, close.
- **[2026-02] Realistic AI recipe covers via Gemini Nano Banana** — Fixed P0: `_generate_recipe_image` calls `emergentintegrations` `gemini-3.1-flash-image-preview` with a photorealistic food-photography prompt. Returns ~500KB–1.2MB base64 JPEG. Falls back to emoji SVG on failure. Stories/festivals keep emoji SVG covers by design.
- Pixel-perfect landing / auth / dashboard / recipes / stories / albums / family-tree / notifications / settings pages
- Sarvam STT with `pydub` audio chunking (25s chunks) to bypass 30s API limit
- Gemini 2.5-flash translation + JSON structuring
- Resend email invites (real emails)
- Family groups with cover photos, active-family localStorage persistence
- Mobile responsive rebuild (drawer + bottom nav + FAB)
- All plan / vault / Sarvam / mamascript restrictions removed
- Security fixes (XSS, React hook deps)
- Backend tests scaffold at `/app/backend/tests/`

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
