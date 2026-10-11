# Guion del LIVE · Clase 2 · Construir tu asistente con Edge AI

**Duración:** 120 minutos. **Formato:** el instructor tiene los controles; los alumnos ven la misma escena a pantalla completa y trabajan en su panel (terminal, agente, visor). **Resultado:** cada alumno sale con Tecnosito corriendo en su laptop: avatar 3D, chat con modelo local o remoto, voz a texto y generación de imágenes, y con la insignia de la clase 2.

## Qué corre dónde (regla de oro)

Una sola consola: la del LIVE. El alumno no instala nada para la clase. Su asistente corre en su contenedor del servidor en **modo nube**: sin modelos locales, con chat, voz e imagen por el gateway o por su navegador. El servidor no ejecuta ningún modelo de IA. Edge AI local (Ollama, whisper, sd-turbo en la laptop) se ve en vivo en la laptop del instructor y es la tarea 2 de cada alumno con el instalador del curso.

| Pieza | Dónde corre | Respaldo si falla | Nunca |
|---|---|---|---|
| LMS, LIVE, sincronía, terminal, visor, métricas | EC2 | Nada: es lo único que depende del servidor | Modelos |
| Gateway `ai-orchestrator` con la clave de OpenRouter | EC2 (30 MB) | Clave propia del alumno en OpenRouter | Claves en las laptops |
| Backend del asistente (FastAPI, modo nube, 50 a 80 MB) | Contenedor del alumno en el EC2 | Reiniciar el contenedor con un clic | torch, whisper o diffusers en el servidor |
| Chat del asistente | OpenRouter por el gateway: modelo chino gratis o barato de la lista blanca | Segundo modelo de la cadena | Ollama en el EC2 |
| Avatar 3D (Three.js) y voz sintetizada | Navegador del alumno | No falla: es solo JS | Render en servidor |
| Voz a texto | Web Speech API del navegador (Chrome), gratis | SenseVoice o Groq Whisper por el gateway | whisper en el EC2 |
| Generación de imágenes | SiliconFlow (FLUX schnell o Kolors) o Zhipu CogView por el gateway | Modo demo con Pillow | difusión en el EC2 |
| Agente que escribe el código | `jmd` embebido en el LIVE, en el contenedor del alumno | Terminal del LIVE con `jmd chat` | OpenCode en el EC2; binarios en la laptop |
| Terminal y visor | Contenedor del alumno; el LMS sirve `/trabajo` como estático y reenvía `/api` al asistente del contenedor | Nada más que hacer | Túneles o puentes desde la laptop |

### Proveedores remotos de respaldo (por OpenRouter, lista blanca del gateway)

Los nombres exactos cambian; se verifican la víspera con `jmd provider openrouter test` y se escriben en el panel «IA» del LMS. Criterio: gratis o menos de 0,20 USD por millón de tokens, buenos en español, con herramientas.

| Uso | Candidatos (familias chinas) | Costo orientativo | Nota |
|---|---|---|---|
| Chat y código | DeepSeek V4.1 Flash, Qwen3 (30B o 235B instruct), GLM 4.x Flash, Kimi K2, MiniMax M2 | gratis con `:free` o 0,05 a 0,30 USD por millón | DeepSeek y Qwen son los más estables con herramientas; GLM Flash y las variantes `:free` tienen cuota de 50 peticiones por día por clave sin créditos, 1000 con 10 USD cargados |
| Imagen | Zhipu CogView 4, Alibaba Wan 2 o Qwen-Image, SiliconFlow con Kolors o FLUX.1 schnell | gratis o centavos por imagen | OpenRouter no sirve imágenes de todos; si el elegido no está en OpenRouter, el gateway lo añade como proveedor OpenAI-compatible directo |
| Voz a texto | SiliconFlow SenseVoice, Groq Whisper large v3 turbo | gratis en capa inicial | No pasa por OpenRouter; el gateway los expone como `/v1/audio/transcriptions` |

Regla de clase: cada alumno prueba primero en su laptop. Solo cambia a remoto si su diagnóstico dice que no cabe o si tarda más de 60 s. El cambio es un selector en «Mi IA», no una reinstalación.

## Controles del instructor

- **Siguiente / Anterior**: cambia la escena para todos. Flechas del teclado o botones.
- **Compuerta de avance**: cada escena con «Lo logré» define cuántos alumnos deben haberlo pulsado para pasar (por defecto 80 %). Al pulsar «Siguiente», el panel muestra la lista de quién falta con su último evento (terminal, agente o visor) y tres botones: **Esperar**, **Pasar igual**, **Mandar ayuda** (abre su chat o terminal en solo lectura, o envía un mensaje a su panel). Nada avanza sin que el instructor lo decida.
- **Semáforo por alumno**: verde «Lo logré», ámbar trabajando (hubo actividad en los últimos 2 minutos), rojo sin actividad o con error repetido en la terminal, gris desconectado.
- **Modo libre**: suelta el control para que cada uno avance a su ritmo; «Retomar» vuelve a sincronizar en la escena del instructor.
- **Cronómetro** por escena con el tiempo sugerido; se pone ámbar al pasarse.
- **Vista de un alumno**: su visor y su terminal en solo lectura, si el alumno lo permitió al entrar.
- **Mensaje a todos**: una línea que aparece en el panel de cada alumno (ejemplo: «cambien a modelo remoto»).

