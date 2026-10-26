import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchIncidents, updateStatus as apiUpdateStatus } from '../api'
import { STATUS_STEPS } from '../constants'
import { usePolling } from './usePolling'

const HIGHLIGHT_MS = 4000

// Statuses only move forward, so a status behind one this browser saved comes
// from a read that started before the save landed.
function isStatusBehind(status, savedStatus) {
  return STATUS_STEPS.indexOf(status) < STATUS_STEPS.indexOf(savedStatus)
}

export function useIncidents({ pollMs = 5000, hiddenPollMs = 30000 } = {}) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [highlighted, setHighlighted] = useState(() => new Set())
  const [statusError, setStatusError] = useState(null)
  // Incidents that arrived or changed while the tab was in the background
  const [unseen, setUnseen] = useState(0)
  const shown = useRef(null)
  // Status changes sent from this browser that the server hasn't confirmed yet
  const pendingStatus = useRef(new Map())
  // Status changes the server accepted, kept until a load returns them
  const savedStatus = useRef(new Map())
  // Latest status per incident as the server reported it
  const serverStatus = useRef(new Map())
  // Bumped whenever a status change settles, so older responses are dropped
  const statusVersion = useRef(0)
  // reload() can run alongside a poll, so responses may arrive out of order.
  // Numbering requests lets an older response be dropped once a newer one
  // has been shown.
  const lastRequest = useRef(0)
  const lastShownRequest = useRef(0)

  const highlight = useCallback((ids) => {
    setHighlighted((prev) => new Set([...prev, ...ids]))
    setTimeout(() => {
      setHighlighted((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }, HIGHLIGHT_MS)
  }, [])

  const load = useCallback(async () => {
    const version = statusVersion.current
    const request = ++lastRequest.current
    try {
      const data = await fetchIncidents()
      // A status change finished while this was in flight, so the response
      // may predate it. The reload that change triggers will be accurate.
      if (version !== statusVersion.current) return
      if (request < lastShownRequest.current) return
      lastShownRequest.current = request

      const incidents = data.incidents ?? []
      serverStatus.current = new Map(incidents.map((i) => [i.incidentId, i.status]))
      const list = incidents.map((i) => {
        const pending = pendingStatus.current.get(i.incidentId)
        if (pending) return { ...i, status: pending }
        const saved = savedStatus.current.get(i.incidentId)
        if (saved && isStatusBehind(i.status, saved)) return { ...i, status: saved }
        // The server has caught up with the save, or moved past it
        savedStatus.current.delete(i.incidentId)
        return i
      })

      if (shown.current) {
        // New incidents, and ones another responder moved along
        const changed = list
          .filter((i) => {
            const before = shown.current.get(i.incidentId)
            return before === undefined || before !== i.status
          })
          .map((i) => i.incidentId)
        if (changed.length > 0) {
          highlight(changed)
          if (document.hidden) setUnseen((n) => n + changed.length)
        }
      }

      shown.current = new Map(list.map((i) => [i.incidentId, i.status]))
      setIncidents(list)
      setError(null)
      setLastUpdated(Date.now())
    } catch (err) {
      // Stay live if a newer request has already succeeded
      if (request > lastShownRequest.current) setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [highlight])

  usePolling(load, pollMs, { hiddenIntervalMs: hiddenPollMs })

  const reload = useCallback(() => load().catch(() => {}), [load])

  useEffect(() => {
    function clearUnseen() {
      if (!document.hidden) setUnseen(0)
    }
    document.addEventListener('visibilitychange', clearUnseen)
    return () => document.removeEventListener('visibilitychange', clearUnseen)
  }, [])

  const setStatus = useCallback(async (incident, newStatus) => {
    const { incidentId } = incident

    pendingStatus.current.set(incidentId, newStatus)
    shown.current?.set(incidentId, newStatus)
    setIncidents((prev) =>
      prev.map((i) => (i.incidentId === incidentId ? { ...i, status: newStatus } : i)),
    )

    try {
      await apiUpdateStatus(incident, newStatus)
      savedStatus.current.set(incidentId, newStatus)
      setStatusError(null)
    } catch (err) {
      // Roll back the optimistic update — the server rejected the change
      // (e.g. a 409 because someone else already moved it past this step).
      // Use the latest status loaded, which may be newer than the clicked card.
      const previousStatus =
        savedStatus.current.get(incidentId) ??
        serverStatus.current.get(incidentId) ??
        incident.status
      shown.current?.set(incidentId, previousStatus)
      setIncidents((prev) =>
        prev.map((i) => (i.incidentId === incidentId ? { ...i, status: previousStatus } : i)),
      )
      setStatusError(err.message)
    } finally {
      pendingStatus.current.delete(incidentId)
      statusVersion.current += 1
      // Fetch the saved incident: the real status, plus timestamps for the KPIs
      reload()
    }
  }, [reload])

  return {
    incidents,
    loading,
    error,
    lastUpdated,
    highlighted,
    unseen,
    reload,
    setStatus,
    statusError,
    dismissStatusError: () => setStatusError(null),
  }
}
