from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class TherapistIntroRequest(SQLModel, table=True):
    __tablename__ = "therapist_intro_requests"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    therapist_id: UUID = Field(foreign_key="therapists.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    intro_message: str
    price_cents: int = Field(default=0)
    status: str = Field(default="pending")  # pending, accepted, rejected
    payment_status: str = Field(default="not_required")  # not_required, pending, paid
    stripe_checkout_session_id: str | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
