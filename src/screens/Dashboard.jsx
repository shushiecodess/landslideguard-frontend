import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  TrendingUp,
  Bell,
  ShieldAlert,
  CloudRain,
  Droplets,
  Thermometer,
  Activity,
  ArrowRight,
  RefreshCw,
  Pause,
  Play,
  WifiOff,
} from 'lucide-react'
import { usePolling } from '../hooks/useApi'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import StatCard from '../components/StatCard'
import DashboardCharts from '../components/DashboardCharts'
import nasaArchive from '../data/nasa-landslide-totals.json'
import { DashboardGrid } from '@/components/dashboard'
import { QuickActions } from '@/components/quick-actions'
import { Button } from '@/components/ui/button'
import RiskBadge from '../components/RiskBadge'
import DataSourceBadge from '../components/DataSourceBadge'
import DataFreshness from '../components/DataFreshness'
import NeedsAttention from '../components/NeedsAttention'
import OfflineDashboard from '../components/OfflineDashboard'
import { InlineError } from '../components/States'
import { riskMeta, formatTs } from '../utils/risk'
import { saveDashboardSummary, loadDashboardSummary } from '../services/offlineCache'


const CERTAINTY_HELP =
  'Derived from how far the model probability is from 0.5 (range 55–95). This is not calibrated statistical confidence.'

