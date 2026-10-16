export type Severity = 'baja' | 'moderada' | 'alta' | 'critica'

export type IncidentCategory =
  | 'inundacion'
  | 'deslave'
  | 'sismo'
  | 'incendio'
  | 'colapso'
  | 'accidente'
  | 'medica'
  | 'otro'

export type IncidentStatus = 'reportado' | 'validado' | 'en_atencion' | 'resuelto'

export type AccessStatus = 'accesible' | 'restringido' | 'bloqueado' | 'desconocido'

export type NeedType =
  | 'rescate'
  | 'medica'
  | 'agua'
  | 'alimentos'
  | 'refugio'
  | 'comunicacion'
  | 'generador'
  | 'logistica'

export interface Incident {
  id: string
  category: IncidentCategory
  municipality: string
  community?: string
  department: string
  lat: number
  lng: number
  severity: Severity
  trapped: number
  injured: number
  needs: NeedType[]
  access: AccessStatus
  description: string
  datetime: string
  status: IncidentStatus
  origin: 'coe' | 'brigada' | 'canal'
  reporter: string
  resolutionNote?: string
}

export type CriticidadLevel = 'baja' | 'moderada' | 'alta' | 'critica'

export interface CriticidadFactor {
  label: string
  points: number
}

export interface CriticidadResult {
  score: number
  level: CriticidadLevel
  factors: CriticidadFactor[]
  nearbyCount: number
  explanation: string
}

export type RecommendationPriority = 'baja' | 'media' | 'alta' | 'critica'

export interface Recommendation {
  id: string
  incidentId: string
  priority: RecommendationPriority
  title: string
  justification: string
  resources: string[]
  availability: 'disponible' | 'parcial' | 'insuficiente'
  constraints: string[]
  action: string
  createdAt: string
}

export type RecommendationDecision = 'aceptada' | 'rechazada'

export interface DecisionRecord {
  id: string
  incidentId: string
  recommendationId: string
  decision: RecommendationDecision
  title: string
  detail: string
  at: string
}

export type ResourceKind =
  | 'ambulancia'
  | 'brigada'
  | 'medico'
  | 'vehiculo'
  | 'agua'
  | 'alimentos'
  | 'kits'
  | 'refugio'
  | 'comunicacion'

export type ResourceAvailability = 'disponible' | 'parcial' | 'agotado' | 'mantenimiento'

export interface Resource {
  id: string
  name: string
  kind: ResourceKind
  quantity: number
  available: number
  location: string
  availability: ResourceAvailability
  assignedTo: string | null
  baseLat: number
  baseLng: number
}

export type NodeType = 'captura' | 'comunitario' | 'repetidor' | 'gateway' | 'central'
export type NodeStatus = 'activo' | 'inestable' | 'offline'

export interface CommNode {
  id: string
  name: string
  type: NodeType
  lat: number
  lng: number
  status: NodeStatus
  packets: number
  lastEvent: string
  lastEventAt: string
  linkedTo: string[]
}

export interface ToastMsg {
  id: string
  kind: 'success' | 'error' | 'info' | 'warning'
  title: string
  detail?: string
}

export interface NotificationItem {
  id: string
  kind: 'incidente' | 'ia' | 'recurso' | 'nodo'
  title: string
  detail: string
  at: string
  read: boolean
}

export interface AppState {
  incidents: Incident[]
  resources: Resource[]
  nodes: CommNode[]
  decisions: DecisionRecord[]
  notifications: NotificationItem[]
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  critica: 4,
  alta: 3,
  moderada: 2,
  baja: 1,
}

export const SEVERITY_META: Record<Severity, { label: string; hex: string; tw: string }> = {
  baja: { label: 'Baja', hex: '#43A047', tw: 'bg-green-status/15 text-green-status border-green-status/30' },
  moderada: { label: 'Moderada', hex: '#FBC02D', tw: 'bg-yellow-warn/15 text-yellow-warn border-yellow-warn/30' },
  alta: { label: 'Alta', hex: '#FF7A00', tw: 'bg-orange-alert/15 text-orange-alert border-orange-alert/30' },
  critica: { label: 'Crítica', hex: '#E53935', tw: 'bg-red-crit/15 text-red-crit border-red-crit/30' },
}

