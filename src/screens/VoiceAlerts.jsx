import React, { useEffect, useRef, useState } from 'react'
import { Check, Volume2 } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { usePolling } from '../hooks/useApi'
import { formatTs } from '../utils/risk'
import { RECORDINGS } from '../data/voice-alert-recordings'

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
  const { isOnline } = useOnlineStatus()
  const feed = usePolling('/api/voice-alerts/latest', 1500)
  const alert = feed.data?.alert
  const recording = RECORDINGS.find(({ code }) => code === alert?.language)
  const file = recording ? `/assets/voice-alerts/${recording.code}.mp3` : ''
  const sound = useAlertAudio(alert, file)
  useEffect(() => {
    document.title = 'Voice Alerts · LandslideGuard AI'
  }, [])

  return (
    <main className="mx-auto min-h-svh w-full max-w-lg space-y-4 px-4 py-8 sm:py-12">
      <header className="space-y-2 py-4">
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
    </main>
  )
}
