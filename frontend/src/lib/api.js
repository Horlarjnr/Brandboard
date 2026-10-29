// Single place that talks to the backend. Everything else imports from here.
// Real contract = the FastAPI code in backend/app (api/projects.py, api/generations.py, schemas.py).
// Set VITE_USE_MOCK=false in .env.local to use the real API.
import * as mock from './mockApi.js'
import { SIZE_PRESETS } from './constants.js'
import { getGenerationIds } from './storage.js'

// The backend must allow this app's origin via CORS (see README).
const API_URL = (import.meta.env.VITE_API_URL || 'https://brandboard.onrender.com').replace(/\/$/, '')
// Mock mode is opt-in, so a deployment can never ship with fake data by accident.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

// FastAPI sends `detail` as a string for HTTPException and as a list for 422 validation errors.
function detailMessage(detail, status) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : ''
        return field ? `${field}: ${d.msg}` : d.msg
      })
      .join('; ')
  }
  return `Request failed (${status})`
}

async function request(path, { method = 'GET', token, json } = {}) {
  const headers = {}
  if (token) headers['X-Project-Token'] = token
  let body
  if (json) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }
  let res
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body })
  } catch {
    throw new ApiError(
      'Cannot reach the server. The free Render backend can take up to a minute to wake up, so try again shortly.',
      0,
    )
  }
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const detail = data && typeof data === 'object' ? data.detail : null
    throw new ApiError(detailMessage(detail, res.status), res.status, data)
  }
  return data
}

// ---- helpers -------------------------------------------------------------

// The backend stores naive UTC timestamps and sends them without a "Z",
// which JavaScript would read as local time. Mark them as UTC.
function utc(iso) {
  if (typeof iso !== 'string') return iso
  return /([zZ]|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`
}

function sizeIdFor(width, height) {
  return SIZE_PRESETS.find((s) => s.width === width && s.height === height)?.id ?? 'custom'
}

// Backend generation -> the shape the UI uses.
//   markup = what to display (the designed HTML banner, or the plain SVG if there is no HTML)
//   svg    = the backend's plain SVG, kept for reference
function normalizeGeneration(g) {
  return {
    ...g,
    created_at: utc(g.created_at),
    size: sizeIdFor(g.width, g.height),
    markup: g.html || g.svg || null,
  }
}

// The backend never increments version_no (every row is 1), so number versions by creation order.
export function renumber(list) {
  return [...list]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((g, i) => ({ ...g, version_no: i + 1 }))
}

// ---- projects ------------------------------------------------------------

// The backend takes JSON and has no logo upload yet, so `logo` is not sent.
// Returns { code, owner_token, id, name, description, colors, font, created_at }
export function createProject({ name, description, colors, font, logo }) {
  if (USE_MOCK) return mock.createProject({ name, description, colors, font, logo })
  return request('/projects', {
    method: 'POST',
    json: {
      name,
      description,
      colors: { primary: colors.primary, accent: colors.accent, tertiary: colors.tertiary },
      font: font || 'Inter',
    },
  })
}

// GET /projects/{code} returns the project only (no generation list). We load the
// history ourselves: first from GET /projects/{code}/generations if the backend has
// that route, otherwise from the generation ids this browser remembered.
export async function getProject(code, token) {
  if (USE_MOCK) return mock.getProject(code, token)
  const project = await request(`/projects/${code}`, { token })
  const generations = await loadHistory(code, token)
  return { ...project, generations }
}

async function loadHistory(code, token) {
  let rows = null
  try {
    rows = await request(`/projects/${code}/generations`, { token })
  } catch (e) {
    if (e.status !== 404 && e.status !== 405) throw e
  }
  if (!Array.isArray(rows)) {
    const ids = getGenerationIds(code)
    const settled = await Promise.allSettled(ids.map((id) => request(`/generations/${id}`, { token })))
    rows = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value)
  }
  return renumber(rows.filter((g) => g.status === 'done').map(normalizeGeneration))
}

// ---- generations ---------------------------------------------------------

// Backend wants width/height, not a preset name. Returns 202 with the full generation row.
export async function startGeneration(code, token, { requestId, prompt, size, parentId = null }) {
  if (USE_MOCK) return mock.startGeneration(code, token, { requestId, prompt, size, parentId })
  const preset = SIZE_PRESETS.find((s) => s.id === size) || SIZE_PRESETS[0]
  const g = await request(`/projects/${code}/generations`, {
    method: 'POST',
    token,
    json: {
      request_id: requestId,
      prompt,
      width: preset.width,
      height: preset.height,
      parent_id: parentId,
    },
  })
  return normalizeGeneration(g)
}

// status: queued | running | done | failed. step: brief | compose | sanitize.
export async function getGeneration(id, token) {
  if (USE_MOCK) return mock.getGeneration(id, token)
  return normalizeGeneration(await request(`/generations/${id}`, { token }))
}

// Sends a fresh request_id: without a body the backend uses "regen-<id>" and a second
// regenerate of the same generation hits its unique (project, request_id) constraint.
export async function regenerate(id, token) {
  if (USE_MOCK) return mock.regenerate(id, token)
  const current = await request(`/generations/${id}`, { token })
  const g = await request(`/generations/${id}/regenerate`, {
    method: 'POST',
    token,
    json: {
      request_id: crypto.randomUUID(),
      prompt: current.prompt,
      width: current.width,
      height: current.height,
      parent_id: id,
    },
  })
  return normalizeGeneration(g)
}

// Wakes the Render free-tier service so the first real request is not slow.
export function warmUp() {
  if (USE_MOCK) return
  fetch(`${API_URL}/health`).catch(() => {})
}

// Demo data for presentations. Only exists in mock mode.
export async function seedDemoProjects() {
  return USE_MOCK ? mock.seedDemoProjects() : []
}

export const isMockMode = USE_MOCK
// The backend has no logo upload route yet (plan.md lists assets.py, but it is not built).
export const supportsLogo = USE_MOCK