## Escenas

Cada escena indica: fase del ciclo, duración, qué se ve (y con qué herramienta se genera la animación), qué hace el instructor, qué hace el alumno, qué valida la compuerta y el respaldo si falla. Las animaciones son SVG con `animate` y CSS, menos de 300 nodos y 1 MB por escena, generadas con **PinePaper MCP en modo código**; los diagramas de conceptos nacen como wireframes con **wireframe-skill** y se ilustran; la coreografía (orden, duración, easing) sigue **motion-design-skill**: entradas de 300 a 500 ms con ease-out, nada que se mueva mientras el alumno lee, y todo apagado con `prefers-reduced-motion`.

### E01 · Bienvenida · Experiencia · 5 min
- **Se ve:** el cielo del LMS con las constelaciones de libros y las letras JMD que se encienden una a una; luego aparece Tecnosito en 3D (la escena de Three.js incrustada, 0 MB en el servidor) saludando. Debajo, la frase «Hoy construyes tu asistente». PinePaper: trazo de las constelaciones punto a punto en 4 s.
- **Instructor:** da la bienvenida, muestra el panel del alumno (terminal, agente, visor, «Lo logré»), pide a todos entrar a pantalla completa.
- **Alumno:** entra al LIVE, marca «Estoy aquí» (primer «Lo logré»).
- **Compuerta:** 100 % presentes. Quien falte, se le manda el enlace por WhatsApp.
- **Respaldo:** si Three.js no carga en un navegador viejo, la escena muestra la captura estática del osito.

### E02 · Edge AI en una frase · Conceptos · 5 min
- **Se ve:** animación de dos caminos: un prompt que viaja a una nube y vuelve (lento, con un contador de dinero) y el mismo prompt que se queda dentro de una laptop (rápido, contador en 0). Wireframe de dos columnas convertido en ilustración; PinePaper anima el viaje del paquete. Texto: «Edge AI: el modelo corre en tu máquina. Sin nube, sin costo por consulta, tus datos no salen».
- **Instructor:** explica con la analogía: la nube es alquilar un cerebro por minuto; Edge es tener uno en casa, más pequeño pero tuyo.
- **Alumno:** solo mira.
- **Compuerta:** ninguna.

### E03 · Tu laptop decide · Experiencia · 8 min
- **Se ve:** tabla animada de niveles de imagen (rápida, buena, máxima) con las tres máquinas típicas del grupo iluminándose según su hardware; abajo, el comando `python osito/backend/diagnostico.py` en grande.
- **Instructor:** pide correr el diagnóstico en la terminal del LIVE o en la laptop. Lee en voz alta dos resultados distintos.
- **Alumno:** abre la terminal del LIVE (su contenedor ya está creado), corre el diagnóstico para saber qué podría su laptop en casa, y elige en «Mi IA» el modelo de chat de la lista blanca y el proveedor de imagen. En clase todo es remoto; el nivel local es dato para la tarea.
- **Compuerta:** 80 % con terminal abierta y modelo elegido (el panel lo detecta solo, sin «Lo logré»).
- **Respaldo:** si un modelo de la lista no responde, el gateway pasa al siguiente de la cadena.

### E04 · Skills y modo piedra · Experiencia · 10 min
- **Se ve:** los 14 skills como constelación: cada estrella es un skill, al pasar el control se enciende y muestra su descripción en una línea. Al centro, el skill `piedra` con un antes y después animado: una respuesta larga que se comprime en tres líneas (PinePaper: texto que colapsa, motion «squash» de 400 ms).
- **Instructor:** explica qué es un skill en una frase (instrucciones que el agente carga cuando la tarea las necesita). Activa `piedra` en su propio agente y muestra el ahorro.
- **Alumno:** instala los skills (`bash instalar.sh`) o, en el LIVE, abre «Mis skills» y copia los 14 del curso; crea su primera skill propia con la plantilla; activa piedra; pide al agente algo y ve la respuesta corta.
- **Compuerta:** 80 % «Lo logré» con evidencia automática: existe una skill propia en su cuenta.
- **Respaldo:** si el instalador falla, los skills ya están montados en el contenedor del LIVE.

