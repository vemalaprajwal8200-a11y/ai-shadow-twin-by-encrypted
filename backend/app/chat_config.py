"""Load chat settings from test.env without overriding real environment variables."""

from __future__ import annotations

import os

from app.settings import load_backend_environment

load_backend_environment()

DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o"
DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest"
DEFAULT_PROVIDER_ORDER = "openrouter,openai"
DEFAULT_SYSTEM_PROMPT = (
    "You are a professional assistant for the AI Shadow-Twin app. "
    "Help faculty understand flagged course content clearly and concisely."
)
DEFAULT_TIMEOUT_S = 30.0

_PLACEHOLDER_VALUES = {
    "replace-with-a-new-openai-key",
    "replace-with-a-new-gemini-key",
    "your_openai_api_key_here",
    "your_openrouter_api_key_here",
    "your_gemini_api_key_here",
    "your_api_key_here",
    "demo",
    "test",
    "placeholder",
}


def _trimmed(name: str) -> str:
    return (os.getenv(name) or "").strip()


def _split_csv(value: str) -> list[str]:
    return [part.strip() for part in (value or "").split(",") if part.strip()]


def _is_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    if not normalized:
        return True
    return normalized in _PLACEHOLDER_VALUES or "replace-with" in normalized or "your_" in normalized


def openai_api_key() -> str:
    value = _trimmed("OPENAI_API_KEY")
    return value if not _is_placeholder(value) else ""


def openrouter_api_key() -> str:
    value = _trimmed("OPENROUTER_API_KEY")
    return value if not _is_placeholder(value) else ""


def gemini_api_key() -> str:
    value = _trimmed("GEMINI_API_KEY")
    return value if not _is_placeholder(value) else ""


def openai_model_candidates() -> list[str]:
    models = _split_csv(_trimmed("OPENAI_MODELS")) or _split_csv(_trimmed("OPENAI_MODEL"))
    if not models:
        models = [DEFAULT_OPENAI_MODEL]
    return [model for model in models if model and not _is_placeholder(model)]


def openrouter_model_candidates() -> list[str]:
    models = _split_csv(_trimmed("OPENROUTER_MODELS")) or _split_csv(_trimmed("OPENROUTER_MODEL"))
    if not models:
        models = [DEFAULT_OPENROUTER_MODEL]
    return [model for model in models if model and not _is_placeholder(model)]


def gemini_model_candidates() -> list[str]:
    models = _split_csv(_trimmed("GEMINI_MODELS")) or _split_csv(_trimmed("GEMINI_MODEL"))
    if not models:
        models = [DEFAULT_GEMINI_MODEL]
    return [model for model in models if model and not _is_placeholder(model)]


def openai_model() -> str:
    return openai_model_candidates()[0] if openai_model_candidates() else DEFAULT_OPENAI_MODEL


def openrouter_model() -> str:
    return openrouter_model_candidates()[0] if openrouter_model_candidates() else DEFAULT_OPENROUTER_MODEL


def gemini_model() -> str:
    return gemini_model_candidates()[0] if gemini_model_candidates() else DEFAULT_GEMINI_MODEL


def provider_order() -> list[str]:
    raw = _trimmed("CHAT_PROVIDER_ORDER") or DEFAULT_PROVIDER_ORDER
    names = [part.strip().lower() for part in raw.split(",") if part.strip()]
    configured = {"openrouter": bool(openrouter_api_key()), "openai": bool(openai_api_key())}
    return list(dict.fromkeys(name for name in names if configured.get(name, False)))


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


def openrouter_configured() -> bool:
    return bool(openrouter_api_key())


def gemini_configured() -> bool:
    return bool(gemini_api_key())
