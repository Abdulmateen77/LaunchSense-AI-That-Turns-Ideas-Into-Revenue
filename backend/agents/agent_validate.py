import asyncio
import json
import os

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = Anthropic()

VALIDATE_SYSTEM = """You are a sharp, experienced startup advisor who thinks critically about business ideas.

Your job is to evaluate a startup idea honestly and cognitively — not just validate it, but stress-test it.

## How to think

1. MARKET REALITY — Is there a real, paying market for this? Is the pain acute enough that people will switch?
2. COMPETITION — Is the space crowded? Can this idea win against incumbents?
3. TIMING — Is now the right time? Too early, too late, or just right?
4. FOUNDER FIT — Does the target customer and niche make sense for someone launching this?
5. MONETISATION — Is the pricing model obvious? Will customers pay?

## Scoring

Score the idea 1-10 where:
- 8-10: Strong idea, clear market, go build it
- 5-7: Decent idea but needs sharpening — suggest improvements
- 1-4: Weak idea — suggest better alternatives in the same space

## Alternatives

If score < 7, suggest 2-3 alternative angles that are stronger versions of the same idea.
Each alternative should be a specific pivot, not a vague suggestion.

## Output format

Return ONLY valid JSON — no markdown, no commentary:
{
  "score": 7,
  "verdict": "one sentence verdict",
  "strengths": ["strength 1", "strength 2"],
  "risks": ["risk 1", "risk 2"],
  "recommendation": "2-3 sentence honest recommendation",
  "alternatives": [
    {
      "title": "Alternative idea title",
      "description": "One sentence description of the pivot",
      "why_stronger": "Why this angle is stronger"
    }
  ]
}

If score >= 7, alternatives can be empty array [].
Be honest. Be specific. No generic startup advice."""


def parse_llm_json(text: str) -> dict:
    clean = text.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else parts[0]
        if clean.startswith("json"):
            clean = clean[4:]
    return json.loads(clean.strip())


def _call_validate(prompt: str) -> dict:
    """Sync LLM call — run via asyncio.to_thread to avoid blocking the event loop."""
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1500,
        system=VALIDATE_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    return parse_llm_json(response.content[0].text)


async def run_validate_agent(context: dict) -> dict:
    """
    Validates a startup idea cognitively.
    Returns a dict with score, verdict, strengths, risks, recommendation, alternatives.
    """
    prompt = f"""Evaluate this startup idea:

IDEA: {context.get('idea', '')}
NICHE: {context.get('niche', '')}
TARGET CUSTOMER: {context.get('target_customer', '')}
CORE PAIN: {context.get('core_pain', '')}
EXISTING SOLUTIONS: {context.get('existing_solutions', '')}

Think carefully. Be honest. Return JSON only."""

    try:
        return await asyncio.to_thread(_call_validate, prompt)
    except json.JSONDecodeError as e:
        print(f"Validate agent JSON parse failed: {e}")
        return {
            "score": 5,
            "verdict": "Could not fully evaluate — proceeding with caution.",
            "strengths": [],
            "risks": ["Evaluation failed — review manually"],
            "recommendation": "We couldn't fully evaluate this idea. You can still proceed to generate.",
            "alternatives": [],
        }
    except Exception as e:
        print(f"Validate agent failed: {e}")
        raise
