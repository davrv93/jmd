// Navegador compartido de las aulas (JMD Learning). Un Chromium sin interfaz para toda la clase: cada sesión
// es un contexto aislado (cookies y almacenamiento propios) y el aula lo maneja por HTTP, nunca por CDP, así
// que un alumno no puede ver la sesión de otro. Lo usa el skill documenta-sistema (herramientas/navega.py web …).
//
// Solo vive en aula_net (red interna). Sale a internet por el mismo proxy que las aulas (NAV_PROXY).
// Es de solo lectura salvo permiso: aborta todo pedido de red que no sea GET/HEAD/OPTIONS, excepto durante
// la acción que llega con "escribe": true (el envío del formulario de ingreso).
//
//   GET    /salud
//   POST   /sesion                      → { id }
//   POST   /sesion/<id>/accion          { accion: ir|ver|clic|escribir|elegir|tecla|atras, … }
//   GET    /sesion/<id>/captura[?completa=1]   → image/jpeg
//   DELETE /sesion/<id>
//
// No registra valores escritos ni direcciones completas: solo la acción, el dominio y el tiempo.
import http from "node:http";
import crypto from "node:crypto";
import puppeteer from "puppeteer-core";

const PUERTO = +process.env.NAV_PUERTO || 8090;
const MAX = +process.env.NAV_MAX || 12;               // sesiones a la vez
const MAX_POR_AULA = +process.env.NAV_MAX_AULA || 3;
const OCIOSA = 10 * 60e3, VIDA = 40 * 60e3;          // un agente tarda entre turno y turno: 10 min sin uso
const PROXY = process.env.NAV_PROXY || "";
const CHROME = process.env.NAV_CHROME;
const T_ACCION = 20e3;

let navegador = null, arrancando = null;
const sesiones = new Map(); // id → { ctx, pagina, ip, creada, uso, escribe, bloqueadas, estado, cola }

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
const reg = (...a) => console.log(new Date().toISOString(), ...a);

// Solo http/https a dominios públicos y puertos 80/443: nada de nombres internos (sin punto), IP ni localhost.
function permitido(u) {
  try {
    const x = new URL(u);
    if (["data:", "blob:", "about:"].includes(x.protocol)) return true;
    if (x.protocol !== "http:" && x.protocol !== "https:") return false;
    const h = x.hostname.toLowerCase();
    if (!h.includes(".") || /^[0-9.]+$/.test(h) || h.includes(":") || /(^|\.)(localhost|local|internal|lan|home|corp|test|invalid)$/.test(h)) return false;
    if (x.port && x.port !== "80" && x.port !== "443") return false;
    return true;
  } catch { return false; }
}

async function chrome() {
  if (navegador && navegador.connected) return navegador;
  if (!arrancando) {
    arrancando = puppeteer.launch({
      executablePath: CHROME, headless: "shell",
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--disable-extensions", "--mute-audio",
        "--disable-background-networking", "--disable-sync", "--disable-features=Translate,MediaRouter", "--lang=es-PE",
        ...(PROXY ? ["--proxy-server=" + PROXY, "--proxy-bypass-list=<-loopback>"] : [])],
    }).then((b) => { navegador = b; arrancando = null; b.on("disconnected", () => { navegador = null; sesiones.clear(); reg("chromium se cerró: se limpian las sesiones"); }); reg("chromium listo"); return b; })
      .catch((e) => { arrancando = null; throw e; });
  }
  return arrancando;
}

async function cerrar(id, motivo) {
  const s = sesiones.get(id);
  if (!s) return;
  sesiones.delete(id);
  try { await s.ctx.close(); } catch {}
  reg("sesión cerrada", id.slice(0, 6), motivo, "quedan", sesiones.size);
}
setInterval(() => {
  const ahora = Date.now();
  for (const [id, s] of sesiones) if (ahora - s.uso > OCIOSA || ahora - s.creada > VIDA) cerrar(id, ahora - s.creada > VIDA ? "tope de vida" : "sin uso");
}, 15e3).unref();

