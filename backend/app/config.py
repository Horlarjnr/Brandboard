from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(
        default="postgresql+psycopg://postgres:password@localhost:5432/brandboard",
        alias="DATABASE_URL",
    )
    storage_root: str = Field(default="./storage", alias="STORAGE_ROOT")
    openrouter_api_key: str | None = Field(default=None, alias="OPENROUTER_API_KEY")
    model_brief: str = Field(default="", alias="MODEL_BRIEF")
    model_art: str = Field(default="", alias="MODEL_ART")
    generation_rate_limit: int = Field(default=10, alias="GENERATION_RATE_LIMIT", gt=0)
    daily_project_generation_cap: int = Field(
        default=50, alias="DAILY_PROJECT_GENERATION_CAP", gt=0
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
