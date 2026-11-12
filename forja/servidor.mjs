// Forja · servidor. Sirve el estudio (web/) y entiende descripciones con embeddings locales (multilingual-e5-small
// en ONNX, CPU). Ninguna petición sale a servicios de IA: el modelo vive en ./modelos.
//   POST /api/interpretar {"texto":"un michi rechoncho de fuego con lentes"}
//   GET  /api/estado
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { interpretar, normaliza } from './web/motor/interprete.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(AQUI, 'web');
const PUERTO = +(process.env.PORT || 18697);
const reglas = JSON.parse(fs.readFileSync(path.join(WEB, 'datos', 'reglas.json'), 'utf8'));
const lexico = JSON.parse(fs.readFileSync(path.join(WEB, 'datos', 'lexico.json'), 'utf8'));

// ---------------------------------------------------------------- embeddings
let embeber = null, indice = null, estadoModelo = 'cargando';
async function cargarModelo() {
  try {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = process.env.FORJA_MODELOS || path.join(AQUI, 'modelos');
    env.allowRemoteModels = process.env.FORJA_DESCARGAR === '1'; // en producción el modelo ya está en disco
    // un solo hilo y sin reserva adelantada de memoria: el servidor comparte RAM con otros servicios
    const ex = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8', session_options: { enableCpuMemArena: false, enableMemPattern: false, intraOpNumThreads: 1, interOpNumThreads: 1 } });
    embeber = async (textos) => (await ex(textos, { pooling: 'mean', normalize: true })).tolist();
    const fam = await embeber(lexico.familias.map((f) => `passage: ${f.desc}`));
    const va = await embeber(lexico.variantes.map((v) => `passage: ${v.desc}`));
    indice = { fam, va };
    estadoModelo = 'listo';
    console.log('embeddings listos:', fam.length, 'familias,', va.length, 'variantes');
  } catch (e) { estadoModelo = 'apagado'; console.error('sin embeddings (se usa solo el léxico):', e.message); }
}
const punto = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
// e5 da cosenos muy juntos (0.78–0.88): se comparan como puntaje z contra el resto de candidatos
function ranking(q, vecs) {
  const s = vecs.map((v) => punto(q, v)), m = s.reduce((a, b) => a + b, 0) / s.length;
  const de = Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / s.length) || 1;
  return s.map((x, i) => ({ i, z: (x - m) / de })).sort((a, b) => b.z - a.z);
}

async function entender(texto) {
  const t0 = Date.now();
  const r = interpretar(texto, lexico, reglas.T.modificador);
  let fuente = 'léxico', alternativas = [];
  if (embeber && normaliza(texto).length > 1) {
    const [q] = await embeber([`query: ${texto}`]);
    const rf = ranking(q, indice.fam);
    alternativas = rf.slice(0, 5).map((x) => ({ id: lexico.familias[x.i].id, z: +x.z.toFixed(2) }));
    if (!r.familia) { r.familia = lexico.familias[rf[0].i].id; r.entendido.unshift({ tipo: 'familia', id: r.familia, texto: 'por significado', z: +rf[0].z.toFixed(2) }); fuente = 'embeddings'; }
    if (!r.variante && r.resto.length > 2) {
      const [qr] = await embeber([`query: ${r.resto}`]);
      const rv = ranking(qr, indice.va);
      if (rv[0].z > 2.1) { r.variante = lexico.variantes[rv[0].i].id; r.entendido.push({ tipo: 'variante', id: r.variante, texto: 'por significado', z: +rv[0].z.toFixed(2) }); fuente = fuente === 'léxico' ? 'léxico + embeddings' : fuente; }
    }
  }
  return { ...r, fuente, alternativas, ms: Date.now() - t0 };
}

