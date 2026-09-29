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
Open [http://localhost:5173](http://localhost:5173) in your browser. The app lands directly on **/chat** after sign in.

---

## 🛠️ How to Tune the Twin

You can customize and tune the Shadow-Twin's AI persona, verdict classifications, and accuracy without modifying any frontend code.

### 1. Edit Prompt Files
All Twin prompts live in `api/_prompts/`:
- **`api/_prompts/base.js`**: Core system prompt defining the Twin's role, rules, and tag output specifications.
- **`api/_prompts/personas.js`**: Persona definitions for `Beginner` (literal, flags jargon), `Average` (standard student), and `Careful` (meticulous, tests edge cases & balance invariants).
- **`api/_prompts/examples.js`**: Few-shot evaluation examples in the format `{ itemText, twinReasoning, verdict, reason }`.

### 2. Add Few-Shot Examples
In `api/_prompts/examples.js`, add real course slides or exam questions along with their reasoning and ground-truth verdict:
```js
{
  itemText: "Lesson X: ...",
  twinReasoning: "Why a student or persona got confused...",
  verdict: "defect", // allowed values: defect | ambiguous | gap | clean
  reason: "One line explanation of the issue"
}
```

### 3. Run the Evaluation Benchmark
Run the evaluation harness to benchmark predicted verdicts against `eval/dataset.json`:
```bash
npm run eval
```
The script evaluates items, calculates overall accuracy and per-verdict accuracy stats, and outputs a detailed list of mismatches.

### 4. Deploy to Vercel
After tuning prompts and verifying accuracy, push your changes to redeploy on Vercel:
```bash
git add .
git commit -m "Tune Twin prompts and evaluation benchmark"
git push
```

---

## 📦 Deployment to Vercel

The `/api/chat` endpoint is built as a Vercel Serverless Function (`api/chat.js`), handling request processing, lightweight retrieval, and streaming without requiring a separate backend server.

### Steps to Deploy:
1. Push the project repository to GitHub / GitLab / Bitbucket.
2. Import the project in your [Vercel Dashboard](https://vercel.com).
3. Under **Settings → Environment Variables**, add:
   - Name: `GEMINI_API_KEY` (or `OPENAI_API_KEY`)
   - Value: `your-api-key-value`
4. Click **Deploy**. Vercel will automatically build the React Vite app and deploy the `/api/chat` serverless function.

---

## 🎨 Architecture & Components

- **Main Navigation (`/chat`)**: "Ask the Twin" is the primary sidebar menu item with an AI badge and default landing page after login.
- **Lightweight Retrieval (`api/_lib/retrieve.js`)**: TF-IDF keyword overlap chunking scoring top 5 relevant slides/questions for the selected unit (and earlier units only).
- **Slide-Over Panel**: Floating round chat button on all other pages opens a 400px slide-over panel sharing the same chat thread and history.
- **Two-Column Chat Layout**:
  - **70% Chat Card**: Header with status dot, persona dropdown (Beginner / Average / Careful), message thread with markdown rendering, inline verdict item cards, message action buttons (Copy, Regenerate, Thumbs up/down), auto-growing composer with file attachments, and character limit.
  - **30% Twin Context Card**: Course & Unit scope selectors, active persona breakdown, sources cited list (clickable), and recent chats management (rename, delete, restore). On screens < 1100px, it converts into a toggleable slide-over drawer.
- **Service Layer (`src/services/chat.js`)**: Manages `localStorage` persistence, chat thread restoration, streaming chunk consumption, and offline fallback error handling.
