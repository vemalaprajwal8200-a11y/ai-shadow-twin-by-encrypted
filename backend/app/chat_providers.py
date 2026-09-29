"""OpenAI and Gemini chat providers. No route logic lives here."""

from __future__ import annotations

from dataclasses import dataclass

from app.chat_config import (
    gemini_api_key,
    gemini_model,
    gemini_model_candidates,
    openai_api_key,
    openai_model,
    openai_model_candidates,
    system_prompt,
    timeout_s,
)


class ChatProviderError(Exception):
    """Raised when a provider call fails. Never include secrets in the message."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable


@dataclass(frozen=True)
class ProviderReply:
    text: str
    provider: str
    model: str


def _retryable_status(status_code: int | None) -> bool:
    if status_code is None:
        return False
    return status_code == 429 or status_code >= 500


def _openai_status(exc: Exception) -> int | None:
    code = getattr(exc, "status_code", None)
    if isinstance(code, int):
        return code
    response = getattr(exc, "response", None)
    response_code = getattr(response, "status_code", None)
    return response_code if isinstance(response_code, int) else None


def _genai_status(exc: Exception) -> int | None:
    for attr in ("code", "status_code"):
        value = getattr(exc, attr, None)
        if isinstance(value, int):
            return value
    response = getattr(exc, "response_json", None) or {}
    if isinstance(response, dict):
        nested = response.get("error") if isinstance(response.get("error"), dict) else response
        code = nested.get("code") if isinstance(nested, dict) else None
        if isinstance(code, int):
            return code
    return None


def _build_openai_messages(message: str, history: list[dict[str, str]]) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": system_prompt()}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": message})
    return messages


def complete_openai(message: str, history: list[dict[str, str]]) -> ProviderReply:
    from openai import APIStatusError, APITimeoutError, OpenAI, RateLimitError

    key = openai_api_key()
    model_candidates = openai_model_candidates() or [openai_model()]
    client = OpenAI(api_key=key, timeout=timeout_s(), max_retries=0)
    last_exc: Exception | None = None

    for model in model_candidates:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=_build_openai_messages(message, history),
            )
        except APITimeoutError as exc:
            last_exc = exc
            if model != model_candidates[-1]:
                continue
            raise ChatProviderError("OpenAI request timed out.", retryable=True) from exc
        except RateLimitError as exc:
            last_exc = exc
            if model != model_candidates[-1]:
                continue
            raise ChatProviderError(
                "OpenAI rate limited the request.",
                status_code=429,
                retryable=True,
            ) from exc
        except APIStatusError as exc:
            last_exc = exc
            if model != model_candidates[-1] and _openai_status(exc) in {400, 404, 422}:
                continue
            raise ChatProviderError(
                "OpenAI request failed.",
                status_code=_openai_status(exc),
                retryable=_retryable_status(_openai_status(exc)),
            ) from exc
        except Exception as exc:
            last_exc = exc
            if model != model_candidates[-1]:
                continue
            raise ChatProviderError("OpenAI request failed.", retryable=False) from exc

        text = (response.choices[0].message.content or "").strip() if response.choices else ""
        if not text:
            if model != model_candidates[-1]:
                continue
            raise ChatProviderError("OpenAI returned an empty reply.", status_code=502, retryable=True)
        used_model = getattr(response, "model", None) or model
        return ProviderReply(text=text, provider="openai", model=used_model)

    raise ChatProviderError(
        "OpenAI request failed.",
        status_code=getattr(last_exc, "status_code", None) if last_exc else 502,
        retryable=False,
    )


def _build_gemini_contents(message: str, history: list[dict[str, str]]) -> list[dict[str, object]]:
    contents: list[dict[str, object]] = []
    for turn in history:
        role = "user" if turn["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": turn["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


def complete_gemini(message: str, history: list[dict[str, str]]) -> ProviderReply:
    from google import genai
    from google.genai import errors as genai_errors
    from google.genai import types

    key = gemini_api_key()
    model_candidates = gemini_model_candidates() or [gemini_model()]
    timeout_ms = int(timeout_s() * 1000)
    client = genai.Client(api_key=key)

    for model in model_candidates:
        try:
            response = client.models.generate_content(
                model=model,
                contents=_build_gemini_contents(message, history),
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt(),
                    http_options=types.HttpOptions(timeout=timeout_ms),
                ),
            )
        except TimeoutError as exc:
            if model != model_candidates[-1]:
                continue
            raise ChatProviderError("Gemini request timed out.", retryable=True) from exc
        except Exception as exc:
            status = _genai_status(exc)
            retryable = isinstance(exc, TimeoutError) or _retryable_status(status)
            if status is None and isinstance(exc, getattr(genai_errors, "ServerError", ())):
                retryable = True
            if model != model_candidates[-1] and status in {400, 404, 422}:
                continue
            raise ChatProviderError(
                "Gemini request failed.",
                status_code=status,
                retryable=retryable,
            ) from exc

        text = (getattr(response, "text", None) or "").strip()
        if not text:
            if model != model_candidates[-1]:
                continue
            raise ChatProviderError("Gemini returned an empty reply.", status_code=502, retryable=True)
        return ProviderReply(text=text, provider="gemini", model=model)

    raise ChatProviderError("Gemini request failed.", status_code=502, retryable=True)


def openai_model_exists() -> bool:
    from openai import OpenAI

    key = openai_api_key()
    model = openai_model()
    client = OpenAI(api_key=key, timeout=timeout_s(), max_retries=0)
    try:
        listed = client.models.list()
    except Exception:
        return False
    names = {getattr(item, "id", "") for item in getattr(listed, "data", []) or []}
    return model in names


def gemini_model_exists() -> bool:
    from google import genai

    key = gemini_api_key()
    model = gemini_model()
    client = genai.Client(api_key=key)
    target = model if model.startswith("models/") else f"models/{model}"
    short = model.removeprefix("models/")
    try:
        pager = client.models.list()
    except Exception:
        return False
    for item in pager:
        name = getattr(item, "name", "") or ""
        if name in {model, target, short, f"models/{short}"}:
            return True
    return False
