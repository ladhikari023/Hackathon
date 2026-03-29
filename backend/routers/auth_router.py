from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from auth import create_token, get_current_user
from database import get_session
from models.user import User
from seed import DEMO_ACCOUNTS

router = APIRouter(prefix="/auth", tags=["auth"])


class DemoLoginRequest(BaseModel):
    account: str = "ram"


def _user_response(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "bio": user.bio,
        "health_status": user.health_status,
        "provider": user.provider,
        "role": user.role,
        "is_premium": user.is_premium,
    }


@router.post("/demo")
async def demo_login(body: DemoLoginRequest = DemoLoginRequest(), session: AsyncSession = Depends(get_session)):
    """Log in as a pre-seeded demo account by key."""
    acct = DEMO_ACCOUNTS.get(body.account)
    if not acct:
        raise HTTPException(status_code=400, detail=f"Unknown account: {body.account}")

    result = await session.exec(select(User).where(User.email == acct["email"]))
    user = result.first()

    if not user:
        user = User(
            name=acct["name"],
            email=acct["email"],
            role=acct["role"],
            provider="demo",
            provider_id=f"demo-{body.account}",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return {"access_token": create_token(user.id), "user": _user_response(user)}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return _user_response(user)
