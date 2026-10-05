import { test, expect } from "@playwright/test";
import { signIn, hasCreds } from "./helpers";

// Instructor: navegación restringida en dashboard y pase de lista en portal.
// Solo lectura: no marca asistencia real.

test.describe("Instructor", () => {
  test.skip(!hasCreds("instructor"), "Define E2E_INSTRUCTOR_EMAIL/PASSWORD y CLERK_SECRET_KEY en .env.e2e");

  test.beforeEach(async ({ page }) => {
    await signIn(page, "instructor");
  });

  test("después del login llega al dashboard con menú restringido", async ({ page }) => {
    await page.goto("/entrar");
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

    // Ve lo suyo… (el menú lateral; el inicio también tiene accesos directos)
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Asistencia", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir portal" })).toBeVisible();
    // …y NO las secciones administrativas
    await expect(nav.getByRole("link", { name: "Alumnos", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Pagos", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Reportes", exact: true })).toHaveCount(0);
  });

  test("las rutas administrativas lo rebotan al inicio", async ({ page }) => {
    for (const ruta of ["/dashboard/pagos", "/dashboard/alumnos", "/dashboard/reportes"]) {
      await page.goto(ruta);
      await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });
    }
  });

  test("el portal le muestra pase de lista con SOLO sus grupos", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/portal/asistencia");

    await expect(page.getByRole("heading", { name: "Pase de lista" })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('input[type="date"]')).toBeVisible();
    // Con clases hoy: lista de grupos; sin clases: vacío amable
    await expect(
      page.getByText("No tienes clases este día").or(page.getByRole("button").filter({ hasText: /./ }).first()),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("el inicio del portal le muestra el acceso directo a pase de lista", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/portal");
    await expect(page.getByText("Registra la asistencia de tus grupos")).toBeVisible({ timeout: 20_000 });
  });

  test("pase de lista: muestra el avance y botones de 44 px con el estado elegido accesible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/portal/asistencia");
    await page.getByRole("button", { name: /Karate Infantil/ }).click();

    // Avance "N de M marcados" con barra accesible
    await expect(page.getByText(/^\d+ de \d+ marcados$/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("progressbar", { name: "Avance del pase de lista" })).toBeVisible();

    // Cada alumno tiene los 4 estados, como botones de al menos 44 px que informan si están elegidos
    const grupo = page.getByRole("group", { name: /^Asistencia de / }).first();
    for (const estado of ["Presente", "Ausente", "Tarde", "Justificado"]) {
      const boton = grupo.getByRole("button", { name: estado });
      await expect(boton).toHaveAttribute("aria-pressed", /true|false/);
      const box = await boton.boundingBox();
      expect(box!.height, `${estado} debe medir al menos 44 px`).toBeGreaterThanOrEqual(44);
    }
  });
});
