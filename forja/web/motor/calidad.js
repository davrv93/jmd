// Forja · render de producción. Tres cosas que el alumno elige con un clic y que no cambian el personaje, solo cómo se ve:
//   luz      estudio | atardecer | noche | escenario   (tres puntos de luz: clave, relleno y contraluz, más el cielo)
//   calidad  alta | media | rapida
//            alta    = tonemapping ACES, sombras suaves 2048, luz de ambiente (RoomEnvironment + PMREM), brillo en lo
//                      que emite luz (bloom) y bordes suaves (SMAA). Sin GTAO: con la tarima transparente dejaba un
//                      rectángulo oscuro detrás del personaje (probado el 26-11-2026).
//            media   = lo mismo sin posproceso (sombras 1024)
//            rapida  = como antes: sin sombras ni tonemapping (computadoras lentas)
//   acabado  caricatura (toon con contorno) | arcilla (PBR: rugosidad, barniz y terciopelo)  → lo aplica personaje.js
// Arranca en «alta»; si los primeros segundos van a menos de 28 cuadros por segundo, baja sola a «media» y avisa.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// [color, intensidad, x, y, z]
export const LUCES = {
  estudio:   { nombre: 'Estudio',   cielo: [0xffffff, 0x8a7f9c, 0.9], clave: [0xfff4e6, 2.6, 2.5, 4, 3.5], relleno: [0xd9e4ff, 0.9, -3, 2, 2], contra: [0xffffff, 1.6, -1.5, 3, -4], ambiente: 0.55, exposicion: 1.05, bloom: 0.25 },
  atardecer: { nombre: 'Atardecer', cielo: [0xffc59a, 0x5b3d73, 0.8], clave: [0xffa060, 3.0, 4, 2.2, 2.5], relleno: [0x8f7dff, 0.8, -3, 1.5, 2], contra: [0xffd27a, 2.2, -2, 2.5, -4], ambiente: 0.4, exposicion: 1.0, bloom: 0.35 },
  noche:     { nombre: 'Noche',     cielo: [0x6f86ff, 0x120c26, 0.55], clave: [0xa9c1ff, 1.6, -2.5, 4, 3], relleno: [0x3b2f7a, 0.6, 3, 1.5, 2], contra: [0x7ff3ff, 2.6, 1.5, 3, -4], ambiente: 0.2, exposicion: 1.1, bloom: 0.8 },
  escenario: { nombre: 'Escenario', cielo: [0xffffff, 0x222033, 0.35], clave: [0xffffff, 4.2, 0.4, 6, 2.2], relleno: [0xffb0d8, 0.5, -3, 1, 2], contra: [0x9be7ff, 2.4, 0, 2.5, -4], ambiente: 0.25, exposicion: 1.0, bloom: 0.45 },
};
export const CALIDADES = { alta: 'Alta', media: 'Media', rapida: 'Rápida' };

