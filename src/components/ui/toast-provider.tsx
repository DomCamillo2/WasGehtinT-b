"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
};

type ShowToastInput = {
  title: string;
  message?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  showToast: (input: ShowToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function variantClasses(variant: ToastVariant) {
  if (variant === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (variant === "error") {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }
  return "border-zinc-200 bg-white text-zinc-900";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, variant = "info" }: ShowToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((current) => [...current, { id, title, message, variant }]);
      window.setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast],
  );

  const value = useMemo(
    () => ({
      showToast,
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[100] mx-auto flex w-full max-w-md flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.14)] ${variantClasses(toast.variant)}`}
          >
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.message ? <p className="mt-0.5 text-xs opacity-90">{toast.message}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}