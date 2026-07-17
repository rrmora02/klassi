// Zona horaria de las escuelas: America/Mexico_City (UTC-6 fijo desde que
// México eliminó el horario de verano en 2022). Los cortes de mes calculados
// en hora local del servidor (UTC en Vercel) movían al mes siguiente los
// pagos registrados después de las 18:00 hora de México del fin de mes.
const MX_UTC_OFFSET_HOURS = 6;

/** Límites [from, to] de un mes calendario (1-12) en hora de México, como instantes UTC. */
export function mxMonthRange(year: number, month1to12: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, month1to12 - 1, 1, MX_UTC_OFFSET_HOURS));
  const to   = new Date(Date.UTC(year, month1to12, 1, MX_UTC_OFFSET_HOURS) - 1);
  return { from, to };
}

/** Mes calendario actual según el reloj de México. */
export function mxCurrentMonthRange(ref: Date = new Date()): { from: Date; to: Date } {
  const { year, month } = mxYearMonth(ref);
  return mxMonthRange(year, month);
}

/** Año y mes (1-12) de un instante según el reloj de México. */
export function mxYearMonth(ref: Date): { year: number; month: number } {
  const mx = new Date(ref.getTime() - MX_UTC_OFFSET_HOURS * 3_600_000);
  return { year: mx.getUTCFullYear(), month: mx.getUTCMonth() + 1 };
}
