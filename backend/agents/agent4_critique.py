import os

from pathlib import Path

from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = AsyncAnthropic()

from models.schemas import Offer, LandingPage, GrowthPack
from models.model_registry import resolve_model

CRITIQUE_SYSTEM = """You are a conversion rate optimisation expert reviewing a complete product launch package.
Your job is to identify what will kill conversions and prescribe the single highest-leverage fix.
This is not encouragement — it is a commercial critique. Be direct, specific, and ruthless.

## What BAD feedback looks like (never write like this)

BAD: "The offer looks good overall. The headline is catchy and the guarantee is solid."

This is useless. It names no fields, cites no evidence, and gives no actionable direction.

## What GOOD feedback looks like (always write like this)

GOOD: "The icp.pain field says 'saves time' — this is too vague. The Reddit evidence shows agents lose 3 hours every Sunday. Use that number. The guarantee field offers a refund but PropWrite already offers refunds — this doesn't differentiate. Tie the guarantee to a specific outcome instead: 'If you don't cut listing time by 50% in 30 days, we refund and write your next 10 listings free.'"

This is useful. It names specific fields (icp.pain, guarantee), cites real evidence, and rewrites the weak copy.

## Critique structure — follow this order exactly

### 1. STRENGTHS
Name 2–3 things that are working. Be specific — cite the field name and why it converts.
Example: "The headline field leads with a concrete outcome ('50% faster listings') — this is strong."

### 2. WEAKEST CLAIMS
Identify the 2–3 claims most likely to kill conversions. For each:
- Name the exact field (e.g. "the guarantee field", "the icp.pain", "the headline", "the competitor_gap")
- Explain why it fails commercially (too vague, not differentiated, not credible, not specific)
- Cite the evidence that contradicts or could strengthen it

### 3. SINGLE HIGHEST-LEVERAGE REWRITE
Pick the ONE change that will move the needle most. Rewrite the field copy in full.
Show the before and after. Explain why this specific change will improve conversions.

## Rules
- Always reference field names by their exact name: headline, subheadline, icp.pain, icp.who, guarantee, price_anchor, competitor_gap, cta, cold_email.subject, hero.headline
- Never give generic advice like "make it more specific" without showing the specific version
- Ground every critique in the evidence provided (Reddit quotes, competitor data, pricing)
- The final line of every critique MUST be exactly:

The one change that will most improve conversions:"""


async def run_critique_agent(
    offer: Offer,
    landing_page: LandingPage | None,
    growth_pack: GrowthPack | None,
    model: str | None = None,
):
    """Async generator that yields str chunks of the critique."""
    model_id = resolve_model("critique", model)

    lp_section = ""
    if landing_page:
        lp_section = f"""
LANDING PAGE HERO:
Headline: {landing_page.hero.headline}
Subheadline: {landing_page.hero.subheadline}
CTA: {landing_page.hero.cta}"""

    email_section = ""
    if growth_pack:
        email_section = f"""
COLD EMAIL:
Subject: {growth_pack.cold_email.subject}
Body preview: {growth_pack.cold_email.body[:200]}..."""

    user_message = f"""Review this complete launch package and provide a conversion-focused critique.

OFFER:
Headline: {offer.headline}
ICP who: {offer.icp.who}
ICP pain: {offer.icp.pain}
ICP evidence_source: {offer.icp.evidence_source}
Price: {offer.price} (anchor: {offer.price_anchor})
Guarantee: {offer.guarantee}
CTA: {offer.cta}
Competitor gap: {offer.competitor_gap}
Bonuses: {offer.bonuses}
{lp_section}{email_section}

Provide your critique following the structure in your instructions.
End with: "The one change that will most improve conversions:\""""

    try:
        async with client.messages.stream(
            model=model_id,
            max_tokens=1500,
            system=CRITIQUE_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
    except Exception as e:
        yield f"\n\n[Critique unavailable: {e}]"
        return