// ---------------------------------------------------------------- galería de la clase
// Cada sala (código que da el instructor) guarda personajes como estado del estudio: [familia, variante, semilla, params].
// No se suben imágenes: cada navegador redibuja la miniatura con las reglas. Se guarda en un JSON en FORJA_DATOS.
const DATOS = process.env.FORJA_DATOS || path.join(AQUI, 'datos');
const ARCHIVO = path.join(DATOS, 'galeria.json'), CLAVE = process.env.FORJA_CLAVE || '';
let galeria = [];
try { galeria = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch { /* primera vez */ }
let guardando = null;
function guardar() { clearTimeout(guardando); guardando = setTimeout(() => { try { fs.mkdirSync(DATOS, { recursive: true }); fs.writeFileSync(ARCHIVO + '.tmp', JSON.stringify(galeria)); fs.renameSync(ARCHIVO + '.tmp', ARCHIVO); } catch (e) { console.error('galería sin guardar:', e.message); } }, 400); }
const limpio = (t, n) => String(t || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const salaOk = (x) => /^[a-z0-9-]{2,24}$/.test(x);
const PARAMS_OK = new Set(['altura', 'peso', 'cabeza', 'ojos', 'brazos', 'piernas', 'tono', 'luzAbs', 'satAbs', 'armonia', 'animo', 'expresion', 'ojoEstilo', 'edad', 'patron', 'accesorios', 'fondo', 'tonos', 'accAjuste']);
function estadoValido(e) {
  if (!Array.isArray(e) || e.length !== 4 || JSON.stringify(e).length > 1500) return null;
  const [f, v, sem, p] = e;
  if (!reglas.T.tipo[`${f}|${v}`] || !Number.isFinite(+sem) || typeof p !== 'object' || !p || Array.isArray(p)) return null;
  const q = {};
  for (const [k, val] of Object.entries(p)) {
    if (!PARAMS_OK.has(k)) continue;
    if (typeof val === 'number' && Number.isFinite(val)) q[k] = val;
    else if (typeof val === 'string' && /^[a-z_]{1,24}$/.test(val)) q[k] = val;
    else if (k === 'accesorios' && Array.isArray(val)) q[k] = val.filter((x) => typeof x === 'string' && reglas.T.acc[`${f}|${x}`]).slice(0, 8);
    else if (k === 'accAjuste' && val && typeof val === 'object') q[k] = Object.fromEntries(Object.entries(val).filter(([a, b]) => reglas.T.acc[`${f}|${a}`] && b && typeof b === 'object').slice(0, 8).map(([a, b]) => [a, Object.fromEntries(['e', 'y', 'z'].filter((x) => Number.isFinite(b[x])).map((x) => [x, Math.max(-2, Math.min(2, b[x]))]))]));
    else if (k === 'tonos' && val && typeof val === 'object') q[k] = Object.fromEntries(Object.entries(val).filter(([a, b]) => reglas.meta.partes.includes(a) && Number.isFinite(b)).slice(0, 6));
  }
  return [f, v, Math.abs(Math.floor(+sem)) % 1e9, q];
}
async function cuerpoJSON(req, max = 4000) { let c = ''; for await (const x of req) { c += x; if (c.length > max) return null; } try { return JSON.parse(c || '{}'); } catch { return null; } }
async function apiGaleria(req, res, url, ip) {
  if (req.method === 'GET') {
    const sala = url.searchParams.get('sala') || '';
    if (!salaOk(sala)) return json(res, 400, { error: 'sala inválida' });
    return json(res, 200, { sala, items: galeria.filter((g) => g.sala === sala).map(({ quienes, ...g }) => ({ ...g, votos: quienes.length })).sort((a, b) => b.votos - a.votos || b.t - a.t) });
  }
  if (!permitido('g' + ip, 600)) return json(res, 429, { error: 'muchas consultas: espera un minuto' });
  const d = await cuerpoJSON(req); if (!d) return json(res, 400, { error: 'JSON inválido' });
  if (url.pathname.endsWith('/voto')) {
    const g = galeria.find((x) => x.id === d.id), quien = limpio(d.quien, 40);
    if (!g || quien.length < 8) return json(res, 404, { error: 'no existe' });
    const i = g.quienes.indexOf(quien); if (i >= 0) g.quienes.splice(i, 1); else if (g.quienes.length < 2000) g.quienes.push(quien);
    guardar(); return json(res, 200, { votos: g.quienes.length, mio: i < 0 });
  }
  if (url.pathname.endsWith('/borrar')) {
    if (!CLAVE || d.clave !== CLAVE) return json(res, 403, { error: 'clave incorrecta' });
    const antes = galeria.length; galeria = galeria.filter((x) => x.id !== d.id && !(d.sala && d.todo && x.sala === d.sala)); guardar();
    return json(res, 200, { borrados: antes - galeria.length });
  }
  const sala = String(d.sala || ''), e = estadoValido(d.e), autor = limpio(d.autor, 24), nombre = limpio(d.nombre, 40);
  if (!salaOk(sala) || !e || autor.length < 2) return json(res, 400, { error: 'faltan datos: sala, tu nombre y un personaje válido' });
  if (galeria.filter((g) => g.sala === sala).length >= 200) return json(res, 409, { error: 'la sala está llena (200)' });
  if (galeria.length >= 4000) galeria.splice(0, 200);
  const quien = limpio(d.quien, 40);
  const previo = galeria.find((g) => g.sala === sala && g.autorId === quien && quien.length >= 8 && g.autor === autor && JSON.stringify(g.e) === JSON.stringify(e));
  if (previo) return json(res, 200, { id: previo.id, repetido: true });
  const item = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), sala, autor, autorId: quien, nombre: nombre || 'Sin nombre', e, t: Date.now(), quienes: [] };
  galeria.push(item); guardar();
  return json(res, 200, { id: item.id });
}

