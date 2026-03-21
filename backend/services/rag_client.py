import os

import httpx
from dotenv import load_dotenv

from models.schemas import EnrichedContext, Evidence

load_dotenv()

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://localhost:8001")


def _build_evidence_summary(evidence: Evidence | None) -> str:
    """Compact summary of evidence to pass as context to the RAG service."""
    if not evidence:
        return ""
    parts = []
    for c in (evidence.competitors or [])[:3]:
        parts.append(f"{c.name}: {c.pricing_found}")
    for q in (evidence.reddit_quotes or [])[:2]:
        parts.append(f'"{q.quote[:80]}"')
    return " | ".join(parts)


async def get_principles(
    context: EnrichedContext,
    evidence: Evidence | None = None,
) -> list[dict]:
    """
    Call Mateen's RAG service (POST /get_principles) to retrieve relevant
    offer-design principles.

    Returns list[dict] with keys: category, principle, relevance_score.
    Falls back to hardcoded defaults if the service is unavailable.
    Always completes within ~6 seconds.
    """
    payload = {
        "idea_summary": context.idea,
        "product_type": context.idea,
        "niche": context.niche,
        "target_customer": context.target_customer,
        "painful_problem": context.core_pain,
        "desired_outcome": getattr(context, "desired_outcome", "") or context.core_pain,
        "existing_solutions": context.existing_solutions,
        "evidence_summary": _build_evidence_summary(evidence),
        "max_principles": 5,
    }

    try:
        print(f"RAG: calling {RAG_SERVICE_URL}/get_principles ...")
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{RAG_SERVICE_URL}/get_principles",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        # data shape: { "principles": [{ title, category, principle, relevance_score }], "precontext": str }
        principles = data.get("principles", [])
        if not principles:
            print("RAG: service returned empty principles — using defaults")
            return _defaults()

        print(f"RAG: got {len(principles)} principles from Mateen's service")

        # Normalise to the shape prompt_builder expects
        return [
            {
                "category": p.get("category", "general"),
                "principle": p.get("principle", ""),
                "relevance_score": p.get("relevance_score", 1.0),
                # carry precontext through so prompt_builder can use it if present
                "_precontext": data.get("precontext", ""),
            }
            for p in principles
        ]

    except httpx.TimeoutException:
        print(f"RAG service timed out after 5s — proceeding with defaults")
        return _defaults()
    except Exception as e:
        print(f"RAG service unavailable ({e}) — proceeding with defaults")
        return _defaults()


def _defaults() -> list[dict]:
    return [
        {"category": "icp",       "principle": "Narrow the ICP to a buyer with a specific urgent problem.", "relevance_score": 0.0},
        {"category": "outcome",   "principle": "Make the outcome measurable and time-bound.", "relevance_score": 0.0},
        {"category": "guarantee", "principle": "Use a guarantee that shifts risk from buyer to seller.", "relevance_score": 0.0},
        {"category": "bonuses",   "principle": "Bonuses should remove the top objection to buying.", "relevance_score": 0.0},
        {"category": "pricing",   "principle": "Frame price against the cost of not solving the problem.", "relevance_score": 0.0},
    ]
