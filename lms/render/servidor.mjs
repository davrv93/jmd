// Servicio render: arma el video de cada alumno con HyperFrames + p5.js (plantilla/) sin GPU.
// Una cola FIFO, un render a la vez (RENDER_PARALELO), para no quitarle CPU al LMS ni a las aulas.
//
//   POST /render            {frase1, frase2, marca, contacto, color} → 202 {id, estado, posicion}
//   GET  /render/{id}       → {id, estado: en_cola|renderizando|listo|error, posicion, segundos, error}
//   GET  /render/{id}/mp4   → el video (admite Range para que <video> pueda adelantar)
//   GET  /salud             → {ok, en_cola, renderizando}
//
// Autenticación: Authorization: Bearer RENDER_TOKEN y X-Alumno (lo pone el LMS). Cada alumno ve solo sus
// videos y tiene un tope diario (RENDER_MAX_POR_ALUMNO). Los trabajos se borran a las RENDER_VIDA_H horas.
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const PUERTO = +process.env.PORT || 8000;
const TOKEN = process.env.RENDER_TOKEN || "";
const PLANTILLA = process.env.RENDER_PLANTILLA || "/app/plantilla";
const TRABAJOS = process.env.RENDER_TRABAJOS || "/trabajos";
const MAX_POR_ALUMNO = +process.env.RENDER_MAX_POR_ALUMNO || 5;
const PARALELO = Math.max(1, +process.env.RENDER_PARALELO || 1);
const CALIDAD = process.env.RENDER_CALIDAD || "draft";
const FPS = process.env.RENDER_FPS || "24";
const WORKERS = process.env.RENDER_WORKERS || "2";
const LIMITE_S = +process.env.RENDER_LIMITE_S || 300;
const VIDA_H = +process.env.RENDER_VIDA_H || 12;
const SEG_POR_VIDEO = 40; // estimación para la espera que se muestra en la escena

const COLORES = { blanca: "#f8f8f2", rosada: "#f7b8cf", amarilla: "#ffd85c", lila: "#c9b3f2", coral: "#ff9d7a", celeste: "#a9d8f5" };
const trabajos = new Map(); // id → trabajo
const cola = [];
const usados = new Map(); // alumno → {dia, n}
let corriendo = 0;

const hoy = () => new Date().toISOString().slice(0, 10);
const limpio = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

function vista(t) {
  const posicion = t.estado === "en_cola" ? cola.indexOf(t.id) + 1 : 0;
  return {
    id: t.id, estado: t.estado, posicion,
    espera_s: t.estado === "en_cola" ? (posicion - 1 + corriendo) * SEG_POR_VIDEO + SEG_POR_VIDEO : 0,
    segundos: t.fin && t.inicio ? Math.round((t.fin - t.inicio) / 1000) : null,
    error: t.error || null,
  };
}

function responder(res, codigo, cuerpo) {
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(cuerpo));
}
const fallo = (res, codigo, error, mensaje) => responder(res, codigo, { error, mensaje });

function leerJSON(req, max = 8192) {
  return new Promise((ok, mal) => {
    let n = 0; const partes = [];
    req.on("data", (d) => { n += d.length; if (n > max) { mal(new Error("demasiado grande")); req.destroy(); } else partes.push(d); });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(partes).toString("utf8") || "{}")); } catch (e) { mal(e); } });
    req.on("error", mal);
  });
}

function procesar() {
  while (corriendo < PARALELO && cola.length) {
    const t = trabajos.get(cola.shift());
    if (t) renderizar(t);
  }
}

async function renderizar(t) {
  corriendo++;
  t.estado = "renderizando"; t.inicio = Date.now();
  const dir = path.join(TRABAJOS, t.id);
  try {
    await fsp.cp(PLANTILLA, dir, { recursive: true });
    const args = ["render", "-q", CALIDAD, "-f", FPS, "-w", WORKERS, "--no-browser-gpu", "--variables", JSON.stringify(t.variables), "-o", "salida.mp4"];
    const salida = await new Promise((ok) => {
      const p = spawn("hyperframes", args, { cwd: dir, env: { ...process.env, CI: "1", NO_COLOR: "1" } });
      let log = "";
      const guardar = (d) => { log = (log + d.toString()).slice(-4000); };
      p.stdout.on("data", guardar); p.stderr.on("data", guardar);
      const reloj = setTimeout(() => { log += "\n(límite de tiempo)"; p.kill("SIGKILL"); }, LIMITE_S * 1000);
      p.on("close", (codigo) => { clearTimeout(reloj); ok({ codigo, log }); });
    });
    if (salida.codigo === 0 && fs.existsSync(path.join(dir, "salida.mp4"))) {
      t.estado = "listo"; t.archivo = path.join(dir, "salida.mp4");
    } else {
      t.estado = "error"; t.error = "el render falló";
      console.error(`[render ${t.id}] código ${salida.codigo}\n${salida.log}`);
    }
  } catch (e) {
    t.estado = "error"; t.error = "el render falló";
    console.error(`[render ${t.id}]`, e);
  } finally {
    t.fin = Date.now(); corriendo--;
    console.log(`[render ${t.id}] ${t.estado} en ${Math.round((t.fin - t.inicio) / 1000)} s (alumno ${t.alumno})`);
    procesar();
  }
}

