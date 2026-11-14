# Prompt: Tablero BI de un colegio (notas y asistencia)

Pega este texto completo en Claude Code dentro de una carpeta vacía. Describe el producto terminado; Claude Code lo construye archivo por archivo y tú lo pruebas en el navegador.

---

Construye un tablero de inteligencia de negocios (BI) para un colegio de secundaria, en una sola página web, con **JavaScript vanilla en módulos ES, HTML y CSS**. Sin librerías, sin framework, sin llamadas de red: todo corre en el navegador y los datos se generan en el propio código. Entrégalo como `index.html`, `tablero.js` y `tablero.css`. El módulo exporta `tablero(el)`, que monta el producto dentro del elemento `el` y devuelve `{ pausar, reanudar }`.

## 1. Modelo de datos

- Dimensiones y sus valores, en este orden fijo: **Grado** (1°, 2°, 3°, 4°, 5°), **Sección** (A, B), **Curso** (Matemática, Comunicación, Ciencia, Inglés) y **Bimestre** (I, II, III).
- Un registro por aula × curso × bimestre (5 × 2 × 4 × 3 = 120 registros) con `n` = 30 alumnos, `promedio` (nota de 0 a 20), `asistencia` (porcentaje) y `aprobados` (alumnos con nota ≥ 11).
- Los datos son sintéticos y **deterministas**: usa un generador congruencial lineal con semilla fija (por ejemplo `s = (s * 16807) % 2147483647`) para que todos vean los mismos números. Matemática sale algo más baja que el resto, el promedio sube un poco cada bimestre y baja ligeramente con el grado; el ruido es de ±1.1 puntos.
- Medidas: **Promedio** (0–20), **Asistencia** (%), **Aprobados** (% del aula) y **Desaprobados** (% del aula, nota < 11). Toda agregación es un **promedio ponderado por alumnos** (`Σ valor·n / Σ n`). Cada medida declara si subir es bueno o malo: eso decide qué significa «mejor» y «peor».
- La nota mínima aprobatoria es 11 y se dibuja como línea de referencia en el gráfico cuando la medida es Promedio.

## 2. Interfaz (de arriba abajo)

1. **Pregúntale al tablero**: un campo de texto con placeholder («Ej.: ¿qué sección de 3° tiene mejor asistencia?»), botón «Preguntar» y cuatro fichas con preguntas de ejemplo que se ejecutan al tocarlas. Debajo, la **respuesta en una sola oración** con el valor en negrita y, en letra pequeña, «interpretado como: medida · filtros · agrupado por», para que se vea la consulta que se armó.
2. **Cuatro indicadores** (Promedio, Asistencia, Aprobados, Alumnos) calculados sobre los datos filtrados, cada uno con una *sparkline* SVG de los tres bimestres y un subtítulo («sobre 20», «de las clases», «nota ≥ 11», «N registros en riesgo»).
3. **Tabla dinámica**: cuatro zonas —Filas, Columnas, Filtros y Sin usar— donde viven las fichas de las dimensiones; botón «⇄ Transponer»; selector de medida en un control segmentado.
4. **Gráfico y tabla de calor**, lado a lado en escritorio y apilados en el teléfono. Al tocar una celda de la tabla se abre un **panel de detalle** debajo: desglose por la primera dimensión que no esté en uso (sección, bimestre, curso o grado), registros, alumnos desaprobados «X de N» y registros en riesgo (promedio < 11).

Cabecera compacta; en un teléfono el producto completo no debe pasar de unas dos pantallas de alto y no debe haber scroll horizontal a 360 px.

## 3. Tabla dinámica con arrastrar y soltar

- Cada ficha tiene dos partes: el **nombre** (se arrastra) y un botón de **valores** («Todos ▾», «3 de 5 ▾» o el valor único) que abre un menú con casillas para elegir qué valores se muestran, más «Todos» y «Listo». No se puede dejar la lista vacía.
- Arrastre con **Pointer Events** (`pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`), de modo que funcione con ratón, dedo y lápiz: la ficha de origen se atenúa, un clon «fantasma» sigue al puntero con `position: fixed` y `pointer-events: none`, la zona bajo el puntero se resalta (`document.elementFromPoint`) y se suelta al levantar. El nombre lleva `touch-action: none`; el arrastre empieza solo tras mover 6 px, para que un toque siga siendo un toque.
- **Alternativa sin arrastre**: tocar el nombre «elige» la ficha (aparece la pista «Toca la zona donde va Grado»); tocar cualquier zona la suelta ahí. También con teclado: Enter sobre la ficha, Tab hasta la zona, Enter. Escape cancela.
- Reglas: Filas admite hasta **dos niveles** (por ejemplo Grado › Sección, con `rowspan` en el primer nivel), Columnas admite una dimensión, Filtros las que sean. Si una zona se llena, la ficha más antigua vuelve a «Sin usar». Al soltar en Filtros se abre el menú de valores. La selección de valores de una dimensión filtra los datos en todo el tablero, esté donde esté la ficha.
- **Transponer**: la primera dimensión de Filas pasa a Columnas y la de Columnas pasa a encabezar las Filas.
- Las celdas de la tabla llevan un fondo de **un solo tono (azul) de claro a oscuro** según el valor (`color-mix` con una variable `--k` de 0 a 1), texto blanco en las celdas oscuras, y son enfocables con teclado.

## 4. Intérprete de preguntas en castellano (reglas, sin IA)

