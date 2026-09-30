"""Supabase-backed upload extraction and faculty analysis workflow."""

from __future__ import annotations

import csv
import json
import statistics
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.engine.gemini_client import invoke_json
from app.ingest import parse_pdf, parse_pptx
from app.supabase_client import get_supabase_client


def _response_rows(response: Any) -> list[dict[str, Any]]:
    return response.data or []


def _upload_bytes(storage_path: str) -> bytes:
    client = get_supabase_client()
    result = client.storage.from_("course-uploads").download(storage_path)
    if isinstance(result, bytes):
        return result
    if isinstance(result, bytearray):
        return bytes(result)
    if isinstance(result, dict) and isinstance(result.get("data"), bytes):
        return result["data"]
    raise RuntimeError("Uploaded file could not be downloaded from storage.")


def _extract_text_items(upload: dict[str, Any], contents: bytes) -> list[dict[str, Any]]:
    filename = Path(upload["file_name"]).name
    suffix = Path(filename).suffix.lower()
    course_id = upload["course_id"]
    upload_id = upload["upload_id"]

    if suffix in {".pptx", ".pdf"}:
        with tempfile.NamedTemporaryFile(suffix=suffix) as temporary:
            temporary.write(contents)
            temporary.flush()
            parsed = parse_pptx(temporary.name, str(course_id)) if suffix == ".pptx" else parse_pdf(temporary.name, str(course_id))
        item_type = "question" if "question" in filename.lower() or "assessment" in filename.lower() else "slide"
        return [
            {
                "course_id": course_id,
                "unit_id": upload.get("unit_id"),
                "upload_id": upload_id,
                "item_type": item_type,
                "title": f"{filename} · {item.orderIndex}",
                "content_text": item.text,
                "order_index": item.orderIndex,
            }
            for item in parsed
            if item.text.strip()
        ]

    text = contents.decode("utf-8-sig", errors="replace")
    if suffix == ".csv":
        rows = list(csv.DictReader(text.splitlines()))
        items = []
        for index, row in enumerate(rows, start=1):
            question = row.get("question") or row.get("text") or row.get("prompt") or ""
            if not question.strip():
                continue
            items.append({
                "course_id": course_id,
                "unit_id": upload.get("unit_id"),
                "upload_id": upload_id,
                "item_type": "question",
                "title": row.get("title") or f"{filename} · {index}",
                "content_text": question.strip(),
                "answer_key": row.get("answer_key") or row.get("answer"),
                "order_index": index,
            })
        return items

    blocks = [block.strip() for block in text.split("\n\n") if block.strip()]
    return [
        {
            "course_id": course_id,
            "unit_id": upload.get("unit_id"),
            "upload_id": upload_id,
            "item_type": "slide",
            "title": f"{filename} · {index}",
            "content_text": block,
            "order_index": index,
        }
        for index, block in enumerate(blocks, start=1)
    ]


def _load_personas(faculty_id: str) -> list[dict[str, Any]]:
    client = get_supabase_client()
    built_in = _response_rows(
        client.table("personas").select("*").is_("faculty_id", "null").eq("is_active", True).execute()
    )
    owned = _response_rows(
        client.table("personas").select("*").eq("faculty_id", faculty_id).eq("is_active", True).execute()
    )
    return built_in + owned


def _fallback_student_response(item: dict[str, Any], prior_context: str, persona: dict[str, Any]) -> dict[str, Any]:
    text = str(item.get("content_text") or "")
    answer_key = str(item.get("answer_key") or "").strip()
    prompt = str(item.get("title") or "").strip()
    if answer_key:
        answer = answer_key
    elif text:
        clean = " ".join(text.split())
        if len(clean) > 220:
            answer = clean[:220].strip() + "…"
        else:
            answer = clean
    else:
        answer = "No answer available from the uploaded material."

    persona_name = str(persona.get("name") or "student").strip() or "student"
    reasoning = (
        "Local fallback used because the AI provider is not configured. "
        f"The {persona_name} response was generated from the available content and should be reviewed manually."
    )
    if prior_context.strip():
        reasoning += f" Prior context references: {prior_context[:160].strip()}"
    return {
        "answer": answer,
        "reasoning": reasoning,
        "confidence": 0.35,
    }


def _student_response(item: dict[str, Any], prior_context: str, persona: dict[str, Any]) -> dict[str, Any]:
    instructions = persona.get("prompt") or persona.get("description") or "Answer as a student with the selected learning persona."
    try:
        payload = invoke_json(
            system="You are a student answering course material. Return only JSON with answer, reasoning, and confidence (0 to 1).",
            user=(
                f"Student persona: {instructions}\n\n"
                f"Material already taught:\n{prior_context or 'No earlier material.'}\n\n"
                f"Item to answer:\n{item['content_text']}"
            ),
            temperature=0.4,
            max_tokens=700,
        )["parsed"]
    except (RuntimeError, ValueError, TypeError):
        return _fallback_student_response(item, prior_context, persona)

    confidence = max(0.0, min(1.0, float(payload.get("confidence", 0.5))))
    return {
        "answer": str(payload.get("answer", "")),
        "reasoning": str(payload.get("reasoning", "")),
        "confidence": confidence,
    }


