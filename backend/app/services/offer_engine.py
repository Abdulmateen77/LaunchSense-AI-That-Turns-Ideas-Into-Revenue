from app.models.schemas import OfferInput, OfferOutput
from app.services.retriever import Retriever
from app.services.prompt_builder import PromptBuilder
from app.services.llm_service import LLMService

class OfferEngine:
    def __init__(self):
        self.retriever = Retriever()
        self.prompt_builder = PromptBuilder()
        self.llm_service = LLMService()

    async def generate(self, payload: OfferInput) -> OfferOutput:
        retrieved_context = self.retriever.retrieve(
            idea=payload.idea,
            audience=payload.audience,
            notes=payload.notes,
        )

        prompt = self.prompt_builder.build_offer_prompt(payload, retrieved_context)

        raw_output = await self.llm_service.generate_json(prompt)

        return OfferOutput.model_validate(raw_output)