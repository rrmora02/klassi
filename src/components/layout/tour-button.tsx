"use client";

import { HelpCircle } from "lucide-react";

export function TourButton() {
  const handleRestartTour = () => {
    // Limpiar solo los pasos completados, no el dismissed
    localStorage.removeItem("onboarding-completed");

    // Disparar evento personalizado para reiniciar el tour
    window.dispatchEvent(new CustomEvent("restart-tour"));
  };

  return (
    <button
      onClick={handleRestartTour}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:text-sb-green hover:bg-gray-100 dark:text-sb-light/70 dark:hover:text-sb-light dark:hover:bg-sb-house transition-colors"
      title="Ver tour de configuración"
      aria-label="Tour de configuración"
    >
      <HelpCircle className="h-5 w-5" />
    </button>
  );
}

