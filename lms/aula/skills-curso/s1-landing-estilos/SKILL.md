---
name: s1-landing-estilos
description: Arma la landing de un negocio a partir del escrito del cliente y la muestra en 8 estilos (Apple, Huawei, nova 5T, Express, Inmersivo, iPad Magic Keyboard, Difícil de explicar, Atardecer Neón tipo GTA 6) con scroll, transiciones e imágenes generadas con FLUX. El alumno solo cambia el contenido (negocio.json); los estilos y el motor no se tocan. Palabras gatillo: landing, página de aterrizaje, página web del negocio, estilo Apple, estilo Huawei, nova 5T, express, inmersivo, iPad, Magic Keyboard, GTA, Vice City, difícil de explicar, cambiar de rubro, cambiar de estilo, scroll, transiciones, imágenes del cliente, "hazme una web para mi negocio".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S1 · Landing con estilo

## Cuándo usar

- El cliente (o el alumno) describe su negocio con sus palabras y quiere una landing que se vea profesional.
- Hay que mostrar el **mismo contenido en otro estilo** o el **mismo estilo para otro rubro**.
- No lo uses para una app con usuarios y datos (eso es una SPA: `s3-front-lit`, `ui-componentes`) ni para diseñar un estilo nuevo desde cero (eso se hace con `motor/ESTILOS.md`, fuera de clase).

## Cómo funciona (en una frase)

`negocio.json` (el contenido) + un estilo de `motor/estilos/` = una carpeta `sitio/` con `index.html`, CSS, movimiento (GSAP + ScrollTrigger locales) e imágenes. Cambiar de estilo o de rubro es cambiar un parámetro o el JSON: **nunca se edita el HTML generado ni el estilo**.

## Procedimiento paso a paso

1. **Copia la plantilla** al trabajo del alumno:
   ```bash
   mkdir -p /trabajo/landing && cp /opt/skills-curso/s1-landing-estilos/motor/negocio.plantilla.json /trabajo/landing/negocio.json
   ```
2. **Llena `negocio.json` con el escrito del cliente.** Reglas:
   - Solo datos que el cliente dio. **No inventes** precios, cifras, años, premios ni testimonios. Si falta algo, deja la sección fuera o pregunta.
   - `whatsapp`: solo dígitos con código de país (`51986149476`). `telefono`: como se lee (`986 149 476`).
   - En títulos, marca **una** palabra con `*asterisco*`: cada estilo la resalta a su manera.
   - Secciones disponibles: `cifras`, `caracteristicas`, `pasos`, `galeria`, `precios`, `testimonios`, `preguntas`, `contacto`. La que lleve `"menu": "Texto"` aparece en la barra de navegación (máximo 4).
   - `oferta` (opcional) es la promoción del momento: título, precio, antes, detalle, vigencia.
   - Testimonios solo reales, con `"real": true`.
   - Colores de marca (opcional): `marca.primario` y `marca.acento` en hexadecimal.
   Ejemplos completos en `motor/ejemplos/`: cafetería, clínica dental y un taller.
3. **Describe las imágenes** en `imagenes` (ver «Imágenes», abajo). Si el cliente mandó fotos, cópialas junto al JSON y usa `"archivo": "fotos/mi-local.jpg"`.
4. **Elige el estilo** con la tabla de abajo y construye:
   ```bash
   cd /trabajo/landing
   bun /opt/skills-curso/s1-landing-estilos/motor/construir.mjs --negocio negocio.json --estilo apple --salida sitio
   ```
   Para comparar todos: `--todos --salida sitios` (deja `sitios/index.html` con enlaces a los 8).
5. **Revisa** en el Visor: el sitio en escritorio y a 393 px de ancho, el scroll de arriba abajo, el botón de WhatsApp (abre el chat con el mensaje), y que con «reducir movimiento» todo se lea. Si el motor avisa de un problema en el JSON, corrígelo y vuelve a construir: los mensajes dicen qué campo falla.
6. **Ajustes**: todo cambio va al JSON (textos, orden de secciones, colores de marca, imágenes, `semilla`). Si el cliente pide algo que ningún estilo hace, anótalo para un estilo nuevo; no edites el estilo en clase.

## Los 8 estilos

