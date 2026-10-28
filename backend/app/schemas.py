from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    colors: dict[str, str] = Field(min_length=1, max_length=3)
    font: str = Field(default="Inter", min_length=1, max_length=80)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    colors: dict[str, str] | None = Field(default=None, min_length=1, max_length=3)
    font: str | None = Field(default=None, min_length=1, max_length=80)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    description: str
    colors: dict[str, str]
    font: str
    created_at: datetime


class ProjectCreatedResponse(ProjectResponse):
    owner_token: str


class GenerationCreate(BaseModel):
    request_id: str = Field(min_length=1, max_length=120)
    prompt: str = Field(min_length=1, max_length=2000)
    width: int = Field(default=1080, ge=1)
    height: int = Field(default=1080, ge=1)
    parent_id: UUID | None = None


class GenerationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    parent_id: UUID | None
    version_no: int
    request_id: str
    prompt: str
    width: int
    height: int
    status: str
    step: str | None
    spec: dict | None
    svg: str | None
    model: str | None
    tokens_in: int | None
    tokens_out: int | None
    error: str | None
    created_at: datetime
