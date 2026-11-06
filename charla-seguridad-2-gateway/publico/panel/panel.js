const $ = (id) => document.getElementById(id);
const el = (tag, texto, clase) => { const e = document.createElement(tag); if (texto != null) e.textContent = texto; if (clase) e.className = clase; return e; };
const ETIQUETA = { paso: "Pasó", bloqueado: "Frenado", costo: "Costo", normal: "Normal", ok: "Sigue bien" };
// Cada color es un tipo de prueba. El orden es el del recorrido.
const GRUPOS = [
  { id: "Ver", color: "azul", nombre: "Mirar", resumen: "Lo que se ve en la red, con y sin gateway." },
  { id: "Atacar", color: "rojo", nombre: "Atacar", resumen: "Intentos reales contra las dos tiendas." },
  { id: "Sesión", color: "verde", nombre: "Proteger la sesión", resumen: "Cookie HttpOnly y rutas dinámicas." },
  { id: "La verdad", color: "violeta", nombre: "La verdad", resumen: "Ofuscar no reemplaza a la autorización." },
  { id: "Costos", color: "ambar", nombre: "Beneficios y costos", resumen: "Qué ganas y qué pagas con un gateway." },
];
const GANCHO = `const original = crypto.subtle.encrypt.bind(crypto.subtle);
crypto.subtle.encrypt = (alg, clave, datos) => {
  console.log("Antes de cifrar:", new TextDecoder().decode(datos));
  return original(alg, clave, datos);
};`;
const NAVEGADOR = { id: "", titulo: "Quien controla el navegador lo ve todo", grupo: "La verdad", color: "violeta", manual: true,
  pregunta: "Pega esto en la consola de la tienda con gateway y paga una factura. Verás el mensaje antes de cifrar.",
  leccion: "Cifrar protege el camino, no el navegador. Quien controla la página lee el mensaje antes del cifrado." };

let pasos = [], i = 0, nombreEtapa = "";

function lado(nombre, l) {
  const c = el("div", null, "lado");
  const cab = el("div", null, "titulo-lado");
  cab.append(el("h3", l.nombre || nombre), el("span", ETIQUETA[l.veredicto] ?? l.veredicto, "chip " + l.veredicto));
  if (l.status !== "") cab.append(el("span", "HTTP " + l.status, "chip"));
  c.append(cab, el("pre", l.peticion));
  if (l.respuesta) c.append(el("pre", l.respuesta));
  c.append(el("p", l.nota));
  if (l.registro) c.append(el("p", "Registro: " + l.registro));
  return c;
}

function mostrar() {
  const p = pasos[i];
  $("g-marco").className = "guia " + p.color;
  $("g-etapa").textContent = `${nombreEtapa} · paso ${i + 1} de ${pasos.length}`;
  $("g-avance").replaceChildren(...pasos.map((_, k) => el("i", null, k <= i ? "on" : "")));
  $("g-titulo").textContent = p.titulo;
  $("g-pregunta").textContent = p.pregunta;
  $("g-cuerpo").replaceChildren();
  if (p.manual) $("g-cuerpo").append(el("pre", GANCHO), el("p", p.leccion, "leccion"));
  $("g-probar").hidden = !!p.manual;
  $("g-probar").disabled = false;
  $("g-probar").textContent = "Probar";
  $("g-atras").disabled = i === 0;
  $("g-sig").textContent = i === pasos.length - 1 ? "Terminar" : "Siguiente";
  $("g-titulo").focus();
}

function abrir(lista, etapa) { pasos = lista; i = 0; nombreEtapa = etapa; mostrar(); $("guia").showModal(); }

$("g-probar").onclick = async () => {
  const p = pasos[i], b = $("g-probar");
  b.disabled = true;
  b.textContent = "Probando…";
  const r = await (await fetch("/api/escenario/" + p.id, { method: "POST" })).json().catch(() => ({ error: "sin respuesta" }));
  if (pasos[i] !== p) return;
  b.disabled = false;
  b.textContent = "Probar otra vez";
  if (r.error) { $("g-cuerpo").replaceChildren(el("p", "No se pudo correr: " + r.error, "leccion")); return; }
  const lados = el("div", null, "lados");
  lados.append(lado("Sin gateway", r.directo), lado("Con gateway", r.gateway));
  const caja = el("div"); caja.style.display = "grid"; caja.style.gap = "12px";
  caja.append(lados, el("p", r.leccion, "leccion"));
  $("g-cuerpo").replaceChildren(caja);
};
$("g-atras").onclick = () => { if (i > 0) { i--; mostrar(); } };
$("g-sig").onclick = () => { if (i < pasos.length - 1) { i++; mostrar(); } else $("guia").close(); };
$("g-cerrar").onclick = () => $("guia").close();

