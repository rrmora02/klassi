"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export interface OnboardingHintProps {
  id: string;
  message: string;
  position?: "top" | "bottom" | "left" | "right";
  badge?: string;
  children: React.ReactNode;
}

export function OnboardingHint({
  id,
  message,
  position = "right",
  badge,
  children,
}: OnboardingHintProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`hint-dismissed-${id}`);
    if (dismissed) {
      setIsDismissed(true);
      setIsVisible(false);
    }
  }, [id]);

  const handleDismiss = () => {
    localStorage.setItem(`hint-dismissed-${id}`, "true");
    setIsVisible(false);
  };

  if (isDismissed || !isVisible) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: "-top-16 left-1/2 -translate-x-1/2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "top-1/2 -translate-y-1/2 -left-80",
    right: "top-1/2 -translate-y-1/2 left-full ml-3",
  };

  const arrowClasses = {
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-8 border-l-4 border-r-4 border-l-transparent border-r-transparent border-t-purple-600",
    bottom:
      "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-8 border-l-4 border-r-4 border-l-transparent border-r-transparent border-b-purple-600",
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-8 border-t-4 border-b-4 border-t-transparent border-b-transparent border-l-purple-600",
    right:
      "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-8 border-t-4 border-b-4 border-t-transparent border-b-transparent border-r-purple-600",
  };

  return (
    <div className="relative">
      {children}

      {isVisible && (
        <div
          className={`absolute ${positionClasses[position]} z-50 w-72 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 p-3 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300`}
        >
          {/* Arrow */}
          <div className={`absolute ${arrowClasses[position]} h-0 w-0`} />

          {/* Content */}
          <div className="relative">
            {badge && (
              <span className="mb-2 inline-block rounded-full bg-white/30 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                {badge}
              </span>
            )}
            <p className="text-sm font-medium leading-relaxed">{message}</p>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Pulse dot */}
          <div className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-white animate-pulse" />
        </div>
      )}
    </div>
  );
}
