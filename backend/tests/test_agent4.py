import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.agent4_critique import run_critique_agent
from models.schemas import (
    Offer, ICP,
    LandingPage, LandingPageHero, LandingPageProblem, ProblemPoint,
    LandingPageSolution, SolutionBenefit, VsSection, LandingPagePricing,
    LandingPageSource,
    GrowthPack, ColdEmail, Hook, Channel,
)

# --- Minimal mock data ---

offer = Offer(
    icp=ICP(
        who="Solo UK estate agents at 1-3 branch independents",
        pain="Writing listing descriptions takes 3 hours every Sunday",
        trigger="Just lost a vendor to a competitor with faster turnaround",
        evidence_source="r/ukestateagents thread: '3 hours every Sunday just on descriptions' (247 upvotes)",
    ),
    headline="Write Every Listing in 60 Seconds — or We Refund You",
    subheadline="AI listing copy for UK estate agents. Grounded in your local market.",
    outcome="Cut listing time by 50% in your first week",
    price="£49/mo",
    price_anchor="Competitors charge up to £149/mo (PropWrite Pro)",
    guarantee="If you don't cut listing time by 50% in 30 days, we refund and write your next 10 listings free.",
    bonuses=["Rightmove-optimised templates", "Tone control per property type"],
    urgency="Founding member pricing — first 50 agents only",
    cta="Start your free 7-day trial",
    competitor_gap="PropWrite has no multi-branch support and no tone control — we do both.",
    sources_used=["https://propwrite.com/pricing", "https://reddit.com/r/ukestateagents/comments/abc123"],
)

landing_page = LandingPage(
    slug="estate-agent-listing-ai",
    color_scheme="dark",
    hero=LandingPageHero(
        headline="Write Every Listing in 60 Seconds",
        subheadline="AI listing copy grounded in your local market. No generic fluff.",
        cta="Start free trial",
        cta_sub="No credit card · 60-second setup",
    ),
    problem=LandingPageProblem(
        headline="You're losing hours every week to copy-paste descriptions",
        points=[
            ProblemPoint(
                pain="3 hours every Sunday writing listing descriptions",
                stat="247 agents upvoted this complaint on Reddit",
                source="https://reddit.com/r/ukestateagents/comments/abc123",
            ),
        ],
    ),
    solution=LandingPageSolution(
        headline="60-second listings. Every time.",
        benefits=[
            SolutionBenefit(title="Evidence-grounded copy", body="Uses your local market data, not generic templates."),
        ],
    ),
    vs_section=VsSection(
        headline="Why agents switch from PropWrite",
        us=["Multi-branch support", "Tone control per property type"],
        them=["No multi-branch", "One tone fits all"],
    ),
    pricing=LandingPagePricing(
        price="£49/mo",
        anchor="PropWrite charges £149/mo",
        guarantee="50% time reduction in 30 days or full refund",
    ),
    sources=[
        LandingPageSource(label="Reddit: ukestateagents", url="https://reddit.com/r/ukestateagents/comments/abc123"),
        LandingPageSource(label="PropWrite pricing", url="https://propwrite.com/pricing"),
    ],
)

growth_pack = GrowthPack(
    cold_email=ColdEmail(
        subject="3 hours on Sunday descriptions?",
        body=(
            "I've been talking to solo agents across the UK and one thing keeps coming up: "
            "Sunday afternoons lost to writing listing descriptions.\n\n"
            "247 agents on r/ukestateagents said the same thing last month. "
            "That's time you could spend on valuations or viewings.\n\n"
            "Would it be worth a 10-minute call to see if we can get that back for you?"
        ),
        evidence_line="247 agents on r/ukestateagents complained about Sunday listing time",
        evidence_url="https://reddit.com/r/ukestateagents/comments/abc123",
        ps="PS — we're offering founding member pricing to the first 50 agents. £49/mo, cancel anytime.",
    ),
    linkedin_dm=(
        "Saw your agency on Rightmove — impressive portfolio. "
        "Quick question: how long does it take your team to write listing descriptions each week? "
        "Asking because I've been hearing a lot from agents about Sunday afternoons disappearing into copy."
    ),
    hooks=[
        Hook(
            platform="LinkedIn",
            hook="247 UK estate agents said the same thing about Sunday afternoons.",
            angle="Pain amplification via social proof",
            evidence_basis="r/ukestateagents thread with 247 upvotes on listing time complaint",
        ),
        Hook(
            platform="Twitter/X",
            hook="3 hours every Sunday. Just for listing descriptions. There's a fix.",
            angle="Specific time cost + implied solution",
            evidence_basis="Reddit quote: '3 hours every Sunday just on descriptions'",
        ),
        Hook(
            platform="cold email subject line",
            hook="3 hours on Sunday descriptions?",
            angle="Direct pain question",
            evidence_basis="Most upvoted pain point from r/ukestateagents",
        ),
    ],
    channel=Channel(
        pick="cold_email",
        why="Solo agents check email daily and respond to specific, evidence-backed outreach.",
        action="Send 10 personalised cold emails to solo agents in your target postcode today.",
    ),
)


async def test():
    print("--- Running Agent 4 Critique ---\n")
    chunk_count = 0
    async for chunk in run_critique_agent(offer, landing_page, growth_pack):
        print(chunk, end="", flush=True)
        chunk_count += 1
    print(f"\n\n--- {chunk_count} chunks received ---")


asyncio.run(test())
