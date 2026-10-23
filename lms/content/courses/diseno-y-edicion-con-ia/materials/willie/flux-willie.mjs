#!/usr/bin/env node
// flux-willie.mjs · genera la imagen base de Willie (1928) con FLUX.1 schnell en Cloudflare Workers AI.
// Uso: CF_ACCOUNT_ID=… CF_API_TOKEN=… node flux-willie.mjs [salida.png] [--prompt archivo.txt] [--n 4]
// Capa gratuita: 10 000 neuronas al día; FLUX schnell gasta unas 4,8 por imagen de 512 px con 4 pasos.
// La clave NUNCA va en el código ni en el repo: solo en variables de entorno de tu terminal.
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const salida = args.find((a) => !a.startsWith("--")) || "willie-base.png";
const opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const cuenta = process.env.CF_ACCOUNT_ID, token = process.env.CF_API_TOKEN;
if (!cuenta || !token) { console.error("Faltan CF_ACCOUNT_ID y CF_API_TOKEN en el entorno."); process.exit(1); }
const prompt = opt("prompt") ? readFileSync(opt("prompt"), "utf8").trim() : readFileSync(new URL("./PROMPT_FLUX.txt", import.meta.url), "utf8").trim();
const n = Number(opt("n", 1));
for (let i = 1; i <= n; i++) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cuenta}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, steps: 4 }),
  });
  if (!r.ok) { console.error(`Cloudflare ${r.status}: ${(await r.text()).slice(0, 300)}`); process.exit(1); }
  const ct = r.headers.get("content-type") || "";
  let png;
  if (ct.startsWith("image/")) png = Buffer.from(await r.arrayBuffer());
  else { const j = await r.json(); png = Buffer.from(j.result?.image || "", "base64"); }   // schnell devuelve JSON con base64
  const nombre = n > 1 ? salida.replace(/\.png$/, `-${i}.png`) : salida;
  writeFileSync(nombre, png);
  console.log(`Listo: ${nombre} (${(png.length / 1024).toFixed(0)} KB)`);
}
