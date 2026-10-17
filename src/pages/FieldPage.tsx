import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ClipboardList,
  Home,
  MapPin,
  PlusCircle,
  Radio,
  Smartphone,
  Monitor,
  Send,
  Crosshair,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CATEGORY_META, NEED_META, SEVERITY_META, STATUS_META } from '../types'
import type { AccessStatus, IncidentCategory, NeedType, Resource, Severity } from '../types'
import TacticalMap from '../components/map/TacticalMap'
import { useToast } from '../components/ui'

const CATEGORIES = Object.keys(CATEGORY_META) as IncidentCategory[]
const SEVERITIES: Severity[] = ['baja', 'moderada', 'alta', 'critica']
const NEEDS = Object.keys(NEED_META) as NeedType[]
const ACCESSES: AccessStatus[] = ['accesible', 'restringido', 'bloqueado', 'desconocido']

// Brigadas de referencia para que el prototipo permita operar en todo el país.
// Sus bases son aproximadas y solo se usan para la demostración y detección local.
const COUNTRY_BRIGADES: Resource[] = [
  ['BRG-BOA', 'Brigada Boaco-01', 'Boaco', 12.4693, -85.6589],
  ['BRG-CAR', 'Brigada Carazo-01', 'Jinotepe, Carazo', 11.8496, -86.1990],
  ['BRG-CHI', 'Brigada Chinandega-01', 'Chinandega', 12.6294, -87.1311],
  ['BRG-CHO', 'Brigada Chontales-01', 'Juigalpa, Chontales', 12.1063, -85.3645],
  ['BRG-EST', 'Brigada Estelí-01', 'Estelí', 13.0919, -86.3538],
  ['BRG-GRA', 'Brigada Granada-01', 'Granada', 11.9299, -85.9560],
  ['BRG-JIN', 'Brigada Jinotega-01', 'Jinotega', 13.0910, -86.0000],
  ['BRG-LEO', 'Brigada León-01', 'León', 12.4378, -86.8780],
  ['BRG-MAD', 'Brigada Madriz-01', 'Somoto, Madriz', 13.4800, -86.5820],
  ['BRG-MAN', 'Brigada Managua-01', 'Managua', 12.1364, -86.2514],
  ['BRG-MAS', 'Brigada Masaya-01', 'Masaya', 11.9744, -86.0942],
  ['BRG-MAT', 'Brigada Matagalpa-01', 'Matagalpa', 12.9256, -85.9175],
  ['BRG-NS', 'Brigada Nueva Segovia-01', 'Ocotal, Nueva Segovia', 13.6320, -86.4750],
  ['BRG-RAN', 'Brigada RACN-01', 'Puerto Cabezas, RACN', 14.0354, -83.3889],
  ['BRG-RAS', 'Brigada RACS-01', 'Bluefields, RACS', 12.0137, -83.7635],
  ['BRG-RIV', 'Brigada Rivas-01', 'Rivas', 11.4372, -85.8263],
].map(([id, name, location, baseLat, baseLng]) => ({
  id: id as string,
  name: name as string,
  kind: 'brigada',
  quantity: 1,
  available: 1,
  location: location as string,
  availability: 'disponible',
  assignedTo: null,
  baseLat: baseLat as number,
  baseLng: baseLng as number,
}))

type Tab = 'inicio' | 'registrar' | 'mapa' | 'reportes'

