import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { SEVERITIES } from '../constants'
import IncidentQueueCard from './IncidentQueueCard'

const FILTERS = [
  { key: 'all_open', label: 'All open' },
  { key: 'critical', label: 'Critical' },
  { key: 'new', label: 'New' },
  { key: 'has_photo', label: 'Has photo' },
]

function matchesFilter(incident, filter) {
  switch (filter) {
    case 'critical':
      return incident.severity === 'critical'
    case 'new':
      return incident.status === 'new'
    case 'has_photo':
      return Boolean(incident.photoUrl)
    case 'all_open':
    default:
      return incident.status !== 'resolved'
  }
}

export default function PriorityQueue({ incidents, highlighted, onAction }) {
  const [filter, setFilter] = useState('all_open')

  const sorted = useMemo(() => {
    return incidents
      .filter((incident) => matchesFilter(incident, filter))
      .slice()
      .sort((a, b) => {
        const rankA = SEVERITIES.indexOf(a.severity)
        const rankB = SEVERITIES.indexOf(b.severity)
        if (rankA !== rankB) return rankA - rankB
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [incidents, filter])

  return (
    <div className="card queue-panel">
      <div className="queue-panel__toolbar">
        <h2>Priority queue</h2>
        <div className="filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip ${filter === f.key ? 'is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="queue-panel__list">
        {sorted.length === 0 && <p className="queue-panel__empty">Nothing matches this filter.</p>}
        <AnimatePresence initial={false}>
          {sorted.map((incident) => (
            <IncidentQueueCard
              key={incident.incidentId}
              incident={incident}
              isNew={highlighted.has(incident.incidentId)}
              onAction={onAction}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
