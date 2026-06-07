import { useState, useEffect, useRef, useCallback } from 'react'
import { request, get } from '../services/requestManager'

export default function useProgressiveData(endpoint, options = {}) {
  const {
    ttl,
    priority = 'normal',
    retries = 2,
    lazy = false,
    deps = [],
  } = options

  const [state, setState] = useState({ data: null, isLoading: !lazy, error: null })
  const mounted = useRef(false)
  const abortRef = useRef(null)

  const load = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    setState(prev => ({ ...prev, isLoading: true }))

    let promise
    if (typeof endpoint === 'function') {
      promise = endpoint().then(res => res.data ?? res)
    } else if (typeof endpoint === 'string') {
      promise = get(endpoint, {}, { ttl, priority, retries, signal })
    } else {
      const { url, params, ...rest } = endpoint
      promise = request(
        { url, params, method: 'get', ...rest, signal },
        { ttl, priority, retries }
      )
    }

    promise
      .then(data => {
        if (mounted.current && !signal.aborted) {
          setState({ data, isLoading: false, error: null })
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        if (mounted.current) {
          setState({ data: null, isLoading: false, error: err })
        }
      })

    return controller
  }, deps)

  useEffect(() => {
    mounted.current = true
    if (!lazy) {
      const ctrl = load()
      return () => {
        mounted.current = false
        ctrl?.abort()
      }
    }
    return () => { mounted.current = false }
  }, [load])

  const refetch = useCallback(() => { load() }, [load])

  return { ...state, refetch }
}
