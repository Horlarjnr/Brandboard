from __future__ import annotations

import asyncio
from uuid import UUID

from sqlmodel import Session

from app.config import get_settings
from app.models import Generation, Project
from app.pipeline.context import GenerationContext
from app.pipeline.steps import brief
from app.pipeline.steps.compose import compose_svg
from app.pipeline.steps.sanitize import sanitize_svg


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
        session.add(generation)
        session.commit()

        context.final_svg = compose_svg(
            spec=spec,
            colors=project.colors,
            width=generation.width,
            height=generation.height,
        )
        generation.step = "sanitize"
        generation.svg = sanitize_svg(context.final_svg)
        generation.status = "done"
        generation.model = get_settings().model_brief
        session.add(generation)
        session.commit()
        session.refresh(generation)
        return context
    except Exception as exc:  # pragma: no cover - defensive handling for queued tasks
        generation.status = "failed"
        generation.step = "brief"
        generation.error = str(exc)
        session.add(generation)
        session.commit()
        session.refresh(generation)
        raise


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
