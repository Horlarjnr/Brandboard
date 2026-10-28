from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from sqlmodel import Session

from app.config import get_settings
from app.models import Generation, Project
from app.pipeline.context import GenerationContext
from app.pipeline.errors import PipelineError
from app.pipeline.steps import brief
from app.pipeline.steps.compose import compose_html, compose_svg
from app.pipeline.steps.sanitize import sanitize_html, sanitize_svg

logger = logging.getLogger(__name__)


async def run_generation_async(
    session: Session,
    generation_id: UUID,
    *,
    project: Project | None = None,
) -> GenerationContext:
    generation = session.get(Generation, generation_id)
    if generation is None:
        raise LookupError(f"Generation {generation_id} not found")

    project = project or session.get(Project, generation.project_id)
    if project is None:
        raise LookupError(f"Project for generation {generation_id} not found")

    context = GenerationContext(
        project_id=str(project.id),
        generation_id=str(generation.id),
        prompt=generation.prompt,
        width=generation.width,
        height=generation.height,
    )

    generation.status = "running"
    generation.step = "brief"
    session.add(generation)
    session.commit()
    session.refresh(generation)

    current_stage = "brief"
    try:
        spec = await brief.run(
            name=project.name,
            description=project.description,
            colors=project.colors,
            width=generation.width,
            height=generation.height,
            prompt=generation.prompt,
        )
        context.spec = spec
        generation.spec = spec.model_dump(mode="json")
        generation.step = "compose"
        current_stage = "compose"
        session.add(generation)
        session.commit()

        context.final_svg = compose_svg(
            spec=spec,
            colors=project.colors,
            width=generation.width,
            height=generation.height,
        )
        generation.html = sanitize_html(
            compose_html(
                spec=spec,
                brand_name=project.name,
                font=project.font,
                colors=project.colors,
                width=generation.width,
                height=generation.height,
            )
        )
        generation.step = "sanitize"
        current_stage = "sanitize"
        generation.svg = sanitize_svg(context.final_svg)
        generation.status = "done"
        generation.model = get_settings().model_brief
        session.add(generation)
        session.commit()
        session.refresh(generation)
        return context
    except PipelineError as exc:
        generation.status = "failed"
        generation.step = exc.stage
        generation.error_code = exc.code
        generation.error = exc.message
        session.add(generation)
        session.commit()
        session.refresh(generation)
        return context
    except Exception:  # pragma: no cover - defensive handling for queued tasks
        logger.exception("Generation %s failed during %s", generation_id, current_stage)
        generation.status = "failed"
        generation.step = current_stage
        generation.error_code = f"{current_stage}_failed"
        generation.error = "The banner could not be generated. Please try again."
        session.add(generation)
        session.commit()
        session.refresh(generation)
        return context


def process_generation(generation_id: UUID) -> None:
    from app.db import engine

    with Session(engine) as session:
        run_generation_sync(session, generation_id)


def run_generation_sync(
    session: Session,
    generation_id: UUID,
    *,
    project: Project | None = None,
) -> GenerationContext:
    return asyncio.run(run_generation_async(session, generation_id, project=project))
