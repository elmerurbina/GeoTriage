import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Database,
  ListChecks,
  MapPin,
  Navigation,
  Radio,
  Sparkles,
  Target,
  Users,
  XCircle,
} from 'lucide-react'
import { useApp, useScoredIncidents } from '../context/AppContext'
import { EmptyState, ProgressBar } from '../components/ui'
import { SEVERITY_META, STATUS_META } from '../types'
import type { Recommendation } from '../types'
import { criticidadLevelOf, priorityColor, priorityLabel } from '../lib/ai'

const STEPS = [
  { key: 'reporte', label: 'Reporte recibido', icon: Database },
  { key: 'gravedad', label: 'Evaluación de gravedad', icon: Activity },
  { key: 'afectadas', label: 'Análisis de personas afectadas', icon: Users },
  { key: 'acceso', label: 'Evaluación de acceso', icon: MapPin },
  { key: 'necesidades', label: 'Identificación de necesidades', icon: ListChecks },
  { key: 'recursos', label: 'Consulta de recursos simulados', icon: Radio },
  { key: 'recomendacion', label: 'Recomendación táctica generada', icon: Target },
]

function criticColor(score: number) {
  const l = criticidadLevelOf(score)
  return l === 'critica' ? '#E53935' : l === 'alta' ? '#FF7A00' : l === 'moderada' ? '#FBC02D' : '#43A047'
}

