export function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diffSec = Math.round((Date.now() - date.getTime()) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`

  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour} hr ago`

  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
