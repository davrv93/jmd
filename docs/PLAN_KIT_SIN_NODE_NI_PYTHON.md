# Plan de trabajo · El curso sin Node.js ni Python en la laptop del alumno

Fecha: 2026-10-18. Repositorio: `/Users/david.roncal/Documents/jmd`. Estado: propuesta, nada implementado.

Objetivo: que la laptop del alumno necesite solo **un navegador (Chrome o Edge) y un ejecutable que se abre con doble clic**.
Sin winget, sin PATH, sin permisos de administrador, sin `pip` y sin `npm`.

## 1. Dónde entran hoy Node y Python

| Pieza | Qué pide | Para qué | Archivo |
|---|---|---|---|
| Instalador de la clase 1 | Node 22 + npm | OpenCode (`npm i -g opencode-ai`), CLI de caveman (`npm install -g @caveman-ai/cli`), MCP de caveman (`npx -y caveman-mcp`), skill de caveman (`npx skills add`) | `instalador/instalar.ps1` (Paso-Node, líneas 164-170, 224, 252-280) y `instalar.sh` |
| Instalador de la clase 1 | Python 3.11+ | Solo para el kit de Robo de la clase 2 | `instalador/instalar.ps1` (Paso-Python, 172-178) |
| Lección 01 y ejemplo 18 | Node 18+ | `npm i -g opencode-ai` | `lessons/01-instalacion-y-conceptos.md:268`, `examples/18-instalar-todo.md` |
| Kit robo-local-nube (clase 2) | Python 3.10+ con fastapi, uvicorn, httpx, pillow, python-multipart | El aula local (`aula_local.py`, 426 líneas), la cuenta (`cuenta.py`, 214), los criterios (`herramientas/verificar.py`, 341; `revisar.py`, 125), el lanzador (`trabajo/robo/robo.py`, 129) y **el código que escribe el alumno** (`cerebro.py`, servidor, flyer con Pillow, `pruebas.py`) | `lms/aula/kit-robo-nube/` |
| JMDesign Studio | Python embebido | Solo para correr el kit | `jmdesign-studio/` |
| Clase 3 | Bun, PostgreSQL, Evolution Go | Ya corren en el aula de la nube; en la laptop es opcional y pide Docker | `lessons/03-whatsapp-y-despliegue.md:178` y `:412` |

Lo que falla en las laptops es la instalación y no el lenguaje: «No encuentro Python», `python` que abre la Microsoft Store, PATH sin recargar, PowerShell con scripts bloqueados, Node viejo, Documentos dentro de OneDrive, y Windows 7/8 sin soporte.
El parche v7 del kit es en buena parte un parche de lanzadores: el proceso del puerto 8788 que no muere, y las rutas de OneDrive.

## 2. Decisión propuesta

1. **Un binario Go, `robo`**, reemplaza todo el Python del kit: aula, cuenta, criterios, revisión, lanzador y scripts `iniciar.*`/`entorno.*`.
2. **El código del alumno pasa a JavaScript que corre en el navegador**: módulos ES, sin build y sin npm, igual que el front Lit de la clase 3. El navegador es el único runtime, y ya está instalado.
3. **Fuera del navegador, el JavaScript del alumno lo ejecuta el propio binario** con un motor JS embebido (goja, Go puro). Así corren los criterios de aceptación y las pruebas.
4. **El agente y sus herramientas se instalan como binarios**: OpenCode desde GitHub Releases, `jmd` y RTK como ya están. Caveman queda solo como skill, sin su CLI ni su MCP.
5. **La clase 3 sigue en el aula de la nube.** Llevarla a la laptop sin Docker es la fase 4, opcional.

Por qué Go:
- Ya es la casa: el portátil de JMDesign (con build legado Go 1.20 para Windows 7), evogo, el pod y la API del LMS están en Go.
- Compila cruzado sin CGO y deja un solo archivo de 10-15 MB por sistema.
- La biblioteca estándar trae servidor HTTP, proxy inverso, PNG y JSON. No hace falta ninguna dependencia para el aula.

## 3. Tecnologías alternas, pieza por pieza

