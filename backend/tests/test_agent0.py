import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import EnrichedContext
from agents.agent0_research import run_research_agent


async def test():
    context = EnrichedContext(
        idea="AI tool for writing property listings",
        niche="UK residential estate agents",
        target_customer="Solo agents at 1-3 branch independents",
        core_pain="Writing descriptions takes 3 hours per week",
        existing_solutions="Copy-paste old listings, occasionally ChatGPT",
        notes="",
    )

    print("Running research agent...")
    evidence = await run_research_agent(context)

    print(f"\nCompetitors found: {len(evidence.competitors)}")
    for c in evidence.competitors:
        print(f"  - {c.name}: {c.pricing_found} ({c.pricing_url})")

    print(f"\nReddit quotes: {len(evidence.reddit_quotes)}")
    for q in evidence.reddit_quotes:
        print(f"  - [{q.upvotes} upvotes] \"{q.quote[:80]}...\"")
        print(f"    {q.thread_url}")

    print(f"\nAll sources: {evidence.all_sources}")
    print(f"\nPricing range: {evidence.pricing_range.low} – {evidence.pricing_range.high}")


asyncio.run(test())
