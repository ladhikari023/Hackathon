from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from auth import get_current_user
from database import get_session
from models.mood import MoodLog
from models.user import User

router = APIRouter(prefix="/therapist-dashboard", tags=["therapist-dashboard"])


def _require_therapist(user: User) -> User:
    if user.role != "therapist":
        raise HTTPException(status_code=403, detail="Therapist access required")
    return user


@router.get("/patient-moods")
async def patient_moods(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Recent mood logs across all users (therapist overview)."""
    _require_therapist(user)

    result = await session.exec(
        select(MoodLog, User.name)
        .join(User, MoodLog.user_id == User.id)
        .order_by(MoodLog.created_at.desc())
        .limit(30)
    )
    return [
        {
            "id": str(m.id),
            "user_name": name,
            "mood": m.mood,
            "note": m.note,
            "created_at": m.created_at.isoformat(),
        }
        for m, name in result.all()
    ]


@router.get("/patient-list")
async def patient_list(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List of users (patients) for the therapist."""
    _require_therapist(user)

    result = await session.exec(
        select(User).where(User.role == "user").order_by(User.name)
    )
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "created_at": u.created_at.isoformat(),
        }
        for u in result.all()
    ]
