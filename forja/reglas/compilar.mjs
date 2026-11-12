#!/usr/bin/env node
// Forja · compilador de reglas. Expande reglas/base.mjs a tablas concretas (clave -> valores) que el motor
// consulta e interpola. Valida cada regla y falla si algo queda fuera de rango o si el total baja de 10 000.
//   node reglas/compilar.mjs   ->  web/datos/reglas.json, web/datos/catalogo.json, web/datos/lexico.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from './base.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAL = path.join(AQUI, '..', 'web', 'datos');
fs.mkdirSync(SAL, { recursive: true });

const lerp = (a, b, t) => a + (b - a) * t;
const r3 = (x) => Math.round(x * 1000) / 1000;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const T = {}; // tablas
const errores = [];
const regla = (tabla, clave, valor) => {
  T[tabla] ??= {};
  if (clave in T[tabla]) errores.push(`duplicada ${tabla}:${clave}`);
  const plano = Array.isArray(valor) ? valor : Object.values(valor).flat();
  for (const x of plano) if (typeof x === 'number' && !Number.isFinite(x)) errores.push(`no finito ${tabla}:${clave}`);
  T[tabla][clave] = valor;
};
const rango = (tabla, clave, x, a, b) => { if (x < a || x > b) errores.push(`fuera de rango ${tabla}:${clave} = ${x} (${a}..${b})`); };

const accDe = Object.fromEntries(B.ACCESORIOS.map((a) => [a.id, a]));
const PESO_RIG = { bipedo: 1, cuadrupedo: 1.1, ave: 0.9, flotante: 0.6, blob: 1.2 };

// 1 · tipo: familia x variante (800)
const catalogo = [];
for (const f of B.FAMILIAS) for (const v of B.VARIANTES) {
  const tono = v.dTono == null ? f.tono : (v.id === 'bosque' || v.id === 'dulce' || v.dTono > 60 ? v.dTono : (f.tono * 0.35 + v.dTono * 0.65));
  const acc = [...new Set([...f.fijo, ...v.acc])].filter((id) => accDe[id]?.rigs.includes(f.rig));
  for (const id of [...f.fijo, ...v.acc]) if (!accDe[id]) errores.push(`accesorio desconocido ${id} en ${f.id}|${v.id}`);
  const t = {
    tono: r3((tono + 360) % 360), sat: r3(clamp(f.sat + v.dSat, 0.04, 1)), luz: r3(clamp(f.luz + v.dLuz, 0.14, 0.95)),
    escala: v.escala, kCab: v.kCab, kTw: v.kTw, acc, patron: v.patron || f.patronBase || 'liso',
    emisivo: r3(clamp((f.emisivo || 0) + v.emisivo, 0, 0.8)), translucido: f.translucido || v.translucido ? 1 : 0,
  };
  regla('tipo', `${f.id}|${v.id}`, t);
  const nombre = v.id === 'clasico' ? f.nombre : `${f.nombre} ${v.nombre}`;
  catalogo.push({ id: `${f.id}|${v.id}`, familia: f.id, variante: v.id, nombre });
}

// 2 · proporción: familia x altura x peso (1000). El motor interpola entre clases.
for (const f of B.FAMILIAS) for (let a = 0; a < 5; a++) for (let p = 0; p < 5; p++) {
  const at = a / 4, pt = p / 4;
  const alto = 1 + (lerp(0.7, 1.34, at) - 1) * clamp(f.kAlto, 0.7, 1.3);
  const tw = f.tw * (1 + (lerp(0.7, 1.46, pt) - 1) * clamp(f.kPeso, 0.5, 1.5));
  const th = f.th * lerp(0.92, 1.1, at) * lerp(1.04, 0.95, pt);
  const val = [r3(alto), r3(tw), r3(th), r3(lerp(0.72, 1.32, at) * lerp(1.06, 0.9, pt)), r3(lerp(0.84, 1.16, at)), r3(lerp(1.12, 0.9, at) * lerp(0.97, 1.05, pt))];
  rango('prop', `${f.id}|${a}|${p}`, val[1], 0.2, 2.6);
  regla('prop', `${f.id}|${a}|${p}`, val);
}

// 3 · paleta: variante x armonía x ánimo (600)
for (const v of B.VARIANTES) for (const ar of B.ARMONIAS) for (const an of B.ANIMOS) {
  const k = v.id === 'arcoiris' ? 1.6 : v.id === 'sombra' || v.id === 'fantasmal' ? 0.5 : 1;
  regla('paleta', `${v.id}|${ar.id}|${an.id}`, [...ar.d.map((d) => Math.round(d * k) % 360), r3(an.s), r3(an.l)]);
}