export default function AiPage() {
  const { state, acceptRecommendation, rejectRecommendation, setSelectedIncidentId } = useApp()
  const scored = useScoredIncidents()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const foco = params.get('foco')
  const [activeId, setActiveId] = useState<string | null>(foco ?? scored[0]?.incident.id ?? null)
  const [step, setStep] = useState(STEPS.length)
  const [running, setRunning] = useState(false)
  const [decided, setDecided] = useState<Record<string, 'aceptada' | 'rechazada'>>(() => {
    const m: Record<string, 'aceptada' | 'rechazada'> = {}
    state.decisions.forEach((d) => {
      if (d.recommendationId && !d.recommendationId.startsWith('manual')) m[d.recommendationId] = d.decision
    })
    return m
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const active = scored.find((s) => s.incident.id === activeId) ?? null
  const nearestResource = active
    ? state.resources.filter((r) => r.available > 0).map((r) => {
        const dLat = (r.baseLat - active.incident.lat) * Math.PI / 180
        const dLng = (r.baseLng - active.incident.lng) * Math.PI / 180
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(active.incident.lat * Math.PI / 180) * Math.cos(r.baseLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
        return { resource: r, km: 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) }
      }).sort((a, b) => a.km - b.km)[0]
    : undefined
  const incidentMapsUrl = active
    ? `https://www.google.com/maps/search/?api=1&query=${active.incident.lat},${active.incident.lng}`
    : ''
  const routeMapsUrl = active && nearestResource
    ? `https://www.google.com/maps/dir/?api=1&origin=${nearestResource.resource.baseLat},${nearestResource.resource.baseLng}&destination=${active.incident.lat},${active.incident.lng}&travelmode=driving`
    : ''

  const runAnalysis = (id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStep(0)
    setRunning(true)
    let i = 0
    const tick = () => {
      i += 1
      setStep(i)
      if (i < STEPS.length) timerRef.current = setTimeout(tick, 520)
      else setRunning(false)
    }
    timerRef.current = setTimeout(tick, 420)
  }

  useEffect(() => {
    if (foco) {
      setActiveId(foco)
      setSelectedIncidentId(foco)
    }
  }, [foco]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeId) runAnalysis(activeId)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [activeId])

  const ranked = useMemo(() => [...scored].sort((a, b) => b.criticidad.score - a.criticidad.score), [scored])

  const stats = useMemo(() => {
    const decs = state.decisions.filter((d) => !d.recommendationId.startsWith('manual'))
    return {
      aceptadas: decs.filter((d) => d.decision === 'aceptada').length,
      rechazadas: decs.filter((d) => d.decision === 'rechazada').length,
      pendientes: ranked.filter((s) => !decided[s.recommendation.id]).length,
    }
  }, [state.decisions, ranked, decided])

  const decide = (rec: Recommendation, decision: 'aceptada' | 'rechazada') => {
    if (decision === 'aceptada') acceptRecommendation(rec)
    else rejectRecommendation(rec)
    setDecided((d) => ({ ...d, [rec.id]: decision }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
            <BrainCircuit size={20} className="text-purple-ai" /> Centro de Análisis IA
          </h1>
          <p className="text-[12px] text-graytech mt-0.5">
            Motor de reglas en TypeScript — sin modelos de lenguaje ni servicios externos.
          </p>
        </div>
        <span className="ml-auto rounded-lg border border-purple-ai/45 bg-purple-ai/12 px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-purple-ai">
          IA SIMULADA — RESULTADOS DE DEMOSTRACIÓN
        </span>
      </div>

      {/* Estadísticas de decisiones */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Recomendaciones aceptadas', value: stats.aceptadas, color: '#43A047' },
          { label: 'Recomendaciones rechazadas', value: stats.rechazadas, color: '#E53935' },
          { label: 'Pendientes de revisión', value: stats.pendientes, color: '#FBC02D' },
        ].map((s) => (
          <div key={s.label} className="card p-3.5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-extrabold text-lg" style={{ background: `${s.color}1f`, color: s.color }}>
              {s.value}
            </span>
            <p className="text-[11.5px] text-sky-100/70 leading-snug">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Lista de incidentes a analizar */}
        <div className="lg:col-span-4 card overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/8">
            <p className="font-display font-bold text-[13px] text-white">Incidentes para análisis</p>
            <p className="text-[10.5px] text-graytech">Ordenados por criticidad calculada</p>
          </div>
          <div className="overflow-y-auto max-h-[560px]">
            {ranked.length === 0 ? (
              <EmptyState icon={<Cpu size={20} />} title="Sin incidentes" detail="Registre un incidente para analizarlo." />
            ) : (
              ranked.map((s) => {
                const c = criticColor(s.criticidad.score)
                const dec = decided[s.recommendation.id]
                return (
                  <button
                    key={s.incident.id}
                    onClick={() => {
                      setActiveId(s.incident.id)
                      setParams({ foco: s.incident.id }, { replace: true })
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 transition ${
                      activeId === s.incident.id ? 'bg-purple-ai/12 border-l-2 border-l-purple-ai' : 'hover:bg-white/3 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10.5px] text-turq font-bold">{s.incident.id}</span>
                      {dec && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                          style={{
                            background: dec === 'aceptada' ? 'rgba(67,160,71,0.18)' : 'rgba(229,57,53,0.18)',
                            color: dec === 'aceptada' ? '#43A047' : '#E53935',
                          }}
                        >
                          {dec === 'aceptada' ? 'ACEPTADA' : 'RECHAZADA'}
                        </span>
                      )}
                      <span className="ml-auto font-display font-extrabold text-[15px]" style={{ color: c }}>
                        {s.criticidad.score}
                      </span>
                    </div>
                    <p className="text-[12px] font-semibold text-white mt-1 leading-snug truncate">{s.recommendation.title}</p>
                    <p className="text-[10.5px] text-graytech mt-0.5">
                      {s.incident.municipality} · gravedad {SEVERITY_META[s.incident.severity].label.toLowerCase()}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Pipeline + resultado */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {!active ? (
            <div className="card flex-1">
              <EmptyState icon={<BrainCircuit size={24} />} title="Seleccione un incidente" detail="Elija un registro de la lista para ejecutar el análisis simulado." />
            </div>
          ) : (
            <>
              {/* Secuencia visual */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-display font-bold text-[13.5px] text-white">
                      Análisis de {active.incident.id}
                    </p>
                    <p className="text-[11px] text-graytech">
                      {active.incident.category} · {active.incident.municipality}, {active.incident.department}
                    </p>
                    <a href={incidentMapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-[10.5px] text-turq hover:underline">
                      <MapPin size={11} /> {active.incident.lat.toFixed(6)}, {active.incident.lng.toFixed(6)} · Abrir ubicación exacta
                    </a>
                  </div>
                  <button className="btn btn-ghost !py-1.5 !text-[11px]" onClick={() => runAnalysis(active.incident.id)} disabled={running}>
                    <Sparkles size={13} /> {running ? 'Analizando…' : 'Re-ejecutar análisis'}
                  </button>
                </div>

                <ProgressBar value={(step / STEPS.length) * 100} color="#885CF6" height={6} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3.5">
                  {STEPS.map((s, idx) => {
                    const Icon = s.icon
                    const done = idx < step
                    const current = running && idx === step - 1
                    return (
                      <div
                        key={s.key}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all duration-300 ${
                          done
                            ? 'border-purple-ai/35 bg-purple-ai/8'
                            : current
                              ? 'border-turq/50 bg-turq/10'
                              : 'border-white/6 opacity-40'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            done ? 'bg-purple-ai/20 text-purple-ai' : current ? 'bg-turq/25 text-turq' : 'bg-white/5 text-graytech'
                          }`}
                        >
                          {done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                        </div>
                        <span className={`text-[11.5px] font-semibold ${done || current ? 'text-white' : 'text-graytech'}`}>{s.label}</span>
                        {current && <span className="ml-auto w-2 h-2 rounded-full bg-turq animate-pulse" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Resultado final */}
              {step >= STEPS.length && (
                <div className="fade-up grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Score */}
                  <div className="md:col-span-2 card p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-graytech mb-2">Criticidad simulada</p>
                    <div
                      className="w-28 h-28 rounded-full flex items-center justify-center relative"
                      style={{
                        background: `conic-gradient(${criticColor(active.criticidad.score)} ${active.criticidad.score * 3.6}deg, rgba(255,255,255,0.07) 0deg)`,
                      }}
                    >
                      <div className="absolute inset-2.5 rounded-full bg-navy-deep flex flex-col items-center justify-center">
                        <span className="font-display text-3xl font-extrabold leading-none" style={{ color: criticColor(active.criticidad.score) }}>
                          {active.criticidad.score}
                        </span>
                        <span className="text-[10px] text-graytech mt-0.5">de 100</span>
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] font-semibold" style={{ color: criticColor(active.criticidad.score) }}>
                      Nivel: {criticidadLevelOf(active.criticidad.score)}
                    </p>
                    <p className="text-[11px] text-sky-100/60 mt-1.5 leading-relaxed">{active.criticidad.explanation}</p>
                    <div className="w-full mt-3 pt-3 border-t border-white/8 space-y-1.5 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graytech mb-1">Factores del puntaje</p>
                      {active.criticidad.factors.map((f, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="text-sky-100/65">{f.label}</span>
                          <span className="font-bold tabular-nums" style={{ color: criticColor(active.criticidad.score) }}>+{f.points}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9.5px] text-yellow-warn/70 mt-3 leading-snug">
                      La puntuación calculada no sustituye la gravedad declarada por el operador.
                    </p>
                  </div>

                  {/* Recomendación */}
                  <div className="md:col-span-3 card p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={15} className="text-purple-ai" />
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider"
                        style={{
                          color: priorityColor(active.recommendation.priority),
                          borderColor: `${priorityColor(active.recommendation.priority)}55`,
                          background: `${priorityColor(active.recommendation.priority)}14`,
                        }}
                      >
                        PRIORIDAD {priorityLabel(active.recommendation.priority).toUpperCase()}
                      </span>
                      {decided[active.recommendation.id] && (
                        <span
                          className="ml-auto rounded-full px-2 py-0.5 text-[9.5px] font-bold"
                          style={{
                            background: decided[active.recommendation.id] === 'aceptada' ? 'rgba(67,160,71,0.18)' : 'rgba(229,57,53,0.18)',
                            color: decided[active.recommendation.id] === 'aceptada' ? '#43A047' : '#E53935',
                          }}
                        >
                          {decided[active.recommendation.id] === 'aceptada' ? 'ACEPTADA POR OPERADOR' : 'RECHAZADA POR OPERADOR'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-[15px] text-white leading-snug mt-1">{active.recommendation.title}</h3>

                    <div className="mt-3 space-y-2.5 flex-1">
                      <div className="rounded-lg border border-turq/25 bg-turq/5 px-3 py-2.5">
                        <p className="label !mb-1">Ubicación y ruta vial</p>
                        <p className="text-[11px] text-sky-100/75">Destino: {active.incident.municipality}, {active.incident.department} · {active.incident.lat.toFixed(6)}, {active.incident.lng.toFixed(6)}</p>
                        {nearestResource ? (
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                            <span className="text-[10.5px] text-graytech">Recurso disponible más cercano: {nearestResource.resource.name} · aprox. {nearestResource.km.toFixed(1)} km en línea recta</span>
                            <a className="btn btn-ghost !py-1 !text-[10.5px]" href={routeMapsUrl} target="_blank" rel="noreferrer">
                              <Navigation size={12} /> Ver rutas viales más cortas
                            </a>
                          </div>
                        ) : <p className="text-[10.5px] text-yellow-warn mt-1">No hay recursos con disponibilidad para calcular origen.</p>}
                        <p className="text-[9.5px] text-graytech mt-1">Google Maps calcula las rutas y alternativas viales desde el origen seleccionado; confirme cierres y condiciones reales antes del despacho.</p>
                      </div>
                      <div>
                        <p className="label !mb-1">Justificación</p>
                        <p className="text-[12px] text-sky-100/80 leading-relaxed">{active.recommendation.justification}</p>
                      </div>
                      <div>
                        <p className="label !mb-1">Acción propuesta</p>
                        <p className="text-[12px] text-turq leading-relaxed bg-turq/6 border border-turq/20 rounded-lg px-3 py-2">
                          {active.recommendation.action}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="label !mb-1">Recursos recomendados</p>
                          <div className="flex flex-wrap gap-1.5">
                            {active.recommendation.resources.map((r) => (
                              <span key={r} className="rounded-md border border-info-sky/30 bg-info-sky/10 px-2 py-0.5 text-[10.5px] font-semibold text-info-sky">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="label !mb-1">Disponibilidad simulada</p>
                          <span
                            className="inline-flex rounded-md border px-2 py-0.5 text-[10.5px] font-bold"
                            style={{
                              borderColor:
                                active.recommendation.availability === 'disponible'
                                  ? 'rgba(67,160,71,0.4)'
                                  : active.recommendation.availability === 'parcial'
                                    ? 'rgba(251,192,45,0.4)'
                                    : 'rgba(229,57,53,0.4)',
                              background:
                                active.recommendation.availability === 'disponible'
                                  ? 'rgba(67,160,71,0.12)'
                                  : active.recommendation.availability === 'parcial'
                                    ? 'rgba(251,192,45,0.12)'
                                    : 'rgba(229,57,53,0.12)',
                              color:
                                active.recommendation.availability === 'disponible'
                                  ? '#43A047'
                                  : active.recommendation.availability === 'parcial'
                                    ? '#FBC02D'
                                    : '#E53935',
                            }}
                          >
                            {active.recommendation.availability === 'disponible'
                              ? 'Recursos disponibles'
                              : active.recommendation.availability === 'parcial'
                                ? 'Disponibilidad parcial'
                                : 'Recursos insuficientes'}
                          </span>
                        </div>
                      </div>
                      {active.recommendation.constraints.length > 0 && (
                        <div>
                          <p className="label !mb-1">Posibles restricciones</p>
                          <ul className="space-y-1">
                            {active.recommendation.constraints.map((c, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-yellow-warn/85">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-yellow-warn shrink-0" />
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/8">
                      <button
                        className="btn btn-primary"
                        disabled={!!decided[active.recommendation.id] || running}
                        onClick={() => decide(active.recommendation, 'aceptada')}
                      >
                        <CheckCircle2 size={14} /> Aceptar recomendación
                      </button>
                      <button
                        className="btn btn-danger"
                        disabled={!!decided[active.recommendation.id] || running}
                        onClick={() => decide(active.recommendation, 'rechazada')}
                      >
                        <XCircle size={14} /> Rechazar
                      </button>
                      <button className="btn btn-ghost" onClick={() => navigate(`/mapa?foco=${active.incident.id}`)}>
                        <ArrowRight size={14} /> Ver incidente en mapa
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
