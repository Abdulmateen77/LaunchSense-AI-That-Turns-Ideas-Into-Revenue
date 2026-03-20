class Retriever:
    def retrieve(self, idea: str, audience: str, notes: str | None = None) -> list[str]:
        return [
            "A strong offer focuses on a narrow ICP with an urgent painful problem.",
            "Risk reversal improves conversion by reducing perceived downside.",
            "Bonuses should solve objections or increase speed to value.",
            "Urgency should be credible and tied to timing or opportunity cost.",
            "The offer should promise a concrete business outcome, not vague improvement."
        ]