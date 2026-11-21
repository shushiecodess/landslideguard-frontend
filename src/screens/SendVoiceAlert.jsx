import React, { useState } from 'react'
import { Check, Link as LinkIcon, Radio } from 'lucide-react'
import { RECORDINGS } from '../data/voice-alert-recordings'
import { useAuth } from '../hooks/useAuth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import api from '../services/api'

export default function SendVoiceAlert() {
  const { isAdmin } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [language, setLanguage] = useState('en')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isAdmin) {
    return <p className="card text-sm" role="status">Administrator access is required to send voice alerts.</p>
  }

  async function sendAlert() {
    setSending(true)
    setError('')
    setSent('')
    try {
      await api.post('/api/voice-alerts', { language })
      setSent('Voice alert sent.')
    } catch (failure) {
      setError(typeof failure.response?.data?.detail === 'string'
        ? failure.response.data.detail : 'The voice alert could not be sent.')
    } finally {
      setSending(false)
    }
  }

  async function copyLink() {
    setError('')
    try {
      await navigator.clipboard.writeText(new URL('/voice-alerts', window.location.origin).href)
      setCopied(true)
    } catch {
      setError('The link could not be copied. Share the public Voice Alerts page address.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <header className="space-y-2 py-4">
        <h1 className="text-3xl font-bold tracking-tight">Send Voice Alert</h1>
        <p className="text-sm text-muted-foreground">Broadcast the NH-702 demo to listeners with the public page open.</p>
      </header>
      <section className="card space-y-3">
        <label htmlFor="alert-language" className="label">Broadcast language</label>
        <select id="alert-language" className="input" value={language} disabled={sending} onChange={(event) => setLanguage(event.target.value)}>
          {RECORDINGS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
        </select>
        <button onClick={sendAlert} className="btn-primary w-full" disabled={sending || !isOnline}>
          <Radio size={17} aria-hidden="true" /> {sending ? 'Sending…' : 'Send demo voice alert'}
        </button>
        {sent && <p className="text-sm text-primary" role="status">{sent}</p>}
      </section>
      <button onClick={copyLink} className="btn-outline w-full">
        {copied ? <Check size={16} aria-hidden="true" /> : <LinkIcon size={16} aria-hidden="true" />}
        {copied ? 'Phone link copied' : 'Copy phone link'}
      </button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
