"use client";

import { useEffect, useState } from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = "info", duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColor = type === "success" ? "bg-emerald-50 dark:bg-emerald-950" :
                  type === "error" ? "bg-red-50 dark:bg-red-950" :
                  "bg-blue-50 dark:bg-blue-950";

  const borderColor = type === "success" ? "border-emerald-200 dark:border-emerald-800" :
                      type === "error" ? "border-red-200 dark:border-red-800" :
                      "border-blue-200 dark:border-blue-800";

  const textColor = type === "success" ? "text-emerald-800 dark:text-emerald-200" :
                    type === "error" ? "text-red-800 dark:text-red-200" :
                    "text-blue-800 dark:text-blue-200";

  const iconColor = type === "success" ? "text-emerald-600 dark:text-emerald-400" :
                    type === "error" ? "text-red-600 dark:text-red-400" :
                    "text-blue-600 dark:text-blue-400";

  const Icon = type === "success" ? Check : type === "error" ? AlertCircle : Info;

  return (
    <div className={`fixed top-4 right-4 max-w-sm rounded-lg border ${borderColor} ${bgColor} p-4 shadow-lg animate-in slide-in-from-top-2 fade-in`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
        <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className={`ml-auto flex-shrink-0 ${textColor} hover:opacity-75 transition-opacity`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType; duration?: number }>>([]);

  const show = (message: string, type: ToastType = "info", duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  };

  const remove = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { show, remove, toasts };
}
