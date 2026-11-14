// Portada: un héroe con una sola acción («Probar con un ticket») y, debajo,
// el recorrido del ticket contado como historia, paso a paso. Lo demás
// (tickets, correos, auditoría, precisión) vive en un panel lateral.
import { $, $$, esc, api, post, cabecera, marcarMenu, toast, estado, fecha, hora, pct, usd, espera, quieto, TIPOS,
  ico, modal, pasos as listaPasos, motorDe, chipMotor, nombreModelo } from "./app.js";

cabecera("");
let tax = null, cfg = null, sel = 0, turno = 0;

const nomCat = (id) => tax?.categorias.find((c) => c.id === id)?.nombre || (id === "sin_clasificar" ? "Sin clasificar" : id || "—");
const nomArea = (id) => tax?.areas.find((a) => a.id === id)?.nombre || (id === "mesa" ? "Coordinación de mesa" : id || "—");
const iniciales = (n) => String(n || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("");
const motorServidorEsClaude = () => cfg?.motor === "claude" && cfg?.claudeConfigurado;

// ---------- piezas fijas ----------
$("#probar").innerHTML = ico("play", 18) + "<span>Probar con un ticket</span>";
$("#otro").innerHTML = ico("ticket", 18) + "<span>Probar con otro</span>";
$("#repetir").innerHTML = ico("repetir", 18) + "<span>Repetir</span>";
$("#panel-cerrar").innerHTML = ico("x", 20);
const CAMINO = [["ticket", "Entra el ticket"], ["chispa", "Claude lo clasifica"], ["persona", "Lo deriva"], ["correo", "Avisa por correo"], ["auditoria", "Deja auditoría"], ["chat", "Lo consultas en tu chat"]];
$("#camino").innerHTML = CAMINO.map(([i, t], k) => `<li style="--k:${k}"><span class="c-nodo">${ico(i, 22)}</span><span class="c-txt">${t}</span></li>`).join("");
addEventListener("scroll", () => $(".barra")?.classList.toggle("con-borde", scrollY > 4), { passive: true });

function pintarMotorActivo() {
  const el = $("#motor-activo");
  if (!cfg) return;
  el.innerHTML = motorServidorEsClaude()
    ? `<span class="chip-motor claude">${ico("chispa", 15)}<span>Motor activo: ${esc(nombreModelo(cfg.modelo))}</span></span>`
    : `<span class="chip-motor reglas">${ico("lista", 15)}<span>Motor activo: reglas de palabras clave</span></span>`;
}
async function refrescarConfig() {
  try { const r = await api("api/resumen"); cfg = r.config; tax.umbral = cfg.umbral; pintarMotorActivo(); return r; } catch { return null; }
}

// ---------- 1. probar con un ticket ----------
const EJEMPLOS = [
  { asunto: "Cuota cobrada dos veces", desc: "El cronograma del depa 702 muestra la cuota 9 cobrada dos veces y el cliente pide la devolución hoy.", pista: "Claro y urgente" },
  { asunto: "La factura salió rechazada por SUNAT", desc: "La factura electrónica de la separación del depa 1104 salió rechazada con el código 2800. El cliente la necesita para su banco.", pista: "Otra área" },
  { asunto: "Ayuda, llámenme", desc: "Tengo un problema con el sistema, ¿me pueden llamar?", pista: "Ambiguo a propósito" },
];
function abrirProbar() {
  let elegido = 0;
  const m = modal({ titulo: "Elige un ticket", clase: "ancho", html: `
    <p class="m-texto">Usa un ejemplo o escribe uno como lo haría un cliente.</p>
    <div class="opciones">${EJEMPLOS.map((e, i) => `<button type="button" class="opcion" data-i="${i}" aria-pressed="${i === 0}"><span class="o-ico">${ico("ticket", 18)}</span><span class="o-txt"><b>${esc(e.asunto)}</b><small>${esc(e.pista)}</small></span></button>`).join("")}
      <button type="button" class="opcion" data-i="yo" aria-pressed="false"><span class="o-ico">${ico("lapiz", 18)}</span><span class="o-txt"><b>Escribir el mío</b><small>Asunto y descripción</small></span></button></div>
    <div class="propio" hidden>
      <label for="p-asunto">Asunto</label><input id="p-asunto" type="text" maxlength="140" placeholder="¿Qué le pasa al cliente?">
      <label for="p-desc">Descripción</label><textarea id="p-desc" maxlength="1500" placeholder="En qué proyecto, desde cuándo, qué ve el cliente."></textarea>
    </div>
    <p class="err" id="p-err"></p>
    <div class="m-acc"><button class="btn senal" type="button" id="p-enviar">${ico("play", 16)}<span>Enviar ticket</span></button></div>` });
  const opciones = $$(".opcion", m.el);
  opciones.forEach((b) => b.addEventListener("click", () => {
    elegido = b.dataset.i === "yo" ? "yo" : +b.dataset.i;
    opciones.forEach((x) => x.setAttribute("aria-pressed", x === b));
    $(".propio", m.el).hidden = elegido !== "yo";
    if (elegido === "yo") $("#p-asunto").focus();
  }));
  $("#p-enviar").addEventListener("click", () => {
    const e = elegido === "yo" ? { asunto: $("#p-asunto").value.trim(), desc: $("#p-desc").value.trim() } : EJEMPLOS[elegido];
    if (e.asunto.length < 5 || e.desc.length < 10) { $("#p-err").textContent = "Escribe un asunto (mínimo 5 caracteres) y una descripción (mínimo 10)."; return; }
    procesarConModal(m, e);
  });
}

// El mismo modal pasa a modo carga: cada paso se marca cuando de verdad ocurre.
async function procesarConModal(m, e, idExistente) {
  m.titulo("Procesando el ticket");
  m.cerrable(false);
  m.cuerpo.innerHTML = `<div class="m-ticket">${ico("ticket", 18)}<span>${esc(e.asunto)}</span></div><div id="m-pasos"></div><div class="m-acc" id="m-fin" hidden></div>`;
  const claude = motorServidorEsClaude();
  const P = listaPasos($("#m-pasos", m.el), ["Registrando el ticket", claude ? "Claude está leyendo el ticket…" : "Las reglas buscan palabras clave…", "Decidiendo a quién le toca", "Enviando los avisos", "Guardando la auditoría"]);
  let id = idExistente, r;
  const fallar = (i, err) => {
    P.fallo(i, i === 0 ? "No se pudo registrar" : "No se pudo procesar", err.message);
    m.cerrable(true);
    $("#m-fin", m.el).hidden = false;
    $("#m-fin", m.el).innerHTML = `<button class="btn sec" type="button">Cerrar</button>`;
    $("#m-fin button", m.el).addEventListener("click", () => { m.cerrar(); if (id) mostrar(id); });
    $("#m-fin button", m.el).focus();
  };
  try {
    P.activar(0);
    if (!id) { const c = await post("api/tickets", { asunto: e.asunto, descripcion: e.desc, procesar: false }); id = c.ticket; }
    await espera(450);
    P.hecho(0, `Ticket #${id} registrado`);
  } catch (err) { fallar(0, err); return; }
  try {
    P.activar(1);
    const ini = performance.now();
    r = await post(`api/tickets/${id}/procesar`);
    const falta = 1100 - (performance.now() - ini);
    if (falta > 0) await espera(falta);
    const d = motorDe(r.motor, r.modelo), c = r.clasificacion;
    const quien = d.clase === "respaldo" ? "Clasificado por reglas (respaldo)" : d.quien === "claude" ? `${nombreModelo(r.modelo)} lo clasificó` : "Clasificado por reglas";
    P.hecho(1, quien, `${nomCat(c.categoria)}, prioridad ${c.prioridad}, confianza ${pct(c.confianza)}`);
  } catch (err) { fallar(1, err); return; }
  P.activar(2); await espera(550);
  P.hecho(2, r.decision === "derivado" ? `Derivado a ${r.responsable}` : "Va a revisión humana", r.decision === "derivado" ? nomArea(r.clasificacion.area) : `Confianza bajo el umbral de ${pct(tax.umbral)}`);
  P.activar(3); await espera(500);
  P.hecho(3, r.correos === 1 ? "1 correo enviado" : `${r.correos} correos enviados`, "A la bandeja simulada; nada sale a internet");
  P.activar(4); await espera(450);
  P.hecho(4, "Auditoría guardada");
  await espera(650);
  m.cerrar();
  await mostrar(id, { animar: true, rapido: true });
}

// ---------- 2. el recorrido ----------
function construir(t, d) {
  const orden = { aviso_responsable: 0, acuse_solicitante: 1, revision_coordinacion: 2 };
  const aud = d.auditoria, corr = [...d.correos].sort((a, b) => (orden[a.plantilla] ?? 3) - (orden[b.plantilla] ?? 3));
  const clasif = aud.filter((a) => a.tipo === "clasificacion").pop();
  const deriv = aud.filter((a) => a.tipo === "derivacion").pop();
  const acciones = aud.filter((a) => a.tipo === "accion" || a.tipo === "accion_rechazada");
  const procesado = !!t.clasificadoEn, revision = t.estado === "en_revision";
  const md = motorDe(t.motor, clasif?.modelo);
  const pasos = [];

  pasos.push({ k: "ticket", i: "ticket", titulo: "Entra el ticket", carga: "Recibiendo el ticket…", html: `
    <blockquote class="cita">${esc(t.descripcion)}</blockquote>
    <p class="linea-meta">${esc(t.solicitante)}, ${esc(t.empresa)}. Proyecto ${esc(t.proyecto)}. Llegó por ${esc(t.canal)} a las ${hora(t.creadoEn)}.</p>` });

  if (!procesado) {
    pasos.push({ k: "clasificar", i: "chispa", titulo: "Falta clasificarlo", carga: "", espera: true, html: `
      <p class="suave">Este ticket todavía no pasa por el orquestador.</p>
      <button class="btn senal" type="button" id="clasificar-ya">${ico("chispa", 17)}<span>Clasificar ahora</span></button>` });
    for (const [k, i, ti] of [["derivar", "persona", "Lo deriva"], ["correo", "correo", "Avisa por correo"], ["auditoria", "auditoria", "Deja auditoría"]]) pasos.push({ k, i, titulo: ti, apagado: true, html: "" });
  } else {
    const tituloClasif = md.quien === "claude" ? (md.clase === "respaldo" ? "Se clasifica con reglas" : "Claude lo clasifica") : md.quien === "persona" ? "Una persona lo clasifica" : md.clase === "respaldo" ? "Se clasifica con reglas" : "Las reglas lo clasifican";
    const cargaClasif = md.quien === "claude" ? "Claude está leyendo el ticket…" : md.quien === "persona" ? "Aplicando la decisión…" : "Buscando palabras clave…";
    const bajo = t.confianza < tax.umbral;
    pasos.push({ k: "clasificar", i: md.quien === "claude" && md.clase !== "respaldo" ? "chispa" : md.quien === "persona" ? "persona" : "lista", titulo: tituloClasif, carga: cargaClasif, tono: md.clase === "respaldo" ? "rojo" : "", html: `
      <div class="datos3">
        <div><span>Categoría</span><b>${esc(nomCat(t.categoria))}</b></div>
        <div><span>Prioridad</span><b class="prio ${esc(t.prioridad)}">${esc(t.prioridad || "—")}</b></div>
        <div><span>Área</span><b>${esc(nomArea(t.area))}</b></div>
      </div>
      <div class="confianza ${bajo ? "bajo" : ""}">
        <div class="cf-txt"><span>Confianza</span><b>${pct(t.confianza)}</b></div>
        <div class="cf-barra"><i style="--w:${Math.round(t.confianza * 100)}%"></i><span class="cf-umbral" style="left:${tax.umbral * 100}%" title="Umbral ${pct(tax.umbral)}"></span></div>
        <p class="cf-nota">${bajo ? `Por debajo del umbral de ${pct(tax.umbral)}.` : `Supera el umbral de ${pct(tax.umbral)}.`}</p>
      </div>
      <p class="porque">${esc(t.justificacion)}</p>
      ${chipMotor(t.motor, clasif?.modelo)}` });

    if (revision) {
      pasos.push({ k: "derivar", i: "ojo", titulo: "Va a revisión humana", carga: "Decidiendo a quién le toca…", tono: "ambar", html: `
        <p>No se deriva a ciegas: la confianza no llega al umbral. <b>Valeria Ríos</b>, coordinadora de la mesa, recibe el aviso y decide.</p>
        <button class="btn sec" type="button" id="decidir">${ico("persona", 17)}<span>Decidir yo</span></button>` });
    } else {
      const p = t.responsableNombre || "—";
      const razon = deriv ? deriv.salida.replace(/^Responsable: [^—]+— /, "Es ") : "";
      pasos.push({ k: "derivar", i: "persona", titulo: `Lo deriva a ${p.split(" ")[0]}`, carga: "Buscando a quién le toca…", html: `
        <div class="persona"><span class="avatar">${esc(iniciales(p))}</span><div><b>${esc(p)}</b><span>${esc(nomArea(t.area))}</span></div></div>
        ${razon ? `<p class="porque">${esc(razon)}</p>` : ""}` });
    }

    const etiquetaCorreo = (c) => c.plantilla === "acuse_solicitante" ? "Al cliente" : c.plantilla === "revision_coordinacion" ? "A coordinación" : "Al responsable";
    pasos.push({ k: "correo", i: "correo", titulo: corr.length > 1 ? `Avisa a ${corr.length} personas` : "Avisa por correo", carga: "Redactando el aviso…", html: !corr.length ? `<p class="suave">No se envió ningún correo.</p>` : `
      ${corr.length > 1 ? `<div class="segm" role="tablist">${corr.map((c, i) => `<button type="button" role="tab" data-c="${i}" aria-selected="${i === 0}">${esc(etiquetaCorreo(c))}</button>`).join("")}</div>` : ""}
      <div class="correo" id="correo-ver">${verCorreo(corr[0])}</div>
      <p class="linea-meta">${ico("escudo", 15)}Bandeja simulada: nada sale a internet.</p>`, corr });

    const rech = acciones.filter((a) => a.tipo === "accion_rechazada");
    const tok = clasif && clasif.tokensEntrada ? (clasif.tokensEntrada + clasif.tokensSalida).toLocaleString("es-PE") : "0";
    pasos.push({ k: "auditoria", i: "auditoria", titulo: "Deja auditoría", carga: "Registrando cada paso…", html: `
      <div class="cifras">
        <div><b>${aud.length}</b><span>registros</span></div>
        <div><b>${tok}</b><span>tokens</span></div>
        <div><b>${clasif ? usd(clasif.costo, 4) : "—"}</b><span>costo</span></div>
        <div><b>${clasif ? (clasif.duracionMs >= 1000 ? (clasif.duracionMs / 1000).toFixed(1) + " s" : clasif.duracionMs + " ms") : "—"}</b><span>en clasificar</span></div>
      </div>
      <p class="linea-meta">${ico("escudo", 15)}${rech.length ? `${rech.length} acción rechazada por estar fuera de la lista blanca.` : "Solo usó acciones permitidas: asignar, comentar y enviar correo."}</p>
      <button class="enlace" type="button" id="ver-aud">Ver los ${aud.length} registros</button>` });
  }

  pasos.push({ k: "chat", i: "chat", titulo: "Tu equipo lo consulta en su chat", carga: "Preguntando al conector…", html: htmlChat(t) });
  return pasos;
}

function verCorreo(m) {
  const cuerpo = m.cuerpo.split("\n");
  const corto = cuerpo.slice(0, 7).join("\n");
  return `<div class="co-cab"><span>Para <b>${esc(m.nombre)}</b></span><span class="co-dir">${esc(m.para)}</span></div>
    <p class="co-asunto">${esc(m.asunto)}</p>
    <div class="co-cuerpo">${esc(corto)}${cuerpo.length > 7 ? `<span class="co-mas" hidden>\n${esc(cuerpo.slice(7).join("\n"))}</span>` : ""}</div>
    ${cuerpo.length > 7 ? `<button class="enlace co-leer" type="button">Leer completo</button>` : ""}`;
}
function enlazarCorreo(cont) {
  $(".co-leer", cont)?.addEventListener("click", (e) => { $(".co-mas", cont).hidden = false; e.currentTarget.remove(); });
}

function htmlChat(t) {
  return `<div class="chat-panel">
    <p class="chat-intro">Así lo ve tu equipo desde claude.ai: preguntan en su chat, Claude consulta esta mesa por un conector y responde.</p>
    <div class="ventana" aria-live="polite">
      <div class="v-cab"><span class="v-punto"></span>Claude<span class="v-con">${ico("enchufe", 14)}Mesa de ayuda</span></div>
      <div class="v-msgs" id="v-msgs"></div>
    </div>
    <div class="preguntas" id="preguntas"></div>
    <div class="chat-pie">
      <a class="btn senal" href="conectar">${ico("enchufe", 17)}<span>Conectar a mi Claude</span></a>
      <p>También puede actuar: «revisa la cola y clasifica tú los dudosos».</p>
    </div>
  </div>`;
}

let datosActuales = null;
async function mostrar(id, { animar = false, rapido = false } = {}) {
  const mio = ++turno;
  let d;
  try { d = await api("api/tickets/" + id); } catch (e) { toast(e.message, true); return; }
  if (mio !== turno) return;
  sel = id; datosActuales = d;
  if (location.hash !== "#t" + id) history.replaceState(null, "", "#t" + id);
  const t = d.ticket;
  const rec = $("#recorrido");
  rec.hidden = false;
  $("#r-meta").innerHTML = `<span>Ticket #${t.id}</span>${estado(t.estado)}`;
  $("#r-titulo").textContent = t.asunto;
  $("#r-desc").textContent = `${t.solicitante}, ${t.empresa}`;
  const pasos = construir(t, d);
  $("#pasos").innerHTML = pasos.map((p, n) => `<li class="paso ${p.apagado ? "apagado" : p.espera ? "pendiente" : animar ? "espera" : "listo"} ${p.tono || ""}" data-k="${p.k}" style="--n:${n}">
      <span class="p-nodo">${ico(p.i, 20)}</span>
      <div class="p-cont">
        <h3>${esc(p.titulo)}</h3>
        <div class="p-carga" aria-hidden="true"><span class="giro-p"></span><span>${esc(p.carga || "")}</span><i class="esq"></i><i class="esq corta"></i></div>
        <div class="p-cuerpo">${p.html}</div>
      </div></li>`).join("");
  enlazar(t, pasos);
  rec.scrollIntoView({ behavior: quieto() || !animar ? "auto" : "smooth", block: "start" });
  const lis = $$("#pasos .paso");
  const chatLi = $('#pasos .paso[data-k="chat"]');
  if (!animar || quieto()) {
    lis.forEach((li) => li.classList.replace("espera", "listo"));
    preguntar("ticket", { teclear: false });
    return;
  }
  await espera(rapido ? 250 : 500);
  for (const li of lis) {
    if (mio !== turno) return;
    if (!li.classList.contains("espera")) continue;
    li.classList.replace("espera", "activo");
    seguir(li);
    if (li === chatLi) { await preguntar("ticket", { teclear: true, li }); break; }
    await espera(li.dataset.k === "clasificar" ? (rapido ? 900 : 1300) : (rapido ? 600 : 900));
    if (mio !== turno) return;
    li.classList.replace("activo", "listo");
    await espera(rapido ? 140 : 220);
  }
}

// La «cámara» sigue al paso activo: lo deja a un cuarto de la pantalla.
function seguir(li) {
  const r = li.getBoundingClientRect();
  if (r.top > innerHeight * 0.5 || r.top < 70) scrollBy({ top: r.top - innerHeight * 0.22, behavior: quieto() ? "auto" : "smooth" });
}

function enlazar(t, pasos) {
  $("#clasificar-ya")?.addEventListener("click", () => {
    const m = modal({ titulo: "Procesando el ticket" });
    procesarConModal(m, { asunto: t.asunto, desc: t.descripcion }, t.id);
  });
  $("#decidir")?.addEventListener("click", () => decidir(t));
  $("#ver-aud")?.addEventListener("click", () => abrirPanel("auditoria", t.id));
  const pc = pasos.find((p) => p.k === "correo");
  const cv = $("#correo-ver");
  if (cv) enlazarCorreo(cv);
  $$("#pasos .segm button").forEach((b) => b.addEventListener("click", () => {
    $$("#pasos .segm button").forEach((x) => x.setAttribute("aria-selected", x === b));
    cv.innerHTML = verCorreo(pc.corr[+b.dataset.c]);
    enlazarCorreo(cv);
  }));
}

// Cola de revisión: una persona decide en un modal propio.
function decidir(t) {
  const m = modal({ titulo: `Decidir el ticket #${t.id}`, html: `
    <p class="m-texto">Elige la categoría y el área. El orquestador lo deriva a la persona con menos carga y avisa.</p>
    <label for="d-cat">Categoría</label><select id="d-cat">${tax.categorias.map((k) => `<option value="${k.id}" ${k.id === t.categoria ? "selected" : ""}>${esc(k.nombre)}</option>`).join("")}</select>
    <label for="d-area">Área</label><select id="d-area">${tax.areas.map((a) => `<option value="${a.id}" ${a.id === t.area ? "selected" : ""}>${esc(a.nombre)}</option>`).join("")}</select>
    <div class="m-acc"><button class="btn sec" type="button" id="d-no">Cancelar</button><button class="btn senal" type="button" id="d-si">Derivar</button></div>` });
  $("#d-cat").addEventListener("change", () => { const c = tax.categorias.find((k) => k.id === $("#d-cat").value); if (c) $("#d-area").value = c.area; });
  $("#d-no").addEventListener("click", () => m.cerrar());
  $("#d-si").addEventListener("click", async () => {
    const cuerpo = { categoria: $("#d-cat").value, area: $("#d-area").value, autor: "Revisor de la demo" };
    m.titulo("Derivando"); m.cerrable(false);
    m.cuerpo.innerHTML = `<div id="d-pasos"></div>`;
    const P = listaPasos($("#d-pasos"), ["Guardando tu decisión", "Buscando a quién le toca", "Enviando los avisos"]);
    P.activar(0);
    try {
      const r = await post(`api/tickets/${t.id}/derivar`, cuerpo);
      await espera(400); P.hecho(0, "Decisión guardada");
      P.activar(1); await espera(450); P.hecho(1, `Derivado a ${r.responsable}`);
      P.activar(2); await espera(400); P.hecho(2, `${r.correos} correos enviados`);
      await espera(500); m.cerrar();
      mostrar(t.id, { animar: true, rapido: true });
    } catch (e) { P.fallo(0, "No se pudo derivar", e.message); m.cerrable(true); }
  });
}

// ---------- 3. el chat de Claude ----------
const PREGUNTAS = {
  ticket: () => ({ q: `¿Qué pasó con el ticket ${sel}?`, corto: "Este ticket", h: "consultar_ticket", args: { id: sel } }),
  cola: () => ({ q: "¿Qué hay en la cola de revisión?", corto: "Cola de revisión", h: "cola_revision", args: {} }),
  facturacion: () => ({ q: "¿Qué derivaste hoy a facturación?", corto: "Derivados a facturación", h: "tickets_derivados", args: { area: "facturacion" } }),
  resumen: () => ({ q: "Dame el resumen de hoy.", corto: "Resumen de hoy", h: "resumen_hoy", args: {} }),
};
let tecleo = 0;
function extracto(h, txt) {
  let lineas = txt.split("\n");
  if (h === "consultar_ticket") {
    const i = lineas.findIndex((l) => l.startsWith("AUDITORÍA"));
    if (i > 0) lineas = lineas.slice(0, i);
    lineas = lineas.filter((l) => !l.startsWith("Descripción:"));
  }
  lineas = lineas.filter((l, i, a) => !(l === "" && a[i - 1] === ""));
  const max = 13;
  const corto = lineas.slice(0, max).join("\n").trim();
  return { corto, recortado: lineas.length > max || corto.length < txt.trim().length };
}
const resaltar = (t) => esc(t).split("\n").map((l) => /^[A-ZÁÉÍÓÚÑ]{4,}[A-ZÁÉÍÓÚÑ ()]*/.test(l) && !/^Ticket/.test(l) ? `<b>${l}</b>` : l).join("\n");

async function preguntar(clave, { teclear = true, li = null } = {}) {
  const msgs = $("#v-msgs");
  if (!msgs || !sel) return;
  const mio = ++tecleo;
  const p = PREGUNTAS[clave]();
  $("#preguntas").innerHTML = Object.entries(PREGUNTAS).map(([k, f]) => `<button type="button" data-k="${k}" aria-pressed="${k === clave}">${esc(f().corto)}</button>`).join("");
  $$("#preguntas button").forEach((b) => b.addEventListener("click", () => preguntar(b.dataset.k)));
  const args = Object.entries(p.args).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ");
  msgs.innerHTML = `<div class="m-yo">${esc(p.q)}</div>
    <div class="m-herr vivo"><span class="giro-p"></span><span>Consultando la mesa de ayuda…</span></div>
    <div class="m-claude" hidden><div class="m-txt"></div></div>`;
  const qs = new URLSearchParams({ herramienta: p.h, ...Object.fromEntries(Object.entries(p.args).map(([k, v]) => [k, String(v)])) });
  let r;
  try { r = await api("api/vista-claude?" + qs); } catch (e) { r = { texto: e.message, error: true }; }
  if (teclear && !quieto()) await espera(500);
  if (mio !== tecleo) return;
  const herr = $(".m-herr", msgs);
  herr.classList.remove("vivo");
  herr.innerHTML = `${ico("enchufe", 14)}<span>Usó <code>${esc(p.h)}(${esc(args)})</code></span>`;
  li?.classList.replace("activo", "listo");
  const caja = $(".m-claude", msgs), txt = $(".m-txt", caja);
  caja.hidden = false;
  const { corto, recortado } = extracto(p.h, r.texto);
  const fin = () => {
    txt.innerHTML = resaltar(corto);
    if (recortado) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "enlace claro"; b.textContent = "Ver la respuesta completa";
      b.addEventListener("click", () => { txt.innerHTML = resaltar(r.texto); b.remove(); });
      caja.append(b);
    }
    caja.insertAdjacentHTML("beforeend", `<p class="m-nota">Texto real del conector. En claude.ai, Claude lo lee y te lo cuenta con sus palabras.</p>`);
  };
  if (!teclear || quieto()) { fin(); return; }
  // Efecto de tipeo: ~2 s en total, por trozos, sin bloquear.
  const total = Math.min(2200, Math.max(900, corto.length * 6));
  const t0 = performance.now();
  txt.classList.add("tecleando");
  await new Promise((ok) => {
    const paso = (ahora) => {
      if (mio !== tecleo) return ok();
      const n = Math.min(corto.length, Math.round(((ahora - t0) / total) * corto.length));
      txt.textContent = corto.slice(0, n);
      if (n < corto.length) requestAnimationFrame(paso); else ok();
    };
    requestAnimationFrame(paso);
  });
  txt.classList.remove("tecleando");
  if (mio === tecleo) fin();
}

