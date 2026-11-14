// Ranking en pantalla grande: top 15 con iniciales, se refresca cada 5 s.
import { api, $, esc, BASE } from "./comun.js";

$("#url").textContent = (location.host + BASE).replace(/\/$/, "");
let antes = new Map();

async function cargar() {
  try {
    const e = await api("api/estado?pantalla=1");
    const rk = e.ranking || [];
    $("#cJug").textContent = e.jugaron ?? 0;
    $("#cPar").textContent = e.partidas ?? 0;
    $("#cAhora").textContent = e.jugando ?? 0;
    $("#cTop").textContent = rk.length ? rk[0].puntos.toLocaleString("es-PE") : "–";
    $("#vacio").hidden = rk.length > 0;
    const ahora = new Map();
    $("#tabla").innerHTML = rk.map((f) => {
      const clave = f.nombre + "|" + f.puntos;
      ahora.set(clave, f.puesto);
      const sube = antes.size && (!antes.has(clave) || antes.get(clave) > f.puesto);
      return `<li class="${sube ? "sube" : ""}"><span class="p">${f.puesto}</span><span class="n">${esc(f.nombre)}<small>${f.rondas} ${f.rondas === 1 ? "ronda" : "rondas"}</small></span>` +
        `<span class="t">${f.puntos.toLocaleString("es-PE")}</span></li>`;
    }).join("");
    antes = ahora;
    $("#act").textContent = "Actualizado a las " + new Date().toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/Lima" });
  } catch (err) {
    $("#act").textContent = "Sin conexión, reintentando…";
  }
}
cargar();
setInterval(cargar, 5000);

// Copos lentos de fondo.
(function () {
  const cv = $("#fondo");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cx = cv.getContext("2d");
  let W, H, cs;
  const medir = () => {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    cs = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.5, v: 0.2 + Math.random() * 0.6, f: Math.random() * 6 }));
  };
  medir(); addEventListener("resize", medir);
  (function cuadro(t) {
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = "rgba(220, 240, 255, .35)";
    for (const c of cs) {
      c.y += c.v; c.x += Math.sin(t / 1600 + c.f) * 0.3;
      if (c.y > H + 4) { c.y = -4; c.x = Math.random() * W; }
      cx.beginPath(); cx.arc(c.x, c.y, c.r, 0, 6.28); cx.fill();
    }
    requestAnimationFrame(cuadro);
  })(0);
})();
