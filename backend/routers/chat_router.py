from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from auth import get_current_user
from config import FREE_DAILY_AI_REPLIES
from database import get_session
from models.chat import ChatMessage
from models.user import User
from services.ai_chat_service import generate_ai_reply

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageRequest(BaseModel):
    message: str


def _start_of_today_utc() -> datetime:
    now = datetime.now(UTC)
    return datetime(now.year, now.month, now.day)


async def _get_today_ai_reply_count(session: AsyncSession, user_id) -> int:
    result = await session.exec(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .where(ChatMessage.role == "ai")
        .where(ChatMessage.created_at >= _start_of_today_utc())
    )
    return len(result.all())


async def _get_chat_usage(session: AsyncSession, user: User) -> dict:
    used_today = await _get_today_ai_reply_count(session, user.id)
    if user.is_premium:
        return {
            "is_premium": True,
            "daily_limit": None,
            "used_today": used_today,
            "remaining_today": None,
        }

    remaining_today = max(FREE_DAILY_AI_REPLIES - used_today, 0)
    return {
        "is_premium": False,
        "daily_limit": FREE_DAILY_AI_REPLIES,
        "used_today": used_today,
        "remaining_today": remaining_today,
    }


@router.post("/message")
async def send_message(
    body: MessageRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    usage = await _get_chat_usage(session, user)
    if not user.is_premium and usage["remaining_today"] == 0:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "free_limit_reached",
                "message": "You have used all free AI replies for today.",
                "usage": usage,
            },
        )

    user_msg = ChatMessage(user_id=user.id, role="user", message=body.message)
    session.add(user_msg)
    await session.flush()

    history_result = await session.exec(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at)
    )
    history = history_result.all()

    ai_text = await generate_ai_reply(history[:-1], body.message)

    ai_msg = ChatMessage(user_id=user.id, role="ai", message=ai_text)
    session.add(ai_msg)

    await session.commit()
    await session.refresh(ai_msg)

    updated_usage = await _get_chat_usage(session, user)
    return {
        "id": str(ai_msg.id),
        "role": ai_msg.role,
        "message": ai_msg.message,
        "created_at": ai_msg.created_at.isoformat(),
        "usage": updated_usage,
    }


@router.get("/history")
async def chat_history(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at)
    )
    msgs = result.all()
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "message": m.message,
            "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ]


@router.get("/usage")
async def chat_usage(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await _get_chat_usage(session, user)
