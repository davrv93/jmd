---
name: accesibilidad
description: Aplica WCAG 2.2 nivel AA de forma práctica a una pantalla, componente o asistente con voz: contraste 4.5:1 y 3:1, foco visible y orden de tabulación, ARIA solo cuando el HTML semántico no basta, prefers-reduced-motion obligatorio, subtítulos de todo lo que dice el avatar, texto mínimo de 16 px en móvil, lectores de pantalla y regiones vivas para chat, y herramientas (axe DevTools, Lighthouse, Polypane, WhoCanUse). Úsalo cuando pidan "accesibilidad", "a11y", "WCAG", "contraste", "lector de pantalla", "teclado", "aria", "subtítulos", "daltonismo", "reduced motion" o "que lo pueda usar todo el mundo".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Accesibilidad: WCAG 2.2 AA en la práctica

## Cuándo usar

- Antes de dar por terminada cualquier pantalla, componente o conversación de avatar.
- Al elegir colores, al escribir una animación, al construir un formulario o un chat.
- Cuando el usuario menciona personas mayores, baja visión, daltonismo, motricidad reducida, sordera o uso sólo con teclado.
- Al revisar una interfaz heredada que "funciona pero nadie la probó con teclado".
- Siempre que haya voz sintetizada: lo hablado debe existir también como texto.

## Principios (máximo 7)

1. **Perceptible.** Todo lo que se ve se puede leer (contraste, tamaño) y todo lo que se oye se puede leer (subtítulos, transcripción).
2. **Operable con teclado.** Cualquier cosa que se hace con el ratón o el dedo se hace con Tab, Enter, Espacio, flechas y Escape, en un orden lógico y con foco visible.
3. **Semántica antes que ARIA.** `<button>`, `<nav>`, `<main>`, `<label>`, `<table>` ya traen accesibilidad. ARIA se añade sólo para lo que el HTML no puede expresar; ARIA mal puesto es peor que ninguno.
4. **El movimiento se puede apagar.** `prefers-reduced-motion` no es opcional: toda animación tiene una versión reducida o nula.
5. **El color nunca es el único canal.** Un estado se indica con color más icono, texto o patrón.
6. **El lector de pantalla recibe lo mismo que el ojo.** Los cambios dinámicos (mensajes de chat, toasts, errores) se anuncian con regiones vivas.
7. **Se mide, no se supone.** Contraste con herramienta, teclado con las manos, lector con NVDA o VoiceOver, y una pasada de axe y Lighthouse.

## Procedimiento paso a paso

