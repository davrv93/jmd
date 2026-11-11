---
name: pruebas-de-rendimiento
description: Úsalo cuando hay que medir si algo es rápido de verdad y decidir pasa/no pasa con números: web (Lighthouse, LCP, INP, CLS, peso de JS), escenas Three.js (draw calls, triángulos, fps en móvil), backend (k6, hey, oha, p50/p95/p99), modelos locales (tokens/s de Ollama) y transcripción (factor de tiempo real de Whisper). Palabras gatillo: lento, rendimiento, performance, Lighthouse, fps, latencia, p95, carga, tokens por segundo, benchmark, presupuesto de peso.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Pruebas de rendimiento: medir con comandos exactos y decidir con umbrales

## Cuándo usar

Cuando alguien dice "está lento" o "parece rápido" y hay que reemplazar el adjetivo por un número con unidad. También antes de dar por cerrado un entregable que el usuario va a usar en un celular de gama media, en una obra con 4G irregular, o en un servidor de 2 GiB de RAM. Y siempre que se vaya a elegir un modelo local para un asistente: la decisión la toman los tokens por segundo, no la ficha técnica.

No lo uses para optimizar antes de medir. Primero el número, después el cambio, después el mismo número otra vez.

## Principios

1. Un número sin unidad ni condición no es una medición. "LCP 2,1 s en Moto G de gama media con 4G simulado" sí lo es.
2. Mide tres veces y reporta la mediana. Una sola corrida es ruido.
3. Fija el umbral antes de medir. Si lo fijas después, siempre pasa.
4. Mide en el dispositivo más pobre que va a usar el sistema, no en la laptop de desarrollo.
5. Percentiles, no promedios. El promedio esconde al 5 % de usuarios que esperan 8 segundos.
6. Lo que se mide en laboratorio (Lighthouse, k6) se confirma en campo (web-vitals en producción, logs reales). Las dos cifras deben contarse.
7. Cada medición queda registrada con fecha, comando exacto y resultado, para poder repetirla tras cada cambio.

## Procedimiento paso a paso

### A. Web: Lighthouse y Core Web Vitals

1. Umbrales que se fijan antes de medir: LCP < 2,5 s, INP < 200 ms, CLS < 0,1. En laboratorio, Lighthouse no mide INP en modo navegación; usa TBT (Total Blocking Time) < 200 ms como sustituto y mide INP real en campo con `web-vitals`.
2. Corre Lighthouse en modo móvil (es el valor por defecto) contra la URL desplegada o local:
   ```bash
   npx lighthouse https://TU-URL --only-categories=performance --output=json --output-path=./lh.json --chrome-flags="--headless" --quiet
   ```
3. Extrae los tres valores sin abrir el informe:
   ```bash
   jq '{lcp_ms: .audits["largest-contentful-paint"].numericValue, cls: .audits["cumulative-layout-shift"].numericValue, tbt_ms: .audits["total-blocking-time"].numericValue, puntaje: (.categories.performance.score*100)}' lh.json
   ```
4. Repite el paso 2 tres veces y toma la mediana de cada métrica. Si una corrida difiere más del 30 % de las otras, descártala y vuelve a correr.
5. Para INP y los valores de campo, añade a la aplicación:
   ```js
   import { onLCP, onINP, onCLS } from 'web-vitals';
   onLCP(m => console.log('LCP', Math.round(m.value), 'ms'));
   onINP(m => console.log('INP', Math.round(m.value), 'ms'));
   onCLS(m => console.log('CLS', m.value.toFixed(3)));
   ```
   Abre la página en un celular real conectado por `chrome://inspect` y lee la consola tras interactuar 30 segundos.

### B. Presupuesto de peso

6. Umbral: JavaScript total comprimido < 300 KB. Mide sobre la carpeta de salida del build (`dist/` en Vite):
   ```bash
   for f in dist/assets/*.js; do gzip -9 -c "$f" | wc -c; done | awk '{s+=$1} END {printf "JS comprimido: %.0f KB\n", s/1024}'
   ```
7. Si pasa de 300 KB, lista los archivos de mayor a menor para saber a quién culpar:
   ```bash
   for f in dist/assets/*.js; do printf "%8d KB  %s\n" $(( $(gzip -9 -c "$f" | wc -c) / 1024 )) "$f"; done | sort -rn | head -5
   ```

