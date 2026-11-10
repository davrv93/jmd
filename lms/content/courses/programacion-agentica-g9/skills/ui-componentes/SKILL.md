---
name: ui-componentes
description: Construye o revisa componentes de interfaz con todos sus estados: botón, campo, tarjeta, modal, toast, barra de estado, chat (burbujas e indicador de escribiendo) y panel lateral; estados reposo/hover/foco/activo/deshabilitado/cargando/error/vacío, foco visible y diálogos propios en vez de nativos. Úsalo cuando pidan "botón", "formulario", "input", "modal", "diálogo", "toast", "notificación", "tarjeta", "card", "chat", "burbuja", "sidebar", "drawer", "componente" o "¿qué componente uso para…?".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Componentes de interfaz: anatomía y estados

## Cuándo usar

- Al crear cualquier control interactivo desde cero o al revisar uno que "a veces no responde".
- Cuando hay que elegir entre modal, panel lateral, toast o página nueva para una acción.
- Al construir la ventana de chat de un asistente o avatar (burbujas, entrada, indicador de escribiendo).
- Al sustituir `alert`, `confirm` o `prompt` por diálogos propios.
- No lo uses para decidir colores y sombras (`diseno-visual`) ni el orden de los pasos de un flujo (`ux-flujos`).

## Principios (máximo 7)

1. **Un componente no existe hasta que tiene todos sus estados.** Reposo, hover, foco, activo, deshabilitado, cargando, error y vacío. Si falta uno, el usuario lo encontrará.
2. **HTML semántico primero.** `<button>`, `<input>`, `<dialog>`, `<nav>`, `<table>`. Un `div` con `onclick` no es un botón: no recibe foco ni Enter.
3. **El foco siempre se ve.** Un anillo de 2 px con 2 px de separación, visible sobre cualquier fondo. Nunca `outline: none` sin reemplazo.
4. **Una acción primaria por vista.** Un botón relleno manda; los demás son secundarios (borde) o terciarios (texto).
5. **El sistema confirma lo que hizo.** Cada acción deja rastro: el botón muestra carga, luego un toast o un cambio visible.
6. **Los diálogos son propios.** Nativos nunca: no se pueden estilar ni leer bien en móvil, y rompen el flujo del asistente.
7. **Los componentes se componen, no se clonan.** La tarjeta de cliente y la de producto son la misma tarjeta con distintos huecos.

## Procedimiento paso a paso

1. Identifica la intención: ¿leer, elegir, escribir, confirmar, avisar o navegar? Consulta la tabla "Qué componente para qué" y elige uno.
2. Escribe el HTML semántico base sin clases. Comprueba que funciona con teclado (Tab, Enter, Espacio, Escape) antes de estilar.
3. Dibuja la anatomía: contenedor, icono opcional, etiqueta, ayuda, mensaje de error. Nombra cada parte con una clase (`.campo__etiqueta`, `.campo__ayuda`).
4. Define los ocho estados en CSS con tokens del `diseno-visual`. Usa `:hover`, `:focus-visible`, `:active`, `:disabled`, `[aria-busy="true"]`, `[aria-invalid="true"]` y una clase `.vacio`.
5. Para el estado cargando: deshabilita el control, cambia el texto a un verbo en gerundio ("Guardando…") y muestra un indicador. Nunca dejes el botón igual mientras espera.
6. Para el estado error: borde `--color-error`, icono y texto del error debajo del campo, enlazado con `aria-describedby`. Explica cómo arreglarlo, no sólo que está mal.
7. Para el estado vacío: ilustración ligera o icono, una frase de qué va aquí y el botón para crear el primer elemento.
8. Si es un diálogo: usa `<dialog>` con `showModal()`, cortina, cierre con Escape y botón visible, foco al primer control al abrir y de vuelta al disparador al cerrar.
9. Si es chat: lista con `role="log"` y `aria-live="polite"`, burbujas con autor y hora, indicador de escribiendo con tres puntos animados y texto alternativo "El asistente está escribiendo".
10. Prueba: teclado solo, lector de pantalla si está disponible, 393 px de ancho, y los ocho estados visibles a la vez en una página de muestra.

## Qué componente para qué