| `--estilo` | Cómo se ve | Para qué rubros |
|---|---|---|
| `apple` | Blanco, aire, titulares enormes, bento, imagen que crece con el scroll, pasos con imagen fija, galería horizontal | Productos premium, tecnología, servicios que quieren verse limpios |
| `huawei` | Oscuro premium, letra fina, degradado plateado, producto con halo y reflejo, cifras como ficha técnica | Tecnología, clínicas modernas, servicios de alta gama |
| `nova5t` | Juvenil y vibrante, degradados aurora, cámara perforada, selector de color, tarjetas que se inclinan | Público joven, moda, apps, academias, entretenimiento |
| `express` | Una sola pantalla: oferta, precio grande, tres razones y WhatsApp. Sin fuentes web ni JavaScript | Promociones, negocios de barrio, campañas pagadas en redes |
| `inmersivo` | Capítulos a pantalla completa con foto a sangre, serif con carácter, índice lateral, luz que sigue al puntero | Gastronomía, turismo, inmobiliarias, marcas con historia |
| `ipad` | Producto flotando en negro; una tablet con teclado se despliega con el scroll y las teclas se iluminan | Productos físicos, accesorios, lanzamientos |
| `dificil` | El estilo del taller: tinta y pasteles, titular en collage de recortes, pixel art, cinta con código de tiempo | Talleres, eventos, marcas creativas o nostálgicas |
| `gta6` | «Atardecer Neón»: el nombre gigante es una máscara que se abre con el scroll, polaroids, palmeras, sol a franjas | Bares, discotecas, eventos nocturnos, marcas de playa |

Los estilos están **inspirados en** esas estéticas: no usan logos, nombres de producto ni fuentes de las marcas.

## Imágenes

- **Prompt en inglés, solo el contenido**: qué se ve y cómo está compuesto. El estilo agrega solo su estética (luz, color, grano) con su `sufijo_imagen`.
- **Nunca pidas caras, sonrisas, dientes, bocas ni manos.** El modelo las deforma y el resultado se ve inquietante. Muestra objetos, productos, espacios y paisajes; si hacen falta personas, de espaldas, lejos o en silueta, y agrega `no people` cuando el tema pueda colarlas (por ejemplo, una pantalla de videollamada). El validador rechaza esos prompts.
- Nada de texto dentro de la imagen: el texto va en el HTML.
- `descripcion` en español es también el texto alternativo (accesibilidad): descríbela de verdad.
- Si una imagen sale mal, cambia su `"semilla"` (un entero cualquiera) y vuelve a construir: solo esa imagen se rehace.
- **Motor de imagen**: en el aula, el servicio de la clase en calidad «máxima» (FLUX en la nube) con `$OSITO_TOKEN`; ya está configurado. Fuera del aula, FLUX directo en Cloudflare con `CF_ACCOUNT_ID` y `CF_API_TOKEN` (en el entorno o en `~/.config/jmd-landings/cloudflare.env`). Sin ninguno de los dos, el sitio se construye igual con marcadores «imagen pendiente».
- **Tope: 5 imágenes por alumno al día** (se reinicia a las 19:00 en Lima). Solo cuentan las que se generan: las de la caché `.imagenes/` y las que tienen `archivo` no gastan. Por eso, antes de generar, revisa los textos con `--imagenes no`, pide solo las imágenes que el sitio de verdad usa, construye **un** estilo a la vez (cada estilo cambia el prompt y con `--todos` serían 8 veces más) y fija las buenas. Si el tope se acaba, el motor lo dice y deja marcadores «imagen pendiente».
- **Fija las imágenes buenas** para no regenerarlas (ni gastar cupo):
  ```bash
  bun /opt/skills-curso/s1-landing-estilos/motor/recursos.mjs negocio.json
  ```
  Las guarda en `recursos/negocio/` y escribe `"archivo"` en el JSON.

## Sin IA (sin cuota o sin gateway): reglas programadas

Si el agente no responde (cuota agotada, gateway caído), la landing sale igual. El motor trae un
extractor por reglas que lee el texto del cliente y arma `negocio.json` sin ningún modelo. Tres comandos:

```bash
cd /trabajo/landing
cat > cliente.txt <<'FIN_CLIENTE'
(el texto del cliente, tal cual)
FIN_CLIENTE
bun /opt/skills-curso/s1-landing-estilos/motor/extraer.mjs cliente.txt --salida negocio.json --modelo no
bun /opt/skills-curso/s1-landing-estilos/motor/construir.mjs --negocio negocio.json --estilo apple --imagenes no
```

Qué saca: **nombre**, **rubro** (catálogo de 127 giros del Perú con sinónimos y sin tilde: «botica» →
farmacia, «cebichería» → cevichería, «gym» → gimnasio, «barber» → barbería…), **ciudad** (también por
distrito: Miraflores → Lima), **dirección**, **WhatsApp** (con +51, guiones o pegado), correo, horario,
**servicios** (viñetas `-`, `•`, `✅`, `1.`, o la lista tras «ofrecemos», «servicios:», «Carta:»…),
**precios** «S/ 25» o «a 25 soles», promoción, lema y preguntas «¿…?». Cada giro trae su palabra de menú
(Carta, Productos, Tratamientos, Cursos, Propiedades…), un título genérico que no afirma hechos y la
descripción de la imagen principal. Lo que no encuentra lo deja fuera o como `[completar]` y lo avisa:
revisa el JSON antes de construir. Con `--imagenes no` el sitio lleva marcadores en vez de fotos.

