'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'

const MonitoringShell = dynamic(() => import('./monitoring-shell'), {
  ssr: false,
  loading: () => <main className="p-8" role="status">Loading LandslideGuard AI…</main>,
})

export default function MonitoringApp() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // An unavailable service worker should not prevent the app from loading.
    })
  }, [])

  return <MonitoringShell />
}
