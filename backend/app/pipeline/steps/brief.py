from pathlib import Path
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from app.llm.client import get_llm
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
    chain = brief_prompt | get_llm("brief").with_structured_output(BannerSpec)
    result: Any = await chain.ainvoke(
        {
            "name": name,
            "description": description,
            "colors": colors,
            "width": width,
            "height": height,
            "prompt": prompt,
        }
    )
    return BannerSpec.model_validate(result)
