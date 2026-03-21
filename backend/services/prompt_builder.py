from models.schemas import EnrichedContext, Evidence


def build_offer_prompt(
    context: EnrichedContext,
    evidence: Evidence,
    principles: list[dict],
) -> str:
    sections: list[str] = []

    # Section 1 — Context
    sections.append(
        f"IDEA: {context.idea}\n"
        f"NICHE: {context.niche}\n"
        f"TARGET: {context.target_customer}\n"
        f"PAIN: {context.core_pain}\n"
        f"EXISTING: {context.existing_solutions}"
    )

    # Section 2 — Competitors
    competitor_lines = ["MARKET EVIDENCE:", "", "Competitors:"]
    if evidence.competitors:
        for c in evidence.competitors:
            competitor_lines.append(
                f"- {c.name}: {c.pricing_found} ({c.pricing_url}) — weakness: {c.weakness}"
            )
    else:
        competitor_lines.append("Competitors: none found")
    sections.append("\n".join(competitor_lines))

    # Section 3 — Reddit quotes
    quote_lines = ["Real customer quotes (exact words from Reddit):"]
    if evidence.reddit_quotes:
        for q in evidence.reddit_quotes:
            quote_lines.append(
                f'- "{q.quote}" ({q.upvotes} upvotes, r/{q.subreddit}) — {q.thread_url}'
            )
    else:
        quote_lines.append("Real customer quotes: none found")
    sections.append("\n".join(quote_lines))

    # Section 4 — Pricing range
    pr = evidence.pricing_range
    sections.append(
        f"Pricing range: {pr.low} – {pr.high}\n"
        f"Insight: {pr.insight}"
    )

    # Section 5 — Market signals (only if non-empty)
    if evidence.market_signals:
        signal_lines = ["Market signals:"]
        for s in evidence.market_signals:
            signal_lines.append(f"- {s.signal} (source: {s.source})")
        sections.append("\n".join(signal_lines))

    # Section 6 — RAG principles (only if non-empty)
    if principles:
        principle_lines = ["OFFER PRINCIPLES (apply these, do not copy verbatim):"]
        for p in principles:
            principle_lines.append(f"- [{p.get('category', '')}] {p.get('text', '')}")
        sections.append("\n".join(principle_lines))

    # Section 7 — Instructions
    sections.append(
        "INSTRUCTIONS:\n"
        "- Price your offer BELOW the highest competitor price found above\n"
        "- Reference at least one specific Reddit quote or competitor weakness in the ICP pain\n"
        "- The guarantee must be something competitors do NOT offer — make it specific and measurable\n"
        "- The CTA must be a specific action, not generic (\"Get Started\" is not acceptable)\n"
        "- sources_used must contain real URLs from the evidence above\n"
        "- Return ONLY valid JSON — no markdown fences, no commentary"
    )

    # Section 8 — Output schema
    sections.append(
        'Return ONLY valid JSON matching this exact schema:\n'
        '{\n'
        '  "icp": {\n'
        '    "who": "hyper-specific person description",\n'
        '    "pain": "quantified pain (hours, £, specific frustration)",\n'
        '    "trigger": "the moment they would buy",\n'
        '    "evidence_source": "which Reddit quote or competitor gap backs this"\n'
        '  },\n'
        '  "headline": "[Outcome] for [Person] in [Timeframe]",\n'
        '  "subheadline": "one sentence expanding on the headline",\n'
        '  "outcome": "what the customer achieves",\n'
        '  "price": "£XX/mo",\n'
        '  "price_anchor": "Competitors charge up to £XXX/mo",\n'
        '  "guarantee": "specific measurable guarantee",\n'
        '  "bonuses": ["bonus 1", "bonus 2"],\n'
        '  "urgency": "why act now",\n'
        '  "cta": "specific action verb + outcome",\n'
        '  "competitor_gap": "why you win vs them",\n'
        '  "sources_used": ["https://url1", "https://url2"]\n'
        '}'
    )

    return "\n\n".join(sections)
