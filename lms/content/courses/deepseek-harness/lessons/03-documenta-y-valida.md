---
id: dh-03
title: "Sesión 3 · Describe por roles, audita y valida tu sistema"
published: true
starts_at: 2026-12-01T19:30:00-05:00
objectives:
  - id: dh-03-o1
    title: Describir cada rol de tu sistema (pantallas, qué puede y qué NO puede) con evidencia archivo:línea que se pueda comprobar
  - id: dh-03-o2
    title: Auditar 12 mecanismos de seguridad verificando cada pista de la foto en el código y en el navegador, y priorizar el riesgo por severidad × probabilidad
  - id: dh-03-o3
    title: Dibujar el mapa del sistema en Mermaid con nodos que existen y comprobar cada afirmación (ruta, comando, valor, permiso) contra el sistema
  - id: dh-03-o4
    title: Mantener la documentación al día comparando dos fotos (hashes.txt) tras un cambio y revisando solo los documentos afectados
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/deepseek-ai/deepseek-harness
  ref: master
materials:
  - id: dh-03-guia-visual
    title: Guía visual de la sesión (12 diapositivas, capturas reales y esquemas rotulados)
    kind: slides
    slides_dir: materials/guia-visual-s3
    objective_ids: [dh-03-o1, dh-03-o2, dh-03-o3, dh-03-o4]
  - id: dh-03-pl-roles
    title: "Plantilla · DESCRIPCION_POR_ROLES.md"
    kind: doc
    file: materials/plantillas-s3/DESCRIPCION_POR_ROLES.md
    objective_ids: [dh-03-o1]
  - id: dh-03-pl-auditoria
    title: "Plantilla · AUDITORIA_SEGURIDAD.md"
    kind: doc
    file: materials/plantillas-s3/AUDITORIA_SEGURIDAD.md
    objective_ids: [dh-03-o2]
  - id: dh-03-pl-mapa
    title: "Plantilla · MAPA_DEL_SISTEMA.md (con Mermaid)"
    kind: doc
    file: materials/plantillas-s3/MAPA_DEL_SISTEMA.md
    objective_ids: [dh-03-o3]
  - id: dh-03-pl-dudas
    title: "Plantilla · DUDAS_VERIFICABLES.md"
    kind: doc
    file: materials/plantillas-s3/DUDAS_VERIFICABLES.md
    objective_ids: [dh-03-o3, dh-03-o4]
  - id: dh-03-kit
    title: Kit «Foto del sistema» (skill, AGENTS.sistema.md y foto.mjs; el mismo de la sesión 1)
    kind: zip
    file: materials/kit-foto-del-sistema.zip
    objective_ids: [dh-03-o1, dh-03-o4]
  - id: dh-03-m-mermaid
    title: Mermaid · diagramas como texto (sintaxis de flowchart)
    kind: doc
    url: https://mermaid.js.org/syntax/flowchart.html
    objective_ids: [dh-03-o3]
  - id: dh-03-m-c4
    title: Modelo C4 · contexto, contenedores y componentes para el mapa del sistema
    kind: doc
    url: https://c4model.com/
    objective_ids: [dh-03-o3]
  - id: dh-03-m-diataxis
    title: Diátaxis · los cuatro tipos de documentación
    kind: doc
    url: https://diataxis.fr/
    objective_ids: [dh-03-o1]
  - id: dh-03-m-asvs
    title: OWASP ASVS · estándar de verificación de seguridad de aplicaciones
    kind: doc
    url: https://owasp.org/www-project-application-security-verification-standard/
    objective_ids: [dh-03-o2]
  - id: dh-03-m-auth
    title: OWASP · hoja de autenticación (claves, bloqueo por intentos)
    kind: doc
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
    objective_ids: [dh-03-o2]
  - id: dh-03-m-sesion
    title: OWASP · hoja de manejo de sesiones (expiración por inactividad)
    kind: doc
    url: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
    objective_ids: [dh-03-o2]
  - id: dh-03-m-agents
    title: AGENTS.md · el formato abierto de instrucciones para agentes
    kind: doc
    url: https://agents.md/
    objective_ids: [dh-03-o1, dh-03-o4]
