import { CheckCircle2 } from 'lucide-react'
import { STATUS_STEPS } from '../constants'
import { useLanguage } from '../i18n.jsx'

export default function StatusTracker({ status }) {
  const { stepLabel } = useLanguage()
  const currentIndex = Math.max(0, STATUS_STEPS.indexOf(status))

  return (
    <ol className="status-tracker">
      {STATUS_STEPS.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'future'
        return (
          <li key={step} className={`status-tracker__item status-tracker__item--${state}`}>
            <span className="status-tracker__marker">
              {state === 'done' ? <CheckCircle2 size={18} /> : <span className="status-tracker__dot" />}
            </span>
            <span className="status-tracker__label">{stepLabel(step)}</span>
          </li>
        )
      })}
    </ol>
  )
}