| Necesidad | Usa | No uses |
|---|---|---|
| Ejecutar una acción | Botón (`<button>`) | Enlace con `onclick` |
| Ir a otra página | Enlace (`<a href>`) | Botón que navega |
| Escribir un dato corto | Campo de texto con etiqueta visible | Placeholder como etiqueta |
| Elegir una opción de 2–5 | Botones segmentados o radios | Desplegable |
| Elegir una de 6+ | Desplegable o buscador con lista | Radios interminables |
| Activar o desactivar | Interruptor (toggle) con efecto inmediato | Casilla que requiere "Guardar" |
| Confirmar algo peligroso | Modal de confirmación con verbo claro ("Eliminar") | `confirm()` nativo, toast |
| Pedir un dato para seguir | Modal pequeño con un campo | `prompt()` nativo |
| Avisar que algo salió bien | Toast de 4–6 s, cerrable | Modal, `alert()` |
| Avisar un error de sistema | Barra de estado persistente o toast con acción "Reintentar" | Toast que desaparece en 3 s |
| Editar un registro sin salir de la lista | Panel lateral (drawer) | Modal gigante |
| Crear algo con más de 6 campos | Página propia o panel lateral ancho | Modal |
| Mostrar un resumen con acciones | Tarjeta | Tabla de una fila |
| Comparar muchos registros | Tabla con orden y filtro | Lista de tarjetas |
| Conversar con el asistente | Chat con burbujas y entrada fija | Formulario tradicional |

## Anatomía y estados por componente

**Botón.** Partes: contenedor, icono opcional (izquierda), etiqueta, indicador de carga. Variantes: primario (relleno), secundario (borde), terciario (texto), peligro. Altura 40–44 px, padding 10/16 px. Estados: hover oscurece el fondo un 8 %, activo lo oscurece un 12 % y baja `transform: scale(0.98)`, foco anillo, deshabilitado opacidad 0.5 y `cursor: not-allowed`, cargando icono giratorio y texto en gerundio, el ancho no cambia.

**Campo.** Partes: etiqueta siempre visible encima, campo, texto de ayuda debajo, mensaje de error que sustituye a la ayuda, icono de estado opcional. El placeholder es un ejemplo ("12345678"), nunca la etiqueta. Estados: reposo borde `--color-borde`, hover borde más oscuro, foco borde primario y anillo, error borde `--color-error` con texto, deshabilitado fondo `--color-fondo`, lectura (`readonly`) sin borde con fondo plano.

**Tarjeta.** Partes: cabecera (título, meta), cuerpo, pie con acciones. Padding 16 px, radio `--radio-m`, elevación 1. Si toda la tarjeta es clicable, el enlace envuelve el título y el área extendida se hace con `::after`; las acciones del pie quedan fuera del enlace. Estados: hover sube a elevación 2 sólo si es clicable; cargando muestra esqueleto con la misma altura; vacío muestra icono y frase.

**Modal.** Partes: cortina, caja (ancho máximo 480 px para confirmaciones, 720 px para formularios), título H2, cuerpo, pie con botones alineados a la derecha (cancelar a la izquierda del primario). En móvil ocupa el ancho completo y se pega al fondo como hoja. Cierra con Escape, con el botón "Cancelar" y con la X; no cierra al tocar la cortina si hay datos sin guardar. Nunca más de un modal abierto.

**Toast.** Partes: icono semántico, texto de una o dos líneas, acción opcional ("Deshacer"), botón de cierre. Posición: abajo centro en móvil, abajo derecha en escritorio. Duración 4 s informativo, 6 s con acción, persistente para errores que requieren decisión. Máximo tres apilados; el más antiguo se va. Región `aria-live="polite"`; errores con `role="alert"`.

**Barra de estado.** Franja fija arriba del contenido (no sobre la cabecera) para estados globales: sin conexión, modo demo, sincronizando, versión nueva disponible. Un color semántico, un texto, una acción. Desaparece sola cuando el estado termina.

**Chat.** Partes: lista de mensajes (`role="log"`), burbuja (autor, texto, hora, estado enviado/fallido), indicador de escribiendo, entrada fija abajo con botón de enviar y micrófono, sugerencias rápidas opcionales. Burbujas del usuario a la derecha con `--color-primario`; del asistente a la izquierda con `--color-superficie`. Ancho máximo de burbuja 75 %. Enter envía, Shift+Enter salta de línea. Si falla el envío, la burbuja muestra "No se envió. Reintentar". El scroll baja solo únicamente si el usuario ya estaba al fondo.

**Panel lateral (drawer).** Ancho 360–480 px desde la derecha en escritorio; ancho completo en móvil. Cabecera con título y cierre, cuerpo con scroll propio, pie con acciones pegado abajo. Al abrir, foco al título; al cerrar, foco al disparador. Cortina ligera. Escape cierra.

## Reglas duras (lo que nunca)

