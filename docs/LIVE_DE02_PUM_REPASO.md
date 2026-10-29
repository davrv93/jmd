# LIVE de-02 · E02 · ¡PUM! Difícil de olvidar

Escena de repaso para el jueves 29-10-2026, sesión 2 del taller «¿Difícil de
explicar? ¡No! · Diseño y edición con IA». Se añade sólo E02; E01 y el servicio
`lms/render` se conservan. No se crearon escenas de otros cursos.

## Qué hace el alumno

Entra con su cuenta del LMS. Hay 20 plazas de alumnos y una adicional para el instructor, que también
puede responder y golpear sin perder los controles de la partida. La partida comparte reloj y clasificación.
Son diez rondas de 29 segundos: 14 para una pregunta, 10 para destreza y 5
para la explicación. Total de juego: 4 min 50 s; bloque de taller: 10 min con
entrada, reglas y reflexión.

- Saber: una respuesta por ronda, 100 puntos si acierta.
- Destreza: ocho blancos de 1,25 s, cinco puntos por blanco; máximo 40.
- Dos retos alternados: golpear hongos y reventar globos que suben.
- Todos pueden jugar destreza aunque fallen la pregunta. No hay eliminación
  ni resta de puntos. Un blanco no vuelve a sumar al repetir el clic.
- Cada cuenta tiene blancos propios y la misma cantidad de oportunidades;
  no hay un único objeto que prive de turno a los otros diecinueve alumnos.
- Puntero o tacto; teclado con flechas y espacio al enfocar la arena.

El instructor abre o cierra la partida desde la escena. Al iniciarla entra
a jugar automáticamente y su proyector muestra su blanco y su puntaje real.
También puede pulsar «Entrar y jugar» en una partida ya iniciada. Puede abrir
otra partida. Las cuentas ya conocidas se reconectan con sus puntos; un jugador
21 mira como espectador. Una nueva partida libera plazas inactivas de más de
45 s y pone los puntajes a cero.

Las preguntas proceden de `lessons/01-del-prompt-al-prototipo.md`: comprobación
del pedido en seis partes, corrección precisa, paneo, paralaje, anticipación,
aplastar y estirar, ease-out, tiempo absoluto, pulso de 120 bpm y archivos
abiertos editables. No incluye precios, noticias de proveedores ni cuestiones
legales que puedan cambiar. La respuesta y su explicación aparecen al terminar
la destreza. El cierre incluye un pedido de seis partes para copiar al agente
JMD y pasar al texto real de la landing.

## Dibujo, CSP y coste

Collage tipográfico original, tinta gruesa, colores planos, semitono y damero;
no se incluyen fotogramas, personajes, tipografías externas ni canciones de las
referencias visuales. El ritmo opcional se sintetiza con Web Audio al pulsar el
botón y se apaga al ocultar la pestaña o finalizar. No hay reproducción automática.

p5.js 1.11.1 local en `live/_comun/p5-1.11.1.min.js`, con su licencia original
`p5-LICENSE.txt`. Fuente de la copia versionada:
`https://cdn.jsdelivr.net/npm/p5@1.11.1/lib/p5.min.js` y licencia del tag v1.11.1
en `processing/p5.js`. La clase no consulta ese CDN: todos los recursos salen
del propio LMS. El fondo de puntos se dibuja una vez y se reutiliza.

Canvas 2D de 1000×500, densidad 1, objetivo de 30 fps (12 con movimiento reducido),
sin WebGL, GPU física, IA ni servicio de vídeo. El servidor no renderiza cuadros:
cada navegador dibuja su escena. Se intercambia JSON cada 1,5–1,7 s, con espera
creciente al fallar, sin consultas ni dibujo al ocultar la pestaña; al volver se conserva una sola cadena de sondeo. Para veinte
alumnos son aproximadamente 12–14 lecturas por segundo, más las jugadas; es una
estimación del intervalo, no un benchmark de producción. El reloj recibido
permite iniciar la destreza localmente sin esperar al siguiente sondeo.

HTML autocontenido salvo la hoja común y p5 local, `style#esc-propio`, detalles
plegables exclusivos y estructura `.esc` del LIVE. Sin formularios ni diálogos
nativos. Cumple la CSP de las escenas sin añadir permisos ni relajar cabeceras.

## Backend y contrato

`lms/api/internal/httpapi/live_repaso.go`, dos rutas autenticadas registradas en
`server.go`:

- `GET /api/v1/live/de-02/repaso`: reloj, fase, pregunta, top 5 (tabla completa
  para staff), marcador propio y plazas. `ahora_ms`, `partida`, `ronda`,
  `vence_ms` y `destreza_inicio_ms` sincronizan el navegador.
- `POST` en la misma ruta: `{accion}` para `unirse`; staff: `iniciar`, `terminar`.
- `responder`: `{accion, partida, ronda, respuesta}`; índice 0…2, sólo una vez
  y dentro del plazo de la pregunta.
- `golpear`: `{accion, partida, ronda, slot, x, y, at_ms}`. Coordenadas 0…1 en
  un área 2:1, slot 0…7. El servidor reconstruye el blanco con la semilla de la
  cuenta, valida la colisión y la ventana de 1,25 s. Tolera 650 ms de transporte
  y hasta 100 ms de desfase adelantado. Máximo cuatro intentos por segundo.
