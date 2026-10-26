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

/**
 * Uploads an incident photo straight to the team's S3 bucket.
 *
 * Asks get-reports for a presigned upload link, then posts the photo to S3.
 * Call it before submitIncident and send the returned URL as `photoUrl`. If
 * the report is never submitted, the photo stays in the bucket unreferenced.
 *
 * @param {Blob} photo JPEG, PNG or WebP image, at most 5 MB (S3 rejects
 *   anything else). Use resizePhoto to convert a picked file.
 * @returns {Promise<string>} S3 URL of the stored photo. The bucket is
 *   private: display photos through the incident's `photoViewUrl`.
 * @throws {Error} When the upload link cannot be fetched or S3 refuses the file.
 */
export async function uploadPhoto(photo) {
  const linkRes = await fetch(`${API_URL}?photoUpload=${encodeURIComponent(photo.type)}`)
  let link = null
  try {
    link = await linkRes.json()
  } catch {
    link = null
  }
  if (!linkRes.ok) {
    throw new Error(link?.error || `Failed to prepare photo upload (${linkRes.status})`)
  }

  // S3 presigned POST: every policy field must come before the file.
  const form = new FormData()
  Object.entries(link.photoUpload.fields).forEach(([name, fieldValue]) => form.append(name, fieldValue))
  form.append('file', photo)
  const uploadRes = await fetch(link.photoUpload.url, { method: 'POST', body: form })
  if (!uploadRes.ok) {
    throw new Error(`Photo upload failed (${uploadRes.status})`)
  }
  return link.photoUrl
}
