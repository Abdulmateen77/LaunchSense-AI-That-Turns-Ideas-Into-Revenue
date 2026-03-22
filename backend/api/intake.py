import json
import os
import re
import uuid
from dataclasses import dataclass, field

from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from models.schemas import EnrichedContext

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = Anthropic()

router = APIRouter()

# ---------------------------------------------------------------------------
# Content moderation
# ---------------------------------------------------------------------------

# Fast keyword blocklist — checked before any LLM call
_BLOCKED_PATTERNS = re.compile(
    r"\b("
    r"porn|pornograph|explicit|nude|naked|sex(ual)?|nsfw|erotic|fetish|"
    r"onlyfans|escort|prostitut|traffick|"
    r"weapon|bomb|explosive|firearm|gun|ammo|ammunition|"
    r"drug|cocaine|heroin|meth|fentanyl|narco|"
    r"hack|malware|ransomware|phish|ddos|exploit|"
    r"murder|kill|assassin|terror|jihadist|"
    r"child.?abuse|csam|pedophil"
    r")\b",
    re.IGNORECASE,
)

MODERATION_REFUSAL = (
    "This platform is for business launch planning only. "
    "I can't help with that kind of request."
)


def is_policy_violation(text: str) -> bool:
    """Fast keyword check. Returns True if the message should be blocked."""
    return bool(_BLOCKED_PATTERNS.search(text))


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
  3. target_customer — a precise description of the ideal buyer (role, company size, situation)
  4. core_pain       — the main problem or frustration the product solves (concrete, quantifiable)
  5. existing_solutions — what the customer currently uses instead (specific tools or methods)

## Tone and format rules

NEVER use markdown in your responses. No bold, no bullet points, no headers, no asterisks.
Write in plain conversational sentences only.
Ask ONE question at a time. Never ask two questions in the same message.

## Rules for completion

You may ONLY complete if you have all five fields with enough specificity to write a real offer.

NOT enough:
- Target customer is just a job title with no company size or situation
- Core pain is generic like "inefficiency" or "slow processes"
- Existing solutions are vague like "current tools"

ENOUGH:
- "Solo letting agents at 1-3 branch independents who spend 3 hours/week writing Rightmove listings by hand"
- "Pre-seed SaaS founders losing deals because they can't handle objections, currently watching YouTube videos"

## What to do when information is missing

Ask the single most important missing question in plain text. One sentence, no lists, no formatting.

Example: "Who exactly is your ideal customer — what role do they have, how big is their company, and what's happening when this problem hits them?"

Maximum 2 questions total. After 2 questions, complete with best available information.

## When complete

Respond with EXACTLY this format — no text before or after:

CONTEXT_COMPLETE
{"idea": "...", "niche": "...", "target_customer": "...", "core_pain": "...", "existing_solutions": "...", "notes": ""}

All five fields must be non-empty strings with real specifics.
The "notes" field captures any extra useful context from the conversation."""

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
    # Content moderation — block before any LLM call or session creation
    if is_policy_violation(body.message):
        raise HTTPException(
            status_code=400,
            detail=MODERATION_REFUSAL,
        )

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
