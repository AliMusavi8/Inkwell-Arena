# Inkwell ⚔️

A Twitter-like social platform with a unique **Challenge Arena** — play Tic Tac Toe against other users, and the winner gets 10 minutes to post on the loser's account!

## Project Structure

```
├── frontend/       # React + TypeScript + Vite
│   ├── src/
│   │   ├── api.ts              # API client layer
│   │   ├── context/            # Auth + WebSocket providers
│   │   ├── components/         # Sidebar, Header, AuthModal, TicTacToe
│   │   └── pages/              # Feed, Challenge, Settings
│   └── .env.example
├── backend/        # FastAPI + Python
│   ├── main.py                 # App entry + WebSocket endpoint
│   ├── models.py               # SQLAlchemy models
│   ├── routers/                # API routes
│   └── .env.example
├── .gitignore
└── README.md
```

## Features

- 🐦 **Twitter-style Feed** — 280-char text posts with likes
- ⚔️ **Challenge Arena** — Challenge other users to Tic Tac Toe
- 🏆 **Account Conquest** — Winner posts on loser's account for 10 minutes
- 🔴 **Real-time** — WebSocket-powered online status + game moves
- 🔐 **JWT Authentication** — Secure login/registration
- 📊 **Supabase** — Cloud PostgreSQL database

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase account (free tier)

### Backend

```bash
cd backend
cp .env.example .env        # Edit with your Supabase credentials
pip install -r requirements.txt
python main.py              # → http://localhost:8000
```

### Frontend

```bash
cd frontend
cp .env.example .env        # Optional for local dev
npm install
npm run dev                 # → http://localhost:5173
```

## Deployment

| Service | Platform | Config |
|---------|----------|--------|
| Frontend | Vercel | Root: `frontend/`, Framework: Vite |
| Backend | Render | Root: `backend/`, Start: `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Database | Supabase | PostgreSQL (already cloud-hosted) |

### Environment Variables

**Vercel (Frontend):**
- `VITE_API_URL` = your Render backend URL

**Render (Backend):**
- `DATABASE_URL` = Supabase connection string
- `JWT_SECRET` = strong random secret
- `ALLOWED_ORIGINS` = your Vercel domain
