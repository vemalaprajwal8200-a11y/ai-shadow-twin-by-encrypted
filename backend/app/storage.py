"""Choose local JSON or Supabase storage and keep the public API stable."""

import os
from pathlib import Path

from dotenv import load_dotenv

from app.models import Finding, Item, Run

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").strip().lower()
if STORAGE_BACKEND not in {"local", "supabase"}:
    raise RuntimeError("STORAGE_BACKEND must be either 'local' or 'supabase'.")

if STORAGE_BACKEND == "supabase":
    try:
        from app import storage_supabase as _backend

        _backend.initialize()
    except Exception:
        STORAGE_BACKEND = "local"
        from app import storage_local as _backend
else:
    from app import storage_local as _backend


def save_items(items: list[Item]) -> None:
    return _backend.save_items(items)


def get_items(course_id: str) -> list[Item]:
    return _backend.get_items(course_id)


def get_item(item_id: str) -> Item | None:
    return _backend.get_item(item_id)


def save_run(run: Run) -> None:
    return _backend.save_run(run)


def get_runs(item_id: str) -> list[Run]:
    return _backend.get_runs(item_id)


def save_finding(finding: Finding) -> None:
    return _backend.save_finding(finding)


def get_findings(course_id: str) -> list[Finding]:
    return _backend.get_findings(course_id)


def update_course_status(course_id: str, items_done: int) -> dict:
    return _backend.update_course_status(course_id, items_done)


def get_course_status(course_id: str) -> dict:
    return _backend.get_course_status(course_id)


def save_course(course_id: str, filename: str, items_total: int) -> None:
    return _backend.save_course(course_id, filename, items_total)


def upload_course_file(
    course_id: str, filename: str, contents: bytes, content_type: str
) -> None:
    if STORAGE_BACKEND == "supabase":
        return _backend.upload_course_file(course_id, filename, contents, content_type)


def create_signed_url(course_id: str, filename: str) -> str:
    if STORAGE_BACKEND != "supabase":
        raise RuntimeError("Signed file URLs are available only with Supabase storage.")
    return _backend.create_signed_url(course_id, filename)