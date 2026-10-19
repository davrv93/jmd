// Imágenes del sitio. Orden de preferencia:
//   1) «archivo»: la imagen que entregó el cliente (o un recurso ya generado y guardado).
//   2) FLUX en Cloudflare Workers AI, directo, si hay CF_ACCOUNT_ID y CF_API_TOKEN
//      (en el entorno o en ~/.config/jmd-landings/cloudflare.env).
//   3) El servicio de imagen de la clase ($IMAGEN_URL) SIEMPRE en calidad «maxima» (FLUX en la nube):
//      las calidades «baja» y «media» (sd-turbo) no se usan para landings: deforman y se ven pobres.
//   4) Un marcador SVG «imagen pendiente», para que el sitio se construya igual y se vea qué falta.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

// Los ejemplos traen sus imágenes fijas en motor/ejemplos/recursos/: si el alumno copia solo el JSON a
// su carpeta, el «archivo» relativo se busca también ahí.
const EJEMPLOS = path.join(path.dirname(new URL(import.meta.url).pathname), 'ejemplos');

const FORMAS = { cuadrado: [1, 1], horizontal: [3, 2], vertical: [2, 3] };

function marcador(clave, im, estilo) {
  const [a, b] = FORMAS[im.orientacion] || FORMAS.cuadrado;
  const w = 1200, h = Math.round((w * b) / a);
  const [c1, c2] = estilo.marcador || ['#d8d8de', '#f4f4f6'];
  const texto = String(im.descripcion || im.prompt || clave).slice(0, 80).replace(/[&<>]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" fill="rgba(0,0,0,.45)">imagen pendiente · ${texto}</text></svg>`;
}

function credencialesCloudflare() {
  let { CF_ACCOUNT_ID: cuenta, CF_API_TOKEN: token } = process.env;
  const archivo = process.env.CF_ENV_ARCHIVO || path.join(os.homedir(), '.config', 'jmd-landings', 'cloudflare.env');
  if ((!cuenta || !token) && fs.existsSync(archivo)) {
    for (const linea of fs.readFileSync(archivo, 'utf8').split('\n')) {
      const m = linea.match(/^\s*(CF_ACCOUNT_ID|CF_API_TOKEN)\s*=\s*"?([^"\s]+)"?\s*$/);
      if (m && m[1] === 'CF_ACCOUNT_ID') cuenta = cuenta || m[2];
      if (m && m[1] === 'CF_API_TOKEN') token = token || m[2];
    }
  }
  return cuenta && token ? { cuenta, token } : null;
}

