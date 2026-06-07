import { useState, useEffect, useRef, useCallback } from 'react'

export default function usePageData(fetchFn, active = true, transform = null) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!!active)
  const [error, setError] = useState(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (!active) { setData(null); fetched.current = false; return }
    if (fetched.current) return
    fetched.current = true
    const doFetch = () => fetchFn()
      .then(res => setData(transform ? transform(res.data) : (res.data?.results ?? res.data ?? [])))
      .catch(err => {
        setError(err)
        setTimeout(() => { fetched.current = false }, 3000)
      })
    setLoading(true)
    setError(null)
    doFetch().finally(() => setLoading(false))
  }, [active, fetchFn])

  const invalidate = useCallback(() => {
    fetched.current = false
    setLoading(true)
    fetched.current = true
    return fetchFn()
      .then(res => setData(transform ? transform(res.data) : (res.data?.results ?? res.data ?? [])))
      .catch(err => {
        setError(err)
        setTimeout(() => { fetched.current = false }, 3000)
      })
      .finally(() => setLoading(false))
  }, [fetchFn])

  return { data, loading, error, load: invalidate, invalidate, setData }
}
