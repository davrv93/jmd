---
id: ds-01
title: "Sesión 1 · La foto del sistema y la lectura por secciones"
published: false
starts_at: 2026-11-29T19:30:00-05:00
objectives:
  - id: ds-01-o1
    title: "Entender por qué documentar es leer la «foto» (un inventario reproducible) y no releer todo el código, y qué ahorra eso de contexto"
  - id: ds-01-o2
    title: Elegir uno de los 15 sistemas de práctica en tu aula y tomar su foto (FOTO.md, FOTO.json y hashes.txt) con su huella global
  - id: ds-01-o3
    title: Leer la foto por secciones (resumen, carga, modelo de datos, roles, matriz, seguridad, hallazgos) y verificar 5 afirmaciones del banco con sed -n
  - id: ds-01-o4
    title: "Describir el sistema por roles con su matriz de permisos y auditar los 14 mecanismos de seguridad con estado y evidencia archivo:línea"
  - id: ds-01-o5
    title: Distinguir hecho, pista y opinión, dibujar el mapa del sistema y anotar dudas verificables, sin inventar nada
repo:
  url: https://github.com/davrv93/jmd
  ref: main
cycle:
  - id: ver
    title: Ver la clase y sentir el dolor de heredar un sistema sin documentación
    tool: zoom
    phase: experiencia
    description: Asiste en vivo (horario por confirmar) o mira la grabación. En la escena 1 vota tu experiencia heredando sistemas sin documentar.
    check: Entraste a tu aula del LIVE y abriste su terminal
  - id: sistema
    title: Elegir tu sistema de práctica y abrirlo
    tool: terminal
    phase: reflexion
    description: "En la escena 3 elige uno de los 15 sistemas por rubro o por rol. En la terminal del aula: aula sistema (lista) y aula sistema <id>. Ábrelo en el Visor con dos roles."
    check: Elegiste tu sistema, corriste aula sistema <id> y lo abriste con al menos dos roles
  - id: foto
    title: Tomar la foto del sistema
    tool: terminal
    phase: conceptualizacion
    description: "En la escena 4 toma la foto: aula sistema foto (o bun /opt/skills-curso/foto-del-sistema/motor/foto.mjs /trabajo/sistema). Mira qué dejó en FOTO/ y anota su huella global."
    check: FOTO/ tiene FOTO.md, FOTO.json y hashes.txt, y copiaste los 12 primeros caracteres de la huella
  - id: leer
    title: Leer la foto por secciones
    tool: terminal
    phase: conceptualizacion
    description: "En la escena 5 recorre FOTO.md en el orden que ahorra contexto: §1 Resumen → §3 Carga → §6 Modelo de datos → §7 Roles → §8 Matriz → §10 Seguridad → §12 Hallazgos. Lees la foto, no el árbol."
    check: Sabes qué entidades, roles y mecanismos trae tu sistema sin haber abierto todos los .js
  - id: verificar
    title: Verificar 5 afirmaciones contra el código
    tool: terminal
    phase: experimentacion
    description: "En la escena 6 toma 5 afirmaciones del banco de verificación (§13) y comprueba cada una con su sed -n 'a,bp' archivo. Lo que coincide es un hecho; lo que sale solo de un patrón es una pista."
    check: Comprobaste 5 afirmaciones y anotaste cuáles coincidieron en docs/DUDAS_VERIFICABLES.md
  - id: roles
    title: Describir por roles y levantar la matriz de permisos
    tool: terminal
    phase: experimentacion
    description: "En la escena 7 copia la plantilla a docs/DESCRIPCION_POR_ROLES.md y llénala con la matriz de la foto: por rol, qué ve, qué crea o anula y qué NO puede, cada cosa con su archivo:línea. Cubre también el rol de solo lectura."
    check: "docs/DESCRIPCION_POR_ROLES.md cubre todos los roles con evidencia archivo:línea"
  - id: seguridad
    title: Auditar los 14 mecanismos de seguridad
    tool: terminal
    phase: experimentacion
    description: "En la escena 8 copia la plantilla a docs/AUDITORIA_SEGURIDAD.md y, para cada uno de los 14 mecanismos, abre el archivo:línea de la evidencia y confirma o corrige su estado (presente / débil / no encontrado), con riesgo, recomendación y cómo verificarlo."
    check: docs/AUDITORIA_SEGURIDAD.md tiene los 14 mecanismos con estado y evidencia, y los falsos positivos descartados
  - id: juego
    title: "Jugar «¿Presente, débil o no encontrado?»"
    tool: lms
    phase: conceptualizacion
    description: "En la escena 10 clasifica hallazgos de seguridad reales según su evidencia. Un error no resta: lee la lupa y sigue."
    check: Jugaste la ronda y tu reflexión quedó en el muro
  - id: mapa
    title: Dibujar el mapa del sistema y anotar dudas verificables
    tool: terminal
    phase: experimentacion
    description: En la escena 11 completa docs/MAPA_DEL_SISTEMA.md con las capas y un diagrama Mermaid, y docs/DUDAS_VERIFICABLES.md con afirmaciones dudosas y cómo comprobarlas (máximo 10, cada una con forma de verificarse).
    check: Tienes el mapa con un diagrama y hasta 10 dudas, cada una con su comprobación
  - id: preguntar
    title: Preguntar o responder en el hilo de la sesión
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la clase en el hilo de la sesión o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar la foto y los cuatro documentos
    tool: git
    phase: experimentacion
    description: Sube FOTO/ y los cuatro documentos (descripción por roles, auditoría de seguridad, mapa y dudas verificables) a tu repo y entrégalo desde el LMS (URL + commit o zip).
    check: "La entrega aparece en «Mis notas» con estado en cola"
