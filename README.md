# Secrets and deployment

## Local setup

Keep real credentials in local environment files or your hosting provider's secret store. Do not commit `.env` files. In PowerShell, create local files from the examples only when they do not already exist, then replace placeholders with your own values:

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (-not (Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
```

The backend reads `GEMINI_API_KEY` and `GEMINI_MODEL`, with optional `GEMINI_BASE_URL`, plus `STORAGE_BACKEND`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`, `API_KEY`, `RUNS_PER_PERSONA`, and `MAX_CONCURRENCY`. Never put service-role keys or other backend secrets in frontend code.

Enable the repository's staged-secret check once per clone:

```powershell
git config core.hooksPath .githooks
python scripts/check_secrets.py --worktree
```

The hook blocks staged environment files (except `.env.example`) and likely credential strings. Its reports contain file paths and line numbers, never matched values.

## Vercel

In the Vercel project, open **Settings → Environment Variables**, add `VITE_API_URL` for the frontend deployment, select the appropriate environments, save, and redeploy so the new value is applied. Add backend-only variables to the backend runtime's environment settings as well if the backend is hosted on Vercel.

Every `VITE_` variable is public: Vite embeds it into browser-delivered code. Do not prefix API keys, Supabase service-role keys, or other secrets with `VITE_`.
