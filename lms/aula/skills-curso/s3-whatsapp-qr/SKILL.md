---
name: s3-whatsapp-qr
description: Vincula el número de WhatsApp de pruebas a Evolution Go con el código QR, paso a paso, desde el aula. Explica los estados (sin sesión, conectado, caído), el cliente evo.ts (estado, QR, enviar texto con la cabecera apikey) y el panel <bot-qr> en Lit que muestra el QR y el estado en la bandeja. Palabras gatillo: QR, vincular WhatsApp, Evolution Go, dispositivos vinculados, instance/status, instance/qr, send/text, apikey, EVO_TOKEN, número desconectado, aula whatsapp.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · Conectar WhatsApp por QR (Evolution Go)

## Cuándo usar

Temprano: el QR es lo que más se traba en clase. Cada alumno tiene SU instancia en el Evolution Go de la clase (`EVO_URL`), con su clave `EVO_TOKEN` y su webhook ya apuntando a `http://<tu aula>:8766/api/webhook`. Reglas: solo el teléfono de pruebas del equipo, nunca un número personal; el bot solo responde a quien le escribe.

## Estados

| `GET /instance/status` → `data` | Significa | Qué hacer |
|---|---|---|
| `LoggedIn: true` | Vinculado y conectado | Nada. Escribe «hola» desde otro teléfono |
| `LoggedIn: false` | Sin sesión | Pedir el QR y escanearlo |
| error o sin respuesta | Evolution caído o instancia perdida | Reintentar en 5 s; si dura 1 min, `aula whatsapp` (la restaura) |

`GET /instance/qr` devuelve `{"data":{"qrcode":"data:image/png;base64,...","code":"2@..."}}` o 400 mientras se genera. El QR caduca en unos 20 s: pide otro. Pídelo SOLO sin sesión: con sesión abierta, reinicia el cliente.

## Pasos

1. Desde la terminal: `aula whatsapp`. Dice el estado y, si no hay sesión, renueva el QR en `/trabajo/qr.png` durante unos 2,5 min, hasta que vinculas. Ábrelo en el visor escribiendo `qr.png` en la barra (recarga si caducó).
2. En el teléfono de pruebas: WhatsApp › Configuración › Dispositivos vinculados › Vincular un dispositivo › escanea.
3. Comprueba con `curl` (la clave sale de la variable; no la escribas):
   ```sh
   curl -s -H "apikey: $EVO_TOKEN" "$EVO_URL/instance/status"     # "LoggedIn":true
   ```
4. Archivo `/trabajo/chatbot/evo.ts` (el backend lo usa para estado, QR y envíos):
   ```ts
   const EVO = (process.env.EVO_URL ?? "http://evogo-clase:8080").replace(/\/$/, "");
   const cabeceras = () => ({ apikey: process.env.EVO_TOKEN ?? "", "Content-Type": "application/json" });

   export async function estado() {
     const r = await fetch(`${EVO}/instance/status`, { headers: cabeceras(), signal: AbortSignal.timeout(5000) });
     if (!r.ok) throw new Error(`status ${r.status}`);
     const d = (await r.json()).data ?? {};
     return { conectado: !!d.Connected, sesion: !!d.LoggedIn, nombre: d.Name ?? "" };
   }
   export async function qr() {
     if ((await estado()).sesion) return { conectado: true, qr: null, mensaje: "Conectado" };
     const r = await fetch(`${EVO}/instance/qr`, { headers: cabeceras(), signal: AbortSignal.timeout(15000) });
     if (r.status === 400) return { conectado: false, qr: null, mensaje: "Generando el QR; reintenta en 3 segundos" };
     if (!r.ok) throw new Error(`qr ${r.status}`);
     const d = (await r.json()).data ?? {};
     return { conectado: false, qr: d.qrcode ?? null, mensaje: "Escanéalo desde WhatsApp › Dispositivos vinculados" };
   }
   // number: solo dígitos si el chat es @s.whatsapp.net; si no (@lid), el JID completo.
   export async function enviarTexto(jid: string, texto: string) {
     const number = jid.endsWith("@s.whatsapp.net") ? jid.split("@")[0] : jid;
     const r = await fetch(`${EVO}/send/text`, { method: "POST", headers: cabeceras(),
       body: JSON.stringify({ number, text: texto }), signal: AbortSignal.timeout(15000) });
     if (!r.ok) throw new Error(`send/text ${r.status}: ${(await r.text()).slice(0, 200)}`);
   }
   ```
   Prueba: `cd /trabajo/chatbot && bun -e 'import {estado} from "./evo"; console.log(await estado())'`.