1. Estructura: una sola `<h1>`, jerarquía de encabezados sin saltos, regiones `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`. Añade un enlace "Saltar al contenido" como primer elemento enfocable.
2. Idioma: `<html lang="es">` (o `es-PE`). Si hay fragmentos en otro idioma, `lang` en el elemento.
3. Contraste: texto normal 4.5:1; texto grande (24 px, o 19 px en negrita) 3:1; bordes de campos, iconos informativos y anillos de foco 3:1 contra el fondo adyacente. Mide con Polypane Color Contrast Checker (`https://polypane.app/color-contrast/`) o WhoCanUse (`https://www.whocanuse.com/`), que además simula daltonismo y baja visión.
4. Tamaño: texto de lectura 16 px mínimo en móvil, nunca en `px` fijos sino en `rem`. Permite zoom hasta 200 % sin pérdida de contenido ni scroll horizontal. Zona táctil 24 por 24 px mínimo según WCAG 2.2 (criterio 2.5.8); el objetivo recomendado es 44 px.
5. Teclado: recorre toda la pantalla con Tab. El orden sigue la lectura visual. Nada queda atrapado (modal sin salida) ni se salta. Los elementos personalizados responden a Enter y Espacio; los menús y pestañas a flechas.
6. Foco visible (criterio 2.4.11): anillo de 2 px como mínimo, 3:1 de contraste, nunca oculto por cabeceras fijas. Al abrir un modal, el foco entra; al cerrarlo, vuelve al disparador. Nunca `outline: none` sin reemplazo.
7. Formularios: cada campo con `<label for>` visible; ayuda y error enlazados con `aria-describedby`; `aria-invalid="true"` al fallar; el error se anuncia. Autocompletado con `autocomplete`. No pidas reescribir lo que ya se escribió (criterio 3.3.7).
8. Imágenes: `alt` que describe la función; `alt=""` si es decorativa. Iconos sin texto llevan `aria-label` en el botón, no en el SVG.
9. ARIA mínima y correcta: `aria-expanded` en desplegables, `aria-current="page"` en navegación, `role="dialog"` sólo si no usas `<dialog>`, `aria-live` para contenido dinámico. Nada de `role="button"` en un `div` si puedes usar `<button>`.
10. Movimiento: envuelve toda animación en `@media (prefers-reduced-motion: no-preference)` o anúlala en `reduce`. Nada parpadea más de 3 veces por segundo. El autoplay se puede pausar.
11. Voz y avatar: cada frase hablada aparece como texto en el mismo instante (subtítulo o burbuja), con el nombre del hablante. El vídeo o animación del avatar no sustituye al texto. El micrófono muestra la transcripción. Hay un control para silenciar la voz y seguir en texto.
12. Chat: la lista de mensajes es `role="log"` con `aria-live="polite"`; los errores de envío usan `role="alert"`; el indicador de escribiendo tiene texto alternativo; el foco no salta solo a cada mensaje nuevo.
13. Herramientas: ejecuta axe DevTools (extensión de Chrome/Firefox o `axe-core` 4.12.1 desde cdnjs en una página de pruebas) y Lighthouse (pestaña de DevTools, categoría Accesibilidad). Corrige todo lo crítico y serio. Las herramientas detectan cerca del 30–40 % de los problemas: el resto lo encuentra el recorrido manual con teclado y lector.
14. Lector de pantalla: una pasada con VoiceOver (macOS/iOS: Cmd+F5) o NVDA (Windows, gratuito). Escucha si cada control se anuncia con nombre, rol y estado.
15. Pasa la lista de comprobación de 15 puntos. Lo que no se marca, no se entrega.

## Contraste: referencia rápida

| Elemento | Mínimo AA | Nota |
|---|---|---|
| Texto normal (menos de 24 px) | 4.5:1 | Incluye placeholders si se usan como ayuda |
| Texto grande (24 px, o 19 px negrita) | 3:1 | |
| Iconos informativos, bordes de campo, anillo de foco | 3:1 | Contra el fondo adyacente |
| Texto deshabilitado, logotipos, decoración | sin requisito | Pero no lo uses para información |
| Texto sobre imagen o degradado | 4.5:1 en el punto más claro | Añade una capa oscura o un fondo sólido detrás |

Ejemplos verificados: `#1F4FBF` sobre blanco 7.1:1; `#6B4FD8` sobre blanco 5.6:1; `#2B2440` sobre lila `#B9A7F5` 6.9:1; blanco sobre lila `#B9A7F5` 2.1:1 (falla). Gris `#9AA3B2` sobre blanco falla para texto (3.1:1): sólo sirve para bordes.

## Herramientas

- **axe DevTools** (extensión) o `axe-core` por CDN: `https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.12.1/axe.min.js`, luego `axe.run().then(r => console.table(r.violations))`.
- **Lighthouse**: Chrome DevTools, pestaña Lighthouse, marca sólo "Accessibility" y modo móvil. Puntaje menor a 95 significa trabajo pendiente.
- **Polypane Color Contrast Checker**: comprueba pares de colores con WCAG 2 y APCA y propone el ajuste mínimo para aprobar.
- **WhoCanUse**: muestra cómo ve el par de colores cada tipo de daltonismo y baja visión, y a cuánta población afecta.
- **Chrome DevTools, panel Rendering**: emula `prefers-reduced-motion` y `prefers-color-scheme` sin tocar el sistema; pestaña Accessibility del inspector muestra el árbol que recibe el lector.
- **Teclado**: Tab, Shift+Tab, Enter, Espacio, Escape, flechas. Sin ratón durante cinco minutos.

