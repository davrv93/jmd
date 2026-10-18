---
name: s2-robo-aula
description: Hechos del kit robo-local-nube para construir Robo (el asistente web de la sesión 2) en la laptop del alumno (Windows 10/11 sin Git Bash, macOS o Linux, sin GPU): carpeta trabajo/robo, puerto 8788, lanzador robo.py multiplataforma, verificador portable de criterios, qué rutas deja pasar el visor, servicios de la nube del curso por el aula local 8800, y qué puede personalizar el alumno (nombre, color, avatar robot u osito, tono) sin tocar los módulos 3D. Úsalo ANTES de crear o arrancar cualquier archivo de Robo. Palabras gatillo: Robo, aula, kit, visor, puerto 8788, arrancar servidor, robo.py, uvicorn, OSITO_TOKEN, asistente_apagado, "no abre en el visor", personalidad, avatar, osito.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo en el kit: el terreno

## Cuándo usar

Siempre primero. Esta skill no construye nada: dice dónde se escribe, cómo se arranca, qué deja pasar el visor y qué puede cambiar el alumno. Las piezas viven en `s2-robo-chat`, `s2-robo-avatar`, `s2-robo-voz`, `s2-robo-imagen`, `s2-robo-flyer` y `s2-robo-pruebas`.

## Hechos del kit (no los contradigas)

- Corre en la laptop del alumno: Windows, macOS o Linux, sin GPU. Python 3.10+ en `.venv` con fastapi, uvicorn, httpx, pillow y python-multipart. NO hay torch, Ollama, whisper ni modelos: no instales paquetes ni descargues modelos.
- Funciona en Windows 10/11 sin Git Bash ni WSL. Usa `python` (el del entorno, activado por `entorno.sh` o `entorno.ps1`) y rutas con `/` o `pathlib`; nada de `bash`, `fork` ni `SIGKILL`.
- Cada criterio del plan tiene su versión portable: `python herramientas/verificar.py <ID>` (por ejemplo `F1-T2`) dice PASA o FALLA en cualquier sistema. Los `curl`, `grep` y `test` del plan son la misma prueba para quien tenga `sh`.
- Robo vive en `trabajo/robo/` (plano): `servidor.py`, `cerebro.py`, `pintor.py`, `flyer.py`, `personalidad.json`, `index.html`, `app.js`, `robo.py`, `imagenes/`. Ejecuta los comandos desde la raíz del kit.
- Servicios (ya corriendo en el aula local, `http://127.0.0.1:8800`, que los reenvía a la nube del curso con el token del alumno):
  - texto: `http://127.0.0.1:8800` (variable `JMD_URL`), formato OpenAI, modelo `clase`;
  - imagen y voz Piper: `http://127.0.0.1:8800/imagen` (variable `IMAGEN_URL`). **Solo existe la calidad `maxima`**; `baja` y `media` responden 422 `calidad_no_disponible`;
  - dictado (Whisper en el servidor del curso): `http://127.0.0.1:8800/stt` (variable `STT_URL`).
- Clave: `$OSITO_TOKEN`. Aquí vale cualquier texto («local»): el token real del alumno lo pone el aula local y vive fuera del kit. Léela con `os.environ`; nunca la imprimas, nunca leas ni copies el archivo del token y nunca escribas claves en archivos.
- El visor sirve `trabajo/` en `http://127.0.0.1:8800/vista/yo/...` y reenvía al puerto 8788 SOLO `/api/chat`, `/api/stt`, `/api/imagen`, `/api/voz`, `/api/salud`, `/api/estado` y `/api/imagenes/*`. Otra ruta da 404 en el visor aunque con `curl` funcione.
- El aula local solo atiende a `127.0.0.1`/`localhost` y rechaza peticiones que vengan de otras páginas.

## Lo que el alumno puede cambiar (y cómo)

Todo lo personal vive en `trabajo/robo/personalidad.json`; el código lo lee, no lo repite:

