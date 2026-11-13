---
name: JMD Learning LMS
description: LMS propio de JMD Learning; papel lavanda liso, tinta, violeta para actuar y oro para logros y lo próximo, en claro y oscuro.
colors:
  accent: "#5a49d6"
  accent-soft: "#7b6cf0"
  accent-tint: "rgba(90,73,214,.11)"
  on-accent: "#ffffff"
  gold: "#7d5700"
  gold-tint: "rgba(125,87,0,.13)"
  on-gold: "#ffffff"
  hero-a: "#4f3fd1"
  hero-b: "#7c3aed"
  hero-c: "#9d4edd"
  paper: "#fbfbfe"
  surface-1: "#ffffff"
  surface-2: "#f4f3fb"
  surface-3: "#ebeaf6"
  ink: "#16151d"
  muted: "#5c5966"
  faint: "#625f6c"
  line: "rgba(60,52,140,.13)"
  line-strong: "rgba(60,52,140,.24)"
  ok: "#136a33"
  warn: "#984407"
  bad: "#b11f1f"
  info: "#1d4ed8"
  phase-ec: "#5a49d6"
  phase-or: "#0b5f58"
  phase-ca: "#7d5700"
  phase-ea: "#a4185c"
  kind-link: "#1d4ed8"
  kind-repo: "#6d28d9"
  kind-pdf: "#b42318"
  area-req: "#0e6f8a"
  area-qa: "#5b7a14"
typography:
  display-time:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "3rem"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
  hero-title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  subtitle:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 650
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.87rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 650
    letterSpacing: "0.06em"
  badge:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.74rem"
    fontWeight: 600
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.88em"
rounded:
  xs: "4px"
  nav: "6px"
  control: "7px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.4rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.control}"
    padding: "0.42rem 0.85rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.42rem 0.85rem"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.control}"
    padding: "0.42rem 0.85rem"
  button-sm:
    padding: "0.28rem 0.6rem"
    rounded: "{rounded.control}"
  button-hero:
    backgroundColor: "#ffffff"
    textColor: "{colors.hero-a}"
    rounded: "{rounded.sm}"
    padding: "0.6rem 1rem"
    height: "44px"
  input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.65rem"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.65rem"
  chip-on:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent}"
  badge:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.muted}"
    typography: "{typography.badge}"
    rounded: "{rounded.pill}"
    padding: "0.12rem 0.5rem"
  badge-gold:
    backgroundColor: "{colors.gold-tint}"
    textColor: "{colors.gold}"
  card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.9rem 1rem"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "0.6rem 0.8rem"
  tab-on:
    textColor: "{colors.accent}"
  hero-card:
    backgroundColor: "{colors.hero-a}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "1.5rem 1.6rem"
  agenda-row-today:
    backgroundColor: "{colors.gold-tint}"
    textColor: "{colors.ink}"
    padding: "0.85rem 1rem"
---

# Design System: JMD Learning LMS

## Overview

**Creative North Star: "El cuaderno lavanda"**

Un LMS de trabajo, no una vitrina: papel lavanda casi blanco, tinta oscura, superficies blancas con línea fina y un único violeta que dice «aquí se actúa». El oro es el segundo metal: aparece para lo ganado (certificados, notas, anillos de avance) y, en las superficies de operación, para lo próximo. La densidad es alta y legible (base de 15 px, contraste AA de 4.5:1 en texto en los dos temas); la página se lee como un cuaderno ordenado, con color solo donde clasifica algo.

El color con significado viene de tres familias de categoría que se reutilizan en todo el producto: las cuatro fases del ciclo de Kolb (`data-ph`), los tipos de recurso (`data-k`) y, desde la agenda del instructor, las áreas de curso (`data-area`). Cada familia expone su color y su tinte tenue y el componente los toma por variable heredada; ningún componente elige un tono de categoría a mano.

La única superficie de alto voltaje es la tarjeta degradada de la marca (índigo a violeta): la usa el bloque «Ahora» del inicio, la bienvenida y la tarjeta de la clase de hoy en la agenda. Es el lugar de la acción principal y lleva un botón blanco grande. El cielo de constelaciones queda solo para el login; el resto del producto va sobre papel liso.

