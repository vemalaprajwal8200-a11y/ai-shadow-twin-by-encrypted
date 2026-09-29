import json
import os
import time

import boto3
from botocore.exceptions import ClientError

_client = None


def _get_client(region: str):
    global _client
    if _client is None:
        _client = boto3.client("bedrock-runtime", region_name=region)
    return _client


def _required_environment_value(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _converse_with_throttle_retry(client, request: dict) -> dict:
    for attempt in range(5):
        try:
            return client.converse(**request)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            if error_code != "ThrottlingException" or attempt == 4:
                raise
            time.sleep(2**attempt)


def _response_text(response: dict) -> str:
    content = response["output"]["message"]["content"]
    return "".join(block.get("text", "") for block in content if "text" in block)


def _strip_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        newline = cleaned.find("\n")
        if newline >= 0:
            cleaned = cleaned[newline + 1 :]
        else:
            cleaned = cleaned[3:]
    cleaned = cleaned.rstrip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def _token_counts(response: dict) -> tuple[int, int]:
    usage = response.get("usage", {})
    return usage.get("inputTokens") or 0, usage.get("outputTokens") or 0


def invoke_json(
    system: str,
    user: str,
    temperature: float = 0.2,
    max_tokens: int = 500,
) -> dict:
    started_at = time.perf_counter()
    region = _required_environment_value("AWS_REGION")
    model_id = _required_environment_value("BEDROCK_MODEL_ID")
    client = _get_client(region)
    inference_config = {"maxTokens": max_tokens, "temperature": temperature}
    messages = [{"role": "user", "content": [{"text": user}]}]
    request = {
        "modelId": model_id,
        "system": [{"text": system}],
        "messages": messages,
        "inferenceConfig": inference_config,
    }

    response = _converse_with_throttle_retry(client, request)
    raw = _response_text(response)
    input_tokens, output_tokens = _token_counts(response)

    try:
        parsed = json.loads(_strip_fences(raw))
    except json.JSONDecodeError:
        repair_request = {
            **request,
            "messages": [
                *messages,
                response["output"]["message"],
                {
                    "role": "user",
                    "content": [
                        {
                            "text": "Return the same answer as valid JSON only. Do not include Markdown fences or commentary."
                        }
                    ],
                },
            ],
        }
        repaired_response = _converse_with_throttle_retry(client, repair_request)
        repaired_raw = _response_text(repaired_response)
        repaired_input_tokens, repaired_output_tokens = _token_counts(repaired_response)
        input_tokens += repaired_input_tokens
        output_tokens += repaired_output_tokens
        try:
            parsed = json.loads(_strip_fences(repaired_raw))
        except json.JSONDecodeError as exc:
            raise ValueError(
                "Model returned invalid JSON after one repair. "
                f"Raw text: {repaired_raw!r}; initial raw text: {raw!r}"
            ) from exc
        raw = repaired_raw

    return {
        "parsed": parsed,
        "raw": raw,
        "latency_s": time.perf_counter() - started_at,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }