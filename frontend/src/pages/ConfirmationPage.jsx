import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom'
import { CheckCircle2, ImageOff, ShieldAlert } from 'lucide-react'
import ResidentHeader from '../components/ResidentHeader'
import Footer from '../components/Footer'
import SeverityPill from '../components/SeverityPill'
import SparkleLabel from '../components/SparkleLabel'
import StatusTracker from '../components/StatusTracker'
import { useLanguage } from '../i18n.jsx'
import { fetchIncidents } from '../api'
import { usePolling } from '../hooks/usePolling'
import { refCode } from '../utils/incidentStats'
import './Confirmation.css'

export default function ConfirmationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const wasPhotoDropped = Boolean(useLocation().state?.wasPhotoDropped)
  const { t } = useLanguage()
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submittedAt] = useState(() => new Date())

  const load = useCallback(async () => {
    try {
      const data = await fetchIncidents()
      const match = (data.incidents ?? []).find((i) => i.incidentId === id)
      if (match) setIncident(match)
    } finally {
      setLoading(false)
    }
  }, [id])

  usePolling(load, 5000)

  const time = (incident ? new Date(incident.createdAt) : submittedAt).toLocaleTimeString(
    undefined,
    { hour: '2-digit', minute: '2-digit' },
  )

  return (
    <div className="page confirmation">
      <ResidentHeader />

      <main className="confirmation__main">
        <div className="confirmation__hero">
          <CheckCircle2 size={56} className="confirmation__check" />
          <h1>{t('reportSent')}</h1>
          <p className="confirmation__meta">
            {t('refLabel')} {refCode(id)} · {time}
          </p>
        </div>

        {wasPhotoDropped && (
          <div className="alert alert--warning" role="status">
            <ImageOff size={16} />
            <span>{t('photoDropped')}</span>
          </div>
        )}

        <div className="card confirmation__panel">
          <SparkleLabel>{t('aiTriageTitle')}</SparkleLabel>
          {loading && !incident ? (
            <div className="confirmation__skeleton">
              <span className="skeleton" style={{ height: 18, width: '60%' }} />
              <span className="skeleton" style={{ height: 14, width: '90%' }} />
            </div>
          ) : incident ? (
            <>
              <SeverityPill severity={incident.severity} />
              <p className="confirmation__summary">{incident.aiSummary}</p>
            </>
          ) : (
            <p className="confirmation__summary">{t('processingFallback')}</p>
          )}
        </div>

        <div className="card confirmation__panel">
          <h2>{t('whatNext')}</h2>
          <StatusTracker status={incident?.status ?? 'new'} />
        </div>

        <div className="safety-box">
          <ShieldAlert size={20} />
          <div>
            <strong>{t('safetyTitle')}</strong>
            <p>{t('safetyBody')}</p>
          </div>
        </div>

        <div className="confirmation__actions">
          <Link to="/report" className="btn btn--primary btn--block">
            {t('reportAnother')}
          </Link>
          <button type="button" className="btn btn--secondary btn--block" onClick={() => navigate(-1)}>
            {t('back')}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  )
}
