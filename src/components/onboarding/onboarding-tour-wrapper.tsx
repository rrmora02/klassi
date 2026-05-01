"use client";

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

export function OnboardingTourWrapper() {
  return <OnboardingTour steps={TOUR_STEPS} />;
}
