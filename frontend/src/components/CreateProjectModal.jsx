import { useEffect, useState } from 'react'
import { createProject, supportsLogo } from '../lib/api.js'
import { COLOR_LABELS, DEFAULT_COLORS, FONTS, LOGO_TYPES, MAX_LOGO_BYTES } from '../lib/constants.js'
import { ensureFontLoaded } from '../lib/fonts.js'
import { isHex } from '../lib/colors.js'
import Icon from './Icon.jsx'

// Color dot (native picker) + editable hex value.
function ColorField({ label, value, onChange }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])

  function edit(e) {
    const v = e.target.value
    setText(v)
    if (isHex(v)) onChange(v.toLowerCase())
  }

  return (
    <label className="color-field">
      <span className="sr-only">{label} color</span>
      <input type="color" className="color-dot" value={value} onChange={(e) => onChange(e.target.value)} />
      <input
        className="hex-input"
        value={text}
        onChange={edit}
        onBlur={() => setText(value)}
        maxLength={7}
        spellCheck={false}
        aria-label={`${label} color hex value`}
      />
    </label>
  )
}

export default function CreateProjectModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [colors, setColors] = useState(DEFAULT_COLORS)
  const [font, setFont] = useState(FONTS[0])
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  useEffect(() => ensureFontLoaded(font), [font])

  useEffect(() => {
    if (!logo) return undefined
    const url = URL.createObjectURL(logo)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logo])

  function acceptLogo(file) {
    if (!file) return
    if (!LOGO_TYPES.includes(file.type)) return setError('Logo must be a PNG, JPG or SVG file')
    if (file.size > MAX_LOGO_BYTES) return setError('Logo must be 2 MB or smaller')
    setError('')
    setLogo(file)
  }

  function clearLogo() {
    setLogo(null)
    setLogoPreview(null)
  }

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Give your brand a name')
    if (!description.trim()) return setError('Add a short description of the brand')
    setBusy(true)
    setError('')
    try {
      const project = await createProject({ name: name.trim(), description: description.trim(), colors, font, logo })
      onCreated(project)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="create-title">
        <div className="modal-head">
          <h2 id="create-title">Create a new project</h2>
          <button type="button" className="icon-btn plain" onClick={onClose} aria-label="Close" disabled={busy}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <label className="field">
          <span className="field-label">
            Brand name <span className="req">*</span>
          </span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. TechNest"
            maxLength={80}
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field-label">
            Brand description <span className="req">*</span>
          </span>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What you do, who it is for, how it should feel"
            maxLength={600}
          />
        </label>

        <div className="field">
          <span className="field-label">
            Brand colors <span className="req">*</span>
          </span>
          <div className="color-row">
            {Object.keys(DEFAULT_COLORS).map((k) => (
              <ColorField
                key={k}
                label={COLOR_LABELS[k]}
                value={colors[k]}
                onChange={(v) => setColors((c) => ({ ...c, [k]: v }))}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">
            Font <span className="req">*</span>
          </span>
          <div className="font-row">
            <select className="select" value={font} onChange={(e) => setFont(e.target.value)} aria-label="Font">
              {FONTS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <div className="font-preview" style={{ fontFamily: `'${font}', sans-serif` }} aria-hidden="true">
              <span>Aa</span> {font}
            </div>
          </div>
        </div>

        {supportsLogo && (
        <div className="field">
          <span className="field-label">Logo upload (optional)</span>
          {logo ? (
            <div className="logo-chosen">
              {logoPreview && <img src={logoPreview} alt="" />}
              <span className="small">{logo.name}</span>
              <button type="button" className="link-btn" onClick={clearLogo}>
                Remove
              </button>
            </div>
          ) : (
            <label
              className={`dropzone ${dragging ? 'drag' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                acceptLogo(e.dataTransfer.files?.[0])
              }}
            >
              <Icon name="upload" size={26} />
              <span className="small">Drag and drop your logo here</span>
              <span className="small">
                or <u>click to upload</u>
              </span>
              <span className="tiny muted">PNG, JPG or SVG (max 2 MB)</span>
              <input
                type="file"
                accept={LOGO_TYPES.join(',')}
                onChange={(e) => {
                  acceptLogo(e.target.files?.[0])
                  e.target.value = ''
                }}
                className="sr-only"
              />
            </label>
          )}
        </div>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating...' : 'Create project'}
          </button>
        </div>
      </form>
    </div>
  )
}
