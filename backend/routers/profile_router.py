from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession

from auth import get_current_user
from database import get_session
from models.user import User
from services.friend_service import friendship_state

router = APIRouter(prefix="/users", tags=["profiles"])


class ProfileUpdateRequest(BaseModel):
    bio: str


def _profile_response(target: User, state: dict) -> dict:
    is_self = state["status"] == "self"
    are_friends = state["status"] == "friends"
    can_view_details = is_self or are_friends

    return {
        "id": str(target.id),
        "display_name": target.name if can_view_details else "Community member",
        "bio": target.bio,
        "is_self": is_self,
        "are_friends": are_friends,
        "can_view_details": can_view_details,
        "friendship_status": state["status"],
        "pending_request_id": str(state["request"].id) if state["request"] else None,
        "name": target.name if can_view_details else None,
        "email": target.email if can_view_details else None,
        "role": target.role if can_view_details else None,
        "created_at": target.created_at.isoformat() if can_view_details else None,
    }


@router.get("/me/profile")
async def my_profile(
    user: User = Depends(get_current_user),
):
    return _profile_response(user, {"status": "self", "request": None})


@router.patch("/me/profile")
async def update_my_profile(
    body: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user.bio = body.bio.strip()
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return _profile_response(user, {"status": "self", "request": None})


@router.get("/{user_id}/profile")
async def user_profile(
    user_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    state = await friendship_state(session, user.id, target.id)
    return _profile_response(target, state)
