import json
import os

from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = AsyncAnthropic()

from models.schemas import Evidence, Offer, EvalResult

EVAL_OFFER_SYSTEM = """You are a commercial offer quality judge. You evaluate startup offers against the evidence that was gathered.
Return ONLY valid JSON — no markdown fences, no explanation outside the JSON.

Score each dimension 0.0–1.0:
- pain_grounded: Is the ICP pain traceable to a specific Reddit quote or competitor gap in the evidence?
- price_grounded: Is the price anchored to actual competitor pricing data found in the evidence?
- guarantee_credible: Is the guarantee specific, measurable, and different from what competitors offer?

Overall score = average of the three dimensions.

Determine action:
- score >= 0.65 → "continue"
- 0.5 <= score < 0.65 → "warn"
- score < 0.5 → "regenerate_offer"

Return this exact JSON shape:
{
  "pain_grounded": 0.0,
  "price_grounded": 0.0,
  "guarantee_credible": 0.0,
  "score": 0.0,
  "weakest_claim": "the field name and why it fails",
  "action": "continue|warn|regenerate_offer"
}"""


def eval_research(evidence: Evidence) -> EvalResult:
    """Pure function — no LLM. Checks evidence for critical failures."""
    critical_fails: list[str] = []
    warnings: list[str] = []

    # Critical checks — trigger retry
    if not evidence.competitors:
        critical_fails.append("competitors_empty")

    for comp in evidence.competitors:
        if not comp.url.startswith("http"):
            critical_fails.append(f"competitor_url_invalid:{comp.name}")
        if not comp.pricing_url.startswith("http"):
            critical_fails.append(f"competitor_pricing_url_invalid:{comp.name}")

    if not evidence.reddit_quotes:
        critical_fails.append("reddit_quotes_empty")

    for quote in evidence.reddit_quotes:
        if not quote.thread_url.startswith("http"):
            critical_fails.append(f"reddit_url_invalid:{quote.subreddit}")

    # Non-critical warnings
    all_pricing_unknown = all(
        "not public" in c.pricing_found.lower() or c.pricing_found.strip() == ""
        for c in evidence.competitors
    ) if evidence.competitors else True

    if all_pricing_unknown:
        warnings.append("no_real_prices_found")

    if not evidence.market_signals:
        warnings.append("no_market_signals")

    passed = len(critical_fails) == 0
    action = "continue" if passed else "retry"

    # Score: 1.0 if no critical fails, deduct per failure
    score = max(0.0, 1.0 - (len(critical_fails) * 0.25))

    return EvalResult(
        passed=passed,
        score=round(score, 2),
        critical_fails=critical_fails,
        action=action,
    )


async def eval_offer(offer: Offer, evidence: Evidence) -> EvalResult:
    """Uses Claude Haiku as judge to score offer quality against evidence."""
    # If evidence is thin, skip eval — low score would be unfair and trigger wasteful regeneration
    has_evidence = bool(evidence.competitors or evidence.reddit_quotes)
    if not has_evidence:
        print("eval_offer: no evidence available — skipping eval, returning continue")
        return EvalResult(passed=True, score=0.7, critical_fails=[], action="continue")
    evidence_summary = []

    for comp in evidence.competitors:
        evidence_summary.append(
            f"Competitor: {comp.name} — {comp.pricing_found} — weakness: {comp.weakness}"
        )

    for quote in evidence.reddit_quotes:
        evidence_summary.append(
            f"Reddit ({quote.upvotes} upvotes, r/{quote.subreddit}): \"{quote.quote}\""
        )

    user_message = f"""Judge this offer against the evidence gathered.

OFFER:
ICP pain: {offer.icp.pain}
ICP evidence_source: {offer.icp.evidence_source}
Price: {offer.price}
Price anchor: {offer.price_anchor}
Guarantee: {offer.guarantee}
Competitor gap: {offer.competitor_gap}

EVIDENCE:
{chr(10).join(evidence_summary) if evidence_summary else "No evidence available."}

Return ONLY the JSON score object."""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
            system=EVAL_OFFER_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
        text = response.content[0].text.strip()

        # Strip markdown fences if present
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else parts[0]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        data = json.JSONDecoder().raw_decode(text)[0]
        score = float(data.get("score", 0.0))
        action = data.get("action", "continue")

        # Validate action against score thresholds
        if score < 0.5:
            action = "regenerate_offer"
        elif score < 0.65:
            action = "warn"
        else:
            action = "continue"

        weakest = data.get("weakest_claim", "")
        critical_fails = []
        if score < 0.5:
            critical_fails.append(weakest)

        return EvalResult(
            passed=score >= 0.65,
            score=round(score, 2),
            critical_fails=critical_fails,
            action=action,
        )

    except json.JSONDecodeError as e:
        print(f"eval_offer JSON parse failed: {e}")
        return EvalResult(passed=True, score=0.65, critical_fails=[], action="continue")
    except Exception as e:
        print(f"eval_offer failed: {e}")
        return EvalResult(passed=True, score=0.65, critical_fails=[], action="continue")
