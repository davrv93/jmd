// Utilidades compartidas por todas las páginas de Tienda Sol.

export const soles = (n) => 'S/ ' + Number(n).toFixed(2);
export const redondear = (n) => Math.round(n * 100) / 100;

export function token() { return sessionStorage.getItem('token'); }

export async function api(ruta, opciones = {}) {
  const res = await fetch(ruta, {
    ...opciones,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (token() ?? ''), ...(opciones.headers ?? {}) },
  });
  const cuerpo = await res.json().catch(() => ({}));
  if (res.status === 401 && ruta !== '/api/login') { salir(); }
  return { ok: res.ok, estado: res.status, cuerpo };
}

export function exigirSesion() {
  if (!token()) { location.replace('/index.html'); return false; }
  return true;
}

export function salir() {
  sessionStorage.clear();
  location.replace('/index.html');
}

// --- carrito (vive en sessionStorage) ---
export function leerCarrito() {
  try { return JSON.parse(sessionStorage.getItem('carrito') ?? '[]'); } catch { return []; }
}
export function guardarCarrito(c) { sessionStorage.setItem('carrito', JSON.stringify(c)); pintarContador(); }

export function pintarContador() {
  const el = document.getElementById('contador-carrito');
  if (el) el.textContent = String(leerCarrito().reduce((s, i) => s + i.cantidad, 0));
}

export function iniciarCabecera() {
  const nombre = sessionStorage.getItem('nombre');
  const el = document.getElementById('usuario-actual');
  if (el && nombre) el.textContent = nombre;
  document.getElementById('boton-salir')?.addEventListener('click', salir);
  pintarContador();
}
