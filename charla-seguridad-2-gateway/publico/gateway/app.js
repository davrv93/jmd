// Cliente con gateway. Cifra con Web Crypto (AES-GCM). Todo lo que hay aquí lo puede leer quien controla el navegador:
// los códigos de operación, la clave de la sesión y cada mensaje antes de cifrarlo.
const $ = (id) => document.getElementById(id);
const OP = { listar: "k4", ver: "m9", pagar: "q2", reporte: "z7" };
const entrada = document.querySelector('meta[name="entrada"]').content;
const llaveGateway = document.querySelector('meta[name="llave"]').content;
const clave = new URLSearchParams(location.hash.slice(1)).get("clave");
if (clave) { $("clave").value = clave; history.replaceState(null, "", location.pathname); } // la clave no se queda en la barra de direcciones

const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64 = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const utf8 = new TextEncoder();
let sesion = null;

const sellar = async (k, texto, aad) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: utf8.encode(aad) }, k, utf8.encode(texto));
  return { v: 1, i: b64(iv), c: b64(c) };
};
const abrir = async (k, sobre, aad) => JSON.parse(new TextDecoder().decode(
  await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(sobre.i), additionalData: utf8.encode(aad) }, k, deB64(sobre.c))));

// Antes del login no hay clave compartida: ECDH la deriva en cada lado sin enviarla. Frena a quien mira el tráfico;
// a quien se mete en medio y cambia la llave solo lo frena HTTPS.
async function claveDeEntrada() {
  const par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const ajena = await crypto.subtle.importKey("raw", deB64(llaveGateway), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secreto = await crypto.subtle.deriveBits({ name: "ECDH", public: ajena }, par.privateKey, 256);
  const base = await crypto.subtle.importKey("raw", secreto, "HKDF", false, ["deriveKey"]);
  const k = await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: utf8.encode("gateway-entrada-v1") },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { k, publica: b64(await crypto.subtle.exportKey("raw", par.publicKey)) };
}

async function renovarRuta() {
  const n = crypto.randomUUID();
  const sobre = await sellar(sesion.clave, JSON.stringify({ n, t: Date.now() }), `v1|${sesion.id}|renovar`);
  const r = await fetch(entrada, { method: "POST", body: JSON.stringify(sobre) });
  if (r.status === 200) sesion.ruta = (await abrir(sesion.clave, await r.json(), `v1|${sesion.id}|respuesta|${n}`)).r;
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
  const n = crypto.randomUUID();
  const { k, publica } = await claveDeEntrada();
  const sobre = await sellar(k, JSON.stringify({ u: $("usuario").value, p: $("clave").value, n, t: Date.now() }), "v1|entrada|peticion");
  const r = await fetch(entrada, { method: "POST", body: JSON.stringify({ ...sobre, e: publica }) });
  const j = await r.json();
  if (r.status !== 200) { $("aviso").textContent = "Usuario o contraseña incorrectos."; return; }
  const abierto = await abrir(k, j, `v1|entrada|respuesta|${n}`);
  sesion = { id: abierto.s, ruta: abierto.r, clave: await crypto.subtle.importKey("raw", deB64(abierto.k), "AES-GCM", false, ["encrypt", "decrypt"]) };
  const usuario = $("usuario").value;
  $("clave").value = "";
  $("acceso").hidden = true;
  $("tablero").hidden = false;
  $("quien").textContent = `Facturas de ${usuario}`;
  if (usuario !== "caja") await listar();
  else $("quien").textContent = "Sesión de caja";
};
