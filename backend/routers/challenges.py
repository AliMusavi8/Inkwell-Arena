from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from typing import List

from database import get_db
from models import Challenge, User
from schemas import ChallengeCreate, ChallengeOut, ChallengeComplete, ConqueredAccount
from auth import get_current_user

router = APIRouter(prefix="/api/challenges", tags=["challenges"])

CONQUEST_DURATION_MINUTES = 10


def challenge_to_out(c: Challenge) -> ChallengeOut:
    return ChallengeOut(
        id=c.id,
        challenger_id=c.challenger_id,
        challenger_username=c.challenger.username,
        defender_id=c.defender_id,
        defender_username=c.defender.username,
        winner_id=c.winner_id,
        loser_id=c.loser_id,
        game_type=c.game_type,
        status=c.status,
        access_expires_at=c.access_expires_at,
        created_at=c.created_at,
        completed_at=c.completed_at,
    )


@router.post("", response_model=ChallengeOut, status_code=201)
def create_challenge(
    data: ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.defender_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot challenge yourself")

    defender = db.query(User).filter(User.id == data.defender_id).first()
    if not defender:
        raise HTTPException(status_code=404, detail="User not found")

    # Check for existing active challenge between these users
    existing = db.query(Challenge).filter(
        Challenge.status.in_(["pending", "active"]),
        or_(
            and_(Challenge.challenger_id == current_user.id, Challenge.defender_id == data.defender_id),
            and_(Challenge.challenger_id == data.defender_id, Challenge.defender_id == current_user.id),
        ),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="There is already an active challenge between you two")

    challenge = Challenge(
        challenger_id=current_user.id,
        defender_id=data.defender_id,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge_to_out(challenge)


@router.put("/{challenge_id}/accept", response_model=ChallengeOut)
def accept_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.defender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your challenge to accept")
    if challenge.status != "pending":
        raise HTTPException(status_code=400, detail="Challenge is no longer pending")

    challenge.status = "active"
    db.commit()
    db.refresh(challenge)
    return challenge_to_out(challenge)


@router.put("/{challenge_id}/decline", response_model=ChallengeOut)
def decline_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.defender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your challenge to decline")
    if challenge.status != "pending":
        raise HTTPException(status_code=400, detail="Challenge is no longer pending")

    challenge.status = "declined"
    db.commit()
    db.refresh(challenge)
    return challenge_to_out(challenge)


@router.put("/{challenge_id}/complete", response_model=ChallengeOut)
def complete_challenge(
    challenge_id: int,
    data: ChallengeComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.status != "active":
        raise HTTPException(status_code=400, detail="Challenge is not active")
    if current_user.id not in [challenge.challenger_id, challenge.defender_id]:
        raise HTTPException(status_code=403, detail="Not part of this challenge")

    now = datetime.utcnow()
    challenge.status = "completed"
    challenge.completed_at = now

    if data.winner_id:
        # Determine winner and loser
        if data.winner_id == challenge.challenger_id:
            challenge.winner_id = challenge.challenger_id
            challenge.loser_id = challenge.defender_id
        elif data.winner_id == challenge.defender_id:
            challenge.winner_id = challenge.defender_id
            challenge.loser_id = challenge.challenger_id
        else:
            raise HTTPException(status_code=400, detail="Invalid winner ID")

        challenge.access_expires_at = now + timedelta(minutes=CONQUEST_DURATION_MINUTES)

    db.commit()
    db.refresh(challenge)
    return challenge_to_out(challenge)


@router.get("/active-access", response_model=List[ConqueredAccount])
def get_active_access(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    challenges = (
        db.query(Challenge)
        .filter(
            Challenge.winner_id == current_user.id,
            Challenge.status == "completed",
            Challenge.access_expires_at > now,
        )
        .all()
    )

    result = []
    for c in challenges:
        loser = db.query(User).filter(User.id == c.loser_id).first()
        if loser:
            result.append(ConqueredAccount(
                user_id=loser.id,
                username=loser.username,
                display_name=loser.display_name,
                avatar_color=loser.avatar_color,
                expires_at=c.access_expires_at,
                challenge_id=c.id,
            ))
    return result


@router.get("/history", response_model=List[ChallengeOut])
def get_challenge_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenges = (
        db.query(Challenge)
        .filter(
            or_(
                Challenge.challenger_id == current_user.id,
                Challenge.defender_id == current_user.id,
            )
        )
        .order_by(desc(Challenge.created_at))
        .limit(20)
        .all()
    )
    return [challenge_to_out(c) for c in challenges]


@router.get("/pending", response_model=List[ChallengeOut])
def get_pending_challenges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenges = (
        db.query(Challenge)
        .filter(
            Challenge.defender_id == current_user.id,
            Challenge.status == "pending",
        )
        .order_by(desc(Challenge.created_at))
        .all()
    )
    return [challenge_to_out(c) for c in challenges]
