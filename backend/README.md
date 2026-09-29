# AI Shadow-Twin Backend

Local-first FastAPI backend. Course files and analysis results are stored as JSON under `data/store.json`; uploaded source files are kept in `uploads/`.

## Setup (Windows PowerShell)

Run these commands from the repository root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set `BEDROCK_MODEL_ID`. Set `AWS_REGION` if it differs from `us-east-1`. Configure AWS credentials with `aws configure`; keys are not stored in this project.

Start the API from `backend/`:

```powershell
uvicorn app.main:app --reload
```

Open the interactive API page at `http://127.0.0.1:8000/docs`.

## Test with curl

Put a sample PDF or PPTX in `backend/`. Upload it and copy the returned `courseId` for the next commands:

```powershell
curl.exe -X POST http://127.0.0.1:8000/courses -F "file=@sample.pdf"
curl.exe -X POST http://127.0.0.1:8000/courses/COURSE_ID/analyze
curl.exe http://127.0.0.1:8000/courses/COURSE_ID/status
```

Replace `COURSE_ID` with the ID from the upload response. Analysis calls AWS Bedrock and requires valid AWS credentials and a model ID. Upload and status checks are local.

## Smoke test

Create a small PowerPoint with 3-4 slides. Add a few sentences of course material to the first slides and a question to the final slide, then save it as `sample.pptx` in `backend/`. Start the API, activate the backend venv, and run:

```powershell
python scripts/smoke_test.py sample.pptx --max-items 4
```

The script uploads the file, starts analysis, polls progress, and reports runs and findings. It uses real Bedrock calls, so set `AWS_REGION`, `BEDROCK_MODEL_ID`, and AWS credentials first. Add `--api-key KEY` or set `API_KEY` if your API requires it. Full responses are saved to `backend/docs/smoke-test-results.json`.
