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
