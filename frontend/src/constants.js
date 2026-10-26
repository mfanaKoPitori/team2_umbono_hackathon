export const INCIDENT_TYPES = [
  { value: 'suspicious_activity', icon: 'Eye' },
  { value: 'theft', icon: 'Wallet' },
  { value: 'vandalism', icon: 'SprayCan' },
  { value: 'traffic', icon: 'Car' },
  { value: 'fire', icon: 'Flame' },
  { value: 'medical', icon: 'HeartPulse' },
  { value: 'noise', icon: 'Volume2' },
  { value: 'infrastructure', icon: 'Construction' },
  { value: 'other', icon: 'CircleHelp' },
]

export const SEVERITIES = ['critical', 'high', 'medium', 'low']

// English labels for the responder-facing dashboard (map, queue, analytics).
// The resident report form has its own translated severity labels — see i18n.jsx.
export const SEVERITY_META = {
  critical: { label: 'Critical', color: 'var(--critical)', soft: 'var(--critical-soft)' },
  high: { label: 'High', color: 'var(--high)', soft: 'var(--high-soft)' },
  medium: { label: 'Medium', color: 'var(--medium)', soft: 'var(--medium-soft)' },
  low: { label: 'Low', color: 'var(--low)', soft: 'var(--low-soft)' },
}

// 4-step lifecycle shown on both the dashboard status bar and the resident
// tracker. "resolved" only ever exists client-side via updateStatus() — see
// api.js — since the backend has no status-update endpoint yet.
export const STATUS_STEPS = ['new', 'acknowledged', 'dispatched', 'resolved']

export function incidentTypeMeta(value) {
  return INCIDENT_TYPES.find((t) => t.value === value) ?? INCIDENT_TYPES.at(-1)
}

// English labels for the responder dashboard. The resident report form uses
// its own translated labels — see i18n.jsx.
const TYPE_LABELS = {
  suspicious_activity: 'Suspicious activity',
  theft: 'Theft',
  vandalism: 'Vandalism',
  traffic: 'Traffic',
  fire: 'Fire',
  medical: 'Medical',
  noise: 'Noise',
  infrastructure: 'Infrastructure',
  other: 'Other',
}

export function incidentTypeLabel(value) {
  return TYPE_LABELS[value] ?? 'Other'
}

export const SANDTON_CENTER = { lat: -26.1076, lng: 28.0567 }