**Key Characteristics:**
- Papel liso y superficies blancas con línea violeta translúcida; sombras mínimas.
- Violeta para actuar, seleccionar y enfocar; oro para logros y lo próximo.
- Color de categoría por variable heredada (`--ph`, `--k`, `--ar`), nunca por componente.
- Tarjeta degradada de marca como único bloque de acción principal por pantalla.
- Temas claro y oscuro con los mismos tokens; oscuro automático o forzado.
- Cifras tabulares en toda hora, fecha y contador.

## Colors

Paleta fría de tinta sobre lavanda, con un violeta protagonista, un oro de apoyo y familias de categoría saturadas pero templadas para pasar AA.

### Primary
- **Violeta de acción** (accent): botones primarios, enlaces, foco (`outline: 2px`), pestaña y chip activos, navegación activa. En oscuro sube a #a99cff con texto #14122b encima.
- **Violeta suave** (accent-soft): segundo tono del violeta para degradados y estados secundarios.
- **Tinte violeta** (accent-tint): fondo de selección, chip activo, anillo de foco de campos (`0 0 0 3px`).

### Secondary
- **Oro viejo** (gold): logros (certificados, insignias, notas, anillo de avance) y, en operación, «lo próximo»: la fila de hoy en la agenda y su insignia «1 clase hoy». En oscuro, #e9bd52 con texto #1c1606. Variante de botón `.btn.gold` disponible.
- **Tinte oro** (gold-tint): fondo de la fila de hoy, citas en prosa, insignia oro.

