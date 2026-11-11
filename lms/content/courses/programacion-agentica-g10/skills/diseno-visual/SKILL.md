---
name: diseno-visual
description: Define o revisa el sistema visual de una app web o de un avatar conversacional: tokens (color, tipografía, espaciado, radios, sombras), paletas listas (kawaii tecnológica y profesional sobria), profundidad, jerarquía y movimiento (duración, easing, anime.js, Lottie). Úsalo cuando pidan "diseño", "look and feel", "paleta", "tema", "tokens", "colores", "animación", "transición", "glassmorphism", "que se vea moderno" o "que se vea bonito".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Diseño visual: tokens, paletas, profundidad y movimiento

## Cuándo usar

- Al empezar una pantalla, un componente o un avatar y todavía no existe un tema.
- Cuando el usuario pide "que se vea mejor" sin decir cómo: este skill convierte el gusto en decisiones medibles.
- Al revisar una interfaz existente que se siente "cargada" o "inconsistente".
- Antes de añadir cualquier animación: aquí están las duraciones y curvas permitidas.
- No lo uses para elegir la estructura de la pantalla (eso es `ux-flujos`) ni para el comportamiento de un componente (eso es `ui-componentes`).

## Principios (máximo 7)

1. **Primero tokens, después pantallas.** Ningún color, tamaño o sombra se escribe a mano dos veces: se define una vez como variable CSS y se reutiliza.
2. **Un acento manda.** Un color primario, uno de apoyo y los semánticos (éxito, aviso, error, info). Nada más.
3. **La jerarquía se construye con tamaño, peso y espacio, no con más colores.**
4. **La profundidad es información.** Una capa más alta significa "esto está encima y requiere atención". Si todo flota, nada flota.
5. **El movimiento explica, no decora.** Cada animación responde a la pregunta "¿de dónde vino esto?" o "¿qué acaba de pasar?".
6. **Respeta `prefers-reduced-motion` siempre.** Es una regla de accesibilidad, no una opción.
7. **El sistema debe sobrevivir al modo oscuro.** Si un token no tiene valor para oscuro, no está terminado.

## Procedimiento paso a paso

1. Pregunta (o decide) el carácter: ¿producto profesional (ERP, panel académico) o producto cercano (avatar, tutor virtual, app de alumnos)? Elige la paleta base según eso.
2. Define los tokens en `:root` en este orden: color, tipografía, espaciado, radios, sombras, movimiento. Usa nombres por **función** (`--color-superficie`, `--color-texto-suave`) y no por valor (`--azul-3`).
3. Define la variante oscura con las mismas variables bajo `@media (prefers-color-scheme: dark)` y bajo `[data-theme="dark"]`.
4. Fija una escala tipográfica de 6 pasos (12, 14, 16, 20, 24, 32 px) y una familia de texto más una opcional para títulos. Cuerpo mínimo 16 px en móvil.
5. Fija la escala de espaciado en múltiplos de 4 px: 4, 8, 12, 16, 24, 32, 48, 64. Nada de 13 px ni 27 px.
6. Define tres radios (pequeño 6 px, medio 12 px, grande 20 px) y un radio "píldora" (999 px). Las apps kawaii usan radios grandes; las sobrias, medio.
7. Define cuatro niveles de elevación (0 plano, 1 tarjeta, 2 panel flotante, 3 modal) con sombras suaves y multicapa. Reserva el desenfoque de fondo (glassmorphism) para el nivel 2 como máximo y sólo sobre fondos con imagen o color.
8. Construye la jerarquía de cada pantalla con tres niveles: título (qué es esto), cuerpo (los datos) y meta (fechas, estados, ayudas). Verifica que se lee el orden sin color.
9. Añade movimiento sólo en entradas, salidas, cambios de estado y respuestas a una acción. Usa las duraciones y curvas de la sección "Movimiento".
10. Verifica contraste con `accesibilidad` (4.5:1 texto, 3:1 componentes) y revisa en 393 px con `responsividad`.

## Tokens: qué debe existir

| Grupo | Tokens mínimos |
|---|---|
| Color | `fondo`, `superficie`, `superficie-alta`, `borde`, `texto`, `texto-suave`, `primario`, `primario-texto`, `acento`, `exito`, `aviso`, `error`, `info` |
| Tipografía | `fuente-texto`, `fuente-titulo`, `tamano-1..6`, `interlineado-texto` (1.5), `interlineado-titulo` (1.2) |
| Espaciado | `esp-1..8` = 4, 8, 12, 16, 24, 32, 48, 64 px |
| Radios | `radio-s` 6, `radio-m` 12, `radio-l` 20, `radio-pildora` 999 |
| Sombras | `sombra-1`, `sombra-2`, `sombra-3` (ver fragmento) |
| Movimiento | `dur-rapida` 150 ms, `dur-media` 250 ms, `dur-lenta` 400 ms, `ease-salida`, `ease-entrada`, `ease-estandar` |

