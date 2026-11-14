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
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
const calma = matchMedia("(prefers-reduced-motion: reduce)").matches;
let corrida = 0;

function avance(n, total, texto) {
  const pct = Math.round((n / total) * 100);
  $("a-barra").style.width = pct + "%";
  $("a-barra").classList.toggle("lista", n === total);
  $("a-progreso").setAttribute("aria-valuenow", String(pct));
  $("a-estado").textContent = texto;
}

// Los resultados llegan del servidor según terminan; se muestran uno a uno para que el público alcance a leerlos.
async function auditar() {
  const mia = ++corrida;
  const lista = $("a-lista");
  let antes = 0, despues = 0, medidos = 0;
  $("a-repetir").disabled = true;
  lista.replaceChildren();
  $("a-antes").textContent = "0";
  $("a-despues").textContent = "0";
  avance(0, 1, "Preparando la auditoría…");

  const pendientes = [];
  let fin = null, fallo = "";
  (async () => {
    try {
      const r = await fetch("/api/auditoria", { method: "POST" });
      const lector = r.body.pipeThrough(new TextDecoderStream()).getReader();
      let resto = "";
      for (;;) {
        const { value, done } = await lector.read();
        if (done) break;
        resto += value;
        const lineas = resto.split("\n");
        resto = lineas.pop();
        for (const l of lineas) {
          const m = JSON.parse(l);
          if (m.error) fallo = m.error;
          else if (m.fin) fin = m;
          else pendientes.push(m);
        }
      }
    } catch (e) { fallo = e.message; }
    if (!fin && !fallo) fallo = "sin respuesta";
  })();

  while (mia === corrida) {
    const m = pendientes.shift();
    if (!m) {
      if (fallo) { $("a-estado").textContent = "No se pudo auditar: " + fallo; break; }
      if (fin) {
        $("a-antes").textContent = `${fin.puntaje.antes} de ${fin.puntaje.total}`;
        $("a-despues").textContent = `${fin.puntaje.despues} de ${fin.puntaje.total}`;
        avance(1, 1, `Auditoría terminada: ${fin.puntaje.total} controles medidos.`);
        break;
      }
      await pausa(60);
      continue;
    }
    const c = m.control;
    if (c.antes.ok !== null) { medidos++; antes += c.antes.ok ? 1 : 0; despues += c.despues.ok ? 1 : 0; }
    $("a-antes").textContent = `${antes} de ${medidos}`;
    $("a-despues").textContent = `${despues} de ${medidos}`;
    avance(m.n, m.total, `Revisando ${m.n} de ${m.total}: ${c.titulo}`);
    const fila = el("div", null, "control entra");
    const t = el("div", null, "ctl");
    t.append(el("small", c.owasp), document.createTextNode(c.titulo));
    fila.append(t, celda(c.antes), celda(c.despues));
    lista.append(fila);
    lista.scrollTop = lista.scrollHeight;
    if (!calma) await pausa(650);
  }
  if (mia === corrida) $("a-repetir").disabled = false;
}
$("auditar").onclick = () => { $("auditoria").showModal(); auditar(); };
$("a-repetir").onclick = auditar;
$("a-cerrar").onclick = () => { corrida++; $("a-repetir").disabled = false; $("auditoria").close(); };
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
    const cabecera = el("div", null, "grupo-cabecera");
    const icono = el("span", null, "grupo-icono");
    const dibujos = ['<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4M8 11h6m-3-3v6"/>', '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>', '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>', '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM12 8v5m0 3h.01"/>', '<path d="M4 4v16h16M8 15v-4m5 4V7m5 8v-6"/>'];
    // Static decorative icons only; scenario content stays in textContent.
    icono.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + dibujos[GRUPOS.findIndex((item) => item.id === g.id)] + '</svg>';
    cabecera.append(icono, el("span", String(armados.indexOf(g) + 1).padStart(2, "0"), "grupo-numero"));
    b.append(cabecera, el("b", g.nombre), el("span", g.resumen), el("small", `${g.items.length} ${g.items.length === 1 ? "prueba" : "pruebas"}`));
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
