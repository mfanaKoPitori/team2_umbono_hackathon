import { categoryCounts } from '../utils/incidentStats'
import { incidentTypeLabel } from '../constants'

export default function CategoryBreakdown({ incidents }) {
  const counts = categoryCounts(incidents)
  const max = Math.max(1, ...counts.map((c) => c.count))

  return (
    <div className="card analytics-panel">
      <h3>What&rsquo;s being reported</h3>
      <div className="bar-list">
        {counts.length === 0 && <p className="analytics-panel__empty">No data yet.</p>}
        {counts.map(({ type, count }) => (
          <div key={type} className="bar-list__row">
            <span className="bar-list__label">{incidentTypeLabel(type)}</span>
            <div className="bar-list__track">
              <div
                className="bar-list__fill bar-list__fill--accent"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="bar-list__value mono">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