### Tertiary
- **Degradado de marca** (hero-a, hero-b, hero-c): índigo #4f3fd1 a violeta #7c3aed a orquídea #9d4edd (oscuro: #3b2fa8, #6d2fd1, #8e3fc9). Solo en la tarjeta de acción principal y en el filete del login.
- **Fases de Kolb** (phase-ec violeta, phase-or teal, phase-ca oro, phase-ea magenta): recorrido de la sesión, `data-ph`.
- **Tipos de recurso** (kind-link azul, kind-repo morado, kind-pdf rojo suave; documentación usa el teal de fase, descarga el ámbar de aviso, diapositivas el oro, vídeo el magenta): `data-k`.
- **Áreas de curso** (`data-area` → `--ar`): agéntica = phase-ec, diseño = phase-ea, datos = kind-link, seguridad = phase-or, QA = area-qa (oliva), requerimientos = area-req (azul petróleo), infra = faint. Las dos propias de la agenda (oscuro: #5cc8e4 y #a9d46a) existen para que ningún punto de área diga «aviso» (naranja) ni se confunda con el violeta agéntico.

### Neutral
- **Papel** (paper): fondo de página plano (oscuro #121128).
- **Superficie 1/2/3** (surface-1, surface-2, surface-3): tarjeta y lista / hover y bloque de código / pista de barras, insignia neutra (oscuro #1d1b38, #252347, #2e2b55).
- **Tinta** (ink): texto principal (oscuro #ecebf7).
- **Gris lavanda** (muted, faint): texto secundario y metadatos.
- **Línea** (line, line-strong): bordes de tarjeta, divisores de fila; la fuerte para campos, chips y botones fantasma.
- **Estados** (ok, warn, bad, info): cada uno con su tinte al 10-15 %; insignias, toasts, errores.

### Named Rules
**The Violeta Actúa Rule.** Todo lo que se pulsa para avanzar es violeta (o blanco sobre la tarjeta de marca). El oro nunca es el color por defecto de una acción.

**The Oro Es Lo Ganado Y Lo Próximo Rule.** El oro marca logros y, en una superficie de operación, el siguiente evento (hoy). Un oro por grupo de filas; si todo es próximo, nada lo es.

**The Color Por Variable Rule.** Los colores de categoría llegan por `data-ph`, `data-k` o `data-area` y se consumen como `var(--ph)`, `var(--k)`, `var(--ar)`. Un área nueva sin token propio recibe uno nuevo en los dos temas antes de usarse.

## Typography

**Body Font:** Inter (con system-ui, -apple-system, Segoe UI, Roboto)
**Label/Mono Font:** ui-monospace (SFMono-Regular, Menlo, Consolas)

**Character:** Una sola sans de interfaz en pesos intermedios (550, 650, 750) que da jerarquía sin cambiar de familia; la mono queda para código, comandos y la terminal.

### Hierarchy
- **Display de hora** (750, 3rem, 1; -0.035em; tabular): la hora de la clase en la tarjeta de la agenda; 2.6rem en el celular.
- **Título de tarjeta de marca** (700, 1.6rem, 1.15; -0.02em; `text-wrap: balance`): nombre del curso en la tarjeta principal; 1.4rem en el celular.
- **Headline** (750, 1.55rem, 1.25): h1 de página.
- **Title** (700, 1.12rem, 1.25): h2 y títulos de sección de lista.
- **Subtitle** (650, 0.98rem): h3.
- **Body** (400, 1rem sobre base de 15 px, 1.5): texto corrido; la prosa de las sesiones va a 0.97rem con ancho máximo de 50rem.
- **Body pequeño** (0.87rem y 0.78rem): metadatos y pistas.
- **Label** (650, 0.78rem, 0.06em, mayúsculas): títulos de sección (`.section-t`) y cabeceras de tabla; es el encabezado en sí, no una línea sobre otro título.
- **Insignia** (600, 0.74rem): badges.

### Named Rules
**The Sin Antetítulo Rule.** (13-11-2026) Nada de etiquetas en mayúsculas y mono encima de un título. En el bloque «Ahora» la etiqueta va debajo del título, en texto normal: «Clase 2 · paso 3 de 6 · Programación agéntica».

**The Cifras Tabulares Rule.** Toda hora, fecha, cuenta regresiva, contador y porcentaje lleva `font-variant-numeric: tabular-nums`, para que las columnas no bailen al cambiar el valor.

**The Pesos Intermedios Rule.** La jerarquía se hace con 550/650/750 y tamaño, no con otra familia.

## Layout

Contenedor centrado de 82rem con relleno de 1.1rem 1rem 4rem; las superficies de operación se estrechan (la agenda a 60rem). Barra superior fija de 52px con fondo translúcido y desenfoque. El ritmo vertical se mueve en pasos de 0.25 / 0.5 / 0.75 / 1 / 1.4rem; las rejillas de tarjetas usan `auto-fill` con mínimos de 15-18rem y separación de 0.75rem.

Responsivo por cortes en rem: 40rem (celular), 48rem, 60-62rem (dos columnas con lateral de 19rem o temario de 17.5rem). Por debajo de 40rem la navegación principal pasa a una barra inferior fija con icono y etiqueta (50px de alto, con `safe-area-inset-bottom`) y la página reserva 5rem abajo.

**The Toque De 44 Rule.** En el celular, toda acción de una superficie de operación mide al menos 44px de alto; las acciones de una fila se reparten en una sola línea de anchos iguales.

**The Hoy Primero Rule.** En las superficies de operación, la acción inmediata (la tarjeta de marca) ocupa la primera pantalla del celular, y lo que ya muestra no se repite debajo.

## Elevation & Depth

Sistema casi plano: las tarjetas descansan con una sombra de un píxel y la profundidad la dan la línea y el escalón de superficies (s1 → s2 → s3). La sombra grande solo aparece como respuesta (hover de tarjeta enlazada, menús, cajones, toasts) o bajo la tarjeta de marca, teñida de su propio índigo.

### Shadow Vocabulary
- **Reposo** (`box-shadow: 0 1px 2px rgba(60,52,140,.06)`): tarjetas, listas, datos clave.
- **Tarjeta con tinte** (`0 1px 2px rgba(60,52,140,.06), 0 6px 18px -8px rgba(90,73,214,.18)`): barra de filtros y lista de la agenda.
- **Flotante** (`0 14px 38px rgba(60,52,140,.14), 0 2px 8px rgba(60,52,140,.06)`): menú de usuario, cajón, toast, hover de tarjeta enlazada.
- **Halo de marca** (`0 18px 40px -18px rgba(79,63,209,.55)`): bajo la tarjeta degradada.

En oscuro las sombras pasan a negro (`rgba(0,0,0,.3)` a `.6`).

### Named Rules
**The Sin Franjas Rule.** (13-11-2026) Las tarjetas y los pasos ya no llevan franja de color a la izquierda: la cabecera de la clase y los pasos de «Mi ruta» quedan con borde de 1px. La categoría se dice con texto o con una insignia, no con una franja.

**The Plano Por Defecto Rule.** En reposo, una tarjeta no flota; sube 2px con la sombra flotante solo al pasar el cursor si es un enlace.

## Shapes

Esquinas suaves y escalonadas: 4px para código y teclas, 6px para elementos de navegación, 7px para botones y campos, 10px para tarjetas pequeñas y botones grandes de la tarjeta de marca, 14px para tarjetas y listas, 20px para la tarjeta de marca y vacíos destacados, y píldora completa para chips, insignias y barras. Bordes de 1px con la línea translúcida. Las franjas de color a la izquierda (4px en filas de fase, 3px en datos clave, 4px en el marcador del título de sección) son parte del lenguaje de categoría del sistema. Puntos de 9px y barras segmentadas de 5px llevan el color de área en la agenda.

## Components

### Buttons
- **Shape:** esquina suave (7px); 10px dentro de la tarjeta de marca.
- **Primary:** violeta con texto blanco (oscuro: lavanda con tinta), 650, 0.9rem, relleno 0.42rem 0.85rem; icono SVG en línea con separación de 0.4rem.
- **Hover / Focus:** `filter: brightness(1.08)`; foco global de 2px violeta con separación de 2px; deshabilitado al 45 %.
- **Ghost:** transparente con línea fuerte y tinta; hover a surface-2. Es la acción secundaria por defecto en filas.
- **Gold:** oro con texto blanco, reservado a acciones de logro.
- **Small:** 0.28rem 0.6rem, 0.83rem; en el celular de la agenda crece a 44px de alto.
- **Hero:** blanco con texto hero-a, 700, mínimo 44px, ancho completo en el celular; el fantasma de la tarjeta es blanco al 12 % con línea al 35 %.

### Chips
- **Style:** píldora, línea fuerte, texto gris lavanda, 0.82rem.
- **State:** activo con tinte violeta, borde y texto violeta, 600; dentro de `data-k` toma el color del tipo.

### Badges
- **Style:** píldora 0.74rem/600 sobre surface-3; variantes por estado (ok, warn, bad, info), acento, oro, fase (`.ph`) y tipo (`.k`).
- **Honestidad de estado:** «propuesto» va en acento y «por confirmar» en aviso, para que lo no confirmado se vea distinto.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** surface-1 con línea fina.
- **Shadow Strategy:** reposo; flotante en hover si es enlace (ver Elevation & Depth).
- **Internal Padding:** 0.9rem 1rem.
- **Listas:** mismo contenedor con filas divididas por línea; fila de 0.65rem 0.9rem.

### Inputs / Fields
- **Style:** surface-1, línea fuerte, 7px, 0.92rem, relleno 0.5rem 0.65rem; etiqueta de 0.83rem/550 en gris lavanda encima.
- **Focus:** borde violeta y anillo de tinte violeta de 3px; sin contorno nativo.

### Navigation
- **Escritorio:** barra superior fija de 52px, marca con estrella SVG dorada, enlaces de 0.9rem en gris lavanda con icono de color de categoría; activo en tinte violeta y 600.
- **Celular:** barra inferior fija de iconos de 20px con etiqueta de 0.7rem.
- **Tabs:** subrayado de 2px; activa en violeta con contador en tinte violeta.

### Empty / Loading / Error
- **Vacío:** caja de línea discontinua, 14px, icono en círculo de 42px sobre surface-2, título en tinta y texto de 0.9rem.
- **Error:** la misma caja con icono en tinte de error y botón fantasma pequeño «Reintentar».
- **Cargando:** barras de esqueleto con brillo deslizante (1.3s).

### Tarjeta de marca (hero card)
La acción principal de la pantalla: degradado hero-a → hero-b (la agenda a 135°, dos paradas; «Ahora» y la bienvenida a 118° con hero-c), radio de 20px, texto blanco con secundarios al 82-88 %, halo de marca. En la agenda reparte una columna de hora (display tabular, «hasta» y duración) y otra de qué (título, grupo · sesión, cuenta regresiva), con el botón blanco «Entrar a la mesa» y fantasmas blancos. En vivo, un punto blanco con latido (1.6s, `cubic-bezier(.16,1,.3,1)`) que se apaga con `prefers-reduced-motion`. La selección de texto dentro va en blanco al 30 %.

### Habilidad (hexágono de insignia)
Lo que el alumno va ganando tiene una sola forma en todo el producto: un hexágono (`components/habilidad.tsx`, `<Hex>`). Cada clase es una habilidad con su insignia Open Badges; el curso completo da el certificado (el mismo hexágono con el icono de premio). Tres estados y nada más:
- **Ganada:** oro lleno con visto (o la imagen real de la insignia en Logros y en la clase).
- **En camino:** violeta, la primera clase sin insignia; muestra su número.
- **Por ganar:** contorno punteado en línea fuerte, número en gris.

Se usa en la ruta del inicio («2 de 3 habilidades · certificado al completar las 3»), en la tarjeta «La habilidad que ganas en esta clase» (objetivos como lista de lo que vas a poder hacer, o con visto oro si ya es tuya) y en Logros (una ruta por curso: clases → certificado, con lo que te falta y «Compartir» plegado).

### Fila de grupo (agenda)
Columna fija de fecha (día en 1.15rem/750 en minúsculas, hora en 0.84rem gris, tabular; 5.6rem, 4.6rem en el celular), nombre con punto de área, línea de sesión, barra segmentada de avance (sesión hecha en color de área, siguiente al 40 %, resto surface-3) y acciones fantasma pequeñas. La fila de hoy lleva tinte oro con anillo interior de 1px en oro y la fecha en oro.

## Do's and Don'ts

### Do:
- **Do** usar violeta para cada acción que avanza y reservar el oro para logros y para lo próximo (una fila de hoy, una insignia).
- **Do** teñir por `data-ph`, `data-k` o `data-area` y consumir `var(--ph)`, `var(--k)`, `var(--ar)`; definir cualquier tono nuevo en claro y en oscuro.
- **Do** escribir horas, fechas y contadores con cifras tabulares y en formato de 12 h («7:30 p. m.»).
- **Do** dar 44px de alto a las acciones táctiles de una superficie de operación en el celular.
- **Do** usar la tarjeta de marca una sola vez por pantalla, para la acción principal, con botón blanco y texto hero-a.
- **Do** usar los componentes compartidos (Tabs, Empty, ErrorState, Loading, Chip, Status, Copy) y los iconos SVG en línea de trazo 1.75.
- **Do** usar `useDialog()` y `toast()` en lugar de diálogos nativos.
- **Do** mostrar lo ganado con el hexágono de habilidad y sus tres estados; el oro es lo ganado, el violeta la clase en la que estás.
- **Do** escribir los pasos de una clase como una sola lista numerada; la fase del ciclo no parte la lista en secciones de color.

### Don't:
- **Don't** pintar acciones primarias en oro ni usar el naranja de aviso como color de área.
- **Don't** reutilizar el violeta de acento como color de un área que no sea agéntica.
- **Don't** apilar sombras flotantes en tarjetas en reposo.
- **Don't** usar el cielo de constelaciones fuera del login.
- **Don't** usar `window.alert`, `window.confirm` ni `window.prompt`.
- **Don't** mostrar más de un botón de compartir por insignia: LinkedIn, PDF, imagen y Open Badges van plegados en «Compartir».
- **Don't** usar verde para lo ganado: el verde es «hecho» (pasos), el oro es «ganado» (insignias y certificados).
