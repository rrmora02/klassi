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
    const gap = 12;

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
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-8 border-l-4 border-r-4 border-l-transparent border-r-transparent border-t-purple-600",
    bottom:
      "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-8 border-l-4 border-r-4 border-l-transparent border-r-transparent border-b-purple-600",
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-8 border-t-4 border-b-4 border-t-transparent border-b-transparent border-l-purple-600",
    right:
      "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-8 border-t-4 border-b-4 border-t-transparent border-b-transparent border-r-purple-600",
  };

  return (
    <>
      <div ref={elementRef}>
        {children}
      </div>

      <div
        className="fixed z-50 w-72 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 p-4 text-white shadow-2xl pointer-events-auto"
        style={getFixedPosition() as React.CSSProperties}
      >
        {/* Arrow */}
        <div className={`absolute ${arrowClasses[position]} h-0 w-0`} />

        {/* Content */}
        <div className="relative pr-6">
          {badge && (
            <span className="mb-2 inline-flex rounded-full bg-white/30 px-2 py-1 text-xs font-semibold uppercase tracking-wider">
              ✨ {badge}
            </span>
          )}
          <p className="text-sm font-medium leading-relaxed">{message}</p>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Pulse dot */}
        <div className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-white animate-pulse" />
      </div>
    </>
  );
}
