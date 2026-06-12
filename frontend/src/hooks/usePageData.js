import { useState, useEffect, useRef, useCallback } from 'react'
import { get } from '../services/requestManager'

function extractData(res) {
  if (res && typeof res === 'object' && 'data' in res && 'status' in res) return res.data
  return res
}

export default function usePageData(urlOrFn, active = true, transform = null) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!!active)
  const [error, setError] = useState(null)
  const fetched = useRef(false)
  const isString = typeof urlOrFn === 'string'

  const fetchFn = useCallback(() => {
    if (isString) {
      return get(urlOrFn, {}, { ttl: 60000 })
    }
    return urlOrFn().then(res => extractData(res))
  }, [urlOrFn, isString])

  useEffect(() => {
    if (!active) { setData(null); fetched.current = false; return }
    if (fetched.current) return
    fetched.current = true
    setLoading(true)
    setError(null)
    fetchFn()
      .then(data => setData(transform ? transform(data) : (Array.isArray(data) ? data : (data?.results ?? data ?? []))))
      .catch(err => {
        setError(err)
        setTimeout(() => { fetched.current = false }, 4000)
      })
      .finally(() => setLoading(false))
  }, [active, fetchFn, isString, transform])

  const invalidate = useCallback(() => {
    fetched.current = false
    setLoading(true)
    fetched.current = true
    return fetchFn()
      .then(data => setData(transform ? transform(data) : (Array.isArray(data) ? data : (data?.results ?? data ?? []))))
      .catch(err => {
        setError(err)
        setTimeout(() => { fetched.current = false }, 4000)
      })
      .finally(() => setLoading(false))
  }, [fetchFn, transform])

  return { data, loading, error, load: invalidate, invalidate, setData }
}
