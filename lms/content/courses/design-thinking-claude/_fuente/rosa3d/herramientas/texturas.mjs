// Texturas de Rosa a partir de las TGA de Rocketbox Female_Adult_11 (convertidas a PNG sin pérdida en tex/src).
// Salida en tex/out: color en WebP, normales y ORM en JPEG 4:4:4, máscara húmeda en PNG gris.
//   piel: un poco más morena y cálida (Rosa es limeña, 38 años); la liga dorada del moño pasa a castaño oscuro;
//   ORM (glTF): R = oclusión (el interior de la boca, oscuro), G = rugosidad (sale del mapa especular), B = 0;
//   húmedo: ojos (córnea) y labios, para la capa transparente (clearcoat);
//   pelo: RGBA con el color del pelo extendido bajo lo transparente (sin halo oscuro al bajar de mipmap).
import { leer, escalar, jpg, webp, png, rgb2hsv, smooth } from './img.mjs';
import fs from 'node:fs';
const SRC = '../tex/src/', OUT = '../tex/out/', M = '../out/';
fs.mkdirSync(OUT, { recursive: true });
const arg = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const PIEL = (arg.piel || '0.90,0.86,0.83').split(',').map(Number);   // multiplicador de la piel (r,g,b)
const TAM = { cabeza: +(arg.cabeza || 2048), cabezaN: +(arg.cabezaN || 2048), cuerpo: +(arg.cuerpo || 1024), pelo: +(arg.pelo || 2048) };
const tam = {};

// máscara de piel: tono anaranjado, algo de saturación, ni muy oscuro (pelo) ni gris (ojos, dientes)
function pielDe(r, g, b) {
  const [h, s, v] = rgb2hsv(r / 255, g / 255, b / 255);
  const tono = h < 50 || h > 345 ? 1 : 0;
  return tono * smooth(0.12, 0.22, s) * (1 - smooth(0.78, 0.9, s)) * smooth(0.22, 0.36, v);
}
function oscurecerPiel(img, excluir) {
  const d = img.d;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let k = pielDe(d[i], d[i + 1], d[i + 2]); if (excluir) k *= 1 - excluir[p];
    if (k <= 0) continue;
    for (let c = 0; c < 3; c++) d[i + c] = d[i + c] * (1 - k + k * PIEL[c]);
  }
}
const masc = (f, W) => { const m = escalar(leer(M + f), W, W); const o = new Float32Array(W * W); for (let p = 0; p < o.length; p++) o[p] = m.d[p * 4] / 255; return o; };

// ---------- cabeza
{
  const W = TAM.cabeza, c = leer(SRC + 'head_color.png', W, W), d = c.d;
  const ojos = masc('mask_ojos.png', W), boca = masc('mask_boca.png', W);
  const excl = new Float32Array(W * W); for (let p = 0; p < excl.length; p++) excl[p] = Math.max(ojos[p], boca[p]);
  oscurecerPiel(c, excl);
  // liga dorada del moño (franja de arriba de la textura) → castaño oscuro, conservando el relieve
  for (let y = 0; y < Math.round(W * 0.11); y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, [h, s, v] = rgb2hsv(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    const k = (h > 30 && h < 70 ? 1 : 0) * smooth(0.3, 0.5, s);
    if (!k) continue;
    const l = v * 0.32; const nr = l * 255 * 1.0, ng = l * 255 * 0.78, nb = l * 255 * 0.66;
    d[i] = d[i] * (1 - k) + nr * k; d[i + 1] = d[i + 1] * (1 - k) + ng * k; d[i + 2] = d[i + 2] * (1 - k) + nb * k;
  }
  tam.cabeza_color = webp(c, OUT + 'cabeza_color.webp', 90);
  const n = leer(SRC + 'head_normal.png', TAM.cabezaN, TAM.cabezaN); tam.cabeza_normal = jpg(n, OUT + 'cabeza_normal.jpg', 3);
  // ORM 1024 + húmedo 512
  const S = 1024, sp = leer(SRC + 'head_specular.png', S, S), col = leer(SRC + 'head_color.png', S, S);
  const ojosS = masc('mask_ojos.png', S), labS = masc('mask_labios.png', S), bocaS = masc('mask_boca.png', S);
  const orm = { d: new Uint8ClampedArray(S * S * 4), W: S, H: S }, hum = { d: new Uint8ClampedArray(S * S * 4), W: S, H: S };
  for (let p = 0; p < S * S; p++) {
    const i = p * 4, s = sp.d[i] / 255;
    // labios: los píxeles rojizos dentro de la zona de los labios
    const [h, sat] = rgb2hsv(col.d[i] / 255, col.d[i + 1] / 255, col.d[i + 2] / 255);
    const labio = labS[p] * smooth(0.36, 0.48, sat) * (h < 20 || h > 340 ? 1 : 0.4);
    let rug = Math.min(0.72, Math.max(0.34, 0.70 - 1.05 * s));
    rug = rug * (1 - labio) + 0.36 * labio;            // labios algo más lisos
    rug = rug * (1 - ojosS[p]) + 0.2 * ojosS[p];        // esclera / iris
    rug = rug * (1 - bocaS[p]) + 0.42 * bocaS[p];       // dientes y lengua (húmedos, pero en sombra)
    const oc = 1 - 0.55 * bocaS[p];
    orm.d[i] = oc * 255; orm.d[i + 1] = rug * 255; orm.d[i + 2] = 0; orm.d[i + 3] = 255;
    const w = Math.max(ojosS[p], labio * 0.22);
    hum.d[i] = hum.d[i + 1] = hum.d[i + 2] = w * 255; hum.d[i + 3] = 255;
  }
  tam.cabeza_orm = jpg(orm, OUT + 'cabeza_orm.jpg', 3);
  tam.cabeza_humedo = png(escalar(hum, 512, 512), OUT + 'cabeza_humedo.png', true);
}
// ---------- cuerpo
{
  const W = TAM.cuerpo, c = leer(SRC + 'body_color.png', W, W); oscurecerPiel(c);
  tam.cuerpo_color = webp(c, OUT + 'cuerpo_color.webp', 88);
  tam.cuerpo_normal = jpg(leer(SRC + 'body_normal.png', W, W), OUT + 'cuerpo_normal.jpg', 4);
  const S = 512, sp = leer(SRC + 'body_specular.png', S, S), orm = { d: new Uint8ClampedArray(S * S * 4), W: S, H: S };
  for (let p = 0; p < S * S; p++) { const i = p * 4, s = sp.d[i] / 255; orm.d[i] = 255; orm.d[i + 1] = Math.min(0.94, Math.max(0.42, 0.92 - 1.1 * s)) * 255; orm.d[i + 2] = 0; orm.d[i + 3] = 255; }
  tam.cuerpo_orm = jpg(orm, OUT + 'cuerpo_orm.jpg', 4);
}
// ---------- pelo (láminas + pestañas): color extendido bajo el alfa
{
  const W = TAM.pelo, c = leer(SRC + 'opacity_color.png', W, W), d = c.d;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 220) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  r /= n; g /= n; b /= n;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255, k = smooth(0.0, 0.6, a);   // por debajo de ~0.6 de alfa, hacia el color medio
    d[i] = d[i] * k + r * (1 - k); d[i + 1] = d[i + 1] * k + g * (1 - k); d[i + 2] = d[i + 2] * k + b * (1 - k);
  }
  tam.pelo = webp(c, OUT + 'pelo.webp', 90, true);
  tam.peloMedio = [r, g, b].map(Math.round);
}
console.log(JSON.stringify(tam));