## Reglas duras (lo que nunca)

- Nunca `outline: none` sin un `:focus-visible` igual o más visible.
- Nunca una animación sin alternativa bajo `prefers-reduced-motion: reduce`.
- Nunca una frase hablada por el avatar sin su texto visible en pantalla al mismo tiempo.
- Nunca texto de lectura menor a 16 px en móvil ni en `px` fijos.
- Nunca `user-scalable=no` ni `maximum-scale` menor a 5 en el viewport.
- Nunca color como único indicador de estado (rojo sin icono ni texto).
- Nunca `div` o `span` clicable sin rol, foco y teclado; usa `<button>`.
- Nunca placeholder como única etiqueta.
- Nunca `aria-label` que contradiga el texto visible (el lector dice una cosa y el ojo otra).
- Nunca `aria-live="assertive"` para contenido normal: sólo errores que bloquean.
- Nunca un modal que no se cierre con Escape ni que deje el foco atrapado al cerrar.
- Nunca `tabindex` mayor a 0.
- Nunca autoplay de audio. El avatar habla cuando el usuario lo pidió o respondió.

## Lista de comprobación (15 puntos)

- [ ] 1. `<html lang="es">`, una sola `<h1>`, encabezados sin saltos y regiones semánticas.
- [ ] 2. Enlace "Saltar al contenido" como primer elemento enfocable.
- [ ] 3. Todo texto normal contrasta 4.5:1 y el grande 3:1, medido con herramienta.
- [ ] 4. Bordes de campos, iconos informativos y anillo de foco contrastan 3:1.
- [ ] 5. Texto de lectura 16 px o más en `rem`; zoom al 200 % sin scroll horizontal.
- [ ] 6. Toda la pantalla se opera con teclado en orden lógico; nada queda atrapado.
- [ ] 7. El foco es visible siempre (2 px, 3:1) y vuelve al disparador al cerrar modales.
- [ ] 8. Cada campo tiene `<label>` visible; ayuda y error con `aria-describedby`; `aria-invalid` al fallar.
- [ ] 9. Toda imagen tiene `alt` útil o `alt=""`; botones de icono tienen `aria-label`.
- [ ] 10. ARIA sólo donde el HTML no basta, y correcta (`aria-expanded`, `aria-current`, `aria-live`).
- [ ] 11. Toda animación respeta `prefers-reduced-motion`; nada parpadea más de 3 veces por segundo.
- [ ] 12. Todo lo que el avatar dice por voz aparece como texto en el mismo momento, con control para silenciar.
- [ ] 13. El chat usa `role="log"` + `aria-live="polite"`; errores con `role="alert"`; el foco no salta solo.
- [ ] 14. Ningún estado se indica sólo con color.
- [ ] 15. axe sin violaciones críticas o serias, Lighthouse Accesibilidad 95 o más, y una pasada manual con VoiceOver o NVDA.

## Fragmentos

Foco visible, salto al contenido y reducción de movimiento global:

```css
:focus-visible { outline: 2px solid var(--color-primario, #1F4FBF); outline-offset: 2px; border-radius: 4px; }
:focus:not(:focus-visible) { outline: none; }  /* el ratón no muestra anillo; el teclado sí */
.saltar { position: absolute; left: 16px; top: -100px; padding: 8px 12px; background: var(--color-superficie, #fff); border: 2px solid currentColor; z-index: 1000; }
.saltar:focus { top: 16px; }
.visualmente-oculto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

```html
<a class="saltar" href="#contenido">Saltar al contenido</a>
<main id="contenido" tabindex="-1">…</main>
```

Campo accesible con ayuda y error anunciados:

```html
<div class="campo">
  <label for="dni">DNI</label>
  <input id="dni" name="dni" inputmode="numeric" autocomplete="off" maxlength="8"
         aria-describedby="dni-ayuda dni-error" aria-invalid="true">
  <p id="dni-ayuda" class="campo__ayuda">Ocho dígitos, sin puntos. Ejemplo: 12345678</p>
  <p id="dni-error" class="campo__error" role="alert">El DNI tiene 7 dígitos; debe tener 8.</p>