### E05 · Mide tu consumo · Reflexión · 5 min
- **Se ve:** el gráfico de tokens de cada alumno (línea viva de los últimos 10 minutos) con la marca «piedra activado». En grande, el total de la clase y el porcentaje de cuota usado.
- **Instructor:** señala la caída de tokens tras activar piedra. Activa RTK en vivo y la marca aparece. Explica: menos tokens, más consultas por día con la misma cuota gratis.
- **Alumno:** activa RTK con el interruptor; ve su gráfico.
- **Compuerta:** ninguna; el gráfico es la validación.

### E06 · Plan de trabajo con criterios · Conceptos · 7 min
- **Se ve:** una tarea vaga («haz el asistente») que se parte en seis tarjetas, cada una con un criterio sí/no que se enciende en verde al cumplirse (wireframe de tablero kanban ilustrado; PinePaper anima la división en 6 piezas). Regla en grande: «ninguna tarea sin forma de probarla».
- **Instructor:** muestra el plan de la clase (las seis tareas del día) y la pantalla de obra.
- **Alumno:** pide al agente, con el skill `plan-de-trabajo`, su `PLAN_TRABAJO.md` de seis tareas; arranca `obra.py servir` en su laptop o ve el plan en el panel del LIVE.
- **Compuerta:** 80 % con plan generado (evidencia: el archivo existe en `/trabajo` o en el repo local; el panel lo detecta).

### E07 · Construir 1: el chat · Experiencia · 15 min
- **Se ve:** diagrama animado de tres cajas: navegador → backend FastAPI → modelo (Ollama en la laptop o gateway remoto). Al llegar la respuesta, el osito pasa a «hablando» y aparece el subtítulo. Debajo, los comandos: `bash osito/arrancar.sh` y la URL.
- **Instructor:** arranca su asistente, escribe «hola», muestra la respuesta y el chip de salud. Explica el respaldo por embeddings cuando no hay modelo.
- **Alumno:** en la terminal del LIVE, `cd /trabajo/osito && bash arrancar.sh` (ya está el código y el perfil nube), abre el visor, escribe su primera pregunta; carga su corpus en `faq.json` con una pregunta de su dominio.
- **Compuerta:** 80 % «Lo logré» con evidencia: captura del chat respondiendo (el visor la toma) o el log del backend con `POST /api/chat 200`.
- **Respaldo:** si el gateway no responde, el backend cae al respaldo por embeddings con el corpus del alumno (la lección del «no estoy seguro»).

### E08 · Construir 2: el avatar 3D · Experiencia · 10 min
- **Se ve:** el osito en 3D y el robot, lado a lado, cambiando de ánimo al compás de la escena (feliz, pensando, sorprendido). Texto: «Todo esto corre en tu navegador: cero servidor». Botones de ánimo que el instructor pulsa y se replican en las pantallas.
- **Instructor:** muestra `?avatar=robot&nombre=…`, cambia ánimos, explica que la boca se sincroniza con la voz del navegador.
- **Alumno:** elige avatar y nombre, cambia el saludo, prueba los ánimos; pide al agente un cambio pequeño (color del LED, nombre, un ánimo nuevo) con el skill `diseno-visual`.
- **Compuerta:** 70 % «Lo logré» (es la escena más libre).

### E09 · Construir 3: la voz · Experiencia · 10 min
- **Se ve:** onda de audio que entra al micrófono, pasa por un bloque «reconocimiento de voz» (en clase, el del navegador; en casa, whisper en tu laptop) y sale como texto en el campo antes de enviarse. Principio UX en grande: «muestra lo que escuchó antes de actuar». PinePaper: la onda se convierte en letras.
- **Instructor:** dicta una pregunta, enseña el texto reconocido y lo corrige antes de enviar.
- **Alumno:** pulsa el micrófono en el visor, dicta, corrige, envía. El reconocimiento lo hace su navegador; si Chrome no lo tiene, el visor manda el audio al gateway.
- **Compuerta:** 80 % «Lo logré» con evidencia: un mensaje enviado desde el micrófono (el visor lo marca) o `POST /api/stt 200` en el log.
- **Respaldo:** el visor va por `https://jmd-learn.online`, así que Chrome da el micrófono sin problema.

### E10 · Construir 4: la imagen y el flyer · Experiencia · 15 min
- **Se ve:** tres piezas que se arman como un rompecabezas: «el LLM extrae los datos», «el modelo de difusión pinta el fondo», «el código escribe el texto». Al encajar, aparece un flyer real de la clase. Debajo, el bloque «Datos del flyer» editable.
- **Instructor:** pide un flyer de un evento de ventas, muestra el resultado, cambia un dato a propósito y regenera. Explica por qué el modelo de difusión no escribe.
- **Alumno:** genera su flyer con el proveedor de imagen remoto elegido en «Mi IA»; revisa los datos; cambia uno; regenera. Los niveles rápida, buena y máxima son para la tarea en casa.
- **Compuerta:** 80 % «Lo logré» con evidencia: la imagen en el visor.
- **Respaldo:** modo demo con Pillow siempre funciona; la lección se entiende igual.

