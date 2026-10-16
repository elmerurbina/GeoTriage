import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import type { ToastMsg } from '../types'

// ---------------------------------------------------------------------------
// Logo institucional (placeholder preparado para el archivo real)
// ---------------------------------------------------------------------------
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-turq/40 bg-navy-deep shrink-0"
      style={{ width: size, height: size }}
      aria-label="GeoTriage-AI Nica"
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" fill="none">
        <path d="M24 4L40 12V28C40 36.5 33 42.5 24 45C15 42.5 8 36.5 8 28V12L24 4Z" stroke="#00C2C7" strokeWidth="2.5" fill="rgba(0,194,199,0.08)" />
        <circle cx="24" cy="21" r="6" stroke="#00C2C7" strokeWidth="2.5" />
        <path d="M24 15V27M18 21H30" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 34C18.5 30.5 21 29 24 29C27 29 29.5 30.5 32 34" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
const ToastCtx = createContext<{ push: (t: Omit<ToastMsg, 'id'>) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  const push = useCallback((t: Omit<ToastMsg, 'id'>) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200)
  }, [])

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const meta =
            t.kind === 'success'
              ? { icon: CheckCircle2, color: 'text-green-status', border: 'border-green-status/40' }
              : t.kind === 'error'
                ? { icon: XCircle, color: 'text-red-crit', border: 'border-red-crit/40' }
                : t.kind === 'warning'
                  ? { icon: AlertTriangle, color: 'text-yellow-warn', border: 'border-yellow-warn/40' }
                  : { icon: Info, color: 'text-info-sky', border: 'border-info-sky/40' }
          const Icon = meta.icon
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex gap-3 rounded-xl border ${meta.border} bg-navy-deep/95 backdrop-blur px-4 py-3 shadow-xl fade-up`}
            >
              <Icon size={18} className={`${meta.color} shrink-0 mt-0.5`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{t.title}</p>
                {t.detail && <p className="text-xs text-sky-100/70 mt-0.5 leading-relaxed">{t.detail}</p>}
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-graytech hover:text-white shrink-0 self-start"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast fuera de ToastProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative card ${wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'} max-h-[90vh] overflow-y-auto fade-up`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="font-display font-bold text-white text-base">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost !p-1.5" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirmación
// ---------------------------------------------------------------------------
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-sky-100/80 leading-relaxed">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Estado vacío
// ---------------------------------------------------------------------------
export function EmptyState({ icon, title, detail }: { icon: ReactNode; title: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center text-graytech mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-sky-100/80">{title}</p>
      {detail && <p className="text-xs text-graytech mt-1 max-w-xs leading-relaxed">{detail}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etiqueta (badge)
// ---------------------------------------------------------------------------
export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide whitespace-nowrap ${className ?? ''}`}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tarjeta de indicador
// ---------------------------------------------------------------------------
export function StatCard({
  label,
  value,
  icon,
  accent,
  sub,
}: {
  label: string
  value: number | string
  icon: ReactNode
  accent: string
  sub?: string
}) {
  return (
    <div className="card card-hover p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 h-full w-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-graytech truncate">{label}</p>
          <p className="font-display text-2xl font-extrabold mt-1.5 text-white leading-none">{value}</p>
          {sub && <p className="text-[11px] text-sky-100/50 mt-1.5">{sub}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}1f`, color: accent }}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Selector múltiple de chips
// ---------------------------------------------------------------------------
export function ChipToggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; color?: string }[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() =>
              onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])
            }
            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all"
            style={{
              borderColor: active ? (o.color ?? '#00C2C7') : 'rgba(255,255,255,0.12)',
              background: active ? `${o.color ?? '#00C2C7'}22` : 'transparent',
              color: active ? (o.color ?? '#00C2C7') : '#8fb3c9',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Barra de progreso
// ---------------------------------------------------------------------------
export function ProgressBar({ value, color = '#00C2C7', height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="w-full rounded-full bg-white/8 overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hook: reloj en vivo
// ---------------------------------------------------------------------------
export function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

// ---------------------------------------------------------------------------
// Hook: confirmación programática
// ---------------------------------------------------------------------------
export function useConfirm() {
  const [state, setState] = useState<{ open: boolean; title: string; message: string; danger?: boolean }>({
    open: false,
    title: '',
    message: '',
  })
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((title: string, message: string, danger = false) => {
    setState({ open: true, title, message, danger })
    return new Promise<boolean>((res) => {
      resolver.current = res
    })
  }, [])

  const handle = (v: boolean) => {
    setState((s) => ({ ...s, open: false }))
    resolver.current?.(v)
    resolver.current = null
  }

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      danger={state.danger}
      onConfirm={() => handle(true)}
      onCancel={() => handle(false)}
    />
  )

  return { confirm, dialog }
}
