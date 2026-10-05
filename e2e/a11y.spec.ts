import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, hasCreds } from "./helpers";
import { SURFACES } from "./surfaces";
import { checkAgainstBaseline, flushBaseline } from "./ui-baseline";

// Accesibilidad automática con axe (spec 001: RNF-003) en modo claro y oscuro,
// con la misma línea base que no puede empeorar de ui-standards. Solo lectura.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Accesibilidad (axe)", () => {
  test.setTimeout(240_000);
  test.afterAll(flushBaseline);

  for (const surface of SURFACES) {
    test(`${surface.name}`, async ({ page }) => {
      test.skip(!hasCreds(surface.role), `Sin credenciales para ${surface.role}`);
      await signIn(page, surface.role);

      // Un solo ancho por superficie: el más amplio (portal 360, dashboard 1280)
      const vp = surface.widths[surface.widths.length - 1]!;
      await page.setViewportSize({ width: vp.w, height: vp.h });

      for (const theme of ["claro", "oscuro"] as const) {
        for (const route of surface.routes) {
          await page.goto(route, { waitUntil: "networkidle" });
          await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "oscuro");
          await page.waitForTimeout(300);

          const results = await new AxeBuilder({ page })
            .withTags(TAGS)
            .exclude('[class*="cl-"]')
            .analyze();

          const metrics: Record<string, number> = {};
          const details: Record<string, string[]> = {};
          for (const v of results.violations) {
            metrics[v.id] = v.nodes.length;
            details[v.id] = v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${(n.failureSummary ?? "").split("\n")[1] ?? ""}`);
          }
          checkAgainstBaseline(`a11y|${surface.name}|${route}|${theme}`, metrics, details);
        }
      }
    });
  }
});
