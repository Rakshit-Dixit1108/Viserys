# DragonAI

A local-first, premium desktop AI assistant. This is **Phase 1: the core app** —
a fully working FastAPI backend and Electron/React chat client, streaming
responses from a local LLM via Ollama, with persistent conversation history.

Later phases (RAG for AKTU/SR Institute documents, voice, computer automation,
and the Unity "Dracarys" cinematic) build on top of this foundation — see
[Roadmap](#roadmap) below.

## What's working right now

- FastAPI backend with SQLite-backed conversations & message history
- Server-Sent Events streaming from the LLM straight into the UI
- Pluggable LLM backend: **Ollama (local, default)**, any OpenAI-compatible
  API, or Hugging Face Inference API — swap via one config value
- Electron desktop shell + React/TypeScript/Tailwind UI:
  - dark, glassmorphic "obsidian + dragonfire" theme
  - sidebar with conversation list, search, rename/delete
  - Markdown rendering with syntax-highlighted code blocks and copy buttons
  - streaming response indicator
  - settings panel showing the active model/provider
- Basic backend test suite (pytest)

## Requirements

- **Python 3.12+**
- **Node.js 20+** and npm
- **[Ollama](https://ollama.com)** installed and running, with a model pulled:
  ```bash
  ollama pull llama3.1
  ```
  (Any Ollama model works — set `OLLAMA_MODEL` in `.env` to match.)

## Running it

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # defaults already point at local Ollama
python run.py
```

The API comes up at `http://127.0.0.1:8000` (interactive docs at `/docs`).

### 2. Frontend (web preview, fastest way to check things work)

```bash
cd frontend
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL — this alone gives you the full
chat UI talking to the backend.

### 3. Frontend as a desktop app (Electron)

```bash
cd frontend
npm install
npm run electron:dev
```

This launches the Vite dev server and an Electron window pointed at it.

### 4. Building a distributable Windows app

```bash
cd frontend
npm run electron:build
```

Output lands in `frontend/release/`. (Run this step on Windows, or with the
appropriate cross-build tooling, to produce a Windows installer.)

### Running backend tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Switching LLM providers

Edit `backend/.env`:

```env
LLM_PROVIDER=ollama        # or "openai" or "huggingface"
OLLAMA_MODEL=llama3.1
```

For OpenAI-compatible APIs, set `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and
`OPENAI_MODEL`. For Hugging Face, set `HF_API_TOKEN` and `HF_MODEL`.
No code changes are needed — `app/services/llm_service.py` picks the
provider at request time.

## Project structure

```
dragonai/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI app + startup
│   │   ├── core/config.py       Settings (env-driven)
│   │   ├── db/
│   │   │   ├── database.py      SQLite access layer
│   │   │   └── schemas.py       Pydantic request/response models
│   │   ├── api/routes/
│   │   │   ├── chat.py          Conversations CRUD + SSE chat streaming
│   │   │   └── system.py        Health check, public settings
│   │   └── services/
│   │       └── llm_service.py   Unified streaming client (Ollama/OpenAI/HF)
│   ├── tests/test_api.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── .env.example
│   └── run.py
└── frontend/
    ├── electron/
    │   ├── main.js               Electron main process
    │   └── preload.js            Context-isolated bridge
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.tsx
    │   │   ├── ChatWindow.tsx
    │   │   ├── MessageBubble.tsx
    │   │   ├── Markdown.tsx       Code highlighting + copy button
    │   │   ├── SettingsPanel.tsx
    │   │   └── EmberBackground.tsx
    │   ├── api/client.ts          REST + SSE client
    │   ├── types/index.ts
    │   └── App.tsx
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

## Roadmap

This project is being built in phases so each layer is real and working
before the next one is added, rather than a large tree of stub files:

1. **✅ Core app** — this phase: chat, history, streaming, local LLM
2. **AI/RAG** — PDF ingestion (syllabus, papers, notices) into ChromaDB;
   AKTU AI and SR Institute AI as retrieval-augmented chat modes; exam
   analysis, PDF Q&A/summarization/MCQ generation
3. **Automation + voice** — natural-language desktop automation
   (open apps, search, power actions with confirmation for destructive
   ones) via PyAutoGUI/subprocess; wake-word listening, Whisper STT,
   Piper/Coqui TTS
4. **Productivity modules** — coding assistant, resume/ATS analysis,
   interview prep, study planner
5. **Dracarys cinematic** — separate Unity project with the dragon
   sequence (particles, Timeline, camera shake, audio), launched as an
   overlay process from the Electron app. Note: I can write all of the
   Unity C# (triggers, sequencing, particle/camera control) but the 3D
   dragon model, rig, animations, and cinematic-quality audio need to be
   sourced from the Unity Asset Store or an artist — those are asset
   files, not code.

Tell me when you're ready to move to the next phase and I'll build it on
top of what's here.
