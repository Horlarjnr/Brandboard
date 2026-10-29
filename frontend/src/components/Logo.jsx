import { useId } from 'react'
import {
  LOGO_VIEWBOX,
  ICON_BOX,
  GRADIENT,
  ICON_PATH,
  BRAND_PATH,
  BOARD_PATH,
} from '../assets/logoPaths.js'

// BrandBoard logo as inline SVG. The gradient mark is the same in both themes;
// the "Brand" / "Board" text reads its color from --logo-ink / --logo-accent
// (see styles/tokens.css), so it stays readable in light and dark mode.
export default function Logo({ variant = 'full', height = 28, className = '' }) {
  const gradientId = useId().replace(/:/g, '')
  const [ix, iy, iw, ih] = ICON_BOX
  const mark = variant === 'mark'
  const viewBox = mark ? `${ix} ${iy} ${iw} ${ih}` : `0 0 ${LOGO_VIEWBOX[2]} ${LOGO_VIEWBOX[3]}`
  const width = mark ? (iw / ih) * height : (LOGO_VIEWBOX[2] / LOGO_VIEWBOX[3]) * height

  return (
    <svg role="img" aria-label="BrandBoard" viewBox={viewBox} width={width} height={height} className={className}>
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1={iy} x2="0" y2={iy + ih}>
          {GRADIENT.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <path d={ICON_PATH} fill={`url(#${gradientId})`} fillRule="evenodd" />
      {!mark && (
        <>
          <path d={BRAND_PATH} fillRule="evenodd" style={{ fill: 'var(--logo-ink)' }} />
          <path d={BOARD_PATH} fillRule="evenodd" style={{ fill: 'var(--logo-accent)' }} />
        </>
      )}
    </svg>
  )
}