</div>
```

Chat con subtítulos del avatar: la voz y el texto salen juntos, y hay control para silenciar.

```html
<ol class="chat__lista" role="log" aria-live="polite" aria-relevant="additions"></ol>
<button id="silencio" type="button" aria-pressed="false">Silenciar voz</button>
<script>
  const lista = document.querySelector('.chat__lista');
  const btnSilencio = document.getElementById('silencio');
  let vozActiva = true;
  btnSilencio.addEventListener('click', () => { vozActiva = !vozActiva; btnSilencio.setAttribute('aria-pressed', String(!vozActiva)); speechSynthesis.cancel(); });

  function hablaAvatar(texto) {
    const li = document.createElement('li');                       // 1. el texto aparece SIEMPRE, antes de la voz
    li.className = 'burbuja burbuja--asistente';
    li.innerHTML = `<span class="visualmente-oculto">Asistente dice:</span><p></p>`;
    li.querySelector('p').textContent = texto;
    const alFondo = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
    lista.appendChild(li);
    if (alFondo) li.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (vozActiva && 'speechSynthesis' in window) {                // 2. la voz es un extra, nunca el único canal
      const u = new SpeechSynthesisUtterance(texto); u.lang = 'es-PE'; speechSynthesis.speak(u);
    }
  }
</script>
```

Pasada rápida con axe-core en la consola de una página de pruebas:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.12.1/axe.min.js"></script>
<script>
  axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })
     .then(r => console.table(r.violations.map(v => ({ id: v.id, impacto: v.impact, nodos: v.nodes.length, ayuda: v.help }))));
</script>
```

## Versión corta para modelos pequeños

Sigue estas órdenes al pie de la letra:

1. Pon `<html lang="es">`. Una sola `<h1>`. Encabezados en orden: h1, h2, h3.
2. Usa `<button>` para acciones, `<a href>` para enlaces, `<label for>` para cada campo. Nunca `div` clicable.
3. Texto normal: contraste 4.5:1 con el fondo. Texto grande, bordes e iconos: 3:1. Mídelo; no lo adivines.
4. Texto de lectura: mínimo 16 px, escrito como `1rem`.
5. Foco visible: `:focus-visible { outline: 2px solid #1F4FBF; outline-offset: 2px; }`. Nunca `outline: none` solo.
6. Recorre la pantalla con Tab. Todo debe alcanzarse en orden y nada debe quedar atrapado.
7. Modal: Escape cierra y el foco vuelve al botón que lo abrió.
8. Cada imagen tiene `alt`. Si es decorativa, `alt=""`. Botones de solo icono llevan `aria-label`.
9. Errores de campo: `aria-invalid="true"` y texto del error unido con `aria-describedby`.
10. Toda animación va dentro de `@media (prefers-reduced-motion: no-preference)`.
11. Todo lo que el avatar dice por voz se escribe también en pantalla, al mismo tiempo. Pon un botón "Silenciar voz".
12. Chat: la lista tiene `role="log" aria-live="polite"`. Errores con `role="alert"`.
13. Nunca indiques un estado solo con color: añade icono o texto.
14. Nunca `user-scalable=no` en el viewport. Nunca `tabindex` mayor a 0. Nunca autoplay de audio.
15. Antes de entregar: corre axe DevTools y Lighthouse (Accesibilidad 95 o más) y navega una vez solo con teclado.
