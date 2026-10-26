import { motion } from 'framer-motion'
import { ListChecks, Siren, Clock, CheckCircle2 } from 'lucide-react'
import { medianOpenAge, formatAge } from '../utils/incidentStats'

export default function KpiCards({ incidents }) {
  const open = incidents.filter((i) => i.status !== 'resolved').length
  const criticalUnacked = incidents.filter((i) => i.severity === 'critical' && i.status === 'new').length
  const medianAge = medianOpenAge(incidents)
  const resolved = incidents.filter((i) => i.status === 'resolved').length

  const cards = [
    { icon: ListChecks, label: 'Open incidents', value: open, tone: 'accent' },
    { icon: Siren, label: 'Critical, not yet acknowledged', value: criticalUnacked, tone: 'critical' },
    { icon: Clock, label: 'Median age of open incidents', value: formatAge(medianAge), tone: 'default' },
    { icon: CheckCircle2, label: 'Resolved', value: resolved, tone: 'live' },
  ]

  return (
    <div className="kpi-grid">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          className={`kpi-card kpi-card--${card.tone}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.04 }}
        >
          <card.icon size={18} className="kpi-card__icon" />
          <span className="kpi-card__value mono">{card.value}</span>
          <span className="kpi-card__label">{card.label}</span>
        </motion.div>
      ))}
    </div>
  )
}
