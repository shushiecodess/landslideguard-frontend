import React, { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import nasaArchive from '../data/nasa-landslide-totals.json'
import { Roll } from '../vendor/stageshow/motion/Roll'
import { useReducedMotion } from '../vendor/stageshow/reduced-motion'
import { InlineError } from './States'

const { annualReports } = nasaArchive
const numbers = new Intl.NumberFormat('en-IN')
const catalogUrl = 'https://data.nasa.gov/dataset/global-landslide-catalog-export'

const axis = { tickLine: false, axisLine: false, tick: { fill: 'var(--muted-foreground)', fontSize: 11 } }

function ArchiveTrend() {
  const [range, setRange] = useState('all')
  const [hovered, setHovered] = useState(null)
  const reduced = useReducedMotion()
  const series = range === 'recent' ? annualReports.slice(-5) : annualReports
  const total = series.reduce((sum, year) => sum + year.reports, 0)
  const active = series.find((row) => row.year === hovered)
  const peak = series.reduce((highest, row) => row.reports > highest.reports ? row : highest, series[0])
  const count = numbers.format(active?.reports ?? total)
  const period = `${series[0].year}–${series.at(-1).year}`

  return (
    <figure className="card min-w-0 space-y-4" aria-labelledby="archive-chart-title">
      <figcaption className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="archive-chart-title" className="text-sm font-semibold">Reported landslides in India</h2>
          <p className="text-xs text-muted-foreground">NASA Global Landslide Catalog · archived observations</p>
        </div>
        <select aria-label="Archive chart time range" className="input !w-auto !py-1.5 text-xs" value={range}
          onChange={(event) => { setRange(event.target.value); setHovered(null) }}>
          <option value="all">2007–2016</option>
          <option value="recent">2012–2016</option>
        </select>
      </figcaption>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-4xl font-bold tracking-tight tabular-nums text-primary">
            <span className="sr-only">{count}</span>
            <span aria-hidden="true"><Roll stagger={22} align="start">{count}</Roll></span>
          </p>
          <p className="text-xs text-muted-foreground">Reports · {active?.year || period}</p>
        </div>
        <p className="text-xs text-muted-foreground">Peak <strong className="text-foreground">{peak.reports}</strong> in {peak.year}</p>
      </div>
      <div className="h-[248px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}
            onMouseMove={(event) => setHovered(event?.isTooltipActive ? event.activeLabel : null)}
            onMouseLeave={() => setHovered(null)}>
            <defs>
              <linearGradient id="archive-area-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.29} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.015} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
            <XAxis {...axis} dataKey="year" minTickGap={19} tickMargin={10} />
            <YAxis {...axis} width={32} allowDecimals={false} />
            <Tooltip cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 4' }}
              content={({ active: visible, label, payload }) => visible && payload?.length ? (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                  <strong>{payload[0].value}</strong> reports · {label}
                </div>
              ) : null} />
            <Area dataKey="reports" type="monotone" stroke="var(--primary)" strokeWidth={2}
              fill="url(#archive-area-fill)" isAnimationActive={!reduced} animationDuration={720} animationEasing="ease-out"
              activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-2 border-t border-border pt-3 text-xs">
        <p className="text-muted-foreground">Counts reflect this archive’s reporting coverage.</p>
        <a href={catalogUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          NASA source <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
    </figure>
  )
}

function RiskShare({ data, loading, error, onRetry }) {
  const reduced = useReducedMotion()
  const total = data.reduce((sum, row) => sum + row.value, 0)
  return (
    <figure className="card flex min-w-0 flex-col gap-3" aria-labelledby="risk-share-title">
      <figcaption>
        <h2 id="risk-share-title" className="text-sm font-semibold">Risk distribution</h2>
        <p className="text-xs text-muted-foreground">Latest monitored sites by severity</p>
      </figcaption>
      {error ? <InlineError message={error} onRetry={onRetry} label="Risk distribution unavailable" /> : (
        <>
          <div className="relative mx-auto mt-1 h-[222px] w-full max-w-[250px]">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.filter((row) => row.value > 0)} dataKey="value" nameKey="name" stroke="none"
                    innerRadius="70%" outerRadius="92%" paddingAngle={3} cornerRadius={5}
                    startAngle={90} endAngle={-270} isAnimationActive={!reduced} animationBegin={150} animationDuration={680}>
                    {data.filter((row) => row.value > 0).map((row) => <Cell key={row.name} fill={row.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : <div aria-hidden="true" className="absolute inset-5 mx-auto aspect-square rounded-full border-[10px] border-muted" />}
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <p className="text-4xl font-bold tabular-nums">{loading ? '—' : numbers.format(total)}</p>
              <p className="text-xs text-muted-foreground">monitored sites</p>
            </div>
          </div>
          <ul className="mt-auto grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-1">
            {data.map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2">
                <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: row.fill }} />{row.name}</span>
                <span className="font-semibold tabular-nums">{loading ? '—' : row.value}
                  {total > 0 && <span className="ml-2 font-normal text-muted-foreground">{Math.round(row.value / total * 100)}%</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  )
}

export default function DashboardCharts({ riskData, loading, error, onRetry }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(16rem,1fr)]" aria-label="Dashboard charts">
      <ArchiveTrend />
      <RiskShare data={riskData} loading={loading} error={error} onRetry={onRetry} />
    </section>
  )
}
