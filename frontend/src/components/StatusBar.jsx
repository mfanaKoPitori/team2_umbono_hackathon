import { STATUS_STEPS } from '../constants'

const LABELS = {
  new: 'New',
  acknowledged: 'Acknowledged',
  dispatched: 'Dispatched',
  resolved: 'Resolved',
}

export default function StatusBar({ status }) {
  const currentIndex = Math.max(0, STATUS_STEPS.indexOf(status))

  return (
    <div className="status-bar">
      {STATUS_STEPS.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'future'
        return (
          <div key={step} className={`status-bar__step status-bar__step--${state}`}>
            <span className="status-bar__track">
              <span className="status-bar__dot" />
              {i < STATUS_STEPS.length - 1 && <span className="status-bar__line" />}
            </span>
            <span className="status-bar__label">{LABELS[step]}</span>
          </div>
        )
      })}
    </div>
  )
}
