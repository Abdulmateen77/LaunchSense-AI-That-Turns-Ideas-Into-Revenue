from embedder import embed
from vector_store import get_client, get_or_create_collection, query_principles
from schemas import PrinciplesRequest

def build_retrieval_query(req: PrinciplesRequest) -> str:
    """
    Build a rich natural-language query from EnrichedContext.
    More specific = better semantic match.
    """
    parts = [
        f"Offer design principles for {req.product_type} targeting {req.niche}.",
        f"Target customer: {req.target_customer}.",
        f"Core pain: {req.painful_problem}.",
        f"Desired outcome: {req.desired_outcome}.",
    ]
    if req.existing_solutions:
        parts.append(f"Existing solutions the buyer already tried: {req.existing_solutions}.")
    if req.evidence_summary:
        parts.append(f"Market context: {req.evidence_summary}.")
    parts.append(
        "Principles needed: ICP narrowing, risk reversal, guarantee design, "
        "bonus stacking, pricing strategy, urgency, proof."
    )
    return " ".join(parts)

def retrieve_principles(req: PrinciplesRequest) -> list[dict]:
    query_text = build_retrieval_query(req)
    query_embedding = embed(query_text)

    client = get_client()
    collection = get_or_create_collection(client)

    results = query_principles(collection, query_embedding, top_k=req.max_principles)

    # Unpack Chroma result format
    principles = []
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    distances = results["distances"][0]

    for doc, meta, distance in zip(docs, metas, distances):
        # Chroma cosine distance: 0 = identical, 2 = opposite
        # Convert to a 0–1 relevance score
        relevance = round(1 - (distance / 2), 4)
        principles.append({
            "document": doc,
            "title": meta["title"],
            "category": meta["category"],
            "relevance_score": relevance,
        })

    return principles