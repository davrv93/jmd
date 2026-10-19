# Cómo se hace un estilo

Un estilo es una carpeta en `motor/estilos/<id>/`. El contenido del negocio (JSON) no se toca: el
estilo decide el aspecto, el movimiento y, si hace falta, el marcado de alguna pieza.

## Archivos

| Archivo | Obligatorio | Qué es |
|---|---|---|
| `estilo.json` | sí | Metadatos y ajustes (abajo). |
| `estilo.css` | sí | Todo el aspecto. Redefine las variables de `comun/base.css` y estiliza las clases estables. |
| `estilo.js` | no | Movimiento propio. Se incluye si `estilo.json` trae `"tiene_js": true`. |
| `plantillas.mjs` | no | Reemplaza piezas del HTML: `export default { hero(c) {…}, oferta(c) {…}, <tipo>(c, s) {…} }`. |
| `recursos/` | no | Archivos que se copian tal cual a `sitio/recursos/` (SVG, JS auxiliar). |

### `estilo.json`

```json
{
  "nombre": "Apple",
  "descripcion": "Una frase: cómo se ve.",
  "cuando": "Para qué rubros o pedidos conviene.",
  "fuentes": "https://fonts.googleapis.com/css2?family=…&display=swap",
  "color_tema": "#fbfbfd",
  "hero": "centro | pantalla | dividido   (o el que haga plantillas.mjs)",
  "mov": { "titulo": "palabras", "texto": "subir", "grupo": "grupo", "imagen": "zoom", "hero": "hero-zoom", "pasos": "pasos", "galeria": "horizontal", "tarjeta": "escala" },
  "sufijo_imagen": "palabras en inglés que se suman a cada prompt de imagen para que todas compartan la estética",
  "marcador": ["#color1", "#color2"],
  "intro": true,
  "tiene_js": true,
  "sin_js": false,
  "secciones_permitidas": null,
  "max_secciones": null,
  "oferta_tras_hero": true
}
```

`mov` asigna un efecto a cada rol. Efectos de `comun/movimiento.js`: `subir`, `aparecer`, `lado`,
`escala`, `mascara`, `letras`, `palabras`, `grupo`, `zoom`, `parallax`, `hero-zoom`, `hero-fijo`,
`pasos` (imagen fija mientras avanzan los pasos), `horizontal` (galería anclada que corre en
horizontal). Un estilo registra los suyos en `estilo.js`:

```js
window.Mov.registrar('mi-efecto', function (el) { const g = window.Mov.gsap; /* … */ });
```

y los usa en `mov` o en el marcado de `plantillas.mjs` (`data-mov="mi-efecto"`). `estilo.js` se carga
después de `movimiento.js` y antes de que arranque: lo que registra ya está disponible.
`window.Mov.reducido` es `true` con «reducir movimiento»: entonces no se anima nada.

## Marcado estable (lo que estiliza el CSS)

```
body.e-<id>[.con-intro]
  a.saltar
  header.nav > .nav-dentro.contenedor > a.nav-logo, nav.nav-enlaces > a, a.boton.boton-primario.nav-cta
  main#contenido
    section.hero.hero-<variante>#inicio
      .hero-contenido > p.antetitulo, h1.hero-titulo (puede traer <em>), p.hero-sub, .acciones > a.boton…
      figure.hero-media > img
    section.s.s-oferta#oferta > .contenedor > .oferta > p.oferta-etiqueta, h2.oferta-titulo, p.oferta-precio > b, s, p.oferta-detalle, p.oferta-vigencia, a.boton
    section.s.s-<tipo>#<id> > .contenedor
      header.s-cabeza > p.s-ante, h2.s-titulo, p.s-texto
      cifras:          ul.cifras > li.cifra > b.cifra-valor[data-contar], span.cifra-unidad, p.cifra-texto
      caracteristicas: ul.tarjetas.tarjetas-N > li.tarjeta(.tarjeta-con-imagen)(.tarjeta-primera) > figure.tarjeta-media > img, .tarjeta-texto > h3, p
      pasos:           .pasos(.pasos-con-medios) > .pasos-medios > figure.paso-media[data-paso] > img ; ol.pasos-lista > li.paso[data-paso] > span.paso-num, h3, p
      galeria:         .galeria > ul.galeria-pista > li.galeria-item > figure > img, figcaption
      precios:         ul.planes > li.plan(.plan-destacado) > p.plan-sello, h3.plan-nombre, p.plan-precio > b, span ; p.plan-detalle, ul.plan-items, a.boton
      testimonios:     ul.testimonios > li.testimonio > blockquote > p ; p.testimonio-autor
      preguntas:       .preguntas > details.pregunta > summary, p
      contacto:        .contacto > a.boton.boton-grande, dl.contacto-datos > div > dt, dd
  footer.pie > .pie-dentro > p.pie-nombre, p.pie-credito
  a.wa-flotante
```