| Pieza | Hoy | Propuesta | Alternativas descartadas y por qué |
|---|---|---|---|
| Agente de terminal | OpenCode por npm | Binario de OpenCode (`github.com/anomalyco/opencode/releases`; en Mac/Linux `curl -fsSL https://opencode.ai/install \| bash`; en Windows también `scoop install opencode`) y `jmd` (Rust, ya existe). Claude Code con su instalador nativo, para quien lo tenga | Seguir con npm: es justamente el bloqueo |
| Caveman | CLI + MCP + skill, los tres por npm/npx | Solo la skill: copiar su carpeta desde el zip del curso a `~/.config/opencode/skills/` | CLI y MCP: necesitan Node y aportan poco frente a RTK, que ya es un binario |
| Aula local (proxy con el token, archivos, imagen, dictado, voz) | FastAPI + uvicorn + httpx | `robo aula`: `net/http` + `httputil.ReverseProxy` | Python o Bun portátiles dentro del kit: quitan la instalación pero no el runtime (30-60 MB por sistema, `pip` sigue a mano del agente). Sirven de puente; JMDesign ya lo hace |
| Cuenta del curso (device flow de Keycloak) | `cuenta.py` | `robo cuenta entrar\|ver\|salir`, con el token en el mismo sitio de hoy (`%APPDATA%\jmd-robo`, `~/.config/jmd-robo`) | — |
| Código del alumno | Python (`cerebro.py`, servidor en el 8788, flyer con Pillow) | JS en el navegador: `cerebro.js`, `voz.js`, `imagen.js`, `flyer.js` dentro de `trabajo/robo/`, servidos por el aula | **Starlark** (sintaxis Python sin Python): no tiene `try` ni clases y el agente escribe Python real, que falla. **Pyodide** (Python en el navegador): conserva Python, pero baja ~10 MB al abrir la página, tarda en arrancar y no tiene Pillow completo. **Deno o Bun** como único runtime: es un solo binario, pero sin Windows 7/8, y el agente lo trata como Node (`npm install`) |
| Servidor propio del alumno (puerto 8788) | `robo.py arrancar` + uvicorn | Desaparece: el aula sirve la carpeta y da `/api/salud`. Se acaba el proceso huérfano del 8788 que motivó el parche v6 | — |
| Flyer | Pillow (1080×1350) | Canvas 2D en el navegador → PNG, que se sube al aula con `POST /vista/yo/api/guardar` | Componerlo en Go (`image/draw` + `x/image/font`): funciona, pero saca al alumno de su código |
| Criterios de aceptación | `python herramientas/verificar.py F1-T2` | `robo verificar F1-T2` (y `todo`), con la misma tabla PASA/FALLA | — |
| Pruebas del alumno | `python pruebas.py` | `robo probar`: corre `trabajo/robo/pruebas/*.test.js` en goja con una API mínima (`prueba()`, `igual()`, `contiene()`) | Lanzar Chrome sin ventana con chromedp: es el navegador real, pero lento y frágil en Edge corporativo. Queda para las tareas que hoy son «a mano» (F2, F3), en la fase 4 |
| Clase 3 en la laptop | Bun + Elysia + PostgreSQL + Evolution Go en Docker | (Fase 4) `robo chatbot`: SQLite embebido (`modernc.org/sqlite`, el mismo del LMS) y el webhook reenviado por un WebSocket saliente al servidor del curso, que ya crea una instancia de evogo por alumno | Dejar Docker: pesa varios GB y en Windows pide WSL2 |

## 4. Cómo queda

```
Laptop del alumno                                   jmd-learn.online (sin cambios)
┌─────────────────────────────┐                     ┌─────────────────────────────┐
│ Chrome/Edge                 │                     │ gateway  modelo «clase»     │
│  http://127.0.0.1:8800/     │                     │ imagen   calidad «máxima»   │
│  vista/yo/robo/  (JS alumno)│                     │ stt      Whisper            │
│        │                    │                     │ voz      Piper              │
│        ▼                    │      HTTPS          │ Keycloak realm lms          │
│ robo(.exe)  aula + cuenta ──┼────────────────────▶│                             │
│  + verificar + probar (goja)│  token jg_ del      └─────────────────────────────┘
│ OpenCode / jmd (binarios)   │  alumno, nunca en
└─────────────────────────────┘  el navegador
```

El token sigue sin pasar al navegador: el JS del alumno llama a `127.0.0.1:8800/v1/chat/completions` y el binario le pone el token, como hace hoy `aula_local.py`.

Contrato del alumno (lo que el plan v8 le pide construir):

```js
// trabajo/robo/cerebro.js
export async function chat(pregunta, historial) { /* … */ return { texto, animo }; }
```

Ese mismo archivo lo importan la pantalla (en el navegador) y `robo verificar F1-T1` (en goja). Para que corra en los dos, el binario le da a goja un `fetch` mínimo, con el bucle de eventos de `goja_nodejs`.

### Tareas del plan de Robo, antes y después

