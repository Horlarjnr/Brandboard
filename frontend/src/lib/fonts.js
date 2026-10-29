// Google Fonts helpers. Only weights 400 and 700 are requested because every
// family in the list has them (asking for a missing weight makes the request fail).
export function fontStylesheetUrl(family) {
  const name = encodeURIComponent(family).replace(/%20/g, '+')
  return `https://fonts.googleapis.com/css2?family=${name}:wght@400;700&display=swap`
}

const loaded = new Set()

// Load a font into the main page (used for the font preview in the create form).
export function ensureFontLoaded(family) {
  if (!family || loaded.has(family)) return
  loaded.add(family)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = fontStylesheetUrl(family)
  document.head.appendChild(link)
}
