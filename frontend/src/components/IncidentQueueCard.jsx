import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, User, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import SeverityPill from './SeverityPill'
import SparkleLabel from './SparkleLabel'
import StatusBar from './StatusBar'
import { incidentTypeLabel } from '../constants'
import { timeAgo } from '../utils/timeAgo'
import { refCode } from '../utils/incidentStats'
import { useTick } from '../hooks/useTick'

const NEXT_ACTION = {
  new: { label: 'Acknowledge', next: 'acknowledged' },
  acknowledged: { label: 'Dispatch', next: 'dispatched' },
  dispatched: { label: 'Mark resolved', next: 'resolved' },
}

export default function IncidentQueueCard({ incident, isNew, onAction }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  useTick()

  const action = NEXT_ACTION[incident.status]

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`queue-card ${isNew ? 'queue-card--new' : ''}`}
    >
      <header className="queue-card__header">
        <div className="queue-card__badges">
          <SeverityPill severity={incident.severity} />
          <span className="queue-card__type">{incidentTypeLabel(incident.incidentType)}</span>
        </div>
        <span className="queue-card__time">
          <Clock size={13} />
          {timeAgo(incident.createdAt)}
        </span>
      </header>

      {incident.aiSummary && (
        <div className="queue-card__summary-wrap">
          <SparkleLabel>AI summary</SparkleLabel>
          <p className="queue-card__summary">{incident.aiSummary}</p>
        </div>
      )}

      <div className="queue-card__facts">
        {incident.location && (
          <span className="queue-card__fact">
            <MapPin size={14} />
            {incident.location}
          </span>
        )}
        <span className="queue-card__fact">
          <User size={14} />
          {incident.isAnonymous ? 'Anonymous' : incident.reporterName || 'Anonymous'}
        </span>
      </div>

      {incident.photoViewUrl && (
        <img className="queue-card__photo" src={incident.photoViewUrl} alt="Incident scene" loading="lazy" />
      )}

      <StatusBar status={incident.status} />

      <div className="queue-card__actions">
        {action && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onAction(incident, action.next)}
          >
            {action.label}
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setDetailsOpen((v) => !v)}
        >
          Details {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {detailsOpen && (
        <div className="queue-card__details">
          {incident.description && <p>{incident.description}</p>}
          <span className="queue-card__ref mono">{refCode(incident.incidentId)}</span>
        </div>
      )}
    </motion.article>
  )
}