function FieldScreen({ full }: { full?: boolean }) {
  const { state, addIncident } = useApp()
  const { push } = useToast()
  const brigades = useMemo(() => {
    const registered = state.resources.filter((resource) => resource.kind === 'brigada')
    const registeredIds = new Set(registered.map((resource) => resource.id))
    return [...registered, ...COUNTRY_BRIGADES.filter((brigade) => !registeredIds.has(brigade.id))]
  }, [state.resources])
  const [brigadeId, setBrigadeId] = useState(() => {
    try {
      const saved = window.localStorage.getItem('geotriage-active-brigade')
      return saved && (state.resources.some((resource) => resource.id === saved && resource.kind === 'brigada') || COUNTRY_BRIGADES.some((brigade) => brigade.id === saved))
        ? saved
        : 'RES-004'
    } catch {
      return 'RES-004'
    }
  })
  const [locationMessage, setLocationMessage] = useState('')
  const [detectingLocation, setDetectingLocation] = useState(false)
  const activeBrigade = brigades.find((brigade) => brigade.id === brigadeId) ?? brigades[0]
  const [tab, setTab] = useState<Tab>('inicio')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Formulario
  const [category, setCategory] = useState<IncidentCategory>('inundacion')
  const [municipality, setMunicipality] = useState('')
  const [severity, setSeverity] = useState<Severity>('moderada')
  const [trapped, setTrapped] = useState(0)
  const [injured, setInjured] = useState(0)
  const [needs, setNeeds] = useState<NeedType[]>([])
  const [access, setAccess] = useState<AccessStatus>('accesible')
  const [description, setDescription] = useState('')
  const [useSample, setUseSample] = useState(true)
  const [submitted, setSubmitted] = useState<string | null>(null)

  const myReports = useMemo(
    () => state.incidents.filter((i) => i.origin === 'brigada' && i.reporter === activeBrigade?.name).sort((a, b) => b.datetime.localeCompare(a.datetime)),
    [state.incidents, activeBrigade],
  )

  const selectBrigade = (id: string) => {
    setBrigadeId(id)
    setLocationMessage('')
    try { window.localStorage.setItem('geotriage-active-brigade', id) } catch { /* storage may be unavailable */ }
  }

  const detectBrigade = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Este dispositivo o navegador no ofrece geolocalización. Seleccione su brigada manualmente.')
      return
    }
    setDetectingLocation(true)
    setLocationMessage('Buscando su ubicación…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const distanceKm = (lat: number, lng: number) => {
          const radians = (degrees: number) => degrees * Math.PI / 180
          const dLat = radians(lat - coords.latitude)
          const dLng = radians(lng - coords.longitude)
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(coords.latitude)) * Math.cos(radians(lat)) * Math.sin(dLng / 2) ** 2
          return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }
        const nearest = brigades.reduce<{ id: string; name: string; distance: number } | null>((best, brigade) => {
          const distance = distanceKm(brigade.baseLat, brigade.baseLng)
          return !best || distance < best.distance ? { id: brigade.id, name: brigade.name, distance } : best
        }, null)
        setDetectingLocation(false)
        if (!nearest || nearest.distance > 100) {
          setLocationMessage('No encontramos una brigada cercana a su ubicación. Seleccione una de la lista.')
          return
        }
        selectBrigade(nearest.id)
        setLocationMessage(`Brigada más cercana: ${nearest.name} (${Math.round(nearest.distance)} km de su base).`)
      },
      (error) => {
        setDetectingLocation(false)
        setLocationMessage(error.code === error.PERMISSION_DENIED
          ? 'Permiso de ubicación denegado. Puede elegir su brigada manualmente.'
          : 'No se pudo obtener la ubicación. Verifique el GPS o seleccione su brigada manualmente.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  const criticalActive = state.incidents.filter((i) => i.severity === 'critica' && i.status !== 'resuelto')

  const submit = () => {
    if (!municipality.trim()) {
      push({ kind: 'error', title: 'Falta ubicación', detail: 'Indique el municipio o comunidad.' })
      return
    }
    if (description.trim().length < 8) {
      push({ kind: 'error', title: 'Descripción corta', detail: 'Describa brevemente la situación (mín. 8 caracteres).' })
      return
    }
    const loc = { lat: 11.8565 + (Math.random() - 0.5) * 1.2, lng: -86.2366 + (Math.random() - 0.5) * 1.2 }
    const created = addIncident({
      category,
      municipality: municipality.trim(),
      department: 'Reporte de campo',
      lat: useSample ? loc.lat : 12.1364,
      lng: useSample ? loc.lng : -86.2514,
      severity,
      trapped,
      injured,
      needs,
      access,
      description: description.trim(),
      origin: 'brigada',
      reporter: activeBrigade?.name ?? 'Brigadista (vista de campo)',
    })
    setSubmitted(created.id)
    push({ kind: 'success', title: `Reporte ${created.id} enviado`, detail: 'Sincronización simulada con el COE completada.' })
    setMunicipality('')
    setDescription('')
    setTrapped(0)
    setInjured(0)
    setNeeds([])
    setTab('reportes')
  }

  const navItems: { key: Tab; label: string; icon: typeof Home }[] = [
    { key: 'inicio', label: 'Inicio', icon: Home },
    { key: 'registrar', label: 'Registrar', icon: PlusCircle },
    { key: 'mapa', label: 'Mapa', icon: MapPin },
    { key: 'reportes', label: 'Reportes', icon: ClipboardList },
  ]

  return (
    <div className={`flex flex-col bg-navy-deep ${full ? 'min-h-screen' : 'h-full'} overflow-hidden`}>
      {/* Barra superior móvil */}
      <div className="h-12 shrink-0 bg-navy border-b border-turq/15 flex items-center px-3 gap-2">
        <Radio size={16} className="text-turq" />
        <div className="min-w-0">
          <p className="text-[11.5px] font-bold text-white leading-none">Centinela Brigada</p>
          <p className="text-[9px] text-turq font-semibold leading-none mt-0.5">MODO CAMPO — DEMOSTRACIÓN</p>
        </div>
        <span className="ml-auto rounded-full bg-yellow-warn/15 border border-yellow-warn/35 px-2 py-0.5 text-[8.5px] font-bold text-yellow-warn">
          OFFLINE-READY (SIM)
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'inicio' && (
          <div className="p-3.5 space-y-3 fade-up">
            <div className="rounded-2xl border border-turq/25 bg-gradient-to-br from-turq/12 to-transparent p-4">
              <p className="text-[10px] font-bold tracking-widest text-turq uppercase">Turno activo</p>
              <h2 className="font-display font-extrabold text-[17px] text-white mt-1 leading-tight">
                {activeBrigade?.name ?? 'Seleccione una brigada'}
              </h2>
              <p className="text-[11.5px] text-sky-100/60 mt-1">
                {new Date().toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-3 space-y-2">
                <label className="block text-[10px] font-semibold text-sky-100/75" htmlFor="active-brigade">Mi brigada</label>
                <select id="active-brigade" className="input !py-2 !text-[11px]" value={brigadeId} onChange={(event) => selectBrigade(event.target.value)}>
                  {brigades.map((brigade) => <option key={brigade.id} value={brigade.id}>{brigade.name} · {brigade.location}</option>)}
                </select>
                <button type="button" onClick={detectBrigade} disabled={detectingLocation} className="w-full rounded-lg border border-turq/35 bg-turq/10 px-3 py-2 text-[11px] font-semibold text-turq disabled:opacity-60">
                  <span className="inline-flex items-center justify-center gap-1.5"><Crosshair size={13} />{detectingLocation ? 'Detectando ubicación…' : 'Detectar brigada por ubicación'}</span>
                </button>
                {locationMessage && <p role="status" className="text-[10px] leading-relaxed text-sky-100/75">{locationMessage}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                <p className="font-display text-2xl font-extrabold text-white tabular-nums">{myReports.length}</p>
                <p className="text-[10.5px] text-graytech mt-0.5">Mis reportes</p>
              </div>
              <div className="rounded-xl border border-red-crit/25 bg-red-crit/8 p-3">
                <p className="font-display text-2xl font-extrabold text-red-crit tabular-nums">{criticalActive.length}</p>
                <p className="text-[10.5px] text-sky-100/60 mt-0.5">Críticos activos</p>
              </div>
            </div>

            <button
              onClick={() => setTab('registrar')}
              className="w-full rounded-2xl bg-orange-alert text-[#2b1400] font-bold text-[13.5px] py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-orange-alert/25"
            >
              <PlusCircle size={18} /> Registrar emergencia
            </button>

            {criticalActive.length > 0 && (
              <div className="rounded-xl border border-red-crit/25 bg-red-crit/6 p-3">
                <p className="text-[10px] font-bold text-red-crit uppercase tracking-wider mb-2">Alertas prioritarias</p>
                {criticalActive.slice(0, 3).map((i) => (
                  <button
                    key={i.id}
                    onClick={() => { setSelectedId(i.id); setTab('mapa') }}
                    className="w-full text-left py-1.5 border-b border-white/5 last:border-0"
                  >
                    <p className="text-[11.5px] font-semibold text-white leading-snug">
                      {CATEGORY_META[i.category].label} — {i.municipality}
                    </p>
                    <p className="text-[10px] text-graytech">{i.id} · atrapados: {i.trapped}</p>
                  </button>
                ))}
              </div>
            )}

            <p className="text-[9.5px] text-yellow-warn/60 text-center pt-1 leading-relaxed">
              Datos sintéticos de demostración. No representa emergencias reales.
            </p>
          </div>
        )}

        {tab === 'registrar' && (
          <div className="p-3.5 space-y-3.5 fade-up">
            <h2 className="font-display font-bold text-[15px] text-white">Registrar emergencia</h2>

            <div>
              <p className="label !mb-1.5">Tipo</p>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${
                      category === c ? 'border-turq bg-turq/15 text-turq' : 'border-white/10 text-sky-100/55'
                    }`}
                  >
                    {CATEGORY_META[c].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label !mb-1.5">Gravedad</p>
              <div className="grid grid-cols-4 gap-1.5">
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className="rounded-lg border px-1 py-2 text-[10.5px] font-bold transition capitalize"
                    style={{
                      borderColor: severity === s ? SEVERITY_META[s].hex : 'rgba(255,255,255,0.1)',
                      background: severity === s ? `${SEVERITY_META[s].hex}22` : 'transparent',
                      color: severity === s ? SEVERITY_META[s].hex : '#8fb3c9',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label !mb-1.5">Municipio o comunidad *</p>
              <input className="input" value={municipality} onChange={(e) => setMunicipality(e.target.value)} placeholder="Ej. Barrio San Miguel" />
            </div>

            <label className="flex items-center gap-2.5 rounded-xl border border-turq/25 bg-turq/8 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={useSample} onChange={(e) => setUseSample(e.target.checked)} className="accent-[#00C2C7] w-4 h-4" />
              <div>
                <p className="text-[12px] font-semibold text-white">Usar ubicación de ejemplo</p>
                <p className="text-[10px] text-graytech">Genera coordenadas plausibles sin depender del GPS real.</p>
              </div>
              <Crosshair size={15} className="text-turq ml-auto shrink-0" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label !mb-1.5">Atrapados</p>
                <input className="input" type="number" min={0} value={trapped} onChange={(e) => setTrapped(Math.max(0, parseInt(e.target.value || '0', 10)))} />
              </div>
              <div>
                <p className="label !mb-1.5">Heridos</p>
                <input className="input" type="number" min={0} value={injured} onChange={(e) => setInjured(Math.max(0, parseInt(e.target.value || '0', 10)))} />
              </div>
            </div>

            <div>
              <p className="label !mb-1.5">Necesidades</p>
              <div className="flex flex-wrap gap-1.5">
                {NEEDS.map((n) => {
                  const on = needs.includes(n)
                  return (
                    <button
                      key={n}
                      onClick={() => setNeeds(on ? needs.filter((x) => x !== n) : [...needs, n])}
                      className="rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition"
                      style={{
                        borderColor: on ? NEED_META[n].hex : 'rgba(255,255,255,0.12)',
                        background: on ? `${NEED_META[n].hex}22` : 'transparent',
                        color: on ? NEED_META[n].hex : '#8fb3c9',
                      }}
                    >
                      {NEED_META[n].label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="label !mb-1.5">Acceso</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ACCESSES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAccess(a)}
                    className={`rounded-lg border px-2 py-1.5 text-[10.5px] font-semibold capitalize transition ${
                      access === a ? 'border-info-sky bg-info-sky/15 text-info-sky' : 'border-white/10 text-sky-100/55'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label !mb-1.5">Descripción *</p>
              <textarea className="input min-h-[70px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué está pasando…" />
            </div>

            <button
              onClick={submit}
              className="w-full rounded-xl bg-turq text-[#04222f] font-bold text-[13px] py-3 flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-turq/25"
            >
              <Send size={16} /> Enviar reporte al COE
            </button>

            {submitted && (
              <div className="rounded-xl border border-green-status/35 bg-green-status/10 px-3 py-2.5 text-[11.5px] text-green-status">
                Último reporte enviado: <strong>{submitted}</strong> — sincronización simulada completada.
              </div>
            )}
          </div>
        )}

        {tab === 'mapa' && (
          <div className="p-3 fade-up">
            <TacticalMap
              incidents={state.incidents}
              allIncidents={state.incidents}
              resources={state.resources}
              selectedId={selectedId}
              onSelect={setSelectedId}
              heatMode={false}
              height={full ? '60vh' : '340px'}
              compact
            />
            <p className="text-[9.5px] text-graytech mt-2 text-center leading-relaxed">
              Vista de campo simplificada. Toque un marcador para identificar el incidente.
            </p>
          </div>
        )}

        {tab === 'reportes' && (
          <div className="p-3.5 space-y-2 fade-up">
            <h2 className="font-display font-bold text-[15px] text-white mb-1">Mis reportes</h2>
            {myReports.length === 0 ? (
              <p className="text-[12px] text-graytech text-center py-10">Aún no ha enviado reportes desde esta vista.</p>
            ) : (
              myReports.map((i) => (
                <div key={i.id} className="rounded-xl border border-white/8 bg-white/3 p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEVERITY_META[i.severity].hex }} />
                    <span className="font-mono text-[10.5px] text-turq font-bold">{i.id}</span>
                    <span
                      className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold border"
                      style={{
                        borderColor: `${STATUS_META[i.status].tw.includes('green') ? '#43A047' : STATUS_META[i.status].tw.includes('orange') ? '#FF7A00' : STATUS_META[i.status].tw.includes('turq') ? '#00C2C7' : '#4FC3F7'}55`,
                        color: STATUS_META[i.status].tw.includes('green') ? '#43A047' : STATUS_META[i.status].tw.includes('orange') ? '#FF7A00' : STATUS_META[i.status].tw.includes('turq') ? '#00C2C7' : '#4FC3F7',
                        background: 'transparent',
                      }}
                    >
                      {STATUS_META[i.status].label}
                    </span>
                  </div>
                  <p className="text-[12px] font-semibold text-white mt-1.5 leading-snug">
                    {CATEGORY_META[i.category].label} — {i.municipality}
                  </p>
                  <p className="text-[10.5px] text-graytech mt-1 leading-snug line-clamp-2">{i.description}</p>
                  <p className="text-[9.5px] text-graytech mt-1.5">
                    {new Date(i.datetime).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Navegación inferior */}
      <div className="h-16 shrink-0 bg-navy border-t border-turq/15 grid grid-cols-4">
        {navItems.map((n) => {
          const Icon = n.icon
          const active = tab === n.key
          return (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`flex flex-col items-center justify-center gap-1 transition ${
                active ? 'text-turq' : 'text-sky-100/45'
              }`}
            >
              <Icon size={19} />
              <span className="text-[9.5px] font-semibold">{n.label}</span>
              {active && <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-turq" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function FieldPage() {
  const [fullMobile, setFullMobile] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
            <Smartphone size={20} className="text-turq" /> Vista Brigadista
          </h1>
          <p className="text-[12px] text-graytech mt-0.5">
            Micro-app de campo simulada — misma base de datos de demostración que la estación central.
          </p>
        </div>
        <button className="btn btn-ghost ml-auto" onClick={() => setFullMobile((v) => !v)}>
          <Monitor size={14} /> {fullMobile ? 'Vista con marco de escritorio' : 'Vista móvil a pantalla completa'}
        </button>
      </div>

      {fullMobile ? (
        <div className="mx-auto max-w-md">
          <FieldScreen full />
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="relative">
            {/* Marco de dispositivo */}
            <div className="rounded-[38px] border-[10px] border-[#0a1622] bg-[#0a1622] shadow-2xl shadow-black/50">
              <div className="w-[320px] h-[640px] rounded-[28px] overflow-hidden relative bg-navy-deep">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#0a1622] rounded-b-xl z-10" />
                <FieldScreen />
              </div>
            </div>
            <button
              onClick={() => setFullMobile(true)}
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 btn btn-ghost !text-[11px] whitespace-nowrap"
            >
              <ArrowLeft size={12} /> Expandir a pantalla completa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