## Paletas listas para usar

### Kawaii tecnológica (pasteles + acentos neón suaves)

Para avatares, tutores virtuales y apps de alumnos. Pasteles en superficies grandes; el neón sólo en detalles pequeños (puntos de estado, bordes de foco, iconos). Los contrastes están calculados para texto oscuro sobre pastel; **no pongas texto blanco sobre pastel** (lila `#B9A7F5` con blanco da 2.1:1 y falla).

| Token | Claro | Oscuro |
|---|---|---|
| fondo | `#FDF8FF` | `#1B1730` |
| superficie | `#FFFFFF` | `#262040` |
| borde | `#EADFF7` | `#3A3158` |
| texto | `#2B2440` | `#F3EEFF` |
| texto-suave | `#6E6688` | `#B9B0D6` |
| primario (relleno) | `#B9A7F5` lila | `#9D88F0` |
| primario-texto (sobre relleno) | `#2B2440` | `#1B1730` |
| primario-fuerte (enlaces, texto) | `#6B4FD8` (5.6:1 sobre blanco) | `#C9BBFF` |
| secundario | `#FFC9DE` rosa | `#F0A6C4` |
| terciario | `#BDEBD9` menta | `#8ED6BD` |
| acento neón suave | `#7CF3E1` menta neón, `#FF8AD8` rosa neón | mismos, sólo en detalles |
| éxito / aviso / error | `#2E8B6A` / `#B07A12` / `#C2415A` | `#8ED6BD` / `#F2C66D` / `#FF9BB0` |

Radios grandes (`radio-l` en tarjetas, píldora en botones), sombras con tinte lila (`rgb(107 79 216 / 0.12)`), tipografía redondeada si se dispone (Nunito, Quicksand) o la del sistema.

### Profesional sobria

Para ERP de construcción, ERP académico y paneles de gestión. Neutros fríos, un solo azul, verde sólo para éxito.

| Token | Claro | Oscuro |
|---|---|---|
| fondo | `#F6F7F9` | `#0F1420` |
| superficie | `#FFFFFF` | `#171D2B` |
| borde | `#DDE1E7` | `#2A3242` |
| texto | `#1A1F2B` | `#E6E9EF` |
| texto-suave | `#5B6472` | `#9AA3B2` |
| primario | `#1F4FBF` (7.1:1 sobre blanco) | `#6F9BFF` |
| primario-texto | `#FFFFFF` | `#0F1420` |
| éxito / aviso / error / info | `#0E8A6A` / `#B54708` / `#B42318` / `#1F4FBF` | `#4CC9A4` / `#F79009` / `#F97066` / `#6F9BFF` |

Radios medios, sombras grises neutras, tipografía del sistema o Inter/IBM Plex Sans. Tablas densas: filas de 36–40 px, cebra muy suave (`superficie` alterna con `fondo`).

## Profundidad

- Nivel 0: contenido plano sobre `fondo`. Sin sombra.
- Nivel 1: tarjetas y campos sobre `superficie`. Borde de 1 px más `sombra-1`.
- Nivel 2: menús desplegables, paneles laterales, popovers. `sombra-2`. Aquí cabe el desenfoque de fondo (`backdrop-filter: blur(12px)`) con fondo semitransparente al 70–85 %. Nunca más de un elemento con desenfoque visible a la vez.
- Nivel 3: modales y diálogos. `sombra-3` más una cortina oscura (`rgb(0 0 0 / 0.4)`).
- Las sombras se construyen en dos o tres capas con poca opacidad (0.04–0.12) y radios grandes; una sombra negra y dura delata que no hay sistema.
- En modo oscuro las sombras casi no se ven: la elevación se expresa aclarando la superficie (`superficie-alta`) y con un borde de 1 px.

## Jerarquía

- Un solo H1 por pantalla. Los títulos de sección son H2 y nunca saltan niveles.
- Peso: título 600–700, cuerpo 400, meta 400 con `texto-suave`. No uses más de dos pesos por pantalla además del regular.
- Espacio: el hueco antes de un título es mayor que el hueco después. Los elementos relacionados se agrupan con `esp-2`/`esp-3`; los grupos se separan con `esp-5`/`esp-6`.
- El color sólo refuerza: si quitas el color y la jerarquía desaparece, está mal construida.
- Ancho de lectura: 60–75 caracteres por línea para prosa; las tablas pueden ocupar todo el ancho.

