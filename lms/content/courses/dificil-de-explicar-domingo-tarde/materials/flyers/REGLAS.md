# Reglas de diseño para flyers hechos con IA

**Regla de oro: la IA no dibuja el texto.** Un modelo de imagen (FLUX, Veo) dibuja las letras como dibuja el pelo, y a veces le salen faltas, letras inventadas o palabras cortadas. Aquí la IA decide el contenido y el diseño. El texto va en una capa HTML/SVG que el navegador compone con fuentes reales. Así nunca sale roto.

```
DeepSeek  ──►  brief.json  ──►  reglas (validador)  ──►  plantilla HTML  ──►  Chrome mide  ──►  WebP/PNG
 (textos,       (lo que        (recorta, corrige        (10 maquetas)      (desborde,
  paleta,        pide la        contraste y                                  contraste,
  fuentes)       marca)         fuentes)                                     zona segura)
```

Los valores exactos están en [`reglas.json`](reglas.json): el motor y el agente leen ese archivo, no este.

## 1. Jerarquía: seis bloques, en este orden

| Bloque | Para qué | Máximo |
|---|---|---|
| **Gancho** | Lo primero que se lee. Una promesa o una tensión. | 6 palabras, 42 caracteres |
| **Producto** | Qué es, con su medida o presentación. | 5 palabras |
| **Beneficio** | Qué gana el cliente. Concreto, sin adjetivos vacíos. | 12 palabras |
| **Oferta** | Precio o condición. «S/ 49», «2 x S/ 89», «20 % con código». | 6 palabras |
| **Botón (CTA)** | Un verbo y un canal: «Pide por WhatsApp». | 4 palabras |
| **Marca** | El usuario de la red: «@aureaesencias». | 3 palabras |

Si un bloque se pasa del máximo, el validador lo recorta por palabras completas y quita conectores sueltos al final («y», «de», «con»…).

## 2. Retícula y escala

- **Retícula de 8 px:** márgenes, espacios y radios son múltiplos de 8.
- **Escala tipográfica de razón 1,333 (cuarta justa)** sobre 32 px: 24 · 32 · 43 · 57 · 76 · 101 · 135. Un flyer usa como máximo cuatro pasos de la escala.
- **Dos fuentes:** una de título y una de cuerpo, y nunca la misma para los dos papeles. Solo se usan las once fuentes locales del curso (`live/_comun/*.woff2`). Las condensadas (Anton, Barlow Condensed, Archivo Black) van en mayúsculas.

## 3. Color: 60-30-10 y contraste medido

- **60 %** fondo, **30 %** superficie (tarjetas, paneles), **10 %** acento (botón, sello, banda).
- **Contraste mínimo de 4.5:1** para el texto normal y de **3:1** para títulos de 48 px o más (WCAG 2.2, criterio 1.4.3).
- El validador calcula el contraste de cada par: texto sobre fondo, texto sobre superficie y texto del acento sobre el acento. Si un par no llega, aclara u oscurece el color hasta que cumpla.
- Después, Chrome mide el color **real** de cada bloque contra el fondo que tiene debajo.

## 4. Formatos y zonas seguras

| Formato | Tamaño | Zona segura (texto) |
|---|---|---|
| Feed (Instagram, Facebook) | 1080 × 1350 | 72 px por lado |
| Historia (estados, reels) | 1080 × 1920 | 250 px arriba, 340 px abajo y 72 px a los lados: ahí van el nombre de la cuenta y la caja de respuesta |

Los adornos pueden salirse al borde. El texto, nunca.

## 5. Diez maquetas

| Maqueta | Idea |
|---|---|
| Producto héroe | Un solo objeto grande al centro, gancho arriba y oferta en un sello. |
| Dividido | Visual a un lado y texto al otro. En historia, arriba y abajo. |
| Tipográfico | El gancho es la imagen: letras enormes, casi sin visual. |
| Collage | Recortes inclinados, cinta adhesiva y tiras de texto. |
| Cupón | Ticket troquelado con el código para canjear. |
| Menú | Cuatro productos con su precio alineado a la derecha. |
| Antes y después | El problema y el resultado, lado a lado. |
| Minimal de lujo | Mucho aire, serifa, una línea fina de acento y poco texto. |
| Banda diagonal | Una franja de acento cruza el flyer con la oferta. |
| Tarjeta | Una tarjeta flotante con sombra sobre un fondo con patrón. |

## 6. Contenido: lo que la IA no puede inventar

- **Precios, teléfonos y testimonios** salen del cliente o no salen. Sin precio, el flyer dice «Consulta precios».
- Sin emojis ni signos de exclamación repetidos.
- No se nombran platos de cerdo, alcohol, terror ni temas sobrenaturales: el validador reemplaza esas palabras.
- **Desde el 22-11-2026 cada brief pasa por `clasificar()` de la biblioteca de estilos** (`live/_comun/estilos-clasificar.js`, `motor/estilo.mjs`): el pack decide paleta 60-30-10 con AA verificado, par tipográfico, foto real del rubro (Pexels/CC0, con tinte hacia la paleta y máscara del pack), textura CC0, grano e iconos Phosphor. Las fotos nunca llevan texto encima y no se usan las que muestran una marca ajena legible (`marca_visible`). Con `--sin-estilo` el motor vuelve a los visuales vectoriales de antes, que no gastan el cupo de FLUX.

## 7. Comprobación automática después de renderizar

1. **Desborde:** si `scrollWidth > clientWidth` o `scrollHeight > clientHeight`, el texto no cabe. El motor reduce la letra en la proporción que falta y vuelve a renderizar. Tolera la tinta de las letras altas y bajas, pero no una línea de más.
2. **Contraste real:** lee el color calculado de cada bloque y lo compara con el fondo que tiene debajo.
3. **Zona segura:** comprueba que el rectángulo de cada bloque quede dentro de su zona.
4. Repite hasta 8 veces. Si algo queda pendiente, lo anota en `informe.json` como `pendientes`.

**Resultado de la corrida del 22-11-2026 (100 flyers):**

- DeepSeek escribió los 100 briefs en 12 s.
- Las reglas corrigieron 50 briefs: textos largos, contraste insuficiente y fuentes inexistentes.
- El motor ajustó 9 flyers al medirlos.
- Ningún flyer quedó con texto roto.
- Chrome renderizó los 100 en 10 s.

## Uso

```bash
# 100 briefs con DeepSeek (clave en DEEPSEEK_API_KEY u OPENROUTER_API_KEY; nunca se imprime)
python3 motor/briefs.py --reglas reglas.json --salida datos/briefs.json --n 100
# los que repiten nombre o gancho se vuelven a pedir
python3 motor/briefs.py --reglas reglas.json --rehacer datos/briefs.json --salida datos/briefs.json
# 3 briefs para tu negocio
python3 motor/briefs.py --reglas reglas.json --uno "Vendo perfumes árabes en Los Olivos" --salida mio.json
# renderizar (Node 22+ y Chrome; sin Chrome, --html)
node motor/flyers.mjs --briefs mio.json --salida salida --informe informe.json
```
