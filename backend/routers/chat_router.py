from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from auth import get_current_user
from database import get_session
from models.chat import ChatMessage
from models.user import User

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageRequest(BaseModel):
    message: str


@router.post("/message")
async def send_message(
    body: MessageRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_msg = ChatMessage(user_id=user.id, role="user", message=body.message)
    session.add(user_msg)

    # TODO: Replace with real LLM API call (OpenAI / Gemini)
    ai_text = _placeholder_reply(body.message)

    ai_msg = ChatMessage(user_id=user.id, role="ai", message=ai_text)
    session.add(ai_msg)

    await session.commit()
    await session.refresh(ai_msg)

    return {
        "id": str(ai_msg.id),
        "role": ai_msg.role,
        "message": ai_msg.message,
        "created_at": ai_msg.created_at.isoformat(),
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


def _placeholder_reply(user_message: str) -> str:
    """Keyword-aware placeholder until a real LLM is wired up."""
    lower = user_message.lower()
    if any(w in lower for w in ("lonely", "alone")):
        return "Feeling lonely can be really painful. You're reaching out right now, and that's a brave step. You're not as alone as you might feel."
    if any(w in lower for w in ("stress", "overwhelm")):
        return "Stress can feel all-consuming. Let's try to break things down — what's the one thing weighing on you the most right now?"
    if any(w in lower for w in ("happy", "good", "great")):
        return "That's wonderful to hear! What's contributing to your positive mood today? Recognizing these moments is really valuable."
    if any(w in lower for w in ("sad", "depress", "down")):
        return "I'm sorry you're feeling this way. Would you like to try a quick grounding exercise together?"
    if any(w in lower for w in ("anxious", "anxiety", "worried")):
        return "Anxiety can be really overwhelming. Try naming 5 things you can see around you right now — it can help bring you back to the present."
    if any(w in lower for w in ("sleep", "tired", "insomnia")):
        return "Sleep difficulties can really affect how we feel. A consistent bedtime routine and limiting screens before bed can help. How long has this been going on?"
    return "I hear you, and I want you to know that your feelings are completely valid. Would you like to tell me more about what's on your mind?"