## Movimiento

Duración y curva según el tipo de cambio:

| Caso | Duración | Curva |
|---|---|---|
| Entrada (aparece algo) | 200–300 ms | ease-out: `cubic-bezier(0.16, 1, 0.3, 1)` |
| Salida (desaparece algo) | 150–200 ms | ease-in: `cubic-bezier(0.7, 0, 0.84, 0)` |
| Cambio de estado (hover, foco, color) | 120–180 ms | `ease` estándar o `cubic-bezier(0.4, 0, 0.2, 1)` |
| Micro-interacción (botón pulsado, toggle, like) | 250–450 ms | spring suave (rebote 0.2–0.4) |
| Movimiento de capa grande (panel, modal) | 250–350 ms | ease-out y, en la salida, ease-in más corto |

Reglas:

- Anima sólo `transform` y `opacity`. Animar `width`, `height`, `top`, `left` o `margin` provoca relayout y tartamudea en móviles baratos.
- Las entradas escalonadas (`stagger`) usan 30–60 ms entre elementos y nunca pasan de 8 elementos; a partir de ahí el usuario espera.
- Todo movimiento vive dentro de `@media (prefers-reduced-motion: no-preference)`. Con reducción activa, la animación se sustituye por un cambio instantáneo de opacidad o nada.
- Nada se mueve en bucle salvo indicadores de carga y el avatar "respirando" (ciclo lento de 3–4 s, amplitud mínima).

### Qué herramienta usar

- **CSS puro (`transition`, `@keyframes`)** para el 90 %: hover, foco, entradas simples, esqueletos de carga.
- **anime.js v4** (CDN cdnjs, versión 4.5.0 verificada) cuando necesitas secuencias, escalonado, springs o timelines sincronizadas. Se importa como módulo ES y el parámetro de curva se llama `ease`, no `easing`.
- **Easing Wizard** (`https://easingwizard.com`, código en `github.com/roydigerhund/easingwizard`): editor abierto de curvas CSS. Genera `cubic-bezier()` y `linear()` para Bézier, spring, rebote, wiggle y overshoot, con salida CSS o Tailwind. Úsalo para obtener una curva spring en CSS puro cuando no quieres cargar una librería. Tiene API REST y servidor MCP; el plugin de Claude Code revisa easings de un proyecto.
- **Editor de easings de anime.js** (`https://animejs.com/easings/`): visualiza las curvas con nombre de la librería (`outExpo`, `inOut(3)`, springs). Úsalo para elegir el nombre que pondrás en `ease`.
- **Lottie**: para ilustraciones animadas y avatares vectoriales exportados desde After Effects o LottieFiles. Dos opciones: `@lottiefiles/dotlottie-web` (versión 0.81.0 en npm, archivos `.lottie` comprimidos, render en `<canvas>`) o `lottie-web` 5.13.0 (cdnjs, archivos `.json`, render SVG). Carga sólo una de las dos y pausa el reproductor cuando el elemento no está visible.
- **Texto animado**: el skill `animate-text` de Pixel Point (`https://pixelpoint.io/skills/animate-text`, se instala con `npx skills add pixel-point/animate-text --skill animate-text`) da especificaciones de ritmo y curvas para títulos y subtítulos en Remotion, Motion, GSAP o WAAPI. Si no puedes instalarlo, aplica la regla general: una sola palabra o línea a la vez, 40–80 ms de escalonado, entrada por opacidad y 8–12 px de desplazamiento.
- **Remotion**: sólo para renderizar vídeo (clips, presentaciones, mensajes del avatar grabados). Nunca para la interfaz en vivo.

## Reglas duras (lo que nunca)

- Nunca `window.alert`, `window.confirm` ni `window.prompt`. Rompen la identidad visual y en móvil salen como pop-up del sistema. Diálogos propios siempre.
- Nunca animes propiedades de layout (`width`, `height`, `top`, `left`, `margin`, `padding`). Sólo `transform` y `opacity`.
- Nunca más de un color primario y un acento. Siete colores de acento es un carnaval, no una paleta.
- Nunca parallax, autoplay de vídeo o fondos en movimiento sin comprobar `prefers-reduced-motion`.
- Nunca texto blanco sobre pastel ni gris claro sobre blanco "porque se ve elegante": mide el contraste.
- Nunca desenfoque de fondo en más de un elemento a la vez ni sobre fondos planos (no se nota y cuesta GPU).
- Nunca valores sueltos (`#3b82f6`, `13px`, `0 2px 4px black`) dentro de un componente: todo pasa por tokens.
- Nunca una fuente de icono y una de SVG mezcladas: una sola familia de iconos, un solo grosor de trazo.
- Nunca una URL de CDN sin versión exacta.

