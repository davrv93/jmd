---
name: plan-de-trabajo
description: Úsalo cuando ya existe un PLAN_PROYECTO.md (o un alcance claro) y hay que convertirlo en fases con tareas atómicas de 45 minutos, cada una con criterio de aceptación verificable, hitos demostrables y registro de avance. Palabras gatillo: plan de trabajo, tareas, fases, hitos, desglose, cronograma, "qué sigue", avance, estado del plan, obra.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Plan de trabajo: de entregables a tareas que se pueden probar

## Cuándo usar

Cuando el alcance ya está cerrado y la pregunta es "¿por dónde empiezo y cómo sé que voy bien?". La entrada es `PLAN_PROYECTO.md` (ver skill `planificacion-proyecto`) o, en proyectos chicos, una lista de tres a seis entregables verticales acordada con quien pidió el trabajo. La salida es `PLAN_TRABAJO.md`: una tabla viva de fase, tarea, criterio y estado que se actualiza cada vez que se cierra una tarea.

Úsalo también cuando un agente lleva dos horas "avanzando" y nadie puede decir qué quedó listo. Esa situación es la señal de que faltó este documento.

## Principios

1. Una tarea atómica dura 45 minutos o menos. Si dura más, no es una tarea: es una fase disfrazada. Pártela.
2. Ninguna tarea sin forma de probarla. El criterio de aceptación es una acción que cualquiera repite y obtiene sí o no.
3. El orden lo dictan las dependencias, no las ganas. Lo que bloquea a otros va primero.
4. Cada fase termina en un hito demostrable: algo que se muestra funcionando a quien pidió el trabajo, aunque sea feo.
5. El plan se actualiza al cerrar cada tarea, no al final del día. Un plan atrasado dos horas ya miente.
6. Las tareas se escriben en imperativo con objeto concreto: "Crear tabla `avances` con migración", no "Trabajar en la base de datos".
7. Lo que se descubre durante la ejecución se anota en el plan como tarea nueva o como "Fuera de alcance", nunca se hace en silencio.

## Procedimiento paso a paso

1. Abre `PLAN_PROYECTO.md` y copia los entregables verticales en orden de valor. Cada entregable se convierte en una fase, salvo que uno sea talla L: ese se parte en dos fases.
2. Añade al inicio una Fase 0 "Preparación" con las tareas que todos necesitan: repositorio, entorno local corriendo, datos de prueba, acceso a servicios. Máximo cinco tareas.
3. Para cada fase, escribe las tareas en imperativo con objeto concreto. Pregúntate por cada una: ¿puedo hacerla en 45 minutos sin interrupciones? Si la respuesta es "depende", pártela.
4. Para cada tarea, escribe el criterio de aceptación como una verificación que devuelve sí o no. Formas válidas: un comando con salida esperada, una acción en pantalla con resultado visible, una prueba automatizada que pasa, un archivo que existe con cierto contenido. Formas inválidas: "funciona", "está listo", "se ve bien".
5. Marca dependencias con la columna "Depende de" usando los identificadores de tarea (F1-T2). Reordena para que ninguna tarea aparezca antes que su dependencia.
6. Define el hito de cada fase: qué se le muestra a quién y en cuántos minutos. Ejemplo: "Mostrar al coordinador cómo un sílabo se genera desde la plantilla en menos de 2 minutos".
7. Estima el total de cada fase sumando tareas (45 minutos como máximo cada una) y compáralo con la talla del `PLAN_PROYECTO.md`. Si una fase S suma más de medio día, algo sobra o la talla estaba mal; corrígelo en los dos documentos.
8. Fija el estado inicial de todas las tareas en `pendiente`. Los estados válidos son exactamente cuatro: `pendiente`, `en curso`, `hecha`, `bloqueada`. Una `bloqueada` lleva el motivo entre paréntesis.
9. Al empezar una tarea, cámbiala a `en curso`. Nunca más de una tarea `en curso` por persona o agente.
10. Al terminar una tarea, ejecuta su criterio de aceptación. Solo si devuelve sí la marcas `hecha` y anotas fecha y hora en la columna "Cerrada". Si devuelve no, sigue `en curso` y añade una nota.
11. Si existe la herramienta `obra` en el proyecto (archivo `obra/obra.py`), ejecuta al cerrar cada tarea:
    `python obra/obra.py paso "<identificador y nombre de la tarea>" --pct <porcentaje de tareas hechas sobre el total>`
    para que la pantalla de construcción refleje el avance. El porcentaje es tareas hechas dividido por tareas totales, redondeado a entero.
