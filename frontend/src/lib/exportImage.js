// Browser-side export. The backend only returns markup; PNG/JPEG is made here.
// Works for SVG markup. If the backend later returns full HTML instead of SVG,
// swap rasterize() for the html-to-image package (npm i html-to-image).
import { fontStylesheetUrl } from './fonts.js'

export function isSvgMarkup(markup) {
  return typeof markup === 'string' && markup.trimStart().startsWith('<svg')
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

// An SVG drawn as an image cannot load web fonts, so the banner would fall back
// to a default font. To keep the brand font in the exported file, fetch the
// font from Google, embed it in the SVG as base64, and cache the result.
const fontCache = new Map()

async function buildFontCss(family) {
  const res = await fetch(fontStylesheetUrl(family))
  if (!res.ok) throw new Error('Font stylesheet unavailable')
  const css = await res.text()
  // Keep only the Latin subset; the other subsets add many large files.
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)]
  const latin = blocks.filter((m) => m[1] === 'latin').map((m) => m[2])
  let out = latin.length ? latin.join('\n') : css
  const urls = [...new Set([...out.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))]
  for (const u of urls) {
    const r = await fetch(u)
    if (!r.ok) throw new Error('Font file unavailable')
    out = out.split(u).join(await toDataUrl(await r.blob()))
  }
  return out
}

function fontCss(family) {
  if (!fontCache.has(family)) {
    const p = buildFontCss(family)
    fontCache.set(family, p)
    p.catch(() => fontCache.delete(family))
  }
  return fontCache.get(family)
}

async function withEmbeddedFont(svg, family) {
  if (!family) return svg
  try {
    const css = await fontCss(family)
    return svg.replace(/<svg\b[^>]*>/, (open) => `${open}<style>${css}</style>`)
  } catch {
    return svg // offline or blocked: export still works, with a fallback font
  }
}

function rasterize(svgMarkup, width, height, scale, type, quality) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      if (type === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), type, quality)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not render this banner for export'))
    }
    img.src = url
  })
}

export async function exportBanner({ markup, width, height, format = 'png', scale = 1, name = 'banner', font }) {
  if (!isSvgMarkup(markup)) throw new Error('Export currently supports SVG banners only')
  const type = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const svg = await withEmbeddedFont(markup, font)
  const blob = await rasterize(svg, width, height, scale, type, 0.92)
  download(blob, `${name}@${scale}x.${format === 'jpeg' ? 'jpg' : 'png'}`)
}

export async function copyBannerToClipboard({ markup, width, height, font }) {
  if (!isSvgMarkup(markup)) throw new Error('Copy currently supports SVG banners only')
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('Copying images is not supported in this browser')
  }
  const svg = await withEmbeddedFont(markup, font)
  const blob = await rasterize(svg, width, height, 1, 'image/png')
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
