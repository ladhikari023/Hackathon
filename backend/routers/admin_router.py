from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from auth import get_current_user
from database import get_session
from models.chat import ChatMessage
from models.mood import MoodLog
from models.post import Post
from models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: User) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/stats")
async def admin_stats(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _require_admin(user)

    users = (await session.exec(select(func.count(User.id)))).one()
    posts = (await session.exec(select(func.count(Post.id)))).one()
    mood_logs = (await session.exec(select(func.count(MoodLog.id)))).one()
    chat_messages = (await session.exec(select(func.count(ChatMessage.id)))).one()

    role_counts_result = await session.exec(
        select(User.role, func.count(User.id)).group_by(User.role)
    )
    roles = {role: count for role, count in role_counts_result.all()}

    return {
        "total_users": users,
        "total_posts": posts,
        "total_mood_logs": mood_logs,
        "total_chat_messages": chat_messages,
        "users_by_role": roles,
    }


@router.get("/users")
async def list_users(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _require_admin(user)

    result = await session.exec(select(User).order_by(User.created_at.desc()).limit(50))
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "provider": u.provider,
            "created_at": u.created_at.isoformat(),
        }
        for u in result.all()
    ]
