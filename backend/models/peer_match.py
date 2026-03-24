from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class PeerMatch(SQLModel, table=True):
    __tablename__ = "peer_matches"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user1_id: UUID = Field(foreign_key="users.id", index=True)
    user2_id: UUID | None = Field(default=None, foreign_key="users.id", index=True)
    status: str = Field(default="waiting")  # waiting, active, buddy, ended
    user1_buddy_opt: bool = Field(default=False)
    user2_buddy_opt: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
