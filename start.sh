#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# --- RAG service ---
RAG_DIR="$ROOT/backend/services/RAG_services"
RAG_APP_DIR="$RAG_DIR/app"
RAG_VENV="$RAG_DIR/venv/bin/python"

if [ ! -f "$RAG_VENV" ]; then
  echo "RAG venv not found — creating with python3.12..."
  python3.12 -m venv "$RAG_DIR/venv"
  "$RAG_DIR/venv/bin/pip" install -r "$RAG_DIR/requirements.txt"
  "$RAG_DIR/venv/bin/pip" install "numpy<2.0" "chromadb==0.4.24"
fi

echo "Running RAG ingest (safe to re-run)..."
cd "$RAG_APP_DIR"
PYTHONPATH="$RAG_APP_DIR" "$RAG_VENV" ingest.py
cd "$ROOT"

echo "Starting RAG service on :8001..."
PYTHONPATH="$RAG_APP_DIR" ANONYMIZED_TELEMETRY=False "$RAG_VENV" -m uvicorn main:app --port 8001 --app-dir "$RAG_APP_DIR" &
RAG_PID=$!

# --- Main backend ---
BACKEND_DIR="$ROOT/backend"
BACKEND_VENV="$BACKEND_DIR/.venv/bin/python"

if [ ! -f "$BACKEND_VENV" ]; then
  echo "Backend venv not found — creating with python3.12..."
  python3.12 -m venv "$BACKEND_DIR/.venv"
  "$BACKEND_DIR/.venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

echo "Starting backend on :8000..."
cd "$BACKEND_DIR"
"$BACKEND_VENV" -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

echo ""
echo "Both services running:"
echo "  Backend : http://localhost:8000"
echo "  RAG     : http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop both."

trap "echo 'Stopping...'; kill $RAG_PID $BACKEND_PID 2>/dev/null" INT TERM
wait
