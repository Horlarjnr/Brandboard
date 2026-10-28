import BannerFrame from './BannerFrame.jsx'
import Icon from './Icon.jsx'

// The big preview area: loading, empty, or the generated banner.
export default function BannerCanvas({ markup, width, height, font, loading, stepLabel }) {
  if (loading) {
    return (
      <div className="canvas-loading" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p className="loading-title">Generating your banner...</p>
        <p className="muted small">This usually takes a few seconds.</p>
        {stepLabel && <p className="muted tiny">{stepLabel}...</p>}
        <div className="skeleton-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    )
  }

  if (!markup) {
    return (
      <div className="canvas-empty">
        <Icon name="sparkle" size={28} />
        <p className="loading-title">Your banner will appear here</p>
        <p className="muted small">Describe it below and press Generate.</p>
      </div>
    )
  }

  return (
    <div className="canvas" style={{ '--ratio': width / height }}>
      <BannerFrame markup={markup} width={width} height={height} font={font} />
    </div>
  )
}
