import { test, expect } from "@playwright/test";
import { signIn, hasCreds } from "./helpers";

// Flujos del staff (ADMIN/RECEPTIONIST) en el dashboard. Solo lectura:
// no crean ni modifican datos del entorno de prueba.

test.describe("Dashboard del staff", () => {
  test.skip(!hasCreds("staff"), "Define E2E_STAFF_EMAIL/PASSWORD y CLERK_SECRET_KEY en .env.e2e");

  test.beforeEach(async ({ page }) => {
    await signIn(page, "staff");
  });

  test("después del login, /entrar lo lleva al dashboard", async ({ page }) => {
    await page.goto("/entrar");
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Inicio" }).first()).toBeVisible();
  });

  test("navega a las secciones principales sin errores", async ({ page }) => {
    await page.goto("/dashboard");

    const secciones = [
      { link: "Alumnos",     heading: "Alumnos" },
      { link: "Pagos",       heading: "Pagos" },
      { link: "Comunicados", heading: "Comunicados" },
      { link: "Asistencia",  heading: "Pase de lista" },
    ];

    for (const { link, heading } of secciones) {
      await page.getByRole("link", { name: link, exact: true }).first().click();
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 20_000 });
    }
  });

  test("los tabs de estado en Pagos filtran sin romper", async ({ page }) => {
    await page.goto("/dashboard/pagos");
    await expect(page.getByRole("heading", { name: "Pagos" }).first()).toBeVisible();

    for (const tab of ["Pendientes", "Pagados", "Todos"]) {
      await page.getByRole("link", { name: tab, exact: true }).first().click();
      await expect(page.getByRole("heading", { name: "Pagos" }).first()).toBeVisible({ timeout: 20_000 });
    }
  });

  test("el formulario de nuevo comunicado carga completo", async ({ page }) => {
    await page.goto("/dashboard/comunicados/nuevo");
    await expect(page.getByPlaceholder("Ej. Cierre por vacaciones")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByPlaceholder("Escribe el contenido del comunicado...")).toBeVisible();
  });

  test("asistencia: elegir un grupo despliega la lista", async ({ page }) => {
    await page.goto("/dashboard/asistencia");
    const select = page.locator("select");
    await expect(select).toBeVisible({ timeout: 20_000 });

    const options = await select.locator("option").allTextContents();
    test.skip(options.length <= 1, "El entorno de prueba no tiene grupos con clase hoy");

    await select.selectOption({ index: 1 });
    // Aparece la tabla de alumnos o el vacío "No hay alumnos inscritos"
    await expect(
      page.locator("table").or(page.getByText("No hay alumnos inscritos")),
    ).toBeVisible({ timeout: 20_000 });
  });
});
