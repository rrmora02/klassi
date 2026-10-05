import { test } from "@playwright/test";
import fs from "fs";
import path from "path";
import { signIn, hasCreds, type Role } from "./helpers";

// Capturas de la interfaz para comparar "antes" y "después" (spec 001, criterio 4).
// Solo corre si se define CAPTURE_DIR; no forma parte de la suite normal.
//
//   CAPTURE_DIR=specs/001-pulido-visual-portal/evidencia/antes npx playwright test capture
//
// Portal: 360/390/430 px en claro y 390 px en oscuro. Dashboard: 768 y 1280 px
// en claro y 1280 px en oscuro. Solo lectura.

const OUT = process.env.CAPTURE_DIR;

interface Surface {
  role: Role;
  routes: string[];
  light: { w: number; h: number }[];
  dark: { w: number; h: number }[];
  fullPage: boolean;
}

const PORTAL = [
  { w: 360, h: 780 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
];

const SURFACES: Record<string, Surface> = {
  "portal-tutor": {
    role: "parent",
    routes: ["/portal", "/portal/notificaciones", "/portal/pagos", "/portal/cuenta"],
    light: PORTAL,
    dark: [{ w: 390, h: 844 }],
    fullPage: true,
  },
  "portal-instructor": {
    role: "instructor",
    routes: ["/portal", "/portal/asistencia"],
    light: [{ w: 390, h: 844 }],
    dark: [{ w: 390, h: 844 }],
    fullPage: true,
  },
  dashboard: {
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
    light: [
      { w: 768, h: 1024 },
      { w: 1280, h: 800 },
    ],
    dark: [{ w: 1280, h: 800 }],
    fullPage: false,
  },
};

const slug = (route: string) => route.replace(/^\//, "").replace(/\//g, "_") || "inicio";

test.describe("Capturas de UI", () => {
  test.skip(!OUT, "Define CAPTURE_DIR para tomar capturas");
  test.setTimeout(240_000);

  for (const [name, surface] of Object.entries(SURFACES)) {
    test(`capturas ${name}`, async ({ page }) => {
      test.skip(!hasCreds(surface.role), `Sin credenciales para ${surface.role}`);
      await signIn(page, surface.role);
      fs.mkdirSync(OUT!, { recursive: true });

      const shoot = async (theme: "claro" | "oscuro", { w, h }: { w: number; h: number }) => {
        await page.setViewportSize({ width: w, height: h });
        for (const route of surface.routes) {
          await page.goto(route, { waitUntil: "networkidle" });
          await page.evaluate((dark) => {
            document.documentElement.classList.toggle("dark", dark);
          }, theme === "oscuro");
          await page.waitForTimeout(250);
          await page.screenshot({
            path: path.join(OUT!, `${name}__${slug(route)}__${w}__${theme}.jpg`),
            type: "jpeg",
            quality: 60,
            fullPage: surface.fullPage,
          });
        }
      };

      for (const vp of surface.light) await shoot("claro", vp);
      for (const vp of surface.dark) await shoot("oscuro", vp);
    });
  }
});
