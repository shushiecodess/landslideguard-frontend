import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import api from '../services/api'
import RiskMapPage from '../screens/RiskMapPage'
import Prediction from '../screens/Prediction'
import VoiceAlerts from '../screens/VoiceAlerts'
import { navGroups } from '../components/app-shared'

const app = vi.hoisted(() => ({
  isAdmin: false,
  map: {
    invalidateSize: vi.fn(), getBoundsZoom: () => 4, getZoom: vi.fn(() => 8),
    stop: vi.fn(), setView: vi.fn(), fitBounds: vi.fn(), on: vi.fn(), off: vi.fn(),
    getContainer: () => document.body,
  },
}))

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ isAdmin: app.isAdmin }) }))
vi.mock('react-leaflet', () => ({
  useMap: () => app.map,
  MapContainer: ({ children, minZoom }) => <div data-testid="map-viewport" data-min-zoom={minZoom}>{children}</div>,
  TileLayer: ({ url }) => <span data-testid="map-tiles" data-url={url} />,
  GeoJSON: ({ data, onEachFeature }) => onEachFeature ? data.features.map((feature) => {
    let click
    onEachFeature(feature, { bindTooltip() {}, on(name, handler) { if (name === 'click') click = handler } })
    return <button key={feature.properties.name} onClick={click}>{feature.properties.name} shape</button>
  }) : null,
  Marker: ({ title, eventHandlers }) => <button onClick={eventHandlers.click}>{title}</button>,
  Tooltip: () => null,
  Polyline: () => <span data-testid="corridor-line" />,
  Circle: ({ radius }) => <span data-testid="accuracy-circle" data-radius={radius} />,
}))

const sites = [
  {
    id: 1, name: 'Tuensang', state: 'Nagaland', district: 'Tuensang',
    latitude: 26.267, longitude: 94.825, slope: 38, elevation: 1371,
    risk_level: 'HIGH', risk_score: 68, probability: 0.785, confidence: 78,
    model: 'RandomForestClassifier (trained on DEMO data)',
    last_updated: '2026-11-21T06:30:00Z',
    environmental: { data_source: 'DEMO', rainfall: 106, soil_moisture: 71, humidity: 84 },
  },
  {
    id: 2, name: 'Dima Hasao', state: 'Assam', district: 'Dima Hasao',
    latitude: 25.165, longitude: 93.65, risk_level: 'LOW', risk_score: 4, probability: 0.134,
  },
]

const boundaries = {
  type: 'FeatureCollection',
  features: sites.map(({ latitude: y, longitude: x, state: name }) => ({
    type: 'Feature',
    properties: { name },
    geometry: { type: 'Polygon', coordinates: [[[x - 1, y - 1], [x + 1, y - 1], [x + 1, y + 1], [x - 1, y + 1], [x - 1, y - 1]]] },
  })),
}

const archive = [{ id: 'nasa-1', state: 'Nagaland', name: 'Archived slope failure', date: '2016-09-03', position: [26.3, 94.7], precision: '5km' }]
const voice = { id: 'test-voice-alert', sent_at: '2026-11-21T07:10:00Z', language: 'bn' }

function open(component, path) {
  return render(<MemoryRouter initialEntries={[path]}>{component}</MemoryRouter>)
}

beforeEach(() => {
  app.isAdmin = false
  vi.clearAllMocks()
  app.map.getZoom.mockReturnValue(8)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.mocked(fetch).mockImplementation(async (url) => Response.json(
    url.endsWith('.geojson') ? boundaries : archive
  ))
  api.get.mockImplementation(async (path) => ({
    data: {
      '/api/locations': sites,
      '/api/risk-summary': { data_source: 'DEMO' },
      '/api/alerts': [],
      '/api/predictions': [],
      '/api/predict/location/1': {
        ...sites[0], data_source: 'DEMO', observed_at: sites[0].last_updated,
        inputs: { rainfall: 106, soil_moisture: 71, slope: 38, elevation: 1371 },
        sources: { weather: 'Weather simulation', soil: 'Calculated soil estimate', terrain: 'Site inventory', baseline: 'Model defaults' },
      },
      '/api/voice-alerts/latest': { alert: voice },
    }[path],
  }))
})

