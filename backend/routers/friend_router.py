from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from auth import get_current_user
from database import get_session
from models.friend_request import FriendRequest
from models.user import User
from services.friend_service import are_users_friends, friendship_state

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("/requests")
async def list_friend_requests(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    incoming_result = await session.exec(
        select(FriendRequest, User)
        .join(User, FriendRequest.requester_id == User.id)
        .where(FriendRequest.recipient_id == user.id, FriendRequest.status == "pending")
        .order_by(FriendRequest.created_at.desc())
    )
    outgoing_result = await session.exec(
        select(FriendRequest, User)
        .join(User, FriendRequest.recipient_id == User.id)
        .where(FriendRequest.requester_id == user.id, FriendRequest.status == "pending")
        .order_by(FriendRequest.created_at.desc())
    )

    return {
        "incoming": [
            {
                "id": str(request.id),
                "user_id": str(requester.id),
                "user_name": requester.name,
                "created_at": request.created_at.isoformat(),
            }
            for request, requester in incoming_result.all()
        ],
        "outgoing": [
            {
                "id": str(request.id),
                "user_id": str(recipient.id),
                "user_name": recipient.name,
                "created_at": request.created_at.isoformat(),
            }
            for request, recipient in outgoing_result.all()
        ],
    }


@router.post("/requests/{user_id}")
async def send_friend_request(
    user_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.id) == user_id:
        raise HTTPException(status_code=400, detail="You cannot send a request to yourself")
    if await are_users_friends(session, user.id, target.id):
        raise HTTPException(status_code=400, detail="You are already friends")

    state = await friendship_state(session, user.id, target.id)
    if state["status"] == "outgoing_request":
        raise HTTPException(status_code=400, detail="Friend request already sent")
    if state["status"] == "incoming_request":
        raise HTTPException(status_code=400, detail="This user has already sent you a request")

    request = FriendRequest(requester_id=user.id, recipient_id=target.id)
    session.add(request)
    await session.commit()
    await session.refresh(request)

    return {
        "id": str(request.id),
        "status": "pending",
        "user_id": str(target.id),
        "user_name": target.name,
        "created_at": request.created_at.isoformat(),
    }


@router.post("/requests/{request_id}/accept")
async def accept_friend_request(
    request_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    request = await session.get(FriendRequest, request_id)
    if not request or request.recipient_id != user.id or request.status != "pending":
        raise HTTPException(status_code=404, detail="Friend request not found")

    request.status = "accepted"
    session.add(request)
    await session.commit()
    await session.refresh(request)

    requester = await session.get(User, request.requester_id)
    return {
        "id": str(request.id),
        "status": request.status,
        "user_id": str(request.requester_id),
        "user_name": requester.name if requester else "Friend",
        "created_at": request.created_at.isoformat(),
    }
