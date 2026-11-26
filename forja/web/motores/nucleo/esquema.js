// Forja · motores · validación de configuraciones (subconjunto de JSON Schema, sin dependencias).
// Regla de oro: una configuración es DATOS. Nunca se evalúa (ni eval, ni new Function, ni import dinámico de lo que
// diga el JSON). validar() además rechaza lo que no sea JSON puro (funciones, símbolos, prototipos raros) y las claves
// que sirven para contaminar prototipos (__proto__, constructor, prototype).
//   esquema: { tipo: 'objeto'|'lista'|'numero'|'entero'|'texto'|'booleano', props, requeridos, extra:false, enum,
//              min, max, minLargo, maxLargo, patron, items, minItems, maxItems, defecto }
const PROHIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);
const NOMBRE = { objeto: 'un objeto', lista: 'una lista', numero: 'un número', entero: 'un entero', texto: 'un texto', booleano: 'verdadero o falso' };

function tipoDe(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'lista';
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v) ? (Number.isInteger(v) ? 'entero' : 'numero') : 'no-finito';
  return { string: 'texto', boolean: 'booleano', object: 'objeto' }[t] || t;
}

export function validar(valor, esquema, ruta = 'config', errores = [], prof = 0) {
  if (prof > 24) { errores.push(`${ruta}: anidado demasiado profundo`); return errores; }
  const t = tipoDe(valor), e = esquema || {};
  if (t === 'function' || t === 'symbol' || t === 'bigint' || t === 'undefined' || t === 'no-finito') { errores.push(`${ruta}: valor no permitido (${t})`); return errores; }
  if (t === 'objeto' && Object.getPrototypeOf(valor) !== Object.prototype && Object.getPrototypeOf(valor) !== null) { errores.push(`${ruta}: no es un objeto JSON`); return errores; }
  if (e.tipo) {
    const ok = e.tipo === t || (e.tipo === 'numero' && t === 'entero');
    if (!ok) { errores.push(`${ruta}: debe ser ${NOMBRE[e.tipo] || e.tipo}`); return errores; }
  }
  if (e.enum && !e.enum.includes(valor)) errores.push(`${ruta}: «${valor}» no es una opción (${e.enum.join(', ')})`);
  if (t === 'numero' || t === 'entero') {
    if (e.min != null && valor < e.min) errores.push(`${ruta}: mínimo ${e.min}`);
    if (e.max != null && valor > e.max) errores.push(`${ruta}: máximo ${e.max}`);
  }
  if (t === 'texto') {
    if (e.minLargo != null && valor.length < e.minLargo) errores.push(`${ruta}: muy corto`);
    if (valor.length > (e.maxLargo ?? 2000)) errores.push(`${ruta}: muy largo`);
    if (e.patron && !new RegExp(e.patron).test(valor)) errores.push(`${ruta}: formato inválido`);
  }
  if (t === 'lista') {
    if (e.minItems != null && valor.length < e.minItems) errores.push(`${ruta}: al menos ${e.minItems}`);
    if (valor.length > (e.maxItems ?? 5000)) errores.push(`${ruta}: demasiados elementos`);
    valor.forEach((v, i) => validar(v, e.items, `${ruta}[${i}]`, errores, prof + 1));
  }
  if (t === 'objeto') {
    for (const k of Object.keys(valor)) {
      if (PROHIBIDAS.has(k)) { errores.push(`${ruta}: clave prohibida «${k}»`); continue; }
      const sub = e.props?.[k] ?? (typeof e.extra === 'object' ? e.extra : null);
      if (!sub && e.props && e.extra === false) { errores.push(`${ruta}.${k}: clave desconocida`); continue; }
      validar(valor[k], sub, `${ruta}.${k}`, errores, prof + 1);
    }
    for (const r of e.requeridos || []) if (!(r in valor)) errores.push(`${ruta}.${r}: falta`);
  }
  return errores;
}

// Copia profunda solo de lo que el esquema conoce, rellenando defectos. Útil tras validar.
export function conDefectos(valor, esquema) {
  const e = esquema || {};
  if (valor === undefined) valor = e.defecto !== undefined ? structuredClone(e.defecto) : undefined;
  if (e.tipo === 'objeto' && e.props) {
    const o = {}, v = valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
    for (const [k, s] of Object.entries(e.props)) { const x = conDefectos(v[k], s); if (x !== undefined) o[k] = x; }
    if (e.extra && typeof e.extra === 'object') for (const k of Object.keys(v)) if (!(k in o) && !PROHIBIDAS.has(k)) o[k] = conDefectos(v[k], e.extra);
    return o;
  }
  if (e.tipo === 'lista' && Array.isArray(valor)) return valor.map((x) => conDefectos(x, e.items));
  return valor;
}

// Parsear texto del alumno o de un agente: JSON.parse (nunca eval) + validación. Devuelve { ok, valor, errores }.
export function leerConfig(texto, esquema) {
  let v; try { v = typeof texto === 'string' ? JSON.parse(texto) : structuredClone(texto); } catch (err) { return { ok: false, errores: ['JSON inválido: ' + err.message] }; }
  const errores = validar(v, esquema);
  return errores.length ? { ok: false, errores } : { ok: true, valor: conDefectos(v, esquema), errores: [] };
}
