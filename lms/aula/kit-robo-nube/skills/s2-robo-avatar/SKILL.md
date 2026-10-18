---
name: s2-robo-avatar
description: Construye la pantalla de Robo, el asistente web de la sesión 2 (kit robo-local-nube): avatar 3D (robot u osito, a elección del alumno) que cambia de ánimo según lo que responde el chat, burbujas de conversación, nombre y color personalizados desde personalidad.json. El avatar se elige y se tiñe con los parámetros de montarAvatar (modulos/avatar.js); los módulos 3D nunca se copian ni se reescriben. Úsalo cuando haya que crear index.html y app.js de Robo. Palabras gatillo: avatar, robot 3D, osito, pantalla de Robo, index.html, app.js, ánimo, Three.js, color del robot, teñir, visor, burbuja de chat.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: la pantalla con el avatar 3D

## Cuándo usar

Cuando `/api/chat` ya responde (skill `s2-robo-chat`). El aula local sirve los módulos del avatar en `/api/v1/live/pa-02/comun/` (Three.js incluido). Tú escribes la página; no copias el avatar ni descargas librerías.

## Reglas del avatar (no negociables)

- Se elige y se tiñe con parámetros: `montarAvatar(canvas, { tipo: "robot" | "osito", color: "#rrggbb" })`. En el robot el color tiñe los acentos; en el osito, el pelaje.
- `tipo` y `color` salen de `personalidad.json` (`avatar` y `color`). El color se valida con `colorValido` (exportado por `avatar.js`); si no vale, se usa `#2f6bff`.
- NUNCA copies, edites ni reescribas `avatar.js`, `robot.js`, `osito.js`, `RoundedBoxGeometry.js` ni `three.module.min.js`. Nada de `filter: hue-rotate`. Si el alumno pide otro aspecto que los parámetros no dan, anótalo en «Fuera de alcance» del plan.
- El nombre se pinta con `textContent` (nunca `innerHTML`): un nombre con `<` no rompe la página.

## Pasos

1. Crea `trabajo/robo/index.html`:
   ```html
   <!doctype html>
   <html lang="es"><head>
   <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
   <title>Mi robot</title>
   <style>
     :root { --color: #2f6bff; }
     body { margin: 0; font-family: system-ui, sans-serif; background: #0f1222; color: #eef; display: grid; grid-template-columns: 1fr 1fr; height: 100vh; }
     @media (max-width: 700px) { body { grid-template-columns: 1fr; grid-template-rows: 40vh 1fr; } }
     #robot { width: 100%; height: 100%; display: block; }
     main { display: flex; flex-direction: column; padding: 12px; min-height: 0; }
     h1 { margin: 0 0 8px; font-size: 1.2rem; color: var(--color); }
     #chat { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
     .msg { padding: 8px 12px; border-radius: 12px; max-width: 85%; background: #232846; }
     .yo { align-self: flex-end; background: var(--color); }
     .msg img { max-width: 100%; border-radius: 8px; display: block; margin-top: 6px; }
     form, .barra { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
     input { flex: 1; min-width: 0; padding: 10px; border-radius: 8px; border: 0; }
     button, select { padding: 10px 12px; border-radius: 8px; border: 0; background: var(--color); color: #fff; cursor: pointer; }
   </style>
   <script type="importmap">
   {"imports": {"three": "/api/v1/live/pa-02/comun/three.module.min.js",
                "three/addons/geometries/RoundedBoxGeometry.js": "/api/v1/live/pa-02/comun/RoundedBoxGeometry.js"}}
   </script></head>
   <body>
     <canvas id="robot"></canvas>
     <main>
       <h1 id="nombre">Robo</h1>
       <div id="chat" aria-live="polite"></div>
       <form id="form"><input id="texto" placeholder="Escríbele a tu asistente" autocomplete="off"><button>Enviar</button></form>
       <div class="barra" id="barra"></div>
     </main>
     <script type="module" src="app.js"></script>
   </body></html>
   ```
   `#barra` queda vacía: las skills de voz e imagen le añaden botones. El color y el nombre NO se escriben aquí: los pone `app.js` desde `personalidad.json`.
