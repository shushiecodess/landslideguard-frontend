import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CloudRain, Droplets, Mountain, TrendingUp } from 'lucide-react'
import RiskBadge from './RiskBadge'
import { riskMeta } from '../utils/risk'

/**
 * "Needs attention now": the worst locations first, with the explanations the
 * read-only API actually supports:
 *
 *  - `trigger_factors` recorded on the latest alert (backend-generated), and
 *  - current environmental readings from `/api/locations`.
 *
 * Per-prediction model attribution is deliberately NOT shown here: the only
 * endpoint that returns `contributing_factors` also writes to the database
 * (POST /api/predict*). Nothing on this card is invented or derived.
 */
export default function NeedsAttention({ locations = [], alerts = [] }) {
  const ranked = [...locations]
    .filter((l) => l.risk_level === 'CRITICAL' || l.risk_level === 'HIGH')
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 4)

  if (ranked.length === 0) return null

  const latestAlertFor = (locationId) => {
    const rows = alerts.filter((a) => a.location_id === locationId)
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0]
  }

  return (
    <section aria-labelledby="needs-attention-heading" className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="needs-attention-heading" className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            Needs Attention
          </h3>
          <p className="text-xs text-muted-foreground">
            Highest CRITICAL / HIGH locations · factors shown are recorded alert triggers and current readings
          </p>
        </div>
        <Link to="/map" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Open Risk Map <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ranked.map((loc) => {
          const latestAlert = latestAlertFor(loc.id)
          const triggers = latestAlert?.trigger_factors || []
          const env = loc.environmental || {}
          return (
            <article
              key={loc.id}
              className="flex flex-col rounded-lg border border-border bg-muted p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{loc.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{loc.state}</p>
                </div>
                <RiskBadge level={loc.risk_level} score={loc.risk_score} />
              </div>

              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, loc.risk_score || 0))}%`,
                      backgroundColor: riskMeta(loc.risk_level).color,
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Score {Math.round(loc.risk_score || 0)} / 100
                </p>
              </div>

              <div className="mt-3 flex-1">
                {triggers.length > 0 ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Trigger factors · recorded with latest alert
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {triggers.slice(0, 4).map((f) => (
                        <li
                          key={f}
                          className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Current readings
                    </p>
                    <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
                      <li className="flex items-center gap-1.5">
                        <CloudRain className="h-3 w-3 text-primary" aria-hidden="true" />
                        Rainfall <b className="text-foreground">{env.rainfall ?? '—'} mm/h</b>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Droplets className="h-3 w-3 text-primary" aria-hidden="true" />
                        Soil moisture <b className="text-foreground">{env.soil_moisture ?? '—'}%</b>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Mountain className="h-3 w-3 text-primary" aria-hidden="true" />
                        Slope <b className="text-foreground">{loc.slope}°</b> · Elev{' '}
                        <b className="text-foreground">{Math.round(loc.elevation)} m</b>
                      </li>
                    </ul>
                  </>
                )}
              </div>

              <Link to={`/map?site=${loc.id}`} className="btn-outline mt-3 w-full justify-center !py-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> View on map
              </Link>
            </article>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Trigger factors are recorded by the risk engine when an alert is issued (the bracketed
        number is that factor's contribution score at the time, 0–100); readings are the latest
        stored conditions. Per-prediction model attribution needs a read-only explain endpoint
        (tracked as a backend follow-up).
      </p>
    </section>
  )
}
