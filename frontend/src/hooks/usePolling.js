import { useEffect, useRef } from 'react'

const MAX_BACKOFF_MS = 60000

// Calls `fn` now and then every `intervalMs`, as the live feed for the app.
// - Only one call runs at a time; the next is scheduled when it finishes.
// - While the tab is hidden, polls every `hiddenIntervalMs` instead, or pauses
//   if that's null. Refreshes as soon as the tab is shown again, or when the
//   browser comes back online.
// - After a failure (fn throws), waits twice as long each time, up to a minute.
export function usePolling(fn, intervalMs, { hiddenIntervalMs = null } = {}) {
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  useEffect(() => {
    let timer = null
    let running = false
    let stopped = false
    let failures = 0

    function schedule() {
      clearTimeout(timer)
      const base = document.hidden ? hiddenIntervalMs : intervalMs
      if (stopped || base == null) return
      const delay = Math.min(base * 2 ** failures, MAX_BACKOFF_MS)
      timer = setTimeout(tick, delay)
    }

    async function tick() {
      if (running || stopped) return
      running = true
      try {
        await fnRef.current()
        failures = 0
      } catch {
        failures += 1
      } finally {
        running = false
        schedule()
      }
    }

    function refreshNow() {
      if (document.hidden) {
        // Switch to the background rate (or pause) from now on
        if (!running) schedule()
        return
      }
      failures = 0
      clearTimeout(timer)
      tick()
    }

    tick()
    document.addEventListener('visibilitychange', refreshNow)
    window.addEventListener('online', refreshNow)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refreshNow)
      window.removeEventListener('online', refreshNow)
    }
  }, [intervalMs, hiddenIntervalMs])
}
