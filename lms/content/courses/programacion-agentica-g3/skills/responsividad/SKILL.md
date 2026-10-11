---
name: responsividad
description: Haz que una pantalla web funcione en teléfono, tableta y escritorio con enfoque móvil primero: puntos de corte (360/393/768/1024/1440), unidades fluidas con clamp(), container queries, grid auto-fit, tipografía fluida, imágenes srcset, zonas táctiles de 44 px y prueba a 393 px en Chrome. Úsalo cuando pidan "responsive", "adaptable", "que se vea bien en el celular", "móvil", "tablet", "se corta en el teléfono", "scroll horizontal" o "breakpoints".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Responsividad: móvil primero

## Cuándo usar

- Al maquetar cualquier pantalla nueva: el primer CSS que escribes es el del teléfono.
- Cuando el usuario dice "en mi celular se ve mal", "aparece una barra horizontal" o "los botones están muy juntos".
- Al convertir una tabla, un panel de administración o un formulario de escritorio para que funcione en 360–393 px.
- Al revisar un componente que se usará en varios contenedores de distinto ancho (tarjeta en columna lateral y en el área principal).
- No lo uses para decidir colores o animaciones (`diseno-visual`) ni para el contenido de los estados vacíos (`ux-flujos`).

## Principios (máximo 7)

1. **El teléfono es el diseño base.** Los puntos de corte añaden espacio; nunca "arreglan" el móvil al final.
2. **Fluido antes que escalonado.** `clamp()`, `%`, `fr`, `min()` y `auto-fit` resuelven el 80 % sin una sola media query.
3. **El contenedor manda, no la ventana.** Un componente se adapta a su caja (`@container`), porque la misma tarjeta vive en anchos distintos.
4. **Nada se corta y nada desborda.** Prohibido el scroll horizontal de página. Si una tabla no cabe, la tabla hace scroll propio o cambia de forma.
5. **El dedo mide 44 px.** Todo lo que se toca mide al menos 44 por 44 px y tiene 8 px de separación con el vecino.
6. **El texto nunca baja de 16 px en móvil.** Si no cabe, se reorganiza el espacio, no se encoge la letra.
7. **Se prueba en un dispositivo real o emulado a 393 px, siempre.** Lo que no se probó no está terminado.

## Puntos de corte

| Nombre | Ancho | Qué cambia |
|---|---|---|
| base | 0–359 px | Una columna. Todo apilado. Botones a ancho completo. |
| movil | 360 px | Teléfonos Android comunes en Perú (Samsung A, Xiaomi Redmi). Ajustes finos de padding. |
| movil-grande | 393 px | iPhone 14/15/16 y Pixel. **Punto de prueba oficial.** |
| tableta | 768 px | Dos columnas. La navegación puede pasar a barra lateral plegable. |
| escritorio | 1024 px | Barra lateral fija. Tablas con todas las columnas. |
| ancho | 1440 px | Ancho máximo de contenido (1200–1320 px). Lo demás es margen. |

Usa media queries con `min-width` (hacia arriba) y, si el entorno lo permite, la sintaxis de rango `@media (width >= 768px)`. Nunca escribas `max-width` para "arreglar" el móvil.

## Procedimiento paso a paso

1. Pon `<meta name="viewport" content="width=device-width, initial-scale=1">` en el `<head>`. Sin esto, nada de lo demás funciona.
2. Escribe primero el CSS para 360 px: una columna, `padding` lateral de 16 px, botones en bloque, imágenes `max-width: 100%`.
3. Convierte los tamaños fijos en fluidos: `width: 320px` pasa a `width: min(100%, 320px)`; `font-size: 28px` pasa a `clamp(1.5rem, 1.2rem + 1.5vw, 2rem)`.
4. Para rejillas de tarjetas usa `grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr))`. El `min(100%, …)` evita que la tarjeta desborde en pantallas de 320 px.
5. Para componentes reutilizables declara `container-type: inline-size` en el contenedor y usa `@container (min-width: 480px)` dentro del componente en lugar de `@media`.
6. Añade los puntos de corte de 768 y 1024 px sólo para lo que cambia de estructura: columnas, barra lateral, tablas.
7. Tablas: en móvil, envuelve la tabla en un `div` con `overflow-x: auto` y fija la primera columna si es la clave; o convierte cada fila en tarjeta con etiquetas (`data-etiqueta`) si son pocas columnas. Nunca encojas la letra para que quepa.
8. Imágenes: usa `srcset` con 3 tamaños (480, 960, 1440 px) y `sizes` según el ancho que ocupa; añade `width` y `height` para reservar espacio y `loading="lazy"` fuera del primer pantallazo.
9. Zonas táctiles: botones e iconos con `min-height: 44px; min-width: 44px`; en listas, el área clicable es toda la fila, no sólo el texto.
10. Teclado móvil: los campos usan `inputmode` (`numeric`, `decimal`, `email`, `tel`) y `autocomplete`. Los formularios no esconden el botón de envío detrás del teclado: colócalo en el flujo, no fijo al fondo.
11. Alturas: usa `min-height: 100dvh` para pantallas completas (no `100vh`, que en móvil queda detrás de la barra del navegador). Respeta los márgenes seguros con `padding-bottom: env(safe-area-inset-bottom)`.
12. Prueba en Chrome: DevTools, modo dispositivo (Ctrl+Shift+M / Cmd+Shift+M), ancho 393 px, altura 852 px, zoom 100 %. Luego 360 px y 768 px. Pasa la lista de comprobación.

