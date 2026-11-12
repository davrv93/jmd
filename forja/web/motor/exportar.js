// Forja · exportación: arma el proyecto Phaser 4 de una plantilla (para el ZIP y para jugarlo dentro del estudio),
// graba un video corto y saca el modelo GLB. El juego que pruebas en el estudio es el mismo código que te llevas.
import * as THREE from 'three';
import { zip, pngDeLienzo } from './zip.js';
import { wav } from './sonido.js';
import { recorte } from './escenario.js';
import { nivel as crearNivel, fisicaJugable } from './nivel.js';

const texto = new Map();
const leer = async (ruta) => { if (!texto.has(ruta)) texto.set(ruta, await (await fetch(ruta)).text()); return texto.get(ruta); };
let phaserBytes = null;
export const plantillas = async () => JSON.parse(await leer('plantillas/meta.json'));
export const codigoDe = (id) => leer(`plantillas/${id}.js`);
// trozo de código entre «// >>> id» y «// <<<», sin la sangría común: es lo que se muestra al explicar un algoritmo
export function extracto(codigo, id) {
  const m = new RegExp(`// >>> ${id}\\n([\\s\\S]*?)\\n[ \\t]*// <<<`).exec(codigo); if (!m) return '';
  const lineas = m[1].split('\n'), sangria = Math.min(...lineas.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lineas.map((l) => l.slice(sangria)).join('\n');
}

const LEEME = (nombre, juego, controles, enlace) => `${nombre} · ${juego} · proyecto Phaser 4 hecho con Forja (JMD Learning)

CÓMO ABRIRLO
Los navegadores no cargan las imágenes de un juego abriendo index.html con doble clic: hace falta un servidor local.
  Opción 1 (terminal, dentro de esta carpeta):   npx serve        y abre la dirección que muestra
  Opción 2 (VS Code): extensión «Live Server» → clic derecho en index.html → Open with Live Server
  Opción 3 (Python):  python3 -m http.server 8000   y abre http://localhost:8000
No necesita internet: Phaser viene dentro (phaser.min.js).

CONTROLES
  ${controles}

QUÉ HAY Y EN QUÉ ORDEN SE CARGA
  index.html      la página: carga los cuatro archivos de abajo, en este orden
  phaser.min.js   el motor (no se toca)
  datos.js        los números de TU personaje: medidas, física, animaciones y nivel
  comun.js        utilidades que comparten las plantillas: cargar recursos, controles, partículas, rayos X
  juego.js        EL JUEGO. Los algoritmos están marcados con «// >>> nombre». Empieza a cambiar cosas aquí.
  assets/         recursos: hojas de sprites (.png) con su atlas (.json), fondo en capas, losetas y sonidos (.wav)
  ficha.json      las reglas que se aplicaron para crear tu personaje

Para volver a editar el personaje: ${enlace}
`;

// d: { spec, hoja, enemigo: { spec, hoja }, objetos, escenario, sonidos (banco), semilla, estado, enlace }
export async function armarProyecto(d, id) {
  const meta = (await plantillas()).find((p) => p.id === id), A = 'assets/', archivos = [];
  const png = async (nombre, lienzo) => archivos.push({ nombre: A + nombre, datos: await pngDeLienzo(lienzo), lienzo });
  const atlas = (h, nombre) => { const a = JSON.parse(JSON.stringify(h.atlas)); a.meta.image = nombre + '.png'; return a; };
  await png('heroe.png', d.hoja.hoja); archivos.push({ nombre: `${A}heroe.json`, datos: JSON.stringify(atlas(d.hoja, 'heroe')) });
  await png('enemigo.png', d.enemigo.hoja.hoja); archivos.push({ nombre: `${A}enemigo.json`, datos: JSON.stringify(atlas(d.enemigo.hoja, 'enemigo')) });
  await png('objetos.png', d.objetos.hoja); archivos.push({ nombre: `${A}objetos.json`, datos: JSON.stringify(d.objetos.atlas) });
  const imagenes = { cielo: () => d.escenario.cielo, capa0: () => d.escenario.capas[0], capa1: () => d.escenario.capas[1], capa2: () => d.escenario.capas[2], suelo: () => recorte(d.escenario, 0), relleno: () => recorte(d.escenario, 1), plat_izq: () => recorte(d.escenario, 2, 30), plat_cen: () => recorte(d.escenario, 3, 30), plat_der: () => recorte(d.escenario, 4, 30) };
  for (const r of meta.recursos) if (imagenes[r]) await png(`${r}.png`, imagenes[r]());
  for (const [n, m] of Object.entries(d.sonidos)) archivos.push({ nombre: `${A}sonidos/${n}.wav`, datos: wav(m), muestras: m });
  const cifras = (h) => ({ px: h.px, relAlto: +h.relAlto.toFixed(3), relAncho: +h.relAncho.toFixed(3), animaciones: h.animaciones });
  const DATOS = { nombre: d.spec.nombre, juego: meta.nombre, semilla: d.semilla, heroe: cifras(d.hoja), enemigo: cifras(d.enemigo.hoja), fisica: fisicaJugable(d.spec.fisica), fisicaBase: d.spec.fisica, sonidos: Object.keys(d.sonidos), objetos: d.objetos.ids, ambiente: d.escenario.ambiente, hora: d.escenario.hora };
  if (id === 'plataformas') DATOS.nivel = crearNivel(d.semilla);
  const datosJS = `// datos.js · generado por Forja para «${d.spec.nombre}». Son solo números y listas: cámbialos y mira qué pasa.\nwindow.DATOS = ${JSON.stringify(DATOS, null, 1)};\n`;
  const [comun, juego, index] = await Promise.all([leer('plantillas/comun.js'), codigoDe(id), leer('plantillas/index.html')]);
  const guiones = ['phaser.min.js', 'datos.js', 'comun.js', 'juego.js'].map((s) => `<script src="${s}"></script>`).join('\n');
  archivos.push({ nombre: 'datos.js', datos: datosJS }, { nombre: 'comun.js', datos: comun }, { nombre: 'juego.js', datos: juego },
    { nombre: 'index.html', datos: index.replace('__NOMBRE__', d.spec.nombre).replace('__JUEGO__', meta.nombre).replace('__SCRIPTS__', guiones) },
    { nombre: 'LEEME.txt', datos: LEEME(d.spec.nombre, meta.nombre, meta.controles, d.enlace) },
    { nombre: 'ficha.json', datos: JSON.stringify({ nombre: d.spec.nombre, estado: d.estado, fisica: d.spec.fisica, medidas: d.spec.dims, reglas: d.spec.reglas, enlace: d.enlace }, null, 1) });
  return { meta, archivos, DATOS, datosJS, comun, juego, index };
}

export async function zipProyecto(d, id = 'plataformas') {
  const p = await armarProyecto(d, id);
  phaserBytes ??= new Uint8Array(await (await fetch('vendor/phaser.min.js')).arrayBuffer());
  const carpeta = `${d.hoja.clave}-${id}`;
  return { blob: zip([...p.archivos, { nombre: 'phaser.min.js', datos: phaserBytes }].map((a) => ({ nombre: `${carpeta}/${a.nombre}`, datos: a.datos }))), carpeta };
}

// Para jugar dentro del estudio: la misma página y el mismo código, con los recursos en memoria (blob:) en vez de en assets/.
export function paginaEnMemoria(p) {
  const urls = [], mapa = {};
  for (const a of p.archivos) {
    if (!a.nombre.startsWith('assets/')) continue;
    const n = a.nombre.slice(7);
    if (n.endsWith('.json')) mapa[n] = JSON.parse(a.datos);
    else { const u = URL.createObjectURL(new Blob([a.datos], { type: n.endsWith('.png') ? 'image/png' : 'audio/wav' })); urls.push(u); mapa[n] = u; }
  }
  const phaser = new URL('vendor/phaser.min.js', location.href).href;
  const guiones = `<script>window.FORJA_ASSETS = ${JSON.stringify(mapa)};</script>\n<script src="${phaser}"></script>\n<script>${p.datosJS}</script>\n<script>${p.comun}</script>\n<script>${p.juego}</script>`;
  return { html: p.index.replace('__NOMBRE__', p.DATOS.nombre).replace('__JUEGO__', p.meta.nombre).replace('__SCRIPTS__', () => guiones), liberar: () => urls.forEach((u) => URL.revokeObjectURL(u)) };
}

// Video corto del personaje girando (MP4 si el navegador lo graba; si no, WebM).
export function grabarVideo(lienzo3d, nombre, fondo = ['#3a2f6b', '#17132a'], segundos = 4) {
  return new Promise((ok, mal) => {
    const c = document.createElement('canvas'); c.width = c.height = 720; const x = c.getContext('2d');
    const tipo = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!tipo) return mal(new Error('este navegador no graba video'));
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: tipo, videoBitsPerSecond: 4e6 }), trozos = [];
    rec.ondataavailable = (e) => e.data.size && trozos.push(e.data);
    rec.onstop = () => ok({ blob: new Blob(trozos, { type: tipo.split(';')[0] }), ext: tipo.includes('mp4') ? 'mp4' : 'webm' });
    const t0 = performance.now();
    (function cuadro(t) {
      const g = x.createRadialGradient(360, 520, 40, 360, 420, 560); g.addColorStop(0, fondo[0]); g.addColorStop(1, fondo[1]); x.fillStyle = g; x.fillRect(0, 0, 720, 720);
      const w = lienzo3d.width, h = lienzo3d.height, lado = Math.min(w, h); x.drawImage(lienzo3d, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 20, 720, 720);
      x.fillStyle = '#fff'; x.font = '900 40px Unbounded, system-ui, sans-serif'; x.textAlign = 'center'; x.fillText(nombre, 360, 70, 660);
      x.font = '600 20px Figtree, system-ui, sans-serif'; x.globalAlpha = 0.75; x.fillText('Forja · JMD Learning', 360, 690); x.globalAlpha = 1;
      if (t - t0 < segundos * 1000) requestAnimationFrame(cuadro); else rec.stop();
    })(t0);
    rec.start();
  });
}

export async function modeloGLB(raiz) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const copia = raiz.clone(true), fuera = [];
  copia.traverse((o) => { if (o.userData.contorno) fuera.push(o); else if (o.isMesh) { const m = o.material; o.material = new THREE.MeshStandardMaterial({ color: m.color, map: m.map || null, roughness: 0.85, metalness: 0, transparent: m.transparent, opacity: m.opacity, emissive: m.emissive || 0x000000, emissiveIntensity: m.emissiveIntensity || 0 }); } });
  for (const o of fuera) o.parent.remove(o);
  const buf = await new GLTFExporter().parseAsync(copia, { binary: true });
  return new Blob([buf], { type: 'model/gltf-binary' });
}
