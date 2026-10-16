import { NavLink } from 'react-router-dom'
import {
  AlertOctagon,
  BarChart3,
  Cpu,
  History,
  LayoutDashboard,
  Map,
  Radio,
  Settings,
  Shield,
  X,
} from 'lucide-react'
import { Logo } from '../ui'

export const NAV_ITEMS = [
  { to: '/', label: 'Panel general', icon: LayoutDashboard, end: true },
  { to: '/mapa', label: 'Mapa táctico', icon: Map },
  { to: '/incidentes', label: 'Incidentes', icon: AlertOctagon },
  { to: '/recursos', label: 'Recursos', icon: Shield },
  { to: '/ia', label: 'Análisis de IA', icon: Cpu },
  { to: '/nodos', label: 'Nodos y comunicaciones', icon: Radio },
  { to: '/historial', label: 'Historial y reportes', icon: History },
  { to: '/brigadista', label: 'Vista Brigadista', icon: BarChart3 },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:static z-50 inset-y-0 left-0 w-64 shrink-0 bg-navy border-r border-turq/12 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/6 shrink-0">
          <Logo size={38} />
          <div className="min-w-0">
            <p className="font-display font-extrabold text-[13.5px] leading-tight text-white truncate">
              GeoTriage-AI Nica
            </p>
            <p className="text-[10px] text-turq font-semibold tracking-wide">CENTRO DE MANDO</p>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden text-graytech hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-turq/15 text-turq border border-turq/25 shadow-[0_0_14px_rgba(0,194,199,0.12)]'
                      : 'text-sky-100/65 hover:bg-white/5 hover:text-sky-100 border border-transparent'
                  }`
                }
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-4 py-3 border-t border-white/6 shrink-0">
          <div className="rounded-lg bg-navy-deep/70 border border-yellow-warn/25 px-3 py-2.5">
            <p className="text-[10px] font-bold text-yellow-warn tracking-wider">MODO DEMOSTRACIÓN</p>
            <p className="text-[10.5px] text-sky-100/55 mt-1 leading-snug">
              Datos sintéticos. No representa emergencias reales.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