---

## Avance de la clase

> **Fecha tentativa.** El horario de esta sesión (`starts_at` = domingo 29 de noviembre de 2026, 7:30 pm)
> es **un marcador provisional**: el instructor confirmará el día y la hora reales más adelante. No reserves
> nada en firme con esta fecha. <!-- Placeholder: el usuario confirmará el horario definitivo. -->

Hoy aprendes el oficio de **documentar y auditar un sistema que heredaste**, sin leerte todo el código.
El método es la **foto del sistema**: un script deja un inventario verificable y **reproducible** —mismo
código, misma foto— y tú lees la foto, no el árbol. Al final entregas documentación que cualquiera puede
comprobar: descripción por roles, auditoría de seguridad, mapa y dudas verificables.

Este curso es el **paso siguiente** de tu primera foto con DeepSeek Harness, pero aquí el tema es el oficio:
no tocamos cuentas, claves ni consumo de tokens. Trabajas sobre uno de los **15 sistemas de práctica** que ya
viven en tu aula del LIVE; no instalas ni creas nada.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · El dolor | Votas tu experiencia heredando sistemas sin documentar | Aula abierta |
| 2 · La teoría | Por qué leer la foto y no el código | Entiendes qué ahorra |
| 3 · Tu sistema | Eliges 1 de 15 y lo abres con dos roles | `aula sistema <id>` |
| 4 · La foto | `aula sistema foto` | `FOTO/` con 3 archivos |
| 5 · Leer la foto | Recorres las 7 secciones clave | Sabes roles, matriz y seguridad |
| 6 · Verificar | 5 afirmaciones del banco con `sed -n` | Hechos separados de pistas |
| 7 · Por roles | Llenas `DESCRIPCION_POR_ROLES.md` | Matriz con evidencia |
| 8 · Seguridad | Auditas los 14 mecanismos | Estado + `archivo:línea` |
| 9 · Hecho/pista/opinión | Los escribes distinto | — |
| 10 · Juego | «¿Presente, débil o no encontrado?» | Reflexión al muro |
| 11 · Mapa y dudas | `MAPA_DEL_SISTEMA.md` + `DUDAS_VERIFICABLES.md` | Diagrama y dudas |
| 12 · Entrega | Insignia, fotito y tarea | FOTO/ + 4 documentos |

## Antes de la clase

- [ ] Sabes entrar a tu aula del LIVE y abrir su terminal (ahí ya están Node 24, DeepSeek Harness y la skill).
- [ ] Vienes con ganas de leer código con calma; no hace falta dominar ningún framework.
- [ ] Opcional: repasa qué es una SPA (una web que corre entera en el navegador, sin servidor propio).

## 3 · Elige tu sistema

