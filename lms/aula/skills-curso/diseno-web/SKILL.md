---
name: diseno-web
description: "Diseña (no programa) la página web o landing de un negocio y entrega un TABLERO DE DISEÑO en un solo HTML para que el cliente lo apruebe: objetivo y público, mapa del sitio, wireframes en gris por sección (1280 y 360 px sobre la rejilla real), portada en alta fidelidad a 1280 y 360 px con el pliegue marcado, guía de estilo (paleta con contrastes calculados, tipografías y escala, espaciado de 8 px, botones y estados, iconografía), componentes, reglas de dimensión y checklist. El motor valida las reglas y falla si no se cumplen. Palabras gatillo: diseña mi web, diseño de página web, propuesta visual, maqueta, mockup, wireframe, tablero de diseño, guía de estilo, sitemap, mapa del sitio, diseñar sin programar, diseño para aprobar, moodboard de la web."
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Diseño web para aprobar (sin programar)

## Cuándo usar

- El cliente (perfumería, restaurante, tienda, empresa) quiere su web y **todavía no aprobó cómo se verá**.
- Hay que presentar una **propuesta visual** antes de gastar horas en código.
- No lo uses para construir la landing: cuando el tablero esté aprobado, eso lo hace `s1-landing-estilos` (con el mismo contenido). Para tokens de una app con usuarios, `diseno-visual`.

## Qué entrega

Un archivo `tablero.html` (abre sin servidor, sin internet salvo las fuentes) con 8 secciones:

1. **Objetivo y público**: objetivo, público, acción principal, métrica, tono y lo que no va.
2. **Mapa del sitio**: páginas y orden de secciones.
3. **Wireframes de baja fidelidad** por sección, en gris, a 1280 y 360 px sobre la rejilla dibujada.
4. **Portada en alta fidelidad** a 1280 y 360 px con la línea del pliegue (primer pantallazo).
5. **Guía de estilo**: paleta con contraste WCAG calculado, tipografías y escala, largo de línea, espaciado de 8 px, botón en 7 estados, iconos.
6. **Componentes**: tarjeta de producto o plato, campos con error, preguntas, botón flotante de WhatsApp.
7. **Reglas de dimensión** (tabla para quien programe después).
8. **Checklist**: lo automático (el motor lo marca) y lo manual (con el cliente al lado).

## Reglas de dimensión (no se negocian)

| Regla | Valor |
|---|---|
| Anchos de diseño | **360** (primero), **768**, **1280** px |
| Contenedor | máximo **1200 px** centrado |
| Rejilla escritorio | **12 columnas** de 78 px, **canal de 24 px** |
| Rejilla teléfono | 4 columnas de 70 px, canal 16, margen 16 |
| Primer pantallazo | 1280 × **720**, 768 × 1024, 360 × **640**: nombre, promesa y botón antes del pliegue |
| Área táctil | mínimo **44 × 44 px**; botones de 48 px; 8 px entre dos áreas táctiles |
| Largo de línea | **45 a 75 caracteres** (`medida_ch`) |
| Espaciado | múltiplos de **8 px** (4 solo dentro de un componente); 96 px entre secciones en escritorio, 64 en teléfono |
| Texto | base ≥ 16 px; escala 1,125–1,5 en escritorio, ~1,2 en teléfono |
| Contraste | **4,5:1** texto; **3:1** títulos grandes, iconos y bordes de campo |
| Menú | máximo **5** opciones; la acción principal va aparte, como botón |
| Portada | título de 2 a 10 palabras; subtítulo ≤ 160 caracteres; acción con verbo y ≤ 5 palabras |

## Procedimiento

