"""Chat route tests. Providers are mocked; no live network calls."""

from __future__ import annotations

import logging

from fastapi.testclient import TestClient

from app import chat_api, chat_service
from app.chat_providers import ChatProviderError, ProviderReply
from app.main import app

LEAK_OPENAI = "sk-TESTLEAKOPENAIKEYVALUE99"
LEAK_GEMINI = "AIzaSyTESTLEAKGEMINIKEYVALUE99xx"


def _client() -> TestClient:
    return TestClient(app)


def _enable_both(monkeypatch, openai_on=True, gemini_on=True):
    monkeypatch.setattr(chat_service, "openai_configured", lambda: openai_on)
    monkeypatch.setattr(chat_service, "gemini_configured", lambda: gemini_on)
    monkeypatch.setattr(chat_api, "openai_configured", lambda: openai_on)
    monkeypatch.setattr(chat_api, "gemini_configured", lambda: gemini_on)
    monkeypatch.setenv("OPENAI_API_KEY", LEAK_OPENAI if openai_on else "")
    monkeypatch.setenv("GEMINI_API_KEY", LEAK_GEMINI if gemini_on else "")


def _assert_no_secrets(text: str) -> None:
    assert LEAK_OPENAI not in text
    assert LEAK_GEMINI not in text


def test_openai_success(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger="app.chat")
    _enable_both(monkeypatch, openai_on=True, gemini_on=False)
    calls = {"n": 0}

    def openai_ok(message, history):
        calls["n"] += 1
        return ProviderReply(text=f"echo:{message}", provider="openai", model="gpt-test")

    monkeypatch.setitem(chat_service.PROVIDERS, "openai", openai_ok)
    monkeypatch.setitem(chat_service.PROVIDERS, "gemini", lambda *_: None)

    response = _client().post("/chat", json={"message": "hello faculty"})
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "echo:hello faculty"
    assert body["provider"] == "openai"
    assert body["model"] == "gpt-test"
    assert isinstance(body["latencyMs"], int)
    assert calls["n"] == 1
    _assert_no_secrets(response.text)
    _assert_no_secrets(caplog.text)


def test_openai_fails_returns_502(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger="app.chat")
    _enable_both(monkeypatch)

    def boom(_message, _history):
        raise ChatProviderError("down", status_code=500, retryable=True)

    monkeypatch.setitem(chat_service.PROVIDERS, "openai", boom)

    response = _client().post("/chat", json={"message": "please fail"})
    assert response.status_code == 502
    body = response.json()
    assert "requestId" in body
    assert "unavailable" in body["error"].lower()
    _assert_no_secrets(response.text)
    _assert_no_secrets(caplog.text)


def test_no_keys_returns_503(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger="app.chat")
    _enable_both(monkeypatch, openai_on=False, gemini_on=False)

    response = _client().post("/chat", json={"message": "hello"})
    assert response.status_code == 503
    body = response.json()
    assert "requestId" in body
    assert "configured" in body["error"].lower()
    _assert_no_secrets(response.text)
    _assert_no_secrets(caplog.text)


def test_invalid_input_returns_422(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger="app.chat")
    _enable_both(monkeypatch)

    client = _client()
    empty = client.post("/chat", json={"message": ""})
    too_long = client.post("/chat", json={"message": "x" * 4001})
    bad_role = client.post(
        "/chat",
        json={"message": "hi", "history": [{"role": "system", "content": "nope"}]},
    )
    too_much_history = client.post(
        "/chat",
        json={
            "message": "hi",
            "history": [{"role": "user", "content": "t"} for _ in range(21)],
        },
    )
    bad_provider = client.post("/chat", json={"message": "hi", "provider": "gemini"})

    for response in (empty, too_long, bad_role, too_much_history, bad_provider):
        assert response.status_code == 422
        assert "requestId" in response.json()
        _assert_no_secrets(response.text)
    _assert_no_secrets(caplog.text)


def test_preflight_allows_local_origins_without_redirect():
    client = _client()
    for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
        response = client.options(
            "/chat",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
            follow_redirects=False,
        )
        assert response.status_code in (200, 204)
        assert response.headers["access-control-allow-origin"] == origin
        assert "POST" in response.headers["access-control-allow-methods"]
        assert "content-type" in response.headers["access-control-allow-headers"].lower()
        assert "location" not in response.headers


def test_trailing_chat_path_does_not_redirect(monkeypatch):
    _enable_both(monkeypatch, openai_on=False, gemini_on=False)
    response = _client().post("/chat/", json={"message": "hello"}, follow_redirects=False)
    assert response.status_code == 503
    assert "location" not in response.headers


def test_unlisted_origin_is_not_allowed():
    response = _client().options(
        "/chat",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.headers.get("access-control-allow-origin") is None


def test_chat_errors_include_cors_headers(monkeypatch):
    origin = "http://localhost:5173"
    invalid = _client().post("/chat", json={"message": ""}, headers={"Origin": origin})

    def unavailable_provider(_message, _history):
        raise ChatProviderError("down", status_code=500, retryable=False)

    monkeypatch.setitem(chat_service.PROVIDERS, "openai", unavailable_provider)
    _enable_both(monkeypatch, openai_on=True, gemini_on=False)
    unavailable = _client().post("/chat", json={"message": "hello"}, headers={"Origin": origin})
    for response, status in ((invalid, 422), (unavailable, 502)):
        assert response.status_code == status
        assert response.headers["access-control-allow-origin"] == origin


def test_retry_on_429_not_on_401_or_404(monkeypatch):
    _enable_both(monkeypatch, openai_on=True, gemini_on=False)
    counts = {"429": 0, "401": 0, "404": 0}

    def rate_limited(_message, _history):
        counts["429"] += 1
        if counts["429"] == 1:
            raise ChatProviderError("rate", status_code=429, retryable=True)
        return ProviderReply(text="after-retry", provider="openai", model="gpt-test")

    monkeypatch.setitem(chat_service.PROVIDERS, "openai", rate_limited)
    ok = _client().post("/chat", json={"message": "retry me"})
    assert ok.status_code == 200
    assert ok.json()["reply"] == "after-retry"
    assert counts["429"] == 2

    def unauthorized(_message, _history):
        counts["401"] += 1
        raise ChatProviderError("auth", status_code=401, retryable=False)

    monkeypatch.setitem(chat_service.PROVIDERS, "openai", unauthorized)
    denied = _client().post("/chat", json={"message": "no retry 401"})
    assert denied.status_code == 502
    assert counts["401"] == 1

    def not_found(_message, _history):
        counts["404"] += 1
        raise ChatProviderError("missing", status_code=404, retryable=False)

    monkeypatch.setitem(chat_service.PROVIDERS, "openai", not_found)
    missing = _client().post("/chat", json={"message": "no retry 404"})
    assert missing.status_code == 502
    assert counts["404"] == 1
