import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import EnrichedContext, Evidence, Competitor, RedditQuote, PricingRange
from agents.agent1_offer import run_offer_agent


async def test():
    context = EnrichedContext(
        idea="AI tool for writing property listings",
        niche="UK residential estate agents",
        target_customer="Solo agents at 1-3 branch independents",
        core_pain="Writing descriptions takes 3 hours per week",
        existing_solutions="Copy-paste old listings, occasionally ChatGPT",
        notes=""
    )
    evidence = Evidence(
        competitors=[
            Competitor(
                name="PropWrite",
                url="https://propwrite.com",
                pricing_found="£49/mo starter · £149/mo pro",
                pricing_url="https://propwrite.com/pricing",
                weakness="No multi-branch support, UK-only, no tone control"
            )
        ],
        reddit_quotes=[
            RedditQuote(
                quote="I spend half my Sunday writing up listings. It's the most soul-destroying part of the job.",
                subreddit="ukestateagents",
                upvotes="247",
                thread_url="https://reddit.com/r/ukestateagents/comments/abc123"
            )
        ],
        market_signals=[],
        pricing_range=PricingRange(
            low="£29/mo",
            high="£149/mo",
            insight="Market is price-sensitive, most agents are solo operators"
        ),
        all_sources=[
            "https://propwrite.com/pricing",
            "https://reddit.com/r/ukestateagents/comments/abc123"
        ]
    )
    principles = []

    print("Running offer agent...")
    offer = await run_offer_agent(context, evidence, principles)
    print(f"\nHeadline: {offer.headline}")
    print(f"ICP who: {offer.icp.who}")
    print(f"ICP pain: {offer.icp.pain}")
    print(f"ICP evidence_source: {offer.icp.evidence_source}")
    print(f"Price: {offer.price}")
    print(f"Price anchor: {offer.price_anchor}")
    print(f"Guarantee: {offer.guarantee}")
    print(f"CTA: {offer.cta}")
    print(f"Sources used: {offer.sources_used}")


asyncio.run(test())