1. **Brief.** Lee lo que escribió el cliente. Si faltan objetivo, público o acción principal, **pregunta** (máximo 3 preguntas). No inventes precios, cifras, años, premios ni opiniones: lo que falte va como `[completar]`.
2. **Copia la plantilla** y llénala:
   ```bash
   mkdir -p /trabajo/diseno-web && cd /trabajo/diseno-web
   cp <skill>/motor/diseno.plantilla.json diseno.json
   ```
   `<skill>` es la carpeta de esta skill (`/opt/skills-curso/diseno-web`, `~/.claude/skills/diseno-web` o `~/.config/jmd/skills/diseno-web`). Ejemplos completos: `motor/ejemplos/perfumeria.json` y `motor/ejemplos/restaurante.json`.
   **Si no encuentras `motor/tablero.mjs`** (la skill llegó sin su carpeta), descárgalo del repositorio público y usa `<skill>` = `/trabajo/diseno-web`:
   ```bash
   B=https://raw.githubusercontent.com/davrv93/jmd/main/lms/aula/skills-curso/diseno-web/motor
   for f in tablero.mjs diseno.plantilla.json capturar.sh ejemplos/perfumeria.json ejemplos/restaurante.json; do
     curl -fsSL --create-dirs -o "/trabajo/diseno-web/motor/$f" "$B/$f"
   done
   ```
   Si tampoco hay red, sigue «Si no puedes ejecutar el motor», al final.
   - `paleta`: 7 colores (fondo, superficie, texto, suave, primario, acento, borde). El primario es el del botón de acción.
   - `tipografia`: una de títulos y una de texto (Google Fonts), `base`, `escala`, `medida_ch`.
   - `secciones[].tipo`: `beneficios`, `proceso`, `servicios`, `catalogo`, `menu`, `productos`, `galeria`, `testimonios`, `preguntas`, `ubicacion`, `contacto`, `horario`, `promocion`; otro nombre usa un wireframe genérico.
   - `icono` de cada ítem: `chat`, `pin`, `reloj`, `envio`, `pago`, `estrella`, `bolsa`, `telefono`, `hoja`, `plato`.
   - En el título de portada marca **una** palabra con `*asteriscos*`.
   - `portada.imagen`: describe la foto por producir (qué se ve, luz, fondo). Personas sin aretes ni joyas.
3. **Genera y valida** (Node o Bun, sin dependencias):
   ```bash
   node <skill>/motor/tablero.mjs diseno.json --salida tablero.html
   ```
   Si sale `ERROR`, corrige `diseno.json` (no el HTML) y vuelve a generar hasta ver «Reglas cumplidas». Para revisar sin escribir: `--validar`.
4. **Mira el tablero** en el Visor o el navegador. Captura opcional (Chrome + ffmpeg): `sh <skill>/motor/capturar.sh tablero.html` deja `tablero.png` y `tablero-portada.png`.
5. **Entrega** la ruta del tablero y la lista de `[completar]` que hay que pedir al cliente. No escribas código de producción: esto es para aprobar.

## Errores comunes

- Contraste que «se ve bien» y no cumple: el motor lo calcula; oscurece el texto o el primario.
- Diez opciones en el menú: deja 4 o 5 y lleva el resto al pie.
- Botón de acción por debajo del pliegue en 360 px: acorta el subtítulo o quita la etiqueta.
- Texto corrido a todo el ancho de 1200 px: son 150 caracteres; usa 8 columnas o `medida_ch` ≤ 75.
- Editar `tablero.html` a mano: se pierde al regenerar. Todo cambio va en `diseno.json`.

## Si no puedes ejecutar el motor

Escribe tú un `tablero.html` de un solo archivo con las 8 secciones de arriba y las mismas reglas: wireframes como SVG en grises sobre 12 columnas (1280) y 4 columnas (360), portada en dos marcos de 1280 y 360 px con una línea punteada en 720 y 640 px, y una tabla de contrastes con la fórmula WCAG (luminancia relativa, (L1 + 0,05) / (L2 + 0,05)).

## Versión corta

Eres diseñador web. Desde el texto del cliente, diseña (no programes) su web y entrega un tablero HTML de un solo archivo con: 1) objetivo, público, acción principal y métrica; 2) mapa del sitio; 3) wireframes en gris por sección a 1280 y 360 px sobre 12 columnas de 78 px con canal de 24 (contenedor 1200) y 4 columnas en teléfono; 4) portada en alta fidelidad a 1280 y 360 px con el pliegue a 720 y 640 px; 5) guía de estilo: 7 colores con contraste calculado (4,5:1 texto, 3:1 títulos grandes e iconos), tipografía de títulos y de texto con escala, largo de línea de 45 a 75 caracteres, espaciado en múltiplos de 8, botón de 48 px en estados normal, encima, foco, presionado y deshabilitado, iconos de trazo en 24 px dentro de 44 × 44; 6) componentes; 7) tabla de reglas de dimensión; 8) checklist. Menú de 5 opciones como máximo, título de portada de 2 a 10 palabras y la acción principal visible antes del pliegue. No inventes precios, cifras ni opiniones: usa [completar]. Si tienes el motor, llena diseno.json y ejecuta node tablero.mjs diseno.json --salida tablero.html.
