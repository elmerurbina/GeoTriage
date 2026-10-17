import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppState,
  DecisionRecord,
  Incident,
  IncidentStatus,
  NeedType,
  NotificationItem,
  Recommendation,
  Resource,
} from '../types'
import { DEMO_INCIDENTS, DEMO_NODES, DEMO_RESOURCES } from '../data/demoData'
import { ACCESS_META, CATEGORY_META, NEED_META, SEVERITY_META, STATUS_META } from '../types'
import { calculateCriticidad, generateRecommendation } from '../lib/ai'

const STORAGE_KEY = 'geotriage-nica-demo-v2'

interface Ctx {
  state: AppState
  selectedIncidentId: string | null
  setSelectedIncidentId: (id: string | null) => void
  addIncident: (inc: Omit<Incident, 'id' | 'datetime' | 'status' | 'origin'> & Partial<Pick<Incident, 'datetime' | 'status' | 'origin'>>) => Incident
  updateIncident: (id: string, patch: Partial<Incident>) => void
  removeIncident: (id: string) => void
  setIncidentStatus: (id: string, status: IncidentStatus, note?: string) => void
  assignResource: (resourceId: string, incidentId: string) => boolean
  unassignResource: (resourceId: string) => void
  addResource: (res: Omit<Resource, 'id'>) => Resource
  updateResource: (id: string, patch: Partial<Resource>) => void
  acceptRecommendation: (rec: Recommendation) => void
  rejectRecommendation: (rec: Recommendation) => void
  resetDemo: () => void
  clearNotifications: () => void
  notify: (n: Omit<NotificationItem, 'id' | 'at' | 'read'>) => void
}

const AppContext = createContext<Ctx | null>(null)

function freshState(): AppState {
  return {
    incidents: structuredClone(DEMO_INCIDENTS),
    resources: structuredClone(DEMO_RESOURCES),
    nodes: structuredClone(DEMO_NODES),
    decisions: [],
    notifications: [
      {
        id: 'ntf-welcome',
        kind: 'ia',
        title: 'Sistema de demostración activo',
        detail: 'Centinela opera en MODO DEMOSTRACIÓN con datos sintéticos.',
        at: new Date().toISOString(),
        read: false,
      },
    ],
  }
}

