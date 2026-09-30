"""FastAPI endpoints for local course ingestion and student-twin analysis."""

import os
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any
from uuid import uuid4

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_BACKEND_ROOT_STR = str(_BACKEND_ROOT)
if _BACKEND_ROOT_STR not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT_STR)

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from pydantic import BaseModel

from app.chat_api import handle_chat_health, handle_post_chat
from app.chat_data_service import answer_course_chat
from app.analysis_service import queue_analysis, run_analysis
from app.supabase_client import get_supabase_client
from app.auth import (
    get_current_user,
    get_faculty_invite_code,
    is_faculty_code_valid,
    require_faculty,
)
from app.engine.gemini_client import invoke_json, validate_configuration
from app.classifier import classify_item
from app.ingest import parse_pdf, parse_pptx
from app.judge import add_judge_evidence
from app.storage import (
    STORAGE_BACKEND,
    get_course_status,
    get_findings,
    get_items,
    get_runs,
    save_course,
    save_finding,
    save_items,
    upload_course_file,
    update_course_status,
)
from app.storage_supabase import StorageError
from app.signals import compute_signals
from app.twin import run_item_full, twin_run

DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:5174,http://127.0.0.1:5174,"
    "http://localhost:4173,http://127.0.0.1:4173"
)


def cors_allow_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOW_ORIGINS", DEFAULT_CORS_ORIGINS)
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app = FastAPI(title="AI Shadow-Twin API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins(),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=True,
)
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024


@app.exception_handler(StorageError)
async def storage_error_handler(_request, _exc):
    return JSONResponse(
        status_code=503, content={"error": "Storage backend request failed."}
    )


@app.on_event("startup")
def validate_ai_settings() -> None:
    if not any(os.getenv(name) for name in ("GEMINI_API_KEY", "GEMINI_MODEL")):
        return
    try:
        validate_configuration()
    except RuntimeError:
        return


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat/")
@app.post("/chat")
async def post_chat(request: Request):
    return await handle_post_chat(request)


@app.get("/chat/health")
def chat_health(deep: bool = Query(default=False)):
    return handle_chat_health(deep)


class InviteCodeRequest(BaseModel):
    code: str | None = None


@app.post("/auth/verify-faculty-code")
def verify_faculty_code(request: InviteCodeRequest = InviteCodeRequest()):
    """Verify if faculty invite code is valid. Never exposes secret code to client."""
    has_code = bool(get_faculty_invite_code())
    valid = is_faculty_code_valid(request.code)
    return {"required": has_code, "valid": valid}


class TwinAskRequest(BaseModel):
    question: str