export const STATUS_META: Record<IncidentStatus, { label: string; tw: string }> = {
  reportado: { label: 'Reportado', tw: 'bg-info-sky/15 text-info-sky border-info-sky/30' },
  validado: { label: 'Validado', tw: 'bg-turq/15 text-turq border-turq/30' },
  en_atencion: { label: 'En atención', tw: 'bg-orange-alert/15 text-orange-alert border-orange-alert/30' },
  resuelto: { label: 'Resuelto', tw: 'bg-green-status/15 text-green-status border-green-status/30' },
}

export const ACCESS_META: Record<AccessStatus, { label: string; tw: string }> = {
  accesible: { label: 'Accesible', tw: 'bg-green-status/15 text-green-status border-green-status/30' },
  restringido: { label: 'Restringido', tw: 'bg-yellow-warn/15 text-yellow-warn border-yellow-warn/30' },
  bloqueado: { label: 'Bloqueado', tw: 'bg-red-crit/15 text-red-crit border-red-crit/30' },
  desconocido: { label: 'Desconocido', tw: 'bg-graytech/15 text-graytech border-graytech/30' },
}

export const CATEGORY_META: Record<IncidentCategory, { label: string; short: string }> = {
  inundacion: { label: 'Inundación', short: 'IN' },
  deslave: { label: 'Deslave', short: 'DL' },
  sismo: { label: 'Sismo', short: 'SI' },
  incendio: { label: 'Incendio', short: 'IC' },
  colapso: { label: 'Colapso estructural', short: 'CO' },
  accidente: { label: 'Accidente', short: 'AC' },
  medica: { label: 'Emergencia médica', short: 'EM' },
  otro: { label: 'Otro', short: 'OT' },
}

export const NEED_META: Record<NeedType, { label: string; hex: string }> = {
  rescate: { label: 'Rescate', hex: '#FF7A00' },
  medica: { label: 'Atención médica', hex: '#E53935' },
  agua: { label: 'Agua potable', hex: '#4FC3F7' },
  alimentos: { label: 'Alimentos', hex: '#FBC02D' },
  refugio: { label: 'Refugio', hex: '#885CF6' },
  comunicacion: { label: 'Comunicación', hex: '#00C2C7' },
  generador: { label: 'Energía / generador', hex: '#6B7280' },
  logistica: { label: 'Logística / transporte', hex: '#006064' },
}

export const RESOURCE_META: Record<ResourceKind, { label: string; hex: string }> = {
  ambulancia: { label: 'Ambulancia', hex: '#E53935' },
  brigada: { label: 'Brigada de rescate', hex: '#FF7A00' },
  medico: { label: 'Personal médico', hex: '#885CF6' },
  vehiculo: { label: 'Vehículo', hex: '#4FC3F7' },
  agua: { label: 'Agua potable', hex: '#00C2C7' },
  alimentos: { label: 'Alimentos', hex: '#FBC02D' },
  kits: { label: 'Kits médicos', hex: '#E53935' },
  refugio: { label: 'Refugio', hex: '#43A047' },
  comunicacion: { label: 'Equipo de comunicación', hex: '#006064' },
}

export const NODE_TYPE_META: Record<NodeType, { label: string }> = {
  captura: { label: 'Puesto de captura' },
  comunitario: { label: 'Nodo comunitario' },
  repetidor: { label: 'Repetidor' },
  gateway: { label: 'Gateway' },
  central: { label: 'Estación central' },
}

export const NODE_STATUS_META: Record<NodeStatus, { label: string; hex: string }> = {
  activo: { label: 'Activo', hex: '#43A047' },
  inestable: { label: 'Inestable', hex: '#FBC02D' },
  offline: { label: 'Desconectado', hex: '#E53935' },
}