**Objetivo:** tener uno de los 15 sistemas en `/trabajo/sistema` y conocerlo por dentro.

1. Filtra por rubro o por rol y elige el tuyo.
2. En la terminal del aula: `aula sistema` (la lista) y `aula sistema <id>` (lo copia a `/trabajo/sistema`).
3. Ábrelo en el **Visor** (`/vista/<tú>/sistema/`) y entra con **dos roles**; compara los menús.

**Qué deberías ver:** el mismo sistema con menús distintos por rol. **Si falla:** revisa `LEEME.txt` (usuarios y claves de demostración).

## 4 · Toma la foto

**Objetivo:** tener `FOTO/` y su huella global.

1. `aula sistema foto` (o `bun /opt/skills-curso/foto-del-sistema/motor/foto.mjs /trabajo/sistema`).
2. `ls FOTO` → `FOTO.md`, `FOTO.json`, `hashes.txt`.
3. Anota los **12 primeros caracteres** de la huella global: si el código cambia, cambia la huella.

**Si falla:** «no existe la carpeta» → estás fuera de tu sistema; vuelve con `aula sistema <id>`.

## 5 · Lee la foto por secciones

**Objetivo:** entender el sistema sin releer el árbol.

Orden que ahorra contexto: **§1 Resumen → §3 Carga → §6 Modelo de datos → §7 Roles → §8 Matriz → §10 Seguridad → §12 Hallazgos.**
No pegues archivos enteros; consulta un trozo con `sed -n 'inicio,finp' archivo` y busca con `grep -n`.

## 6 · Verifica 5 afirmaciones

**Objetivo:** separar lo que viste de lo que solo sugiere un patrón.

1. Toma 5 afirmaciones del **Banco de verificación** (§13 de la foto).
2. Corre el `sed -n 'a,bp' archivo` de cada una y compara.
3. Lo que coincide es un **hecho** (cítalo `archivo:línea`); lo que sale solo de un regex es una **pista**.
   Si una afirmación falla, **dilo antes de seguir**.

## 7 · Describe por roles

**Objetivo:** `docs/DESCRIPCION_POR_ROLES.md` con la matriz de permisos.

Copia `motor/plantillas/DESCRIPCION_POR_ROLES.md` a `docs/` y llénala: por rol, qué pantallas ve, qué
crea/edita/elimina/emite/anula/ejecuta y qué **no** puede. Cada afirmación con `archivo:línea`. Incluye el rol
de solo lectura (el auditor).

## 8 · Audita la seguridad

**Objetivo:** `docs/AUDITORIA_SEGURIDAD.md` con los 14 mecanismos.

Para cada mecanismo abre **el archivo:línea de la evidencia** y confirma o corrige su estado
(`presente` / `débil` / `no encontrado`), con riesgo, recomendación y «cómo verificarlo». Revisa los
hallazgos (§12): cada uno es una pista; descarta los falsos positivos y di por qué.

## 9 · Hecho, pista y opinión

- **Hecho:** lo leíste en el archivo; va con `archivo:línea`.
- **Pista:** salió de un patrón (regex); está **por verificar** hasta que abres la línea.
- **Opinión:** tu recomendación; se escribe aparte y se nota que es tuya.

Nunca inventes rutas, funciones, permisos ni cifras.

## 11 · Mapa y dudas verificables

**Objetivo:** `docs/MAPA_DEL_SISTEMA.md` (capas, módulos, flujos con **Mermaid**) y `docs/DUDAS_VERIFICABLES.md`
(afirmación dudosa → cómo comprobarla → resultado, máximo 10). Una duda sin forma de comprobarse no es duda, es relleno.

## Tarea

- `FOTO/` de tu sistema (con su huella global).
- `docs/DESCRIPCION_POR_ROLES.md`, `docs/AUDITORIA_SEGURIDAD.md`, `docs/MAPA_DEL_SISTEMA.md` y
  `docs/DUDAS_VERIFICABLES.md`, cada afirmación citada `archivo:línea` y marcada como hecho, pista u opinión.
- Entrega URL + commit o un zip. Cierra con un resumen de 5 líneas: qué sistema es, cuántos roles y entidades,
  los 3 hallazgos más graves, qué quedó «por verificar» y la huella global (12 primeros caracteres).
