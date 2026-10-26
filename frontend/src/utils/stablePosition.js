import { SANDTON_CENTER } from '../constants'

function hash(str, seed) {
  let h = seed
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h ^ str.charCodeAt(i), 2654435761) >>> 0) + h
  }
  return (h >>> 0) / 4294967295
}

// Deterministic lat/lng near Sandton, derived from the incidentId, used
// whenever an incident has no real GPS coordinates attached.
export function stablePosition(incidentId) {
  const id = String(incidentId ?? 'unknown')
  const latOffset = (hash(id, 0x9e3779b9) - 0.5) * 0.05
  const lngOffset = (hash(id, 0x85ebca6b) - 0.5) * 0.05
  return {
    lat: SANDTON_CENTER.lat + latOffset,
    lng: SANDTON_CENTER.lng + lngOffset,
  }
}

export function incidentPosition(incident) {
  const lat = Number(incident.latitude)
  const lng = Number(incident.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng }
  }
  return stablePosition(incident.incidentId)
}
