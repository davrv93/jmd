---
name: s3-front-lit
description: Construye la bandeja del chatbot de WhatsApp con Lit 3 cargado desde esm.sh, sin build ni npm en el navegador. Componentes <bot-app> (dos columnas en escritorio, una en el teléfono), <bot-bandeja> (lista de conversaciones con etiqueta Bot/Persona y sin leer) y <bot-chat> (mensajes en role=log, interruptor bot/persona y caja para responder), con sondeo cada 2 a 3 s. Palabras gatillo: front, frontend, Lit, web components, bandeja, chat, interfaz, LitElement, esm.sh, sin build, 393 px, role=log, interruptor.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · Front de la bandeja en Lit (sin build)

## Cuándo usar

Con el backend arriba (`s3-back-elysia`) y `api.js` e `index.html` creados (`s3-chatbot-aula`). El panel `<bot-qr>` está en `s3-whatsapp-qr`. Colores y textos, del prototipo. Sin build: se edita y se recarga el visor.

## Pasos

1. Archivo `/trabajo/chatbot/app.js`:
   ```js
   import { LitElement, html, css } from "https://esm.sh/lit@3";
   import "./bot-bandeja.js"; import "./bot-chat.js"; import "./bot-qr.js";
   class BotApp extends LitElement {
     static properties = { actual: { state: true } };
     static styles = css`
       :host { display: grid; grid-template-rows: auto 1fr; height: 100dvh; }
       header { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; padding: .6rem 1rem; background: var(--marca); color: #fff; }
       header img { width: 32px; height: 32px; } h1 { font-size: 1.1rem; margin: 0; flex: 1; } .volver { display: none; }
       main { display: grid; grid-template-columns: minmax(240px, 340px) 1fr; min-height: 0; }
       .lado { display: flex; flex-direction: column; min-height: 0; } bot-chat { flex: 1; min-height: 0; }
       @media (max-width: 640px) {
         main { grid-template-columns: 1fr; } main.con-chat bot-bandeja, main:not(.con-chat) .lado { display: none; }
         .volver { display: block; align-self: flex-start; font: inherit; margin: .4rem; padding: .3rem .7rem; border-radius: 8px;
           border: 1px solid var(--borde); background: var(--panel); color: inherit; } }`;
     render() {
       return html`<header><img src="recursos/logo-bot.svg" alt=""><h1>Bandeja del bot</h1><bot-qr></bot-qr></header><main class=${this.actual ? "con-chat" : ""}>
           <bot-bandeja .actual=${this.actual} @abrir=${(e) => (this.actual = e.detail)}></bot-bandeja>
           <div class="lado">${this.actual ? html`<button class="volver" @click=${() => (this.actual = undefined)}>← Volver a la bandeja</button>` : ""}
             <bot-chat .conversacion=${this.actual}></bot-chat></div></main>`;
     }
   }
   customElements.define("bot-app", BotApp);
   ```
2. Archivo `/trabajo/chatbot/bot-bandeja.js`:
   ```js
   import { LitElement, html, css } from "https://esm.sh/lit@3";
   import { pedir } from "./api.js";
   class BotBandeja extends LitElement {
     static properties = { actual: { type: Number }, lista: { state: true }, error: { state: true } };
     static styles = css`
       :host { display: block; overflow-y: auto; background: var(--panel); border-right: 1px solid var(--borde); }
       h2 { font-size: 1rem; margin: 0; padding: .9rem 1rem; border-bottom: 1px solid var(--borde); } ul { list-style: none; margin: 0; padding: 0; } p { padding: 1rem; margin: 0; color: var(--tenue); }
       button { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 1fr auto; gap: .15rem .5rem; width: 100%;
         padding: .75rem 1rem; border-bottom: 1px solid var(--borde); cursor: pointer; }
       button:hover, button[aria-current="true"] { background: var(--suave); } button:focus-visible { outline: 3px solid var(--marca); outline-offset: -3px; }
       .ultimo { color: var(--tenue); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .modo { font-size: .75rem; padding: .1rem .45rem; border-radius: 999px; border: 1px solid var(--borde); }
       .modo.humano { background: var(--aviso); color: #1b1b1b; } .nuevos { font-size: .75rem; font-weight: 700; color: var(--marca); }`;
     constructor() { super(); this.lista = []; this.error = ""; }
     connectedCallback() { super.connectedCallback(); this.cargar(); this.timer = setInterval(() => this.cargar(), 3000); }
     disconnectedCallback() { clearInterval(this.timer); super.disconnectedCallback(); }
     async cargar() {
       try { this.lista = await pedir("/conversaciones"); this.error = ""; }
       catch (e) { this.error = `No pude cargar la bandeja: ${e.message}. Reintento en 3 s.`; }
     }
     render() {
       const abrir = (id) => this.dispatchEvent(new CustomEvent("abrir", { detail: id, bubbles: true, composed: true }));
       return html`<h2>Conversaciones</h2>
         ${this.error ? html`<p role="alert">${this.error}</p>` : ""}
         ${!this.error && !this.lista.length ? html`<p>Aún no hay mensajes. Escribe «hola» al número del bot desde otro teléfono.</p>` : ""}
         <ul>${this.lista.map((c) => html`<li><button aria-current=${c.id === this.actual} @click=${() => abrir(c.id)}>
           <b>${c.nombre || c.jid.split("@")[0]}</b><span class="modo ${c.modo}">${c.modo === "humano" ? "Persona" : "Bot"}</span>
           <span class="ultimo">${c.ultimo ?? ""}</span>
           ${c.no_leidos ? html`<span class="nuevos" aria-label="${c.no_leidos} sin leer">${c.no_leidos}</span>` : html`<span></span>`}
         </button></li>`)}</ul>`;
     }
   }
   customElements.define("bot-bandeja", BotBandeja);
   ```
3. Archivo `/trabajo/chatbot/bot-chat.js` (mensajes, interruptor bot/persona y caja para responder):
   ```js
   import { LitElement, html, css } from "https://esm.sh/lit@3";
   import { pedir } from "./api.js"; const AUTOR = { cliente: "Cliente", bot: "Bot", humano: "Tú" };
   class BotChat extends LitElement {
     static properties = { conversacion: { type: Number }, mensajes: { state: true }, modo: { state: true }, nombre: { state: true }, aviso: { state: true } };
     static styles = css`
       :host { display: grid; grid-template-rows: auto 1fr auto; min-height: 0; background: var(--fondo-chat); }
       header, form { display: flex; align-items: center; gap: .5rem; padding: .6rem 1rem; background: var(--panel); border-bottom: 1px solid var(--borde); }
       header strong { flex: 1; } [role="log"] { overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: .5rem; }
       .m { max-width: 80%; padding: .5rem .75rem; border-radius: 12px; background: var(--panel); align-self: flex-start; overflow-wrap: anywhere; }
       .bot, .humano { background: var(--saliente); align-self: flex-end; } .error { outline: 2px solid var(--peligro); }
       .autor { display: block; font-size: .7rem; color: var(--tenue); } .texto { white-space: pre-wrap; }
       input { flex: 1; min-width: 0; font: inherit; padding: .55rem .7rem; border: 1px solid var(--borde); border-radius: 8px; background: var(--fondo); color: inherit; }
       button { font: inherit; padding: .5rem .9rem; border-radius: 8px; border: 1px solid var(--borde); background: var(--marca); color: #fff; cursor: pointer; }
       button[role="switch"] { background: transparent; color: inherit; } button:focus-visible, input:focus-visible { outline: 3px solid var(--marca); outline-offset: 2px; }
       .vacio { padding: 2rem 1rem; text-align: center; color: var(--tenue); } .aviso { padding: .5rem 1rem; background: var(--aviso); color: #1b1b1b; }`;
     constructor() { super(); this.mensajes = []; this.modo = "bot"; this.aviso = ""; this.ultimo = 0; }
     connectedCallback() { super.connectedCallback(); this.timer = setInterval(() => this.cargar(), 2000); }
     disconnectedCallback() { clearInterval(this.timer); super.disconnectedCallback(); }
     willUpdate(c) { if (c.has("conversacion")) { this.mensajes = []; this.ultimo = 0; this.cargar(); } }
     updated() { const log = this.renderRoot.querySelector("[role=log]"); if (log) log.scrollTop = log.scrollHeight; }
     async cargar() {
       if (!this.conversacion) return;
       try {
         const nuevos = await pedir(`/mensajes?conversacion=${this.conversacion}&desde=${this.ultimo}`);
         if (nuevos.length) { this.mensajes = [...this.mensajes, ...nuevos]; this.ultimo = nuevos.at(-1).id; }
         const c = (await pedir("/conversaciones")).find((x) => x.id === this.conversacion);
         if (c) { this.modo = c.modo; this.nombre = c.nombre || c.jid.split("@")[0]; }
         this.aviso = "";
       } catch (e) { this.aviso = `Sin conexión con tu backend: ${e.message}`; }
     }
     async cambiarModo() {
       try { this.modo = (await pedir(`/conversaciones/${this.conversacion}/modo`, { modo: this.modo === "bot" ? "humano" : "bot" })).modo; }
       catch (e) { this.aviso = `No pude cambiar el modo: ${e.message}`; }
     }
     async enviar(ev) {
       ev.preventDefault();
       const caja = this.renderRoot.querySelector("input"), texto = caja.value.trim();
       if (!texto) return;
       try { await pedir("/enviar", { conversacion: this.conversacion, texto }); caja.value = ""; this.modo = "humano"; this.cargar(); }
       catch (e) { this.aviso = `No se envió: ${e.message}. Revisa el estado del número.`; }
     }
     render() {
       if (!this.conversacion) return html`<p class="vacio">Elige una conversación de la bandeja.</p>`;
       const humano = this.modo === "humano";
       return html`<header><strong>${this.nombre ?? "Conversación"}</strong>
           <button role="switch" aria-checked=${humano} @click=${this.cambiarModo}>${humano ? "Responde: persona · Devolver al bot" : "Responde: bot · Tomar conversación"}</button></header>
         <div role="log" aria-live="polite" aria-label="Mensajes">${this.aviso ? html`<div class="aviso" role="alert">${this.aviso}</div>` : ""}
           ${this.mensajes.map((m) => html`<div class="m ${m.autor} ${m.estado === "error" ? "error" : ""}">
             <span class="autor">${AUTOR[m.autor]}${m.estado === "error" ? " · no se envió" : ""}</span><span class="texto">${m.texto}</span></div>`)}</div>
         <form @submit=${this.enviar}><input aria-label="Escribe tu respuesta" maxlength="2000" placeholder=${humano ? "Escribe tu respuesta" : "Escribe para tomar la conversación"}>
           <button type="submit">Enviar</button></form>`;
     }
   }
   customElements.define("bot-chat", BotChat);
   ```
4. Recarga el visor en `chatbot`. Pulsa «Móvil»: una sola columna, «← Volver a la bandeja» al abrir un chat, sin barra horizontal. Recorre con Tab: el foco se ve.

## Ejemplo real

Con el backend vacío la bandeja dice «Aún no hay mensajes…». Tras `curl ... -d @pruebas/webhook-hola.json`, en 3 s aparece «Cliente de prueba · Bot · 1», pedido a `/vista/<tú>/api/conversaciones` con `pedir()`.

## Errores típicos

- Pantalla en blanco con `Failed to resolve module specifier "lit"` en la consola del visor: importa de `https://esm.sh/lit@3`. `Refused to connect`: llamaste a otra URL; solo `pedir("/ruta")`.
- El chat no ocupa el alto: falta `.lado { display: flex }` y `bot-chat { flex: 1; min-height: 0 }`.
- Estilos que no aplican: cada componente tiene su `static styles` (Shadow DOM); solo las variables (`--marca`) atraviesan.

## Versión corta para modelos pequeños

1. Lit desde `https://esm.sh/lit@3`; datos con `pedir()` de `api.js`. Sin build: recarga el visor.
2. `app.js` arma cabecera, `<bot-bandeja>` (pide `/conversaciones` cada 3 s, emite `abrir`) y `<bot-chat>`.
3. `<bot-chat>`: mensajes nuevos con `desde`, interruptor `role="switch"`, envío por `POST /enviar`.
4. En ≤640 px, una columna y botón «Volver».
