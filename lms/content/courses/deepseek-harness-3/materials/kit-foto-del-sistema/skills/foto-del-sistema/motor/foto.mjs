#!/usr/bin/env node
// foto.mjs · «foto del sistema»: inventario verificable y reproducible de un sistema web (SPA).
// Sin dependencias. Funciona con Bun y con Node >= 20.
//
// Uso:  node foto.mjs <carpeta-del-sistema> [--salida FOTO] [--fecha AAAA-MM-DD] [--silencio]
//   Deja FOTO/FOTO.json, FOTO/FOTO.md y FOTO/hashes.txt (formato sha256sum).
//   Una ruta relativa de --salida se toma dentro de la carpeta del sistema.
//
// Determinista: mismo árbol de archivos -> mismos bytes. La única marca de tiempo es
// `captura.fecha` (día) en el JSON, fuera de la huella global y fuera del .md.
// Lo que sale de patrones (regex) son PISTAS, no conclusiones: cada una lleva archivo:línea.
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative, sep, extname, isAbsolute, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const VERSION = '1.0';
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const rec = (s, n = 150) => { s = String(s).trim().replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const uniq = (a) => [...new Set(a)];
const PISTA = 'Pista automática: verifícala en el archivo antes de afirmarla.';

// ───────────────────────── argumentos ─────────────────────────
function parseArgs(argv) {
  const o = { carpeta: null, salida: 'FOTO', fecha: null, silencio: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--salida' || a === '-s') o.salida = argv[++i];
    else if (a === '--fecha') o.fecha = argv[++i];
    else if (a === '--silencio') o.silencio = true;
    else if (a === '--help' || a === '-h') { o.ayuda = true; }
    else if (a.startsWith('--')) { console.error('opción desconocida: ' + a); process.exit(2); }
    else if (!o.carpeta) o.carpeta = a;
    else { console.error('sobra el argumento: ' + a); process.exit(2); }
  }
  return o;
}
const opts = parseArgs(process.argv.slice(2));
if (opts.ayuda || !opts.carpeta) {
  console.error('uso: foto.mjs <carpeta-del-sistema> [--salida FOTO] [--fecha AAAA-MM-DD] [--silencio]');
  process.exit(opts.ayuda ? 0 : 2);
}
const RAIZ = resolve(opts.carpeta);
if (!existsSync(RAIZ) || !statSync(RAIZ).isDirectory()) { console.error('no existe la carpeta: ' + RAIZ); process.exit(1); }
const SALIDA = isAbsolute(opts.salida) ? opts.salida : join(RAIZ, opts.salida);

// ───────────────────────── inventario ─────────────────────────
const IGN_DIR = new Set(['node_modules', '.git', '__MACOSX']);
const IGN_RAIZ_DIR = new Set(['FOTO', 'docs', 'skills']); // lo que añade el alumno o su agente: no es parte del sistema
const IGN_RAIZ_ARCH = new Set(['AGENTS.md']);
const TEXTO = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.txt', '.md', '.svg', '.csv', '.xml']);
const TIPO = { '.html': 'html', '.htm': 'html', '.css': 'css', '.js': 'js', '.mjs': 'js', '.json': 'json', '.txt': 'texto', '.md': 'texto', '.csv': 'datos', '.xml': 'xml', '.svg': 'imagen', '.png': 'imagen', '.jpg': 'imagen', '.jpeg': 'imagen', '.gif': 'imagen', '.ico': 'imagen', '.webp': 'imagen', '.woff': 'fuente', '.woff2': 'fuente', '.ttf': 'fuente', '.otf': 'fuente', '.eot': 'fuente', '.zip': 'zip', '.pdf': 'pdf' };
const MAX_ANALISIS = 2 * 1024 * 1024;

function recorrer() {
  const out = [];
  (function rec_(dir) {
    const ents = readdirSync(dir, { withFileTypes: true }).sort((a, b) => cmp(a.name, b.name));
    for (const e of ents) {
      if (e.name.startsWith('.') || e.isSymbolicLink()) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (IGN_DIR.has(e.name)) continue;
        if (dir === RAIZ && IGN_RAIZ_DIR.has(e.name)) continue;
        if (resolve(p) === resolve(SALIDA)) continue;
        rec_(p);
      } else if (e.isFile()) {
        if (dir === RAIZ && IGN_RAIZ_ARCH.has(e.name)) continue;
        out.push(p);
      }
    }
  })(RAIZ);
  return out;
}