async function nuevaSesion(ip) {
  if (sesiones.size >= MAX) return { status: 429, error: "El navegador compartido está lleno (" + MAX + " sesiones). Espera un minuto o usa el modo texto." };
  if ([...sesiones.values()].filter((s) => s.ip === ip).length >= MAX_POR_AULA) return { status: 429, error: "Tu aula ya tiene " + MAX_POR_AULA + " sesiones abiertas. Cierra una (web cerrar) y vuelve a intentar." };
  const b = await chrome();
  const ctx = await b.createBrowserContext();
  const pagina = await ctx.newPage();
  const id = crypto.randomBytes(16).toString("hex");
  const s = { ctx, pagina, ip, creada: Date.now(), uso: Date.now(), escribe: false, bloqueadas: [], estado: null, cola: Promise.resolve() };
  await pagina.setViewport({ width: 1280, height: 800 });
  pagina.setDefaultTimeout(T_ACCION);
  await pagina.setRequestInterception(true);
  pagina.on("request", (r) => {
    const u = r.url(), m = r.method();
    if (!permitido(u)) { if (r.isNavigationRequest()) s.bloqueadas.push("destino no permitido"); return r.abort("blockedbyclient").catch(() => {}); }
    if (!["GET", "HEAD", "OPTIONS"].includes(m) && !s.escribe) {
      let ruta = ""; try { ruta = new URL(u).pathname; } catch {}
      if (s.bloqueadas.length < 20) s.bloqueadas.push(m + " " + ruta.slice(0, 80));
      return r.abort("blockedbyclient").catch(() => {});
    }
    r.continue().catch(() => {});
  });
  pagina.on("response", (r) => { try { if (r.request().isNavigationRequest() && r.frame() === pagina.mainFrame()) s.estado = r.status(); } catch {} });
  pagina.on("dialog", (d) => d.dismiss().catch(() => {}));
  pagina.on("popup", (p) => { if (p) p.close().catch(() => {}); });
  sesiones.set(id, s);
  reg("sesión nueva", id.slice(0, 6), "de", ip, "total", sesiones.size);
  return { status: 200, id };
}

// Resume la página en texto y numera lo que se puede tocar (data-doc-n). Corre dentro de la página.
function resumirEnPagina() {
  const visible = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 1 && r.height > 1 && c.visibility !== "hidden" && c.display !== "none" && c.opacity !== "0"; };
  const limpio = (t, n) => String(t || "").replace(/\s+/g, " ").trim().slice(0, n || 70);
  document.querySelectorAll("[data-doc-n]").forEach((e) => e.removeAttribute("data-doc-n"));
  const etiqueta = (e) => {
    if (e.id) { const l = document.querySelector('label[for="' + CSS.escape(e.id) + '"]'); if (l) return limpio(l.innerText); }
    const p = e.closest("label"); if (p) return limpio(p.innerText);
    return limpio(e.getAttribute("aria-label") || e.placeholder || e.name || e.id || e.title || "");
  };
  const L = [], vistos = new Set();
  let n = 0;
  for (const e of document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], summary, [onclick]')) {
    if (n >= 70 || vistos.has(e) || !visible(e) || e.disabled) continue;
    vistos.add(e);
    const tag = e.tagName.toLowerCase(), tipo = (e.getAttribute("type") || "").toLowerCase();
    if (tag === "input" && tipo === "hidden") continue;
    let linea;
    if (tag === "a") { const t = limpio(e.innerText || e.getAttribute("aria-label") || e.title); if (!t) continue; let h = e.getAttribute("href") || ""; try { const u = new URL(h, location.href); h = u.origin === location.origin ? u.pathname + u.search : u.href; } catch {} linea = "enlace «" + t + "» → " + h.slice(0, 90); }
    else if (tag === "select") linea = "lista «" + etiqueta(e) + "» (opciones: " + [...e.options].slice(0, 10).map((o) => limpio(o.text, 30)).join(", ") + (e.options.length > 10 ? ", …" : "") + ")";
    else if (tag === "textarea") linea = "campo «" + etiqueta(e) + "» (texto largo)";
    else if (tag === "input" && ["submit", "button", "reset", "image"].includes(tipo)) linea = "botón «" + limpio(e.value || e.getAttribute("aria-label") || tipo) + "»";
    else if (tag === "input" && ["checkbox", "radio"].includes(tipo)) linea = (tipo === "checkbox" ? "casilla" : "opción") + " «" + etiqueta(e) + "»" + (e.checked ? " (marcada)" : "");
    else if (tag === "input") linea = "campo «" + etiqueta(e) + "» (" + (tipo || "text") + ")" + (tipo !== "password" && e.value ? " = «" + limpio(e.value, 40) + "»" : "");
    else { const t = limpio(e.innerText || e.getAttribute("aria-label") || e.title); if (!t) continue; linea = "botón «" + t + "»"; }
    n++; e.setAttribute("data-doc-n", String(n));
    L.push("[" + n + "] " + linea);
  }
  const enc = [...document.querySelectorAll("h1, h2, h3")].filter(visible).slice(0, 8).map((h) => limpio(h.innerText, 60)).filter(Boolean);
  const tablas = [...document.querySelectorAll("table")].filter(visible).slice(0, 4).map((t) => {
    const cols = [...t.querySelectorAll("thead th, tr:first-child th")].slice(0, 10).map((c) => limpio(c.innerText, 24)).filter(Boolean);
    const filas = [...t.querySelectorAll("tbody tr")].slice(0, 3).map((f) => [...f.cells].slice(0, 10).map((c) => limpio(c.innerText, 24)).join(" | ")).filter(Boolean);
    return "columnas: " + (cols.join(", ") || "(sin encabezado)") + " · " + Math.max(0, t.querySelectorAll("tbody tr").length || t.rows.length - 1) + " filas" + (filas.length ? " · primeras: " + filas.join(" / ") : "");
  });
  const texto = limpio(document.body ? document.body.innerText : "", 1500);
  return ["URL: " + location.href.slice(0, 200), "Título: " + limpio(document.title, 100), enc.length ? "Encabezados: " + enc.join(" | ") : "",
    L.length ? "Elementos (usa su número):\n" + L.join("\n") : "Elementos: ninguno que se pueda tocar",
    tablas.length ? "Tablas: " + tablas.length + " · " + tablas.join(" || ") : "", "Texto visible: " + texto].filter(Boolean).join("\n");
}

