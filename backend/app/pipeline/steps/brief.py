import json
import re
from pathlib import Path
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from app.llm.client import get_llm
from app.pipeline.errors import PipelineError
from app.pipeline.spec import BannerSpec

PROMPT_PATH = Path(__file__).parents[2] / "llm" / "prompts" / "brief.md"
BRIEF_SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

brief_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", BRIEF_SYSTEM_PROMPT),
        (
            "human",
            (
                "Brand name: {name}\n"
                "Brand description: {description}\n"
                "Brand colors: {colors}\n"
                "Requested size: {width}x{height}\n"
                "Banner request: {prompt}"
            ),
        ),
    ]
)


async def run(
    *,
    name: str,
    description: str,
    colors: dict[str, str],
    width: int,
    height: int,
    prompt: str,
) -> BannerSpec:
    try:
        model = get_llm("brief")
    except RuntimeError as exc:
        raise PipelineError(
            "llm_configuration",
            "The AI service is not configured. Please try again later.",
            stage="brief",
        ) from exc
    values = {
        "name": name,
        "description": description,
        "colors": colors,
        "width": width,
        "height": height,
        "prompt": prompt,
    }
    messages = brief_prompt.invoke(values).to_messages()
    last_error: Exception | None = None

    for attempt in range(2):
        try:
            if attempt:
                messages = [
                    *messages,
                    (
                        "human",
                        (
                            "Your previous response was not valid JSON. Return only one JSON "
                            "object matching BannerSpec. No Markdown, prose, or code fences."
                        ),
                    ),
                ]
            result: Any = await model.ainvoke(messages)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            continue
        try:
            return parse_banner_spec(result.content)
        except (TypeError, ValueError) as exc:
            last_error = exc

    raise PipelineError(
        "llm_invalid_output",
        "The AI did not return a valid banner plan. Please try again.",
        stage="brief",
    ) from last_error


def parse_banner_spec(content: Any) -> BannerSpec:
    if not isinstance(content, str):
        raise TypeError("AI response content was not text")

    match = re.search(r"\{.*\}", content, flags=re.DOTALL)
    if match is None:
        raise ValueError("AI response did not contain a JSON object")

    try:
        payload = json.loads(match.group(0))
        return BannerSpec.model_validate(payload)
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise ValueError("AI response was not valid BannerSpec JSON") from exc
