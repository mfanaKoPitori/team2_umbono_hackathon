import { SEVERITY_META } from '../constants'

export default function SeverityPill({ severity, size }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.low
  return (
    <span
      className={`pill ${size === 'sm' ? 'pill--sm' : ''}`}
      style={{ color: meta.color, background: meta.soft }}
    >
      <span className="pill__dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}
