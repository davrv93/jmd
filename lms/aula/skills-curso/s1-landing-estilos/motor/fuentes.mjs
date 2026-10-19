#!/usr/bin/env node
// Copia local de las fuentes de cada estilo (subconjunto latino, woff2) en estilos/<id>/recursos/.
// Así las landings no dependen de Google Fonts: el Visor del LIVE bloquea estilos y fuentes de
// otros dominios, y un sitio publicado carga más rápido con sus fuentes propias.
// Uso (con internet, una vez, o al cambiar las fuentes de un estilo): node motor/fuentes.mjs [estilo…]
import fs from 'node:fs';
import path from 'node:path';

const MOTOR = path.dirname(new URL(import.meta.url).pathname);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const pedidos = process.argv.slice(2);
const estilos = fs.readdirSync(path.join(MOTOR, 'estilos')).filter((d) => !pedidos.length || pedidos.includes(d));

for (const id of estilos) {
  const dir = path.join(MOTOR, 'estilos', id);
  const metaRuta = path.join(dir, 'estilo.json');
  if (!fs.existsSync(metaRuta)) continue;
  const meta = JSON.parse(fs.readFileSync(metaRuta, 'utf8'));
  const url = meta.fuentes_google || meta.fuentes;
  if (!url || !/fonts\.googleapis\.com/.test(url)) { console.log(`${id}: sin fuentes web`); continue; }
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const bloques = css.split('/*').slice(1).map((b) => ({ subconjunto: b.split('*/')[0].trim(), cuerpo: b.split('*/')[1] || '' }));
  const recursos = path.join(dir, 'recursos');
  fs.mkdirSync(recursos, { recursive: true });
  for (const f of fs.readdirSync(recursos)) if (/^fuente-.*\.woff2$/.test(f)) fs.rmSync(path.join(recursos, f));
  const bajados = new Map();
  let salida = `/* Fuentes de «${meta.nombre}», copia local de Google Fonts (subconjunto latino). Generado por motor/fuentes.mjs */\n`;
  for (const { subconjunto, cuerpo } of bloques) {
    if (subconjunto !== 'latin') continue;
    const familia = cuerpo.match(/font-family:\s*'([^']+)'/)[1];
    const estiloF = (cuerpo.match(/font-style:\s*(\w+)/) || [, 'normal'])[1];
    const peso = (cuerpo.match(/font-weight:\s*([\d ]+)/) || [, '400'])[1].trim();
    const origen = cuerpo.match(/url\(([^)]+)\)/)[1];
    if (!bajados.has(origen)) {
      const nombre = `fuente-${familia.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${peso.replace(' ', '_')}${estiloF === 'italic' ? '-italica' : ''}.woff2`;
      fs.writeFileSync(path.join(recursos, nombre), Buffer.from(await (await fetch(origen)).arrayBuffer()));
      bajados.set(origen, nombre);
    }
    const rango = (cuerpo.match(/unicode-range:\s*([^;]+);/) || [, ''])[1];
    salida += `@font-face { font-family: '${familia}'; font-style: ${estiloF}; font-weight: ${peso}; font-display: swap; src: url('${bajados.get(origen)}') format('woff2');${rango ? ` unicode-range: ${rango};` : ''} }\n`;
  }
  fs.writeFileSync(path.join(recursos, 'fuentes.css'), salida);
  meta.fuentes_google = url;
  meta.fuentes = 'recursos/fuentes.css';
  fs.writeFileSync(metaRuta, JSON.stringify(meta, null, 2) + '\n');
  const peso = [...bajados.values()].reduce((s, f) => s + fs.statSync(path.join(recursos, f)).size, 0);
  console.log(`${id}: ${bajados.size} archivo(s), ${(peso / 1024).toFixed(0)} KB`);
}
