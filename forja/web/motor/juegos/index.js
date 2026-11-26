// Forja · catálogos de reglas de juego. Cada plantilla (plantillas/<id>.js) tiene aquí su catálogo (motor/juegos/<id>.js).
//
// CONTRATO (lo cumplen las seis plantillas):
//   export const ficha = { tipo, objetivo, recursos: [..], conflicto, limites, gana, pierde }   // lo que el onboarding cuenta
//   export function reglas() → [ regla, … ]
//   regla = {
//     id:        'fortaleza.trampas.pinchos.ocultos'   único y estable (se guarda en el navegador del alumno)
//     elemento:  'jugadores'|'objetivo'|'procedimientos'|'reglas'|'recursos'|'conflicto'|'limites'|'resultado'
//                (los 8 elementos formales de Fullerton, Game Design Workshop 2014, cap. 3)
//     grupo:     'Trampas'                 agrupa en la interfaz
//     clave:     'trampas.pinchos'         lo que la plantilla lee con Forja.regla('trampas.pinchos', defecto)
//     ajuste:    'Pinchos'                 nombre de la clave (igual en todas sus reglas)
//     nombre:    'Ocultos'                 nombre de ESTA opción
//     d:         'Salen del suelo cuando pasas cerca'   una línea, opcional
//     valor:     cualquier JSON            lo que queda en DATOS.reglas['trampas.pinchos']
//     defecto:   true                      exactamente una regla por clave
//     simple:    true                      la clave sale en la vista simple del onboarding (las demás, en «Más reglas»)
//   }
// Las reglas con la misma clave son alternativas (se elige una). Una «regla» es una opción real que cambia el juego.
export const ELEMENTOS = ['jugadores', 'objetivo', 'procedimientos', 'reglas', 'recursos', 'conflicto', 'limites', 'resultado'];

const CARGA = {
  plataformas: () => import('./plataformas.js'),
  futbol: () => import('./futbol.js'),
  laberinto: () => import('./laberinto.js'),
  runner: () => import('./runner.js'),
  fortaleza: () => import('./fortaleza.js'),
  persecucion: () => import('./persecucion.js'),
};
const cache = new Map();
export async function catalogoDe(id) {
  if (!cache.has(id)) cache.set(id, (CARGA[id] ? CARGA[id]() : Promise.resolve({})).then((m) => ({ ficha: m.ficha || null, reglas: m.reglas ? m.reglas() : [] })).catch(() => ({ ficha: null, reglas: [] })));
  return cache.get(id);
}
export function porDefecto(reglas) {
  const o = {};
  for (const r of reglas) if (r.defecto || !(r.clave in o)) o[r.clave] = r.valor;
  for (const r of reglas) if (r.defecto) o[r.clave] = r.valor;
  return o;
}
// Claves agrupadas para la interfaz: [{ clave, ajuste, grupo, elemento, simple, opciones: [regla…] }]
export function claves(reglas, elemento) {
  const m = new Map();
  for (const r of reglas) {
    if (elemento && r.elemento !== elemento) continue;
    if (!m.has(r.clave)) m.set(r.clave, { clave: r.clave, ajuste: r.ajuste, grupo: r.grupo, elemento: r.elemento, simple: false, opciones: [] });
    const k = m.get(r.clave); k.opciones.push(r); if (r.simple) k.simple = true;
  }
  return [...m.values()];
}
// Revisión del catálogo (la usan las pruebas): ids únicos, elementos válidos, una regla por defecto por clave.
export function revisar(reglas) {
  const errores = [], ids = new Set(), def = new Map();
  for (const r of reglas) {
    if (!r.id || ids.has(r.id)) errores.push(`id repetido o vacío: ${r.id}`); ids.add(r.id);
    if (!ELEMENTOS.includes(r.elemento)) errores.push(`${r.id}: elemento «${r.elemento}»`);
    for (const k of ['grupo', 'clave', 'ajuste', 'nombre']) if (!r[k]) errores.push(`${r.id}: falta ${k}`);
    if (r.valor === undefined) errores.push(`${r.id}: falta valor`);
    def.set(r.clave, (def.get(r.clave) || 0) + (r.defecto ? 1 : 0));
  }
  for (const [k, n] of def) if (n !== 1) errores.push(`clave ${k}: ${n} reglas por defecto (debe ser 1)`);
  const faltan = ELEMENTOS.filter((e) => !reglas.some((r) => r.elemento === e));
  if (faltan.length) errores.push(`sin reglas para: ${faltan.join(', ')}`);
  return errores;
}

// Ayuda para escribir catálogos: una clave con sus opciones.
//   clave('conflicto', 'Trampas', 'trampas.pinchos', 'Pinchos', [['no', 'Sin pinchos', false], ['visibles', 'Visibles', {…}, 'd', true]], { simple: true })
//   cada opción: [sufijoId, nombre, valor, d?, defecto?]
export function clave(prefijo, elemento, grupo, k, ajuste, opciones, extra = {}) {
  return opciones.map(([suf, nombre, valor, d, defecto]) => ({ id: `${prefijo}.${k}.${suf}`, elemento, grupo, clave: k, ajuste, nombre, d: d || '', valor, defecto: !!defecto, simple: !!extra.simple }));
}