export default function Dashboard() {
  const [paused, setPaused] = useState(false)
  const { isOnline } = useOnlineStatus()
  const summary = usePolling('/api/risk-summary', 20000, [], { paused })
  const locations = usePolling('/api/locations', 20000, [], { paused })
  const alerts = usePolling('/api/alerts', 30000, [], { paused })

  // Persist a sanitized, non-sensitive snapshot after every successful summary
  // response so a read-only fallback exists the next time we are offline.
  useEffect(() => {
    if (summary.data) saveDashboardSummary(summary.data)
  }, [summary.data])

  // Only read the cache while offline; coming back online drops it immediately
  // and the live endpoints take over (stale warning removed on success).
  const cached = useMemo(() => (isOnline ? null : loadDashboardSummary()), [isOnline])

  // Offline with nothing live: show the clearly-labelled stale snapshot (or a
  // plain "offline" notice) instead of a loading skeleton that never resolves.
  if (!isOnline && !summary.data) {
    return cached ? (
      <OfflineDashboard cached={cached} />
    ) : (
      <div className="card flex flex-col items-center gap-3 py-16 text-center">
        <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-bold text-foreground">You are offline</p>
        <p className="max-w-md text-sm text-muted-foreground">
          The dashboard needs a backend connection and no cached snapshot is available yet.
          It will load automatically once you reconnect.
        </p>
      </div>
    )
  }

  const riskCounts = summary.data?.risk_counts || { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 }
  const riskColorClass = (level) =>
    ({ LOW: 'text-emerald-400', MODERATE: 'text-yellow-400', HIGH: 'text-orange-400', CRITICAL: 'text-red-400' })[level] || 'text-foreground'
  const chartData = [
    { name: 'Low', value: riskCounts.LOW, fill: riskMeta('LOW').color },
    { name: 'Moderate', value: riskCounts.MODERATE, fill: riskMeta('MODERATE').color },
    { name: 'High', value: riskCounts.HIGH, fill: riskMeta('HIGH').color },
    { name: 'Critical', value: riskCounts.CRITICAL, fill: riskMeta('CRITICAL').color },
  ]

  // `usePolling` keeps the last good payload on a failed refresh, so an error
  // plus stale data would silently present old alerts as current. The list is
  // therefore only rendered while there is no error.
  const alertsFailed = Boolean(alerts.error)
  const alertsReady = Array.isArray(alerts.data)
  const activeAlerts = alertsReady ? alerts.data.filter((a) => a.status !== 'resolved') : []
  const criticalAlerts = activeAlerts.filter((a) => a.risk_level === 'CRITICAL')
  const locationRows = Array.isArray(locations.data) ? locations.data : []
  const env = locationRows[0]?.environmental || {}
  const highest = summary.data?.highest_risk_location

  // Freshness comes from the API's own timestamps, never the browser clock.
  // Locations carry `last_updated`; alerts carry `created_at`, so they are
  // reported separately instead of pretending to share one timestamp.
  const riskAsOf = locationRows.reduce(
    (max, l) => (l.last_updated && l.last_updated > max ? l.last_updated : max),
    ''
  )
  const latestAlertAt = activeAlerts.reduce(
    (max, a) => (a.created_at && a.created_at > max ? a.created_at : max),
    ''
  )
  const statePeaks = new Map()
  for (const site of locationRows) {
    if (!statePeaks.has(site.state) || site.risk_score > statePeaks.get(site.state).risk_score) statePeaks.set(site.state, site)
  }
  const regionalPeaks = [...statePeaks.values()].sort((a, b) => b.risk_score - a.risk_score)
  const stateCount = regionalPeaks.length
  const rainReadings = locationRows.filter((site) => Number.isFinite(site.environmental?.rainfall_intensity))
  const peakRain = rainReadings.reduce((peak, site) =>
    !peak || site.environmental.rainfall_intensity > peak.environmental.rainfall_intensity ? site : peak, null)

  const refreshAll = () => {
    summary.reload()
    locations.reload()
    alerts.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Disaster Monitoring Dashboard</h1>
          <DataFreshness label="Risk data as of" timestamp={riskAsOf || null} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={refreshAll}
            disabled={!isOnline}
            title={isOnline ? undefined : 'Refresh needs a backend connection'}
            variant="outline"
            size="sm"
            aria-label="Refresh all dashboard data now"
          >
            <RefreshCw data-icon="inline-start" aria-hidden="true" /> Refresh
          </Button>
          <Button
            type="button"
            onClick={() => setPaused((p) => !p)}
            variant={paused ? 'default' : 'outline'}
            size="sm"
            aria-pressed={paused}
            aria-label={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
          >
            {paused ? <Play data-icon="inline-start" aria-hidden="true" /> : <Pause data-icon="inline-start" aria-hidden="true" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <DataSourceBadge
            source={summary.data?.data_source}
            degraded={summary.data?.live_degraded}
          />
        </div>
      </div>

      {!isOnline && (
        <p
          role="status"
          className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2 text-xs font-medium text-amber-300"
        >
          Offline — STALE / LAST UPDATED {riskAsOf ? formatTs(riskAsOf) : 'unknown'}. These values
          are the last successful reading; live updates resume when you reconnect.
        </p>
      )}

      {paused && (
        <p className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2 text-xs font-medium text-amber-300">
          Auto-refresh paused — values below are frozen at the timestamps shown. Resume to keep polling.
        </p>
      )}

      <DashboardCharts riskData={chartData} loading={summary.loading && !summary.data} error={summary.error} onRetry={summary.reload} />

      {/* Summary cards. On a failed refresh these would all render as zeros,
          which reads exactly like real data, so the error is shown instead. */}
      {summary.error ? (
        <InlineError
          label="Risk summary unavailable"
          message={summary.error}
          onRetry={summary.reload}
        />
      ) : (
        <DashboardGrid>
          <StatCard
            title="Monitored Locations"
            value={summary.data?.total_locations ?? '—'}
            icon={MapPin}
            sub={stateCount > 0 ? `Across ${stateCount} monitored states` : 'Awaiting location data'}
          />
          <StatCard
            title="Current Overall Risk"
            value={summary.data?.overall_risk_level || '—'}
            icon={ShieldAlert}
            color={riskColorClass(summary.data?.overall_risk_level)}
            sub={`Avg score ${summary.data?.overall_avg_score ?? '—'}`}
          />
          <StatCard
            title="Active Alerts"
            value={alertsReady && !alertsFailed ? activeAlerts.length : '—'}
            icon={Bell}
            sub={alertsReady && !alertsFailed ? `${criticalAlerts.length} critical` : 'Alert feed unavailable'}
            color={criticalAlerts.length > 0 ? 'text-red-400' : 'text-foreground'}
          />
          <StatCard
            title="Avg Model Certainty"
            value={summary.data?.avg_confidence == null ? '—' : `${summary.data.avg_confidence}%`}
            icon={TrendingUp}
            sub="Random Forest · not calibrated confidence"
            hint={CERTAINTY_HELP}
          />
        </DashboardGrid>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Elevated risk sites" value={summary.data && !summary.error ? riskCounts.HIGH + riskCounts.CRITICAL : '—'}
          icon={ShieldAlert} sub="High or critical" />
        <StatCard title="Mapped Northeast reports" value={nasaArchive.northeastMappedReports} icon={MapPin}
          sub={<Link to="/map" className="hover:text-primary hover:underline">NASA archive · view on map ↗</Link>} />
        <StatCard title="Peak rain intensity" value={!locations.error && peakRain ? `${peakRain.environmental.rainfall_intensity} mm/h` : '—'}
          icon={CloudRain} sub={!locations.error && peakRain ? `${peakRain.name} · ${peakRain.environmental.data_source === 'LIVE' ? 'observed' : 'simulated'}` : 'Awaiting site readings'} />
        <StatCard title="Landslides mapped by ISRO" value="~80,000" icon={MapPin}
          sub={<a className="hover:text-primary hover:underline" href="https://www.isro.gov.in/Landslide_Atlas_India.html" target="_blank" rel="noreferrer">1998–2022 · NRSC Landslide Atlas ↗</a>} />
      </div>

      <NeedsAttention locations={locationRows} alerts={alertsReady ? alerts.data : []} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold">Risk by state</h2>
              <p className="text-xs text-muted-foreground">Highest current site score in each monitored state</p>
            </div>
            <Link to="/analytics" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Full analytics <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {locations.error ? <InlineError message={locations.error} onRetry={locations.reload} /> :
            regionalPeaks.length ? (
              <ul className="space-y-2">
                {regionalPeaks.map((site) => (
                  <li key={site.state} className="grid grid-cols-[minmax(6rem,1fr)_minmax(2rem,2.2fr)_2.5rem] items-center gap-2 text-xs sm:gap-4">
                    <span>{site.state}</span>
                    <span aria-hidden="true" className="h-2 rounded-full bg-background">
                      <span className="dashboard-risk-bar block h-full rounded-full"
                        style={{ width: `${site.risk_score}%`, background: riskMeta(site.risk_level).color }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{site.risk_score}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">{locations.loading ? 'Loading scores…' : 'No monitored states'}</p>}
        </section>

          {/* Top risk location */}
          <div className="card">
            <h3 className="mb-4 font-bold">Highest Risk Location</h3>
            {highest ? (
              <div>
                <div className="rounded-lg border border-border bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">{highest.name}</p>
                    <RiskBadge level={highest.risk_level} score={highest.risk_score} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{highest.state}</p>
                  <div className="mt-4">
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black" style={{ color: riskMeta(highest.risk_level).color }}>
                        {Math.round(highest.risk_score)}
                      </p>
                      <p className="pb-1 text-xs text-muted-foreground">/ 100 risk score</p>
                    </div>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${highest.risk_score}%`,
                          backgroundColor: riskMeta(highest.risk_level).color,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <Link to="/map" className="btn-outline mt-4 w-full justify-center">
                  Open in Risk Map
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </div>
      </div>

      {/* Environment + alerts row — driven by their own endpoints, so it stays
          on screen even when the summary endpoint fails. */}
      <div className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-4">
          {/* Env conditions snapshot */}
          <div className="card min-w-0 lg:col-span-1">
            <h3 className="mb-2 font-bold">Environmental Snapshot</h3>
            <DataFreshness
              label="Reading as of"
              timestamp={locationRows[0]?.last_updated || null}
              className="mb-3"
            />
            {locations.error ? (
              <InlineError message={locations.error} onRetry={locations.reload} />
            ) : !locationRows[0] ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {locations.loading ? 'Loading…' : 'No location readings available'}
              </p>
            ) : (
              <div className="space-y-3">
                {[
                  { icon: CloudRain, label: 'Rainfall', value: `${env.rainfall_intensity ?? '—'} mm/h` },
                  { icon: Droplets, label: 'Soil Moisture', value: `${env.soil_moisture ?? '—'}%` },
                  { icon: Thermometer, label: 'Temperature', value: `${env.temperature ?? '—'}°C` },
                  { icon: Activity, label: 'Humidity', value: `${env.humidity ?? '—'}%` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {label}
                    </span>
                    <span className="text-sm font-bold text-foreground">{value}</span>
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-muted-foreground">
                  Sample: {locationRows[0].name}, {locationRows[0].state}
                </p>
              </div>
            )}
          </div>

          {/* Recent alerts */}
          <div className="card min-w-0 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold">Recent Alerts</h3>
                {latestAlertAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Latest alert recorded {formatTs(latestAlertAt)}
                  </p>
                )}
              </div>
              <Link to="/alerts" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            {alertsFailed ? (
              <InlineError message={alerts.error} onRetry={alerts.reload} />
            ) : activeAlerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {alertsReady ? 'No active alerts' : 'Loading…'}
              </p>
            ) : (
              <div className="space-y-3">
                {activeAlerts.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{a.location_name}</p>
                        <RiskBadge level={a.risk_level} score={a.risk_score} />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{a.message}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatTs(a.created_at)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
            <QuickActions />
      </div>
    </div>
  )
}
