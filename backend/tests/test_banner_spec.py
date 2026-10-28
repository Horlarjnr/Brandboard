import pytest
from pydantic import ValidationError

from app.pipeline.spec import BannerSpec


def test_banner_spec_strips_markup_from_model_copy() -> None:
    spec = BannerSpec(
        layout="centered",
        headline="<b>Build Better</b>",
        subtext="Learn <script>alert(1)</script> every day",
        cta="<Click now>",
    )

    assert spec.headline == "bBuild Better/b"
    assert spec.subtext == "Learn scriptalert(1)/script every day"
    assert spec.cta == "Click now"


def test_banner_spec_rejects_oversized_headline() -> None:
    with pytest.raises(ValidationError):
        BannerSpec(
            layout="centered",
            headline="x" * 61,
            subtext="Valid supporting copy",
        )


def test_banner_spec_rejects_unknown_layout() -> None:
    with pytest.raises(ValidationError):
        BannerSpec(
            layout="custom",
            headline="Valid headline",
            subtext="Valid supporting copy",
        )
