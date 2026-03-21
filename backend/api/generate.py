import asyncio
import json
import os
import re

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

load_dotenv()

from agents.agent0_research import run_research_agent
from agents.agent1_offer import run_offer_agent
from agents.agent2_builder import run_builder_agent
from agents.agent3_growth import run_growth_agent
from agents.agent4_critique import run_critique_agent
from models.schemas import EnrichedContext, GenerateRequest
from services.evals import eval_offer, eval_research
from services.rag_client import get_principles

router = APIRouter()

# In-memory offer store — good enough for hackathon
OFFER_STORE: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# SSE helpers
# ---------------------------------------------------------------------------

def emit(event_name: str, payload: dict) -> str:
    """Format a single SSE event. Sync — yields strings directly."""
    return f"data: {json.dumps({'event': event_name, 'data': payload})}\n\n"


def slug_from_idea(idea: str) -> str:
    """Derive a URL-safe slug from the idea string (max 4 words)."""
    words = re.sub(r"[^a-z0-9\s]", "", idea.lower()).split()
    return "-".join(words[:4])


# ---------------------------------------------------------------------------
# KV cache
# ---------------------------------------------------------------------------

async def cache_offer(slug: str, data: dict) -> None:
    OFFER_STORE[slug] = data


# ---------------------------------------------------------------------------
# Main stream generator
# ---------------------------------------------------------------------------

async def generate_stream(request: GenerateRequest):
    """Async generator that drives the full agent pipeline and yields SSE strings."""

    # Build a minimal EnrichedContext if none was provided via intake
    context: EnrichedContext = request.context or EnrichedContext(
        idea=request.idea,
        niche="unknown",
        target_customer="unknown",
        core_pain="unknown",
        existing_solutions="unknown",
        notes="",
    )

    models = request.models

    try:
        # ------------------------------------------------------------------
        # Step 0 — Research
        # ------------------------------------------------------------------
        yield emit("status", {"step": 0, "label": "Researching your market..."})

        evidence = await run_research_agent(
            context, model=models.research if models else None
        )

        research_eval = eval_research(evidence)

        if research_eval.action == "retry":
            yield emit("status", {"step": 0, "label": "Deepening research...", "sub": "First pass incomplete — retrying"})
            evidence = await run_research_agent(
                context, model=models.research if models else None
            )

        yield emit("research", evidence.model_dump())

        # ------------------------------------------------------------------
        # Step 1 — RAG + Offer
        # ------------------------------------------------------------------
        rag = await get_principles(context, evidence=evidence)

        yield emit("status", {"step": 1, "label": "Building your offer..."})

        offer = await run_offer_agent(
            context,
            evidence,
            rag.principles,
            model=models.offer if models else None,
        )

        offer_eval = await eval_offer(offer, evidence)
        yield emit("eval", {"research": research_eval.model_dump(), "offer": offer_eval.model_dump()})

        if offer_eval.action == "regenerate_offer":
            weak_point = offer_eval.critical_fails[0] if offer_eval.critical_fails else None
            offer = await run_offer_agent(
                context,
                evidence,
                rag.principles,
                model=models.offer if models else None,
                weak_point=weak_point,
            )

        yield emit("offer", offer.model_dump())

        # ------------------------------------------------------------------
        # Step 2 — Builder + Growth (conditional based on asset selection)
        # ------------------------------------------------------------------
        selected_assets = set(request.assets or ["landing_page", "cold_email", "linkedin_dm", "hooks"])
        
        yield emit("status", {"step": 2, "label": "Building selected assets..."})

        landing_page = None
        growth_pack = None

        tasks = []
        if "landing_page" in selected_assets:
            tasks.append(run_builder_agent(offer, evidence, model=models.builder if models else None))
        else:
            tasks.append(asyncio.sleep(0))  # placeholder

        if any(asset in selected_assets for asset in ["cold_email", "linkedin_dm", "hooks"]):
            tasks.append(run_growth_agent(offer, evidence, model=models.growth if models else None))
        else:
            tasks.append(asyncio.sleep(0))  # placeholder

        results = await asyncio.gather(*tasks)
        
        if "landing_page" in selected_assets:
            landing_page = results[0]
        if any(asset in selected_assets for asset in ["cold_email", "linkedin_dm", "hooks"]):
            growth_pack = results[1]

        slug = slug_from_idea(request.idea)

        await cache_offer(slug, {
            "slug": slug,
            "context": context.model_dump(),
            "evidence": evidence.model_dump(),
            "offer": offer.model_dump(),
            "landing_page": landing_page.model_dump() if landing_page else None,
            "growth_pack": growth_pack.model_dump() if growth_pack else None,
        })

        if landing_page:
            yield emit("page", {"url": f"/p/{slug}", "slug": slug})
        if growth_pack:
            yield emit("growth", growth_pack.model_dump())

        # ------------------------------------------------------------------
        # Step 3 — Critique (streaming)
        # ------------------------------------------------------------------
        yield emit("status", {"step": 3, "label": "Critiquing...", "sub": "streaming"})

        try:
            async for chunk in run_critique_agent(
                offer,
                landing_page,
                growth_pack,
                model=models.critique if models else None,
            ):
                yield emit("critique_chunk", {"text": chunk})
        except Exception as e:
            print(f"Critique streaming failed: {e}")
            yield emit("critique_chunk", {"text": "Critique unavailable."})

        # ------------------------------------------------------------------
        # Done
        # ------------------------------------------------------------------
        yield emit("complete", {"success": True, "slug": slug})

    except Exception as e:
        print(f"Pipeline error: {e}")
        yield emit("error", {"message": str(e)})


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/generate")
async def generate(request: GenerateRequest):
    return StreamingResponse(
        generate_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/p/{slug}")
async def get_offer(slug: str):
    if slug not in OFFER_STORE:
        raise HTTPException(status_code=404, detail="Offer not found")
    return OFFER_STORE[slug]
