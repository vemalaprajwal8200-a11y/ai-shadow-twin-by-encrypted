"""Supabase storage adapter with explicit database/API field conversion."""

import os

from app.models import Finding, Item, Run
from app.supabase_client import get_supabase_client, supabase_service_role_key, supabase_url

_client = None
_bucket = None


class StorageError(RuntimeError):
    """A safe storage error that never includes provider details or credentials."""


def initialize() -> None:
    """Validate settings and create the service-role client once at startup."""
    global _client, _bucket

    required = {
        "SUPABASE_URL": supabase_url(),
        "SUPABASE_SERVICE_ROLE_KEY": supabase_service_role_key(),
        "SUPABASE_BUCKET": (os.getenv("SUPABASE_BUCKET") or "").strip(),
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required Supabase setting: {missing[0]}.")
    if _client is not None:
        return

    try:
        _client = get_supabase_client()
        _bucket = required["SUPABASE_BUCKET"]
    except Exception:
        raise RuntimeError("Could not initialize the Supabase client.") from None


def _get_client():
    if _client is None:
        initialize()
    return _client


def _item_to_row(item: Item) -> dict:
    return {
        "item_id": item.itemId,
        "course_id": item.courseId,
        "order_index": item.orderIndex,
        "type": item.type,
        "text": item.text,
        "answer_key": item.answerKey,
    }


def _item_from_row(row: dict) -> Item:
    return Item.model_validate(
        {
            "itemId": row["item_id"],
            "courseId": row["course_id"],
            "orderIndex": row["order_index"],
            "type": row["type"],
            "text": row["text"],
            "answerKey": row.get("answer_key"),
        }
    )


def _run_to_row(run: Run) -> dict:
    return {
        "run_id": run.runId,
        "item_id": run.itemId,
        "persona": run.persona,
        "answer": run.answer,
        "reasoning": run.reasoning,
        "confidence": run.confidence,
        "context_mode": "taught_only",
    }


def _run_from_row(row: dict) -> Run:
    return Run.model_validate(
        {
            "runId": row["run_id"],
            "itemId": row["item_id"],
            "persona": row["persona"],
            "answer": row["answer"],
            "reasoning": row["reasoning"],
            "confidence": row["confidence"],
        }
    )


def _finding_to_row(finding: Finding, course_id: str) -> dict:
    return {
        "item_id": finding.itemId,
        "course_id": course_id,
        "label": finding.label,
        "defect_type": finding.defectType,
        "severity": finding.severity,
        "evidence": finding.evidence,
        "suggested_rewrite": finding.suggestedRewrite,
    }


def _finding_from_row(row: dict) -> Finding:
    return Finding.model_validate(
        {
            "itemId": row["item_id"],
            "label": row["label"],
            "defectType": row["defect_type"],
            "severity": row["severity"],
            "evidence": row["evidence"],
            "suggestedRewrite": row.get("suggested_rewrite"),
        }
    )


def save_items(items: list[Item]) -> None:
    if not items:
        return
    try:
        rows = [_item_to_row(item) for item in items]
        _get_client().table("items").insert(rows).execute()
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def get_items(course_id: str) -> list[Item]:
    try:
        response = (
            _get_client()
            .table("items")
            .select("*")
            .eq("course_id", course_id)
            .order("order_index")
            .execute()
        )
        return [_item_from_row(row) for row in response.data or []]
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def get_item(item_id: str) -> Item | None:
    try:
        response = (
            _get_client().table("items").select("*").eq("item_id", item_id).execute()
        )
        rows = response.data or []
        return _item_from_row(rows[0]) if rows else None
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def save_run(run: Run) -> None:
    try:
        _get_client().table("runs").upsert(_run_to_row(run)).execute()
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def get_runs(item_id: str) -> list[Run]:
    try:
        response = (
            _get_client().table("runs").select("*").eq("item_id", item_id).execute()
        )
        return [_run_from_row(row) for row in response.data or []]
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def save_finding(finding: Finding) -> None:
    try:
        client = _get_client()
        item_response = (
            client.table("items")
            .select("course_id")
            .eq("item_id", finding.itemId)
            .execute()
        )
        rows = item_response.data or []
        if not rows:
            raise ValueError("Finding item does not exist.")
        row = _finding_to_row(finding, rows[0]["course_id"])
        client.table("findings").upsert(row).execute()
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def get_findings(course_id: str) -> list[Finding]:
    try:
        response = (
            _get_client()
            .table("findings")
            .select("*")
            .eq("course_id", course_id)
            .execute()
        )
        return [_finding_from_row(row) for row in response.data or []]
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def save_course(course_id: str, filename: str, items_total: int) -> None:
    try:
        _get_client().table("courses").upsert(
            {
                "course_id": course_id,
                "filename": filename,
                "status": "uploaded",
                "items_done": 0,
                "items_total": items_total,
            }
        ).execute()
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def update_course_status(course_id: str, items_done: int) -> dict:
    try:
        client = _get_client()
        response = (
            client.table("courses")
            .select("items_total")
            .eq("course_id", course_id)
            .execute()
        )
        rows = response.data or []
        if rows:
            items_total = rows[0]["items_total"]
            client.table("courses").update(
                {
                    "items_done": items_done,
                    "status": "complete" if items_done >= items_total else "analyzing",
                }
            ).eq("course_id", course_id).execute()
        else:
            items_total = len(get_items(course_id))
            client.table("courses").upsert(
                {
                    "course_id": course_id,
                    "status": "complete" if items_done >= items_total else "analyzing",
                    "items_done": items_done,
                    "items_total": items_total,
                }
            ).execute()
        return {"itemsDone": items_done, "itemsTotal": items_total}
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def get_course_status(course_id: str) -> dict:
    try:
        response = (
            _get_client()
            .table("courses")
            .select("items_done, items_total")
            .eq("course_id", course_id)
            .execute()
        )
        rows = response.data or []
        if rows:
            return {
                "itemsDone": rows[0]["items_done"],
                "itemsTotal": rows[0]["items_total"],
            }
        return {"itemsDone": 0, "itemsTotal": len(get_items(course_id))}
    except Exception:
        raise StorageError("Supabase storage request failed.") from None


def upload_course_file(
    course_id: str, filename: str, contents: bytes, content_type: str
) -> None:
    try:
        safe_filename = Path(filename).name
        path = f"{course_id}/{safe_filename}"
        _get_client().storage.from_(_bucket).upload(
            path,
            contents,
            {"content-type": content_type, "upsert": "true"},
        )
    except Exception:
        raise StorageError("Supabase file upload failed.") from None


def create_signed_url(course_id: str, filename: str) -> str:
    try:
        safe_filename = Path(filename).name
        path = f"{course_id}/{safe_filename}"
        response = _get_client().storage.from_(_bucket).create_signed_url(path, 3600)
        return response["signedURL"]
    except Exception:
        raise StorageError("Supabase file link could not be created.") from None
