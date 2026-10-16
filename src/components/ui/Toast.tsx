import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'
import type { ToastMsg } from '../../types'

const ToastContext = createContext<{ push: (t: Omit<ToastMsg, 'id'>) => void } | null>(null)

const ICONS = {
  success: <CheckCircle2 size={18} className="text-green-status" />,
  error: <XCircle size={18} className="text-red-crit" />,
  warning: <AlertTriangle size={18} className="text-yellow-warn" />,
  info: <Info size={18} className="text-info-sky" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  const push = useCallback((t: Omit<ToastMsg, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="fade-up card flex items-start gap-3 px-4 py-3"
            style={{ borderColor: 'rgba(0,194,199,0.35)' }}
          >
            <div className="mt-0.5 shrink-0">{ICONS[t.kind]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{t.title}</p>
              {t.detail && <p className="mt-0.5 text-xs leading-relaxed text-sky-200/70">{t.detail}</p>}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-sky-200/40 transition hover:text-white"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx.push
}
