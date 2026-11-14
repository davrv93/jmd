// Utilidades compartidas: ruta base (el sitio vive bajo /sorteo-claude/),
// llamadas a la API, cuenta regresiva y el fondo de luz.
export const BASE = new URL(".", location.href).pathname.replace(/(matricula|admin)$/, "");

export async function api(ruta, opciones = {}) {
  const r = await fetch(BASE + ruta, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(opciones.headers || {}) },
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || "No se pudo conectar. Intenta de nuevo.");
  return datos;
}

export const $ = (s, el = document) => el.querySelector(s);
export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const soles = (n) => "S/ " + Number(n).toLocaleString("es-PE");
export const hora = (iso) => new Date(iso).toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit", timeZone: "America/Lima" });

// Desfase entre el reloj del servidor y el del teléfono, para que la cuenta
// regresiva no dependa de la hora del celular.
let desfase = 0;
export function sincronizar(ahoraServidor) {
  desfase = new Date(ahoraServidor).getTime() - Date.now();
}
export const ahora = () => Date.now() + desfase;

export function cuenta(el, objetivo) {
  const ms = Math.max(0, new Date(objetivo).getTime() - ahora());
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000);
  const p = (n) => String(n).padStart(2, "0");
  el.innerHTML = (h > 0 ? `<div><b>${p(h)}</b><span>HORAS</span></div>` : "") +
    `<div><b>${p(m)}</b><span>MIN</span></div><div><b>${p(s)}</b><span>SEG</span></div>`;
  return ms;
}

// Fondo: partículas de luz que flotan y, cada pocos segundos, se ordenan en
// una cuadrícula limpia antes de volver a soltarse. Orden que nace del caos.
export function luz() {
  const cv = document.getElementById("luz");
  if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cx = cv.getContext("2d");
  let W, H, pts = [];
  const N = 54;
  function medir() {
    W = cv.width = innerWidth * devicePixelRatio;
    H = cv.height = innerHeight * devicePixelRatio;
    const cols = 9, filas = Math.ceil(N / cols);
    pts = Array.from({ length: N }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .25, vy: -(.1 + Math.random() * .3),
      gx: W * (.12 + .76 * ((i % cols) / (cols - 1))), gy: H * (.14 + .72 * (Math.floor(i / cols) / (filas - 1))),
      r: (1.2 + Math.random() * 2.2) * devicePixelRatio, f: Math.random() * 6.28,
    }));
  }
  medir();
  addEventListener("resize", medir);
  function cuadro(t) {
    cx.clearRect(0, 0, W, H);
    const ciclo = (t / 1000) % 16;
    const orden = ciclo < 6 ? 0 : ciclo < 9 ? (ciclo - 6) / 3 : ciclo < 12 ? 1 : 1 - (ciclo - 12) / 4;
    const k = orden * orden * (3 - 2 * orden);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) p.y = H + 10;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      const x = p.x + (p.gx - p.x) * k, y = p.y + (p.gy - p.y) * k;
      const brillo = .35 + .25 * Math.sin(t / 900 + p.f) + .25 * k;
      const g = cx.createRadialGradient(x, y, 0, x, y, p.r * 5);
      g.addColorStop(0, `rgba(255, 214, 180, ${brillo})`);
      g.addColorStop(1, "rgba(255, 214, 180, 0)");
      cx.fillStyle = g;
      cx.beginPath(); cx.arc(x, y, p.r * 5, 0, 6.28); cx.fill();
      cx.fillStyle = `rgba(217, 119, 87, ${.35 + .4 * k})`;
      cx.beginPath(); cx.arc(x, y, p.r * .7, 0, 6.28); cx.fill();
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}

// Lluvia de luz para el ganador.
export function celebrar() {
  const cv = document.createElement("canvas");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9";
  document.body.append(cv);
  const cx = cv.getContext("2d");
  const W = cv.width = innerWidth * devicePixelRatio, H = cv.height = innerHeight * devicePixelRatio;
  const colores = ["#ffffff", "#f7d9c8", "#d97757", "#f2c46b"];
  const ps = Array.from({ length: 160 }, () => ({
    x: W / 2, y: H * .45, vx: (Math.random() - .5) * 18 * devicePixelRatio, vy: (-6 - Math.random() * 14) * devicePixelRatio,
    r: (2 + Math.random() * 4) * devicePixelRatio, c: colores[Math.floor(Math.random() * colores.length)],
  }));
  let n = 0;
  (function paso() {
    cx.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.vy += .35 * devicePixelRatio; p.x += p.vx; p.y += p.vy; p.vx *= .99;
      cx.globalAlpha = Math.max(0, 1 - n / 170);
      cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill();
    }
    if (++n < 170) requestAnimationFrame(paso); else cv.remove();
  })();
}
