from html import escape

from app.pipeline.spec import BannerSpec


def compose_svg(
    *,
    spec: BannerSpec,
    colors: dict[str, str],
    width: int,
    height: int,
) -> str:
    primary = escape(colors.get("primary", "#111827"), quote=True)
    accent = escape(colors.get("accent", "#6366F1"), quote=True)
    background = escape(colors.get("tertiary", "#F8FAFC"), quote=True)
    headline = escape(spec.headline)
    subtext = escape(spec.subtext)
    eyebrow = escape(spec.eyebrow or "")
    cta = escape(spec.cta or "")

    eyebrow_markup = (
        f'<text x="72" y="94" fill="{accent}" font-size="24" '
        f'font-family="Arial, sans-serif">{eyebrow}</text>'
        if eyebrow
        else ""
    )
    cta_markup = (
        f'<rect x="72" y="{height - 150}" width="190" height="58" rx="29" fill="{accent}"/>'
        f'<text x="167" y="{height - 113}" text-anchor="middle" fill="#ffffff" '
        f'font-size="22" font-family="Arial, sans-serif">{cta}</text>'
        if cta
        else ""
    )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-label="{headline}">'
        f'<rect width="{width}" height="{height}" fill="{background}"/>'
        f'<rect x="{width - 300}" width="300" height="{height}" fill="{primary}" opacity="0.08"/>'
        f"{eyebrow_markup}"
        f'<text x="72" y="190" fill="{primary}" font-size="64" font-weight="700" '
        f'font-family="Arial, sans-serif">{headline}</text>'
        f'<text x="72" y="260" fill="{primary}" font-size="28" '
        f'font-family="Arial, sans-serif">{subtext}</text>'
        f"{cta_markup}</svg>"
    )
