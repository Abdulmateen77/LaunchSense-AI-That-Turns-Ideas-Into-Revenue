import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env relative to this file — works regardless of CWD or --app-dir
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.generate import router as generate_router
from api.intake import router as intake_router
from api.validate import router as validate_router

app = FastAPI(title="LaunchSense API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intake_router, prefix="/intake")
app.include_router(generate_router)
app.include_router(validate_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
