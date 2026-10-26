import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { SEVERITY_META, SANDTON_CENTER } from '../constants'
import { incidentPosition } from '../utils/stablePosition'
import { timeAgo } from '../utils/timeAgo'
import SeverityPill from './SeverityPill'
import SparkleLabel from './SparkleLabel'

const NEXT_ACTION = {
  new: { label: 'Acknowledge', next: 'acknowledged' },
  acknowledged: { label: 'Dispatch', next: 'dispatched' },
  dispatched: { label: 'Mark resolved', next: 'resolved' },
}

const SEVERITY_WEIGHT = { critical: 1, high: 0.7, medium: 0.45, low: 0.25 }

function pinIcon(color) {
  return L.divIcon({
    className: 'incident-pin-wrap',
    html: `<span class="incident-pin" style="--pin-color:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
}

function HeatLayer({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return undefined
    const layer = L.heatLayer(points, { radius: 30, blur: 24, maxZoom: 16 }).addTo(map)
    return () => {
      map.removeLayer(layer)
    }
  }, [map, points])
  return null
}

export default function IncidentMap({ incidents, onAction }) {
  const [mode, setMode] = useState('pins')

  const positioned = useMemo(
    () => incidents.map((incident) => ({ incident, pos: incidentPosition(incident) })),
    [incidents],
  )

  const heatPoints = useMemo(
    () =>
      positioned.map(({ incident, pos }) => [
        pos.lat,
        pos.lng,
        SEVERITY_WEIGHT[incident.severity] ?? 0.3,
      ]),
    [positioned],
  )

  return (
    <div className="card map-panel">
      <div className="map-panel__toolbar">
        <h2>Live map</h2>
        <div className="segmented">
          <button
            type="button"
            className={mode === 'pins' ? 'is-active' : ''}
            onClick={() => setMode('pins')}
          >
            Pins
          </button>
          <button
            type="button"
            className={mode === 'heat' ? 'is-active' : ''}
            onClick={() => setMode('heat')}
          >
            Heatmap
          </button>
        </div>
      </div>

      <div className="map-panel__canvas">
        <MapContainer
          center={[SANDTON_CENTER.lat, SANDTON_CENTER.lng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            className="map-tiles"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {mode === 'heat' && <HeatLayer points={heatPoints} />}

          {mode === 'pins' &&
            positioned.map(({ incident, pos }) => {
              const meta = SEVERITY_META[incident.severity] ?? SEVERITY_META.low
              const action = NEXT_ACTION[incident.status]
              return (
                <Marker
                  key={incident.incidentId}
                  position={[pos.lat, pos.lng]}
                  icon={pinIcon(meta.color)}
                >
                  <Popup>
                    <div className="map-popup">
                      <div className="map-popup__header">
                        <SeverityPill severity={incident.severity} size="sm" />
                        <span className="map-popup__time">{timeAgo(incident.createdAt)}</span>
                      </div>
                      {incident.aiSummary && <SparkleLabel>AI summary</SparkleLabel>}
                      <p className="map-popup__summary">
                        {incident.aiSummary || incident.description}
                      </p>
                      {action && (
                        <button
                          type="button"
                          className="btn btn--primary btn--sm btn--block"
                          onClick={() => onAction(incident, action.next)}
                        >
                          {action.label}
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
        </MapContainer>
      </div>
    </div>
  )
}
