from datetime import datetime, UTC
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    role: str = Field(default="user")  # "user", "therapist", "admin"
    bio: str = Field(default="")
    health_status: str = Field(default="")
    is_premium: bool = Field(default=False)
    provider: str = Field(default="demo")
    provider_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
