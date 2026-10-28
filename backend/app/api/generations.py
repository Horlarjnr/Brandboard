from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Body, Depends, Header, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.projects import require_project
from app.db import get_session
from app.models import Generation, Project
from app.pipeline.runner import process_generation
from app.schemas import GenerationCreate, GenerationResponse
from app.utils.security import token_matches

router = APIRouter(tags=["generations"])


def validate_parent_generation(
    parent_id: UUID | None,
    project_id: UUID,
    session: Session,
) -> None:
    if parent_id is None:
        return

    parent = session.get(Generation, parent_id)
    if parent is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_parent_id",
                "message": "parent_id must reference an existing generation",
            },
        )
    if parent.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_parent_id",
                "message": "parent_id must reference a generation in the same project",
            },
        )


def commit_generation(session: Session, generation: Generation) -> None:
    session.add(generation)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if "generation_parent_id_fkey" in str(exc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "invalid_parent_id",
                    "message": "parent_id must reference an existing generation",
                },
            ) from exc
        raise


def require_generation_access(
    generation_id: UUID,
    x_project_token: str | None,
    session: Session,
) -> Generation:
    generation = session.get(Generation, generation_id)
    if generation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    project = session.get(Project, generation.project_id)
    if project is None or x_project_token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    if not token_matches(x_project_token, project.owner_token_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid project token",
        )
    return generation


@router.post(
    "/projects/{code}/generations",
    response_model=GenerationResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_generation(
    code: str,
    payload: GenerationCreate,
    background_tasks: BackgroundTasks,
    x_project_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Generation:
    project = require_project(code, x_project_token, session)
    existing = session.exec(
        select(Generation).where(
            Generation.project_id == project.id,
            Generation.request_id == payload.request_id,
        )
    ).one_or_none()
    if existing is not None:
        return existing

    validate_parent_generation(payload.parent_id, project.id, session)
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
    commit_generation(session, generation)
    session.refresh(generation)
    background_tasks.add_task(process_generation, generation.id)
    return generation


@router.get("/generations/{generation_id}", response_model=GenerationResponse)
def get_generation(
    generation_id: UUID,
    x_project_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Generation:
    return require_generation_access(generation_id, x_project_token, session)


@router.get("/projects/{code}/generations/{generation_id}", response_model=GenerationResponse)
def get_generation_for_project(
    code: str,
    generation_id: UUID,
    x_project_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Generation:
    project = require_project(code, x_project_token, session)
    generation = session.get(Generation, generation_id)
    if generation is None or generation.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    return generation


@router.post(
    "/generations/{generation_id}/regenerate",
    response_model=GenerationResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def regenerate_generation(
    generation_id: UUID,
    payload: GenerationCreate | None = Body(default=None),
    background_tasks: BackgroundTasks = None,
    x_project_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Generation:
    generation = require_generation_access(generation_id, x_project_token, session)
    new_payload = payload or GenerationCreate(
        request_id=f"regen-{generation_id}",
        prompt=generation.prompt,
        width=generation.width,
        height=generation.height,
        parent_id=generation.id,
    )
    child = Generation(
        project_id=generation.project_id,
        parent_id=generation.id,
        request_id=new_payload.request_id,
        prompt=new_payload.prompt,
        width=new_payload.width,
        height=new_payload.height,
        status="queued",
        step="brief",
    )
    commit_generation(session, child)
    session.refresh(child)
    if background_tasks is not None:
        background_tasks.add_task(process_generation, child.id)
    return child


@router.get("/generations/{generation_id}/download")
def download_generation(
    generation_id: UUID,
    x_project_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> dict[str, str | None]:
    generation = require_generation_access(generation_id, x_project_token, session)
    return {
        "html": generation.html,
        "svg": generation.svg,
        "status": generation.status,
    }
