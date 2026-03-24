from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401 — registers all tables with SQLModel
from database import async_session_factory, create_tables
from routers.admin_router import router as admin_router
from routers.auth_router import router as auth_router
from routers.chat_router import router as chat_router
from routers.mood_router import router as mood_router
from routers.peer_router import router as peer_router
from routers.post_router import router as post_router
from routers.therapist_dashboard_router import router as therapist_dashboard_router
from routers.therapist_router import router as therapist_router
from seed import seed_all


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await create_tables()
    async with async_session_factory() as session:
        await seed_all(session)
    yield


app = FastAPI(title="MankoSathi API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(mood_router)
app.include_router(post_router)
app.include_router(peer_router)
app.include_router(therapist_router)
app.include_router(admin_router)
app.include_router(therapist_dashboard_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
