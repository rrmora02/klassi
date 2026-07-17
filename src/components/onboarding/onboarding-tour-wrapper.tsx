"use client";

import { useEffect, useState } from "react";
import { OnboardingTour, type TourStep } from "./onboarding-tour";

const TOUR_STEPS: TourStep[] = [
  {
    id: "step-1-disciplines",
    element: "a[href='/dashboard/configuracion/disciplinas']",
    title: "Paso 1: Disciplinas",
    message: "Comienza creando las disciplinas o cursos que ofrece tu escuela.",
    position: "right",
  },
  {
    id: "step-2-team",
    element: "a[href='/dashboard/configuracion/equipo']",
    title: "Paso 2: Tu Equipo",
    message: "Invita a tus instructores. Si lo prefieres, tú también puedes ser instructor además de administrador.",
    position: "right",
  },
  {
    id: "step-3-school",
    element: "a[href='/dashboard/configuracion/escuela']",
    title: "Paso 3: Tu Escuela",
    message: "Configura los detalles de tu escuela (nombre, logo, contacto).",
    position: "right",
  },
  {
    id: "step-4-groups",
    element: "a[href='/dashboard/grupos']",
    title: "Paso 4: Grupos",
    message: "Crea tus grupos/clases y asigna instructores.",
    position: "right",
  },
  {
    id: "step-5-students",
    element: "a[href='/dashboard/alumnos']",
    title: "Paso 5: Alumnos",
    message: "Agrega estudiantes a tu escuela e inscríbelos en los grupos.",
    position: "right",
  },
];

interface OnboardingTourWrapperProps {
  hasStudents: boolean;
}

export function OnboardingTourWrapper({ hasStudents }: OnboardingTourWrapperProps) {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const onboardingCompleted = localStorage.getItem("onboarding-completed");
    // Show tour only if there are no students AND onboarding hasn't been marked complete
    // OR if the user explicitly requested to see the tour again
    const shouldShow = !hasStudents && !onboardingCompleted;
    setShouldShowTour(shouldShow);
  }, [hasStudents]);

  // Handle restart-tour event (when user clicks the ? button)
  useEffect(() => {
    const handleRestartTour = () => {
      setShouldShowTour(true);
    };

    window.addEventListener("restart-tour", handleRestartTour);
    return () => window.removeEventListener("restart-tour", handleRestartTour);
  }, []);

  if (!isClient) {
    return null;
  }

  if (!shouldShowTour) {
    return null;
  }

  return <OnboardingTour steps={TOUR_STEPS} />;
}
