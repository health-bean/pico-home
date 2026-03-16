"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border p-4 shadow-lg transition-all",
  {
    variants: {
      variant: {
        success: "border-[var(--color-success-500)]/30 bg-[var(--color-success-50)] text-[var(--color-success-700)] dark:bg-emerald-950 dark:text-emerald-200",
        error: "border-[var(--color-danger-500)]/30 bg-[var(--color-danger-50)] text-[var(--color-danger-700)] dark:bg-red-950 dark:text-red-200",
        warning: "border-[var(--color-warning-500)]/30 bg-[var(--color-warning-50)] text-[var(--color-warning-700)] dark:bg-orange-950 dark:text-orange-200",
        info: "border-[var(--color-info-500)]/30 bg-[var(--color-info-50)] text-[var(--color-info-700)] dark:bg-sky-950 dark:text-sky-200",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={cn(toastVariants({ variant: t.variant }))}>
            <p className="text-sm font-medium">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-auto pointer-events-auto text-current opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
