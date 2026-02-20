from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ===== Auth =====
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ===== User =====
class UserOut(BaseModel):
    id: int
    username: str
    email: str
    display_name: Optional[str]
    bio: str
    avatar_color: str
    is_online: bool
    last_seen: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_color: Optional[str] = None


# ===== Post =====
class PostCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=280)
    post_as_user_id: Optional[int] = None  # If posting on conquered account


class PostOut(BaseModel):
    id: int
    author_id: int
    author_username: str
    author_display_name: Optional[str]
    author_avatar_color: str
    posted_by_id: Optional[int]
    posted_by_username: Optional[str]
    text: str
    likes_count: int
    liked_by_me: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Challenge =====
class ChallengeCreate(BaseModel):
    defender_id: int


class ChallengeOut(BaseModel):
    id: int
    challenger_id: int
    challenger_username: str
    defender_id: int
    defender_username: str
    winner_id: Optional[int]
    loser_id: Optional[int]
    game_type: str
    status: str
    access_expires_at: Optional[datetime]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ChallengeComplete(BaseModel):
    winner_id: int


class ConqueredAccount(BaseModel):
    user_id: int
    username: str
    display_name: Optional[str]
    avatar_color: str
    expires_at: datetime
    challenge_id: int

    class Config:
        from_attributes = True


# Forward reference resolution
TokenResponse.model_rebuild()