- Nunca `window.alert`, `window.confirm`, `window.prompt`. Siempre `<dialog>` propio o un componente del sistema.
- Nunca `outline: none` sin un `:focus-visible` que ponga un anillo igual o más visible.
- Nunca un `div` o `span` clicable sin `role`, `tabindex="0"` y manejo de Enter/Espacio. Mejor: usa `<button>`.
- Nunca placeholder como única etiqueta de un campo.
- Nunca un botón que cambie de ancho al pasar a "cargando" ni que siga clicable mientras carga.
- Nunca más de un botón primario relleno por vista.
- Nunca deshabilites el botón de envío hasta que el formulario sea válido sin decir qué falta: muestra los errores al intentar enviar.
- Nunca un modal dentro de otro modal. Si hace falta, el segundo paso sustituye al primero dentro del mismo diálogo.
- Nunca un toast para errores que exigen decisión: se va antes de que el usuario lo lea.
- Nunca iconos sin texto en acciones destructivas. "Eliminar" se escribe.
- Nunca scroll automático del chat que arranque al usuario de un mensaje antiguo que estaba leyendo.

## Lista de comprobación

- [ ] Cada control interactivo es un elemento semántico (`button`, `a`, `input`, `select`, `dialog`).
- [ ] Los ocho estados existen y se ven en una página de muestra: reposo, hover, foco, activo, deshabilitado, cargando, error, vacío.
- [ ] El anillo de foco mide 2 px, tiene 2 px de separación y contrasta 3:1 con el fondo.
- [ ] Hay un solo botón primario por vista.
- [ ] Los campos tienen etiqueta visible, ayuda y error enlazados con `aria-describedby`.
- [ ] El botón en carga no cambia de ancho, se deshabilita y muestra texto en gerundio.
- [ ] Los modales usan `<dialog>`, cierran con Escape y devuelven el foco al disparador.
- [ ] Los toasts viven en una región `aria-live`, duran 4–6 s y los de error exigen cierre manual.
- [ ] El chat tiene `role="log"`, indicador de escribiendo con texto alternativo y reintento por mensaje.
- [ ] Los paneles laterales ocupan el ancho completo en móvil y tienen el pie de acciones siempre visible.
- [ ] No hay `alert`, `confirm` ni `prompt` en el código (`grep -rn "alert(\|confirm(\|prompt(" src/`).
- [ ] Todo funciona sólo con teclado y a 393 px.

## Fragmentos

Botón con los estados principales y foco visible:

```css
.boton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 10px 16px;
  border: 1px solid transparent; border-radius: var(--radio-m, 12px); font: inherit; font-weight: 600; cursor: pointer;
  background: var(--color-primario); color: var(--color-primario-texto); transition: filter 150ms, transform 150ms; }
.boton:hover { filter: brightness(0.92); }
.boton:active { filter: brightness(0.88); transform: scale(0.98); }
.boton:focus-visible { outline: 2px solid var(--color-primario); outline-offset: 2px; }
.boton:disabled, .boton[aria-busy="true"] { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
.boton[aria-busy="true"] .boton__texto { visibility: hidden; }        /* conserva el ancho */
.boton[aria-busy="true"]::after { content: ""; position: absolute; width: 18px; height: 18px; border: 2px solid currentColor;
  border-right-color: transparent; border-radius: 50%; animation: girar 0.8s linear infinite; }
.boton { position: relative; }
.boton--secundario { background: transparent; color: var(--color-primario); border-color: var(--color-borde); }
.boton--peligro { background: var(--color-error); color: #fff; }
@keyframes girar { to { transform: rotate(1turn); } }
@media (prefers-reduced-motion: reduce) { .boton { transition: none; } .boton[aria-busy="true"]::after { animation-duration: 2s; } }
```

Diálogo de confirmación propio que devuelve una promesa (sustituye a `confirm()`):

```html
<dialog id="dlg-confirmar" class="dialogo">
  <form method="dialog">
    <h2 id="dlg-titulo" class="dialogo__titulo"></h2>
    <p id="dlg-texto" class="dialogo__texto"></p>
    <div class="dialogo__acciones">
      <button value="no" class="boton boton--secundario">Cancelar</button>
      <button value="si" id="dlg-ok" class="boton boton--peligro"></button>
    </div>
  </form>
</dialog>
<script>
  function confirmar({ titulo, texto, accion = 'Confirmar' }) {
    const d = document.getElementById('dlg-confirmar');
    d.querySelector('#dlg-titulo').textContent = titulo;
    d.querySelector('#dlg-texto').textContent = texto;
    d.querySelector('#dlg-ok').textContent = accion;
    const disparador = document.activeElement;
    d.showModal();
    return new Promise((res) => d.addEventListener('close', () => { disparador?.focus(); res(d.returnValue === 'si'); }, { once: true }));
  }
  // uso: if (await confirmar({ titulo: '¿Eliminar la partida?', texto: 'No se puede deshacer.', accion: 'Eliminar' })) { ... }
</script>
```

