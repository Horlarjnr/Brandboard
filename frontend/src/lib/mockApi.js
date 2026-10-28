// In-browser fake backend so the UI can be built before the real API exists.
// Mirrors the shapes described in plan.md. Data lives in localStorage.
import { SIZE_PRESETS } from './constants.js'
import { initials, readableOn } from './colors.js'

const KEY = 'brandboard.mock.v1'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { projects: {}, generations: {} }
  } catch {
    return { projects: {}, generations: {} }
  }
}
function save(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* ignore */
  }
}
// Codes look like "TN-7F3A2" (initials + 5 characters).
const makeCode = (name) => `${initials(name)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
const uuid = () => crypto.randomUUID()

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function wrap(text, max) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) {
      lines.push(line)
      line = w
    } else line = (line + ' ' + w).trim()
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

function fakeBanner(project, prompt, width, height) {
  const { primary, accent, tertiary } = project.colors
  const ink = readableOn(primary)
  const pad = width * 0.08
  const headline = prompt.length > 54 ? prompt.slice(0, 51) + '...' : prompt
  const lines = wrap(headline, Math.max(12, Math.round(width / 62)))
  const fs = Math.round(Math.min(width, height * 1.4) * 0.072)
  const textY = height * 0.36
  const tspans = lines
    .map((l, i) => `<tspan x="${pad}" dy="${i === 0 ? 0 : fs * 1.15}">${esc(l)}</tspan>`)
    .join('')
  const ctaY = textY + lines.length * fs * 1.15 + fs * 0.6
  const font = `${esc(project.font)}, sans-serif`
  const logo = project.logo_url
    ? `<image href="${esc(project.logo_url)}" x="${pad}" y="${pad * 0.7}" width="${fs * 1.3}" height="${fs * 1.3}" preserveAspectRatio="xMidYMid meet"/>`
    : ''
  const nameX = project.logo_url ? pad + fs * 1.6 : pad
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${primary}"/>
  <circle cx="${width * 0.88}" cy="${height * 0.18}" r="${Math.min(width, height) * 0.24}" fill="${accent}" opacity="0.92"/>
  <circle cx="${width * 0.96}" cy="${height * 0.92}" r="${Math.min(width, height) * 0.2}" fill="${tertiary}" opacity="0.35"/>
  ${logo}
  <text x="${nameX}" y="${pad * 0.7 + fs * 0.95}" font-family="${font}" font-size="${Math.round(fs * 0.62)}" font-weight="700" fill="${ink}">${esc(project.name)}</text>
  <text x="${pad}" y="${textY}" font-family="${font}" font-size="${fs}" font-weight="700" fill="${ink}">${tspans}</text>
  <rect x="${pad}" y="${ctaY}" width="${fs * 5}" height="${fs * 1.3}" rx="${fs * 0.65}" fill="${accent}"/>
  <text x="${pad + fs * 2.5}" y="${ctaY + fs * 0.88}" text-anchor="middle" font-family="${font}" font-size="${Math.round(fs * 0.5)}" font-weight="700" fill="${readableOn(accent)}">Learn more</text>
</svg>`
}

function requireProject(db, code, token) {
  const p = db.projects[code]
  if (!p) throw Object.assign(new Error('Project not found'), { status: 404 })
  if (p.token !== token) throw Object.assign(new Error('Invalid project token'), { status: 401 })
  return p
}

function readFile(file) {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => resolve(null)
    r.readAsDataURL(file)
  })
}

export async function createProject({ name, description, colors, font, logo }) {
  await delay(400)
  const db = load()
  const code = makeCode(name)
  const token = uuid()
  const logo_url = logo ? await readFile(logo) : null
  db.projects[code] = { code, token, name, description, colors, font: font || 'Inter', logo_url, generationIds: [] }
  save(db)
  const { token: _t, generationIds: _g, ...pub } = db.projects[code]
  return { ...pub, owner_token: token, generations: [] }
}

export async function getProject(code, token) {
  await delay(150)
  const db = load()
  const p = requireProject(db, code, token)
  const { token: _t, generationIds, ...pub } = p
  const generations = generationIds
    .map((id) => db.generations[id])
    .filter((g) => g.status === 'done')
    .map(({ id, version_no, parent_id, prompt, size, created_at, svg }) => ({
      id, version_no, parent_id, prompt, size, created_at, svg, status: 'done',
    }))
  return { ...pub, generations }
}

