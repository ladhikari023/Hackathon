from datetime import datetime, UTC
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class MoodLog(SQLModel, table=True):
    __tablename__ = "mood_logs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    mood: str
    note: str = Field(default="")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