// ---------- 4. panel lateral (lo secundario) ----------
let panelTab = "tickets", filtro = "nuevo";
function abrirPanel(tab, extra) {
  panelTab = tab;
  const panel = $("#panel"), velo = $("#velo");
  if (panel.hidden) {
    panel.hidden = false; velo.hidden = false;
    document.body.classList.add("con-panel");
    requestAnimationFrame(() => { panel.classList.add("abierto"); velo.classList.add("abierto"); });
  }
  $$(".pestanas button").forEach((b) => b.setAttribute("aria-selected", b.dataset.p === tab));
  marcarMenu({ tickets: "Tickets", auditoria: "Auditoría", evaluacion: "Precisión" }[tab] || "");
  const h = "#" + tab + (extra ? "-" + extra : "");
  if (location.hash !== h) history.replaceState(null, "", h);
  $("#panel-cuerpo").innerHTML = `<div class="vacio"><span class="giro-p"></span></div>`;
  ({ tickets: verTickets, bandeja: verBandeja, auditoria: verAuditoria, evaluacion: verEvaluacion })[tab](extra);
  $(".pestanas [aria-selected=true]").focus({ preventScroll: true });
}
function cerrarPanel(volver = true) {
  const panel = $("#panel");
  if (panel.hidden) return;
  panel.classList.remove("abierto"); $("#velo").classList.remove("abierto");
  document.body.classList.remove("con-panel");
  setTimeout(() => { panel.hidden = true; $("#velo").hidden = true; }, quieto() ? 0 : 260);
  marcarMenu("");
  if (volver) history.replaceState(null, "", sel && !$("#recorrido").hidden ? "#t" + sel : location.pathname + location.search);
}
$$(".pestanas button").forEach((b) => b.addEventListener("click", () => abrirPanel(b.dataset.p)));
$("#panel-cerrar").addEventListener("click", () => cerrarPanel());
$("#velo").addEventListener("click", () => cerrarPanel());
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#panel").hidden && !document.body.classList.contains("con-modal")) cerrarPanel(); });
$("#panel").addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const f = $$('button:not([disabled]), a[href], input, select, summary, [tabindex="0"]', $("#panel")).filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});
const irA = (id) => { cerrarPanel(false); mostrar(id, { animar: true, rapido: true }); };

