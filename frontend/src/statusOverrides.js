const STORAGE_KEY = 'siyabona.statusOverrides'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

export function setStatusOverride(incidentId, status) {
  const all = readAll()
  all[incidentId] = status
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function applyStatusOverrides(incidents) {
  const all = readAll()
  return incidents.map((incident) =>
    all[incident.incidentId] ? { ...incident, status: all[incident.incidentId] } : incident,
  )
}

export function clearStatusOverrides() {
  localStorage.removeItem(STORAGE_KEY)
}
