#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Stopping all services..."
  kill "$RAG_PID" "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$RAG_PID" "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo "Done."
  exit 0
}

trap cleanup INT TERM

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
PYTHONPATH="$RAG_APP_DIR" "$RAG_VENV" "$RAG_APP_DIR/ingest.py"

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
"$BACKEND_VENV" -m uvicorn main:app --reload --port 8000 --app-dir "$BACKEND_DIR" &
BACKEND_PID=$!

# --- Frontend ---
FRONTEND_DIR="$ROOT/frontend"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install --prefix "$FRONTEND_DIR"
fi

echo "Starting frontend on :5173..."
VITE_API_BASE_URL=http://localhost:8000 npm run dev --prefix "$FRONTEND_DIR" &
FRONTEND_PID=$!

echo ""
echo "All services running:"
echo "  Frontend : http://localhost:5173"
echo "  Backend  : http://localhost:8000"
echo "  RAG      : http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop everything."

wait
