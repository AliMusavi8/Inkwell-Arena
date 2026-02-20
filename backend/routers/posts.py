from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from database import get_db
from models import Post, PostLike, User, Challenge
from schemas import PostCreate, PostOut
from auth import get_current_user

router = APIRouter(prefix="/api/posts", tags=["posts"])


def post_to_out(post: Post, current_user_id: int, db: Session) -> PostOut:
    liked = db.query(PostLike).filter(
        PostLike.user_id == current_user_id,
        PostLike.post_id == post.id,
    ).first() is not None

    return PostOut(
        id=post.id,
        author_id=post.author_id,
        author_username=post.author.username,
        author_display_name=post.author.display_name,
        author_avatar_color=post.author.avatar_color,
        posted_by_id=post.posted_by_id,
        posted_by_username=post.posted_by.username if post.posted_by else None,
        text=post.text,
        likes_count=post.likes_count,
        liked_by_me=liked,
        created_at=post.created_at,
    )


@router.get("", response_model=List[PostOut])
def get_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    posts = (
        db.query(Post)
        .order_by(desc(Post.created_at))
        .limit(100)
        .all()
    )
    return [post_to_out(p, current_user.id, db) for p in posts]


@router.post("", response_model=PostOut, status_code=201)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    author_id = current_user.id
    posted_by_id = None

    if data.post_as_user_id and data.post_as_user_id != current_user.id:
        # Verify the user has active access to this account
        now = datetime.utcnow()
        access = db.query(Challenge).filter(
            Challenge.winner_id == current_user.id,
            Challenge.loser_id == data.post_as_user_id,
            Challenge.status == "completed",
            Challenge.access_expires_at > now,
        ).first()

        if not access:
            raise HTTPException(status_code=403, detail="You don't have access to this account or access has expired")

        author_id = data.post_as_user_id
        posted_by_id = current_user.id

    post = Post(
        author_id=author_id,
        posted_by_id=posted_by_id,
        text=data.text,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    return post_to_out(post, current_user.id, db)


@router.post("/{post_id}/like")
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(PostLike).filter(
        PostLike.user_id == current_user.id,
        PostLike.post_id == post_id,
    ).first()

    if existing:
        db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
    else:
        like = PostLike(user_id=current_user.id, post_id=post_id)
        db.add(like)
        post.likes_count += 1

    db.commit()
    return {"liked": existing is None, "likes_count": post.likes_count}
