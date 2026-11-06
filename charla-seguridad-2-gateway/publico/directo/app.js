// Cliente sin gateway: conoce las rutas reales y guarda el token donde cualquier script lo puede leer.
const $ = (id) => document.getElementById(id);
const clave = new URLSearchParams(location.hash.slice(1)).get("clave");
if (clave) { $("clave").value = clave; history.replaceState(null, "", location.pathname); }
let yo = null;

async function api(metodo, ruta, cuerpo) {
  const r = await fetch(ruta, { method: metodo, headers: { Authorization: "Bearer " + localStorage.getItem("token") }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const j = await r.json();
  $("salida").textContent = `${metodo} ${ruta} → ${r.status}\n${JSON.stringify(j, null, 2)}`;
  return j;
}

async function listar() {
  const { facturas = [] } = await api("GET", `/api/v1/clientes/${yo.clienteId}/facturas`);
  $("filas").replaceChildren(...facturas.map((f) => {
    const tr = document.createElement("tr");
    for (const t of [f.id, `S/ ${f.total}`, f.estado]) tr.insertCell().textContent = t;
    const b = document.createElement("button");
    b.textContent = "Pagar";
    b.disabled = f.estado === "pagada";
    b.onclick = async () => { await api("POST", `/api/v1/clientes/${yo.clienteId}/facturas/${f.id}/pagar`, { monto: f.total, moneda: f.moneda }); tr.cells[2].textContent = "pagada"; b.disabled = true; };
    tr.insertCell().append(b);
    return tr;
  }));
}

$("entrar").onsubmit = async (e) => {
  e.preventDefault();
  const r = await fetch("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ usuario: $("usuario").value, clave: $("clave").value }) });
  const j = await r.json();
  if (!j.token) { $("aviso").textContent = "Usuario o contraseña incorrectos."; return; }
  localStorage.setItem("token", j.token);
  yo = j.usuario;
  $("clave").value = "";
  $("acceso").hidden = true;
  $("tablero").hidden = false;
  $("quien").textContent = `Facturas de ${yo.nombre} · cliente ${yo.clienteId}`;
  await listar();
};