// 4 · pintura: familia x parte x ánimo (1200) -> [índice de color, dLuz, dSat]
for (const f of B.FAMILIAS) for (const [i, parte] of B.PARTES.entries()) for (const an of B.ANIMOS) {
  let dl = [0, 0.17, -0.09, 0.02, 0, 0.02][i], ds = [0, -0.16, 0, 0.06, 0, 0.06][i];
  if (parte === 'panza' && f.panza) { dl = 0.9 - f.luz; ds = -f.sat * 0.8; }
  if (parte === 'extremidad' && f.rig === 'ave') { dl = 0.06; ds = 0.2; }
  if (an.id === 'oscuro') dl *= 0.7;
  regla('pinta', `${f.id}|${parte}|${an.id}`, [i === 4 ? 0 : Math.min(i, 4), r3(dl), r3(ds)]);
}

// 5 · accesorio: familia x accesorio (1200) -> [permitido, escala, subir]
for (const f of B.FAMILIAS) for (const a of B.ACCESORIOS) {
  let ok = a.rigs.includes(f.rig) ? 1 : 0;
  if (a.id === 'burbuja' && (f.cuernos || f.orejas === 'caida')) ok = 0;
  if (a.id === 'cola_extra' && f.cola !== 'ninguna') ok = 0;
  if (a.id === 'alas_extra' && f.alas !== 'ninguna') ok = 0;
  if (a.id === 'cuerno_extra' && f.cuernos) ok = 0;
  if (a.ancla === 'cintura' && (f.rig === 'flotante' || f.torso === 'nube')) ok = 0;
  const esc = a.ancla === 'cabeza' || a.ancla === 'cara' ? f.cab / 0.62 : f.tw / 0.8;
  regla('acc', `${f.id}|${a.id}`, [ok, r3(clamp(esc, 0.6, 1.8)), f.orejas === 'ninguna' ? 0 : 0.02]);
}

// 6 · patrón por familia (440) y por variante (220)
for (const f of B.FAMILIAS) for (const p of B.PATRONES) {
  let ok = 1;
  if (f.id === 'esqueleto' && p !== 'liso') ok = 0;
  if (f.rayas && p === 'liso') ok = 1;
  if (f.translucido && ['placas', 'escamas'].includes(p)) ok = 0;
  const dens = p === 'liso' ? 0 : r3(clamp(0.5 * f.tw + (f.rig === 'cuadrupedo' ? 0.2 : 0.1), 0.2, 1));
  regla('patronFam', `${f.id}|${p}`, [ok, dens, r3(f.rig === 'blob' ? 1.3 : 1)]);
}
for (const v of B.VARIANTES) for (const p of B.PATRONES) {
  const afin = v.patron === p ? 1 : p === 'liso' ? 0.5 : 0.2;
  regla('patronVar', `${v.id}|${p}`, [afin, r3(v.id === 'sombra' ? 0.12 : v.id === 'dulce' ? 0.18 : 0.26)]);
}

// 7 · animación: familia x animación x peso (800) -> [amplitud, frecuencia, aplastado, rebote]
const BASE_ANIM = { quieto: [0.05, 1.1, 0.02, 0.02], caminar: [0.62, 2.2, 0.04, 0.05], correr: [0.95, 3.2, 0.05, 0.09], saltar: [0.9, 1.2, 0.2, 0.75], golpe: [1.2, 1.6, 0.08, 0.04],
  dano: [0.5, 2.4, 0.1, 0.05], morir: [1, 0.8, 0.15, 0], celebrar: [0.8, 1.5, 0.12, 0.4], agachado: [0.3, 1, 0.3, 0.01] };
for (const f of B.FAMILIAS) for (const an of B.ANIMACIONES) for (let p = 0; p < 5; p++) {
  const [amp, fr, sq, bo] = BASE_ANIM[an], pt = p / 4, k = PESO_RIG[f.rig];
  const val = [r3(amp * lerp(1.12, 0.84, pt) * (f.rig === 'flotante' ? 0.7 : 1)), r3(fr * lerp(1.22, 0.74, pt) / Math.sqrt(k)),
    r3(sq * lerp(0.7, 1.5, pt) * (f.rig === 'blob' || f.translucido ? 1.7 : 1)), r3(bo * lerp(1.2, 0.72, pt) * (f.rig === 'flotante' ? 1.8 : 1))];
  rango('anim', `${f.id}|${an}|${p}`, val[1], 0.3, 6);
  regla('anim', `${f.id}|${an}|${p}`, val);
}

