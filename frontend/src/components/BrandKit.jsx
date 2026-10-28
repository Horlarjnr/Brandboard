import { COLOR_LABELS } from '../lib/constants.js'
import Icon from './Icon.jsx'
import Menu from './Menu.jsx'

// "Brand kit" chip: color dots + font. Opens a panel with the exact values.
export default function BrandKit({ colors, font }) {
  const entries = Object.entries(colors || {})
  return (
    <Menu
      align="left"
      panelRole="dialog"
      buttonClassName="kit-trigger"
      ariaLabel="Show brand kit details"
      buttonContent={
        <>
          <span className="kit-label">Brand kit</span>
          <span className="kit-dots">
            {entries.map(([key, color]) => (
              <span key={key} className="dot" style={{ background: color }} />
            ))}
            <Icon name="chevron-down" size={14} />
          </span>
        </>
      }
    >
      {() => (
        <div className="kit-panel">
          {entries.map(([key, color]) => (
            <div key={key} className="kit-row">
              <span className="dot" style={{ background: color }} />
              <span>{COLOR_LABELS[key] || key}</span>
              <code>{color}</code>
            </div>
          ))}
          <div className="kit-row">
            <span className="kit-aa" style={{ fontFamily: `'${font}', sans-serif` }}>
              Aa
            </span>
            <span>Font</span>
            <code>{font}</code>
          </div>
        </div>
      )}
    </Menu>
  )
}
