import asyncio
import httpx


async def test_intake():
    base = "http://localhost:8000"
    session_id = None

    messages = [
        "I run a small estate agency in London and want to build an AI tool for writing property listings",
        "We mainly work with residential properties, targeting solo agents",
        "The main pain is it takes 3 hours per week to write descriptions",
        "Currently we just copy-paste old listings or use ChatGPT manually",
    ]

    for msg in messages:
        resp = httpx.post(
            f"{base}/intake/message",
            json={"session_id": session_id, "message": msg},
        )
        data = resp.json()
        session_id = data["session_id"]
        print(f"Reply: {data['reply'][:100]}...")
        print(f"Complete: {data['complete']}")
        if data["complete"]:
            print(f"Context: {data['context']}")
            break

    print("\nDone.")


asyncio.run(test_intake())
