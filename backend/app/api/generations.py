from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session, select

from app.api.projects import require_project
from app.db import get_session
from app.models import Generation, Project
from app.schemas import GenerationCreate, GenerationResponse

router = APIRouter(prefix="/generations", tags=["generations"])


@router.post("", response_model=GenerationResponse, status_code=status.HTTP_202_ACCEPTED)
def create_generation(
    payload: GenerationCreate,
    project_code: str,
    x_project_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Generation:
    project = require_project(project_code, x_project_token, session)
    existing = session.exec(
        select(Generation).where(
            Generation.project_id == project.id,
            Generation.request_id == payload.request_id,
        )
    ).one_or_none()
    if existing is not None:
        return existing

    generation = Generation(
        project_id=project.id,
        parent_id=payload.parent_id,
        request_id=payload.request_id,
        prompt=payload.prompt,
        width=payload.width,
        height=payload.height,
        status="queued",
        step="brief",
    )
    session.add(generation)
    session.commit()
    session.refresh(generation)
    return generation


@router.get("/{generation_id}", response_model=GenerationResponse)
def get_generation(
    generation_id: UUID,
    project_code: str,
    x_project_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Generation:
    project = require_project(project_code, x_project_token, session)
    generation = session.get(Generation, generation_id)
    if generation is None or generation.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    return generation
