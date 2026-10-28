import { NavLink, Link } from 'react-router-dom'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'

export default function Sidebar({ projects, open, onNew, onNavigate }) {
  const empty = projects.length === 0
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Projects">
      <Link to="/" className="sidebar-logo" onClick={onNavigate} aria-label="BrandBoard home">
        <Logo height={30} />
      </Link>

      <div className="nav-label">
        <Icon name="folder" size={16} />
        Projects
      </div>

      {empty ? (
        <div className="sidebar-empty">
          <span className="empty-icon">
            <Icon name="folder" size={26} />
          </span>
          <strong>No projects yet</strong>
          <p className="muted small">Create your first project to start generating on-brand banners.</p>
        </div>
      ) : (
        <nav className="project-list">
          {projects.map((p) => (
            <NavLink
              key={p.code}
              to={`/project/${p.code}`}
              onClick={onNavigate}
              className={({ isActive }) => `project-item ${isActive ? 'active' : ''}`}
            >
              <Avatar name={p.name} color={p.color} />
              <span className="project-meta">
                <span className="project-name">{p.name}</span>
                <span className="project-code">{p.code}</span>
              </span>
            </NavLink>
          ))}
        </nav>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={onNew}>
        <Icon name="plus" size={16} />
        {empty ? 'Create new project' : 'New project'}
      </button>

      <p className="sidebar-note">
        <Icon name="info" size={14} />
        Your project is saved to this browser by its ID.
      </p>
    </aside>
  )
}
