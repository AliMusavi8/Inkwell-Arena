from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100), default="")
    bio = Column(Text, default="")
    avatar_color = Column(String(7), default="#4F6AF6")
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    posts = relationship("Post", back_populates="author", foreign_keys="Post.author_id")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    posted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    text = Column(String(280), nullable=False)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User", back_populates="posts", foreign_keys=[author_id])
    posted_by = relationship("User", foreign_keys=[posted_by_id])
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    challenger_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    defender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    loser_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    game_type = Column(String(20), default="tic_tac_toe")
    status = Column(String(20), default="pending")  # pending, active, completed, declined
    access_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    challenger = relationship("User", foreign_keys=[challenger_id])
    defender = relationship("User", foreign_keys=[defender_id])
    winner = relationship("User", foreign_keys=[winner_id])
    loser = relationship("User", foreign_keys=[loser_id])


class PostLike(Base):
    __tablename__ = "post_likes"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"), primary_key=True)

    post = relationship("Post", back_populates="likes")
