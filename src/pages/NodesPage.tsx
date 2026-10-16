import { useMemo, useState } from 'react'
import { Network, Package, Radio, Signal, Wifi, WifiOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { NODE_STATUS_META, NODE_TYPE_META } from '../types'
import type { CommNode, NodeStatus } from '../types'
import { EmptyState } from '../components/ui'

const STATUS_COLOR: Record<NodeStatus, string> = { activo: '#43A047', inestable: '#FBC02D', offline: '#E53935' }

// Posiciones esquemáticas del grafo (no geográficas)
const LAYOUT: Record<string, { x: number; y: number }> = {
  'NOD-CEN-01': { x: 50, y: 12 },
  'NOD-GTW-01': { x: 28, y: 34 },
  'NOD-GTW-02': { x: 72, y: 34 },
  'NOD-REP-01': { x: 14, y: 56 },
  'NOD-REP-02': { x: 86, y: 56 },
  'NOD-COM-01': { x: 32, y: 78 },
  'NOD-COM-02': { x: 68, y: 78 },
  'NOD-CAP-01': { x: 18, y: 92 },
  'NOD-CAP-02': { x: 50, y: 92 },
}

export default function NodesPage() {
  const { state } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<NodeStatus | 'todos'>('todos')

  const filtered = useMemo(
    () => (statusFilter === 'todos' ? state.nodes : state.nodes.filter((n) => n.status === statusFilter)),
    [state.nodes, statusFilter],
  )

  const selected = state.nodes.find((n) => n.id === selectedId)

  const stats = useMemo(() => {
    const m = new Map<NodeStatus, number>()
    state.nodes.forEach((n) => m.set(n.status, (m.get(n.status) ?? 0) + 1))
    return {
      activo: m.get('activo') ?? 0,
      inestable: m.get('inestable') ?? 0,
      offline: m.get('offline') ?? 0,
      packets: state.nodes.reduce((a, n) => a + n.packets, 0),
    }
  }, [state.nodes])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
            <Network size={20} className="text-info-sky" /> Nodos y comunicaciones
          </h1>
          <p className="text-[12px] text-graytech mt-0.5">
            Red táctica ficticia — estados y paquetes simulados, sin hardware conectado.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {(['todos', 'activo', 'inestable', 'offline'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                statusFilter === s ? 'border-info-sky bg-info-sky/15 text-info-sky' : 'border-white/10 text-sky-100/55 hover:border-white/25'
              }`}
            >
              {s === 'todos' ? 'Todos' : NODE_STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Nodos activos', value: stats.activo, color: '#43A047', icon: Wifi },
          { label: 'Conexión inestable', value: stats.inestable, color: '#FBC02D', icon: Signal },
          { label: 'Desconectados', value: stats.offline, color: '#E53935', icon: WifiOff },
          { label: 'Paquetes transmitidos', value: stats.packets, color: '#4FC3F7', icon: Package },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}1f`, color: s.color }}>
                <Icon size={16} />
              </div>
              <div>
                <p className="font-display text-xl font-extrabold text-white leading-none tabular-nums">{s.value}</p>
                <p className="text-[10.5px] text-graytech mt-1">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Grafo esquemático */}
        <div className="lg:col-span-7 card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio size={15} className="text-turq" />
            <h2 className="font-display font-bold text-[13.5px] text-white">Topología de la red táctica (esquemática)</h2>
          </div>
          <div className="relative w-full aspect-[4/3] rounded-xl border border-white/8 bg-navy-deep/50 overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              {/* enlaces */}
              {state.nodes.flatMap((n) =>
                n.linkedTo
                  .filter((targetId) => {
                    const t = state.nodes.find((x) => x.id === targetId)
                    return t && LAYOUT[n.id] && LAYOUT[targetId] && (n.id < targetId || !state.nodes.find((x) => x.id === targetId)?.linkedTo.includes(n.id))
                  })
                  .map((targetId) => {
                    const a = LAYOUT[n.id]
                    const b = LAYOUT[targetId]
                    if (!a || !b) return null
                    const t = state.nodes.find((x) => x.id === targetId)
                    const worst = n.status === 'offline' || t?.status === 'offline' ? 'offline' : n.status === 'inestable' || t?.status === 'inestable' ? 'inestable' : 'activo'
                    const color = STATUS_COLOR[worst as NodeStatus]
                    return (
                      <line
                        key={`${n.id}-${targetId}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={color}
                        strokeWidth={worst === 'offline' ? 0.35 : 0.55}
                        strokeOpacity={worst === 'offline' ? 0.35 : 0.7}
                        className={worst === 'activo' ? 'link-flow' : ''}
                        strokeDasharray={worst === 'offline' ? '1.5 1.5' : undefined}
                      />
                    )
                  }),
              )}
              {/* nodos */}
              {filtered.map((n) => {
                const pos = LAYOUT[n.id]
                if (!pos) return null
                const color = STATUS_COLOR[n.status]
                const isSel = n.id === selectedId
                return (
                  <g key={n.id} transform={`translate(${pos.x},${pos.y})`} onClick={() => setSelectedId(n.id)} style={{ cursor: 'pointer' }}>
                    <title>{`${n.name} — ${NODE_STATUS_META[n.status].label}`}</title>
                    {isSel && <circle r={5.5} fill={color} opacity={0.25} />}
                    <circle r={isSel ? 3.4 : 2.6} fill="#071E33" stroke={color} strokeWidth={0.7} />
                    <circle r={isSel ? 1.5 : 1.1} fill={color} />
                  </g>
                )
              })}
            </svg>
            <div className="absolute bottom-2.5 left-3 flex items-center gap-3">
              {(['activo', 'inestable', 'offline'] as NodeStatus[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-[10px] text-sky-100/70">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                  {NODE_STATUS_META[s].label}
                </span>
              ))}
            </div>
            <span className="absolute top-2.5 right-3 rounded-md bg-yellow-warn/15 border border-yellow-warn/35 px-2 py-0.5 text-[9px] font-bold text-yellow-warn">
              LAYOUT SIMULADO
            </span>
          </div>
        </div>

        {/* Detalle + lista */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {selected ? (
            <div className="card p-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${STATUS_COLOR[selected.status]}1f`, color: STATUS_COLOR[selected.status] }}
                >
                  <Radio size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10.5px] text-turq font-bold">{selected.id}</p>
                  <h3 className="font-display font-bold text-[14px] text-white leading-tight">{selected.name}</h3>
                </div>
                <span
                  className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide"
                  style={{
                    color: STATUS_COLOR[selected.status],
                    borderColor: `${STATUS_COLOR[selected.status]}55`,
                    background: `${STATUS_COLOR[selected.status]}14`,
                  }}
                >
                  {NODE_STATUS_META[selected.status].label}
                </span>
              </div>
              <div className="mt-3 space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-graytech">Tipo</span>
                  <span className="text-sky-100 font-medium">{NODE_TYPE_META[selected.type].label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-graytech">Ubicación (demo)</span>
                  <span className="text-sky-100 font-mono text-[11px]">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-graytech">Paquetes transmitidos</span>
                  <span className="text-white font-bold tabular-nums">{selected.packets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-graytech">Enlaces</span>
                  <span className="text-sky-100">{selected.linkedTo.join(', ') || '—'}</span>
                </div>
                <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2 mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-graytech mb-1">Último evento simulado</p>
                  <p className="text-[11.5px] text-sky-100/80 leading-relaxed">{selected.lastEvent}</p>
                  <p className="text-[10px] text-graytech mt-1">
                    {new Date(selected.lastEventAt).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              <p className="text-[9.5px] text-yellow-warn/70 mt-3 leading-snug">
                Los estados provienen de una simulación local. No corresponden a mediciones de hardware real.
              </p>
            </div>
          ) : (
            <div className="card p-5 text-center">
              <p className="text-[12.5px] text-graytech leading-relaxed">
                Seleccione un nodo del grafo para ver su identificador, estado, paquetes de demostración y último evento
                simulado.
              </p>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2">
              <Wifi size={14} className="text-info-sky" />
              <p className="font-display font-bold text-[12.5px] text-white">Inventario de nodos</p>
              <span className="ml-auto text-[10.5px] text-graytech">{filtered.length} nodo(s)</span>
            </div>
            {filtered.length === 0 ? (
              <EmptyState icon={<Network size={20} />} title="Sin nodos" detail="No hay nodos con el estado seleccionado." />
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition ${
                      selectedId === n.id ? 'bg-info-sky/10' : 'hover:bg-white/3'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[n.status] }} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-white truncate">{n.name}</p>
                      <p className="text-[10px] text-graytech">
                        {n.id} · {NODE_TYPE_META[n.type].label}
                      </p>
                    </div>
                    <span className="ml-auto text-[10.5px] text-graytech tabular-nums shrink-0">{n.packets} pkt</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