12. Al cerrar la última tarea de una fase, realiza la demo del hito y anótala en la sección "Registro de avance" con fecha, quién la vio y qué dijo.
13. Cualquier tarea nueva que aparezca durante la ejecución se agrega al final de su fase con el prefijo `(nueva)` y se revisa si cambia la estimación. Si no cabe, va a "Fuera de alcance".

## Reglas duras

- Ninguna tarea sin criterio de aceptación verificable. Si no sabes cómo probarla, no la escribas todavía.
- Ninguna tarea mayor de 45 minutos. La única excepción es esperar a un tercero, y esa se marca `bloqueada`, no `en curso`.
- Actualiza el estado del plan al cerrar cada tarea. No acumules cierres "para después".
- Si existe `obra/obra.py`, el comando `python obra/obra.py paso "<texto>" --pct N` se ejecuta en cada cierre, no al final de la fase.
- No marques `hecha` una tarea cuyo criterio no ejecutaste. "Debería funcionar" es `en curso`.
- Una sola tarea `en curso` por agente a la vez.
- No borres tareas. Las que ya no aplican se marcan `hecha` con nota "descartada: motivo" o se mueven a "Fuera de alcance".
- Los identificadores (F1-T3) no se renumeran nunca, aunque se inserten tareas en medio. Las nuevas toman el siguiente número libre.

## Lista de comprobación

- [ ] Existe una Fase 0 de preparación con cinco tareas o menos.
- [ ] Cada fase corresponde a un entregable vertical del plan de proyecto.
- [ ] Cada tarea está en imperativo con objeto concreto.
- [ ] Cada tarea cabe en 45 minutos.
- [ ] Cada tarea tiene criterio de aceptación con resultado sí/no.
- [ ] Ninguna tarea aparece antes que una de la que depende.
- [ ] Cada fase tiene hito demostrable con destinatario y duración de la demo.
- [ ] Todos los estados son uno de: pendiente, en curso, hecha, bloqueada.
- [ ] La suma de cada fase cuadra con la talla del plan de proyecto.
- [ ] Hay sección "Registro de avance" y sección "Fuera de alcance".
- [ ] Si existe `obra/obra.py`, el comando de avance está anotado en el documento.

## Plantilla

Copia esto en `PLAN_TRABAJO.md` y rellena entre corchetes.