cycle:
  - id: ver
    title: Ver la clase y repasar los cuatro entregables
    tool: zoom
    phase: experiencia
    description: "Asiste en vivo (martes 1 de diciembre, 7:30 pm) o mira la grabación. En la escena 1 marca lo que trae cada documento."
    check: Puedes nombrar los cuatro documentos y decir de dónde sale cada uno
  - id: roles
    title: Describir un rol con evidencia
    tool: lms
    phase: conceptualizacion
    description: "En la escena 2 arma la ficha del vendedor con datos reales. Luego pide a tu agente la de TU sistema con el prompt de la pestaña 3."
    check: Ficha del vendedor con 10 de 12 aciertos y 3 citas de tu documento comprobadas con sed -n
  - id: auditar
    title: Auditar y probar en el navegador
    tool: terminal
    phase: reflexion
    description: "En la escena 3 recorre los 12 mecanismos con un sistema imaginario. Luego prueba el tuyo: 6 claves malas, la expiración y #/usuarios con otro rol."
    check: 10 de 12 filas completas y una captura de la prueba de bloqueo o de expiración
  - id: mapa
    title: Dibujar el mapa en Mermaid
    tool: lms
    phase: conceptualizacion
    description: "En la escena 4 dibuja con el editor. Luego pon tres diagramas de TU sistema en docs/MAPA_DEL_SISTEMA.md."
    check: Cada nodo de tus diagramas existe (ls y grep -n lo confirman)
  - id: comprobar
    title: Comprobar cada afirmación contra el sistema
    tool: terminal
    phase: experimentacion
    description: "En la escena 5 corrige un borrador comprobando ruta, comando, valor o permiso. Luego corre el comando de citas sobre tus docs/."
    check: 10 de 12 a la primera y el comando de citas no imprime NO EXISTE
  - id: mantener
    title: Mantener la documentación al día
    tool: terminal
    phase: conceptualizacion
    description: "En la escena 6 decide qué documentos revisar con un diff real. Luego repite el procedimiento con un cambio mínimo en una copia de tu sistema."
    check: 4 de 5 documentos bien decididos y los 5 pasos en orden
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica en el hilo de la sesión qué hallazgo propio verificaste y con qué prueba, o responde a un compañero.
    check: Tu mensaje aparece en el hilo de la sesión
  - id: entregar
    title: Entregar el paquete
    tool: git
    phase: experimentacion
    description: "Sube docs/ (los 4 documentos y tu captura) y FOTO/ a tu repo y entrégalo desde el LMS (URL + commit o zip)."
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Ya tienes tu sistema y su foto (sesión 1) y sabes medir (sesión 2). Hoy entregas documentación
**que se puede comprobar**. La regla: **documentar es afirmar con evidencia**.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · Cuatro entregables | Ves cómo salen de la foto | Nombras los cuatro |
| 2 · Por roles | Armas la ficha de un rol | 10 de 12 permisos |
| 3 · Auditar | Verificas 12 mecanismos | 10 de 12 filas |
| 4 · Mermaid | Dibujas con nodos que existen | Todos en verde |
| 5 · Comprobar | Corriges un borrador | 10 de 12 a la primera |
| 6 · Mantener | Comparas dos fotos | 4 de 5 documentos |
| 7 · Entrega | Cierras el paquete | Entrega en «Mis notas» |

**Ruta A:** tu laptop, con dsh y tu clave. **Ruta B:** el aula, sin internet: `aula sistema foto`, el Visor y el agente `jmd`.

## Antes de la clase

- [ ] Tu sistema abre y tienes su `FOTO/` de la sesión 1.
- [ ] Descargaste el kit y las cuatro plantillas de Materiales.
- [ ] Sabes qué usuario entra a cada rol (`LEEME.txt`).

## 1 · Cuatro entregables

**Objetivo:** saber qué entregas y de dónde sale cada documento.

1. Mira el diagrama: sistema → `FOTO/` → cuatro documentos.
2. Abre cada pestaña y marca lo que debe traer.

**Qué deberías ver:** 19 casillas. **Si falla:** la escena no abre → recarga la sesión.

## 2 · Por roles

**Objetivo:** decir qué puede y qué NO puede un rol, con línea que lo pruebe.

1. Arma la ficha del vendedor y pulsa Verificar.
2. Mira qué filas de la matriz de la foto no resuelven solas.
3. Copia el prompt y pídeselo a tu agente para TU sistema.
4. Comprueba 3 citas con `sed -n '224p' js/config.js`.

**Qué deberías ver:** 10 de 12 y tres permisos que exigen abrir el archivo.
**Si falla:** una cita no dice lo afirmado → corrígela o márcala «por verificar».

## 3 · Auditar

**Objetivo:** pasar de pista automática a hallazgo verificado.

1. Elige un mecanismo y mira «dónde buscar».
2. Prueba en el navegador: 6 claves malas, la expiración, `#/usuarios` con otro rol.
3. Decide estado y riesgo; prioriza con severidad × probabilidad.

**Qué deberías ver:** 10 de 12 filas. **Si falla:** no puedes esperar la expiración → baja `sesionMin` en una COPIA, y comprueba la restauración con `shasum -a 256 -c FOTO/hashes.txt`.

## 4 · Mermaid

**Objetivo:** un diagrama en texto cuyos nodos existen.

1. Carga un ejemplo y léelo.
2. Cambia un nodo por uno inventado y mira el rojo.
3. Escribe el flujo de TU sistema.

**Qué deberías ver:** «N de N existen». **Si falla:** «línea sin entender» → usa `-->`, `-.->` y etiquetas `|así|`.

## 5 · Comprobar

**Objetivo:** que ninguna afirmación quede sin ejecutar.

1. Pulsa «Comprobar» y lee la salida real.
2. Corrige según la salida, no según el sonido.
3. Lo que no puedas probar: `[PENDIENTE: motivo]`.

**Qué deberías ver:** 12 resueltas. **Si falla:** 8 o menos a la primera → relee cada salida.

## 6 · Mantener

**Objetivo:** revisar solo lo que el cambio afecta.

1. Lee el `diff` de `hashes.txt`.
2. Decide por documento: a fondo, solo citas o no tocar.
3. Ordena los 5 pasos.

**Qué deberías ver:** 4 de 5. **Si falla:** guarda `FOTO-anterior` fuera de la carpeta del sistema; dentro cambia la huella.

## 7 · Entrega

**Objetivo:** cerrar el paquete y el curso.

1. Marca las 6 casillas.
2. `git push` y copia `git rev-parse HEAD`, o arma el zip.
3. Entrégalo en el LMS.

**Qué deberías ver:** 6 de 6 marcadas. **Si falla:** `git push` pide credenciales → entrega el zip.

## Tarea

- Entrega `docs/` con los **cuatro documentos**, `FOTO/` actualizada y **una captura** de la prueba de bloqueo o de expiración (URL + commit, o zip).
- Publica en el hilo un hallazgo propio y su prueba.
- **Certificado e insignia:** al completar el ciclo se enciende la insignia de la sesión 3; con las tres sesiones, el LMS emite el certificado del curso (4 h 30 min).
