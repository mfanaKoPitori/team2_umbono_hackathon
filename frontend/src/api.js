import { API_URL } from './config'
import { applyStatusOverrides, setStatusOverride } from './statusOverrides'

export async function fetchIncidents() {
  const res = await fetch(API_URL)
  if (!res.ok) {
    throw new Error(`Failed to load incidents (${res.status})`)
  }
  const data = await res.json()
  return { ...data, incidents: applyStatusOverrides(data.incidents ?? []) }
}

export async function submitIncident(incident) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incident),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const error = new Error(data?.error || `Failed to submit report (${res.status})`)
    error.details = data?.details
    throw error
  }
  return data
}

// TODO: there is no backend endpoint to change an incident's status yet.
// This updates the status optimistically in the UI only (persisted to
// localStorage so it survives refresh/navigation within this browser).
// Swap the body for a real PATCH/POST call once that endpoint exists.
export async function updateStatus(incidentId, newStatus) {
  setStatusOverride(incidentId, newStatus)
  return { incidentId, status: newStatus }
}

// TODO: no photo upload endpoint exists yet. Wire this up to S3 (e.g. a
// presigned URL) once the backend supports it. Until then it resolves to
// null and the report is submitted without a photoUrl.
export async function uploadPhoto(_file) {
  return null
}
