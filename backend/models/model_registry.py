REGISTRY = {
    "claude-sonnet-4-6": {
        "supports_web_search": True,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": [],
    },
    "claude-haiku-4-5": {
        "supports_web_search": False,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": ["research"],
    },
    "gpt-4o": {
        "supports_web_search": True,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": [],
    },
    "gpt-4o-mini": {
        "supports_web_search": True,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": [],
    },
    "deepseek-v3": {
        "supports_web_search": False,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": ["research"],
    },
    "deepseek-r1": {
        "supports_web_search": False,
        "supports_structured": False,
        "blocked_agents": ["research", "offer", "builder", "growth"],
    },
}

DEFAULTS = {
    "research": "claude-sonnet-4-6",
    "offer":    "claude-haiku-4-5",
    "builder":  "claude-haiku-4-5",
    "growth":   "claude-haiku-4-5",
    "critique": "claude-haiku-4-5",
}


def resolve_model(agent: str, model_id: str | None) -> str:
    """
    Returns model_id if it exists in REGISTRY and is not blocked for this agent.
    Falls back to DEFAULTS[agent] with a print warning otherwise.
    """
    if model_id is None:
        return DEFAULTS[agent]

    if model_id not in REGISTRY:
        print(f"WARNING: Unknown model '{model_id}' for agent '{agent}', falling back to {DEFAULTS[agent]}")
        return DEFAULTS[agent]

    if agent in REGISTRY[model_id]["blocked_agents"]:
        print(f"WARNING: Model '{model_id}' is blocked for agent '{agent}', falling back to {DEFAULTS[agent]}")
        return DEFAULTS[agent]

    return model_id
