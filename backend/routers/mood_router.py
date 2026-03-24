from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from auth import get_current_user
from database import get_session
from models.mood import MoodLog
from models.user import User

router = APIRouter(prefix="/mood", tags=["mood"])


class MoodRequest(BaseModel):
    mood: str
    note: str = ""


@router.post("/log")
async def log_mood(
    body: MoodRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    mood_log = MoodLog(user_id=user.id, mood=body.mood, note=body.note)
    session.add(mood_log)
    await session.commit()
    await session.refresh(mood_log)
    return {
        "id": str(mood_log.id),
        "mood": mood_log.mood,
        "note": mood_log.note,
        "created_at": mood_log.created_at.isoformat(),
    }


@router.get("/history")
async def mood_history(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(MoodLog)
        .where(MoodLog.user_id == user.id)
        .order_by(MoodLog.created_at.desc())
        .limit(30)
    )
    logs = result.all()
    return [
        {
            "id": str(m.id),
            "mood": m.mood,
            "note": m.note,
            "created_at": m.created_at.isoformat(),
        }
        for m in logs
    ]