### C. Medir un tramo con `performance.now()`

8. Para saber cuánto tarda una función, un render o una petición desde el código:
   ```js
   const t0 = performance.now();
   await cargarTablero();            // lo que se mide
   const ms = performance.now() - t0;
   console.log(`cargarTablero: ${ms.toFixed(1)} ms`);
   ```
   Corre diez veces y anota la mediana. En Node también existe `performance.now()` desde `perf_hooks`.

### D. Three.js

9. Umbrales para móvil medio (Android de 3 a 4 GB de RAM, chip de gama media de hace 2 o 3 años): 60 fps estables, menos de 100 draw calls, menos de 300 000 triángulos en pantalla, menos de 50 texturas cargadas.
10. Lee los contadores del renderer una vez por segundo en el bucle:
   ```js
   let ultimo = performance.now(), cuadros = 0;
   function animar() {
     cuadros++;
     const ahora = performance.now();
     if (ahora - ultimo >= 1000) {
       const i = renderer.info;
       console.log(`fps ${cuadros} | calls ${i.render.calls} | tri ${i.render.triangles} | geom ${i.memory.geometries} | tex ${i.memory.textures}`);
       cuadros = 0; ultimo = ahora;
     }
     renderer.render(escena, camara);
     requestAnimationFrame(animar);
   }
   animar();
   ```
11. Mide en el celular real por `chrome://inspect`, no en la laptop. Si no hay celular, en DevTools activa "Performance > CPU 4x slowdown" y acepta que es una aproximación.
12. Si baja de 60 fps: primero reduce draw calls (fusiona geometrías, usa `InstancedMesh`), después triángulos (LOD, decimación), después texturas (tamaño potencia de dos, compresión KTX2).

### E. Backend: latencia bajo carga

13. Umbrales típicos para una API de ERP interno: p50 < 200 ms, p95 < 500 ms, p99 < 1 000 ms, errores < 1 %. Ajusta y escribe los tuyos antes de correr.
14. Con `hey` (instalar: `brew install hey` o `go install github.com/rakyll/hey@latest`), 20 usuarios concurrentes durante 30 segundos:
   ```bash
   hey -z 30s -c 20 -H "Authorization: Bearer $TOKEN" https://TU-API/api/health 2>&1 | grep -E "Requests/sec|50%|95%|99%|\[2|\[5"
   ```
15. Con `oha` (instalar: `brew install oha` o `cargo install oha`), misma carga y salida sin interfaz:
   ```bash
   oha -z 30s -c 20 --no-tui -H "Authorization: Bearer $TOKEN" https://TU-API/api/health 2>&1 | grep -E "Requests/sec|50.00%|95.00%|99.00%|\[2|\[5"
   ```
16. Con `k6` (instalar: `brew install k6`), guarda `carga.js`:
   ```js
   import http from 'k6/http';
   import { check } from 'k6';
   export const options = {
     vus: 20, duration: '30s',
     thresholds: { http_req_duration: ['p(95)<500', 'p(99)<1000'], http_req_failed: ['rate<0.01'] },
   };
   export default function () {
     const r = http.get(`${__ENV.URL}/api/health`, { headers: { Authorization: `Bearer ${__ENV.TOKEN}` } });
     check(r, { 'status 200': (res) => res.status === 200 });
   }
   ```
   y corre:
   ```bash
   URL=https://TU-API TOKEN=$TOKEN k6 run --summary-trend-stats="med,p(95),p(99)" carga.js 2>&1 | grep -E "http_req_duration|http_req_failed|checks|status 200"
   ```
   k6 termina con código distinto de cero si un umbral falla: eso es el pasa/no pasa.
17. Nunca lances carga contra producción en horario de uso. Usa un entorno de pruebas o la madrugada acordada con el dueño.

### F. Modelos locales en Ollama

18. Umbral orientativo para un asistente conversacional: más de 15 tokens/s de generación lo hace fluido; entre 8 y 15 es usable; por debajo de 8 el usuario se desespera.
19. Mide con la bandera `--verbose`, que imprime tiempos al final de la respuesta:
   ```bash
   ollama run qwen3:1.7b --verbose "Explica en dos frases qué es un sílabo universitario." 2>&1 | grep -E "eval rate|total duration|prompt eval rate"
   ```
   La línea `eval rate: NN tokens/s` es la velocidad de generación; `prompt eval rate` es la de lectura del prompt.
