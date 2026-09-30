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

Edit `.env` and set `GEMINI_API_KEY` and `GEMINI_MODEL`. The optional `GEMINI_BASE_URL` defaults to Google's OpenAI-compatible Gemini endpoint. The service fails at startup if the API key or model is missing.

### Gemini setup

```dotenv
GEMINI_API_KEY=<your-google-ai-studio-api-key>
GEMINI_MODEL=<available-gemini-model>
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
```

Get an API key from Google AI Studio. Gemini calls use JSON-only responses, retry rate limits/server errors with exponential backoff, and make one corrective retry when the response is not valid JSON. Never commit `.env` or log API keys or authorization headers.

Start the API from `backend/`:

```powershell
uvicorn app.main:app --reload
```

Open the interactive API page at `http://127.0.0.1:8000/docs`.

## Supabase-backed faculty workflows

The dashboard tables and views are defined in `backend/docs/shadow_twin_supabase_schema.sql`. Run that full migration in the Supabase SQL Editor; the older `supabase_schema.sql` file is for the legacy `items/runs/findings` backend and does not define the faculty dashboard views.

Set these backend-only variables in `backend/.env`:

```dotenv
STORAGE_BACKEND=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=course-uploads
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openai/gpt-4o
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-flash-lite-latest
CORS_ALLOW_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

The legacy `SUPABASE_SERVICE_KEY` is still accepted as a backend fallback. Never place either service-role variable in a frontend env file.

In the repository root `.env.local`, set the browser-safe Supabase values:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The requested `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` names are also accepted by this Vite project. If port 8000 is occupied, set `VITE_API_BASE_URL=http://127.0.0.1:8001` in the ignored root `.env.development.local` file and start FastAPI on port 8001.

Start FastAPI from `backend/` with `.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. The UI calls `/api/analyze/{course_id}` and `/api/chat` on that server.

### OpenRouter chat setup

Backend integration settings use process environment variables first, then `backend/.env`, then `backend/test.env` as a fallback. The `/chat` endpoint uses `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=openai/gpt-4o`, and `CHAT_PROVIDER_ORDER=openrouter,openai`. OpenRouter is tried first; candidates in `OPENROUTER_MODELS` are tried in order, followed by direct OpenAI if its key is configured. Keep provider keys on the backend only; never add them to frontend code or commit them. The browser Supabase client separately reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the repository root `.env.local`.

Verify a live chat request from `backend/` with:

```powershell
.\.venv\Scripts\python.exe scripts/chat_smoke_test.py
```

The script reports the provider, selected model, latency, and a short reply without printing API keys.

## Supabase setup

1. In the Supabase SQL Editor, run `docs/supabase_schema.sql`.
2. In **Storage**, create a bucket named `course-files` and keep it **Private**.
3. Copy `.env.example` to `.env`. Set `STORAGE_BACKEND=supabase`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` using your Supabase project settings. Keep the service-role key private; never use it in frontend code.
4. Keep `SUPABASE_BUCKET=course-files`, then start the backend as usual. The backend uses the service-role key, which bypasses RLS; the public anon key has no table policies.

To test Supabase manually, run this from `backend/` after setup:

```powershell
python scripts/check_supabase.py
```

`PASS` means the script inserted, read, and deleted a temporary course, item, and run. `FAIL` means check the settings/schema; if cleanup failed, remove the reported `check-*` rows in Supabase.

## Test with curl

Put a sample PDF or PPTX in `backend/`. Upload it and copy the returned `courseId` for the next commands:

```powershell
curl.exe -X POST http://127.0.0.1:8000/courses -F "file=@sample.pdf"
curl.exe -X POST http://127.0.0.1:8000/courses/COURSE_ID/analyze
curl.exe http://127.0.0.1:8000/courses/COURSE_ID/status
```

Replace `COURSE_ID` with the ID from the upload response. Analysis requires a valid Gemini API key and model. Upload and status checks use the selected storage backend.

## Smoke test

Create a small PowerPoint with 3-4 slides. Add a few sentences of course material to the first slides and a question to the final slide, then save it as `sample.pptx` in `backend/`. Start the API, activate the backend venv, and run:

```powershell
python scripts/smoke_test.py sample.pptx --max-items 4
```

The script uploads the file, starts analysis, polls progress, and reports runs and findings. It uses real Gemini calls, so configure the Gemini settings first. Set `API_KEY` in `backend/.env` if your API requires it; do not pass secrets on the command line. Full responses are saved to `backend/docs/smoke-test-results.json`, with API keys and sensitive URL values redacted.
