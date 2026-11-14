# Prompt: corazón anatómico interactivo en three.js

Copia todo este texto en Claude Code, dentro de una carpeta vacía, y pídele que lo construya.
Es el mismo encargo con el que se hizo la escena «Corazón» del curso.

---

Quiero un visor 3D educativo del corazón humano en una sola página web (`index.html` + `corazon.js`),
con **three.js r128** cargado desde cdnjs como script global (`THREE`). Nada de modelos ni texturas
descargadas: toda la geometría y las texturas deben ser **procedurales**, generadas con código.
Debe correr fluido en un teléfono de gama media (`pixelRatio` tope 2, esfera base de 128 × 96 segmentos
como máximo, un solo `requestAnimationFrame`).

## Hechos que debe enseñar (en español, con la fuente)

Usa estos datos tal cual; no inventes cifras.

- Cuatro cámaras: aurícula derecha, ventrículo derecho, aurícula izquierda, ventrículo izquierdo.
  El ventrículo izquierdo es la cámara más grande y fuerte; su pared mide cerca de 1,3 cm (Texas Heart Institute).
- Cuatro válvulas: tricúspide (AD → VD), pulmonar (VD → tronco pulmonar), mitral (AI → VI) y aórtica (VI → aorta).
  Tricúspide y mitral son auriculoventriculares; pulmonar y aórtica son semilunares (Cleveland Clinic).
  La mitral es la única con dos valvas (Wikipedia, «Heart»).
- Grandes vasos: vena cava superior e inferior (entran a la AD), tronco pulmonar que se divide en arteria
  pulmonar derecha e izquierda, cuatro venas pulmonares que entran a la AI, aorta ascendente, arco (con tronco
  braquiocefálico, carótida izquierda y subclavia izquierda) y aorta descendente.
- Arterias coronarias: nacen justo encima de la válvula aórtica. La izquierda se divide en descendente anterior
  (frente del VI y tabique) y circunfleja (costado y espalda del VI). La derecha riega AD, VD y la parte
  posterior del tabique (Cleveland Clinic, Wikipedia).
- Tabique (septo): separa el lado derecho del izquierdo; la sangre pobre y la rica en oxígeno nunca se mezclan.
- Recorrido de la sangre: cuerpo → venas cavas → AD → tricúspide → VD → pulmonar → pulmones → venas
  pulmonares → AI → mitral → VI → aorta → cuerpo.
- Sístole: los ventrículos se contraen y expulsan la sangre. Diástole: se relajan y se llenan.
- Frecuencia en reposo: 60 a 100 latidos por minuto (unas 100 000 veces al día). Gasto cardíaco cercano a
  5 L/min (70 ml por latido). Peso: 250 a 350 g (Wikipedia; Texas Heart Institute).
- El nodo sinusal, en la pared superior de la AD, es el marcapasos natural.

## Modelo (procedural)

1. **Masa ventricular**: una `SphereGeometry` deformada vértice a vértice. Base ancha arriba, ápice abajo
   desplazado hacia la izquierda del paciente (derecha del espectador). El ventrículo izquierdo debe ser más
   grueso que el derecho (añade radio en su región). Surcos interventriculares anterior y posterior (resta
   radio con una gaussiana alrededor de un acimut) y un surco auriculoventricular en la base. Ruido de valor
   3D determinista en dos octavas para que la superficie no sea perfecta. Recalcula normales.
2. **Colores por vértice**: tinte púrpura-marrón en el VD, rojo en el VI, con mezcla suave en el surco.
3. **Aurículas y orejuelas**: elipsoides con ruido sobre la base; AD a la izquierda del espectador, AI atrás y a la derecha.
4. **Vasos**: `TubeGeometry` sobre `CatmullRomCurve3`. Aorta con arco y tres ramas; tronco pulmonar que se
   bifurca por detrás de la aorta; cavas; cuatro venas pulmonares. Azul-violeta para sangre pobre en oxígeno,
   rojo para rica (el tronco pulmonar va azul y las venas pulmonares rojas: son las excepciones).
5. **Coronarias**: proyecta puntos sobre la misma función de deformación (escala 1,02) para que las arterias
   vayan pegadas a la superficie, en los surcos; añade un cojín de grasa pálido bajo la descendente anterior
   y una vena cardíaca azul paralela.
6. **Interior**: anillos (`TorusGeometry`) en la posición de las cuatro válvulas y un plano curvo como tabique;
   solo visibles en el modo «Ver dentro».
7. **Materiales**: `MeshPhysicalMaterial` con `clearcoat` moderado (0,3), `roughness` 0,5, `sheen` oscuro para el
   borde aterciopelado, `bumpMap` de ruido generado en un `canvas` de 256 px. Entorno con `PMREMGenerator`
   sobre una escena de estudio hecha a mano (cúpula con degradado + paneles de luz), luz principal cálida,
   contraluz fría y una sombra de contacto (plano con degradado radial) bajo el modelo.

## Interacción

- Órbita con arrastre e inercia, zoom con rueda y con pellizco (dos punteros). `touch-action: pan-y` para no
  robar el desplazamiento vertical del teléfono. Giro automático lento cuando nadie toca.
- **Toque o clic en cualquier parte** (`Raycaster`): resáltala (emissive) y abre una tarjeta lateral con
  nombre, qué hace y un dato clave con su fuente. En el ventrículo, decide VD o VI por la región del impacto.
- Fila de **chips** con todas las partes (cámaras, válvulas, tabique, vasos, coronarias) y una ficha «Datos».
- Botón **Flujo de sangre**: partículas (`Points` con sprite radial y mezcla aditiva) que recorren el camino
  completo, azules de entrada y rojas de salida, con leyenda; el corazón se vuelve translúcido para verlas.
- Botón **Latido** con lectura de lpm y etiqueta **Sístole / Diástole** sincronizada con la fase del ciclo
  (periodo = 60 000 / lpm; sístole en el primer 38 %). Los ventrículos se contraen hacia la base; las
  aurículas, al final de la diástole.
- Botones **Ver dentro**, **Malla** (wireframe) y **Restablecer vista**.
- Devuelve `{ pausar, reanudar }` para detener el bucle cuando la escena no está a la vista.

## Accesibilidad y calidad

- Respeta `prefers-reduced-motion`: sin giro automático ni latido; el flujo solo si el usuario lo activa.
- Botones con `aria-pressed`, chips con `role="option"`, tarjeta con `aria-live="polite"`, foco visible.
- Sin `alert`, `confirm` ni `prompt` del navegador. Todo el texto en español.
- Estilos con prefijo propio (por ejemplo `.t3-`) para no chocar con la página que lo aloje.
- Verifica con capturas a 390 px y 900 px de ancho: el corazón debe reconocerse como anatómico
  (ápice, surcos, aorta en arco, tronco pulmonar delante) y la tarjeta debe abrirse al tocar.