function pintar(puerta, lista) {
  const e = lista[0];
  const t = $("t-" + puerta);
  if (!e) { t.textContent = "Sin tráfico todavía"; $("p-" + puerta).replaceChildren(); return; }
  const cab = [e.autorizacion && "Authorization: " + e.autorizacion, e.cookie && "Cookie: " + e.cookie].filter(Boolean).join("\n");
  t.textContent = `${e.metodo} ${e.ruta}\n${cab}\n${e.cuerpoPeticion}\n\n← ${e.status}\n${e.cuerpoRespuesta}`;
  $("p-" + puerta).replaceChildren(...(e.pistas.length ? e.pistas : ["sin pistas en ruta ni campos. Sigue visible: IP, hora y tamaño"]).map((p) => el("li", p)));
}
async function refrescar() {
  if (!$("trafico").open) return;
  try {
    const [t, r] = await Promise.all([fetch("/api/trafico").then((x) => x.json()), fetch("/api/registro").then((x) => x.json())]);
    pintar("directo", t.directo);
    pintar("gateway", t.gateway);
    $("registro").textContent = r.length ? r.slice(0, 12).map((l) => `${l.hora.slice(11, 19)} ${l.decision} ${l.status} ${l.usuario ?? "-"} ${l.op ?? "-"} ${l.motivo ?? l.ruta_interna ?? ""} [${l.ref}]`).join("\n") : "Sin eventos";
  } catch { /* el servidor se detuvo */ }
}
function celda(r) {
  const estado = r.ok === null ? "pendiente" : r.ok ? "pasa" : "falla";
  const c = el("div", null, "res " + estado);
  c.append(el("b", { pasa: "Pasa", falla: "Falla", pendiente: "En producción" }[estado]), el("span", r.evidencia));
  return c;
}
async function auditar() {
  const lista = $("a-lista");
  $("a-repetir").disabled = true;
  $("a-antes").textContent = "…";
  $("a-despues").textContent = "…";
  lista.replaceChildren(el("p", "Auditando las dos tiendas…", "aviso-aud"));
  const r = await (await fetch("/api/auditoria", { method: "POST" })).json().catch(() => null);
  $("a-repetir").disabled = false;
  if (!r || r.error) { lista.replaceChildren(el("p", "No se pudo auditar: " + (r?.error ?? "sin respuesta"), "leccion")); return; }
  $("a-antes").textContent = `${r.puntaje.antes} de ${r.puntaje.total}`;
  $("a-despues").textContent = `${r.puntaje.despues} de ${r.puntaje.total}`;
  lista.replaceChildren(...r.controles.map((c, k) => {
    const fila = el("div", null, "control entra");
    fila.style.animationDelay = `${k * 70}ms`;
    const t = el("div", null, "ctl");
    t.append(el("small", c.owasp), document.createTextNode(c.titulo));
    fila.append(t, celda(c.antes), celda(c.despues));
    return fila;
  }));
}
$("auditar").onclick = () => { $("auditoria").showModal(); auditar(); };
$("a-repetir").onclick = auditar;
$("a-cerrar").onclick = () => $("auditoria").close();
$("ver-trafico").onclick = () => { $("trafico").showModal(); refrescar(); };
$("t-cerrar").onclick = () => $("trafico").close();

(async () => {
  const lista = await (await fetch("/api/escenarios")).json();
  const grupoDe = (e) => (["Beneficio", "Costo"].includes(e.grupo) ? "Costos" : e.grupo);
  const armados = GRUPOS.map((g) => {
    const items = lista.filter((e) => grupoDe(e) === g.id).map((e) => ({ ...e, color: g.color }));
    if (g.id === "La verdad") items.push(NAVEGADOR);
    return { ...g, items };
  }).filter((g) => g.items.length);
  for (const g of armados) {
    const b = el("button", null, "grupo " + g.color);
    b.append(el("b", g.nombre), el("span", g.resumen), el("small", `${g.items.length} ${g.items.length === 1 ? "prueba" : "pruebas"}`));
    b.onclick = () => abrir(g.items, g.nombre);
    $("grupos").append(b);
  }
  $("todo").onclick = () => abrir(armados.flatMap((g) => g.items), "Recorrido completo");
  const enlaces = await (await fetch("/api/enlaces")).json();
  $("ir-directo").href = enlaces.directo;
  $("ir-gateway").href = enlaces.gateway;
  $("reiniciar").onclick = async () => { await fetch("/api/reiniciar", { method: "POST" }); };
  setInterval(refrescar, 1200);
})();