function enviarVideo(req, res, archivo) {
  const tam = fs.statSync(archivo).size, rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (rango) {
    const ini = rango[1] ? +rango[1] : 0, fin = rango[2] ? Math.min(+rango[2], tam - 1) : tam - 1;
    if (ini > fin || ini >= tam) { res.writeHead(416, { "Content-Range": `bytes */${tam}` }); return res.end(); }
    res.writeHead(206, { "Content-Type": "video/mp4", "Content-Length": fin - ini + 1, "Content-Range": `bytes ${ini}-${fin}/${tam}`, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" });
    return fs.createReadStream(archivo, { start: ini, end: fin }).pipe(res);
  }
  res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": tam, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" });
  fs.createReadStream(archivo).pipe(res);
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://render");
  if (req.method === "GET" && url.pathname === "/salud") return responder(res, 200, { ok: true, en_cola: cola.length, renderizando: corriendo });
  if (!TOKEN || req.headers.authorization !== `Bearer ${TOKEN}`) return fallo(res, 401, "sin_permiso", "token inválido");
  const alumno = limpio(req.headers["x-alumno"], 80);
  if (!alumno) return fallo(res, 400, "sin_alumno", "falta X-Alumno");

  if (req.method === "POST" && url.pathname === "/render") {
    let d;
    try { d = await leerJSON(req); } catch { return fallo(res, 400, "cuerpo_invalido", "no se pudo leer el pedido"); }
    const pendiente = [...trabajos.values()].find((t) => t.alumno === alumno && (t.estado === "en_cola" || t.estado === "renderizando"));
    if (pendiente) return responder(res, 202, vista(pendiente));
    const u = usados.get(alumno);
    const n = u && u.dia === hoy() ? u.n : 0;
    if (n >= MAX_POR_ALUMNO) return fallo(res, 429, "cupo_agotado", `ya hiciste ${MAX_POR_ALUMNO} videos hoy`);
    const variables = {
      frase1: limpio(d.frase1, 60) || "Sin luz, sin agua, con viento en contra…",
      frase2: limpio(d.frase2, 60) || "…cada buena decisión florece",
      marca: limpio(d.marca, 28) || "Tu negocio",
      contacto: limpio(d.contacto, 40),
      flor_color: COLORES[d.color] || COLORES.blanca,
    };
    const t = { id: crypto.randomUUID().replace(/-/g, "").slice(0, 16), alumno, estado: "en_cola", creado: Date.now(), variables };
    trabajos.set(t.id, t); cola.push(t.id); usados.set(alumno, { dia: hoy(), n: n + 1 });
    procesar();
    return responder(res, 202, vista(t));
  }

  const m = /^\/render\/([a-f0-9]{16})(\/mp4)?$/.exec(url.pathname);
  if (req.method === "GET" && m) {
    const t = trabajos.get(m[1]);
    if (!t || t.alumno !== alumno) return fallo(res, 404, "no_existe", "ese video no existe");
    if (!m[2]) return responder(res, 200, vista(t));
    if (t.estado !== "listo" || !t.archivo || !fs.existsSync(t.archivo)) return fallo(res, 409, "no_listo", "el video todavía no está listo");
    return enviarVideo(req, res, t.archivo);
  }
  fallo(res, 404, "no_existe", "ruta desconocida");
});

// Limpieza: trabajos viejos fuera del disco y de la memoria.
setInterval(async () => {
  const corte = Date.now() - VIDA_H * 3600e3;
  for (const [id, t] of trabajos) {
    if ((t.estado === "listo" || t.estado === "error") && t.fin < corte) {
      trabajos.delete(id);
      await fsp.rm(path.join(TRABAJOS, id), { recursive: true, force: true }).catch(() => {});
    }
  }
}, 15 * 60e3).unref();

await fsp.mkdir(TRABAJOS, { recursive: true });
servidor.listen(PUERTO, () => console.log(`render escuchando en :${PUERTO} · ${PARALELO} a la vez · calidad ${CALIDAD} · ${FPS} fps`));
