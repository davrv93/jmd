// Corre el extractor por reglas sobre el banco de 100 giros y reporta cuántos aciertan.
// Sin IA ni red. También construye el sitio de cada caso con --imagenes no en una carpeta
// temporal (y la borra) para probar que el JSON que sale llega a index.html.
//
//   bun motor/pruebas/probar-extraer.mjs                 # banco por defecto, construye todo
//   bun motor/pruebas/probar-extraer.mjs --detalle       # lista cada fallo (esperado vs obtenido)
//   bun motor/pruebas/probar-extraer.mjs --construir no  # solo extracción (más rápido)
//   bun motor/pruebas/probar-extraer.mjs --extractor /ruta/otro-extraer.mjs   # comparar versiones
//
// Sale con código 1 si alguna meta no se cumple (JSON válido y construcción 100 %,
// nombre y WhatsApp ≥ 98, rubro ≥ 95, servicios ≥ 80, precios inventados = 0).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validar } from '../validar.mjs';
import { construir, estilosDisponibles } from '../construir.mjs';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const detalle = args.includes('--detalle');
const conConstruir = opt('construir', 'si') !== 'no';
const rutaBanco = opt('banco', path.join(AQUI, 'giros-100.jsonl'));
const rutaExtractor = path.resolve(opt('extractor', path.join(AQUI, '..', 'extraer.mjs')));
const { extraer } = await import(pathToFileURL(rutaExtractor).href);

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const casos = fs.readFileSync(rutaBanco, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const estilos = estilosDisponibles();

// Métricas: nombre → función que devuelve true/false y, si falla, qué se esperaba y qué salió.
const METRICAS = {
  'JSON válido': (o) => ({ ok: validar(o).length === 0, got: validar(o).join(' | ') }),
  'nombre': (o, e) => ({ ok: norm(o.negocio.nombre) === norm(e.negocio.nombre), got: o.negocio.nombre, exp: e.negocio.nombre }),
  'whatsapp': (o, e) => ({ ok: o.negocio.whatsapp === e.negocio.whatsapp, got: o.negocio.whatsapp, exp: e.negocio.whatsapp }),
  'rubro': (o, e) => ({ ok: norm(o.negocio.rubro) === norm(e.negocio.rubro), got: o.negocio.rubro, exp: e.negocio.rubro }),
  'ciudad': (o, e) => ({ ok: norm(o.negocio.ciudad) === norm(e.negocio.ciudad), got: o.negocio.ciudad, exp: e.negocio.ciudad }),
  'servicios exactos': (o, e) => {
    const a = (o.secciones[0]?.items || []).map((i) => norm(i.titulo)).sort().join(' / ');
    const b = (e.secciones[0]?.items || []).map((i) => norm(i.titulo)).sort().join(' / ');
    return { ok: a === b, got: a, exp: b };
  },
  'sin precios inventados': (o, e, texto) => {
    // Todo precio que sale (planes y oferta) tiene que estar escrito en el texto del cliente,
    // y no debe haber sección de precios ni oferta si el cliente no dio ninguno.
    const numerosTexto = new Set((texto.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.')));
    const precios = (o.secciones.find((s) => s.tipo === 'precios')?.planes || []).map((p) => p.precio);
    const ofertaP = o.oferta ? [o.oferta.precio, o.oferta.antes].filter(Boolean) : [];
    const todos = [...precios, ...ofertaP].map((p) => String(p).replace(/S\/\s*/, ''));
    const inventados = todos.filter((p) => !numerosTexto.has(p));
    const esperaPrecios = e.secciones.some((s) => s.tipo === 'precios');
    const sobran = (!esperaPrecios && precios.length > 0) || (!e.oferta && o.oferta);
    return { ok: inventados.length === 0 && !sobran, got: inventados.length ? 'inventados: ' + inventados.join(', ') : 'sobran precios/oferta que el cliente no dio', exp: '' };
  },
  // informativas (no son meta)
  'correo': (o, e) => ({ ok: norm(o.negocio.correo) === norm(e.negocio.correo), got: o.negocio.correo, exp: e.negocio.correo }),
  'dirección': (o, e) => ({ ok: norm(o.negocio.direccion) === norm(e.negocio.direccion), got: o.negocio.direccion, exp: e.negocio.direccion }),
  'horario': (o, e) => ({ ok: norm(o.negocio.horario) === norm(e.negocio.horario), got: o.negocio.horario, exp: e.negocio.horario }),
  'lema': (o, e) => ({ ok: norm(o.negocio.lema) === norm(e.negocio.lema), got: o.negocio.lema, exp: e.negocio.lema }),
  'precios exactos': (o, e) => {
    const f = (x) => (x.secciones.find((s) => s.tipo === 'precios')?.planes || []).map((p) => `${norm(p.nombre)}=${p.precio}`).sort().join(' / ');
    return { ok: f(o) === f(e), got: f(o), exp: f(e) };
  },
  'oferta': (o, e) => ({ ok: (o.oferta?.precio || '') === (e.oferta?.precio || '') && (o.oferta?.antes || '') === (e.oferta?.antes || ''), got: o.oferta ? `${o.oferta.precio} antes ${o.oferta.antes}` : '', exp: e.oferta ? `${e.oferta.precio} antes ${e.oferta.antes}` : '' }),
};
const METAS = { 'JSON válido': 100, 'construcción OK': 100, 'nombre': 98, 'whatsapp': 98, 'rubro': 95, 'servicios exactos': 80, 'sin precios inventados': 100 };

const conteo = Object.fromEntries([...Object.keys(METRICAS), 'construcción OK'].map((k) => [k, 0]));
const fallos = [];
const tmp = conConstruir ? fs.mkdtempSync(path.join(os.tmpdir(), 'giros-100-')) : null;
const t0 = Date.now();
for (const [i, c] of casos.entries()) {
  const { negocio } = extraer(c.texto, { estilo: 'apple' });
  for (const [k, f] of Object.entries(METRICAS)) {
    const r = f(negocio, c.esperado, c.texto);
    if (r.ok) conteo[k]++;
    else fallos.push({ k, giro: c.giro, forma: c.forma, got: r.got, exp: r.exp });
  }
  if (conConstruir) {
    const estilo = estilos[i % estilos.length];
    const ruta = path.join(tmp, `${i}.json`);
    fs.writeFileSync(ruta, JSON.stringify(negocio));
    try {
      await construir({ negocioRuta: ruta, estiloId: estilo, salida: path.join(tmp, `sitio-${i}`), imagenes: 'no', registro: () => {} });
      const html = fs.readFileSync(path.join(tmp, `sitio-${i}`, 'index.html'), 'utf8');
      if (!html.includes('wa.me/' + negocio.negocio.whatsapp) && negocio.negocio.whatsapp) throw new Error('el HTML no trae el enlace de WhatsApp');
      conteo['construcción OK']++;
    } catch (e) {
      fallos.push({ k: 'construcción OK', giro: c.giro, forma: c.forma, got: `${estilo}: ${e.message.split('\n')[0]}`, exp: 'OK' });
    }
  }
}
if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
const ms = Date.now() - t0;

const n = casos.length;
console.log(`Banco: ${path.basename(rutaBanco)} · ${n} casos · extractor: ${path.relative(process.cwd(), rutaExtractor)} · ${(ms / 1000).toFixed(1)} s${conConstruir ? ` (incluye construir ${n} sitios, estilos rotando: ${estilos.join(', ')})` : ''}`);
console.log('');
console.log('| Métrica | Aciertos | Meta | |');
console.log('|---|---|---|---|');
let cumple = true;
for (const k of Object.keys(conteo)) {
  if (k === 'construcción OK' && !conConstruir) continue;
  const meta = METAS[k];
  const ok = meta === undefined || conteo[k] >= (meta / 100) * n;
  if (!ok) cumple = false;
  console.log(`| ${k} | ${conteo[k]}/${n} | ${meta !== undefined ? '≥ ' + meta : '—'} | ${meta === undefined ? 'informativa' : ok ? 'cumple' : 'NO cumple'} |`);
}
if (detalle && fallos.length) {
  console.log('\nFallos:');
  for (const f of fallos) console.log(`- [${f.k}] ${f.giro} (${f.forma}): esperado «${f.exp ?? ''}» · salió «${f.got ?? ''}»`);
}
if (!detalle && fallos.length) console.log(`\n${fallos.length} fallos en total; corre con --detalle para verlos.`);
process.exit(cumple ? 0 : 1);
