"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = "default" | "success" | "destructive"

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: Toast[]
  toast: (options: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((options: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...options, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}

// ── Toaster UI ────────────────────────────────────────────────────────────────

function Toaster() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) return null
  const { toasts, dismiss } = ctx

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "relative flex flex-col gap-1 rounded-lg border px-4 py-3 shadow-lg text-sm animate-in fade-in slide-in-from-right-4",
            t.variant === "destructive"
              ? "border-destructive/30 bg-destructive text-white"
              : t.variant === "success"
              ? "border-green-500/30 bg-green-600 text-white"
              : "border-border bg-background text-foreground"
          )}
        >
          <button
            onClick={() => dismiss(t.id)}
            className="absolute top-2 right-2 opacity-60 hover:opacity-100"
          >
            <X className="size-3" />
          </button>
          <span className="font-medium">{t.title}</span>
          {t.description && (
            <span className="text-xs opacity-80">{t.description}</span>
          )}
        </div>
      ))}
    </div>
  )
}
