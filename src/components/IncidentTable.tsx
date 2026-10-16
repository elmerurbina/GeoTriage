import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  Eye,
  FileSearch,
  Locate,
  MapPinned,
  Pencil,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react'
import type { Incident, IncidentStatus, Severity } from '../types'
import { ACCESS_META, CATEGORY_META, NEED_META, SEVERITY_META, STATUS_META } from '../types'
import { Badge, EmptyState } from './ui'
import { calculateCriticidad, criticidadLevelOf } from '../lib/ai'

type SortKey = 'id' | 'severity' | 'datetime' | 'municipality' | 'status' | 'criticidad'

const SEV_RANK: Record<Severity, number> = { critica: 4, alta: 3, moderada: 2, baja: 1 }

export default function IncidentTable({
  incidents,
  allIncidents,
  selectedId,
  onSelect,
  onView,
  onEdit,
  onStatus,
  onLocate,
  onRecommend,
  onDelete,
  compact,
}: {
  incidents: Incident[]
  allIncidents: Incident[]
  selectedId: string | null
  onSelect: (id: string) => void
  onView?: (inc: Incident) => void
  onEdit?: (inc: Incident) => void
  onStatus?: (inc: Incident, status: IncidentStatus) => void
  onLocate?: (inc: Incident) => void
  onRecommend?: (inc: Incident) => void
  onDelete?: (inc: Incident) => void
  compact?: boolean
}) {
  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState<Severity | 'todas'>('todas')
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'todos'>('todos')
  const [sort, setSort] = useState<SortKey>('datetime')
  const [sortDesc, setSortDesc] = useState(true)
  const [page, setPage] = useState(0)
  const pageSize = compact ? 6 : 9

  const scored = useMemo(() => {
    const map = new Map(allIncidents.map((i) => [i.id, calculateCriticidad(i, allIncidents)]))
    return map
  }, [allIncidents])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = incidents.filter((i) => {
      if (sevFilter !== 'todas' && i.severity !== sevFilter) return false
      if (statusFilter !== 'todos' && i.status !== statusFilter) return false
      if (!q) return true
      return (
        i.id.toLowerCase().includes(q) ||
        i.municipality.toLowerCase().includes(q) ||
        i.department.toLowerCase().includes(q) ||
        CATEGORY_META[i.category].label.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      )
    })
    rows = [...rows].sort((a, b) => {
      let cmp = 0
      if (sort === 'severity') cmp = SEV_RANK[a.severity] - SEV_RANK[b.severity]
      else if (sort === 'datetime') cmp = a.datetime.localeCompare(b.datetime)
      else if (sort === 'municipality') cmp = a.municipality.localeCompare(b.municipality)
      else if (sort === 'status') cmp = a.status.localeCompare(b.status)
      else if (sort === 'criticidad') cmp = (scored.get(a.id)?.score ?? 0) - (scored.get(b.id)?.score ?? 0)
      else cmp = a.id.localeCompare(b.id)
      return sortDesc ? -cmp : cmp
    })
    return rows
  }, [incidents, search, sevFilter, statusFilter, sort, sortDesc, scored])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize)

  const toggleSort = (k: SortKey) => {
    if (sort === k) setSortDesc((d) => !d)
    else {
      setSort(k)
      setSortDesc(true)
    }
    setPage(0)
  }

  const SortHead = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={`px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-graytech ${className ?? ''}`}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-turq transition">
        {children}
        <ArrowUpDown size={11} className={sort === k ? 'text-turq' : 'opacity-40'} />
      </button>
    </th>
  )

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-white/8 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-graytech" />
          <input
            className="input !pl-9"
            placeholder="Buscar por ID, municipio, tipo o descripción…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <select
          className="input !w-auto"
          value={sevFilter}
          onChange={(e) => {
            setSevFilter(e.target.value as Severity | 'todas')
            setPage(0)
          }}
        >
          <option value="todas">Toda gravedad</option>
          <option value="critica">Crítica</option>
          <option value="alta">Alta</option>
          <option value="moderada">Moderada</option>
          <option value="baja">Baja</option>
        </select>
        <select
          className="input !w-auto"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as IncidentStatus | 'todos')
            setPage(0)
          }}
        >
          <option value="todos">Todo estado</option>
          <option value="reportado">Reportado</option>
          <option value="validado">Validado</option>
          <option value="en_atencion">En atención</option>
          <option value="resuelto">Resuelto</option>
        </select>
        <span className="text-[11px] text-graytech ml-auto tabular-nums">
          {filtered.length} registro{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {pageRows.length === 0 ? (
        <EmptyState
          icon={<FileSearch size={22} />}
          title="Sin incidentes que coincidan"
          detail="Ajuste los filtros o registre una nueva emergencia para verla aquí."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-navy-deep/50">
              <tr>
                <SortHead k="id">ID</SortHead>
                <SortHead k="municipality">Tipo / Ubicación</SortHead>
                <SortHead k="severity">Gravedad</SortHead>
                <th className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-graytech">Atrap.</th>
                <th className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-graytech">Necesidades</th>
                <th className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-graytech">Acceso</th>
                <SortHead k="criticidad">Criticidad</SortHead>
                <SortHead k="status">Estado</SortHead>
                <SortHead k="datetime">Fecha</SortHead>
                <th className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-graytech">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((i) => {
                const crit = scored.get(i.id)
                const cLevel = criticidadLevelOf(crit?.score ?? 0)
                const cColor = cLevel === 'critica' ? '#E53935' : cLevel === 'alta' ? '#FF7A00' : cLevel === 'moderada' ? '#FBC02D' : '#43A047'
                return (
                  <tr
                    key={i.id}
                    onClick={() => onSelect(i.id)}
                    className={`border-t border-white/5 cursor-pointer transition ${
                      selectedId === i.id ? 'bg-turq/10' : 'hover:bg-white/3'
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-[11px] text-turq font-semibold whitespace-nowrap">{i.id}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-white leading-tight">{CATEGORY_META[i.category].label}</p>
                      <p className="text-[10.5px] text-graytech leading-tight">
                        {i.municipality}
                        {i.department ? `, ${i.department}` : ''}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={SEVERITY_META[i.severity].tw}>{SEVERITY_META[i.severity].label}</Badge>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {i.trapped > 0 ? <span className="font-bold text-red-crit">{i.trapped}</span> : <span className="text-graytech">—</span>}
                      {i.injured > 0 && <span className="ml-1.5 text-orange-alert">+{i.injured} h</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {i.needs.slice(0, 3).map((n) => (
                          <span
                            key={n}
                            className="rounded px-1.5 py-0.5 text-[9.5px] font-semibold"
                            style={{ background: `${NEED_META[n].hex}18`, color: NEED_META[n].hex }}
                          >
                            {NEED_META[n].label}
                          </span>
                        ))}
                        {i.needs.length > 3 && <span className="text-[9.5px] text-graytech">+{i.needs.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={ACCESS_META[i.access].tw}>{ACCESS_META[i.access].label}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold tabular-nums" style={{ color: cColor }}>
                          {crit?.score ?? 0}
                        </span>
                        <div className="w-12 h-1.5 rounded-full bg-white/8 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${crit?.score ?? 0}%`, background: cColor }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={STATUS_META[i.status].tw}>{STATUS_META[i.status].label}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[10.5px] text-sky-100/60 whitespace-nowrap tabular-nums">
                      {new Date(i.datetime).toLocaleDateString('es-NI', { day: '2-digit', month: 'short' })}
                      <br />
                      {new Date(i.datetime).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {onView && (
                          <button onClick={() => onView(i)} className="action-btn" title="Ver ficha">
                            <Eye size={13} />
                          </button>
                        )}
                        {onLocate && (
                          <button onClick={() => onLocate(i)} className="action-btn" title="Localizar en mapa">
                            <MapPinned size={13} />
                          </button>
                        )}
                        {onEdit && (
                          <button onClick={() => onEdit(i)} className="action-btn" title="Editar">
                            <Pencil size={13} />
                          </button>
                        )}
                        {onStatus && i.status === 'reportado' && (
                          <button onClick={() => onStatus(i, 'validado')} className="action-btn" title="Marcar validado">
                            <ShieldCheck size={13} />
                          </button>
                        )}
                        {onStatus && i.status === 'validado' && (
                          <button onClick={() => onStatus(i, 'en_atencion')} className="action-btn" title="Iniciar atención">
                            <Wrench size={13} />
                          </button>
                        )}
                        {onStatus && i.status === 'en_atencion' && (
                          <button onClick={() => onStatus(i, 'resuelto')} className="action-btn !text-green-status" title="Resolver">
                            <ShieldCheck size={13} />
                          </button>
                        )}
                        {onRecommend && (
                          <button onClick={() => onRecommend(i)} className="action-btn !text-purple-ai" title="Recomendaciones IA">
                            <RefreshCcw size={13} />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(i)} className="action-btn !text-red-crit/70 hover:!text-red-crit" title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="px-4 py-2.5 border-t border-white/8 flex items-center justify-between">
          <span className="text-[11px] text-graytech">
            Página {page + 1} de {pages}
          </span>
          <div className="flex gap-1.5">
            <button className="btn btn-ghost !py-1 !px-2.5 !text-[11px]" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <button className="btn btn-ghost !py-1 !px-2.5 !text-[11px]" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
