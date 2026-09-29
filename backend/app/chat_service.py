"""Chat orchestration: provider order, one retry, fallback. No HTTP here."""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass

from app.chat_config import gemini_configured, openai_configured, provider_order
from app.chat_providers import (
    ChatProviderError,
    ProviderReply,
    complete_gemini,
    complete_openai,
)

logger = logging.getLogger("app.chat")

_SECRET_RE = re.compile(
    r"(sk-[A-Za-z0-9_\-]{8,}|AIza[0-9A-Za-z_\-]{10,}|Bearer\s+\S+|AQ\.[A-Za-z0-9_\-]{8,})",
    re.IGNORECASE,
)

PROVIDERS = {
    "openai": complete_openai,
    "gemini": complete_gemini,
}


@dataclass(frozen=True)
class ChatSuccess:
    reply: str
    provider: str
    model: str
    latency_ms: int


class ChatServiceError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def redact(value: object) -> str:
    return _SECRET_RE.sub("[REDACTED]", str(value))


def _has_key(name: str) -> bool:
    if name == "openai":
        return openai_configured()
    if name == "gemini":
        return gemini_configured()
    return False


def _ordered_providers(requested: str | None) -> list[str]:
    if requested:
        return [requested]
    return provider_order()


def run_chat(
    message: str,
    history: list[dict[str, str]],
    requested_provider: str | None,
    request_id: str,
) -> ChatSuccess:
    names = _ordered_providers(requested_provider)
    attempted = False
    last_error: ChatProviderError | None = None
    started = time.perf_counter()

    for name in names:
        if not _has_key(name):
            logger.info("request_id=%s skip provider=%s reason=no_key", request_id, name)
            continue
        complete = PROVIDERS.get(name)
        if complete is None:
            continue
        attempted = True
        for attempt in (1, 2):
            try:
                result: ProviderReply = complete(message, history)
                latency_ms = int((time.perf_counter() - started) * 1000)
                logger.info(
                    "request_id=%s provider=%s model=%s attempt=%s latency_ms=%s",
                    request_id,
                    result.provider,
                    result.model,
                    attempt,
                    latency_ms,
                )
                return ChatSuccess(
                    reply=result.text,
                    provider=result.provider,
                    model=result.model,
                    latency_ms=latency_ms,
                )
            except ChatProviderError as exc:
                last_error = exc
                logger.warning(
                    "request_id=%s provider=%s attempt=%s status=%s retryable=%s error=%s",
                    request_id,
                    name,
                    attempt,
                    exc.status_code,
                    exc.retryable,
                    redact(exc),
                )
                if exc.retryable and attempt == 1:
                    continue
                break

    if not attempted:
        logger.warning("request_id=%s no chat provider configured", request_id)
        raise ChatServiceError(
            503,
            "No chat provider is configured.",
        )

    logger.error(
        "request_id=%s all providers failed last_status=%s last_error=%s",
        request_id,
        getattr(last_error, "status_code", None),
        redact(last_error) if last_error else "unknown",
    )
    raise ChatServiceError(
        502,
        "Chat providers are currently unavailable.",
    )
