import CategoryBreakdown from './CategoryBreakdown'
import UrgencyBreakdown from './UrgencyBreakdown'
import TimeHeatmap from './TimeHeatmap'

export default function AnalyticsRow({ incidents }) {
  return (
    <div className="analytics-row">
      <CategoryBreakdown incidents={incidents} />
      <UrgencyBreakdown incidents={incidents} />
      <TimeHeatmap incidents={incidents} />
    </div>
  )
}