export function crearCalidad({ render, escena, camara, lienzo, escenario, alAvisar = () => {} }) {
  render.outputColorSpace = THREE.SRGBColorSpace;
  render.shadowMap.type = THREE.PCFSoftShadowMap;
  const hemi = new THREE.HemisphereLight(), clave = new THREE.DirectionalLight(), relleno = new THREE.DirectionalLight(), contra = new THREE.DirectionalLight();
  clave.shadow.camera.left = clave.shadow.camera.bottom = -2.5; clave.shadow.camera.right = clave.shadow.camera.top = 2.5;
  clave.shadow.camera.near = 0.5; clave.shadow.camera.far = 20; clave.shadow.bias = -0.0004; clave.shadow.normalBias = 0.02; clave.shadow.radius = 5;
  escena.add(hemi, clave, clave.target, relleno, contra);
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(1.55, 64), new THREE.ShadowMaterial({ opacity: 0.3 }));
  suelo.rotation.x = -Math.PI / 2; suelo.position.y = 0.002; suelo.receiveShadow = true; escena.add(suelo);

  const pmrem = new THREE.PMREMGenerator(render), entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
  let composer = null, bloom = null, gtao = null, smaa = null, w = 1, h = 1;
  const E = { luz: 'estudio', calidad: 'alta' };
  try { const g = JSON.parse(localStorage.getItem('forja.render') || '{}'); if (LUCES[g.luz]) E.luz = g.luz; if (CALIDADES[g.calidad]) E.calidad = g.calidad; } catch { /* sin almacenamiento */ }
  const recordar = () => { try { localStorage.setItem('forja.render', JSON.stringify(E)); } catch { /* nada */ } };

  function luz(id) {
    const L = LUCES[id] || LUCES.estudio; E.luz = LUCES[id] ? id : 'estudio';
    hemi.color.set(L.cielo[0]); hemi.groundColor.set(L.cielo[1]); hemi.intensity = L.cielo[2];
    for (const [l, v] of [[clave, L.clave], [relleno, L.relleno], [contra, L.contra]]) { l.color.set(v[0]); l.intensity = v[1]; l.position.set(v[2], v[3], v[4]); }
    escena.environmentIntensity = L.ambiente;
    render.toneMappingExposure = L.exposicion;
    if (bloom) bloom.strength = L.bloom;
    recordar();
  }
  function armarComposer() {
    composer?.dispose();
    composer = new EffectComposer(render);
    composer.addPass(new RenderPass(escena, camara));
    bloom = new UnrealBloomPass(new THREE.Vector2(w, h), LUCES[E.luz].bloom, 0.45, 0.88); composer.addPass(bloom);
    composer.addPass(new OutputPass());
    smaa = new SMAAPass(w * render.getPixelRatio(), h * render.getPixelRatio()); composer.addPass(smaa);
    composer.setSize(w, h);
  }
  // Con posproceso el lienzo deja de ser transparente: el degradado del escenario (CSS) se pinta dentro de la escena.
  const lienzoFondo = document.createElement('canvas'), texFondo = new THREE.CanvasTexture(lienzoFondo); texFondo.colorSpace = THREE.SRGBColorSpace;
  function fondo() {
    if (!composer || !escenario) { escena.background = null; return; }
    const cs = getComputedStyle(escenario), f1 = cs.getPropertyValue('--f1').trim() || '#17132a', f2 = cs.getPropertyValue('--f2').trim() || '#3a2f6b';
    const W = Math.max(64, Math.round(w / 3)), H = Math.max(64, Math.round(h / 3)); lienzoFondo.width = W; lienzoFondo.height = H;
    const x = lienzoFondo.getContext('2d'); x.save(); x.translate(W / 2, H * 0.78); x.scale(0.9 * W, 0.7 * H);   // radial-gradient(90% 70% at 50% 78%)
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, f2); g.addColorStop(0.7, f1); g.addColorStop(1, f1); x.fillStyle = g; x.fillRect(-2, -2, 4, 4); x.restore();
    texFondo.needsUpdate = true; escena.background = texFondo; escena.backgroundIntensity = 1;
  }
  function calidad(id) {
    E.calidad = CALIDADES[id] ? id : 'alta';
    const alta = E.calidad === 'alta', rapida = E.calidad === 'rapida';
    render.setPixelRatio(Math.min(devicePixelRatio, alta ? 2 : rapida ? 1.25 : 1.5));
    render.toneMapping = rapida ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    render.shadowMap.enabled = !rapida; clave.castShadow = !rapida; suelo.visible = !rapida;
    const lado = alta ? 2048 : 1024; if (clave.shadow.mapSize.x !== lado) { clave.shadow.mapSize.set(lado, lado); clave.shadow.map?.dispose(); clave.shadow.map = null; }
    escena.environment = rapida ? null : entorno;
    if (alta) armarComposer(); else { composer?.dispose(); composer = null; bloom = gtao = smaa = null; }
    render.setSize(w, h, false); composer?.setSize(w, h);
    escena.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    luz(E.luz); fondo(); recordar();
  }
  // Sombras: el personaje las proyecta (no su contorno, que es una cáscara invertida).
  function sombrear(raiz) { raiz.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.contorno && !(o.material && o.material.side === THREE.BackSide); o.receiveShadow = false; } }); }
  function tamano(nw, nh) { w = Math.max(1, nw); h = Math.max(1, nh); render.setSize(w, h, false); composer?.setSize(w, h); fondo(); }
  // Medición: si «alta» no aguanta en esta computadora, baja sola una vez.
  let cuadros = 0, desde = 0, medido = false;
  function dibujar(ahora) {
    if (composer) composer.render(); else render.render(escena, camara);
    if (!medido && E.calidad === 'alta') {
      if (!desde) desde = ahora; cuadros++;
      if (ahora - desde > 3000) { medido = true; const fps = cuadros * 1000 / (ahora - desde); if (fps < 28) { calidad('media'); alAvisar(`Calidad media: esta computadora iba a ${Math.round(fps)} cuadros por segundo`); } }
    }
  }
  calidad(E.calidad);
  return { E, luz, calidad, sombrear, tamano, dibujar, fondo, suelo, clave };
}
