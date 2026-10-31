---
id: dh-02
title: "Sesión 2 · Mide y reduce el consumo"
published: true
starts_at: 2026-11-24T19:30:00-05:00
objectives:
  - id: dh-02-o1
    title: Medir una corrida del agente con tiempo, llamadas, tokens (acierto de caché, fallo y salida) y CPU/RAM, y decir de dónde sale cada número
  - id: dh-02-o2
    title: Hacer la misma tarea sobre tu sistema, sin foto y con foto, y compararlas con relaciones medidas, sin prometer porcentajes
  - id: dh-02-o3
    title: Calificar respuestas con 5 criterios de calidad y rechazar un ahorro que baja la calidad
  - id: dh-02-o4
    title: Acotar archivos, líneas por comando, alcance de búsqueda, resumen reutilizado y tareas por rol, y dejar un informe y una rutina reproducible
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: dh-02-m1
    title: Guía visual de la sesión 2 (12 diapositivas)
    kind: slides
    slides_dir: materials/guia-visual-s2
    objective_ids: [dh-02-o1, dh-02-o2, dh-02-o3, dh-02-o4]
  - id: dh-02-m2
    title: DeepSeek API · precios por millón de tokens, caché de contexto y horario pico
    kind: doc
    url: https://api-docs.deepseek.com/quick_start/pricing
    objective_ids: [dh-02-o1, dh-02-o2]
  - id: dh-02-m3
    title: DeepSeek API · qué es un token y cómo se informa el uso
    kind: doc
    url: https://api-docs.deepseek.com/quick_start/token_usage
    objective_ids: [dh-02-o1]
  - id: dh-02-m4
    title: DeepSeek API · caché de contexto (acierto y fallo)
    kind: doc
    url: https://api-docs.deepseek.com/guides/kv_cache
    objective_ids: [dh-02-o1, dh-02-o4]
  - id: dh-02-m5
    title: DeepSeek Harness · documentación oficial
    kind: doc
    url: https://deepseek-harness.github.io/deepseek-harness/
    objective_ids: [dh-02-o1]
  - id: dh-02-m6
    title: DeepSeek Harness · perfil headless (--json, uso por paso)
    kind: doc
    url: https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/headless/README.md
    objective_ids: [dh-02-o1, dh-02-o2]
  - id: dh-02-m7
    title: time(1) · tiempo y memoria máxima de un proceso (/usr/bin/time -v)
    kind: doc
    url: https://man7.org/linux/man-pages/man1/time.1.html
    objective_ids: [dh-02-o1]
  - id: dh-02-m8
    title: htop · monitor interactivo de CPU y RAM (Linux)
    kind: link
    url: https://htop.dev/
    objective_ids: [dh-02-o1]
  - id: dh-02-m9
    title: Monitor de actividad de macOS · guía de Apple
    kind: doc
    url: https://support.apple.com/guide/activity-monitor/welcome/mac
    objective_ids: [dh-02-o1]
  - id: dh-02-m10
    title: jq · manual (para sumar el uso por paso en tu laptop; en el aula no hace falta)
    kind: doc
    url: https://jqlang.org/manual/
    objective_ids: [dh-02-o1]
  - id: dh-02-m11
    title: Kit «Foto del sistema» (skill, AGENTS.md y foto.mjs)
    kind: zip
    file: materials/kit-foto-del-sistema.zip
    objective_ids: [dh-02-o2, dh-02-o4]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo (martes 24 de noviembre, 7:30 pm Lima) o mira la grabación. Abre el modo LIVE para tocar las siete escenas.
    check: Has visto la clase completa (o la grabación)
  - id: donde-ver
    title: Saber de dónde sale cada número
    tool: lms
    phase: experiencia
    description: "En la escena 2 lee la página de uso de ejemplo y el RESUMEN DE USO del aula, resuelve los cuatro ejercicios y llena la ficha de seis campos."
    check: "3 de 4 ejercicios bien y la ficha con sus 6 campos"
  - id: corrida-a
    title: "Corrida A: sin foto"
    tool: terminal
    phase: experiencia
    description: "Recorre la simulación de la escena 3; luego corre la tarea sin FOTO ni AGENTS.md: en tu aula, apártalos y usa aula dsh \"…\" | tee; en tu laptop, una copia limpia y dsh con --json."
    check: "Existe docs/medicion/A.txt (aula: respuesta + resumen de uso) o A.jsonl y A.md (laptop), y la respuesta cita archivo:línea"
  - id: corrida-b
    title: "Corrida B: con foto"
    tool: terminal
    phase: reflexion
    description: "Estima en la escena 4; luego corre B en la carpeta de tu sistema, con FOTO y AGENTS.md (en el aula, aula dsh \"…\" en /trabajo/sistema), y compara con A."
    check: "Existe docs/medicion/B.txt (aula) o B.jsonl y B.md (laptop), y tienes A y B en una tabla"
  - id: calidad
    title: Calidad primero
    tool: lms
    phase: conceptualizacion
    description: "En la escena 5 califica cuatro respuestas con los 5 criterios, revela la clave y mira cuál ahorro es inválido."
    check: "Acuerdo de 16 de 20 casillas con la clave"
  - id: palancas
    title: Acotar el contexto
    tool: lms
    phase: conceptualizacion
    description: "En la escena 6 mueve las cinco palancas y busca una combinación que baje la entrada facturada sin que el aviso diga «Ahorro inválido»."
    check: "Entrada facturada a menos de la mitad de A con el aviso en verde o ámbar"
  - id: entregar
    title: Entregar el informe y la rutina
    tool: git
    phase: experimentacion
    description: "Genera el esqueleto en la escena 7, escribe docs/INFORME_CONSUMO.md y docs/RUTINA.md con tus cifras y súbelos a tu repo."
    check: "Ambos archivos están en tu último commit y la entrega aparece en «Mis notas»"
