import os
import httpx
from dotenv import load_dotenv
from models.schemas import EnrichedContext, Evidence

load_dotenv()

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://localhost:8001")


def _build_payload(context: EnrichedContext, evidence: Evidence) -> dict:
    """Build the exact payload shape Mateen's /get_principles expects."""
    competitors = evidence.competitors
    pricing_low = evidence.pricing_range.low
    pricing_high = evidence.pricing_range.high

    competitor_summary = ". ".join(
        f"{c.name} ({c.pricing_found})" for c in competitors if c.name
    ) or "No competitor data available"

    reddit_summary = ". ".join(
        f'"{q.quote}"' for q in evidence.reddit_quotes if q.quote
    ) or "No Reddit data available"

    return {
        "idea_summary": context.idea,
        "product_type": context.niche or "B2B SaaS",
        "niche": context.niche,
        "target_customer": context.target_customer,
        "painful_problem": context.core_pain,
        "desired_outcome": f"Solve: {context.core_pain}",
        "existing_solutions": context.existing_solutions,
        "evidence_summary": (
            f"Competitors: {competitor_summary}. "
            f"Pricing range: {pricing_low}–{pricing_high}. "
            f"Customer quotes: {reddit_summary}"
        ),
        "max_principles": 5,
    }


async def get_principles(
    context: EnrichedContext,
    evidence: Evidence | None = None,
    categories: list[str] | None = None,
) -> list[dict]:
    """
    Calls Mateen's RAG service POST /get_principles.
    Returns [] on any failure — never raises, never blocks the pipeline.
    Timeout: 5 seconds.
    """
    if evidence is None:
        # Fallback: no evidence yet, build minimal payload
        from models.schemas import Evidence as EvidenceModel
        evidence = EvidenceModel()

    payload = _build_payload(context, evidence)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{RAG_SERVICE_URL}/get_principles",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("principles", [])
    except Exception as e:
        print(f"RAG client fallback (no principles): {e}")
        return []
