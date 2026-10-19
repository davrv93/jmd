---
name: s2-robo-avatar
description: Construye la pantalla de Robo, el asistente web de la sesión 2: robot 3D que cambia de ánimo según lo que responde el chat, burbujas de conversación, color y nombre personalizados. Usa el módulo del robot que ya sirve el LMS (Three.js), sin instalar nada. Úsalo cuando haya que crear index.html y app.js de Robo. Palabras gatillo: avatar, robot 3D, pantalla de Robo, index.html, ánimo, Three.js, color del robot, visor, burbuja de chat.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: la pantalla con el robot 3D

## Cuándo usar

Cuando `/api/chat` ya responde (skill `s2-robo-chat`). El LMS sirve a cualquier alumno el módulo del robot en `/api/v1/live/pa-02/comun/` (Three.js incluido). Tú escribes la página; no copias el robot ni descargas librerías.

## Pasos

1. Crea `/trabajo/robo/index.html`. Cambia `--color` por el color del alumno:
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
       <form id="form"><input id="texto" placeholder="Escríbele a tu robot" autocomplete="off"><button>Enviar</button></form>
       <div class="barra" id="barra"></div>
     </main>
     <script type="module" src="app.js"></script>
   </body></html>
   ```
   `#barra` queda vacía: las skills de voz e imagen le añaden botones.
2. Crea `/trabajo/robo/app.js`:
   ```js
   import { montarAvatar } from "/api/v1/live/pa-02/comun/avatar.js";
   // En el visor la API pasa por el relé /vista/<alumno>/api/...; con el puerto 8766 directo, VISTA es "".
   const VISTA = (location.pathname.match(/^\/vista\/[^/]+/) || [""])[0];
   const BASE = location.origin + VISTA;
   const $ = (id) => document.getElementById(id);
   const historial = [];
   const robot = montarAvatar($("robot"), "robot");   // devuelve {soportado, setAnimo, saludar, avatar}

   async function api(ruta, cuerpo) {
     const r = await fetch(BASE + ruta, { method: cuerpo ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
     const d = await r.json().catch(() => ({}));
     if (!r.ok) throw new Error(d.error || `error ${r.status}`);
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
   api("/api/salud").then((s) => { $("nombre").textContent = s.nombre; if (!s.llm) burbuja("Aviso: el modelo de texto no responde."); })
     .catch(() => burbuja("Aviso: el servidor no responde. Arráncalo con sh robo.sh arrancar."));
   burbuja("Hola, soy tu robot. Escríbeme algo."); robot.saludar?.();
   ```
3. Ánimos válidos: `neutral feliz pensando escuchando hablando sorprendido triste dormido emocionado`. El chat devuelve seis; `escuchando` lo usa el micrófono.
4. Color del robot: el modelo es blanco y azul. Para teñirlo, en `index.html` añade `#robot { filter: hue-rotate(95deg); }`. Grados desde el azul: morado 45, rosa 95, rojo 135, naranja 165, verde 255. Para el color de la interfaz solo cambia `--color`.
5. Sin WebGL, `montarAvatar` devuelve `{soportado: false}` y `setAnimo` no hace nada: la página sigue funcionando, solo sin robot.
6. Prueba: `curl -s localhost:8766/ | grep -c 'id="robot"'` imprime `1`. Luego abre el visor en `robo`, escribe una pregunta y mira el robot: pasa a `pensando` y al responder cambia de ánimo.

## Errores típicos

- Pantalla negra sin robot: falta el `importmap` o escribiste `import ... from "three"` en otro lugar. Mira la consola del visor.
- `avatar.js` y Three.js los sirve el LMS, no el puerto 8766: la página con robot solo funciona abierta desde el visor (`/vista/<tú>/robo/`). Con `curl` al 8766 pruebas la API, no el robot.
- `404 /api/chat` en el visor: `BASE` mal calculado; no escribas rutas absolutas como `/api/chat` en `fetch`.
- Fuentes de Google o un CDN distinto: la política de seguridad del visor las bloquea.
- Cambiaste `app.js` y no ves cambios: recarga el visor con el botón de la barra.

## Versión corta para modelos pequeños

1. `index.html`: `<canvas id="robot">`, el `importmap` con `three` y `RoundedBoxGeometry` de `/api/v1/live/pa-02/comun/`, `#chat`, `#form`, `#barra`.
2. `app.js`: `import { montarAvatar } from "/api/v1/live/pa-02/comun/avatar.js"` y `montarAvatar(canvas, "robot")`.
3. `BASE = location.origin + (ruta que empieza por /vista/<alumno>)`; llama `BASE + "/api/chat"`.
4. Al responder: `robot.setAnimo(r.animo)`. Mientras espera: `robot.setAnimo("pensando")`.
5. Color: variable CSS `--color` y `filter: hue-rotate(...)` en `#robot`.
