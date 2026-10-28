import { useEffect, useRef, useState } from 'react'
import { fontStylesheetUrl } from '../lib/fonts.js'

// Shows backend markup scaled to fit its container.
// - The markup runs inside <iframe sandbox>, so even if something slipped past
//   the backend sanitizer it cannot run scripts or touch the app.
// - The iframe is laid out at the banner's real pixel size and scaled down with
//   a CSS transform, which works for both SVG and fixed-size HTML banners.
// - The brand font is loaded inside the iframe (it cannot see the page's fonts).
function buildDoc(markup, font) {
  const link = font ? `<link rel="stylesheet" href="${fontStylesheetUrl(font)}">` : ''
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    link +
    '<style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block;width:100%;height:auto}</style>' +
    `</head><body>${markup}</body></html>`
  )
}

export default function BannerFrame({ markup, width, height, font, title = 'Generated banner' }) {
  const box = useRef(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const update = () => setScale(el.clientWidth / width)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={box} className="frame" style={{ aspectRatio: `${width} / ${height}` }}>
      <iframe
        title={title}
        sandbox=""
        srcDoc={buildDoc(markup, font)}
        tabIndex={-1}
        style={{ width, height, transform: `scale(${scale})`, opacity: scale ? 1 : 0 }}
      />
    </div>
  )
}
