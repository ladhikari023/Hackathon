from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from auth import get_current_user
from database import get_session
from models.therapist import Therapist
from models.therapist_intro_request import TherapistIntroRequest
from models.user import User

router = APIRouter(prefix="/therapists", tags=["therapists"])

SEED_THERAPISTS = [
    Therapist(
        name="Dr. Sharma",
        specialization="Anxiety & Depression",
        languages="English, Hindi, Nepali",
        bio="10+ years helping young adults navigate mental health challenges.",
        intro_message_price_cents=0,
    ),
    Therapist(
        name="Dr. Patel",
        specialization="Stress Management",
        languages="English, Gujarati",
        bio="Specializes in culturally sensitive therapy for South Asian communities.",
        intro_message_price_cents=1500,
    ),
    Therapist(
        name="Dr. Thapa",
        specialization="Grief & Trauma",
        languages="English, Nepali",
        bio="Focused on helping individuals process difficult life transitions.",
        intro_message_price_cents=500,
    ),
]


class IntroRequestBody(BaseModel):
    intro_message: str = Field(min_length=5, max_length=300)


class TherapistPricingBody(BaseModel):
    intro_message_price_cents: int = Field(ge=0, le=50000)


def _require_therapist(user: User) -> User:
    if user.role != "therapist":
        raise HTTPException(status_code=403, detail="Therapist access required")
    return user


async def _therapist_for_user(user: User, session: AsyncSession) -> Therapist:
    result = await session.exec(select(Therapist).where(Therapist.name == user.name))
    therapist = result.first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist profile not found")
    return therapist


async def seed_therapists(session: AsyncSession) -> None:
    result = await session.exec(select(Therapist).limit(1))
    if result.first():
        return
    for t in SEED_THERAPISTS:
        session.add(Therapist(
            name=t.name,
            specialization=t.specialization,
            languages=t.languages,
            bio=t.bio,
        ))
    await session.commit()


@router.get("")
async def list_therapists(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Therapist).order_by(Therapist.name))
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "specialization": t.specialization,
            "languages": t.languages,
            "bio": t.bio,
            "intro_message_price_cents": t.intro_message_price_cents,
            "intro_message_is_free": t.intro_message_price_cents == 0,
        }
        for t in result.all()
    ]


@router.post("/{therapist_id}/intro-request")
async def create_intro_request(
    therapist_id: str,
    body: IntroRequestBody,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user.role != "user":
        raise HTTPException(status_code=403, detail="Only users can message therapists")

    therapist = await session.get(Therapist, therapist_id)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")

    existing = await session.exec(
        select(TherapistIntroRequest)
        .where(TherapistIntroRequest.therapist_id == therapist.id)
        .where(TherapistIntroRequest.user_id == user.id)
        .order_by(TherapistIntroRequest.created_at.desc())
    )
    latest = existing.first()
    if latest and latest.status == "pending":
        raise HTTPException(status_code=400, detail="You already have a pending request for this therapist")

    request = TherapistIntroRequest(
        therapist_id=therapist.id,
        user_id=user.id,
        intro_message=body.intro_message.strip(),
        price_cents=therapist.intro_message_price_cents,
    )
    session.add(request)
    await session.commit()
    await session.refresh(request)

    return {
        "id": str(request.id),
        "therapist_id": str(therapist.id),
        "user_id": str(user.id),
        "intro_message": request.intro_message,
        "price_cents": request.price_cents,
        "status": request.status,
        "created_at": request.created_at.isoformat(),
    }


@router.get("/requests/incoming")
async def incoming_intro_requests(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _require_therapist(user)
    therapist = await _therapist_for_user(user, session)

    result = await session.exec(
        select(TherapistIntroRequest, User)
        .join(User, TherapistIntroRequest.user_id == User.id)
        .where(TherapistIntroRequest.therapist_id == therapist.id)
        .order_by(TherapistIntroRequest.created_at.desc())
    )
    return [
        {
            "id": str(request.id),
            "user_id": str(sender.id),
            "user_name": sender.name,
            "user_bio": sender.bio,
            "user_health_status": sender.health_status,
            "intro_message": request.intro_message,
            "price_cents": request.price_cents,
            "status": request.status,
            "created_at": request.created_at.isoformat(),
        }
        for request, sender in result.all()
    ]


@router.post("/requests/{request_id}/accept")
async def accept_intro_request(
    request_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _require_therapist(user)
    therapist = await _therapist_for_user(user, session)
    request = await session.get(TherapistIntroRequest, request_id)
    if not request or request.therapist_id != therapist.id:
        raise HTTPException(status_code=404, detail="Request not found")

    request.status = "accepted"
    session.add(request)
    await session.commit()
    await session.refresh(request)
    return {"ok": True, "status": request.status}


@router.post("/requests/{request_id}/reject")
async def reject_intro_request(
    request_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _require_therapist(user)
    therapist = await _therapist_for_user(user, session)
    request = await session.get(TherapistIntroRequest, request_id)
    if not request or request.therapist_id != therapist.id:
        raise HTTPException(status_code=404, detail="Request not found")

    request.status = "rejected"
    session.add(request)
    await session.commit()
    await session.refresh(request)
    return {"ok": True, "status": request.status}


@router.patch("/me/pricing")
async def update_intro_message_pricing(
    body: TherapistPricingBody,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _require_therapist(user)
    therapist = await _therapist_for_user(user, session)
    therapist.intro_message_price_cents = body.intro_message_price_cents
    session.add(therapist)
    await session.commit()
    await session.refresh(therapist)
    return {
        "id": str(therapist.id),
        "intro_message_price_cents": therapist.intro_message_price_cents,
        "intro_message_is_free": therapist.intro_message_price_cents == 0,
    }
