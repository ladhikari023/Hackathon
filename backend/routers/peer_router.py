from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from auth import get_current_user
from database import get_session
from models.peer_match import PeerMatch
from models.peer_message import PeerMessage
from models.user import User

router = APIRouter(prefix="/peers", tags=["peers"])


class MessageRequest(BaseModel):
    message: str


def _match_response(match: PeerMatch, current_user_id: UUID, peer_name: str | None = None) -> dict:
    is_user1 = match.user1_id == current_user_id
    my_buddy_opt = match.user1_buddy_opt if is_user1 else match.user2_buddy_opt
    peer_buddy_opt = match.user2_buddy_opt if is_user1 else match.user1_buddy_opt
    show_name = match.status == "buddy"

    return {
        "id": str(match.id),
        "status": match.status,
        "my_buddy_opt": my_buddy_opt,
        "peer_buddy_opt": peer_buddy_opt,
        "peer_name": peer_name if show_name else "Peer",
        "created_at": match.created_at.isoformat(),
    }


async def _get_active_match(user_id: UUID, session: AsyncSession) -> PeerMatch | None:
    """Return the user's current non-ended match, if any."""
    stmt = select(PeerMatch).where(
        or_(PeerMatch.user1_id == user_id, PeerMatch.user2_id == user_id),
        PeerMatch.status.in_(["waiting", "active", "buddy"]),
    )
    result = await session.exec(stmt)
    return result.first()


async def _peer_name(match: PeerMatch, current_user_id: UUID, session: AsyncSession) -> str:
    peer_id = match.user2_id if match.user1_id == current_user_id else match.user1_id
    if peer_id is None:
        return "Peer"
    result = await session.exec(select(User.name).where(User.id == peer_id))
    return result.first() or "Peer"


# ── Queue ────────────────────────────────────────────────────────────────────

@router.post("/queue")
async def join_queue(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    existing = await _get_active_match(user.id, session)
    if existing:
        name = await _peer_name(existing, user.id, session)
        return _match_response(existing, user.id, name)

    # Look for someone else waiting
    stmt = select(PeerMatch).where(
        PeerMatch.status == "waiting",
        PeerMatch.user1_id != user.id,
    )
    result = await session.exec(stmt)
    waiting = result.first()

    if waiting:
        waiting.user2_id = user.id
        waiting.status = "active"
        session.add(waiting)
        await session.commit()
        await session.refresh(waiting)
        name = await _peer_name(waiting, user.id, session)
        return _match_response(waiting, user.id, name)

    # Nobody waiting -- create a new queue entry
    match = PeerMatch(user1_id=user.id)
    session.add(match)
    await session.commit()
    await session.refresh(match)
    return _match_response(match, user.id)


@router.delete("/queue")
async def leave_queue(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(PeerMatch).where(
        PeerMatch.user1_id == user.id,
        PeerMatch.status == "waiting",
    )
    result = await session.exec(stmt)
    match = result.first()
    if not match:
        raise HTTPException(status_code=404, detail="Not in queue")
    await session.delete(match)
    await session.commit()
    return {"ok": True}


# ── Current match ────────────────────────────────────────────────────────────

@router.get("/match")
async def get_match(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    match = await _get_active_match(user.id, session)
    if not match:
        return None
    name = await _peer_name(match, user.id, session)
    return _match_response(match, user.id, name)


# ── Messages ─────────────────────────────────────────────────────────────────

async def _require_match_member(match_id: str, user: User, session: AsyncSession) -> PeerMatch:
    result = await session.exec(select(PeerMatch).where(PeerMatch.id == match_id))
    match = result.first()
    if not match or (match.user1_id != user.id and match.user2_id != user.id):
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.get("/match/{match_id}/messages")
async def list_messages(
    match_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    match = await _require_match_member(match_id, user, session)
    is_buddy = match.status == "buddy"

    stmt = (
        select(PeerMessage, User.name)
        .join(User, PeerMessage.sender_id == User.id)
        .where(PeerMessage.match_id == match_id)
        .order_by(PeerMessage.created_at)
    )
    result = await session.exec(stmt)
    rows = result.all()

    return [
        {
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "is_me": msg.sender_id == user.id,
            "sender_name": name if is_buddy else ("You" if msg.sender_id == user.id else "Peer"),
            "message": msg.message,
            "created_at": msg.created_at.isoformat(),
        }
        for msg, name in rows
    ]


@router.post("/match/{match_id}/messages")
async def send_message(
    match_id: str,
    body: MessageRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    match = await _require_match_member(match_id, user, session)
    if match.status not in ("active", "buddy"):
        raise HTTPException(status_code=400, detail="Cannot send messages in this match state")

    msg = PeerMessage(match_id=match.id, sender_id=user.id, message=body.message)
    session.add(msg)
    await session.commit()
    await session.refresh(msg)

    is_buddy = match.status == "buddy"
    return {
        "id": str(msg.id),
        "sender_id": str(msg.sender_id),
        "is_me": True,
        "sender_name": user.name if is_buddy else "You",
        "message": msg.message,
        "created_at": msg.created_at.isoformat(),
    }


# ── Buddy opt-in ─────────────────────────────────────────────────────────────

@router.post("/match/{match_id}/buddy")
async def opt_buddy(
    match_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    match = await _require_match_member(match_id, user, session)
    if match.status not in ("active", "buddy"):
        raise HTTPException(status_code=400, detail="Match is not active")

    if match.user1_id == user.id:
        match.user1_buddy_opt = True
    else:
        match.user2_buddy_opt = True

    if match.user1_buddy_opt and match.user2_buddy_opt:
        match.status = "buddy"

    session.add(match)
    await session.commit()
    await session.refresh(match)

    name = await _peer_name(match, user.id, session)
    return _match_response(match, user.id, name)


# ── End match ─────────────────────────────────────────────────────────────────

@router.post("/match/{match_id}/end")
async def end_match(
    match_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    match = await _require_match_member(match_id, user, session)
    match.status = "ended"
    session.add(match)
    await session.commit()
    return {"ok": True}


# ── Buddy list ────────────────────────────────────────────────────────────────

@router.get("/buddies")
async def list_buddies(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(PeerMatch).where(
        or_(PeerMatch.user1_id == user.id, PeerMatch.user2_id == user.id),
        PeerMatch.status == "buddy",
    ).order_by(PeerMatch.created_at.desc())
    result = await session.exec(stmt)
    matches = result.all()

    buddies = []
    for m in matches:
        name = await _peer_name(m, user.id, session)
        buddies.append({
            "match_id": str(m.id),
            "buddy_name": name,
            "since": m.created_at.isoformat(),
        })
    return buddies