### E11 · Probar y medir · Reflexión · 10 min
- **Se ve:** guion de tres tareas para probar el asistente de otro compañero (pregunta del corpus, pregunta fuera del corpus, pedir un flyer) y una tabla de tiempos que se llena con los datos reales de la clase: chat, voz, imagen, por alumno, en vivo desde los logs que el panel recoge.
- **Instructor:** empareja alumnos (el panel lo hace: pares al azar). Lee la tabla y comenta el más rápido y el más lento y por qué (GPU, CPU, remoto).
- **Alumno:** prueba el asistente del compañero por el visor compartido o por su URL en la red local; anota un hallazgo con severidad en el formulario del panel.
- **Compuerta:** 80 % con un hallazgo registrado.

### E12 · Tu insignia · Aplicación · 5 min
- **Se ve:** la insignia 02 apagada que se enciende cuando el alumno cumple el umbral (6 de 9 pasos), con las estrellas del cielo convergiendo hacia ella (PinePaper: partículas atraídas al centro, 2 s, luego quietas). Debajo, el plan de seis tareas con sus estados y la tarea 2 del LMS.
- **Instructor:** cierra el LIVE; el LMS emite las insignias automáticamente a quienes cumplen; muestra el conteo. Presenta la tarea 2 y la preparación de la clase 3 (Evolution API, número de pruebas).
- **Alumno:** ve su insignia en «Mis insignias», la añade a LinkedIn si quiere.
- **Compuerta:** final: el instructor ve quién no llegó al umbral y decide si emite igual o deja pendiente.

## Resumen de tiempos

| Escena | Fase | Min | Acumulado |
|---|---|---|---|
| E01 Bienvenida | Experiencia | 5 | 5 |
| E02 Edge AI | Conceptos | 5 | 10 |
| E03 Tu laptop decide | Experiencia | 8 | 18 |
| E04 Skills y piedra | Experiencia | 10 | 28 |
| E05 Mide tu consumo | Reflexión | 5 | 33 |
| E06 Plan con criterios | Conceptos | 7 | 40 |
| E07 Chat | Experiencia | 15 | 55 |
| E08 Avatar 3D | Experiencia | 10 | 65 |
| E09 Voz | Experiencia | 10 | 75 |
| E10 Imagen y flyer | Experiencia | 15 | 90 |
| E11 Probar y medir | Reflexión | 10 | 100 |
| E12 Insignia y cierre | Aplicación | 5 | 105 |
| Margen | | 15 | 120 |

## Evidencias automáticas por escena (lo que el panel detecta sin que nadie lo marque)

| Escena | Señal | Fuente |
|---|---|---|
| E03 | terminal abierta; modelo y proveedor elegidos | contenedor; ajustes de «Mi IA» |
| E04 | skill propia creada; respuesta con piedra | tabla `skills`; telemetría del gateway |
| E05 | caída de tokens tras piedra y RTK | telemetría por `sub` |
| E06 | `PLAN_TRABAJO.md` existe | volumen `/trabajo` del contenedor |
| E07 | `POST /api/chat 200` | log del backend del osito en el contenedor |
| E09 | mensaje enviado por micrófono o `POST /api/stt 200` | visor; mismo log |
| E10 | imagen generada | captura del visor |
| E11 | hallazgo con severidad | formulario del panel |

## Antes de la clase (instructor)

1. Gateway encendido con la clave de OpenRouter; lista blanca de modelos verificada la víspera con `jmd provider openrouter test`; 10 USD cargados para subir la cuota de los `:free`.
2. Proveedor de imagen y de voz remotos probados con un alumno de prueba.
3. Las 12 escenas ensayadas con cronómetro; capturas estáticas de respaldo de cada una.
4. Contenedores de aula creados de antemano para los 10 alumnos, con el código del asistente en `/trabajo/osito` y el perfil nube configurado (así no se espera en E03).
5. Keycloak apagado si el servidor está por debajo de 800 MB disponibles; cuentas locales repartidas.
6. Mensaje a los alumnos la noche anterior: traer su corpus en `faq.json` (10 preguntas de su dominio) y tener Chrome actualizado. Nada que instalar para la clase; lo local es la tarea 2.

## Qué no se hace en esta clase

- Instalar nada pesado en vivo: todo lo pesado va la noche anterior o por USB.
- Correr modelos en el EC2.
- Compilar o empaquetar en el servidor.
- Avanzar sin mirar la compuerta: si el 80 % no llegó, se espera o se manda ayuda, nunca se pasa en silencio.
