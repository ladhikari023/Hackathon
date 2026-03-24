from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class PeerMessage(SQLModel, table=True):
    __tablename__ = "peer_messages"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    match_id: UUID = Field(foreign_key="peer_matches.id", index=True)
    sender_id: UUID = Field(foreign_key="users.id")
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
