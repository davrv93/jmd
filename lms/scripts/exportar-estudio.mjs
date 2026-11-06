// Exporta el tablero de Backlot (OpenMontage, http://127.0.0.1:4799) como escena LIVE de solo lectura.
// Graba con un navegador lo que el tablero pide (datos e imágenes) y lo reproduce sin servidor:
// los datos van en datos.json, las imágenes como hermanas .webp y el audio y el video como materiales.
// Uso: node exportar-estudio.mjs <carpeta-escena> <carpeta-materiales> <url-materiales> <proyecto>...
import { chromium, CHROME } from "./_pw.mjs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const [escena, materiales, urlMateriales, ...proyectos] = process.argv.slice(2);
const ORIGEN = "http://127.0.0.1:4799";
const OM = path.join(os.homedir(), "Downloads", "OpenMontage");
const UI = path.join(OM, "backlot", "ui");
const ETAPAS = ["research", "proposal", "idea", "script", "scene_plan", "assets", "edit", "compose", "publish"];
const MEDIOS = /\.(mp3|wav|m4a|mp4|mov|webm)$/i;

fs.mkdirSync(escena, { recursive: true });
fs.mkdirSync(materiales, { recursive: true });
for (const f of fs.readdirSync(escena)) if (/^(i-\d+\.(webp|png)|datos\.json|tablero\.(js|css)|gsap\.js)$/.test(f)) fs.rmSync(path.join(escena, f));

const datos = {}, imagenes = {}, pedidos = new Set();
let n = 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "estudio-"));

const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("response", async (r) => {
  const u = new URL(r.url());
  if (u.origin !== ORIGEN || r.request().method() !== "GET" || u.pathname.startsWith("/ui/")) return;
  const clave = u.pathname + u.search, tipo = r.headers()["content-type"] || "";
  if (MEDIOS.test(u.pathname)) { pedidos.add(decodeURIComponent(u.pathname)); return; }
  if (r.status() !== 200) return;
  try {
    if (tipo.includes("json")) datos[clave] = await r.json();
    else if (tipo.startsWith("image/") && !imagenes[clave]) {
      const cuerpo = await r.body(), nombre = `i-${++n}`;
      if (tipo.includes("png")) { fs.writeFileSync(path.join(escena, nombre + ".png"), cuerpo); imagenes[clave] = nombre + ".png"; }
      else if (tipo.includes("webp")) { fs.writeFileSync(path.join(escena, nombre + ".webp"), cuerpo); imagenes[clave] = nombre + ".webp"; }
      else {
        const crudo = path.join(tmp, nombre);
        fs.writeFileSync(crudo, cuerpo);
        execFileSync("cwebp", ["-quiet", "-q", "72", crudo, "-o", path.join(escena, nombre + ".webp")]);
        imagenes[clave] = nombre + ".webp";
      }
    }
  } catch { /* respuesta cortada por la navegación: se vuelve a pedir en otra vista */ }
});

for (const id of proyectos) {
  for (const etapa of ["", ...ETAPAS]) {
    await p.goto(`${ORIGEN}/p/${encodeURIComponent(id)}${etapa ? `?stage=${etapa}` : ""}`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2600);
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } scrollTo(0, 0); });
    for (const texto of ["Visor y storyboard", "Contenido de etapa"]) {
      const pestana = p.getByRole("button", { name: texto }).first();
      if (await pestana.isVisible().catch(() => false)) { await pestana.click().catch(() => {}); await p.waitForTimeout(900); }
    }
    const detalles = p.getByRole("button", { name: "Detalle", exact: true });
    const cuantos = Math.min(await detalles.count(), 14);
    for (let i = 0; i < cuantos; i++) {
      await detalles.nth(i).click({ timeout: 2000 }).catch(() => {});
      await p.waitForTimeout(1100);
      await p.keyboard.press("Escape");
      await p.waitForTimeout(250);
    }
  }
  console.log("grabado", id);
}
await b.close();

