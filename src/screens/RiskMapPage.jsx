import React, { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import RiskMap from '../components/RiskMap'
import RiskBadge from '../components/RiskBadge'
import RiskBandRuler from '../components/RiskBandRuler'
import DataSourceBadge from '../components/DataSourceBadge'
import DataFreshness from '../components/DataFreshness'
import { PageState } from '../components/States'
import { useApi, usePolling } from '../hooks/useApi'
import { CloudRain, Droplets, Thermometer, Wind, Mountain, MapPin, TrendingUp, RefreshCw, Pause, Play, Info } from 'lucide-react'
import { formatTs } from '../utils/risk'
import { NH702_ADVISORY } from '../data/nh702-advisory'

const CERTAINTY_HELP =
  'Derived from how far the model probability is from 0.5 (range 55–95). This is not calibrated statistical confidence.'

export default function RiskMapPage() {
  const [paused, setPaused] = useState(false)
  const locs = usePolling('/api/locations', 20000, [], { paused })
  // Same source of truth as the Dashboard header: the provider-level source,
  // not a per-row value defaulted to DEMO by this component.
  const summary = usePolling('/api/risk-summary', 20000, [], { paused })
  const alerts = useApi('/api/alerts')
  const [query] = useSearchParams()
  const [region, setRegion] = useState(null)
  const [incident, setIncident] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const detailRef = useRef(null)
  const locations = locs.data || []
  const selected = locations.find((site) => String(site.id) === selectedId)
  const riskAsOf = locations.reduce((max, site) => site.last_updated > max ? site.last_updated : max, '')
  const regions = [...new Set(locations.map((site) => site.state))].sort()
  const deepLinkSite = locations.find((site) => String(site.id) === query.get('site'))

  useEffect(() => {
    if (!deepLinkSite?.id) return
    setRegion(deepLinkSite.state)
    setSelectedId(String(deepLinkSite.id))
    setIncident(null)
  }, [deepLinkSite?.id, deepLinkSite?.state])

  useEffect(() => {
    if (selectedId || incident) detailRef.current?.focus({ preventScroll: true })
  }, [selectedId, incident])

  function selectRegion(state) {
    setRegion(state)
    setIncident(null)
    setSelectedId(null)
  }

  function selectSite(site) {
    setRegion(site.state)
    setSelectedId(String(site.id))
    setIncident(null)
  }

  function selectIncident(report) {
    setRegion(report.state)
    setIncident(report)
    setSelectedId(null)
  }

  const refreshAll = () => {
    locs.reload()
    summary.reload()
  }

  const latestAlertFor = (locationId) => {
    const rows = (Array.isArray(alerts.data) ? alerts.data : []).filter((a) => a.location_id === locationId)
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0]
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Risk Map</h1>
          <p className="text-sm text-muted-foreground">India overview · monitored risk in Northeast India</p>
          <DataFreshness label="Risk data as of" timestamp={riskAsOf || null} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="btn-outline !py-1.5 text-xs"
            aria-label="Refresh map data now"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="btn-outline !py-1.5 text-xs"
            aria-pressed={paused}
            aria-label={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
          >
            {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <DataSourceBadge
            source={summary.data?.data_source}
            degraded={summary.data?.live_degraded}
          />
        </div>
      </div>

      <PageState loading={locs.loading} error={locs.error} onRetry={locs.reload}>
        <RiskMap
          locations={locations}
          region={region}
          onRegion={selectRegion}
          incident={incident}
          onIncident={selectIncident}
          onShowDetail={() => detailRef.current?.focus()}
        />
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          <div className="space-y-4" id="detail-panel">
            {incident ? (
              <IncidentDetail incident={incident} detailRef={detailRef} />
            ) : selected ? (
              <>
                <div
                  className="card"
                  ref={detailRef}
                  tabIndex={-1}
                  aria-label={`${selected.name} risk detail`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-extrabold text-foreground">{selected.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selected.state} · {selected.district} · Lat {selected.latitude.toFixed(4)}, Lon {selected.longitude.toFixed(4)}
                      </p>
                    </div>
                    <RiskBadge level={selected.risk_level} score={selected.risk_score} />
                  </div>

                  {/* probability → score → level, with the published thresholds */}
                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Model output
                      <Info
                        className="h-3.5 w-3.5 text-muted-foreground"
                        aria-hidden="true"
                        title="For the Random Forest, the score is 100 × p^1.6. The risk level comes from the published thresholds."
                      />
                    </p>
                    <RiskBandRuler score={selected.risk_score} level={selected.risk_level} probability={selected.probability} model={selected.model} />
                    <Link to={`/prediction?site=${selected.id}`} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">View prediction and input sources</Link>
                  </div>

                  {/* Model certainty — renamed from "confidence" on purpose. */}
                  <div
                    className="mt-3 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
                    title={CERTAINTY_HELP}
                  >
                    <span>Model certainty</span>
                    <span className="font-bold text-foreground">
                      {Math.round(selected.confidence ?? 0)}%
                      <span className="ml-1 font-normal text-muted-foreground" aria-hidden="true">ⓘ</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{CERTAINTY_HELP}</p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Mountain className="h-3.5 w-3.5" aria-hidden="true" /> Slope</div>
                      <p className="mt-1 text-lg font-bold">{selected.slope}°</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Elevation</div>
                      <p className="mt-1 text-lg font-bold">{Math.round(selected.elevation)} m</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CloudRain className="h-3.5 w-3.5" aria-hidden="true" /> Rainfall</div>
                      <p className="mt-1 text-lg font-bold">{selected.environmental?.rainfall ?? '—'} mm/h</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Droplets className="h-3.5 w-3.5" aria-hidden="true" /> Soil Moisture</div>
                      <p className="mt-1 text-lg font-bold">{selected.environmental?.soil_moisture ?? '—'}%</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Thermometer className="h-3.5 w-3.5" aria-hidden="true" /> Temperature</div>
                      <p className="mt-1 text-lg font-bold">{selected.environmental?.temperature ?? '—'}°C</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Wind className="h-3.5 w-3.5" aria-hidden="true" /> Humidity</div>
                      <p className="mt-1 text-lg font-bold">{selected.environmental?.humidity ?? '—'}%</p>
                    </div>
                  </div>

                  {/* Why this risk — only sources the read-only API supports. */}
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Why this risk
                    </p>
                    {latestAlertFor(selected.id)?.trigger_factors?.length ? (
                      <>
                        <ul className="flex flex-wrap gap-1.5">
                          {latestAlertFor(selected.id).trigger_factors.map((f) => (
                            <li
                              key={f}
                              className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-foreground"
                            >
                              {f}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          Trigger factors recorded by the risk engine when the latest alert was
                          issued ({formatTs(latestAlertFor(selected.id).created_at)}). The number
                          in brackets is that factor's contribution score at the time (0–100), not
                          a raw reading, and not a live per-prediction attribution.
                        </p>
                      </>
                    ) : (
                      <p className="rounded-lg border border-border bg-muted px-3 py-2.5 text-[11px] text-muted-foreground">
                        No alert has been issued for this site yet. The Prediction page shows the current model inputs and rule-based trigger indicators.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 border-t border-border pt-3">
                    <DataFreshness
                      label="Location updated"
                      timestamp={selected.last_updated || null}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="card flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
                <MapPin className="mb-3 h-10 w-10" aria-hidden="true" />
                <p className="text-sm">Select a highlighted region, then a landslide pin to see the available road impact and detour. Choose a monitored site to see its risk and conditions.</p>
              </div>
            )}

          </div>
          <div className="space-y-4">
            <section className="card space-y-3">
              <h3 className="font-bold">Monitored regions</h3>
              <div className="flex flex-wrap gap-2">
                {regions.map((state) => (
                  <button type="button" className="btn-outline !px-2.5 !py-1.5 text-xs" key={state}
                    aria-pressed={region === state} onClick={() => selectRegion(state)}>{state}</button>
                ))}
              </div>
              {region === 'Nagaland' && <button className="btn-outline text-xs" onClick={() => selectIncident(NH702_ADVISORY)}>Open NH-702 advisory</button>}
            </section>
            <div className="card">
              <h3 className="mb-3 font-bold">All Monitored Locations</h3>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => selectSite(loc)}
                    aria-current={selected?.id === loc.id ? 'true' : undefined}
                    className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-left transition-colors hover:bg-muted aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground"
                  >
                    <div>
                      <p className="text-sm font-semibold">{loc.name}</p>
                      <p className="text-[11px] text-muted-foreground">{loc.state}</p>
                    </div>
                    <RiskBadge level={loc.risk_level} score={loc.risk_score} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageState>
    </div>
  )
}

function IncidentDetail({ incident, detailRef }) {
  const isAdvisory = incident.id === NH702_ADVISORY.id
  const fields = isAdvisory ? [
    ['Affected route', 'Changtongya–Longleng Road · NH-702'],
    ['Affected stretch', '265 m of road · chainage 5+785 to 6+050'],
    ['Light vehicle detour', 'Tangha–Kangching–Merangkong Road'],
    ['Heavy vehicles', 'Movement stopped in the advisory. No alternate route specified.'],
  ] : [
    ['Affected route', 'No road restriction recorded in this archive entry'],
    ['Affected area', incident.size ? `Reported size: ${incident.size}. No mapped footprint available.` : 'No mapped footprint available'],
    ['Alternate routes', 'No detour recorded in the archive'],
    ['Reported coordinates', `${incident.position[0].toFixed(4)}, ${incident.position[1].toFixed(4)} · accuracy ${incident.precision || 'unknown'}`],
  ]

  return (
    <article className="card space-y-4" tabIndex={-1} ref={detailRef} aria-label="Selected landslide road impact">
      <div>
        <p className="text-xs font-semibold text-primary">{isAdvisory ? 'Archived district advisory' : 'NASA archived landslide report'} · {incident.date}</p>
        <h2 className="mt-1 text-xl font-bold">{incident.name}</h2>
        <p className="text-sm text-muted-foreground">{incident.state}{incident.trigger && ` · Trigger: ${incident.trigger}`}</p>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-background p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {isAdvisory && (
        <p className="text-sm text-muted-foreground">
          Red marks the affected stretch. Orange shows NH-702 and lime shows the light-vehicle detour. The geometry is schematic and reflects the September 2026 notice. The district did not report a surveyed landslide footprint or current road status.
        </p>
      )}
      <a className="text-sm font-semibold text-primary hover:underline" href={isAdvisory ? incident.url : 'https://data.nasa.gov/dataset/global-landslide-catalog-export'} target="_blank" rel="noreferrer">
        {isAdvisory ? 'Read the Longleng DDMA advisory' : `Open NASA Global Landslide Catalog · report ${incident.id}`}
      </a>
    </article>
  )
}
