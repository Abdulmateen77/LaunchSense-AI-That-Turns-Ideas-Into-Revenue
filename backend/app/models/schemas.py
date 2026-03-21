from pydantic import BaseModel, Field
from typing import List, Optional

class OfferInput(BaseModel):
    idea: str = Field(..., min_length=3)
    audience: str = Field(..., min_length=3)
    notes: Optional[str] = None

class OfferOutput(BaseModel):
    icp: str
    pain: str
    offer: str
    guarantee: str
    bonuses: List[str] = Field(min_length=2, max_length=3)
    urgency: str
    cta: str
    positioning_angle: str

class OfferResponse(BaseModel):
    success: bool
    data: OfferOutput