export async function startGeneration(code, token, { requestId, prompt, size, parentId }) {
  await delay(200)
  const db = load()
  const p = requireProject(db, code, token)
  const existing = Object.values(db.generations).find((g) => g.project === code && g.request_id === requestId)
  if (existing) return { id: existing.id, status: existing.status }
  if (!SIZE_PRESETS.some((s) => s.id === size)) {
    throw Object.assign(new Error('Unknown size preset'), { status: 422 })
  }
  const id = uuid()
  db.generations[id] = {
    id, project: code, request_id: requestId, prompt, size, parent_id: parentId,
    version_no: p.generationIds.length + 1, status: 'queued', step: 'queued',
    svg: null, spec: null, error: null, created_at: Date.now(), started: Date.now(),
  }
  p.generationIds.push(id)
  save(db)
  return { id, status: 'queued' }
}

const STEPS = [['queued', 0], ['brief', 700], ['art', 1500], ['compose', 2100], ['sanitize', 2600]]

export async function getGeneration(id, token) {
  await delay(120)
  const db = load()
  const g = db.generations[id]
  if (!g) throw Object.assign(new Error('Generation not found'), { status: 404 })
  const p = requireProject(db, g.project, token)
  if (g.status !== 'done' && g.status !== 'failed') {
    const age = Date.now() - g.started
    if (/fail/i.test(g.prompt)) {
      // Type a prompt containing "fail" to see the error state.
      if (age > 1500) {
        g.status = 'failed'
        g.error = 'Mock failure (your prompt contained "fail").'
      }
    } else if (age > 3000) {
      const preset = SIZE_PRESETS.find((s) => s.id === g.size)
      g.status = 'done'
      g.step = 'sanitize'
      g.svg = fakeBanner(p, g.prompt, preset.width, preset.height)
      g.spec = { headline: g.prompt.slice(0, 60), tone: 'bold', layout: 'split_hero' }
    } else {
      g.status = age > 700 ? 'running' : 'queued'
      g.step = [...STEPS].reverse().find(([, t]) => age >= t)[0]
    }
    save(db)
  }
  const { project: _p, started: _s, ...out } = g
  return out
}

export async function regenerate(id, token) {
  const db = load()
  const g = db.generations[id]
  if (!g) throw Object.assign(new Error('Generation not found'), { status: 404 })
  return startGeneration(g.project, token, {
    requestId: uuid(), prompt: g.prompt, size: g.size, parentId: id,
  })
}

// Two ready-made projects for demos, so a presentation never starts on an empty screen.
const DEMOS = [
  {
    name: 'TechNest',
    description: 'A student technology club focused on learning, collaboration and building real projects.',
    colors: { primary: '#4f46e5', accent: '#8b5cf6', tertiary: '#ede9fe' },
    font: 'Inter',
    prompts: ['Build Skills. Build What\'s Next.', 'Join our campus tech community'],
  },
  {
    name: 'Sunrise Bakery',
    description: 'Small-batch bakery serving fresh bread and pastries every morning.',
    colors: { primary: '#ea580c', accent: '#f59e0b', tertiary: '#fff7ed' },
    font: 'Playfair Display',
    prompts: ['Freshly Baked. Always a Good Idea.'],
  },
]

export async function seedDemoProjects() {
  const db = load()
  const out = []
  for (const d of DEMOS) {
    let p = Object.values(db.projects).find((x) => x.demo && x.name === d.name)
    if (!p) {
      const code = makeCode(d.name)
      p = {
        code, token: uuid(), name: d.name, description: d.description, colors: d.colors,
        font: d.font, logo_url: null, generationIds: [], demo: true,
      }
      db.projects[code] = p
      const preset = SIZE_PRESETS[0]
      d.prompts.forEach((prompt, i) => {
        const id = uuid()
        const t = Date.now() - (d.prompts.length - i) * 600000
        db.generations[id] = {
          id, project: code, request_id: uuid(), prompt, size: preset.id, parent_id: null,
          version_no: i + 1, status: 'done', step: 'sanitize',
          svg: fakeBanner(p, prompt, preset.width, preset.height),
          spec: { headline: prompt, tone: 'bold', layout: 'split_hero' },
          error: null, created_at: t, started: t,
        }
        p.generationIds.push(id)
      })
    }
    out.push({ code: p.code, owner_token: p.token, name: p.name, colors: p.colors })
  }
  save(db)
  return out
}