// El agente no corre en la copia: se muestra su última conversación, en reposo.
for (const [k, v] of Object.entries(datos)) if (/\/agente$/.test(k) && v && typeof v === "object") Object.assign(v, { trabajando: false, actividad: null, permiso: null, saldo: null, costo: null, tokens: 0 });

// Audio y video: los que el tablero pidió y los que nombra el estado de cada proyecto.
const medios = {};
function sumar(id, rel) {
  const origen = path.join(OM, "projects", id, rel);
  if (!MEDIOS.test(rel) || !fs.existsSync(origen) || fs.statSync(origen).size > 9 * 1048576) return;
  const wav = /\.wav$/i.test(rel);
  const nombre = (id + "__" + rel.replace(/\//g, "__")).replace(/[^A-Za-z0-9._-]/g, "-").replace(/\.wav$/i, ".mp3");
  const destino = path.join(materiales, nombre);
  if (wav) execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", origen, "-b:a", "128k", destino]);
  else fs.copyFileSync(origen, destino);
  medios[`/media/${id}/${rel}`] = nombre;
}
for (const ruta of pedidos) { const m = ruta.match(/^\/media\/([^/]+)\/(.+)$/); if (m && proyectos.includes(m[1])) sumar(m[1], m[2]); }
for (const id of proyectos) {
  const texto = JSON.stringify(Object.entries(datos).filter(([k]) => k.includes(`/project/${id}/`)).map(([, v]) => v));
  for (const m of texto.matchAll(/"((?:[\w .()-]+\/)*[\w .()-]+\.(?:mp3|wav|m4a|mp4))"/g)) if (!medios[`/media/${id}/${m[1]}`]) sumar(id, m[1]);
}

datos["/api/projects"] = await (await fetch(ORIGEN + "/api/projects")).json();
const lista = datos["/api/projects"].filter((x) => proyectos.includes(x.project_id)).map((x) => ({ id: x.project_id, titulo: x.title }));
lista.sort((a, c) => proyectos.indexOf(a.id) - proyectos.indexOf(c.id));
// Las rutas del equipo donde se produjo no se publican.
fs.writeFileSync(path.join(escena, "datos.json"), JSON.stringify({ proyectos: lista, datos, imagenes, medios, urlMateriales })
  .replaceAll(OM + "/", "").replaceAll(os.homedir(), "~"));

// El código del tablero, en un solo archivo. El proyecto sale de la escena, no de la dirección.
const esbuild = createRequire(path.join(os.homedir(), "Documents/jmd/lms/web/package.json"))("esbuild");
const entrada = path.join(tmp, "entrada.js");
fs.writeFileSync(entrada, 'import "/ui/board.js";\nimport "/ui/agente-barra.js";\n');
await esbuild.build({
  entryPoints: [entrada], bundle: true, format: "iife", minify: true, outfile: path.join(escena, "tablero.js"), logLevel: "warning",
  plugins: [{ name: "ui", setup(build) {
    build.onResolve({ filter: /^\/ui\// }, (a) => ({ path: path.join(UI, a.path.slice(4).split("?")[0]) }));
    build.onLoad({ filter: /backlot\/ui\/.*\.js$/ }, (a) => ({ loader: "js",
      contents: fs.readFileSync(a.path, "utf8").replaceAll('location.pathname.split("/p/")[1]', "window.__BACKLOT_P") }));
  } }],
});
fs.writeFileSync(path.join(escena, "tablero.css"), ["board.css", "studio.css", "agente.css"].map((f) => fs.readFileSync(path.join(UI, f), "utf8")).join("\n"));
fs.copyFileSync(path.join(UI, "vendor", "gsap-3.15.1.min.js"), path.join(escena, "gsap.js"));
fs.rmSync(tmp, { recursive: true, force: true });

const peso = (d) => (fs.readdirSync(d).reduce((s, f) => s + fs.statSync(path.join(d, f)).size, 0) / 1048576).toFixed(1);
console.log(`datos ${Object.keys(datos).length} · imágenes ${n} · medios ${Object.keys(medios).length} · escena ${peso(escena)} MB · materiales ${peso(materiales)} MB`);
for (const [k, v] of Object.entries(medios)) console.log("  medio", k, "→", v);
