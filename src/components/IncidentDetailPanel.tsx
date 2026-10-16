import { X, MapPin, Users, HeartPulse, Route, Clock, Sparkles, FileText } from 'lucide-react'
import type { CriticidadResult, Incident, Recommendation } from '../types'
import { ACCESS_META, CATEGORY_META, NEED_META, SEVERITY_META, STATUS_META } from '../types'
import { Badge, ProgressBar } from './ui'
import { criticidadLevelOf } from '../lib/ai'

const CRIT_COLOR = (score: number) => {
  const l = criticidadLevelOf(score)
  return l === 'critica' ? '#E53935' : l === 'alta' ? '#FF7A00' : l === 'moderada' ? '#FBC02D' : '#43A047'
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="text-graytech mt-0.5 shrink-0">{icon}</span>
      <span className="text-[11px] text-graytech w-28 shrink-0">{label}</span>
      <span className="text-[12px] text-sky-50 font-medium flex-1">{value}</span>
    </div>
  )
}

export default function IncidentDetailPanel({
  incident,
  criticidad,
  recommendation,
  onClose,
  onEdit,
  onStatus,
  onLocate,
  onAi,
}: {
  incident: Incident
  criticidad: CriticidadResult
  recommendation?: Recommendation
  onClose?: () => void
  onEdit?: () => void
  onStatus?: (s: Incident['status']) => void
  onLocate?: () => void
  onAi?: () => void
}) {
  const cColor = CRIT_COLOR(criticidad.score)

  return (
    <div className="card overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/8 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${SEVERITY_META[incident.severity].hex}1f`, color: SEVERITY_META[incident.severity].hex }}
        >
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] text-turq font-bold">{incident.id}</p>
          <h3 className="font-display font-bold text-white text-[15px] leading-tight truncate">{CATEGORY_META[incident.category].label}</h3>
          <p className="text-[11px] text-graytech truncate">
            {incident.municipality}{incident.community ? ` · ${incident.community}` : ''}
            {incident.department ? `, ${incident.department}` : ''}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="action-btn shrink-0" aria-label="Cerrar">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-b border-white/8 flex flex-wrap gap-1.5">
        <Badge className={SEVERITY_META[incident.severity].tw}>Gravedad: {SEVERITY_META[incident.severity].label}</Badge>
        <Badge className={STATUS_META[incident.status].tw}>{STATUS_META[incident.status].label}</Badge>
        <Badge className={ACCESS_META[incident.access].tw}>Acceso: {ACCESS_META[incident.access].label}</Badge>
      </div>

      <div className="px-4 py-2 flex-1 overflow-y-auto">
        {incident.community && <Row icon={<MapPin size={13} />} label="Barrio / comunidad" value={incident.community} />}
        <Row icon={<MapPin size={13} />} label="Coordenadas" value={<span className="font-mono text-[11px]">{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}</span>} />
        <Row icon={<Users size={13} />} label="Atrapados" value={incident.trapped > 0 ? <span className="text-red-crit font-bold">{incident.trapped} persona(s)</span> : 'Ninguno reportado'} />
        <Row icon={<HeartPulse size={13} />} label="Heridos" value={incident.injured > 0 ? <span className="text-orange-alert font-bold">{incident.injured} persona(s)</span> : 'Ninguno reportado'} />
        <Row icon={<Route size={13} />} label="Reportó" value={incident.reporter} />
        <Row
          icon={<Clock size={13} />}
          label="Fecha y hora"
          value={new Date(incident.datetime).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' })}
        />

        <div className="mt-3">
          <p className="label !mb-1.5">Necesidades</p>
          <div className="flex flex-wrap gap-1.5">
            {incident.needs.length === 0 ? (
              <span className="text-[11px] text-graytech">Sin necesidades específicas registradas.</span>
            ) : (
              incident.needs.map((n) => (
                <span
                  key={n}
                  className="rounded-md border px-2 py-1 text-[10.5px] font-semibold"
                  style={{ borderColor: `${NEED_META[n].hex}55`, background: `${NEED_META[n].hex}14`, color: NEED_META[n].hex }}
                >
                  {NEED_META[n].label}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-3">
          <p className="label !mb-1.5">Descripción</p>
          <p className="text-[12px] leading-relaxed text-sky-100/80 bg-white/3 rounded-lg border border-white/6 p-2.5">
            {incident.description}
          </p>
        </div>

        {incident.resolutionNote && (
          <div className="mt-3 rounded-lg border border-green-status/30 bg-green-status/8 p-2.5">
            <p className="text-[10px] font-bold text-green-status uppercase tracking-wider mb-1">Nota de cierre</p>
            <p className="text-[11.5px] text-sky-100/80">{incident.resolutionNote}</p>
          </div>
        )}

        {/* Criticidad simulada */}
        <div className="mt-4 rounded-xl border border-purple-ai/25 bg-purple-ai/6 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-purple-ai uppercase tracking-wider">
              <Sparkles size={13} /> Criticidad simulada
            </p>
            <span className="font-display font-extrabold text-lg leading-none" style={{ color: cColor }}>
              {criticidad.score}
              <span className="text-[11px] text-graytech font-semibold">/100</span>
            </span>
          </div>
          <ProgressBar value={criticidad.score} color={cColor} />
          <p className="text-[11px] text-sky-100/70 mt-2 leading-relaxed">{criticidad.explanation}</p>
          <div className="mt-2.5 space-y-1">
            {criticidad.factors.map((f, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10.5px]">
                <span className="text-sky-100/60">{f.label}</span>
                <span className="font-bold tabular-nums" style={{ color: cColor }}>
                  +{f.points}
                </span>
              </div>
            ))}
          </div>
        </div>

        {recommendation && (
          <div className="mt-3 rounded-xl border border-turq/25 bg-turq/6 p-3">
            <p className="text-[10px] font-bold text-turq uppercase tracking-wider mb-1.5">Recomendación táctica (simulada)</p>
            <p className="text-[12px] font-semibold text-white leading-snug">{recommendation.title}</p>
            <p className="text-[11px] text-sky-100/65 mt-1.5 leading-relaxed">{recommendation.justification}</p>
            <p className="text-[11.5px] text-turq mt-2 leading-relaxed border-t border-turq/15 pt-2">{recommendation.action}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/8 flex flex-wrap gap-1.5">
        {onLocate && (
          <button className="btn btn-ghost !py-1.5 !text-[11.5px]" onClick={onLocate}>
            <MapPin size={13} /> Localizar en mapa
          </button>
        )}
        {onAi && (
          <button className="btn btn-ghost !py-1.5 !text-[11.5px] !border-purple-ai/35 hover:!text-purple-ai" onClick={onAi}>
            <Sparkles size={13} /> Análisis IA
          </button>
        )}
        {onEdit && (
          <button className="btn btn-ghost !py-1.5 !text-[11.5px]" onClick={onEdit}>
            Editar
          </button>
        )}
        {onStatus && incident.status === 'reportado' && (
          <button className="btn btn-primary !py-1.5 !text-[11.5px]" onClick={() => onStatus('validado')}>
            Validar
          </button>
        )}
        {onStatus && incident.status === 'validado' && (
          <button className="btn btn-alert !py-1.5 !text-[11.5px]" onClick={() => onStatus('en_atencion')}>
            Iniciar atención
          </button>
        )}
        {onStatus && incident.status === 'en_atencion' && (
          <button className="btn btn-primary !py-1.5 !text-[11.5px]" onClick={() => onStatus('resuelto')}>
            Resolver
          </button>
        )}
      </div>
    </div>
  )
}
