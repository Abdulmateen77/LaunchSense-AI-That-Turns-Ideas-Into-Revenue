from fastapi import APIRouter, HTTPException
from app.models.schemas import OfferInput, OfferResponse
from app.services.offer_engine import OfferEngine

router = APIRouter()
engine = OfferEngine()

@router.post("/generate", response_model=OfferResponse)
async def generate_offer(payload: OfferInput):
    try:
        result = await engine.generate(payload)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))