/* Rosa 3D · motor (Three.js r170 + GLTFLoader). Fuente de rosa3d-motor.js: se empaqueta con esbuild (construir.sh).
 * Lo carga rosa3d.js bajo demanda y deja window.__Rosa3DMotor = { montar }.
 *
 * Avatar: Microsoft Rocketbox Female_Adult_11 (MIT), con formas de cara ARKit + visemas Oculus (HeadBox) y esqueleto
 * Biped de 3ds Max. Todo el movimiento es procedural sobre ese esqueleto: no hay clips de Mixamo (ver LEEME).
 *
 * Bajo la CSP del LMS (img-src data: 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; sin blob:, sin wasm)
 * GLTFLoader no puede decodificar las texturas de un .glb (crea URL blob:). El complemento TexturasCSP las decodifica
 * con createImageBitmap(Blob), que no pasa por la CSP, y si no hay, con una URL data: (img-src data: sí está permitido).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const RAD = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sat = (x) => clamp(x, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => { t = sat(t); return t * t * (3 - 2 * t); };
const campana = (t, a, b, c, d) => suave((t - a) / (b - a)) * (1 - suave((t - c) / (d - c)));  // sube a→b, baja c→d
const acercar = (x, y, dt, tau) => x + (y - x) * (1 - Math.exp(-dt / tau));
// ruido suave determinista: suma de senos de frecuencias inconmensurables (no se repite a la vista)
const ruido = (t, s) => (Math.sin(t * 0.731 + s * 1.7) * 0.5 + Math.sin(t * 1.379 + s * 4.1) * 0.3 + Math.sin(t * 2.113 + s * 2.9) * 0.2);
const azar = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- texturas sin blob: (CSP del LMS)
function porDataURL(blob) {
  return new Promise((ok, mal) => {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => ok(im); im.onerror = mal; im.src = fr.result; };
    fr.onerror = mal; fr.readAsDataURL(blob);
  });
}
function decodificar(blob) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).catch(() => porDataURL(blob));
  }
  return porDataURL(blob);
}
class TexturasCSP {
  // Se registra con el nombre de EXT_texture_webp para ocupar su lugar (los complementos se consultan en orden y el
  // de WebP de serie crearía una URL blob:). Atiende todas las texturas que vienen dentro del .glb.
  constructor(parser) { this.parser = parser; this.name = 'EXT_texture_webp'; }
  loadTexture(i) {
    const p = this.parser, json = p.json, def = json.textures[i];
    const ext = def.extensions && def.extensions.EXT_texture_webp;
    const src = ext ? ext.source : def.source, img = json.images[src];
    if (!img || img.bufferView === undefined) return null;
    const clave = 'csp:' + src;
    if (!p.textureCache[clave]) {
      p.textureCache[clave] = p.getDependency('bufferView', img.bufferView)
        .then((buf) => decodificar(new Blob([buf], { type: img.mimeType })))
        .then((im) => {
          const t = new THREE.Texture(im);
          t.flipY = false; t.name = def.name || img.name || '';
          t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
          t.generateMipmaps = true; t.needsUpdate = true;
          p.associations.set(t, { textures: i });
          return t;
        });
    }
    return p.textureCache[clave];
  }
}

// ---------------------------------------------------------------- fondo: la oficina de Rosa, desenfocada
// Rincón de una oficina chica en Surquillo (asistente contable de una distribuidora de abarrotes): ventana con rejas y
// cielo «panza de burro» (gris parejo de Lima) sobre azoteas con tanques de agua, estante metálico con archivadores de
// palanca (lomos con etiqueta en blanco y el agujero para el dedo), calendario de pared con su foto y su grilla, el
// fluorescente del techo y, adelante, el borde del escritorio con papeles. Sin marcas, sin texto legible, sin gente.
// Se pinta nítido por planos y cada plano se desenfoca distinto (lejos, medio, adelante): profundidad de campo de un
// retrato. El desenfoque es de caja por software (Safari no tiene ctx.filter) y respeta el alfa (premultiplicado).
function desenfocar(ctx, W, H, r, pasadas) {
  const im = ctx.getImageData(0, 0, W, H), a = im.data, f = new Float32Array(a.length), g = new Float32Array(a.length);
  for (let i = 0; i < a.length; i += 4) { const al = a[i + 3] / 255; f[i] = a[i] * al; f[i + 1] = a[i + 1] * al; f[i + 2] = a[i + 2] * al; f[i + 3] = a[i + 3]; }
  const caja = (src, dst, horiz) => {
    const n = horiz ? W : H, m = horiz ? H : W, k = 1 / (2 * r + 1);
    for (let j = 0; j < m; j++) {
      const at = (i) => { i = i < 0 ? 0 : i >= n ? n - 1 : i; return (horiz ? j * W + i : i * W + j) * 4; };
      let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
      for (let i = -r; i <= r; i++) { const o = at(i); s0 += src[o]; s1 += src[o + 1]; s2 += src[o + 2]; s3 += src[o + 3]; }
      for (let i = 0; i < n; i++) {
        const o = at(i); dst[o] = s0 * k; dst[o + 1] = s1 * k; dst[o + 2] = s2 * k; dst[o + 3] = s3 * k;
        const sa = at(i - r), en = at(i + r + 1); s0 += src[en] - src[sa]; s1 += src[en + 1] - src[sa + 1]; s2 += src[en + 2] - src[sa + 2]; s3 += src[en + 3] - src[sa + 3];
      }
    }
  };
  for (let p = 0; p < pasadas; p++) { caja(f, g, true); caja(g, f, false); }
  for (let i = 0; i < a.length; i += 4) { const al = f[i + 3] / 255; a[i] = al > 0.001 ? f[i] / al : 0; a[i + 1] = al > 0.001 ? f[i + 1] / al : 0; a[i + 2] = al > 0.001 ? f[i + 2] / al : 0; a[i + 3] = f[i + 3]; }
  ctx.putImageData(im, 0, 0);
}
function pintarFondo(tema) {
  const W = 512, H = 576, osc = tema === 'oscuro';
  const lienzo = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d', { willReadFrequently: true })]; };
  const [c, x] = lienzo();
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const rect = (z, col, x0, y0, w, h) => { z.fillStyle = col; z.fillRect(x0, y0, w, h); };
  const grad = (z, x0, y0, x1, y1, stops) => { const g = z.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  // ---- lejos: lo que se ve por la ventana (cielo de Lima, azoteas, tanques, cables)
  const VX = -10, VY = 46, VW = 196, VH = 300;
  x.fillStyle = osc ? grad(x, 0, VY, 0, VY + VH, [[0, '#1b2433'], [1, '#2a3140']]) : grad(x, 0, VY, 0, VY + VH, [[0, '#dfe2e4'], [0.7, '#d3d7da'], [1, '#c7cbcd']]);
  x.fillRect(VX, VY, VW, VH);
  for (let k = 0; k < 7; k++) {   // edificios bajos de concreto, a distintas alturas
    const bx = VX + k * 30 + rnd() * 12, bw = 26 + rnd() * 30, bt = VY + VH * (0.48 + rnd() * 0.25);
    rect(x, osc ? `rgb(${30 + rnd() * 14 | 0},${34 + rnd() * 14 | 0},${44 + rnd() * 12 | 0})` : `rgb(${168 + rnd() * 30 | 0},${164 + rnd() * 26 | 0},${156 + rnd() * 22 | 0})`, bx, bt, bw, VY + VH - bt);
    if (rnd() < 0.6) { const tx = bx + rnd() * (bw - 10); rect(x, osc ? '#151a22' : '#3c3f41', tx, bt - 11, 9, 11); }   // tanque de agua
    if (osc) for (let q = 0; q < 3; q++) if (rnd() < 0.55) rect(x, `rgba(255,${190 + rnd() * 50 | 0},${120 + rnd() * 50 | 0},0.9)`, bx + 4 + rnd() * (bw - 10), bt + 6 + rnd() * 40, 3, 3);
  }
  x.strokeStyle = osc ? 'rgba(10,12,16,0.7)' : 'rgba(70,70,70,0.45)'; x.lineWidth = 1;
  for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(VX, VY + 90 + k * 14); x.quadraticCurveTo(VX + VW / 2, VY + 110 + k * 14, VX + VW, VY + 84 + k * 16); x.stroke(); }
  desenfocar(x, W, H, 13, 3);
  // ---- plano medio: pared, marco y rejas de la ventana, estante con archivadores, calendario, fluorescente
  const [cm, m] = lienzo();
  m.fillStyle = osc ? grad(m, 0, 0, 0, H, [[0, '#2a2d30'], [1, '#1c1e21']]) : grad(m, 0, 0, 0, H, [[0, '#dfe0d6'], [1, '#c9cbc0']]);   // pared verde agua pálido
  m.fillRect(0, 0, W, H);
  m.clearRect(VX, VY, VW, VH);                                                                 // hueco de la ventana
  const marco = osc ? '#3a3d42' : '#aeb2b3';                                                   // aluminio
  rect(m, marco, VX - 6, VY - 6, VW + 12, 7); rect(m, marco, VX - 6, VY + VH - 1, VW + 12, 9); rect(m, marco, VX + VW - 1, VY - 6, 8, VH + 14); rect(m, marco, VX + VW / 2 - 2, VY, 5, VH);
  for (let k = 1; k < 7; k++) rect(m, osc ? '#202226' : '#5e6163', VX + k * (VW / 7) - 1.5, VY, 3, VH);   // rejas
  rect(m, osc ? '#202226' : '#5e6163', VX, VY + VH * 0.5, VW, 3);
  rect(m, osc ? '#2d2f33' : '#bfc2b8', VX - 10, VY + VH + 8, VW + 24, 10);                     // alféizar
  // fluorescente del techo (de noche, apagado)
  rect(m, osc ? '#3a3c40' : '#fbfdff', 170, -6, 250, 16);
  // calendario de pared: foto arriba (paisaje), grilla de días abajo; sin texto
  const CX = 356, CY = 64;
  rect(m, osc ? '#4a4a48' : '#f6f4ee', CX, CY, 52, 84);
  const foto = m.createLinearGradient(0, CY + 4, 0, CY + 40); foto.addColorStop(0, osc ? '#2f3d4f' : '#86b3d6'); foto.addColorStop(1, osc ? '#334033' : '#6f8f5e'); m.fillStyle = foto; m.fillRect(CX + 4, CY + 4, 44, 32);
  m.fillStyle = osc ? '#4a4f55' : '#9aa7b0'; m.beginPath(); m.moveTo(CX + 4, CY + 27); m.lineTo(CX + 17, CY + 13); m.lineTo(CX + 28, CY + 25); m.lineTo(CX + 37, CY + 16); m.lineTo(CX + 48, CY + 27); m.lineTo(CX + 48, CY + 36); m.lineTo(CX + 4, CY + 36); m.fill();
  for (let r = 0; r < 5; r++) for (let q = 0; q < 7; q++) rect(m, (r * 7 + q) % 9 === 4 ? (osc ? '#6a3a36' : '#d07c74') : (osc ? '#5b5b58' : '#d9d6cd'), CX + 4 + q * 6.3, CY + 42 + r * 8, 5, 6);
  // estante metálico con archivadores de palanca
  const EX = 412, gris = osc ? '#34373b' : '#9da1a3';
  rect(m, gris, EX - 6, 40, 7, 420); rect(m, gris, W - 4, 40, 7, 420);
  const COLS = osc ? ['#15171a', '#1c2433', '#3a1d1d', '#2a2c30'] : ['#2a2c2f', '#3a5482', '#94403a', '#64696c', '#3c5a47', '#2a2c2f'];
  for (const y of [150, 262, 374]) {
    let bx = EX + 2;
    while (bx < W - 8) {
      const bw = 15 + rnd() * 3, bh = 92 + rnd() * 6, col = COLS[(rnd() * COLS.length) | 0], incl = rnd() < 0.08;
      m.save(); if (incl) { m.translate(bx, y); m.rotate(-0.08); m.translate(-bx, -y); }
      rect(m, col, bx, y - bh, bw, bh);
      rect(m, osc ? '#55565a' : '#f1efe8', bx + 3, y - bh + 14, bw - 6, 30);                     // etiqueta en blanco
      m.fillStyle = osc ? '#0d0e10' : '#1a1a1c'; m.beginPath(); m.arc(bx + bw / 2, y - 22, 3.6, 0, Math.PI * 2); m.fill();   // agujero
      m.restore(); bx += bw + 1.2 + (rnd() < 0.1 ? 10 : 0);
    }
    rect(m, gris, EX - 6, y, W - EX + 12, 8);
  }
  if (osc) { const g = m.createRadialGradient(440, 210, 0, 440, 210, 280); g.addColorStop(0, 'rgba(255,170,96,0.5)'); g.addColorStop(1, 'rgba(255,170,96,0)'); m.fillStyle = g; m.fillRect(0, 0, W, H); }
  else { const g = m.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, 'rgba(225,240,255,0.25)'); g.addColorStop(1, 'rgba(225,240,255,0)'); m.fillStyle = g; m.fillRect(0, 0, W, H); }   // luz fría del fluorescente
  desenfocar(m, W, H, 8, 3);
  x.drawImage(cm, 0, 0);
  // ---- adelante: borde del escritorio con papeles (muy desenfocado)
  const [cf, f] = lienzo();
  rect(f, osc ? '#2b2420' : '#8a7058', -20, 488, W + 40, 120);
  f.save(); f.translate(60, 500); f.rotate(-0.06); rect(f, osc ? '#6c6a66' : '#f4f2ec', 0, 0, 120, 70); rect(f, osc ? '#5c5a56' : '#e8e5dc', 20, -8, 110, 66); f.restore();
  f.save(); f.translate(380, 506); f.rotate(0.05); rect(f, osc ? '#66645f' : '#f7f5ef', 0, 0, 100, 60); f.restore();
  desenfocar(f, W, H, 18, 3);
  x.drawImage(cf, 0, 0);
  // bokeh: discos de borde definido en los puntos de luz
  const bok = (cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, r * 0.72, cx, cy, r); g.addColorStop(0, col); g.addColorStop(0.92, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
  if (osc) { for (let i = 0; i < 9; i++) bok(rnd() * 170, 160 + rnd() * 170, 5 + rnd() * 9, `rgba(255,${190 + rnd() * 40 | 0},130,${0.16 + rnd() * 0.16})`); for (let i = 0; i < 5; i++) bok(380 + rnd() * 120, 140 + rnd() * 160, 10 + rnd() * 14, `rgba(255,180,110,${0.08 + rnd() * 0.08})`); }
  else for (let i = 0; i < 4; i++) bok(rnd() * 160, 80 + rnd() * 240, 8 + rnd() * 10, `rgba(255,255,255,${0.08 + rnd() * 0.08})`);
  // viñeta suave y grano fino (sin bandas)
  const v = x.createRadialGradient(W * 0.5, H * 0.42, H * 0.22, W * 0.5, H * 0.5, H * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, osc ? 'rgba(0,0,0,0.5)' : 'rgba(40,40,36,0.2)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  const im = x.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 4; d[i] += n; d[i + 1] += n; d[i + 2] += n; d[i + 3] = 255; }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- piel: luz que se envuelve (dispersión bajo la piel, barata)
// Difusa con «wrap» por canal (el rojo da la vuelta al borde de la sombra), un poco de luz a contraluz en los bordes
// (orejas, nariz) y oclusión del interior de la boca también para la luz directa (aoMap de three solo toca la indirecta).
// En la cabeza (opc.cabeza) además:
//   · poros: un mapa de normales de detalle (procedural, en mosaico) solo en la piel, que rompe el brillo en manchitas;
//   · pelo pegado al cráneo: mechones (ruido estirado en la dirección del peinado, hacia el moño) y brillo anisótropo
//     de Kajiya-Kay en dos lóbulos, para la luz clave y la de contra (sin eso el pelo pintado parece un casco);
//   · ojos: el brillo de la córnea (el reflejo de la ventana/caja de luz), quieto respecto de la luz;
//   · oclusión de contacto en el cuello junto al borde de la chompa (atributo aoCuello, calculado al cargar).
const GLSL_RUIDO = `
float hashR( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float ruidoV( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( hashR( i ), hashR( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hashR( i + vec2( 0.0, 1.0 ) ), hashR( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
float kkLobulo( vec3 T, vec3 H, float e ) { float th = dot( T, H ); return pow( max( 0.0, 1.0 - th * th ), e * 0.5 ); }
`;
function piel(mat, opc) {
  const U = { uWrap: { value: new THREE.Vector3(...opc.wrap) }, uSSS: { value: opc.sss }, uBocaLuz: { value: 0 }, uContra: { value: opc.contra || 0 } };
  const cab = !!opc.cabeza;
  if (cab) Object.assign(U, {
    uPoros: { value: opc.poros }, uPorosEsc: { value: 26 }, uPorosFuerza: { value: 0.32 },
    uMonoObj: { value: opc.mono || new THREE.Vector3() },
    uLuzK: { value: new THREE.Vector3(0, 0, 1) }, uColK: { value: new THREE.Color(1, 1, 1) },
    uLuzR: { value: new THREE.Vector3(0, 0, 1) }, uColR: { value: new THREE.Color(1, 1, 1) },
    uLuzF: { value: new THREE.Vector3(0, 0, 1) },
    uBrilloPelo: { value: 0.012 }, uCatch: { value: 2.6 }, uArriba: { value: new THREE.Vector3(0, 1, 0) },
  });
  mat.userData.u = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    const lit = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
      `float nlW = dot( geometryNormal, directLight.direction );
	vec3 envuelta = clamp( ( vec3( nlW ) + uWrap ) / ( 1.0 + uWrap ), 0.0, 1.0 );
	vec3 difusa = mix( vec3( dotNL ), envuelta, uSSS ) * directLight.color;
	float contra = pow( clamp( dot( geometryViewDir, -directLight.direction ) , 0.0, 1.0 ), 3.0 ) * pow( 1.0 - clamp( dot( geometryNormal, geometryViewDir ), 0.0, 1.0 ), 2.0 );
	reflectedLight.directDiffuse += ( difusa + contra * uContra * vec3( 1.0, 0.38, 0.24 ) * directLight.color ) * BRDF_Lambert( material.diffuseColor );`);
    let f = 'uniform vec3 uWrap;\nuniform float uSSS;\nuniform float uBocaLuz;\nuniform float uContra;\n' + sh.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', lit);
    let fin = `#include <aomap_fragment>
	#ifdef USE_AOMAP
		float ocBoca = mix( mix( 1.0, ambientOcclusion, 0.75 ), 1.0, uBocaLuz );
		reflectedLight.directDiffuse *= ocBoca;
		reflectedLight.directSpecular *= ocBoca * ocBoca;
	#endif`;
    if (cab) {
      sh.vertexShader = 'attribute float aoCuello;\nuniform vec3 uMonoObj;\nvarying vec3 vPosPelo;\nvarying vec3 vNorPelo;\nvarying vec3 vTanPelo;\nvarying float vAoC;\n' + sh.vertexShader
        .replace('#include <skinning_vertex>', `#include <skinning_vertex>
	vPosPelo = position; vNorPelo = normal; vAoC = aoCuello;
	vec3 tObj = normalize( uMonoObj - position );
	#ifdef USE_SKINNING
		vec3 tSk = ( skinMatrix * vec4( tObj, 0.0 ) ).xyz;
	#else
		vec3 tSk = tObj;
	#endif
	vTanPelo = normalize( ( modelViewMatrix * vec4( tSk, 0.0 ) ).xyz );`);
      f = 'uniform sampler2D uPoros;\nuniform float uPorosEsc;\nuniform float uPorosFuerza;\nuniform vec3 uMonoObj;\nuniform vec3 uLuzK;\nuniform vec3 uColK;\nuniform vec3 uLuzR;\nuniform vec3 uColR;\nuniform vec3 uLuzF;\nuniform float uBrilloPelo;\nuniform float uCatch;\nuniform vec3 uArriba;\nvarying vec3 vPosPelo;\nvarying vec3 vNorPelo;\nvarying vec3 vTanPelo;\nvarying float vAoC;\n' + GLSL_RUIDO + f;
      f = f.replace('#include <map_fragment>', `#include <map_fragment>
	float lumA = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
	float humedo = 0.0;
	#ifdef USE_CLEARCOATMAP
		humedo = texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	vec2 uvC = vMapUv;
	float enCara = step( 0.34, uvC.x ) * step( uvC.x, 0.66 ) * step( 0.17, uvC.y ) * step( uvC.y, 0.72 );
	float bocaIn = step( 0.58, uvC.y ) * step( uvC.x, 0.38 );
	float esPelo = ( 1.0 - smoothstep( 0.012, 0.05, lumA ) ) * ( 1.0 - enCara ) * ( 1.0 - bocaIn );
	float esPiel = smoothstep( 0.035, 0.09, lumA ) * ( 1.0 - humedo ) * ( 1.0 - bocaIn );
	vec4 detalle = texture2D( uPoros, vMapUv * uPorosEsc );
	// mechones del pelo pegado: ruido estirado a lo largo del peinado (hacia el moño), en el espacio de la malla
	vec3 tO = normalize( uMonoObj - vPosPelo ), nO = normalize( vNorPelo );
	vec3 bO = normalize( cross( nO, tO ) );
	float sP = dot( vPosPelo, bO ) * 4.2, aP = dot( vPosPelo, tO ) * 0.55;
	float finura = clamp( 1.0 - fwidth( sP ) * 0.9, 0.0, 1.0 );
	float hebra = mix( 0.5, ruidoV( vec2( sP, aP ) ) * 0.65 + ruidoV( vec2( sP * 2.3 + 3.1, aP * 1.7 ) ) * 0.35, finura );
	diffuseColor.rgb *= mix( 1.0, 0.72 + 0.56 * hebra, esPelo );`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
	roughnessFactor = mix( roughnessFactor, roughnessFactor * ( 0.8 + 0.45 * detalle.b ), esPiel );
	roughnessFactor = mix( roughnessFactor, 0.78, esPelo );`)
        .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;',
          'mapN.xy *= normalScale;\n\tmapN.xy += ( detalle.xy * 2.0 - 1.0 ) * uPorosFuerza * esPiel;'));
      fin += `
	// contacto: el cuello junto al borde de la chompa
	float aoC = mix( 0.8, 1.0, smoothstep( 0.0, 1.0, vAoC ) );
	reflectedLight.directDiffuse *= aoC; reflectedLight.indirectDiffuse *= aoC;
	// pelo: menos brillo especular «de plástico» y dos lóbulos anisótropos (Kajiya-Kay) a lo largo del peinado
	reflectedLight.directSpecular *= mix( 1.0, 0.3, esPelo ); reflectedLight.indirectSpecular *= mix( 1.0, 0.45, esPelo );
	vec3 Tp = normalize( vTanPelo - normal * dot( vTanPelo, normal ) );
	vec3 T1 = normalize( Tp + normal * ( 0.1 + 0.16 * ( hebra - 0.5 ) ) ), T2 = normalize( Tp - normal * 0.14 );
	vec3 Hk = normalize( uLuzK + geometryViewDir ), Hr = normalize( uLuzR + geometryViewDir );
	float visK = smoothstep( -0.05, 0.35, dot( normal, uLuzK ) ), visR = smoothstep( -0.2, 0.3, dot( normal, uLuzR ) );
	float mech = hebra * hebra * hebra * 2.6;            // el brillo se rompe en mechones (no una franja lisa)
	vec3 kk = ( kkLobulo( T1, Hk, 220.0 ) * mech * vec3( 0.95, 0.9, 0.85 ) + kkLobulo( T2, Hk, 40.0 ) * diffuseColor.rgb * 5.0 ) * uColK * visK
		+ ( kkLobulo( T1, Hr, 120.0 ) * mech * vec3( 1.0, 0.9, 0.8 ) ) * uColR * visR * 0.6;
	reflectedLight.directSpecular += kk * uBrilloPelo * esPelo * esPelo;
	// córnea: el reflejo de la luz clave (y uno chico de la ventana), sobre la normal geométrica del globo
	float ojo = smoothstep( 0.6, 0.95, humedo );
	float sombraParpado = ojo * smoothstep( -0.05, 0.42, dot( normalize( vNormal ), uArriba ) ) * 0.55;
	reflectedLight.directDiffuse *= 1.0 - sombraParpado; reflectedLight.indirectDiffuse *= 1.0 - sombraParpado * 0.7;
	reflectedLight.directSpecular *= 1.0 - sombraParpado;
	vec3 Rv = reflect( -geometryViewDir, normalize( vNormal ) );
	float cat = smoothstep( 0.9952, 0.9986, dot( Rv, uLuzK ) ) + 0.45 * smoothstep( 0.9975, 0.9993, dot( Rv, uLuzF ) );
	reflectedLight.directSpecular += vec3( ojo * cat * uCatch );`;
    }
    sh.fragmentShader = f.replace('#include <aomap_fragment>', fin);
  };
  mat.customProgramCacheKey = () => (cab ? 'rosa-piel-cabeza' : 'rosa-piel');
  return mat;
}

// ---------------------------------------------------------------- mechones procedurales sobre el cráneo
// Atlas de hebras (4 variantes en u, se repite en v): líneas finas casi verticales con onda periódica, más densas al
// centro de la lámina que en los bordes. RGBA directo en un DataTexture (sin premultiplicar).
function atlasHebras() {
  const W = 256, H = 512, K = 4, d = new Uint8Array(W * H * 4); let s = 21; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const a = new Float32Array(W * H), r = new Float32Array(W * H), g = new Float32Array(W * H), b = new Float32Array(W * H);
  for (let k = 0; k < K; k++) {
    const x0 = k * (W / K), w = W / K, n = 34 + k * 4;
    for (let i = 0; i < n; i++) {
      const c = (rnd() + rnd() + rnd()) / 3, cx = x0 + 3 + c * (w - 6), amp = 0.6 + rnd() * 2.2, per = 1 + Math.floor(rnd() * 3), fase = rnd() * 6.28;
      const op = 0.55 + rnd() * 0.45, gros = 0.55 + rnd() * 0.6, claro = rnd() < 0.18 ? 1.5 : 0.8 + rnd() * 0.4;
      const corte = rnd() < 0.25 ? [rnd() * H, rnd() * H * 0.5] : null;   // algunas hebras cortas (terminan en la lámina)
      for (let y = 0; y < H; y++) {
        if (corte) { const dd = (y - corte[0] + H) % H; if (dd > corte[1]) continue; }
        const x = cx + amp * Math.sin((y / H) * 6.2832 * per + fase);
        for (let xx = Math.floor(x - 2); xx <= Math.ceil(x + 2); xx++) {
          if (xx < x0 || xx >= x0 + w) continue;
          const cov = Math.max(0, 1 - Math.abs(xx - x) / gros) * op; if (cov <= 0) continue;
          const i2 = y * W + xx, prev = a[i2], na = prev + cov * (1 - prev);
          const t = cov * (1 - prev) / (na || 1);
          r[i2] = r[i2] * (1 - t) + 0.16 * claro * t; g[i2] = g[i2] * (1 - t) + 0.105 * claro * t; b[i2] = b[i2] * (1 - t) + 0.075 * claro * t; a[i2] = na;
        }
      }
    }
  }
  for (let i = 0; i < W * H; i++) {   // color extendido bajo lo transparente (sin halo oscuro en los mipmaps)
    const k = a[i] > 0.02 ? 1 : 0; d[i * 4] = (k ? r[i] : 0.15) * 255; d[i * 4 + 1] = (k ? g[i] : 0.1) * 255; d[i * 4 + 2] = (k ? b[i] : 0.07) * 255; d[i * 4 + 3] = Math.min(255, a[i] * 255);
  }
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}
function peloProcedural(cab, matCab, mono, semilla) {
  const g = cab.geometry, P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const huesoCab = cab.skeleton.bones.findIndex((b) => b.name === 'Bip01_Head'); if (huesoCab < 0) return null;
  // máscara de pelo: la textura de la cabeza (oscura, fuera de la cara, de la boca y de los ojos)
  const img = matCab.map && matCab.map.image; if (!img) return null;
  const M = 256, cv = document.createElement('canvas'); cv.width = cv.height = M; const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0, M, M); const px = cx.getImageData(0, 0, M, M).data;
  const lumUV = (u, v) => { const x = Math.min(M - 1, Math.max(0, (u * M) | 0)), y = Math.min(M - 1, Math.max(0, (v * M) | 0)), i = (y * M + x) * 4; return (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; };
  const esPeloV = (i) => {
    const u = UV.getX(i), v = UV.getY(i);
    if (u > 0.34 && u < 0.66 && v > 0.17 && v < 0.72) return false;
    if (v > 0.58 && u < 0.38) return false;
    let w = 0; for (let c = 0; c < 4; c++) if (SI.getComponent(i, c) === huesoCab) w += SW.getComponent(i, c);
    return w > 0.85 && lumUV(u, v) < 0.2;
  };
  const pelo = new Uint8Array(P.count); const lista = [];
  for (let i = 0; i < P.count; i++) if (esPeloV(i)) { pelo[i] = 1; lista.push(i); }
  if (lista.length < 50) return null;
  // línea del pelo: vértices de pelo en triángulos que también tocan piel
  const borde = new Set(), ix = g.index.array;
  for (let t = 0; t < ix.length; t += 3) { const a = ix[t], b = ix[t + 1], c = ix[t + 2], n = pelo[a] + pelo[b] + pelo[c]; if (n > 0 && n < 3) for (const v of [a, b, c]) if (pelo[v]) borde.add(v); }
  const lineaPelo = [...borde];
  // rejilla para el vértice de cráneo más cercano
  const C = 1.2, rej = new Map(), clave = (x, y, z) => ((Math.floor(x / C) * 73856093) ^ (Math.floor(y / C) * 19349663) ^ (Math.floor(z / C) * 83492791));
  for (const i of lista) { const k = clave(P.getX(i), P.getY(i), P.getZ(i)); (rej.get(k) || rej.set(k, []).get(k)).push(i); }
  const _p = new THREE.Vector3(), _n = new THREE.Vector3(), _t = new THREE.Vector3();
  function cercano(p) {
    let mejor = -1, md = Infinity; const bx = Math.floor(p.x / C), by = Math.floor(p.y / C), bz = Math.floor(p.z / C);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const l = rej.get(((bx + dx) * 73856093) ^ ((by + dy) * 19349663) ^ ((bz + dz) * 83492791)); if (!l) continue;
      for (const i of l) { const ddx = P.getX(i) - p.x, ddy = P.getY(i) - p.y, ddz = P.getZ(i) - p.z, d2 = ddx * ddx + ddy * ddy + ddz * ddz; if (d2 < md) { md = d2; mejor = i; } }
    }
    return mejor;
  }
  let s = semilla; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // radio del moño (los mechones terminan al llegar)
  const R_MONO = 3.2;
  const pos = [], nor = [], uvs = [], col = [], dirs = [], idx = [];
  // un mechón: recorre el cráneo hacia el moño a una altura h sobre la piel; ancho w; alfa a; opciones de cabellito suelto
  function mechon(i0, h, w, alfa, o) {
    o = o || {};
    const p = new THREE.Vector3(P.getX(i0), P.getY(i0), P.getZ(i0)), pts = [], nrs = [];
    let giro = (rnd() - 0.5) * 0.5; const paso = o.paso || 1.0, maxPasos = o.pasos || 34;
    for (let k = 0; k < maxPasos; k++) {
      const v = cercano(p); if (v < 0) break;
      _n.set(N.getX(v), N.getY(v), N.getZ(v)).normalize(); _p.set(P.getX(v), P.getY(v), P.getZ(v));
      const alto = h + (o.sube ? o.sube * (k / maxPasos) ** 1.6 : 0);
      p.addScaledVector(_n, alto - p.clone().sub(_p).dot(_n));
      pts.push(p.clone()); nrs.push(_n.clone());
      if (p.distanceTo(mono) < R_MONO) break;
      if (o.dir) _t.copy(o.dir); else _t.copy(mono).sub(p);
      _t.addScaledVector(_n, -_t.dot(_n)); if (_t.lengthSq() < 1e-6) break; _t.normalize();
      giro += (rnd() - 0.5) * 0.12; _t.applyAxisAngle(_n, giro * (o.ondula || 0.35));
      p.addScaledVector(_t, paso);
    }
    if (pts.length < 3) return;
    for (let it = 0; it < 2; it++) for (let k = 1; k < pts.length - 1; k++) pts[k].lerpVectors(pts[k], pts[k - 1].clone().add(pts[k + 1]).multiplyScalar(0.5), 0.5);
    const base = pos.length / 3, var_ = (rnd() * 4) | 0, brillo = 0.75 + rnd() * 0.5, L = pts.length - 1;
    let largo = 0;
    for (let k = 0; k <= L; k++) {
      const d = (k < L ? pts[k + 1].clone().sub(pts[k]) : pts[k].clone().sub(pts[k - 1])).normalize();
      const lado = new THREE.Vector3().crossVectors(nrs[k], d).normalize();
      const f = k / L, ww = w * (o.punta ? 1 - 0.85 * f : 1 - 0.45 * f) * 0.5;
      const raiz = o.sinRaiz ? 1 : Math.min(1, f * L * paso / 1.3), punta = Math.min(1, (1 - f) * L * paso / 1.6);
      if (k) largo += pts[k].distanceTo(pts[k - 1]);
      for (const sg of [-1, 1]) {
        const q = pts[k].clone().addScaledVector(lado, sg * ww);
        pos.push(q.x, q.y, q.z); nor.push(nrs[k].x, nrs[k].y, nrs[k].z); dirs.push(d.x, d.y, d.z);
        uvs.push((var_ + (sg < 0 ? 0.02 : 0.98)) / 4, largo / (o.escV || 6));
        col.push(brillo, brillo, brillo, alfa * raiz * punta);
      }
      if (k) { const a0 = base + (k - 1) * 2; idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
    }
  }
  const al = (arr) => arr[(rnd() * arr.length) | 0];
  // capas: pegada, media y exterior (cada vez menos densa y más fina), y la línea del pelo
  for (let n = 0; n < 250; n++) mechon(al(lista), 0.07, 1.7 + rnd() * 0.8, 0.95);
  for (let n = 0; n < 180; n++) mechon(al(lista), 0.2, 1.0 + rnd() * 0.5, 0.9);
  for (let n = 0; n < 110; n++) mechon(al(lista), 0.34, 0.5 + rnd() * 0.4, 0.75);
  for (let n = 0; n < 200; n++) mechon(al(lineaPelo), 0.05, 0.6 + rnd() * 0.45, 0.95, { pasos: 10 });
  // cabellitos sueltos de las sienes y de la frente: cortos, finos, hacia abajo/adelante, apenas levantados
  const abajo = new THREE.Vector3(0, 0, -1);
  for (let n = 0; n < 70; n++) { const i = al(lineaPelo); mechon(i, 0.04, 0.22 + rnd() * 0.15, 0.55, { pasos: 3 + ((rnd() * 3) | 0), paso: 0.5, dir: abajo.clone().add(new THREE.Vector3(rnd() - 0.5, -0.6 - rnd(), rnd() - 0.5)), ondula: 1.4, sube: 0.18, punta: true, sinRaiz: true, escV: 3 }); }
  // pelos que se escapan en la coronilla (rompen la silueta sin hacer un contorno brillante)
  const altos = lista.filter((i) => P.getZ(i) > mono.z + 4);
  for (let n = 0; n < 34; n++) mechon(al(altos.length ? altos : lista), 0.3, 0.12 + rnd() * 0.08, 0.4, { pasos: 6 + ((rnd() * 5) | 0), paso: 0.8, sube: 0.6 + rnd() * 0.9, ondula: 0.9, punta: true, sinRaiz: true });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  geo.setAttribute('aDir', new THREE.Float32BufferAttribute(dirs, 3));
  const nv = pos.length / 3, si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
  for (let i = 0; i < nv; i++) { si[i * 4] = huesoCab; sw[i * 4] = 1; }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  const atlas = atlasHebras();
  const U = matCab.userData.u;
  const kk = (mat) => {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uLuzK: U.uLuzK, uColK: U.uColK, uLuzR: U.uLuzR, uColR: U.uColR });
      sh.vertexShader = 'attribute vec3 aDir;\nvarying vec3 vTanM;\n' + sh.vertexShader.replace('#include <skinning_vertex>', `#include <skinning_vertex>
	#ifdef USE_SKINNING
		vTanM = normalize( ( modelViewMatrix * ( skinMatrix * vec4( aDir, 0.0 ) ) ).xyz );
	#else
		vTanM = normalize( ( modelViewMatrix * vec4( aDir, 0.0 ) ).xyz );
	#endif`);
      sh.fragmentShader = 'uniform vec3 uLuzK;\nuniform vec3 uColK;\nuniform vec3 uLuzR;\nuniform vec3 uColR;\nvarying vec3 vTanM;\n' + GLSL_RUIDO + sh.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
	vec3 Tm = normalize( vTanM - normal * dot( vTanM, normal ) );
	float hm = ruidoV( vec2( vMapUv.x * 64.0, vMapUv.y * 3.0 ) );
	vec3 T1 = normalize( Tm + normal * ( 0.08 + 0.12 * ( hm - 0.5 ) ) ), T2 = normalize( Tm - normal * 0.12 );
	vec3 Hk = normalize( uLuzK + geometryViewDir ), Hr = normalize( uLuzR + geometryViewDir );
	float vK = smoothstep( -0.1, 0.3, dot( normal, uLuzK ) ), vR = smoothstep( -0.2, 0.3, dot( normal, uLuzR ) );
	reflectedLight.directSpecular *= 0.35;
	float rot = 0.35 + 1.3 * hm * hm;   // el brillo se rompe entre hebras
	reflectedLight.directSpecular += ( kkLobulo( T1, Hk, 70.0 ) * 0.035 * rot * vec3( 0.95, 0.9, 0.84 ) + kkLobulo( T2, Hk, 30.0 ) * diffuseColor.rgb * 0.7 ) * uColK * vK
		+ kkLobulo( T1, Hr, 60.0 ) * 0.015 * rot * vec3( 1.0, 0.9, 0.8 ) * uColR * vR;`);
    };
    mat.customProgramCacheKey = () => 'mechones-' + (mat.transparent ? 'b' : 'o');
    return mat;
  };
  const comun = { map: atlas, vertexColors: true, side: THREE.DoubleSide, roughness: 0.62, metalness: 0, envMapIntensity: 0.55, color: new THREE.Color(1, 1, 1) };
  const mOpaco = kk(new THREE.MeshStandardMaterial({ name: 'mechones', ...comun, alphaTest: 0.5 }));
  // (sin alphaTest: sin «discard» la GPU puede descartar antes de sombrear lo que queda tapado por el núcleo opaco)
  const mBorde = kk(new THREE.MeshStandardMaterial({ name: 'mechones-borde', ...comun, transparent: true, depthWrite: false }));
  const sombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: atlas, alphaTest: 0.5 });
  const hacer = (mat, nombre, orden) => {
    const m = new THREE.SkinnedMesh(geo, mat); m.name = nombre; m.position.copy(cab.position); m.quaternion.copy(cab.quaternion); m.scale.copy(cab.scale);
    m.bind(cab.skeleton, cab.bindMatrix); m.frustumCulled = false; m.renderOrder = orden; return m;
  };
  const a = hacer(mOpaco, 'mechones', 0), b = hacer(mBorde, 'mechones-borde', 3);
  a.castShadow = true; a.receiveShadow = true; a.customDepthMaterial = sombra; b.castShadow = false; b.receiveShadow = false;
  return { mallas: [a, b], texturas: [atlas], vertices: nv, triangulos: idx.length / 3 };
}

// poros: altura procedural (puntitos hundidos + grano fino) → normales (Sobel) en RG, y en B la altura para la rugosidad
function texturaPoros() {
  const N = 256, h = new Float32Array(N * N); let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N * N; i++) h[i] = rnd() * 0.25;
  for (let k = 0; k < 1500; k++) {
    const cx = rnd() * N, cy = rnd() * N, r = 0.8 + rnd() * 1.6, p = 0.5 + rnd() * 0.5;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const dd = Math.hypot(x - cx, y - cy) / r; if (dd > 1) continue;
      const i = ((y + N) % N) * N + ((x + N) % N); h[i] -= p * (1 - dd * dd);
    }
  }
  // suavizado (un desenfoque de 3×3, dos veces) para que no sea ruido blanco
  for (let it = 0; it < 2; it++) { const g = h.slice(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let a = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) a += g[((y + dy + N) % N) * N + ((x + dx + N) % N)]; h[y * N + x] = a / 9; } }
  let mn = 1e9, mx = -1e9; for (const v of h) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N), d = im.data;
  const H = (xx, yy) => (h[((yy + N) % N) * N + ((xx + N) % N)] - mn) / (mx - mn);
  for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) {
    const gx = (H(xx + 1, y) - H(xx - 1, y)) * 2.2, gy = (H(xx, y + 1) - H(xx, y - 1)) * 2.2, i = (y * N + xx) * 4;
    const nz = 1 / Math.hypot(gx, gy, 1);
    d[i] = (-gx * nz * 0.5 + 0.5) * 255; d[i + 1] = (-gy * nz * 0.5 + 0.5) * 255; d[i + 2] = H(xx, y) * 255; d[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; return t;
}

// ---------------------------------------------------------------- gestos (formas de cara + postura)
// Ángulos en grados, en los ejes del modelo: +x a su izquierda, +y arriba, +z al frente.
// cab: [cabeceo (+ = baja el mentón), giro (+ = a su izquierda), ladeo (+ = oreja derecha al hombro)]
const GESTOS = {
  // neutra: cara en reposo, atenta, sin sonrisa (así empieza la entrevista)
  neutra: { f: { browInnerUp: 0.04, mouthPressLeft: 0.06, mouthPressRight: 0.06 },
    cab: [0, 0, 0], tronco: [0, 0, 0], hombros: 0, mirada: { aparte: 0.1, dir: [-8, 2] }, respira: 4.6, parpadeo: [2.8, 5.6], vida: 0.85 },
  tranquila: { f: { mouthSmileLeft: 0.42, mouthSmileRight: 0.42, cheekSquintLeft: 0.2, cheekSquintRight: 0.2, eyeSquintLeft: 0.08, eyeSquintRight: 0.08, browInnerUp: 0.06 },
    cab: [0, 0, 2.5], tronco: [1, 0, 0], hombros: 0, mirada: { aparte: 0.12, dir: [-9, 4] }, respira: 4.4, parpadeo: [2.6, 5.2], vida: 1 },
  pensativa: { f: { browInnerUp: 0.22, browDownLeft: 0.32, browOuterUpRight: 0.3, mouthLeft: 0.28, mouthPressLeft: 0.26, mouthPressRight: 0.16, mouthRollLower: 0.18, eyeSquintLeft: 0.2 },
    cab: [-4, 7, 5], tronco: [0, 2, 0], hombros: 0.1, mirada: { aparte: 0.85, dir: [15, 13] }, respira: 4.8, parpadeo: [3.0, 6.0], vida: 0.7 },
  dudosa: { f: { browInnerUp: 0.35, browOuterUpLeft: 0.65, browDownRight: 0.3, mouthPressLeft: 0.38, mouthLeft: 0.26, mouthRollLower: 0.16, eyeSquintRight: 0.25, mouthSmileLeft: 0.1, noseSneerRight: 0.1 },
    cab: [-1.5, 6, 8], tronco: [0, 3, 0], hombros: 0.5, mirada: { aparte: 0.55, dir: [12, 9] }, respira: 4.0, parpadeo: [2.2, 4.4], vida: 1.1 },
  sorprendida: { f: { browInnerUp: 0.75, browOuterUpLeft: 0.8, browOuterUpRight: 0.8, eyeWideLeft: 0.55, eyeWideRight: 0.55, jawOpen: 0.16, mouthFunnel: 0.14, mouthLowerDownLeft: 0.1, mouthLowerDownRight: 0.1 },
    cab: [-5, 0, -1], tronco: [-3, 0, 0], hombros: 0.2, mirada: { aparte: 0.03, dir: [0, 4] }, respira: 3.4, parpadeo: [3.6, 6.5], vida: 1.15 },
  emocionada: { f: { mouthSmileLeft: 1, mouthSmileRight: 1, cheekSquintLeft: 0.85, cheekSquintRight: 0.85, eyeSquintLeft: 0.38, eyeSquintRight: 0.38, browOuterUpLeft: 0.3, browOuterUpRight: 0.3, browInnerUp: 0.18, mouthUpperUpLeft: 0.3, mouthUpperUpRight: 0.3, mouthLowerDownLeft: 0.24, mouthLowerDownRight: 0.24, mouthStretchLeft: 0.22, mouthStretchRight: 0.22, jawOpen: 0.08, mouthDimpleLeft: 0.35, mouthDimpleRight: 0.35, noseSneerLeft: 0.08, noseSneerRight: 0.08 },
    cab: [-3, 2, -3], tronco: [-2, 0, 0], hombros: -0.2, mirada: { aparte: 0.08, dir: [8, 6] }, respira: 3.8, parpadeo: [2.8, 5.4], vida: 1.35 },
  aliviada: { f: { mouthSmileLeft: 0.5, mouthSmileRight: 0.5, cheekSquintLeft: 0.3, cheekSquintRight: 0.3, eyeSquintLeft: 0.18, eyeSquintRight: 0.18, browInnerUp: 0.32, mouthDimpleLeft: 0.12, mouthDimpleRight: 0.12 },
    cab: [-2, 0, 6], tronco: [-1, 0, 0], hombros: -0.45, mirada: { aparte: 0.15, dir: [-6, 6] }, respira: 5.4, parpadeo: [2.6, 5.0], vida: 1 },
  seria: { f: { mouthPressLeft: 0.32, mouthPressRight: 0.32, browDownLeft: 0.35, browDownRight: 0.35, eyeSquintLeft: 0.15, eyeSquintRight: 0.15, mouthShrugLower: 0.18, mouthFrownLeft: 0.08, mouthFrownRight: 0.08 },
    cab: [3, 0, 0], tronco: [1, 0, 0], hombros: 0.1, mirada: { aparte: 0.05, dir: [-6, -3] }, respira: 4.8, parpadeo: [3.4, 6.5], vida: 0.5 },
  molesta: { f: { browDownLeft: 0.7, browDownRight: 0.7, browInnerUp: 0.05, noseSneerLeft: 0.28, noseSneerRight: 0.28, eyeSquintLeft: 0.32, eyeSquintRight: 0.32, mouthPressLeft: 0.42, mouthPressRight: 0.42, mouthFrownLeft: 0.3, mouthFrownRight: 0.3, mouthRollLower: 0.1, jawForward: 0.08, mouthUpperUpLeft: 0.08, mouthUpperUpRight: 0.08 },
    cab: [-3, -4, -2], tronco: [-1, -2, 0], hombros: 0.35, mirada: { aparte: 0.3, dir: [12, 0] }, respira: 3.2, parpadeo: [2.0, 4.0], vida: 1.15 },
  nerviosa: { f: { browInnerUp: 0.6, browOuterUpLeft: 0.15, browOuterUpRight: 0.15, eyeWideLeft: 0.22, eyeWideRight: 0.22, mouthStretchLeft: 0.3, mouthStretchRight: 0.3, mouthPressLeft: 0.3, mouthPressRight: 0.3, mouthRollLower: 0.22, mouthSmileLeft: 0.12, mouthSmileRight: 0.06 },
    cab: [2, -5, -3], tronco: [1, -2, 0], hombros: 0.95, mirada: { aparte: 0.6, dir: [-12, -6] }, respira: 2.7, parpadeo: [0.9, 2.2], vida: 1.4 },
  incomoda: { f: { browInnerUp: 0.8, browDownLeft: 0.12, browDownRight: 0.12, mouthFrownLeft: 0.55, mouthFrownRight: 0.55, mouthPressLeft: 0.4, mouthPressRight: 0.4, mouthRollLower: 0.28, mouthStretchLeft: 0.18, mouthStretchRight: 0.18, eyeSquintLeft: 0.12, eyeSquintRight: 0.12 },
    cab: [8, -8, -4], tronco: [3, -3, 0], hombros: 1, mirada: { aparte: 0.65, dir: [-10, -16] }, respira: 3.3, parpadeo: [1.6, 3.4], vida: 0.8 },
  avergonzada: { f: { browInnerUp: 0.62, browDownLeft: 0.1, browDownRight: 0.1, mouthSmileLeft: 0.22, mouthSmileRight: 0.08, mouthPressLeft: 0.35, mouthPressRight: 0.35, mouthRollLower: 0.32, mouthRollUpper: 0.1, mouthLeft: 0.14, cheekSquintLeft: 0.12, eyeSquintLeft: 0.12, eyeSquintRight: 0.12 },
    cab: [12, -12, -6], tronco: [4, -4, 0], hombros: 0.85, mirada: { aparte: 0.85, dir: [-14, -20] }, respira: 3.6, parpadeo: [1.4, 3.0], vida: 0.7 },
  triste: { f: { browInnerUp: 0.9, browDownLeft: 0.12, browDownRight: 0.12, mouthFrownLeft: 0.62, mouthFrownRight: 0.62, mouthShrugLower: 0.32, mouthPressLeft: 0.18, mouthPressRight: 0.18, mouthLowerDownLeft: 0.06, mouthLowerDownRight: 0.06, eyeSquintLeft: 0.14, eyeSquintRight: 0.14 },
    cab: [10, 3, 5], tronco: [5, 0, 0], hombros: -0.15, mirada: { aparte: 0.75, dir: [-5, -20] }, respira: 5.6, parpadeo: [2.0, 4.4], vida: 0.45 },
};
// después de descubrir el insight, su «tranquila» es más abierta y cálida
const ABIERTA = { f: { mouthSmileLeft: 0.5, mouthSmileRight: 0.5, cheekSquintLeft: 0.25, cheekSquintRight: 0.25, eyeSquintLeft: 0.1, eyeSquintRight: 0.1, browInnerUp: 0.18 },
  cab: [-1, 0, 4], tronco: [0, 0, 0], hombros: -0.35, mirada: { aparte: 0.1, dir: [-8, 3] }, respira: 4.6, parpadeo: [2.8, 5.4], vida: 1 };

// visemas según la apertura: amplios, medios, cerrados
const VIS_A = ['aa', 'E', 'aa', 'E', 'O'], VIS_M = ['E', 'I', 'RR', 'DD', 'kk', 'aa', 'E', 'O', 'nn'], VIS_C = ['I', 'U', 'SS', 'nn', 'DD', 'CH', 'kk'], VIS_0 = ['PP', 'FF', 'nn', 'SS', 'PP'];
const pick = (a) => a[(Math.random() * a.length) | 0];

// ---------------------------------------------------------------- montar
export async function montar(cont, op) {
  op = op || {};
  const mm = (q) => { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  const quieta = !!op.sinMovimiento || mm('(prefers-reduced-motion: reduce)');
  const temaPedido = op.fondo || 'auto';
  const temaDe = () => {
    if (temaPedido !== 'auto') return temaPedido;
    const t = document.documentElement.getAttribute('data-tema');
    if (t === 'dark') return 'oscuro'; if (t === 'light') return 'claro';
    return mm('(prefers-color-scheme: dark)') ? 'oscuro' : 'claro';
  };
  let tema = temaDe();
  const transparente = tema === 'transparente';

  // lienzo encima de lo que ya haya en el contenedor (el SVG queda debajo hasta que Rosa 3D esté lista)
  if (getComputedStyle(cont).position === 'static') cont.style.position = 'relative';
  const renderer = new THREE.WebGLRenderer({ antialias: !(op._dbg || '').includes('sinmsaa'), alpha: transparente, powerPreference: 'default', premultipliedAlpha: true });
  const lienzo = renderer.domElement;
  lienzo.setAttribute('aria-hidden', 'true');
  Object.assign(lienzo.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', borderRadius: 'inherit', opacity: '0', transition: 'opacity .45s ease' });
  const dprMax = op.calidad === 'baja' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  let dpr = dprMax; renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = op._tm === 'agx' ? THREE.AgXToneMapping : op._tm === 'neutral' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = op._exp ? +op._exp : 0.9;
  const DBG = op._dbg || '';
  renderer.shadowMap.enabled = !DBG.includes('sinsombra'); renderer.shadowMap.type = op.calidad === 'baja' || DBG.includes('pcf') ? THREE.PCFShadowMap : THREE.VSMShadowMap;
  if (transparente) renderer.setClearColor(0x000000, 0);
  cont.appendChild(lienzo);
  // lente: viñeta suave y grano fino casi invisible, encima del lienzo (CSS y un PNG data: de 128 px; no cuesta GPU)
  const capas = [];
  if (!transparente) {
    const grano = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), im = x.createImageData(128, 128); let s = 5;
      for (let i = 0; i < im.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = (s / 2147483647) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      x.putImageData(im, 0, 0); return c.toDataURL('image/png'); })();
    const capa = (estilo, opa) => { const d = document.createElement('div'); d.setAttribute('aria-hidden', 'true');
      Object.assign(d.style, { position: 'absolute', inset: '0', pointerEvents: 'none', borderRadius: 'inherit', opacity: '0', transition: 'opacity .45s ease' }, estilo);
      d.dataset.opa = opa; cont.appendChild(d); capas.push(d); return d; };
    capa({ background: 'radial-gradient(ellipse 78% 72% at 50% 40%, rgba(0,0,0,0) 58%, rgba(12,7,4,0.22) 100%)' }, '1');
    capa({ backgroundImage: `url(${grano})`, backgroundSize: '128px 128px', mixBlendMode: 'overlay' }, '0.035');
  }
  const mostrarCapas = () => { for (const d of capas) d.style.opacity = d.dataset.opa; };

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cuarto = new RoomEnvironment(); const envRT = pmrem.fromScene(cuarto, 0.04); cuarto.dispose && cuarto.dispose(); pmrem.dispose();
  escena.environment = envRT.texture; escena.environmentIntensity = 0.23;
  let fondoTex = null;
  const ponerFondo = () => { if (transparente) return; if (fondoTex) fondoTex.dispose(); fondoTex = pintarFondo(tema); escena.background = fondoTex; };
  ponerFondo();

  // luces: clave cálida (con sombra), relleno frío, contraluz para separar el pelo del fondo, rebote cálido de abajo
  const clave = new THREE.DirectionalLight(0xffeedd, 3.4);
  const relleno = new THREE.DirectionalLight(0xd6e2ff, 0.34);
  const contraluz = new THREE.DirectionalLight(0xffe4c8, 3.2);
  const rebote = new THREE.DirectionalLight(0xffd9b8, 0.22);
  escena.add(clave, clave.target, relleno, relleno.target, contraluz, contraluz.target, rebote, rebote.target);
  clave.castShadow = true; clave.shadow.mapSize.set(1024, 1024); clave.shadow.radius = 9; clave.shadow.blurSamples = 12; clave.shadow.bias = -0.0004; clave.shadow.normalBias = 0.003;

  // modelo
  const loader = new GLTFLoader(); loader.register((p) => new TexturasCSP(p));
  const url = op.modelo || '/files/design-thinking-claude/materials/rosa3d/rosa.glb';
  let gltf;
  try { gltf = await loader.loadAsync(url); }
  catch (e) {               // un corte de red puntual: un reintento antes de rendirse (y dejar el SVG)
    try { await new Promise((ok) => setTimeout(ok, 900)); gltf = await loader.loadAsync(url); }
    catch (e2) { renderer.dispose(); renderer.forceContextLoss(); lienzo.remove(); throw e2; }
  }
  const modelo = gltf.scene;
  const av = new THREE.Group(); av.name = 'Rosa'; av.add(modelo); av.scale.setScalar(0.01); escena.add(av);
  av.rotation.y = -9 * RAD;   // cuerpo apenas girado (tres cuartos suave); cabeza y ojos van a la cámara
  escena.updateMatrixWorld(true);

  const huesos = {}; const mallas = {};
  modelo.traverse((o) => { if (o.isBone) huesos[o.name] = o; if (o.isMesh) mallas[o.name] = o; });
  const H = (n) => huesos['Bip01_' + n];
  if (!H('Head') || !mallas.cabeza) throw new Error('Rosa 3D: el modelo no trae el esqueleto o la cabeza esperados');

  // materiales propios con las texturas del .glb
  const T = (m, k) => (m && m[k]) || null;
  const mc = mallas.cabeza.material, mb = mallas.cuerpo.material, mp = mallas.pelo && mallas.pelo.material;
  // centro del moño (en el espacio de la malla): hacia ahí va el peinado del pelo pegado al cráneo
  const monoObj = new THREE.Vector3();
  if (mallas.pelo) {   // (sin las pestañas, que también son láminas de esta malla)
    const g = mallas.pelo.geometry, pp = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bb = new THREE.Box3();
    const cara = new Set(); mallas.pelo.skeleton.bones.forEach((b, i) => { if (/EyeBlink|Eye$|Eyebrow/i.test(b.name)) cara.add(i); });
    for (let i = 0; i < pp.count; i++) { let w = 0; for (let c = 0; c < 4; c++) if (cara.has(si.getComponent(i, c))) w += sw.getComponent(i, c); if (w < 0.2) bb.expandByPoint(new THREE.Vector3().fromBufferAttribute(pp, i)); }
    bb.getCenter(monoObj);
  }
  let porosTex = null;
  const matCabeza = piel(new THREE.MeshPhysicalMaterial({
    name: 'piel-cabeza', map: T(mc, 'map'), normalMap: T(mc, 'normalMap'), normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: T(mc, 'roughnessMap'), roughness: 1, metalness: 0, aoMap: T(mc, 'aoMap'), aoMapIntensity: 1,
    clearcoat: 1, clearcoatMap: T(mc, 'clearcoatMap'), clearcoatRoughness: 0.34, clearcoatRoughnessMap: T(mc, 'roughnessMap'),
    specularIntensity: 0.62, sheen: 0.55, sheenRoughness: 0.42, sheenColor: new THREE.Color(1, 0.9, 0.85), sheenColorMap: T(mc, 'map'),
  }), { wrap: [0.38, 0.2, 0.14], sss: 0.9, contra: 0.45, cabeza: true, poros: (porosTex = texturaPoros()), mono: monoObj });
  const matCuerpo = piel(new THREE.MeshPhysicalMaterial({
    name: 'chompa-y-piel', map: T(mb, 'map'), normalMap: T(mb, 'normalMap'), normalScale: new THREE.Vector2(1, 1),
    roughnessMap: T(mb, 'roughnessMap'), roughness: 1, metalness: 0, specularIntensity: 0.45,
    sheen: 0.6, sheenRoughness: 0.75, sheenColor: new THREE.Color(0.42, 0.3, 0.24),
  }), { wrap: [0.35, 0.2, 0.15], sss: 0.6, contra: 0.15 });
  const peloTex = T(mp, 'map');
  // pelo (moño y mechones sueltos) en dos pasadas: el núcleo opaco con recorte al 50 % (escribe profundidad, se ordena
  // solo) y encima los bordes con mezcla alfa, sin escribir profundidad: el contorno queda suave y sin el punteado del
  // recorte o del alpha-to-coverage.
  const PELO = { map: peloTex, side: THREE.DoubleSide, roughness: 0.5, metalness: 0, specularIntensity: 0.4, specularColor: new THREE.Color(0.9, 0.78, 0.68),
    sheen: 0.55, sheenRoughness: 0.35, sheenColor: new THREE.Color(0.36, 0.26, 0.2), color: new THREE.Color(1.15, 1.1, 1.08) };
  const matPelo = new THREE.MeshPhysicalMaterial({ name: 'pelo', ...PELO, alphaTest: 0.5, transparent: false });
  const matPeloBorde = new THREE.MeshPhysicalMaterial({ name: 'pelo-borde', ...PELO, alphaTest: 0.03, transparent: true, depthWrite: false });
  const sombraPelo = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: peloTex, alphaTest: 0.5 });
  for (const t of [matCabeza.map, matCuerpo.map, peloTex]) if (t) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); }
  for (const m of [mc, mb, mp]) if (m) m.dispose();
  mallas.cabeza.material = matCabeza; mallas.cuerpo.material = matCuerpo;
  if (mallas.pelo) { mallas.pelo.material = matPelo; mallas.pelo.customDepthMaterial = sombraPelo; }
  for (const k in mallas) { const m = mallas[k]; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; }

  // pestañas: son láminas de la malla del pelo pegadas a los párpados. Van aparte, con mezcla alfa (bordes suaves,
  // sin el dentado del recorte) y casi sin brillo.
  const matPestanas = new THREE.MeshStandardMaterial({ name: 'pestanas', map: peloTex, color: new THREE.Color(0.55, 0.5, 0.48), transparent: true, depthWrite: false,
    alphaTest: 0.01, side: THREE.DoubleSide, roughness: 0.8, metalness: 0 });
  if (mallas.pelo && mallas.pelo.geometry.index) {
    const pm = mallas.pelo, g = pm.geometry, ix = g.index.array, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const parpado = new Set(); pm.skeleton.bones.forEach((b, i) => { if (/EyeBlink|Eye$|Eyebrow/i.test(b.name)) parpado.add(i); });
    const esPest = (v) => { let w = 0; for (let c = 0; c < 4; c++) if (parpado.has(si.getComponent(v, c))) w += sw.getComponent(v, c); return w > 0.35; };
    const resto = [], pest = [];
    for (let i = 0; i < ix.length; i += 3) (esPest(ix[i]) && esPest(ix[i + 1]) && esPest(ix[i + 2]) ? pest : resto).push(ix[i], ix[i + 1], ix[i + 2]);
    if (pest.length) {
      g.setIndex(resto.concat(pest)); g.clearGroups(); g.addGroup(0, resto.length, 0); g.addGroup(resto.length, pest.length, 1);
      pm.material = [matPelo, matPestanas];
    }
    // segunda pasada del pelo (bordes con mezcla): misma geometría, mismas formas y mismo esqueleto
    const oculto = new THREE.MeshBasicMaterial({ visible: false });
    const borde = new THREE.SkinnedMesh(g, Array.isArray(pm.material) ? [matPeloBorde, oculto] : matPeloBorde);
    borde.name = 'pelo-borde'; borde.position.copy(pm.position); borde.quaternion.copy(pm.quaternion); borde.scale.copy(pm.scale);
    pm.parent.add(borde); borde.bind(pm.skeleton, pm.bindMatrix);
    borde.morphTargetInfluences = pm.morphTargetInfluences; borde.morphTargetDictionary = pm.morphTargetDictionary;
    borde.frustumCulled = false; borde.castShadow = false; borde.receiveShadow = true; borde.renderOrder = 2;
  }

  // pelo de verdad sobre el cráneo: mechones (láminas con hebras) que salen de la línea del pelo y de las sienes y van
  // hacia el moño pegados al cráneo, en tres capas; más cabellitos sueltos en las sienes y algunos pelos que se escapan
  // en la coronilla. Se generan al cargar sobre la malla de la cabeza (posición de reposo), con piel 100 % del hueso de
  // la cabeza, y se pintan en dos pasadas como el moño. En calidad 'baja' no se generan (queda el pelo pintado).
  let mechones = null;
  if (op.calidad !== 'baja' && !DBG.includes('sinmechones')) {
    try { mechones = peloProcedural(mallas.cabeza, matCabeza, monoObj, op.semilla || 11); } catch (e) { mechones = null; console.warn('Rosa 3D: sin mechones', e); }
    if (mechones) for (const m of mechones.mallas) mallas.cabeza.parent.add(m);
    if (mechones && DBG.includes('mechsinsombra')) mechones.mallas[0].castShadow = false;
    if (mechones && DBG.includes('mechsinborde')) mechones.mallas[1].visible = false;
  }

  // contacto del cuello con el borde de la chompa: distancia de cada vértice de la cabeza al cuerpo (en reposo), una vez
  {
    const gC = mallas.cabeza.geometry, pC = gC.attributes.position, pB = mallas.cuerpo.geometry.attributes.position;
    const ao = new Float32Array(pC.count).fill(1);
    let zMin = Infinity; for (let i = 0; i < pC.count; i++) zMin = Math.min(zMin, pC.getZ(i));
    const uvB = mallas.cuerpo.geometry.attributes.uv;
    // solo la tela: fuera la piel del escote del cuerpo (en la textura, el parche del centro), si no se oscurece la costura
    const esTela = (i) => { const u = uvB.getX(i), v = uvB.getY(i); return !(u > 0.43 && u < 0.58 && v > 0.45 && v < 0.64); };
    const cand = []; for (let i = 0; i < pB.count; i++) if (pB.getZ(i) > zMin - 3 && pB.getZ(i) < zMin + 40 && esTela(i)) cand.push(pB.getX(i), pB.getY(i), pB.getZ(i));
    for (let i = 0; i < pC.count; i++) {
      const x = pC.getX(i), y = pC.getY(i), z = pC.getZ(i); if (z > zMin + 32) continue;
      let m = 9; for (let k = 0; k < cand.length; k += 3) { const dx = cand[k] - x, dy = cand[k + 1] - y, dz = cand[k + 2] - z, d2 = dx * dx + dy * dy + dz * dz; if (d2 < m) m = d2; }
      ao[i] = Math.min(1, Math.sqrt(m) / 2.6);        // 0 en el borde de la tela, 1 a 2,6 cm
    }
    gC.setAttribute('aoCuello', new THREE.BufferAttribute(ao, 1));
  }


  // formas de cara: nombre → [[malla, índice]]
  const FORMAS = {};
  for (const k in mallas) { const m = mallas[k]; if (!m.morphTargetDictionary) continue; for (const n in m.morphTargetDictionary) (FORMAS[n] ||= []).push([m, m.morphTargetDictionary[n]]); }
  // todas las formas que el motor nombra existen en `forma` aunque el modelo no las traiga (así nunca sale NaN)
  const EXTRA = ['jawOpen', 'mouthFunnel', 'eyeBlinkLeft', 'eyeBlinkRight', 'eyeWideLeft', 'eyeWideRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
    'mouthSmileLeft', 'mouthSmileRight', 'cheekSquintLeft', 'cheekSquintRight', 'mouthPressLeft', 'mouthPressRight', 'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower'];
  const usadas = new Set(Object.keys(FORMAS).concat(EXTRA));
  for (const g of [ABIERTA].concat(Object.values(GESTOS))) for (const n in g.f) usadas.add(n);
  const NOMBRES = Array.from(usadas);
  const forma = {}; for (const n of NOMBRES) forma[n] = 0;

  // ---------------- esqueleto: reposo (pose A) → base (brazos caídos, manos relajadas)
  modelo.updateMatrixWorld(true);
  const invM = new THREE.Matrix4().copy(modelo.matrixWorld).invert();
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const todos = Object.values(huesos);
  const Wr = new Map(), Pr = new Map();
  for (const b of todos) { _m.multiplyMatrices(invM, b.matrixWorld); const q = new THREE.Quaternion(); const p = new THREE.Vector3(); _m.decompose(p, q, _s); Wr.set(b, q); Pr.set(b, p); }
  const Wb = new Map(); for (const b of todos) Wb.set(b, Wr.get(b).clone());
  const sub = (b, f) => { f(b); for (const c of b.children) if (c.isBone) sub(c, f); };
  const girarSub = (b, R) => sub(b, (x) => Wb.get(x).premultiply(R));
  const pos = (n) => Pr.get(H(n));
  // brazos: del ángulo de la pose A a colgando, apenas separados del cuerpo y hacia adelante
  for (const [lado, sx] of [['L', 1], ['R', -1]]) {
    const ua = H(lado + '_UpperArm'), fa = H(lado + '_Forearm'), ha = H(lado + '_Hand');
    const dir = pos(lado + '_Forearm').clone().sub(pos(lado + '_UpperArm')).normalize();
    const quiero = new THREE.Vector3(0.2 * sx, -1, 0.05).normalize();
    girarSub(ua, new THREE.Quaternion().setFromUnitVectors(dir, quiero));
    girarSub(H(lado + '_Clavicle'), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -4 * sx * RAD));
    girarSub(fa, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -16 * RAD));   // codo apenas doblado
    girarSub(ha, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 6 * sx * RAD));
    // dedos relajados: cada falange se cierra un poco hacia la palma
    for (let f = 1; f <= 4; f++) for (const seg of ['', '1', '2']) {
      const b = H(`${lado}_Finger${f}${seg}`); if (!b) continue;
      girarSub(b, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -(seg === '' ? 14 : 22) * sx * RAD));
    }
    // dedos juntos (en la pose A vienen abiertos en abanico): índice hacia atrás, meñique hacia adelante
    [[1, 9], [2, 2], [3, -5], [4, -11]].forEach(([f, a]) => { const b = H(`${lado}_Finger${f}`); if (b) girarSub(b, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a * RAD)); });
    const pulgar = H(lado + '_Finger0'); if (pulgar) girarSub(pulgar, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 10 * sx * RAD));
  }
  // locales de la base y matrices A = Wbase(padre)^-1, B = Wbase(hueso) para L = A·Δ·B
  const padreQ = (b) => (b.parent && b.parent.isBone ? Wb.get(b.parent) : null);
  const AB = new Map();
  for (const b of todos) {
    const qp = padreQ(b); const A = qp ? qp.clone().invert() : new THREE.Quaternion();
    if (!qp) { // la raíz: su padre (no hueso) no gira; Wr ya está en el espacio del modelo
      _m.multiplyMatrices(invM, b.parent.matrixWorld); const q = new THREE.Quaternion(); _m.decompose(_p, q, _s); A.copy(q).invert();
    }
    AB.set(b, [A, Wb.get(b).clone()]);
    b.quaternion.copy(A).multiply(Wb.get(b));
  }
  const _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const delta = (b, x, y, z) => { _e.set(x * RAD, y * RAD, z * RAD, 'YXZ'); _q.setFromEuler(_e); const [A, B] = AB.get(b); b.quaternion.copy(A).multiply(_q).multiply(B); };
  const deltaQ = (b, q) => { const [A, B] = AB.get(b); b.quaternion.copy(A).multiply(q).multiply(B); };
  modelo.updateMatrixWorld(true);

  // ---------------- encuadre: plano medio corto, ojos a ~38 % de arriba, lente larga (retrato)
  const camara = new THREE.PerspectiveCamera(20, 1, 0.1, 30);
  const ojoL = H('LEye'), ojoR = H('REye');
  const ojos = new THREE.Vector3().addVectors(ojoL.getWorldPosition(new THREE.Vector3()), ojoR.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  mallas.pelo && mallas.pelo.computeBoundingBox && mallas.pelo.computeBoundingBox();
  const cajaCab = new THREE.Box3(); for (const k of ['cabeza']) if (mallas[k]) { const m = mallas[k]; if (m.computeBoundingBox) m.computeBoundingBox(); const bb = (m.boundingBox || m.geometry.boundingBox).clone().applyMatrix4(m.matrixWorld); cajaCab.union(bb); }
  const tope = Math.min(cajaCab.max.y, ojos.y + 0.2);
  function encuadrar(w, h) {
    const asp = w / h; camara.aspect = asp;
    let alto = (tope + 0.04 - ojos.y) / 0.35;                  // ojos al 35 % desde arriba
    alto = Math.max(alto, 0.37 / asp);                          // en un cuadro angosto, que no corte la cara
    const centroY = tope + 0.04 - alto / 2;
    const dist = (alto / 2) / Math.tan((camara.fov / 2) * RAD);
    camara.position.set(ojos.x + 0.02, ojos.y + 0.015, ojos.z + dist);
    camara.lookAt(ojos.x + 0.02, centroY, ojos.z);
    camara.updateProjectionMatrix();
  }
  // luces relativas a la cabeza
  const cab0 = ojos.clone();
  const ponerLuz = (l, d, r) => { l.position.copy(cab0).add(new THREE.Vector3(...d).normalize().multiplyScalar(r)); l.target.position.copy(cab0); };
  ponerLuz(clave, [-1.35, 1.05, 1.0], 3); ponerLuz(relleno, [1.5, 0.1, 0.9], 3); ponerLuz(contraluz, [1.1, 1.0, -1.25], 3); ponerLuz(rebote, [0.2, -1, 0.9], 3);
  const sc = clave.shadow.camera; sc.left = -0.32; sc.right = 0.32; sc.top = 0.34; sc.bottom = -0.42; sc.near = 2.2; sc.far = 3.8; sc.updateProjectionMatrix();
  const claveColor0 = clave.color.clone(), contraColor0 = contraluz.color.clone();
  // de noche (tema oscuro) la luz es la de la lámpara: más cálida y algo más baja; de día, la de la ventana
  const ajustarTema = () => {
    const noche = tema === 'oscuro';
    claveColor0.set(noche ? 0xffe0c2 : 0xffeedd); relleno.color.set(noche ? 0xc9d6f2 : 0xd6e2ff);
    if (!op._exp) renderer.toneMappingExposure = noche ? 0.84 : 0.9;
  };
  ajustarTema();
  const _dl = new THREE.Vector3(), _qa2 = new THREE.Quaternion(), _qb2 = new THREE.Quaternion(), _qc2 = new THREE.Quaternion();
  const luzVista = (l, out) => out.copy(_dl.copy(l.position).sub(l.target.position).normalize()).transformDirection(camara.matrixWorldInverse);
  function uniformesLuz() {
    const U = matCabeza.userData.u; camara.updateMatrixWorld();
    luzVista(clave, U.uLuzK.value); luzVista(contraluz, U.uLuzR.value); luzVista(relleno, U.uLuzF.value);
    U.uColK.value.copy(clave.color).multiplyScalar(clave.intensity); U.uColR.value.copy(contraluz.color).multiplyScalar(contraluz.intensity);
    const hb = H('Head'), qc = hb.getWorldQuaternion(_qa2), qb0 = _qb2.copy(av.getWorldQuaternion(_qc2)).multiply(AB.get(hb)[1]);
    U.uArriba.value.set(0, 1, 0).applyQuaternion(av.quaternion).applyQuaternion(qb0.invert().premultiply(qc)).transformDirection(camara.matrixWorldInverse);
  }

  // ---------------- estado
  let gestoNombre = 'neutra', abierta = false;
  const cara = {}; for (const n of NOMBRES) cara[n] = 0;                 // formas del gesto, ya mezcladas
  const post = { cab: [0, 0, 0], tronco: [0, 0, 0], hombros: 0, vida: 1 };
  let respiraT = 4.6, parpadeoR = [2.8, 5.6], miradaCfg = GESTOS.neutra.mirada;
  const gesto0 = () => ((gestoNombre === 'tranquila' || gestoNombre === 'neutra') && abierta ? ABIERTA : GESTOS[gestoNombre] || GESTOS.neutra);
  // habla
  let ampIn = 0, ampT = -1, amp = 0, hablaManual = null;
  let visA = 'nn', visB = 'nn', visT = 0, visDur = 0.1;
  const vis = {}; for (const n of NOMBRES) if (n.startsWith('viseme_')) vis[n] = 0;
  // ojos y párpados
  let parpadeoProx = 1.5, parpadeoIni = -10, parpadeoDoble = false;
  let mirada = [0, 0], miradaObj = [0, 0], miradaProx = 0.6, aparteHasta = 0;
  // cabeceos de énfasis (muelle) y gestos de manos
  let enfasis = 0, enfasisV = 0, ampPrev = 0, cejaPulso = 0;
  let manoIni = -10, manoLado = 'R', manoProx = 3, manoAmp = 1;
  // descubierto
  let descIni = -1, alivio = 0, alivioObj = 0;
  // mezcla de un gesto con la «abierta» del descubierto (objeto reutilizado: nada de basura por cuadro)
  const MEZ = { f: {}, cab: [0, 0, 0], tronco: [0, 0, 0], hombros: 0, mirada: null, respira: 4.4, parpadeo: null, vida: 1 };
  function mezclar(A, B, k) {
    for (const n in MEZ.f) MEZ.f[n] = 0;
    for (const n in A.f) MEZ.f[n] = A.f[n] * (1 - k);
    for (const n in B.f) MEZ.f[n] = (MEZ.f[n] || 0) + B.f[n] * k;
    for (let i = 0; i < 3; i++) { MEZ.cab[i] = lerp(A.cab[i], B.cab[i], k); MEZ.tronco[i] = lerp(A.tronco[i], B.tronco[i], k); }
    MEZ.hombros = lerp(A.hombros, B.hombros, k); MEZ.respira = lerp(A.respira, B.respira, k); MEZ.vida = lerp(A.vida, B.vida, k);
    MEZ.mirada = k > 0.5 ? B.mirada : A.mirada; MEZ.parpadeo = k > 0.5 ? B.parpadeo : A.parpadeo;
    return MEZ;
  }
  let t = 0, ultimo = performance.now(), rafId = 0, activo = true, visible = true, vivo = true, destruido = false;
  let primerCuadro = null; const listo = new Promise((ok) => (primerCuadro = ok));

  const tamano = () => {
    const r = cont.getBoundingClientRect(); const w = Math.max(64, Math.round(r.width)), h = Math.max(64, Math.round(r.height));
    renderer.setSize(w, h, false); encuadrar(w, h);
  };
  tamano();
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(tamano) : null; if (ro) ro.observe(cont);
  // si el contenedor sale del documento (la estación se vuelve a pintar) y no vuelve en 3 s, se libera solo:
  // así un «Empezar de nuevo» o un cambio de estación no deja contextos WebGL huérfanos
  let api = null, quitarT = 0;
  const revisarDoc = () => { clearTimeout(quitarT); if (!cont.isConnected) quitarT = setTimeout(() => { if (!cont.isConnected && api) api.destruir(); }, 3000); };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); reanudar(); revisarDoc(); }) : null; if (io) io.observe(cont);
  const alCambiarVis = () => reanudar(); document.addEventListener('visibilitychange', alCambiarVis);
  const mqTema = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const alTema = () => { const n = temaDe(); if (n !== tema && !transparente) { tema = n; ponerFondo(); ajustarTema(); } };
  if (mqTema && mqTema.addEventListener) mqTema.addEventListener('change', alTema);
  const moTema = typeof MutationObserver === 'function' ? new MutationObserver(alTema) : null; if (moTema) moTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  lienzo.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); vivo = false; cancelAnimationFrame(rafId); if (op.alPerder) try { op.alPerder(); } catch (e) { /* nada */ } }, false);

  // ---------------- un paso de animación
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), va = new THREE.Vector3(), vb = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  const camLocal = new THREE.Vector3();
  function paso(dt) {
    t += dt;
    if (descIni >= 0) alivioObj = suave((t - descIni - 1.9) / 0.8);
    alivio = acercar(alivio, alivioObj, dt, alivioObj > alivio ? 0.06 : 0.4);
    const G0 = gesto0(), G = alivio > 0.002 ? mezclar(G0, ABIERTA, alivio) : G0, mov = quieta ? 0 : 1;
    // ---- mezcla del gesto (~300 ms)
    for (const n of NOMBRES) cara[n] = acercar(cara[n], G.f[n] || 0, dt, 0.085);
    for (let i = 0; i < 3; i++) { post.cab[i] = acercar(post.cab[i], G.cab[i], dt, 0.11); post.tronco[i] = acercar(post.tronco[i], G.tronco[i], dt, 0.14); }
    post.hombros = acercar(post.hombros, G.hombros, dt, 0.14); post.vida = acercar(post.vida, G.vida, dt, 0.3);
    respiraT = acercar(respiraT, G.respira, dt, 0.8); parpadeoR = G.parpadeo; miradaCfg = G.mirada;

    // ---- habla: amplitud suavizada (sube rápido, baja más lento) y visemas que se encadenan
    if (ampT >= 0 && t - ampT > 0.3) ampIn = 0;
    amp = acercar(amp, ampIn, dt, ampIn > amp ? 0.035 : 0.09);
    const hablaAuto = ampT >= 0 && t - ampT < 0.45;
    const habla = hablaManual === null ? hablaAuto : hablaManual || hablaAuto;
    visT += dt;
    if (visT >= visDur) {
      visT = 0; visA = visB; visDur = azar(0.075, 0.15);
      const caida = amp < ampPrev - 0.12;
      visB = amp < 0.04 ? 'nn' : caida && Math.random() < 0.45 ? pick(VIS_0) : amp > 0.55 ? pick(VIS_A) : amp > 0.25 ? pick(VIS_M) : pick(VIS_C);
    }
    const k = suave(visT / (visDur * 0.65));
    const abre = sat(amp * 1.15);
    for (const n in vis) {
      const nm = n.slice(7);
      let w = (nm === visA ? 1 - k : 0) + (nm === visB ? k : 0);
      const cierre = nm === 'PP' || nm === 'FF' || nm === 'SS' || nm === 'CH';
      w *= cierre ? 0.6 * sat(amp * 4) : (0.1 + 0.48 * abre) * sat(amp * 8);
      vis[n] = acercar(vis[n], w, dt, 0.04);
    }
    // ---- énfasis: un arranque fuerte de la voz da un cabeceo y alza las cejas
    const subida = amp - ampPrev; ampPrev = amp;
    if (habla && subida > 0.06 * dt * 60 && Math.random() < 0.08 * mov) { enfasisV += azar(0.6, 1.2) * post.vida; cejaPulso = Math.min(1, cejaPulso + azar(0.4, 0.8)); }
    enfasisV += (-40 * enfasis - 9 * enfasisV) * dt; enfasis += enfasisV * dt;
    cejaPulso = acercar(cejaPulso, 0, dt, 0.35);

    // ---- parpadeo (más seguido si está incómoda; doble a veces; acompaña los cambios grandes de mirada)
    if (t > parpadeoProx) { parpadeoIni = t; parpadeoDoble = Math.random() < 0.15; parpadeoProx = t + azar(parpadeoR[0], parpadeoR[1]); }
    const bt = t - parpadeoIni, curva = (u) => (u < 0.075 ? u / 0.075 : u < 0.11 ? 1 : u < 0.24 ? 1 - (u - 0.11) / 0.13 : 0);
    let parp = curva(bt); if (parpadeoDoble) parp = Math.max(parp, curva(bt - 0.3));
    // ---- mirada: casi siempre a la cámara (al alumno) con microsacadas; a ratos aparta la vista según el gesto
    if (t > miradaProx) {
      const aparte = Math.random() < miradaCfg.aparte * (habla ? 1.2 : 0.8);
      if (aparte) { miradaObj = [miradaCfg.dir[0] + azar(-4, 4), miradaCfg.dir[1] + azar(-3, 3)]; aparteHasta = t + azar(0.7, 1.8); miradaProx = aparteHasta; if (Math.random() < 0.35) { parpadeoIni = t; } }
      else { miradaObj = [azar(-1.4, 1.4), azar(-1, 1)]; miradaProx = t + azar(0.35, 1.4); }
      if (!mov) miradaObj = [0, 0];
    }
    mirada[0] = acercar(mirada[0], miradaObj[0], dt, 0.028); mirada[1] = acercar(mirada[1], miradaObj[1], dt, 0.028);

    // ---- descubierto: el momento en que se abre (≈ 4,8 s)
    let dx = { inspira: 0, suelta: 0, ojosC: 0, sonrisa: 0, cejas: 0, mano: 0, ladeo: 0, mira: 0 };
    if (descIni >= 0) {
      const u = t - descIni;
      dx.inspira = campana(u, 0, 0.7, 0.8, 1.5);           // toma aire
      dx.suelta = campana(u, 0.9, 1.7, 3.6, 5.2);          // suelta los hombros
      dx.ojosC = campana(u, 1.0, 1.45, 1.95, 2.45) * 0.85; // cierra los ojos un instante
      dx.mira = campana(u, 0.15, 0.5, 0.9, 1.2);           // mira abajo al recordar
      dx.sonrisa = suave((u - 1.9) / 0.9);
      dx.cejas = campana(u, 0.2, 0.9, 2.6, 4.2);
      dx.mano = quieta ? 0 : campana(u, 1.4, 2.4, 3.9, 5.0);
      dx.ladeo = campana(u, 1.2, 2.0, 3.8, 5.0);
      if (u > 5.4) descIni = -2;   // terminó: queda «abierta»
    }

    // ---- formas de cara: gesto + habla + parpadeo + énfasis + descubierto
    for (const n of NOMBRES) forma[n] = cara[n];
    for (const n in vis) forma[n] = vis[n];
    const hablaReduce = 1 - 0.65 * abre;          // al abrir la boca, la sonrisa y el «apretar» del gesto ceden
    for (const n of ['mouthPressLeft', 'mouthPressRight', 'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower']) forma[n] *= hablaReduce * hablaReduce;
    for (const n of ['mouthSmileLeft', 'mouthSmileRight']) forma[n] *= 1 - 0.3 * abre;
    forma.jawOpen += abre * 0.14;
    forma.browInnerUp += cejaPulso * 0.22 + dx.cejas * 0.45;
    forma.browOuterUpLeft += cejaPulso * 0.16; forma.browOuterUpRight += cejaPulso * 0.16;
    const sonr = descIni >= 0 ? dx.sonrisa * 0.2 : 0;
    forma.mouthSmileLeft += sonr; forma.mouthSmileRight += sonr; forma.cheekSquintLeft += sonr * 0.5; forma.cheekSquintRight += sonr * 0.5;
    forma.jawOpen += dx.suelta * 0.06 * (1 - dx.sonrisa); forma.mouthFunnel += dx.suelta * 0.1 * (1 - dx.sonrisa);
    // párpados: parpadeo, siguen a la mirada (abajo bajan), y el cierre del descubierto
    const abajo = sat(-mirada[1] / 18), arriba = sat(mirada[1] / 14);
    const cierre = Math.max(parp, dx.ojosC) + abajo * 0.32 + dx.mira * 0.25;
    forma.eyeBlinkLeft = sat(cierre + 0.12); forma.eyeBlinkRight = sat(cierre + 0.12);
    forma.eyeWideLeft += arriba * 0.12; forma.eyeWideRight += arriba * 0.12;
    if (!(op._dbg || '').includes('sinformas')) for (const n of NOMBRES) { const l = FORMAS[n]; if (!l) continue; const v = clamp(forma[n] || 0, 0, 1); for (const [m, i] of l) m.morphTargetInfluences[i] = v; }
    if ((op._dbg || '').includes('sinpose')) return;
    matCabeza.userData.u.uBocaLuz.value = sat(abre * 0.6 + forma.mouthSmileLeft * 0.15);

    // ---- cuerpo
    const V = post.vida * mov;
    const fase = (t / respiraT) * Math.PI * 2, resp = Math.sin(fase) * (quieta ? 0.5 : 1);
    const balanceo = ruido(t * 0.22, 1) * V, deriva = ruido(t * 0.17, 5) * V;
    const tr = post.tronco;
    // tronco: respiración (pecho), peso que se mueve, inclinación del gesto; en descubierto toma aire y suelta
    delta(H('Spine'), tr[0] * 0.3 + deriva * 0.4, tr[1] * 0.3 + balanceo * 0.7, balanceo * 0.6);
    delta(H('Spine1'), tr[0] * 0.35 - resp * 0.35 - dx.inspira * 1.2 + dx.suelta * 1.0, tr[1] * 0.35, balanceo * 0.3);
    delta(H('Spine2'), tr[0] * 0.35 - resp * 0.45 - dx.inspira * 1.5 + dx.suelta * 1.2, tr[1] * 0.35, 0);
    const hom = post.hombros * 2.2 + resp * 0.55 + dx.inspira * 2.4 - dx.suelta * 2.6;
    delta(H('L_Clavicle'), -post.hombros * 1.5, 0, hom);
    delta(H('R_Clavicle'), -post.hombros * 1.5, 0, -hom);
    // cabeza y cuello: gesto + deriva lenta + cabeceos al hablar (o de escucha) + el ladeo del descubierto
    const escucha = !habla && mov ? Math.max(0, Math.sin(t * 0.9)) ** 12 * 1.6 : 0;
    const cab = post.cab;
    const miraCab = [mirada[1] * 0.18, mirada[0] * 0.22];   // la cabeza acompaña un poco la mirada
    const pitch = cab[0] + enfasis * 3.2 + escucha + ruido(t * 0.31, 9) * 1.4 * V - miraCab[0] + dx.mira * 6 - dx.inspira * 3 + dx.ladeo * 2;
    const yaw = cab[1] + 9 * 0.6 + ruido(t * 0.23, 13) * 2.2 * V + miraCab[1] + (habla ? ruido(t * 0.9, 3) * 2.2 * V : 0);
    const roll = cab[2] + ruido(t * 0.19, 21) * 1.4 * V + dx.ladeo * 7;
    delta(H('Neck'), pitch * 0.4, yaw * 0.4, roll * 0.4);
    delta(H('Head'), pitch * 0.6, yaw * 0.6, roll * 0.6);
    // brazos: cuelgan; al hablar, a veces una mano marca el ritmo (entra por abajo del cuadro); en descubierto, la mano al pecho
    if (habla && mov && t > manoProx && manoIni < t - 2.2) { manoIni = t; manoLado = Math.random() < 0.6 ? 'R' : 'L'; manoAmp = azar(0.6, 1); manoProx = t + azar(3.5, 7); }
    if (!habla) manoProx = Math.max(manoProx, t + 1.2);
    const mu = t - manoIni, mano = mov ? campana(mu, 0, 0.55, 1.2, 2.0) * manoAmp * post.vida : 0;
    for (const [lado, sx] of [['L', 1], ['R', -1]]) {
      const g = lado === manoLado ? mano : 0;
      const pecho = lado === 'R' ? dx.mano : 0;
      const encoge = post.hombros > 0.5 ? (post.hombros - 0.5) * 2 : 0;   // incómoda: brazos más pegados
      // brazo: Δ en ejes del modelo (x = adelante/atrás, y = rotación interna, z = separar)
      _e.set((-8 * g - 12 * pecho + resp * 0.3 + balanceo * 0.4) * RAD, (-14 * g * sx - 70 * pecho * sx) * RAD, (sx * (-2 * encoge + 3 * g + 8 * pecho)) * RAD, 'YXZ');
      deltaQ(H(lado + '_UpperArm'), qa.setFromEuler(_e));
      delta(H(lado + '_Forearm'), -(48 * g + 85 * pecho + 4 * encoge), -30 * g * sx, 0);
      delta(H(lado + '_Hand'), -10 * g + 6 * pecho, 25 * g * sx, 0);
      // la mano que va al pecho se abre (los dedos dejan de estar recogidos)
      if (lado === 'R') for (let f = 1; f <= 4; f++) for (const seg of ['', '1', '2']) { const b = H(`R_Finger${f}${seg}`); if (b) delta(b, 0, 0, sx * (seg === '' ? 14 : 22) * 0.75 * pecho); }
    }
    if ((op._dbg || '').includes('sinojos')) return;
    // ojos: cada uno apunta a la cámara (con su vergencia) + desvío de la mirada, en el marco de la cabeza
    modelo.updateMatrixWorld(true);
    const cabQ = H('Head').getWorldQuaternion(qb);
    const avQ = av.getWorldQuaternion(new THREE.Quaternion());
    const [A0, B0] = AB.get(H('Head'));
    const cabBase = qa.copy(avQ).multiply(B0);               // la cabeza en su base, en el mundo
    camLocal.copy(camara.position);
    const dist = camLocal.distanceTo(ojos);
    const der = va.set(1, 0, 0).applyQuaternion(camara.quaternion), arr = vb.set(0, 1, 0).applyQuaternion(camara.quaternion);
    camLocal.addScaledVector(der, Math.tan(mirada[0] * RAD) * dist).addScaledVector(arr, Math.tan(mirada[1] * RAD) * dist);
    for (const ojo of [ojoL, ojoR]) {
      const po = ojo.getWorldPosition(new THREE.Vector3());
      const d = camLocal.clone().sub(po).normalize();
      // a ejes del modelo «como si la cabeza estuviera en su base»
      d.applyQuaternion(cabQ.clone().invert()).applyQuaternion(cabBase).applyQuaternion(avQ.clone().invert());
      const yawO = clamp(Math.atan2(d.x, d.z), -28 * RAD, 28 * RAD), pitchO = clamp(Math.asin(clamp(-d.y, -1, 1)), -20 * RAD, 22 * RAD);
      _e.set(pitchO, yawO, 0, 'YXZ'); deltaQ(ojo, _q.setFromEuler(_e));
    }
    if ((op._dbg || '').includes('sinluz')) return;
    // ---- luz: en el descubierto la clave se entibia apenas
    const cal = descIni >= 0 ? campana(t - descIni, 1.4, 2.4, 4.4, 6.0) : 0;
    clave.color.copy(claveColor0).lerp(new THREE.Color(1, 0.86, 0.7), cal * 0.35);
    contraluz.color.copy(contraColor0).lerp(new THREE.Color(1, 0.8, 0.6), cal * 0.4);
  }

  // ---------------- bucle: solo si se ve (pestaña visible y contenedor en pantalla); resolución adaptable
  let lento = 0, rapido = 0, cuadros = 0, acum = 0, congelado = false;
  const stats = { fps: 0, dpr };
  function cuadro(ahora) {
    rafId = 0; if (!vivo) return;
    const dtReal = Math.min(0.1, Math.max(0, (ahora - ultimo) / 1000)); ultimo = ahora;
    if (!congelado) paso(dtReal || 1 / 60);
    uniformesLuz(); renderer.render(escena, camara);
    if (capas[1] && !quieta && (cuadros & 3) === 0) capas[1].style.backgroundPosition = `${(Math.random() * 128) | 0}px ${(Math.random() * 128) | 0}px`;
    if (primerCuadro) { primerCuadro(); primerCuadro = null; lienzo.style.opacity = '1'; mostrarCapas(); }
    cuadros++; acum += dtReal;
    if (acum >= 1) {
      stats.fps = cuadros / acum; cuadros = 0; acum = 0;
      if (op.calidad !== 'alta') {
        if (stats.fps < 38) { lento++; rapido = 0; } else if (stats.fps > 57) { rapido++; lento = 0; } else { lento = 0; rapido = 0; }
        if (lento >= 2 && dpr <= 1.25 && mechones && mechones.mallas[1].visible) {   // equipo justo: sin la pasada suave del pelo ni su sombra
          mechones.mallas[1].visible = false; mechones.mallas[0].castShadow = false; lento = 0;
        } else if (lento >= 2 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); tamano(); lento = 0; }
        else if (rapido >= 6 && dpr < dprMax) { dpr = Math.min(dprMax, dpr + 0.25); renderer.setPixelRatio(dpr); tamano(); rapido = 0; }
        stats.dpr = dpr;
      }
    }
    if (activo) rafId = requestAnimationFrame(cuadro);
  }
  function reanudar() {
    activo = vivo && visible && !document.hidden;
    if (activo && !rafId) { ultimo = performance.now(); rafId = requestAnimationFrame(cuadro); }
    if (!activo && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }
  // el primer cuadro sale aunque el contenedor aún no esté a la vista (para que el cambio de SVG a 3D no parpadee)
  paso(1 / 60); renderer.compile(escena, camara); ultimo = performance.now(); rafId = requestAnimationFrame(cuadro);
  await Promise.race([listo, new Promise((ok) => setTimeout(ok, 1500))]);
  if (primerCuadro) { uniformesLuz(); renderer.render(escena, camara); primerCuadro(); primerCuadro = null; lienzo.style.opacity = '1'; mostrarCapas(); }

  api = {
    gesto(nombre) {
      const nuevo = GESTOS[nombre] ? nombre : 'neutra';
      // al cambiar de emoción parpadea y mueve apenas la cabeza, como una persona que reacciona
      if (nuevo !== gestoNombre && !quieta) { parpadeoIni = t; parpadeoProx = Math.max(parpadeoProx, t + 1.2); enfasisV += 0.45; miradaProx = t + 0.25; }
      gestoNombre = nuevo;
      if (descIni === -2) alivioObj = 0;    // una respuesta nueva después del descubierto: vuelve a su gesto (su «tranquila» ya es la abierta)
    },
    boca(n) { ampIn = sat(+n || 0); ampT = t; },
    // vuelve al inicio de la entrevista: neutra y sin el descubierto (sin recargar el modelo)
    reiniciar() {
      abierta = false; descIni = -1; alivioObj = 0; hablaManual = null; ampIn = 0; manoIni = -10;
      if (gestoNombre !== 'neutra' && !quieta) { parpadeoIni = t; }
      gestoNombre = 'neutra';
    },
    hablando(b) { hablaManual = b == null ? null : !!b; if (!b) { ampIn = 0; } },
    descubierto(o) {
      if (abierta) return; abierta = true;
      if (o && o.inmediato) return;          // al recargar una entrevista ya resuelta: queda abierta, sin la escena
      descIni = t;
    },
    destruir() {
      if (destruido) return; destruido = true; clearTimeout(quitarT);
      vivo = false; cancelAnimationFrame(rafId); rafId = 0;
      if (ro) ro.disconnect(); if (io) io.disconnect(); if (moTema) moTema.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVis);
      if (mqTema && mqTema.removeEventListener) mqTema.removeEventListener('change', alTema);
      const texs = new Set();
      escena.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        for (const m of [].concat(o.material || [], o.customDepthMaterial || [])) { for (const k in m) if (m[k] && m[k].isTexture) texs.add(m[k]); m.dispose(); }
        if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
      });
      texs.forEach((x) => x.dispose());
      if (fondoTex) fondoTex.dispose(); envRT.dispose(); if (porosTex) porosTex.dispose(); if (mechones) mechones.texturas.forEach((t) => t.dispose());
      for (const l of [clave, relleno, contraluz, rebote]) l.dispose && l.dispose();
      renderer.dispose(); renderer.forceContextLoss(); lienzo.remove(); for (const d of capas) d.remove();
    },
    // para pruebas y diagnóstico
    // pruebas: congelar el reloj y avanzar a paso fijo (capturas reproducibles)
    _congelar(b) { congelado = !!b; }, _avanzar(seg) { const n = Math.round(seg * 60); for (let i = 0; i < n; i++) paso(1 / 60); uniformesLuz(); renderer.render(escena, camara); },
    _pelo: () => (mechones ? { v: mechones.vertices, t: mechones.triangulos } : null),
    _stats: stats, _formas: forma, _three: THREE, _renderer: renderer, _escena: escena, _camara: camara,
  };
  return api;
}

window.__Rosa3DMotor = { montar, version: '1.3.0' };
