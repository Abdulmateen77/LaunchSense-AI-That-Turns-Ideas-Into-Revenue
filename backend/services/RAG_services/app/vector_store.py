import chromadb
import os
from chromadb.config import Settings

COLLECTION_NAME = "offer_principles"
CHROMA_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")

def get_client() -> chromadb.ClientAPI:
    return chromadb.PersistentClient(path=CHROMA_PATH)

def get_or_create_collection(client: chromadb.ClientAPI):
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},  # cosine similarity, not L2
    )

def upsert_principles(
    collection,
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )

def query_principles(
    collection,
    query_embedding: list[float],
    top_k: int = 5,
) -> dict:
    return collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )