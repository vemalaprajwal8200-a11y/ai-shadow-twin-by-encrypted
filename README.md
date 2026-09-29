# Secrets and deployment

## Local setup

Keep real credentials in local environment files or your hosting provider's secret store. Do not commit `.env` files. Vite reads the repository-root `.env.local`; the backend reads `backend/.env`. Create the frontend file from the public-variable template:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item frontend/.env.example .env.local }
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` from Supabase Project Settings → API. These are public browser credentials; never put a service-role key in a `VITE_` variable. Create `backend/.env` separately for backend settings such as `GEMINI_API_KEY`, `GEMINI_MODEL`, `STORAGE_BACKEND`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_BUCKET`.

## Email registration and sign-in

Run `backend/docs/supabase_auth_schema.sql` in the Supabase SQL Editor to create the profile table, row-level security policy, new-user trigger, and profiles for existing Auth users. In Supabase Authentication settings, enable the Email provider and email confirmation; keep the **Confirm signup** template link-based with `{{ .ConfirmationURL }}`. Add `https://ai-shadow-twin-by-encrypted.vercel.app/login*` to Authentication → URL Configuration → Redirect URLs; the wildcard covers both signup confirmation and the `?recovery=complete` password-reset callback. Configure custom SMTP under Authentication settings for reliable delivery; Supabase's default mail service is rate-limited and may only deliver to project-authorized addresses.

Registration asks for an account type, email, and password. Supabase Auth stores password hashes; this app never saves raw passwords to the profiles table. Email confirmation returns to the deployed login page, after which sign-in uses email and password. Users from the old passwordless flow can use **Forgot password?** to set one. Students provide a USN/student ID. Faculty registration records a request but grants only the default student role until an administrator approves it with the commented profile update at the end of `backend/docs/supabase_auth_schema.sql`.

The backend reads `GEMINI_API_KEY` and `GEMINI_MODEL`, with optional `GEMINI_BASE_URL`, plus `API_KEY`, `RUNS_PER_PERSONA`, and `MAX_CONCURRENCY`. Never put service-role keys or other backend secrets in frontend code.

Enable the repository's staged-secret check once per clone:

```powershell
git config core.hooksPath .githooks
python scripts/check_secrets.py --worktree
```

The hook blocks staged environment files (except `.env.example`) and likely credential strings. Its reports contain file paths and line numbers, never matched values.

## Vercel

In the Vercel project, open **Settings → Environment Variables**, add `VITE_API_URL` for the frontend deployment, select the appropriate environments, save, and redeploy so the new value is applied. Add backend-only variables to the backend runtime's environment settings as well if the backend is hosted on Vercel.

Every `VITE_` variable is public: Vite embeds it into browser-delivered code. Do not prefix API keys, Supabase service-role keys, or other secrets with `VITE_`.