const FILTROS = [["nuevo", "Nuevos"], ["en_revision", "En revisión"], ["asignado", "Derivados"], ["", "Todos"]];
async function verTickets() {
  const [r, res] = await Promise.all([api("api/tickets"), refrescarConfig()]);
  if (panelTab !== "tickets") return;
  const ts = r.tickets, n = (e) => ts.filter((t) => !e || t.estado === e || (e === "asignado" && ["en_proceso", "resuelto"].includes(t.estado))).length;
  const est = res?.estados || {};
  $("#panel-cuerpo").innerHTML = `
    <div class="cifras grande">
      <div><b>${est.nuevo || 0}</b><span>nuevos</span></div>
      <div><b>${est.en_revision || 0}</b><span>en revisión</span></div>
      <div><b>${res?.derivadosHoy ?? "—"}</b><span>derivados hoy</span></div>
    </div>
    <button class="btn senal ancho" type="button" id="clasificar-pend" ${est.nuevo ? "" : "disabled"}>${ico("rayo", 17)}<span>${est.nuevo ? `Clasificar ${Math.min(10, est.nuevo)} pendientes` : "No hay pendientes"}</span></button>
    <div class="segm filtros" role="tablist">${FILTROS.map(([v, t]) => `<button type="button" role="tab" data-v="${v}" aria-selected="${v === filtro}">${t} <small>${n(v)}</small></button>`).join("")}</div>
    <input type="text" id="t-buscar" placeholder="Buscar por número, asunto o cliente" aria-label="Buscar tickets">
    <div class="lista" id="t-lista"></div>`;
  const pintar = () => {
    const q = $("#t-buscar").value.toLowerCase().trim();
    const vis = ts.filter((t) => (!filtro || t.estado === filtro || (filtro === "asignado" && ["en_proceso", "resuelto"].includes(t.estado)))
      && (!q || `${t.id} ${t.asunto} ${t.solicitante} ${t.empresa}`.toLowerCase().includes(q)));
    $("#t-lista").innerHTML = vis.map((t) => `<button type="button" class="item" data-id="${t.id}"><span class="i-id">#${t.id}</span><span class="i-asunto">${esc(t.asunto)}</span><span class="i-meta">${filtro === "nuevo" || filtro === "en_revision" ? "" : estado(t.estado)}${t.responsableNombre ? `<span>${esc(t.responsableNombre)}</span>` : ""}</span></button>`).join("") || `<p class="vacio">Nada por aquí.</p>`;
    $$("#t-lista .item").forEach((b) => b.addEventListener("click", () => irA(+b.dataset.id)));
  };
  $$(".filtros button").forEach((b) => b.addEventListener("click", () => { filtro = b.dataset.v; $$(".filtros button").forEach((x) => x.setAttribute("aria-selected", x === b)); pintar(); }));
  $("#t-buscar").addEventListener("input", pintar);
  $("#clasificar-pend").addEventListener("click", clasificarPendientes);
  pintar();
}

