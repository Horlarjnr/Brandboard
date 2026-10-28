import pytest

from app.pipeline.spec import BannerSpec
from app.pipeline.steps.brief import parse_banner_spec
from app.pipeline.steps.compose import compose_html, compose_svg
from app.pipeline.steps.sanitize import sanitize_html, sanitize_svg


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


def test_html_composer_matches_frontend_canvas_contract() -> None:
    spec = BannerSpec(
        layout="image_right",
        brand_label="Balotly",
        badge="NEW FEATURE",
        headline="Award voting is live.",
        highlight="is live.",
        subtext="Voters pay for their votes and cast up to 10 at a time.",
        cta="Create yours",
        art_prompt="A mobile voting card",
    )

    document = compose_html(
        spec=spec,
        brand_name="Fallback",
        font="Inter",
        colors={"primary": "#065F46", "accent": "#FBBF24", "tertiary": "#F0FDF4"},
        width=1080,
        height=1080,
    )
    safe = sanitize_html(document)

    assert 'meta name="canvas" content="1080x1080"' in safe
    assert 'class="canvas"' in safe
    assert "Award" in safe
    assert "is live." in safe
    assert 'class="art"' in safe
    assert "<script" not in safe


def test_banner_parser_rejects_prose_and_accepts_json() -> None:
    with pytest.raises(ValueError, match="JSON object"):
        parse_banner_spec("Here is a flyer concept for November.")

    spec = parse_banner_spec(
        '{"layout":"centered","headline":"Hello November",'
        '"subtext":"New month. New goals.","tone":"friendly"}'
    )
    assert spec.headline == "Hello November"
