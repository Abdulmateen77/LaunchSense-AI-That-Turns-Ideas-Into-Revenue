from schemas import PrincipleItem

def format_principles(raw_chunks: list[dict]) -> tuple[list[PrincipleItem], str]:
    items = []
    for chunk in raw_chunks:
        # The document is "Title. Full text." — extract just the core principle
        # (first sentence after the title dot, or the whole text if short)
        full_text = chunk["document"]
        title = chunk["title"]

        # Strip the title from the front if it was prepended during ingest
        if full_text.startswith(title + "."):
            principle_text = full_text[len(title) + 1:].strip()
        else:
            principle_text = full_text.strip()

        # Truncate to first 2 sentences for the precontext bullet
        sentences = principle_text.split(". ")
        short = ". ".join(sentences[:2]).rstrip(".") + "."

        items.append(PrincipleItem(
            title=title,
            category=chunk["category"],
            principle=short,
            relevance_score=chunk["relevance_score"],
        ))

    # Build the precontext block for Agent 1
    precontext_lines = ["Strategic principles (apply these when constructing the offer):"]
    for item in items:
        precontext_lines.append(f"- [{item.category.upper()}] {item.principle}")

    precontext = "\n".join(precontext_lines)

    return items, precontext