// 8 · cara: familia x expresión (320) -> [ángulo de ceja, boca, párpado, mirada]
const EXP = { feliz: [0, 1, 0, 0], serio: [0, 0, 0.12, 0], enojado: [0.5, -0.6, 0.3, 0], sorpresa: [-0.25, 2, -0.15, 0], dormido: [0, 0, 0.85, 0], travieso: [0.3, 1, 0.2, 0.3], triste: [-0.45, -1, 0.25, -0.1], valiente: [0.32, 0.5, 0.1, 0] };
for (const f of B.FAMILIAS) for (const e of B.EXPRESIONES) {
  const k = f.ojo === 'robot' || f.ojo === 'visor' ? 0.4 : 1;
  regla('cara', `${f.id}|${e}`, [r3(EXP[e][0] * k), EXP[e][1], r3(EXP[e][2] * k), EXP[e][3]]);
}

// 9 · ojos: familia x estilo (320) -> [permitido, radio, separación, altura]
for (const f of B.FAMILIAS) for (const o of B.OJOS) {
  const maquina = f.ojo === 'robot' || f.ojo === 'visor';
  const ok = (o === 'robot' || o === 'visor') ? (maquina || f.id === 'golem' || f.id === 'astronauta' ? 1 : 0) : (maquina ? 0 : 1);
  const radio = { redondo: 0.2, ovalado: 0.26, enojado: 0.2, dormilon: 0.2, hueco: 0.19, robot: 0.17, visor: 0.2, saltones: 0.25 }[o];
  regla('ojo', `${f.id}|${o}`, [ok, radio, r3(o === 'saltones' ? 0.44 : 0.36), r3(o === 'saltones' ? 0.72 : 0.12)]);
}

// 10 · variante x accesorio (600) -> afinidad para «sorpréndeme»
for (const v of B.VARIANTES) for (const a of B.ACCESORIOS) {
  regla('varAcc', `${v.id}|${a.id}`, [v.acc.includes(a.id) ? 1 : ['lazo', 'collar', 'bufanda', 'gorro', 'lentes', 'flor'].includes(a.id) ? 0.18 : 0.06]);
}

// 11 · silueta: familia x edad x altura (800) -> [k cabeza, k ojos, k piernas]
const EDAD = { bebe: [1.3, 1.25, 0.72], joven: [1.1, 1.08, 0.94], adulto: [1, 1, 1], anciano: [1.04, 0.9, 0.9] };
for (const f of B.FAMILIAS) for (const e of B.EDADES) for (let a = 0; a < 5; a++) {
  const [c, o, p] = EDAD[e], at = a / 4;
  regla('silueta', `${f.id}|${e}|${a}`, [r3(c * lerp(1.06, 0.95, at)), r3(o * lerp(1.05, 0.96, at)), r3(p * lerp(0.9, 1.1, at))]);
}

// 12 · contraste: armonía x fondo x ánimo (240) -> [luz del contorno, grosor]
const LUZ_FONDO = { noche: 0.1, bosque: 0.3, cielo: 0.75, desierto: 0.7, nieve: 0.94, cueva: 0.14, ciudad: 0.4, lava: 0.25 };
for (const ar of B.ARMONIAS) for (const fo of B.FONDOS) for (const an of B.ANIMOS) {
  const oscuro = LUZ_FONDO[fo] < 0.35;
  regla('contraste', `${ar.id}|${fo}|${an.id}`, [oscuro && an.id === 'oscuro' ? 0.92 : 0.07, r3((an.id === 'pastel' ? 0.03 : 0.036) * (ar.id === 'mono' ? 1.15 : 1))]);
}

// 13 · sprite: familia x tamaño x animación (640) -> [cuadros, fps, pivote Y, margen]
for (const f of B.FAMILIAS) for (const t of B.TAMANOS) for (const an of B.ANIMACIONES) {
  const cuadros = { quieto: 6, caminar: 8, correr: 8, saltar: 8, golpe: 6, dano: 4, morir: 8, celebrar: 8, agachado: 4 }[an];
  regla('sprite', `${f.id}|${t}|${an}`, [cuadros, { quieto: 6, caminar: 12, correr: 16, saltar: 10, golpe: 14, dano: 10, morir: 10, celebrar: 12, agachado: 6 }[an], f.rig === 'flotante' ? 0.82 : 0.96, t <= 64 ? 3 : Math.round(t * 0.06)]);
}

