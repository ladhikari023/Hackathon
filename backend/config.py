import os
from typing import Final

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
DATABASE_URL_SYNC = os.environ["DATABASE_URL_SYNC"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "1440"))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
FREE_DAILY_AI_REPLIES = int(os.getenv("FREE_DAILY_AI_REPLIES", "3"))
FRONTEND_URL: Final[str] = os.getenv("FRONTEND_URL", "http://localhost:3000")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