Normaliza el texto (minúsculas, sin tildes, sin signos) y extrae, en este orden:

1. **Valores de dimensiones**, consumiendo el texto que reconoce para que no se confunda después: primero el bimestre («primer bimestre», «bimestre II», «bim 2»), luego el grado («3°», «3ro», «tercero», «tercer grado»), la sección («sección A», «sección A y la B») y los cursos («mate», «matemáticas», «lenguaje» = Comunicación, «CTA» = Ciencia, «inglés»).
2. **Medida**: desaprobados (desaprobados, jalados, reprobados, *en riesgo*), aprobados, asistencia (también «faltas» e «inasistencia», que invierten el superlativo) y promedio (nota, calificación, rendimiento). Si no se nombra ninguna, se asume promedio.
3. **Agrupación**: una dimensión nombrada **sin valor** agrupa por ella («¿qué grado…?», «por curso», «cada sección», «por bimestre», «evolución», «tendencia»). Dos valores de una misma dimensión («sección A y B») la convierten en comparación y también agrupan.
4. **Superlativos**: «mejor»/«peor» respetan la polaridad de la medida (el peor en desaprobados es el máximo); «mayor», «más alto», «más» buscan el máximo y «menor», «más bajo», «menos» el mínimo. Si hay superlativo y nada que agrupar, se agrupa por la primera dimensión que no esté filtrada.

Cómo se responde:

- Con superlativo: se calcula la celda extrema y se escribe «**3° tiene el promedio más bajo en Matemática: 11.7**» (sujeto, frase de la medida, contexto de los filtros, valor). La fila o celda queda **destacada** en el gráfico (las demás se atenúan y la barra lleva su valor encima) y en la tabla.
- Comparación: «La sección B supera a la sección A en promedio en Comunicación: 13.9 frente a 13.6»; las columnas pasan a Bimestre para ver las dos líneas en el tiempo.
- Agrupación por bimestre: «Asistencia de 5° por bimestre: 86.3 % (I) → 87.3 % (II) → 90.4 % (III)».
- Agrupación sin superlativo: «Promedio en Matemática por grado: va de 11.4 (5°) a 12.1 (2°)».
- Solo filtros: «El promedio de 2° en Inglés es 13.9»; se muestra el desglose por sección y bimestre.
- Si no se reconoce nada, dilo con amabilidad y sin culpar («No entendí «…». Prueba a nombrar una medida, un grado, una sección, un curso o un bimestre») y deja a la vista las fichas de ejemplo.

Cada respuesta **reconfigura la tabla dinámica**: filtros a la zona Filtros con sus valores marcados, agrupaciones a Filas y Columnas (Bimestre siempre a Columnas), y el gráfico y la tabla se vuelven a dibujar.

## 5. Gráfico

- **SVG generado a mano** al tamaño real de su caja (sin escalar texto), con `role="img"` y un `aria-label` que resume qué se dibuja.
- **Barras agrupadas**: el eje X son las filas de la tabla dinámica y cada columna es una serie; barras de **24 px como máximo**, extremo redondeado de 4 px, base recta, 2 px de separación entre barras vecinas. Cuando la dimensión de Columnas es **Bimestre**, el gráfico pasa a **líneas** de 2 px con marcadores de radio 4.5 y anillo blanco de 2 px; hasta ocho series, y si hay más se avisa que la tabla las tiene todas.
- Eje Y fijo por medida (0–20 o 0–100) con cuadrícula fina, línea de aprobación en 11 discontinua, leyenda con un cuadro de color por serie (solo si hay dos o más series) y clave de la línea de aprobación.
- **Colores**: una paleta categórica fija, nunca cíclica, asignada por entidad y no por posición: Matemática azul `#2a78d6`, Comunicación naranja `#eb6834`, Ciencia verde-agua `#1baf7a`, Inglés amarillo `#eda100`; los demás valores toman los siguientes puestos de la misma paleta (`#e87ba4`, `#008300`, `#6250d6`, `#e34948`). El texto nunca lleva el color de la serie. La tabla es la vista alternativa accesible del gráfico.
- **Tooltips** al pasar el puntero, tocar o enfocar con teclado cada barra o punto (`tabindex="0"`), con nombre y valor; se colocan dentro de la caja del gráfico sin salirse.
- Animación de entrada: las barras crecen desde la base con un pequeño retardo escalonado; las líneas se trazan con `stroke-dasharray` y `pathLength="1"`. Todo se desactiva con `prefers-reduced-motion: reduce`. El gráfico se redibuja al cambiar de tamaño (`ResizeObserver`).

## 6. Accesibilidad y calidad

- La respuesta y la interpretación están en regiones `aria-live="polite"`. Las fichas y zonas tienen `aria-label` y `aria-pressed`; el menú de valores usa casillas reales con sus etiquetas.
- Todo se puede operar con teclado: Tab por fichas, zonas, barras, celdas y menú; Enter/Espacio activa; Escape cierra y cancela. Foco visible siempre.
- Nada de `alert`, `confirm` ni `prompt` del navegador: la respuesta se muestra en la propia página.
- Tipografía Space Grotesk, números tabulares (`font-variant-numeric: tabular-nums`), fondo claro, bordes suaves y una sola paleta en todo el producto. Verifica en 360, 390 y 1000 px de ancho: sin scroll horizontal, sin texto cortado, sin errores en la consola.
- Comprueba con `node --check tablero.js` y abre la página con un servidor estático (los módulos ES no cargan desde `file://`).