## Lista de comprobación

- [ ] Existe un bloque `:root` con tokens de color, tipografía, espaciado, radios, sombras y movimiento.
- [ ] Todos los tokens tienen valor para modo claro y para modo oscuro.
- [ ] Hay un solo color primario, un acento y los cuatro semánticos.
- [ ] El texto de cuerpo mide 16 px o más en móvil e interlineado 1.5.
- [ ] Los espaciados son múltiplos de 4 px.
- [ ] La elevación tiene cuatro niveles y las sombras son multicapa y suaves.
- [ ] El desenfoque de fondo aparece como máximo en un elemento y sólo sobre fondo con imagen o color.
- [ ] Al quitar el color, la jerarquía sigue leyéndose.
- [ ] Las entradas duran 200–300 ms con ease-out; las salidas 150–200 ms con ease-in.
- [ ] Sólo se animan `transform` y `opacity`.
- [ ] Toda animación está dentro de `prefers-reduced-motion: no-preference` o tiene alternativa estática.
- [ ] Las librerías se cargan desde CDN con versión exacta y existente.
- [ ] No hay `alert`, `confirm` ni `prompt` nativos.
- [ ] Contraste verificado: 4.5:1 texto, 3:1 bordes e iconos.

## Fragmentos

Tokens base con variante oscura (paleta profesional sobria; cambia los valores por los de la kawaii si corresponde):

```css
:root {
  --color-fondo: #F6F7F9;  --color-superficie: #FFFFFF;  --color-superficie-alta: #FFFFFF;
  --color-borde: #DDE1E7;  --color-texto: #1A1F2B;       --color-texto-suave: #5B6472;
  --color-primario: #1F4FBF; --color-primario-texto: #FFFFFF;
  --color-exito: #0E8A6A; --color-aviso: #B54708; --color-error: #B42318; --color-info: #1F4FBF;
  --fuente-texto: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --tamano-1: 0.75rem; --tamano-2: 0.875rem; --tamano-3: 1rem; --tamano-4: 1.25rem; --tamano-5: 1.5rem; --tamano-6: 2rem;
  --esp-1: 4px; --esp-2: 8px; --esp-3: 12px; --esp-4: 16px; --esp-5: 24px; --esp-6: 32px; --esp-7: 48px; --esp-8: 64px;
  --radio-s: 6px; --radio-m: 12px; --radio-l: 20px; --radio-pildora: 999px;
  --sombra-1: 0 1px 2px rgb(16 24 40 / 0.06), 0 1px 3px rgb(16 24 40 / 0.10);
  --sombra-2: 0 4px 8px -2px rgb(16 24 40 / 0.10), 0 2px 4px -2px rgb(16 24 40 / 0.06);
  --sombra-3: 0 20px 24px -4px rgb(16 24 40 / 0.10), 0 8px 8px -4px rgb(16 24 40 / 0.04);
  --dur-rapida: 150ms; --dur-media: 250ms; --dur-lenta: 400ms;
  --ease-salida: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-entrada: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-estandar: cubic-bezier(0.4, 0, 0.2, 1);
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --color-fondo: #0F1420; --color-superficie: #171D2B; --color-superficie-alta: #1E2636;
  --color-borde: #2A3242; --color-texto: #E6E9EF; --color-texto-suave: #9AA3B2;
  --color-primario: #6F9BFF; --color-primario-texto: #0F1420;
  --color-exito: #4CC9A4; --color-aviso: #F79009; --color-error: #F97066; --color-info: #6F9BFF;
} }
:root[data-theme="dark"] { /* repite aquí el mismo bloque oscuro para el interruptor manual */ }
body { background: var(--color-fondo); color: var(--color-texto); font-family: var(--fuente-texto); line-height: 1.5; }
.tarjeta { background: var(--color-superficie); border: 1px solid var(--color-borde); border-radius: var(--radio-m); box-shadow: var(--sombra-1); padding: var(--esp-4); }
.aparece { animation: aparecer var(--dur-media) var(--ease-salida) both; }
@keyframes aparecer { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .aparece { animation: none; } *, *::before, *::after { transition-duration: 0.01ms !important; } }
```

Entrada escalonada y micro-interacción spring con anime.js v4 (ESM desde cdnjs):