| Tarea | v7 (Python) | v8 (sin runtimes) | Criterio v8 |
|---|---|---|---|
| F0-T2 | 4 comandos con `curl` y `python` | `robo verificar F0-T2` | PASA |
| F1-T1 | `cerebro.py` | `cerebro.js` | `robo verificar F1-T1`: `chat('<<PREGUNTA_1>>', [])` devuelve `{texto, animo}` con tu dato |
| F1-T2 | Servidor propio con `/api/salud` y `/api/chat` | La pantalla habla con el aula | `GET /vista/yo/robo/` da 200 y `/api/salud` da `"llm": true` |
| F2, F3 | Ya eran JS | Sin cambios | Igual (a mano en el visor) |
| F4-T1 | `/api/imagen` en Python | `imagen.js`: traduce con el modelo y pide `/imagen/generar` | `robo verificar F4-T1`: `url`, `motor` `nube-maxima`, 3-15 s |
| F5-T1 | `flyer.extraer` en Python | `flyer.js`, `extraer()` | Fecha, hora y precio exactos |
| F5-T2 | Pillow | Canvas → PNG guardado por el aula | El PNG mide 1080×1350 (lo decodifica el binario) |
| F6-T1 | `python pruebas.py` | `robo probar` | Código 0, todas PASA |

## 5. Fases y tickets

Las fechas salen del calendario del grupo 5 (clase 1 el dom 25-10, clase 2 el mar 27-10, clase 3 el mié 28-10).
El código nuevo va en `lms/aula/robo/` (módulo Go propio).
**No se toca `lms/aula/kit-robo-nube/`**: tiene cambios sin commit de otra sesión, y el kit v7 sigue vivo para quien ya va por la mitad (por ejemplo, Johan en F1-T1).

### Fase 0 · Instalador sin Node ni Python (19-20/10, para la clase 1 del 25-10)

| ID | Ticket | Criterio de aceptación | Horas |
|---|---|---|---|
| T0.1 | OpenCode por binario en `instalar.ps1` (ZIP de GitHub Releases a `%LOCALAPPDATA%\Programs\opencode`, añadido al PATH de usuario) y en `instalar.sh` (script oficial) | En un Windows 10 limpio sin Node: `opencode --version` responde | 3 |
| T0.2 | Caveman solo como skill (copia de carpeta); quitar CLI, MCP y `npx skills` | `--verificar` muestra `caveman-skill ok` y ninguna línea pide Node | 1 |
| T0.3 | Paso-Node y Paso-Python pasan a opcionales (`--con-node`, `--con-python`) | `--verificar` sin esas banderas no lista node ni python como «falta» | 1 |
| T0.4 | Lección 01 y ejemplo 18 en los cuatro cursos (pa, g2, g3, g5): sin `npm i -g`; comprobar que `opencode.json` con `"npm": "@ai-sdk/openai-compatible"` funciona sin Node (OpenCode baja ese paquete con su runtime interno) | OpenCode habla con el gateway del curso en la VM sin Node | 2 |
| T0.5 | Ensayo en una VM con Windows 10 y en un Mac sin Homebrew | Instalación completa en menos de 10 min, sin pedir administrador salvo Git y VS Code | 2 |

### Fase 1 · Binario `robo`: el aula sin Python (19-22/10)

| ID | Ticket | Criterio de aceptación | Horas |
|---|---|---|---|
| T1.1 | Esqueleto: `lms/aula/robo/` (go 1.26), subcomandos `aula`, `cuenta`, `verificar`, `revisar`, `probar`, `version`; `modulos/` embebidos con `embed` | `go vet` y `go test ./...` pasan | 2 |
| T1.2 | `robo cuenta entrar\|ver\|salir`: device flow de Keycloak (cliente `jmd-cli`), token en la misma ruta que `cuenta.py` | Un token creado por `cuenta.py` lo lee `robo cuenta ver`, y al revés | 4 |
| T1.3 | `robo aula`: mismas rutas que `aula_local.py` (`/health`, `/nube`, `/v1/*`, `/imagen/*`, `/stt`, `/vista/yo/…`, `/api/v1/live/pa-02/comun/…`), puerto 8800 con `AULA_PUERTO` | Prueba de contrato: las mismas 12 peticiones contra el aula Python y la Go dan el mismo código HTTP y las mismas claves JSON | 8 |
| T1.4 | Doble clic: sin argumentos, `robo` arranca el aula, abre el navegador en `/vista/yo/robo/` y, si falta token, hace `cuenta entrar` primero. Ctrl+C o cerrar la ventana lo apaga | En Windows y Mac, doble clic → robot en pantalla, sin terminal previa | 3 |
| T1.5 | `robo verificar` y `robo revisar`: porta los criterios de `verificar.py` y `revisar.py` (personalidad, módulos intactos por hash, sin claves en el kit; nuevo: avisa si hay `package.json`, `require(` o `*.py` en `trabajo/robo/`) | `robo verificar todo` imprime la tabla con los mismos IDs que v7 | 6 |
| T1.6 | Builds: windows/amd64, windows/arm64, darwin/arm64, darwin/amd64, linux/amd64; legado Go 1.20 (Windows 7, macOS 10.13) solo con `aula` y `cuenta` | `construir.sh` deja 6 binarios y sus SHA-256 | 2 |

