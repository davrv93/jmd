// Utilidades comunes. Todas las rutas son relativas: el sitio vive bajo
// /sperant-demo/ detrás de nginx y en / en local.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, { ...opciones, headers: { "Content-Type": "application/json", ...(opciones.headers || {}) } });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}
export const post = (ruta, cuerpo, headers) => api(ruta, { method: "POST", body: JSON.stringify(cuerpo || {}), headers });

const TZ = { timeZone: "America/Lima", hourCycle: "h23" };
export const hora = (iso) => iso ? new Date(iso).toLocaleTimeString("es-PE", { ...TZ, hour: "2-digit", minute: "2-digit" }) : "—";
export const fecha = (iso) => iso ? new Date(iso).toLocaleString("es-PE", { ...TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
export const pct = (x, d = 0) => (x == null ? "—" : (x * 100).toFixed(d) + " %");
export const usd = (x, d = 4) => "US$" + Number(x || 0).toFixed(d);
export const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const espera = (ms) => new Promise((r) => setTimeout(r, quieto() ? 0 : ms));

export const ESTADOS = { nuevo: "Nuevo", clasificando: "Clasificando", en_revision: "En revisión", asignado: "Derivado", en_proceso: "En proceso", resuelto: "Resuelto" };
export const estado = (e) => `<span class="b ${esc(e)}">${esc(ESTADOS[e] || e)}</span>`;

export const TIPOS = { clasificacion: "Clasificación", derivacion: "Derivación", revision: "A revisión", accion: "Acción", accion_rechazada: "Acción rechazada",
  revision_humana: "Revisión humana", reasignacion_manual: "Reasignación manual", evaluacion: "Evaluación", config: "Configuración", programado: "Pasada programada" };

// ---------- iconos (trazo de 1,5 px, estilo Lucide, sin CDN) ----------
const P = {
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
  chispa: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0Z"/><path d="M20 3v4M22 5h-4"/>',
  persona: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  correo: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  auditoria: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  ojo: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  play: '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z"/>',
  repetir: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  enchufe: '<path d="M12 22v-5M9 8V2M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  diana: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  bandeja: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
  escudo: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/>',
  rayo: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14Z"/>',
  lapiz: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5Z"/>',
  aviso: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  copiar: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  llave: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
  ajustes: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  flecha: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  monedas: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
};
export const ico = (n, t = 20) => `<svg class="ico" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;

const LOGO = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect width="26" height="26" rx="7" fill="#13212e"/><path d="M7.5 13h4.5l3-4.5M12 13l3 4.5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="7" cy="13" r="2.4" fill="#e2601a"/><circle cx="18.5" cy="8" r="1.9" fill="#fff"/><circle cx="18.5" cy="18" r="1.9" fill="#fff"/></svg>`;

// Armazón común. En la portada los enlaces abren el panel lateral; en las
// otras páginas llevan a la portada con el panel abierto.
export function cabecera(activa) {
  const h = document.createElement("header");
  h.className = "barra";
  const enlaces = [["./#tickets", "Tickets", "lista"], ["./#auditoria", "Auditoría", "auditoria"], ["./#evaluacion", "Precisión", "diana"], ["conectar", "Conectar", "enchufe"]];
  h.innerHTML = `<div class="barra-in">
      <a class="marca" href="./">${LOGO}<span>Mesa de ayuda <span class="marca-con">con Claude</span></span></a>
      <nav class="menu" aria-label="Secciones">${enlaces.map(([href, txt, i]) => `<a href="${href}" data-sec="${txt}" class="${txt === activa ? "activo" : ""}" title="${txt}">${ico(i, 18)}<span>${txt}</span></a>`).join("")}</nav>
    </div>`;
  document.body.prepend(h);
  const t = document.createElement("div");
  t.id = "toasts";
  t.setAttribute("aria-live", "polite");
  document.body.append(t);
}
export function marcarMenu(sec) { $$("nav.menu a").forEach((a) => a.classList.toggle("activo", a.dataset.sec === sec)); }

export function toast(msg, mal = false) {
  const el = document.createElement("div");
  el.className = "toast" + (mal ? " mal" : "");
  el.innerHTML = ico(mal ? "aviso" : "check", 18) + `<span>${esc(msg)}</span>`;
  $("#toasts").append(el);
  setTimeout(() => { el.classList.add("sale"); setTimeout(() => el.remove(), 250); }, mal ? 7000 : 4200);
}

// ---------- modal propio (foco atrapado, Escape, sin diálogos nativos) ----------
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let pilaModales = [];
export function modal({ titulo = "", html = "", clase = "", cerrable = true, alCerrar } = {}) {
  const previo = document.activeElement;
  const capa = document.createElement("div");
  capa.className = "capa";
  capa.innerHTML = `<div class="modal ${clase}" role="dialog" aria-modal="true" aria-labelledby="m-tit-${pilaModales.length}">
      <header class="modal-cab"><h2 id="m-tit-${pilaModales.length}">${esc(titulo)}</h2>
        <button class="icono-btn cerrar" type="button" aria-label="Cerrar">${ico("x", 20)}</button></header>
      <div class="modal-cuerpo">${html}</div></div>`;
  document.body.append(capa);
  document.body.classList.add("con-modal");
  const caja = $(".modal", capa);
  let abierto = true;
  const ctl = {
    el: caja, cuerpo: $(".modal-cuerpo", caja),
    titulo(t) { $(".modal-cab h2", caja).textContent = t; },
    cerrable(b) { cerrable = b; $(".cerrar", caja).hidden = !b; },
    cerrar(valor) {
      if (!abierto) return;
      abierto = false;
      pilaModales = pilaModales.filter((m) => m !== ctl);
      capa.classList.add("sale");
      setTimeout(() => capa.remove(), quieto() ? 0 : 180);
      if (!pilaModales.length) document.body.classList.remove("con-modal");
      removeEventListener("keydown", tecla, true);
      if (previo && previo.focus) previo.focus({ preventScroll: true });
      alCerrar?.(valor);
    },
    enfocar() { ($("[autofocus]", caja) || $$(ENFOCABLES, $(".modal-cuerpo", caja))[0] || $(".cerrar", caja)).focus({ preventScroll: true }); },
  };
  const tecla = (e) => {
    if (pilaModales[pilaModales.length - 1] !== ctl) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (cerrable) ctl.cerrar(); }
    if (e.key === "Tab") {
      const f = $$(ENFOCABLES, caja).filter((x) => x.offsetParent !== null);
      if (!f.length) { e.preventDefault(); return; }
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      else if (i < 0) { e.preventDefault(); f[0].focus(); }
    }
  };
  addEventListener("keydown", tecla, true);
  $(".cerrar", caja).addEventListener("click", () => cerrable && ctl.cerrar());
  capa.addEventListener("mousedown", (e) => { if (e.target === capa && cerrable) ctl.cerrar(); });
  if (!cerrable) $(".cerrar", caja).hidden = true;
  pilaModales.push(ctl);
  requestAnimationFrame(() => ctl.enfocar());
  return ctl;
}

export function confirmar({ titulo, texto, si = "Confirmar", no = "Cancelar", peligro = false }) {
  return new Promise((ok) => {
    let r = false;
    const m = modal({ titulo, clase: "angosto", alCerrar: () => ok(r),
      html: `<p class="m-texto">${esc(texto)}</p><div class="m-acc"><button class="btn sec" type="button" data-r="0">${esc(no)}</button><button class="btn ${peligro ? "peligro" : ""}" type="button" data-r="1" autofocus>${esc(si)}</button></div>` });
    $$("[data-r]", m.el).forEach((b) => b.addEventListener("click", () => { r = b.dataset.r === "1"; m.cerrar(); }));
  });
}

// Lista de pasos de un modal de carga: pendiente → en curso → hecho / falló.
export function pasos(cont, etiquetas) {
  cont.innerHTML = `<ol class="carga">${etiquetas.map((t, i) => `<li data-i="${i}" class="pend"><span class="c-ico"><i class="giro"></i>${ico("check", 16)}${ico("x", 16)}</span><span class="c-txt"><b>${esc(t)}</b><small></small></span></li>`).join("")}</ol>`;
  const li = (i) => $(`li[data-i="${i}"]`, cont);
  const poner = (i, clase, texto, det) => {
    const el = li(i);
    if (!el) return;
    el.className = clase;
    if (texto != null) $("b", el).textContent = texto;
    if (det != null) $("small", el).textContent = det;
  };
  return {
    activar: (i, texto, det) => poner(i, "vivo", texto, det),
    hecho: (i, texto, det) => poner(i, "hecho", texto, det),
    fallo: (i, texto, det) => poner(i, "fallo", texto, det),
  };
}

// Clave de admin: solo en la pestaña (sessionStorage), con try/catch.
export function claveGuardada() { try { return sessionStorage.getItem("orq-clave") || ""; } catch { return ""; } }
export function guardarClave(k) { try { k ? sessionStorage.setItem("orq-clave", k) : sessionStorage.removeItem("orq-clave"); } catch {} }

// ---------- motor: siempre el que corrió de verdad ----------
export function nombreModelo(m) {
  const base = String(m || "").split(" vía ")[0].replace(/^anthropic\//, "");
  if (!/^claude/i.test(base)) return base || "Claude";
  return base.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}
// Devuelve { txt, clase, quien } para una fila de auditoría o el motor de un ticket.
export function motorDe(motor, modelo) {
  const m = motor || "";
  if (m.startsWith("reglas (respaldo")) {
    const motivo = m.replace(/^reglas \(respaldo: /, "").replace(/\)$/, "");
    return { txt: `Clasificado por reglas (respaldo: ${motivo})`, clase: "respaldo", quien: "reglas" };
  }
  if (m === "claude (claude.ai)") return { txt: "Clasificado por Claude desde claude.ai", clase: "claude", quien: "claude" };
  if (m.startsWith("claude")) return { txt: `Clasificado por ${nombreModelo(modelo)}`, clase: "claude", quien: "claude" };
  if (m === "revisión humana") return { txt: "Decidido por una persona", clase: "persona", quien: "persona" };
  if (m === "reglas") return { txt: "Clasificado por reglas de palabras clave", clase: "reglas", quien: "reglas" };
  return { txt: m, clase: "reglas", quien: "reglas" };
}
export const chipMotor = (motor, modelo) => {
  const d = motorDe(motor, modelo);
  const i = d.quien === "claude" ? "chispa" : d.quien === "persona" ? "persona" : d.clase === "respaldo" ? "aviso" : "lista";
  return `<span class="chip-motor ${d.clase}" title="${esc(motor)}">${ico(i, 15)}<span>${esc(d.txt)}</span></span>`;
};
