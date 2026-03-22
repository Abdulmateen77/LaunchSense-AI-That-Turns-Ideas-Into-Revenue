import json
import os

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = Anthropic()

from models.schemas import Offer, Evidence, LandingPage
from models.model_registry import resolve_model

BUILDER_SYSTEM = """You are a direct-response landing page copywriter trained on Alex Hormozi's $100M Offers methodology and Claude Hopkins' Scientific Advertising principles.

Your single job is to generate a complete landing page JSON that converts cold traffic into paying customers.

## The core conversion framework you must follow

Every section of the page serves one purpose: move the reader from "not interested" to "I need this now". Follow this exact psychological sequence:

1. HERO — interrupt the pattern, name the dream outcome, remove the biggest objection
2. PROBLEM — agitate the pain until buying feels like relief, not a decision
3. SOLUTION — present the offer as the only logical escape from the problem
4. VS — destroy alternatives without naming them, make comparison impossible
5. PRICING — make the price feel embarrassingly small vs the value stack
6. GUARANTEE — remove all remaining risk from the buyer's side

## Rules you must never break

### Rule 1 — Use the customer's exact language
Every headline, pain point, and benefit must use words the ICP would say out loud.
Never use: "streamline", "leverage", "seamless", "powerful", "innovative", "cutting-edge", "game-changing", "robust", "next-generation", "world-class", "revolutionary".
Replace every adjective with a specific number, timeframe, or named outcome.
BAD: "Powerful automation that streamlines your workflow"
GOOD: "Every Rightmove enquiry gets a personal reply in 30 seconds — while you're with another client"

### Rule 2 — Anchor every claim to evidence
Every problem point must include a stat or quote from the evidence provided.
Do not invent statistics. If evidence is thin, use the Reddit quotes verbatim.
BAD: "Most agents lose leads due to slow response times"
GOOD: "'I lose enquiries if I'm not glued to my phone' — r/LandlordUK, 847 upvotes"

### Rule 3 — The hero headline must do three things simultaneously
1. Name the dream outcome the ICP wants most
2. Contain a specific number, timeframe, or measurable result
3. Remove the #1 objection or effort barrier in the same sentence
BAD: "Never miss a property enquiry again"
GOOD: "Every letting enquiry replied to in 30 seconds — automatically, even when you're mid-viewing"

### Rule 4 — Problem section must make inaction feel painful
Each problem point follows this structure:
- The pain: what specifically goes wrong (name the moment)
- The cost: what it costs in money, time, or competitive loss
- The proof: a real stat or quote from the evidence
Do not write generic industry problems. Write the exact moment of failure the ICP experiences.

### Rule 5 — Solution benefits must follow Hormozi's value equation
For each benefit, address at least two of these four variables:
- Dream outcome (what they get)
- Perceived likelihood of achievement (why it will work for them specifically)
- Time to value (how fast they see the result)
- Effort and sacrifice (what they no longer have to do)
BAD: "Automated lead responses"
GOOD: "Replies sent in under 30 seconds, personalised to each enquiry, with no setup beyond a 10-minute onboarding call"

### Rule 6 — VS section must make alternatives look broken
"Us" list: specific outcomes and speeds grounded in the offer
"Them" list: the exact failures from competitor weaknesses in the evidence
Never write vague advantages. Every item must be verifiable or directly traceable to the evidence.
BAD us: "Better customer support"
GOOD us: "Built specifically for solo agents — not enterprise agencies with 20 staff"
BAD them: "Complicated setup"
GOOD them: "LeadPro requires CRM integration that takes 3+ hours — not built for solo operators"

### Rule 7 — Pricing section must stack value before revealing price
The anchor must reference actual competitor pricing from the evidence.
The guarantee must be outcome-based and time-bound — not a generic refund promise.
The guarantee must commit to something competitors demonstrably do not offer.
BAD guarantee: "30-day money back guarantee"
GOOD guarantee: "If you miss a single enquiry in your first 30 days, we refund your subscription and set up a manual fallback at no cost"

### Rule 8 — CTA must describe the first action, not the purchase
Never use: "Get Started", "Sign Up", "Buy Now", "Learn More"
The CTA must describe what happens in the first 60 seconds after clicking.
BAD: "Get Started Today"
GOOD: "Connect your Rightmove account in 60 seconds"
GOOD: "See your first automated reply before you finish your coffee"

### Rule 9 — Color scheme selection
dark — B2B SaaS, tech tools, developer products, AI
light — professional services, finance, legal, consulting
warm — sales tools, high-ticket offers, coaches, agencies
bold — high-energy consumer, fitness, sales training, launches

### Rule 10 — Slug rules
Lowercase, hyphens only, max 4 words, derived from the headline outcome.
NOT the company name. The outcome.
BAD: "launchsense-ai-tool"
GOOD: "30-second-letting-replies"

## Output format

Return ONLY valid JSON. No markdown fences. No commentary. No explanation before or after.
The JSON must exactly match the LandingPage schema provided in the user message.

## Schema constraints
- problem.points: EXACTLY 3 items
- solution.benefits: EXACTLY 3 items
- vs_section.us: 4 to 6 items
- vs_section.them: 4 to 6 items
- sources: only real URLs from the evidence — never invented

## Final check before outputting

Before returning JSON, verify each of these internally:
1. Does the hero headline contain a specific number or timeframe? If not, rewrite it.
2. Does every problem point include a real stat or verbatim quote from the evidence? If not, fix it.
3. Does the guarantee name a specific outcome and consequence? If not, rewrite it.
4. Does the CTA describe an action, not a purchase? If not, rewrite it.
5. Is every benefit written in terms of outcome, speed, or effort reduction? If not, rewrite it.
6. Are all competitor references traceable to the evidence provided? If not, remove them.

Only output the JSON after this internal check passes."""