20. Para medirlo sin terminal interactiva o desde un script, usa la API:
   ```bash
   curl -s http://localhost:11434/api/generate -d '{"model":"qwen3:1.7b","prompt":"Explica en dos frases qué es un sílabo.","stream":false}' | jq '{tokens: .eval_count, seg: (.eval_duration/1e9), tps: (.eval_count/(.eval_duration/1e9))}'
   ```
21. Repite tres veces; la primera suele ser más lenta porque carga el modelo en memoria. Reporta la mediana de las tres.

### G. Whisper: factor de tiempo real

22. El factor de tiempo real (RTF) es `tiempo de procesamiento / duración del audio`. RTF < 1 significa que transcribe más rápido de lo que se habla. Umbral para uso en vivo: RTF < 0,5; para transcripción posterior: RTF < 2.
23. Mide la duración del audio:
   ```bash
   ffprobe -v error -show_entries format=duration -of csv=p=0 audio.wav
   ```
24. Mide el tiempo de transcripción (ejemplo con el paquete `openai-whisper`; con `faster-whisper` o `whisper.cpp` cambia el ejecutable, no el método):
   ```bash
   /usr/bin/time -p whisper audio.wav --model small --language es --output_format txt 2>&1 | grep real
   ```
25. Divide `real` entre la duración del audio. Anota modelo, equipo y si usó GPU.

### H. Cierre

26. Registra cada medición en `MEDICIONES.md` con la plantilla. Decide pasa/no pasa por métrica. Si alguna no pasa, abre una tarea en `PLAN_TRABAJO.md` con el número actual y el umbral.

## Reglas duras

- Fija el umbral por escrito antes de correr el comando.
- Tres corridas como mínimo; reporta la mediana, no la mejor.
- Nunca pruebes carga contra producción en horario de uso ni sin avisar al dueño del servidor.
- Nunca pongas el token real en el documento ni en el historial del chat; usa `$TOKEN`.
- Mide en el dispositivo más pobre del público objetivo, o declara que la cifra es de laboratorio.
- Percentiles siempre; el promedio solo acompaña, nunca decide.
- Una métrica que no pasa no se "redondea": abre tarea.
- No cambies dos cosas entre dos mediciones; no sabrás cuál ayudó.

## Lista de comprobación

- [ ] Umbrales escritos antes de medir (LCP, INP/TBT, CLS, peso JS, fps, p95, tokens/s, RTF según aplique).
- [ ] Lighthouse corrido tres veces con `--only-categories=performance`; mediana extraída con `jq`.
- [ ] `web-vitals` instalado si hace falta INP real.
- [ ] Peso de JS comprimido medido sobre `dist/` y bajo 300 KB.
- [ ] Three.js: fps, draw calls y triángulos leídos de `renderer.info` en celular real.
- [ ] Backend: p50/p95/p99 y tasa de error con `hey`, `oha` o `k6`, fuera de horario de uso.
- [ ] Ollama: `eval rate` medido tres veces, mediana anotada.
- [ ] Whisper: RTF calculado con duración por `ffprobe`.
- [ ] Cada medición registrada con fecha, comando y resultado.
- [ ] Veredicto pasa/no pasa por métrica; las que no pasan tienen tarea.

## Plantilla

```markdown
# MEDICIONES: [sistema] · [fecha]
Equipo de prueba: [modelo de celular / laptop / servidor, RAM, red]

| Métrica | Umbral | Comando (resumido) | Corrida 1 | Corrida 2 | Corrida 3 | Mediana | Veredicto |
|---------|--------|--------------------|-----------|-----------|-----------|---------|-----------|
| LCP | < 2,5 s | lighthouse + jq | | | | | pasa / no pasa |
| TBT (lab) | < 200 ms | lighthouse + jq | | | | | |
| INP (campo) | < 200 ms | web-vitals en celular | | | | | |
| CLS | < 0,1 | lighthouse + jq | | | | | |
| JS comprimido | < 300 KB | gzip sobre dist/ | | | | | |
| fps Three.js | 60 | renderer.info en celular | | | | | |
| Draw calls | < 100 | renderer.info | | | | | |
| p95 API | < 500 ms | hey -z 30s -c 20 | | | | | |
| p99 API | < 1 000 ms | hey -z 30s -c 20 | | | | | |
| Errores API | < 1 % | hey / k6 | | | | | |
| Ollama tokens/s | > 15 | ollama run --verbose | | | | | |
| Whisper RTF | < 0,5 | time whisper / ffprobe | | | | | |

## Tareas abiertas por métricas que no pasan
- [métrica]: [valor actual] frente a [umbral] → [ID en PLAN_TRABAJO]
```

