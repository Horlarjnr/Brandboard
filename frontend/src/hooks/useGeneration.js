import { useCallback, useEffect, useRef, useState } from 'react'
import { startGeneration, getGeneration } from '../lib/api.js'
import { POLL_INTERVAL_MS } from '../lib/constants.js'

const IDLE = { phase: 'idle', step: null, result: null, error: null, generationId: null }

// Starts a generation and polls until it is done or failed.
// phase: idle | pending | done | failed
export default function useGeneration(code, token) {
  const [state, setState] = useState(IDLE)
  const timer = useRef(null)
  const cancelled = useRef(false)

  const stop = useCallback(() => {
    cancelled.current = true
    if (timer.current) clearTimeout(timer.current)
  }, [])

  useEffect(() => stop, [stop])

  const run = useCallback(
    async ({ prompt, size, parentId = null }) => {
      stop()
      cancelled.current = false
      setState({ phase: 'pending', step: 'queued', result: null, error: null, generationId: null })
      // One request_id per click: a retry of the same click stays idempotent.
      const requestId = crypto.randomUUID()
      try {
        const { id } = await startGeneration(code, token, { requestId, prompt, size, parentId })
        if (cancelled.current) return
        setState((s) => ({ ...s, generationId: id }))
        const poll = async () => {
          if (cancelled.current) return
          try {
            const g = await getGeneration(id, token)
            if (cancelled.current) return
            if (g.status === 'done') {
              setState({ phase: 'done', step: g.step, result: g, error: null, generationId: id })
            } else if (g.status === 'failed') {
              setState({
                phase: 'failed',
                step: g.step,
                result: null,
                error: g.error || 'Generation failed',
                generationId: id,
              })
            } else {
              setState((s) => ({ ...s, step: g.step }))
              timer.current = setTimeout(poll, POLL_INTERVAL_MS)
            }
          } catch (e) {
            setState({ phase: 'failed', step: null, result: null, error: e.message, generationId: id })
          }
        }
        poll()
      } catch (e) {
        setState({ phase: 'failed', step: null, result: null, error: e.message, generationId: null })
      }
    },
    [code, token, stop],
  )

  const reset = useCallback(() => {
    stop()
    setState(IDLE)
  }, [stop])

  return { ...state, run, reset }
}