`<em>` dentro de títulos marca la palabra que el negocio quiere resaltar (`*así*` en el JSON).
`.img-pendiente` es una imagen que aún no se generó: debe verse digna igual.

## Reglas

1. **Inspirado en, nunca copiado.** Nada de logos, nombres de producto, fuentes propietarias ni
   imágenes de las marcas de referencia. Fuentes de Google Fonts con pila de respaldo.
2. **El texto viene del JSON.** Ninguna plantilla escribe datos del negocio; solo textos genéricos
   de interfaz («Desliza», «Capítulo 01»).
3. **Funciona con cualquier contenido:** con o sin oferta, con 1 a 6 tarjetas, con o sin imágenes en
   pasos, con 2 o 10 secciones, con títulos largos. Prueba los tres ejemplos.
4. **Movimiento con intención** y estado final visible sin JavaScript y con «reducir movimiento».
   Nada de destellos de pantalla completa.
5. **Móvil primero:** sin desborde horizontal a 393 px, texto de cuerpo ≥ 16 px, botones ≥ 44 px.
6. **Contraste AA** en todo el texto, también sobre imágenes (usa velos o sombras).
7. **Ligero:** solo GSAP y ScrollTrigger (ya incluidos). 3D con transformaciones CSS, no con librerías.
8. No se editan los archivos comunes (`construir.mjs`, `secciones.mjs`, `base.css`, `movimiento.js`).
   Si un estilo necesita algo de ellos, se pide.

## Probar

```bash
IMAGEN_URL=http://127.0.0.1:18710 IMAGEN_TOKEN=local IMAGEN_CALIDAD=media \
  node motor/construir.mjs --negocio motor/ejemplos/cafeteria.json --estilo <id> --salida ~/Downloads/landings-s1/sitios/cafeteria/<id>
node ~/Downloads/landings-s1/tools/capturas.cjs ~/Downloads/landings-s1/sitios/cafeteria/<id> ~/Downloads/landings-s1/revision/cafeteria-<id>
sh ~/Downloads/landings-s1/tools/tiras.sh ~/Downloads/landings-s1/revision/cafeteria-<id>/movil.png ~/Downloads/landings-s1/revision/cafeteria-<id>/movil-tiras.png
```

Mira `hoja-escritorio.png` (estados del scroll) y `movil-tiras.png`; `errores.txt` debe decir
«sin errores de página» y el mismo ancho de scroll que de ventana.

## Trampas conocidas

- **Anclajes (pin) de ScrollTrigger:** créalos de forma síncrona y en el orden en que aparecen en la página.
  Un pin creado tarde (por ejemplo, después de cargar una fuente) desplaza mal a los anteriores.
- **La galería `horizontal` envuelve su sección** en un `pin-spacer`: los selectores del tipo
  `main > section:nth-of-type()` se corren un puesto después de ella. Usa clases (`.s-galeria`) para alternar fondos.
- **Títulos partidos:** con `palabras` o `letras`, el `<em>` queda partido en piezas. Si el resaltado es un
  degradado recortado al texto, ponlo en `[data-partido] em .mov-pieza` y quítalo del `em` (`background: none`).
- **Imágenes:** llegan cuadradas de 1024 px (FLUX). Recórtalas siempre con `aspect-ratio` + `object-fit: cover`.
