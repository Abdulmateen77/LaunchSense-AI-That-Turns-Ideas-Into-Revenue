from fastapi import FastAPI
from app.api.routes.offers import router as offers_router

app = FastAPI(title="Offer Launch API")

app.include_router(offers_router, prefix="/api/v1/offers", tags=["offers"])

@app.get("/health")
def health():
    return {"status": "ok"}