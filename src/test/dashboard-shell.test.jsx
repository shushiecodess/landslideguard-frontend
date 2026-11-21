import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'

const session = vi.hoisted(() => ({ user: null, isAdmin: false, logout: vi.fn() }))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthed: true, user: session.user, isAdmin: session.isAdmin, logout: session.logout }),
}))

function openShell({ admin = false, mobile = false } = {}) {
  session.isAdmin = admin
  session.user = { name: 'Tashi Rai', email: 'tashi@example.test', role: admin ? 'admin' : 'viewer' }
  session.logout.mockClear()
  vi.stubGlobal('innerWidth', mobile ? 390 : 1440)
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })))
  document.cookie = 'sidebar_state=true; path=/'

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<h1>Disaster Monitoring Dashboard</h1>} />
          <Route path="/map" element={<h1>Risk Map view</h1>} />
        </Route>
        <Route path="/" element={<h1>Public site view</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('shared monitoring shell', () => {
  it('collapses desktop navigation and keeps viewer permissions and active links', async () => {
    openShell()
    const user = userEvent.setup()
    const navigation = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(navigation).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    expect(within(navigation).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false')
    await user.click(screen.getByRole('button', { name: 'Expand navigation' }))
    await user.click(within(navigation).getByRole('link', { name: 'Risk Map' }))
    expect(screen.getByRole('heading', { name: 'Risk Map view' })).toBeInTheDocument()
    expect(document.title).toMatch(/^Risk Map/)
  })

  it('opens and closes the mobile drawer around navigation', async () => {
    openShell({ mobile: true })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' })
    await user.click(within(drawer).getByRole('link', { name: 'Risk Map' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Risk Map view' })).toBeInTheDocument()
  })

  it('shows real account details and preserves administrator access and logout', async () => {
    openShell({ admin: true })
    const user = userEvent.setup()
    expect(screen.getByRole('link', { name: 'Admin', exact: true })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    const account = await screen.findByRole('menu')
    expect(within(account).getByText('tashi@example.test')).toBeInTheDocument()
    expect(within(account).getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument()
    await user.click(within(account).getByRole('menuitem', { name: 'Log out' }))
    expect(session.logout).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: 'Public site view' })).toBeInTheDocument()
  })
})
