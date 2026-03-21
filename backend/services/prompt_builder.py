# backend/services/prompt_builder.py

from models.schemas import EnrichedContext, Evidence


def build_offer_prompt(
    context: EnrichedContext,
    evidence: Evidence,
    principles: list[dict],
) -> str:

    # Block 1 — from EnrichedContext Pydantic model (use .field not .get())
    block1 = f"""## BLOCK 1 — Business context

Idea: {context.idea}
Target customer (ICP): {context.target_customer}
Niche: {context.niche}
Core pain: {context.core_pain}
Existing alternatives: {context.existing_solutions or 'Not specified'}"""

    # Block 2 — from Evidence Pydantic model
    competitors_text = _format_competitors(evidence.competitors or [])
    quotes_text = _format_quotes(evidence.reddit_quotes or [])
    pricing = f"{evidence.pricing_range.low}–{evidence.pricing_range.high}" if evidence.pricing_range else "Unknown"

    block2 = f"""## BLOCK 2 — Market evidence

Competitors:
{competitors_text}

Pricing range: {pricing}

Customer language (verbatim):
{quotes_text}"""

    # Block 3 — RAG principles converted to bullet precontext
    block3 = _format_principles(principles)

    # Block 4 — output schema must exactly match the Pydantic Offer model
    block4 = """## BLOCK 4 — Output schema

Return a single valid JSON object. No markdown fences. No text before or after.

{
  "icp": {
    "who": "Specific person — job title, company size, situation",
    "pain": "Quantified pain — hours lost, money wasted, or specific frustration",
    "trigger": "The exact moment they would reach for their wallet",
    "evidence_source": "The specific Reddit quote or competitor gap that proves this pain is real"
  },
  "headline": "Under 12 words. Use customer language. [Outcome] for [Person] in [Timeframe].",
  "subheadline": "Under 25 words. Names ICP + specific result.",
  "outcome": "What does the customer's life look like after? One sentence, measurable.",
  "price": "Specific amount e.g. £49/mo",
  "price_anchor": "Reference actual competitor pricing from Block 2. e.g. 'Competitors charge up to £149/mo'",
  "guarantee": "Outcome-based and time-bound. Specific + measurable. Not '30-day money back'.",
  "bonuses": ["Bonus 1 — name + objection it removes", "Bonus 2 — name + objection it removes"],
  "urgency": "One sentence. Cost-of-inaction if no real scarcity.",
  "cta": "Specific action verb + outcome. Not 'Get Started'.",
  "competitor_gap": "One sentence. Why you win vs. the competitors in Block 2.",
  "sources_used": ["real URLs from evidence only — no invented URLs"]
}"""

    return f"""You are an expert offer engineer.

---

{block1}

---

{block2}

---

{block3}

---

{block4}
""".strip()


def _format_principles(principles: list[dict]) -> str:
    if not principles:
        return """## BLOCK 3 — Strategic principles

- Narrow the ICP to a buyer with a specific, urgent problem.
- Make the outcome measurable and time-bound.
- Use a guarantee that shifts risk from buyer to seller.
- Add bonuses that remove the top objection to buying.
- Frame price against the cost of not solving the problem."""

    # If the RAG service returned a pre-formatted precontext block, use it directly
    precontext = principles[0].get("_precontext", "") if principles else ""
    if precontext:
        return f"## BLOCK 3 — Strategic principles\n\n{precontext}"

    lines = ["## BLOCK 3 — Strategic principles", ""]
    for p in principles:
        category = p.get("category", "general").upper()
        principle = p.get("principle", "")
        if principle:
            lines.append(f"- [{category}] {principle}")
    return "\n".join(lines)


def _format_competitors(competitors: list) -> str:
    if not competitors:
        return "None identified"
    lines = []
    for c in competitors[:4]:
        # handle both dict and Pydantic model
        if hasattr(c, "name"):
            name = c.name or "Unknown"
            price = c.pricing_found or "unknown price"
        else:
            name = c.get("name", "Unknown")
            price = c.get("pricing_found", "unknown price")
        lines.append(f"- {name} ({price})")
    return "\n".join(lines)


def _format_quotes(quotes: list) -> str:
    if not quotes:
        return "No verbatim quotes collected"
    lines = []
    for q in quotes[:4]:
        # handle both dict and Pydantic model
        text = q.quote if hasattr(q, "quote") else q.get("quote", "")
        if text:
            lines.append(f'- "{text}"')
    return "\n".join(lines) or "No verbatim quotes collected"