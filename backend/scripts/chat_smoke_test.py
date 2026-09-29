"""Live /chat smoke test. Prints provider, model, latency, and a short reply. Never prints keys."""

from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / "test.env", override=False)
sys.path.insert(0, str(BACKEND_DIR))

from app.chat_config import openai_api_key, openrouter_api_key  # noqa: E402
from app.main import app  # noqa: E402


def _preview(text: str) -> str:
    cleaned = " ".join((text or "").split())
    return cleaned[:80]


def _run_provider(client: TestClient, provider: str, has_key: bool) -> int:
    if not has_key:
        print(f"{provider}: skipped (no API key configured)")
        return 0
    response = client.post(
        "/chat",
        json={"message": "Reply with one short sentence confirming you can chat.", "provider": provider},
    )
    if response.status_code != 200:
        body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
        error = body.get("error", response.text)
        print(f"{provider}: failed status={response.status_code} error={error}")
        return 1
    data = response.json()
    print(
        f"{provider}: model={data.get('model')} latencyMs={data.get('latencyMs')} "
        f"reply={_preview(data.get('reply', ''))}"
    )
    return 0


def main() -> int:
    client = TestClient(app)
    failed = 0
    failed += _run_provider(client, "openrouter", bool(openrouter_api_key()))
    failed += _run_provider(client, "openai", bool(openai_api_key()))
    return failed


if __name__ == "__main__":
    raise SystemExit(main())
