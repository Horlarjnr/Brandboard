// TODO(backend): confirm these names and sizes with the backend team.
// The backend only accepts preset names (see plan.md: "bounded preset list").
export const SIZE_PRESETS = [
  { id: 'square', label: 'Square', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait', width: 1080, height: 1350 },
  { id: 'story', label: 'Story', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Landscape', width: 1200, height: 630 },
  { id: 'wide', label: 'Wide', width: 1920, height: 1080 },
]

// TODO(backend): replace with the approved font list (default is Inter).
export const FONTS = ['Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'Roboto']

// Defaults shown in the create form (from the light mockup).
export const DEFAULT_COLORS = {
  primary: '#4f46e5',
  accent: '#8b5cf6',
  tertiary: '#ede9fe',
}

export const COLOR_LABELS = {
  primary: 'Primary',
  accent: 'Accent',
  tertiary: 'Tertiary',
}

export const MAX_LOGO_BYTES = 2 * 1024 * 1024 // backend limit: 2 MB
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
export const POLL_INTERVAL_MS = 1000

export const STEP_LABELS = {
  queued: 'Waiting in queue',
  brief: 'Writing the banner copy',
  art: 'Choosing artwork',
  compose: 'Composing the layout',
  sanitize: 'Checking the output',
}
