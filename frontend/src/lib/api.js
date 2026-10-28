// Single place that talks to the backend. Everything else imports from here.
// Contract source: plan.md in the repo root.
// Set VITE_USE_MOCK=false in .env.local to use the real API.
import * as mock from './mockApi.js'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function request(path, { method = 'GET', token, json, form } = {}) {
  const headers = {}
  if (token) headers['X-Project-Token'] = token
  let body
  if (json) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form // the browser sets the multipart boundary
  }
  let res
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
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
    const message = typeof detail === 'string' ? detail : `Request failed (${res.status})`
    throw new ApiError(message, res.status, data)
  }
  return data
}

// TODO(backend): confirm multipart field names. plan.md says the request holds
// name, description, three colors, optional font and optional logo.
function buildProjectForm({ name, description, colors, font, logo }) {
  const form = new FormData()
  form.append('name', name)
  form.append('description', description)
  form.append('primary_color', colors.primary)
  form.append('accent_color', colors.accent)
  form.append('tertiary_color', colors.tertiary)
  if (font) form.append('font', font)
  if (logo) form.append('logo', logo)
  return form
}

// Expected: { code, owner_token, ...project }
export function createProject(values) {
  if (USE_MOCK) return mock.createProject(values)
  return request('/projects', { method: 'POST', form: buildProjectForm(values) })
}

// Expected: { code, name, description, colors, font, logo_url?, generations: [...] }
// Each generation: { id, version_no, parent_id, prompt, size, created_at, svg? }
export function getProject(code, token) {
  if (USE_MOCK) return mock.getProject(code, token)
  return request(`/projects/${code}`, { token })
}

// Expected: 202 { id, status }
export function startGeneration(code, token, { requestId, prompt, size, parentId = null }) {
  if (USE_MOCK) return mock.startGeneration(code, token, { requestId, prompt, size, parentId })
  return request(`/projects/${code}/generations`, {
    method: 'POST',
    token,
    json: { request_id: requestId, prompt, size, parent_id: parentId },
  })
}

// Expected: { id, status: queued|running|done|failed, step, svg, spec, error, version_no, parent_id, created_at }
export function getGeneration(id, token) {
  if (USE_MOCK) return mock.getGeneration(id, token)
  return request(`/generations/${id}`, { token })
}

export function regenerate(id, token) {
  if (USE_MOCK) return mock.regenerate(id, token)
  return request(`/generations/${id}/regenerate`, { method: 'POST', token })
}

// Demo data for presentations. Only exists in mock mode.
export async function seedDemoProjects() {
  return USE_MOCK ? mock.seedDemoProjects() : []
}

export const isMockMode = USE_MOCK