```markdown
# PLAN DE TRABAJO: [nombre corto]

Fuente: `PLAN_PROYECTO.md` del [AAAA-MM-DD]   Responsable: [nombre]
Estados válidos: pendiente · en curso · hecha · bloqueada (motivo)
Avance: [N] de [M] tareas hechas ([pct] %)
Comando de avance (si existe obra): `python obra/obra.py paso "<Fx-Ty nombre>" --pct <pct>`

## Fase 0: Preparación
Hito: [qué se muestra, a quién, en cuántos minutos]

| ID | Tarea (imperativo + objeto) | Criterio de aceptación (sí/no) | Depende de | Estado | Cerrada |
|----|------------------------------|--------------------------------|------------|--------|---------|
| F0-T1 | [Clonar repo y levantar entorno local] | [`curl -s localhost:PUERTO/health` devuelve `ok`] | — | pendiente | |
| F0-T2 | [Cargar datos de prueba] | [consulta devuelve N filas] | F0-T1 | pendiente | |

## Fase 1: [nombre del entregable E1]
Hito: [qué se muestra, a quién, en cuántos minutos]

| ID | Tarea | Criterio de aceptación | Depende de | Estado | Cerrada |
|----|-------|------------------------|------------|--------|---------|
| F1-T1 | [tarea] | [verificación] | F0-T2 | pendiente | |
| F1-T2 | [tarea] | [verificación] | F1-T1 | pendiente | |
| F1-T3 | [tarea] | [verificación] | F1-T1 | pendiente | |

## Fase 2: [nombre del entregable E2]
Hito: [qué se muestra, a quién, en cuántos minutos]

| ID | Tarea | Criterio de aceptación | Depende de | Estado | Cerrada |
|----|-------|------------------------|------------|--------|---------|
| F2-T1 | [tarea] | [verificación] | F1-T3 | pendiente | |

## Registro de avance
| Fecha y hora | Qué se cerró | Quién lo vio | Observación |
|--------------|--------------|--------------|-------------|
| [AAAA-MM-DD HH:MM] | [F0 completa, demo del hito] | [nombre] | [comentario] |

## Fuera de alcance (apareció durante la ejecución)
- [ítem y por qué no entra ahora]
```

## Aprendido en la demo Tecnosito (10-10-2026)

- Antes de repartir tareas entre varios agentes, cierra el contrato: una tabla con cada ruta de API, su JSON de entrada y de salida, y el esquema de `estado.json`. Esa tabla es la tarea F1-T1 y las demás dependen de ella. Cinco agentes en paralelo terminaron la demo sin pisarse porque el contrato de cinco rutas existía antes de arrancar.
- Cada agente trabaja con rutas absolutas y dentro de su carpeta. Uno escribió en el README de otro proyecto por un `cd` encadenado en un comando largo. El plan anota la carpeta raíz de cada agente.
- `obra.py paso "<texto>"` ahora reabre un paso ya hecho si el texto coincide, en vez de duplicarlo. Antes, repetir el cierre de la misma tarea creaba un segundo paso y la barra mentía. Si ves pasos repetidos en la obra, es la versión vieja de `obra.py`.
- Las tareas de la segunda fase se cerraron con cifras en el criterio ("flyer en 7 s con sdxl-turbo", "footprint 4,97 GB"), no con "funciona". Un criterio con número se vuelve a verificar en la máquina siguiente; uno sin número no.

## Versión corta para modelos pequeños

Tienes una lista de entregables. Produce `PLAN_TRABAJO.md` con la plantilla de arriba.

1. Crea Fase 0 "Preparación" con máximo 5 tareas: repo, entorno, datos de prueba.
2. Cada entregable es una fase.
3. Escribe tareas en imperativo: "Crear…", "Probar…", "Conectar…".
4. Cada tarea dura 45 minutos o menos. Si dura más, divídela en dos.
5. Cada tarea tiene criterio de aceptación. El criterio es un comando o una acción que responde sí o no.
6. Pon la columna "Depende de" con el ID de la tarea previa.
7. Estado inicial: `pendiente`. Estados permitidos: pendiente, en curso, hecha, bloqueada.
8. Al empezar una tarea: cámbiala a `en curso`. Solo una a la vez.
9. Al terminar: ejecuta el criterio. Si da sí, marca `hecha` y anota fecha y hora.
10. Si existe `obra/obra.py`, ejecuta tras cada cierre: `python obra/obra.py paso "F1-T2 nombre" --pct 40`. El número es hechas dividido por total por 100.
11. Cada fase termina en un hito: qué se muestra y a quién.
12. Las tareas nuevas van al final de la fase con prefijo `(nueva)`.

Prohibido: tarea sin criterio. Prohibido: marcar `hecha` sin ejecutar el criterio. Prohibido: borrar tareas o renumerar IDs.
