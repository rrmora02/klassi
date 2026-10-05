import fs from "fs";
import path from "path";
import { expect } from "@playwright/test";

// Línea base "que no puede empeorar" para las pruebas de interfaz (spec 001).
//
// Hoy el producto tiene infracciones conocidas (texto pequeño, objetivos
// táctiles chicos, contraste). Para que la suite siga en verde mientras se
// corrigen por fases, cada medición se compara contra `ui-baseline.json`:
//   - Si EMPEORA respecto a la línea base, la prueba falla.
//   - Si MEJORA, se avisa para que se baje la línea base.
//   - UI_UPDATE_BASELINE=1 reescribe la línea base con lo medido (úsese al
//     cerrar cada fase, tras revisar el diff).
//   - UI_STRICT=1 exige cero infracciones (criterio final de la spec 001).

const FILE = path.join(__dirname, "ui-baseline.json");

type Metrics = Record<string, number>;
type Baseline = Record<string, Metrics>;

const read = (): Baseline => {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
};

const pending: Baseline = {};

export const updateMode = () => process.env.UI_UPDATE_BASELINE === "1";
export const strictMode = () => process.env.UI_STRICT === "1";

/** Compara las métricas medidas con la línea base de esa clave. */
export function checkAgainstBaseline(key: string, measured: Metrics, details?: unknown) {
  if (updateMode()) {
    pending[key] = measured;
    return;
  }

  const base = read()[key];
  const detail = details ? `\n${JSON.stringify(details, null, 2).slice(0, 1800)}` : "";

  if (strictMode()) {
    for (const [metric, value] of Object.entries(measured)) {
      expect.soft(value, `[${key}] ${metric} debe ser 0 (modo estricto)${detail}`).toBe(0);
    }
    return;
  }

  expect.soft(
    base,
    `[${key}] no hay línea base. Corre con UI_UPDATE_BASELINE=1 y revisa el cambio de ui-baseline.json`,
  ).toBeDefined();

  for (const [metric, value] of Object.entries(measured)) {
    const allowed = base?.[metric] ?? 0;
    expect.soft(value, `[${key}] ${metric} empeoró (línea base ${allowed})${detail}`).toBeLessThanOrEqual(allowed);
    if (value < allowed) {
      console.log(`  ↓ [${key}] ${metric}: ${allowed} → ${value} (baja la línea base con UI_UPDATE_BASELINE=1)`);
    }
  }
}

/** Escribe la línea base acumulada (se llama en afterAll). */
export function flushBaseline() {
  if (!updateMode() || Object.keys(pending).length === 0) return;
  const merged = { ...read(), ...pending };
  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(FILE, JSON.stringify(sorted, null, 2) + "\n");
}
