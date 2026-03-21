from fastapi import APIRouter
from pydantic import BaseModel

from agents.agent_validate import run_validate_agent
from models.schemas import EnrichedContext

router = APIRouter()


class ValidateRequest(BaseModel):
    context: EnrichedContext


class AlternativeIdea(BaseModel):
    title: str
    description: str
    why_stronger: str


class ValidateResponse(BaseModel):
    score: int
    verdict: str
    strengths: list[str]
    risks: list[str]
    recommendation: str
    alternatives: list[AlternativeIdea]


@router.post("/validate", response_model=ValidateResponse)
async def validate_idea(body: ValidateRequest) -> ValidateResponse:
    result = await run_validate_agent(body.context.model_dump())
    return ValidateResponse(
        score=result.get("score", 5),
        verdict=result.get("verdict", ""),
        strengths=result.get("strengths", []),
        risks=result.get("risks", []),
        recommendation=result.get("recommendation", ""),
        alternatives=[AlternativeIdea(**a) for a in result.get("alternatives", [])],
    )
