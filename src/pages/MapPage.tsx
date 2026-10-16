import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Flame, Grid3x3, LocateFixed, Plus, RotateCcw, Satellite, Sparkles } from 'lucide-react'
import { useApp, useScoredIncidents } from '../context/AppContext'
import { useIncidentForm } from '../components/IncidentFormProvider'
import TacticalMap from '../components/map/TacticalMap'
import IncidentDetailPanel from '../components/IncidentDetailPanel'
import { ChipToggle } from '../components/ui'
import { CATEGORY_META, SEVERITY_META, STATUS_META } from '../types'
import type { IncidentCategory, IncidentStatus, Severity } from '../types'

const SEV_COLOR: Record<Severity, string> = {
  baja: '#43A047',
  moderada: '#FBC02D',
  alta: '#FF7A00',
  critica: '#E53935',
}

export default function MapPage() {
  const { state, selectedIncidentId, setSelectedIncidentId, setIncidentStatus } = useApp()
  const { openForm } = useIncidentForm()
  const scored = useScoredIncidents()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const [sevFilters, setSevFilters] = useState<Severity[]>([])
  const [catFilters, setCatFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [heatMode, setHeatMode] = useState(false)
  const [satellite, setSatellite] = useState(true)
  const [municipality, setMunicipality] = useState('')
  const [community, setCommunity] = useState('')

  const municipalities = useMemo(
    () => [...new Set(state.incidents.map((i) => i.municipality).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [state.incidents],
  )
  const municipalityRecords = useMemo(
    () => municipality ? state.incidents.filter((i) => i.municipality.toLocaleLowerCase() === municipality.toLocaleLowerCase()) : state.incidents,
    [state.incidents, municipality],
  )
  const communities = useMemo(
    () => [...new Set(municipalityRecords.map((i) => i.community).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'es')),
    [municipalityRecords],
  )
  const focusPoint = useMemo<[number, number] | null>(() => {
    if (!municipality || municipalityRecords.length === 0) return null
    return [
      municipalityRecords.reduce((sum, i) => sum + i.lng, 0) / municipalityRecords.length,
      municipalityRecords.reduce((sum, i) => sum + i.lat, 0) / municipalityRecords.length,
    ]
  }, [municipality, municipalityRecords])

  // Enfocar incidente vía query param ?foco=ID
  useEffect(() => {
    const foco = params.get('foco')
    const incident = state.incidents.find((i) => i.id === foco)
    if (incident) {
      setSelectedIncidentId(foco)
      setMunicipality(incident.municipality)
      setCommunity(incident.community ?? '')
    }
  }, [params, state.incidents]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(
    () =>
      state.incidents.filter((i) => {
        if (municipality && i.municipality.toLocaleLowerCase() !== municipality.toLocaleLowerCase()) return false
        if (community && i.community !== community) return false
        if (sevFilters.length > 0 && !sevFilters.includes(i.severity)) return false
        if (catFilters.length > 0 && !catFilters.includes(i.category)) return false
        if (statusFilters.length > 0 && !statusFilters.includes(i.status)) return false
        return true
      }),
    [state.incidents, municipality, community, sevFilters, catFilters, statusFilters],
  )

  const selected = scored.find((s) => s.incident.id === selectedIncidentId)
  const filtersActive = Boolean(municipality || community) || sevFilters.length > 0 || catFilters.length > 0 || statusFilters.length > 0

  const resetFilters = () => {
    setSevFilters([])
    setCatFilters([])
    setStatusFilters([])
    setMunicipality('')
    setCommunity('')
    setSelectedIncidentId(null)
    setParams({}, { replace: true })
  }

  const locate = (id: string) => {
    setSelectedIncidentId(id)
    setParams({ foco: id }, { replace: true })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-full">
      <div className="xl:col-span-8 flex flex-col gap-3">
        {/* Toolbar */}
        <div className="card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display font-bold text-[14px] text-white mr-1">Mapa táctico</h2>
            <span className="rounded-full border border-turq/35 bg-turq/10 px-2.5 py-0.5 text-[10.5px] font-bold text-turq tabular-nums">
              {filtered.length} / {state.incidents.length} visibles
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                className={`btn !py-1.5 !text-[11.5px] ${satellite ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSatellite((v) => !v)}
              >
                <Satellite size={13} /> {satellite ? 'Satélite: on' : 'Satélite: off'}
              </button>
              <button
                className={`btn !py-1.5 !text-[11.5px] ${heatMode ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setHeatMode((v) => !v)}
              >
                <Flame size={13} /> {heatMode ? 'Mapa de calor activo' : 'Mapa de calor'}
              </button>
              <button className="btn btn-ghost !py-1.5 !text-[11.5px]" onClick={resetFilters} disabled={!filtersActive}>
                <RotateCcw size={13} /> Restablecer filtros
              </button>
              <button className="btn btn-primary !py-1.5 !text-[11.5px]" onClick={() => openForm()}>
                <Plus size={13} /> Registrar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/7">
            <label className="block">
              <span className="label !mb-1">Ciudad / municipio</span>
              <select className="input" value={municipality} onChange={(e) => {
                setMunicipality(e.target.value)
                setCommunity('')
                setSelectedIncidentId(null)
                setParams({}, { replace: true })
              }}>
                <option value="">Todo Nicaragua</option>
                {municipalities.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label !mb-1">Barrio / comunidad</span>
              <select className="input" value={community} onChange={(e) => setCommunity(e.target.value)} disabled={!municipality || communities.length === 0}>
                <option value="">Todas las comunidades</option>
                {communities.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/7">
            <div>
              <p className="label !mb-1.5">Gravedad</p>
              <ChipToggle
                options={(Object.keys(SEVERITY_META) as Severity[]).map((s) => ({
                  value: s,
                  label: SEVERITY_META[s].label,
                  color: SEV_COLOR[s],
                }))}
                value={sevFilters}
                onChange={(v) => setSevFilters(v as Severity[])}
              />
            </div>
            <div>
              <p className="label !mb-1.5">Categoría</p>
              <ChipToggle
                options={(Object.keys(CATEGORY_META) as IncidentCategory[]).map((c) => ({
                  value: c,
                  label: CATEGORY_META[c].label,
                }))}
                value={catFilters}
                onChange={setCatFilters}
              />
            </div>
            <div>
              <p className="label !mb-1.5">Estado de atención</p>
              <ChipToggle
                options={(Object.keys(STATUS_META) as IncidentStatus[]).map((s) => ({
                  value: s,
                  label: STATUS_META[s].label,
                }))}
                value={statusFilters}
                onChange={setStatusFilters}
              />
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="card p-2 flex-1 min-h-[480px] flex flex-col">
          <TacticalMap
            incidents={filtered}
            allIncidents={state.incidents}
            resources={state.resources}
            selectedId={selectedIncidentId}
            onSelect={(id) => {
              setSelectedIncidentId(id)
              if (id) setParams({ foco: id }, { replace: true })
              else setParams({}, { replace: true })
            }}
            heatMode={heatMode}
            satellite={satellite}
            focusPoint={focusPoint}
            height="520px"
          />
          {!heatMode && (
            <div className="flex items-center gap-3 px-2 pt-2 flex-wrap">
              <span className="text-[10px] font-bold text-graytech uppercase tracking-wider mr-1">Gravedad</span>
              {(['baja', 'moderada', 'alta', 'critica'] as Severity[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-[10.5px] text-sky-100/75">
                  <span className="w-3 h-3 rounded-full" style={{ background: SEV_COLOR[s] }} />
                  {SEVERITY_META[s].label}
                </span>
              ))}
              <span className="ml-auto text-[10.5px] text-graytech">Tipo: sigla en el marcador</span>
            </div>
          )}
          {heatMode && (
            <div className="flex items-center gap-3 px-2 pt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-graytech uppercase tracking-wider mr-1">Intensidad</span>
                {['#006064', '#00C2C7', '#FBC02D', '#FF7A00', '#E53935'].map((c) => (
                  <span key={c} className="w-8 h-2.5 rounded-sm" style={{ background: c }} />
                ))}
              </div>
              <span className="text-[10px] text-yellow-warn/80">
                Capa de calor calculada con datos sintéticos de demostración (ponderada por gravedad y atrapados).
              </span>
            </div>
          )}
          {heatMode && (
            <div className="flex items-center gap-1.5 px-2 pt-1.5 text-[10px] text-graytech">
              <Grid3x3 size={11} /> Proyección esquemática — sin teselas externas, operativa sin conexión.
            </div>
          )}
        </div>
      </div>

      {/* Panel lateral */}
      <div className="xl:col-span-4 flex flex-col gap-3">
        {selected ? (
          <IncidentDetailPanel
            incident={selected.incident}
            criticidad={selected.criticidad}
            recommendation={selected.recommendation}
            onClose={() => {
              setSelectedIncidentId(null)
              setParams({}, { replace: true })
            }}
            onStatus={(st) => setIncidentStatus(selected.incident.id, st)}
            onAi={() => navigate(`/ia?foco=${selected.incident.id}`)}
            onLocate={() => locate(selected.incident.id)}
          />
        ) : municipality ? (
          <div className="card p-4 flex flex-col flex-1 min-h-[300px]">
            <div className="mb-3">
              <p className="font-display font-bold text-[14px] text-white">Alertas de {municipality}</p>
              <p className="text-[11px] text-graytech mt-0.5">{filtered.length} registro(s) visibles · agrupados por barrio o comunidad</p>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[480px]">
              {filtered.length === 0 ? <p className="text-[11.5px] text-graytech py-4">No hay alertas con los filtros seleccionados.</p> : filtered.map((incident) => (
                <button key={incident.id} className="w-full text-left rounded-lg border border-white/8 bg-white/[0.025] hover:bg-white/[0.06] p-3 transition" onClick={() => locate(incident.id)}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SEV_COLOR[incident.severity] }} />
                    <span className="font-mono text-[10px] font-bold text-turq">{incident.id}</span>
                    <span className="ml-auto text-[9.5px] uppercase font-bold" style={{ color: SEV_COLOR[incident.severity] }}>{SEVERITY_META[incident.severity].label}</span>
                  </div>
                  <p className="text-[11.5px] font-semibold text-white mt-1.5">{incident.community || 'Comunidad no especificada'}</p>
                  <p className="text-[10px] text-graytech mt-0.5">{CATEGORY_META[incident.category].label} · {STATUS_META[incident.status].label}</p>
                </button>
              ))}
            </div>
            <p className="text-[9.5px] text-yellow-warn/75 mt-auto pt-3">Los registros marcados como simulados son datos ficticios de demostración.</p>
          </div>
        ) : (
          <div className="card p-5 flex flex-col items-center justify-center text-center flex-1 min-h-[300px]">
            <div className="w-14 h-14 rounded-2xl bg-turq/10 border border-turq/25 flex items-center justify-center text-turq mb-3">
              <LocateFixed size={24} />
            </div>
            <p className="font-display font-bold text-[13.5px] text-white">Seleccionar incidente</p>
            <p className="text-[11.5px] text-graytech mt-1.5 max-w-xs leading-relaxed">
              Haga clic en un marcador del mapa o use la lista de la bandeja para consultar el detalle completo del
              incidente y su recomendación táctica simulada.
            </p>
            <button className="btn btn-ghost mt-4 !text-[11.5px]" onClick={() => navigate('/incidentes')}>
              Abrir bandeja de incidentes
            </button>
          </div>
        )}

        {/* Leyenda de criticidad */}
        <div className="card p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-graytech uppercase tracking-wider mb-2.5">
            <Sparkles size={12} className="text-purple-ai" /> Leyenda de criticidad simulada
          </p>
          <div className="space-y-2">
            {[
              { label: '0–24 Baja', color: '#43A047', desc: 'Monitoreo de rutina' },
              { label: '25–49 Moderada', color: '#FBC02D', desc: 'Seguimiento periódico' },
              { label: '50–74 Alta', color: '#FF7A00', desc: 'Atención preferente' },
              { label: '75–100 Crítica', color: '#E53935', desc: 'Respuesta inmediata' },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: r.color }} />
                <span className="text-[11.5px] font-semibold text-sky-100/85 w-28">{r.label}</span>
                <span className="text-[10.5px] text-graytech">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
