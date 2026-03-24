from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from database import get_session
from models.therapist import Therapist

router = APIRouter(prefix="/therapists", tags=["therapists"])

SEED_THERAPISTS = [
    Therapist(
        name="Dr. Sharma",
        specialization="Anxiety & Depression",
        languages="English, Hindi, Nepali",
        bio="10+ years helping young adults navigate mental health challenges.",
    ),
    Therapist(
        name="Dr. Patel",
        specialization="Stress Management",
        languages="English, Gujarati",
        bio="Specializes in culturally sensitive therapy for South Asian communities.",
    ),
    Therapist(
        name="Dr. Thapa",
        specialization="Grief & Trauma",
        languages="English, Nepali",
        bio="Focused on helping individuals process difficult life transitions.",
    ),
]


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
        }
        for t in result.all()
    ]
