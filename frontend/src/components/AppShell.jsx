import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import CreateProjectModal from './CreateProjectModal.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import Logo from './Logo.jsx'
import Icon from './Icon.jsx'
import useProjects from '../hooks/useProjects.js'
import useTheme from '../hooks/useTheme.js'
import { isMockMode, seedDemoProjects } from '../lib/api.js'

export default function AppShell() {
  const { projects, add, remove } = useProjects()
  const { theme, toggle } = useTheme()
  const [creating, setCreating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])

  const closeCreate = useCallback(() => setCreating(false), [])

  function handleCreated(project) {
    add({ code: project.code, token: project.owner_token, name: project.name, color: project.colors?.primary })
    setCreating(false)
    navigate(`/project/${project.code}`)
  }

  async function loadDemo() {
    const demo = await seedDemoProjects()
    demo.forEach((d) => add({ code: d.code, token: d.owner_token, name: d.name, color: d.colors?.primary }))
    if (demo[0]) navigate(`/project/${demo[0].code}`)
  }

  return (
    <div className="shell">
      <Sidebar
        projects={projects}
        open={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onNew={() => {
          setCreating(true)
          setMenuOpen(false)
        }}
      />
      {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />}

      <main className="main">
        <div className="topbar">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Icon name="menu" size={18} />
          </button>
          <Link to="/" className="topbar-logo" aria-label="BrandBoard home">
            <Logo height={24} />
          </Link>
          <div className="topbar-right">
            {isMockMode && <span className="mock-pill">Mock mode</span>}
            <ThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </div>
        <Outlet context={{ projects, remove, openCreate: () => setCreating(true), loadDemo }} />
      </main>

      {creating && <CreateProjectModal onClose={closeCreate} onCreated={handleCreated} />}
    </div>
  )
}