// 14 · física para Phaser: familia x peso x altura (1000) -> [hitbox ancho, alto, desfase Y, masa, salto, velocidad]
for (const f of B.FAMILIAS) for (let p = 0; p < 5; p++) for (let a = 0; a < 5; a++) {
  const [alto, tw, th, pk] = T.prop[`${f.id}|${a}|${p}`];
  const h = alto * (th + f.cab * 1.2 + (f.rig === 'bipedo' || f.rig === 'ave' ? f.pierna * pk : f.pierna * pk * 0.6));
  const masa = r3(tw * tw * th * alto ** 3 * PESO_RIG[f.rig]);
  regla('fisica', `${f.id}|${p}|${a}`, [r3(clamp(tw * alto * 0.5 / h, 0.2, 0.8)), 0.9, 0.08, masa,
    r3(clamp(520 - masa * 90 + a * 14, 260, 640)), r3(clamp(250 - masa * 46 + a * 10 + (f.rig === 'flotante' ? -30 : 0), 90, 320))]);
}

// 16 · sonido: familia x efecto -> [frecuencia Hz, duración s, onda (0 seno, 1 cuadrada, 2 sierra, 3 triángulo), barrido en octavas, ruido]
const BASE_SON = { salto: [420, 0.22, 1, 1, 0], golpe: [160, 0.14, 2, -1.2, 0.5], dano: [300, 0.25, 1, -0.8, 0.2], moneda: [990, 0.3, 0, 0.4, 0], morir: [260, 0.7, 2, -2, 0.15], celebrar: [520, 0.6, 1, 1.2, 0], paso: [90, 0.06, 3, -0.5, 0.7] };
for (const f of B.FAMILIAS) for (const so of B.SONIDOS) {
  const [fr, du, on, ba, ru] = BASE_SON[so], k = clamp(1.3 - 0.3 * f.kPeso * PESO_RIG[f.rig], 0.6, 1.5);
  const onda = so === 'moneda' ? 0 : f.ojo === 'robot' || f.ojo === 'visor' ? 1 : f.rig === 'flotante' ? 0 : f.rig === 'blob' ? 3 : on;
  regla('sonido', `${f.id}|${so}`, [Math.round(fr * (so === 'moneda' ? 1 : k)), r3(du * (so === 'paso' ? 1 : lerp(1.15, 0.9, k - 0.6))), onda, ba, r3(f.rig === 'blob' && so === 'paso' ? 0.3 : ru)]);
  rango('sonido', `${f.id}|${so}`, T.sonido[`${f.id}|${so}`][0], 40, 2000);
}

// 17 · objetos: objeto x variante -> [tono, saturación, luz, emisivo]. Los tesoros conservan su color; lo mágico toma el del mundo.
const BASE_OBJ = { moneda: [46, 0.9, 0.56, 0.2], gema: [190, 0.8, 0.6, 0.3], corazon: [352, 0.85, 0.56, 0.1], llave: [44, 0.75, 0.6, 0.1], cofre: [28, 0.55, 0.36, 0], pocion: [300, 0.8, 0.58, 0.3], estrella: [50, 0.95, 0.6, 0.4], bomba: [240, 0.12, 0.2, 0], proyectil: [20, 0.95, 0.58, 0.7], meta: [130, 0.7, 0.5, 0.1] };
for (const o of B.OBJETOS) for (const v of B.VARIANTES) {
  const [h, sa, l, e] = BASE_OBJ[o], magico = ['gema', 'pocion', 'proyectil', 'meta'].includes(o) && v.dTono != null;
  regla('objeto', `${o}|${v.id}`, [magico ? v.dTono : h, r3(clamp(sa + v.dSat * 0.4, 0.05, 1)), r3(clamp(l + v.dLuz * 0.3, 0.15, 0.9)), r3(clamp(e + v.emisivo, 0, 0.9))]);
}

