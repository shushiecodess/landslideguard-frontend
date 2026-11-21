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

  it('opens the voice listener for a signed-out phone', async () => {
    renderAt('/voice-alerts')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enable sound' })).toBeEnabled())
    expect(screen.getByRole('heading', { name: 'Voice Alerts' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send demo voice alert' })).not.toBeInTheDocument()
  })

  it('redirects an unauthenticated visitor from a protected route to login', async () => {
    renderAt('/dashboard')
    expect(
      await screen.findByText(/Sign in to the monitoring platform/i),
    ).toBeInTheDocument()
  })
})
