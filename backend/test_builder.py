# backend/test_builder.py

import asyncio

from models.schemas import (
    Offer, ICP, Evidence, Competitor,
    RedditQuote, PricingRange, MarketSignal
)
from agents.agent2_builder import run_builder_agent


async def test():
    offer = Offer(
        icp=ICP(
            who="Solo letting agents managing 20-80 properties in the UK",
            pain="Lose inbound enquiries when they don't reply within minutes",
            trigger="Just lost a tenant to a faster competitor",
            evidence_source="Reddit r/LandlordUK — agents complain daily about missing leads"
        ),
        headline="Never lose a letting enquiry again — reply in 30 seconds automatically",
        subheadline="Solo letting agents using this stop losing tenants to faster competitors from day one",
        outcome="Every Rightmove and Zoopla enquiry gets a personalised reply within 30 seconds",
        price="£79/mo",
        price_anchor="Competitors charge £99–£149/mo",
        guarantee="If you miss a single enquiry in your first 30 days we refund everything",
        bonuses=["Done-for-you Rightmove integration", "30-day lead recovery audit"],
        urgency="Every week without this costs you 3 missed enquiries at £1,200 commission each",
        cta="Start recovering leads today",
        competitor_gap="Only tool built specifically for solo letting agents under 80 properties",
        sources_used=["https://reddit.com/r/LandlordUK"]
    )

    evidence = Evidence(
        competitors=[
            Competitor(name="LeadPro", url="https://leadpro.io", pricing_found="£99/mo",
                       weakness="Targets large agencies, too complex for solo agents"),
            Competitor(name="PropertyFlow AI", url="https://propertyflow.ai", pricing_found="£149/mo",
                       weakness="No Rightmove integration, requires manual setup"),
        ],
        reddit_quotes=[
            RedditQuote(
                quote="I lose enquiries if I'm not glued to my phone. By the time I see it they've gone elsewhere.",
                subreddit="LandlordUK", upvotes="847",
                thread_url="https://reddit.com/r/LandlordUK/comments/example"
            ),
        ],
        market_signals=[
            MarketSignal(
                signal="Response time under 5 minutes increases conversion by 80%",
                source="https://www.rightmove.co.uk/news/articles/property-news/lead-response"
            )
        ],
        pricing_range=PricingRange(low="£49", high="£149",
                                   insight="Solo agents price-sensitive but will pay for proven ROI"),
        all_sources=[
            "https://reddit.com/r/LandlordUK/comments/example",
            "https://leadpro.io",
            "https://propertyflow.ai",
            "https://www.rightmove.co.uk/news/articles/property-news/lead-response"
        ]
    )

    print("Running Agent 2...")
    print()

    landing_page = await run_builder_agent(offer, evidence)
    payload = landing_page.model_dump()
    slug = landing_page.slug

    # Write JSON to frontend public folder — Vite serves it as a static file
    import json
    from pathlib import Path

    out_path = Path(__file__).parent.parent / "frontend" / "public" / "preview" / f"{slug}.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print("SUCCESS — LandingPage generated")
    print()
    print(f"🌐  http://localhost:5173/preview/{slug}")
    print()
    print("Open the link above in your browser.")


asyncio.run(test())