LANDING_PAGE_SCHEMA = """{
  "slug": "string — outcome-based, lowercase-hyphens, max 4 words",
  "color_scheme": "dark|light|warm|bold",
  "hero": {
    "headline": "string — outcome + number/timeframe + objection removal in one sentence",
    "subheadline": "string — ICP + specific result, under 30 words",
    "cta": "string — first action in 60 seconds, not a purchase verb",
    "cta_sub": "string — one reassurance line e.g. 'No credit card · 60-second setup'"
  },
  "problem": {
    "headline": "string — names the core failure moment",
    "points": [
      { "pain": "string — exact moment of failure", "stat": "string — real stat or verbatim quote from evidence", "source": "string — real URL from evidence" },
      { "pain": "string", "stat": "string", "source": "string" },
      { "pain": "string", "stat": "string", "source": "string" }
    ]
  },
  "solution": {
    "headline": "string",
    "benefits": [
      { "title": "string", "body": "string — outcome + speed + effort reduction" },
      { "title": "string", "body": "string" },
      { "title": "string", "body": "string" }
    ]
  },
  "vs_section": {
    "headline": "string",
    "us": ["string — specific outcome traceable to offer", "string", "string", "string"],
    "them": ["string — specific failure from competitor evidence", "string", "string", "string"]
  },
  "pricing": {
    "price": "string — exact price from offer",
    "anchor": "string — references actual competitor pricing from evidence",
    "guarantee": "string — outcome-based, time-bound, names specific consequence"
  },
  "sources": [
    { "label": "string", "url": "string — real URL from evidence only" }
  ]
}"""


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


async def run_builder_agent(
    offer: Offer,
    evidence: Evidence,
    model: str | None = None,
) -> LandingPage:
    model_id = resolve_model("builder", model)

    competitors_formatted = "\n".join(
        f"- {c.name} ({c.url}): {c.pricing_found} — weakness: {c.weakness}"
        for c in evidence.competitors
    )
    quotes_formatted = "\n".join(
        f'- "{q.quote}" (r/{q.subreddit}, {q.upvotes} upvotes) — {q.thread_url}'
        for q in evidence.reddit_quotes
    )
    sources_formatted = "\n".join(f"- {s}" for s in evidence.all_sources)

    user_message = f"""OFFER:
Headline: {offer.headline}
Subheadline: {offer.subheadline}
ICP: {offer.icp.who} — pain: {offer.icp.pain}
Outcome: {offer.outcome}
Price: {offer.price} (anchor: {offer.price_anchor})
Guarantee: {offer.guarantee}
Bonuses: {", ".join(offer.bonuses)}
Urgency: {offer.urgency}
CTA: {offer.cta}
Competitor gap: {offer.competitor_gap}

EVIDENCE:
Competitors:
{competitors_formatted}

Customer quotes:
{quotes_formatted}

Pricing range: {evidence.pricing_range.low}–{evidence.pricing_range.high}

All sources (use only these URLs):
{sources_formatted}

Generate a complete landing page JSON matching this schema exactly:
{LANDING_PAGE_SCHEMA}"""

    text = ""
    try:
        response = client.messages.create(
            model=model_id,
            max_tokens=3000,
            system=BUILDER_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
        text = next(
            (block.text for block in response.content if hasattr(block, "text")),
            ""
        )
        if not text:
            raise ValueError(f"Agent 2 got no text block from LLM. Stop reason: {response.stop_reason}")
        parsed = parse_llm_json(text)

        # Enforce schema constraints
        if "problem" in parsed and "points" in parsed["problem"]:
            parsed["problem"]["points"] = parsed["problem"]["points"][:3]
        if "solution" in parsed and "benefits" in parsed["solution"]:
            parsed["solution"]["benefits"] = parsed["solution"]["benefits"][:3]
        if "vs_section" in parsed:
            parsed["vs_section"]["us"] = parsed["vs_section"].get("us", [])[:6]
            parsed["vs_section"]["them"] = parsed["vs_section"].get("them", [])[:6]

        return LandingPage(**parsed)

    except (json.JSONDecodeError, ValueError) as e:
        print(f"Agent 2 JSON parse failed: {e}")
        if text:
            print(f"Raw text (first 500 chars): {text[:500]}")
        raise
    except Exception as e:
        print(f"Agent 2 failed: {e}")
        raise
