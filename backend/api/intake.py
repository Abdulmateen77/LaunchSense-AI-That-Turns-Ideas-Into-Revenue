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

INTAKE_SYSTEM = """You are a concise intake assistant for LaunchSense, a go-to-market tool.
Your job is to collect exactly five pieces of information from the user:
  1. idea            — what the product or service is
  2. niche           — the specific market or industry it targets
  3. target_customer — a precise description of the ideal buyer
  4. core_pain       — the main problem or frustration the product solves
  5. existing_solutions — what the customer currently uses instead

Rules you MUST follow:
- Ask ONE question at a time. Never ask two questions in the same message.
- Ask no more than 4 questions in total across the whole conversation.
- Infer as much as you can from what the user has already said before asking.
- If the user's first message already answers several fields, only ask about what is still missing.
- Keep each question short and conversational (one sentence).

When you have gathered all five fields — either from direct answers or by confident inference — you MUST stop asking questions and respond with EXACTLY this format (no extra text before or after):

CONTEXT_COMPLETE
{"idea": "...", "niche": "...", "target_customer": "...", "core_pain": "...", "existing_solutions": "...", "notes": ""}

The JSON must be on a single line immediately after CONTEXT_COMPLETE.
All five fields must be non-empty strings.
The "notes" field should be empty string unless there is genuinely useful extra context.

Do not add any commentary, preamble, or sign-off after the JSON."""

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
