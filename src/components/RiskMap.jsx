import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Circle, GeoJSON, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { ArrowDown, LocateFixed, MapPin } from 'lucide-react'
import { NH702_ADVISORY } from '../data/nh702-advisory'
import { reportedAccuracyRadius } from '../utils/landslide-report'
import { riskMeta, RISK_THRESHOLDS } from '../utils/risk'
import { PageState } from './States'

const WORLD_BOUNDS = [[-85, -180], [85, 180]]

const archiveIcon = L.divIcon({
  className: 'archive-pin',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})
const exactArchiveIcon = L.divIcon({
  className: 'archive-pin archive-pin--exact',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})
const advisoryIcon = L.divIcon({
  className: 'archive-pin archive-pin--advisory',
  html: '<span></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

function Viewport({ bounds, regionBounds, corridor, incident, radius, overviewRequest, onZoomOut }) {
  const map = useMap()
  const skipOverviewFit = useRef(false)

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  useEffect(() => {
    if (skipOverviewFit.current && !regionBounds) {
      skipOverviewFit.current = false
      return
    }
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.stop()
    if (incident && !corridor && !radius) {
      map.setView(incident.position, Math.max(14, map.getZoom()), { animate })
      return
    }
    const reportedArea = incident && radius ? L.latLng(incident.position).toBounds(radius * 2) : null
    map.fitBounds(corridor || reportedArea || regionBounds || bounds, {
      padding: corridor || reportedArea ? [46, 56] : [35, 35],
      maxZoom: corridor ? 12 : reportedArea ? 15 : regionBounds ? 9 : undefined,
      animate: animate && Boolean(regionBounds),
    })
  }, [bounds, regionBounds, corridor, incident, radius, overviewRequest, map])

  useEffect(() => {
    if (!regionBounds) return undefined
    function zoomedOut() {
      const indiaZoom = map.getBoundsZoom(bounds, false, L.point(70, 70))
      if (map.getZoom() <= indiaZoom) {
        skipOverviewFit.current = true
        onZoomOut()
      }
    }
    map.on('zoomend', zoomedOut)
    return () => map.off('zoomend', zoomedOut)
  }, [bounds, map, regionBounds, onZoomOut])

  return null
}

export default function RiskMap({ locations, region, onRegion, incident, onIncident, onShowDetail }) {
  const [mapData, setMapData] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [overviewRequest, setOverviewRequest] = useState(0)

  function centerOnIndia() {
    onRegion(null)
    setOverviewRequest((n) => n + 1)
  }
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setError('')
      try {
        const [boundaries, reports, outline] = await Promise.all(
          ['/maps/india-states.geojson', '/maps/landslide-reports.json', '/maps/india-outline.geojson'].map(async (path) => {
            const response = await fetch(path, { signal: controller.signal })
            if (!response.ok) throw new Error('Map data unavailable')
            return response.json()
          })
        )
        setMapData({ boundaries, reports, outline })
      } catch (failure) {
        if (failure.name !== 'AbortError') setError('The India boundaries or landslide archive could not be loaded.')
      }
    }
    load()
    return () => controller.abort()
  }, [attempt])

  const stateBounds = useMemo(() => new Map(mapData?.boundaries.features.map((feature) =>
    [feature.properties.name, L.geoJSON(feature).getBounds()]
  )), [mapData])
  const indiaBounds = useMemo(() => {
    const result = L.latLngBounds([])
    stateBounds.forEach((bounds) => result.extend(bounds))
    return result
  }, [stateBounds])
  const risks = useMemo(() => {
    const result = new Map()
    for (const site of locations) {
      const previous = result.get(site.state)
      if (!previous || site.risk_score > previous.risk_score) result.set(site.state, site)
    }
    return result
  }, [locations])
  const clickRegion = useRef(null)
  clickRegion.current = (name) => { if (risks.has(name)) onRegion(name) }
  const showsAdvisory = incident?.id === NH702_ADVISORY.id
  const radius = reportedAccuracyRadius(incident?.precision)
  const corridor = useMemo(() => showsAdvisory
    ? L.latLngBounds([...NH702_ADVISORY.mainRoute, ...NH702_ADVISORY.detour]) : null, [showsAdvisory])

  if (!mapData) return <PageState loading={!error} error={error} onRetry={() => setAttempt((n) => n + 1)} />

  const regionalReports = region ? mapData.reports.filter((report) => report.state === region) : []
  const pins = region === NH702_ADVISORY.state ? [...regionalReports, NH702_ADVISORY] : regionalReports

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background" aria-label="India landslide risk map">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <MapPin size={19} className="shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">{region || 'India overview'}</h2>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {showsAdvisory ? 'NH-702 · 265 m of road affected in the archived advisory'
                : incident ? radius ? `Reported location accuracy: ${incident.precision} · affected footprint unavailable` : 'Reported landslide location · affected footprint unavailable'
                : region ? `${pins.length} landslide reports and advisories` : 'Select a highlighted state to reveal landslide reports'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {incident && <button className="btn-outline !py-1.5 text-xs" onClick={onShowDetail}>
            <ArrowDown size={14} aria-hidden="true" /> Road impact
          </button>}
          <button className="btn-outline !py-1.5 text-xs" onClick={centerOnIndia}>
            <LocateFixed size={14} aria-hidden="true" /> Center on India
          </button>
        </div>
      </div>
      <div className="relative isolate">
        <MapContainer
          center={[22, 83]}
          zoom={4}
          minZoom={0}
          maxZoom={18}
          maxBounds={WORLD_BOUNDS}
          maxBoundsViscosity={0.8}
          zoomSnap={0.25}
          zoomDelta={0.75}
          scrollWheelZoom={false}
          className="india-risk-map"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="dark-world-tiles"
            attribution={'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            noWrap
          />
          <Viewport
            bounds={indiaBounds}
            regionBounds={stateBounds.get(region)}
            corridor={corridor}
            incident={incident}
            radius={radius}
            overviewRequest={overviewRequest}
            onZoomOut={() => onRegion(null)}
          />
          <GeoJSON
            data={mapData.outline}
            interactive={false}
            style={{ color: 'var(--primary)', weight: 2, opacity: 0.8, fillOpacity: 0.05 }}
          />
          <GeoJSON
            data={mapData.boundaries}
            style={(feature) => {
              const name = feature.properties.name
              const site = risks.get(name)
              const color = site ? riskMeta(site.risk_level).color : '#848866'
              const selected = region === name
              return {
                color, fillColor: site ? color : 'var(--primary)', weight: selected ? 2.75 : site ? 1.8 : 1,
                opacity: region && !selected ? 0.57 : site ? 0.95 : 0.72,
                fillOpacity: selected ? 0.17 : site ? region ? 0.06 : 0.13 : 0.025,
                className: site ? 'india-risk-region' : undefined,
              }
            }}
            onEachFeature={(feature, layer) => {
              const name = feature.properties.name
              layer.bindTooltip(name, { sticky: true, className: 'india-map-tooltip' })
              layer.on('click', () => clickRegion.current(name))
            }}
          />
          {incident && radius && (
            <Circle center={incident.position} radius={radius} pathOptions={{
              color: '#fb923c', weight: 2, dashArray: '6 5', fillOpacity: 0.12, interactive: false,
            }} />
          )}
          {showsAdvisory && (
            <>
              <Polyline positions={NH702_ADVISORY.mainRoute} pathOptions={{ color: '#fb923c', weight: 4, dashArray: '7 5', interactive: false }} />
              <Polyline positions={NH702_ADVISORY.detour} pathOptions={{ color: 'var(--primary)', weight: 4, dashArray: '3 7', interactive: false }} />
              <Polyline positions={NH702_ADVISORY.affectedStretch} pathOptions={{ color: '#f43f5e', weight: 8, interactive: false }} />
            </>
          )}
          {pins.map((pin) => (
            <Marker key={pin.id} position={pin.position} icon={pin.url ? advisoryIcon : pin.precision === 'exact' ? exactArchiveIcon : archiveIcon}
              zIndexOffset={pin.url || pin.id === incident?.id ? 1000 : 0}
              alt={pin.name} title={pin.name} eventHandlers={{ click: () => onIncident(pin) }}>
              <Tooltip direction="top" offset={[0, -12]} className="india-map-tooltip india-incident-tooltip">
                {pin.name}{pin.url ? ' · schematic location' : ` · accuracy ${pin.precision || 'unknown'}`}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
        <div className="pointer-events-none border-t border-border bg-card/95 px-4 py-2.5 text-[11px] sm:absolute sm:right-4 sm:top-4 sm:z-[500] sm:rounded-lg sm:border sm:p-3">
          <p className="mb-2 font-semibold">Highest site risk</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 sm:block sm:space-y-1">
            {RISK_THRESHOLDS.map(({ level }) => (
              <li key={level} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: riskMeta(level).color }} /> {riskMeta(level).label}
              </li>
            ))}
            <li className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-muted-foreground/40" /> No site data</li>
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
        <a className="underline hover:text-primary" href="https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/" target="_blank" rel="noreferrer">Boundaries © DataMeet / geoBoundaries</a>
        <a className="underline hover:text-primary" href="https://data.nasa.gov/dataset/global-landslide-catalog-export" target="_blank" rel="noreferrer">NASA Global Landslide Catalog</a>
        <span>{showsAdvisory ? 'Red marks the schematic affected stretch. Orange shows NH-702 and lime shows the detour.' : radius ? 'Dashed circle shows the source’s location accuracy. The impacted footprint is unavailable.' : 'Solid white pins have source-reported exact positions. Outlined pins are approximate.'}</span>
      </div>
    </section>
  )
}