describe('hackathon workflows', () => {
  it('starts with India and no pins, then opens Nagaland and shows the NH-702 route and detour', async () => {
    expect(navGroups[0].items.slice(0, 2).map(({ title }) => title)).toEqual(['Risk Map', 'Dashboard'])
    open(<RiskMapPage />, '/map')
    const shape = await screen.findByRole('button', { name: 'Nagaland shape' })
    expect(screen.getByTestId('map-tiles')).toHaveAttribute('data-url', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    expect(screen.getByTestId('map-viewport')).toHaveAttribute('data-min-zoom', '0')
    expect(screen.queryByRole('button', { name: 'Archived slope failure' })).not.toBeInTheDocument()
    fireEvent.click(shape)
    const pin = screen.getByRole('button', { name: 'Archived slope failure' })
    const previousFits = app.map.fitBounds.mock.calls.length
    fireEvent.click(pin)
    expect(app.map.fitBounds).toHaveBeenCalledTimes(previousFits + 1)
    expect(screen.getByTestId('accuracy-circle')).toHaveAttribute('data-radius', '5000')
    expect(screen.getByText(/affected footprint unavailable/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Changtongya–Longleng Road · NH-702' }))
    expect(screen.getAllByTestId('corridor-line')).toHaveLength(3)
    const detail = screen.getByRole('article', { name: 'Selected landslide road impact' })
    expect(within(detail).getByText('265 m of road · chainage 5+785 to 6+050')).toBeInTheDocument()
    expect(within(detail).getByText('Tangha–Kangching–Merangkong Road')).toBeInTheDocument()

    const fits = app.map.fitBounds.mock.calls.length
    app.map.getZoom.mockReturnValue(2)
    act(() => app.map.on.mock.calls.at(-1)[1]())
    expect(app.map.fitBounds).toHaveBeenCalledTimes(fits)
    fireEvent.click(screen.getByRole('button', { name: 'Center on India' }))
    expect(app.map.fitBounds).toHaveBeenCalledTimes(fits + 1)
    expect(screen.queryByRole('button', { name: 'Archived slope failure' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('corridor-line')).not.toBeInTheDocument()
  })

  it('loads the selected site probability and labelled inputs without saving', async () => {
    open(<Prediction />, '/prediction?site=1')
    expect(await screen.findByText('Calculated soil estimate')).toBeInTheDocument()
    expect(screen.getByText('78.5%')).toBeInTheDocument()
    expect(screen.getByText('Weather simulation')).toBeInTheDocument()
    expect(screen.getByText('Site inventory')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('plays only new recordings after the public listener taps Enable sound', async () => {
    const start = vi.fn()
    const audioContext = {
      state: 'running',
      resume: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
      decodeAudioData: vi.fn(async () => ({})),
      createBufferSource: vi.fn(() => ({ connect: vi.fn(), start, stop: vi.fn(), disconnect: vi.fn() })),
    }
    vi.stubGlobal('AudioContext', function MockAudioContext() { return audioContext })
    let poll
    const regularInterval = window.setInterval
    vi.spyOn(window, 'setInterval').mockImplementation((callback, delay) => {
      if (delay !== 1500) return regularInterval(callback, delay)
      poll = callback
      return 1
    })
    api.get.mockResolvedValue({ data: { alert: null } })
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array([1, 2, 3])))

    open(<VoiceAlerts />, '/voice-alerts')
    const enable = screen.getByRole('button', { name: 'Enable sound' })
    await waitFor(() => expect(enable).toBeEnabled())
    expect(start).not.toHaveBeenCalled()
    fireEvent.click(enable)
    await screen.findByText('Sound enabled')
    expect(audioContext.resume).toHaveBeenCalledOnce()

    api.get.mockResolvedValue({ data: { alert: voice } })
    await act(async () => { await poll() })
    await waitFor(() => expect(start).toHaveBeenCalledOnce())
    expect(fetch).toHaveBeenCalledWith('/assets/voice-alerts/bn.mp3', expect.objectContaining({ signal: expect.any(Object) }))
    expect(screen.getByLabelText('Latest voice alert recording')).toHaveAttribute('src', '/assets/voice-alerts/bn.mp3')
    expect(screen.queryByRole('button', { name: 'Send demo voice alert' })).not.toBeInTheDocument()

    await act(async () => { await poll() })
    expect(start).toHaveBeenCalledOnce()
  })

  it('sends the selected recording from one administrator button', async () => {
    app.isAdmin = true
    api.post.mockResolvedValue({ data: { ...voice, language: 'hi' } })
    open(<VoiceAlerts />, '/voice-alerts')
    fireEvent.change(screen.getByLabelText('Broadcast language'), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send demo voice alert' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/voice-alerts', { language: 'hi' }))
  })
})
