from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class OfferBrief(BaseModel):
    raw_idea: str
    product_type: Optional[str] = None
    target_customer: Optional[str] = None
    niche: Optional[str] = None
    painful_problem: Optional[str] = None
    desired_outcome: Optional[str] = None
    differentiation: Optional[str] = None
    notes: Optional[str] = None
    assumptions: List[str] = []
    missing_fields: List[str] = []
    is_ready_for_generation: bool = False


class ChatResponse(BaseModel):
    assistant_message: str
    brief: OfferBrief
    questions: List[str]
    stage: str