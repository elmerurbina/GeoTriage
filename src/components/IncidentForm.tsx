import { useEffect, useState, type FormEvent } from 'react'
import { Crosshair, MapPin } from 'lucide-react'
import type { AccessStatus, Incident, IncidentCategory, NeedType, Severity } from '../types'
import { ACCESS_META, CATEGORY_META, NEED_META } from '../types'
import { SAMPLE_LOCATIONS } from '../data/demoData'
import { ChipToggle, Modal } from './ui'

const CATEGORIES = Object.keys(CATEGORY_META) as IncidentCategory[]
const SEVERITIES: Severity[] = ['baja', 'moderada', 'alta', 'critica']
const NEEDS = Object.keys(NEED_META) as NeedType[]
const ACCESSES = Object.keys(ACCESS_META) as AccessStatus[]

const SEV_STYLE: Record<Severity, string> = {
  baja: '#43A047',
  moderada: '#FBC02D',
  alta: '#FF7A00',
  critica: '#E53935',
}

export interface IncidentFormValues {
  category: IncidentCategory
  municipality: string
  department: string
  lat: number
  lng: number
  severity: Severity
  trapped: number
  injured: number
  needs: NeedType[]
  access: AccessStatus
  description: string
}

const EMPTY: IncidentFormValues = {
  category: 'inundacion',
  municipality: '',
  department: '',
  lat: 12.1364,
  lng: -86.2514,
  severity: 'moderada',
  trapped: 0,
  injured: 0,
  needs: [],
  access: 'accesible',
  description: '',
}

