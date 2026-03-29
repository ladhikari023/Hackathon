from __future__ import annotations

from uuid import UUID

from sqlmodel import and_, or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from models.friend_request import FriendRequest
from models.peer_match import PeerMatch


async def get_friend_request_between(
    session: AsyncSession,
    user_a_id: UUID,
    user_b_id: UUID,
) -> FriendRequest | None:
    result = await session.exec(
        select(FriendRequest)
        .where(
            or_(
                and_(FriendRequest.requester_id == user_a_id, FriendRequest.recipient_id == user_b_id),
                and_(FriendRequest.requester_id == user_b_id, FriendRequest.recipient_id == user_a_id),
            )
        )
        .order_by(FriendRequest.created_at.desc())
    )
    return result.first()


async def are_users_friends(session: AsyncSession, user_a_id: UUID, user_b_id: UUID) -> bool:
    accepted_request = await session.exec(
        select(FriendRequest.id).where(
            FriendRequest.status == "accepted",
            or_(
                and_(FriendRequest.requester_id == user_a_id, FriendRequest.recipient_id == user_b_id),
                and_(FriendRequest.requester_id == user_b_id, FriendRequest.recipient_id == user_a_id),
            ),
        )
    )
    if accepted_request.first():
        return True

    buddy_match = await session.exec(
        select(PeerMatch.id).where(
            PeerMatch.status == "buddy",
            or_(
                and_(PeerMatch.user1_id == user_a_id, PeerMatch.user2_id == user_b_id),
                and_(PeerMatch.user1_id == user_b_id, PeerMatch.user2_id == user_a_id),
            ),
        )
    )
    return buddy_match.first() is not None


async def friendship_state(session: AsyncSession, current_user_id: UUID, target_user_id: UUID) -> dict:
    if current_user_id == target_user_id:
        return {"status": "self", "request": None}

    if await are_users_friends(session, current_user_id, target_user_id):
        return {"status": "friends", "request": None}

    request = await get_friend_request_between(session, current_user_id, target_user_id)
    if not request or request.status != "pending":
        return {"status": "none", "request": None}

    if request.requester_id == current_user_id:
        return {"status": "outgoing_request", "request": request}
    return {"status": "incoming_request", "request": request}
