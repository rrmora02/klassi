"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Check, AlertCircle, X } from "lucide-react";

interface Toast {
  id: string;
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

interface ToastContextType {
  toast: (message: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: { title: string; description: string; variant?: "default" | "destructive" }) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...message, id };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border p-4 shadow-lg max-w-md ${
              t.variant === "destructive"
                ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950"
                : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
            }`}
          >
            <div className="flex gap-3">
              {t.variant === "destructive" ? (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`font-medium text-sm ${
                    t.variant === "destructive"
                      ? "text-red-800 dark:text-red-200"
                      : "text-green-800 dark:text-green-200"
                  }`}
                >
                  {t.title}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    t.variant === "destructive"
                      ? "text-red-700 dark:text-red-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  {t.description}
                </p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className={`flex-shrink-0 mt-0.5 transition-opacity hover:opacity-75 ${
                  t.variant === "destructive"
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return { toast: context.toast };
}