async function quieta(p) {
  await p.waitForNetworkIdle({ idleTime: 400, timeout: 4000 }).catch(() => {});
}
async function elemento(p, c) {
  if (c.n !== undefined && c.n !== null && c.n !== "") {
    const h = await p.$('[data-doc-n="' + String(parseInt(c.n, 10)) + '"]');
    if (!h) throw new Error("No existe el elemento [" + c.n + "] en la página actual. Pide «ver» y usa los números nuevos.");
    return h;
  }
  const texto = String(c.texto || "").trim().toLowerCase();
  if (!texto) throw new Error("Indica el número del elemento (n) o su texto.");
  const h = await p.evaluateHandle((t) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
    const lista = [...document.querySelectorAll('button, a[href], input[type="submit"], input[type="button"], [role="button"], [role="tab"], [role="link"], label, summary')].filter(vis);
    const de = (e) => (e.innerText || e.value || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().toLowerCase();
    return lista.find((e) => de(e) === t) || lista.find((e) => de(e).includes(t)) || null;
  }, texto);
  const e = h.asElement();
  if (!e) throw new Error("No encontré nada que diga «" + c.texto + "» en la página. Pide «ver» y usa su número.");
  return e;
}
async function accion(s, c) {
  const p = s.pagina, a = String(c.accion || "");
  s.bloqueadas = [];
  s.escribe = c.escribe === true && ["clic", "tecla"].includes(a);
  try {
    if (a === "ir") {
      if (!permitido(c.url)) throw new Error("Esa dirección no se puede abrir: solo http o https a un dominio público (puertos 80 o 443).");
      s.estado = null;
      await p.goto(String(c.url), { waitUntil: "domcontentloaded", timeout: T_ACCION });
      await quieta(p);
    } else if (a === "ver") { /* solo resumir */ }
    else if (a === "clic") {
      const h = await elemento(p, c);
      await h.evaluate((e) => e.scrollIntoView({ block: "center" })).catch(() => {});
      await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 6000 }).catch(() => {}), h.click({ delay: 20 })]);
      await quieta(p);
    } else if (a === "escribir") {
      const h = await elemento(p, c);
      await h.evaluate((e) => { e.focus(); if ("value" in e) e.value = ""; });
      await h.type(String(c.valor ?? ""), { delay: 8 });
    } else if (a === "elegir") {
      const h = await elemento(p, c), v = String(c.valor ?? "");
      const ok = await h.evaluate((e, v) => {
        if (e.tagName !== "SELECT") return false;
        const o = [...e.options].find((o) => o.value === v || o.text.trim().toLowerCase() === v.trim().toLowerCase());
        if (!o) return false;
        e.value = o.value; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }, v);
      if (!ok) throw new Error("Esa lista no tiene la opción «" + v + "».");
      await quieta(p);
    } else if (a === "tecla") {
      const t = String(c.tecla || "Enter");
      if (!/^(Enter|Tab|Escape|ArrowDown|ArrowUp|ArrowLeft|ArrowRight|PageDown|PageUp|Home|End|Backspace|Space)$/.test(t)) throw new Error("Tecla no admitida: " + t);
      await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 5000 }).catch(() => {}), p.keyboard.press(t === "Space" ? " " : t)]);
      await quieta(p);
    } else if (a === "atras") { await p.goBack({ waitUntil: "domcontentloaded", timeout: T_ACCION }).catch(() => {}); await quieta(p); }
    else throw new Error("Acción desconocida: " + a + ". Usa ir, ver, clic, escribir, elegir, tecla o atras.");
    await dormir(s.escribe ? 600 : 150);
    const pagina = await p.evaluate(resumirEnPagina);
    return { ok: true, url: p.url(), titulo: await p.title(), estado: s.estado, bloqueadas: s.bloqueadas.slice(), pagina };
  } finally { s.escribe = false; }
}

