import pytest

from app.pipeline.spec import BannerSpec
from app.pipeline.steps.compose import compose_svg
from app.pipeline.steps.sanitize import sanitize_svg


def test_composer_escapes_banner_copy() -> None:
    spec = BannerSpec(
        layout="centered",
        headline="<Launch>",
        subtext="Learn & build",
        cta="Start now",
    )

    svg = compose_svg(
        spec=spec,
        colors={"primary": "#111827", "accent": "#6366F1", "tertiary": "#F8FAFC"},
        width=1080,
        height=1080,
    )

    assert "Launch" in svg
    assert "<Launch>" not in svg
    assert "Learn &amp; build" in svg


def test_sanitizer_rejects_scripts_and_external_urls() -> None:
    with pytest.raises(ValueError, match="Unsafe SVG element"):
        sanitize_svg('<svg><script>alert("x")</script></svg>')

    with pytest.raises(ValueError, match="Unsafe SVG attribute value"):
        sanitize_svg('<svg><rect fill="url(https://example.com)"/></svg>')


def test_sanitizer_returns_safe_svg() -> None:
    safe = sanitize_svg(
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" onclick="bad"/></svg>'
    )

    assert "<script" not in safe
    assert "onclick" not in safe
    assert 'xmlns="http://www.w3.org/2000/svg"' in safe
    assert "<rect" in safe
