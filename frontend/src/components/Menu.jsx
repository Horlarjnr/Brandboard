import { useEffect, useRef, useState } from 'react'

// Small dropdown. `children` is a function that receives { close }.
// Closes on outside click and on Escape.
export default function Menu({
  buttonContent,
  buttonClassName = 'btn',
  ariaLabel,
  align = 'right',
  panelRole = 'menu',
  disabled = false,
  children,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={ariaLabel}
        aria-haspopup={panelRole}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {buttonContent}
      </button>
      {open && (
        <div className={`menu-panel ${align}`} role={panelRole}>
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  )
}
