import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

vi.mock('../services/api', () => ({
  default: { get: vi.fn(async () => ({ data: { alert: null } })) },
  setToken: vi.fn(),
}))

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  it('renders the landing page as the initial view at "/"', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /AI-Powered Landslide/i,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: /Landslides threaten communities across Northeast India/i }),
    ).toBeInTheDocument()
  })

  it('renders the landing page for an unknown route (catch-all)', () => {
    renderAt('/route-that-does-not-exist')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /AI-Powered Landslide/i,
    )
  })

  it.each(['visitor', 'viewer', 'admin'])('shows playback only to a %s on the public voice page', async (role) => {
    if (role !== 'visitor') localStorage.setItem('lg_user', JSON.stringify({ role, email: 'listener@example.test' }))
    renderAt('/voice-alerts')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enable sound' })).toBeEnabled())
    expect(screen.getByRole('heading', { name: 'Voice Alerts' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Broadcast language')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send demo voice alert' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy phone link' })).not.toBeInTheDocument()
  })

  it.each(['/dashboard', '/voice-alerts/send'])('redirects a signed-out visitor from %s to login', async (path) => {
    renderAt(path)
    expect(
      await screen.findByText(/Sign in to the monitoring platform/i),
    ).toBeInTheDocument()
  })
})
