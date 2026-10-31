# AGENTS.md · Tu sistema de práctica

Esta carpeta es un **sistema web de práctica** (HTML/CSS/JS, abre con doble clic en `index.html`). Eres el agente del alumno: tu tarea es **documentarlo y auditarlo**, no cambiarlo. Es de demostración: no hay datos reales.

## Antes de leer código, toma la foto

```bash
aula sistema foto                                          # aula (jmd)
bun /opt/skills-curso/foto-del-sistema/motor/foto.mjs .    # aula, a mano
node skills/foto-del-sistema/motor/foto.mjs .              # laptop con DeepSeek Harness (Node 20+)
```

Deja `FOTO/FOTO.md`, `FOTO/FOTO.json` y `FOTO/hashes.txt`. **Lee `FOTO/FOTO.md` primero.** Si tu entorno no tiene «skills», lee `skills/foto-del-sistema/SKILL.md` y sigue su procedimiento.

## Reglas

1. **Foto antes que código.** Abre un archivo solo para verificar algo concreto de la foto o para ver un detalle que ella no trae.
2. **Cita siempre `archivo:línea`** de lo que observaste (ejemplo: `js/30-seguridad.js:47`).
3. **No inventes.** Rutas, funciones, permisos, cifras y comportamientos salen del código o de una prueba. Si no los verificaste, escribe **«por verificar»**.
4. **Hecho, pista, opinión.** Hecho = lo leíste en el archivo. Pista = lo dice la foto por patrón (regex). Opinión = tu recomendación. No los mezcles.
5. **No modifiques el sistema** salvo que el alumno lo pida expresamente. Tus escritos van en `docs/`; la foto va en `FOTO/`.
6. **Seguridad:** nunca imprimas, copies ni guardes la API key ni tokens (`JMD_API_KEY`, `OSITO_TOKEN`, `EVO_TOKEN`, `DATABASE_URL`). Las claves de demostración del sistema sí se muestran: son de práctica.

## Límites de contexto

- No pegues el árbol de archivos completo ni archivos enteros. Pide fragmentos: `sed -n '40,80p' js/30-seguridad.js`.
- No releas lo que la foto ya dice (entidades, roles, matriz, rutas, fórmulas, orden de carga).
- Busca con `grep -n 'patrón' js/*.js` y lee solo las líneas que citas.
- Si la conversación se alarga, resume en `docs/` lo avanzado y continúa desde ahí.

## Entregables (carpeta `docs/`)

Parte de las plantillas en `skills/foto-del-sistema/motor/plantillas/` (en el aula: `/opt/skills-curso/foto-del-sistema/motor/plantillas/`).

| Archivo | Formato |
|---|---|
| `docs/DESCRIPCION_POR_ROLES.md` | Un bloque por rol: quién es · pantallas que ve · qué puede (entidades, operaciones, reportes) · qué NO puede · evidencia `archivo:línea` |
| `docs/AUDITORIA_SEGURIDAD.md` | Tabla: mecanismo · estado (`presente`/`débil`/`no encontrado`) · evidencia · riesgo · recomendación · cómo verificarlo |
| `docs/MAPA_DEL_SISTEMA.md` | Capas y módulos · flujos principales con diagrama Mermaid · datos y almacenamiento |
| `docs/DUDAS_VERIFICABLES.md` | Tabla: afirmación dudosa · cómo comprobarla · resultado (máximo 10) |

Antes de entregar, **verifica 5 afirmaciones al azar** del «Banco de verificación» de `FOTO.md` y anótalas en `DUDAS_VERIFICABLES.md`.

## Comandos útiles

```bash
ls js/ css/                                   # archivos del sistema
grep -n 'innerHTML' js/*.js                   # dónde se arma HTML
grep -n 'localStorage\|sessionStorage' js/*.js
sed -n '40,80p' js/30-seguridad.js            # ver un tramo
sha256sum -c FOTO/hashes.txt                  # ¿cambió algo desde la foto? (macOS: shasum -a 256 -c)
node skills/foto-del-sistema/motor/foto.mjs . # volver a tomar la foto
```

Para verlo en acción: en el aula, el panel **Visor** (`/vista/<tú>/sistema/`); en la laptop, doble clic en `index.html`. Usuarios de demostración: `LEEME.txt` y la sección «Roles y usuarios» de la foto.

## Si te atascas

Di qué intentaste, qué esperabas y qué obtuviste (con el mensaje de error completo). En el aula pide ayuda al instructor; no sigas adivinando.