const archivos = [];
for (const p of recorrer()) {
  const ruta = relative(RAIZ, p).split(sep).join('/');
  const buf = readFileSync(p);
  const ext = extname(ruta).toLowerCase();
  const esTexto = TEXTO.has(ext);
  let texto = null, lineas = null;
  if (esTexto) {
    texto = buf.toString('utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    lineas = texto === '' ? 0 : texto.split('\n').length - (texto.endsWith('\n') ? 1 : 0);
  }
  archivos.push({ ruta, tipo: TIPO[ext] || 'otro', bytes: buf.length, lineas, sha256: sha(buf), texto, ext });
}
archivos.sort((a, b) => cmp(a.ruta, b.ruta));
const hashesTxt = archivos.map((a) => a.sha256 + '  ' + a.ruta + '\n').join('');
const HUELLA = sha(hashesTxt);

// ───────────────────────── escáneres (preservan líneas) ─────────────────────────
class Lineas {
  constructor(t) { this.s = [0]; for (let i = 0; i < t.length; i++) if (t.charCodeAt(i) === 10) this.s.push(i + 1); }
  linea(idx) { let lo = 0, hi = this.s.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.s[m] <= idx) lo = m; else hi = m - 1; } return lo + 1; }
}
const PAL_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'instanceof']);
// code: sin comentarios; nostr: sin comentarios ni contenido de cadenas/regex. Devuelve también líneas con acento grave.
function escanearJS(s) {
  const n = s.length, a = new Array(n), b = new Array(n), plant = [];
  let i = 0, ult = '', pal = '', linea = 1;
  const blanco = (c) => (c === '\n' ? '\n' : ' ');
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '\n') { linea++; a[i] = b[i] = c; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && s[i] !== '\n') { a[i] = b[i] = ' '; i++; } continue; }
    if (c === '/' && d === '*') {
      a[i] = b[i] = ' '; a[i + 1] = b[i + 1] = ' '; i += 2;
      while (i < n && !(s[i] === '*' && s[i + 1] === '/')) { if (s[i] === '\n') linea++; a[i] = b[i] = blanco(s[i]); i++; }
      if (i < n) { a[i] = b[i] = ' '; a[i + 1] = b[i + 1] = ' '; i += 2; }
      continue;
    }
    if (c === '"' || c === "'") {
      a[i] = b[i] = c; i++;
      while (i < n && s[i] !== c && s[i] !== '\n') {
        if (s[i] === '\\') { a[i] = s[i]; b[i] = ' '; i++; if (i < n) { if (s[i] === '\n') linea++; a[i] = s[i]; b[i] = blanco(s[i]); i++; } continue; }
        a[i] = s[i]; b[i] = ' '; i++;
      }
      if (i < n && s[i] === c) { a[i] = b[i] = c; i++; }
      ult = c; pal = ''; continue;
    }
    if (c === '`') {
      plant.push(linea); a[i] = b[i] = c; i++;
      while (i < n && s[i] !== '`') {
        if (s[i] === '\\') { a[i] = s[i]; b[i] = ' '; i++; if (i < n) { if (s[i] === '\n') linea++; a[i] = s[i]; b[i] = blanco(s[i]); i++; } continue; }
        if (s[i] === '\n') linea++;
        a[i] = s[i]; b[i] = blanco(s[i]); i++;
      }
      if (i < n) { a[i] = b[i] = '`'; i++; }
      ult = '`'; pal = ''; continue;
    }
    if (c === '/') {
      const regexOk = ult === '' || '(,=:[!&|?{};+-*%<>~^'.includes(ult) || (/[\w$]/.test(ult) && PAL_REGEX.has(pal));
      if (regexOk) {
        a[i] = b[i] = c; i++; let cls = false;
        while (i < n && s[i] !== '\n' && (cls || s[i] !== '/')) {
          if (s[i] === '\\') { a[i] = s[i]; b[i] = ' '; i++; if (i < n && s[i] !== '\n') { a[i] = s[i]; b[i] = ' '; i++; } continue; }
          if (s[i] === '[') cls = true; else if (s[i] === ']') cls = false;
          a[i] = s[i]; b[i] = ' '; i++;
        }
        if (i < n && s[i] === '/') { a[i] = b[i] = '/'; i++; }
        while (i < n && /[a-z]/i.test(s[i])) { a[i] = b[i] = s[i]; i++; }
        ult = ')'; pal = ''; continue;
      }
    }
    a[i] = b[i] = c;
    if (!/\s/.test(c)) { ult = c; if (/[\w$]/.test(c)) pal = /[\w$]/.test(s[i - 1] || '') ? pal + c : c; else pal = ''; }
    i++;
  }
  return { code: a.join(''), nostr: b.join(''), plant };
}
function limpiarCSS(s) { return s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')); }
const blancoSalvoNL = (m) => m.replace(/[^\n]/g, ' ');

// ───────────────────────── fuentes ─────────────────────────
const fjs = [];   // vistas tipo JS (archivos .js e <script> en línea de HTML)
const fcss = [];  // vistas tipo CSS (archivos .css y <style> en línea)
const fhtml = []; // HTML limpio de comentarios
function nuevaFuenteJS(ruta, texto) {
  const e = escanearJS(texto);
  fjs.push({ ruta, orig: texto.split('\n'), code: e.code.split('\n'), nostr: e.nostr.split('\n'), plant: e.plant });
}
for (const a of archivos) {
  if (a.texto == null || a.bytes > MAX_ANALISIS) continue;
  if (a.tipo === 'js') nuevaFuenteJS(a.ruta, a.texto);
  else if (a.tipo === 'css') { const c = limpiarCSS(a.texto); fcss.push({ ruta: a.ruta, orig: a.texto.split('\n'), code: c.split('\n') }); }
  else if (a.tipo === 'html') {
    const limpio = a.texto.replace(/<!--[\s\S]*?-->/g, blancoSalvoNL);
    fhtml.push({ ruta: a.ruta, texto: a.texto, limpio, L: new Lineas(a.texto) });
    let js = limpio.replace(/[^\n]/g, ' ').split(''), css = js.slice(), hayJs = false, hayCss = false;
    const rs = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m;
    while ((m = rs.exec(limpio))) {
      if (/\bsrc\s*=/i.test(m[1]) || /type\s*=\s*["']?(application\/json|text\/template|text\/x-)/i.test(m[1])) continue;
      const ini = m.index + m[0].indexOf('>') + 1;
      for (let k = 0; k < m[2].length; k++) js[ini + k] = limpio[ini + k]; hayJs = true;
    }
    const rc = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = rc.exec(limpio))) { const ini = m.index + m[0].indexOf('>') + 1; for (let k = 0; k < m[1].length; k++) css[ini + k] = limpio[ini + k]; hayCss = true; }
    if (hayJs) nuevaFuenteJS(a.ruta, js.join(''));
    if (hayCss) { const t = limpiarCSS(css.join('')); fcss.push({ ruta: a.ruta, orig: a.texto.split('\n'), code: t.split('\n') }); }
  }
}
const orden = new Map(archivos.map((a, i) => [a.ruta, i]));
fjs.sort((x, y) => orden.get(x.ruta) - orden.get(y.ruta));
fcss.sort((x, y) => orden.get(x.ruta) - orden.get(y.ruta));

function hallar(fuentes, re, vista = 'code', { max = 60, excluir = null } = {}) {
  const hits = [];
  for (const f of fuentes) {
    if (excluir && excluir(f)) continue;
    const L = f[vista];
    for (let i = 0; i < L.length; i++) {
      if (!L[i]) continue;
      const m = re.exec(L[i]);
      if (m) { hits.push({ archivo: f.ruta, linea: i + 1, texto: rec(f.orig[i]), m }); if (hits.length >= max) return hits; }
    }
  }
  return hits;
}
function todos(fuentes, reG, vista = 'code', { max = 200, excluir = null } = {}) {
  const hits = [];
  for (const f of fuentes) {
    if (excluir && excluir(f)) continue;
    const L = f[vista];
    for (let i = 0; i < L.length; i++) {
      if (!L[i]) continue;
      for (const m of L[i].matchAll(reG)) { hits.push({ archivo: f.ruta, linea: i + 1, texto: rec(f.orig[i]), m }); if (hits.length >= max) return hits; }
    }
  }
  return hits;
}
const ev = (hits, n = 5) => { const v = new Set(), out = []; for (const h of hits) { const k = h.archivo + ':' + h.linea; if (v.has(k)) continue; v.add(k); out.push({ archivo: h.archivo, linea: h.linea, texto: h.texto }); if (out.length >= n) break; } return out; };
const refe = (h) => h.archivo + ':' + h.linea;

// ───────────────────────── config (window.SISTEMA) en sandbox ─────────────────────────
const cfgArchivo = (() => {
  const pref = archivos.find((a) => a.ruta === 'js/config.js' && a.texto != null);
  if (pref) return pref;
  return archivos.find((a) => a.tipo === 'js' && a.texto != null && /window\.SISTEMA\s*=/.test(a.texto)) || null;
})();
let SIS = null, cfgError = null;
if (cfgArchivo) {
  try {
    const sb = { console: { log() {}, warn() {}, error() {}, info() {} }, navigator: { userAgent: 'foto' }, document: {}, location: { hash: '' } };
    sb.window = sb; sb.self = sb; sb.globalThis = sb;
    const ctx = vm.createContext(sb, { codeGeneration: { strings: false, wasm: false } });
    vm.runInContext(cfgArchivo.texto, ctx, { timeout: 1500, filename: cfgArchivo.ruta });
    SIS = sb.SISTEMA || null;
    if (!SIS || typeof SIS !== 'object') { cfgError = 'el archivo no define window.SISTEMA como objeto'; SIS = null; }
  } catch (e) { cfgError = String(e && e.message || e).slice(0, 200); SIS = null; }
}
const CFG_RUTA = cfgArchivo ? cfgArchivo.ruta : null;
const cfgL = cfgArchivo ? new Lineas(cfgArchivo.texto) : null;
const arr = (x) => (Array.isArray(x) ? x : []);
const esFn = (x) => typeof x === 'function';
const dedent = (s) => {
  const ls = s.split('\n'); if (ls.length < 2) return s;
  let min = Infinity; for (const l of ls.slice(1)) { if (!l.trim()) continue; min = Math.min(min, l.match(/^\s*/)[0].length); }
  if (!isFinite(min) || min === 0) return s;
  return [ls[0], ...ls.slice(1).map((l) => l.slice(Math.min(min, l.match(/^\s*/)[0].length)))].join('\n');
};
function posDe(re, desde = 0) { if (!cfgArchivo) return -1; const t = cfgArchivo.texto.slice(desde); const m = re.exec(t); return m ? desde + m.index : -1; }
const lineaPos = (p) => (p >= 0 && cfgL ? cfgL.linea(p) : null);
const esc_re = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function fn(f, desde, extra = {}) {
  if (!esFn(f)) return null;
  const codigo = Function.prototype.toString.call(f);
  let idx = cfgArchivo.texto.indexOf(codigo, Math.max(0, desde)); if (idx < 0) idx = cfgArchivo.texto.indexOf(codigo);
  const c = dedent(codigo);
  return { ...extra, archivo: CFG_RUTA, linea: idx < 0 ? null : cfgL.linea(idx), lineas_n: c.split('\n').length, codigo: c };
}
function normCampo(c, desde) {
  const p = posDe(new RegExp('\\bid\\s*:\\s*[\'"]' + esc_re(c.id) + '[\'"]'), desde);
  const o = { id: c.id, etiqueta: c.etiqueta ?? null, tipo: c.tipo ?? null, requerido: !!c.requerido, unico: !!c.unico };
  for (const k of ['min', 'max', 'patron', 'defecto']) if (c[k] !== undefined) o[k] = c[k];
  if (Array.isArray(c.opciones)) o.opciones = c.opciones.slice();
  if (c.tipo === 'ref') o.ref = { entidad: c.entidad ?? null, mostrar: c.mostrar ?? null };
  o.linea = lineaPos(p);
  return o;
}
const ACCIONES_ENT = ['ver', 'crear', 'editar', 'eliminar'];
function normPermisos(p) { const o = {}; if (p && typeof p === 'object') for (const k of Object.keys(p)) o[k] = arr(p[k]).slice(); return o; }

const modelo = { entidades: [], operaciones: [], reportes: [], tablero: [], tableroGrafico: null, parametros: [], roles: [], usuarios: [], formulas: [], seguridadCfg: null, semillas: {} };
if (SIS) {
  const secEnt = posDe(/\bentidades\s*:/), secOp = posDe(/\boperaciones\s*:/), secRep = posDe(/\breportes\s*:/), secTab = posDe(/\btablero\s*:/);
  const secRol = posDe(/\broles\s*:/), secUsu = posDe(/\busuarios\s*:/), secPar = posDe(/\bparametros\s*:/);
  modelo.semillas = {};
  if (SIS.semillas && typeof SIS.semillas === 'object') for (const k of Object.keys(SIS.semillas)) modelo.semillas[k] = arr(SIS.semillas[k]).length;
  modelo.parametros = arr(SIS.parametros).map((p) => ({ id: p.id, etiqueta: p.etiqueta ?? null, tipo: p.tipo ?? null, valor: p.valor ?? null, linea: lineaPos(posDe(new RegExp('\\bid\\s*:\\s*[\'"]' + esc_re(p.id) + '[\'"]'), Math.max(secPar, 0))) }));
  modelo.roles = arr(SIS.roles).map((r) => ({ id: r.id, nombre: r.nombre ?? null, descripcion: r.descripcion ?? null, linea: lineaPos(posDe(new RegExp('\\bid\\s*:\\s*[\'"]' + esc_re(r.id) + '[\'"]'), Math.max(secRol, 0))) }));
  modelo.usuarios = arr(SIS.usuarios).map((u) => ({ usuario: u.usuario, nombre: u.nombre ?? null, rol: u.rol ?? null, clave: u.clave === undefined ? null : String(u.clave), linea: lineaPos(posDe(new RegExp('\\busuario\\s*:\\s*[\'"]' + esc_re(u.usuario) + '[\'"]'), Math.max(secUsu, 0))) }));
  const addF = (tipo, dueno, id, etiqueta, f, vt = null) => { if (f) modelo.formulas.push({ tipo, dueno, id, etiqueta, valor_tipo: vt, archivo: f.archivo, linea: f.linea, lineas_n: f.lineas_n, codigo: f.codigo }); };
  for (const e of arr(SIS.entidades)) {
    const p0 = posDe(new RegExp('\\bid\\s*:\\s*[\'"]' + esc_re(e.id) + '[\'"]'), Math.max(secEnt, 0));
    const o = { id: e.id, nombre: e.nombre ?? null, plural: e.plural ?? null, prefijo: e.prefijo ?? null, archivo: CFG_RUTA, linea: lineaPos(p0), campos: arr(e.campos).map((c) => normCampo(c, p0)), lista: arr(e.lista).slice(), buscar: arr(e.buscar).slice(), calculados: [], reglas: [], permisos: normPermisos(e.permisos), tiene_permisos: !!e.permisos, semillas: modelo.semillas[e.id] ?? 0 };
    for (const c of arr(e.calculados)) { const f = fn(c.formula, p0); const d = { id: c.id, etiqueta: c.etiqueta ?? null, tipo: c.tipo ?? null, archivo: CFG_RUTA, linea: f ? f.linea : null }; o.calculados.push(d); addF('calculado', 'entidad:' + e.id, c.id, c.etiqueta ?? null, f, c.tipo ?? null); }
    for (const r of arr(e.reglas)) { const f = fn(r.validar, p0); o.reglas.push({ id: r.id, mensaje: r.mensaje ?? null, archivo: CFG_RUTA, linea: f ? f.linea : null }); addF('regla', 'entidad:' + e.id, r.id, r.mensaje ?? null, f); }
    modelo.entidades.push(o);
  }
  for (const op of arr(SIS.operaciones)) {
    const p0 = posDe(new RegExp('\\bid\\s*:\\s*[\'"]' + esc_re(op.id) + '[\'"]'), Math.max(secOp, 0));
    const o = { id: op.id, nombre: op.nombre ?? null, plural: op.plural ?? null, prefijo: op.prefijo ?? null, serie: op.serie ?? null, archivo: CFG_RUTA, linea: lineaPos(p0), campos: arr(op.campos).map((c) => normCampo(c, p0)), estados: arr(op.estados).slice(), lineas: null, totales: arr(op.totales).map((t) => ({ id: t.id, etiqueta: t.etiqueta ?? null, fuerte: !!t.fuerte })), permisos: normPermisos(op.permisos), tiene_permisos: !!op.permisos, ganchos: [] };
    if (op.lineas && typeof op.lineas === 'object') o.lineas = { entidad: op.lineas.entidad ?? null, mostrar: op.lineas.mostrar ?? null, precio: op.lineas.precio ?? null, campos: arr(op.lineas.campos).map((c) => normCampo(c, p0)) };
    addF('calcular', 'operacion:' + op.id, 'calcular', 'Totales del documento', fn(op.calcular, p0));
    for (const g of ['alEmitir', 'alAnular', 'alCrear', 'alEditar']) if (esFn(op[g])) { o.ganchos.push(g); addF(g, 'operacion:' + op.id, g, null, fn(op[g], p0)); }
    modelo.operaciones.push(o);
  }
  for (const r of arr(SIS.reportes)) {
    const p0 = posDe(new RegExp('\\bid\\s*:\\s*[\'"]' + esc_re(r.id) + '[\'"]'), Math.max(secRep, 0));
    const f = fn(r.ejecutar, p0);
    modelo.reportes.push({ id: r.id, titulo: r.titulo ?? null, descripcion: r.descripcion ?? null, archivo: CFG_RUTA, linea: lineaPos(p0), roles: Array.isArray(r.roles) ? r.roles.slice() : null, parametros: arr(r.parametros).map((q) => ({ id: q.id, tipo: q.tipo ?? null, defecto: q.defecto ?? null })), ejecutar_linea: f ? f.linea : null });
    addF('reporte', 'reporte:' + r.id, 'ejecutar', r.titulo ?? null, f);
  }
  for (const t of arr(SIS.tablero)) {
    const p0 = posDe(new RegExp('\\btitulo\\s*:\\s*[\'"]' + esc_re(t.titulo) + '[\'"]'), Math.max(secTab, 0));
    const f = fn(t.calcular, p0);
    modelo.tablero.push({ titulo: t.titulo ?? null, tipo: t.tipo ?? null, linea: lineaPos(p0) });
    addF('tablero', 'tablero', t.titulo ?? '', t.titulo ?? null, f);
  }
  if (SIS.tableroGrafico && typeof SIS.tableroGrafico === 'object') {
    const f = fn(SIS.tableroGrafico.calcular, Math.max(secTab, 0));
    modelo.tableroGrafico = { titulo: SIS.tableroGrafico.titulo ?? null, linea: f ? f.linea : null };
    addF('tableroGrafico', 'tablero', 'grafico', SIS.tableroGrafico.titulo ?? null, f);
  }
  modelo.seguridadCfg = SIS.seguridad && typeof SIS.seguridad === 'object' ? { ...SIS.seguridad } : {};
}
const MODO = SIS ? 'sistema' : 'generico';
const idsRol = modelo.roles.map((r) => r.id);

// ───────────────────────── carga de scripts y dependencias externas ─────────────────────────
const attrs = (s) => { const o = {}; for (const m of s.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? true; return o; };
const esExterna = (u) => /^(https?:)?\/\//i.test(u);
const NS_OK = /^https?:\/\/(www\.w3\.org|schemas\.microsoft\.com|purl\.org|www\.opengis\.net)\b/i;
const normRuta = (base, u) => {
  const limpia = String(u).split('#')[0].split('?')[0];
  const partes = (base ? base.split('/').slice(0, -1) : []).concat(limpia.split('/')); const out = [];
  for (const p of partes) { if (p === '' || p === '.') continue; if (p === '..') out.pop(); else out.push(p); }
  return out.join('/');
};
const htmlPrincipal = fhtml.find((h) => h.ruta === 'index.html') || fhtml[0] || null;
const carga = { html: htmlPrincipal ? htmlPrincipal.ruta : null, titulo: null, orden: [], faltan: [], huerfanos: [], manejadores_en_linea: [] };
const deps = [];
const rutasConocidas = new Set(archivos.map((a) => a.ruta));
const metas = [];
for (const h of fhtml) {
  const tt = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(h.limpio);
  if (h === htmlPrincipal && tt) carga.titulo = rec(tt[1], 120);
  let n = 0;
  for (const m of h.limpio.matchAll(/<(script|link|meta|img|iframe|source|video|audio|embed|object|form|a|base)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase(), at = attrs(m[2]), linea = h.L.linea(m.index);
    if (tag === 'meta') { if (h === htmlPrincipal) metas.push({ at, linea, archivo: h.ruta }); continue; }
    const url = tag === 'script' || tag === 'img' || tag === 'iframe' || tag === 'source' || tag === 'video' || tag === 'audio' || tag === 'embed' ? at.src : tag === 'object' ? at.data : tag === 'form' ? at.action : at.href;
    if (tag === 'script' && h === htmlPrincipal) {
      n++;
      if (typeof at.src === 'string') {
        const ext = esExterna(at.src), r = ext ? at.src : normRuta(h.ruta, at.src);
        carga.orden.push({ n: carga.orden.length + 1, tipo: 'script', ruta: r, externo: ext, modulo: String(at.type || '').toLowerCase() === 'module', defer: !!at.defer, async: !!at.async, linea });
        if (!ext && !rutasConocidas.has(r)) carga.faltan.push({ ruta: r, linea });
      } else carga.orden.push({ n: carga.orden.length + 1, tipo: 'en-linea', ruta: null, externo: false, modulo: String(at.type || '').toLowerCase() === 'module', defer: false, async: false, linea });
    }
    if (tag === 'link' && h === htmlPrincipal && /stylesheet/i.test(String(at.rel || '')) && typeof at.href === 'string') {
      const ext = esExterna(at.href), r = ext ? at.href : normRuta(h.ruta, at.href);
      carga.orden.push({ n: carga.orden.length + 1, tipo: 'estilo', ruta: r, externo: ext, modulo: false, defer: false, async: false, linea });
      if (!ext && !rutasConocidas.has(r)) carga.faltan.push({ ruta: r, linea });
    }
    if (typeof url === 'string' && esExterna(url) && !NS_OK.test(url)) deps.push({ tipo: tag === 'a' ? 'enlace' : tag === 'form' ? 'formulario' : tag, destino: url, archivo: h.ruta, linea, carga_recurso: tag !== 'a' });
  }
  for (const m of h.limpio.matchAll(/<[a-z][^>]*\s(on[a-z]+)\s*=\s*["']/gi)) carga.manejadores_en_linea.push({ atributo: m[1].toLowerCase(), archivo: h.ruta, linea: h.L.linea(m.index) });
}
{ const ref = new Set(carga.orden.filter((o) => o.ruta).map((o) => o.ruta)); carga.huerfanos = archivos.filter((a) => (a.tipo === 'js' || a.tipo === 'css') && !ref.has(a.ruta)).map((a) => a.ruta); }
for (const f of fcss) for (const [i, l] of f.code.entries()) { if (!l) continue;
  for (const m of l.matchAll(/(@import\s+(?:url\()?\s*["']?|url\(\s*["']?)(https?:)?(\/\/[^"')\s]+)/gi)) { const u = (m[2] || 'https:') + m[3]; if (!NS_OK.test(u)) deps.push({ tipo: /@import/i.test(m[1]) ? 'css-import' : 'css-url', destino: u, archivo: f.ruta, linea: i + 1, carga_recurso: true }); } }
for (const h of todos(fjs, /['"`](https?:\/\/[^'"`\s)]+|\/\/[a-z0-9.-]+\.[a-z]{2,}[^'"`\s)]*)/gi)) if (!NS_OK.test(h.m[1])) deps.push({ tipo: 'cadena-js', destino: h.m[1], archivo: h.archivo, linea: h.linea, carga_recurso: false });
const llamadasRed = todos(fjs, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|sendBeacon)\b/g, 'nostr');
for (const h of todos(fjs, /\bimport\s*\(/g, 'nostr')) llamadasRed.push({ ...h, m: ['import()', 'import()'] });
deps.sort((a, b) => cmp(a.archivo, b.archivo) || a.linea - b.linea || cmp(a.destino, b.destino));
const depsU = []; { const vistos = new Set(); for (const d of deps) { const k = d.tipo + '|' + d.destino + '|' + d.archivo + '|' + d.linea; if (!vistos.has(k)) { vistos.add(k); depsU.push(d); } } }
const dependencias = {
  resultado: depsU.length === 0 && llamadasRed.length === 0 ? 'ninguna' : (depsU.length ? depsU.length + ' referencia(s) externa(s)' : '') + (llamadasRed.length ? (depsU.length ? ' y ' : '') + llamadasRed.length + ' llamada(s) de red sin URL fija' : ''),
  externas: depsU,
  llamadas_de_red: llamadasRed.slice(0, 40).map((h) => ({ api: h.m[1], archivo: h.archivo, linea: h.linea, texto: h.texto })),
};

// ───────────────────────── almacenamiento ─────────────────────────
const alm = [];
const sinNombre = (e) => e.trim();
for (const h of todos(fjs, /\b(localStorage|sessionStorage)\s*\.\s*(getItem|setItem|removeItem)\s*\(\s*([^,)]+)/g)) alm.push({ mecanismo: h.m[1], operacion: h.m[2], clave: sinNombre(h.m[3]), archivo: h.archivo, linea: h.linea });
for (const h of todos(fjs, /\b(localStorage|sessionStorage)\s*\[\s*([^\]]+)\]/g)) alm.push({ mecanismo: h.m[1], operacion: 'acceso[]', clave: sinNombre(h.m[2]), archivo: h.archivo, linea: h.linea });
for (const h of todos(fjs, /\b(localStorage|sessionStorage)\s*\.\s*(clear|key|length)\b/g)) alm.push({ mecanismo: h.m[1], operacion: h.m[2], clave: '(todas)', archivo: h.archivo, linea: h.linea });
for (const h of todos(fjs, /\bdocument\s*\.\s*cookie\b/g)) alm.push({ mecanismo: 'cookie', operacion: 'acceso', clave: '(cookie)', archivo: h.archivo, linea: h.linea });
for (const h of todos(fjs, /\bindexedDB\s*\.\s*open\s*\(\s*([^,)]+)/g)) alm.push({ mecanismo: 'indexedDB', operacion: 'open', clave: sinNombre(h.m[1]), archivo: h.archivo, linea: h.linea });
for (const h of todos(fjs, /\b(?:window\s*\.\s*)?name\s*=(?!=)/g, 'nostr')) if (/\bwindow\s*\.\s*name\s*=(?!=)/.test(h.texto)) alm.push({ mecanismo: 'window.name', operacion: 'escritura', clave: '(window.name)', archivo: h.archivo, linea: h.linea });
for (const h of todos(fjs, /\bwindow\s*\.\s*name\b(?!\s*=[^=])/g, 'nostr')) alm.push({ mecanismo: 'window.name', operacion: 'lectura', clave: '(window.name)', archivo: h.archivo, linea: h.linea });
alm.sort((a, b) => cmp(a.archivo, b.archivo) || a.linea - b.linea || cmp(a.mecanismo + a.operacion, b.mecanismo + b.operacion));
const almU = []; { const v = new Set(); for (const a of alm) { const k = [a.mecanismo, a.operacion, a.clave, a.archivo, a.linea].join('|'); if (!v.has(k)) { v.add(k); almU.push(a); } } }
const clavesCand = uniq(todos(fjs, /['"]([\w.-]*(?:sis_|_v\d+)[\w.-]*)['"]/g).filter((h) => !/^_v\d+$/.test(h.m[1]) || true).map((h) => h.m[1] + '  @' + refe(h))).sort(cmp);
const almacenamiento = {
  mecanismos: uniq(almU.map((a) => a.mecanismo)).sort(cmp),
  usos: almU,
  claves_candidatas: clavesCand.map((s) => { const [c, r] = s.split('  @'); return { clave: c, evidencia: r }; }),
  nota: almU.length ? 'La clave puede ser una expresión (variable o concatenación): resuélvela leyendo el archivo:línea.' : 'No se encontró uso de localStorage, sessionStorage, cookies ni IndexedDB.',
};

// ───────────────────────── rutas hash ─────────────────────────
const ruLit = todos(fjs, /(['"])(#\/[^'"\s]*)\1/g);
const rutaLiterales = []; { const m = new Map(); for (const h of ruLit) { const k = h.m[2]; if (!m.has(k)) m.set(k, { ruta: k, veces: 0, primera: refe(h) }); m.get(k).veces++; } for (const v of [...m.values()].sort((a, b) => cmp(a.ruta, b.ruta))) rutaLiterales.push(v); }
const enrutador = hallar(fjs, /\bhashchange\b|\blocation\s*\.\s*hash\b|\bwindow\s*\.\s*location\s*\.\s*hash\b/, 'nostr', { max: 12 });
const archivosEnrutador = uniq(enrutador.map((h) => h.archivo));
const ramas = []; {
  const sel = fjs.filter((f) => archivosEnrutador.includes(f.ruta));
  for (const h of todos(sel, /\bcase\s+['"]([\w\-\/:.]+)['"]\s*:/g)) ramas.push({ rama: h.m[1], archivo: h.archivo, linea: h.linea, forma: 'case' });
  for (const h of todos(sel, /\b(ruta|route|partes?|parts?|seg\w*|hash|modulo|vista)\b(?:\s*\[\s*\d\s*\])?\s*[!=]==?\s*['"]([\w\-\/:]+)['"]/g)) if (!/^\s*!/.test(h.m[0])) ramas.push({ rama: h.m[2], archivo: h.archivo, linea: h.linea, forma: 'comparación' });
}
const ramasU = []; { const v = new Set(); for (const r of ramas) { const k = r.rama + '|' + r.archivo + '|' + r.linea; if (!v.has(k)) { v.add(k); ramasU.push(r); } } }
const prefijoEn = (pref) => rutaLiterales.some((r) => r.ruta.startsWith('#/' + pref)) || ramasU.some((r) => r.rama === pref || r.rama === '/' + pref) || !!hallar(fjs, new RegExp('[\'"]/?' + esc_re(pref) + '(/|[\'"])'), 'code', { max: 1 }).length;
const derivadas = [];
const FIJAS = ['login', 'tablero', 'usuarios', 'bitacora', 'respaldo', 'configuracion', 'perfil'];
if (MODO === 'sistema') {
  for (const r of FIJAS) derivadas.push({ ruta: '#/' + r, origen: 'contrato', confirmada: prefijoEn(r) });
  for (const [pref, lista, nombre] of [['e', modelo.entidades, 'entidad'], ['o', modelo.operaciones, 'operacion'], ['r', modelo.reportes, 'reporte']]) {
    const conf = prefijoEn(pref);
    for (const x of lista) derivadas.push({ ruta: '#/' + pref + '/' + x.id, origen: nombre + ':' + x.id, confirmada: conf });
  }
}
const pantallasCand = []; {
  for (const f of fjs) {
    if (!/vista|view|pantalla|screen|pagina|page/i.test(f.ruta)) continue;
    for (const [i, l] of f.nostr.entries()) {
      let m = /^\s{0,6}function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(l) || /^\s{0,6}([A-Za-z_$][\w$]*)\s*:\s*function\b/.exec(l) || /^\s{0,6}(?:[A-Za-z_$][\w$]*\.)([A-Za-z_$][\w$]*)\s*=\s*function\b/.exec(l);
      if (m && pantallasCand.length < 120) pantallasCand.push({ nombre: m[1], archivo: f.ruta, linea: i + 1 });
    }
  }
}
const rutas = {
  enrutador: ev(enrutador, 6),
  literales: rutaLiterales,
  ramas_del_enrutador: ramasU.slice(0, 60),
  esperadas_segun_config: derivadas,
  funciones_de_vista: pantallasCand,
  nota: 'Las rutas «esperadas» se derivan del config con el patrón del contrato (#/e/<entidad>, #/o/<operacion>, #/r/<reporte>); «confirmada» solo dice que el prefijo aparece en el código. Pista: verifícala.',
};

// ───────────────────────── mecanismos de seguridad (pistas por patrón) ─────────────────────────
const F = fjs.filter((f) => f.ruta !== CFG_RUTA); // código sin el config
const mec = [];
const M = (id, nombre, estado, evidencia, nota, riesgoDebil, riesgoNo) => mec.push({ id, nombre, estado, evidencia: ev(evidencia, 6), nota, riesgo: estado === 'presente' ? null : estado === 'débil' ? riesgoDebil : riesgoNo });

{ // hash de clave
  const llam = hallar(F, /\b(sha-?256|sha-?1|sha-?512|md5)\s*\(|crypto\s*\.\s*subtle\s*\.\s*digest\b/i, 'nostr');
  const defs = hallar(F, /\bfunction\s+(sha-?256|sha-?1|md5|hash\w*|digest\w*)\b|\b(sha256|sha1|md5|hash\w*)\s*[:=]\s*function/i, 'nostr');
  const sal = hallar(F, /\b(sal|salt|nuevaSal|generarSal)\b/i, 'nostr');
  const itH = hallar(F, /\b(iteraciones|iterations|iter|ITER\w*|rondas|rounds)\b/i, 'nostr');
  const itN = hallar(F, /(?:iteraciones|iterations|ITER\w*|rondas|rounds)\s*[:=]\s*(\d[\d_]*)/i, 'nostr');
  const bucle = hallar(F, /for\s*\([^;]*;[^;]*<\s*(\d{3,})/, 'nostr');
  const valores = [...itN.map((h) => +h.m[1].replace(/_/g, '')), ...bucle.map((h) => +h.m[1])];
  const iter = itH.length || bucle.length; const n = valores.length ? Math.max(...valores) : null;
  const evidencia = [...defs, ...llam.slice(0, 2), ...sal.slice(0, 2), ...itN.slice(0, 1), ...bucle.slice(0, 1)];
  if (!llam.length && !defs.length) {
    const plano = hallar(F, /\.clave\s*[!=]==?\s*[A-Za-z_$]/, 'nostr');
    M('hash_clave', 'Hash de contraseña con sal e iteraciones', 'no encontrado', plano, 'No se vio ninguna función de hash. ' + (plano.length ? 'Hay comparaciones directas de `.clave` (¿texto plano?).' : ''), 'alto', 'alto');
  } else {
    const falta = []; const algos = uniq(llam.map((h) => h.m[1]?.toLowerCase().replace('-', '') || 'subtle'));
    if (!sal.length) falta.push('sal'); if (!iter) falta.push('iteraciones'); else if (n !== null && n < 1000) falta.push('solo ' + n + ' iteraciones');
    if (algos.length && algos.every((a) => /md5|sha1/.test(a))) falta.push('algoritmo débil (' + algos.join(', ') + ')');
    M('hash_clave', 'Hash de contraseña con sal e iteraciones', falta.length ? 'débil' : 'presente', evidencia, (falta.length ? 'Falta o es débil: ' + falta.join('; ') + '. ' : 'Hay función de hash, sal e iteraciones' + (n ? ' (≈' + n + ')' : '') + '. ') + 'No prueba que se aplique a la contraseña guardada: verifica el flujo de ingreso.', 'alto', 'alto');
  }
}
{ // bloqueo por intentos
  const a = hallar(F, /\b(intentos\w*|fallid\w*|failed\w*|attempts)\b/i, 'nostr'), b = hallar(F, /\b(bloque\w*|lock\w*)\b/i, 'nostr'), t = hallar(F, /\bDate\s*\.\s*now\s*\(|new\s+Date\s*\(/, 'nostr');
  const st = a.length && b.length && t.length ? 'presente' : a.length || b.length ? 'débil' : 'no encontrado';
  M('bloqueo_intentos', 'Bloqueo por intentos fallidos', st, [...a.slice(0, 3), ...b.slice(0, 3)], st === 'presente' ? 'Contador de intentos, bloqueo y comparación con la hora. Verifica que el contador se reinicie y que el límite salga de la configuración.' : st === 'débil' ? 'Solo se ve una parte (contador o bloqueo, sin hora).' : 'No se vio contador de intentos ni bloqueo.', 'medio', 'medio');
}
{ // expiración de sesión
  const a = hallar(F, /\b(sesionMin|inactividad|expir\w*|idle|timeout)\b/i, 'nostr'), t = hallar(F, /\bDate\s*\.\s*now\s*\(|new\s+Date\s*\(|setTimeout\s*\(|setInterval\s*\(/, 'nostr');
  const st = a.length && t.length ? 'presente' : a.length ? 'débil' : 'no encontrado';
  M('expiracion_sesion', 'Expiración de sesión por inactividad', st, [...a.slice(0, 4), ...t.slice(0, 2)], st === 'presente' ? 'Hay límite y comparación con el tiempo. Verifica que se renueve con la actividad y que 0 no signifique «nunca expira».' : st === 'débil' ? 'Se menciona la expiración pero no se ve el cálculo del tiempo.' : 'No se vio control de tiempo de sesión.', 'medio', 'medio');
}
{ // guardia de ruta
  const defs = hallar(F, /\b(guardia|guard|rutaPermitida|requiereSesion|requireAuth)\b\s*[:=(]|\bfunction\s+(guardia|guard)\b/i, 'nostr');
  const llam = hallar(F, /\b(guardia|guard|rutaPermitida|requiereSesion|requireAuth)\s*\(/i, 'nostr').filter((h) => !/\bfunction\s+(guardia|guard)\b/i.test(h.texto));
  const enR = llam.filter((h) => archivosEnrutador.includes(h.archivo));
  const st = defs.length && enR.length ? 'presente' : defs.length || llam.length ? 'débil' : 'no encontrado';
  M('guardia_ruta', 'Guardia de ruta (sesión y rol antes de pintar)', st, [...defs.slice(0, 2), ...enR.slice(0, 3), ...(enR.length ? [] : llam.slice(0, 3))], st === 'presente' ? 'Hay una función de guardia que se invoca desde el archivo del enrutador. Verifica que cubra TODAS las rutas y que consulte el rol, no solo la sesión.' : st === 'débil' ? 'Hay guardia pero no se ve invocada desde el enrutador (pista).' : 'No se vio función de guardia.', 'alto', 'alto');
}
{ // escape de salida
  const defs = hallar(F, /\bfunction\s+esc\w*\s*\(|\besc\w*\s*[:=]\s*function|\bU\s*\.\s*esc\s*=/, 'nostr');
  const usos = todos(F, /\b(?:U\s*\.\s*)?esc\s*\(/g, 'nostr').filter((h) => !/\bfunction\s+esc\b/.test(h.texto));
  const tc = todos(F, /\.\s*(textContent|innerText)\b|\bcreateTextNode\s*\(/g, 'nostr');
  const st = (defs.length && usos.length >= 3) || tc.length >= 5 ? 'presente' : defs.length || usos.length || tc.length ? 'débil' : 'no encontrado';
  M('escape_salida', 'Escape de salida (esc( o nodos de texto)', st, [...defs.slice(0, 2), ...usos.slice(0, 3), ...tc.slice(0, 2)], 'Definiciones: ' + defs.length + ' · usos de esc(): ' + usos.length + ' · usos de textContent/createTextNode: ' + tc.length + '. ' + (st === 'presente' ? 'Verifica que todo dato de usuario pase por él.' : ''), 'alto', 'alto');
}
{ // innerHTML con datos
  const usos = todos(F, /\.\s*(innerHTML|outerHTML)\s*\+?=\s*(.*)|\.\s*insertAdjacentHTML\s*\(|\bdocument\s*\.\s*write(ln)?\s*\(/g, 'code');
  const con = [], lim = [];
  for (const h of usos) {
    const lit = h.m[2];
    if (lit === undefined) { con.push(h); continue; }
    const rhs = lit.replace(/;\s*$/, '').trim();
    if (/^(['"])\1$/.test(rhs) || /^(['"])[^'"+]*\1$/.test(rhs)) lim.push(h); // literal puro
    else if (/^[A-Za-z_$][\w$]*$/.test(rhs) && /html|tpl|plantilla|cuerpo|salida|out|s$/i.test(rhs)) con.push(h); // variable armada antes
    else if (/[+]|\$\{|\(/.test(rhs) || /^[A-Za-z_$][\w$.]*$/.test(rhs)) con.push(h); else lim.push(h);
  }
  const sinEsc = con.filter((h) => !/\besc\w*\s*\(/.test(h.texto));
  M('innerhtml_datos', 'Sin innerHTML/insertAdjacentHTML con datos', sinEsc.length ? 'débil' : 'presente', sinEsc.length ? sinEsc : con, sinEsc.length ? sinEsc.length + ' uso(s) que arman HTML con variables o concatenación sin esc( en la misma línea. Puede estar escapado antes: abre el archivo y revisa de dónde viene cada dato.' : (con.length ? con.length + ' uso(s) con esc( en la línea.' : 'No se vio innerHTML con datos (usos con literal o vacío: ' + lim.length + ').'), 'alto', 'alto');
}
{ // eval
  const h = hallar(F, /\beval\s*\(|\bnew\s+Function\s*\(|\bFunction\s*\(\s*['"]|\bset(Timeout|Interval)\s*\(\s*['"]/, 'nostr');
  M('eval_funcion', 'Sin eval / new Function / temporizador con cadena', h.length ? 'débil' : 'presente', h, h.length ? 'Se ven construcciones que ejecutan texto como código.' : 'No se vio eval ni new Function.', 'alto', 'alto');
}
{ // CSP
  const metaC = metas.find((x) => /content-security-policy/i.test(String(x.at['http-equiv'] || '')));
  if (!metaC) M('csp', 'Content-Security-Policy', 'no encontrado', [], 'No hay <meta http-equiv="Content-Security-Policy"> en ' + (carga.html || 'el HTML') + '.', 'medio', 'medio');
  else {
    const pol = String(metaC.at.content || ''); const prob = [];
    const dir = {}; for (const p of pol.split(';')) { const t = p.trim().split(/\s+/); if (t[0]) dir[t[0].toLowerCase()] = t.slice(1); }
    const sc = dir['script-src'] || dir['default-src'] || [];
    if (!dir['default-src'] && !dir['script-src']) prob.push('sin default-src ni script-src');
    if (sc.includes("'unsafe-inline'")) prob.push("script-src permite 'unsafe-inline'"); if (sc.includes("'unsafe-eval'")) prob.push("permite 'unsafe-eval'");
    if (sc.some((x) => x === '*' || x === 'http:' || x === 'https:')) prob.push('script-src abierto (*, http: o https:)');
    M('csp', 'Content-Security-Policy', prob.length ? 'débil' : 'presente', [{ archivo: metaC.archivo, linea: metaC.linea, texto: rec(pol, 150) }], prob.length ? 'Política con puntos flojos: ' + prob.join('; ') + '.' : 'Política declarada por <meta>; sin los puntos flojos más comunes.', 'medio', 'medio');
  }
}
{ // cadena de hashes en la bitácora
  const arch = F.filter((f) => /audit|bitac/i.test(f.ruta) || f.nostr.some((l) => /\bbitacora\b/i.test(l)));
  const prev = hallar(arch, /\b(prev\w*|previo|anterior|hashPrev|hash_prev|cadena)\b/i, 'nostr'), h = hallar(arch, /\b(sha-?256|hash\w*|digest\w*)\s*\(/i, 'nostr'), ver = hallar(arch, /\b(verificar\w*|validarCadena|integridad\w*)\b/i, 'nostr');
  const bit = hallar(F, /\b(bitacora|auditoria)\b/i, 'nostr', { max: 3 });
  const st = prev.length && h.length ? (ver.length ? 'presente' : 'débil') : bit.length ? 'débil' : 'no encontrado';
  M('cadena_bitacora', 'Bitácora con cadena de hashes y verificación', st, [...prev.slice(0, 2), ...h.slice(0, 2), ...ver.slice(0, 2), ...(prev.length ? [] : bit)], st === 'presente' ? 'Cada registro se liga con el anterior y hay función de verificación. Verifica que la verificación recorra TODA la cadena.' : st === 'débil' ? (prev.length && h.length ? 'Hay cadena pero no se ve una función de verificación.' : 'Hay bitácora pero no se ve el encadenamiento.') : 'No se vio bitácora.', 'medio', 'medio');
}
{ // checksum de respaldo
  const lc = hallar(F, /\b(checksum|huella|integridad|firma)\b/i, 'nostr');
  const calc = lc.filter((h) => /\b(sha-?256|hash\w*|digest\w*)\s*\(/i.test(h.texto) || /\bfunction\b/.test(h.texto) || /[:=]/.test(h.texto));
  const cmpH = lc.filter((h) => /[!=]==?/.test(h.texto) || /\bthrow\b|\binvalid\w*|\balterad\w*/i.test(h.texto));
  const ctx = hallar(F, /\b(respaldo|backup|exportar|importar|restaur\w*)\b/i, 'nostr', { max: 3 });
  const st = lc.length && calc.length && cmpH.length ? 'presente' : lc.length ? 'débil' : 'no encontrado';
  M('checksum_respaldo', 'Checksum al exportar y verificación al restaurar', st, [...lc.slice(0, 4), ...(lc.length ? [] : ctx)], st === 'presente' ? 'Se calcula un checksum y se compara. Verifica que la comparación bloquee la restauración.' : st === 'débil' ? 'Aparece la palabra pero falta el cálculo o la comparación.' : 'No se vio checksum en el respaldo.', 'bajo', 'bajo');
}
{ // confirmación de borrado
  const conf = hallar(F, /\b(confirm\w*|confirmar\w*)\s*\(|\bconfirmarEliminar\b/i, 'nostr', { max: 30 });
  const cerca = []; for (const h of conf) { const f = F.find((x) => x.ruta === h.archivo); for (let i = Math.max(0, h.linea - 4); i < Math.min(f.nostr.length, h.linea + 3); i++) if (/\b(eliminar|borrar|delete|remove)\w*/i.test(f.nostr[i])) { cerca.push(h); break; } }
  const nativo = hallar(F, /(^|[^.\w$])(window\s*\.\s*)?confirm\s*\(/, 'nostr', { max: 5 });
  const st = cerca.length ? 'presente' : conf.length ? 'débil' : 'no encontrado';
  M('confirmacion_borrado', 'Confirmación antes de eliminar', st, [...cerca.slice(0, 4), ...(cerca.length ? [] : conf.slice(0, 3))], (st === 'presente' ? 'Hay confirmación junto al código de eliminar.' : st === 'débil' ? 'Hay confirmaciones pero no junto a «eliminar».' : 'No se vio confirmación.') + (nativo.length ? ' Usa confirm() nativo (' + nativo.map(refe).join(', ') + '): contra el design system de la clase.' : ''), 'bajo', 'bajo');
}
{ // validación
  const a = hallar(F, /\b(validar\w*|validate\w*)\b/i, 'nostr'), b = hallar(F, /\b(requerido|required)\b/i, 'nostr'), c = hallar(F, /\b(patron|pattern)\b|\.test\s*\(/i, 'nostr'), d = hallar(F, /\.(min|max)\b|\bmin\s*[<>]|\bmax\s*[<>]/, 'nostr');
  const n = [a, b, c, d].filter((x) => x.length).length;
  M('validacion', 'Validación de entrada (obligatorio, patrón, rango)', n >= 3 && a.length ? 'presente' : n ? 'débil' : 'no encontrado', [...a.slice(0, 2), ...b.slice(0, 1), ...c.slice(0, 2), ...d.slice(0, 1)], 'Señales: validar=' + a.length + ' · requerido=' + b.length + ' · patrón/test=' + c.length + ' · rango=' + d.length + '. Verifica que se valide en el guardado y no solo en el formulario.', 'medio', 'medio');
}
{ // política de contraseña
  const a = hallar(F, /\bminClave\b/, 'nostr'), l = hallar(F, /\bclave\s*\.\s*length\b|\b(password|pass|contrasena)\s*\.\s*length\b/i, 'nostr'), cl = hallar(F, /\[A-Z\]|\[a-z\]|\\d|\[0-9\]|\[\^A-Za-z0-9\]/, 'code');
  const st = (a.length || l.length) && cl.length ? 'presente' : a.length || l.length ? 'débil' : 'no encontrado';
  M('politica_clave', 'Política de contraseña (largo y variedad)', st, [...a.slice(0, 2), ...l.slice(0, 2), ...cl.slice(0, 2)], st === 'presente' ? 'Se revisa el largo y la variedad de caracteres.' : st === 'débil' ? 'Solo se ve el largo mínimo (sin clases de caracteres).' : 'No se vio política de contraseña.', 'medio', 'medio');
}
{ // permisos en la capa de datos
  const perm = hallar(F, /\b(puede|permitido|tienePermiso|autorizad\w*|verificarPermiso|checkPermiso)\w*\s*\(/i, 'nostr', { max: 80 });
  const datosF = F.filter((f) => f.nostr.some((l) => /\b(crear|actualizar|eliminar|guardar|borrar)\s*[:=]\s*function|\bfunction\s+(crear|actualizar|eliminar|guardar|borrar)\b/.test(l)));
  const enDatos = perm.filter((h) => datosF.some((f) => f.ruta === h.archivo));
  M('permisos_en_datos', 'Permisos aplicados también en la capa de datos (no solo en la pantalla)', enDatos.length ? 'presente' : perm.length ? 'débil' : 'no encontrado', enDatos.length ? enDatos : perm.slice(0, 4), enDatos.length ? 'Se consulta el permiso dentro del archivo que crea/edita/elimina datos. Verifica que cubra las tres acciones.' : perm.length ? 'Solo se ven comprobaciones de permiso fuera del archivo que escribe datos: la pantalla oculta el botón pero quizá nada impide la llamada directa (pista).' : 'No se vio comprobación de permisos.', 'medio', 'medio');
}

// ───────────────────────── seguridad: configuración efectiva ─────────────────────────
const SEG_DEF = { minClave: 10, intentosMax: 5, bloqueoMin: 5, sesionMin: 15, cadenaBitacora: true, confirmarEliminar: true, exigirCambioClave: true, ayudaLogin: false, exportaRespetaPermisos: true, cspMeta: true };
const SEG_REGLA = {
  minClave: (v) => (v < 10 ? ['medio', 'menos de 10 caracteres'] : null),
  intentosMax: (v) => (v === 0 ? ['alto', '0 = sin bloqueo por intentos'] : v > 5 ? ['bajo', 'más permisivo que el defecto (5)'] : null),
  bloqueoMin: (v) => (v < 5 ? ['bajo', 'bloqueo más corto que el defecto (5 min)'] : null),
  sesionMin: (v) => (v === 0 ? ['medio', '0 = la sesión no expira'] : v > 15 ? ['bajo', 'sesión más larga que el defecto (15 min)'] : null),
  cadenaBitacora: (v) => (v === false ? ['medio', 'la bitácora no se encadena'] : null),
  confirmarEliminar: (v) => (v === false ? ['bajo', 'borra sin confirmar'] : null),
  exigirCambioClave: (v) => (v === false ? ['medio', 'no pide cambiar la clave de demostración'] : null),
  ayudaLogin: (v) => (v === true ? ['medio', 'la pantalla de ingreso muestra los usuarios de demostración'] : null),
  exportaRespetaPermisos: (v) => (v === false ? ['medio', 'el CSV incluye columnas que el rol no ve'] : null),
  cspMeta: (v) => (v === false ? ['medio', 'sin Content-Security-Policy'] : null),
};
const segCfg = [];
if (MODO === 'sistema') {
  const pos = posDe(/\bseguridad\s*:/);
  const decl = modelo.seguridadCfg || {};
  for (const k of Object.keys(SEG_DEF)) {
    const declarado = Object.prototype.hasOwnProperty.call(decl, k), efectivo = declarado ? decl[k] : SEG_DEF[k];
    let des = null; if (typeof efectivo !== typeof SEG_DEF[k]) des = ['bajo', 'tipo inesperado (' + typeof efectivo + ')']; else des = SEG_REGLA[k](efectivo);
    const usos = hallar(F, new RegExp('\\b' + k + '\\b'), 'nostr', { max: 4 });
    const p = declarado ? posDe(new RegExp('\\b' + k + '\\s*:'), Math.max(pos, 0)) : -1;
    segCfg.push({ clave: k, defecto: SEG_DEF[k], efectivo, declarado, desviacion: !!des, riesgo: des ? des[0] : null, motivo: des ? des[1] : null, linea_config: lineaPos(p), leida_en_codigo: usos.length > 0, evidencia_codigo: ev(usos, 2) });
  }
  for (const k of Object.keys(decl)) if (!(k in SEG_DEF)) segCfg.push({ clave: k, defecto: null, efectivo: decl[k], declarado: true, desviacion: false, riesgo: null, motivo: 'clave que el contrato no define', linea_config: lineaPos(posDe(new RegExp('\\b' + esc_re(k) + '\\s*:'), Math.max(pos, 0))), leida_en_codigo: hallar(F, new RegExp('\\b' + esc_re(k) + '\\b'), 'nostr', { max: 1 }).length > 0, evidencia_codigo: [] });
}

// El código puede existir y la configuración dejarlo apagado: el estado efectivo es el que cuenta.
for (const [id, clave, apagado, txt] of [['bloqueo_intentos', 'intentosMax', (v) => v === 0, 'intentosMax = 0'], ['expiracion_sesion', 'sesionMin', (v) => v === 0, 'sesionMin = 0'], ['cadena_bitacora', 'cadenaBitacora', (v) => v === false, 'cadenaBitacora = false'], ['confirmacion_borrado', 'confirmarEliminar', (v) => v === false, 'confirmarEliminar = false'], ['csp', 'cspMeta', (v) => v === false, 'cspMeta = false']]) {
  const sc = segCfg.find((x) => x.clave === clave), m = mec.find((x) => x.id === id);
  if (sc && m && sc.declarado && apagado(sc.efectivo) && m.estado !== 'no encontrado') {
    const antes = m.estado; m.estado = 'débil'; m.riesgo = m.riesgo || (id === 'bloqueo_intentos' ? 'alto' : 'medio');
    m.nota = 'El código existe, pero la configuración lo desactiva (' + txt + ' en ' + CFG_RUTA + ':' + sc.linea_config + '). ' + (antes === 'presente' ? '' : '(Antes: ' + antes + '.) ') + m.nota;
    m.evidencia = [{ archivo: CFG_RUTA, linea: sc.linea_config, texto: clave + ': ' + sc.efectivo }, ...m.evidencia].slice(0, 6);
  }
}

// ───────────────────────── matriz de permisos ─────────────────────────
const matriz = { roles: idsRol, filas: [], pantallas_fijas: [], anomalias: [] };
if (MODO === 'sistema') {
  for (const e of modelo.entidades) matriz.filas.push({ recurso: 'entidad:' + e.id, tipo: 'entidad', archivo: e.archivo, linea: e.linea, definida: e.tiene_permisos, acciones: Object.keys(e.permisos).length ? Object.keys(e.permisos) : ACCIONES_ENT, celdas: Object.fromEntries(idsRol.map((r) => [r, Object.keys(e.permisos).filter((a) => e.permisos[a].includes(r))])) });
  for (const o of modelo.operaciones) matriz.filas.push({ recurso: 'operacion:' + o.id, tipo: 'operacion', archivo: o.archivo, linea: o.linea, definida: o.tiene_permisos, acciones: Object.keys(o.permisos), celdas: Object.fromEntries(idsRol.map((r) => [r, Object.keys(o.permisos).filter((a) => o.permisos[a].includes(r))])) });
  for (const r of modelo.reportes) matriz.filas.push({ recurso: 'reporte:' + r.id, tipo: 'reporte', archivo: r.archivo, linea: r.linea, definida: Array.isArray(r.roles), acciones: ['ejecutar'], sin_restriccion: !Array.isArray(r.roles), celdas: Object.fromEntries(idsRol.map((x) => [x, !Array.isArray(r.roles) || r.roles.includes(x) ? ['ejecutar'] : []])) });
  const ROLRE = (id) => new RegExp('[\'"]' + esc_re(id) + '[\'"]');
  for (const p of ['usuarios', 'bitacora', 'respaldo', 'configuracion', 'perfil', 'tablero']) {
    const hs = hallar(F, new RegExp('\\b' + p + '\\b'), 'code', { max: 400 }).map((h) => ({ ...h, roles: idsRol.filter((id) => ROLRE(id).test(F.find((f) => f.ruta === h.archivo).code[h.linea - 1])) })).filter((h) => h.roles.length || /\b(rol|admin|permiso|puede|solo)\b/i.test(h.texto));
    matriz.pantallas_fijas.push({ pantalla: p, pistas: hs.slice(0, 4).map((h) => ({ archivo: h.archivo, linea: h.linea, roles_en_la_linea: h.roles, texto: h.texto })) });
  }
  // anomalías (hechos del config)
  const A = (riesgo, titulo, detalle, evidencia) => matriz.anomalias.push({ riesgo, titulo, detalle, evidencia });
  const ESC = ['crear', 'editar', 'eliminar', 'emitir', 'anular'];
  const rolSoloLectura = (r) => /audit|lector|solo.?lectura|solo.?consulta|readonly/i.test(r.id + ' ' + (r.nombre || '')) || /solo lectura|solo consulta|no crea ni modifica/i.test(r.descripcion || '');
  for (const f of matriz.filas) if (f.tipo !== 'reporte') for (const r of modelo.roles) {
    const acc = f.celdas[r.id] || [];
    if (rolSoloLectura(r)) { const w = acc.filter((a) => ESC.includes(a)); if (w.length) A('alto', 'Rol de solo lectura con escritura', '«' + r.id + '» puede ' + w.join(', ') + ' en ' + f.recurso + ' (según el config).', [{ archivo: f.archivo, linea: f.linea, texto: f.recurso }]); }
    if ((acc.includes('crear') || acc.includes('editar')) && !acc.includes('ver')) A('bajo', 'Escribe sin poder ver', '«' + r.id + '» tiene ' + acc.join(', ') + ' pero no «ver» en ' + f.recurso + '.', [{ archivo: f.archivo, linea: f.linea, texto: f.recurso }]);
  }
  for (const f of matriz.filas) {
    if (f.tipo === 'reporte' && f.sin_restriccion) A('medio', 'Reporte sin restricción de rol', 'El reporte ' + f.recurso + ' no declara `roles`: lo ejecuta cualquier usuario con sesión.', [{ archivo: f.archivo, linea: f.linea, texto: f.recurso }]);
    if (f.tipo !== 'reporte' && !f.definida) A('medio', 'Sin permisos en el config', f.recurso + ' no declara `permisos`: depende de lo que haga el núcleo (por verificar).', [{ archivo: f.archivo, linea: f.linea, texto: f.recurso }]);
  }
  const usados = new Set();
  const desconocidos = new Set();
  const revisa = (p, recurso, archivo, linea) => { for (const k of Object.keys(p)) for (const r of p[k]) { usados.add(r); if (!idsRol.includes(r) && !desconocidos.has(recurso + '|' + r)) { desconocidos.add(recurso + '|' + r); A('medio', 'Rol inexistente en permisos', recurso + '.' + k + ' nombra «' + r + '», que no está en `roles`.', [{ archivo, linea, texto: recurso }]); } } };
  for (const e of modelo.entidades) revisa(e.permisos, 'entidad:' + e.id, e.archivo, e.linea);
  for (const o of modelo.operaciones) revisa(o.permisos, 'operacion:' + o.id, o.archivo, o.linea);
  for (const r of modelo.reportes) if (r.roles) revisa({ roles: r.roles }, 'reporte:' + r.id, r.archivo, r.linea);
  for (const r of modelo.roles) if (!usados.has(r.id) && r.id !== 'admin') A('bajo', 'Rol sin ningún permiso en el config', '«' + r.id + '» no aparece en ningún `permisos` ni `roles` de reporte.', [{ archivo: CFG_RUTA, linea: r.linea, texto: r.id }]);
  for (const f of matriz.filas) if (f.tipo !== 'reporte') { const quien = modelo.roles.filter((r) => (f.celdas[r.id] || []).includes('eliminar')).map((r) => r.id); if (quien.length > 1 || (quien.length === 1 && quien[0] !== 'admin')) A('bajo', 'Eliminar abierto a más de admin', f.recurso + ': eliminan ' + quien.join(', ') + '.', [{ archivo: f.archivo, linea: f.linea, texto: f.recurso }]); }
}

// ───────────────────────── compatibilidad ─────────────────────────
const SINTAXIS = [
  ['let-const', 'let / const', /(^|[^.\w$])(let|const)\s+[\w$\[{]/],
  ['flecha', 'funciones flecha (=>)', /=>/],
  ['clase', 'class', /(^|[^.\w$'"-])class\s+[A-Za-z_$][\w$]*\s*(extends\b|\{)/],
  ['desestructuracion', 'desestructuración', /(^|[^.\w$])(var|let|const)\s*[\[{]/],
  ['spread', 'spread / rest (...)', /\.\.\.\s*[\w$\[({]/],
  ['for-of', 'for…of', /\bfor\s*\(\s*(?:var|let|const)?\s*[\w$]+\s+of\s/],
  ['promesas', 'Promise / async / await', /\bnew\s+Promise\b|\bPromise\s*\.\s*(all|resolve|reject|race)\b|\basync\s+(function|\()|\bawait\s|\.then\s*\(/],
  ['map-set', 'Map / Set / Symbol / Proxy', /\bnew\s+(Map|Set|WeakMap|WeakSet|Proxy)\b|\bSymbol\s*[.(]/],
  ['param-defecto', 'parámetros por defecto', /\bfunction\s*[\w$]*\s*\(([^)]*[^=!<>]=[^=>][^)]*)\)/],
  ['modulos-es', 'import / export', /^\s*(import\s+[\w{*'"]|export\s+(default|const|function|class|\{))/],
  ['encadenado-opcional', 'encadenado opcional (?.)', /\?\.(?![0-9])/],
  ['nulish', 'fusión de nulos (??)', /\?\?/],
  ['exponente', 'operador **', /\*\*/],
];
const compat = { sintaxis: [], apis: [], css: [], html: [] };
for (const [id, nombre, re] of SINTAXIS) { const h = hallar(fjs, re, 'nostr', { max: 200 }); if (h.length) compat.sintaxis.push({ id, nombre, total: h.length, ejemplos: ev(h, 3) }); }
{ const pl = []; for (const f of fjs) for (const l of f.plant) pl.push({ archivo: f.ruta, linea: l, texto: rec(f.orig[l - 1]) }); if (pl.length) compat.sintaxis.push({ id: 'plantillas', nombre: 'plantillas con acento grave', total: pl.length, ejemplos: pl.slice(0, 3) }); }
const APIS_PUNTO = [['Object.assign', /\bObject\s*\.\s*assign\b/], ['Object.entries/values', /\bObject\s*\.\s*(entries|values)\b/], ['Array.from/of', /\bArray\s*\.\s*(from|of)\b/], ['Number.isInteger/isNaN/isFinite', /\bNumber\s*\.\s*(isInteger|isNaN|isFinite|isSafeInteger)\b/], ['Math.trunc/sign/log10', /\bMath\s*\.\s*(trunc|sign|log10|log2|cbrt|hypot)\b/], ['String.fromCodePoint', /\bString\s*\.\s*fromCodePoint\b/], ['URL / URLSearchParams', /\bnew\s+(URL|URLSearchParams)\b/], ['CustomEvent / Event()', /\bnew\s+(CustomEvent|Event)\s*\(/], ['.closest / .matches / .append / .prepend', /\.\s*(closest|matches|append|prepend|after|before|replaceWith)\s*\(/], ['.remove() de elemento', /\.\s*remove\s*\(\s*\)/], ['NodeList.forEach', /querySelectorAll\s*\([^)]*\)\s*\.\s*forEach/], ['navigator.clipboard', /\bnavigator\s*\.\s*clipboard\b/], ['TextEncoder/Decoder', /\bText(En|De)coder\b/]];
for (const [nombre, re] of APIS_PUNTO) { const h = hallar(fjs, re, 'nostr', { max: 100 }); if (h.length) compat.apis.push({ api: nombre, total: h.length, ejemplos: ev(h, 3) }); }
{ // métodos de instancia: se descartan los que cuelgan de un nombre con mayúscula (U.incluye, Datos.find…): son propios
  const re = /([A-Za-z_$][\w$]*)?\s*\.\s*(find|findIndex|includes|fill|startsWith|endsWith|repeat|padStart|padEnd|codePointAt|flat|flatMap|findLast)\s*\(/g;
  const por = new Map();
  for (const h of todos(fjs, re, 'nostr', { max: 600 })) { const recv = h.m[1] || ''; if (recv && /^[A-Z]/.test(recv) && !/^(Array|String|Object|Number|Math)$/.test(recv)) continue; const k = h.m[2]; if (!por.has(k)) por.set(k, []); por.get(k).push(h); }
  for (const k of [...por.keys()].sort(cmp)) compat.apis.push({ api: '.' + k + '() (pista: puede ser un método propio)', total: por.get(k).length, ejemplos: ev(por.get(k), 3) });
}
compat.apis.sort((a, b) => cmp(a.api, b.api));
const CSS_NO = [['variables CSS var(--x)', /var\(\s*--|(^|[;{\s])--[\w-]+\s*:/], ['display:grid / grid-*', /display\s*:\s*(inline-)?grid\b|grid-template|grid-area|grid-column|grid-row/], ['gap', /(^|[;{\s])(row-|column-)?gap\s*:/], ['position:sticky', /position\s*:\s*sticky/], ['inset', /(^|[;{\s])inset\s*:/], ['aspect-ratio', /aspect-ratio\s*:/], ['clamp()/min()/max()', /\b(clamp|min|max)\s*\(/], ['object-fit', /object-fit\s*:/], ['backdrop-filter', /backdrop-filter\s*:/], [':is() / :where() / :has()', /:(is|where|has)\s*\(/], [':focus-visible', /:focus-visible/], ['display:contents', /display\s*:\s*contents/]];
for (const [nombre, re] of CSS_NO) { const h = hallar(fcss, re, 'code', { max: 100 }); if (h.length) compat.css.push({ propiedad: nombre, total: h.length, ejemplos: ev(h, 3) }); }
{ const fl = hallar(fcss, /display\s*:\s*flex/, 'code', { max: 100 }), msf = hallar(fcss, /display\s*:\s*-ms-flexbox/, 'code', { max: 1 }); if (fl.length && !msf.length) compat.css.push({ propiedad: 'display:flex sin -ms-flexbox (IE10)', total: fl.length, ejemplos: ev(fl, 2) }); }
for (const h of fhtml) { for (const m of h.limpio.matchAll(/<(dialog|template|details|picture)\b|<input\b[^>]*\btype\s*=\s*["']?(date|month|time|datetime-local|color|range)\b/gi)) compat.html.push({ elemento: m[1] ? '<' + m[1].toLowerCase() + '>' : '<input type=' + m[2].toLowerCase() + '>', archivo: h.ruta, linea: h.L.linea(m.index) }); }
compat.html.sort((a, b) => cmp(a.archivo, b.archivo) || a.linea - b.linea);
compat.veredicto = compat.sintaxis.length ? 'Hay sintaxis ES6+ (no corre en IE11): ' + compat.sintaxis.map((s) => s.nombre).join(', ') : 'Sin sintaxis ES6+ detectada por patrón.';
compat.nota = 'Detección por regex, no por parser: una coincidencia es una pista. Para ES5 estricto usa un parser (acorn ecmaVersion 5). No sustituye probar en el navegador.';

// ───────────────────────── hallazgos automáticos ─────────────────────────
const hall = [];
const RANK = { alto: 0, medio: 1, bajo: 2 };
const H = (riesgo, tipo, titulo, detalle, evidencia = []) => hall.push({ riesgo, tipo, titulo, detalle, evidencia: evidencia.slice(0, 5), verificado: false, nota: tipo === 'config' ? 'Leído de ' + (CFG_RUTA || 'config') + ' (cargado en sandbox): confírmalo abriendo el archivo.' : PISTA });
for (const s of segCfg) {
  if (s.desviacion) H(s.riesgo, 'config', 'seguridad.' + s.clave + ' debilitada (' + s.efectivo + ' frente a ' + s.defecto + ')', s.motivo + '.', [{ archivo: CFG_RUTA, linea: s.linea_config, texto: s.clave + ': ' + s.efectivo }]);
  if (s.declarado && !s.leida_en_codigo && s.defecto !== null) H('bajo', 'patron', 'seguridad.' + s.clave + ' no se lee en el código', 'La clave está en el config pero no aparece en ningún otro .js: declararla podría no tener efecto (o el núcleo la lee de forma dinámica).', [{ archivo: CFG_RUTA, linea: s.linea_config, texto: s.clave }]);
}
if (MODO === 'sistema') {
  const minC = typeof modelo.seguridadCfg.minClave === 'number' ? modelo.seguridadCfg.minClave : 10;
  const claveEv = modelo.usuarios.filter((u) => u.clave !== null).map((u) => ({ archivo: CFG_RUTA, linea: u.linea, texto: 'usuario ' + u.usuario + ' (' + u.rol + '): clave «' + u.clave + '»' }));
  if (claveEv.length) H('medio', 'config', 'Credenciales de demostración escritas en el config', claveEv.length + ' usuario(s) con la clave en texto claro en ' + CFG_RUTA + ' (es práctica: en un sistema real sería un hallazgo crítico).', claveEv);
  const cortas = modelo.usuarios.filter((u) => u.clave !== null && u.clave.length < minC);
  if (cortas.length) H('medio', 'config', 'Claves de demostración más cortas que minClave (' + minC + ')', cortas.map((u) => u.usuario + ' (' + u.clave.length + ')').join(', ') + '.', cortas.map((u) => ({ archivo: CFG_RUTA, linea: u.linea, texto: u.usuario })));
  const previsibles = modelo.usuarios.filter((u) => u.clave !== null && (u.clave.toLowerCase() === String(u.usuario).toLowerCase() || /^(1234|12345|123456|password|clave|admin|demo|test)$/i.test(u.clave)));
  if (previsibles.length) H('alto', 'config', 'Claves previsibles', previsibles.map((u) => u.usuario).join(', ') + ': la clave es igual al usuario o una palabra común.', previsibles.map((u) => ({ archivo: CFG_RUTA, linea: u.linea, texto: u.usuario })));
  for (const a of matriz.anomalias) H(a.riesgo, 'config', a.titulo, a.detalle, a.evidencia);
  // referencias rotas
  const idsEnt = new Set(modelo.entidades.map((e) => e.id));
  for (const e of [...modelo.entidades, ...modelo.operaciones]) {
    for (const c of e.campos) if (c.ref && !idsEnt.has(c.ref.entidad)) H('medio', 'config', 'Referencia a entidad inexistente', e.id + '.' + c.id + ' apunta a «' + c.ref.entidad + '».', [{ archivo: CFG_RUTA, linea: c.linea, texto: c.id }]);
    if (e.lineas && e.lineas.entidad && !idsEnt.has(e.lineas.entidad)) H('medio', 'config', 'Líneas apuntan a entidad inexistente', e.id + '.lineas.entidad = «' + e.lineas.entidad + '».', [{ archivo: CFG_RUTA, linea: e.linea, texto: e.id }]);
  }
  const rolesUs = new Set(idsRol);
  for (const u of modelo.usuarios) if (!rolesUs.has(u.rol)) H('medio', 'config', 'Usuario con rol inexistente', u.usuario + ' tiene rol «' + u.rol + '».', [{ archivo: CFG_RUTA, linea: u.linea, texto: u.usuario }]);
  // constantes que el parámetro debería controlar
  for (const f of modelo.formulas) {
    for (const p of modelo.parametros) {
      if (typeof p.valor !== 'number') continue;
      const uses = new RegExp('param\\(\\s*[\'"]' + esc_re(p.id) + '[\'"]\\s*\\)').test(f.codigo);
      const sinCad = f.codigo.replace(/\/\/.*$/gm, '').replace(/(['"])(?:\\.|(?!\1).)*\1/g, '""');
      const cands = []; // formas en que un valor fijo se cuela en una fórmula
      if (p.tipo === 'porcentaje') { if (p.valor > 0 && p.valor < 100) { cands.push(String(+(p.valor / 100).toFixed(4))); cands.push(String(p.valor) + '\\s*\\/\\s*100'); } }
      else if (Math.abs(p.valor) >= 10) cands.push(String(p.valor));
      const lh = cands.filter((l) => new RegExp('(^|[^\\w.])' + (l.includes('\\') ? l : esc_re(l)) + '(?![\\w.])').test(sinCad));
      if (!uses && lh.length) H('medio', 'patron', 'Constante igual al parámetro «' + p.id + '» (' + p.valor + ') dentro de una fórmula', 'La fórmula de ' + f.dueno + ' (' + f.id + ') contiene un valor fijo equivalente (' + lh[0].replace(/\\s\*/g, '').replace(/\\\//g, '/') + ') y no llama a ctx.param(\'' + p.id + '\'): si el parámetro cambia, la fórmula no.', [{ archivo: f.archivo, linea: f.linea, texto: f.dueno + ' ' + f.id }]);
    }
    const dinero = f.tipo === 'calcular' || (f.tipo === 'calculado' && f.valor_tipo === 'moneda');
    if (dinero && /[*\/]/.test(f.codigo) && !/redondear\s*\(/.test(f.codigo)) H('bajo', 'patron', /Math\.round\s*\(|\.toFixed\s*\(/.test(f.codigo) ? 'Redondeo de dinero propio en lugar de ctx.redondear' : 'Cálculo de dinero sin ctx.redondear', f.dueno + ' (' + f.id + ') multiplica o divide y no llama a ctx.redondear.', [{ archivo: f.archivo, linea: f.linea, texto: f.dueno + ' ' + f.id }]);
  }
}
for (const m of mec) if (m.estado !== 'presente' && !m.nota.startsWith('El código existe, pero la configuración')) H(m.riesgo, 'patron', 'Mecanismo «' + m.nombre + '»: ' + m.estado, m.nota, m.evidencia);
for (const d of depsU) if (d.carga_recurso) H(/script|css-import|link|iframe/.test(d.tipo) ? 'alto' : 'medio', 'patron', 'Recurso externo cargado: ' + d.destino, 'El sistema debe abrir sin red; esta referencia (' + d.tipo + ') depende de un tercero.', [{ archivo: d.archivo, linea: d.linea, texto: d.destino }]);
if (llamadasRed.length) H('medio', 'patron', 'Llamadas de red en el código (' + llamadasRed.length + ')', 'fetch/XHR/WebSocket/… en un sistema que debería ser local. Revisa el destino.', ev(llamadasRed, 5));
if (carga.manejadores_en_linea.length) H('bajo', 'patron', 'Manejadores de eventos en línea (onclick=…) en el HTML', 'Chocan con una CSP estricta y mezclan comportamiento con marcado.', carga.manejadores_en_linea.slice(0, 5).map((x) => ({ archivo: x.archivo, linea: x.linea, texto: x.atributo })));
if (carga.faltan.length) H('medio', 'estructura', 'index.html referencia archivos que no existen', carga.faltan.map((x) => x.ruta).join(', '), carga.faltan.slice(0, 5).map((x) => ({ archivo: carga.html, linea: x.linea, texto: x.ruta })));
if (!carga.html) H('bajo', 'estructura', 'No hay ningún .html en la carpeta', 'No se pudo leer el orden de carga.', []);
if (carga.huerfanos.length) H('bajo', 'estructura', 'Archivos .js/.css que ningún <script>/<link> de index.html carga', carga.huerfanos.join(', '), []);
if (compat.sintaxis.length) H('medio', 'patron', 'Sintaxis ES6+ en un sistema que apunta a ES5/IE11', compat.sintaxis.map((s) => s.nombre + ' ×' + s.total).join('; '), compat.sintaxis.flatMap((s) => s.ejemplos).slice(0, 5));
if (compat.apis.length) H('bajo', 'patron', 'APIs que IE11 no tiene', compat.apis.map((s) => s.api + ' ×' + s.total).join('; '), compat.apis.flatMap((s) => s.ejemplos).slice(0, 5));
if (compat.css.length) H('bajo', 'patron', 'CSS que IE11 no soporta', compat.css.map((s) => s.propiedad + ' ×' + s.total).join('; '), compat.css.flatMap((s) => s.ejemplos).slice(0, 5));
for (const a of almU) if (/sesion|session|token/i.test(a.clave) && a.mecanismo === 'localStorage' && a.operacion === 'setItem') { H('bajo', 'patron', 'Sesión o token guardado en localStorage', 'localStorage persiste tras cerrar el navegador y lo lee cualquier script de la página.', [{ archivo: a.archivo, linea: a.linea, texto: a.mecanismo + '.' + a.operacion + '(' + a.clave + ')' }]); break; }
hall.sort((a, b) => RANK[a.riesgo] - RANK[b.riesgo]);
hall.forEach((h, i) => { h.id = 'H-' + String(i + 1).padStart(2, '0'); });
const hallRes = { alto: hall.filter((h) => h.riesgo === 'alto').length, medio: hall.filter((h) => h.riesgo === 'medio').length, bajo: hall.filter((h) => h.riesgo === 'bajo').length };

// ───────────────────────── banco de verificación ─────────────────────────
const banco = [];
{
  const B = (afirmacion, archivo, linea) => { if (archivo && linea) banco.push({ afirmacion, archivo, linea, comando: "sed -n '" + Math.max(1, linea - 2) + ',' + (linea + 2) + "p' " + archivo }); };
  for (const s of segCfg.filter((x) => x.declarado)) B('seguridad.' + s.clave + ' vale ' + JSON.stringify(s.efectivo), CFG_RUTA, s.linea_config);
  for (const e of modelo.entidades) B('La entidad «' + e.id + '» tiene ' + e.campos.length + ' campos', e.archivo, e.linea);
  for (const f of modelo.formulas.filter((x) => ['calcular', 'calculado'].includes(x.tipo))) B('La fórmula ' + f.dueno + '.' + f.id + ' está en ' + f.archivo + ' línea ' + f.linea, f.archivo, f.linea);
  for (const r of modelo.reportes) B('El reporte «' + r.id + '» ' + (r.roles ? 'solo lo ejecutan: ' + r.roles.join(', ') : 'no restringe por rol'), r.archivo, r.linea);
  for (const m of mec) if (m.evidencia[0]) B('Mecanismo «' + m.nombre + '» = ' + m.estado, m.evidencia[0].archivo, m.evidencia[0].linea);
  for (const u of modelo.usuarios) B('El usuario «' + u.usuario + '» tiene rol «' + u.rol + '»', CFG_RUTA, u.linea);
  for (const r of rutaLiterales.slice(0, 4)) { const [a, l] = r.primera.split(':'); B('La ruta ' + r.ruta + ' aparece en el código', a, +l); }
}
const bancoU = (() => { const v = new Set(), out = []; for (const b of banco) { const k = b.afirmacion; if (!v.has(k)) { v.add(k); out.push(b); } } return out; })();
const bancoSel = (() => { if (bancoU.length <= 16) return bancoU; const out = [], paso = bancoU.length / 16; for (let i = 0; i < 16; i++) out.push(bancoU[Math.floor(i * paso)]); return out; })();

// ───────────────────────── JSON ─────────────────────────
const meta = (() => {
  const fecha = opts.fecha || (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  return { fecha };
})();
const totalBytes = archivos.reduce((s, a) => s + a.bytes, 0), totalLineas = archivos.reduce((s, a) => s + (a.lineas || 0), 0);
const sistema = SIS ? { modo: MODO, id: SIS.id ?? null, nombre: SIS.nombre ?? null, rubro: SIS.rubro ?? null, version: SIS.version ?? null, moneda: SIS.moneda ?? null } : { modo: MODO, id: null, nombre: carga.titulo, rubro: null, version: null, moneda: null };
const FOTO = {
  foto: { version: VERSION, herramienta: 'foto.mjs', nota: 'Las listas de archivo:línea son hechos leídos o pistas por patrón (ver campo `nota` de cada hallazgo). Nada de esto sustituye abrir el archivo.' },
  captura: { fecha: meta.fecha, nota: 'La fecha no entra en la huella global ni en el .md.' },
  sistema,
  huella_global: HUELLA,
  archivos: { total: archivos.length, bytes: totalBytes, lineas: totalLineas, lista: archivos.map((a) => ({ ruta: a.ruta, tipo: a.tipo, bytes: a.bytes, lineas: a.lineas, sha256: a.sha256 })) },
  carga,
  dependencias_externas: dependencias,
  almacenamiento,
  rutas,
  config: { presente: !!SIS, archivo: CFG_RUTA, error: cfgError },
  parametros: modelo.parametros,
  roles: modelo.roles,
  usuarios: modelo.usuarios,
  entidades: modelo.entidades,
  operaciones: modelo.operaciones,
  reportes: modelo.reportes,
  tablero: { indicadores: modelo.tablero, grafico: modelo.tableroGrafico },
  semillas: modelo.semillas,
  matriz_permisos: matriz,
  formulas: modelo.formulas,
  seguridad: { configuracion: segCfg, mecanismos: mec },
  compatibilidad: compat,
  hallazgos: { resumen: hallRes, lista: hall },
  banco_de_verificacion: bancoSel,
  limites: [
    'Es análisis estático: no ejecuta la aplicación (solo carga js/config.js en un sandbox sin red).',
    'Los mecanismos y la compatibilidad salen de expresiones regulares sobre el código sin comentarios: son pistas, no pruebas.',
    'Los permisos de pantallas fijas del núcleo (usuarios, bitácora, respaldo, configuración) no están en el config: solo se listan las líneas que los mencionan.',
    'Lo que no aparece aquí no es necesariamente inexistente: puede estar construido dinámicamente.',
  ],
};

// ───────────────────────── Markdown ─────────────────────────
const cel = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const tabla = (cab, filas) => (filas.length ? '| ' + cab.join(' | ') + ' |\n|' + cab.map(() => '---').join('|') + '|\n' + filas.map((f) => '| ' + f.map(cel).join(' | ') + ' |').join('\n') + '\n' : '_(ninguno)_\n');
const q = (s) => String(s).replace(/"/g, "'").replace(/[\[\]{}()<>]/g, (c) => ({ '[': '(', ']': ')', '{': '(', '}': ')', '<': '‹', '>': '›', '(': '(', ')': ')' })[c]);
const nid = (s) => 'n_' + String(s).replace(/[^A-Za-z0-9_]/g, '_');
const AB = { ver: 'V', crear: 'C', editar: 'E', eliminar: 'D', emitir: 'M', anular: 'A', ejecutar: 'X' };
const abrev = (acs) => (acs.length ? acs.map((a) => AB[a] || '+' + a).join('') : '—');
const cod = (c, n = 40) => { const l = c.split('\n'); return l.length > n ? l.slice(0, n).join('\n') + '\n// … (' + (l.length - n) + ' líneas más: ver archivo:línea)' : c; };
const evTxt = (e) => e.map((x) => '`' + x.archivo + ':' + x.linea + '`').join(', ') || '—';
const md = [];
const P = (s = '') => md.push(s);
P('# Foto del sistema' + (sistema.nombre ? ' · ' + sistema.nombre : ''));
P();
P('> Inventario **estático** generado por `foto.mjs` v' + VERSION + '. Lo que sale de patrones (regex) es una **pista**: verifícala en `archivo:línea` antes de afirmarla. No releas el código que esta foto ya describe.');
P();
P('## 1. Resumen');
P(tabla(['Dato', 'Valor'], [
  ['Modo', MODO === 'sistema' ? 'sistema con `window.SISTEMA` (' + CFG_RUTA + ')' : 'genérico (sin `window.SISTEMA`)' + (cfgError ? ' · error al cargar el config: ' + cfgError : '')],
  ['Sistema', [sistema.id, sistema.nombre, sistema.rubro, sistema.version && 'v' + sistema.version].filter(Boolean).join(' · ') || '—'],
  ['Archivos / bytes / líneas', archivos.length + ' / ' + totalBytes + ' / ' + totalLineas],
  ['Huella global (sha256 de hashes.txt)', '`' + HUELLA + '`'],
  ['Dependencias externas', dependencias.resultado],
  ['Almacenamiento', almacenamiento.mecanismos.join(', ') || 'ninguno detectado'],
  ['Hallazgos automáticos', 'alto ' + hallRes.alto + ' · medio ' + hallRes.medio + ' · bajo ' + hallRes.bajo],
  ['Compatibilidad', compat.veredicto],
]));
P('## 2. Archivos');
P(tabla(['Ruta', 'Tipo', 'Bytes', 'Líneas', 'sha256 (12)'], archivos.map((a) => [a.ruta, a.tipo, a.bytes, a.lineas ?? '—', '`' + a.sha256.slice(0, 12) + '`'])));
P('Hashes completos: `hashes.txt` (formato `sha256sum`; compruébalos con `cd <sistema> && sha256sum -c FOTO/hashes.txt`).');
P();
P('## 3. Orden de carga y dependencias');
P(tabla(['#', 'Tipo', 'Archivo', 'Línea', 'Notas'], carga.orden.map((o) => [o.n, o.tipo, o.ruta || '(código en línea)', o.linea, [o.externo && 'EXTERNO', o.modulo && 'module', o.defer && 'defer', o.async && 'async'].filter(Boolean).join(' ')])));
if (carga.orden.length) {
  P('```mermaid'); P('flowchart LR'); P('  idx["' + q(carga.html || 'index.html') + '"]');
  let prev = 'idx'; for (const o of carga.orden) { const id = nid('c' + o.n); P('  ' + id + '["' + q((o.ruta || 'inline') + (o.ruta && o.ruta.endsWith('config.js') ? ' (config)' : '')) + '"]'); P('  ' + prev + ' --> ' + id); prev = id; }
  P('```'); P();
}
if (carga.faltan.length) P('**Referenciados y ausentes:** ' + carga.faltan.map((x) => '`' + x.ruta + '`').join(', ') + '\n');
if (carga.huerfanos.length) P('**No cargados por index.html:** ' + carga.huerfanos.map((x) => '`' + x + '`').join(', ') + '\n');
P('**Dependencias externas:** ' + dependencias.resultado + '\n');
if (depsU.length) P(tabla(['Tipo', 'Destino', 'Dónde', 'Carga recurso'], depsU.map((d) => [d.tipo, d.destino, d.archivo + ':' + d.linea, d.carga_recurso ? 'sí' : 'no'])));
if (llamadasRed.length) P(tabla(['API de red', 'Dónde'], dependencias.llamadas_de_red.map((d) => [d.api, d.archivo + ':' + d.linea])));
P('## 4. Almacenamiento');
P(almacenamiento.usos.length ? tabla(['Mecanismo', 'Operación', 'Clave / expresión', 'Dónde'], almacenamiento.usos.map((a) => [a.mecanismo, a.operacion, '`' + a.clave + '`', a.archivo + ':' + a.linea])) : 'No se detectó localStorage, sessionStorage, cookies ni IndexedDB.\n');
if (almacenamiento.claves_candidatas.length) P('Cadenas con aspecto de clave: ' + almacenamiento.claves_candidatas.map((c) => '`' + c.clave + '` (' + c.evidencia + ')').join(', ') + '\n');
P('_' + almacenamiento.nota + '_\n');
P('## 5. Rutas y pantallas');
P('Enrutador (pista): ' + evTxt(rutas.enrutador) + '\n');
P(rutaLiterales.length ? tabla(['Ruta literal en el código', 'Veces', 'Primera aparición'], rutaLiterales.map((r) => ['`' + r.ruta + '`', r.veces, r.primera])) : 'No hay literales `#/…` en el código.\n');
if (ramasU.length) P('Ramas del enrutador: ' + ramasU.slice(0, 40).map((r) => '`' + r.rama + '` (' + r.archivo + ':' + r.linea + ')').join(', ') + '\n');
if (derivadas.length) P('Rutas esperadas según el config (patrón del contrato; «confirmada» = el prefijo aparece en el código):\n\n' + tabla(['Ruta', 'Origen', 'Confirmada'], derivadas.map((d) => ['`' + d.ruta + '`', d.origen, d.confirmada ? 'sí' : 'por verificar'])));
if (pantallasCand.length) P('Funciones de vista (pista): ' + pantallasCand.slice(0, 40).map((p) => '`' + p.nombre + '` (' + p.archivo + ':' + p.linea + ')').join(', ') + '\n');
{
  P('```mermaid'); P('flowchart LR'); const r0 = rutas.enrutador[0];
  P('  R["Enrutador ' + q(r0 ? r0.archivo + ':' + r0.linea : 'no encontrado') + '"]');
  const grupos = new Map();
  const add = (g, e) => { if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(e); };
  if (derivadas.length) for (const d of derivadas) { const p = d.ruta.split('/'); if (['e', 'o', 'r'].includes(p[1])) add('/' + p[1] + '/…', p[2]); else add('fijas', p[1]); }
  else for (const l of rutaLiterales) { const p = l.ruta.replace('#/', '').split('/'); add(p[0] ? '/' + p[0] : '/', l.ruta); }
  let gi = 0; for (const [g, items] of grupos) { gi++; const id = 'g' + gi; P('  R --> ' + id + '["' + q(g) + '"]'); items.slice(0, 12).forEach((it, k) => P('  ' + id + ' --> ' + id + '_' + k + '["' + q(it) + '"]')); }
  P('```'); P();
}
if (MODO === 'sistema') {
  P('## 6. Modelo de datos');
  for (const e of modelo.entidades) {
    P('### Entidad `' + e.id + '` · ' + (e.nombre || '') + ' (prefijo ' + (e.prefijo || '—') + ', `' + e.archivo + ':' + e.linea + '`, semillas: ' + e.semillas + ')');
    P(tabla(['Campo', 'Etiqueta', 'Tipo', 'Oblig.', 'Único', 'Restricciones', 'Referencia', 'Línea'], e.campos.map((c) => [c.id, c.etiqueta, c.tipo, c.requerido ? 'sí' : '', c.unico ? 'sí' : '', [c.min !== undefined && 'min ' + c.min, c.max !== undefined && 'max ' + c.max, c.patron && 'patrón ' + c.patron, c.opciones && 'opciones: ' + c.opciones.join('/'), c.defecto !== undefined && 'defecto ' + c.defecto].filter(Boolean).join('; '), c.ref ? c.ref.entidad + '.' + c.ref.mostrar : '', c.linea ?? ''])));
    if (e.calculados.length) P('Calculados: ' + e.calculados.map((c) => '`' + c.id + '` (`' + c.archivo + ':' + c.linea + '`)').join(', ') + '\n');
    if (e.reglas.length) P('Reglas: ' + e.reglas.map((c) => '`' + c.id + '` «' + c.mensaje + '» (`' + c.archivo + ':' + c.linea + '`)').join('; ') + '\n');
  }
  for (const o of modelo.operaciones) {
    P('### Operación `' + o.id + '` · ' + (o.nombre || '') + ' (prefijo ' + (o.prefijo || '—') + ', serie ' + (o.serie || '—') + ', `' + o.archivo + ':' + o.linea + '`)');
    P('Estados: ' + (o.estados.join(' → ') || '—') + (o.ganchos.length ? ' · ganchos: ' + o.ganchos.join(', ') : '') + '\n');
    P(tabla(['Campo', 'Etiqueta', 'Tipo', 'Oblig.', 'Referencia'], o.campos.map((c) => [c.id, c.etiqueta, c.tipo, c.requerido ? 'sí' : '', c.ref ? c.ref.entidad + '.' + c.ref.mostrar : ''])));
    if (o.lineas) P('Líneas de ' + o.lineas.entidad + ' (precio desde `' + o.lineas.precio + '`): ' + o.lineas.campos.map((c) => c.id + ':' + c.tipo + (c.min !== undefined ? ' min ' + c.min : '') + (c.max !== undefined ? ' max ' + c.max : '')).join(', ') + '\n');
    if (o.totales.length) P('Totales: ' + o.totales.map((t) => t.id).join(', ') + '\n');
  }
  const rel = []; for (const e of [...modelo.entidades, ...modelo.operaciones]) for (const c of [...e.campos, ...(e.lineas ? e.lineas.campos : [])]) if (c.ref) rel.push([c.ref.entidad, e.id, c.id]); for (const o of modelo.operaciones) if (o.lineas?.entidad) rel.push([o.lineas.entidad, o.id, 'líneas']);
  if (rel.length) { P('```mermaid'); P('erDiagram'); for (const [a, b, c] of rel) P('  ' + nid(a).slice(2) + ' ||--o{ ' + nid(b).slice(2) + ' : "' + q(c) + '"'); P('```'); P(); }
  P('### Reportes');
  P(tabla(['Reporte', 'Título', 'Roles', 'Parámetros', 'Línea'], modelo.reportes.map((r) => [r.id, r.titulo, r.roles ? r.roles.join(', ') : '**sin restricción de rol**', r.parametros.map((p) => p.id + (p.defecto ? '=' + p.defecto : '')).join(', '), r.linea ?? ''])));
  P('### Tablero'); P(tabla(['Indicador', 'Tipo', 'Línea'], modelo.tablero.map((t) => [t.titulo, t.tipo, t.linea ?? ''])) + (modelo.tableroGrafico ? '\nGráfico: ' + modelo.tableroGrafico.titulo + '\n' : ''));
  P('### Parámetros del negocio'); P(tabla(['Parámetro', 'Etiqueta', 'Tipo', 'Valor', 'Línea'], modelo.parametros.map((p) => [p.id, p.etiqueta, p.tipo, p.valor, p.linea ?? ''])));
  P('## 7. Roles y usuarios de demostración');
  P(tabla(['Rol', 'Nombre', 'Descripción', 'Línea'], modelo.roles.map((r) => [r.id, r.nombre, r.descripcion, r.linea ?? ''])));
  P('**Hallazgo «credenciales en config»** (se muestran a propósito: es un sistema de práctica):\n');
  P(tabla(['Usuario', 'Nombre', 'Rol', 'Clave en el config', 'Largo', 'Línea'], modelo.usuarios.map((u) => [u.usuario, u.nombre, u.rol, u.clave === null ? '—' : '`' + u.clave + '`', u.clave === null ? '' : u.clave.length, u.linea ?? ''])));
  P('## 8. Matriz de permisos (según el config)');
  P('Leyenda: V ver · C crear · E editar · D eliminar · M emitir · A anular · X ejecutar · +otra acción · — nada · ? sin `permisos` en el config.\n');
  P(tabla(['Recurso', ...idsRol, 'Línea'], matriz.filas.map((f) => [f.recurso + (f.sin_restriccion ? ' (sin roles)' : ''), ...idsRol.map((r) => (!f.definida && f.tipo !== 'reporte' ? '?' : abrev(f.celdas[r] || []))), f.linea ?? ''])));
  P('Pantallas fijas del núcleo (no están en el config; pistas por línea que las nombra junto a un rol):\n');
  P(tabla(['Pantalla', 'Pistas'], matriz.pantallas_fijas.map((p) => [p.pantalla, p.pistas.map((x) => x.archivo + ':' + x.linea + (x.roles_en_la_linea.length ? ' [' + x.roles_en_la_linea.join(',') + ']' : '')).join(' · ') || 'sin pistas (por verificar)'])));
  P('## 9. Fórmulas y reglas (código tal como está)');
  for (const f of modelo.formulas) { P('### ' + f.tipo + ' · `' + f.dueno + '` · ' + f.id + (f.etiqueta ? ' (' + f.etiqueta + ')' : '') + ' — `' + f.archivo + ':' + f.linea + '`'); P('```js'); P(cod(f.codigo)); P('```'); P(); }
}
P('## ' + (MODO === 'sistema' ? '10' : '6') + '. Seguridad');
if (segCfg.length) {
  P('### Configuración efectiva frente a los valores seguros del contrato\n');
  P(tabla(['Clave', 'Seguro', 'Efectivo', 'Declarada', 'Desviación', 'Leída en el código', 'Línea'], segCfg.map((s) => ['`' + s.clave + '`', s.defecto === null ? '—' : String(s.defecto), String(s.efectivo), s.declarado ? 'sí' : 'no', s.desviacion ? '**' + s.riesgo + '**: ' + s.motivo : '', s.leida_en_codigo ? 'sí' : 'no', s.linea_config ?? ''])));
}
P('### Mecanismos detectados por patrón (pistas)\n');
P(tabla(['Mecanismo', 'Estado', 'Evidencia', 'Nota'], mec.map((m) => [m.nombre, '**' + m.estado + '**', evTxt(m.evidencia), m.nota])));
P('## ' + (MODO === 'sistema' ? '11' : '7') + '. Compatibilidad (IE11 / ES5)');
P(compat.veredicto + '\n');
if (compat.sintaxis.length) P(tabla(['Sintaxis', 'Veces', 'Ejemplos'], compat.sintaxis.map((s) => [s.nombre, s.total, evTxt(s.ejemplos)])));
if (compat.apis.length) P(tabla(['API', 'Veces', 'Ejemplos'], compat.apis.map((s) => [s.api, s.total, evTxt(s.ejemplos)])));
if (compat.css.length) P(tabla(['CSS', 'Veces', 'Ejemplos'], compat.css.map((s) => [s.propiedad, s.total, evTxt(s.ejemplos)])));
if (compat.html.length) P(tabla(['HTML', 'Dónde'], compat.html.map((h) => [h.elemento, h.archivo + ':' + h.linea])));
P('_' + compat.nota + '_\n');
P('## ' + (MODO === 'sistema' ? '12' : '8') + '. Hallazgos automáticos (por riesgo)');
P('Todos son punto de partida, no veredictos. Los de tipo `patron` son pistas por regex: verifícalas en el archivo antes de afirmarlas. Los de tipo `config` se leyeron del config cargado en un sandbox.\n');
for (const h of hall) { P('- **' + h.id + ' · ' + h.riesgo.toUpperCase() + '** · ' + h.titulo + ' _(' + h.tipo + ')_  \n  ' + h.detalle + (h.evidencia.length ? '  \n  Evidencia: ' + evTxt(h.evidencia) : '')); }
if (!hall.length) P('_(ninguno)_');
P();
P('## ' + (MODO === 'sistema' ? '13' : '9') + '. Banco de verificación');
P('Elige 5 al azar y compruébalas con el comando. Si una no coincide, la foto o tu lectura está mal: anótalo en `docs/DUDAS_VERIFICABLES.md`.\n');
P(tabla(['Afirmación', 'Dónde', 'Comando'], bancoSel.map((b) => [b.afirmacion, b.archivo + ':' + b.linea, '`' + b.comando + '`'])));
P('## Límites de esta foto');
for (const l of FOTO.limites) P('- ' + l);
P();
const MD = md.join('\n');
const JSON_S = JSON.stringify(FOTO, null, 2) + '\n';

// ───────────────────────── salida ─────────────────────────
mkdirSync(SALIDA, { recursive: true });
writeFileSync(join(SALIDA, 'FOTO.json'), JSON_S);
writeFileSync(join(SALIDA, 'FOTO.md'), MD);
writeFileSync(join(SALIDA, 'hashes.txt'), hashesTxt);
if (!opts.silencio) {
  console.log('Foto del sistema · ' + (sistema.nombre || '(sin nombre)') + ' · modo ' + MODO);
  console.log('  archivos: ' + archivos.length + ' · ' + totalBytes + ' bytes · ' + totalLineas + ' líneas');
  console.log('  huella global: ' + HUELLA);
  console.log('  dependencias externas: ' + dependencias.resultado);
  console.log('  hallazgos: alto ' + hallRes.alto + ' · medio ' + hallRes.medio + ' · bajo ' + hallRes.bajo);
  console.log('  escrito: ' + join(SALIDA, 'FOTO.md') + ' · FOTO.json · hashes.txt');
}
