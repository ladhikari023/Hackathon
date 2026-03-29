from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=True)

async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session():
    async with async_session_factory() as session:
        yield session


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT ''
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS health_status TEXT NOT NULL DEFAULT ''
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE therapists
                ADD COLUMN IF NOT EXISTS intro_message_price_cents INTEGER NOT NULL DEFAULT 0
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE therapist_intro_requests
                ADD COLUMN IF NOT EXISTS payment_status VARCHAR NOT NULL DEFAULT 'not_required'
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE therapist_intro_requests
                ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR
                """
            )
        )
