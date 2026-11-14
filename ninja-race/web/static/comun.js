// Utilidades compartidas. El sitio vive bajo /ninja-race/ (el nginx del LMS
// separa este sorteo de la clase), así que todas las rutas son relativas.
export const BASE = new URL(".", location.href).pathname;

export async function api(ruta, opciones = {}) {
  const r = await fetch(BASE + ruta, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(opciones.headers || {}) },
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || "No se pudo conectar. Intenta de nuevo.");
  return datos;
}

export const $ = (s, el = document) => el.querySelector(s);
export const esc = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// El token del corredor vive en el navegador: con él retoma su premio y evita
// registrarse dos veces desde el mismo teléfono.
const LLAVE = "ninja.token";
export function tokenLeer() {
  try { return localStorage.getItem(LLAVE) || ""; } catch { return ""; }
}
export function tokenGuardar(t) {
  try { t ? localStorage.setItem(LLAVE, t) : localStorage.removeItem(LLAVE); } catch { /* sin storage */ }
}