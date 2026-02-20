from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User
from schemas import UserOut, UserUpdate
from auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[UserOut])
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).filter(User.id != current_user.id).all()
    return [UserOut.model_validate(u) for u in users]


@router.get("/online", response_model=List[UserOut])
def get_online_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).filter(User.is_online == True, User.id != current_user.id).all()
    return [UserOut.model_validate(u) for u in users]


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
def update_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.bio is not None:
        current_user.bio = data.bio
    if data.avatar_color is not None:
        current_user.avatar_color = data.avatar_color
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)
