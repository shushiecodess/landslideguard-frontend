import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, BrainCircuit, CloudRain, Database, Droplets, History, Mountain, RefreshCw, Save } from 'lucide-react'
import api from '../services/api'
import DataFreshness from '../components/DataFreshness'
import DataSourceBadge from '../components/DataSourceBadge'
import FactorBar from '../components/FactorBar'
import RiskBadge from '../components/RiskBadge'
import RiskBandRuler from '../components/RiskBandRuler'
import { InlineError, PageState } from '../components/States'
import { useApi } from '../hooks/useApi'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatTs } from '../utils/risk'

function SourceCard({ icon: Icon, title, source, values }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{source}</p>
        </div>
      </div>
      <dl className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
        {values.map(([label, value, unit]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium tabular-nums">{value == null ? '—' : `${value}${unit || ''}`}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function SitePrediction({ site, onSaved }) {
  const endpoint = `/api/predict/location/${site.id}`
  const preview = useApi(endpoint)
  const { isOnline } = useOnlineStatus()
  const [recorded, setRecorded] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const result = recorded || preview.data || site
  const inputs = result.inputs || { ...site.environmental, elevation: site.elevation, slope: site.slope }
  const sources = result.sources
  const observedAt = result.observed_at || site.environmental?.observed_at
  const source = result.data_source || site.environmental?.data_source

  async function save() {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(endpoint)
      setRecorded(data)
      onSaved()
    } catch (failure) {
      setError(failure.response?.data?.detail || 'The prediction could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  function refresh() {
    setRecorded(null)
    setError('')
    preview.reload()
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <section className="card space-y-4" aria-labelledby="prediction-result">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 font-bold" id="prediction-result">
              <BrainCircuit size={18} className="text-primary" aria-hidden="true" /> Prediction result
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{site.name} · {site.state}</p>
          </div>
          <DataSourceBadge source={source} />
        </div>
        <RiskBandRuler score={result.risk_score} level={result.risk_level} probability={result.probability} model={result.model} />
        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <span className="text-muted-foreground">Model certainty</span>
          <strong>{result.confidence ?? '—'}{result.confidence != null && '%'}</strong>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {result.model}. The probability comes from a demo-trained model and has no calibration for real-world events.
        </p>
        {Array.isArray(result.contributing_factors) && (
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Model input indicators</h3>
            {result.contributing_factors.slice(0, 4).map((item) => <FactorBar key={item.factor} factor={item.factor} contribution={item.contribution} />)}
            <p className="text-xs text-muted-foreground">Rule-based threshold indicators describe the supplied readings.</p>
          </div>
        )}
        {result.recommended_actions?.length > 0 && (
          <details className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <summary className="cursor-pointer font-medium">Demo response playbook</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {result.recommended_actions.map((action) => <li key={action}>{action}</li>)}
            </ul>
          </details>
        )}
        {preview.error && <InlineError label="Latest reading unavailable" message={preview.error} onRetry={refresh} />}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {recorded && <p role="status" className="text-sm text-primary">Prediction added to history.</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" onClick={refresh} disabled={!isOnline || busy || preview.loading}>
            <RefreshCw size={15} aria-hidden="true" /> {preview.loading ? 'Reading sources…' : 'Refresh readings'}
          </button>
          <button className="btn-primary" onClick={save} disabled={!isOnline || busy || preview.loading}>
            <Save size={15} aria-hidden="true" /> {busy ? 'Saving…' : 'Record prediction'}
          </button>
        </div>
      </section>

      <section className="card space-y-4" aria-labelledby="prediction-sources">
        <div>
          <h2 id="prediction-sources" className="font-bold">Prediction inputs</h2>
          <DataFreshness label="Weather reading" timestamp={observedAt || null} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SourceCard icon={CloudRain} title="Weather" source={sources?.weather || (source === 'LIVE' ? 'OpenWeather current weather' : 'Weather simulation')}
            values={[[source === 'LIVE' ? 'Rain in past hour' : 'Rainfall input', inputs.rainfall, ' mm'], ['Intensity', inputs.rainfall_intensity, ' mm/h'], ['Air temperature', inputs.temperature, ' °C'], ['Humidity', inputs.humidity, '%']]} />
          <SourceCard icon={Droplets} title="Soil moisture" source={sources?.soil || 'Derived from weather inputs'}
            values={[['Estimated moisture', inputs.soil_moisture, '%']]} />
          <SourceCard icon={Mountain} title="Site terrain" source={sources?.terrain || 'Monitoring site inventory'}
            values={[['Elevation', inputs.elevation, ' m'], ['Slope', inputs.slope, '°']]} />
          <SourceCard icon={Database} title="Model inputs" source={sources?.baseline || 'Demo model defaults'}
            values={[['Land cover', inputs.land_cover], ['Soil type', inputs.soil_type], ['Rock type', inputs.rock_type],
              ['Past occurrence proxy', inputs.historical_occurrence == null ? null : inputs.historical_occurrence ? 'Yes' : 'No'],
              ['Drainage distance', inputs.distance_to_drain, ' km']]} />
        </div>
      </section>
    </div>
  )
}

export default function Prediction() {
  const [query, setQuery] = useSearchParams()
  const locations = useApi('/api/locations')
  const history = useApi('/api/predictions')
  const sites = Array.isArray(locations.data) ? locations.data : []
  const site = sites.find((location) => String(location.id) === query.get('site')) || sites[0]
  const nameById = new Map(sites.map((location) => [location.id, location.name]))
  const recent = (Array.isArray(history.data) ? history.data : []).slice(0, 8)
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">AI Risk Prediction</h1>
          <p className="text-sm text-muted-foreground">Choose a monitoring site to see the latest prediction and where its inputs come from.</p>
        </div>
        {sites.length > 0 && (
          <label className="w-full sm:w-auto">
            <span className="label">Monitoring site</span>
            <select className="input sm:min-w-72" value={site.id} onChange={(event) => setQuery({ site: event.target.value }, { replace: true })}>
              {sites.map((location) => <option key={location.id} value={location.id}>{location.name}, {location.state}</option>)}
            </select>
          </label>
        )}
      </header>
      <PageState loading={locations.loading} error={locations.error} onRetry={locations.reload}>
        {site ? <SitePrediction key={site.id} site={site} onSaved={history.reload} />
          : <p className="card text-sm text-muted-foreground">Add a monitored location to see a prediction.</p>}
      </PageState>
      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 font-semibold"><History size={17} className="text-primary" aria-hidden="true" /> Recent stored predictions</h2>
        {history.error && <InlineError message={history.error} onRetry={history.reload} />}
        {!history.error && !recent.length && <p className="text-sm text-muted-foreground">{history.loading ? 'Loading…' : 'No recorded predictions yet.'}</p>}
        {recent.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            <div>
              <Link to={`/map?site=${row.location_id}`} className="inline-flex items-center gap-1 font-medium hover:text-primary">
                {nameById.get(row.location_id) || `Site ${row.location_id}`} <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <p className="text-xs text-muted-foreground">{formatTs(row.timestamp)} · {row.probability != null ? `${(row.probability * 100).toFixed(1)}% probability` : 'Probability unavailable'}</p>
            </div>
            <RiskBadge level={row.risk_level} score={row.risk_score} />
          </div>
        ))}
      </section>
    </div>
  )
}
