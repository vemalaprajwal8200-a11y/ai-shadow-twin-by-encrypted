"""Run a real upload, Gemini analysis, and results check against a local API."""

import argparse
import json
import os
import re
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests

POLL_SECONDS = 3
TIMEOUT_SECONDS = 15 * 60
EXPECTED_RUNS_PER_ITEM = 15
PERSONAS = ("average", "weak", "strong")
START_SERVER_MESSAGE = "Start the server first: uvicorn app.main:app --reload --port 8000"
RESULTS_PATH = Path(__file__).resolve().parents[1] / "docs" / "smoke-test-results.json"
SENSITIVE_FIELDS = {
    "api-key",
    "apikey",
    "authorization",
    "access-token",
    "token",
    "secret",
    "password",
    "service-key",
    "service-role",
    "supabase-service-key",
    "ai-api-key",
}


class SmokeTestError(Exception):
    """A readable error that should end this smoke test with exit code 1."""


class ApiError(SmokeTestError):
    """An API or HTTP error with a response code when one is available."""

    def __init__(self, status_code: int | None, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path, help="A sample .pptx or .pdf course file")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--max-items", type=int, default=4)
    args = parser.parse_args()
    if args.max_items < 1:
        parser.error("--max-items must be at least 1")
    return args


def error_message(payload: Any) -> str:
    """Extract FastAPI's detail or the upload route's error field."""
    if isinstance(payload, dict):
        for key in ("detail", "error", "message"):
            if key in payload:
                value = payload[key]
                return value if isinstance(value, str) else json.dumps(value)
    return json.dumps(payload, ensure_ascii=False)