// ---------------------------------------------------------------- http
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const json = (res, st, o) => { res.writeHead(st, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const cubeta = new Map(); // límite por IP y minuto. Es holgado a propósito: una clase entera sale por la misma IP
function permitido(ip, max = 240) { const ahora = Date.now(), v = (cubeta.get(ip) || []).filter((t) => ahora - t < 60000); if (v.length >= max) return false; v.push(ahora); cubeta.set(ip, v); if (cubeta.size > 5000) cubeta.clear(); return true; }

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/estado') return json(res, 200, { reglas: reglas.meta.total, tipos: reglas.meta.tipos, embeddings: estadoModelo, modelo: 'multilingual-e5-small (ONNX, CPU, local)' });
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (url.pathname.startsWith('/api/galeria')) return await apiGaleria(req, res, url, ip);
    if (url.pathname === '/api/interpretar' && req.method === 'POST') {
      if (!permitido(ip)) return json(res, 429, { error: 'muchas consultas: espera un minuto' });
      let cuerpo = '';
      for await (const c of req) { cuerpo += c; if (cuerpo.length > 4000) return json(res, 413, { error: 'texto muy largo' }); }
      let texto = '';
      try { texto = String(JSON.parse(cuerpo || '{}').texto || '').slice(0, 300); } catch { return json(res, 400, { error: 'JSON inválido' }); }
      return json(res, 200, await entender(texto));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'método no permitido' });
    let ruta = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (ruta.endsWith('/')) ruta += 'index.html';
    const archivo = path.join(WEB, ruta);
    if (!archivo.startsWith(WEB) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); return res.end('no encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': ruta.includes('/vendor/') ? 'public, max-age=604800' : 'no-cache' });
    fs.createReadStream(archivo).pipe(res);
  } catch (e) { console.error(e); if (!res.headersSent) json(res, 500, { error: 'error interno' }); }
}).listen(PUERTO, () => { console.log(`Forja en :${PUERTO} · ${reglas.meta.total} reglas · ${reglas.meta.tipos} tipos`); cargarModelo(); });
