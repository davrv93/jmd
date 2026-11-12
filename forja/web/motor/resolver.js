// Forja · resolver: tipo + parámetros + semilla -> ficha completa del personaje, consultando las tablas de reglas.
// No dibuja nada y no depende del navegador: lo usan el estudio, el exportador y las pruebas.

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function azar(semilla) { // mulberry32
  let s = (semilla >>> 0) || 1;
  return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const PARAMS_BASE = {
  altura: 0.5, peso: 0.5, cabeza: 0.5, ojos: 0.5, brazos: 0.5, piernas: 0.5,
  tono: null, luzAbs: null, satAbs: null, armonia: 'analoga', animo: 'vivo', expresion: 'feliz', ojoEstilo: null, edad: 'adulto',
  patron: null, accesorios: null, fondo: 'noche', tonos: null, accAjuste: null,
};

export function hsl(h, s, l) { return { h: ((h % 360) + 360) % 360, s: clamp(s, 0, 1), l: clamp(l, 0.04, 0.97) }; }
export const css = (c) => `hsl(${c.h.toFixed(0)} ${(c.s * 100).toFixed(0)}% ${(c.l * 100).toFixed(0)}%)`;

// interpola una tabla de 5 clases (y opcionalmente 5x5)
function inter1(T, pre, x) {
  const u = clamp(x, 0, 1) * 4, i = Math.min(3, Math.floor(u)), t = u - i, a = T[`${pre}|${i}`], b = T[`${pre}|${i + 1}`];
  return a.map((v, k) => lerp(v, b[k], t));
}
function inter2(T, fam, x, y) {
  const u = clamp(x, 0, 1) * 4, i = Math.min(3, Math.floor(u)), t = u - i;
  const a = inter1(T, `${fam}|${i}`, y), b = inter1(T, `${fam}|${i + 1}`, y);
  return a.map((v, k) => lerp(v, b[k], t));
}

export function resolver(R, familiaId, varianteId, params = {}, semilla = 1) {
  const T = R.T, p = { ...PARAMS_BASE, ...params };
  const f = R.meta.familias.find((x) => x.id === familiaId) || R.meta.familias[0];
  const tipo = T.tipo[`${f.id}|${varianteId}`] || T.tipo[`${f.id}|clasico`];
  const vId = T.tipo[`${f.id}|${varianteId}`] ? varianteId : 'clasico';
  const reglas = []; // rastro: qué reglas se aplicaron (para mostrarlo en el estudio)
  const usa = (tabla, clave) => { reglas.push(`${tabla}:${clave}`); return T[tabla][clave]; };

  usa('tipo', `${f.id}|${vId}`);
  const [kAlto, tw0, th0, kPierna, kBrazo, kCab] = inter2(T.prop, f.id, p.altura, p.peso);
  reglas.push(`prop:${f.id}|${Math.round(p.altura * 4)}|${Math.round(p.peso * 4)}`);
  const sil = usa('silueta', `${f.id}|${p.edad}|${Math.round(clamp(p.altura, 0, 1) * 4)}`);
  const ojoEstilo = p.ojoEstilo && T.ojo[`${f.id}|${p.ojoEstilo}`]?.[0] ? p.ojoEstilo : f.ojo;
  const ojoR = usa('ojo', `${f.id}|${ojoEstilo}`);
  const cara = usa('cara', `${f.id}|${p.expresion}`);

  const cab = f.cab * kCab * tipo.kCab * sil[0] * lerp(0.78, 1.34, p.cabeza);
  const dims = {
    escala: tipo.escala * kAlto, tw: tw0 * tipo.kTw, th: th0, td: tw0 * tipo.kTw * (f.torso === 'caja' ? 0.78 : 0.9), cab,
    pierna: f.pierna * kPierna * sil[2] * lerp(0.6, 1.5, p.piernas), brazo: f.brazo * kBrazo * lerp(0.6, 1.45, p.brazos),
    ojo: ojoR[1] * sil[1] * lerp(0.7, 1.45, p.ojos), ojoSep: ojoR[2], ojoAlt: ojoR[3],
  };

  // color
  const pal = usa('paleta', `${vId}|${p.armonia}|${p.animo}`);
  const tono = p.tono ?? tipo.tono, sat = (p.satAbs ?? tipo.sat) * pal[4], luz = clamp((p.luzAbs ?? tipo.luz) * pal[5], 0.1, 0.95);
  const D = [0, pal[0], pal[1], pal[2], 0, pal[3]];
  const colores = {};
  R.meta.partes.forEach((parte, i) => {
    const [, dl, ds] = usa('pinta', `${f.id}|${parte}|${p.animo}`);
    colores[parte] = hsl(tono + D[i], sat + ds, luz + dl);
  });
  if (p.tonos) for (const [parte, h] of Object.entries(p.tonos)) if (colores[parte] && Number.isFinite(h)) colores[parte] = hsl(h, colores[parte].s, colores[parte].l); // color por parte
  colores.ojo = hsl(tono + 180, 0.3, 0.12);
  const con = usa('contraste', `${p.armonia}|${p.fondo}|${p.animo}`);
  colores.contorno = hsl(tono, 0.3, con[0]);

  // patrón
  let patron = p.patron ?? tipo.patron;
  const pf = usa('patronFam', `${f.id}|${patron}`);
  if (!pf[0]) patron = 'liso';
  const pv = usa('patronVar', `${vId}|${patron}`);

  // accesorios
  const pedidos = p.accesorios ?? tipo.acc;
  const accesorios = [];
  for (const id of pedidos) { const r = T.acc[`${f.id}|${id}`]; if (r && r[0]) { accesorios.push({ id, escala: r[1], subir: r[2] }); reglas.push(`acc:${f.id}|${id}`); } }

  // animación y física
  const anim = {};
  for (const a of R.meta.animaciones) { const [amp, fr, sq, bo] = inter1(T.anim, `${f.id}|${a}`, p.peso); anim[a] = { amp, fr, sq, bo }; }
  reglas.push(`anim:${f.id}|*|${Math.round(p.peso * 4)}`);
  const fi = usa('fisica', `${f.id}|${Math.round(clamp(p.peso, 0, 1) * 4)}|${Math.round(clamp(p.altura, 0, 1) * 4)}`);

  const variante = R.meta.variantes.find((v) => v.id === vId);
  return {
    id: `${f.id}|${vId}`, nombre: vId === 'clasico' ? f.nombre : `${f.nombre} ${variante.nombre}`, familia: f, variante: vId, semilla, params: p,
    rig: f.rig, dims, colores, grosor: con[1], patron: { tipo: patron, densidad: pf[1], escala: pf[2], contraste: pv[1] },
    ojoEstilo, cara: { ceja: cara[0], boca: cara[1], parpado: clamp(cara[2] + (ojoEstilo === 'dormilon' ? 0.35 : 0), -0.2, 0.9), mirada: cara[3] },
    accesorios, anim, emisivo: tipo.emisivo, translucido: !!tipo.translucido,
    fisica: { hitW: fi[0], hitH: fi[1], offY: fi[2], masa: fi[3], salto: Math.round(fi[4]), velocidad: Math.round(fi[5]) },
    reglas,
  };
}

// «Sorpréndeme»: parámetros al azar pero guiados por las reglas (afinidades y permitidos).
export function sorpresa(R, semilla, fijo = {}) {
  const r = azar(semilla), T = R.T, M = R.meta;
  const el = (a) => a[Math.floor(r() * a.length)];
  const familia = fijo.familia || el(M.familias).id;
  const variante = fijo.variante || (r() < 0.25 ? 'clasico' : el(M.variantes).id);
  const g = () => clamp(0.5 + (r() + r() + r() - 1.5) * 0.42, 0, 1); // campana centrada en 0.5
  const acc = [...(T.tipo[`${familia}|${variante}`]?.acc || [])];
  for (const a of M.accesorios) if (!acc.includes(a.id) && T.acc[`${familia}|${a.id}`][0] && r() < T.varAcc[`${variante}|${a.id}`][0] * 0.5) acc.push(a.id);
  const patrones = M.patrones.filter((x) => T.patronFam[`${familia}|${x}`][0]);
  const params = {
    altura: g(), peso: g(), cabeza: g(), ojos: g(), brazos: g(), piernas: g(),
    tono: r() < 0.45 ? null : Math.round(r() * 360), armonia: el(M.armonias).id, animo: r() < 0.5 ? 'vivo' : el(M.animos).id,
    expresion: el(M.expresiones), edad: r() < 0.6 ? 'adulto' : el(M.edades),
    patron: r() < 0.5 ? null : el(patrones), accesorios: acc.slice(0, 4),
  };
  return { familia, variante, params, semilla };
}

// Variación cercana: mueve un poco los deslizadores y a veces cambia un rasgo.
export function mutar(R, base, semilla) {
  const r = azar(semilla), M = R.meta, p = { ...PARAMS_BASE, ...base.params };
  const el = (a) => a[Math.floor(r() * a.length)];
  for (const k of ['altura', 'peso', 'cabeza', 'ojos', 'brazos', 'piernas']) p[k] = clamp(p[k] + (r() - 0.5) * 0.55, 0, 1);
  const base0 = R.T.tipo[`${base.familia}|${base.variante}`].tono;
  p.tono = Math.round(((p.tono ?? base0) + (r() - 0.5) * 110 + 360) % 360);
  if (r() < 0.5) p.armonia = el(M.armonias).id;
  if (r() < 0.35) p.animo = el(M.animos).id;
  if (r() < 0.5) p.expresion = el(M.expresiones);
  if (r() < 0.4) p.patron = el(M.patrones.filter((x) => R.T.patronFam[`${base.familia}|${x}`][0]));
  return { familia: base.familia, variante: base.variante, params: p, semilla };
}
