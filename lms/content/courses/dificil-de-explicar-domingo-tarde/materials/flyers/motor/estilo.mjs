// estilo.mjs · conecta el motor de flyers con la biblioteca de estilos (live/_comun/estilos-*).
// Cada brief pasa por clasificar(): de su pack toma la paleta 60-30-10 (con contraste AA ya verificado),
// el par tipográfico, la foto real del rubro (con tinte hacia la paleta), la textura, el grano y los iconos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const COMUN = path.resolve(AQUI, '..', '..', '..', 'live', '_comun');
const E = await import(pathToFileURL(path.join(COMUN, 'estilos-clasificar.js')).href);
const CAT = E.CATALOGO;

// rubro del brief → palabras para el clasificador y rubro de las fotos
const RUBRO = {
  perfumes: { texto: 'perfume fragancia', foto: ['perfume'] },
  cosmeticos: { texto: 'cosmetica skincare belleza', foto: ['cosmetica'] },
  ropa: { texto: 'ropa moda', foto: ['moda'] },
  comida: { texto: 'comida restaurante', foto: ['comida'] },
  postres: { texto: 'postres pasteleria', foto: ['postres'] },
  cafe: { texto: 'cafe cafeteria', foto: ['cafe'] },
  bebidas: { texto: 'bebidas jugos', foto: ['bebidas'] },
  tecnologia: { texto: 'tecnologia', foto: ['tecnologia'] },
  servicios: { texto: 'servicio', foto: ['servicios'] },
  b2b: { texto: 'empresa corporativo profesional', foto: ['empresa'] },
  educacion: { texto: 'curso capacitacion clases online', foto: ['tecnologia', 'empresa'] },
};

const cache = new Map();
const usos = new Map();
const b64 = (archivo) => {
  if (!cache.has(archivo)) cache.set(archivo, fs.readFileSync(path.join(COMUN, archivo)).toString('base64'));
  return cache.get(archivo);
};
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function archivoFuente(familia, estilo = 'normal') {
  const lista = CAT.fuentes[familia] || [];
  return lista.find((d) => d.style === estilo) || lista[0];
}

/** clasifica el brief y le cuelga `pack` (todo lo que el motor necesita para vestirlo) */
export function conPack(b0) {
  const b = JSON.parse(JSON.stringify(b0));
  const R = RUBRO[b.rubro] || { texto: b.rubro, foto: [] };
  const texto = [R.texto, b.tono, b.nombre, b.producto, b.beneficio, b.gancho].filter(Boolean).join(', ');
  const r = E.clasificar(texto);
  const pk = r.pack, p = pk.paleta, T = pk.tipos;
  // 30 %: superficie del motor = secundario del pack si el texto se lee encima; si no, la superficie
  const sup = E.contraste(p.texto, p.secundario) >= 4.5 ? p.secundario : p.superficie;
  b.paleta = { fondo: p.fondo, superficie: sup, texto: p.texto, acento: p.acento, texto_acento: p.sobre_acento };
  // fotos del rubro del brief: primero las del tono del pack; dos distintas por flyer
  // la foto que mejor cuenta ESTE brief: rubro, palabras en común con su descripción y tono del pack
  const raicesBrief = new Set(E.normalizar(texto).split(' ').filter((w) => w.length > 3).map(E.raiz));
  const puntuar = (f) => {
    const comunes = E.normalizar(f.descripcion).split(' ').filter((w) => w.length > 3).map(E.raiz).filter((w) => raicesBrief.has(w)).length;
    return (R.foto.includes(f.rubro) ? 3 : 0) + Math.min(2, comunes) * 1.2 - (usos.get(f.archivo) || 0) * 2.2 + (f.tono === pk.tono ? 0.6 : f.tono === 'medio' ? 0.3 : 0) + ((hash(b.id + f.archivo) % 100) / 100) * 1.2;
  };
  // solo fotos del rubro del brief (si las hay): la rotación nunca debe sacar un jugo en un flyer de educación
  const candidatas = CAT.fotos.filter((f) => R.foto.includes(f.rubro) && !f.marca_visible);
  const orden = [...(candidatas.length ? candidatas : CAT.fotos)].sort((a, c) => puntuar(c) - puntuar(a));
  const foto = orden[0], foto2 = orden.find((f) => f !== foto && f.rubro === foto.rubro) || orden[1];
  // rotación: una foto ya usada en esta corrida pierde puntos, así 10 flyers de un rubro no repiten la misma
  for (const x of [foto, foto2]) if (x) usos.set(x.archivo, (usos.get(x.archivo) || 0) + (x === foto ? 1 : 0.5));
  const ft = archivoFuente(T.titular.familia, T.titular.estilo), fc = archivoFuente(T.texto.familia, 'normal');
  const ico = (nombre) => {
    const a = E.icono(nombre, pk);
    return fs.existsSync(path.join(COMUN, a)) ? fs.readFileSync(path.join(COMUN, a), 'utf8').replace('<svg ', '<svg class="ico" aria-hidden="true" ') : '';
  };
  const forma = pk.forma || '';
  b.pack = {
    id: pk.id, nombre: pk.nombre, estilo: pk.estilo, tono: pk.tono, puntaje: r.puntaje, alternativas: r.alternativas.map((a) => a.id),
    titulo: { b64: b64(ft.archivo), familia: T.titular.familia, peso: T.titular.peso, mayus: !!T.titular.mayusculas, tracking: T.titular.tracking || '-0.01em', interlineado: Math.max(0.95, T.titular.interlineado || 1.05), rango: ft.weight },
    cuerpo: { b64: b64(fc.archivo), familia: T.texto.familia, peso: T.texto.peso, rango: fc.weight },
    foto: foto ? { b64: b64(foto.archivo), x: Math.round(foto.foco.x * 100), y: Math.round(foto.foco.y * 100), archivo: foto.archivo } : null,
    foto2: foto2 ? { b64: b64(foto2.archivo), x: Math.round(foto2.foco.x * 100), y: Math.round(foto2.foco.y * 100), archivo: foto2.archivo } : null,
    textura: pk.textura ? { b64: b64(pk.textura.archivo), opacidad: pk.textura.opacidad, mezcla: pk.textura.mezcla } : null,
    grano: pk.grano || 0,
    radio: pk.radio,
    mascara: forma.includes('arco') ? '999px 999px 0 0' : forma.includes('circulo') ? '50%' : pk.radio,
    sombra: pk.sombra,
    filtro: { lujo: 'saturate(.88) contrast(1.06) brightness(.96)', minimal: 'saturate(.9) contrast(1.02)', natural: 'saturate(.92) contrast(1.02) brightness(1.02)', vibrante: 'saturate(1.12) contrast(1.06)', retro: 'sepia(.22) saturate(1.08) contrast(1.05)', tecnologico: 'saturate(.95) contrast(1.08)', artesanal: 'saturate(.94) contrast(1.03) sepia(.06)', corporativo: 'saturate(.9) contrast(1.04)' }[pk.estilo] || 'none',
    iconos: { whatsapp: ico('whatsapp-logo'), instagram: ico('instagram-logo'), envio: ico('truck') },
  };
  return b;
}