def _safe_url(url: str) -> str:
    """Remove URL credentials and mask sensitive query parameters."""
    try:
        parts = urlsplit(url)
        if not parts.scheme or not parts.netloc:
            return url
        hostname = parts.hostname or ""
        if ":" in hostname and not hostname.startswith("["):
            hostname = f"[{hostname}]"
        if parts.port is not None:
            hostname = f"{hostname}:{parts.port}"
        if parts.username is not None or parts.password is not None:
            hostname = f"[REDACTED]@{hostname}"
        query = [
            (key, "[REDACTED]" if key.lower().replace("_", "-") in SENSITIVE_FIELDS else value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
        ]
        return urlunsplit(
            (parts.scheme, hostname, parts.path, urlencode(query), parts.fragment)
        )
    except ValueError:
        return "[REDACTED_URL]"


def _redact_text(text: str, api_key: str | None) -> str:
    if api_key:
        text = text.replace(api_key, "[REDACTED]")
    text = re.sub(
        r"(?i)(x-api-key\s*[:=]\s*)[^\s,;]+",
        r"\1[REDACTED]",
        text,
    )
    return re.sub(
        r"https?://[^\s'\"<>]+",
        lambda match: _safe_url(match.group(0)),
        text,
    )


def _redact_value(value: Any, api_key: str | None) -> Any:
    if isinstance(value, dict):
        return {
            key: "[REDACTED]"
            if str(key).lower().replace("_", "-") in SENSITIVE_FIELDS
            else _redact_value(item, api_key)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact_value(item, api_key) for item in value]
    if isinstance(value, str):
        return _redact_text(value, api_key)
    return value


def request_json(
    session: requests.Session,
    method: str,
    url: str,
    raw_results: dict,
    **kwargs: Any,
) -> Any:
    """Make one API request and keep its response in the results file."""
    try:
        response = session.request(method, url, timeout=30, **kwargs)
    except requests.RequestException as exc:
        api_key = session.headers.get("x-api-key")
        safe_error = _redact_text(str(exc), api_key)
        raise ApiError(None, f"{method} {_safe_url(url)} failed: {safe_error}") from None

    try:
        payload = response.json()
    except ValueError:
        payload = {"_raw_text": response.text}
    payload = _redact_value(payload, session.headers.get("x-api-key"))

    raw_results["requests"].append(
        {
            "method": method,
            "url": _safe_url(url),
            "status_code": response.status_code,
            "response": payload,
        }
    )
    if not response.ok:
        raise ApiError(response.status_code, error_message(payload))
    if "_raw_text" in payload:
        raise ApiError(response.status_code, "The API response was not valid JSON.")
    return payload


def save_results(raw_results: dict) -> None:
    """Write every response and report detail for later inspection."""
    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    raw_results["finished_at"] = datetime.now(timezone.utc).isoformat()
    RESULTS_PATH.write_text(
        json.dumps(raw_results, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Full results saved to {RESULTS_PATH}")


def item_runs_report(items: list, findings: list, runs_by_item: dict) -> dict:
    """Print per-item details and return warnings plus summary counts."""
    findings_by_item = {finding.get("itemId"): finding for finding in findings}
    warnings = []
    for finding in findings:
        if not str(finding.get("evidence", "")).strip():
            warnings.append(
                f"{finding.get('itemId', '<unknown item>')}: Finding evidence is empty."
            )
    total_runs = sum(len(runs) for runs in runs_by_item.values())
    expected_runs = len(items) * EXPECTED_RUNS_PER_ITEM

    print("\nItem report")
    for item in items:
        item_id = item.get("itemId", "<missing itemId>")
        runs = runs_by_item.get(item_id, [])
        finding = findings_by_item.get(item_id, {})
        persona_counts = Counter(run.get("persona", "unknown") for run in runs)
        text = " ".join(str(item.get("text", "")).split())
        evidence = str(finding.get("evidence", ""))
        print(f"\n  itemId: {item_id}")
        print(f"  text: {text[:60]}")
        print(f"  runs: {len(runs)} (expected {EXPECTED_RUNS_PER_ITEM})")
        print(
            "  runs per persona: "
            + ", ".join(f"{persona}={persona_counts.get(persona, 0)}" for persona in PERSONAS)
        )
        print(
            "  finding: "
            f"label={finding.get('label', 'missing')}, "
            f"defectType={finding.get('defectType', 'missing')}, "
            f"severity={finding.get('severity', 'missing')}"
        )
        print(f"  evidence: {evidence or '<empty>'}")

        if len(runs) < 10:
            warnings.append(f"{item_id}: fewer than 10 runs ({len(runs)}).")
        if not finding:
            warnings.append(f"{item_id}: no Finding was returned.")
        for run in runs:
            try:
                confidence = float(run.get("confidence"))
                if not 0 <= confidence <= 1:
                    warnings.append(
                        f"{item_id}: run {run.get('runId', '<unknown>')} has confidence {confidence} outside 0-1."
                    )
            except (TypeError, ValueError):
                warnings.append(
                    f"{item_id}: run {run.get('runId', '<unknown>')} has invalid confidence."
                )
            if not str(run.get("answer", "")).strip():
                warnings.append(f"{item_id}: run {run.get('runId', '<unknown>')} has an empty answer.")
            if not str(run.get("reasoning", "")).strip():
                warnings.append(f"{item_id}: run {run.get('runId', '<unknown>')} has empty reasoning.")

    labels = [finding.get("label", "unknown") for finding in findings]
    label_counts = Counter(labels)
    if len(items) > 1 and len(labels) == len(items) and len(set(labels)) == 1:
        warnings.append(
            f"All {len(items)} items share label {labels[0]!r}; classifier thresholds may need tuning."
        )
    if expected_runs and (expected_runs - total_runs) / expected_runs > 0.20:
        warnings.append(
            f"More than 20% of expected runs are missing ({total_runs}/{expected_runs} saved)."
        )

    return {
        "total_runs_saved": total_runs,
        "expected_runs": expected_runs,
        "finding_counts_by_label": {
            label: label_counts.get(label, 0)
            for label in ("content_defect", "ability_gap", "ok")
        },
        "warnings": warnings,
    }


def run_smoke_test(args: argparse.Namespace) -> int:
    """Run the API flow, report results, and save all responses even on failure."""
    started = time.monotonic()
    raw_results = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "base_url": _safe_url(args.base_url.rstrip("/")),
        "requests": [],
        "polls": [],
    }
    exit_code = 0
    session = requests.Session()
    api_key = os.getenv("API_KEY")
    if api_key:
        session.headers["x-api-key"] = api_key

    try:
        base_url = args.base_url.rstrip("/")
        try:
            health = request_json(session, "GET", f"{base_url}/health", raw_results)
        except ApiError:
            print(START_SERVER_MESSAGE, file=sys.stderr)
            raise
        if not isinstance(health, dict) or health.get("status") != "ok":
            print(START_SERVER_MESSAGE, file=sys.stderr)
            raise SmokeTestError("Health check did not return {\"status\":\"ok\"}.")
        print("Health check passed.")

        if not args.file.is_file():
            raise SmokeTestError(f"Upload file does not exist: {args.file}")
        with args.file.open("rb") as upload_file:
            upload = request_json(
                session,
                "POST",
                f"{base_url}/courses",
                raw_results,
                files={"file": (args.file.name, upload_file)},
            )
        raw_results["upload"] = upload
        course_id = upload.get("courseId")
        item_count = int(upload.get("itemCount", 0))
        print(f"Uploaded courseId={course_id}; itemCount={item_count}")
        if not course_id or item_count < 1:
            raise SmokeTestError("Upload returned no courseId or no items.")

        if item_count > args.max_items:
            print(
                f"Warning: {item_count} items exceed --max-items {args.max_items}; "
                "analysis may make many Gemini calls and cost more."
            )
            if input("Continue? [y/N]: ").strip().lower() != "y":
                print("Analysis cancelled before calling Gemini.")
                return 0

        raw_results["analyze"] = request_json(
            session, "POST", f"{base_url}/courses/{course_id}/analyze", raw_results
        )
        print("Analysis started; polling status...")
        deadline = time.monotonic() + TIMEOUT_SECONDS
        timed_out = False
        while True:
            status = request_json(
                session, "GET", f"{base_url}/courses/{course_id}/status", raw_results
            )
            raw_results["polls"].append(status)
            try:
                done = int(status.get("itemsDone", 0))
                total = int(status.get("itemsTotal", item_count))
            except (TypeError, ValueError):
                raise SmokeTestError("Status response contains invalid item counts.") from None
            elapsed = time.monotonic() - started
            print(f"Progress: itemsDone/itemsTotal = {done}/{total}; elapsed {elapsed:.1f}s")
            if total > 0 and done >= total:
                break
            if time.monotonic() >= deadline:
                timed_out = True
                exit_code = 1
                print("Timed out after 15 minutes while waiting for course analysis.", file=sys.stderr)
                break
            time.sleep(POLL_SECONDS)

        items = request_json(
            session, "GET", f"{base_url}/courses/{course_id}/items", raw_results
        )
        findings = request_json(
            session, "GET", f"{base_url}/courses/{course_id}/findings", raw_results
        )
        if not isinstance(items, list) or not isinstance(findings, list):
            raise SmokeTestError("Items or findings response was not a JSON list.")
        raw_results["items"] = items
        raw_results["findings"] = findings
        runs_by_item = {}
        for item in items:
            item_id = item.get("itemId")
            if not item_id:
                continue
            runs_by_item[item_id] = request_json(
                session, "GET", f"{base_url}/items/{item_id}/runs", raw_results
            )
        raw_results["runs_by_item"] = runs_by_item

        summary = item_runs_report(items, findings, runs_by_item)
        elapsed = time.monotonic() - started
        average_seconds = elapsed / len(items) if items else 0
        summary["total_time_seconds"] = round(elapsed, 2)
        summary["average_seconds_per_item"] = round(average_seconds, 2)
        raw_results["summary"] = summary

        print("\nSummary")
        print(f"  total time: {elapsed:.1f}s")
        print(f"  average seconds per item: {average_seconds:.1f}s")
        print(f"  findings by label: {summary['finding_counts_by_label']}")
        print(
            f"  runs saved: {summary['total_runs_saved']}/{summary['expected_runs']} expected"
        )
        warnings = summary["warnings"]
        print("\nWarnings")
        if warnings:
            for warning in warnings:
                print(f"  - {warning}")
        else:
            print("  None.")

        critical = []
        if timed_out:
            critical.append("Analysis timed out.")
        if summary["total_runs_saved"] == 0:
            critical.append("No runs were saved.")
        if len(findings) == 0:
            critical.append("No findings were returned.")
        summary["critical_problems"] = critical
        if critical:
            exit_code = 1
            print("\nCritical problems")
            for problem in critical:
                print(f"  - {problem}", file=sys.stderr)
    except ApiError as exc:
        code = f"HTTP {exc.status_code}" if exc.status_code is not None else "request error"
        print(f"API error ({code}): {exc.message}", file=sys.stderr)
        exit_code = 1
    except SmokeTestError as exc:
        print(f"Smoke test error: {_redact_text(str(exc), api_key)}", file=sys.stderr)
        exit_code = 1
    except (OSError, ValueError) as exc:
        print(f"Smoke test error: {_redact_text(str(exc), api_key)}", file=sys.stderr)
        exit_code = 1
    finally:
        try:
            save_results(raw_results)
        except OSError as exc:
            print(f"Could not save results to {RESULTS_PATH}: {exc}", file=sys.stderr)
            exit_code = 1
        session.close()
    return exit_code


def main() -> int:
    return run_smoke_test(parse_arguments())


if __name__ == "__main__":
    sys.exit(main())
