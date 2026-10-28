// "TechNest" -> "TN", "Sunrise Bakery" -> "SB", "Campus Connect" -> "CC"
export function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  const word = words[0] || '?'
  const camel = word.match(/[A-Z][a-z0-9]*/g)
  if (camel && camel.length >= 2) return (camel[0][0] + camel[1][0]).toUpperCase()
  return word.slice(0, 2).toUpperCase()
}

export const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v)

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

// Dark or white text, whichever reads better on this background color.
export function readableOn(hex) {
  if (!isHex(hex || '')) return '#ffffff'
  return luminance(hex) > 0.45 ? '#111827' : '#ffffff'
}
