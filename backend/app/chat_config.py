"""Load chat settings from test.env without overriding real environment variables."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(_BACKEND_DIR / "test.env", override=False)

DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"
DEFAULT_PROVIDER_ORDER = "openai,gemini"
DEFAULT_SYSTEM_PROMPT = (
    "You are a professional assistant for the AI Shadow-Twin app. "
    "Help faculty understand flagged course content clearly and concisely."
)
DEFAULT_TIMEOUT_S = 30.0


def _trimmed(name: str) -> str:
    return (os.getenv(name) or "").strip()


def openai_api_key() -> str:
    return _trimmed("OPENAI_API_KEY")


def gemini_api_key() -> str:
    return _trimmed("GEMINI_API_KEY")


def openai_model() -> str:
    return _trimmed("OPENAI_MODEL") or DEFAULT_OPENAI_MODEL


def gemini_model() -> str:
    return _trimmed("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL


def provider_order() -> list[str]:
    raw = _trimmed("CHAT_PROVIDER_ORDER") or DEFAULT_PROVIDER_ORDER
    names = [part.strip().lower() for part in raw.split(",") if part.strip()]
    allowed = {"openai", "gemini"}
    return [name for name in names if name in allowed]


def system_prompt() -> str:
    return _trimmed("CHAT_SYSTEM_PROMPT") or DEFAULT_SYSTEM_PROMPT


def timeout_s() -> float:
    raw = _trimmed("CHAT_TIMEOUT_S")
    if not raw:
        return DEFAULT_TIMEOUT_S
    try:
        value = float(raw)
    except ValueError:
        return DEFAULT_TIMEOUT_S
    return value if value > 0 else DEFAULT_TIMEOUT_S


def openai_configured() -> bool:
    return bool(openai_api_key())


def gemini_configured() -> bool:
    return bool(gemini_api_key())