/** capa de fondo: textura real + grano (en vez de patrones planos) */
export function fondoPack(b, W, H) {
  const k = b.pack, P = b.paleta;
  let s = '';
  if (k.textura) s += `<div style="position:absolute;inset:0;background:url(data:image/webp;base64,${k.textura.b64}) center/${Math.round(W * 0.75)}px;opacity:${k.textura.opacidad};mix-blend-mode:${k.textura.mezcla}"></div>`;
  // luz de estudio: viñeta suave hacia el borde para que el fondo no sea plano
  s += `<div style="position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 30%, transparent 55%, ${P.texto}14 100%)"></div>`;
  if (k.grano) s += `<div style="position:absolute;inset:0;opacity:${Math.min(0.5, k.grano * 3.2)};mix-blend-mode:${k.tono === 'oscuro' ? 'screen' : 'multiply'};background:url(&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${k.tono === 'oscuro' ? 1 : 0}  0 0 0 0 ${k.tono === 'oscuro' ? 1 : 0}  0 0 0 0 ${k.tono === 'oscuro' ? 1 : 0}  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>&quot;)"></div>`;
  return `<div class="fondo">${s}</div>`;
}

/** foto real con máscara, foco y tinte hacia la paleta */
export function fotoPack(b, cual = 'foto', o = {}) {
  const k = b.pack, f = k[cual] || k.foto, P = b.paleta;
  if (!f) return '';
  const radio = o.radio ?? k.mascara;
  return `<div class="ph" style="border-radius:${radio};${o.sombra === false ? '' : `box-shadow:${k.sombra === 'none' ? 'none' : k.sombra}`}">`
    + `<img src="data:image/webp;base64,${f.b64}" style="object-position:${f.x}% ${f.y}%;filter:${k.filtro}">`
    + `<i style="background:${P.acento};mix-blend-mode:soft-light;opacity:.22"></i>`
    + `<i style="background:linear-gradient(180deg,transparent 55%,${P.fondo}${k.tono === 'oscuro' ? '66' : '33'})"></i></div>`;
}

export const CSS_PACK = `
.ph{position:relative;width:100%;height:100%;overflow:hidden;isolation:isolate}
.ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.ph i{position:absolute;inset:0;pointer-events:none}
.ico{width:1.05em;height:1.05em;display:inline-block;vertical-align:-.16em;margin-right:.38em;fill:currentColor}
`;
