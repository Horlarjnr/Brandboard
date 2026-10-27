from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str | None = Field(default=None, validation_alias="DATABASE_URL")
    database_host: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DB_HOST", "HOST"),
    )
    database_port: int = Field(
        default=5432,
        validation_alias=AliasChoices("DB_PORT", "PORT"),
    )
    database_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DB_NAME", "DATABASE"),
    )
    database_user: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DB_USER", "USER"),
    )
    database_password: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DB_PASSWORD", "PASSWORD"),
    )
    database_sslmode: str | None = Field(default=None, validation_alias="DB_SSLMODE")
    storage_root: str = Field(default="./storage", alias="STORAGE_ROOT")
    openrouter_api_key: str | None = Field(default=None, alias="OPENROUTER_API_KEY")
    model_brief: str = Field(default="", alias="MODEL_BRIEF")
    model_art: str = Field(default="", alias="MODEL_ART")
    generation_rate_limit: int = Field(default=10, alias="GENERATION_RATE_LIMIT", gt=0)
    daily_project_generation_cap: int = Field(
        default=50, alias="DAILY_PROJECT_GENERATION_CAP", gt=0
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def build_database_url(self) -> "Settings":
        if self.database_url and self.database_url.strip():
            self.database_url = self.database_url.strip()
            return self

        missing = [
            name
            for name, value in {
                "DB_HOST": self.database_host,
                "DB_NAME": self.database_name,
                "DB_USER": self.database_user,
                "DB_PASSWORD": self.database_password,
            }.items()
            if not value
        ]
        if missing:
            missing_values = ", ".join(missing)
            raise ValueError(
                f"Set DATABASE_URL or provide all component variables: {missing_values}"
            )

        credentials = (
            f"{quote_plus(self.database_user)}:{quote_plus(self.database_password)}"
        )
        self.database_url = (
            f"postgresql+psycopg://{credentials}@{self.database_host}:"
            f"{self.database_port}/{quote_plus(self.database_name)}"
        )
        if self.database_sslmode:
            self.database_url += f"?sslmode={quote_plus(self.database_sslmode)}"
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