// FLUX en Workers AI devuelve JPEG cuadrado en base64. El recorte al formato lo hace el CSS
// (object-fit: cover), así que se guarda tal cual: más resolución para los recortes de cada estilo.
async function generarCloudflare(cf, prompt) {
  const modelo = process.env.CF_MODELO || '@cf/black-forest-labs/flux-1-schnell';
  const pasos = parseInt(process.env.CF_PASOS || '6', 10);
  for (let intento = 1; intento <= 3; intento++) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cf.cuenta}/ai/run/${modelo}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cf.token}`, 'Content-Type': 'application/json' },
      // FLUX schnell en Workers AI no acepta «seed» (responde 400): cada llamada sale distinta, y la
      // «semilla» del JSON solo cambia la huella de la caché, que es lo que hace que la imagen se rehaga.
      body: JSON.stringify({ prompt, steps: pasos }),
      signal: AbortSignal.timeout(120000),
    });
    if (r.status === 409 && intento < 3) continue; // «Cog prediction failed»: se reintenta
    if (r.status === 429) throw new Error('cupo diario de Cloudflare agotado (se reinicia a las 19:00 en Lima)');
    if (!r.ok) throw new Error(`Cloudflare respondió ${r.status}`);
    const tipo = r.headers.get('content-type') || '';
    if (tipo.startsWith('image/')) return Buffer.from(await r.arrayBuffer());
    const d = await r.json();
    return Buffer.from(d.result.image, 'base64');
  }
  throw new Error('Cloudflare no respondió tras 3 intentos');
}

async function generarServicio(url, token, prompt, orientacion, semilla) {
  const r = await fetch(url.replace(/\/$/, '') + '/generar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ prompt, orientacion, calidad: 'maxima', semilla }),
    signal: AbortSignal.timeout(300000),
  });
  if (r.status === 429) {
    // Tope de 5 imágenes por alumno al día, o cupo de la clase agotado: el servidor dice cuál.
    const d = await r.json().catch(() => ({}));
    const msj = (d.detail && (d.detail.mensaje || d.detail)) || 'cupo diario de imágenes agotado';
    throw Object.assign(new Error(typeof msj === 'string' ? msj : 'cupo diario de imágenes agotado'), { cupo: true });
  }
  if (!r.ok) throw new Error(`servicio de imagen respondió ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export async function prepararImagenes({ negocio, estilo, negocioRuta, salida, modo, registro }) {
  const imgs = negocio.imagenes || {};
  const cf = credencialesCloudflare();
  const url = process.env.IMAGEN_URL || 'http://imagen:8000';
  const token = process.env.IMAGEN_TOKEN || process.env.OSITO_TOKEN || '';
  const base = path.dirname(negocioRuta);
  const cache = path.join(base, '.imagenes');
  fs.mkdirSync(path.join(salida, 'img'), { recursive: true });
  const mapa = {};
  let avisado = false;
  let motor = cf ? 'cloudflare' : token ? 'servicio' : null;

  for (const [clave, im] of Object.entries(imgs)) {
    const orientacion = im.orientacion || 'horizontal';
    const alt = im.descripcion || '';
    // 1) Archivo entregado por el cliente o recurso ya generado
    if (im.archivo) {
      const candidatos = path.isAbsolute(im.archivo) ? [im.archivo] : [path.join(base, im.archivo), path.join(EJEMPLOS, im.archivo)];
      const origen = candidatos.find((c) => fs.existsSync(c));
      if (origen) {
        const ext = path.extname(origen) || '.jpg';
        fs.copyFileSync(origen, path.join(salida, 'img', clave + ext));
        mapa[clave] = { src: `img/${clave}${ext}`, alt, orientacion };
        continue;
      }
      registro(`  aviso: imagenes.${clave}.archivo no existe (${im.archivo}); intento generarla`);
    }
    // 2-3) Generada con FLUX: el prompt del alumno + el sufijo del estilo (misma estética en todo el sitio)
    const prompt = [im.prompt, estilo.sufijo_imagen].filter(Boolean).join(', ');
    const semilla = Number.isInteger(im.semilla) ? im.semilla : 7;
    const huella = crypto.createHash('sha1').update(`flux|${prompt}|${semilla}`).digest('hex').slice(0, 16);
    const enCache = path.join(cache, huella + '.jpg');
    if (!fs.existsSync(enCache) && modo !== 'no' && motor) {
      try {
        fs.mkdirSync(cache, { recursive: true });
        const datos = motor === 'cloudflare' ? await generarCloudflare(cf, prompt) : await generarServicio(url, token, prompt, orientacion, semilla);
        fs.writeFileSync(enCache, datos);
        registro(`  imagen ${clave} generada (${motor})`);
      } catch (e) {
        if (!avisado) registro(`  aviso: no se pudo generar imágenes (${e.message}); uso marcadores`);
        avisado = true;
        if (e.cupo) motor = null; // sin cupo no tiene sentido pedir las demás
      }
    } else if (!motor && modo !== 'no' && !avisado) {
      registro('  aviso: sin credenciales de Cloudflare ni token del servicio de imagen; uso marcadores');
      avisado = true;
    }
    if (fs.existsSync(enCache)) {
      fs.copyFileSync(enCache, path.join(salida, 'img', clave + '.jpg'));
      mapa[clave] = { src: `img/${clave}.jpg`, alt, orientacion };
    } else {
      fs.writeFileSync(path.join(salida, 'img', clave + '.svg'), marcador(clave, im, estilo));
      mapa[clave] = { src: `img/${clave}.svg`, alt, orientacion, pendiente: true };
    }
  }
  return (clave) => mapa[clave] || null;
}
