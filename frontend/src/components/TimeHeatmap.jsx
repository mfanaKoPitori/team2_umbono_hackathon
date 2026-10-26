import { Fragment } from 'react'
import { timeHeatmap } from '../utils/incidentStats'

const NAVY = [44, 58, 75]
const ORANGE = [255, 153, 0]

function cellColor(ratio) {
  const r = Math.round(NAVY[0] + (ORANGE[0] - NAVY[0]) * ratio)
  const g = Math.round(NAVY[1] + (ORANGE[1] - NAVY[1]) * ratio)
  const b = Math.round(NAVY[2] + (ORANGE[2] - NAVY[2]) * ratio)
  return `rgb(${r}, ${g}, ${b})`
}

export default function TimeHeatmap({ incidents }) {
  const { grid, dayLabels, blockLabels, peak, max } = timeHeatmap(incidents)

  return (
    <div className="card analytics-panel">
      <h3>When incidents happen</h3>
      <div className="heatmap" style={{ '--blocks': blockLabels.length }}>
        <div className="heatmap__corner" />
        {blockLabels.map((label, i) => (
          <span key={i} className="heatmap__col-label mono">
            {label.slice(0, 2)}
          </span>
        ))}
        {grid.map((row, dayIndex) => (
          <Fragment key={dayIndex}>
            <span className="heatmap__row-label">{dayLabels[dayIndex]}</span>
            {row.map((count, blockIndex) => (
              <span
                key={blockIndex}
                className="heatmap__cell"
                style={{ background: cellColor(count / max) }}
                title={`${dayLabels[dayIndex]} ${blockLabels[blockIndex]} · ${count} report${count === 1 ? '' : 's'}`}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <p className="analytics-panel__peak">
        {peak ? (
          <>
            Peak: <strong>{peak.label}</strong> ({peak.count} report{peak.count === 1 ? '' : 's'})
          </>
        ) : (
          'No data yet.'
        )}
      </p>
    </div>
  )
}