async function clasificarPendientes() {
  const m = modal({ titulo: "Clasificar pendientes", cerrable: false, html: `<div id="cp-pasos"></div><ol class="resultados" id="cp-res"></ol><div class="m-acc" id="cp-fin" hidden></div>` });
  const claude = motorServidorEsClaude();
  const P = listaPasos($("#cp-pasos"), ["Buscando tickets nuevos", claude ? "Claude está clasificando…" : "Las reglas están clasificando…", "Derivando y avisando"]);
  const terminar = (botones) => {
    m.cerrable(true);
    const fin = $("#cp-fin"); fin.hidden = false; fin.innerHTML = botones;
    $("#cp-cerrar", fin)?.addEventListener("click", () => m.cerrar());
    fin.querySelector("button:last-child")?.focus();
  };
  try {
    P.activar(0);
    const { tickets } = await api("api/tickets?estado=nuevo");
    await espera(400);
    if (!tickets.length) { P.hecho(0, "No hay tickets nuevos", "Crea uno con «Probar con un ticket»."); terminar(`<button class="btn" type="button" id="cp-cerrar">Cerrar</button>`); return; }
    const lote = Math.min(10, tickets.length);
    P.hecho(0, `${tickets.length} tickets nuevos`, tickets.length > lote ? `Se procesan ${lote} por pasada` : "");
    P.activar(1, claude ? `Claude está clasificando ${lote} tickets…` : `Las reglas están clasificando ${lote} tickets…`);
    const r = await post("api/orquestar", { limite: 10 });
    const porClaude = r.resultados.filter((x) => motorDe(x.motor).quien === "claude" && motorDe(x.motor).clase !== "respaldo").length;
    const resp = r.resultados.filter((x) => motorDe(x.motor).clase === "respaldo").length;
    P.hecho(1, `${r.procesados} clasificados`, porClaude ? `${porClaude} por Claude${resp ? `, ${resp} por reglas de respaldo` : ""}` : resp ? `Por reglas de respaldo: ${motorDe(r.resultados[0].motor).txt.replace(/^Clasificado por reglas /, "")}` : "Por reglas de palabras clave");
    P.activar(2); await espera(350);
    const rev = r.resultados.filter((x) => x.decision === "en_revision").length;
    P.hecho(2, `${r.procesados - rev} derivados, ${rev} a revisión`);
    const ol = $("#cp-res");
    for (const x of r.resultados) {
      const t = tickets.find((k) => k.id === x.ticket);
      ol.insertAdjacentHTML("beforeend", `<li class="${x.decision === "derivado" ? "" : "rev"}">${ico(x.decision === "derivado" ? "persona" : "ojo", 16)}<button type="button" class="enlace" data-id="${x.ticket}">#${x.ticket}</button><span class="r-asunto">${esc(t?.asunto || "")}</span><span class="r-dest">${x.decision === "derivado" ? esc(x.responsable) : "Revisión"}</span></li>`);
      await espera(110);
    }
    $$("#cp-res [data-id]").forEach((b) => b.addEventListener("click", () => { m.cerrar(); irA(+b.dataset.id); }));
    terminar(`<button class="btn sec" type="button" id="cp-cerrar">Cerrar</button><button class="btn senal" type="button" id="cp-ver">Ver el primero</button>`);
    $("#cp-ver").addEventListener("click", () => { m.cerrar(); irA(r.resultados[0].ticket); });
    if (panelTab === "tickets" && !$("#panel").hidden) verTickets();
  } catch (e) { P.fallo(1, "No se pudo clasificar", e.message); terminar(`<button class="btn" type="button" id="cp-cerrar">Cerrar</button>`); }
}

