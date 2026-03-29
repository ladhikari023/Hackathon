from __future__ import annotations

from typing import Iterable

import httpx

from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from models.chat import ChatMessage

SYSTEM_PROMPT = (
    "You are MankoSathi, a supportive mental health companion for users seeking "
    "emotional support. Respond with empathy, keep replies concise, and avoid "
    "diagnosing conditions or presenting yourself as a licensed clinician. Offer "
    "gentle coping suggestions and encourage professional help when symptoms are "
    "severe, persistent, or beyond supportive conversation."
)

CRISIS_RESPONSE = (
    "I’m really sorry you’re carrying this right now. I’m not equipped to provide "
    "crisis support, but I want to take this seriously. If you might act on these "
    "thoughts or you feel unsafe, call or text 988 right now in the U.S. or "
    "contact local emergency services. If you can, reach out to a trusted person "
    "near you and let them know you need immediate support."
)

CRISIS_KEYWORDS = (
    "suicide",
    "kill myself",
    "end my life",
    "self-harm",
    "hurt myself",
    "want to die",
    "don't want to live",
    "overdose",
)


def _is_crisis_message(user_message: str) -> bool:
    lower = user_message.lower()
    return any(keyword in lower for keyword in CRISIS_KEYWORDS)


def _fallback_reply(user_message: str) -> str:
    lower = user_message.lower()
    if any(w in lower for w in ("lonely", "alone")):
        return "Feeling lonely can be really painful. Reaching out here matters. What feels heaviest about this moment?"
    if any(w in lower for w in ("stress", "overwhelm", "overwhelmed")):
        return "Stress can narrow everything down to the next problem. What is the single biggest pressure on you right now?"
    if any(w in lower for w in ("happy", "good", "great")):
        return "It helps to notice what is going right. What do you think is contributing to that feeling today?"
    if any(w in lower for w in ("sad", "depress", "down")):
        return "I’m sorry this feels so heavy. Would it help to slow down and name what happened before this feeling got stronger?"
    if any(w in lower for w in ("anxious", "anxiety", "worried", "panic")):
        return "Anxiety can make everything feel urgent. Try one slow breath in and out, then tell me what your mind keeps returning to."
    if any(w in lower for w in ("sleep", "tired", "insomnia")):
        return "Sleep problems can wear you down quickly. Has this been happening for a few days, or has it been building for longer?"
    return "I’m here with you. Tell me a little more about what has been most difficult today."


def _build_input(history: Iterable[ChatMessage], user_message: str) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    recent_history = list(history)[-10:]
    for message in recent_history:
        role = "assistant" if message.role == "ai" else "user"
        messages.append({"role": role, "content": message.message})
    messages.append({"role": "user", "content": user_message})
    return messages


async def _generate_openai_reply(history: Iterable[ChatMessage], user_message: str) -> str:
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENAI_MODEL,
        "input": _build_input(history, user_message),
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{OPENAI_BASE_URL}/responses", headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    if data.get("output_text"):
        return data["output_text"].strip()

    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                text = content.get("text", "").strip()
                if text:
                    return text

    raise ValueError("Model response did not include output text.")


async def generate_ai_reply(history: Iterable[ChatMessage], user_message: str) -> str:
    if _is_crisis_message(user_message):
        return CRISIS_RESPONSE

    if not OPENAI_API_KEY:
        return _fallback_reply(user_message)

    try:
        return await _generate_openai_reply(history, user_message)
    except (httpx.HTTPError, ValueError):
        return _fallback_reply(user_message)
