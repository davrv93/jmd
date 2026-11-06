const $ = (id) => document.getElementById(id);
const el = (tag, texto, clase) => { const e = document.createElement(tag); if (texto != null) e.textContent = texto; if (clase) e.className = clase; return e; };
const ETIQUETA = { paso: "Pasó", bloqueado: "Frenado", costo: "Costo", normal: "Normal", ok: "Sigue bien" };

function columna(nombre, l, mal) {
  const c = el("div", null, "c" + (mal ? " mal" : ""));
  const cab = el("div", null, "fila");
  cab.append(el("h2", l.nombre || nombre), el("span", ETIQUETA[l.veredicto] ?? l.veredicto, "chip " + l.veredicto));
  if (l.status !== "") cab.append(el("span", "HTTP " + l.status, "chip"));
  c.append(cab, el("pre", l.peticion));
  if (l.respuesta) c.append(el("pre", l.respuesta));
  c.append(el("p", l.nota));
  if (l.registro) c.append(el("p", "Registro: " + l.registro, "sub"));
  return c;
}

async function correr(id, boton) {
  document.querySelectorAll("#botones button").forEach((b) => b.setAttribute("aria-pressed", "false"));
  boton.setAttribute("aria-pressed", "true");
  const r = await (await fetch("/api/escenario/" + id, { method: "POST" })).json();
  const caja = $("resultado");
  if (r.error) { caja.replaceChildren(el("p", "No se pudo correr: " + r.error)); return; }
  const par = el("div", null, "par");
  par.append(columna("Sin gateway", r.directo, true), columna("Con gateway", r.gateway, false));
  caja.replaceChildren(el("h2", r.titulo), el("p", r.pregunta, "sub"), par, el("p", r.leccion, "k"));
}

function pintar(puerta, lista) {
  const e = lista[0];
  const t = $("t-" + puerta);
  if (!e) { t.textContent = "Sin tráfico todavía"; t.className = "vacio"; $("p-" + puerta).replaceChildren(); return; }
  t.className = "";
  const cab = [e.autorizacion && "Authorization: " + e.autorizacion, e.cookie && "Cookie: " + e.cookie].filter(Boolean).join("\n");
  t.textContent = `${e.metodo} ${e.ruta}\n${cab}\n${e.cuerpoPeticion}\n\n← ${e.status}\n${e.cuerpoRespuesta}`;
  $("p-" + puerta).replaceChildren(...(e.pistas.length ? e.pistas : ["sin pistas en ruta ni campos. Sigue visible: IP, hora y tamaño"]).map((p) => el("li", p)));
}

async function refrescar() {
  try {
    const [t, r] = await Promise.all([fetch("/api/trafico").then((x) => x.json()), fetch("/api/registro").then((x) => x.json())]);
    pintar("directo", t.directo);
    pintar("gateway", t.gateway);
    const reg = $("registro");
    reg.className = r.length ? "" : "vacio";
    reg.textContent = r.length ? r.slice(0, 12).map((l) => `${l.hora.slice(11, 19)} ${l.decision} ${l.status} ${l.usuario ?? "-"} ${l.op ?? "-"} ${l.motivo ?? l.ruta_interna ?? ""} [${l.ref}]`).join("\n") : "Sin eventos";
  } catch { /* el servidor se detuvo */ }
}

(async () => {
  const lista = await (await fetch("/api/escenarios")).json();
  const grupos = new Map();
  for (const e of lista) (grupos.get(e.grupo) ?? grupos.set(e.grupo, []).get(e.grupo)).push(e);
  for (const [g, items] of grupos) {
    const f = el("div", null, "fila");
    f.append(el("span", g, "k"));
    for (const e of items) {
      const b = el("button", e.titulo, "sec");
      b.title = e.pregunta;
      b.onclick = () => correr(e.id, b);
      f.append(b);
    }
    $("botones").append(f);
  }
  const enlaces = await (await fetch("/api/enlaces")).json();
  $("ir-directo").href = enlaces.directo;
  $("ir-gateway").href = enlaces.gateway;
  $("reiniciar").onclick = async () => { await fetch("/api/reiniciar", { method: "POST" }); $("resultado").replaceChildren(); refrescar(); };
  refrescar();
  setInterval(refrescar, 1200);
})();
