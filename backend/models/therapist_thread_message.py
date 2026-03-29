from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class TherapistThreadMessage(SQLModel, table=True):
    __tablename__ = "therapist_thread_messages"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    request_id: UUID = Field(foreign_key="therapist_intro_requests.id", index=True)
    sender_id: UUID = Field(foreign_key="users.id", index=True)
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
