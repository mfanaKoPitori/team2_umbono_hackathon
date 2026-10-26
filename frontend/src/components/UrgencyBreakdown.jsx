import { SEVERITIES, SEVERITY_META } from '../constants'
import {
  severityCounts,
  medianOpenAge,
  medianTimeToAcknowledge,
  medianTimeToResolve,
  formatAge,
} from '../utils/incidentStats'

export default function UrgencyBreakdown({ incidents }) {
  const counts = severityCounts(incidents, SEVERITIES)
  const max = Math.max(1, ...counts.map((c) => c.count))

  const timeToAck = medianTimeToAcknowledge(incidents)
  const timeToResolve = medianTimeToResolve(incidents)
  const hasTimingData = timeToAck != null || timeToResolve != null
  const medianAge = medianOpenAge(incidents)

  return (
    <div className="card analytics-panel">
      <h3>How urgent</h3>
      <div className="bar-list">
        {counts.map(({ level, count }) => {
          const meta = SEVERITY_META[level]
          return (
            <div key={level} className="bar-list__row">
              <span className="bar-list__label">{meta.label}</span>
              <div className="bar-list__track">
                <div
                  className="bar-list__fill"
                  style={{ width: `${(count / max) * 100}%`, background: meta.color }}
                />
              </div>
              <span className="bar-list__value mono">{count}</span>
            </div>
          )
        })}
      </div>

      <div className="analytics-panel__stats">
        {hasTimingData ? (
          <>
            {timeToAck != null && (
              <div className="analytics-panel__stat">
                <span className="analytics-panel__stat-label">Median time to acknowledge</span>
                <span className="analytics-panel__stat-value mono">{formatAge(timeToAck)}</span>
              </div>
            )}
            {timeToResolve != null && (
              <div className="analytics-panel__stat">
                <span className="analytics-panel__stat-label">Median time to resolve</span>
                <span className="analytics-panel__stat-value mono">{formatAge(timeToResolve)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="analytics-panel__stat">
            <span className="analytics-panel__stat-label">Median age, open incidents</span>
            <span className="analytics-panel__stat-value mono">{formatAge(medianAge)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
