"""Persist chat sessions and ground replies in course analysis data."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.chat_service import run_chat
from app.supabase_client import get_supabase_client


def _rows(response: Any) -> list[dict[str, Any]]:
    return response.data or []


def answer_course_chat(
    *,
    user_id: str,
    session_id: str | None,
    course_id: str,
    message: str,
) -> dict[str, Any]:
    client = get_supabase_client()
    course_rows = _rows(
        client.table("courses").select("course_id,faculty_id,course_name")
        .eq("course_id", course_id).limit(1).execute()
    )
    if not course_rows:
        raise ValueError("The selected course was not found or is not available to this user.")
    course = course_rows[0]
    if course.get("faculty_id") and course["faculty_id"] != user_id:
        raise PermissionError("You do not have access to this course.")

    session = None
    if session_id:
        session_rows = _rows(
            client.table("chat_sessions").select("*")
            .eq("session_id", session_id).eq("user_id", user_id).limit(1).execute()
        )
        session = session_rows[0] if session_rows else None
        if session and session.get("course_id") != course_id:
            raise ValueError("A chat session cannot be moved between courses.")
    if session is None:
        session_id = session_id or str(uuid4())
        session_rows = _rows(client.table("chat_sessions").insert({
            "session_id": session_id,
            "user_id": user_id,
            "course_id": course_id,
            "title": message[:80],
        }).select("*").execute())
        session = session_rows[0] if session_rows else {"session_id": session_id}

    history_rows = _rows(
        client.table("chat_messages").select("role,content")
        .eq("session_id", session_id).order("created_at", desc=False).execute()
    )
    client.table("chat_messages").insert({
        "session_id": session_id,
        "user_id": user_id,
        "role": "user",
        "content": message,
    }).execute()

    items = _rows(
        client.table("content_items").select("content_item_id,item_type,title,content_text,unit_id")
        .eq("course_id", course_id).order("created_at", desc=False).limit(20).execute()
    )
    item_ids = [item["content_item_id"] for item in items]
    verdict_rows = _rows(
        client.table("verdicts").select("content_item_id,verdict,confidence,reason")
        .eq("course_id", course_id).execute()
    ) if item_ids else []
    flag_rows = _rows(
        client.table("flags").select("content_item_id,status,severity,review_note")
        .eq("course_id", course_id).execute()
    ) if item_ids else []
    verdict_by_item = {row["content_item_id"]: row for row in verdict_rows}
    flags_by_item: dict[str, list[dict[str, Any]]] = {}
    for flag in flag_rows:
        flags_by_item.setdefault(flag["content_item_id"], []).append(flag)

    context = []
    sources = []
    for item in items:
        item_id = item["content_item_id"]
        verdict = verdict_by_item.get(item_id, {})
        item_flags = flags_by_item.get(item_id, [])
        title = item.get("title") or item_id
        sources.append({"id": item_id, "title": title, "type": item.get("item_type", "slide")})
        context.append(
            f"[{item.get('item_type', 'item')}] {title}\n{item.get('content_text', '')}\n"
            f"Verdict: {verdict.get('verdict', 'unreviewed')}; confidence: {verdict.get('confidence', 'n/a')}; "
            f"Flags: {', '.join(str(flag.get('severity', '')) + '/' + str(flag.get('status', 'open')) for flag in item_flags) or 'none'}"
        )

    course_context = "\n\n".join(context) or "No analyzed course content is available."
    grounded_message = (
        f"Course: {course.get('course_name') or course_id}\n\n"
        f"Course materials and review data:\n{course_context}\n\n"
        f"Faculty question:\n{message}"
    )
    result = run_chat(
        grounded_message,
        [{"role": row["role"], "content": row["content"]} for row in history_rows if row.get("role") in {"user", "assistant"}],
        None,
        str(uuid4()),
    )
    client.table("chat_messages").insert({
        "session_id": session_id,
        "user_id": user_id,
        "role": "assistant",
        "content": result.reply,
    }).execute()
    client.table("chat_sessions").update({"updated_at": datetime.now(timezone.utc).isoformat()}).eq("session_id", session_id).execute()

    return {
        "session_id": session_id,
        "reply": result.reply,
        "provider": result.provider,
        "model": result.model,
        "latencyMs": result.latency_ms,
        "sources": sources,
    }
