import type {
  CriticidadFactor,
  CriticidadResult,
  Incident,
  Recommendation,
  RecommendationPriority,
  Resource,
} from '../types'

// ---------------------------------------------------------------------------
// MOTOR DE IA SIMULADA (reglas programadas en TypeScript)
// No utiliza modelos de lenguaje ni servicios externos. Los resultados son
// deterministas y están pensados únicamente para demostración.
// ---------------------------------------------------------------------------

const SEVERITY_BASE: Record<Incident['severity'], number> = {
  baja: 5,
  moderada: 22,
  alta: 42,
  critica: 58,
}

const NEED_POINTS: Record<string, number> = {
  rescate: 8,
  medica: 7,
  refugio: 3,
  agua: 2,
  alimentos: 1,
  comunicacion: 1,
  generador: 2,
  logistica: 1,
}

const ACCESS_POINTS: Record<Incident['access'], number> = {
  accesible: 0,
  desconocido: 2,
  restringido: 6,
  bloqueado: 12,
}

export function distanceDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = aLat - bLat
  const dLng = (aLng - bLng) * 0.9
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

export function calculateCriticidad(incident: Incident, all: Incident[]): CriticidadResult {
  const factors: CriticidadFactor[] = []

  const base = SEVERITY_BASE[incident.severity]
  factors.push({ label: `Gravedad declarada (${incident.severity})`, points: base })

  const trappedPts = Math.min(incident.trapped * 4, 24)
  if (trappedPts > 0) factors.push({ label: `${incident.trapped} persona(s) atrapada(s)`, points: trappedPts })

  const injuredPts = Math.min(incident.injured * 2, 16)
  if (injuredPts > 0) factors.push({ label: `${incident.injured} persona(s) herida(s)`, points: injuredPts })

  const accessPts = ACCESS_POINTS[incident.access]
  if (accessPts > 0)
    factors.push({
      label: `Acceso ${incident.access === 'bloqueado' ? 'bloqueado' : incident.access === 'restringido' ? 'restringido' : 'desconocido'}`,
      points: accessPts,
    })

  let needsPts = 0
  for (const n of incident.needs) needsPts += NEED_POINTS[n] ?? 1
  needsPts = Math.min(needsPts, 14)
  if (needsPts > 0)
    factors.push({ label: `${incident.needs.length} necesidad(es) priorizada(s)`, points: needsPts })

  const nearby = all.filter(
    (o) => o.id !== incident.id && o.status !== 'resuelto' && distanceDeg(incident.lat, incident.lng, o.lat, o.lng) < 0.18,
  )
  const nearbyPts = Math.min(nearby.length * 3, 9)
  if (nearbyPts > 0)
    factors.push({ label: `${nearby.length} incidente(s) cercano(s) activo(s)`, points: nearbyPts })

  let score = base + trappedPts + injuredPts + accessPts + needsPts + nearbyPts
  score = Math.max(0, Math.min(100, score))

  const level: CriticidadResult['level'] =
    score >= 75 ? 'critica' : score >= 50 ? 'alta' : score >= 25 ? 'moderada' : 'baja'

  const explanation =
    level === 'critica'
      ? 'Concentración alta de factores de riesgo: prioridad máxima de atención.'
      : level === 'alta'
        ? 'Múltiples factores elevados que justifican atención preferente.'
        : level === 'moderada'
          ? 'Situación controlable pero con factores que requieren seguimiento.'
          : 'Impacto limitado según los datos reportados. Monitoreo de rutina.'

  return { score, level, factors, nearbyCount: nearby.length, explanation }
}

export function criticidadLevelOf(score: number): CriticidadResult['level'] {
  return score >= 75 ? 'critica' : score >= 50 ? 'alta' : score >= 25 ? 'moderada' : 'baja'
}