---

## Avance de la clase

Ya tienes tu sistema de práctica y su foto. Hoy mides qué cuesta usar un agente sobre él: **una
tarea, dos maneras, la misma vara de calidad**. Nunca prometemos un porcentaje: medimos relaciones.
Tarea de referencia: «describe qué puede hacer cada rol de mi sistema».

| Escena | Qué haces | Comprobación |
|---|---|---|
| 1 · Tres monedas | Separar tokens, tiempo y CPU/RAM | 4 de 5 casos |
| 2 · Dónde ver el uso | Leer una página de uso; llenar la ficha | 3 de 4 ejercicios; 6 campos |
| 3 · Corrida A | Ver cómo crece el contexto sin foto | Explicas por qué se factura ≈ 9× lo leído |
| 4 · Corrida B | Repetir con foto y 5 verificaciones | Tabla A/B con relaciones |
| 5 · Calidad | Calificar 4 respuestas con 5 criterios | 16 de 20 casillas |
| 6 · Palancas | Mover cinco palancas | Ahorro sin «Ahorro inválido» |
| 7 · Informe | Generar informe y rutina | Archivos en tu commit |

## Antes de la clase

1. Saldo en tu cuenta de DeepSeek y tu clave a mano (en tu gestor).
2. Ruta B · tu aula: tu sistema en `/trabajo/sistema` con `FOTO/`, `AGENTS.md` y `skills/` (sesión 1). Al entrar,
   `aula dsh clave` (la clave se borra si el aula se reinicia). No necesitas instalar nada ni `jq`.
3. Ruta A · tu laptop (opcional): Node ≥ 24.9, `npx @deepseek-ai/dsh web` abierto una vez, el kit de Materiales y
   `jq` (en Windows, WSL o Git Bash).
4. Una clave solo para medir (`curso-medicion`): así Usage muestra solo tu tarea.

## 1 · Tres monedas

**Objetivo:** decir qué moneda paga cada cosa: la API (tokens), tú (tiempo) o tu máquina (CPU/RAM).

1. Mira las tres tarjetas y cómo se mide cada una.
2. Elige una moneda en cada caso y pulsa «Comprobar».

**Qué deberías ver:** 4 de 5 casos bien.
**Si falla:** un grep gasta CPU; su salida luego entra como tokens.

## 2 · Dónde ver el uso

**Objetivo:** saber de dónde sale cada número y anotar tu corrida base.

1. En «Plataforma · Usage» resuelve los cuatro ejercicios (esquema con cifras de ejemplo).
2. En «Aula · resumen», mira qué imprime `aula dsh "tarea"`: la respuesta y un **RESUMEN DE USO** con entrada
   (caché acierto y fallo), salida, llamadas al modelo, herramientas y duración. Ya viene sumado: no hace falta `jq`.
   `aula dsh` a secas abre el modo `dsh> ` y, al salir, suma el uso de toda la sesión.
3. En «Laptop · --json», mira `--json` y el `jq` que suma el uso por paso.
4. En «time», mira la salida real de `/usr/bin/time -l`.
5. Llena la ficha: tarea, comando, tiempo, llamadas, tokens y CPU/RAM (el resumen del aula no mide CPU/RAM).

