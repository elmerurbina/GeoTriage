import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Incident, Resource, Severity } from '../../types'
import { CATEGORY_META, NEED_META } from '../../types'
import { calculateCriticidad, generateRecommendation } from '../../lib/ai'
import { nicaraguaFeature } from '../../data/nicaraguaGeo'
import { LAKES_GEOJSON, NIC_CENTER, buildGraticule } from './geoAux'

export interface MapFilters {
  severities: Severity[]
  categories: string[]
  statuses: string[]
}

const SEV_COLOR: Record<Severity, string> = {
  baja: '#43A047',
  moderada: '#FBC02D',
  alta: '#FF7A00',
  critica: '#E53935',
}

const SEV_LABEL: Record<Severity, string> = {
  baja: 'Baja',
  moderada: 'Moderada',
  alta: 'Alta',
  critica: 'Crítica',
}

function buildStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    name: 'geotriage-dark',
    sources: {
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Esri World Imagery',
        maxzoom: 18,
      },
      nicaragua: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [nicaraguaFeature as unknown as GeoJSON.Feature] },
      },
      lakes: { type: 'geojson', data: LAKES_GEOJSON },
      graticule: { type: 'geojson', data: buildGraticule() },
      incidents: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'bg', type: 'background' as const, paint: { 'background-color': '#081B2E' } },
      {
        id: 'satellite-layer',
        type: 'raster' as const,
        source: 'satellite',
        layout: { visibility: 'visible' },
        paint: { 'raster-opacity': 0.58, 'raster-saturation': -0.08, 'raster-contrast': -0.05 },
      },
      {
        id: 'graticule',
        type: 'line' as const,
        source: 'graticule',
        paint: { 'line-color': '#0F3A5C', 'line-width': 1, 'line-opacity': 0.55 },
      },
      {
        id: 'nic-fill',
        type: 'fill' as const,
        source: 'nicaragua',
        paint: { 'fill-color': '#0E2F4D', 'fill-opacity': 0.34 },
      },
      {
        id: 'nic-outline',
        type: 'line' as const,
        source: 'nicaragua',
        paint: { 'line-color': '#00C2C7', 'line-width': 1.6, 'line-opacity': 0.85 },
      },
      {
        id: 'lakes-fill',
        type: 'fill' as const,
        source: 'lakes',
        paint: { 'fill-color': '#0A3D5C', 'fill-opacity': 0.95 },
      },
      {
        id: 'lakes-line',
        type: 'line' as const,
        source: 'lakes',
        paint: { 'line-color': '#4FC3F7', 'line-width': 0.8, 'line-opacity': 0.5 },
      },
      {
        id: 'heatmap-layer',
        type: 'heatmap' as const,
        source: 'incidents',
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
          'heatmap-intensity': 1.8,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 38, 12, 54],
          'heatmap-opacity': 0.95,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,60,90,0)',
            0.2, '#006064',
            0.4, '#00C2C7',
            0.6, '#FBC02D',
            0.8, '#FF7A00',
            1, '#E53935',
          ],
        },
      },
      {
        id: 'incident-points',
        type: 'circle' as const,
        source: 'incidents',
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'severity'],
            'baja', SEV_COLOR.baja,
            'moderada', SEV_COLOR.moderada,
            'alta', SEV_COLOR.alta,
            'critica', SEV_COLOR.critica,
            '#4FC3F7',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#04151f',
        },
      },
    ],
  }
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

