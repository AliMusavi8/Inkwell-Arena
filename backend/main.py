import os
import json
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from models import User
from auth import decode_token
from websocket_manager import manager

from routers import auth_routes, users, posts, challenges

# Create all tables
Base.metadata.create_all(bind=engine)

# Reset all users to offline on startup (handles unclean shutdowns)
_db = next(get_db())
_db.query(User).update({User.is_online: False})
_db.commit()
_db.close()

app = FastAPI(title="Inkwell API", version="1.0.0")

# CORS
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_routes.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(challenges.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "inkwell"}


@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user_id = decode_token(token)
    if user_id is None:
        await websocket.close(code=4001)
        return

    db: Session = next(get_db())
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=4001)
        db.close()
        return

    # Connect & mark online
    await manager.connect(websocket, user_id)
    user.is_online = True
    user.last_seen = datetime.utcnow()
    db.commit()

    # Broadcast that this user is online
    await manager.broadcast(
        {"type": "user_online", "user_id": user_id, "username": user.username},
        exclude=user_id,
    )

    # Send the newly connected user a list of who's already online
    online_ids = [uid for uid in manager.active_connections if uid != user_id]
    if online_ids:
        await manager.send_to_user(user_id, {
            "type": "online_users",
            "user_ids": online_ids,
        })

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")

            if msg_type == "game_move":
                # Forward game move to the opponent
                opponent_id = message.get("opponent_id")
                await manager.send_to_user(opponent_id, {
                    "type": "game_move",
                    "from_user_id": user_id,
                    "position": message.get("position"),
                    "challenge_id": message.get("challenge_id"),
                })

            elif msg_type == "challenge_sent":
                defender_id = message.get("defender_id")
                await manager.send_to_user(defender_id, {
                    "type": "challenge_received",
                    "challenger_id": user_id,
                    "challenger_username": user.username,
                    "challenge_id": message.get("challenge_id"),
                })

            elif msg_type == "challenge_accepted":
                challenger_id = message.get("challenger_id")
                await manager.send_to_user(challenger_id, {
                    "type": "challenge_accepted",
                    "defender_id": user_id,
                    "defender_username": user.username,
                    "challenge_id": message.get("challenge_id"),
                })

            elif msg_type == "challenge_declined":
                challenger_id = message.get("challenger_id")
                await manager.send_to_user(challenger_id, {
                    "type": "challenge_declined",
                    "defender_id": user_id,
                    "defender_username": user.username,
                    "challenge_id": message.get("challenge_id"),
                })

            elif msg_type == "game_over":
                opponent_id = message.get("opponent_id")
                await manager.send_to_user(opponent_id, {
                    "type": "game_over",
                    "winner_id": message.get("winner_id"),
                    "challenge_id": message.get("challenge_id"),
                })

            elif msg_type == "siege_released":
                loser_id = message.get("loser_id")
                await manager.send_to_user(loser_id, {
                    "type": "siege_released",
                    "winner_username": message.get("winner_username"),
                })

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(user_id)
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_online = False
                user.last_seen = datetime.utcnow()
                db.commit()
        except Exception:
            pass
        finally:
            db.close()

        await manager.broadcast(
            {"type": "user_offline", "user_id": user_id},
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