Chat: burbujas, indicador de escribiendo y región viva.

```html
<section class="chat">
  <ol class="chat__lista" role="log" aria-live="polite" aria-relevant="additions">
    <li class="burbuja burbuja--usuario"><p>¿Cuánto llevo de avance en la torre B?</p><time>10:42</time></li>
    <li class="burbuja burbuja--asistente"><p>Llevas 82 % en cimentación y 40 % en estructura.</p><time>10:42</time></li>
    <li class="burbuja burbuja--asistente escribiendo" aria-label="El asistente está escribiendo"><span></span><span></span><span></span></li>
  </ol>
  <form class="chat__entrada">
    <label for="msg" class="visualmente-oculto">Escribe tu mensaje</label>
    <textarea id="msg" rows="1" placeholder="Escribe o toca el micrófono"></textarea>
    <button type="button" class="boton boton--secundario" aria-label="Hablar">Mic</button>
    <button type="submit" class="boton">Enviar</button>
  </form>
</section>
<style>
  .chat__lista { list-style: none; margin: 0; padding: 16px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
  .burbuja { max-width: 75%; padding: 10px 14px; border-radius: 16px; background: var(--color-superficie); border: 1px solid var(--color-borde); }
  .burbuja--usuario { align-self: flex-end; background: var(--color-primario); color: var(--color-primario-texto); border: 0; }
  .burbuja time { display: block; font-size: 0.75rem; opacity: 0.7; margin-top: 4px; }
  .escribiendo span { display: inline-block; width: 6px; height: 6px; margin: 0 2px; border-radius: 50%; background: currentColor; animation: punto 1.2s infinite; }
  .escribiendo span:nth-child(2) { animation-delay: 0.2s; } .escribiendo span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes punto { 0%, 60%, 100% { opacity: 0.3; transform: none; } 30% { opacity: 1; transform: translateY(-3px); } }
  @media (prefers-reduced-motion: reduce) { .escribiendo span { animation: none; opacity: 0.6; } }
  .chat__entrada { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--color-borde); position: sticky; bottom: 0; background: var(--color-superficie); padding-bottom: calc(12px + env(safe-area-inset-bottom)); }
  .chat__entrada textarea { flex: 1; min-height: 44px; resize: none; font: inherit; border-radius: 12px; border: 1px solid var(--color-borde); padding: 10px 12px; }
  .visualmente-oculto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
```

## Versión corta para modelos pequeños

Sigue estas órdenes al pie de la letra:

1. Para acciones usa `<button>`. Para ir a otra página usa `<a href>`. Nunca `div` con `onclick`.
2. Cada botón tiene estos estados en CSS: `:hover`, `:focus-visible`, `:active`, `:disabled`, `[aria-busy="true"]`.
3. Foco: `outline: 2px solid var(--color-primario); outline-offset: 2px;`. Nunca `outline: none`.
4. Botones miden al menos 44 px de alto. Un solo botón relleno (primario) por pantalla.
5. Mientras carga: deshabilita el botón, escribe "Guardando…" y no cambies su ancho.
6. Campos: etiqueta visible con `<label for>`. El placeholder es un ejemplo, no la etiqueta.
7. Error en campo: borde rojo, texto debajo que dice cómo arreglarlo, `aria-invalid="true"`.
8. Lista vacía: icono, una frase y un botón para crear el primer elemento.
9. Confirmar o pedir un dato: usa `<dialog>` con `showModal()`. Prohibido `alert`, `confirm`, `prompt`.
10. Modal: Escape cierra, hay botón Cancelar, el foco vuelve al botón que lo abrió.
11. Toast: aparece abajo, dura 4 s, se puede cerrar, va en un contenedor con `aria-live="polite"`. Errores graves no usan toast.
12. Chat: lista con `role="log" aria-live="polite"`, burbujas del usuario a la derecha, indicador de tres puntos con `aria-label="El asistente está escribiendo"`.
13. Panel lateral: ancho completo en móvil, cierra con Escape, botones de acción siempre visibles abajo.
14. Prueba todo con la tecla Tab y a 393 px de ancho antes de entregar.
