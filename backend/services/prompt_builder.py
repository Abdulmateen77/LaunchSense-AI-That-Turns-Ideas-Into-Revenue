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

    # Block 4 — output schema (unchanged from your existing OFFER_SYSTEM in agent1)
    block4 = """## BLOCK 4 — Output schema

Return a single valid JSON object. No markdown fences. No text before or after.

{
  "icp": "Specific buyer, their situation, why they have this problem now.",
  "pain_points": ["Pain 1 — moment + cost", "Pain 2 — consequence", "Pain 3 — emotional impact"],
  "offer": "Under 80 words. What, for whom, outcome, how fast. No buzzwords.",
  "guarantee": "Outcome-based and time-bound. One sentence.",
  "bonuses": ["Bonus 1 — name + objection it removes", "Bonus 2 — name + objection it removes"],
  "urgency": "One sentence. Cost-of-inaction if no real scarcity.",
  "headline": "Under 12 words. Use customer language.",
  "subheadline": "Under 25 words. Names ICP + specific result.",
  "price": "Specific amount e.g. £49/mo",
  "price_anchor": "Reference actual competitor pricing from Block 2.",
  "cta": "Specific action verb + outcome. Not 'Get Started'.",
  "sources_used": ["real URLs from evidence only"]
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