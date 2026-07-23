# CuminJar

> Preserve family recipes, stories &amp; traditions — in their voice.

CuminJar is a family memory-preservation app that lets elders record recipes and stories in their own voice. AI transcribes them (Sarvam AI), translates them to English if needed (Google Gemini), and turns them into beautifully formatted recipe cards. Families can invite each other by email, build a family tree, and eventually order a hardbound heirloom book with a QR code on every page that plays the voice recording.

## Tech stack

- **Frontend:** React 19 (CRA + Craco), Tailwind CSS, shadcn/ui, lucide-react icons, react-router v7
- **Backend:** FastAPI (Python 3.11+), Motor async MongoDB driver, Pydantic
- **Database:** MongoDB
- **AI:** Sarvam AI (`saarika:v2.5`) for STT + Google Gemini 2.5 Flash for translation
- **Email:** Resend for family invitations

## Project structure

```
├── backend/                   # FastAPI app
│   ├── server.py              # All routes
│   ├── requirements.txt
│   └── .env.example           # copy to .env and fill in
├── frontend/                  # React app (CRA)
│   ├── public/                # static assets (paati_face.png, lentils.png, etc.)
│   ├── src/
│   │   ├── components/        # AppShell, Header, Footer, Modals, SVG spices
│   │   ├── pages/             # Landing, HowItWorks, Features, Stories, Pricing, About, Terms, Contact, Login, GetStarted
│   │   │   └── app/           # Dashboard app pages (Recipes, Stories, VoiceRecipes, Albums, FamilyTree, Search, Notifications, Settings)
│   │   ├── api.js             # axios client wrapper
│   │   └── mock.js            # UI content (features, testimonials, images) - not user data
│   ├── package.json
│   └── .env.example
├── contracts.md               # API contract reference between frontend and backend
├── test_result.md             # Testing history
└── README.md                  # you are here
```

## Getting started (local)

### Prerequisites
- Node.js 18+
- Yarn (do NOT use npm, it may break the lockfile)
- Python 3.11+
- MongoDB running locally (or a MongoDB Atlas URI)

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # then fill in real keys
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The backend serves everything under `/api/`.

### 2. Frontend

```bash
cd frontend
yarn install
cp .env.example .env       # then set REACT_APP_BACKEND_URL to your backend URL
yarn start
```

Opens on http://localhost:3000 by default.

## Required API keys / services

You'll need accounts and keys for:

1. **Sarvam AI** — https://dashboard.sarvam.ai/ (speech-to-text for Indian languages)
2. **Emergent LLM key** — universal key for Gemini used for translation (or swap in your own Gemini key)
3. **Resend** — https://resend.com/api-keys (invitation emails). Verify a domain to send from your own address; otherwise use `onboarding@resend.dev`.
4. **MongoDB** — local or Atlas. Only URI needed.

All of these go in `backend/.env`.

## Auth

The MVP has **no auth** — all writes are scoped to a hardcoded `demo-user`. If you're taking this to real users, wrap the API layer in JWT or Emergent Google OAuth. See `contracts.md` for the endpoint surface.

## API endpoints (summary)

- `GET /api/me` — demo user
- `GET /api/family`, `POST /api/family` — family group CRUD
- `GET /api/recipes`, `POST /api/recipes`, `POST /api/recipes/{id}/like`
- `GET /api/stories`, `POST /api/stories`
- `GET /api/albums`, `POST /api/albums`
- `GET /api/family-tree`, `POST /api/family-tree`
- `GET /api/notifications`, `POST /api/notifications/mark-read`
- `GET /api/invites`, `POST /api/invites`, `DELETE /api/invites/{id}` — sends real email via Resend
- `GET /api/voice-recipes`, `POST /api/voice-recipes` (multipart audio) — Sarvam STT + Gemini translation
- `POST /api/contact` — contact form

See `contracts.md` for detailed request/response shapes.

## Deployment notes

- Frontend build command: `yarn build` — outputs static site in `frontend/build/`
- Backend can run under any ASGI server (uvicorn, gunicorn+uvicorn workers)
- Make sure to set all env vars in production (do **not** commit `.env`)
- CORS is currently `*` for MVP — lock down to your production domain(s)

## License

All rights reserved.