function ntf(kind: NotificationItem['kind'], title: string, detail: string): NotificationItem {
  return { id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind, title, detail, at: new Date().toISOString(), read: false }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed.incidents || !parsed.resources || !parsed.nodes) return freshState()
    const validNeeds = new Set(Object.keys(NEED_META))
    const validSeverity = new Set(Object.keys(SEVERITY_META))
    const validStatus = new Set(Object.keys(STATUS_META))
    const validAccess = new Set(Object.keys(ACCESS_META))
    const validCategory = new Set(Object.keys(CATEGORY_META))
    return {
      incidents: [...parsed.incidents, ...DEMO_INCIDENTS.filter((demo) => !parsed.incidents?.some((i) => i.id === demo.id))].map((i) => ({
        ...i,
        category: validCategory.has(i.category) ? i.category : 'otro',
        severity: validSeverity.has(i.severity) ? i.severity : 'moderada',
        status: validStatus.has(i.status) ? i.status : 'reportado',
        access: validAccess.has(i.access) ? i.access : 'desconocido',
        municipality: i.municipality || 'Sin ubicación',
        lat: Number.isFinite(Number(i.lat)) ? Number(i.lat) : 12.1364,
        lng: Number.isFinite(Number(i.lng)) ? Number(i.lng) : -86.2514,
        trapped: Number.isFinite(Number(i.trapped)) ? Number(i.trapped) : 0,
        injured: Number.isFinite(Number(i.injured)) ? Number(i.injured) : 0,
        datetime: typeof i.datetime === 'string' && i.datetime ? i.datetime : new Date().toISOString(),
        needs: Array.isArray(i.needs)
          ? (i.needs.filter((n) => validNeeds.has(n)) as NeedType[])
          : [],
      })),
      resources: parsed.resources,
      nodes: parsed.nodes,
      decisions: parsed.decisions ?? [],
      notifications: parsed.notifications ?? [],
    }
  } catch {
    return freshState()
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* almacenamiento no disponible */
    }
  }, [state])

  const notify = useCallback((n: Omit<NotificationItem, 'id' | 'at' | 'read'>) => {
    setState((s) => ({
      ...s,
      notifications: [
        { ...n, id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), read: false },
        ...s.notifications,
      ].slice(0, 40),
    }))
  }, [])

  const addIncident: Ctx['addIncident'] = useCallback((inc) => {
    const now = new Date()
    const year = now.getFullYear()
    const seq = String(Math.floor(1000 + Math.random() * 8999))
    const created: Incident = {
      ...inc,
      id: `INC-${year}-${seq}`,
      datetime: inc.datetime ?? now.toISOString(),
      status: inc.status ?? 'reportado',
      origin: inc.origin ?? 'coe',
    } as Incident
    setState((s) => ({
      ...s,
      incidents: [created, ...s.incidents],
      notifications: [
        ntf('incidente', `Nuevo incidente ${created.id}`, `${created.category} en ${created.municipality} — gravedad ${created.severity}.`),
        ...s.notifications,
      ].slice(0, 40),
    }))
    return created
  }, [])

  const updateIncident: Ctx['updateIncident'] = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }))
  }, [])

  const removeIncident: Ctx['removeIncident'] = useCallback((id) => {
    setState((s) => ({
      ...s,
      incidents: s.incidents.filter((i) => i.id !== id),
      resources: s.resources.map((r) => (r.assignedTo === id ? { ...r, assignedTo: null } : r)),
    }))
  }, [])

  const setIncidentStatus: Ctx['setIncidentStatus'] = useCallback((id, status, note) => {
    setState((s) => ({
      ...s,
      incidents: s.incidents.map((i) =>
        i.id === id ? { ...i, status, resolutionNote: note ?? i.resolutionNote } : i,
      ),
      notifications: [
        ntf('incidente', `${id} → ${status.replace('_', ' ')}`, note ?? 'Estado actualizado desde la estación de mando.'),
        ...s.notifications,
      ].slice(0, 40),
    }))
  }, [])

  const assignResource: Ctx['assignResource'] = useCallback((resourceId, incidentId) => {
    let ok = false
    setState((s) => {
      const res = s.resources.find((r) => r.id === resourceId)
      if (!res || res.available <= 0) return s
      ok = true
      const incident = s.incidents.find((i) => i.id === incidentId)
      const dec: DecisionRecord = {
        id: `dec-${Date.now()}`,
        incidentId,
        recommendationId: `manual-assign`,
        decision: 'aceptada',
        title: `Recurso ${res.name} asignado`,
        detail: `Se asignó "${res.name}" al incidente ${incidentId}${incident ? ` (${incident.municipality})` : ''}.`,
        at: new Date().toISOString(),
      }
      return {
        ...s,
        resources: s.resources.map((r) =>
          r.id === resourceId
            ? {
                ...r,
                available: Math.max(0, r.available - 1),
                assignedTo: incidentId,
                availability: r.available - 1 <= 0 ? 'agotado' : r.available - 1 < r.quantity ? 'parcial' : r.availability,
              }
            : r,
        ),
        decisions: [dec, ...s.decisions],
        notifications: [ntf('recurso', 'Recurso asignado', `${res.name} → ${incidentId}`), ...s.notifications].slice(0, 40),
      }
    })
    return ok
  }, [])

  const unassignResource: Ctx['unassignResource'] = useCallback((resourceId) => {
    setState((s) => ({
      ...s,
      resources: s.resources.map((r) =>
        r.id === resourceId
          ? {
              ...r,
              available: Math.min(r.quantity, r.available + 1),
              assignedTo: null,
              availability: r.available + 1 >= r.quantity ? 'disponible' : 'parcial',
            }
          : r,
      ),
    }))
  }, [])

  const addResource: Ctx['addResource'] = useCallback((res) => {
    const created: Resource = { ...res, id: `RES-${Date.now().toString().slice(-6)}` }
    setState((s) => ({ ...s, resources: [...s.resources, created] }))
    return created
  }, [])

  const updateResource: Ctx['updateResource'] = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      resources: s.resources.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }, [])

  const recordDecision = (rec: Recommendation, decision: 'aceptada' | 'rechazada') => {
    const dec: DecisionRecord = {
      id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      incidentId: rec.incidentId,
      recommendationId: rec.id,
      decision,
      title: `${decision === 'aceptada' ? 'Aceptada' : 'Rechazada'}: ${rec.title}`,
      detail: rec.justification,
      at: new Date().toISOString(),
    }
    return dec
  }

  const acceptRecommendation: Ctx['acceptRecommendation'] = useCallback((rec) => {
    setState((s) => ({
      ...s,
      decisions: [recordDecision(rec, 'aceptada'), ...s.decisions],
      incidents: s.incidents.map((i) =>
        i.id === rec.incidentId && i.status === 'reportado' ? ({ ...i, status: 'validado' } as Incident) : i,
      ),
      notifications: [ntf('ia', 'Recomendación aceptada', `${rec.title} — ${rec.incidentId}`), ...s.notifications].slice(0, 40),
    }))
  }, [])

  const rejectRecommendation: Ctx['rejectRecommendation'] = useCallback((rec) => {
    setState((s) => ({
      ...s,
      decisions: [recordDecision(rec, 'rechazada'), ...s.decisions],
      notifications: [ntf('ia', 'Recomendación rechazada', `${rec.title} — ${rec.incidentId}`), ...s.notifications].slice(0, 40),
    }))
  }, [])

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(freshState())
    setSelectedIncidentId(null)
  }, [])

  const clearNotifications = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      state,
      selectedIncidentId,
      setSelectedIncidentId,
      addIncident,
      updateIncident,
      removeIncident,
      setIncidentStatus,
      assignResource,
      unassignResource,
      addResource,
      updateResource,
      acceptRecommendation,
      rejectRecommendation,
      resetDemo,
      clearNotifications,
      notify,
    }),
    [
      state,
      selectedIncidentId,
      addIncident,
      updateIncident,
      removeIncident,
      setIncidentStatus,
      assignResource,
      unassignResource,
      addResource,
      updateResource,
      acceptRecommendation,
      rejectRecommendation,
      resetDemo,
      clearNotifications,
      notify,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}

/** Hook con incidentes enriquecidos con criticidad y recomendación simulada. */
export function useScoredIncidents() {
  const { state } = useApp()
  return useMemo(
    () =>
      state.incidents.map((inc) => {
        const criticidad = calculateCriticidad(inc, state.incidents)
        const recommendation = generateRecommendation(inc, state.incidents, state.resources, criticidad)
        return { incident: inc, criticidad, recommendation }
      }),
    [state.incidents, state.resources],
  )
}
