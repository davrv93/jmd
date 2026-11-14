# Prompt: pórtico de concreto armado que se construye solo (three.js)

Copia todo este texto en Claude Code, dentro de una carpeta vacía, y pídele que lo construya.
Es el mismo encargo con el que se hizo la escena «Estructura» del curso.

---

Quiero una escena 3D en una sola página (`index.html` + `estructura.js`) con **three.js r128** cargado desde
cdnjs como global `THREE`, que muestre un **edificio aporticado de concreto armado** y lo construya paso a
paso, con sonido, como en una obra real. Sin modelos ni texturas descargadas: todo procedural. Debe correr
fluido en un teléfono de gama media (`pixelRatio` tope 2, menos de 200 llamadas de dibujo, un solo mapa de
sombras de 1024 px).

## El edificio (1 unidad = 1 metro)

- Dos vanos por lado: 2 × 4,00 m en X y 2 × 3,00 m en Z. Nueve columnas en los ejes A, B, C y 1, 2, 3. Dos pisos
  de 3,00 m. Secciones: columnas 30 × 30 cm; vigas 25 × 50 cm; losa aligerada e = 20 cm; zapatas aisladas
  1,20 × 1,20 × 0,50 m con fondo a 1,20 m de profundidad; escalera de dos tramos con descanso, 17 contrapasos
  de 17,6 cm y pasos de 28 cm, dentro de un vano, con el hueco correspondiente en la losa del primer piso.
- Terreno: plano claro con cuadrícula (`GridHelper`), trazo de ejes con líneas y rótulos A/B/C y 1/2/3.
  Los pozos de excavación se recortan del terreno con un `Shape` con agujeros; cada pozo es una caja con
  `BackSide` (solo se ven sus paredes interiores).

## Armaduras visibles

- Fusiona geometrías en un solo `BufferGeometry` por elemento para ahorrar llamadas de dibujo.
- Columna: 8 barras Ø 5/8″ (cilindros de 6 lados) y estribos cada 15 cm, más juntos cerca de los nudos
  (cada 10 cm). Un estribo es un `TorusGeometry` con 4 segmentos tubulares, girado 45° y escalado a rectángulo.
- Viga: 4 barras longitudinales y estribos rectangulares cada 20 cm (cada 10 cm en los extremos).
- Zapata: parrilla de 7 × 7 barras en la cara inferior, con 8 barras de arranque hacia arriba.
- Losa: malla de barras cada 25 cm en las dos direcciones.
- Material del acero: `MeshStandardMaterial` marrón-óxido, `metalness` 0,55.

## Materiales y luz

- Concreto: `MeshStandardMaterial` gris cálido, `roughness` 0,92, `map` y `bumpMap` de ruido generado en un
  canvas de 256 px. Concreto **fresco** más oscuro y liso durante el vaciado; al terminar cambia al curado.
- Encofrado: madera translúcida (`opacity` 0,5) para que se vea subir el concreto por dentro. Puntales
  metálicos bajo la losa.
- Luz de estudio: `HemisphereLight` suave, un sol direccional con sombras `PCFSoft` (cámara ortográfica de
  ±11 m) y un relleno frío. Entorno `PMREMGenerator` sobre una escena de estudio hecha a mano.
- Rótulos de cotas como `Sprite` con texto en canvas: «Zapata 1,20 × 1,20 × 0,50 m», «Columna 30 × 30 cm · 8 Ø 5/8″»,
  «Viga 25 × 50 cm», «Losa aligerada e = 20 cm», «Escalera 17 × 17,6 cm». Aparecen cuando su elemento ya existe
  y se dibujan siempre encima (`depthTest: false`).

## Secuencia de obra («▶ Construir»)

Modela la línea de tiempo como una lista de pasos `{ inicio, duración, nombre, fn(p) }` donde `fn` es
**idempotente** en el progreso `p ∈ [0, 1]`: así se puede repetir, cambiar la velocidad y saltar al final.

1. Trazo y excavación de los nueve pozos (las cajas crecen hacia abajo).
2. Parrillas de acero de las zapatas (suben desde el fondo, escalonadas).
3. Vaciado de las zapatas (el concreto sube con `scale.y`).
4. Relleno y compactación: se tapan todos los pozos menos uno, que queda «en corte» para que se vea la zapata.
5. Por cada piso: armadura de columnas → encofrado → vaciado → desencofrado → encofrado de vigas y losa con
   puntales → la grúa baja las jaulas de las vigas desde 4 m de altura → malla de la losa → vaciado de vigas y
   losa → (solo en el primer piso) escalera → curado y retiro de puntales.
6. Campana final: «Estructura terminada».

Durante la construcción la cámara orbita despacio; si el usuario arrastra, la órbita automática se detiene
unos segundos. Control de velocidad 0,5× / 1× / 2×, botón «Construir otra vez» y «Restablecer vista».
Muestra la fase actual («Fase 9 de 24 · Piso 1: vaciado de columnas») y una barra de progreso.

## Sonido (WebAudio, solo después de tocar el botón)

Crea el `AudioContext` en el primer clic (política de autoplay). Síntesis, sin archivos:
- Excavación: ruido blanco por un paso bajo que baja de 220 a 90 Hz.
- Acero: nueve «tics» metálicos (triángulo a 1,8–2,6 kHz con ataque corto + ráfaga de ruido de 30 ms).
- Vaciado de concreto: ruido filtrado que sube de 160 a 900 Hz y vuelve, con un seno de 48 Hz debajo.
- Grúa: ruido por paso banda con barrido 300 → 1400 → 260 Hz y una sierra grave que sube de 70 a 110 Hz.
- Encofrado: tres golpes de madera (cuadrada 260 Hz con caída rápida).
- Final: acorde de campanas (523, 659, 784, 1047 Hz) con cola de 1,6 s.
Pasa todo por un compresor y una reverberación corta de ruido con caída exponencial.

## Interacción didáctica

- Toque o clic en cualquier elemento (`Raycaster`): se resalta y se abre una tarjeta con su nombre, su papel
  estructural y un dato de obra. Textos para: excavación, zapata, columna, viga, losa, escalera, acero,
  encofrado y puntales. Por ejemplo, viga: «trabaja a flexión: se tracciona abajo en el centro del vano y
  arriba sobre los apoyos, por eso el acero principal va abajo al centro y arriba en los extremos».
- Chips con esos tipos para seleccionar sin tocar el modelo.

## Accesibilidad y calidad

- Con `prefers-reduced-motion`, «Construir» muestra el estado final sin animar ni girar la cámara.
- Sin `alert`, `confirm` ni `prompt`. Todo en español. Estilos con prefijo propio. `touch-action: pan-y`.
- Devuelve `{ pausar, reanudar }` para que la escena no consuma CPU cuando no está a la vista.
- Verifica con capturas a 390 px y 900 px: el resultado debe leerse como una obra real (pozos, acero, encofrado,
  concreto, sombras), no como un diagrama de líneas.
