# Crucigrama IA · contrato entre módulos

Proyecto estático: `crucigrama-ia/web/index.html` + módulos ES en `crucigrama-ia/web/static/`.
Idioma del código y la UI: español. Sin dependencias externas. Sin backend.
Estilo visual: reutiliza los tokens de `static/base.css` (JMD Learning: --bg, --card, --line, --txt, --soft, --orange, --ok, --bad, clases .card .btn .kick .pill .cuenta).
Pruebas: `node --test 'crucigrama-ia/tests/*.test.mjs'` (archivos *.test.mjs, Node 20+, sin paquetes npm).

## static/semilla.js
- `export function normalizarSemilla(texto)` → string en MAYÚSCULAS, solo [A-Z0-9], máx 12 chars; vacío → '' .
- `export function semillaAleatoria()` → 6 chars [A-Z0-9] (usa crypto.getRandomValues si existe, si no Math.random).
- `export function rngDesdeSemilla(semilla)` → función `() => number` en [0,1), determinista (hash FNV/xmur3 + mulberry32).
  Misma semilla ⇒ misma secuencia SIEMPRE.

## static/generador.js
- `export const BANCO` → array de `{ palabra, pista }`, ≥ 60 entradas, tema Inteligencia Artificial / programación, palabras en MAYÚSCULAS,
  solo letras A-Z y Ñ (sin tildes), largo 3..12. Pistas en español.
- `export function generarCrucigrama(semilla, opciones = {})`
  opciones: `{ filas = 13, columnas = 13, maxPalabras = 10, minPalabras = 6 }`
  Devuelve:
  ```
  {
    semilla,                // string normalizada
    filas, columnas,
    celdas,                 // string[filas][columnas]: letra 'A'..'Z'/'Ñ' o null (celda negra)
    palabras: [             // ordenadas por numero y luego H antes de V
      { id: 'h1', numero: 1, palabra: 'MODELO', pista: '...', fila: 0, col: 2, dir: 'H'|'V', largo: 6 }
    ]
  }
  ```
  Determinista: misma semilla y opciones ⇒ mismo objeto (JSON idéntico). Debe colocar ≥ minPalabras palabras y todas cruzadas
  (ninguna palabra aislada salvo la primera). Numeración estilo crucigrama: celda inicio de palabra numerada por fila/columna, H y V
  que empiezan en la misma celda comparten número.
- `export function validarCrucigrama(puzzle)` → `{ ok: boolean, errores: string[] }`: celdas consistentes con palabras, sin palabras
  adyacentes que formen secuencias no declaradas, letras válidas, sin duplicados, todas conectadas.

## static/tablero.js  (UI del tablero y pistas)
- `export function montarTablero(contenedores, puzzle, opciones = {})`
  contenedores: `{ tablero: HTMLElement, pistas: HTMLElement }`
  opciones: `{ onCambio(estado) }` — se llama tras cada letra escrita/borrada con el resultado de `estado()`.
  Dibuja la grilla (celdas blancas con <input maxlength=1 inputmode=text autocapitalize=characters>, negras vacías, numeritos),
  lista de pistas Horizontales / Verticales clicables, resalta palabra activa, navegación con flechas, Backspace, Tab, Enter,
  clic en celda ya activa alterna H/V, avanza al escribir, salta celdas llenas no. Accesible (aria-label por celda).
  Devuelve controlador:
  ```
  {
    estado(): { total, llenas, correctas, incorrectas, completo (todas llenas), perfecto (todas correctas),
                porPalabra: { [id]: 'ok'|'mal'|'incompleta' } },
    respuestas(): (string|null)[][]        // letra escrita o '' por celda blanca, null por negra
    cargar(respuestas),                     // restaura letras
    revisar(),                              // pinta .mal en celdas incorrectas y .ok en correctas, devuelve estado()
    limpiarMarcas(),
    bloquear(), desbloquear(),
    enfocarPrimera()
  }
  ```
- Clases CSS que debe emitir: `.grilla`, `.celda`, `.celda.negra`, `.celda.activa`, `.celda.en-palabra`, `.celda.ok`, `.celda.mal`,
  `.numero`, `.pistas`, `.pistas h3`, `.pista`, `.pista.activa`, `.pista.ok`.
- CSS en `static/crucigrama.css` (grilla con CSS grid, variable `--n` columnas, responsive hasta 360px de ancho, celdas cuadradas).

## static/cronometro.js
- `export function crearCronometro(onTick, intervaloMs = 100)` → `{ iniciar(desdeMs = 0), pausar(), reanudar(), detener(): ms, transcurrido(): ms, corriendo(): boolean }`
  Basado en `performance.now()/Date.now()`, no acumula deriva de setInterval. onTick(ms).
- `export function formatearTiempo(ms)` → 'MM:SS.d' (ej. '01:05.3'); horas si ≥ 1 h → 'H:MM:SS.d'.

## static/partidas.js  (localStorage)
- `export const LLAVE_PARTIDAS = 'crucigrama-ia:partidas'`, `export const LLAVE_EN_CURSO = 'crucigrama-ia:en-curso'`
- Partida: `{ id, jugador, semilla, inicio (ISO), fin (ISO), duracionMs, completada: boolean, correctas, total, revisiones, respuestas }`
- `guardarPartida(partida)` → partida con id asignado (si no tiene), persiste (máx 200, borra las más viejas).
- `listarPartidas()` → array ordenado por fin desc. `partidasDeSemilla(semilla)`. `mejorPartida(semilla?)` → la completada con menor duracionMs.
- `borrarPartida(id)`, `borrarTodo()`.
- `guardarEnCurso(estado)`, `cargarEnCurso()`, `borrarEnCurso()` — para reanudar `{ jugador, semilla, inicio, transcurridoMs, respuestas, revisiones }`.
- `exportarPartidasJson()` → string JSON; `importarPartidasJson(texto)` → número importadas (valida forma).
- Todo con try/catch: si localStorage no existe, funciona en memoria.

## static/exportar.js  (anuncio de ganador)
- `export function textoAnuncio(partida, extra = {})` → string español, ej:
  "🏆 ¡Ganador del Crucigrama IA!\n👤 Ana Pérez\n⏱ Tiempo: 02:14.5\n🧩 Semilla: K7Q2ZP · 10/10 palabras\n📅 22/11/2026\n#JMDLearning"
  extra: `{ titulo, hashtag }`.
- `export async function copiarAnuncio(partida)` → boolean (navigator.clipboard con fallback execCommand).
- `export function descargarAnuncioTxt(partida)` → descarga `ganador-<semilla>.txt`.
- `export function dibujarAnuncio(canvas, partida, extra)` → pinta tarjeta 1080×1080 (fondo crema, acento naranja #d97757, tipografía system).
- `export function descargarAnuncioPng(partida, extra)` → descarga `ganador-<semilla>.png` con canvas.toBlob.
- `export async function compartirAnuncio(partida)` → usa navigator.share si existe, si no devuelve false.
- `export function descargarPartidasJson()` → descarga `partidas-crucigrama.json`.

## static/app.js + index.html (integración, lo hace el coordinador)
Pantallas: inscripción (nombre + semilla opcional) → juego (tablero, cronómetro, pistas, botones Revisar / Reiniciar / Nueva semilla)
→ resultado (tiempo, aciertos, anuncio de ganador con Copiar / PNG / TXT / Compartir) → historial (tabla de partidas, mejor tiempo,
exportar/importar JSON, borrar).
