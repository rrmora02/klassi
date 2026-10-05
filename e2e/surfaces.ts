import type { Role } from "./helpers";

// Pantallas que recorren las pruebas de interfaz (capturas, estándares de UI y
// accesibilidad). Una sola lista para que todas midan lo mismo.

export interface Surface {
  name: string;
  role: Role;
  routes: string[];
  /** Anchos (px) en los que se mide cada ruta */
  widths: { w: number; h: number }[];
  /** Umbral mínimo (px) para objetivos táctiles/clicables de esa superficie */
  tapMin: number;
}

export const SURFACES: Surface[] = [
  {
    name: "portal-tutor",
    role: "parent",
    routes: ["/portal", "/portal/notificaciones", "/portal/pagos", "/portal/cuenta"],
    widths: [{ w: 360, h: 780 }],
    tapMin: 44,
  },
  {
    name: "portal-instructor",
    role: "instructor",
    routes: ["/portal", "/portal/asistencia"],
    widths: [{ w: 360, h: 780 }],
    tapMin: 44,
  },
  {
    name: "dashboard",
    role: "staff",
    routes: [
      "/dashboard",
      "/dashboard/pagos",
      "/dashboard/alumnos",
      "/dashboard/grupos",
      "/dashboard/instructores",
      "/dashboard/eventos",
      "/dashboard/comunicados",
      "/dashboard/comunicados/nuevo",
      "/dashboard/asistencia",
      "/dashboard/reportes",
    ],
    widths: [
      { w: 768, h: 1024 },
      { w: 1280, h: 800 },
    ],
    tapMin: 36,
  },
];
