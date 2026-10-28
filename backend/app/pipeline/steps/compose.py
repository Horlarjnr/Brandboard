import re
from html import escape

from app.pipeline.spec import BannerSpec

HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _color(colors: dict[str, str], name: str, fallback: str) -> str:
    value = colors.get(name, fallback)
    return value if HEX_COLOR.fullmatch(value) else fallback


def compose_svg(
    *,
    spec: BannerSpec,
    colors: dict[str, str],
    width: int,
    height: int,
) -> str:
    primary = escape(_color(colors, "primary", "#111827"), quote=True)
    accent = escape(_color(colors, "accent", "#6366F1"), quote=True)
    background = escape(_color(colors, "tertiary", "#F8FAFC"), quote=True)
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


def compose_html(
    *,
    spec: BannerSpec,
    brand_name: str,
    font: str,
    colors: dict[str, str],
    width: int,
    height: int,
) -> str:
    primary = escape(_color(colors, "primary", "#064E3B"), quote=True)
    accent = escape(_color(colors, "accent", "#10B981"), quote=True)
    background = escape(_color(colors, "tertiary", "#F0FDF4"), quote=True)
    brand = escape(spec.brand_label or brand_name)
    eyebrow = escape(spec.eyebrow or spec.badge or "")
    headline = escape(spec.headline)
    subtext = escape(spec.subtext)
    cta = escape(spec.cta or "")
    highlight = escape(spec.highlight or "")
    safe_font = escape(re.sub(r"[^a-zA-Z0-9 ,_-]", "", font or "Inter"), quote=True)

    eyebrow_markup = (
        f'<span class="pill"><i></i>{eyebrow}</span>' if eyebrow else ""
    )
    highlight_markup = (
        f'<span class="mk">{highlight}</span>' if highlight else ""
    )
    headline_markup = headline.replace(
        escape(spec.highlight or ""), highlight_markup
    ) if highlight else headline
    cta_markup = f'<div class="cta">{cta}</div>' if cta else ""
    art_markup = "" if spec.layout == "text_only" else _artwork_svg(primary, accent)

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="canvas" content="{width}x{height}">
<style>
*{{box-sizing:border-box;margin:0}}
body{{margin:0}}
.canvas{{width:{width}px;height:{height}px;overflow:hidden;position:relative;background:{background};color:{primary};font-family:{safe_font},Inter,system-ui,sans-serif;padding:64px 72px}}
.bg{{position:absolute;right:-90px;top:150px;width:700px;height:700px;border-radius:50%;background:{accent};opacity:.16}}
.txt{{position:relative;width:52%;height:100%;display:flex;flex-direction:column;justify-content:space-between}}
.brand{{font-size:42px;font-weight:700;color:{primary}}}
.pill{{display:inline-flex;align-items:center;gap:10px;white-space:nowrap;background:{primary};color:{background};font-size:24px;font-weight:700;letter-spacing:.14em;padding:11px 24px;border-radius:99px}}
.pill i{{width:12px;height:12px;border-radius:50%;background:{accent}}}
h1{{margin-top:26px;font-size:clamp(54px,8vw,104px);line-height:.96;letter-spacing:-.035em;color:{primary}}}
.mk{{background:linear-gradient(transparent 62%,{accent} 62% 90%,transparent 90%);padding:0 8px;margin:0 -8px}}
.sub{{margin-top:22px;max-width:480px;font-size:28px;line-height:1.4;color:{primary};opacity:.82}}
.cta{{align-self:flex-start;white-space:nowrap;background:{primary};color:#fff;font-size:27px;font-weight:700;padding:18px 32px;border-radius:99px}}
.art{{position:absolute;right:56px;top:18%;width:43%;transform:rotate(4deg)}}
</style></head><body><main class="canvas">
<div class="bg"></div><section class="txt">
<div class="brand">{brand}</div><div>{eyebrow_markup}<h1>{headline_markup}</h1>
<p class="sub">{subtext}</p></div>{cta_markup}</section>{art_markup}
</main></body></html>"""


def _artwork_svg(primary: str, accent: str) -> str:
    return f"""<svg class="art" viewBox="0 0 520 760" aria-hidden="true">
<rect x="30" y="10" width="460" height="740" rx="64" fill="{primary}"/>
<rect x="48" y="28" width="424" height="704" rx="48" fill="#fff"/>
<rect x="80" y="170" width="360" height="250" rx="28" fill="{accent}" opacity=".22"/>
<circle cx="260" cy="252" r="52" fill="{accent}"/>
<circle cx="260" cy="238" r="18" fill="{primary}"/>
<path d="M222 296c4-24 20-34 38-34s34 10 38 34z" fill="{primary}"/>
<rect x="80" y="584" width="360" height="86" rx="43" fill="{primary}"/>
<circle cx="478" cy="300" r="30" fill="{accent}" stroke="{primary}" stroke-width="6"/>
</svg>"""
