// Forja · motores · Asset Manager: carga perezosa con caché (imágenes, JSON, audio) e importación de hojas de sprites
// en el formato de atlas que ya produce el estudio (motor/sprites.js, el mismo que lee Phaser).
const cache = new Map();
const una = (clave, f) => { if (!cache.has(clave)) cache.set(clave, f().catch((e) => { cache.delete(clave); throw e; })); return cache.get(clave); };
export const cargarJSON = (url) => una('j:' + url, async () => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); });
export const cargarImagen = (url) => una('i:' + url, () => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('imagen: ' + url)); i.src = url; }));
export const cargarBytes = (url) => una('b:' + url, async () => new Uint8Array(await (await fetch(url)).arrayBuffer()));
// atlas { frames: { 'caminar_0': { frame: {x,y,w,h} } } } → { caminar: [{x,y,w,h}…], … }
export function animacionesDeAtlas(atlas) {
  const out = {};
  for (const [n, f] of Object.entries(atlas?.frames || {})) {
    const m = /^(.*)_(\d+)$/.exec(n); if (!m) continue;
    (out[m[1]] ||= [])[+m[2]] = f.frame;
  }
  return out;
}
// Importar un archivo del alumno (sprite sheet, imagen, sonido) como URL local: no sale de su navegador.
export function importarArchivo(file) {
  const tipo = file.type || ''; if (!/^(image\/(png|jpeg|webp|gif)|audio\/(wav|x-wav|mpeg|ogg)|application\/json)$/.test(tipo)) throw new Error('tipo no admitido: ' + tipo);
  if (file.size > 8e6) throw new Error('archivo de más de 8 MB');
  return tipo === 'application/json' ? file.text().then(JSON.parse) : Promise.resolve(URL.createObjectURL(file));
}
export const vaciarCache = () => cache.clear();
// Recurso de la plantilla: en el estudio llegan en memoria (window.FORJA_ASSETS: blob: o JSON ya leído); en el ZIP y en
// el aula, en assets/. Devuelve null si el proyecto no trae ese recurso (p. ej. en motores/probar.html).
export const recurso = (n) => (globalThis.FORJA_ASSETS ? globalThis.FORJA_ASSETS[n] ?? null : globalThis.DATOS?.heroe || globalThis.DATOS?.enemigo ? 'assets/' + n : null);
export async function atlasDe(n) {   // 'heroe' → { imagen, atlas, anim } o null
  const img = recurso(n + '.png'), j = recurso(n + '.json'); if (!img || !j) return null;
  try { const atlas = typeof j === 'string' ? await cargarJSON(j) : j; const imagen = await cargarImagen(img); return { imagen, atlas, anim: animacionesDeAtlas(atlas) }; } catch { return null; }
}
