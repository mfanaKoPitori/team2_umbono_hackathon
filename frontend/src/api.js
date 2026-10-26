import { API_URL, STATUS_API_ENABLED } from './config'
import { applyStatusOverrides, setStatusOverride, clearStatusOverrides } from './statusOverrides'

if (STATUS_API_ENABLED) {
  // The server is now the source of truth for status — drop any stale
  // local-only overrides left over from before this endpoint existed.
  clearStatusOverrides()
}

export async function fetchIncidents() {
  const res = await fetch(API_URL)
  if (!res.ok) {
    throw new Error(`Failed to load incidents (${res.status})`)
  }
  const data = await res.json()
  const incidents = STATUS_API_ENABLED
    ? (data.incidents ?? [])
    : applyStatusOverrides(data.incidents ?? [])
  return { ...data, incidents }
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

// Saves the status through the submit-report Lambda's 'update_status' action.
// The server only accepts the next step in the workflow and replies 409 if the
// incident has already moved on. With STATUS_API_ENABLED off, the change is
// kept in localStorage instead, so it only shows in this browser.
export async function updateStatus(incident, newStatus) {
  if (!STATUS_API_ENABLED) {
    setStatusOverride(incident.incidentId, newStatus)
    return { incidentId: incident.incidentId, status: newStatus }
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_status',
      incidentId: incident.incidentId,
      timestamp: incident.timestamp,
      status: newStatus,
    }),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    throw new Error(data?.error || `Failed to update status (${res.status})`)
  }
  return data
}

// TODO: no photo upload endpoint exists yet. Wire this up to S3 (e.g. a
// presigned URL) once the backend supports it. Until then it resolves to
// null and the report is submitted without a photoUrl.
export async function uploadPhoto(_file) {
  return null
}
