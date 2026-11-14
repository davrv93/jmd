// Taller: los 4 productos del curso dentro de una sola ventana de trabajo.
// En escritorio, navegación lateral; en el teléfono, pestañas arriba. Solo se
// construye y anima el producto que está a la vista.
import { $ } from "./comun.js";
import { compresion, lms } from "./demo.js";
import { corazon, estructura, piano } from "./tres.js";
import { tablero } from "./bi.js";

const ICONO = {
  bi: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  lab: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  "3d": '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
  aula: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 2 3 3.5 6 3.5s6-1.5 6-3.5v-5"/>',
};
const PRODUCTOS = [
  { id: "bi", n: "Tablero BI", ses: "Sesión 1 · 7 nov", t: "Notas y asistencia de un colegio", d: "Pregunta, arrastra dimensiones y toca cualquier celda.", crear: tablero, prompt: "bi.md" },
  { id: "lab", n: "Rendimiento", ses: "Sesión 2 · 14 nov", t: "La misma respuesta, 95.6 % más liviana", d: "Cambia la red y vuelve a medir.", crear: compresion, prompt: "rendimiento.md" },
  { id: "3d", n: "Visor 3D", ses: "Sesión 3 · 21 nov", t: "Modelos 3D que se arman y suenan", d: "Arrastra para girar. Toca cada parte.", crear: visor, prompt: "3d-corazon.md" },
  { id: "aula", n: "Aula virtual", ses: "Sesión 4 · 28 nov", t: "Tu propia plataforma de cursos", d: "Ciclo de Kolb, clase en vivo, recursos y notas.", crear: lms, prompt: "aula.md" },
];

// Visor 3D: tres escenas con su propio selector en la barra.
function visor(el) {
  const ESC = [
    { n: "Corazón", crear: corazon, clase: "esc-corazon", prompt: "3d-corazon.md" },
    { n: "Estructura", crear: estructura, clase: "esc-estructura", prompt: "3d-estructura.md" },
    { n: "Piano", crear: piano, clase: "esc-piano", prompt: "3d-piano.md" },
  ];
  el.innerHTML = `<div class="visor">
      <div class="visor-barra"><div class="seg" role="group" aria-label="Escena">${ESC.map((s, i) => `<button data-e="${i}" class="${i ? "" : "on"}">${s.n}</button>`).join("")}</div></div>
      ${ESC.map((s, i) => `<div class="escena ${s.clase}" data-v="${i}" ${i ? "hidden" : ""}></div>`).join("")}
    </div>`;
  const hechos = {};
  let actual = 0, activo = true;
  function ver(i) {
    hechos[actual]?.pausar();
    actual = i;
    el.querySelectorAll("[data-e]").forEach((b) => b.classList.toggle("on", +b.dataset.e === i));
    el.querySelectorAll(".escena").forEach((d) => { d.hidden = +d.dataset.v !== i; });
    if (!hechos[i]) hechos[i] = ESC[i].crear(el.querySelector(`.escena[data-v="${i}"]`));
    if (activo) hechos[i].reanudar();
  }
  el.addEventListener("click", (e) => { const b = e.target.closest("[data-e]"); if (b) ver(+b.dataset.e); });
  ver(0);
  return {
    pausar() { activo = false; hechos[actual]?.pausar(); },
    reanudar() { activo = true; hechos[actual]?.reanudar(); },
    promptActual() { return ESC[actual].prompt; },
  };
}

export function montar(el) {
  el.classList.add("taller");
  el.innerHTML = `<div class="taller-in">
    <nav class="taller-nav" role="tablist" aria-label="Lo que construyes">
      ${PRODUCTOS.map((p, i) => `<button role="tab" data-p="${i}" aria-selected="${!i}" class="${i ? "" : "on"}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICONO[p.id]}</svg><span><b>${p.n}</b><small>${p.ses}</small></span></button>`).join("")}
      <p class="hecho">Cada pantalla es un sistema real que construyes en el curso con Claude Code.</p>
    </nav>
    <div class="taller-vista">
      ${PRODUCTOS.map((p, i) => `<section class="producto" data-v="${i}" role="tabpanel" ${i ? "hidden" : ""}>
        <header class="prod-cab"><div><h3>${p.t}</h3><p>${p.d}</p></div>
          <div class="prod-acciones"><a class="descargar" data-d="${i}" href="static/prompts/${p.prompt}" download>Descargar prompt</a><span class="sello">Construido con Claude Code</span></div></header>
        <div class="prod-cuerpo"></div></section>`).join("")}
    </div></div>`;
  const hechos = {};
  let actual = -1, enPantalla = true;
  function ver(i) {
    if (i === actual) return;
    hechos[actual]?.pausar();
    actual = i;
    el.querySelectorAll(".taller-nav button").forEach((b) => { const on = +b.dataset.p === i; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    el.querySelectorAll(".producto").forEach((s) => { s.hidden = +s.dataset.v !== i; });
    if (!hechos[i]) hechos[i] = PRODUCTOS[i].crear($(`.producto[data-v="${i}"] .prod-cuerpo`, el));
    if (enPantalla) hechos[i].reanudar();
  }
  // El prompt que se descarga es el del producto; en el visor 3D, el de la escena a la vista.
  el.addEventListener("click", (e) => {
    const a = e.target.closest("a.descargar");
    if (a) {
      const p = PRODUCTOS[+a.dataset.d], archivo = hechos[+a.dataset.d]?.promptActual?.() || p.prompt;
      a.href = "static/prompts/" + archivo;
      return;
    }
    const b = e.target.closest(".taller-nav button");
    if (!b) return;
    ver(+b.dataset.p);
    b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  });
  // Flechas del teclado entre productos.
  el.querySelector(".taller-nav").addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1, n = (actual + d + PRODUCTOS.length) % PRODUCTOS.length;
    ver(n); el.querySelector(`.taller-nav [data-p="${n}"]`).focus();
  });
  const sincronizar = () => { if (hechos[actual]) enPantalla && !document.hidden ? hechos[actual].reanudar() : hechos[actual].pausar(); };
  new IntersectionObserver(([x]) => { enPantalla = x.isIntersecting; sincronizar(); }).observe(el);
  document.addEventListener("visibilitychange", sincronizar);
  ver(0);
}