## Aprendido en la demo Robo (10-10-2026)

Cifras medidas en una Mac Apple Silicon de 24 GB. Sirven de referencia, no de umbral universal.

| Pieza | Tiempo | Huella en memoria |
|---|---|---|
| Chat `qwen3:1.7b` (Ollama) | 1,7 s por respuesta | ~1,5 GB |
| Voz a texto whisper small (CPU int8) | 1,7 s por frase de 4 s (RTF 0,43) | ~0,5 GB |
| Imagen sd-turbo fp16, 512 px | 1,4 a 2,3 s en caliente (2,2 s en la demo); ~20 s la primera con carga | 5 GB |
| Flyer sdxl-turbo fp16 | 7 s en caliente, 27 s la primera | 12 GB |
| Imagen FLUX.2 Klein 4B a 4 bits (mflux 0.22), 1 MP | 32 a 55 s; flyer completo 45 s | 8 GB |
| Chrome con la escena Three.js | — | ~0,4 GB |

- sdxl-turbo en caliente es más rápido que sd-turbo y se ve mucho mejor. La primera imagen y las siguientes son dos cifras distintas: reporta las dos, etiquetadas.
- En macOS la huella real se mide con `footprint -p <pid>`. `ps -o rss` engaña porque los pesos en MPS viven fuera del RSS: 157 MB según `ps` frente a 4,97 GB reales. Comando: `footprint -p $(pgrep -f uvicorn | head -1) | tail -5`.
- Suma todo lo que corre a la vez antes de prometer que "cabe": Ollama 1,5 + whisper 0,5 + Chrome 0,4 + sd-turbo 5 son 7,4 GB; con sdxl-turbo pasan de 14 GB.
- Añade a la tabla de `MEDICIONES.md` una fila "Imagen local" con tiempo en caliente, tiempo de la primera y huella por `footprint` (o `nvidia-smi` en CUDA).

## Versión corta para modelos pequeños

Mide con estos comandos y compara con el umbral. Corre cada uno 3 veces. Usa la mediana.

1. Web: `npx lighthouse URL --only-categories=performance --output=json --output-path=lh.json --chrome-flags="--headless" --quiet`
2. Leer: `jq '.audits["largest-contentful-paint"].numericValue, .audits["cumulative-layout-shift"].numericValue, .audits["total-blocking-time"].numericValue' lh.json`
3. Umbrales web: LCP menor de 2500 ms. CLS menor de 0,1. TBT menor de 200 ms.
4. Peso JS: `for f in dist/assets/*.js; do gzip -9 -c "$f" | wc -c; done | awk '{s+=$1} END {print s/1024 " KB"}'`. Umbral: menor de 300 KB.
5. Tramo de código: `const t0=performance.now(); ...; console.log(performance.now()-t0)`.
6. Three.js: imprime `renderer.info.render.calls` y `renderer.info.render.triangles` cada segundo. Umbral: 60 fps, menos de 100 calls.
7. API: `hey -z 30s -c 20 URL | grep -E "50%|95%|99%"`. Umbral: p95 menor de 500 ms, p99 menor de 1000 ms.
8. Alternativa: `oha -z 30s -c 20 --no-tui URL`.
9. Ollama: `ollama run qwen3:1.7b --verbose "hola" 2>&1 | grep "eval rate"`. Umbral: más de 15 tokens/s.
10. Whisper: `ffprobe -v error -show_entries format=duration -of csv=p=0 audio.wav` y `time whisper audio.wav --model small --language es`. RTF = tiempo / duración. Umbral: menor de 0,5.
11. Anota cada resultado en la tabla MEDICIONES.md.
12. Si no pasa, abre tarea en PLAN_TRABAJO.md.

Prohibido: carga contra producción en horario de uso. Prohibido: escribir el token real. Prohibido: reportar la mejor corrida en lugar de la mediana.
