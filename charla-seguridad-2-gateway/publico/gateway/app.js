// Cliente con gateway. Cifra con Web Crypto (AES-GCM). Todo lo que hay aquí lo puede leer quien controla el navegador:
// los códigos de operación, la clave de la sesión y cada mensaje antes de cifrarlo.
const $ = (id) => document.getElementById(id);
const OP = { listar: "k4", ver: "m9", pagar: "q2", reporte: "z7" };
const entrada = document.querySelector('meta[name="entrada"]').content;
const clave = new URLSearchParams(location.hash.slice(1)).get("clave");
if (clave) $("clave").value = clave;

const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64 = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const utf8 = new TextEncoder();
let sesion = null;

async function renovarRuta() {
  const r = await fetch(entrada, { method: "POST", body: JSON.stringify({ renovar: true }) });
  if (r.status === 200) sesion.ruta = (await r.json()).r;
  return r.status === 200;
}

async function llamar(o, d = {}, reintento = true) {
  const n = crypto.randomUUID();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const claro = utf8.encode(JSON.stringify({ o, d, n, t: Date.now() }));
  const c = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: utf8.encode(`v1|${sesion.id}|peticion`) }, sesion.clave, claro);
  // La cookie sid viaja sola: este código no la puede leer.
  const r = await fetch(sesion.ruta, { method: "POST", body: JSON.stringify({ v: 1, i: b64(iv), c: b64(c) }) });
  const j = await r.json();
  // La pestaña estuvo quieta y la ruta rotó: con la cookie se pide la vigente y se sella de nuevo.
  if (r.status === 404 && reintento && (await renovarRuta())) return llamar(o, d, false);
  if (r.status !== 200) {
    $("salida").textContent = `→ ${r.status}\n${JSON.stringify(j, null, 2)}`;
    return null;
  }
  const abierto = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(j.i), additionalData: utf8.encode(`v1|${sesion.id}|respuesta|${n}`) }, sesion.clave, deB64(j.c));
  const m = JSON.parse(new TextDecoder().decode(abierto));
  sesion.ruta = m.r; // la ruta rota: el gateway dice cuál toca ahora
  $("salida").textContent = `POST ${sesion.ruta} → 200 (descifrado en el navegador)\n${JSON.stringify(m.d, null, 2)}`;
  return m.d;
}

async function listar() {
  const r = await llamar(OP.listar);
  if (!r) return;
  $("filas").replaceChildren(...r.facturas.map((f) => {
    const tr = document.createElement("tr");
    for (const t of [f.id, `S/ ${f.total}`, f.estado]) tr.insertCell().textContent = t;
    const b = document.createElement("button");
    b.textContent = "Pagar";
    b.disabled = f.estado === "pagada";
    b.onclick = async () => { if (await llamar(OP.pagar, { id: f.id })) { tr.cells[2].textContent = "pagada"; b.disabled = true; } };
    tr.insertCell().append(b);
    return tr;
  }));
}

$("entrar").onsubmit = async (e) => {
  e.preventDefault();
  const r = await fetch(entrada, { method: "POST", body: JSON.stringify({ u: $("usuario").value, p: $("clave").value }) });
  const j = await r.json();
  if (r.status !== 200) { $("salida").textContent = "No se pudo entrar. Revisa la clave en la terminal."; return; }
  sesion = { id: j.s, ruta: j.r, clave: await crypto.subtle.importKey("raw", deB64(j.k), "AES-GCM", false, ["encrypt", "decrypt"]) };
  $("quien").textContent = `Sesión de ${$("usuario").value}`;
  if ($("usuario").value !== "caja") await listar();
};
