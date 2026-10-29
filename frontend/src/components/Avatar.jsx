import { initials, readableOn } from '../lib/colors.js'

// Round initials badge colored with the brand's primary color ("TN" for TechNest).
export default function Avatar({ name, color, size = 'md' }) {
  const bg = color || '#4f46e5'
  return (
    <span className={`avatar ${size}`} style={{ background: bg, color: readableOn(bg) }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
