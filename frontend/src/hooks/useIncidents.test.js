import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchIncidents, updateStatus } from '../api'
import { useIncidents } from './useIncidents'

vi.mock('../api', () => ({ fetchIncidents: vi.fn(), updateStatus: vi.fn() }))

// Long enough that only the first load and explicit reloads run in a test
const NO_POLLING = { pollMs: 600000, hiddenPollMs: null }

function incident(incidentId, status) {
  return { incidentId, timestamp: '2026-10-27T08:00:00Z', status }
}

function respondWith(...incidents) {
  return { incidents, count: incidents.length }
}

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function statusOf(result, incidentId) {
  return result.current.incidents.find((i) => i.incidentId === incidentId)?.status
}

async function renderFeed(...incidents) {
  fetchIncidents.mockResolvedValueOnce(respondWith(...incidents))
  const view = renderHook(() => useIncidents(NO_POLLING))
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

beforeEach(() => {
  fetchIncidents.mockReset()
  updateStatus.mockReset()
})

describe('useIncidents after a status change', () => {
  it('keeps the saved status when the reload still reads the old one', async () => {
    const { result } = await renderFeed(incident('a', 'new'))
    updateStatus.mockResolvedValueOnce({ status: 'acknowledged' })
    fetchIncidents.mockResolvedValueOnce(respondWith(incident('a', 'new')))

    await act(() => result.current.setStatus(incident('a', 'new'), 'acknowledged'))
    await waitFor(() => expect(fetchIncidents).toHaveBeenCalledTimes(2))

    expect(statusOf(result, 'a')).toBe('acknowledged')
  })

  it('does not flash the incident as changed once the server catches up', async () => {
    const { result } = await renderFeed(incident('a', 'new'))
    updateStatus.mockResolvedValueOnce({ status: 'acknowledged' })
    fetchIncidents.mockResolvedValueOnce(respondWith(incident('a', 'new')))
    await act(() => result.current.setStatus(incident('a', 'new'), 'acknowledged'))
    await waitFor(() => expect(fetchIncidents).toHaveBeenCalledTimes(2))

    fetchIncidents.mockResolvedValueOnce(respondWith(incident('a', 'acknowledged')))
    await act(() => result.current.reload())

    expect(statusOf(result, 'a')).toBe('acknowledged')
    expect(result.current.highlighted.has('a')).toBe(false)
  })

  it('shows a later status another responder set', async () => {
    const { result } = await renderFeed(incident('a', 'new'))
    updateStatus.mockResolvedValueOnce({ status: 'acknowledged' })
    fetchIncidents.mockResolvedValueOnce(respondWith(incident('a', 'dispatched')))

    await act(() => result.current.setStatus(incident('a', 'new'), 'acknowledged'))

    await waitFor(() => expect(statusOf(result, 'a')).toBe('dispatched'))
  })

  it('rolls a rejected change back to the latest loaded status', async () => {
    const { result } = await renderFeed(incident('a', 'new'))
    fetchIncidents.mockResolvedValueOnce(respondWith(incident('a', 'acknowledged')))
    await act(() => result.current.reload())
    updateStatus.mockRejectedValueOnce(new Error('Incident not found, or it is not new yet'))
    const reloadAfterFailure = deferred()
    fetchIncidents.mockReturnValueOnce(reloadAfterFailure.promise)

    // The card was rendered before the reload, so it still says 'new'
    await act(() => result.current.setStatus(incident('a', 'new'), 'acknowledged'))

    expect(statusOf(result, 'a')).toBe('acknowledged')
    expect(result.current.statusError).toMatch(/not new yet/)
  })
})

describe('useIncidents with overlapping requests', () => {
  it('ignores a slow response that started before a newer one', async () => {
    const { result } = await renderFeed(incident('a', 'new'))
    const older = deferred()
    const newer = deferred()
    fetchIncidents.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)

    act(() => {
      result.current.reload()
      result.current.reload()
    })
    await act(async () => newer.resolve(respondWith(incident('a', 'new'), incident('b', 'new'))))
    await act(async () => older.resolve(respondWith(incident('a', 'new'))))

    expect(result.current.incidents.map((i) => i.incidentId)).toEqual(['a', 'b'])
  })

  it('stays live when an older request fails after a newer one succeeded', async () => {
    const { result } = await renderFeed(incident('a', 'new'))
    const older = deferred()
    const newer = deferred()
    fetchIncidents.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)

    act(() => {
      result.current.reload()
      result.current.reload()
    })
    await act(async () => newer.resolve(respondWith(incident('a', 'new'))))
    await act(async () => older.reject(new Error('Failed to load incidents (503)')))

    expect(result.current.error).toBeNull()
  })

  it('reports an error from the latest request', async () => {
    const { result } = await renderFeed(incident('a', 'new'))
    fetchIncidents.mockRejectedValueOnce(new Error('Failed to load incidents (503)'))

    await act(() => result.current.reload())

    expect(result.current.error).toBe('Failed to load incidents (503)')
  })
})
