from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    code: str = Field(unique=True, index=True, max_length=16)
    owner_token_hash: str = Field(max_length=64)
    name: str = Field(max_length=120)
    description: str = Field(max_length=2000)
    colors: dict[str, str] = Field(sa_column=Column(JSON, nullable=False))
    font: str = Field(default="Inter", max_length=80)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)


class Generation(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="project.id", index=True)
    parent_id: UUID | None = Field(default=None, foreign_key="generation.id")
    version_no: int = Field(default=1, ge=1)
    request_id: str = Field(index=True, max_length=120)
    prompt: str = Field(max_length=2000)
    width: int = Field(default=1080, ge=1)
    height: int = Field(default=1080, ge=1)
    status: str = Field(default="queued", max_length=20)
    step: str | None = Field(default=None, max_length=40)
    spec: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    html: str | None = Field(default=None)
    svg: str | None = Field(default=None)
    model: str | None = Field(default=None, max_length=80)
    tokens_in: int | None = Field(default=None, ge=0)
    tokens_out: int | None = Field(default=None, ge=0)
    error_code: str | None = Field(default=None, max_length=60)
    error: str | None = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("project_id", "request_id"),)
