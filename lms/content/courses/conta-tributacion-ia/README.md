# conta-tributacion-ia (LIVE)

Curso LIVE (2 sesiones × 90 min) para **Contabilidad y tributación con IA · Módulo I**.

Caso ficticio: **Inmobiliaria Altos del Sur SAC** (RUC ficticio válido **20100009995**). No usa datos reales.

## Qué incluye

- `course.yaml` + `cohorts/conta-tributacion-ia-1.yaml` + lecciones en `lessons/`.
- LIVE:
  - `live/cti-01` (Sesión 1): registro de ventas + compras, IA con CSV, minijuego.
  - `live/cti-02` (Sesión 2): liquidación IGV (con escenario de anulación), casos inmobiliarios (checklist), renta (General vs RMT) + informe.
- Motor de hoja local (sin internet): `live/_comun/*`.

## Cumplimiento del encargo (resumen)

- 2 sesiones, **90 min** cada una, máximo 7 escenas (cumplido; ver `_verificar.mjs`).
- Sin librerías externas / internet; en `escena.html` **no hay** `http(s)://` (verificadores OK).
- Hoja embebida: validación OK/Alerta/Error, filtros, import/export CSV y export Excel (implementado en `live/_comun/hoja.js`).
- RUCs ficticios con dígito verificador válido (datasets `ventas.csv` y `compras.csv`).
- Cifras tributarias con base legal visible + fecha de verificación en escena (IGV/Renta/RMT/UIT).

## Verificación (evidencia)

Evidencia y capturas (fuera del curso):

- `/private/tmp/claude-501/-Users-david-roncal-Downloads-PjgFactSalud-completo/510e9da2-0483-44ea-ae85-800afb693b54/scratchpad/conta-cap/VERIFICACION.md`

Comandos ejecutados:

```bash
node lms/content/courses/conta-tributacion-ia/live/_comun/hoja.test.mjs
node lms/content/courses/conta-tributacion-ia/live/cti-01/_verificar.mjs
node lms/content/courses/conta-tributacion-ia/live/cti-02/_verificar.mjs
  node /private/tmp/claude-501/-Users-david-roncal-Downloads-PjgFactSalud-completo/510e9da2-0483-44ea-ae85-800afb693b54/scratchpad/conta-cap/capturas.playwright.mjs
```

Capturas Playwright (mínimas) en `/private/tmp/.../scratchpad/conta-cap/`:

- `cti-01_01-bienvenida_1280x720.png` / `cti-01_01-bienvenida_390x844.png`
- `cti-01_02-registro-ventas_1280x720.png` / `cti-01_02-registro-ventas_390x844.png`
- `cti-02_02-liquidacion-igv_1280x720.png` / `cti-02_02-liquidacion-igv_390x844.png`
- `cti-02_04-impuesto-a-la-renta_1280x720.png` / `cti-02_04-impuesto-a-la-renta_390x844.png`

## Fuentes legales (URLs completas) — verificado 2026-11-25

- TUO IGV/ISC (cap. V, art. 17 — tasa): https://www.sunat.gob.pe/legislacion/igv/ley/capitul5.pdf
- IPM (base legal en SUNAT: art. 76 del D. Leg. 776): https://orientacion.sunat.gob.pe/3053-concepto-tasa-y-operaciones-gravadas-igv-empresas
- TUO Ley del Impuesto a la Renta (cap. VII, art. 55 — 29.5%): https://www.sunat.gob.pe/legislacion/renta/ley/capvii.pdf
- D. Leg. 1269 (RMT — arts. 5 y 6): https://www.sunat.gob.pe/legislacion/mypeIR/dl1269.pdf
- UIT (valor y norma del año): https://www.sunat.gob.pe/indicestasas/uit.html
- SIRE (portal con norma base): https://sire.sunat.gob.pe
- R.S. 000112-2021/SUNAT (PDF): https://www.sunat.gob.pe/legislacion/superin/2021/112-2021.pdf