### Fase 2 · El alumno escribe JavaScript (21-24/10)

| ID | Ticket | Criterio de aceptación | Horas |
|---|---|---|---|
| T2.1 | goja + `goja_nodejs` (eventloop, `console`) + `fetch` mínimo hacia el aula; `robo probar` con `prueba()`, `igual()` y `contiene()` | Un `cerebro.js` de referencia pasa `robo verificar F1-T1` en goja y funciona igual en Chrome | 6 |
| T2.2 | Reescribir las 7 skills `s2-robo-*` para JS en el navegador, con la regla «sin npm, sin build, sin servidor propio» | `robo revisar` no marca nada en una construcción hecha por el agente siguiendo las skills | 6 |
| T2.3 | `PLAN_TRABAJO.md` v8 y `PROMPT_ARMAR_ROBO.md` con la tabla de la sección 4 | `grep -c 'python' PLAN_TRABAJO.md` da 0 | 3 |
| T2.4 | Flyer con Canvas y `POST /vista/yo/api/guardar` en el aula | `robo verificar F5-T2`: PNG de 1080×1350 | 3 |
| T2.5 | Solución de referencia completa (F0 a F6) en `lms/aula/robo/referencia/`, que no se distribuye a los alumnos | `robo verificar todo` da todo PASA contra la referencia | 4 |

**Compuerta del 24-10, 18:00.** Si T1.3, T1.4, T2.1 y T2.5 no están en verde, la clase 2 del grupo 5 usa el kit v7 con el Python de JMDesign o el aula de la nube. La fase 3 se corre a la semana siguiente.

### Fase 3 · Distribución (24-26/10)

| ID | Ticket | Criterio de aceptación | Horas |
|---|---|---|---|
| T3.1 | Un zip por sistema (`robo-kit-windows.zip`, `robo-kit-mac.zip`): binario + `trabajo/` + `skills/` + `LEEME.md` v8, en `/aula-nube/descargas/` | Descarga de menos de 20 MB; LEEME con 3 pasos | 2 |
| T3.2 | JMDesign Studio usa `robo` en vez de su Python embebido («Arrancar el aula» lanza el binario) | El instalador de JMDesign baja de tamaño; «Arrancar el aula» funciona sin conexión previa al kit Python | 4 |
| T3.3 | SmartScreen y Gatekeeper: LEEME con «Más información → Ejecutar de todos modos» y «clic derecho → Abrir»; evaluar firma de código | Un alumno de prueba abre el binario siguiendo solo el LEEME | 1 |
| T3.4 | Ensayo con 2-3 personas en laptops reales (una Windows de gama baja) | Del zip al robot respondiendo (F1-T2) en menos de 15 min | 3 |

### Fase 4 · Opcional, después del grupo 5

- `robo chatbot`: la clase 3 en la laptop sin Docker (SQLite embebido + webhook por WebSocket saliente).
- Criterios de F2 y F3 automáticos con chromedp contra el Chrome del alumno.

Total de las fases 0 a 3: unas 85 horas de agente, en tickets de 1 a 8 horas.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Antivirus y SmartScreen marcan ejecutables Go sin firma | LEEME con capturas; firma de código si el curso crece; JMDesign como vía alternativa |
| goja exige Go 1.26: el build legado (Windows 7) no tiene `verificar` ni `probar` | Windows 7/8: aula de la nube; o fijar una versión vieja de goja solo en el legado |
| El agente escribe Node por costumbre (`require`, `npm install`, `server.js`) | Regla en `AGENTS.md` y en cada skill; `robo revisar` lo detecta y lo explica |
| OpenCode en Windows sin WSL: su documentación recomienda WSL | Ensayo T0.5 en una VM limpia; si falla, `jmd` es el agente por defecto en Windows |
| Alumnos a mitad del kit v7 | v7 sigue publicado hasta que cierre el grupo 5; v8 solo para quien empieza |
| Se pierde el MCP de caveman | Impacto bajo: la skill y RTK cubren el ahorro de tokens |

## 7. Qué no cambia

El servidor del curso (gateway, imagen, stt, voz, Keycloak, LMS), la clase 3 en el aula de la nube, los avatares de `modulos/` y la forma de trabajar con plan, tareas y criterios.

## 8. Cómo se mide

- Cero runtimes instalados en la laptop: `--verificar` no lista node ni python.
- Tiempo del zip al robot respondiendo, medido en T3.4 (meta: menos de 15 min).
- Alumnos que llegan a F1-T2 dentro de la clase 2, frente al grupo anterior.
- Descarga del kit: de ~45 MB de paquetes Python a menos de 20 MB.
