# backend/test_rag.py
import asyncio
from models.schemas import EnrichedContext, Evidence
from services.rag_client import get_principles

async def test():
    context = EnrichedContext(
        idea="AI tool that replies to property leads instantly for UK letting agents",
        niche="UK residential lettings",
        target_customer="Solo letting agents managing 20-80 properties",
        core_pain="Lose leads when they don't reply within minutes to Rightmove enquiries",
        existing_solutions="Manual WhatsApp follow-up and basic CRM reminders",
    )
    evidence = Evidence()
    principles = await get_principles(context, evidence)
    print(f"Got {len(principles)} principles:\n")
    for p in principles:
        print(f"[{p['category'].upper()}]")
        print(f"{p['principle']}")
        print()

asyncio.run(test())
