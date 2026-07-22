# CuminJar API Contracts

## Auth
No auth. Demo user hardcoded on backend: `demo-user` with name "Meera R.". Every write is scoped to this user.

## Data Mocked in mock.js → Now moved to backend
- Family group (name, story, language, cover) — from Dashboard form
- Recipes, Stories, Voice Recipes, Albums, Family Tree, Notifications
- Testimonials, features, steps, press logos, hero images → **stay static in mock.js** (they are UI content, not user data)

## Base URL
All routes prefixed with `/api`.

## Endpoints

### Family Group
- `GET /api/family` → current user's family group (or `null`)
- `POST /api/family` — body: `{ name, description, language, coverPhoto? (base64) }` → returns family
- `PUT /api/family` — same body → updates
- `GET /api/family/members` → list of family members

### Recipes
- `GET /api/recipes` → list
- `POST /api/recipes` — body: `{ title, author, region, serves, time, tags[], cover? }` → returns recipe
- `POST /api/recipes/{id}/like` → toggles like

### Stories
- `GET /api/stories` → list
- `POST /api/stories` — body: `{ title, author, excerpt, mins }` → returns story

### Voice Recipes (Sarvam STT + Gemini translate)
- `GET /api/voice-recipes` → list
- `POST /api/voice-recipes` — multipart form: `audio` (file), `title`, `author`, `language_code` (e.g., `hi-IN`, `ta-IN`, `unknown`)
  - Backend uses **Sarvam AI** (`saarika:v2.5`) to transcribe
  - If language ≠ English, uses **Gemini** via emergentintegrations to translate to English
  - Returns `{ id, title, author, duration, transcript, transcript_en, language }`
- `DELETE /api/voice-recipes/{id}`

### Albums
- `GET /api/albums`
- `POST /api/albums` — `{ title, cover? }`

### Family Tree
- `GET /api/family-tree` → grouped by level
- `POST /api/family-tree` — `{ name, role, level, avatar? }`

### Notifications
- `GET /api/notifications` → list (auto-seeded on first call)
- `POST /api/notifications/mark-read` → marks all as read

## Frontend Integration Plan
- Create `/app/frontend/src/api.js` with axios client + endpoints wrapper
- Replace mock imports in these pages:
  - `Dashboard.jsx` → POST /api/family
  - `RecipesPage.jsx` → GET/POST /api/recipes
  - `StoriesPage.jsx` → GET /api/stories
  - `VoiceRecipesPage.jsx` → POST /api/voice-recipes (real MediaRecorder)
  - `AlbumsPage.jsx` → GET /api/albums
  - `FamilyTreePage.jsx` → GET /api/family-tree
  - `SearchPage.jsx` → uses recipes + stories from API
  - `NotificationsPage.jsx` → GET /api/notifications
- On first mount of each page: seed mock data (recipes, stories, etc.) if empty so the UI still feels alive.

## Notes
- Photos stored as base64 strings (data URLs) in Mongo (`cover` field). Audio for voice recipes NOT stored (only transcript + duration) to keep DB small.
- All uses of language codes follow ISO like `hi-IN`, `ta-IN`, `te-IN`, `en-IN`, or `unknown`.
