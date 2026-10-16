import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  HeartPulse,
  Map as MapIcon,
  Plus,
  ShieldAlert,
  Users,
  Wrench,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useApp, useScoredIncidents } from '../context/AppContext'
import { StatCard, EmptyState, Badge } from '../components/ui'
import TacticalMap from '../components/map/TacticalMap'
import IncidentDetailPanel from '../components/IncidentDetailPanel'
import { CATEGORY_META, SEVERITY_META, STATUS_META } from '../types'
import type { IncidentCategory, Severity } from '../types'
import { useIncidentForm } from '../components/IncidentFormProvider'

const SEV_COLORS: Record<Severity, string> = {
  baja: '#43A047',
  moderada: '#FBC02D',
  alta: '#FF7A00',
  critica: '#E53935',
}

const CAT_COLORS: Record<IncidentCategory, string> = {
  inundacion: '#4FC3F7',
  deslave: '#FBC02D',
  sismo: '#FF7A00',
  incendio: '#E53935',
  colapso: '#885CF6',
  accidente: '#00C2C7',
  medica: '#43A047',
  otro: '#6B7280',
}

export default function DashboardPage() {
  const { state, selectedIncidentId, setSelectedIncidentId, setIncidentStatus } = useApp()
  const { openForm } = useIncidentForm()
  const scored = useScoredIncidents()
  const navigate = useNavigate()

  const kpis = useMemo(() => {
    const inc = state.incidents
    return {
      total: inc.length,
      criticos: inc.filter((i) => i.severity === 'critica' && i.status !== 'resuelto').length,
      atrapados: inc.filter((i) => i.status !== 'resuelto').reduce((a, i) => a + i.trapped, 0),
      recursos: state.resources.reduce((a, r) => a + r.available, 0),
      enAtencion: inc.filter((i) => i.status === 'en_atencion').length,
      resueltos: inc.filter((i) => i.status === 'resuelto').length,
    }
  }, [state.incidents, state.resources])

  const catData = useMemo(() => {
    const m = new Map<string, number>()
    state.incidents.forEach((i) => m.set(i.category, (m.get(i.category) ?? 0) + 1))
    return [...m.entries()].map(([k, v]) => ({ name: CATEGORY_META[k as IncidentCategory].label, value: v, key: k }))
  }, [state.incidents])

  const sevData = useMemo(() => {
    const m = new Map<Severity, number>()
    ;(['baja', 'moderada', 'alta', 'critica'] as Severity[]).forEach((s) => m.set(s, 0))
    state.incidents.forEach((i) => m.set(i.severity, (m.get(i.severity) ?? 0) + 1))
    return [...m.entries()].map(([k, v]) => ({ name: SEVERITY_META[k].label, value: v, key: k }))
  }, [state.incidents])

  const evoData = useMemo(() => {
    const days: { label: string; total: number; criticos: number }[] = []
    for (let d = 6; d >= 0; d--) {
      const day = new Date()
      day.setDate(day.getDate() - d)
      const key = day.toISOString().slice(0, 10)
      const list = state.incidents.filter((i) => i.datetime.slice(0, 10) === key)
      days.push({
        label: day.toLocaleDateString('es-NI', { weekday: 'short', day: '2-digit' }),
        total: list.length,
        criticos: list.filter((i) => i.severity === 'critica' || i.severity === 'alta').length,
      })
    }
    return days
  }, [state.incidents])

  const selected = scored.find((s) => s.incident.id === selectedIncidentId)

  const recent = useMemo(
    () => [...scored].sort((a, b) => b.incident.datetime.localeCompare(a.incident.datetime)).slice(0, 6),
    [scored],
  )

  const topRecs = useMemo(
    () =>
      [...scored]
        .filter((s) => s.incident.status !== 'resuelto')
        .sort((a, b) => b.criticidad.score - a.criticidad.score)
        .slice(0, 4),
    [scored],
  )

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total incidentes" value={kpis.total} icon={<BarChart3 size={17} />} accent="#4FC3F7" sub="Base de datos demo" />
        <StatCard label="Críticos activos" value={kpis.criticos} icon={<ShieldAlert size={17} />} accent="#E53935" sub="Requieren atención inmediata" />
        <StatCard label="Personas atrapadas" value={kpis.atrapados} icon={<Users size={17} />} accent="#FF7A00" sub="Sumatoria de reportes" />
        <StatCard label="Recursos disponibles" value={kpis.recursos} icon={<Wrench size={17} />} accent="#43A047" sub="Unidades / ítems en inventario" />
        <StatCard label="En atención" value={kpis.enAtencion} icon={<HeartPulse size={17} />} accent="#885CF6" sub="Operaciones en curso" />
        <StatCard label="Resueltos" value={kpis.resueltos} icon={<CheckCircle2 size={17} />} accent="#00C2C7" sub="Casos cerrados" />
      </div>

      {/* Mapa + lista + IA */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 card p-3 flex flex-col">
          <div className="flex items-center justify-between px-1 pb-2.5">
            <div className="flex items-center gap-2">
              <MapIcon size={15} className="text-turq" />
              <h2 className="font-display font-bold text-[13.5px] text-white">Mapa táctico nacional</h2>
            </div>
            <button className="btn btn-ghost !py-1 !px-2.5 !text-[11px]" onClick={() => navigate('/mapa')}>
              Abrir mapa completo
            </button>
          </div>
          <div className="flex-1 min-h-[380px]">
            <TacticalMap
              incidents={state.incidents}
              allIncidents={state.incidents}
              resources={state.resources}
              selectedId={selectedIncidentId}
              onSelect={setSelectedIncidentId}
              heatMode={false}
              height="100%"
              compact
            />
          </div>
          <div className="flex items-center gap-3 px-1 pt-2.5 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              {(['baja', 'moderada', 'alta', 'critica'] as Severity[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-[10.5px] text-sky-100/70">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEV_COLORS[s] }} />
                  {SEVERITY_META[s].label}
                </span>
              ))}
            </div>
            <span className="ml-auto text-[10.5px] text-graytech">{state.incidents.length} marcadores visibles</span>
          </div>
        </div>

        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Incidentes recientes */}
          <div className="card p-3.5 flex-1">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="font-display font-bold text-[13px] text-white">Incidentes recientes</h2>
              <button className="btn btn-primary !py-1 !px-2.5 !text-[11px]" onClick={() => openForm()}>
                <Plus size={13} /> Registrar
              </button>
            </div>
            {recent.length === 0 ? (
              <EmptyState icon={<AlertTriangle size={20} />} title="Sin incidentes" detail="Registre una emergencia para comenzar." />
            ) : (
              <div className="space-y-1.5">
                {recent.map((s) => (
                  <button
                    key={s.incident.id}
                    onClick={() => setSelectedIncidentId(s.incident.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${
                      selectedIncidentId === s.incident.id
                        ? 'border-turq/50 bg-turq/10'
                        : 'border-white/6 hover:border-turq/30 hover:bg-white/3'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: SEV_COLORS[s.incident.severity] }}
                      />
                      <span className="font-mono text-[10.5px] text-turq font-bold">{s.incident.id}</span>
                      <Badge className={`${STATUS_META[s.incident.status].tw} !text-[9px] ml-auto`}>
                        {STATUS_META[s.incident.status].label}
                      </Badge>
                    </div>
                    <p className="text-[12px] font-semibold text-white mt-1 leading-snug">
                      {CATEGORY_META[s.incident.category].label} — {s.incident.municipality}
                    </p>
                    <p className="text-[10.5px] text-graytech mt-0.5">
                      Criticidad {s.criticidad.score}/100
                      {s.incident.trapped > 0 && <span className="text-red-crit"> · {s.incident.trapped} atrapados</span>}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panel IA */}
          <div className="card p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={15} className="text-purple-ai" />
              <h2 className="font-display font-bold text-[13px] text-white">Recomendaciones simuladas</h2>
            </div>
            <p className="text-[9.5px] font-bold text-purple-ai/80 uppercase tracking-widest mb-2.5">
              IA SIMULADA — RESULTADOS DE DEMOSTRACIÓN
            </p>
            {topRecs.length === 0 ? (
              <EmptyState icon={<Sparkles size={20} />} title="Sin recomendaciones" />
            ) : (
              <div className="space-y-2">
                {topRecs.map((s) => (
                  <div key={s.incident.id} className="rounded-lg border border-purple-ai/20 bg-purple-ai/5 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11.5px] font-semibold text-white leading-snug">{s.recommendation.title}</p>
                      <span
                        className="font-display font-extrabold text-sm shrink-0"
                        style={{
                          color:
                            s.criticidad.score >= 75 ? '#E53935' : s.criticidad.score >= 50 ? '#FF7A00' : s.criticidad.score >= 25 ? '#FBC02D' : '#43A047',
                        }}
                      >
                        {s.criticidad.score}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-sky-100/55 mt-1 leading-snug line-clamp-2">{s.recommendation.justification}</p>
                  </div>
                ))}
                <button className="btn btn-ghost w-full !py-1.5 !text-[11px]" onClick={() => navigate('/ia')}>
                  Abrir Centro de Análisis IA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="font-display font-bold text-[13px] text-white mb-3">Incidentes por categoría</h3>
          {catData.length === 0 ? (
            <EmptyState icon={<BarChart3 size={20} />} title="Sin datos" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" stroke="#6B7280" fontSize={10} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#8fb3c9" fontSize={10} width={110} />
                <Tooltip
                  contentStyle={{ background: '#071E33', border: '1px solid rgba(0,194,199,0.3)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" name="Incidentes" radius={[0, 6, 6, 0]}>
                  {catData.map((d) => (
                    <Cell key={d.key} fill={CAT_COLORS[d.key as IncidentCategory]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-display font-bold text-[13px] text-white mb-3">Distribución por gravedad</h3>
          {sevData.every((d) => d.value === 0) ? (
            <EmptyState icon={<BarChart3 size={20} />} title="Sin datos" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sevData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                  {sevData.map((d) => (
                    <Cell key={d.key} fill={SEV_COLORS[d.key as Severity]} stroke="transparent" />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  formatter={(value) => <span style={{ color: '#8fb3c9', fontSize: 11 }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: '#071E33', border: '1px solid rgba(0,194,199,0.3)', borderRadius: 10, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-display font-bold text-[13px] text-white mb-3">Evolución temporal (7 días)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evoData} margin={{ left: -18, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" stroke="#6B7280" fontSize={10} />
              <YAxis stroke="#6B7280" fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#071E33', border: '1px solid rgba(0,194,199,0.3)', borderRadius: 10, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="total" stroke="#00C2C7" strokeWidth={2.5} dot={{ r: 3 }} name="Total" />
              <Line type="monotone" dataKey="criticos" stroke="#FF7A00" strokeWidth={2} dot={{ r: 3 }} name="Alta/Crítica" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Panel de detalle flotante cuando hay selección */}
      {selected && (
        <div className="fixed bottom-4 right-4 z-[80] w-[360px] max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-hidden fade-up shadow-2xl">
          <IncidentDetailPanel
            incident={selected.incident}
            criticidad={selected.criticidad}
            recommendation={selected.recommendation}
            onClose={() => setSelectedIncidentId(null)}
            onLocate={() => navigate(`/mapa?foco=${selected.incident.id}`)}
            onAi={() => navigate(`/ia?foco=${selected.incident.id}`)}
            onStatus={(st) => setIncidentStatus(selected.incident.id, st)}
          />
        </div>
      )}
    </div>
  )
}
