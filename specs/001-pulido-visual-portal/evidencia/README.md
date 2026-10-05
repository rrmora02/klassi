# Evidencia — spec 001 (pulido visual)

Capturas **antes** de cualquier cambio, tomadas con `e2e/capture.spec.ts` contra un build de
producción con datos semilla (`e2e-seed.local.ts`). Convención de nombres:
`<superficie>__<ruta>__<ancho>__<claro|oscuro>.jpg`. Portal: 360/390/430 px en claro y 390 px en
oscuro. Dashboard: 768 y 1280 px en claro y 1280 px en oscuro.

Para repetir la toma (por ejemplo, para las capturas "después"):

```bash
scripts/e2e-local.sh all    # base + semilla + build + servidor
CAPTURE_DIR=specs/001-pulido-visual-portal/evidencia/despues npx playwright test capture
```

`build-antes.txt` guarda la tabla de tamaños de `next build` de antes del trabajo, base del
presupuesto de JavaScript (RNF-002: ninguna ruta crece más de 10 %).

## Hallazgos visibles en las capturas

1. **Portal en oscuro — insignias casi ilegibles.** En Pagos, "Pendiente" y "Pagado" usan colores
   fijos (no cambian con el modo): `#0f766e` sobre un fondo verde oscuro da unos 1,5:1. Axe **no lo
   detecta** (fondo translúcido), por eso `ui-standards` mide el contraste por su cuenta.
2. **Portal en oscuro — el botón principal se pierde.** "Adjuntar comprobante" es azul `#1D3557`
   sobre una tarjeta verde oscuro: 1,4:1. Es la acción más importante de la pantalla.
3. **Etiquetas de las pestañas inferiores** (10,5 px) en gris claro: bajo contraste en claro y
   texto por debajo del mínimo en ambos modos.
4. **Inicio del portal** muestra primero las tarjetas de alumnos y deja "Pagos pendientes" debajo,
   con letra pequeña. Lo accionable no es lo primero (RF-006).
5. **Datos secundarios** (alumno · escuela, fechas, "hace 4 min") de 11 a 11,5 px en gris claro.
6. **Dashboard — pestañas de Pagos:** los contadores ("Pendientes 1") son diminutos y casi
   invisibles; el resto de la pantalla es correcto y consistente con la marca.
7. **El zoom está bloqueado** en el portal (`maximumScale: 1`): axe lo marca en las 12 mediciones.
   Se quitará cuando todos los campos midan al menos 16 px (iOS hace zoom automático por debajo).

## Línea base medida (antes de las fases 1 a 5)

| Métrica | Valor |
|---|---|
| Texto menor de 12 px (nodos) | 202 |
| Objetivos táctiles pequeños | 64 |
| Desborde horizontal de página | 0 |
| Contraste (medición propia), claro / oscuro | 67 / 163 |
| axe, `color-contrast` | 91 (182 antes de los tokens) |
| axe, otras reglas | `label` 10 · `meta-viewport` 12 · `select-name` 2 · `button-name` 2 |

Los valores viven en `e2e/ui-baseline.json` y solo pueden bajar; `UI_STRICT=1` exige cero.