| Campo | Regla |
|---|---|
| `nombre` | 1 a 24 caracteres: letras, números, espacio, `.`, `_`, `-`. Sanea lo que diga el alumno (quita comillas, `<`, `>`, emojis). Se muestra con `textContent`, nunca como HTML. |
| `avatar` | `robot` u `osito`. |
| `color` | Hexadecimal `#rrggbb`. Si el alumno dice un nombre, conviértelo: azul `#2f6bff`, rojo `#e5484d`, verde `#2fbf71`, morado `#8b5cf6`, rosa `#ec4899`, naranja `#f97316`, amarillo `#eab308`, celeste `#38bdf8`. Si no cuadra con `^#[0-9a-fA-F]{6}$`, pregunta otra vez. |
| `tono` | Hasta 60 caracteres («cercano y breve»). |
| `negocio`, `faq`, `estilo_imagen` | Ver `s2-robo-chat` (`estilo_imagen` en INGLÉS). |

- El avatar se elige y se tiñe SOLO con los parámetros de `montarAvatar` de `modulos/avatar.js`: `montarAvatar(canvas, {tipo, color})`. En el robot el color tiñe los acentos; en el osito, el pelaje.
- Los módulos 3D (`modulos/avatar.js`, `robot.js`, `osito.js`, `RoundedBoxGeometry.js`, `three.module.min.js`) NUNCA se copian, se editan ni se reescriben. Se importan de `/api/v1/live/pa-02/comun/`. Nada de `filter: hue-rotate`.
- Comprueba cada cambio: `python herramientas/revisar.py personalidad` y `python herramientas/revisar.py modulos`.

## Pasos

1. Crea la carpeta `trabajo/robo/imagenes` (con tu herramienta de archivos; `servidor.py` también la crea).
2. Crea `trabajo/robo/robo.py` (arranca, para y reinicia en Windows, macOS y Linux; guarda el PID en `trabajo/robo/.robo.pid` y el log en `trabajo/robo.log`, en UTF-8):
   ```python
   """python trabajo/robo/robo.py arrancar | parar | reiniciar | estado | log"""
   import os, signal, socket, subprocess, sys, time
   from pathlib import Path

   AQUI = Path(__file__).resolve().parent
   PUERTO = int(os.environ.get("ROBO_PUERTO", "8788"))
   PID = AQUI / ".robo.pid"
   LOG = AQUI.parent / "robo.log"
   ENTORNO = {"OSITO_TOKEN": "local", "JMD_URL": "http://127.0.0.1:8800",
              "IMAGEN_URL": "http://127.0.0.1:8800/imagen", "STT_URL": "http://127.0.0.1:8800/stt"}
   VER_PUERTO = f"netstat -ano | findstr :{PUERTO}" if os.name == "nt" else f"lsof -i :{PUERTO}"

   def vivo():
       with socket.socket() as s:
           s.settimeout(0.5)
           return s.connect_ex(("127.0.0.1", PUERTO)) == 0

   def mio():
       try:
           return int(PID.read_text().strip())
       except (OSError, ValueError):
           return None

   def parar():
       pid = mio()
       if pid:
           if os.name == "nt":   # Windows: sin señales; taskkill cierra el proceso y sus hijos
               subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
           else:
               try:
                   os.kill(pid, signal.SIGTERM)
               except OSError:
                   pass
           PID.unlink(missing_ok=True)
       for _ in range(40):
           if not vivo():
               return print("parado")
           time.sleep(0.25)
       print(f"el puerto {PUERTO} sigue ocupado por otro programa. Para verlo: {VER_PUERTO}")

   def arrancar():
       if vivo():
           return print("ya arrancado" if mio() else f"el puerto {PUERTO} está ocupado por otro programa. Para verlo: {VER_PUERTO}")
       env = {**ENTORNO, **os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
       extra = ({"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS}
                if os.name == "nt" else {"start_new_session": True})
       with open(LOG, "ab") as log:
           p = subprocess.Popen([sys.executable, "-m", "uvicorn", "servidor:app", "--host", "127.0.0.1", "--port", str(PUERTO)],
                                cwd=AQUI, env=env, stdout=log, stderr=log, stdin=subprocess.DEVNULL, **extra)
       PID.write_text(str(p.pid))
       for _ in range(80):
           if vivo():
               return print(f"arrancado en {PUERTO}")
           if p.poll() is not None:
               break
           time.sleep(0.25)
       print("no arrancó; últimas líneas de trabajo/robo.log:")
       ver_log()

   def ver_log(n=20):
       if LOG.exists():
           print("".join(LOG.read_text(encoding="utf-8", errors="replace").splitlines(True)[-n:]))

   orden = sys.argv[1] if len(sys.argv) > 1 else "estado"
   if orden == "arrancar":
       arrancar()
   elif orden == "parar":
       parar()
   elif orden == "reiniciar":
       parar(); time.sleep(0.5); arrancar()
   elif orden == "estado":
       print("arrancado" if vivo() and mio() else ("parado" if not vivo() else f"el puerto {PUERTO} lo usa otro programa ({VER_PUERTO})"))
   elif orden == "log":
       ver_log()
   else:
       sys.exit("uso: python trabajo/robo/robo.py arrancar|parar|reiniciar|estado|log")
   ```
   En macOS y Linux puedes crear además `trabajo/robo/robo.sh`, envoltorio de una línea: `exec python3 "$(dirname "$0")/robo.py" "$@"`. Los criterios usan `python trabajo/robo/robo.py`, que vale en los dos sistemas.