const PL = { aviso_responsable: "Aviso al responsable", acuse_solicitante: "Acuse al cliente", revision_coordinacion: "Aviso de revisión" };
async function verBandeja(id) {
  const r = await api("api/bandeja");
  if (panelTab !== "bandeja") return;
  let actual = +id || r.correos[0]?.id;
  $("#panel-cuerpo").innerHTML = `<p class="p-intro">${r.total} correos enviados con plantillas aprobadas. Ninguno sale a internet.</p>
    <input type="text" id="mb" placeholder="Buscar por persona, asunto o ticket" aria-label="Buscar correos">
    <div class="correos"><div class="lista" id="ml"></div><div class="correo" id="mv"></div></div>`;
  const lista = () => {
    const q = $("#mb").value.toLowerCase();
    $("#ml").innerHTML = r.correos.filter((c) => !q || `${c.nombre} ${c.para} ${c.asunto} #${c.ticket}`.toLowerCase().includes(q)).slice(0, 120).map((c) =>
      `<button type="button" class="item ${c.id === actual ? "sel" : ""}" data-id="${c.id}"><span class="i-asunto">${esc(c.asunto)}</span><span class="i-meta"><span>${esc(c.nombre)}</span><span>${fecha(c.en)}</span></span></button>`).join("") || `<p class="vacio">Sin correos.</p>`;
    $$("#ml .item").forEach((b) => b.addEventListener("click", () => { actual = +b.dataset.id; lista(); ver(); if (innerWidth < 900) $("#mv").scrollIntoView({ behavior: "smooth" }); }));
  };
  const ver = () => {
    const c = r.correos.find((x) => x.id === actual);
    $("#mv").innerHTML = !c ? `<p class="vacio">Elige un correo.</p>` : verCorreo(c) + `<p class="linea-meta">${esc(PL[c.plantilla] || c.plantilla)}. <button class="enlace" type="button" data-t="${c.ticket}">Ver el ticket #${c.ticket}</button></p>`;
    enlazarCorreo($("#mv"));
    $("#mv [data-t]")?.addEventListener("click", (e) => irA(+e.target.dataset.t));
  };
  $("#mb").addEventListener("input", lista);
  lista(); ver();
}

