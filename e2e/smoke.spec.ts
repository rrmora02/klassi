import { test, expect } from "@playwright/test";

// Pruebas sin autenticación: PWA, rutas públicas, redirecciones y cabeceras.
// Corren contra cualquier entorno, sin credenciales.

test.describe("PWA", () => {
  test("el manifest existe y apunta al portal", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toContain("Klassi");
    expect(manifest.start_url).toBe("/portal");
    expect(manifest.display).toBe("standalone");
  });

  test("el service worker se sirve y maneja push", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('addEventListener("push"');
    expect(body).toContain('addEventListener("notificationclick"');
  });
});

test.describe("Rutas públicas", () => {
  test("la página de inicio responde", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
  });

  test("sign-in muestra el copy neutral para familias y staff", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Inicia sesión para entrar a tu escuela")).toBeVisible();
  });

  test("un enlace de acceso inválido muestra error amable, no crash", async ({ page }) => {
    await page.goto("/portal/acceso?ticket=invalido");
    await expect(page.getByText("No pudimos abrir tu acceso")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Protección de rutas", () => {
  for (const ruta of ["/dashboard", "/portal", "/entrar", "/dashboard/pagos", "/portal/cuenta"]) {
    test(`${ruta} sin sesión redirige a sign-in`, async ({ page }) => {
      await page.goto(ruta);
      await page.waitForURL(/sign-in/, { timeout: 15_000 });
      expect(page.url()).toContain("sign-in");
    });
  }
});

test.describe("Cabeceras de seguridad", () => {
  test("CSP, X-Frame-Options y HSTS presentes", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});