interface Props {
  incidents: Incident[]
  allIncidents?: Incident[]
  resources?: Resource[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  heatMode: boolean
  height?: string
  compact?: boolean
  satellite?: boolean
  focusPoint?: [number, number] | null
}

export default function TacticalMap({ incidents, allIncidents, resources, selectedId, onSelect, heatMode, height = '100%', compact, satellite = true, focusPoint }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current || failed) return
    if (!webglAvailable()) {
      setFailed(true)
      return
    }
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildStyle(),
        center: NIC_CENTER,
        zoom: compact ? 6.2 : 6.6,
        attributionControl: { compact: true },
        maxPitch: 55,
      })
    } catch {
      setFailed(true)
      return
    }
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    let settled = false
    map.on('load', () => {
      settled = true
      setReady(true)
    })
    map.on('error', (e) => {
      // No bloquear la demo por errores de recursos externos
      if (e && typeof e === 'object' && 'error' in e) console.warn('[mapa] error simulado/ignorado:', e.error)
    })
    // Salvaguarda: si el mapa no carga (WebGL limitado/entornos headless), usar el mapa SVG.
    const loadGuard = window.setTimeout(() => {
      if (!settled) setFailed(true)
    }, 4500)
    return () => {
      window.clearTimeout(loadGuard)
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [failed, compact])

  // Sincronizar datos de incidentes (heatmap + puntos)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const src = map.getSource('incidents') as maplibregl.GeoJSONSource | undefined
    if (!src) return
    const weightFor = (inc: Incident) => {
      const sev = { baja: 0.25, moderada: 0.5, alta: 0.75, critica: 1 }[inc.severity]
      return Math.min(1, sev + (inc.trapped > 0 ? 0.15 : 0) + inc.needs.length * 0.03)
    }
    src.setData({
      type: 'FeatureCollection',
      features: incidents.map((i) => ({
        type: 'Feature',
        properties: { id: i.id, severity: i.severity, weight: weightFor(i) },
        geometry: { type: 'Point', coordinates: [i.lng, i.lat] },
      })),
    })
    const heat = map.getLayer('heatmap-layer')
    const pts = map.getLayer('incident-points')
    if (heat) map.setLayoutProperty('heatmap-layer', 'visibility', heatMode ? 'visible' : 'none')
    if (pts) map.setLayoutProperty('incident-points', 'visibility', heatMode ? 'none' : 'visible')
    const sat = map.getLayer('satellite-layer')
    if (sat) map.setLayoutProperty('satellite-layer', 'visibility', satellite ? 'visible' : 'none')
  }, [incidents, ready, heatMode, satellite])

  // Marcadores HTML (popup nativo con tarjeta)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    if (heatMode) return

    const ctxAll = allIncidents ?? incidents
    try {
    const sevLabel: Record<Severity, string> = {
      baja: 'Baja',
      moderada: 'Moderada',
      alta: 'Alta',
      critica: 'Crítica',
    }
    const critLevelColor: Record<string, string> = {
      baja: '#43A047',
      moderada: '#FBC02D',
      alta: '#FF7A00',
      critica: '#E53935',
    }

    for (const inc of incidents) {
      const el = document.createElement('button')
      el.type = 'button'
      el.title = `${inc.id} — ${CATEGORY_META[inc.category].label} — ${inc.municipality}`
      el.style.cssText = `width:24px;height:24px;border-radius:9999px;background:${SEV_COLOR[inc.severity]};border:2.5px solid #04151f;box-shadow:0 0 0 ${inc.severity === 'critica' ? '4px rgba(229,57,53,0.35)' : '2px rgba(0,0,0,0.35)'};cursor:pointer;padding:0;transition:transform .15s ease;display:flex;align-items:center;justify-content:center;color:#071B2E;font-family:'Montserrat',sans-serif;font-size:8.5px;font-weight:800;line-height:1;letter-spacing:-0.02em;`
      el.textContent = CATEGORY_META[inc.category].short
      if (inc.id === selectedId) {
        el.style.transform = 'scale(1.45)'
        el.style.boxShadow = `0 0 0 5px ${SEV_COLOR[inc.severity]}55, 0 0 18px ${SEV_COLOR[inc.severity]}88`
      }
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        onSelectRef.current(inc.id)
      })

      const crit = calculateCriticidad(inc, ctxAll)
      const rec = generateRecommendation(inc, ctxAll, resources ?? [], crit)
      const needs = inc.needs.length ? inc.needs.map((n) => NEED_META[n as keyof typeof NEED_META]?.label ?? n).join(', ') : 'Ninguna registrada'
      const sevHex = SEV_COLOR[inc.severity]
      const dt = new Date(inc.datetime).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' })

      const popupEl = document.createElement('div')
      popupEl.style.cssText = 'font-family:Inter,sans-serif;min-width:250px;max-width:280px;'
      popupEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <span style="width:10px;height:10px;border-radius:99px;background:${sevHex};display:inline-block;box-shadow:0 0 6px ${sevHex}66"></span>
          <strong style="font-size:12.5px;color:#fff">${inc.id}</strong>
          <span style="margin-left:auto;font-size:9.5px;padding:2px 7px;border-radius:99px;background:${sevHex}22;color:${sevHex};font-weight:700;letter-spacing:.04em">${sevLabel[inc.severity].toUpperCase()}</span>
        </div>
        <div style="font-size:11.5px;color:#cfe2ef;line-height:1.55">
          <div><span style="color:#7d9bb0">Tipo:</span> ${CATEGORY_META[inc.category].label}</div>
          <div><span style="color:#7d9bb0">Municipio / comunidad:</span> ${inc.municipality}${inc.community ? ' · ' + inc.community : ''}${inc.department ? ', ' + inc.department : ''}</div>
          <div><span style="color:#7d9bb0">Coordenadas:</span> ${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}</div>
          <div><span style="color:#7d9bb0">Gravedad:</span> ${sevLabel[inc.severity]}</div>
          <div><span style="color:#7d9bb0">Criticidad simulada:</span> <span style="color:${critLevelColor[crit.level]};font-weight:700">${crit.score}/100</span> <span style="color:#7d9bb0;font-size:10px">(${crit.level})</span></div>
          <div><span style="color:#7d9bb0">Personas atrapadas:</span> ${inc.trapped}</div>
          <div><span style="color:#7d9bb0">Personas heridas:</span> ${inc.injured}</div>
          <div><span style="color:#7d9bb0">Necesidades:</span> ${needs}</div>
          <div><span style="color:#7d9bb0">Estado de acceso:</span> ${inc.access}</div>
          <div><span style="color:#7d9bb0">Fecha / hora:</span> ${dt}</div>
          <div><span style="color:#7d9bb0">Estado de atención:</span> ${inc.status.replace('_', ' ')}</div>
        </div>
        <div style="margin-top:9px;padding:8px 9px;border-radius:9px;background:rgba(136,92,246,0.10);border:1px solid rgba(136,92,246,0.30)">
          <div style="font-size:9px;font-weight:800;letter-spacing:.08em;color:#b79cff;margin-bottom:3px">IA SIMULADA — RECOMENDACIÓN</div>
          <div style="font-size:11px;font-weight:600;color:#f1eaff;line-height:1.4">${rec.title}</div>
          <div style="font-size:10px;color:#c6b4f5;margin-top:3px;line-height:1.4">${rec.action}</div>
        </div>
        <button class="gt-view-btn" style="margin-top:9px;width:100%;padding:6px 8px;border-radius:8px;border:1px solid rgba(0,194,199,0.45);background:rgba(0,194,199,0.12);color:#00C2C7;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif">
          Ver detalles completos
        </button>
      `
      const viewBtn = popupEl.querySelector('.gt-view-btn') as HTMLButtonElement | null
      viewBtn?.addEventListener('click', (ev) => {
        ev.stopPropagation()
        onSelectRef.current(inc.id)
      })

      const popup = new maplibregl.Popup({
        offset: 14,
        closeButton: false,
        maxWidth: '300px',
      }).setDOMContent(popupEl)

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([inc.lng, inc.lat]).setPopup(popup).addTo(map)
      if (inc.id === selectedId) marker.togglePopup()
      markersRef.current.push(marker)
    }
    } catch (e) {
      console.error('[mapa] error en marcadores:', e)
      setFailed(true)
    }
  }, [incidents, allIncidents, resources, ready, selectedId, heatMode])

  // Centrar sobre el incidente seleccionado
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !selectedId) return
    const inc = incidents.find((i) => i.id === selectedId)
    if (!inc) return
    map.flyTo({ center: [inc.lng, inc.lat], zoom: 12.2, speed: 1.6, essential: true })
  }, [selectedId, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || selectedId) return
    map.flyTo({ center: focusPoint ?? NIC_CENTER, zoom: focusPoint ? 11.4 : compact ? 6.2 : 6.6, speed: 1.3, essential: true })
  }, [focusPoint, ready, selectedId, compact])

  if (failed) return <FallbackMap incidents={incidents} selectedId={selectedId} onSelect={onSelect} height={height} heatMode={heatMode} satellite={satellite} />

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="w-full h-full rounded-[13px] overflow-hidden" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-deep/80 z-10 rounded-[13px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-turq/30 border-t-turq animate-spin" />
            <p className="text-xs text-sky-100/60">Cargando cartografía táctica…</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mapa alternativo SVG (sin WebGL) — representación geográfica de demostración
// ---------------------------------------------------------------------------
const LON_MIN = -87.9
const LON_MAX = -82.9
const LAT_MIN = 10.5
const LAT_MAX = 15.3
const VB_W = 1000
const VB_H = 960

function proj(lat: number, lng: number): [number, number] {
  const x = ((lng - LON_MIN) / (LON_MAX - LON_MIN)) * VB_W
  const y = VB_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * VB_H
  return [x, y]
}

export function FallbackMap({
  incidents,
  selectedId,
  onSelect,
  height = '100%',
  heatMode,
  satellite = true,
}: {
  incidents: Incident[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  height?: string
  heatMode?: boolean
  satellite?: boolean
}) {
  const ring = (nicaraguaFeature.geometry as { coordinates: number[][][] }).coordinates[0]
  const path = ring.map(([lng, lat], i) => {
    const [x, y] = proj(lat, lng)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ') + ' Z'

  const lakePaths = LAKES_GEOJSON.features.map((f) => {
    const coords = (f.geometry as { coordinates: number[][][] }).coordinates[0]
    const d = coords
      .map(([lng, lat], i) => {
        const [x, y] = proj(lat, lng)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ') + ' Z'
    return { d, name: f.properties.name }
  })

  return (
    <div className="relative w-full overflow-hidden rounded-[13px] border border-turq/15 bg-[#081B2E]" style={{ height }}>
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <span className="rounded-md bg-yellow-warn/20 border border-yellow-warn/40 px-2 py-0.5 text-[10px] font-bold text-yellow-warn">
          MAPA DE SIMULACIÓN SIN WEBGL
        </span>
        <span className="text-[10px] text-sky-100/40">Representación geográfica esquemática de Nicaragua</span>
      </div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="heat-glow">
            <stop offset="0%" stopColor="#E53935" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#FF7A00" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00C2C7" stopOpacity="0" />
          </radialGradient>
          <filter id="blur1"><feGaussianBlur stdDeviation="10" /></filter>
        {satellite && <image href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-87.9,10.5,-82.9,15.3&bboxSR=4326&imageSR=4326&size=1000,960&format=png&f=image" x="0" y="0" width={VB_W} height={VB_H} preserveAspectRatio="none" opacity="0.82" />}
        </defs>
        {/* graticula */}
        {Array.from({ length: 6 }, (_, i) => 10 + i).map((lat) => (
          <line key={`h${lat}`} x1={0} x2={VB_W} y1={proj(lat, 0)[1]} y2={proj(lat, 0)[1]} stroke="#0F3A5C" strokeWidth={1} opacity={0.5} />
        ))}
        {Array.from({ length: 6 }, (_, i) => -88 + i).map((lng) => (
          <line key={`v${lng}`} y1={0} y2={VB_H} x1={proj(0, lng)[0]} x2={proj(0, lng)[0]} stroke="#0F3A5C" strokeWidth={1} opacity={0.5} />
        ))}
        <path d={path} fill={satellite ? '#0E2F4D55' : '#0E2F4D'} stroke="#00C2C7" strokeWidth={2} />
        {lakePaths.map((l) => (
          <path key={l.name} d={l.d} fill="#0A3D5C" stroke="#4FC3F7" strokeWidth={1} opacity={0.9} />
        ))}
        {heatMode &&
          incidents.map((i) => {
            const [cx, cy] = proj(i.lat, i.lng)
            const r = 42 + (i.severity === 'critica' ? 28 : i.severity === 'alta' ? 18 : 8) + Math.min(i.trapped * 2, 20)
            return <circle key={`h-${i.id}`} cx={cx} cy={cy} r={r} fill="url(#heat-glow)" filter="url(#blur1)" />
          })}
        {!heatMode &&
          incidents.map((i) => {
            const [cx, cy] = proj(i.lat, i.lng)
            const selected = i.id === selectedId
            return (
              <g
                key={i.id}
                transform={`translate(${cx},${cy})`}
                onClick={() => onSelect(i.id)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${i.id} — ${i.municipality}`}</title>
                {selected && <circle r={18} fill={SEV_COLOR[i.severity]} opacity={0.25} />}
                <circle r={selected ? 12 : 9} fill={SEV_COLOR[i.severity]} stroke="#04151f" strokeWidth={2.5} />
                <text textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="800" fill="#071B2E" fontFamily="Montserrat, sans-serif">
                  {CATEGORY_META[i.category].short}
                </text>
              </g>
            )
          })}
      </svg>
      {!heatMode && (
        <div className="absolute bottom-3 left-3 rounded-lg bg-navy-deep/90 border border-white/10 px-3 py-2">
          <p className="text-[10px] font-bold text-sky-100/60 mb-1.5">GRAVEDAD</p>
          <div className="flex flex-col gap-1">
            {(['baja', 'moderada', 'alta', 'critica'] as Severity[]).map((s) => (
              <div key={s} className="flex items-center gap-2 text-[10px] text-sky-100/80">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEV_COLOR[s] }} />
                {SEV_LABEL[s]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