export function generateRecommendation(
  incident: Incident,
  all: Incident[],
  resources: Resource[],
  criticidad: CriticidadResult,
): Recommendation {
  const priorities: RecommendationPriority[] = ['baja', 'media', 'alta', 'critica']
  const priority =
    criticidad.score >= 75 ? 'critica' : criticidad.score >= 50 ? 'alta' : criticidad.score >= 25 ? 'media' : 'baja'

  const resourcesSuggested = new Set<string>()
  const constraints: string[] = []

  if (incident.trapped > 0) resourcesSuggested.add('Brigada de rescate')
  if (incident.injured > 0) {
    resourcesSuggested.add('Ambulancia')
    resourcesSuggested.add('Kits médicos')
  }
  if (incident.needs.includes('agua')) resourcesSuggested.add('Camión cisterna')
  if (incident.needs.includes('alimentos')) resourcesSuggested.add('Raciones de alimento')
  if (incident.needs.includes('refugio')) resourcesSuggested.add('Albergue temporal')
  if (incident.needs.includes('comunicacion')) resourcesSuggested.add('Radio base táctica')
  if (incident.needs.includes('generador')) resourcesSuggested.add('Grupo electrógeno')
  if (incident.needs.includes('logistica')) resourcesSuggested.add('Vehículo 4x4')
  if (resourcesSuggested.size === 0) resourcesSuggested.add('Equipo de evaluación inicial')

  // Disponibilidad simulada consultando el inventario
  const relevant = resources.filter((r) => {
    const name = r.name.toLowerCase()
    return [...resourcesSuggested].some((s) => {
      const key = s.toLowerCase().split(' ')[0]
      return name.includes(key) || name.includes(s.toLowerCase())
    })
  })
  const totalWanted = relevant.reduce((acc, r) => acc + Math.max(1, Math.floor(r.quantity / 5)), 0)
  const totalAvail = relevant.reduce((acc, r) => acc + r.available, 0)
  const availability: Recommendation['availability'] =
    relevant.length === 0
      ? 'insuficiente'
      : totalAvail === 0
        ? 'insuficiente'
        : totalAvail < totalWanted
          ? 'parcial'
          : 'disponible'

  if (availability === 'insuficiente')
    constraints.push('Recursos disponibles insuficientes en inventario simulado.')
  if (availability === 'parcial') constraints.push('Disponibilidad parcial: priorizar asignación por criticidad.')
  if (incident.access === 'bloqueado') constraints.push('Acceso bloqueado: se requiere ruta alternativa o apertura vial.')
  if (incident.access === 'restringido') constraints.push('Acceso restringido: vehículos livianos recomendados.')
  if (incident.access === 'desconocido') constraints.push('Estado de acceso desconocido: validar antes de despachar.')
  if (criticidad.nearbyCount >= 2)
    constraints.push(`Agrupar respuesta con ${criticidad.nearbyCount} incidentes cercanos para optimizar recursos.`)
  if (incident.status === 'reportado')
    constraints.push('Incidente aún no validado: se recomienda verificación humana antes de comprometer recursos.')

  const title = buildTitle(incident)
  const justification = buildJustification(incident, criticidad)
  const action = buildAction(incident, priority)

  return {
    id: `REC-${incident.id}`,
    incidentId: incident.id,
    priority,
    title,
    justification,
    resources: [...resourcesSuggested],
    availability,
    constraints,
    action,
    createdAt: new Date().toISOString(),
  }
}

function buildTitle(incident: Incident): string {
  if (incident.trapped > 0) return 'Priorizar evaluación y operación de rescate'
  if (incident.injured > 2) return 'Desplegar apoyo sanitario y triage en sitio'
  if (incident.access === 'bloqueado') return 'Gestionar ruta alternativa y apertura de acceso'
  if (incident.needs.includes('agua')) return 'Coordinar distribución de agua potable'
  if (incident.needs.includes('refugio')) return 'Activar albergue temporal preventivo'
  if (incident.needs.includes('comunicacion')) return 'Restablecer enlaces de comunicación'
  return 'Enviar cuadrilla de evaluación inicial'
}

function buildJustification(incident: Incident, criticidad: CriticidadResult): string {
  const parts = [`Criticidad simulada ${criticidad.score}/100 (${criticidad.level}).`]
  if (incident.trapped > 0) parts.push(`${incident.trapped} persona(s) atrapada(s) reportada(s).`)
  if (incident.injured > 0) parts.push(`${incident.injured} herido(s) requieren atención.`)
  if (incident.access !== 'accesible') parts.push(`Estado de acceso: ${incident.access}.`)
  if (criticidad.nearbyCount > 0) parts.push(`${criticidad.nearbyCount} incidente(s) cercano(s) en monitoreo.`)
  return parts.join(' ')
}

function buildAction(incident: Incident, priority: RecommendationPriority): string {
  if (incident.trapped > 0) return 'Desplegar brigada de rescate con equipo de extricación y personal médico de apoyo.'
  if (priority === 'critica') return 'Escalar a coordinación regional y confirmar disponibilidad de apoyo aéreo simulado.'
  if (incident.injured > 0) return 'Enviar ambulancia y personal sanitario para estabilización y traslado.'
  if (incident.access === 'bloqueado') return 'Solicitar apertura vial y coordinar ruta alterna con logística.'
  if (incident.needs.includes('agua')) return 'Programar reparto de agua potable y purificadoras portátiles.'
  return 'Despachar cuadrilla de evaluación y reportar novedades al COE en la siguiente ventana.'
}

export function priorityColor(p: RecommendationPriority): string {
  return p === 'critica' ? '#E53935' : p === 'alta' ? '#FF7A00' : p === 'media' ? '#FBC02D' : '#43A047'
}

export function priorityLabel(p: RecommendationPriority): string {
  return p === 'critica' ? 'Crítica' : p === 'alta' ? 'Alta' : p === 'media' ? 'Media' : 'Baja'
}
