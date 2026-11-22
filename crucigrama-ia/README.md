# Crucigrama IA

Crucigrama de inteligencia artificial generado en el navegador a partir de una **semilla**.
Misma semilla ⇒ mismo tablero, así varias personas compiten contra el reloj en igualdad.

- Sin backend: abre `web/index.html` con cualquier servidor estático (`python3 -m http.server -d web 8080`).
- Comparte un tablero con `index.html?semilla=K7Q2ZP`.
- Las partidas se guardan en `localStorage` del navegador; se pueden exportar e importar como JSON.
- Al completar el tablero se genera el **anuncio del ganador** (texto, PNG 1080×1080, TXT o `navigator.share`).

## Módulos (`web/static/`)

| Archivo | Qué hace |
| --- | --- |
| `semilla.js` | Normaliza la semilla y crea un RNG determinista (xmur3 + mulberry32). |
| `generador.js` | Banco de palabras/pistas y `generarCrucigrama(semilla)` + `validarCrucigrama`. |
| `tablero.js` / `crucigrama.css` | Grilla interactiva, pistas, navegación con teclado y revisión. |
| `cronometro.js` | Cronómetro sin deriva y `formatearTiempo`. |
| `partidas.js` | Persistencia en localStorage (historial, partida en curso, export/import). |
| `exportar.js` | Anuncio del ganador: texto, portapapeles, TXT, PNG, compartir. |
| `app.js` | Integra las pantallas: inscripción → juego → resultado → historial. |

El contrato entre módulos está en `CONTRATO.md`.

## Pruebas

```bash
node --test 'crucigrama-ia/tests/*.test.mjs'
node crucigrama-ia/prueba-navegador.mjs   # recorrido completo con Playwright (Chromium)
```
