import { useState } from 'react'
import { Database, Info, MonitorSmartphone, RotateCcw, ShieldAlert } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ConfirmDialog, Logo, useToast } from '../components/ui'

export default function SettingsPage() {
  const { state, resetDemo } = useApp()
  const { push } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const counts = {
    incidents: state.incidents.length,
    resources: state.resources.length,
    nodes: state.nodes.length,
    decisions: state.decisions.length,
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
          <ShieldAlert size={20} className="text-turq" /> Configuración
        </h1>
        <p className="text-[12px] text-graytech mt-0.5">Preferencias del prototipo y mantenimiento de la demostración.</p>
      </div>

      {/* Estado de datos */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database size={15} className="text-turq" />
          <h2 className="font-display font-bold text-[13.5px] text-white">Estado de los datos de demostración</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Incidentes', value: counts.incidents },
            { label: 'Recursos', value: counts.resources },
            { label: 'Nodos', value: counts.nodes },
            { label: 'Decisiones IA', value: counts.decisions },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-center">
              <p className="font-display text-xl font-extrabold text-turq tabular-nums">{c.value}</p>
              <p className="text-[10.5px] text-graytech mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-sky-100/55 mt-3 leading-relaxed">
          Los datos se conservan en <code className="text-turq">localStorage</code> bajo la clave{' '}
          <code className="text-turq">geotriage-nica-demo-v1</code>. Todo el contenido es sintético y generado con fines
          de demostración.
        </p>
      </div>

      {/* Restablecer */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-crit/15 border border-red-crit/30 flex items-center justify-center text-red-crit shrink-0">
            <RotateCcw size={18} />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-[13.5px] text-white">Restablecer demostración</h2>
            <p className="text-[12px] text-sky-100/65 mt-1 leading-relaxed">
              Borra los cambios locales (incidentes registrados, ediciones, asignaciones y decisiones) y restaura el
              conjunto inicial de datos de ejemplo.
            </p>
            <button className="btn btn-danger mt-3" onClick={() => setConfirmOpen(true)}>
              <RotateCcw size={14} /> Restablecer demostración
            </button>
          </div>
        </div>
      </div>

      {/* Acerca de */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-info-sky" />
          <h2 className="font-display font-bold text-[13.5px] text-white">Acerca del prototipo</h2>
        </div>
        <div className="flex items-start gap-4">
          <Logo size={56} />
          <div className="text-[12px] text-sky-100/70 leading-relaxed space-y-1.5">
            <p>
              <strong className="text-white">Centinela</strong> es un prototipo visual interactivo de plataforma
              de gestión de emergencias para Nicaragua. Incluye estación central de mando, mapa táctico, bandeja de
              incidentes, análisis IA simulado, gestión de recursos, red de nodos y micro-app de campo.
            </p>
            <p>
              No implementa comunicaciones LoRa, Bluetooth, modelos de lenguaje ni infraestructura offline avanzada. El
              «análisis IA» es un motor de reglas determinista escrito en TypeScript.
            </p>
            <p className="text-yellow-warn/80 font-semibold">
              Todos los datos mostrados son sintéticos. No representan emergencias reales ni instituciones activas.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {['React 19', 'Vite', 'TypeScript', 'Tailwind CSS v4', 'MapLibre GL', 'Recharts', 'Lucide'].map((t) => (
                <span key={t} className="rounded-md border border-turq/25 bg-turq/8 px-2 py-0.5 text-[10px] font-semibold text-turq">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modo de visualización */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <MonitorSmartphone size={15} className="text-purple-ai" />
          <h2 className="font-display font-bold text-[13.5px] text-white">Modo de visualización</h2>
        </div>
        <p className="text-[12px] text-sky-100/65 leading-relaxed">
          La <strong className="text-white">Vista Brigadista</strong> (menú lateral) simula la experiencia móvil de un
          brigadista en campo, incluyendo un conmutador para alternar entre vista de escritorio con marco de dispositivo
          y vista móvil a pantalla completa.
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Restablecer demostración"
        message="Se eliminarán todos los cambios locales y se restaurarán los datos iniciales de demostración. Esta acción no se puede deshacer."
        confirmLabel="Sí, restablecer"
        danger
        onConfirm={() => {
          resetDemo()
          setConfirmOpen(false)
          push({ kind: 'success', title: 'Demostración restablecida', detail: 'Se restauró el conjunto inicial de datos sintéticos.' })
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
