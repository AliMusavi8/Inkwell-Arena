<div align="center">
  <img src="frontend/src/assets/inkwell-logo.png" alt="Swords" width="120" />
  <h1>Inkwell Arena</h1>
  <p><b>A Twitter-like Social Platform with High-Stakes Minigames</b></p>

  <p>
    <a href="#-features">Features</a> •
    <a href="#%EF%B8%8F-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a>
  </p>
</div>

---

## 📖 Overview

Inkwell Arena is a modern social media platform that adds a unique, high-stakes twist to the traditional feed. Users can challenge each other to real-time multiplayer minigames. The twist? **The winner gains 10 minutes of complete posting access to the loser's account.**

## ✨ Features

- 🐦 **Real-Time Social Feed:** Post 280-character updates, like, and interact instantly.
- ⚔️ **Challenge System:** Send and receive live game challenges via WebSockets.
- 🎮 **Three Built-in Minigames:**
  - **Tic Tac Toe:** The classic battle of wits.
  - **Chicken Runner:** An endless runner where you dodge obstacles faster than your opponent.
  - **Stick Fighter:** A fast-paced 2D combat game with health, energy, punches, kicks, and specials!
- 🏆 **Conquest Mechanics:** Winner takes over the loser's account for 10 minutes. 

---

## 🛠️ Tech Stack

**Frontend**
- React 19 (TypeScript)
- Vite for lightning-fast builds
- Vanilla CSS with custom design tokens for a premium look
- React Router v7 for navigation
- React Icons

**Backend**
- Python 3.10+
- FastAPI (High-performance API framework)
- WebSockets for real-time multiplayer sync
- SQLAlchemy 2.0 (ORM)
- JWT Authentication & bcrypt hashing

**Database**
- PostgreSQL (Hosted on Supabase)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Python](https://www.python.org/) (v3.10 or newer)
- A [Supabase](https://supabase.com/) account (for the database)

### 1. Database Setup
1. Create a new project in Supabase.
2. Obtain your Postgres connection string (`DATABASE_URL`).

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Copy the environment template
cp .env.example .env
```
Edit the `.env` file and add your `DATABASE_URL` and a secure `JWT_SECRET`.

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
```
*The backend will be running at `http://localhost:8000`*

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Copy the environment template (optional for local dev)
cp .env.example .env

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```
*The frontend will be running at `http://localhost:5173`*

---
<div align="center">
  <i>Built with ❤️ for high-stakes posting. 
  
  P.S: Don't expect a lot of features, this is just a proof of concept.</i>
</div>
