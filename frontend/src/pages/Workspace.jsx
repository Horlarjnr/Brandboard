import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { getProject, getGeneration, renumber } from '../lib/api.js'
import { getToken } from '../lib/storage.js'
import { SIZE_PRESETS, STEP_LABELS } from '../lib/constants.js'
import { slug } from '../lib/format.js'
import { exportBanner, copyBannerToClipboard } from '../lib/exportImage.js'
import useGeneration from '../hooks/useGeneration.js'
import Avatar from '../components/Avatar.jsx'
import BrandKit from '../components/BrandKit.jsx'
import ActionBar from '../components/ActionBar.jsx'
import BannerCanvas from '../components/BannerCanvas.jsx'
import PromptBar from '../components/PromptBar.jsx'
import VersionStrip from '../components/VersionStrip.jsx'
import Icon from '../components/Icon.jsx'

export default function Workspace() {
  const { code } = useParams()
  const token = getToken(code)
  const { remove } = useOutletContext()

  const [project, setProject] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [versions, setVersions] = useState([])
  const [current, setCurrent] = useState(null)
  const [size, setSize] = useState(SIZE_PRESETS[0].id)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const lastRun = useRef(null)
  const versionsRef = useRef([])

  useEffect(() => {
    versionsRef.current = versions
  }, [versions])

  const gen = useGeneration(code, token)
  const { reset: resetGeneration } = gen

  const flash = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Load the project whenever the code changes.
  useEffect(() => {
    setProject(null)
    setVersions([])
    setCurrent(null)
    setLoadError('')
    resetGeneration()
    if (!token) return undefined
    let alive = true
    getProject(code, token)
      .then((p) => {
        if (!alive) return
        setProject(p)
        const list = p.generations || []
        setVersions(list)
        setCurrent(list[list.length - 1] || null)
      })
      .catch((e) => alive && setLoadError(e.message))
    return () => {
      alive = false
    }
  }, [code, token, resetGeneration])

  // When a generation finishes, add it to the version list and show it.
  useEffect(() => {
    if (gen.phase === 'done' && gen.result) {
      const v = gen.result
      const list = versionsRef.current
      const next = list.some((x) => x.id === v.id) ? list : renumber([...list, v])
      setVersions(next)
      setCurrent(next.find((x) => x.id === v.id))
      flash('Banner generated!')
    }
  }, [gen.phase, gen.result, flash])

  const selectVersion = useCallback(
    async (v) => {
      if (v.markup) return setCurrent(v)
      try {
        const full = await getGeneration(v.id, token)
        setVersions((list) => list.map((x) => (x.id === v.id ? { ...x, ...full } : x)))
        setCurrent({ ...v, ...full })
      } catch (e) {
        flash(e.message)
      }
    },
    [token, flash],
  )

  function generate(prompt) {
    lastRun.current = { prompt, size }
    gen.run({ prompt, size })
  }

  const busy = gen.phase === 'pending'
  const preset = SIZE_PRESETS.find((s) => s.id === (busy ? size : current?.size || size)) || SIZE_PRESETS[0]
  // A real generation carries its own width/height; use those so odd sizes still display correctly.
  const dims = !busy && current?.width && current?.height ? { width: current.width, height: current.height } : preset
  const canExport = Boolean(current?.markup)

  async function onDownload({ format, scale }) {
    try {
      await exportBanner({
        markup: current.markup,
        width: dims.width,
        height: dims.height,
        format,
        scale,
        font: project.font,
        name: `${slug(project.name)}-v${current.version_no}`,
      })
      flash('Download started')
    } catch (e) {
      flash(e.message)
    }
  }

  async function onCopy() {
    try {
      await copyBannerToClipboard({ markup: current.markup, width: dims.width, height: dims.height, font: project.font })
      flash('Copied to clipboard')
    } catch (e) {
      flash(e.message)
    }
  }

  // Regenerate makes a new version linked to the current one (parent_id).
  function onRegenerate() {
    if (!current) return
    lastRun.current = { prompt: current.prompt, size: current.size }
    gen.run({ prompt: current.prompt, size: current.size, parentId: current.id })
  }

  if (!token) {
    return (
      <section className="hero">
        <h1>No access to this project</h1>
        <p className="lead">
          This browser doesn't hold the owner token for <b>{code}</b>. Projects can only be opened from the browser
          that created them.
        </p>
        <Link to="/" className="btn">
          Back home
        </Link>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="hero">
        <h1>Could not load project</h1>
        <p className="error">{loadError}</p>
        <button type="button" className="btn" onClick={() => remove(code)}>
          Remove from this browser
        </button>
      </section>
    )
  }

  if (!project) return <p className="muted pad">Loading project...</p>

  return (
    <section className="workspace">
      <header className="brand-card">
        <div className="brand-id">
          {project.logo_url ? (
            <img src={project.logo_url} alt="" className="brand-logo" />
          ) : (
            <Avatar name={project.name} color={project.colors?.primary} size="lg" />
          )}
          <div>
            <h2>{project.name}</h2>
            <span className="muted tiny">{project.code}</span>
          </div>
        </div>
        <BrandKit colors={project.colors} font={project.font} />
        <span className="font-name">{project.font}</span>
      </header>

      <ActionBar canExport={canExport && !busy} onDownload={onDownload} onCopy={onCopy} onRegenerate={onRegenerate} />

      <div className="stage">
        <BannerCanvas
          markup={current?.markup}
          width={dims.width}
          height={dims.height}
          font={project.font}
          loading={busy}
          stepLabel={STEP_LABELS[gen.step]}
        />
      </div>

      {gen.phase === 'failed' && (
        <div className="error-box" role="alert">
          <div>
            <strong>{gen.error}</strong>
            {gen.generationId && <span className="muted tiny"> Reference: {gen.generationId}</span>}
          </div>
          {lastRun.current && (
            <button type="button" className="btn" onClick={() => gen.run(lastRun.current)}>
              Try again
            </button>
          )}
        </div>
      )}

      <PromptBar disabled={busy} size={size} onSizeChange={setSize} onSubmit={generate} />

      <VersionStrip versions={versions} activeId={current?.id} onSelect={selectVersion} font={project.font} />

      <p className="sidebar-note">
        <Icon name="info" size={14} />
        Your project is saved to this browser by its ID.
      </p>

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={16} />
          {toast}
        </div>
      )}
    </section>
  )
}
