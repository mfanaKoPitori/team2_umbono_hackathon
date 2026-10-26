import { TriangleAlert, X } from 'lucide-react'
import DashboardHeader from '../components/DashboardHeader'
import KpiCards from '../components/KpiCards'
import IncidentMap from '../components/IncidentMap'
import PriorityQueue from '../components/PriorityQueue'
import AnalyticsRow from '../components/AnalyticsRow'
import Footer from '../components/Footer'
import { useIncidents } from '../hooks/useIncidents'
import './Dashboard.css'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const {
    incidents,
    loading,
    error,
    lastUpdated,
    highlighted,
    setStatus,
    statusError,
    dismissStatusError,
  } = useIncidents({ pollMs: 10000 })

  return (
    <div className="page dash">
      <DashboardHeader lastUpdated={lastUpdated} />

      <main className="dash__main">
        <div className="dash__greeting">
          <h1>{greeting()}, team.</h1>
          <p>AI has triaged every report. Work the queue from the top.</p>
        </div>

        {error && (
          <div className="alert alert--error">
            <TriangleAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {statusError && (
          <div className="alert alert--error">
            <TriangleAlert size={16} />
            <span>{statusError}</span>
            <button
              type="button"
              className="alert__dismiss"
              onClick={dismissStatusError}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="dash__skeleton">
            <div className="skeleton" style={{ height: 96 }} />
            <div className="skeleton" style={{ height: 420 }} />
          </div>
        ) : (
          <>
            <KpiCards incidents={incidents} />

            <div className="dash__columns">
              <IncidentMap incidents={incidents} onAction={setStatus} />
              <PriorityQueue incidents={incidents} highlighted={highlighted} onAction={setStatus} />
            </div>

            <AnalyticsRow incidents={incidents} />
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