**Qué deberías ver:** la ficha con 6 campos; entrada = acierto + fallo de caché.
**Si falla:** en el aula, «Aún no me diste tu clave» → `aula dsh clave`. En la laptop, el perfil headless **no lee la clave guardada en Settings**: exporta `DEEPSEEK_API_KEY`. El precio pico (según la guía, ~20:00 Lima) es el doble: compara tokens, no dólares.

## 3 · Corrida A, sin foto

**Objetivo:** ver por qué leer archivo por archivo se encarece más rápido que los pasos.

1. Pulsa «Siguiente llamada» hasta la 16.
2. Compara «Lo leído» con «Entrada facturada».
3. Contesta la pregunta final.

| Dato real de `dist/muebleria` | Valor |
|---|---|
| Archivos · líneas · bytes | 15 · 5 371 · 295 936 |
| Tokens si se leyera todo (caracteres ÷ 4, **estimación**) | ≈ 73 700 |
| `FOTO.md` (estimación) | ≈ 10 700 |
| Tomar la foto (medido, Mac) | 0,15 s · ≈ 92 MB · 0 tokens |

**Qué deberías ver:** ≈ 69 mil leídos y ≈ 634 mil facturados: cada llamada reenvía el pasado. La caché abarata lo repetido, pero su acierto lo informa el proveedor.
**Si falla:** la documentación cuenta ≈ 0,3 tokens por carácter; ÷ 4 es más corto. Las relaciones se mantienen.

## 4 · Corrida B, con foto

**Objetivo:** la misma tarea leyendo la foto y abriendo solo lo necesario.

1. Mira qué entra: AGENTS.md y FOTO.md; los 5 fragmentos son solo para verificar.
2. Mueve «Resumen» y «Fragmentos».
3. Lee la tabla A/B.

**Qué deberías ver:** en la estimación, B usa 7 llamadas y ≈ 6,7 veces menos entrada que A. Es la relación de este ejemplo, no una promesa.
**Si falla:** con 0 fragmentos todo queda «por verificar»: la calidad baja.

## 5 · Calidad y trampas

**Objetivo:** aplicar 5 criterios y rechazar un ahorro que baja la calidad.

1. Califica las cuatro respuestas: ¿cita archivo:línea?, ¿no inventa?, ¿cubre todos los roles?, ¿coincide con la matriz?, ¿marca «por verificar»?
2. Revela la clave.
3. Compara cada candidata con A.

**Qué deberías ver:** la 2 es ahorro válido; la 3 inventa roles; la 4 omite uno y el comparador marca **«Ahorro inválido»**.
**Si falla:** cuenta los roles en §7 de la foto.

## 6 · Acotar el contexto

**Objetivo:** mover cinco palancas sin romper la calidad.

1. Empieza en «Como la corrida A».
2. Cambia una palanca a la vez: archivos, líneas, alcance, resumen, tareas por rol.
3. Mira las dos barras apiladas y el aviso.

**Qué deberías ver:** cada palanca baja una parte distinta de la barra; algunas activan «Ahorro inválido».
**Si falla:** líneas y alcance no hacen nada mientras abras todos los archivos.

## 7 · Informe y tarea

**Objetivo:** generar el esqueleto de `INFORME_CONSUMO.md` y `RUTINA.md`.

1. Carga el ejemplo y mira la conclusión.
2. Pulsa «Limpiar» y escribe tus cifras.

**Qué deberías ver:** «ahorro válido» o «ahorro inválido» según tus criterios.

## Tarea

- Corre A (sin foto) y B (con foto) sobre **tu** sistema. En el aula guarda lo que imprime `aula dsh "…" | tee` en
  `docs/medicion/A.txt` y `B.txt` (respuesta + resumen de uso); en la laptop, `A.jsonl`, `A.md`, `B.jsonl` y `B.md`.
  En las dos rutas, cruza los tokens con el panel **Usage** de la plataforma.
- Escribe `docs/INFORME_CONSUMO.md`: ficha, tabla A/B, 5 criterios y conclusión honesta. Si B gastó más o la calidad bajó, dilo.
- Escribe `docs/RUTINA.md`: cinco pasos que otra persona repita sin ti.
- Haz `git add docs/ && git commit -m "sesión 2: consumo medido A/B y rutina"` y entrega URL + commit desde el LMS.

Precios del 31-10-2026 solo como ejemplo: verifica los vigentes.