**Con el modelo de la clase** (cuando el gateway responde): si en el aula están `JMD_URL` y
`JMD_API_KEY`, quita `--modelo no` (o pon `--modelo qwen-landing`) y `extraer.mjs` pide al modelo
pequeño de la clase **solo la redacción**: `hero.titulo`, `hero.subtitulo`, `hero.antetitulo`, el lema
(si el cliente dio uno) y el texto de los servicios a los que el cliente no puso descripción. Los
**hechos** (nombre, WhatsApp, teléfono, correo, dirección, horario, ciudad, lista de servicios, precios,
oferta) salen **siempre** de las reglas. Un texto del modelo con un número que no está en el escrito del
cliente se descarta. Si el modelo falla, tarda más de 60 s o no devuelve JSON, sigue solo con reglas y lo
dice en stderr. `--modelo auto` (por defecto) usa el modelo solo si las dos variables existen.

**Resultados sobre el banco de 100 giros** (`motor/pruebas/giros-100.jsonl`: un texto por giro, en 8
formas de escribir —WhatsApp corrido, correo, notas con viñetas, todo en minúsculas, con emojis,
telegrama sin presentación, lista numerada, lista escueta—, con y sin precios, horario, dirección,
promoción y preguntas). Se corre con `bun motor/pruebas/probar-extraer.mjs`; construye los 100 sitios
con `--imagenes no` rotando los 8 estilos en una carpeta temporal que borra al final (0,3 s en total).

| Métrica | Antes (v1, 70 palabras de rubro) | Ahora | Meta |
|---|---|---|---|
| JSON válido | 100/100 | 100/100 | 100 |
| Construcción OK (8 estilos) | — | 100/100 | 100 |
| Nombre | 88 | 100 | ≥ 98 |
| WhatsApp | 100 | 100 | ≥ 98 |
| Rubro (canónico) | 21 | 100 | ≥ 95 |
| Ciudad | 81 | 100 | — |
| Servicios exactos | 59 | 100 | ≥ 80 |
| Sin precios inventados | 100 | 100 | 100 |
| Dirección / horario / lema | 56 / 85 / 97 | 100 / 100 / 100 | — |
| Precios exactos / oferta | 57 / 99 | 100 / 100 | — |

(«Antes» es la primera versión del extractor sobre este mismo banco; en rubro fallaba porque devolvía la
palabra tal cual —«botica», no «farmacia»— y le faltaba la mayoría de los giros. En v1 los precios
iban en `items`, que el motor no dibuja; ahora van en `planes` y salen en el sitio.)

Límites conocidos: una lista en minúsculas unida con «y» («corte, barba y cejas») deja los dos últimos
juntos; los servicios tienen que venir en viñetas o tras una palabra clave («ofrecemos», «servicios:»,
el nombre de la sección); un rubro fuera del catálogo se avisa y queda como lo escribió el cliente.
Para regenerar el banco: `bun motor/pruebas/generar-banco.mjs` (determinista). La mezcla con el modelo se
prueba sin red con `bun motor/pruebas/probar-mezcla.mjs` (gateway falso en localhost: JSON bueno, basura,
cifra inventada, lento y error 500).

## Verificación antes de entregar

- [ ] `construir.mjs` termina con `OK` y sin avisos de validación.
- [ ] Ninguna imagen tiene caras, manos o formas inquietantes; las que sobran, con otra `semilla` o fuera.
- [ ] A 393 px no hay desplazamiento horizontal y los botones se pueden tocar con el pulgar.
- [ ] El botón de WhatsApp abre el chat con el mensaje correcto.
- [ ] Ningún dato inventado: precios, cifras y testimonios salen del escrito del cliente.

## Errores comunes

| Síntoma | Causa | Arreglo |
|---|---|---|
| `El JSON del negocio tiene problemas` | Campo que falta o mal escrito | Lee la lista: dice el campo exacto |
| `imagen pendiente` en el sitio | Sin servicio de imagen o cupo agotado | Reintenta después o usa `archivo` |
| `Llegaste a tu tope de hoy (5)…` | Ya generaste tus 5 imágenes del día | Usa las ya generadas (`archivo`), fotos del cliente, o espera a las 19:00 |
| Una palabra resaltada no se ve | `*asterisco*` sin cerrar | Revisa los pares de `*` |
| La sección no aparece en el menú | Falta `"menu"` | Agrega `"menu": "Texto corto"` |
| El estilo Express no muestra todas las secciones | Es una sola pantalla a propósito | Usa otro estilo si el cliente quiere más contenido |

## Para quien quiera ir más allá

`motor/ESTILOS.md` explica cómo se hace un estilo nuevo (archivos, marcado estable, efectos de movimiento, reglas y trampas conocidas). Es trabajo de diseño, no de clase: se hace con calma y se prueba con los tres ejemplos.
