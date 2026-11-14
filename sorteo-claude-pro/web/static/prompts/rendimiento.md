# Prompt · Laboratorio de rendimiento: la misma respuesta, 95 % más liviana

Pega este prompt en Claude Code dentro de un proyecto vacío. Es el entregable de la sesión 2 de **Claude Code PRO**.

---

Construye un laboratorio de rendimiento web en un solo archivo HTML (más un módulo JS) que demuestre, con números medidos, cuánto pesa la misma respuesta de una API según cómo se comprima, y cuánto tarda en descargarse en distintas redes.

## Datos

1. Genera de forma determinista (semilla fija, sin `Math.random`) una respuesta JSON de `GET /api/alumnos` con 300 registros: `{ id, nombres, apellidos, grado, seccion, curso, bimestre, nota, asistencia }`. Debe parecer real: nombres peruanos, notas de 0 a 20, asistencia de 60 a 100 %.
2. Escribe un script de Node (`medir.mjs`) que serialice ese JSON y mida tres tamaños con `zlib`:
   - sin compresión (`Buffer.byteLength`),
   - `gzipSync(..., { level: 9 })`,
   - `brotliCompressSync(..., { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })`.
   Imprime una tabla y guarda los tres números en `medidas.json`. La página lee ese archivo: **nunca inventes los tamaños**.

## Pantalla

- Encabezado: título «La misma respuesta, X % más liviana» calculado con las medidas reales, y un botón «Ejecutar prueba».
- Selector de red con tres perfiles y sus parámetros a la vista, marcados como **simulados**: 3G (0,75 Mbps, RTT 300 ms), 4G (9 Mbps, RTT 70 ms), Wi-Fi (40 Mbps, RTT 20 ms).
- Tabla de peticiones: codificación (`identity`, `gzip`, `br`), tamaño en KB y tiempo estimado = RTT + tamaño ÷ ancho de banda.
- Línea de tiempo tipo cascada (como la pestaña Red del navegador): una barra por codificación con dos tramos, espera del servidor (RTT) y descarga, sobre un eje de tiempo con marcas cada segundo. Al pulsar «Ejecutar prueba» las barras crecen en tiempo real hasta su valor.
- Mosaico de bytes: un cuadrado por cada 4 KB, para que se vea de un golpe la diferencia de volumen.
- Tarjeta de resultado: porcentaje ahorrado, KB por formato y segundos ahorrados en la red elegida.
- Nota al pie: «Tamaños medidos con zlib. Tiempos simulados con la red elegida».

## Reglas de calidad

- Sin librerías. Módulos ES nativos. Sin `alert`.
- Colores con contraste AA en tema claro; una paleta de tres tonos distinguibles también en escala de grises.
- Respeta `prefers-reduced-motion`: si está activo, muestra el resultado sin animar.
- Funciona a 360 px de ancho sin desplazamiento horizontal.
- Añade una prueba (`node --test`) que verifique que gzip y Brotli pesan menos que el original y que el tiempo estimado crece con el tamaño.

## Para ir más lejos

- Sirve el JSON desde un servidor mínimo (Node o Go) con `Content-Encoding` negociado por `Accept-Encoding` y comprueba con `curl -H 'Accept-Encoding: br' -sI` que la cabecera sale.
- Añade `Cache-Control` y `ETag`, y mide la segunda petición: debería ser un `304` de casi cero bytes.
