"""Gemini client using Google's OpenAI-compatible chat-completions endpoint."""

import json
import logging
import os
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

logger = logging.getLogger(__name__)
_RETRY_DELAYS = (1, 2, 4)
_client = None


def _configured(value: str | None) -> bool:
    return bool(value and value.strip() and not (value.startswith("<") and value.endswith(">")))


def validate_configuration() -> None:
    missing = [
        name
        for name in ("GEMINI_API_KEY", "GEMINI_MODEL")
        if not _configured(os.getenv(name))
    ]
    if missing:
        raise RuntimeError("Missing required Gemini setting: " + ", ".join(missing))


def _get_client():
    global _client
    validate_configuration()
    if _client is None:
        from openai import OpenAI

        base_url = os.getenv("GEMINI_BASE_URL")
        if not _configured(base_url):
            base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        _client = OpenAI(
            base_url=base_url,
            api_key=os.environ["GEMINI_API_KEY"],
            max_retries=0,
        )
    return _client


def _status_code(error: Exception) -> int | None:
    status = getattr(error, "status_code", None)
    if status is not None:
        return status
    return getattr(getattr(error, "response", None), "status_code", None)


def _retry_after(error: Exception) -> float | None:
    response = getattr(error, "response", None)
    headers = getattr(response, "headers", {}) or {}
    value = headers.get("Retry-After") or headers.get("retry-after")
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        try:
            retry_time = parsedate_to_datetime(value)
            if retry_time.tzinfo is None:
                retry_time = retry_time.replace(tzinfo=timezone.utc)
            return max(0.0, (retry_time - datetime.now(timezone.utc)).total_seconds())
        except (TypeError, ValueError, OverflowError):
            return None


def _parse_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    parsed = json.loads(text.strip())
    if not isinstance(parsed, dict):
        raise ValueError("Expected a JSON object")
    return parsed


def _complete_with_retries(client: Any, request: dict) -> Any:
    for attempt in range(len(_RETRY_DELAYS) + 1):
        try:
            return client.chat.completions.create(**request)
        except Exception as exc:
            status = _status_code(exc)
            retryable = status == 429 or (status is not None and 500 <= status <= 599)
            if not retryable:
                raise RuntimeError("Gemini request failed.") from None
            if attempt == len(_RETRY_DELAYS):
                raise RuntimeError("Gemini request failed after retries.") from None
            delay = _retry_after(exc)
            time.sleep(delay if delay is not None else _RETRY_DELAYS[attempt])
    raise RuntimeError("Gemini request did not complete.")


def _invoke(system: str, user: str, temperature: float, max_tokens: int) -> dict:
    client = _get_client()
    request = {
        "model": os.environ["GEMINI_MODEL"],
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    started = time.perf_counter()
    response = _complete_with_retries(client, request)
    raw = response.choices[0].message.content or ""
    try:
        parsed = _parse_json(raw)
    except (json.JSONDecodeError, ValueError):
        request["messages"] = [
            *request["messages"],
            {"role": "user", "content": "Reply with valid JSON only."},
        ]
        response = _complete_with_retries(client, request)
        raw = response.choices[0].message.content or ""
        try:
            parsed = _parse_json(raw)
        except (json.JSONDecodeError, ValueError):
            raise RuntimeError("Gemini returned invalid JSON after one retry.") from None

    usage = getattr(response, "usage", None)
    return {
        "parsed": parsed,
        "raw": raw,
        "latency_s": time.perf_counter() - started,
        "input_tokens": getattr(usage, "prompt_tokens", 0) or 0,
        "output_tokens": getattr(usage, "completion_tokens", 0) or 0,
    }


def ask(prompt: str, temperature: float = 0.5, profile: str = "twin") -> dict:
    """Ask Gemini for a JSON object; profile is accepted for caller compatibility."""
    del profile
    return _invoke("Reply only with valid JSON.", prompt, temperature, 1000)["parsed"]


def invoke_json(
    system: str, user: str, temperature: float = 0.2, max_tokens: int = 500
) -> dict:
    """Keep the existing /twin/ask response shape."""
    return _invoke(system, user, temperature, max_tokens)