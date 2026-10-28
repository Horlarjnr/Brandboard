from dataclasses import dataclass, field
from typing import Any

from app.pipeline.spec import BannerSpec


@dataclass
class GenerationContext:
    project_id: str | None = None
    generation_id: str | None = None
    prompt: str = ""
    width: int = 1080
    height: int = 1080
    spec: BannerSpec | None = None
    art_svg: str | None = None
    final_svg: str | None = None
    png_bytes: bytes | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
