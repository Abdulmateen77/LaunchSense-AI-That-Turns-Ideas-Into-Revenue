import json
import os

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = Anthropic()

from models.schemas import EnrichedContext, Evidence, Offer
from models.model_registry import resolve_model
from services.prompt_builder import build_offer_prompt

OFFER_SYSTEM = """You are an expert offer engineer trained in Alex Hormozi's $100M Offers methodology.

Your job is to craft a commercially compelling offer grounded entirely in the market evidence provided.

## Core principles

1. ANCHOR EVERY CLAIM TO EVIDENCE
   - The ICP pain must reference a specific Reddit quote or competitor weakness from the evidence
   - The price must be set BELOW the highest competitor price found in the evidence
   - The guarantee must be something competitors demonstrably do NOT offer
   - sources_used must contain real URLs from the evidence — not invented ones

2. NO GENERIC LANGUAGE
   Banned words and phrases: "revolutionary", "game-changing", "cutting-edge", "innovative",
   "powerful", "seamless", "robust", "next-generation", "state-of-the-art", "world-class"
   Use specific, concrete language instead. Numbers beat adjectives.

3. HORMOZI OFFER STRUCTURE
   - Dream outcome: what does the customer's life look like after?
   - Perceived likelihood of achievement: why will this work for them specifically?
   - Time to value: how fast do they see results?
   - Effort and sacrifice: what do they NOT have to do anymore?
   - Price anchoring: make the price feel like a bargain vs. the alternative

4. ICP SPECIFICITY
   - "who" must describe a specific person, not a category
   - "pain" must be quantified: hours lost, money wasted, or specific frustration
   - "trigger" must be the exact moment they would reach for their wallet
   - "evidence_source" must cite the specific Reddit quote or competitor gap that proves this pain is real

5. GUARANTEE RULES
   - Must be specific and measurable (not "30-day money back")
   - Must be something competitors do NOT offer — check the competitor weaknesses
   - Must be tied to an outcome the customer cares about

6. PRICE RULES
   - price must be a specific amount (e.g. "£49/mo"), not a range
   - price must be LOWER than the highest competitor price in the evidence
   - price_anchor must reference actual competitor pricing data from the evidence

7. CTA RULES
   - Must be a specific action verb + outcome
   - "Get Started" is not acceptable
   - Example: "Start writing listings in 60 seconds" or "Claim your first week free"

8. HONESTY RULE
   If you cannot ground a claim in the evidence provided, say so explicitly in that field
   rather than inventing. Write "insufficient evidence to ground this claim" if needed.

Return ONLY valid JSON — no markdown fences, no preamble, no commentary.
The JSON must exactly match the schema provided in the user message."""


def parse_llm_json(text: str) -> dict:
    clean = text.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else parts[0]
        if clean.startswith("json"):
            clean = clean[4:]
    return json.loads(clean.strip())


async def run_offer_agent(
    context: EnrichedContext,
    evidence: Evidence,
    principles: list[dict],
    model: str | None = None,
    weak_point: str | None = None,
) -> Offer:
    model_id = resolve_model("offer", model)

    user_message = build_offer_prompt(context, evidence, principles)

    if weak_point:
        user_message += f"\n\nFOCUS: The previous offer was weak on: {weak_point}. Specifically address this in the new offer."

    try:
        response = client.messages.create(
            model=model_id,
            max_tokens=4000,
            system=OFFER_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
        text = response.content[0].text
        parsed = parse_llm_json(text)
        return Offer(**parsed)

    except json.JSONDecodeError as e:
        print(f"Agent 1 JSON parse failed: {e}")
        print(f"Raw text: {text[:500]}")
        raise
    except Exception as e:
        print(f"Agent 1 failed: {e}")
        raise