## Tipografía fluida

- Cuerpo: `font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem)` (16 → 18 px). Nunca por debajo de 1rem.
- Título principal: `clamp(1.5rem, 1.1rem + 2vw, 2.5rem)` (24 → 40 px).
- Título de sección: `clamp(1.25rem, 1.05rem + 1vw, 1.75rem)`.
- Interlineado 1.5 en cuerpo, 1.2 en títulos. Ancho de párrafo `max-width: 65ch`.
- Usa `rem`, nunca `px`, en tamaños de letra: así respeta el zoom del sistema que ponen muchas personas mayores.

## Imágenes y medios

- `img { max-width: 100%; height: auto; display: block; }` como regla global.
- Siempre `width` y `height` en el HTML para evitar saltos de layout.
- `aspect-ratio: 16 / 9` en contenedores de vídeo o miniaturas; el medio dentro con `object-fit: cover`.
- Avatares y Lottie: el contenedor fija el tamaño con `clamp(96px, 30vw, 200px)`; el canvas se adapta al 100 %.

## Reglas duras (lo que nunca)

- Nunca scroll horizontal de página. Si aparece, hay un ancho fijo, una imagen sin `max-width`, un `vw` sin descontar la barra de scroll, o una tabla sin envoltorio.
- Nunca `font-size` menor a 16 px en texto de lectura en móvil. Las etiquetas auxiliares pueden bajar a 14 px, nunca a 12.
- Nunca ocultes funciones en móvil "porque no caben". Reorganiza (menú, acordeón, pestañas); no amputes.
- Nunca `width` fijo en píxeles en contenedores de contenido. Fijo sólo en iconos y avatares.
- Nunca `user-scalable=no` ni `maximum-scale=1` en el viewport: impide el zoom y viola accesibilidad.
- Nunca `100vh` para altura completa en móvil: usa `100dvh` o `min-height` con `svh`.
- Nunca botones de icono de 24 o 32 px sin padding que los lleve a 44 px.
- Nunca des por probado un diseño sin haberlo visto en 393 px y en 360 px.
- Nunca pongas el botón principal fijo al fondo sin `env(safe-area-inset-bottom)` ni sin probar con el teclado abierto.

## Lista de comprobación (12 puntos)

- [ ] 1. El `<head>` tiene la meta `viewport` correcta, sin bloquear el zoom.
- [ ] 2. A 360 px y 393 px no hay scroll horizontal (`document.documentElement.scrollWidth <= innerWidth`).
- [ ] 3. Todo el texto de lectura mide 16 px o más; ninguna etiqueta baja de 14 px.
- [ ] 4. Los títulos usan `clamp()` y no saltan de golpe entre puntos de corte.
- [ ] 5. Todas las imágenes tienen `width`, `height`, `max-width: 100%` y `srcset` cuando pesan más de 50 KB.
- [ ] 6. Las rejillas de tarjetas usan `auto-fit` con `minmax(min(100%, Npx), 1fr)`.
- [ ] 7. Los componentes reutilizables usan `@container`, no `@media`.
- [ ] 8. Las tablas tienen envoltorio con scroll propio o se convierten en tarjetas; no se encoge la letra.
- [ ] 9. Cada elemento táctil mide al menos 44 por 44 px con 8 px de separación.
- [ ] 10. Los campos tienen `inputmode` y `autocomplete`; el botón de envío no queda detrás del teclado.
- [ ] 11. Las alturas completas usan `dvh` y los elementos fijos respetan `env(safe-area-inset-*)`.
- [ ] 12. Probado en Chrome DevTools a 393 px, 360 px y 768 px, y una vez en un teléfono real.

