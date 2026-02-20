from typing import Dict, List
from fastapi import WebSocket
import json


class ConnectionManager:
    """Manages WebSocket connections for online status and game events."""

    def __init__(self):
        # user_id -> WebSocket
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections

    def get_online_user_ids(self) -> List[int]:
        return list(self.active_connections.keys())

    async def send_to_user(self, user_id: int, message: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, message: dict, exclude: int = None):
        disconnected = []
        for uid, ws in self.active_connections.items():
            if uid == exclude:
                continue
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                disconnected.append(uid)
        for uid in disconnected:
            self.disconnect(uid)


manager = ConnectionManager()