function leerCuerpo(req) {
  return new Promise((ok, mal) => {
    let b = "", n = 0;
    req.on("data", (c) => { n += c.length; if (n > 64e3) { mal(new Error("pedido muy grande")); req.destroy(); } else b += c; });
    req.on("end", () => { try { ok(b ? JSON.parse(b) : {}); } catch { mal(new Error("el cuerpo no es JSON")); } });
    req.on("error", mal);
  });
}
function json(res, status, o) { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(o)); }

http.createServer(async (req, res) => {
  const ip = (req.socket.remoteAddress || "").replace(/^::ffff:/, ""), u = new URL(req.url, "http://x");
  try {
    if (req.method === "GET" && u.pathname === "/salud") return json(res, 200, { ok: true, sesiones: sesiones.size, max: MAX });
    if (req.method === "POST" && u.pathname === "/sesion") {
      await leerCuerpo(req).catch(() => ({}));
      const r = await nuevaSesion(ip);
      return r.id ? json(res, 200, { id: r.id }) : json(res, r.status, { error: r.error });
    }
    const m = u.pathname.match(/^\/sesion\/([0-9a-f]{32})(?:\/(accion|captura))?$/);
    const s = m && sesiones.get(m[1]);
    if (!m) return json(res, 404, { error: "ruta desconocida" });
    if (!s) return json(res, 404, { ok: false, error: "Esa sesión ya no existe (se cierra sola a los 10 minutos sin uso). Abre el sistema otra vez." });
    s.uso = Date.now();
    if (req.method === "DELETE" && !m[2]) { await cerrar(m[1], "a pedido"); return json(res, 200, { ok: true }); }
    if (req.method === "POST" && m[2] === "accion") {
      const c = await leerCuerpo(req), t0 = Date.now();
      // una acción a la vez por sesión, y con tope de tiempo
      const turno = s.cola.then(() => Promise.race([accion(s, c), dormir(T_ACCION + 12e3).then(() => { throw new Error("La página tardó demasiado en responder."); })]));
      s.cola = turno.catch(() => {});
      try {
        const r = await turno;
        let host = ""; try { host = new URL(r.url).hostname; } catch {}
        reg("acción", m[1].slice(0, 6), c.accion, host, Date.now() - t0 + "ms", r.bloqueadas.length ? "bloqueadas=" + r.bloqueadas.length : "");
        return json(res, 200, r);
      } catch (e) {
        reg("acción falló", m[1].slice(0, 6), c.accion, String(e.message).slice(0, 120));
        return json(res, 200, { ok: false, error: String(e.message || e).slice(0, 300), bloqueadas: s.bloqueadas.slice() });
      }
    }
    if (req.method === "GET" && m[2] === "captura") {
      const completa = u.searchParams.get("completa") === "1";
      let op = { type: "jpeg", quality: 72 };
      if (completa) {
        const alto = Math.min(5000, await s.pagina.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)));
        op = { ...op, clip: { x: 0, y: 0, width: 1280, height: Math.max(800, alto) }, captureBeyondViewport: true };
      }
      const img = await s.pagina.screenshot(op);
      res.writeHead(200, { "content-type": "image/jpeg", "cache-control": "no-store" });
      return res.end(img);
    }
    return json(res, 405, { error: "método no admitido" });
  } catch (e) {
    reg("error", req.method, u.pathname.replace(/[0-9a-f]{32}/, "…"), String(e.message || e).slice(0, 160));
    if (!res.headersSent) json(res, 500, { ok: false, error: "El navegador compartido falló. Vuelve a intentar o usa el modo texto." });
  }
}).listen(PUERTO, "0.0.0.0", () => reg("navegador compartido en :" + PUERTO, "máx", MAX, "proxy", PROXY ? "sí" : "no"));

for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, async () => { try { if (navegador) await navegador.close(); } catch {} process.exit(0); });