async function verAuditoria(ticket) {
  const pretty = (s) => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; } };
  $("#panel-cuerpo").innerHTML = `<p class="p-intro" id="ares"></p>
    <div class="filtros-aud"><select id="af" aria-label="Tipo de registro"><option value="">Todos los tipos</option>${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
    <input id="at" type="text" inputmode="numeric" placeholder="N.º de ticket" aria-label="Número de ticket" value="${ticket || ""}"></div>
    <div class="aud" id="ab"></div>`;
  const cargar = async () => {
    const r = await api("api/auditoria?" + new URLSearchParams({ tipo: $("#af").value, ticket: $("#at").value.replace(/\D/g, "") }));
    if (panelTab !== "auditoria") return;
    $("#ares").textContent = `${r.total} registros. Gasto de Claude en la demo: ${usd(r.gasto, 4)} de un tope de ${usd(r.tope, 2)}.`;
    $("#ab").innerHTML = r.filas.slice(0, 200).map((a) => {
      const esClasif = a.tipo === "clasificacion";
      return `<details class="fila-aud ${a.resultado !== "ok" ? "mal" : ""}"><summary>
        <span class="fa-hora">${fecha(a.en)}</span>
        <span class="fa-tipo">${esc(TIPOS[a.tipo] || a.tipo)}${a.ticket ? ` <span class="suave">#${a.ticket}</span>` : ""}</span>
        <span class="fa-salida">${esClasif ? chipMotor(a.motor, a.modelo) : esc(a.salida.length > 110 ? a.salida.slice(0, 110) + "…" : a.salida)}</span></summary>
        <div class="fa-det">
          <dl><div><dt>Motor</dt><dd>${esc(a.motor)}</dd></div>${a.modelo ? `<div><dt>Modelo</dt><dd>${esc(a.modelo)}</dd></div>` : ""}
          <div><dt>Tokens</dt><dd>${a.tokensEntrada ? a.tokensEntrada + " + " + a.tokensSalida : "0"}</dd></div><div><dt>Costo</dt><dd>${usd(a.costo, 5)}</dd></div><div><dt>Duración</dt><dd>${a.duracionMs || 0} ms</dd></div><div><dt>Resultado</dt><dd>${esc(a.resultado)}</dd></div></dl>
          <div class="pre">ENTRADA\n${esc(pretty(a.entrada))}\n\nSALIDA\n${esc(a.salida)}</div>
          ${a.ticket ? `<button class="enlace" type="button" data-t="${a.ticket}">Ver el recorrido del ticket #${a.ticket}</button>` : ""}
        </div></details>`;
    }).join("") || `<p class="vacio">Sin registros.</p>`;
    $$("#ab [data-t]").forEach((b) => b.addEventListener("click", () => irA(+b.dataset.t)));
  };
  $("#af").addEventListener("change", cargar);
  let t; $("#at").addEventListener("input", () => { clearTimeout(t); t = setTimeout(cargar, 300); });
  cargar();
}

let motorEval = null;
async function verEvaluacion() {
  const d = await api("api/evaluacion");
  if (panelTab !== "evaluacion") return;
  const evs = d.evaluaciones || {}, motores = Object.keys(evs).sort(), c = d.config;
  const cuerpo = $("#panel-cuerpo");
  const acciones = `<div class="fila-acc"><button class="btn sec" type="button" id="ev-reglas">${ico("lista", 16)}<span>Medir con reglas (gratis)</span></button><a class="btn sec" href="admin">${ico("chispa", 16)}<span>Medir con Claude (admin)</span></a></div>`;
  const intro = `<p class="p-intro">60 tickets ficticios con su respuesta correcta, que el clasificador no ve. Se clasifican todos y se compara. La meta del requerimiento es 90 % en categoría y 95 % en área.</p>`;
  const enCurso = c.evalEnCurso ? `<div class="card en-curso"><p>Midiendo con ${esc(c.evalEnCurso)}: ${c.evalAvance} de ${c.evalTotal}</p><div class="medidor"><i style="width:${(100 * c.evalAvance) / c.evalTotal}%"></i></div></div>` : "";
  if (c.evalEnCurso) setTimeout(() => panelTab === "evaluacion" && !$("#panel").hidden && verEvaluacion(), 1500);
  if (!motores.length) { cuerpo.innerHTML = intro + enCurso + `<p class="vacio">Todavía no hay mediciones.</p>` + acciones; enlazarEval(); return; }
  if (!motorEval || !evs[motorEval]) motorEval = motores.includes("claude") ? "claude" : motores[0];
  const e = evs[motorEval];
  const meta = (v, m) => `<span class="${v >= m ? "si" : "no"}">${v >= m ? "Cumple" : "No cumple"} la meta de ${Math.round(m * 100)} %</span>`;
  const barras = (obj, nom) => Object.entries(obj).sort((a, b) => a[1].aciertos / a[1].total - b[1].aciertos / b[1].total).map(([id, a]) => {
    const p = a.aciertos / a.total;
    return `<div class="lbar"><span>${esc(nom(id))}</span><div class="ev-barra ${p >= 0.9 ? "ok" : "warn"}"><i style="width:${p * 100}%"></i></div><span>${a.aciertos}/${a.total}</span></div>`;
  }).join("");
  const errores = e.filas.filter((f) => f.pred.categoria !== f.oro.categoria || f.pred.area !== f.oro.area);
  cuerpo.innerHTML = intro + enCurso + `
    ${motores.length > 1 ? `<div class="segm" role="tablist">${motores.map((m) => `<button type="button" role="tab" data-m="${m}" aria-selected="${m === motorEval}">Motor ${esc(m)}</button>`).join("")}</div>` : ""}
    <div class="metas">
      <div><b>${pct(e.aciertoCategoria, 0)}</b><span>acierto en categoría</span>${meta(e.aciertoCategoria, 0.9)}</div>
      <div><b>${pct(e.aciertoArea, 0)}</b><span>acierto en área</span>${meta(e.aciertoArea, 0.95)}</div>
    </div>
    <p class="p-intro">${e.sobreUmbral} de ${e.total} se derivarían solos con el umbral de ${pct(e.umbral)}; el resto iría a revisión. ${usd(e.costoPorTicket, 5)} por ticket y ${e.msPorTicket.toFixed(0)} ms de media.</p>
    ${e.respaldos ? `<p class="err">${e.respaldos} de ${e.total} usaron el respaldo de reglas: esos resultados no son de Claude.</p>` : ""}
    <p class="nota">Motor ${esc(e.motor)} (${esc(e.modelo)}), medido el ${fecha(e.en)}. ${e.motor === "reglas" ? "Las reglas y estos 60 tickets los escribió la misma persona: este acierto es optimista. La cifra que vale es la de los 100 tickets reales de Optimiza 360." : "Claude no vio antes estos tickets ni sus respuestas: el prompt lleva la taxonomía y tres ejemplos distintos."}</p>
    <details class="plegable"><summary>Acierto por categoría y por área</summary><h4>Por categoría</h4>${barras(e.porCategoria, nomCat)}<h4>Por área</h4>${barras(e.porArea, nomArea)}</details>
    <details class="plegable"><summary>Errores, ticket por ticket (${errores.length})</summary>
      ${errores.length ? `<div class="tabla"><table><thead><tr><th>#</th><th>Asunto</th><th>Correcto</th><th>Clasificado</th><th class="num">Confianza</th></tr></thead><tbody>
      ${errores.map((f) => `<tr><td>${f.id}</td><td>${esc(f.asunto)}</td><td>${esc(nomCat(f.oro.categoria))}<div class="small suave">${esc(nomArea(f.oro.area))}</div></td><td>${esc(nomCat(f.pred.categoria))}<div class="small suave">${esc(nomArea(f.pred.area))}</div></td><td class="num">${pct(f.confianza)}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="suave">Ningún error en categoría ni en área.</p>`}</details>
    ${acciones}`;
  $$("#panel-cuerpo .segm button").forEach((b) => b.addEventListener("click", () => { motorEval = b.dataset.m; verEvaluacion(); }));
  enlazarEval();
}
function enlazarEval() {
  $("#ev-reglas")?.addEventListener("click", async (ev) => {
    const b = ev.currentTarget; b.disabled = true;
    try { await post("api/evaluar", { motor: "reglas" }); motorEval = "reglas"; toast("Medición con reglas lista."); verEvaluacion(); }
    catch (e) { toast(e.message, true); b.disabled = false; }
  });
}

// ---------- rutas por hash ----------
function ruta() {
  const h = location.hash.slice(1);
  if (h === "tickets") { abrirPanel("tickets"); return; }
  const m = h.match(/^(bandeja|auditoria|evaluacion)(?:-(\d+))?$/);
  if (m) { abrirPanel(m[1], m[2]); return; }
  cerrarPanel(false);
  if (h === "nuevo") { history.replaceState(null, "", location.pathname + location.search); abrirProbar(); return; }
  const t = h.match(/^t(\d+)$/);
  if (t && +t[1] !== sel) mostrar(+t[1]);
}
addEventListener("hashchange", ruta);
$$("nav.menu a[href^='./#']").forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  const tab = a.getAttribute("href").slice(3);
  abrirPanel(tab);
}));

// ---------- arranque ----------
$("#probar").addEventListener("click", abrirProbar);
$("#otro").addEventListener("click", abrirProbar);
$("#repetir").addEventListener("click", () => sel && mostrar(sel, { animar: true }));
$("#ver-ejemplo").addEventListener("click", async () => {
  const { tickets } = await api("api/tickets");
  const hechos = tickets.filter((t) => t.responsable);
  const id = hechos.find((t) => t.id === 1042)?.id || hechos[hechos.length - 1]?.id;
  if (id) mostrar(id, { animar: true });
});
tax = await api("api/taxonomia");
tax.umbral = 0.7;
await refrescarConfig();
ruta();
setInterval(() => { if (!document.hidden) refrescarConfig(); }, 20000);
