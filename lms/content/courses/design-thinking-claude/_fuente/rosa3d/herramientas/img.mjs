// Lectura/escritura de imágenes como RGBA crudo con ffmpeg (y cwebp para WebP).
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const FF = process.env.FFMPEG || 'ffmpeg', CW = process.env.CWEBP || 'cwebp';
export function leer(f, W, H) {
  const vf = W ? ['-vf', `scale=${W}:${H}:flags=lanczos`] : [];
  const buf = execFileSync(FF, ['-v', 'error', '-i', f, ...vf, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 30 });
  if (!W) { const o = execFileSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(','); W = +o[0]; H = +o[1]; }
  return { d: new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length), W, H };
}
// escala una imagen cruda (para máscaras) con ffmpeg
export function escalar(img, W, H) {
  const buf = execFileSync(FF, ['-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${img.W}x${img.H}`, '-i', '-', '-vf', `scale=${W}:${H}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { input: Buffer.from(img.d.buffer, img.d.byteOffset, img.d.length), maxBuffer: 1 << 30 });
  return { d: new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length), W, H };
}
function aPng(img, f) {
  execFileSync(FF, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${img.W}x${img.H}`, '-i', '-', '-frames:v', '1', f], { input: Buffer.from(img.d.buffer, img.d.byteOffset, img.d.length) });
}
export function png(img, f, gris = false) {
  execFileSync(FF, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${img.W}x${img.H}`, '-i', '-', '-frames:v', '1', ...(gris ? ['-pix_fmt', 'gray'] : []), f], { input: Buffer.from(img.d.buffer, img.d.byteOffset, img.d.length) });
  return fs.statSync(f).size;
}
// JPEG 4:4:4 (sin submuestreo de color: los mapas de normales y de rugosidad no lo toleran)
export function jpg(img, f, q = 3) {
  execFileSync(FF, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${img.W}x${img.H}`, '-i', '-', '-frames:v', '1', '-pix_fmt', 'yuvj444p', '-q:v', String(q), f], { input: Buffer.from(img.d.buffer, img.d.byteOffset, img.d.length) });
  return fs.statSync(f).size;
}
export function webp(img, f, q = 88, alfa = false) {
  const tmp = f + '.tmp.png'; aPng(img, tmp);
  execFileSync(CW, ['-quiet', '-q', String(q), '-m', '6', '-sharp_yuv', ...(alfa ? ['-exact', '-alpha_q', '100'] : ['-noalpha']), tmp, '-o', f]);
  fs.unlinkSync(tmp); return fs.statSync(f).size;
}
export function rgb2hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? d / mx : 0, mx];
}
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
