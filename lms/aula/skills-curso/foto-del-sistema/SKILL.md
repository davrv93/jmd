---
name: foto-del-sistema
description: Toma la «foto» de un sistema web (SPA) y la usa para describirlo y auditarlo sin releer todo el código. Un script (foto.mjs) deja un inventario verificable y reproducible, el mismo resultado con el mismo código: archivos con hash, orden de carga, rutas, entidades y campos, roles y matriz de permisos, fórmulas con su código, mecanismos de seguridad con evidencia archivo:línea, dependencias externas, almacenamiento y compatibilidad. Después el agente describe las funcionalidades por rol, audita la seguridad y anota dudas comprobables. Palabras gatillo: foto del sistema, inventario, documentar el sistema, describir por roles, matriz de permisos, auditoría de seguridad, auditar, mapa del sistema, sistema de práctica, hallazgos, qué hace este sistema, entender un sistema ajeno.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Foto del sistema

## Cuándo usar

- Hay una carpeta con un sistema web (HTML + CSS + JS, abre con doble clic) que hay que **entender, describir o auditar**.
- El alumno tiene su sistema de práctica en `/trabajo/sistema` (aula del LIVE, donde corre DeepSeek Harness con `aula dsh` o el agente `jmd`) o en su laptop, y su primera tarea es «tomar la foto».
- No la uses para **construir** o cambiar el sistema (eso es otra tarea), ni para un backend/servidor: la foto es de la parte que corre en el navegador.

## Cómo funciona (en una frase)

`foto.mjs` lee los archivos **sin ejecutarlos** (solo carga `js/config.js` en un sandbox) y escribe `FOTO/FOTO.md`, `FOTO/FOTO.json` y `FOTO/hashes.txt`: una radiografía ordenada que **ahorra contexto**. Tú lees la foto, no el árbol. Lo que sale de patrones (regex) son **pistas**, no pruebas.

## Procedimiento paso a paso

1. **Toma la foto.** Dentro del aula:
   ```bash
   bun /opt/skills-curso/foto-del-sistema/motor/foto.mjs /trabajo/sistema      # o: aula sistema foto
   ```
   En la laptop (Node 20 o más), o en el aula con la skill copiada a `skills/`, desde la carpeta del sistema: `node skills/foto-del-sistema/motor/foto.mjs .`
   Repite el comando si el código cambia; la **huella global** dice si cambió algo.
2. **Lee la foto, no el código.** Abre `FOTO/FOTO.md` (y `FOTO/FOTO.json` si necesitas un dato exacto). Orden de lectura: §1 Resumen → §3 Carga → §6 Modelo de datos → §7 Roles → §8 Matriz → §10 Seguridad → §12 Hallazgos. No pegues el árbol completo ni releas archivos que la foto ya resume.
3. **Verifica 5 afirmaciones al azar** del «Banco de verificación» (§13 de la foto): para cada una corre su comando `sed -n 'a,bp' archivo` y compara. Anota en `docs/DUDAS_VERIFICABLES.md` cuáles coincidieron. Si alguna falla, la foto o tu lectura está mal: **dilo antes de seguir**.
4. **Describe las funcionalidades por rol.** Copia `motor/plantillas/DESCRIPCION_POR_ROLES.md` a `docs/` y llénala con la **matriz de permisos** de la foto: por rol, qué pantallas ve, qué crea/edita/elimina/emite/anula/ejecuta y qué **no** puede. Cada afirmación lleva `archivo:línea`. Cubre todos los roles (incluido el de solo lectura).
5. **Audita los mecanismos de seguridad.** Copia `AUDITORIA_SEGURIDAD.md` a `docs/`. Para cada mecanismo de la foto (§10) abre **el archivo:línea de la evidencia**, confirma o corrige su estado (`presente` / `débil` / `no encontrado`), y completa riesgo, recomendación y «cómo verificarlo». Revisa los **hallazgos** (§12): cada uno es una pista; descarta los falsos positivos y di por qué.
6. **Anota dudas verificables.** En `docs/DUDAS_VERIFICABLES.md`: afirmación dudosa → cómo comprobarla → resultado. Máximo 10. Una duda sin forma de comprobarse no es duda, es relleno.
7. **Entrega** el mapa y los documentos (ver «Qué entregar»).

## Reglas

