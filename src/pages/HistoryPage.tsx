import { useMemo, useState } from 'react'
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
import { Download, FileJson, FileSpreadsheet, History } from 'lucide-react'
import { useApp, useScoredIncidents } from '../context/AppContext'
import { CATEGORY_META, SEVERITY_META, STATUS_META } from '../types'
import type { IncidentCategory, IncidentStatus, Severity } from '../types'
import { EmptyState, useToast } from '../components/ui'

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

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoryPage() {
  const { state } = useApp()
  const scored = useScoredIncidents()
  const { push } = useToast()

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [cat, setCat] = useState<IncidentCategory | 'todas'>('todas')
  const [status, setStatus] = useState<IncidentStatus | 'todos'>('todos')

  const filtered = useMemo(
    () =>
      state.incidents.filter((i) => {
        const d = i.datetime.slice(0, 10)
        if (from && d < from) return false
        if (to && d > to) return false
        if (cat !== 'todas' && i.category !== cat) return false
        if (status !== 'todos' && i.status !== status) return false
        return true
      }),
    [state.incidents, from, to, cat, status],
  )

  const catData = useMemo(() => {
    const m = new Map<string, number>()
    filtered.forEach((i) => m.set(i.category, (m.get(i.category) ?? 0) + 1))
    return [...m.entries()].map(([k, v]) => ({ name: CATEGORY_META[k as IncidentCategory].label, value: v, key: k }))
  }, [filtered])

  const sevData = useMemo(() => {
    const m = new Map<Severity, number>()
    ;(['baja', 'moderada', 'alta', 'critica'] as Severity[]).forEach((s) => m.set(s, 0))
    filtered.forEach((i) => m.set(i.severity, (m.get(i.severity) ?? 0) + 1))
    return [...m.entries()].map(([k, v]) => ({ name: SEVERITY_META[k].label, value: v, key: k }))
  }, [filtered])

  const munData = useMemo(() => {
    const m = new Map<string, number>()
    filtered.forEach((i) => m.set(i.municipality, (m.get(i.municipality) ?? 0) + 1))
    return [...m.entries()]
      .map(([k, v]) => ({ name: k, value: v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [filtered])

  const evoData = useMemo(() => {
    const m = new Map<string, number>()
    filtered.forEach((i) => {
      const d = i.datetime.slice(0, 10)
      m.set(d, (m.get(d) ?? 0) + 1)
    })
    return [...m.entries()].sort().map(([k, v]) => ({
      label: new Date(k + 'T12:00:00').toLocaleDateString('es-NI', { day: '2-digit', month: 'short' }),
      total: v,
    }))
  }, [filtered])

  const resourcesUsed = useMemo(
    () => state.resources.filter((r) => r.assignedTo).map((r) => ({ ...r, inc: state.incidents.find((i) => i.id === r.assignedTo) })),
    [state.resources, state.incidents],
  )

  const exportCsv = () => {
    const header = ['id', 'categoria', 'municipio', 'departamento', 'lat', 'lng', 'gravedad', 'atrapados', 'heridos', 'acceso', 'estado', 'fecha', 'criticidad']
    const rows = filtered.map((i) => {
      const c = scored.find((s) => s.incident.id === i.id)?.criticidad.score ?? 0
      return [i.id, i.category, i.municipality, i.department, i.lat, i.lng, i.severity, i.trapped, i.injured, i.access, i.status, i.datetime, c].join(',')
    })
    download('geotriage-incidentes-demo.csv', [header.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8')
    push({ kind: 'success', title: 'CSV exportado', detail: `${filtered.length} registros de demostración descargados.` })
  }

  const exportJson = () => {
    download(
      'geotriage-datos-demo.json',
      JSON.stringify({ exportedAt: new Date().toISOString(), note: 'Datos sintéticos de demostración', incidents: filtered, resources: state.resources, nodes: state.nodes, decisions: state.decisions }, null, 2),
      'application/json',
    )
    push({ kind: 'success', title: 'JSON exportado', detail: 'Conjunto completo de datos de demostración descargado.' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
            <History size={20} className="text-turq" /> Historial y reportes
          </h1>
          <p className="text-[12px] text-graytech mt-0.5">{filtered.length} incidentes en el rango filtrado · datos de demostración</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-ghost" onClick={exportCsv}>
            <FileSpreadsheet size={14} /> Exportar CSV
          </button>
          <button className="btn btn-ghost" onClick={exportJson}>
            <FileJson size={14} /> Exportar JSON
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Desde</label>
          <input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Categoría</label>
          <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value as IncidentCategory | 'todas')}>
            <option value="todas">Todas</option>
            {(Object.keys(CATEGORY_META) as IncidentCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_META[c].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus | 'todos')}>
            <option value="todos">Todos</option>
            {(Object.keys(STATUS_META) as IncidentStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => { setFrom(''); setTo(''); setCat('todas'); setStatus('todos') }}
        >
          Limpiar
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Download size={22} />} title="Sin datos en el rango" detail="Ajuste los filtros de fecha, categoría o estado." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="font-display font-bold text-[13px] text-white mb-3">Incidentes por categoría</h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={catData} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" stroke="#6B7280" fontSize={10} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#8fb3c9" fontSize={10} width={110} />
                  <Tooltip contentStyle={{ background: '#071E33', border: '1px solid rgba(0,194,199,0.3)', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {catData.map((d) => (
                      <Cell key={d.key} fill={CAT_COLORS[d.key as IncidentCategory]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4">
              <h3 className="font-display font-bold text-[13px] text-white mb-3">Incidentes por gravedad</h3>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={sevData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {sevData.map((d) => (
                      <Cell key={d.key} fill={SEV_COLORS[d.key as Severity]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Legend formatter={(v) => <span style={{ color: '#8fb3c9', fontSize: 11 }}>{v}</span>} />
                  <Tooltip contentStyle={{ background: '#071E33', border: '1px solid rgba(0,194,199,0.3)', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4">
              <h3 className="font-display font-bold text-[13px] text-white mb-3">Top municipios</h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={munData} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={9} interval={0} angle={-25} textAnchor="end" height={55} />
                  <YAxis stroke="#6B7280" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#071E33', border: '1px solid rgba(0,194,199,0.3)', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="value" fill="#00C2C7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4">
              <h3 className="font-display font-bold text-[13px] text-white mb-3">Evolución temporal</h3>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={evoData} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" stroke="#6B7280" fontSize={10} />
                  <YAxis stroke="#6B7280" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#071E33', border: '1px solid rgba(0,194,199,0.3)', borderRadius: 10, fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" stroke="#885CF6" strokeWidth={2.5} dot={{ r: 3 }} name="Incidentes" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recursos utilizados y decisiones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/8">
                <h3 className="font-display font-bold text-[12.5px] text-white">Recursos utilizados (asignaciones)</h3>
              </div>
              {resourcesUsed.length === 0 ? (
                <EmptyState icon={<Download size={18} />} title="Sin asignaciones registradas" detail="Asigne recursos desde el módulo de gestión." />
              ) : (
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {resourcesUsed.map((r) => (
                    <div key={r.id} className="px-4 py-2.5 flex items-center gap-2 text-[12px]">
                      <span className="font-semibold text-white">{r.name}</span>
                      <span className="text-graytech">→</span>
                      <span className="font-mono text-[11px] text-orange-alert">{r.assignedTo}</span>
                      {r.inc && <span className="text-graytech text-[11px]">({r.inc.municipality})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/8">
                <h3 className="font-display font-bold text-[12.5px] text-white">Decisiones aceptadas / rechazadas</h3>
              </div>
              {state.decisions.length === 0 ? (
                <EmptyState icon={<History size={18} />} title="Sin decisiones" detail="Acepte o rechace recomendaciones en el Centro de Análisis IA." />
              ) : (
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {state.decisions.map((d) => (
                    <div key={d.id} className="px-4 py-2.5 flex items-start gap-2.5">
                      <span
                        className="mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold shrink-0"
                        style={{
                          background: d.decision === 'aceptada' ? 'rgba(67,160,71,0.18)' : 'rgba(229,57,53,0.18)',
                          color: d.decision === 'aceptada' ? '#43A047' : '#E53935',
                        }}
                      >
                        {d.decision === 'aceptada' ? 'ACEPTADA' : 'RECHAZADA'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-white leading-snug">{d.title}</p>
                        <p className="text-[10.5px] text-graytech mt-0.5">
                          {d.incidentId} · {new Date(d.at).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
