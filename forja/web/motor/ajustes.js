// Forja · ajustes del alumno que llegan desde las escenas LIVE de la clase (Ready Set Go).
// En la escena «Movimiento y choques» el alumno elige gravedad, salto y velocidad; en «Cuatro perseguidores», la regla
// de su rival. El botón «Llevar a mi juego» de esas escenas los guarda en este navegador (mismo origen que la Forja)
// y la Forja los pone en el datos.js de SU juego: el que prueba aquí y el que se lleva en el ZIP. Sin IA y sin servidor.
// También se aceptan por la dirección: /forja/?gravedad=1500&salto=650&velocidad=240&rival=delante&n=4
export const CLAVE_AJUSTES = 'forja.ajustes';
export const REGLAS_RIVAL = {
  celda: 'el cazador: va a tu celda',
  delante: 'la emboscada: N celdas delante de ti',
  pinza: 'la pinza: con el otro rival, N delante de ti',
  indeciso: 'el indeciso: te persigue si está a más de N',
  esquina: 'se queda en su esquina',
  azar: 'va a celdas al azar',
};
const RANGOS = { gravedad: [300, 2600], salto: [200, 1100], velocidad: [60, 420] };
const entero = (v, min, max) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };

export function leerAjustes() {
  try { const a = JSON.parse(globalThis.localStorage?.getItem(CLAVE_AJUSTES) || 'null'); return a && typeof a === 'object' ? limpiar(a) : {}; }
  catch { return {}; }
}
function limpiar(a) {
  const o = {};
  for (const [k, [min, max]] of Object.entries(RANGOS)) if (a[k] != null) { const v = entero(a[k], min, max); if (v != null) o[k] = v; }
  if (a.rival && REGLAS_RIVAL[a.rival.tipo]) o.rival = { tipo: a.rival.tipo, n: entero(a.rival.n ?? 0, 0, 12) ?? 0 };
  return o;
}
export function guardarAjustes(nuevos) {
  const a = limpiar({ ...leerAjustes(), ...nuevos });
  try { globalThis.localStorage?.setItem(CLAVE_AJUSTES, JSON.stringify(a)); } catch { /* sin almacenamiento: solo vale para esta visita */ }
  return a;
}
export function borrarAjustes() { try { globalThis.localStorage?.removeItem(CLAVE_AJUSTES); } catch { /* nada que borrar */ } }

// Lee ?gravedad=&salto=&velocidad=&rival=&n= y los guarda. Devuelve los ajustes si la dirección traía alguno.
export function tomarDeLaURL(busqueda = globalThis.location?.search || '') {
  const q = new URLSearchParams(busqueda), nuevos = {};
  for (const k of Object.keys(RANGOS)) if (q.has(k)) nuevos[k] = q.get(k);
  if (q.has('rival')) nuevos.rival = { tipo: q.get('rival'), n: q.get('n') };
  return Object.keys(nuevos).length ? guardarAjustes(nuevos) : null;
}

export function resumenAjustes(a = leerAjustes()) {
  const partes = [];
  if (a.gravedad != null || a.salto != null || a.velocidad != null)
    partes.push(['gravedad', 'salto', 'velocidad'].filter((k) => a[k] != null).map((k) => `${k} ${a[k]}`).join(' · '));
  if (a.rival) partes.push(`rival «${REGLAS_RIVAL[a.rival.tipo].replace('N', a.rival.n)}»`);
  return partes.join('  ·  ');
}

// Mezcla los ajustes con la física que salió de las reglas del personaje (los del alumno mandan).
export function aplicarAjustes(DATOS, a = leerAjustes()) {
  for (const k of Object.keys(RANGOS)) if (a[k] != null) DATOS.fisica[k] = a[k];
  if (a.rival) DATOS.rival = { ...a.rival, nombre: REGLAS_RIVAL[a.rival.tipo].replace('N', a.rival.n) };
  if (Object.keys(a).length) DATOS.ajustesDeClase = resumenAjustes(a);
  return DATOS;
}
