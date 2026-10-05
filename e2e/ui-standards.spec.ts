import { test, type Page } from "@playwright/test";
import { signIn, hasCreds } from "./helpers";
import { SURFACES } from "./surfaces";
import { checkAgainstBaseline, flushBaseline } from "./ui-baseline";

// Estándares de interfaz medibles (spec 001: RF-001, RF-002, RNF-001, RNF-003).
// Recorre las pantallas del portal y del dashboard y mide, por ruta y ancho:
//   - textos visibles menores de 12 px
//   - objetivos táctiles/clicables menores que el mínimo de la superficie
//     (portal 44 px, dashboard 36 px; los enlaces dentro de un párrafo se exentan)
//   - scroll horizontal de la página
//   - contraste de texto (claro y oscuro) calculado aquí y no solo con axe: axe no
//     evalúa texto sobre fondos translúcidos (p. ej. insignias rgba), justo el caso
//     más frecuente del portal. Umbral AA: 4.5:1, o 3:1 para texto grande.
// Compara contra la línea base (ver ui-baseline.ts). Solo lectura.

const MIN_FONT = 12;

async function measure(page: Page, tapMin: number) {
  return page.evaluate(
    ({ MIN_FONT, tapMin }) => {
      const IGNORE =
        '[class*="cl-"], script, style, noscript, nextjs-portal, [data-nextjs-toast], [aria-hidden="true"]';
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const cs = getComputedStyle(el);
        return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
      };

      // Texto pequeño (un registro por elemento contenedor del texto)
      const smallText = new Map<Element, { tag: string; size: number; text: string }>();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = (n.textContent ?? "").trim();
        const el = n.parentElement;
        if (!text || !el || smallText.has(el) || el.closest(IGNORE) || !visible(el)) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < MIN_FONT) smallText.set(el, { tag: el.tagName.toLowerCase(), size, text: text.slice(0, 40) });
      }

      // Objetivos táctiles pequeños
      const smallTargets: { tag: string; text: string; w: number; h: number }[] = [];
      document
        .querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, summary')
        .forEach((el) => {
          if (el.closest(IGNORE) || !visible(el)) return;
          const cs = getComputedStyle(el);
          if (el.tagName === "A" && cs.display === "inline") return; // enlace dentro de texto
          const r = el.getBoundingClientRect();
          if (Math.min(r.width, r.height) < tapMin) {
            smallTargets.push({
              tag: el.tagName.toLowerCase(),
              text: (el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30),
              w: Math.round(r.width),
              h: Math.round(r.height),
            });
          }
        });

      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth > 1 ? 1 : 0;

      return {
        smallText: [...smallText.values()],
        smallTargets,
        overflow,
      };
    },
    { MIN_FONT, tapMin },
  );
}


/** Contraste de texto (AA) compuesto sobre fondos translúcidos. Corre en el navegador. */
async function measureContrast(page: Page) {
  return page.evaluate(() => {
    const IGNORE =
      '[class*="cl-"], script, style, noscript, nextjs-portal, [data-nextjs-toast], [aria-hidden="true"]';
    type RGBA = [number, number, number, number];
    const parse = (c: string): RGBA | null => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1]!.split(/[ ,/]+/).filter(Boolean).map(Number);
      return [p[0]!, p[1]!, p[2]!, p[3] ?? 1];
    };
    const over = (top: RGBA, bottom: [number, number, number]): [number, number, number] => [
      top[0] * top[3] + bottom[0] * (1 - top[3]),
      top[1] * top[3] + bottom[1] * (1 - top[3]),
      top[2] * top[3] + bottom[2] * (1 - top[3]),
    ];
    const lum = ([r, g, b]: [number, number, number]) => {
      const f = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: [number, number, number], b: [number, number, number]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };

    const failures: { tag: string; text: string; ratio: number }[] = [];
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? "").trim();
      const el = n.parentElement;
      if (!text || !el || seen.has(el) || el.closest(IGNORE)) continue;
      seen.add(el);
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none") continue;

      // Fondo efectivo: se compone de la raíz hacia el elemento; si hay imagen de
      // fondo en el camino, no es determinable y se omite.
      const chain: Element[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) chain.push(e);
      let indeterminate = false;
      let bg: [number, number, number] = [255, 255, 255];
      for (const e of chain.reverse()) {
        const s = getComputedStyle(e);
        if (s.backgroundImage !== "none") { indeterminate = true; break; }
        const c = parse(s.backgroundColor);
        if (c && c[3] > 0) bg = over(c, bg);
      }
      if (indeterminate) continue;

      const fgc = parse(cs.color);
      if (!fgc) continue;
      // La opacidad del elemento y de sus ancestros atenúa el texto contra el fondo
      let opacity = 1;
      for (let e: Element | null = el; e; e = e.parentElement) opacity *= parseFloat(getComputedStyle(e).opacity);
      const fg = over([fgc[0], fgc[1], fgc[2], fgc[3] * opacity], bg);

      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const need = large ? 3 : 4.5;
      const got = ratio(fg, bg);
      if (got < need) failures.push({ tag: el.tagName.toLowerCase(), text: text.slice(0, 30), ratio: Math.round(got * 100) / 100 });
    }
    return failures;
  });
}

test.describe("Estándares de interfaz (texto, objetivos táctiles, desborde)", () => {
  test.setTimeout(180_000);
  test.afterAll(flushBaseline);

  for (const surface of SURFACES) {
    test(`${surface.name}`, async ({ page }) => {
      test.skip(!hasCreds(surface.role), `Sin credenciales para ${surface.role}`);
      await signIn(page, surface.role);

      for (const { w, h } of surface.widths) {
        await page.setViewportSize({ width: w, height: h });
        for (const route of surface.routes) {
          await page.goto(route, { waitUntil: "networkidle" });
          await page.waitForTimeout(300);
          const m = await measure(page, surface.tapMin);
          const contrastLight = await measureContrast(page);
          await page.evaluate(() => document.documentElement.classList.add("dark"));
          await page.waitForTimeout(200);
          const contrastDark = await measureContrast(page);
          checkAgainstBaseline(
            `ui|${surface.name}|${route}|${w}`,
            {
              smallText: m.smallText.length,
              smallTargets: m.smallTargets.length,
              overflow: m.overflow,
              contrastLight: contrastLight.length,
              contrastDark: contrastDark.length,
            },
            {
              smallText: m.smallText.slice(0, 8),
              smallTargets: m.smallTargets.slice(0, 8),
              contrastLight: contrastLight.slice(0, 8),
              contrastDark: contrastDark.slice(0, 8),
            },
          );
        }
      }
    });
  }
});