## Fragmentos

Base móvil primero con rejilla fluida y puntos de corte ascendentes:

```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem); line-height: 1.5; }
img, video, canvas { max-width: 100%; height: auto; display: block; }
.contenedor { width: min(100% - 32px, 1280px); margin-inline: auto; }
h1 { font-size: clamp(1.5rem, 1.1rem + 2vw, 2.5rem); line-height: 1.2; }
.rejilla { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
.boton, .icono-boton { min-height: 44px; min-width: 44px; padding: 10px 16px; }
.pantalla-completa { min-height: 100dvh; padding-bottom: env(safe-area-inset-bottom); }
.tabla-envoltorio { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.tabla-envoltorio table { min-width: 640px; }
.armazon { display: grid; grid-template-columns: 1fr; }
@media (min-width: 768px)  { .armazon { grid-template-columns: 240px 1fr; } }
@media (min-width: 1024px) { .armazon { grid-template-columns: 280px 1fr; } .tabla-envoltorio table { min-width: 0; } }
```

Container query: una tarjeta que pasa de apilada a horizontal según su propia caja, no la ventana:

```css
.tarjeta-contenedor { container-type: inline-size; }
.tarjeta { display: grid; gap: 12px; grid-template-columns: 1fr; }
@container (min-width: 480px) {
  .tarjeta { grid-template-columns: 120px 1fr; align-items: start; }
}
```

Imagen adaptable y tabla convertida en tarjetas en móvil:

```html
<img src="/img/obra-960.jpg"
     srcset="/img/obra-480.jpg 480w, /img/obra-960.jpg 960w, /img/obra-1440.jpg 1440w"
     sizes="(min-width: 1024px) 50vw, 100vw"
     width="960" height="540" loading="lazy" alt="Avance de obra, torre B, octubre">

<table class="tabla-tarjetas">
  <thead><tr><th>Partida</th><th>Avance</th><th>Costo</th></tr></thead>
  <tbody>
    <tr><td data-etiqueta="Partida">Cimentación</td><td data-etiqueta="Avance">82 %</td><td data-etiqueta="Costo">S/ 148 200</td></tr>
  </tbody>
</table>
<style>
  @media (max-width: 767px) {
    .tabla-tarjetas thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .tabla-tarjetas tr { display: block; border: 1px solid var(--color-borde, #ddd); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
    .tabla-tarjetas td { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; }
    .tabla-tarjetas td::before { content: attr(data-etiqueta); font-weight: 600; }
  }
</style>
```

Comprobación rápida en la consola de Chrome (393 px): pega esto y debe imprimir `true` y una lista vacía.

```js
console.log(document.documentElement.scrollWidth <= window.innerWidth);
console.log([...document.querySelectorAll('a, button, [role="button"], input, select')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => e.outerHTML.slice(0, 80)));
```

## Versión corta para modelos pequeños

Sigue estas órdenes al pie de la letra:

1. Pon `<meta name="viewport" content="width=device-width, initial-scale=1">`.
2. Escribe primero el CSS para 360 px: una columna, padding 16 px, botones a ancho completo.
3. Usa `@media (min-width: 768px)` para dos columnas y `@media (min-width: 1024px)` para la barra lateral fija. Nunca `max-width`.
4. Texto de cuerpo: `font-size: 1rem` mínimo (16 px). Títulos con `clamp(1.5rem, 1.1rem + 2vw, 2.5rem)`.
5. Rejillas: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr))`.
6. Imágenes: `max-width: 100%; height: auto;` más atributos `width` y `height` en el HTML.
7. Botones e iconos clicables: `min-height: 44px; min-width: 44px`.
8. Tablas: envuélvelas en un `div` con `overflow-x: auto`. No encojas la letra.
9. Altura completa: `min-height: 100dvh`, no `100vh`.
10. Campos numéricos: `inputmode="numeric"` o `"decimal"`.
11. Prohibido: scroll horizontal de página, `user-scalable=no`, anchos fijos en píxeles, texto menor a 16 px.
12. Al terminar, abre Chrome DevTools a 393 px y a 360 px. Si hay barra horizontal, no está terminado.
