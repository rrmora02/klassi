import { test, expect } from "@playwright/test";
import { signIn, signOut, hasCreds } from "./helpers";

// Portal de familias (PWA) con viewport móvil. Solo lectura: no confirma
// eventos, no sube comprobantes ni cambia contraseñas.

test.use({ viewport: { width: 390, height: 844 } });

test.describe("Portal del tutor", () => {
  test.skip(!hasCreds("parent"), "Define E2E_PARENT_EMAIL/PASSWORD y CLERK_SECRET_KEY en .env.e2e");

  test.beforeEach(async ({ page }) => {
    await signIn(page, "parent");
  });

  test("después del login, /entrar lo lleva al portal (no a crear escuela)", async ({ page }) => {
    await page.goto("/entrar");
    await page.waitForURL(/\/portal/, { timeout: 20_000 });
    await expect(page.getByText(/Hola/)).toBeVisible();
    // Regresión del bug: nunca debe ver el onboarding de dueños de escuela
    expect(page.url()).not.toContain("onboarding");
  });

  test("las pestañas del portal navegan correctamente", async ({ page }) => {
    await page.goto("/portal");

    await page.getByRole("link", { name: "Notificaciones" }).click();
    await expect(page.getByRole("heading", { name: "Notificaciones" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("link", { name: "Pagos" }).click();
    await expect(page.getByRole("heading", { name: "Pagos" }).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("link", { name: "Cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible({ timeout: 20_000 });
  });

  test("Cuenta muestra el formulario de contraseña sin desbordes", async ({ page }) => {
    await page.goto("/portal/cuenta");
    // Según tenga o no contraseña, cambia el título del formulario
    await expect(
      page.getByText("Crear contraseña").or(page.getByText("Cambiar contraseña")).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Cerrar sesión/ })).toBeVisible();

    // Regresión: nada debe provocar scroll horizontal en móvil
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("el tutor NO puede entrar al dashboard del staff", async ({ page }) => {
    await page.goto("/dashboard");
    // El layout lo rebota (onboarding) y el guard de onboarding lo regresa al portal
    await page.waitForURL(/\/portal/, { timeout: 20_000 });
  });

  test("cerrar sesión regresa a sign-in", async ({ page }) => {
    await page.goto("/portal/cuenta");
    await signOut(page);
    await page.goto("/portal");
    await page.waitForURL(/sign-in/, { timeout: 15_000 });
  });
});