2. Crea `trabajo/robo/app.js`:
   ```js
   import { montarAvatar, colorValido } from "/api/v1/live/pa-02/comun/avatar.js";
   // En el visor la API pasa por el relé /vista/<alumno>/api/...; con el puerto 8788 directo, VISTA es "".
   const VISTA = (location.pathname.match(/^\/vista\/[^/]+/) || [""])[0];
   const BASE = location.origin + VISTA;
   const $ = (id) => document.getElementById(id);
   const historial = [];
   const mensajeDe = (d, estado) => (typeof d.error === "string" ? d.error : d.error?.message) || `error ${estado}`;

   // Personalización: una sola fuente, personalidad.json (relativa a esta página).
   const P = await fetch("personalidad.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
   const color = colorValido(P.color) || "#2f6bff";
   document.documentElement.style.setProperty("--color", color);
   $("nombre").textContent = P.nombre || "Robo";
   document.title = P.nombre || "Robo";
   const robot = montarAvatar($("robot"), { tipo: P.avatar === "osito" ? "osito" : "robot", color });
   window.robot = robot;   // en la consola: robot.tipo y robot.color dicen qué se montó

   async function api(ruta, cuerpo) {
     const r = await fetch(BASE + ruta, { method: cuerpo ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
     const d = await r.json().catch(() => ({}));
     if (!r.ok) throw new Error(mensajeDe(d, r.status));
     return d;
   }
   function burbuja(texto, clase = "") {
     const d = document.createElement("div");
     d.className = "msg " + clase; d.textContent = texto;
     $("chat").append(d); $("chat").scrollTop = $("chat").scrollHeight;
     return d;
   }
   async function enviar(texto) {
     burbuja(texto, "yo"); robot.setAnimo("pensando");
     try {
       const r = await api("/api/chat", { mensaje: texto, historial: historial.slice(-8) });
       historial.push({ rol: "usuario", texto }, { rol: "robot", texto: r.texto });
       burbuja(r.texto); robot.setAnimo(r.animo);
       window.alResponder?.(r.texto);          // gancho para la voz (skill s2-robo-voz)
     } catch (e) { burbuja("No pude responder: " + e.message); robot.setAnimo("triste"); }
   }
   $("form").addEventListener("submit", (e) => { e.preventDefault(); const t = $("texto").value.trim(); if (t) { $("texto").value = ""; enviar(t); } });
   api("/api/salud").then((s) => { if (!s.llm) burbuja("Aviso: el modelo de texto no responde (¿está abierta el aula local y vigente tu token?)."); })
     .catch(() => burbuja("Aviso: el servidor no responde. Arráncalo con python trabajo/robo/robo.py arrancar."));
   burbuja(`Hola, soy ${P.nombre || "tu asistente"}. Escríbeme algo.`); robot.saludar?.();
   ```
   Las skills de voz e imagen añaden su código AL FINAL de este mismo archivo (comparten `$`, `api`, `burbuja`, `robot`).
3. Ánimos válidos: `neutral feliz pensando escuchando hablando sorprendido triste dormido emocionado`. El chat devuelve seis; `escuchando` lo usa el micrófono.
4. Sin WebGL, `montarAvatar` devuelve `{soportado: false}` y `setAnimo` no hace nada: la página sigue funcionando, solo sin avatar.
5. Prueba:
   - `curl -s localhost:8788/ | grep -c 'id="robot"'` imprime `1`.
   - `python herramientas/revisar.py personalidad` y `python herramientas/revisar.py modulos` dicen `ok` e `intactos`.
   - Abre `http://127.0.0.1:8800/vista/yo/robo/`: el título es el nombre del alumno, la interfaz usa su color y el avatar es el que eligió, teñido. En la consola, `robot.tipo` y `robot.color` coinciden con `personalidad.json`. Escribe una pregunta: pasa a `pensando` y al responder cambia de ánimo.
   - Cambia `avatar` a `osito` (o el color) en `personalidad.json`, recarga: cambia sin tocar el código.

## Errores típicos

- Pantalla negra sin avatar: falta el `importmap` o escribiste `import ... from "three"` en otro lugar. Mira la consola.
- `avatar: color «...» inválido` en la consola: `personalidad.json` no tiene `#rrggbb`. Corrígelo ahí, no en el código.
- El avatar sale con el color de fábrica: el color no llegó (revisa `robot.color` en la consola) o `personalidad.json` no se sirvió (404).
- `avatar.js` y Three.js los sirve el aula local, no el puerto 8788: la página con avatar solo funciona abierta desde el visor (`/vista/yo/robo/`). Con `curl` al 8788 pruebas la API, no el avatar.
- `404 /api/chat` en el visor: `BASE` mal calculado; no escribas rutas absolutas como `/api/chat` en `fetch`.
- Fuentes de Google o un CDN: no; todo sale del aula local.

## Versión corta para modelos pequeños

1. `index.html`: `<canvas id="robot">`, el `importmap` con `three` y `RoundedBoxGeometry` de `/api/v1/live/pa-02/comun/`, `#nombre`, `#chat`, `#form`, `#barra`.
2. `app.js`: lee `personalidad.json`; `montarAvatar($("robot"), {tipo: P.avatar, color: colorValido(P.color) || "#2f6bff"})`.
3. Nombre con `textContent`; color de la interfaz con la variable CSS `--color`.
4. `BASE = location.origin + (ruta que empieza por /vista/<alumno>)`; llama `BASE + "/api/chat"`.
5. Nunca copies ni edites los módulos 3D. Comprueba con `python herramientas/revisar.py modulos`.
