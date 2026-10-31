---
id: dh-03
title: "Sesión 3 · Documenta y valida el sistema: sin inventar y listo para mantener"
published: true
starts_at: 2026-12-01T19:30:00-05:00
objectives:
  - id: dh-03-o1
    title: Redactar README, arquitectura, flujos de datos y decisiones técnicas a partir de evidencias del repositorio, citando archivo y línea
  - id: dh-03-o2
    title: Crear diagramas Mermaid y guías de instalación, configuración y diagnóstico, y comprobar cada ruta, comando y ejemplo
  - id: dh-03-o3
    title: Marcar supuestos y documentación pendiente, y establecer una revisión de la documentación cuando cambien los módulos
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/deepseek-ai/deepseek-harness
  ref: master
materials:
  - id: dh-03-m1
    title: DeepSeek Harness · repositorio oficial (instalación, Web UI, licencia MIT)
    kind: repo
    url: https://github.com/deepseek-ai/deepseek-harness
    objective_ids: [dh-03-o1, dh-03-o2]
  - id: dh-03-m2
    title: Guía de uso de la Web UI y espacios de trabajo de DeepSeek Harness
    kind: doc
    url: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md
    objective_ids: [dh-03-o1]
  - id: dh-03-m3
    title: AGENTS.md · el archivo de instrucciones del proyecto que lee el agente
    kind: doc
    url: https://agents.md/
    objective_ids: [dh-03-o1, dh-03-o3]
  - id: dh-03-m4
    title: Mermaid · diagramas como texto (flowchart, sequence, C4)
    kind: doc
    url: https://mermaid.js.org/
    objective_ids: [dh-03-o2]
  - id: dh-03-m5
    title: Diátaxis · los cuatro tipos de documentación (tutorial, guía, referencia, explicación)
    kind: doc
    url: https://diataxis.fr/
    objective_ids: [dh-03-o1]
  - id: dh-03-m6
    title: Make a README · qué secciones lleva un README útil
    kind: link
    url: https://www.makeareadme.com/
    objective_ids: [dh-03-o1]
  - id: dh-03-m7
    title: Modelo C4 · contexto, contenedores, componentes y código para el mapa del sistema
    kind: doc
    url: https://c4model.com/
    objective_ids: [dh-03-o2]
  - id: dh-03-m8
    title: arc42 · plantilla de documentación de arquitectura (secciones y decisiones)
    kind: doc
    url: https://arc42.org/
    objective_ids: [dh-03-o1, dh-03-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo el martes 1 de diciembre (7:30 pm, Lima) o mira la grabación. Abre el modo LIVE para tocar las seis escenas.
    check: Has visto la clase completa (o la grabación)
  - id: evidencia
    title: Separar evidencia, supuesto e invento
    tool: lms
    phase: reflexion
    description: En la escena 2 clasifica las 12 afirmaciones del README de «tienda-sol» con los archivos a la vista.
    check: Acuerdo con el criterio del instructor de 80 % o más
  - id: mermaid
    title: Dibujar el flujo principal en Mermaid
    tool: lms
    phase: conceptualizacion
    description: En la escena 3 escribe el flujo principal de TU sistema; cada nodo debe ser un archivo o componente que existe.
    check: Tu flujo se dibuja sin líneas «sin entender» y puedes citar cada nodo
  - id: comprobar
    title: Comprobar rutas y comandos
    tool: terminal
    phase: experimentacion
    description: Primero en el simulador de la escena 4; luego corre cada comando de tu guía en un clon limpio y busca rutas citadas que no existan.
    check: "Ninguna línea de tu guía queda en rojo; lo no probado lleva [PENDIENTE: motivo]"
  - id: revision
    title: Decidir qué se revisa cuando cambia un módulo
    tool: lms
    phase: conceptualizacion
    description: En la escena 5 marca los documentos afectados por el diff y arma el procedimiento de revisión en 5 pasos.
    check: 5 de 6 documentos acertados y el procedimiento en orden
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica en el hilo de la sesión qué parte de tu documentación actual era un supuesto disfrazado de hecho, o responde a un compañero.
    check: Tu mensaje aparece en el hilo de la sesión
  - id: entregar
    title: Entregar el paquete de documentación
    tool: git
    phase: experimentacion
    description: Sube README.md y docs/ (ARQUITECTURA, FLUJOS, EJECUCION, REVISION) a tu repo y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

En la sesión 1 entendiste el sistema por etapas y dejaste instrucciones en `AGENTS.md`; en la 2
mediste y recortaste lo que gasta cada tarea. Hoy cierras el curso con lo que queda cuando el
agente se apaga: **documentación que se puede comprobar contra el código**. La regla de toda la
clase cabe en una línea: **documentar es afirmar con evidencia.** Cada frase del README tiene un
archivo que la respalda o lleva una marca que dice que no lo tiene.

Casi todo pasa en el modo LIVE: seis escenas sobre un repositorio de ejemplo, `tienda-sol`
(Express + PostgreSQL, tres archivos en `src/`). Lo que practiques ahí lo repites después sobre
tu propio repositorio con `dsh`.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · Afirmar con evidencia | Ver qué cartas respaldan una frase: documento, código, prueba | Dices qué le falta a la afirmación 3 |
| 2 · ¿Evidencia o invento? | Clasificar 12 afirmaciones con los archivos a la vista | Acuerdo ≥ 80 % |
| 3 · Mermaid en vivo | Dibujar el flujo principal como texto | Tu flujo se dibuja y cada nodo se cita |
| 4 · Rutas y comandos | Ejecutar la guía de instalación, corregir, marcar pendientes | 8 líneas en ok o pendiente con motivo |
| 5 · Revisión al cambiar | Decidir qué documentos toca un diff y armar el procedimiento | 5 de 6 documentos y 5 pasos en orden |
| 6 · Entrega | Paquete de documentación validada + procedimiento | La entrega aparece en «Mis notas» |

## 1. Documentar es afirmar con evidencia · Experiencia

Un README escrito «de memoria», por una persona o por un agente, promete pruebas que no
existen, describe validaciones que son un `TODO` y fija versiones que nadie comprobó. En la
escena 1 cada afirmación se cruza con tres cartas:

| Carta | Qué aporta | Sola, ¿basta? |
|---|---|---|
| **Documento** | La frase tal como está escrita | No: es una promesa |
| **Código** | El archivo y la línea que lo hacen (`src/server.js:4`) | Casi: dice que *puede* pasar |
| **Prueba** | Un comando corrido hoy con su salida | Con el código, sí |

Si falta la prueba, la frase se escribe como `[SUPUESTO]`. Si el código la contradice, se borra y
el hallazgo pasa a `DIAGNOSTICO.md` como riesgo conocido. Eso es lo que le pides al agente desde
el primer prompt: *«solo lo que verifiques; cita archivo y línea; marca lo demás»*.

**Si falla:** no te abre el modo LIVE → recarga la sesión; las escenas se cargan al entrar.

## 2. ¿Evidencia, supuesto o invento? · Reflexión

La escena 2 es un juego: doce afirmaciones del README de `tienda-sol` y, a la izquierda, el repo
completo en pestañas (`package.json`, `src/server.js`, `src/db.js`, `src/pedidos.js`,
`.env.example`, `docker-compose.yml` y el árbol). Para cada frase decides:

- **Respaldada por archivo**: la encuentras en un archivo concreto. «Se arranca con `npm start`»
  está en `package.json`.
- **Supuesto**: es razonable pero nada lo fija. «Requiere Node 20» no aparece en ningún
  `engines` ni `.nvmrc`; `node --watch` pide 18.11 o más. Se marca y se queda visible.
- **Inventada**: ningún archivo la sostiene o uno la contradice. «Valida el stock antes de
  guardar» choca con el `// TODO: validar stock` de `src/pedidos.js`.

Abre el archivo **antes** de responder; el juego explica cada acierto y cada error. Dos de las
doce están para que dudes: el script `test` existe pero no hay pruebas, y `schema.sql` existe
pero nadie lo ejecuta.

**Si falla:** quedas por debajo de 80 % → vuelve a empezar y lee el árbol del repo primero: la mitad de los inventos se descartan con solo ver qué carpetas no existen.

## 3. Mermaid: el diagrama es texto · Conceptos

Un diagrama en PNG se desactualiza el primer día. Un bloque ` ```mermaid ` dentro de `FLUJOS.md`
vive junto al código, se revisa en el mismo commit y GitHub lo renderiza. La escena 3 trae un
editor con un subconjunto de Mermaid (`flowchart LR|TD`, `A[Texto]`, `A([Texto])`, `A[(Base)]`,
`A --> B`, `A -->|etiqueta| B`, `A -.-> B`) y lo dibuja al vuelo con SVG propio. Tres ejemplos
para empezar: flujo de pedido, arquitectura por capas y árbol de diagnóstico.

La regla no es estética: **cada nodo es un archivo o componente que existe**. `S[server.js]` sí;
`Cache[Redis]` solo si hay un Redis en el compose. Para el mapa de componentes usa C4 (contexto
→ contenedores → componentes) y no pases del tercer nivel: el cuarto es el código mismo.

**Si falla:** la vista previa dice «n línea(s) sin entender» → revisa que cada flecha sea `-->`, `-.->` o `---` y que la etiqueta vaya entre barras `|así|`.

## 4. Rutas y comandos: la guía se ejecuta · Aplicación

La guía de `EJECUCION.md` no se lee: se corre, línea por línea, en un clon limpio. En la escena 4
el agente escribió ocho líneas para `tienda-sol`; el simulador devuelve `ok`, `ruta no existe` o
`comando obsoleto`. Los fallos son clásicos: `.env.sample` que en realidad es `.env.example`,
`docker-compose` con guion (Compose v1, retirado) y `/api/productos` cuando la ruta registrada es
`/productos`. La octava línea, `npm run lint`, no se arregla: no hay script, y la respuesta
honesta es `[PENDIENTE: no hay lint configurado]`, visible, no borrada.

Después hazlo con tu repo. Dos comandos que sirven en casi cualquier proyecto:

```bash
# rutas citadas en la documentación que no existen en el repo
for f in $(grep -ohE '(src|docs|scripts)/[A-Za-z0-9_./-]+' README.md docs/*.md | sort -u); do
  [ -e "$f" ] || echo "NO EXISTE: $f"
done
# scripts npm que la guía menciona (compáralos con package.json)
grep -ohE 'npm run [a-z:-]+' README.md docs/*.md | sort -u
```

Para pedir el borrador sin interacción y que el agente cite lo que verifica:

```bash
dsh --profile headless "Escribe docs/EJECUCION.md con instalación, configuración y diagnóstico de este repo; cada comando debe salir de package.json, docker-compose.yml o scripts/; marca [SUPUESTO] lo que no puedas comprobar"
```

El perfil `headless` corre una sesión no interactiva e imprime la respuesta; la política de
permisos sigue mandando sobre qué puede ejecutar. DeepSeek Harness está en *developer preview*
(el propio README avisa de cambios incompatibles): anota la versión con la que generaste el
paquete.

**Si falla:** `dsh` no está en tu PATH → usa `npx @deepseek-ai/dsh web` (abre la Web UI en `http://127.0.0.1:3080`; con `--no-open` no abre el navegador) y pide lo mismo desde el chat del workspace.

## 5. Revisión al cambiar un módulo · Conceptos

La documentación no se mantiene «cuando haya tiempo»: se revisa con cada diff. En la escena 5
llega un cambio a `tienda-sol` (validar stock, ruta nueva `GET /pedidos/:id`, variable
`STOCK_MINIMO`) y decides qué documentos se tocan. Cuatro sí: `README` (configuración nueva),
`FLUJOS` (el pedido cambió), `API` (ruta y 409 nuevos), `DIAGNOSTICO` (error nuevo para el
usuario). Dos no: `ARQUITECTURA` (mismos componentes) y `DECISIONES` (no cambió ninguna decisión
técnica). La escena te explica cada una y, si discrepas, el hilo de la sesión es el lugar.

Después armas el procedimiento, cinco pasos que van a `docs/REVISION.md`:

1. Leer el diff y listar los módulos tocados, archivo por archivo.
2. Cruzar módulos con documentos usando la tabla módulo → documento.
3. Pedir al agente el borrador del cambio citando archivo y línea.
4. Ejecutar los comandos y rutas que el borrador menciona.
5. Marcar supuestos y pendientes; anotar fecha y commit de la revisión.

La tabla módulo → documento es la pieza que falta en casi todos los repos: dos columnas, se
escribe una vez y vive en `REVISION.md`. Si el cambio toca un módulo que no está en la tabla, el
primer paso es añadirlo. Menciónala en `AGENTS.md` para que el agente la consulte solo.

**Si falla:** aciertas menos de 5 de 6 → pregúntate por cada documento «¿qué frase de este archivo quedó falsa con el diff?»; si no encuentras ninguna, no se revisa.

## Palabras de hoy · Conceptos

Evidencia · Supuesto `[SUPUESTO]` · Pendiente `[PENDIENTE: motivo]` · Cita archivo:línea ·
Mermaid · flowchart · C4 (contexto, contenedores, componentes) · Diátaxis (tutorial, guía,
referencia, explicación) · ADR (registro de decisiones) · Guía de ejecución · Diagnóstico · Tabla
módulo → documento · Revisión por diff · `dsh --profile headless` · AGENTS.md.

## Tareas · Aplicación

- Entrega el **paquete de documentación validada** de tu repositorio: `README.md`, y en `docs/`:
  `ARQUITECTURA.md` (mapa de componentes, C4 hasta el nivel 3), `FLUJOS.md` (los flujos
  principales en Mermaid), `EJECUCION.md` (instalación, configuración y diagnóstico, con fecha de
  la última corrida) y `REVISION.md` (el procedimiento de 5 pasos más la tabla módulo → documento).
  Cada afirmación lleva cita o marca. Entrégalo desde el LMS (URL + commit).
- Publica en el hilo de la sesión qué parte de **tu** documentación actual era un supuesto
  disfrazado de hecho y cómo lo marcaste.
- **Certificado e insignia.** Al completar los pasos del ciclo de esta sesión se enciende la
  insignia de la sesión 3; con las tres sesiones completas el LMS emite el certificado del curso
  *DeepSeek Harness · Optimiza recursos y documenta tus sistemas* (4 h 30 min), con la insignia
  digital para compartir.
