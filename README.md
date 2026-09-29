# AI Shadow-Twin with "Ask the Twin" Chatbot

"Ask the Twin" is an AI co-pilot chatbot embedded as the main feature of AI Shadow-Twin. It grounds its responses in course materials, flags ambiguities or content defects, provides role-aware suggested prompts for students and faculty, and streams token-by-token responses with inline item cards and cited sources.

---

## 🚀 Quick Start (Local Setup)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` from Supabase Project Settings → API. These are public browser credentials; never put a service-role key in a `VITE_` variable. Configure `GEMINI_API_KEY` for the chat endpoint in your local environment and in Vercel's environment settings.

## Email registration and sign-in

Run `backend/docs/supabase_auth_schema.sql` in the Supabase SQL Editor to create the profile table, row-level security policy, new-user trigger, and profiles for existing Auth users. In Supabase Authentication settings, enable the Email provider and email confirmation; keep the **Confirm signup** template link-based with `{{ .ConfirmationURL }}`. Add `https://ai-shadow-twin-by-encrypted.vercel.app/login*` to Authentication → URL Configuration → Redirect URLs; the wildcard covers both signup confirmation and the `?recovery=complete` password-reset callback. Configure custom SMTP under Authentication settings for reliable delivery; Supabase's default mail service is rate-limited and may only deliver to project-authorized addresses.

Registration asks for an account type, email, and password. Supabase Auth stores password hashes; this app never saves raw passwords to the profiles table. Email confirmation returns to the deployed login page, after which sign-in uses email and password. Users from the old passwordless flow can use **Forgot password?** to set one. Students provide a USN/student ID.

Faculty access is never granted just because someone selects Faculty. Before an approved faculty member registers, run this as an administrator in the Supabase SQL Editor:

```sql
insert into public.faculty_invites (email)
values (lower('faculty@example.com'))
on conflict (email) do nothing;
```

The invite is private and consumed by the signup trigger. Replace the example email with the approved address. For an account that already exists, use the profile-promotion SQL comment at the end of `backend/docs/supabase_auth_schema.sql`.

The backend reads `GEMINI_API_KEY` and `GEMINI_MODEL`, with optional `GEMINI_BASE_URL`, plus `API_KEY`, `RUNS_PER_PERSONA`, and `MAX_CONCURRENCY`. Never put service-role keys or other backend secrets in frontend code.

Enable the repository's staged-secret check once per clone:

```powershell
git config core.hooksPath .githooks
python scripts/check_secrets.py --worktree
```

Every `VITE_` variable is public: Vite embeds it into browser-delivered code. Do not prefix API keys, Supabase service-role keys, or other secrets with `VITE_`.

Add your LLM API Key:
```env
# Gemini API Key (Recommended)
GEMINI_API_KEY=your-gemini-api-key

# Or OpenAI API Key (Alternative)
# OPENAI_API_KEY=your-openai-api-key
```

> **Note:** If no API key is provided, the app gracefully operates in **Offline Fallback Mode**, generating local course material context responses and displaying a "Twin is offline" banner with a Retry option.

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. The app will land directly on **/chat** after sign in.

---

## 📦 Deployment to Vercel

The `/api/chat` endpoint is built as a Vercel Serverless Function (`api/chat.js`), handling request processing and streaming without requiring a separate server.

### Steps to Deploy:
1. Push the project repository to GitHub / GitLab / Bitbucket.
2. Import the project in your [Vercel Dashboard](https://vercel.com).
3. Under **Settings → Environment Variables**, add:
   - Name: `GEMINI_API_KEY` (or `OPENAI_API_KEY`)
   - Value: `your-api-key-value`
4. Click **Deploy**. Vercel will automatically build the React Vite app and deploy the `/api/chat` serverless function.

---

## 🎨 Key Features & Architecture

- **Main Navigation (`/chat`)**: "Ask the Twin" is the primary sidebar menu item with an AI badge and default landing page after login.
- **Slide-Over Panel**: Floating round chat button on all other pages opens a 400px slide-over panel sharing the same chat thread and history.
- **Two-Column Chat Layout**:
  - **70% Chat Card**: Header with status dot, persona dropdown (Beginner / Average / Careful), message thread with markdown rendering, inline verdict item cards, message action buttons (Copy, Regenerate, Thumbs up/down), auto-growing composer with file attachments, and character limit.
  - **30% Twin Context Card**: Course & Unit scope selectors, active persona breakdown, sources cited list (clickable), and recent chats management (rename, delete, restore). On screens < 1100px, it converts into a toggleable slide-over drawer.
- **Service Layer (`src/services/chat.js`)**: Manages `localStorage` persistence, chat thread restoration, streaming chunk consumption, and offline fallback error handling.
