"""FastAPI endpoints for local course ingestion and student-twin analysis."""

from pathlib import Path
from uuid import uuid4

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from pydantic import BaseModel

from app.engine.bedrock_client import invoke_json
from app.classifier import classify_item
from app.ingest import parse_pdf, parse_pptx
from app.judge import add_judge_evidence
from app.storage import (
    get_course_status,
    get_findings,
    get_items,
    get_runs,
    save_finding,
    save_items,
    update_course_status,
)
from app.signals import compute_signals
from app.twin import run_item_full, twin_run

app = FastAPI(title="AI Shadow-Twin API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024

@app.get("/health")
def health():
    return {"status": "ok"}


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
        raise HTTPException(
            status_code=502,
            detail=f"Bedrock returned invalid JSON: {exc}",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Bedrock configuration error: {exc}",
        ) from exc
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(status_code=502, detail="Bedrock request failed.") from exc


@app.post("/courses")
async def create_course(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pptx", ".pdf"}:
        return JSONResponse(status_code=415, content={"error": "Upload a .pptx or .pdf file."})
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        return JSONResponse(status_code=413, content={"error": "File exceeds the 20 MB limit."})

    course_id = str(uuid4())
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
    save_items(items)
    return {"courseId": course_id, "itemCount": len(items)}


@app.get("/courses/{course_id}/items")
def course_items(course_id: str):
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
def analyze_course(course_id: str, background_tasks: BackgroundTasks):
    items = get_items(course_id)
    if not items:
        raise HTTPException(status_code=404, detail="Course has no stored items.")
    update_course_status(course_id, 0)
    background_tasks.add_task(_analyze_course_background, course_id)
    return {"courseId": course_id, "status": "running", **get_course_status(course_id)}


@app.get("/courses/{course_id}/status")
def course_status(course_id: str):
    return {"courseId": course_id, **get_course_status(course_id)}


@app.get("/courses/{course_id}/findings")
def course_findings(
    course_id: str,
    label: str | None = Query(default=None),
    severity: str | None = Query(default=None),
):
    findings = get_findings(course_id)
    if label is not None:
        findings = [finding for finding in findings if finding.label == label]
    if severity is not None:
        findings = [finding for finding in findings if finding.severity == severity]
    return findings


@app.get("/items/{item_id}/runs")
def item_runs(item_id: str):
    return get_runs(item_id)


handler = Mangum(app)