---
name: s2-robo-aula
description: Hechos del aula del alumno para construir Robo (el asistente web de la sesión 2): carpeta /trabajo/robo, puerto 8766, cómo arrancar y reiniciar el servidor sin bash, qué rutas deja pasar el visor, token y servicios de la clase. Úsalo ANTES de crear o arrancar cualquier archivo de Robo. Palabras gatillo: Robo, aula, visor, puerto 8766, arrancar servidor, uvicorn, OSITO_TOKEN, asistente_apagado, "no abre en el visor", robo.sh.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo en el aula: el terreno

## Cuándo usar

Siempre primero. Esta skill no construye nada: dice dónde se escribe, cómo se arranca y qué deja pasar el visor. Las piezas viven en `s2-robo-chat`, `s2-robo-avatar`, `s2-robo-voz`, `s2-robo-imagen`, `s2-robo-flyer` y `s2-robo-pruebas`.

## Hechos del aula (no los contradigas)

- Es Alpine: hay `sh`, no `bash`. Python 3 está en `/opt/venv` (fastapi, uvicorn, httpx, pillow, python-multipart). No hay Node, Ollama, whisper ni descargas de modelos.
- Memoria 192 MB y 0,5 CPU: un solo proceso `uvicorn`, sin `--reload`.
- Robo vive en `/trabajo/robo/` (plano): `servidor.py`, `cerebro.py`, `pintor.py`, `flyer.py`, `personalidad.json`, `index.html`, `app.js`, `robo.sh`, `imagenes/`. `/trabajo` persiste; `/tmp` no.
- Servicios ya activos: texto `http://ai-orchestrator:4000` (variable `JMD_URL`, modelo `clase`), imagen y voz `http://imagen:8000`. Clave: `$OSITO_TOKEN`, ya definida. Léela con `os.environ`; nunca la escribas en un archivo ni la imprimas.
- El visor sirve `/trabajo` en `/vista/<tú>/...` y reenvía al puerto 8766 SOLO `/api/chat`, `/api/stt`, `/api/imagen`, `/api/salud`, `/api/estado` y `/api/imagenes/*`. Otra ruta (por ejemplo `/api/voz`) da 404 en el visor aunque con `curl` funcione.
- El visor sirve estos tipos: html, css, js, json, svg, png, jpg, webp, txt, md (máximo 5 MB). `.py` no.
- La página corre con `connect-src 'self'`: sin fuentes de Google ni librerías de otro CDN.
- Toda carpeta con `index.html` aparece en el selector del visor.

## Pasos

1. Crea la carpeta: `mkdir -p /trabajo/robo/imagenes`.
2. Crea `/trabajo/robo/robo.sh` (un solo comando para arrancar, parar y reiniciar):
   ```sh
   #!/bin/sh
   # robo.sh arrancar | parar | reiniciar | estado
   cd "$(dirname "$0")" || exit 1
   PID=/tmp/robo.pid
   PUERTO="${ROBO_PUERTO:-8766}"
   vivo() { [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; }
   parar() { vivo && kill "$(cat "$PID")"; rm -f "$PID"; echo parado; }
   arrancar() {
     vivo && { echo "ya arrancado"; return; }
     aula parar >/dev/null 2>&1   # el asistente de ejemplo ocupa el mismo puerto
     nohup uvicorn servidor:app --host 0.0.0.0 --port "$PUERTO" >> /trabajo/robo.log 2>&1 &
     echo $! > "$PID"; sleep 2
     if vivo; then echo "arrancado en $PUERTO"; else echo "no arrancó:"; tail -n 15 /trabajo/robo.log; fi
   }
   case "${1:-estado}" in
     arrancar) arrancar ;;
     parar) parar ;;
     reiniciar) parar; sleep 1; arrancar ;;
     estado) if vivo; then echo arrancado; else echo parado; fi ;;
     *) echo "uso: sh robo.sh arrancar|parar|reiniciar|estado" >&2; exit 2 ;;
   esac
   ```
3. Cada vez que cambies un `.py` o `personalidad.json` (se lee al arrancar): `sh /trabajo/robo/robo.sh reiniciar`. `index.html` y `app.js` se sirven tal cual: basta recargar el visor.
4. Comprueba: `curl -s localhost:8766/api/salud`. Si falla: `tail -n 20 /trabajo/robo.log`.
5. Abre el visor y elige `robo` (o escribe `robo/index.html` en la barra).

## Errores típicos

- El visor dice `asistente_apagado`: Robo no está arrancado. Usa `sh robo.sh arrancar`. NO uses `aula iniciar`: arranca el asistente de ejemplo, que ocupa el mismo puerto.
- `Address already in use`: `sh /trabajo/robo/robo.sh parar` y luego `aula parar`.
- `ModuleNotFoundError: cerebro`: `uvicorn` debe arrancar desde `/trabajo/robo` (robo.sh ya lo hace).
- `/api/voz` o una ruta propia da 404 en el visor: no está en la lista de arriba; cuélgala de `/api/imagen` o `/api/chat`.
- La imagen no carga en el visor: guarda en `/trabajo/robo/imagenes/` y devuelve la URL relativa `imagenes/<id>.jpg`.
- Dudas de si la clave existe: `test -n "$OSITO_TOKEN" && echo definida` (nunca `echo $OSITO_TOKEN`).

## Versión corta para modelos pequeños

1. Todo va en `/trabajo/robo/`. Puerto 8766. Sin bash: usa `sh`.
2. Crea `robo.sh` y arranca con `sh /trabajo/robo/robo.sh arrancar`.
3. Tras cambiar un `.py`: `sh /trabajo/robo/robo.sh reiniciar`.
4. Prueba con `curl -s localhost:8766/api/salud`. Si falla, lee `/trabajo/robo.log`.
5. Rutas que pasan por el visor: `/api/chat`, `/api/imagen`, `/api/salud`, `/api/stt`, `/api/estado`. Ninguna otra.
6. La clave es `$OSITO_TOKEN`. Nunca la imprimas ni la guardes.
