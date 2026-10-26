const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const BLOCK_HOURS = 3
const BLOCK_COUNT = 24 / BLOCK_HOURS

export function refCode(incidentId) {
  const chars = String(incidentId ?? '').replace(/-/g, '').slice(0, 4).toUpperCase()
  return `SB-${chars || '0000'}`
}

export function ageMinutes(createdAt) {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return null
  return Math.max(0, (Date.now() - created) / 60000)
}

export function formatAge(minutes) {
  if (minutes == null) return '—'
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  if (hours < 24) return `${hours}h ${rest}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

export function medianOpenAge(incidents) {
  const ages = incidents
    .filter((i) => i.status !== 'resolved')
    .map((i) => ageMinutes(i.createdAt))
    .filter((a) => a != null)
    .sort((a, b) => a - b)
  if (ages.length === 0) return null
  const mid = Math.floor(ages.length / 2)
  return ages.length % 2 === 0 ? (ages[mid - 1] + ages[mid]) / 2 : ages[mid]
}

// Median minutes between two ISO-timestamp fields, counting only incidents
// that actually have `endField` set (e.g. acknowledgedAt/resolvedAt haven't
// existed until the status-workflow endpoint shipped).
export function medianDuration(incidents, startField, endField) {
  const durations = incidents
    .filter((i) => i[endField])
    .map((i) => {
      const start = new Date(i[startField]).getTime()
      const end = new Date(i[endField]).getTime()
      if (Number.isNaN(start) || Number.isNaN(end)) return null
      return Math.max(0, (end - start) / 60000)
    })
    .filter((v) => v != null)
    .sort((a, b) => a - b)

  if (durations.length === 0) return null
  const mid = Math.floor(durations.length / 2)
  return durations.length % 2 === 0
    ? (durations[mid - 1] + durations[mid]) / 2
    : durations[mid]
}

export function medianTimeToAcknowledge(incidents) {
  return medianDuration(incidents, 'createdAt', 'acknowledgedAt')
}

export function medianTimeToResolve(incidents) {
  return medianDuration(incidents, 'createdAt', 'resolvedAt')
}

export function categoryCounts(incidents) {
  const counts = {}
  for (const incident of incidents) {
    const key = incident.incidentType || 'other'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

export function severityCounts(incidents, severities) {
  return severities.map((level) => ({
    level,
    count: incidents.filter((i) => i.severity === level).length,
  }))
}

export function timeHeatmap(incidents) {
  const grid = Array.from({ length: 7 }, () => Array(BLOCK_COUNT).fill(0))
  for (const incident of incidents) {
    const date = new Date(incident.createdAt)
    if (Number.isNaN(date.getTime())) continue
    const day = date.getDay()
    const block = Math.min(BLOCK_COUNT - 1, Math.floor(date.getHours() / BLOCK_HOURS))
    grid[day][block] += 1
  }

  let peak = { day: 0, block: 0, count: 0 }
  grid.forEach((row, day) => {
    row.forEach((count, block) => {
      if (count > peak.count) peak = { day, block, count }
    })
  })

  const blockLabel = (block) => {
    const start = block * BLOCK_HOURS
    const end = start + BLOCK_HOURS
    return `${String(start).padStart(2, '0')}:00–${String(end % 24).padStart(2, '0')}:00`
  }

  return {
    grid,
    dayLabels: DAY_LABELS,
    blockLabels: Array.from({ length: BLOCK_COUNT }, (_, i) => blockLabel(i)),
    peak: peak.count > 0 ? { ...peak, label: `${DAY_LABELS[peak.day]} ${blockLabel(peak.block)}` } : null,
    max: Math.max(1, ...grid.flat()),
  }
}
