# Guion del modo LIVE · Clase 1 (pa-01) · Instalar las herramientas y entender qué hay detrás

**Duración:** 120 minutos. **Formato:** el instructor lleva el control; los alumnos ven la misma escena a pantalla completa. En esta clase el alumno trabaja en SU laptop (instala VS Code, Docker y OpenCode) y usa el panel del LIVE para la terminal de práctica, el agente y la ayuda. **Resultado:** cada alumno sale con las tres herramientas instaladas, el agente respondiendo en su terminal, su primera skill y la insignia de la clase 1.

**Regla de contenido:** todo genérico, sin temática de obra ni de un rubro. Los ejemplos son un script de fecha y hora, una skill de saludo y un asistente de ventas cualquiera. Nada de túneles ni de redes avanzadas. El alumno puede no saber qué es un MCP o una herramienta: se explica con analogías de una línea.

**Ciclo (ids del pa-01):** ver, vscode, docker, opencode, practicar, skill, preguntar, entregar. Fases: experiencia (ver, vscode, docker, opencode), reflexión (practicar, preguntar), conceptualización (skill), experimentación (entregar).

## Las 12 escenas

| Id de carpeta | Título | Fase | Paso | Min | Lo logré | Evidencia | Umbral | Compuerta |
|---|---|---|---|---|---|---|---|---|
| 01-bienvenida | Bienvenida | experiencia | (vacío) | 5 | sí | ninguna | 100 | presentes |
| 02-que-es-un-agente | Qué es un agente | conceptualizacion | ver | 8 | no | ninguna | 80 | ninguna |
| 03-vscode | Instalar VS Code | experiencia | vscode | 10 | sí | captura | 80 | lo_logre |
| 04-docker | Instalar Docker | experiencia | docker | 15 | sí | captura | 80 | lo_logre |
| 05-opencode | OpenCode y el gateway | experiencia | opencode | 15 | sí | captura | 80 | lo_logre |
| 06-proveedor-modelo | Proveedor, modelo y parámetros | conceptualizacion | (vacío) | 8 | no | ninguna | 80 | ninguna |
| 07-ahorrar-contexto | Ahorrar contexto | conceptualizacion | (vacío) | 8 | no | ninguna | 80 | ninguna |
| 08-mcp | MCP: darle manos al agente | conceptualizacion | (vacío) | 7 | no | ninguna | 80 | ninguna |
| 09-skills | Skills y tu primera skill | conceptualizacion | skill | 12 | sí | captura | 80 | lo_logre |
| 10-practicar | Practica con el agente | reflexion | practicar | 10 | sí | captura | 80 | lo_logre |
| 11-preguntar-y-tarea | Pregunta y tarea 1 | experimentacion | preguntar | 5 | sí | ninguna | 70 | lo_logre |
| 12-insignia | Tu insignia | experimentacion | entregar | 5 | no | ninguna | 80 | ninguna |

## Fichas

**E01 Bienvenida.** Se ve: constelaciones que se trazan, letras J M D que se encienden una a una, el robot 3D saludando (montarAvatar con el robot) y «Hoy dejas tu máquina lista para trabajar con un agente». Respaldo sin WebGL: captura.png del robot.

**E02 Qué es un agente.** Se ve: un bucle animado de cuatro pasos: tú pides, el modelo piensa, usa una herramienta (leer, escribir, ejecutar), mira el resultado y vuelve a pensar hasta terminar. Analogía de una línea: un chat responde; un agente además hace. Frase: «Agente = modelo + herramientas + bucle».

**E03 Instalar VS Code.** Se ve: tres pasos animados (descargar, instalar, abrir la terminal con Ctrl+ñ o Ctrl+`), en Windows la extensión WSL si trabajan en Ubuntu. Comando: `code --version`. Un solo atajo de instalación: el instalador de un comando (curl para macOS y Linux, irm para Windows) en pestañas.

**E04 Instalar Docker.** Se ve: tres caminos según el sistema (Docker Desktop en Windows y macOS; Docker Engine en Linux; en Windows primero WSL) y una barra de pasos. Comando: `docker run --rm hello-world`. Qué es Docker en una línea: una caja que lleva el programa con todo lo que necesita.

**E05 OpenCode y el gateway.** Se ve: OpenCode como la ventana donde hablas con el agente, el gateway de la clase como la puerta única hacia los modelos (con la clave personal del alumno), y el flujo laptop → gateway → modelo. Comandos: instalar OpenCode, abrirlo y preguntar «hola». Se muestra dónde se pone la URL y la clave sin mostrar la clave real.

**E06 Proveedor, modelo y parámetros.** Se ve: tres piezas con analogía (proveedor = la tienda, modelo = el producto, parámetros = los controles) y un deslizador animado de temperatura (más preciso, más creativo) y límite de respuesta; el contexto como una mesa con espacio limitado.

**E07 Ahorrar contexto.** Se ve: la ventana de contexto como un vaso que se llena; AGENTS.md (las reglas fijas del proyecto), RTK (recorta la salida de los comandos) y caveman (respuestas cortas) vaciando el vaso. Barras de tokens de ejemplo antes y después marcadas «ejemplo».

**E08 MCP.** Se ve: el agente como una persona sin manos y los MCP como herramientas que se enchufan (una calculadora, una hoja de datos, un navegador) por un mismo conector. Frase: «MCP es un enchufe estándar para darle herramientas al agente». Sin jerga: nada de servidores ni protocolos en pantalla más que el nombre.

**E09 Skills y tu primera skill.** Se ve: una carpeta `.opencode/skills/saludo/` con un archivo `SKILL.md` que se escribe línea a línea (`name`, `description`, una instrucción corta) y el agente que la carga cuando la tarea la necesita. Comando para probarla: pedirle al agente que use la skill de saludo.

**E10 Practica con el agente.** Se ve: el pedido «crea un script que imprima la fecha y la hora en español», el agente proponiendo archivos y comandos, y un recuadro «Antes de aceptar mira: qué archivos crea y qué comandos ejecuta». Principio: el agente propone, tú decides.

**E11 Pregunta y tarea 1.** Se ve: dos tarjetas: publicar una pregunta de la clase en el LMS (o responder una) y entregar la tarea 1 con URL y commit. Tres ejemplos de buena pregunta.

**E12 Tu insignia.** Insignia hexagonal de la clase 1 (azul a morado, número 01) que se enciende al cumplir el umbral, con partículas, y los recordatorios de la tarea y de la clase 2.