@app.post("/twin/ask")
def ask_twin(request: TwinAskRequest):
    try:
        return invoke_json(
            system="You are a student who has only seen the material provided. Reply ONLY with valid JSON.",
            user=(
                "Answer the following question as JSON with keys answer, reasoning, "
                "and confidence (0 to 1):\n\n"
                f"{request.question}"
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Gemini returned invalid JSON.") from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini configuration error: {exc}",
        ) from exc


class CourseChatRequest(BaseModel):
    session_id: str | None = None
    course_id: str
    message: str


@app.post("/api/chat")
def persistent_course_chat(
    request: CourseChatRequest,
    current_user: Any = Depends(get_current_user),
):
    try:
        return answer_course_chat(
            user_id=current_user["id"],
            session_id=request.session_id,
            course_id=request.course_id,
            message=request.message,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Chat could not be completed.") from exc


@app.post("/api/analyze/{course_id}")
def start_supabase_analysis(
    course_id: str,
    background_tasks: BackgroundTasks,
    current_user: Any = Depends(require_faculty),
):
    user_id = current_user["id"]
    try:
        client = get_supabase_client()
        courses = client.table("courses").select("course_id,faculty_id").eq("course_id", course_id).limit(1).execute().data or []
        if not courses:
            raise HTTPException(status_code=404, detail="Course not found.")
        if courses[0].get("faculty_id") != user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this course.")
        run = queue_analysis(course_id, user_id)
        background_tasks.add_task(run_analysis, run["analysis_run_id"], course_id, user_id)
        return run
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Analysis could not be queued.") from exc


@app.post("/courses")
async def create_course(file: UploadFile = File(...), _faculty: Any = Depends(require_faculty)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pptx", ".pdf"}:
        return JSONResponse(status_code=415, content={"error": "Upload a .pptx or .pdf file."})
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        return JSONResponse(status_code=413, content={"error": "File exceeds the 20 MB limit."})

    course_id = str(uuid4())
    original_filename = Path(file.filename or f"upload{suffix}").name
    is_temporary = STORAGE_BACKEND == "supabase"
    if is_temporary:
        temporary_file = NamedTemporaryFile(suffix=suffix, delete=False)
        path = Path(temporary_file.name)
        temporary_file.close()
    else:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        path = UPLOAD_DIR / f"{course_id}{suffix}"
    path.write_bytes(contents)
    try:
        items = parse_pptx(path, course_id) if suffix == ".pptx" else parse_pdf(path, course_id)
    except Exception as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Could not read the uploaded file.") from exc
    if not items or not any(item.text.strip() for item in items):
        path.unlink(missing_ok=True)
        return JSONResponse(status_code=422, content={"error": "No text could be extracted from the file."})
    try:
        if is_temporary:
            upload_course_file(
                course_id,
                original_filename,
                contents,
                file.content_type or "application/octet-stream",
            )
        save_course(course_id, original_filename, len(items))
        save_items(items)
    except StorageError:
        path.unlink(missing_ok=True)
        return JSONResponse(status_code=503, content={"error": "Storage backend request failed."})
    if is_temporary:
        path.unlink(missing_ok=True)
    return {"courseId": course_id, "itemCount": len(items)}


@app.get("/courses/{course_id}/items")
def course_items(course_id: str, _user: Any = Depends(get_current_user)):
    return get_items(course_id)


def _analyze_course_background(course_id: str) -> None:
    """Analyze each item in the background and update progress after each one."""
    items = get_items(course_id)
    for items_done, item in enumerate(items, start=1):
        try:
            runs = run_item_full(item.itemId)
            signals = compute_signals(item, runs)
            finding = classify_item(item, signals)
            try:
                finding = add_judge_evidence(item, signals, runs, finding)
            except Exception as exc:
                finding = finding.model_copy(
                    update={
                        "evidence": (
                            f"{finding.evidence} Judge unavailable: "
                            f"{type(exc).__name__}."
                        )
                    }
                )
            save_finding(finding)
        except Exception as exc:
            print(f"Analysis failed for item {item.itemId}: {type(exc).__name__}")
        finally:
            update_course_status(course_id, items_done)


@app.post("/courses/{course_id}/analyze")
def analyze_course(
    course_id: str,
    background_tasks: BackgroundTasks,
    _faculty: Any = Depends(require_faculty),
):
    items = get_items(course_id)
    if not items:
        raise HTTPException(status_code=404, detail="Course has no stored items.")
    update_course_status(course_id, 0)
    background_tasks.add_task(_analyze_course_background, course_id)
    return {"courseId": course_id, "status": "running", **get_course_status(course_id)}


@app.get("/courses/{course_id}/status")
def course_status(course_id: str, _user: Any = Depends(get_current_user)):
    return {"courseId": course_id, **get_course_status(course_id)}


@app.get("/courses/{course_id}/findings")
def course_findings(
    course_id: str,
    label: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    _faculty: Any = Depends(require_faculty),
):
    findings = get_findings(course_id)
    if label is not None:
        findings = [finding for finding in findings if finding.label == label]
    if severity is not None:
        findings = [finding for finding in findings if finding.severity == severity]
    return findings


class ReviewRequest(BaseModel):
    itemId: str
    status: str
    comment: str | None = None


@app.post("/courses/{course_id}/review")
def review_item(
    course_id: str,
    request: ReviewRequest,
    _faculty: Any = Depends(require_faculty),
):
    return {"courseId": course_id, "itemId": request.itemId, "status": request.status}


class RewriteRequest(BaseModel):
    itemId: str
    suggestedRewrite: str


@app.post("/courses/{course_id}/rewrite")
def rewrite_item(
    course_id: str,
    request: RewriteRequest,
    _faculty: Any = Depends(require_faculty),
):
    return {"courseId": course_id, "itemId": request.itemId, "rewrite": request.suggestedRewrite}


@app.get("/courses/{course_id}/summary")
def course_summary(
    course_id: str,
    _faculty: Any = Depends(require_faculty),
):
    status_info = get_course_status(course_id)
    findings = get_findings(course_id)
    return {
        "courseId": course_id,
        "status": status_info,
        "totalFindings": len(findings),
        "defects": len([f for f in findings if f.label == "content_defect"]),
        "gaps": len([f for f in findings if f.label == "ability_gap"]),
    }


@app.get("/items/{item_id}/runs")
def item_runs(item_id: str, _faculty: Any = Depends(require_faculty)):
    return get_runs(item_id)


handler = Mangum(app)
