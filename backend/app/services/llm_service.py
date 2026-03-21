import json
from openai import AsyncOpenAI
from app.core.config import settings

class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.MODEL_NAME

    async def generate_json(self, prompt: str) -> dict:
        response = await self.client.responses.create(
            model=self.model,
            input=prompt
        )

        text = response.output_text
        return json.loads(text)