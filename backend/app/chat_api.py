"""HTTP adapters for /chat. Route modules only call these functions."""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError

from app.chat_config import (
    gemini_configured,
    gemini_model,
    openai_configured,
    openai_model,
)
from app.chat_providers import gemini_model_exists, openai_model_exists
from app.chat_service import ChatServiceError, redact, run_chat

logger = logging.getLogger("app.chat")

MAX_MESSAGE_LEN = 4000
MAX_HISTORY = 20
ALLOWED_ROLES = {"user", "assistant"}
ALLOWED_PROVIDERS = {"openai"}


class ChatTurn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_LEN)
    history: list[ChatTurn] | None = None
    persona: str | None = None
    courseId: str | None = None
    unitScope: str | None = None
    provider: str | None = None


def new_request_id() -> str:
    return str(uuid4())


def _error_body(message: str, request_id: str) -> dict[str, str]:
    return {"error": message, "requestId": request_id}


def _error_response(status_code: int, message: str, request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=_error_body(message, request_id),
        headers={"X-Request-Id": request_id},
    )


def _normalize_history(turns: list[ChatTurn] | None) -> list[dict[str, str]]:
    if not turns:
        return []
    return [{"role": turn.role, "content": turn.content} for turn in turns]


def _validate_payload(raw: dict[str, Any]) -> ChatRequest:
    payload = ChatRequest.model_validate(raw)
    if payload.provider is not None:
        provider = payload.provider.strip().lower()
        if provider not in ALLOWED_PROVIDERS:
            raise ValueError("provider must be openai or gemini")
        payload.provider = provider
    history = payload.history or []
    if len(history) > MAX_HISTORY:
        raise ValueError("history may contain at most 20 turns")
    for turn in history:
        if turn.role not in ALLOWED_ROLES:
            raise ValueError("history roles must be user or assistant")
        if not isinstance(turn.content, str):
            raise ValueError("history content must be a string")
    if payload.message.strip() == "":
        raise ValueError("message must not be empty")
    return payload


async def handle_post_chat(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id") or new_request_id()
    try:
        raw = await request.json()
    except json.JSONDecodeError:
        logger.info("request_id=%s invalid json body", request_id)
        return _error_response(422, "Invalid chat request.", request_id)
    except Exception:
        logger.info("request_id=%s missing json body", request_id)
        return _error_response(422, "Invalid chat request.", request_id)

    if not isinstance(raw, dict):
        return _error_response(422, "Invalid chat request.", request_id)

    try:
        payload = _validate_payload(raw)
    except (ValidationError, ValueError) as exc:
        logger.info("request_id=%s invalid input %s", request_id, redact(exc))
        return _error_response(422, "Invalid chat request.", request_id)

    try:
        result = run_chat(
            payload.message,
            _normalize_history(payload.history),
            payload.provider,
            request_id,
        )
    except ChatServiceError as exc:
        return _error_response(exc.status_code, exc.message, request_id)
    except Exception as exc:
        logger.exception("request_id=%s unexpected error %s", request_id, redact(exc))
        return _error_response(502, "Chat providers are currently unavailable.", request_id)

    return JSONResponse(
        status_code=200,
        content={
            "reply": result.reply,
            "provider": result.provider,
            "model": result.model,
            "sources": [],
            "latencyMs": result.latency_ms,
        },
        headers={"X-Request-Id": request_id},
    )


def handle_chat_health(deep: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "openai": {
            "configured": openai_configured(),
            "model": openai_model(),
        }
    }
    if not deep:
        return payload

    if openai_configured():
        payload["openai"]["status"] = "ok" if openai_model_exists() else "not-found"
    return payload
