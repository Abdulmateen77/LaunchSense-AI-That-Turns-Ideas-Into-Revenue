from fastapi import FastAPI, HTTPException
from schemas import PrinciplesRequest, PrinciplesResponse
from retriever import retrieve_principles
from formatter import format_principles

app = FastAPI(title="LaunchSense RAG Service", version="1.0")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/get_principles", response_model=PrinciplesResponse)
def get_principles(req: PrinciplesRequest):
    try:
        raw_chunks = retrieve_principles(req)
        if not raw_chunks:
            raise HTTPException(status_code=404, detail="No principles retrieved")

        items, precontext = format_principles(raw_chunks)

        return PrinciplesResponse(
            principles=items,
            precontext=precontext,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))