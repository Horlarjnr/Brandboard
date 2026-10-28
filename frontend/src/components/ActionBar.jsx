import { useState } from 'react'
import Icon from './Icon.jsx'
import Menu from './Menu.jsx'

// Download (with a format + scale menu), Copy, Regenerate.
// On small screens everything collapses into a single "more" menu.
export default function ActionBar({ canExport, onDownload, onCopy, onRegenerate }) {
  const [format, setFormat] = useState('png')
  const [scale, setScale] = useState(1)
  const label = `${format === 'png' ? 'PNG' : 'JPEG'}${scale > 1 ? ` ${scale}x` : ''}`

  return (
    <div className="actions">
      <div className="actions-desktop">
        <div className="split">
          <button
            type="button"
            className="btn split-main"
            disabled={!canExport}
            onClick={() => onDownload({ format, scale })}
          >
            <Icon name="download" size={16} />
            Download {label}
          </button>
          <Menu
            buttonClassName="btn split-toggle"
            ariaLabel="Export options"
            buttonContent={<Icon name="chevron-down" size={16} />}
          >
            {({ close }) => (
              <>
                <div className="menu-heading">Format</div>
                {['png', 'jpeg'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="menuitemradio"
                    aria-checked={format === f}
                    className="menu-item"
                    onClick={() => {
                      setFormat(f)
                      close()
                    }}
                  >
                    {f.toUpperCase()}
                    {format === f && <Icon name="check" size={16} />}
                  </button>
                ))}
                <div className="menu-heading">Scale</div>
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="menuitemradio"
                    aria-checked={scale === s}
                    className="menu-item"
                    onClick={() => {
                      setScale(s)
                      close()
                    }}
                  >
                    {s}x
                    {scale === s && <Icon name="check" size={16} />}
                  </button>
                ))}
              </>
            )}
          </Menu>
        </div>
        <button type="button" className="btn" onClick={onCopy} disabled={!canExport}>
          <Icon name="copy" size={16} />
          Copy
        </button>
        <button type="button" className="btn" onClick={onRegenerate}>
          <Icon name="refresh" size={16} />
          Regenerate
        </button>
      </div>

      <div className="actions-mobile">
        <Menu
          buttonClassName="icon-btn"
          ariaLabel="More actions"
          buttonContent={<Icon name="dots-vertical" size={18} />}
        >
          {({ close }) => (
            <>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                disabled={!canExport}
                onClick={() => {
                  onDownload({ format: 'png', scale: 1 })
                  close()
                }}
              >
                <span className="menu-item-label">
                  <Icon name="download" size={16} /> Download PNG
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                disabled={!canExport}
                onClick={() => {
                  onDownload({ format: 'jpeg', scale: 1 })
                  close()
                }}
              >
                <span className="menu-item-label">
                  <Icon name="download" size={16} /> Download JPEG
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                disabled={!canExport}
                onClick={() => {
                  onCopy()
                  close()
                }}
              >
                <span className="menu-item-label">
                  <Icon name="copy" size={16} /> Copy
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  onRegenerate()
                  close()
                }}
              >
                <span className="menu-item-label">
                  <Icon name="refresh" size={16} /> Regenerate
                </span>
              </button>
            </>
          )}
        </Menu>
      </div>
    </div>
  )
}
