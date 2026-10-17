import { useState } from 'react'
import { Bell, Menu, Moon, Sun, User } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { useClock } from '../ui'

const DATE_FMT = new Intl.DateTimeFormat('es-NI', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const TIME_FMT = new Intl.DateTimeFormat('es-NI', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const now = useClock()
  const { state, clearNotifications } = useApp()
  const { theme, toggleTheme } = useTheme()
  const [openNotif, setOpenNotif] = useState(false)
  const unread = state.notifications.filter((n) => !n.read).length

  return (
    <header className="h-16 shrink-0 bg-navy/90 backdrop-blur border-b border-turq/12 flex items-center gap-3 px-4 lg:px-6">
      <button onClick={onMenu} className="lg:hidden text-sky-100/70 hover:text-white p-1.5" aria-label="Abrir menú">
        <Menu size={20} />
      </button>

      <div className="min-w-0 hidden sm:block">
        <p className="font-display font-bold text-[13.5px] text-white leading-tight truncate">
          Centinela — Estación Central de Mando
        </p>
        <p className="text-[11px] text-sky-100/50 leading-tight">
          {DATE_FMT.format(now)} · <span className="tabular-nums text-turq font-semibold">{TIME_FMT.format(now)}</span> (hora local)
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sky-100/75 hover:text-turq hover:border-turq/40 transition"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <span className="topbar-demo-badge hidden md:inline-flex items-center gap-1.5 rounded-full border border-yellow-warn/40 bg-yellow-warn/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-yellow-warn">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-warn animate-pulse" />
          MODO DEMOSTRACIÓN
        </span>

        <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-green-status/35 bg-green-status/10 px-2.5 py-1 text-[10px] font-semibold text-green-status">
          DATOS DE EJEMPLO ACTIVOS
        </span>

        <div className="relative">
          <button
            onClick={() => {
              setOpenNotif((v) => !v)
              if (!openNotif && unread > 0) setTimeout(clearNotifications, 1200)
            }}
            className="relative w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sky-100/70 hover:text-white hover:border-turq/40 transition"
            aria-label="Notificaciones"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-crit text-[9px] font-bold text-white flex items-center justify-center px-1">
                {unread}
              </span>
            )}
          </button>
          {openNotif && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] card p-0 overflow-hidden z-50 fade-up">
              <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between">
                <p className="text-xs font-bold text-white">Notificaciones</p>
                <span className="text-[10px] text-graytech">{state.notifications.length} recientes</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {state.notifications.length === 0 ? (
                  <p className="text-xs text-graytech text-center py-8">Sin notificaciones.</p>
                ) : (
                  state.notifications.slice(0, 12).map((n) => (
                    <div key={n.id} className="px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/3">
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            background:
                              n.kind === 'ia' ? '#885CF6' : n.kind === 'recurso' ? '#43A047' : n.kind === 'nodo' ? '#4FC3F7' : '#FF7A00',
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-white leading-snug">{n.title}</p>
                          <p className="text-[11px] text-sky-100/55 leading-snug mt-0.5">{n.detail}</p>
                          <p className="text-[10px] text-graytech mt-1">{new Date(n.at).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-2.5 border-l border-white/10">
          <div className="w-8 h-8 rounded-lg bg-turq/20 border border-turq/40 flex items-center justify-center text-turq">
            <User size={15} />
          </div>
          <div className="hidden md:block leading-tight">
            <p className="text-[12px] font-semibold text-white">Operador A. Rodríguez</p>
            <p className="text-[10px] text-graytech">Coordinador de turno</p>
          </div>
        </div>
      </div>
    </header>
  )
}
