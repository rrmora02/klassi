import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

// ─── Credenciales de prueba ──────────────────────────────────────
// Se leen de .env.e2e (ver e2e/README.md). SOLO usuarios de prueba de la
// instancia de DESARROLLO de Clerk — nunca credenciales de producción.
const envFile = path.join(__dirname, ".env.e2e");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    const key = m?.[1];
    const value = m?.[2];
    if (key && value !== undefined && process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}

const PORT = process.env.PORT ?? "3000";
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Un worker: los flujos comparten la base de datos del entorno de prueba
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global.setup.ts",
  use: {
    baseURL,
    locale: "es-MX",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Normalmente basta `npx playwright install chromium`. En entornos
    // sandbox con Chromium preinstalado y proxy de salida (ej. CI/agentes),
    // apúntalo con PLAYWRIGHT_CHROMIUM_PATH; ahí también se desactiva el
    // proxy del navegador para poder llegar a localhost.
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
            args: ["--no-proxy-server"],
          },
        }
      : {}),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Levanta la app si no hay una corriendo (usa tu .env normal).
  // Con E2E_BASE_URL apuntas a un servidor ya levantado (ej. npm start).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
