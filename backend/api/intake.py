import json
import os
import uuid
from dataclasses import dataclass, field

from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi import APIRouter
from pydantic import BaseModel, Field

from models.schemas import EnrichedContext

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = Anthropic()

router = APIRouter()

# ---------------------------------------------------------------------------
# Session dataclass
# ---------------------------------------------------------------------------

@dataclass
class IntakeSession:
    messages: list = field(default_factory=list)
    complete: bool = False
    context: EnrichedContext | None = None


INTAKE_SESSIONS: dict[str, IntakeSession] = {}

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

INTAKE_SYSTEM = """You are an intake assistant for LaunchSense, a go-to-market tool.

Your job is to collect five specific fields before generating a launch package:
  1. idea            — what the product or service is (specific, not generic)
  2. niche           — the specific market or industry it targets
  3. target_customer — a precise description of the ideal buyer (role, company size, context)
  4. core_pain       — the main problem or frustration the product solves (concrete, not vague)
  5. existing_solutions — what the customer currently uses instead (specific tools/methods)

## Rules for completion

You may ONLY complete if the user's message explicitly states ALL FIVE fields with enough specificity to write a real offer. Do NOT infer or guess vague details.

A message is NOT enough if:
- The target customer is just a job title with no context (e.g. "HR managers" is not enough — need company size, industry, situation)
- The core pain is generic (e.g. "inefficiency" or "slow processes" — need a specific, quantifiable pain)
- The existing solutions are unknown (e.g. "current tools" — need actual named tools or methods)
- The idea is described in one sentence with no specifics about what it actually does

A message IS enough if it contains concrete details like:
- "Solo letting agents at 1-3 branch independents who spend 3 hours/week writing Rightmove listings by hand using copy-paste from old listings"
- "Pre-seed SaaS founders who lose deals because they can't handle sales objections, currently watching YouTube videos and reading books"

## What to do when information is missing

Ask ONE clear question that collects the most missing information. Be specific about what you need.

Good question: "Who exactly is your ideal customer — what's their role, company size, and what does their day look like when this pain hits them?"
Bad question: "Can you tell me more about your idea?"

Maximum 2 questions total across the whole conversation. After 2 questions, complete with best available information.

## When complete

Respond with EXACTLY this format — no text before or after:

CONTEXT_COMPLETE
{"idea": "...", "niche": "...", "target_customer": "...", "core_pain": "...", "existing_solutions": "...", "notes": ""}

All five fields must be non-empty strings with real specifics — not generic placeholders.
The "notes" field should capture any extra useful context from the conversation."""

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class IntakeMessageRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(min_length=1)


class IntakeMessageResponse(BaseModel):
    session_id: str
    reply: str
    complete: bool
    context: EnrichedContext | None = None


# ---------------------------------------------------------------------------
# Core send_message function
# ---------------------------------------------------------------------------

def send_message(session_id: str, message: str) -> dict:
    """
    Appends user message, calls Anthropic Haiku, checks for CONTEXT_COMPLETE.
    Returns: { "reply": str, "complete": bool, "context": EnrichedContext | None }
    """
    session = INTAKE_SESSIONS[session_id]
    session.messages.append({"role": "user", "content": message})

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1000,
        system=INTAKE_SYSTEM,
        messages=session.messages,
    )

    reply_text: str = response.content[0].text
    session.messages.append({"role": "assistant", "content": reply_text})

    # Check for completion signal
    context: EnrichedContext | None = None
    complete = False

    if "CONTEXT_COMPLETE" in reply_text:
        try:
            lines = reply_text.strip().splitlines()
            for i, line in enumerate(lines):
                if "CONTEXT_COMPLETE" in line:
                    json_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
                    data = json.loads(json_line)
                    context = EnrichedContext(**data)
                    session.complete = True
                    session.context = context
                    complete = True
                    break
        except Exception as e:
            print(f"IntakeSession JSON parse failed: {e} — continuing conversation")

    return {"reply": reply_text, "complete": complete, "context": context}


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/message")
async def intake_message(body: IntakeMessageRequest) -> IntakeMessageResponse:
    session_id = body.session_id
    if session_id is None or session_id not in INTAKE_SESSIONS:
        session_id = str(uuid.uuid4())
        INTAKE_SESSIONS[session_id] = IntakeSession()

    result = send_message(session_id, body.message)

    return IntakeMessageResponse(
        session_id=session_id,
        reply=result["reply"],
        complete=result["complete"],
        context=result["context"],
    )
