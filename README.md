# AROGYA WATCH AI 🏥

**AI-Powered ER Waiting Room Monitoring System for Indian Government Hospitals**

Built with Claude Sonnet 4.6 · React + Vite · Node.js + Express · Supabase

---

## Quick Start

### 1. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run `supabase/schema.sql`
3. This creates all tables and seeds a demo hospital + nurse

### 2. Configure Environment Variables

**Server** — copy `server/.env.example` → `server/.env` and fill in:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=any_random_32_char_string
```

**Client** — copy `client/.env.example` → `client/.env` and fill in:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Install & Run

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev     # or: node index.js

# Terminal 2 — Frontend
cd client
npm install
npm run dev
```

### 4. Test the System

| URL | Purpose |
|-----|---------|
| `http://localhost:5173/nurse/login` | Nurse login |
| `http://localhost:5173/qr?hospital=00000000-0000-0000-0000-000000000001` | Patient QR entry |
| `http://localhost:5000/health` | Server health check |
| `http://localhost:5000/api/qr/00000000-0000-0000-0000-000000000001` | Generate QR code |

**Demo Credentials:**  
Email: `nurse@demo.com`  
Password: `password123`

---

## Demo Flow

1. Login as nurse at `/nurse/login`
2. Open `/qr?hospital=00000000-0000-0000-0000-000000000001` in another tab
3. Select Telugu or Hindi → GREETER begins triage
4. Answer the 5 triage questions
5. Nurse dashboard shows new patient card in real time
6. Trigger WATCHER via API: `POST /api/agent/watcher/trigger` with nurse JWT
7. Reply "worse" → critical alert fires → nurse dashboard shows red pulsing banner
8. Nurse acknowledges → marks as seen → patient removed from queue

---

## Architecture

```
Patient scans QR → Creates anonymous session → GREETER triage (5 questions)
    ↓
WATCHER checks in every 15 min → detects deterioration → escalates
    ↓
COMMANDER updates queue positions → fires nurse alerts
    ↓
COMFORTER answers freeform questions after triage
    ↓
Nurse sees real-time updates via Supabase Realtime
```

## AI Agents

| Agent | Purpose | LLM |
|-------|---------|-----|
| GREETER | 5-question triage intake, severity scoring | Claude Sonnet 4.6 |
| WATCHER | 15-min check-ins, escalation detection | Claude Sonnet 4.6 |
| COMFORTER | Freeform Q&A for families | Claude Sonnet 4.6 |
| COMMANDER | Queue management, nurse alerts | Pure logic (no LLM) |

## Languages Supported

- 🇮🇳 **Telugu** (తెలుగు) — primary
- 🇮🇳 **Hindi** (हिंदी) — secondary

Both use Noto Sans script rendering for proper display on all devices.