def _normalize_answer(value: str) -> str:
    return " ".join("".join(char.lower() if char.isalnum() else " " for char in value).split())


def run_analysis(analysis_run_id: str, course_id: str, faculty_id: str) -> None:
    client = get_supabase_client()
    run_table = client.table("analysis_runs")
    try:
        run_table.update({
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "error_message": None,
        }).eq("analysis_run_id", analysis_run_id).execute()
        uploads = _response_rows(
            client.table("uploads").select("*").eq("course_id", course_id).order("created_at").execute()
        )
        for upload in uploads:
            existing = _response_rows(
                client.table("content_items").select("content_item_id").eq("upload_id", upload["upload_id"]).limit(1).execute()
            )
            if existing:
                continue
            extracted = _extract_text_items(upload, _upload_bytes(upload["storage_path"]))
            if extracted:
                client.table("content_items").upsert(extracted, on_conflict="upload_id,order_index").execute()

        items = _response_rows(
            client.table("content_items").select("*").eq("course_id", course_id).order("created_at").execute()
        )
        settings_rows = _response_rows(
            client.table("user_settings").select("runs_per_item,confidence_threshold").eq("user_id", faculty_id).limit(1).execute()
        )
        settings = settings_rows[0] if settings_rows else {}
        runs_per_item = max(1, min(10, int(settings.get("runs_per_item", 1))))
        threshold = max(0.0, min(1.0, float(settings.get("confidence_threshold", 0.65))))
        personas = _load_personas(faculty_id)
        if not personas:
            personas = [{"persona_id": None, "name": "average", "prompt": "Respond as an average student."}]

        run_table.update({"total_items": len(items), "processed_items": 0}).eq("analysis_run_id", analysis_run_id).execute()
        context_by_unit: dict[str, list[str]] = {}
        for processed, item in enumerate(items, start=1):
            unit_key = str(item.get("unit_id") or "")
            prior_context = "\n\n".join(context_by_unit.get(unit_key, []))
            results = []
            for persona in personas:
                for _ in range(runs_per_item):
                    result = _student_response(item, prior_context, persona)
                    result_row = {
                        "analysis_run_id": analysis_run_id,
                        "content_item_id": item["content_item_id"],
                        "persona_id": persona.get("persona_id"),
                        "answer": result["answer"],
                        "reasoning": result["reasoning"],
                        "confidence": result["confidence"],
                    }
                    client.table("item_results").insert(result_row).execute()
                    results.append(result)

            normalized = [_normalize_answer(result["answer"]) for result in results]
            agreement = max(Counter(normalized).values(), default=0) / max(1, len(normalized))
            confidence = statistics.fmean(result["confidence"] for result in results) if results else 0.0
            answer_key = item.get("answer_key")
            key_match = bool(answer_key) and any(_normalize_answer(result["answer"]) == _normalize_answer(answer_key) for result in results)
            if answer_key and not key_match:
                verdict = "flawed"
            elif agreement < 0.6 or confidence < threshold:
                verdict = "ambiguous"
            else:
                verdict = "clear"

            verdict_row = {
                "analysis_run_id": analysis_run_id,
                "course_id": course_id,
                "content_item_id": item["content_item_id"],
                "verdict": verdict,
                "confidence": confidence,
                "reason": f"Twin answer agreement {agreement:.2f}; mean confidence {confidence:.2f}.",
            }
            verdict_response = client.table("verdicts").upsert(verdict_row, on_conflict="content_item_id").execute()
            verdict_data = (verdict_response.data or [{}])[0]
            if verdict != "clear" or confidence < threshold:
                client.table("flags").upsert({
                    "analysis_run_id": analysis_run_id,
                    "course_id": course_id,
                    "content_item_id": item["content_item_id"],
                    "verdict_id": verdict_data.get("verdict_id"),
                    "status": "open",
                    "severity": "high" if verdict == "flawed" else "medium",
                }, on_conflict="content_item_id").execute()
            context_by_unit.setdefault(unit_key, []).append(item.get("content_text", ""))
            run_table.update({"processed_items": processed}).eq("analysis_run_id", analysis_run_id).execute()

        run_table.update({
            "status": "completed",
            "processed_items": len(items),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "error_message": None,
        }).eq("analysis_run_id", analysis_run_id).execute()
    except Exception as exc:
        error_text = str(exc)[:2000]
        run_table.update({
            "status": "failed",
            "error_message": error_text,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("analysis_run_id", analysis_run_id).execute()
        raise


def queue_analysis(course_id: str, faculty_id: str) -> dict[str, Any]:
    client = get_supabase_client()
    uploads = _response_rows(client.table("uploads").select("upload_id").eq("course_id", course_id).execute())
    if not uploads:
        raise ValueError("Upload at least one file before starting analysis.")
    run_id = str(uuid4())
    row = {
        "analysis_run_id": run_id,
        "course_id": course_id,
        "started_by": faculty_id,
        "status": "queued",
        "processed_items": 0,
        "total_items": 0,
    }
    client.table("analysis_runs").insert(row).execute()
    return row
