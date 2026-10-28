import asyncio

from app.pipeline.errors import PipelineError
from app.pipeline.steps.brief import run


async def main() -> None:
    try:
        spec = await run(
            name="BrandBoard",
            description="A creative brand",
            colors={"primary": "#064E3B", "accent": "#FBBF24", "tertiary": "#F0FDF4"},
            width=1080,
            height=1080,
            prompt="A Twitter post flyer for happy new month (November)",
        )
    except PipelineError as exc:
        print(f"generation failed: [{exc.code}] {exc.message}")
        return
    print(spec.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())
