import React, { useEffect, useRef, useState } from 'react'
import { Check, Link as LinkIcon, Radio, Volume2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { usePolling } from '../hooks/useApi'
import { formatTs } from '../utils/risk'
import api from '../services/api'

const RECORDINGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'as', label: 'অসমীয়া' },
  { code: 'bn', label: 'বাংলা' },
]

function useAlertAudio(alert, file) {
  const context = useRef(null)
  const lastBroadcast = useRef(null)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function enableSound() {
    setBusy(true)
    setError('')
    // When a listener joins, the previous recording stays available in the player.
    lastBroadcast.current = alert
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!context.current) context.current = new AudioContext()
      await context.current.resume()
      if (context.current?.state !== 'running') throw new Error('Playback unavailable')
      setEnabled(true)
    } catch {
      setError('Automatic playback is unavailable. Use the player when a recording arrives.')
    } finally {
      setBusy(false)
    }
  }

  const broadcastId = alert?.id
  const sentAt = alert?.sent_at
  useEffect(() => {
    if (!enabled || !broadcastId || !file) return
    const previous = lastBroadcast.current
    if (broadcastId === previous?.id || sentAt < previous?.sent_at) return
    lastBroadcast.current = { id: broadcastId, sent_at: sentAt }
    const controller = new AbortController()
    const engine = context.current
    let source

    async function play() {
      setError('')
      try {
        const response = await fetch(file, { signal: controller.signal })
        if (!response.ok) throw new Error('Recording unavailable')
        const buffer = await engine.decodeAudioData(await response.arrayBuffer())
        if (controller.signal.aborted) return
        if (engine.state !== 'running') {
          setEnabled(false)
          throw new Error('Playback interrupted')
        }
        const node = engine.createBufferSource()
        node.buffer = buffer
        node.connect(engine.destination)
        node.start()
        source = node
      } catch {
        if (!controller.signal.aborted) setError('Automatic playback was interrupted. Use the player to hear this alert.')
      }
    }

    play()
    return () => {
      controller.abort()
      source?.stop()
      source?.disconnect()
    }
  }, [broadcastId, enabled, file, sentAt])

  useEffect(() => () => {
    const engine = context.current
    context.current = null
    engine?.close().catch(() => {})
  }, [])

  return { enabled, busy, error, enableSound }
}

export default function VoiceAlerts() {
  const { isAdmin } = useAuth()
  const { isOnline } = useOnlineStatus()
  const feed = usePolling('/api/voice-alerts/latest', 1500)
  const alert = feed.data?.alert
  const recording = RECORDINGS.find(({ code }) => code === alert?.language)
  const file = recording ? `/assets/voice-alerts/${recording.code}.mp3` : ''
  const sound = useAlertAudio(alert, file)
  const [language, setLanguage] = useState('en')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function sendAlert() {
    setSending(true)
    setError('')
    try {
      await api.post('/api/voice-alerts', { language })
      await feed.reload()
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
      setError('Copy the page address from your browser to open it on another device.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <header className="space-y-2 py-4">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Radio size={15} aria-hidden="true" /> Demo broadcasts
        </span>
        <h1 className="text-3xl font-bold tracking-tight">Voice Alerts</h1>
        <p className="text-sm text-muted-foreground">Tap to enable sound, then keep this page open to hear the next alert.</p>
      </header>

      <section className="card space-y-4" aria-labelledby="voice-inbox">
        {sound.enabled
          ? <p className="flex items-center gap-2 text-sm font-medium text-primary"><Check size={16} aria-hidden="true" /> Sound enabled</p>
          : <button className="btn-primary w-full" disabled={sound.busy || feed.loading} onClick={sound.enableSound}>
              <Volume2 size={17} aria-hidden="true" /> {sound.busy ? 'Enabling sound…' : 'Enable sound'}
            </button>}
        <div aria-live="polite" className="space-y-1">
          <h2 className="font-semibold" id="voice-inbox">{file ? 'Latest voice alert' : 'Waiting for a broadcast'}</h2>
          <p className="text-sm text-muted-foreground">{recording ? `${recording.label} · ${formatTs(alert.sent_at)}` : 'NH-702 demo'}</p>
        </div>
        {file && <audio key={alert.id} aria-label="Latest voice alert recording" controls preload="none" className="w-full" src={file} />}
        {sound.error && <p className="text-sm text-amber-300" role="status">{sound.error}</p>}
        {(feed.error || !isOnline) && <p className="text-sm text-destructive" role="status">{feed.error || 'Offline. Reconnect to receive new broadcasts.'}</p>}
      </section>

      {isAdmin && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Broadcast the NH-702 demo</h2>
          <label htmlFor="alert-language" className="label">Broadcast language</label>
          <select id="alert-language" className="input" value={language} onChange={(event) => setLanguage(event.target.value)}>
            {RECORDINGS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
          </select>
          <button onClick={sendAlert} className="btn-primary w-full" disabled={sending || !isOnline}>
            <Radio size={17} aria-hidden="true" /> {sending ? 'Sending…' : 'Send demo voice alert'}
          </button>
        </section>
      )}

      <button onClick={copyLink} className="btn-outline w-full">
        {copied ? <Check size={16} aria-hidden="true" /> : <LinkIcon size={16} aria-hidden="true" />}
        {copied ? 'Phone link copied' : 'Copy phone link'}
      </button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
