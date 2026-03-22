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

Collect these five fields to generate a launch package:
  1. idea — what the product or service is
  2. niche — the market or industry
  3. target_customer — who buys it
  4. core_pain — the main problem it solves
  5. existing_solutions — what they use today instead

## RULES

- Ask ONE question at a time. Plain sentences only. No markdown.
- After the user's SECOND reply, you MUST complete. No more questions.
- Infer any missing fields from context. Never ask for confirmation.
- If the user described a product and audience, that is enough to complete.

## COMPLETE IMMEDIATELY if you have:
- What the product does (idea)
- Who it's for (target_customer)
You can infer niche, core_pain, and existing_solutions from those two.

## Output format when complete

CONTEXT_COMPLETE
{"idea": "...", "niche": "...", "target_customer": "...", "core_pain": "...", "existing_solutions": "...", "notes": ""}"""

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

    # Count user messages — if 4+, inject a force-complete instruction
    user_turns = sum(1 for m in session.messages if m["role"] == "user")
    messages_to_send = session.messages
    if user_turns >= 4:
        messages_to_send = session.messages + [{
            "role": "user",
            "content": "SYSTEM: You have asked enough questions. You MUST now output CONTEXT_COMPLETE followed by the JSON object. Do not ask any more questions."
        }]

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1000,
        system=INTAKE_SYSTEM,
        messages=messages_to_send,
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