5. Archivo `/trabajo/chatbot/bot-qr.js` (panel para la cabecera de la bandeja; usa `/api/whatsapp/*` de `s3-back-elysia`):
   ```js
   import { LitElement, html, css } from "https://esm.sh/lit@3";
   import { pedir } from "./api.js";
   export class BotQr extends LitElement {
     static properties = { estado: { state: true }, qr: { state: true }, texto: { state: true } };
     static styles = css`
       :host { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
       .punto { width: .7rem; height: .7rem; border-radius: 50%; background: var(--tenue); }
       .ok .punto { background: var(--exito); } .mal .punto { background: var(--peligro); }
       img { width: 220px; height: 220px; background: #fff; padding: 8px; border-radius: 8px; }
       .panel { flex-basis: 100%; display: grid; justify-items: center; gap: .5rem; padding: .75rem; color: var(--texto); background: var(--panel); border-radius: 12px; }
       button { font: inherit; padding: .35rem .8rem; border-radius: 8px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; }
       button:focus-visible { outline: 3px solid var(--aviso); outline-offset: 2px; }`;
     constructor() { super(); this.estado = "cargando"; this.qr = null; this.texto = "Consultando el número…"; }
     connectedCallback() { super.connectedCallback(); this.revisar(); this.timer = setInterval(() => this.revisar(), 5000); }
     disconnectedCallback() { clearInterval(this.timer); super.disconnectedCallback(); }
     async revisar() {
       try {
         const e = await pedir("/whatsapp/estado");
         this.estado = e.sesion ? "conectado" : "sin-sesion";
         this.texto = e.sesion ? `Conectado${e.nombre ? " · " + e.nombre : ""}` : "Número sin vincular";
         if (e.sesion) this.qr = null;
       } catch { this.estado = "caido"; this.texto = "Caído, reintentando cada 5 s"; }
     }
     async pedirQr() {
       this.texto = "Generando el QR…";
       try { const r = await pedir("/whatsapp/qr"); this.qr = r.qr; this.texto = r.mensaje; }
       catch (e) { this.texto = `No pude pedir el QR: ${e.message}`; }
     }
     render() {
       const clase = { conectado: "ok", caido: "mal" }[this.estado] ?? "";
       return html`<span class=${clase} style="display:flex;align-items:center;gap:.4rem"><span class="punto"></span><span role="status">${this.texto}</span></span>
         ${this.estado === "sin-sesion" ? html`<button @click=${this.pedirQr}>Mostrar QR</button>` : ""}
         ${this.qr && this.estado !== "conectado" ? html`<div class="panel"><img src=${this.qr} alt="Código QR para vincular WhatsApp">
           <span>WhatsApp › Dispositivos vinculados › Vincular. Caduca en unos 20 s.</span>
           <button @click=${this.pedirQr}>Pedir otro QR</button></div>` : ""}`;
     }
   }
   customElements.define("bot-qr", BotQr);
   ```

## Errores típicos

- `401` o `instance not found`: la cabecera no es `apikey: $EVO_TOKEN` o la variable está vacía (`test -n "$EVO_TOKEN" && echo definida`).
- NO llames a `POST /instance/connect` a mano: sin `webhookUrl` borra tu webhook y dejan de llegar mensajes. Si lo hiciste, o el número se desconectó, corre `aula whatsapp`: restaura la instancia con `$EVO_WEBHOOK` y te da un QR nuevo.
- El QR no se lee: brillo al máximo, pide uno nuevo (caducó) y escanea desde «Dispositivos vinculados», no con la cámara.
- «Número sin vincular» después de escanear: espera 5 s; WhatsApp tarda en sincronizar.
- El teléfono dice «no se pudo vincular»: tiene ya 4 dispositivos vinculados; desvincula uno.

## Versión corta para modelos pequeños

1. `aula whatsapp` y abre `qr.png` en el visor; escanea desde Dispositivos vinculados.
2. `curl -s -H "apikey: $EVO_TOKEN" "$EVO_URL/instance/status"` debe decir `"LoggedIn":true`.
3. `evo.ts`: `estado()`, `qr()` (solo sin sesión) y `enviarTexto(jid, texto)` a `POST /send/text {number, text}`.
4. `bot-qr.js`: muestra estado cada 5 s y el QR con «Mostrar QR».
5. Nunca llames a `/instance/connect` ni imprimas la clave. Si algo se pierde: `aula whatsapp`.
