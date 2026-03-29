from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class FriendRequest(SQLModel, table=True):
    __tablename__ = "friend_requests"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    requester_id: UUID = Field(foreign_key="users.id", index=True)
    recipient_id: UUID = Field(foreign_key="users.id", index=True)
    status: str = Field(default="pending")  # pending, accepted
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
