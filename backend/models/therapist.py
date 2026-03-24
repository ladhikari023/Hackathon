from datetime import datetime, UTC
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Therapist(SQLModel, table=True):
    __tablename__ = "therapists"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    specialization: str
    languages: str
    bio: str = Field(default="")
    tz: str = Field(default="UTC")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