3. Cada vez que cambies un `.py` o `personalidad.json`: `python trabajo/robo/robo.py reiniciar`. `index.html` y `app.js` se sirven tal cual: basta recargar el visor.
4. Comprueba: `curl -s localhost:8788/api/salud` (en cualquier sistema: `python herramientas/verificar.py F1-T2`). Si falla: `python trabajo/robo/robo.py log`.
5. Abre el visor: `http://127.0.0.1:8800/vista/yo/robo/`.

## Errores típicos

- El visor dice `asistente_apagado`: Robo no está arrancado. `python trabajo/robo/robo.py arrancar`.
- «el puerto 8788 está ocupado por otro programa»: míralo con `netstat -ano | findstr :8788` (Windows) o `lsof -i :8788` (macOS) y ciérralo, o usa otro puerto con `ROBO_PUERTO` (y `ROBO_URL` al arrancar el aula).
- `ModuleNotFoundError: fastapi`: no activaste el entorno. `. ./entorno.sh` (Windows PowerShell: `. .\entorno.ps1`).
- `ModuleNotFoundError: cerebro`: uvicorn debe arrancar desde `trabajo/robo` (robo.py ya lo hace).
- `401 token_invalido` o `sin_token`: el token del alumno venció. Que corra `sh iniciar.sh --token` (Windows: `iniciar.bat --token`). Tú no lo toques.
- Una ruta propia da 404 en el visor: no está en la lista de arriba; cuélgala de `/api/imagen` o `/api/chat`.
- La imagen no carga en el visor: guarda en `trabajo/robo/imagenes/` y devuelve la URL relativa `imagenes/<id>.jpg`.
- Dudas de si la clave existe: `test -n "$OSITO_TOKEN" && echo definida` (nunca `echo $OSITO_TOKEN`).

## Versión corta para modelos pequeños

1. Todo va en `trabajo/robo/`. Puerto 8788. Comandos con `python` (valen en Windows y macOS); criterios portables con `python herramientas/verificar.py <ID>`.
2. Crea `robo.py` y arranca con `python trabajo/robo/robo.py arrancar`; tras cambiar un `.py`, `reiniciar`.
3. Prueba con `python herramientas/verificar.py F1-T2`. Si falla, `python trabajo/robo/robo.py log`.
4. Servicios: texto `http://127.0.0.1:8800` (modelo `clase`), imagen y voz `/imagen` (solo `maxima`), dictado `/stt`.
5. Lo personal va en `personalidad.json` (nombre saneado, color `#rrggbb`, avatar robot u osito). Los módulos 3D no se tocan.
6. La clave es `$OSITO_TOKEN`. Nunca la imprimas ni la guardes.
