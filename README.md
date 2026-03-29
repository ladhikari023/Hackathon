# MankoSathi

A mental health support platform built for the South Asian community. MankoSathi (meaning "companion of the mind" in Nepali) provides AI-powered chat support, mood tracking, anonymous community discussions, profile-based social discovery, peer matching, and therapist outreach workflows.

## Features

- **AI Chat With Daily Limits** -- Talk to an empathetic AI companion with a free-tier cap of 3 AI replies per day; premium users can bypass the limit
- **Safety-Aware Mental Health Responses** -- Crisis keywords trigger a safer crisis-support response path instead of a normal assistant reply
- **Mood Tracking** -- Log daily moods with notes and view your history over time
- **Anonymous Community** -- Create posts and comments anonymously while still preserving account ownership in the database
- **User Profiles** -- Add a bio and health-status tags to your profile
- **Friend Requests** -- Send and accept friend requests from user profiles
- **Friend-Gated Profile Privacy** -- Bio stays visible, while other profile details are only shown to friends
- **Peer Matching** -- Get matched anonymously with another user for 1-on-1 support; opt in to become longer-term buddies
- **Tag-Based Peer Search** -- Search for other users in the Peer section using health-status tags
- **Therapist Directory** -- Browse therapists, send short intro messages, and view intro-message pricing
- **Therapist Intro Workflow** -- Therapists can accept or reject intro requests
- **Therapist Messaging Threads** -- Once a therapist accepts an intro request, the user and therapist can exchange messages in a dedicated thread
- **Therapist Settings** -- Therapists can manage their public profile details and choose whether the intro message is free or paid
- **Stripe Checkout Support** -- Paid therapist intro messages can create Stripe Checkout sessions for payment collection
- **Role-based Access** -- Separate dashboards for users, therapists, and admins
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
│   │   ├── friend_request.py
│   │   ├── therapist.py
│   │   ├── therapist_intro_request.py
│   │   ├── therapist_thread_message.py
│   │   ├── peer_match.py
│   │   └── peer_message.py
│   └── routers/              # API route handlers
│       ├── auth_router.py
│       ├── chat_router.py
│       ├── friend_router.py
│       ├── mood_router.py
│       ├── post_router.py
│       ├── peer_router.py
│       ├── profile_router.py
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
│       └── pages/            # LoginPage, ChatPage, MoodPage, PeerMatchPage, etc.
├── docker-compose.yml        # PostgreSQL service
└── .env.example              # Root env template (PostgreSQL credentials)
```

## Prerequisites

Make sure you have the following installed before proceeding:

- **Git** -- [git-scm.com](https://git-scm.com/)
- **Node.js** >= 18 -- [nodejs.org](https://nodejs.org/) (LTS recommended)
- **Python** >= 3.12 -- [python.org](https://www.python.org/)
- **uv** (Python package manager) -- install with `curl -LsSf https://astral.sh/uv/install.sh | sh` ([docs](https://docs.astral.sh/uv/))
- **Docker** -- [docker.com](https://www.docker.com/get-started/) (Docker Desktop includes `docker compose`)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ladhikari023/Hackathon.git
cd Hackathon
```

### 2. Set up environment variables

Create a root `.env` file (used by Docker Compose for PostgreSQL):

```bash
cp .env.example .env
```

Create the backend `.env` file:

```bash
cat > backend/.env << 'EOF'
# Database
DATABASE_URL=postgresql+asyncpg://mankosathi:mankosathi_secret@localhost:5432/mankosathi
DATABASE_URL_SYNC=postgresql+psycopg2://mankosathi:mankosathi_secret@localhost:5432/mankosathi

# JWT
JWT_SECRET=change-me-to-a-random-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# AI chat
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
FREE_DAILY_AI_REPLIES=3

# Frontend / Stripe
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EOF
```

> **Notes:**
> - For production, replace `JWT_SECRET` with a long random string.
> - If `OPENAI_API_KEY` is not set, the AI chat falls back to built-in supportive placeholder responses.
> - Stripe is optional for local development unless you want to test paid therapist intro messages.

### 3. Start the database

```bash
docker compose up -d
```

Verify it's running:

```bash
docker ps
# You should see a container named "mankosathi-db"
```

### 4. Start the backend

```bash
cd backend
uv sync          # installs Python dependencies into a local .venv
uv run uvicorn main:app --reload --port 8000
```

On first startup the backend automatically:
- Creates all database tables
- Seeds demo user accounts, therapist profiles, community posts, comments, mood logs, chat history, and a sample peer buddy pair

The API will be available at **http://localhost:8000**. You can view the auto-generated API docs at **http://localhost:8000/docs**.

### 5. Start the frontend

Open a **new terminal** and run:

```bash
cd frontend
npm install      # installs Node dependencies
npm run dev
```

The app will be available at **http://localhost:3000**.

> Vite is configured to proxy API requests from `/api/*` to the backend at `localhost:8000`, so both servers need to be running simultaneously.

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
- **Users** -- Dashboard, Profile, AI Chat, Mood, Community, Therapists, Peer Match
- **Therapists** -- All user features + Patient Insights + Therapist Settings
- **Admins** -- All user features + Admin Panel

To demo **peer matching**, open two browser windows (or use a private/incognito window), log in as two different users, and click "Find a Peer" on both. They'll be matched within a few seconds. Ram and Sita already have a seeded buddy connection you can explore immediately.

To demo **friend-gated profiles**, open two user accounts and:
- visit Community
- open a user's profile from a post
- send a friend request
- accept it from the other user's profile

To demo **therapist intro messaging**, log in as a user, send an intro from the Therapists page, then log in as a therapist and review the request from Patient Insights. For paid intros, Stripe test keys and webhook forwarding are required.

## API Endpoints

| Method | Path                                    | Description               | Auth      |
| ------ | --------------------------------------- | ------------------------- | --------- |
| POST   | `/auth/demo`                            | Log in as a demo account  | No        |
| GET    | `/auth/me`                              | Current user info         | Bearer    |
| GET    | `/chat/history`                         | Chat message history      | Bearer    |
| GET    | `/chat/usage`                           | Current daily AI usage    | Bearer    |
| POST   | `/chat/message`                         | Send a chat message       | Bearer    |
| GET    | `/mood/history`                         | Mood log history          | Bearer    |
| POST   | `/mood/log`                             | Log a mood entry          | Bearer    |
| GET    | `/posts`                                | List community posts      | No        |
| POST   | `/posts`                                | Create a post             | Bearer    |
| GET    | `/posts/{id}/comments`                  | List comments on a post   | No        |
| POST   | `/posts/{id}/comments`                  | Add a comment             | Bearer    |
| GET    | `/users/me/profile`                     | Current user profile      | Bearer    |
| PATCH  | `/users/me/profile`                     | Update bio and health tags| Bearer    |
| GET    | `/users/{id}/profile`                   | View another user's profile | Bearer  |
| GET    | `/friends/requests`                     | List incoming/outgoing friend requests | Bearer |
| POST   | `/friends/requests/{user_id}`           | Send a friend request     | Bearer    |
| POST   | `/friends/requests/{request_id}/accept` | Accept a friend request   | Bearer    |
| GET    | `/friends/search`                       | Search users by health-status tags | Bearer |
| GET    | `/therapists`                           | List therapists           | No        |
| POST   | `/therapists/{id}/intro-request`        | Send intro message to therapist | Bearer |
| GET    | `/therapists/requests/mine`             | List my therapist intro requests | Bearer |
| GET    | `/therapists/requests/incoming`         | Therapist intro inbox     | Therapist |
| POST   | `/therapists/requests/{id}/accept`      | Accept intro request      | Therapist |
| POST   | `/therapists/requests/{id}/reject`      | Reject intro request      | Therapist |
| GET    | `/therapists/requests/{id}/messages`    | Accepted therapist thread | Bearer    |
| POST   | `/therapists/requests/{id}/messages`    | Send therapist thread message | Bearer |
| GET    | `/therapists/me/settings`               | Get therapist settings    | Therapist |
| PATCH  | `/therapists/me/settings`               | Update therapist profile and pricing | Therapist |
| POST   | `/therapists/stripe/webhook`            | Stripe webhook endpoint   | No        |
| POST   | `/peers/queue`                          | Join the peer match queue | Bearer    |
| DELETE | `/peers/queue`                          | Leave the queue           | Bearer    |
| GET    | `/peers/match`                          | Get current match         | Bearer    |
| GET    | `/peers/match/{id}/messages`            | Peer chat messages        | Bearer    |
| POST   | `/peers/match/{id}/messages`            | Send a peer message       | Bearer    |
| POST   | `/peers/match/{id}/buddy`               | Opt in to become buddies  | Bearer    |
| POST   | `/peers/match/{id}/end`                 | End a match               | Bearer    |
| GET    | `/peers/buddies`                        | List buddy connections    | Bearer    |
| GET    | `/admin/stats`                          | Platform statistics       | Admin     |
| GET    | `/admin/users`                          | List all users            | Admin     |
| GET    | `/therapist-dashboard/patient-moods`    | Recent patient moods      | Therapist |
| GET    | `/therapist-dashboard/patient-list`     | Patient list              | Therapist |
| GET    | `/health`                               | Health check              | No        |

## Stripe Testing

If you want to test paid therapist intro messages locally:

1. Add Stripe test keys to `backend/.env`
2. Restart the backend
3. Forward Stripe webhooks to your backend:

```bash
stripe listen --forward-to localhost:8000/therapists/stripe/webhook
```

4. Copy the webhook signing secret printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET`
5. Use a Stripe test card such as `4242 4242 4242 4242`

Without Stripe env vars, paid intro requests cannot complete checkout.

## Resetting the Database

To wipe all data and re-seed from scratch:

```bash
docker compose down -v    # removes container + data volume
docker compose up -d      # starts fresh PostgreSQL
# Restart the backend -- tables and seed data are recreated on startup
```

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| `docker compose up` fails | Make sure Docker Desktop is running |
| Backend can't connect to DB | Wait a few seconds after `docker compose up -d` for PostgreSQL to initialize, then try again |
| `uv: command not found` | Install uv: `curl -LsSf https://astral.sh/uv/install.sh \| sh` then restart your terminal |
| Frontend shows network errors | Make sure the backend is running on port 8000 in a separate terminal |
| Stale data after code changes | Reset the database (see section above) |
