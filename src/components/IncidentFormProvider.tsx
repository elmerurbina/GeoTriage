import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { Incident } from '../types'
import { useApp } from '../context/AppContext'
import { useToast } from './ui'
import IncidentForm, { type IncidentFormValues } from './IncidentForm'

interface Ctx {
  openForm: (incident?: Incident) => void
  closeForm: () => void
}

const IncidentFormCtx = createContext<Ctx | null>(null)

export function IncidentFormProvider({ children }: { children: ReactNode }) {
  const { addIncident, updateIncident, setSelectedIncidentId } = useApp()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Incident | null>(null)

  const openForm = useCallback((incident?: Incident) => {
    setEditing(incident ?? null)
    setOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setOpen(false)
    setEditing(null)
  }, [])

  const handleSave = (v: IncidentFormValues) => {
    if (editing) {
      updateIncident(editing.id, v)
      setSelectedIncidentId(editing.id)
      push({ kind: 'success', title: 'Incidente actualizado', detail: `Los cambios de ${editing.id} se aplicaron en todo el prototipo.` })
    } else {
      const created = addIncident({ ...v, origin: 'coe', reporter: 'Operador COE Central' })
      setSelectedIncidentId(created.id)
      push({
        kind: 'success',
        title: `Incidente ${created.id} registrado`,
        detail: 'Se añadió a la bandeja, el mapa y los gráficos. Recomendación simulada generada.',
      })
    }
    closeForm()
  }

  return (
    <IncidentFormCtx.Provider value={{ openForm, closeForm }}>
      {children}
      <IncidentForm open={open} onClose={closeForm} onSave={handleSave} initial={editing ?? undefined} editingId={editing?.id} />
    </IncidentFormCtx.Provider>
  )
}

export function useIncidentForm() {
  const ctx = useContext(IncidentFormCtx)
  if (!ctx) throw new Error('useIncidentForm fuera de IncidentFormProvider')
  return ctx
}