// 18 · escenario: ambiente x hora x capa -> color [tono, saturación, luz]
const AMB = { noche: [250, 0.45, 0.3], bosque: [135, 0.5, 0.36], cielo: [205, 0.7, 0.66], desierto: [34, 0.65, 0.62], nieve: [205, 0.3, 0.86], cueva: [270, 0.18, 0.24], ciudad: [235, 0.3, 0.42], lava: [12, 0.75, 0.36] };
const HORA = { dia: [0, 1, 1.12], tarde: [-22, 1.15, 0.92], noche: [18, 0.7, 0.5], amanecer: [-38, 0.9, 1.04] };
const CAPA = { cielo: [0, 1, 1.25], lejos: [8, 0.7, 1.02], medio: [0, 0.85, 0.8], cerca: [-6, 0.9, 0.58], suelo: [-14, 0.8, 0.7], plataforma: [-14, 0.7, 0.86] };
for (const [am, [h, sa, l]] of Object.entries(AMB)) for (const ho of B.HORAS) for (const ca of B.CAPAS) {
  const [dh, ks, kl] = HORA[ho], [ch, cs, cl] = CAPA[ca];
  regla('escenario', `${am}|${ho}|${ca}`, [Math.round((h + (ca === 'cielo' ? dh : dh * 0.4) + ch + 360) % 360), r3(clamp(sa * ks * cs, 0.04, 1)), r3(clamp(l * kl * cl, 0.06, 0.95))]);
}
// 19 · relieve: ambiente x capa -> [forma (0 colinas, 1 picos, 2 torres, 3 dunas, 4 estalactitas), altura, densidad, rugosidad]
const REL = { noche: [0, 0.4, 0.5, 0.4], bosque: [0, 0.45, 0.9, 0.5], cielo: [0, 0.3, 0.4, 0.3], desierto: [3, 0.32, 0.5, 0.2], nieve: [1, 0.55, 0.6, 0.7], cueva: [4, 0.5, 0.8, 0.8], ciudad: [2, 0.6, 0.9, 0.1], lava: [1, 0.5, 0.6, 0.9] };
for (const [am, [fo, al, de, ru]] of Object.entries(REL)) for (const [i, ca] of ['lejos', 'medio', 'cerca'].entries()) regla('relieve', `${am}|${ca}`, [fo, r3(al * [1, 0.72, 0.4][i]), r3(de * [0.6, 1, 0.7][i]), ru]);

// 15 · modificadores de texto: una regla por palabra y por sinónimo
const quitaTildes = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n');
for (const md of B.MODIFICADORES) for (const pal of [md.pal, ...md.sin]) regla('modificador', quitaTildes(pal), md.cambio);

// ---- validación y salida
if (catalogo.length < 800 || catalogo.length !== B.FAMILIAS.length * B.VARIANTES.length) errores.push(`tipos: ${catalogo.length}, se esperaban ${B.FAMILIAS.length * B.VARIANTES.length} (mínimo 800)`);
const cuenta = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, Object.keys(v).length]));
const total = Object.values(cuenta).reduce((s, x) => s + x, 0);
if (total < 10000) errores.push(`solo ${total} reglas: el mínimo es 10 000`);
if (errores.length) { console.error(errores.slice(0, 20).join('\n')); console.error(`${errores.length} error(es)`); process.exit(1); }

const meta = {
  total, cuenta, tipos: catalogo.length,
  familias: B.FAMILIAS, variantes: B.VARIANTES.map(({ id, nombre }) => ({ id, nombre })),
  accesorios: B.ACCESORIOS.map(({ id, nombre, ancla }) => ({ id, nombre, ancla })), patrones: B.PATRONES,
  armonias: B.ARMONIAS.map(({ id, nombre }) => ({ id, nombre })), animos: B.ANIMOS.map(({ id, nombre }) => ({ id, nombre })),
  sonidos: B.SONIDOS, objetos: B.OBJETOS, horas: B.HORAS, capas: B.CAPAS,
  expresiones: B.EXPRESIONES, ojos: B.OJOS, edades: B.EDADES, fondos: B.FONDOS, tamanos: B.TAMANOS, animaciones: B.ANIMACIONES, partes: B.PARTES,
};
fs.writeFileSync(path.join(SAL, 'reglas.json'), JSON.stringify({ meta, T }));
fs.writeFileSync(path.join(SAL, 'catalogo.json'), JSON.stringify(catalogo));
// léxico para el intérprete (coincidencia exacta de palabras) y textos para los embeddings
const lexico = {
  familias: B.FAMILIAS.map((f) => ({ id: f.id, pal: [f.id, f.nombre, ...f.sin].map(quitaTildes), desc: f.desc })),
  variantes: B.VARIANTES.filter((v) => v.id !== 'clasico').map((v) => ({ id: v.id, pal: [v.id, v.nombre, ...v.sin].map(quitaTildes), desc: v.desc })),
  accesorios: B.ACCESORIOS.map((a) => ({ id: a.id, pal: [a.nombre, ...a.sin].map(quitaTildes), desc: `con ${a.nombre.toLowerCase()}` })),
  modificadores: Object.keys(T.modificador),
};
fs.writeFileSync(path.join(SAL, 'lexico.json'), JSON.stringify(lexico));
console.log(Object.entries(cuenta).map(([k, v]) => `${k.padEnd(12)} ${v}`).join('\n'));
console.log(`TOTAL ${total} reglas · ${catalogo.length} tipos · reglas.json ${(fs.statSync(path.join(SAL, 'reglas.json')).size / 1024).toFixed(0)} KB`);
