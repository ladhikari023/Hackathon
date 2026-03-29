import hashlib
import hmac
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from auth import get_current_user
from config import FRONTEND_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from database import get_session
from models.therapist import Therapist
from models.therapist_intro_request import TherapistIntroRequest
from models.therapist_thread_message import TherapistThreadMessage
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


class TherapistSettingsBody(BaseModel):
    specialization: str
    languages: str
    bio: str
    intro_message_price_cents: int = Field(ge=0, le=50000)


class ThreadMessageBody(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


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


def _verify_stripe_signature(payload: bytes, signature_header: str) -> bool:
    if not STRIPE_WEBHOOK_SECRET or not signature_header:
        return False

    parts = dict(item.split("=", 1) for item in signature_header.split(",") if "=" in item)
    timestamp = parts.get("t")
    signature = parts.get("v1")
    if not timestamp or not signature:
        return False

    signed_payload = f"{timestamp}.{payload.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(
        STRIPE_WEBHOOK_SECRET.encode("utf-8"),
        signed_payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _create_stripe_checkout_session(
    intro_request: TherapistIntroRequest,
    therapist: Therapist,
) -> dict:
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    payload = {
        "mode": "payment",
        "success_url": f"{FRONTEND_URL}/therapists?payment=success",
        "cancel_url": f"{FRONTEND_URL}/therapists?payment=cancelled",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": f"Intro message to {therapist.name}",
        "line_items[0][price_data][product_data][description]": "Initial therapist introduction message",
        "line_items[0][price_data][unit_amount]": str(intro_request.price_cents),
        "line_items[0][quantity]": "1",
        "metadata[intro_request_id]": str(intro_request.id),
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://api.stripe.com/v1/checkout/sessions",
            auth=(STRIPE_SECRET_KEY, ""),
            data=payload,
        )
        response.raise_for_status()
        return response.json()


async def _request_for_participant(
    request_id: str,
    user: User,
    session: AsyncSession,
) -> TherapistIntroRequest:
    intro_request = await session.get(TherapistIntroRequest, request_id)
    if not intro_request:
        raise HTTPException(status_code=404, detail="Request not found")

    therapist = await session.get(Therapist, intro_request.therapist_id)
    is_therapist_owner = therapist is not None and therapist.name == user.name and user.role == "therapist"
    if intro_request.user_id != user.id and not is_therapist_owner:
        raise HTTPException(status_code=403, detail="Access denied")

    return intro_request


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
    if latest and latest.status in ("pending", "accepted", "payment_pending"):
        raise HTTPException(status_code=400, detail="You already have a pending request for this therapist")

    request = TherapistIntroRequest(
        therapist_id=therapist.id,
        user_id=user.id,
        intro_message=body.intro_message.strip(),
        price_cents=therapist.intro_message_price_cents,
        status="payment_pending" if therapist.intro_message_price_cents > 0 else "pending",
        payment_status="pending" if therapist.intro_message_price_cents > 0 else "not_required",
    )
    session.add(request)
    await session.commit()
    await session.refresh(request)

    checkout_url = None
    if request.price_cents > 0:
        try:
            session_data = await _create_stripe_checkout_session(request, therapist)
        except HTTPException:
            await session.delete(request)
            await session.commit()
            raise
        except httpx.HTTPError:
            await session.delete(request)
            await session.commit()
            raise HTTPException(status_code=503, detail="Unable to create Stripe checkout session")
        request.stripe_checkout_session_id = session_data["id"]
        session.add(request)
        await session.commit()
        await session.refresh(request)
        checkout_url = session_data.get("url")

    return {
        "id": str(request.id),
        "therapist_id": str(therapist.id),
        "user_id": str(user.id),
        "intro_message": request.intro_message,
        "price_cents": request.price_cents,
        "status": request.status,
        "payment_status": request.payment_status,
        "requires_payment": request.price_cents > 0,
        "checkout_url": checkout_url,
        "created_at": request.created_at.isoformat(),
    }


@router.get("/requests/mine")
async def my_intro_requests(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user.role != "user":
        raise HTTPException(status_code=403, detail="User access required")

    result = await session.exec(
        select(TherapistIntroRequest, Therapist)
        .join(Therapist, TherapistIntroRequest.therapist_id == Therapist.id)
        .where(TherapistIntroRequest.user_id == user.id)
        .order_by(TherapistIntroRequest.created_at.desc())
    )
    latest_by_therapist: dict[str, dict] = {}
    for intro_request, therapist in result.all():
        therapist_key = str(therapist.id)
        if therapist_key in latest_by_therapist:
            continue
        latest_by_therapist[therapist_key] = {
            "id": str(intro_request.id),
            "therapist_id": therapist_key,
            "therapist_name": therapist.name,
            "intro_message": intro_request.intro_message,
            "price_cents": intro_request.price_cents,
            "status": intro_request.status,
            "payment_status": intro_request.payment_status,
            "created_at": intro_request.created_at.isoformat(),
        }
    return list(latest_by_therapist.values())


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
            "payment_status": request.payment_status,
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
    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be accepted")

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
    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be rejected")

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


@router.get("/me/settings")
async def therapist_settings(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _require_therapist(user)
    therapist = await _therapist_for_user(user, session)
    return {
        "id": str(therapist.id),
        "name": therapist.name,
        "specialization": therapist.specialization,
        "languages": therapist.languages,
        "bio": therapist.bio,
        "intro_message_price_cents": therapist.intro_message_price_cents,
        "intro_message_is_free": therapist.intro_message_price_cents == 0,
    }


@router.patch("/me/settings")
async def update_therapist_settings(
    body: TherapistSettingsBody,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _require_therapist(user)
    therapist = await _therapist_for_user(user, session)
    therapist.specialization = body.specialization.strip()
    therapist.languages = body.languages.strip()
    therapist.bio = body.bio.strip()
    therapist.intro_message_price_cents = body.intro_message_price_cents
    session.add(therapist)
    await session.commit()
    await session.refresh(therapist)
    return {
        "id": str(therapist.id),
        "name": therapist.name,
        "specialization": therapist.specialization,
        "languages": therapist.languages,
        "bio": therapist.bio,
        "intro_message_price_cents": therapist.intro_message_price_cents,
        "intro_message_is_free": therapist.intro_message_price_cents == 0,
    }


@router.get("/requests/{request_id}/messages")
async def list_thread_messages(
    request_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    intro_request = await _request_for_participant(request_id, user, session)
    if intro_request.status != "accepted":
        raise HTTPException(status_code=400, detail="Messages are only available after acceptance")

    result = await session.exec(
        select(TherapistThreadMessage, User)
        .join(User, TherapistThreadMessage.sender_id == User.id)
        .where(TherapistThreadMessage.request_id == intro_request.id)
        .order_by(TherapistThreadMessage.created_at)
    )
    return [
        {
            "id": str(message.id),
            "sender_id": str(message.sender_id),
            "sender_name": sender.name,
            "is_me": message.sender_id == user.id,
            "message": message.message,
            "created_at": message.created_at.isoformat(),
        }
        for message, sender in result.all()
    ]


@router.post("/requests/{request_id}/messages")
async def send_thread_message(
    request_id: str,
    body: ThreadMessageBody,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    intro_request = await _request_for_participant(request_id, user, session)
    if intro_request.status != "accepted":
        raise HTTPException(status_code=400, detail="Messages are only available after acceptance")

    message = TherapistThreadMessage(
        request_id=intro_request.id,
        sender_id=user.id,
        message=body.message.strip(),
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return {
        "id": str(message.id),
        "sender_id": str(message.sender_id),
        "sender_name": user.name,
        "is_me": True,
        "message": message.message,
        "created_at": message.created_at.isoformat(),
    }


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    payload = await request.body()
    signature_header = request.headers.get("stripe-signature", "")
    if not _verify_stripe_signature(payload, signature_header):
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    event = json.loads(payload.decode("utf-8"))
    if event.get("type") == "checkout.session.completed":
        session_object = event["data"]["object"]
        intro_request_id = session_object.get("metadata", {}).get("intro_request_id")
        if intro_request_id:
            intro_request = await session.get(TherapistIntroRequest, intro_request_id)
            if intro_request:
                intro_request.payment_status = "paid"
                if intro_request.status == "payment_pending":
                    intro_request.status = "pending"
                intro_request.stripe_checkout_session_id = session_object.get("id")
                session.add(intro_request)
                await session.commit()

    return {"received": True}
