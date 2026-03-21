import os
import httpx
from dotenv import load_dotenv
from models.schemas import EnrichedContext

load_dotenv()

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://localhost:8001")


async def get_principles(context: EnrichedContext, categories: list[str] | None = None) -> list[dict]:
    """
    Calls Mateen's RAG service to retrieve offer principles.
    Returns [] on any failure — never raises, never blocks the pipeline.
    Timeout: 5 seconds.
    """
    if categories is None:
        categories = ["ICP", "guarantee", "pricing", "positioning"]

    query = f"{context.idea} {context.core_pain}"
    params = {
        "query": query,
        "categories": ",".join(categories),
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{RAG_SERVICE_URL}/rag/retrieve", params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("principles", [])
    except Exception as e:
        print(f"RAG client fallback: {e}")
        return []
