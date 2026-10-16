import { useMemo, useState } from 'react'
import { Boxes, Link2, MapPin, Package, Plus, Shield, Unlink } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, ChipToggle, EmptyState, Modal, useToast } from '../components/ui'
import { RESOURCE_META } from '../types'
import type { Resource, ResourceKind } from '../types'

const KINDS = Object.keys(RESOURCE_META) as ResourceKind[]

const AVAIL_META: Record<Resource['availability'], { label: string; tw: string }> = {
  disponible: { label: 'Disponible', tw: 'bg-green-status/15 text-green-status border-green-status/30' },
  parcial: { label: 'Parcial', tw: 'bg-yellow-warn/15 text-yellow-warn border-yellow-warn/30' },
  agotado: { label: 'Agotado', tw: 'bg-red-crit/15 text-red-crit border-red-crit/30' },
  mantenimiento: { label: 'Mantenimiento', tw: 'bg-graytech/15 text-graytech border-graytech/30' },
}

const EMPTY_FORM = {
  name: '',
  kind: 'ambulancia' as ResourceKind,
  quantity: 1,
  location: '',
  baseLat: 12.1364,
  baseLng: -86.2514,
}

export default function ResourcesPage() {
  const { state, addResource, updateResource, assignResource, unassignResource } = useApp()
  const { push } = useToast()
  const [kindFilter, setKindFilter] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [assignTarget, setAssignTarget] = useState<Resource | null>(null)
  const [assignIncidentId, setAssignIncidentId] = useState('')
  const [view, setView] = useState<'tarjetas' | 'tabla'>('tarjetas')

  const filtered = useMemo(
    () =>
      state.resources.filter((r) => {
        if (kindFilter.length > 0 && !kindFilter.includes(r.kind)) return false
        if (search && !(`${r.name} ${r.location} ${r.id}`.toLowerCase().includes(search.toLowerCase()))) return false
        return true
      }),
    [state.resources, kindFilter, search],
  )

  const totals = useMemo(() => {
    const units = state.resources.reduce((a, r) => a + r.quantity, 0)
    const avail = state.resources.reduce((a, r) => a + r.available, 0)
    const assigned = state.resources.filter((r) => r.assignedTo).length
    return { units, avail, assigned }
  }, [state.resources])

  const incidentOptions = state.incidents.filter((i) => i.status !== 'resuelto')

  const submitForm = () => {
    if (!form.name.trim()) {
      push({ kind: 'error', title: 'Nombre requerido', detail: 'Indique el nombre del recurso.' })
      return
    }
    if (form.quantity < 1) {
      push({ kind: 'error', title: 'Cantidad inválida', detail: 'La cantidad debe ser al menos 1.' })
      return
    }
    addResource({
      name: form.name.trim(),
      kind: form.kind,
      quantity: form.quantity,
      available: form.quantity,
      location: form.location.trim() || 'COE Central, Managua',
      availability: 'disponible',
      assignedTo: null,
      baseLat: form.baseLat,
      baseLng: form.baseLng,
    })
    push({ kind: 'success', title: 'Recurso creado', detail: `${form.name} se añadió al inventario simulado.` })
    setFormOpen(false)
    setForm(EMPTY_FORM)
  }

  const confirmAssign = () => {
    if (!assignTarget || !assignIncidentId) return
    const ok = assignResource(assignTarget.id, assignIncidentId)
    if (ok) {
      push({
        kind: 'success',
        title: 'Recurso asignado',
        detail: `${assignTarget.name} → ${assignIncidentId}. Disponibilidad actualizada en todo el sistema.`,
      })
    } else {
      push({ kind: 'error', title: 'No se pudo asignar', detail: 'El recurso no tiene unidades disponibles.' })
    }
    setAssignTarget(null)
    setAssignIncidentId('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
            <Boxes size={20} className="text-green-status" /> Gestión de recursos
          </h1>
          <p className="text-[12px] text-graytech mt-0.5">
            {totals.units} unidades totales · {totals.avail} disponibles · {totals.assigned} asignados (inventario simulado)
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(['tarjetas', 'tabla'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[11.5px] font-semibold capitalize transition ${
                  view === v ? 'bg-turq/15 text-turq' : 'text-sky-100/55 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
            <Plus size={14} /> Nuevo recurso
          </button>
        </div>
      </div>

      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input !w-64"
            placeholder="Buscar recurso o ubicación…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ChipToggle
            options={KINDS.map((k) => ({ value: k, label: RESOURCE_META[k].label, color: RESOURCE_META[k].hex }))}
            value={kindFilter}
            onChange={setKindFilter}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Package size={22} />} title="Sin recursos que coincidan" detail="Ajuste los filtros o cree un nuevo recurso." />
        </div>
      ) : view === 'tarjetas' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
          {filtered.map((r) => {
            const meta = RESOURCE_META[r.kind]
            const incident = r.assignedTo ? state.incidents.find((i) => i.id === r.assignedTo) : null
            const pct = r.quantity > 0 ? (r.available / r.quantity) * 100 : 0
            return (
              <div key={r.id} className="card card-hover p-4 flex flex-col gap-2.5">
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${meta.hex}1f`, color: meta.hex }}
                  >
                    <Package size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-white leading-snug truncate">{r.name}</p>
                    <p className="text-[10.5px] text-graytech">{meta.label} · {r.id}</p>
                  </div>
                  <Badge className={AVAIL_META[r.availability].tw}>{AVAIL_META[r.availability].label}</Badge>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-graytech">Disponibles</span>
                  <span className="font-bold text-white tabular-nums">
                    {r.available} / {r.quantity}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct === 0 ? '#E53935' : pct < 50 ? '#FBC02D' : '#43A047' }}
                  />
                </div>

                <div className="flex items-center gap-1.5 text-[10.5px] text-graytech">
                  <MapPin size={11} /> {r.location}
                </div>

                {incident && (
                  <div className="rounded-lg border border-orange-alert/25 bg-orange-alert/8 px-2.5 py-1.5 flex items-center gap-2">
                    <Link2 size={12} className="text-orange-alert shrink-0" />
                    <span className="text-[10.5px] text-orange-alert font-semibold truncate">
                      Asignado a {incident.id} — {incident.municipality}
                    </span>
                  </div>
                )}

                <div className="flex gap-1.5 mt-auto pt-1">
                  {r.assignedTo ? (
                    <button
                      className="btn btn-ghost flex-1 !py-1.5 !text-[11px]"
                      onClick={() => {
                        unassignResource(r.id)
                        push({ kind: 'info', title: 'Asignación liberada', detail: `${r.name} vuelve a disponibilidad total.` })
                      }}
                    >
                      <Unlink size={12} /> Liberar
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost flex-1 !py-1.5 !text-[11px]"
                      disabled={r.available <= 0 || r.availability === 'mantenimiento'}
                      onClick={() => {
                        setAssignTarget(r)
                        setAssignIncidentId(incidentOptions[0]?.id ?? '')
                      }}
                    >
                      <Link2 size={12} /> Asignar
                    </button>
                  )}
                  <button
                    className="btn btn-ghost !py-1.5 !text-[11px]"
                    onClick={() => {
                      const newAvail = Math.min(r.quantity, r.available + 1)
                      updateResource(r.id, { available: newAvail, availability: newAvail >= r.quantity ? 'disponible' : 'parcial' })
                      push({ kind: 'success', title: 'Inventario repuesto', detail: `${r.name}: ${newAvail}/${r.quantity} disponibles.` })
                    }}
                    disabled={r.available >= r.quantity}
                  >
                    +1
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-navy-deep/50">
              <tr>
                {['ID', 'Nombre', 'Tipo', 'Cant.', 'Disp.', 'Ubicación', 'Estado', 'Asignado a', 'Acciones'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-graytech">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const incident = r.assignedTo ? state.incidents.find((i) => i.id === r.assignedTo) : null
                return (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/3">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-turq">{r.id}</td>
                    <td className="px-3 py-2.5 font-semibold text-white">{r.name}</td>
                    <td className="px-3 py-2.5 text-sky-100/70">{RESOURCE_META[r.kind].label}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.quantity}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: r.available === 0 ? '#E53935' : '#43A047' }}>
                      {r.available}
                    </td>
                    <td className="px-3 py-2.5 text-graytech">{r.location}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={AVAIL_META[r.availability].tw}>{AVAIL_META[r.availability].label}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-orange-alert font-mono text-[11px]">{r.assignedTo ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {r.assignedTo ? (
                        <button
                          className="action-btn"
                          title="Liberar"
                          onClick={() => {
                            unassignResource(r.id)
                            push({ kind: 'info', title: 'Asignación liberada' })
                          }}
                        >
                          <Unlink size={13} />
                        </button>
                      ) : (
                        <button
                          className="action-btn"
                          title="Asignar"
                          disabled={r.available <= 0}
                          onClick={() => {
                            setAssignTarget(r)
                            setAssignIncidentId(incidentOptions[0]?.id ?? '')
                          }}
                        >
                          <Link2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear recurso */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nuevo recurso">
        <div className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Ambulancia ALS-02" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ResourceKind })}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>{RESOURCE_META[k].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cantidad</label>
              <input className="input" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value || '1', 10)) })} />
            </div>
          </div>
          <div>
            <label className="label">Ubicación base</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ej. COE León" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/8">
            <button className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={submitForm}>Crear recurso</button>
          </div>
        </div>
      </Modal>

      {/* Modal asignar */}
      {assignTarget && (
        <Modal open onClose={() => { setAssignTarget(null); setAssignIncidentId('') }} title="Asignar recurso">
          <div className="space-y-3">
            <div className="rounded-lg border border-turq/25 bg-turq/8 px-3 py-2.5 flex items-center gap-2.5">
              <Shield size={16} className="text-turq shrink-0" />
              <div>
                <p className="text-[12.5px] font-semibold text-white">{assignTarget.name}</p>
                <p className="text-[10.5px] text-graytech">
                  {assignTarget.available} de {assignTarget.quantity} unidades disponibles
                </p>
              </div>
            </div>
            <div>
              <label className="label">Incidente destino</label>
              <select className="input" value={assignIncidentId} onChange={(e) => setAssignIncidentId(e.target.value)}>
                {incidentOptions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.id} — {i.municipality} ({i.severity})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-yellow-warn/85 bg-yellow-warn/8 border border-yellow-warn/25 rounded-lg px-3 py-2">
              Acción simulada: se descontará una unidad disponible (nunca por debajo de cero) y se registrará la decisión
              en el historial.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn btn-ghost" onClick={() => { setAssignTarget(null); setAssignIncidentId('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmAssign} disabled={!assignIncidentId}>
                Confirmar asignación
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
