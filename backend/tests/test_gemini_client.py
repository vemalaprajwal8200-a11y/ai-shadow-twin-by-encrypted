"""Gemini client tests use a stub and never make network calls."""

import json
from types import SimpleNamespace

import pytest

from app.engine import gemini_client


class FakeStatusError(Exception):
    def __init__(self, status_code, headers=None):
        self.status_code = status_code
        self.response = SimpleNamespace(
            status_code=status_code,
            headers=headers or {},
        )


class FakeClient:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.requests = []
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self.create)
        )

    def create(self, **request):
        self.requests.append(request)
        result = next(self.responses)
        if isinstance(result, Exception):
            raise result
        content = result if isinstance(result, str) else json.dumps(result)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
            usage=SimpleNamespace(prompt_tokens=10, completion_tokens=5),
        )


@pytest.fixture
def configured_gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-only-gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "test-gemini-model")
    monkeypatch.delenv("GEMINI_BASE_URL", raising=False)
    monkeypatch.setattr(gemini_client, "_client", None)


def test_json_output_and_fence_stripping(configured_gemini, monkeypatch):
    client = FakeClient(['```json\n{"answer": 42}\n```'])
    monkeypatch.setattr(gemini_client, "_get_client", lambda: client)

    assert gemini_client.ask("question") == {"answer": 42}


def test_invalid_json_gets_one_corrective_retry(configured_gemini, monkeypatch):
    client = FakeClient(["not json", {"answer": "fixed"}])
    monkeypatch.setattr(gemini_client, "_get_client", lambda: client)

    assert gemini_client.ask("question", profile="judge") == {"answer": "fixed"}
    assert len(client.requests) == 2
    assert client.requests[1]["messages"][-1]["content"] == "Reply with valid JSON only."


def test_http_429_retries_and_respects_retry_after(
    configured_gemini, monkeypatch
):
    client = FakeClient(
        [FakeStatusError(429, {"Retry-After": "7"}), {"answer": "ok"}]
    )
    delays = []
    monkeypatch.setattr(gemini_client, "_get_client", lambda: client)
    monkeypatch.setattr(gemini_client.time, "sleep", delays.append)

    assert gemini_client.ask("question") == {"answer": "ok"}
    assert delays == [7.0]
    assert len(client.requests) == 2


@pytest.mark.parametrize(
    ("missing", "present"),
    [
        ("GEMINI_API_KEY", "GEMINI_MODEL"),
        ("GEMINI_MODEL", "GEMINI_API_KEY"),
    ],
)
def test_missing_required_setting_names_it_at_startup(
    monkeypatch, missing, present
):
    monkeypatch.delenv(missing, raising=False)
    monkeypatch.setenv(present, "test-placeholder-value")

    with pytest.raises(RuntimeError, match=missing):
        gemini_client.validate_configuration()