- Una partida/ronda vieja, acción fuera de fase, blanco repetido o golpe que
  no toca el blanco no suma. El cliente nunca envía puntaje.

Al pulsar una respuesta sin haberse inscrito, la escena solicita primero
`unirse` y después envía esa respuesta para la partida y ronda que el alumno
estaba viendo. `iniciar` inscribe automáticamente al instructor si su plaza
está disponible; `unirse` admite tanto alumnos como instructor. La respuesta
GET informa `instructores` e incluye la condición `instructor` en `yo`.

El banco es privado en Go y sólo revela la respuesta durante explicación o
cierre. Las rutas comprueban visibilidad de la lección y existencia de E02; no
habilitan el juego en otras lecciones. La cuenta pública de juego es `pN`, no
el identificador privado del usuario. Se usa el nombre corto existente del LMS.

Los puntos son del juego: no se guardan como notas ni sustituyen la entrega
o el «Lo logré» del LIVE.

Estado acotado en memoria de una instancia Go: veinte alumnos más un instructor, diez
respuestas y ocho blancos por ronda. Un mutex serializa las operaciones. No
hay migración ni proceso de simulación. Reiniciar el LMS pierde la partida;
varias réplicas independientes no comparten este estado. Esta decisión sigue
el patrón de los juegos LIVE existentes.

## Evidencia y comprobación

```sh
cd lms/api
go test ./internal/content/ ./internal/httpapi/
go test -race ./internal/httpapi/ -run Repaso -count=1
cd ../..
node lms/scripts/probar-repaso.mjs "$PWD" /tmp/jmd-repaso-qa
```

El script usa `lms/scripts/_pw.mjs`. Requiere Playwright instalado y Chrome local;
`PLAYWRIGHT_DIR` y `PLAYWRIGHT_CHROMIUM` permiten cambiar sus rutas. No usa
credenciales reales ni llama a producción. Crea una copia de HTML, p5 y CSS,
sirve `/live/comun/escena.css`, aplica la CSP real y simula la API con
`page.route`. Abre veinte alumnos y un instructor, comprueba respuestas,
clasificación compartida, puntero, copia para el agente, reinicio y cupo 21.

Las pruebas Go comprueban el estado real del servidor, permisos HTTP, clave
privada, reloj, colisiones, latencia, duplicados, cupo y concurrencia de veinte
jugadores. La prueba con detector de carreras no detectó carreras. Las pruebas
Go incluyen la carga del catálogo real, YAML, fases y pasos.

Capturas de sala, pregunta, hongos, globos, explicación, cierre e instructor,
a 1440×810 y 390×844, en [`qa/de-02-pum/`](qa/de-02-pum/). Se revisaron los PNG
además de medir límites y ausencia de scroll horizontal. Hay 14 capturas. Los
detalles abiertos pueden desplazarse dentro de su panel; cabecera, juego y pie
permanecen en la pantalla. La evidencia de navegador usa API simulada y no es
una prueba de carga del EC2; la lógica Go sí se ejecuta en las pruebas del backend.

## Publicar: lo hace el usuario

Este cambio incluye API, así que `git pull` y recargar contenido **no bastan**.
El commit se deja en `main`, sin push ni despliegue.

Después de subir el commit, en el EC2:

```sh
ssh -i ~/Downloads/curdilmer.pem ubuntu@3.151.56.55
# En el EC2, ejecutar el script de despliegue existente:
./desplegar-lms.sh
```

No se cambia E01, `lms/render`, otras clases ni la configuración del LIVE
encendido. Después del despliegue, el instructor elige E02 y pulsa «Iniciar
10 rondas» cuando los alumnos estén dentro.


## Corrección: instructor jugador y prueba con API real

La versión inicial excluía al instructor y deshabilitaba sus respuestas y sus
golpes. La prueba con API simulada comprobaba esa exclusión en lugar de detectar
el problema de uso. Ahora el instructor dispone de plaza adicional, entra al
iniciar y juega con las mismas validaciones que el alumnado. Los estudiantes
pueden entrar con el botón o al elegir su primera respuesta.

La integración real usa dos sesiones temporales, cookies reales, la CSP y un
iframe del mismo origen; llama al servidor Go sin `page.route`. El reloj se
adelanta únicamente dentro del fixture para recorrer las fases. Toca hongos y
globos localizando sus píxeles en el canvas: las colisiones y los puntos los
valida el servidor. También comprueba que fallar el blanco o repetir una
respuesta no suma y que el instructor conserva el control de cierre.

```sh
cd lms/api
LMS_REPASO_BROWSER_QA=1 LMS_REPASO_QA_DIR=/tmp/jmd-repaso-real \
  go test ./internal/httpapi/ -run 'TestRepaso' -count=1 -v
```

`live_repaso_browser_test.go` no registra rutas ni credenciales en producción.
La cuenta de instructor y la del alumno pertenecen sólo al fixture que se
elimina al terminar. Node y Playwright son requisitos únicamente de esta prueba
opcional, no del binario del LMS. Evidencia real en `qa/de-02-pum/real/`.