export default function IncidentForm({
  open,
  onClose,
  onSave,
  initial,
  editingId,
}: {
  open: boolean
  onClose: () => void
  onSave: (values: IncidentFormValues) => void
  initial?: Partial<Incident>
  editingId?: string
}) {
  const [v, setV] = useState<IncidentFormValues>(() => ({
    ...EMPTY,
    ...(initial
      ? {
          category: initial.category,
          municipality: initial.municipality,
          department: initial.department,
          lat: initial.lat,
          lng: initial.lng,
          severity: initial.severity,
          trapped: initial.trapped,
          injured: initial.injured,
          needs: initial.needs,
          access: initial.access,
          description: initial.description,
        }
      : {}),
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setV({
      ...EMPTY,
      ...(initial
        ? {
            category: initial.category ?? EMPTY.category,
            municipality: initial.municipality ?? '',
            department: initial.department ?? '',
            lat: initial.lat ?? EMPTY.lat,
            lng: initial.lng ?? EMPTY.lng,
            severity: initial.severity ?? EMPTY.severity,
            trapped: initial.trapped ?? 0,
            injured: initial.injured ?? 0,
            needs: initial.needs ?? [],
            access: initial.access ?? EMPTY.access,
            description: initial.description ?? '',
          }
        : {}),
    })
    setErrors({})
  }, [open, initial])

  const set = <K extends keyof IncidentFormValues>(k: K, value: IncidentFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: value }))

  const useSample = () => {
    const loc = SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)]
    setV((prev) => ({ ...prev, municipality: loc.municipality, department: loc.department, lat: loc.lat, lng: loc.lng }))
  }

  const detectLocation = () => {
    // Simulación de GPS: asigna una ubicación plausible con leve ruido
    useSample()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!v.municipality.trim()) errs.municipality = 'Indique municipio o comunidad.'
    if (!Number.isFinite(v.lat) || v.lat < 10.5 || v.lat > 15.4) errs.lat = 'Latitud fuera del rango de Nicaragua (10.5 – 15.4).'
    if (!Number.isFinite(v.lng) || v.lng < -88 || v.lng > -82.8) errs.lng = 'Longitud fuera del rango de Nicaragua (-88 – -82.8).'
    if (v.trapped < 0) errs.trapped = 'No puede ser negativo.'
    if (v.injured < 0) errs.injured = 'No puede ser negativo.'
    if (v.description.trim().length < 10) errs.description = 'Describa el incidente (mín. 10 caracteres).'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave(v)
  }

  return (
    <Modal open={open} onClose={onClose} title={editingId ? `Editar incidente ${editingId}` : 'Registrar emergencia'} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo de incidente *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('category', c)}
                  className={`rounded-lg border px-2.5 py-2 text-[11.5px] font-semibold text-left transition ${
                    v.category === c
                      ? 'border-turq bg-turq/15 text-turq'
                      : 'border-white/10 text-sky-100/60 hover:border-white/25'
                  }`}
                >
                  {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Gravedad *</label>
              <div className="flex gap-1.5">
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('severity', s)}
                    className="flex-1 rounded-lg border px-2 py-2 text-[11.5px] font-bold transition"
                    style={{
                      borderColor: v.severity === s ? SEV_STYLE[s] : 'rgba(255,255,255,0.1)',
                      background: v.severity === s ? `${SEV_STYLE[s]}22` : 'transparent',
                      color: v.severity === s ? SEV_STYLE[s] : '#8fb3c9',
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Estado de acceso</label>
              <div className="grid grid-cols-2 gap-1.5">
                {ACCESSES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => set('access', a)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                      v.access === a ? 'border-info-sky bg-info-sky/15 text-info-sky' : 'border-white/10 text-sky-100/55 hover:border-white/25'
                    }`}
                  >
                    {ACCESS_META[a].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Municipio o comunidad *</label>
            <input
              className="input"
              value={v.municipality}
              onChange={(e) => set('municipality', e.target.value)}
              placeholder="Ej. Diriamba"
            />
            {errors.municipality && <p className="text-[11px] text-red-crit mt-1">{errors.municipality}</p>}
            <input
              className="input mt-2"
              value={v.department}
              onChange={(e) => set('department', e.target.value)}
              placeholder="Departamento (opcional)"
            />
          </div>
          <div>
            <label className="label">Coordenadas</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  className="input"
                  type="number"
                  step="0.0001"
                  value={v.lat}
                  onChange={(e) => set('lat', parseFloat(e.target.value) || 0)}
                  placeholder="Latitud"
                />
                {errors.lat && <p className="text-[11px] text-red-crit mt-1">{errors.lat}</p>}
              </div>
              <div>
                <input
                  className="input"
                  type="number"
                  step="0.0001"
                  value={v.lng}
                  onChange={(e) => set('lng', parseFloat(e.target.value) || 0)}
                  placeholder="Longitud"
                />
                {errors.lng && <p className="text-[11px] text-red-crit mt-1">{errors.lng}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={useSample} className="btn btn-ghost !py-1.5 !text-[11px] flex-1">
                <MapPin size={13} /> Usar ubicación de ejemplo
              </button>
              <button type="button" onClick={detectLocation} className="btn btn-ghost !py-1.5 !text-[11px] flex-1">
                <Crosshair size={13} /> Detectar (simulado)
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Personas atrapadas</label>
            <input
              className="input"
              type="number"
              min={0}
              value={v.trapped}
              onChange={(e) => set('trapped', Math.max(0, parseInt(e.target.value || '0', 10)))}
            />
            {errors.trapped && <p className="text-[11px] text-red-crit mt-1">{errors.trapped}</p>}
          </div>
          <div>
            <label className="label">Personas heridas</label>
            <input
              className="input"
              type="number"
              min={0}
              value={v.injured}
              onChange={(e) => set('injured', Math.max(0, parseInt(e.target.value || '0', 10)))}
            />
            {errors.injured && <p className="text-[11px] text-red-crit mt-1">{errors.injured}</p>}
          </div>
        </div>

        <div>
          <label className="label">Necesidades identificadas</label>
          <ChipToggle
            options={NEEDS.map((n) => ({ value: n, label: NEED_META[n].label, color: NEED_META[n].hex }))}
            value={v.needs}
            onChange={(vals) => set('needs', vals as NeedType[])}
          />
        </div>

        <div>
          <label className="label">Descripción *</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={v.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describa brevemente la situación reportada…"
          />
          {errors.description && <p className="text-[11px] text-red-crit mt-1">{errors.description}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Guardar cambios' : 'Registrar incidente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
