"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

export interface TourStep {
  id: string;
  element: string;
  title: string;
  message: string;
  position?: "top" | "bottom" | "left" | "right";
}

export interface OnboardingTourProps {
  steps: TourStep[];
}

export function OnboardingTour({ steps }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [elemRect, setElemRect] = useState<DOMRect | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState<string[]>([]);

  const step = steps[currentStep];
  const isCompleted = sessionCompleted.includes(step?.id);

  useEffect(() => {
    const handleRestartTour = () => {
      setCurrentStep(0);
      setIsVisible(true);
      setElemRect(null);
      setSessionCompleted([]);
    };

    window.addEventListener("restart-tour", handleRestartTour);
    return () => window.removeEventListener("restart-tour", handleRestartTour);
  }, []);

  useEffect(() => {
    if (!step || isCompleted) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
      return;
    }

    // Intentar encontrar el elemento - con reintentos
    const findElement = () => {
      const element = document.querySelector(step.element);
      if (element) {
        const rect = element.getBoundingClientRect();
        setElemRect(rect);
      } else {
        // Reintentar en 500ms si no lo encuentra
        setTimeout(findElement, 500);
      }
    };

    // Esperar un poco para que el DOM esté listo
    const timer = setTimeout(findElement, 100);
    return () => clearTimeout(timer);
  }, [step, currentStep, steps, isCompleted]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleNext = () => {
    if (step?.id) {
      setSessionCompleted([...sessionCompleted, step.id]);
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Al completar todos los pasos, simplemente ocultamos
      setIsVisible(false);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible || !step || !elemRect) {
    return null;
  }

  const gap = 12;
  const position = step.position || "right";

  const getPosition = () => {
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
      default:
        return {
          bottom: `calc(100vh - ${elemRect.top - gap}px)`,
          left: `${elemRect.left + elemRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
    }
  };

  const arrowClasses: Record<string, string> = {
    right: "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-6 border-t-3 border-b-3 border-t-transparent border-b-transparent border-r-sb-green",
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-6 border-t-3 border-b-3 border-t-transparent border-b-transparent border-l-sb-green",
    bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-6 border-l-3 border-r-3 border-l-transparent border-r-transparent border-b-sb-green",
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-6 border-l-3 border-r-3 border-l-transparent border-r-transparent border-t-sb-green",
  };

  return (
    <>
      {/* Overlay spotlight */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={handleDismiss} />

      {/* Spotlight highlight */}
      <div
        className="fixed z-40 border-2 border-sb-green rounded-lg pointer-events-none shadow-lg"
        style={{
          top: `${elemRect.top - 4}px`,
          left: `${elemRect.left - 4}px`,
          width: `${elemRect.width + 8}px`,
          height: `${elemRect.height + 8}px`,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.3)",
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-50 w-56 rounded-lg bg-gradient-to-br from-sb-green to-emerald-600 p-3 text-white shadow-xl pointer-events-auto"
        style={getPosition() as React.CSSProperties}
      >
        {/* Arrow */}
        <div className={`absolute ${arrowClasses[position]} h-0 w-0`} />

        {/* Content */}
        <div className="relative">
          <div className="flex items-start justify-between mb-2">
            <span className="inline-flex rounded-full bg-white/30 px-2 py-0.5 text-xs font-bold">
              Paso {currentStep + 1}
            </span>
            <button
              onClick={handleDismiss}
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <h3 className="text-sm font-bold mb-1">{step.title}</h3>
          <p className="text-xs leading-snug mb-3">{step.message}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep
                      ? "w-4 bg-white"
                      : idx < currentStep
                      ? "w-2 bg-white/60"
                      : "w-2 bg-white/30"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-1">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/20 transition-colors"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/20 transition-colors"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
