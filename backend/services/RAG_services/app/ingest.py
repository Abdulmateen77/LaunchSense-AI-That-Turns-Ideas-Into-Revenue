import json
from pathlib import Path
from embedder import embed_batch
from vector_store import get_client, get_or_create_collection, upsert_principles

def ingest():
    data_path = Path(__file__).parent / "principles.json"
    principles = json.loads(data_path.read_text())

    print(f"Ingesting {len(principles)} principles...")

    ids = [p["id"] for p in principles]
    # embed the full text — title + text gives better retrieval than text alone
    documents = [f"{p['title']}. {p['text']}" for p in principles]
    metadatas = [
        {
            "category": p["category"],
            "title": p["title"],
            "tags": ",".join(p["tags"]),
        }
        for p in principles
    ]

    print("Generating embeddings...")
    embeddings = embed_batch(documents)

    client = get_client()
    collection = get_or_create_collection(client)

    upsert_principles(collection, ids, embeddings, documents, metadatas)
    print(f"Done. {len(ids)} principles stored in Chroma.")

if __name__ == "__main__":
    ingest()