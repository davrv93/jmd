#!/usr/bin/env node
// Genera UNA vez las imágenes de un negocio con FLUX (Cloudflare) y las deja fijas como recursos:
// guarda cada imagen en <carpeta del JSON>/recursos/<nombre>/<clave>.jpg y escribe «archivo» en el JSON.
// Después construir.mjs ya no llama a ningún servicio para esas imágenes (cero cupo, cero espera).
//
// Uso: node motor/recursos.mjs motor/ejemplos/cafeteria.json [--forzar] [--solo hero,origen]
// Credenciales: CF_ACCOUNT_ID y CF_API_TOKEN en el entorno o en ~/.config/jmd-landings/cloudflare.env
import fs from 'node:fs';
import path from 'node:path';
import { prepararImagenes } from './imagenes.mjs';

const args = process.argv.slice(2);
const ruta = args.find((a) => !a.startsWith('--') && a.endsWith('.json'));
if (!ruta) {
  console.error('Uso: node motor/recursos.mjs <negocio.json> [--forzar] [--solo clave1,clave2]');
  process.exit(2);
}
const forzar = args.includes('--forzar');
const iSolo = args.indexOf('--solo');
const solo = iSolo >= 0 ? args[iSolo + 1].split(',') : null;

const negocio = JSON.parse(fs.readFileSync(ruta, 'utf8'));
const nombre = path.basename(ruta, '.json');
const carpeta = path.join(path.dirname(ruta), 'recursos', nombre);
fs.mkdirSync(carpeta, { recursive: true });

// Estética común de las demos: fotografía o ilustración de calidad, sin el sufijo de un estilo concreto,
// para que el mismo juego de imágenes sirva a todos los estilos.
const estiloNeutro = { id: 'recursos', sufijo_imagen: negocio.sufijo_recursos || 'professional photography, natural light, sharp focus, high detail, editorial quality', marcador: ['#ddd', '#f5f5f5'] };

const pendientes = {};
for (const [clave, im] of Object.entries(negocio.imagenes || {})) {
  if (solo && !solo.includes(clave)) continue;
  if (im.archivo && !forzar && fs.existsSync(path.join(path.dirname(ruta), im.archivo))) continue;
  pendientes[clave] = { ...im, archivo: undefined };
}
if (!Object.keys(pendientes).length) {
  console.log('Nada que generar: todas las imágenes ya tienen «archivo».');
  process.exit(0);
}

const temporal = fs.mkdtempSync(path.join(carpeta, '.tmp-'));
const img = await prepararImagenes({
  negocio: { ...negocio, imagenes: pendientes },
  estilo: estiloNeutro,
  negocioRuta: ruta,
  salida: temporal,
  modo: 'auto',
  registro: console.log,
});

let fijadas = 0;
for (const clave of Object.keys(pendientes)) {
  const r = img(clave);
  if (!r || r.pendiente) { console.log(`  ${clave}: sin imagen (queda pendiente)`); continue; }
  const destino = path.join(carpeta, clave + path.extname(r.src));
  fs.copyFileSync(path.join(temporal, r.src), destino);
  negocio.imagenes[clave].archivo = path.relative(path.dirname(ruta), destino);
  fijadas++;
}
fs.rmSync(temporal, { recursive: true, force: true });
fs.writeFileSync(ruta, JSON.stringify(negocio, null, 2) + '\n');
console.log(`OK ${fijadas} imagen(es) fijadas en ${path.relative(process.cwd(), carpeta)} y escritas en ${ruta}`);
