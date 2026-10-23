// Copy into Academy src/components/. Uses existing auth and API helpers.
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuthSession } from '../auth'
import { apiFetch } from '../services/api'

export default function FlamesLab({ vendor = 'fortigate', labUrl = import.meta.env.VITE_FORTISIM_URL }) {
  const frame = useRef(null)
  const [courses, setCourses] = useState([])
  const [error, setError] = useState('')
  let origin = ''
  try {
    const url = new URL(labUrl)
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) origin = url.origin
  } catch { /* Show setup instructions below. */ }
  const refresh = useCallback(async () => {
    try {
      const result = await apiFetch('/integrations/fortisim/summary')
      setCourses(result.courses); setError('')
    } catch { setError('Could not load Academy lab progress. Try again.') }
  }, [])
  const sendAuth = useCallback(() => {
    if (!origin || !frame.current?.contentWindow) return
    frame.current.contentWindow.postMessage({ type: 'FORTISIM_AUTH', version: 1, token: getAuthSession()?.token || null }, origin)
  }, [origin])
  useEffect(() => {
    if (!origin) return
    const receive = event => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow || event.data?.version !== 1) return
      if (event.data.type === 'FORTISIM_READY') sendAuth()
      // Refresh from the authenticated API; never trust counts supplied in a message.
      if (['FORTISIM_PROGRESS_SAVED', 'FORTISIM_AUTH_REQUIRED'].includes(event.data.type)) void refresh()
    }
    window.addEventListener('message', receive)
    window.addEventListener('storage', sendAuth)
    window.addEventListener('focus', sendAuth)
    window.addEventListener('incognitrix:auth-expired', sendAuth)
    const timer = window.setInterval(sendAuth, 5000)
    void refresh()
    return () => {
      window.removeEventListener('message', receive)
      window.removeEventListener('storage', sendAuth)
      window.removeEventListener('focus', sendAuth)
      window.removeEventListener('incognitrix:auth-expired', sendAuth)
      window.clearInterval(timer)
    }
  }, [origin, refresh, sendAuth])
  if (!origin) return <p>Set VITE_FORTISIM_URL to the deployed FLAMES origin.</p>
  const platform = vendor === 'paloalto' ? 'paloalto' : 'fortigate'
  return <section>
    <h1>Firewall training</h1>
    <div aria-label="Firewall lab progress" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, margin: '12px 0' }}>
      {courses.map(course => <div key={course.platform}>
        <span>{course.platform === 'fortigate' ? 'FortiGate' : 'Palo Alto'}: {course.completed.length}/{course.total}</span>
        <progress aria-label={`${course.platform} completion`} value={course.completed.length} max={course.total} style={{ display: 'block' }} />
      </div>)}
      <button type="button" onClick={() => void refresh()}>Refresh progress</button>
    </div>
    {error && <p role="alert">{error}</p>}
    <iframe ref={frame} title={`${platform} firewall lab`} src={`${origin}/${platform}`} onLoad={sendAuth}
      referrerPolicy="no-referrer" style={{ width: '100%', height: '85vh', minHeight: 600, border: 0, borderRadius: 8 }} />
  </section>
}
