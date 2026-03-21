# backend/services/rag_client.py

import json
import os
from pathlib import Path
from models.schemas import EnrichedContext, Evidence

PRINCIPLES_PATH = Path(__file__).parent.parent / "data" / "principles.json"

def _load_principles() -> list[dict]:
    with open(PRINCIPLES_PATH) as f:
        return json.load(f)

def _score(chunk: dict, query_words: set[str]) -> int:
    """
    Simple overlap score between query words and chunk tags + category + principle text.
    Higher = more relevant.
    """
    searchable = set(chunk["tags"]) | {chunk["category"]}
    text_words = set(chunk["principle"].lower().split())
    return len(query_words & searchable) * 3 + len(query_words & text_words)

def _build_query_words(context: EnrichedContext, evidence: Evidence) -> set[str]:
    """
    Extract meaningful keywords from context and evidence to match against chunks.
    """
    text = " ".join(filter(None, [
        context.idea,
        context.niche,
        context.target_customer,
        context.core_pain,
        context.existing_solutions,
        # pull competitor names and quotes from evidence
        " ".join(c.name for c in (evidence.competitors or []) if c.name),
        " ".join(q.quote for q in (evidence.reddit_quotes or []) if q.quote),
    ])).lower()

    # strip common words, keep meaningful ones
    stopwords = {"a","an","the","and","or","for","to","in","of","is","are","we","i","my","it","on","at","by"}
    return {w for w in text.split() if len(w) > 3 and w not in stopwords}

async def get_principles(
    context: EnrichedContext,
    evidence: Evidence | None = None,
    categories: list[str] | None = None,
) -> list[dict]:
    """
    Retrieves the most relevant principles from principles.json.
    No HTTP call, no external service — runs entirely in your backend process.
    Returns top 5 as list[dict] with category + principle fields.
    """
    if evidence is None:
        from models.schemas import Evidence as EvidenceModel
        evidence = EvidenceModel()

    try:
        principles = _load_principles()
        query_words = _build_query_words(context, evidence)

        # score every chunk
        scored = [(chunk, _score(chunk, query_words)) for chunk in principles]

        # sort by score descending, break ties by category variety
        scored.sort(key=lambda x: x[1], reverse=True)

        # pick top 5, ensuring we don't return 5 chunks from the same category
        seen_categories = set()
        selected = []
        for chunk, score in scored:
            cat = chunk["category"]
            if cat not in seen_categories or score > 5:
                selected.append(chunk)
                seen_categories.add(cat)
            if len(selected) == 5:
                break

        # return in the shape agent1 + prompt_builder expect
        return [
            {
                "category": c["category"],
                "principle": c["principle"],
                "relevance_score": 1.0,  # no real score without embeddings
            }
            for c in selected
        ]

    except Exception as e:
        print(f"RAG retrieval failed: {e}")
        return [
            {"category": "icp",       "principle": "Narrow the ICP to a buyer with a specific urgent problem.", "relevance_score": 0.0},
            {"category": "outcome",   "principle": "Make the outcome measurable and time-bound.", "relevance_score": 0.0},
            {"category": "guarantee", "principle": "Use a guarantee that shifts risk from buyer to seller.", "relevance_score": 0.0},
            {"category": "bonuses",   "principle": "Bonuses should remove the top objection to buying.", "relevance_score": 0.0},
            {"category": "pricing",   "principle": "Frame price against the cost of not solving the problem.", "relevance_score": 0.0},
        ]