import { useOutletContext } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { isMockMode } from '../lib/api.js'

export default function Landing() {
  const { openCreate, loadDemo } = useOutletContext()
  return (
    <section className="hero">
      <span className="hero-icon">
        <Icon name="sparkle" size={34} />
      </span>
      <h1>
        On-brand banners
        <br />
        <span className="hl">in seconds</span>
      </h1>
      <p className="lead">Save your brand once, then generate banners with a simple prompt.</p>
      <button type="button" className="btn btn-primary btn-lg" onClick={openCreate}>
        <Icon name="plus" size={18} />
        Create new project
      </button>
      {isMockMode && (
        <button type="button" className="link-btn" onClick={loadDemo}>
          or load demo projects
        </button>
      )}
    </section>
  )
}
