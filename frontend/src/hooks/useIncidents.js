import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchIncidents, updateStatus as apiUpdateStatus } from '../api'

const HIGHLIGHT_MS = 4000

export function useIncidents({ pollMs = 10000 } = {}) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [highlighted, setHighlighted] = useState(() => new Set())
  const [statusError, setStatusError] = useState(null)
  const knownIds = useRef(new Set())
  const isFirstLoad = useRef(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchIncidents()
      const list = data.incidents ?? []

      if (!isFirstLoad.current) {
        const newcomers = list
          .map((i) => i.incidentId)
          .filter((id) => !knownIds.current.has(id))

        if (newcomers.length > 0) {
          setHighlighted((prev) => new Set([...prev, ...newcomers]))
          setTimeout(() => {
            setHighlighted((prev) => {
              const next = new Set(prev)
              newcomers.forEach((id) => next.delete(id))
              return next
            })
          }, HIGHLIGHT_MS)
        }
      }

      knownIds.current = new Set(list.map((i) => i.incidentId))
      isFirstLoad.current = false
      setIncidents(list)
      setError(null)
      setLastUpdated(Date.now())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, pollMs)
    return () => clearInterval(id)
  }, [load, pollMs])

  const setStatus = useCallback(async (incident, newStatus) => {
    const { incidentId, status: previousStatus } = incident

    setIncidents((prev) =>
      prev.map((i) => (i.incidentId === incidentId ? { ...i, status: newStatus } : i)),
    )

    try {
      await apiUpdateStatus(incident, newStatus)
      setStatusError(null)
    } catch (err) {
      // Roll back the optimistic update — the server rejected the change
      // (e.g. a 409 because someone else already moved it past this step).
      setIncidents((prev) =>
        prev.map((i) => (i.incidentId === incidentId ? { ...i, status: previousStatus } : i)),
      )
      setStatusError(err.message)
    }
  }, [])

  return {
    incidents,
    loading,
    error,
    lastUpdated,
    highlighted,
    reload: load,
    setStatus,
    statusError,
    dismissStatusError: () => setStatusError(null),
  }
}
