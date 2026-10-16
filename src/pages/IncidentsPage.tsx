import { useNavigate } from 'react-router-dom'
import { AlertOctagon, Plus, RotateCcw } from 'lucide-react'
import { useApp, useScoredIncidents } from '../context/AppContext'
import { useIncidentForm } from '../components/IncidentFormProvider'
import IncidentTable from '../components/IncidentTable'
import IncidentDetailPanel from '../components/IncidentDetailPanel'
import { useConfirm, useToast } from '../components/ui'
import type { Incident, IncidentStatus } from '../types'

export default function IncidentsPage() {
  const { state, selectedIncidentId, setSelectedIncidentId, setIncidentStatus, removeIncident } = useApp()
  const { openForm } = useIncidentForm()
  const scored = useScoredIncidents()
  const { push } = useToast()
  const { confirm, dialog } = useConfirm()
  const navigate = useNavigate()

  const selected = scored.find((s) => s.incident.id === selectedIncidentId)

  const changeStatus = (inc: Incident, status: IncidentStatus) => {
    setIncidentStatus(inc.id, status)
    push({ kind: 'success', title: `${inc.id} → ${status.replace('_', ' ')}`, detail: 'El estado se reflejó en todos los módulos.' })
  }

  const handleDelete = async (inc: Incident) => {
    const ok = await confirm(
      'Eliminar incidente',
      `¿Eliminar ${inc.id} (${inc.municipality})? Esta acción simula la supresión del registro en la demostración.`,
      true,
    )
    if (!ok) return
    removeIncident(inc.id)
    push({ kind: 'info', title: 'Registro eliminado', detail: `${inc.id} fue removido de la demostración local.` })
    if (selectedIncidentId === inc.id) setSelectedIncidentId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
            <AlertOctagon size={20} className="text-orange-alert" /> Bandeja de incidentes
          </h1>
          <p className="text-[12px] text-graytech mt-0.5">
            {state.incidents.length} registros sintéticos — búsqueda, filtros, ordenamiento y gestión de estado.
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => {
              setSelectedIncidentId(null)
              push({ kind: 'info', title: 'Selección limpiada' })
            }}
          >
            <RotateCcw size={14} /> Limpiar selección
          </button>
          <button className="btn btn-primary" onClick={() => openForm()}>
            <Plus size={14} /> Registrar emergencia
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8">
          <IncidentTable
            incidents={state.incidents}
            allIncidents={state.incidents}
            selectedId={selectedIncidentId}
            onSelect={setSelectedIncidentId}
            onView={(inc) => setSelectedIncidentId(inc.id)}
            onEdit={(inc) => openForm(inc)}
            onStatus={changeStatus}
            onLocate={(inc) => navigate(`/mapa?foco=${inc.id}`)}
            onRecommend={(inc) => navigate(`/ia?foco=${inc.id}`)}
            onDelete={handleDelete}
          />
        </div>
        <div className="xl:col-span-4">
          {selected ? (
            <IncidentDetailPanel
              incident={selected.incident}
              criticidad={selected.criticidad}
              recommendation={selected.recommendation}
              onClose={() => setSelectedIncidentId(null)}
              onEdit={() => openForm(selected.incident)}
              onStatus={(st) => changeStatus(selected.incident, st)}
              onLocate={() => navigate(`/mapa?foco=${selected.incident.id}`)}
              onAi={() => navigate(`/ia?foco=${selected.incident.id}`)}
            />
          ) : (
            <div className="card p-6 text-center">
              <p className="text-[12.5px] text-graytech leading-relaxed">
                Seleccione una fila de la tabla para ver la ficha completa, editar, cambiar su estado o consultar la
                recomendación táctica simulada.
              </p>
            </div>
          )}
        </div>
      </div>

      {dialog}
    </div>
  )
}
