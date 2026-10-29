import { SIZE_PRESETS } from '../lib/constants.js'
import { formatWhen } from '../lib/format.js'
import BannerFrame from './BannerFrame.jsx'

// Version history with thumbnails, newest first. The clickable area is an
// overlay button because a button cannot contain an iframe.
export default function VersionStrip({ versions, activeId, onSelect, font }) {
  if (!versions.length) return null
  const list = [...versions].reverse()

  return (
    <section className="versions" aria-label="Version history">
      <h3 className="section-title">Version history</h3>
      <div className="version-row">
        {list.map((v) => {
          const found = SIZE_PRESETS.find((s) => s.id === v.size) || SIZE_PRESETS[0]
          const preset = v.width && v.height ? { width: v.width, height: v.height } : found
          const active = v.id === activeId
          return (
            <div key={v.id} className={`version ${active ? 'active' : ''}`}>
              <div className="version-thumb">
                {v.markup ? (
                  <BannerFrame
                    markup={v.markup}
                    width={preset.width}
                    height={preset.height}
                    font={font}
                    title={`Version ${v.version_no}`}
                  />
                ) : (
                  <span className="muted tiny">Preview</span>
                )}
              </div>
              <span className="version-label">
                v{v.version_no}
                {active ? ' (Current)' : ''}
              </span>
              <span className="version-when">{formatWhen(v.created_at)}</span>
              <button
                type="button"
                className="version-hit"
                aria-pressed={active}
                aria-label={`Show version ${v.version_no}: ${v.prompt}`}
                title={v.prompt}
                onClick={() => onSelect(v)}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
