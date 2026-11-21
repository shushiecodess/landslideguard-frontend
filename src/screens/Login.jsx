import { navLinks } from '../components/app-shared'
import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mountain, LogIn } from 'lucide-react'
import api, { setToken } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const DEMO_CREDENTIALS = { email: 'admin@landslideguard.ai', password: 'admin123' }

export default function Login() {
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const { setSession } = useAuth()
  const { isOnline } = useOnlineStatus()
  const navigate = useNavigate()
  const { state } = useLocation()
  // The demo-credential hint is a local convenience only; it is never rendered
  // in a production build (Vite inlines `DEV` at build time).
  const showDemoHint = process.env.NODE_ENV === 'development'

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post('/api/auth/login', { email, password })
      setToken(res.data.access_token)
      setSession(res.data.access_token, res.data.user)
      const target = navLinks.some(({ path }) => path === state?.returnPath) ? state.returnPath : '/dashboard'
      const search = typeof state?.returnSearch === 'string' && state.returnSearch.startsWith('?') ? state.returnSearch : ''
      navigate({ pathname: target, search }, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed. Try the demo credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mountain className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">LandslideGuard AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to the monitoring platform</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && (
            <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</p>
          )}
          <button type="submit" disabled={busy || !isOnline} className="btn-primary w-full justify-center !py-2.5">
            {busy ? 'Signing in…' : (<><LogIn className="h-4 w-4" /> Sign In</>)}
          </button>
          {!isOnline && (
            <p className="text-center text-[11px] text-amber-400">
              You are offline — sign-in needs a backend connection.
            </p>
          )}
          {showDemoHint && (
            <p className="text-center text-[11px] text-muted-foreground">
              Demo: admin@landslideguard.ai / admin123
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted-foreground transition hover:text-primary">← Back to landing</Link>
        </p>
      </div>
    </div>
  )
}