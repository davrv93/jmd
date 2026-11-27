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

// ---------------------------------------------------------------- fondo: un cuarto desenfocado (profundidad de campo pintada)
function pintarFondo(tema) {
  const W = 512, H = 576, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const blob = (cx, cy, r, color, a) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color.replace('A', a)); g.addColorStop(0.55, color.replace('A', a * 0.55)); g.addColorStop(1, color.replace('A', 0));
    x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  };
  const bokeh = (cx, cy, r, color, a) => {
    const g = x.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
    g.addColorStop(0, color.replace('A', a)); g.addColorStop(0.8, color.replace('A', a * 0.9)); g.addColorStop(1, color.replace('A', 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  };
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  if (tema === 'oscuro') {
    let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#262c35'); g.addColorStop(1, '#14171c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    blob(W * 0.84, H * 0.2, W * 0.62, 'rgba(255,170,96,A)', 0.30);     // lámpara cálida arriba a la derecha
    blob(W * 0.08, H * 0.42, W * 0.55, 'rgba(110,138,180,A)', 0.16);   // ventana fría, ya de noche
    blob(W * 0.86, H * 0.78, W * 0.36, 'rgba(46,62,48,A)', 0.55);      // planta en sombra
    for (let i = 0; i < 9; i++) bokeh(W * (0.55 + rnd() * 0.45), H * (0.05 + rnd() * 0.45), 10 + rnd() * 22, 'rgba(255,196,128,A)', 0.10 + rnd() * 0.12);
    for (let i = 0; i < 5; i++) bokeh(W * rnd() * 0.3, H * (0.2 + rnd() * 0.4), 8 + rnd() * 16, 'rgba(160,190,230,A)', 0.06 + rnd() * 0.06);
  } else {
    let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eae4da'); g.addColorStop(1, '#cfc5b7'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    blob(W * 0.02, H * 0.3, W * 0.72, 'rgba(255,255,250,A)', 0.85);    // ventana: luz de día
    blob(W * 0.1, H * 0.95, W * 0.5, 'rgba(176,160,140,A)', 0.35);
    blob(W * 0.9, H * 0.62, W * 0.34, 'rgba(92,112,78,A)', 0.55);      // planta
    blob(W * 0.78, H * 0.8, W * 0.26, 'rgba(70,88,62,A)', 0.45);
    blob(W * 0.7, H * 0.12, W * 0.3, 'rgba(255,236,206,A)', 0.35);     // reflejo cálido
    for (let i = 0; i < 7; i++) bokeh(W * (0.02 + rnd() * 0.35), H * (0.05 + rnd() * 0.5), 9 + rnd() * 20, 'rgba(255,255,255,A)', 0.12 + rnd() * 0.12);
  }
  // viñeta suave + grano fino (sin bandas en los degradados)
  const v = x.createRadialGradient(W * 0.5, H * 0.42, H * 0.25, W * 0.5, H * 0.5, H * 0.82);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, tema === 'oscuro' ? 'rgba(0,0,0,0.45)' : 'rgba(60,40,20,0.16)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  const im = x.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 3; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- piel: luz que se envuelve (dispersión bajo la piel, barata)
// Difusa con «wrap» por canal (el rojo da la vuelta al borde de la sombra), un poco de luz a contraluz en los bordes
// (orejas, nariz) y oclusión del interior de la boca también para la luz directa (aoMap de three solo toca la indirecta).
function piel(mat, opc) {
  const U = { uWrap: { value: new THREE.Vector3(...opc.wrap) }, uSSS: { value: opc.sss }, uBocaLuz: { value: 0 }, uContra: { value: opc.contra || 0 } };
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
    sh.fragmentShader = 'uniform vec3 uWrap;\nuniform float uSSS;\nuniform float uBocaLuz;\nuniform float uContra;\n' + sh.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', lit)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
	#ifdef USE_AOMAP
		float ocBoca = mix( ambientOcclusion, 1.0, uBocaLuz );
		reflectedLight.directDiffuse *= ocBoca;
		reflectedLight.directSpecular *= ocBoca * ocBoca;
	#endif`);
  };
  mat.customProgramCacheKey = () => 'rosa-piel';
  return mat;
}

// ---------------------------------------------------------------- gestos (formas de cara + postura)
// Ángulos en grados, en los ejes del modelo: +x a su izquierda, +y arriba, +z al frente.
// cab: [cabeceo (+ = baja el mentón), giro (+ = a su izquierda), ladeo (+ = oreja derecha al hombro)]
const GESTOS = {
  tranquila: { f: { mouthSmileLeft: 0.34, mouthSmileRight: 0.34, cheekSquintLeft: 0.14, cheekSquintRight: 0.14, eyeSquintLeft: 0.06, eyeSquintRight: 0.06, browInnerUp: 0.05 },
    cab: [0, 0, 2.5], tronco: [1, 0, 0], hombros: 0, mirada: { aparte: 0.12, dir: [-9, 4] }, respira: 4.4, parpadeo: [2.6, 5.2], vida: 1 },
  dudosa: { f: { browInnerUp: 0.28, browOuterUpLeft: 0.5, browDownRight: 0.18, mouthPressLeft: 0.3, mouthLeft: 0.18, mouthRollLower: 0.12, eyeSquintRight: 0.18, mouthSmileLeft: 0.06, noseSneerRight: 0.06 },
    cab: [-1.5, 5, 6], tronco: [0, 3, 0], hombros: 0.4, mirada: { aparte: 0.5, dir: [12, 9] }, respira: 4.0, parpadeo: [2.2, 4.4], vida: 1.1 },
  incomoda: { f: { browInnerUp: 0.72, browDownLeft: 0.12, browDownRight: 0.12, mouthFrownLeft: 0.45, mouthFrownRight: 0.45, mouthPressLeft: 0.32, mouthPressRight: 0.32, mouthRollLower: 0.22, mouthStretchLeft: 0.1, mouthStretchRight: 0.1, eyeSquintLeft: 0.1, eyeSquintRight: 0.1 },
    cab: [7, -7, -3], tronco: [3, -3, 0], hombros: 1, mirada: { aparte: 0.62, dir: [-10, -16] }, respira: 3.3, parpadeo: [1.6, 3.4], vida: 0.8 },
  emocionada: { f: { mouthSmileLeft: 0.95, mouthSmileRight: 0.95, cheekSquintLeft: 0.6, cheekSquintRight: 0.6, eyeSquintLeft: 0.26, eyeSquintRight: 0.26, browOuterUpLeft: 0.28, browOuterUpRight: 0.28, browInnerUp: 0.16, mouthUpperUpLeft: 0.16, mouthUpperUpRight: 0.16, mouthLowerDownLeft: 0.14, mouthLowerDownRight: 0.14, jawOpen: 0.05, mouthDimpleLeft: 0.2, mouthDimpleRight: 0.2 },
    cab: [-3, 2, -3], tronco: [-2, 0, 0], hombros: -0.2, mirada: { aparte: 0.08, dir: [8, 6] }, respira: 3.8, parpadeo: [2.8, 5.4], vida: 1.35 },
  seria: { f: { mouthPressLeft: 0.2, mouthPressRight: 0.2, browDownLeft: 0.2, browDownRight: 0.2, eyeSquintLeft: 0.1, eyeSquintRight: 0.1, mouthShrugLower: 0.12 },
    cab: [2, 0, 0], tronco: [1, 0, 0], hombros: 0.1, mirada: { aparte: 0.05, dir: [-6, -3] }, respira: 4.8, parpadeo: [3.4, 6.5], vida: 0.55 },
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
  renderer.shadowMap.enabled = !DBG.includes('sinsombra'); renderer.shadowMap.type = THREE.PCFShadowMap;
  if (transparente) renderer.setClearColor(0x000000, 0);
  cont.appendChild(lienzo);

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cuarto = new RoomEnvironment(); const envRT = pmrem.fromScene(cuarto, 0.04); cuarto.dispose && cuarto.dispose(); pmrem.dispose();
  escena.environment = envRT.texture; escena.environmentIntensity = 0.26;
  let fondoTex = null;
  const ponerFondo = () => { if (transparente) return; if (fondoTex) fondoTex.dispose(); fondoTex = pintarFondo(tema); escena.background = fondoTex; };
  ponerFondo();

  // luces: clave cálida (con sombra), relleno frío, contraluz para separar el pelo del fondo, rebote cálido de abajo
  const clave = new THREE.DirectionalLight(0xffeedd, 3.4);
  const relleno = new THREE.DirectionalLight(0xd6e2ff, 0.45);
  const contraluz = new THREE.DirectionalLight(0xffe4c8, 3.2);
  const rebote = new THREE.DirectionalLight(0xffd9b8, 0.22);
  escena.add(clave, clave.target, relleno, relleno.target, contraluz, contraluz.target, rebote, rebote.target);
  clave.castShadow = true; clave.shadow.mapSize.set(1024, 1024); clave.shadow.radius = 5; clave.shadow.bias = -0.0003; clave.shadow.normalBias = 0.0025;

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
  const matCabeza = piel(new THREE.MeshPhysicalMaterial({
    name: 'piel-cabeza', map: T(mc, 'map'), normalMap: T(mc, 'normalMap'), normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: T(mc, 'roughnessMap'), roughness: 1, metalness: 0, aoMap: T(mc, 'aoMap'), aoMapIntensity: 1,
    clearcoat: 1, clearcoatMap: T(mc, 'clearcoatMap'), clearcoatRoughness: 0.34, clearcoatRoughnessMap: T(mc, 'roughnessMap'),
    specularIntensity: 0.62, sheen: 0.45, sheenRoughness: 0.5, sheenColor: new THREE.Color(1, 0.9, 0.85), sheenColorMap: T(mc, 'map'),
  }), { wrap: [0.5, 0.24, 0.16], sss: 1, contra: 0.5 });
  const matCuerpo = piel(new THREE.MeshPhysicalMaterial({
    name: 'chompa-y-piel', map: T(mb, 'map'), normalMap: T(mb, 'normalMap'), normalScale: new THREE.Vector2(1, 1),
    roughnessMap: T(mb, 'roughnessMap'), roughness: 1, metalness: 0, specularIntensity: 0.45,
    sheen: 0.6, sheenRoughness: 0.75, sheenColor: new THREE.Color(0.42, 0.3, 0.24),
  }), { wrap: [0.35, 0.2, 0.15], sss: 0.6, contra: 0.15 });
  const peloTex = T(mp, 'map');
  const matPelo = new THREE.MeshPhysicalMaterial({
    name: 'pelo', map: peloTex, alphaTest: 0.08, alphaToCoverage: true, side: THREE.DoubleSide, transparent: false,
    roughness: 0.55, metalness: 0, specularIntensity: 0.35, specularColor: new THREE.Color(0.85, 0.72, 0.62),
    sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0.32, 0.22, 0.16),
  });
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

  // ---------------- estado
  let gestoNombre = 'tranquila', abierta = false;
  const cara = {}; for (const n of NOMBRES) cara[n] = 0;                 // formas del gesto, ya mezcladas
  const post = { cab: [0, 0, 0], tronco: [0, 0, 0], hombros: 0, vida: 1 };
  let respiraT = 4.4, parpadeoR = [2.6, 5.2], miradaCfg = GESTOS.tranquila.mirada;
  const gesto0 = () => (gestoNombre === 'tranquila' && abierta ? ABIERTA : GESTOS[gestoNombre] || GESTOS.tranquila);
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
  const alTema = () => { const n = temaDe(); if (n !== tema && !transparente) { tema = n; ponerFondo(); } };
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
    renderer.render(escena, camara);
    if (primerCuadro) { primerCuadro(); primerCuadro = null; lienzo.style.opacity = '1'; }
    cuadros++; acum += dtReal;
    if (acum >= 1) {
      stats.fps = cuadros / acum; cuadros = 0; acum = 0;
      if (op.calidad !== 'alta') {
        if (stats.fps < 38) { lento++; rapido = 0; } else if (stats.fps > 57) { rapido++; lento = 0; } else { lento = 0; rapido = 0; }
        if (lento >= 2 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); tamano(); lento = 0; }
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
  if (primerCuadro) { renderer.render(escena, camara); primerCuadro(); primerCuadro = null; lienzo.style.opacity = '1'; }

  api = {
    gesto(nombre) {
      gestoNombre = GESTOS[nombre] ? nombre : 'tranquila';
      if (descIni === -2) alivioObj = 0;    // una respuesta nueva después del descubierto: vuelve a su gesto (su «tranquila» ya es la abierta)
    },
    boca(n) { ampIn = sat(+n || 0); ampT = t; },
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
      if (fondoTex) fondoTex.dispose(); envRT.dispose();
      for (const l of [clave, relleno, contraluz, rebote]) l.dispose && l.dispose();
      renderer.dispose(); renderer.forceContextLoss(); lienzo.remove();
    },
    // para pruebas y diagnóstico
    // pruebas: congelar el reloj y avanzar a paso fijo (capturas reproducibles)
    _congelar(b) { congelado = !!b; }, _avanzar(seg) { const n = Math.round(seg * 60); for (let i = 0; i < n; i++) paso(1 / 60); renderer.render(escena, camara); },
    _stats: stats, _formas: forma, _three: THREE, _renderer: renderer, _escena: escena, _camara: camara,
  };
  return api;
}

window.__Rosa3DMotor = { montar, version: '1.0.0' };
