from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    code: str = Field(unique=True, index=True, max_length=16)
    owner_token_hash: str = Field(max_length=64)
    name: str = Field(max_length=120)
    description: str = Field(max_length=2000)
    colors: dict[str, str] = Field(sa_column=Column(JSON, nullable=False))
    font: str = Field(default="Inter", max_length=80)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
