from typing import Any, Literal

from langchain_openai import ChatOpenAI

from app.config import get_settings

LLMRole = Literal["brief", "art"]


def get_llm(role: LLMRole, **kwargs: Any) -> ChatOpenAI:
    settings = get_settings()
    model = {
        "brief": settings.model_brief,
        "art": settings.model_art,
    }[role]

    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY must be configured before using the LLM")
    if not model:
        raise RuntimeError(f"MODEL_{role.upper()} must be configured before using the LLM")

    return ChatOpenAI(
        model=model,
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
        temperature=kwargs.get("temperature", 0.7),
        timeout=60,
        max_retries=2,
    )