- **Todo lo observado en archivos se cita con `archivo:línea`.** Lo que no viste, o que sale solo de la foto sin abrir el archivo, se marca **«por verificar»**. Nunca inventes rutas, funciones, permisos ni cifras.
- Una detección de la foto con estado «presente» sigue siendo una pista hasta que abres la línea citada.
- **No modifiques el sistema** (ni siquiera «para arreglar un hallazgo») salvo que el alumno lo pida. Los documentos van en `docs/`; la foto va en `FOTO/`. Ni `docs/`, `FOTO/`, `skills/` ni `AGENTS.md` (de la raíz) entran a la huella.
- Las credenciales de demostración de `js/config.js` se muestran tal cual: es un sistema de práctica, sin datos reales. **Nunca imprimas ni guardes la API key** (`DEEPSEEK_API_KEY`, `JMD_API_KEY`, `OSITO_TOKEN`, etc.).
- Contexto limitado: no vuelques archivos enteros. Para ver una pieza usa `sed -n 'inicio,finp' archivo`; para buscar, `grep -n 'patrón' js/*.js`.
- Distingue **hecho** (leído en el config/archivo), **pista** (patrón) y **opinión** (tu recomendación). Escríbelos distinto.
- Si el sistema no trae `window.SISTEMA` (el sistema real de un alumno), la foto sale en **modo genérico**: sin entidades ni matriz; haz la descripción por rol leyendo el código de rutas y permisos, citando líneas.

## Qué entregar (en `docs/`)

| Archivo | Plantilla | Contenido |
|---|---|---|
| `docs/DESCRIPCION_POR_ROLES.md` | `motor/plantillas/DESCRIPCION_POR_ROLES.md` | Por rol: quién es, pantallas, qué puede y qué no, evidencia |
| `docs/AUDITORIA_SEGURIDAD.md` | `motor/plantillas/AUDITORIA_SEGURIDAD.md` | Tabla mecanismo · estado · evidencia · riesgo · recomendación · cómo verificarlo |
| `docs/MAPA_DEL_SISTEMA.md` | `motor/plantillas/MAPA_DEL_SISTEMA.md` | Capas, módulos, flujos con Mermaid, datos y almacenamiento |
| `docs/DUDAS_VERIFICABLES.md` | `motor/plantillas/DUDAS_VERIFICABLES.md` | Afirmación dudosa · cómo comprobarla · resultado |

Además deja `FOTO/` (la foto) como respaldo de lo que viste. Cierra con un resumen de 5 líneas: qué sistema es, cuántos roles y entidades, los 3 hallazgos más graves, qué quedó «por verificar», huella global (12 primeros caracteres).

## Qué hay en la foto

`FOTO.md` / `FOTO.json` traen: (1) archivos con bytes, líneas, sha256 y huella global; (2) orden de carga y dependencias externas («ninguna» si no hay); (3) almacenamiento (localStorage, sessionStorage, cookies, IndexedDB, window.name); (4) rutas hash con archivo:línea y diagrama; (5) con `window.SISTEMA`: entidades con campos/tipos/obligatorios/únicos/referencias, operaciones con estados y líneas, reportes con roles y parámetros, parámetros del negocio, roles y usuarios, **matriz rol × recurso × acción**, **fórmulas con su código y línea**; (6) seguridad: valores efectivos de `seguridad` frente a los seguros del contrato (con las desviaciones) y 14 mecanismos con estado y evidencia; (7) compatibilidad IE11/ES5; (8) hallazgos automáticos por riesgo; (9) banco de verificación.

Lectura rápida de los estados de seguridad: `presente` = el patrón apareció completo · `débil` = apareció a medias (la nota dice qué falta) · `no encontrado` = ninguna pista. Ninguno es un veredicto.

## Si falla

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `no existe la carpeta` | Ruta mal escrita o aún no copiaste el sistema | `aula sistema` (lista) y `aula sistema <id>`; en laptop descomprime el zip del sistema |
| `config.error` en la foto / modo genérico inesperado | `js/config.js` lanza error, no define `window.SISTEMA` o tarda más de 1,5 s | Lee el mensaje en §1 de la foto; ábrelo y corrige solo si el alumno lo pide |
| Un mecanismo «presente» que no encuentras en el código | Falso positivo del patrón | Abre `archivo:línea`; si no está, corrige el estado y anótalo en DUDAS |
| La huella cambió sin que tocaras nada | Editaste algo o pegaste archivos nuevos | Compara con `sha256sum -c FOTO/hashes.txt` desde la carpeta del sistema |
| `FOTO.md` es largo | Sistema grande | Lee solo las secciones del paso 2; consulta el resto con `grep -n` sobre `FOTO.md` |
| `bun`/`node` no encontrado | Entorno sin ese motor | Aula: trae `bun` y `node`; laptop: Node ≥ 20 (`node -v`) |

## Para quien quiera ir más allá

`motor/pruebas/prueba.mjs` prueba el script contra un sistema mínimo (`node motor/pruebas/prueba.mjs`). `foto.mjs --help` lista las opciones (`--salida`, `--fecha`, `--silencio`).
