import json
import os

from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = Anthropic()

from models.schemas import Offer, Evidence, GrowthPack
from models.model_registry import resolve_model

GROWTH_SYSTEM = """You are a growth copywriter specialising in cold outreach and social hooks.

Your job is to generate cold outreach assets grounded in real market evidence.

## Rules

1. COLD EMAIL SUBJECT
   - Must be under 8 words
   - No clickbait — specific and curiosity-driven
   - Must relate to the ICP's specific pain

2. COLD EMAIL BODY
   - Must be exactly 3 paragraphs
   - Must end with exactly one question (the final sentence of the body)
   - No pitch in the body — the PS line carries the pitch
   - evidence_line must be a specific stat or quote from the evidence provided
   - evidence_url must be a real URL from the evidence provided

3. LINKEDIN DM
   - Must be under 150 words
   - No pitch — curiosity only
   - Do not mention your product or service directly
   - Open a conversation, not a sale

4. LUFFA DM
   - Must be under 120 words
   - Luffa is a Web3-native encrypted messaging platform — assume the recipient is crypto/Web3 aware
   - Lead with a specific insight or stat relevant to their world
   - No pitch — open a thread, not a sale
   - Tone: peer-to-peer, direct, no corporate language

5. HOOKS
   - Generate exactly 3 hooks for different platforms
   - Platforms: LinkedIn, Twitter/X, cold email subject line
   - Each hook must have: platform, hook text, angle, evidence_basis
   - evidence_basis must reference a specific stat or quote from the evidence

5. CHANNEL RECOMMENDATION
   - Pick one channel: cold_email, linkedin, or content
   - Justify with evidence from the ICP and market data
   - Give a specific first action to take within 24 hours

Return ONLY valid JSON — no markdown fences, no commentary, no explanation.
The JSON must exactly match the GrowthPack schema provided in the user message."""


def parse_llm_json(text: str) -> dict:
    clean = text.strip()
    if not clean:
        raise ValueError("LLM returned empty response")
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else parts[0]
        if clean.startswith("json"):
            clean = clean[4:]
    clean = clean.strip()
    if not clean:
        raise ValueError("LLM response was only markdown fences with no content")
    decoder = json.JSONDecoder()
    obj, _ = decoder.raw_decode(clean)
    return obj


async def run_growth_agent(
    offer: Offer,
    evidence: Evidence,
    model: str | None = None,
) -> GrowthPack:
    model_id = resolve_model("growth", model)

    quotes_formatted = "\n".join(
        f'- "{q.quote}" (r/{q.subreddit}, {q.upvotes} upvotes) — {q.thread_url}'
        for q in evidence.reddit_quotes
    )

    competitors_formatted = "\n".join(
        f"- {c.name}: weakness: {c.weakness}"
        for c in evidence.competitors
    )

    sources_formatted = "\n".join(f"- {s}" for s in evidence.all_sources)

    growth_pack_schema = """{
  "cold_email": {
    "subject": "string — under 8 words",
    "body": "string — exactly 3 paragraphs, ends with one question",
    "evidence_line": "string — specific stat or quote from the evidence",
    "evidence_url": "string — real URL from the evidence",
    "ps": "string — the real pitch goes here"
  },
  "linkedin_dm": "string — under 150 words, no pitch, curiosity only",
  "luffa_dm": "string — under 120 words, Web3-native tone, peer-to-peer, no pitch",
  "hooks": [
    {
      "platform": "LinkedIn|Twitter/X|cold email subject line",
      "hook": "string",
      "angle": "string",
      "evidence_basis": "string — specific stat or quote from evidence"
    }
  ],
  "channel": {
    "pick": "cold_email|linkedin|content",
    "why": "string",
    "action": "string — specific first action within 24 hours"
  }
}"""

    user_message = f"""OFFER:
Final offer statement: {offer.headline} — {offer.subheadline}
ICP: {offer.icp.who}
Pain: {offer.icp.pain}
Outcome: {offer.outcome}
Price: {offer.price}
Guarantee: {offer.guarantee}
CTA: {offer.cta}

EVIDENCE:
Reddit quotes:
{quotes_formatted}

Competitor weaknesses:
{competitors_formatted}

Sources:
{sources_formatted}

Generate cold outreach assets. Rules:
- Email subject: under 8 words
- Email body: exactly 3 paragraphs, end with one question
- LinkedIn DM: under 150 words, no pitch, curiosity only
- Luffa DM: under 120 words, Web3-native peer-to-peer tone, no pitch, open a thread
- Exactly 3 hooks for: LinkedIn, Twitter/X, cold email subject line
- evidence_line and evidence_url must come from the evidence above

Return ONLY valid JSON matching this schema:
{growth_pack_schema}"""

    text = ""
    try:
        response = client.messages.create(
            model=model_id,
            max_tokens=3000,
            system=GROWTH_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
        text = next(
            (block.text for block in response.content if hasattr(block, "text")),
            ""
        )
        if not text:
            raise ValueError(f"Agent 3 got no text block from LLM. Stop reason: {response.stop_reason}")
        parsed = parse_llm_json(text)
        return GrowthPack(**parsed)

    except (json.JSONDecodeError, ValueError) as e:
        print(f"Agent 3 JSON parse failed: {e}")
        if text:
            print(f"Raw text (first 500 chars): {text[:500]}")
        raise
    except Exception as e:
        print(f"Agent 3 failed: {e}")
        raise
