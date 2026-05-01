"use client";

import { useState, useEffect, useRef } from "react";
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
  const [isVisible, setIsVisible] = useState(false);
  const [elemRect, setElemRect] = useState<DOMRect | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(`hint-dismissed-${id}`);
    if (!dismissed) {
      setIsVisible(true);
      if (elementRef.current) {
        setElemRect(elementRef.current.getBoundingClientRect());
      }
    }
  }, [id]);

  const handleDismiss = () => {
    localStorage.setItem(`hint-dismissed-${id}`, "true");
    setIsVisible(false);
  };

  if (!isVisible || !elemRect) {
    return (
      <div ref={elementRef}>
        {children}
      </div>
    );
  }

  const getFixedPosition = () => {
    const gap = 8;

    switch (position) {
      case "right":
        return {
          top: `${elemRect.top + elemRect.height / 2}px`,
          left: `${elemRect.right + gap}px`,
          transform: "translateY(-50%)",
        };
      case "left":
        return {
          top: `${elemRect.top + elemRect.height / 2}px`,
          right: `calc(100vw - ${elemRect.left - gap}px)`,
          transform: "translateY(-50%)",
        };
      case "bottom":
        return {
          top: `${elemRect.bottom + gap}px`,
          left: `${elemRect.left + elemRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "top":
      default:
        return {
          bottom: `calc(100vh - ${elemRect.top - gap}px)`,
          left: `${elemRect.left + elemRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
    }
  };

  const arrowClasses = {
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-6 border-l-3 border-r-3 border-l-transparent border-r-transparent border-t-sb-green",
    bottom:
      "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-6 border-l-3 border-r-3 border-l-transparent border-r-transparent border-b-sb-green",
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-6 border-t-3 border-b-3 border-t-transparent border-b-transparent border-l-sb-green",
    right:
      "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-6 border-t-3 border-b-3 border-t-transparent border-b-transparent border-r-sb-green",
  };

  return (
    <>
      <div ref={elementRef}>
        {children}
      </div>

      <div
        className="fixed z-50 w-48 rounded-lg bg-gradient-to-br from-sb-green to-emerald-600 p-2 text-white shadow-lg pointer-events-auto"
        style={getFixedPosition() as React.CSSProperties}
      >
        {/* Arrow */}
        <div className={`absolute ${arrowClasses[position]} h-0 w-0`} />

        {/* Content */}
        <div className="relative pr-4">
          {badge && (
            <span className="mb-1 inline-flex rounded-full bg-white/25 px-1.5 py-0.5 text-xs font-semibold">
              {badge}
            </span>
          )}
          <p className="text-xs font-medium leading-snug">{message}</p>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Pulse dot */}
        <div className="absolute -top-1.5 -right-1.5 h-2 w-2 rounded-full bg-white animate-pulse" />
      </div>
    </>
  );
}
