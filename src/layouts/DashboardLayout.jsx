import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/app-shell'
import { navLinks } from '@/components/app-shared'
import { useAuth } from '../hooks/useAuth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function DashboardLayout() {
  const { isAuthed, isAdmin, user, logout } = useAuth()
  const { isOnline } = useOnlineStatus()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const publicListener = pathname === '/voice-alerts'
  const page = navLinks.find(({ path }) => path === pathname)

  useEffect(() => {
    if (!isAuthed && !publicListener) navigate('/login', { replace: true, state: { returnPath: pathname, returnSearch: search } })
  }, [isAuthed, navigate, pathname, search, publicListener])

  useEffect(() => {
    document.title = `${page?.title || 'Workspace'} · LandslideGuard AI`
  }, [page])

  if (!isAuthed) {
    return publicListener ? <main className="min-h-svh px-4 py-8"><Outlet /></main> : null
  }

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <AppShell page={page} pathname={pathname} user={user} isAdmin={isAdmin} isOnline={isOnline} onLogout={handleLogout}>
      <Outlet />
    </AppShell>
  )
}
