// Forja · ajustes del alumno que llegan desde las escenas LIVE de la clase (Ready Set Go).
// En la escena «Movimiento y choques» el alumno elige gravedad, salto y velocidad; en «Cuatro perseguidores», la regla
// de su rival. El botón «Llevar a mi juego» de esas escenas los guarda en este navegador (mismo origen que la Forja)
// y la Forja los pone en el datos.js de SU juego: el que prueba aquí y el que se lleva en el ZIP. Sin IA y sin servidor.
// También se aceptan por la dirección: /forja/?gravedad=1500&salto=650&velocidad=240&rival=delante&n=4
// Plataformas que flotan (función seno): oscilacion = { amp: px enteros 0–120, vel: ω en rad/s 0–4 con 2 decimales }.
// amp 0 o vel 0 = plataformas quietas. Por la dirección: ?amp=60&vel=1.5
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
const OSCILACION = { amp: [0, 120, 0], vel: [0, 4, 2] };   // [mínimo, máximo, decimales]
const numero = (v, min, max, dec) => {
  if (v == null || v === '' || typeof v === 'boolean') return null;
  const f = 10 ** dec, n = Math.round(+v * f) / f; return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};
const coma = (n) => String(n).replace('.', ',');

export function leerAjustes() {
  try { const a = JSON.parse(globalThis.localStorage?.getItem(CLAVE_AJUSTES) || 'null'); return a && typeof a === 'object' ? limpiar(a) : {}; }
  catch { return {}; }
}
function limpiar(a) {
  const o = {};
  for (const [k, [min, max]] of Object.entries(RANGOS)) if (a[k] != null) { const v = entero(a[k], min, max); if (v != null) o[k] = v; }
  if (a.rival && REGLAS_RIVAL[a.rival.tipo]) o.rival = { tipo: a.rival.tipo, n: entero(a.rival.n ?? 0, 0, 12) ?? 0 };
  if (a.oscilacion && typeof a.oscilacion === 'object') {   // hacen falta las dos cifras; si falta una, no se aplica
    const amp = numero(a.oscilacion.amp, ...OSCILACION.amp), vel = numero(a.oscilacion.vel, ...OSCILACION.vel);
    if (amp != null && vel != null) o.oscilacion = { amp, vel };
  }
  if (a.reglas && typeof a.reglas === 'object') {   // { plantilla: { clave: valor } } — valores JSON simples, con tope
    const r = {};
    for (const [pl, m] of Object.entries(a.reglas)) {
      if (!/^[a-z0-9-]{1,30}$/.test(pl) || !m || typeof m !== 'object') continue;
      const lim = {}; let n = 0;
      for (const [k, v] of Object.entries(m)) { if (n >= 800 || !/^[a-zA-Z0-9_.-]{1,60}$/.test(k)) continue; const j = JSON.stringify(v); if (j !== undefined && j.length <= 400) { lim[k] = v; n++; } }
      r[pl] = lim;
    }
    o.reglas = r;
  }
  return o;
}
export function guardarAjustes(nuevos) {
  const a = limpiar({ ...leerAjustes(), ...nuevos });
  try { globalThis.localStorage?.setItem(CLAVE_AJUSTES, JSON.stringify(a)); } catch { /* sin almacenamiento: solo vale para esta visita */ }
  return a;
}
export function borrarAjustes() { try { globalThis.localStorage?.removeItem(CLAVE_AJUSTES); } catch { /* nada que borrar */ } }

// Lee ?gravedad=&salto=&velocidad=&rival=&n=&amp=&vel= y los guarda. Devuelve los ajustes si la dirección traía alguno.
export function tomarDeLaURL(busqueda = globalThis.location?.search || '') {
  const q = new URLSearchParams(busqueda), nuevos = {};
  for (const k of Object.keys(RANGOS)) if (q.has(k)) nuevos[k] = q.get(k);
  if (q.has('rival')) nuevos.rival = { tipo: q.get('rival'), n: q.get('n') };
  if (q.has('amp') || q.has('vel')) {   // ?amp=80 solo cambia la amplitud de una oscilación que ya estaba guardada
    nuevos.oscilacion = { ...leerAjustes().oscilacion };
    for (const k of Object.keys(OSCILACION)) if (q.has(k)) nuevos.oscilacion[k] = q.get(k);
  }
  return Object.keys(nuevos).length ? guardarAjustes(nuevos) : null;
}

export function resumenAjustes(a = leerAjustes()) {
  const partes = [];
  if (a.gravedad != null || a.salto != null || a.velocidad != null)
    partes.push(['gravedad', 'salto', 'velocidad'].filter((k) => a[k] != null).map((k) => `${k} ${a[k]}`).join(' · '));
  if (a.rival) partes.push(`rival «${REGLAS_RIVAL[a.rival.tipo].replace('N', a.rival.n)}»`);
  if (a.oscilacion) partes.push(`plataformas ${a.oscilacion.amp > 0 && a.oscilacion.vel > 0 ? 'que flotan' : 'quietas'}: A ${a.oscilacion.amp} px · ω ${coma(a.oscilacion.vel)}`);
  return partes.join('  ·  ');
}

// Mezcla los ajustes con la física que salió de las reglas del personaje (los del alumno mandan).
export function aplicarAjustes(DATOS, a = leerAjustes()) {
  for (const k of Object.keys(RANGOS)) if (a[k] != null) DATOS.fisica[k] = a[k];
  if (a.rival) DATOS.rival = { ...a.rival, nombre: REGLAS_RIVAL[a.rival.tipo].replace('N', a.rival.n) };
  if (a.oscilacion) DATOS.oscilacion = { ...a.oscilacion };   // la plantilla Plataformas mueve sus plataformas flotantes con esto
  if (Object.keys(a).length) DATOS.ajustesDeClase = resumenAjustes(a);
  return DATOS;
}
