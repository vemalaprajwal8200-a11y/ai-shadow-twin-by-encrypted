"""Lazy AWS Bedrock Converse client with JSON parsing and one repair attempt."""

import json
import os
import time
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
_client = None


def _get_client():
    global _client
    region = os.getenv("AWS_REGION")
    model_id = os.getenv("BEDROCK_MODEL_ID")
    if not region:
        raise RuntimeError("Missing AWS_REGION in environment or backend/.env")
    if not model_id:
        raise RuntimeError("Missing BEDROCK_MODEL_ID in environment or backend/.env")
    if _client is None:
        _client = boto3.client("bedrock-runtime", region_name=region)
    return _client, model_id


def _converse(client: Any, request: dict) -> dict:
    for attempt in range(4):
        try:
            return client.converse(**request)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code != "ThrottlingException" or attempt == 3:
                raise
            time.sleep(2**attempt)
    raise RuntimeError("Bedrock request did not complete")


def _text(response: dict) -> str:
    return "".join(
        block.get("text", "")
        for block in response["output"]["message"]["content"]
        if "text" in block
    )


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


def _invoke(system: str, user: str, temperature: float, max_tokens: int) -> dict:
    client, model_id = _get_client()
    messages = [{"role": "user", "content": [{"text": user}]}]
    request = {
        "modelId": model_id,
        "system": [{"text": system}],
        "messages": messages,
        "inferenceConfig": {"maxTokens": max_tokens, "temperature": temperature},
    }
    started = time.perf_counter()
    response = _converse(client, request)
    raw = _text(response)
    input_tokens = response.get("usage", {}).get("inputTokens", 0)
    output_tokens = response.get("usage", {}).get("outputTokens", 0)
    try:
        parsed = _parse_json(raw)
    except (json.JSONDecodeError, ValueError):
        request["messages"] = [
            *messages,
            response["output"]["message"],
            {"role": "user", "content": [{"text": "Reply with valid JSON only. Return the same answer."}]},
        ]
        response = _converse(client, request)
        raw = _text(response)
        usage = response.get("usage", {})
        input_tokens += usage.get("inputTokens", 0)
        output_tokens += usage.get("outputTokens", 0)
        try:
            parsed = _parse_json(raw)
        except (json.JSONDecodeError, ValueError) as exc:
            raise ValueError(f"Bedrock returned invalid JSON: {raw!r}") from exc
    return {
        "parsed": parsed,
        "raw": raw,
        "latency_s": time.perf_counter() - started,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }


def ask(prompt: str, temperature: float = 0.5) -> dict:
    """Ask Bedrock for a JSON object using the configured model and region."""
    return _invoke("Reply only with valid JSON.", prompt, temperature, 1000)["parsed"]


def invoke_json(
    system: str, user: str, temperature: float = 0.2, max_tokens: int = 500
) -> dict:
    """Compatibility wrapper for the existing /twin/ask response shape."""
    return _invoke(system, user, temperature, max_tokens)