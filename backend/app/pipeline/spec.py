from typing import Literal

from pydantic import BaseModel, Field, field_validator


def strip_markup(value: str) -> str:
    cleaned = value.replace("<", "").replace(">", "")
    return " ".join(cleaned.split())


class BannerSpec(BaseModel):
    layout: Literal["split_hero", "centered", "image_right", "text_only"]
    eyebrow: str | None = Field(default=None, max_length=40)
    headline: str = Field(min_length=1, max_length=60)
    subtext: str = Field(min_length=1, max_length=140)
    cta: str | None = Field(default=None, max_length=24)
    art_prompt: str | None = Field(default=None, max_length=500)
    tone: Literal["bold", "friendly", "minimal", "premium"] = "bold"

    @field_validator("eyebrow", "headline", "subtext", "cta", "art_prompt")
    @classmethod
    def remove_markup(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return strip_markup(value)
