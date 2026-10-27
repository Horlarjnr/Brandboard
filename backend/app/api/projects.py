from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import Project
from app.schemas import ProjectCreate, ProjectCreatedResponse, ProjectResponse, ProjectUpdate
from app.utils.ids import generate_owner_token, generate_project_code
from app.utils.security import hash_token, token_matches

router = APIRouter(prefix="/projects", tags=["projects"])


def require_project(
    code: str,
    x_project_token: str | None,
    session: Session,
) -> Project:
    project = session.exec(select(Project).where(Project.code == code)).one_or_none()
    if project is None or x_project_token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    if not token_matches(x_project_token, project.owner_token_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid project token",
        )
    return project


@router.post("", response_model=ProjectCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    session: Session = Depends(get_session),
) -> ProjectCreatedResponse:
    owner_token = generate_owner_token()
    project = Project(
        code=generate_project_code(),
        owner_token_hash=hash_token(owner_token),
        name=payload.name,
        description=payload.description,
        colors=payload.colors,
        font=payload.font,
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return ProjectCreatedResponse.model_validate(
        {**project.model_dump(), "owner_token": owner_token}
    )


@router.get("/{code}", response_model=ProjectResponse)
def get_project(
    code: str,
    x_project_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Project:
    return require_project(code, x_project_token, session)


@router.patch("/{code}", response_model=ProjectResponse)
def update_project(
    code: str,
    payload: ProjectUpdate,
    x_project_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Project:
    project = require_project(code, x_project_token, session)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project
