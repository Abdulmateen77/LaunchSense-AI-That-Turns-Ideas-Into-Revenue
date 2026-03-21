# LaunchSense

Turn a business idea into a full go-to-market package in one conversation.

LaunchSense runs a 5-agent pipeline (research → offer → landing page + growth pack → critique) and streams everything to a chat UI via SSE.

## Prerequisites

- Python 3.12 (`python3.12 --version`)
- Node.js 18+ (`node --version`)
- An Anthropic API key

## Setup

Copy the env example and add your key:

```bash
cp backend/.env.example backend/.env
# edit backend/.env and set ANTHROPIC_API_KEY
```

## Run everything

```bash
chmod +x start.sh
./start.sh
```

This starts three services:

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:8000 |
| RAG      | http://localhost:8001 |

Press `Ctrl+C` to stop all three.

## What it does

1. **Intake** — chat collects your business context (idea, niche, target customer, pain, existing solutions)
2. **Validate** — scores the idea 1–10, flags risks, suggests stronger angles
3. **Research** — Agent 0 uses `web_search` + `web_fetch` to find real competitors and Reddit quotes
4. **Offer** — Agent 1 builds a Hormozi-style offer grounded in the evidence
5. **Assets** — Agents 2 + 3 run in parallel: landing page copy and growth pack (cold email, LinkedIn DM, hooks)
6. **Critique** — Agent 4 streams a conversion critique with a single highest-leverage rewrite

## Manual backend test

```bash
curl -N -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"idea": "AI tool for UK estate agents"}'
```

## Environment variables

| Variable           | Required | Description                        |
|--------------------|----------|------------------------------------|
| `ANTHROPIC_API_KEY`| Yes      | Used by all agents                 |
| `OPENAI_API_KEY`   | No       | Used by builder + growth agents    |
| `RAG_SERVICE_URL`  | No       | Defaults to http://localhost:8001  |
