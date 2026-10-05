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

  test("Pagos: el resumen va antes de la lista y los estados llevan texto", async ({ page }) => {
    await page.goto("/portal/pagos");
    const porPagar = page.getByText("Por pagar", { exact: true });
    await expect(porPagar).toBeVisible({ timeout: 20_000 });
    // El resumen dice cuántos pagos hay y si alguno está vencido (RF-005)
    await expect(page.getByText(/pagos? pendientes?|Estás al corriente/)).toBeVisible();
    await expect(page.getByText(/vencid|Estás al corriente/).first()).toBeVisible();

    // El resumen muestra un monto en pesos y precede a la primera tarjeta de pago
    await expect(page.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible();
    const firstItem = page.locator("li").first();
    if (await firstItem.count()) {
      const resumen = await porPagar.boundingBox();
      const lista = await firstItem.boundingBox();
      expect(resumen!.y).toBeLessThan(lista!.y);
    }

    // El estado de cada pago se lee como texto (RF-004), no solo como color
    await expect(page.getByText(/^(Pendiente|Vencido|Pagado|Cancelado)$/).first()).toBeVisible();
  });

  test("Notificaciones: las no leídas se identifican con texto, no solo con color", async ({ page }) => {
    await page.goto("/portal/notificaciones");
    const resumen = page.getByText(/^(\d+ sin leer|Todo al día)$/);
    await expect(resumen).toBeVisible({ timeout: 20_000 });
    const texto = (await resumen.textContent()) ?? "";
    const sinLeer = Number(texto.match(/^(\d+)/)?.[1] ?? 0);
    await expect(page.getByText("Nueva", { exact: true })).toHaveCount(sinLeer);
  });

  test("Inicio: lo accionable va antes que los alumnos", async ({ page }) => {
    await page.goto("/portal");
    const pagos = page.getByRole("heading", { name: "Pagos por atender" });
    const alumnos = page.getByRole("heading", { name: "Tus alumnos" });
    await expect(pagos).toBeVisible({ timeout: 20_000 });
    await expect(alumnos).toBeVisible();
    const [a, b] = [await pagos.boundingBox(), await alumnos.boundingBox()];
    expect(a!.y).toBeLessThan(b!.y);
  });

  test("Eventos: la pregunta y las respuestas son prominentes y el paso siguiente es visible", async ({ page }) => {
    await page.goto("/portal/pagos");

    // Evento sin responder: pregunta + dos respuestas con área táctil de 44 px
    await expect(page.getByText(/¿\w+ asistirá a este evento\?/).first()).toBeVisible({ timeout: 20_000 });
    for (const name of ["Sí asistirá", "No asistirá"]) {
      const box = await page.getByRole("button", { name }).first().boundingBox();
      expect(box!.height, `${name} debe medir al menos 44 px`).toBeGreaterThanOrEqual(44);
    }

    // Evento con asistencia confirmada: muestra el estado y el paso siguiente
    await expect(page.getByText("Asistencia confirmada")).toBeVisible();
    await expect(page.getByText("Para terminar, adjunta tu comprobante de pago.")).toBeVisible();
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
