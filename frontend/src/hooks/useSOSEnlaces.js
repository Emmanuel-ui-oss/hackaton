import { useState, useEffect } from 'react'
import api from '../services/api'

export default function useSOSEnlaces(sosId) {
  const [enlaces, setEnlaces] = useState(null)

  useEffect(() => {
    if (!sosId) { setEnlaces(null); return }
    let cancelled = false
    api.get(`/api/v1/sos/${sosId}/enlaces`)
      .then(r => { if (!cancelled) setEnlaces(r.data) })
      .catch(() => { if (!cancelled) setEnlaces(null) })
    return () => { cancelled = true }
  }, [sosId])

  return enlaces
}
