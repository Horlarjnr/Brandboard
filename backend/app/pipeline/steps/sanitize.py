from __future__ import annotations

from xml.etree import ElementTree

ALLOWED_TAGS = {"svg", "rect", "text", "path", "circle", "g"}
ALLOWED_ATTRIBUTES = {
    "aria-label",
    "fill",
    "font-family",
    "font-size",
    "font-weight",
    "height",
    "opacity",
    "role",
    "rx",
    "stroke",
    "stroke-width",
    "text-anchor",
    "viewBox",
    "width",
    "x",
    "y",
}


def sanitize_svg(svg: str) -> str:
    try:
        root = ElementTree.fromstring(svg)
    except ElementTree.ParseError as exc:
        raise ValueError("Generated SVG is not valid XML") from exc

    root_tag = root.tag.rsplit("}", 1)[-1]
    if root_tag != "svg":
        raise ValueError("Generated markup must have an SVG root")

    root.set("xmlns", "http://www.w3.org/2000/svg")
    for element in root.iter():
        tag = element.tag.rsplit("}", 1)[-1]
        if tag not in ALLOWED_TAGS:
            raise ValueError(f"Unsafe SVG element: {tag}")
        element.tag = tag
        for attribute in list(element.attrib):
            name = attribute.rsplit("}", 1)[-1]
            value = element.attrib[attribute]
            if name not in ALLOWED_ATTRIBUTES and not (
                element is root and name == "xmlns"
            ):
                del element.attrib[attribute]
                continue
            if any(marker in value.lower() for marker in ("javascript:", "data:", "url(")):
                raise ValueError("Unsafe SVG attribute value")
            if name == "fill" and value.lower() == "none":
                element.attrib[name] = value
            else:
                element.attrib[name] = value
            if attribute != name:
                del element.attrib[attribute]

    return ElementTree.tostring(root, encoding="unicode", short_empty_elements=True)
