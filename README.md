# MankoSathi

A mental health support platform built for the South Asian community. MankoSathi (meaning "companion of the mind" in Nepali) provides AI-powered chat support, mood tracking, anonymous community discussions, and a therapist directory.

## Features

- **AI Chat** -- Talk to an empathetic AI companion about what's on your mind
- **Mood Tracking** -- Log daily moods with notes and view your history over time
- **Community** -- Share experiences and support others through anonymous posts and comments
- **Therapist Directory** -- Browse culturally aware therapists with specialization and language filters
- **Role-based Access** -- Separate dashboards for users, therapists (patient insights), and admins (platform stats)
- **Demo Accounts** -- Pre-seeded accounts for each role so the app can be explored instantly without sign-up

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 19, TypeScript, Vite          |
| Backend  | FastAPI, SQLModel, Uvicorn          |
| Database | PostgreSQL 16 (Docker)              |
| Auth     | JWT (PyJWT)                         |
| Packages | uv (Python), npm (Node)             |

## Project Structure

```
mankosathi/
├── backend/
│   ├── main.py              # FastAPI app, lifespan, CORS
│   ├── config.py             # Env var loader
│   ├── database.py           # Async engine & session factory
│   ├── auth.py               # JWT creation, verification, current_user dependency
│   ├── seed.py               # Demo accounts & sample data
│   ├── models/               # SQLModel table definitions
│   │   ├── user.py
│   │   ├── chat.py
│   │   ├── mood.py
│   │   ├── post.py
│   │   ├── comment.py
│   │   └── therapist.py
│   └── routers/              # API route handlers
│       ├── auth_router.py
│       ├── chat_router.py
│       ├── mood_router.py
│       ├── post_router.py
│       ├── therapist_router.py
│       ├── therapist_dashboard_router.py
│       └── admin_router.py
├── frontend/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx           # Routes
│       ├── api/client.ts     # Axios instance with JWT interceptor
│       ├── context/AuthContext.tsx
│       ├── components/       # Layout, ProtectedRoute
│       └── pages/            # LoginPage, ChatPage, MoodPage, etc.
├── docker-compose.yml        # PostgreSQL service
└── .env.example              # Root env template
```

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.12
- **uv** ([docs](https://docs.astral.sh/uv/))
- **Docker** (for PostgreSQL)

## Getting Started

### 1. Clone and configure environment

```bash
cp .env.example .env
```

Create `backend/.env`:

```
DATABASE_URL=postgresql+asyncpg://mankosathi:mankosathi_secret@localhost:5432/mankosathi
DATABASE_URL_SYNC=postgresql+psycopg2://mankosathi:mankosathi_secret@localhost:5432/mankosathi
JWT_SECRET=change-me-to-a-random-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Start the backend

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Tables are created and demo data is seeded automatically on first startup.

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000` (Vite proxies `/api` requests to the backend).

## Demo Accounts

The app seeds the following accounts on first run. Pick any one from the login screen:

| Account       | Name          | Role      |
| ------------- | ------------- | --------- |
| `ram`         | Ram Sharma    | user      |
| `ananya`      | Ananya Thapa  | user      |
| `sita`        | Sita Gurung   | user      |
| `dr-sharma`   | Dr. Sharma    | therapist |
| `dr-patel`    | Dr. Patel     | therapist |
| `admin`       | Admin         | admin     |

Each role sees different navigation options:
- **Users** -- Dashboard, AI Chat, Mood, Community, Therapists
- **Therapists** -- All user features + Patient Insights
- **Admins** -- All user features + Admin Panel

## API Endpoints

| Method | Path                              | Description               | Auth     |
| ------ | --------------------------------- | ------------------------- | -------- |
| POST   | `/auth/demo`                      | Log in as a demo account  | No       |
| GET    | `/auth/me`                        | Current user info         | Bearer   |
| GET    | `/chat/history`                   | Chat message history      | Bearer   |
| POST   | `/chat/message`                   | Send a chat message       | Bearer   |
| GET    | `/mood/history`                   | Mood log history          | Bearer   |
| POST   | `/mood/log`                       | Log a mood entry          | Bearer   |
| GET    | `/posts`                          | List community posts      | No       |
| POST   | `/posts`                          | Create a post             | Bearer   |
| GET    | `/posts/{id}/comments`            | List comments on a post   | No       |
| POST   | `/posts/{id}/comments`            | Add a comment             | Bearer   |
| GET    | `/therapists`                     | List therapists           | No       |
| GET    | `/admin/stats`                    | Platform statistics       | Admin    |
| GET    | `/admin/users`                    | List all users            | Admin    |
| GET    | `/therapist-dashboard/patient-moods`  | Recent patient moods  | Therapist|
| GET    | `/therapist-dashboard/patient-list`   | Patient list          | Therapist|
| GET    | `/health`                         | Health check              | No       |

## Resetting the Database

To wipe all data and re-seed from scratch:

```bash
docker compose down -v
docker compose up -d
# Restart the backend -- tables and seed data are recreated on startup
```