```html
<script type="module">
  import { animate, stagger, spring } from 'https://cdnjs.cloudflare.com/ajax/libs/animejs/4.5.0/anime.esm.min.js';
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!sinMovimiento) {
    animate('.lista .item', { opacity: [0, 1], y: [12, 0], duration: 260, ease: 'outCubic', delay: stagger(40) });
    document.querySelector('.boton-like').addEventListener('click', (e) => {
      animate(e.currentTarget, { scale: [1, 1.15, 1], duration: 400, ease: spring({ bounce: 0.35 }) });
    });
  }
</script>
```

Ilustración Lottie con `lottie-web` 5.13.0 (pausa cuando no está en pantalla):

```html
<div id="avatar-saludo" style="width:160px;height:160px" aria-hidden="true"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.13.0/lottie.min.js"></script>
<script>
  const anim = lottie.loadAnimation({ container: document.getElementById('avatar-saludo'),
    renderer: 'svg', loop: true, autoplay: !matchMedia('(prefers-reduced-motion: reduce)').matches, path: '/anim/saludo.json' });
  new IntersectionObserver(([e]) => e.isIntersecting ? anim.play() : anim.pause()).observe(anim.wrapper);
</script>
```

## Aprendido en la demo Robo (10-10-2026)

- Un modelo de difusión local no escribe texto legible: sd-turbo produjo letras inventadas en el flyer. La tipografía (etiqueta, título con sombra, chips de fecha, hora y lugar, descripción, pie e insignia de precio) la compone Pillow a 1080x1350 sobre un fondo que el modelo pinta "sin letras ni pantallas". Los datos los extrae el LLM local (`qwen3:1.7b`) en JSON y un regex manda sobre fecha, hora y precio porque el modelo pequeño a veces los altera; también inventó "PHP para Dummies" hasta que la instrucción prohibió marcas y apodos. Detalle y fragmentos en `imagenes-locales`.
- Los modelos FLUX obedecen tanto el prompt positivo que "código brillante" produce letras. Pide objetos, luces y formas; nunca cosas que lleven texto (pantallas, carteles, pizarras).
- Pillow `ImageDraw` no mezcla alfa al dibujar sobre RGBA: un chip con relleno `(255, 255, 255, 22)` sale blanco opaco. Dos salidas: color sólido mezclado a mano (`base * 0.78 + blanco * 0.22`) o una capa aparte con `Image.alpha_composite`. El fragmento está en `imagenes-locales`.
- La jerarquía del flyer se sostuvo con el mismo sistema de este skill: un acento por estilo (profesional, kawaii, técnico), panel inferior oscuro y desenfocado para que el texto siempre se lea, un solo título y chips para los datos duros.

## Versión corta para modelos pequeños

Sigue estas órdenes al pie de la letra:

1. Escribe todos los colores, tamaños y sombras como variables CSS en `:root`. No repitas valores sueltos.
2. Usa UN color primario, UN acento y cuatro semánticos: éxito, aviso, error, info.
3. Define los mismos tokens para modo oscuro dentro de `@media (prefers-color-scheme: dark)`.
4. Texto de cuerpo: 16 px, interlineado 1.5. Títulos: peso 600 o 700.
5. Espacios: 4, 8, 12, 16, 24, 32, 48, 64 px. Ningún otro.
6. Radios: 6, 12 o 20 px. Botones redondos: 999 px.
7. Sombras suaves, dos capas, opacidad menor a 0.12. Nunca sombra negra dura.
8. Paleta kawaii: fondo `#FDF8FF`, texto `#2B2440`, lila `#B9A7F5`, rosa `#FFC9DE`, menta `#BDEBD9`. Texto siempre oscuro sobre pastel.
9. Paleta sobria: fondo `#F6F7F9`, texto `#1A1F2B`, azul `#1F4FBF`, borde `#DDE1E7`.
10. Entradas: 250 ms, `cubic-bezier(0.16, 1, 0.3, 1)`. Salidas: 180 ms, `cubic-bezier(0.7, 0, 0.84, 0)`.
11. Anima SOLO `transform` y `opacity`.
12. Toda animación va dentro de `@media (prefers-reduced-motion: no-preference)`.
13. Para secuencias usa anime.js 4.5.0 desde cdnjs, importa `animate` y `stagger`, y el parámetro se llama `ease`.
14. Prohibido: `alert`, `confirm`, `prompt`, parallax, más de dos colores de acento, texto blanco sobre pastel.
15. Al terminar, comprueba el contraste del texto: mínimo 4.5:1.
