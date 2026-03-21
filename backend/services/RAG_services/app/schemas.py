from pydantic import BaseModel
from typing import Optional

class PrinciplesRequest(BaseModel):
    idea_summary: str
    product_type: str
    niche: str
    target_customer: str
    painful_problem: str
    desired_outcome: str
    existing_solutions: Optional[str] = None
    evidence_summary: Optional[str] = None
    max_principles: int = 5

class PrincipleItem(BaseModel):
    title: str
    category: str
    principle: str
    relevance_score: float

class PrinciplesResponse(BaseModel):
    principles: list[PrincipleItem]
    precontext: str  # formatted block ready for Agent 1 prompt