#!/usr/bin/env node
// Motor de landings de la sesión 1: contenido del negocio (JSON) + estilo → sitio estático.
// El alumno cambia el contenido; el estilo y el motor no se tocan.
//
// Uso (Bun o Node 18+):
//   bun motor/construir.mjs --negocio negocio.json --estilo apple
//   bun motor/construir.mjs --negocio negocio.json --todos          # un sitio por estilo + galería
//   opciones: --salida <carpeta>  --imagenes auto|no   (no = marcadores, sin llamar al servicio)
// Imágenes: POST $IMAGEN_URL/generar (por defecto http://imagen:8000) con $IMAGEN_TOKEN u $OSITO_TOKEN.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validar } from './validar.mjs';
import { prepararImagenes } from './imagenes.mjs';
import { pagina } from './secciones.mjs';

const MOTOR = path.dirname(new URL(import.meta.url).pathname);

function argumentos(argv) {
  const a = { imagenes: 'auto' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--todos') a.todos = true;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
  }
  return a;
}

export function estilosDisponibles() {
  return fs.readdirSync(path.join(MOTOR, 'estilos'))
    .filter((d) => fs.existsSync(path.join(MOTOR, 'estilos', d, 'estilo.json')))
    .sort();
}

export function leerEstilo(id) {
  const dir = path.join(MOTOR, 'estilos', id);
  if (!fs.existsSync(path.join(dir, 'estilo.json'))) {
    throw new Error(`El estilo «${id}» no existe. Disponibles: ${estilosDisponibles().join(', ')}`);
  }
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'estilo.json'), 'utf8'));
  return { id, dir, ...meta };
}

function copiar(origen, destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origen, destino);
}

export async function construir({ negocioRuta, estiloId, salida, imagenes = 'auto', registro = console.log }) {
  const negocio = JSON.parse(fs.readFileSync(negocioRuta, 'utf8'));
  const problemas = validar(negocio);
  if (problemas.length) throw new Error('El JSON del negocio tiene problemas:\n- ' + problemas.join('\n- '));
  const estilo = leerEstilo(estiloId || negocio.estilo || 'apple');
  const plantillasRuta = path.join(estilo.dir, 'plantillas.mjs');
  const plantillas = fs.existsSync(plantillasRuta) ? (await import(pathToFileURL(plantillasRuta).href)).default : {};

  fs.mkdirSync(salida, { recursive: true });
  const img = await prepararImagenes({ negocio, estilo, negocioRuta, salida, modo: imagenes, registro });

  // Recursos: base común, motor de movimiento y el estilo
  copiar(path.join(MOTOR, 'comun', 'base.css'), path.join(salida, 'recursos', 'base.css'));
  copiar(path.join(estilo.dir, 'estilo.css'), path.join(salida, 'recursos', 'estilo.css'));
  if (!estilo.sin_js) {
    copiar(path.join(MOTOR, 'comun', 'vendor', 'gsap.min.js'), path.join(salida, 'recursos', 'gsap.min.js'));
    copiar(path.join(MOTOR, 'comun', 'vendor', 'ScrollTrigger.min.js'), path.join(salida, 'recursos', 'ScrollTrigger.min.js'));
    copiar(path.join(MOTOR, 'comun', 'movimiento.js'), path.join(salida, 'recursos', 'movimiento.js'));
  }
  if (fs.existsSync(path.join(estilo.dir, 'estilo.js'))) copiar(path.join(estilo.dir, 'estilo.js'), path.join(salida, 'recursos', 'estilo.js'));
  if (fs.existsSync(path.join(estilo.dir, 'recursos'))) {
    for (const f of fs.readdirSync(path.join(estilo.dir, 'recursos'))) copiar(path.join(estilo.dir, 'recursos', f), path.join(salida, 'recursos', f));
  }

  const html = pagina({ negocio, estilo, img, plantillas });
  fs.writeFileSync(path.join(salida, 'index.html'), html);
  registro(`OK ${estilo.id} → ${path.join(salida, 'index.html')}`);
  return { estilo, salida };
}

function galeria(negocio, hechos) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(negocio.negocio.nombre)} · estilos</title>
<style>@view-transition{navigation:auto}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#111318;color:#eceae4}
main{max-width:1100px;margin:0 auto;padding:48px 20px}h1{font-size:clamp(28px,4vw,44px);margin:0 0 8px}p{color:#a9a7a1;margin:0 0 32px}
ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
a{display:block;padding:20px;border-radius:14px;background:#1c1f27;color:inherit;text-decoration:none;border:1px solid #2a2e39}
a:hover,a:focus-visible{border-color:#ebd58c;outline:none}b{display:block;font-size:20px}span{color:#a9a7a1;font-size:14px}</style></head>
<body><main><h1>${esc(negocio.negocio.nombre)}</h1><p>El mismo contenido en ${hechos.length} estilos. Rubro: ${esc(negocio.negocio.rubro)}.</p>
<ul>${hechos.map((e) => `<li><a href="${e.id}/index.html"><b>${esc(e.nombre)}</b><span>${esc(e.descripcion || '')}</span></a></li>`).join('')}</ul></main></body></html>`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = argumentos(process.argv.slice(2));
  if (!a.negocio) {
    console.error('Falta --negocio <archivo.json>. Ejemplo: bun motor/construir.mjs --negocio motor/ejemplos/cafeteria.json --estilo apple');
    console.error('Estilos: ' + estilosDisponibles().join(', '));
    process.exit(2);
  }
  try {
    if (a.todos) {
      const base = a.salida || path.join(path.dirname(a.negocio), 'sitios-' + path.basename(a.negocio, '.json'));
      const hechos = [];
      for (const id of estilosDisponibles()) {
        const { estilo } = await construir({ negocioRuta: a.negocio, estiloId: id, salida: path.join(base, id), imagenes: a.imagenes });
        hechos.push(estilo);
      }
      const negocio = JSON.parse(fs.readFileSync(a.negocio, 'utf8'));
      fs.writeFileSync(path.join(base, 'index.html'), galeria(negocio, hechos));
      console.log('Galería → ' + path.join(base, 'index.html'));
    } else {
      const id = a.estilo || JSON.parse(fs.readFileSync(a.negocio, 'utf8')).estilo || 'apple';
      await construir({ negocioRuta: a.negocio, estiloId: id, salida: a.salida || path.join(path.dirname(a.negocio), 'sitio-' + id), imagenes: a.imagenes });
    }
  } catch (e) {
    console.error('ERROR: ' + e.message);
    process.exit(1);
  }
}
