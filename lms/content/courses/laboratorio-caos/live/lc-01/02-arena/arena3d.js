// Vista 3D de la arena del monito (three.js r169 + GSAP, copias locales en live/_comun).
// No guarda estado del juego: pinta lo que le pasa escena.html y avisa qué servidor se tocó.
//   Arena3D.pintar(est, blanco, yoN)   sincroniza monitos y servidores con el estado del servidor
//   Arena3D.animar(evento)             ataque (salto sobre la valla) o defensa (pulso verde)
//   Arena3D.fase(fase)                 mueve la cámara con el turno
//   Arena3D.encender() / apagar()      arranca o detiene el dibujo (la vista 2D sigue de respaldo)
//   Arena3D.cine(c, rapido)            coreografía de una cinemática que decide cine.js (luna, ema, cura, fallo, final)
// Los jefes: Ema, el Rey Mono, cuida la granja con su bastón; el Ozaru es chiquito de día y crece con la luna
// (la noche es el turno de ataque). Los dos son adorno y enseñanza: no cambian las reglas ni el puntaje.
import * as THREE from "../../comun/three.module.min.js";

const gsap = window.gsap;
const host = document.getElementById("escenario3d");
const lienzo = document.getElementById("lienzo3d");
const capa = document.getElementById("etiquetas3d");
let QUIETO = false;
try { QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

const ICONO = { apagar: "🔌", disco: "💾", base: "🗑️", atascar: "🐢", fuga: "🏃", clones: "👥", pesados: "📦", formulario: "✍️", sesion: "🔓", clave: "🔑", reiniciar: "🩹", limpiar: "🧹" };
const FALLA = { app: "🔌", disco: "💾", base: "🗑️", lenta: "🐢", fuga: "🏃", clones: "👥", datos: "✍️", sesion: "🔓", clave: "🔑", sin_lab: "⚙️", aula: "💤" };

const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const escena = new THREE.Scene();
escena.background = new THREE.Color(0xfff4de);
escena.fog = new THREE.Fog(0xfff4de, 26, 46);
const camara = new THREE.PerspectiveCamera(38, 2, 0.1, 100);
const cam = { px: 0, py: 6.6, pz: 14, lx: 0.2, ly: 1.0, lz: -0.4 };

const hemi = new THREE.HemisphereLight(0xffffff, 0xcfe6b8, 1.25);
escena.add(hemi);
const sol = new THREE.DirectionalLight(0xfff1cf, 1.9);
sol.position.set(-6, 13, 8);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
Object.assign(sol.shadow.camera, { left: -13, right: 13, top: 12, bottom: -12, near: 1, far: 40 });
sol.shadow.bias = -0.0015;
escena.add(sol);

// ---- Materiales y geometrías compartidas ----
const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, extra || {}));
const M = {
  piel: mat(0x8b5a3c), cara: mat(0xf6d6b8), negro: mat(0x1b1f3b), rojo: mat(0xd93a40), verde: mat(0x1e7a4c),
  pasto: mat(0xbfe6ae), tierra: mat(0x9c7a4d), madera: mat(0xb07a45), maderaOsc: mat(0x7a5230),
  rack: mat(0x2b3160, { roughness: 0.6 }), panel: mat(0x3a4180, { roughness: 0.6 }), blanco: mat(0xffffff),
  humo: mat(0xb9bcd3, { transparent: true, opacity: 0.85 }), banana: mat(0xffc93c),
  pielOsc: mat(0x70452b), azul: mat(0x2f6be0, { roughness: 0.5 }), azulClaro: mat(0x5b8def, { roughness: 0.5 }), azulOsc: mat(0x2f4a8a),
  placa: mat(0xcfd5de, { roughness: 0.4, metalness: 0.3 }), pelo: mat(0xf6f5f0), peloOsc: mat(0x2a1a12), tigre: mat(0xf2a93b), palo: mat(0x3a3f5c),
};
const G = {
  esfera: new THREE.SphereGeometry(1, 20, 14), caja: new THREE.BoxGeometry(1, 1, 1),
  brazo: new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), banda: new THREE.TorusGeometry(0.345, 0.055, 8, 24),
  cola: new THREE.TorusGeometry(0.22, 0.04, 6, 16, Math.PI * 1.25), sonrisa: new THREE.TorusGeometry(0.09, 0.02, 6, 12, Math.PI),
  aro: new THREE.TorusGeometry(0.75, 0.06, 8, 32),
  pico: new THREE.ConeGeometry(0.1, 0.34, 6), palo: new THREE.CylinderGeometry(0.045, 0.045, 1, 8), chaleco: new THREE.TorusGeometry(0.4, 0.075, 8, 24),
};
function esfera(r, m, x, y, z, sx, sy, sz) {
  const o = new THREE.Mesh(G.esfera, m);
  o.scale.set(r * (sx || 1), r * (sy || 1), r * (sz || 1));
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}
function caja(w, h, d, m, x, y, z) {
  const o = new THREE.Mesh(G.caja, m);
  o.scale.set(w, h, d);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

// ---- Isla y valla ----
const isla = new THREE.Mesh(new THREE.CylinderGeometry(12, 12.6, 0.9, 48), [M.tierra, M.pasto, M.tierra]);
isla.position.y = -0.45;
isla.receiveShadow = true;
escena.add(isla);
const valla = new THREE.Group();
for (let z = -6.3; z <= 6.31; z += 0.6) {
  const p = caja(0.14, 1.35, 0.42, M.madera, 0, 0.67, z);
  p.rotation.y = (Math.sin(z * 3.1) * 0.06);
  valla.add(p);
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.22, 4), M.madera);
  punta.position.set(0, 1.45, z); punta.rotation.y = Math.PI / 4; punta.scale.set(0.5, 1, 1.35); punta.castShadow = true;
  valla.add(punta);
}
valla.add(caja(0.1, 0.13, 13, M.maderaOsc, 0.07, 0.45, 0), caja(0.1, 0.13, 13, M.maderaOsc, 0.07, 1.0, 0));
escena.add(valla);

// ---- Monito ----
function crearMono(o) {
  o = o || {};
  const piel = o.piel || M.piel, mano = o.mano || M.cara, pie = o.pie || piel, brazos = [];
  const g = new THREE.Group();          // se mueve y salta
  const c = new THREE.Group();          // se mece (para no pelear con el salto)
  g.add(c);
  c.add(esfera(0.42, piel, 0, 0.5, 0, 1, 1.15, 1), esfera(0.3, M.cara, 0, 0.47, 0.2, 1, 1.1, 0.6));
  c.add(esfera(0.14, pie, -0.17, 0.1, 0.06, 1, 0.6, 1.3), esfera(0.14, pie, 0.17, 0.1, 0.06, 1, 0.6, 1.3));
  [-1, 1].forEach((s) => {
    const b = new THREE.Mesh(G.brazo, piel);
    b.position.set(0.44 * s, 0.62, 0.02); b.rotation.z = 0.55 * s; b.castShadow = true;
    brazos.push(b);
    c.add(b, esfera(0.09, mano, 0.56 * s, 0.42, 0.04));
  });
  const cola = new THREE.Mesh(G.cola, piel);
  cola.position.set(0, 0.42, -0.4); cola.rotation.y = Math.PI / 2;
  c.add(cola);
  const cab = new THREE.Group();
  cab.position.y = 1.14;
  cab.add(esfera(0.36, piel, 0, 0, 0));
  [-1, 1].forEach((s) => {
    cab.add(esfera(0.13, piel, 0.37 * s, 0.02, 0), esfera(0.07, M.cara, 0.39 * s, 0.02, 0.06));
    cab.add(esfera(0.2, M.cara, 0.11 * s, 0.03, 0.24, 1, 1, 0.5), esfera(0.05, M.negro, 0.11 * s, 0.07, 0.34));
  });
  cab.add(esfera(0.22, M.cara, 0, -0.12, 0.26, 1.1, 0.7, 0.6));
  const sonrisa = new THREE.Mesh(G.sonrisa, M.negro);
  sonrisa.position.set(0, -0.11, 0.4); sonrisa.rotation.z = Math.PI;
  cab.add(sonrisa);
  if (o.banda !== null) {
    const banda = new THREE.Mesh(G.banda, o.banda || M.rojo);
    banda.position.y = 0.16; banda.rotation.x = Math.PI / 2 - 0.12;
    cab.add(banda, esfera(0.07, o.banda || M.rojo, -0.36, 0.1, -0.12, 1.6, 0.7, 0.7));
  }
  c.add(cab);
  g.rotation.y = 0.75;                  // mira hacia la valla y un poco a la cámara
  g.userData = { cuerpo: c, cabeza: cab, brazos };
  return g;
}

// ---- Los jefes ----
function pico(m, x, y, z, rz, rx, s) {
  const o = new THREE.Mesh(G.pico, m);
  o.position.set(x, y, z); o.rotation.z = rz || 0; o.rotation.x = rx || 0; o.scale.setScalar(s || 1); o.castShadow = true;
  return o;
}
// Ema, el Rey Mono: melena y barba blancas, vincha con placa, chaleco atigrado y bastón negro con puntas doradas.
function crearEma() {
  const g = crearMono({ banda: M.azulOsc });
  const u = g.userData, cab = u.cabeza, c = u.cuerpo;
  cab.add(caja(0.26, 0.14, 0.05, M.placa, 0, 0.2, 0.33), esfera(0.3, M.pelo, 0, 0.08, -0.2, 1.1, 1, 0.7));
  [[-0.27, 0.3, 0.55], [-0.14, 0.42, 0.28], [0, 0.47, 0], [0.14, 0.42, -0.28], [0.27, 0.3, -0.55]].forEach((p) => cab.add(pico(M.pelo, p[0], p[1], -0.06, p[2], -0.25, 1.15)));
  cab.add(pico(M.pelo, 0, -0.36, 0.25, 0, Math.PI, 0.9));
  [-1, 1].forEach((s) => cab.add(esfera(0.1, M.pelo, 0.3 * s, -0.16, 0.14, 0.6, 1.3, 0.6)));
  c.add(esfera(0.44, M.tigre, 0, 0.53, -0.07, 1.03, 0.96, 0.95));     // chaleco abierto: asoma por los lados y la espalda
  const cinto = new THREE.Mesh(G.chaleco, M.negro);
  cinto.scale.setScalar(0.37 / 0.4); cinto.position.y = 0.27; cinto.rotation.x = Math.PI / 2;
  c.add(cinto);
  const baston = new THREE.Group();
  const palo = new THREE.Mesh(G.palo, M.palo);
  palo.scale.y = 2.3; palo.castShadow = true;
  baston.add(palo);
  [-1, 1].forEach((s) => { const p = new THREE.Mesh(G.palo, M.banana); p.scale.set(1.4, 0.3, 1.4); p.position.y = s; baston.add(p); });
  baston.position.set(0.64, 1.15, 0.14);
  c.add(baston);
  u.baston = baston;
  g.rotation.y = -0.75;
  g.scale.setScalar(1.25);
  return g;
}
// El Ozaru: pelo en llama, armadura azul, hombreras doradas, guantes y botas blancas. Chiquito de día, enorme con la luna.
const OZ_CHICO = 0.8, OZ_GRANDE = 2.4;
function crearOzaru() {
  const g = crearMono({ piel: M.pielOsc, mano: M.blanco, pie: M.blanco, banda: null });
  const u = g.userData, cab = u.cabeza, c = u.cuerpo;
  cab.add(esfera(0.34, M.peloOsc, 0, 0.16, -0.06, 1.08, 0.8, 1));
  [[-0.24, 0.3, 0.5, 1.2], [-0.12, 0.42, 0.22, 1.5], [0, 0.48, 0, 1.8], [0.12, 0.42, -0.22, 1.5], [0.24, 0.3, -0.5, 1.2]].forEach((p) => cab.add(pico(M.peloOsc, p[0], p[1], -0.02, p[2], 0, p[3])));
  cab.add(pico(M.peloOsc, 0, 0.23, 0.29, 0, Math.PI, 0.7));               // pico de viuda
  [-1, 1].forEach((s) => { const b = caja(0.16, 0.045, 0.04, M.negro, 0.12 * s, 0.155, 0.36); b.rotation.z = 0.3 * s; cab.add(b); });
  c.add(esfera(0.46, M.azul, 0, 0.56, 0, 1.03, 0.92, 1.02), esfera(0.3, M.azulClaro, 0, 0.42, 0.21, 1, 0.75, 0.66));
  [-1, 1].forEach((s) => {
    // Hombreras sobre los hombros (no a la altura de la cabeza: ahí parecían orejas amarillas y tapaban las de verdad).
    const h = esfera(0.17, M.banana, 0.5 * s, 0.84, 0, 1.45, 0.5, 1.15);
    h.rotation.z = -0.42 * s;
    c.add(h, esfera(0.13, M.banana, 0.3 * s, 0.2, 0.12, 1, 1.2, 0.8));
  });
  u.brazos.forEach((b) => b.scale.set(1.5, 1.2, 1.5));
  g.scale.setScalar(OZ_CHICO);
  return g;
}

// ---- Servidor ----
function crearRack() {
  const g = new THREE.Group();
  const cuerpo = new THREE.Group();     // se inclina y tiembla
  g.add(cuerpo);
  cuerpo.add(caja(0.98, 1.7, 0.78, M.rack, 0, 0.9, 0));
  [1.42, 0.92, 0.42].forEach((y) => cuerpo.add(caja(0.78, 0.38, 0.06, M.panel, 0, y, 0.4)));
  cuerpo.add(caja(1.08, 0.1, 0.88, M.negro, 0, 0.05, 0));
  cuerpo.add(esfera(0.055, M.blanco, -0.16, 1.47, 0.44), esfera(0.055, M.blanco, 0.16, 1.47, 0.44));
  const boca = new THREE.Mesh(G.sonrisa, M.blanco);
  boca.position.set(0, 1.39, 0.44); boca.rotation.z = Math.PI;
  cuerpo.add(boca);
  const led = new THREE.MeshStandardMaterial({ color: 0x2bb673, emissive: 0x2bb673, emissiveIntensity: 1.4 });
  [[-0.24, 0.92], [-0.11, 0.92], [-0.24, 0.42], [-0.11, 0.42]].forEach((p) => cuerpo.add(esfera(0.05, led, p[0], p[1], 0.44)));
  cuerpo.add(caja(0.3, 0.07, 0.03, mat(0x5a62a8), 0.18, 0.92, 0.44), caja(0.3, 0.07, 0.03, mat(0x5a62a8), 0.18, 0.42, 0.44));
  const humo = new THREE.Group();
  [[0, 0, 0.28], [0.24, 0.22, 0.34], [-0.2, 0.3, 0.24], [0.08, 0.55, 0.2]].forEach((h) => {
    const s = esfera(h[2], M.humo, h[0], 1.95 + h[1], 0); s.castShadow = false; humo.add(s);
  });
  humo.visible = false;
  g.add(humo);
  const aro = new THREE.Mesh(G.aro, M.rojo);
  aro.rotation.x = Math.PI / 2; aro.position.y = 0.06; aro.visible = false;
  g.add(aro);
  const pulso = new THREE.Mesh(G.aro, new THREE.MeshBasicMaterial({ color: 0x2bb673, transparent: true, opacity: 0 }));
  pulso.rotation.x = Math.PI / 2; pulso.position.y = 0.08;
  g.add(pulso);
  g.userData = { cuerpo, boca, led, humo, aro, pulso, estado: "" };
  return g;
}

// ---- Entidades ----
const ents = {}; // n → { tipo, obj, et, casa, ocupado }
function etiqueta() { const d = document.createElement("div"); d.className = "et3d"; capa.appendChild(d); return d; }
function quitar(n) { const e = ents[n]; if (!e) return; gsap.killTweensOf([e.obj.position, e.obj.rotation, e.obj.scale]); escena.remove(e.obj); e.et.remove(); delete ents[n]; }
function casaMono(i) { return new THREE.Vector3(-2.2 - (i % 4) * 1.8 - (Math.floor(i / 4) % 2) * 0.6, 0, 2.6 - Math.floor(i / 4) * 1.9); }
function casaRack(i) { return new THREE.Vector3(2.4 + (i % 4) * 2.1 + (Math.floor(i / 4) % 2) * 0.9, 0, 2.4 - Math.floor(i / 4) * 2.5); }

// ---- Jefes en escena ----
const POS = { ema: new THREE.Vector3(1.25, 0, 5.2), ozChico: new THREE.Vector3(-1.35, 0, 5.2), ozGrande: new THREE.Vector3(-5.2, 0, -6.4) };
const ema = crearEma(), ozaru = crearOzaru();
ema.position.copy(POS.ema);
ozaru.position.copy(POS.ozChico);
escena.add(ema, ozaru);
const etEma = etiqueta(), etOz = etiqueta();
etEma.textContent = "Ema, el Rey Mono"; etEma.className = "et3d jefe ema";
etOz.textContent = "El Ozaru"; etOz.className = "et3d jefe oz";
const luna = document.getElementById("luna3d");
const ondas = [0, 1, 2].map(() => {
  const o = new THREE.Mesh(G.aro, new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0 }));
  o.rotation.x = Math.PI / 2; o.position.y = 0.07;
  escena.add(o);
  return o;
});
let iOnda = 0;
function onda(x, z, color, hasta) {
  const o = ondas[iOnda++ % ondas.length];
  o.material.color.set(color); o.position.set(x, 0.07, z);
  gsap.killTweensOf([o.scale, o.material]);
  gsap.fromTo(o.scale, { x: 0.3, y: 0.3, z: 0.3 }, { x: hasta, y: hasta, z: hasta, duration: 0.8, ease: "power2.out" });
  gsap.fromTo(o.material, { opacity: 0.85 }, { opacity: 0, duration: 0.8, ease: "power1.in" });
}
const temblor = { v: 0 };
function temblar(f) { if (!QUIETO) gsap.fromTo(temblor, { v: f }, { v: 0, duration: 0.5, ease: "power2.out", overwrite: true }); }

// «Ana Quispe Flores» → «Ana Q.»: las etiquetas largas se enciman.
function corto(nombre) { const p = String(nombre || "").trim().split(/\s+/); return p[0] + (p[1] ? " " + p[1][0] + "." : ""); }
let estActual = null, blancoActual = null, yoActual = -1, faseActual = "lobby";
function pintar(est, blanco, yoN) {
  estActual = est; blancoActual = blanco; yoActual = yoN;
  const vistos = {};
  let im = 0, ir = 0;
  est.jugadores.forEach((j) => {
    if (j.equipo !== "tumba" && j.equipo !== "server") return;
    vistos[j.n] = true;
    let e = ents[j.n];
    if (e && e.tipo !== j.equipo) { quitar(j.n); e = null; }
    const casa = j.equipo === "tumba" ? casaMono(im++) : casaRack(ir++);
    if (!e) {
      e = ents[j.n] = { tipo: j.equipo, obj: j.equipo === "tumba" ? crearMono() : crearRack(), et: etiqueta(), casa, ocupado: false };
      e.obj.userData.n = j.n;
      e.obj.position.copy(casa);
      escena.add(e.obj);
      if (!QUIETO) gsap.from(e.obj.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.5, ease: "back.out(2)" });
    }
    e.casa = casa;
    if (!e.ocupado && e.obj.position.distanceTo(casa) > 0.05) gsap.to(e.obj.position, { x: casa.x, z: casa.z, duration: 0.5 });
    if (j.equipo === "tumba") {
      e.et.textContent = corto(j.nombre);
      e.et.className = "et3d" + (j.n === yoN ? " yo" : "") + (j.presente ? "" : " ausente") + (compacto && j.n !== yoN ? " oculta" : "");
    } else {
      const fallas = (j.fallas || []).map((f) => FALLA[f] || "❓").join("");
      const estado = j.lab !== "listo" ? "prep" : (j.salud === "ok" ? "ok" : (j.salud === "caido" ? "caido" : "prep"));
      const conNombre = !compacto || j.n === yoN || blanco === j.n;
      e.et.textContent = (estado === "ok" ? "✅" : estado === "caido" ? "❌" + (compacto ? "" : fallas) : "⚙️") + (conNombre ? " " + corto(j.nombre) : "");
      e.et.className = "et3d srv " + estado + (j.n === yoN ? " yo" : "");
      estadoRack(e.obj, estado);
      e.obj.userData.aro.visible = blanco === j.n;
    }
  });
  Object.keys(ents).forEach((n) => { if (!vistos[n]) quitar(Number(n)); });
  let ext = 7.4;
  Object.keys(ents).forEach((n) => { ext = Math.max(ext, Math.abs(ents[n].casa.x) + 2.2); });
  if (Math.abs(ext - extension) > 0.01) { extension = ext; fase(faseActual); }
}
function estadoRack(r, estado) {
  const u = r.userData;
  if (u.estado === estado) return;
  const antes = u.estado;
  u.estado = estado;
  const rojo = estado === "caido";
  u.led.color.set(rojo ? 0xff5a5f : estado === "ok" ? 0x2bb673 : 0xffc93c);
  u.led.emissive.copy(u.led.color);
  u.boca.rotation.z = rojo ? 0 : Math.PI;       // boca triste / sonrisa
  u.boca.position.y = rojo ? 1.33 : 1.39;
  u.humo.visible = rojo;
  gsap.to(u.cuerpo.rotation, { z: rojo ? 0.16 : 0, duration: QUIETO ? 0 : 0.35, ease: "back.out(2)" });
  if (estado === "ok" && antes === "caido" && !QUIETO) gsap.fromTo(u.cuerpo.position, { y: 0 }, { y: 0.35, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" });
}

// ---- Animaciones de eventos ----
function burbuja(obj, texto) {
  const d = document.createElement("div");
  d.className = "burbuja3d"; d.textContent = texto;
  capa.appendChild(d);
  const p = proyectar(obj.position.x, 2.4, obj.position.z);
  d.style.left = p.x + "px"; d.style.top = p.y + "px";
  gsap.fromTo(d, { y: 0, opacity: 1, scale: 0.4 }, { y: -46, opacity: 0, scale: 1.5, duration: 1.3, ease: "power2.out", onComplete: () => d.remove() });
}
function golpe(rack, accion) {
  const u = rack.userData;
  burbuja(rack, "💥" + (ICONO[accion] || ""));
  if (QUIETO) return;
  gsap.fromTo(u.cuerpo.rotation, { x: -0.12 }, { x: 0.12, duration: 0.06, yoyo: true, repeat: 7, ease: "none", onComplete: () => { u.cuerpo.rotation.x = 0; } });
}
function pulsoRack(r) {
  const p = r.obj.userData.pulso;
  gsap.fromTo(p.scale, { x: 0.4, y: 0.4, z: 0.4 }, { x: 2.2, y: 2.2, z: 2.2, duration: 0.9, ease: "power2.out" });
  gsap.fromTo(p.material, { opacity: 0.9 }, { opacity: 0, duration: 0.9 });
}
function animar(ev) {
  if (ev.tipo === "defensa") {
    const r = ents[ev.a];
    if (!r || r.tipo !== "server") return;
    burbuja(r.obj, ICONO[ev.accion] || "🩹");
    pulsoRack(r);
    return;
  }
  if (ev.tipo !== "ataque") return;
  const r = ents[ev.a], m = ents[ev.de];
  if (!r || r.tipo !== "server") return;
  ozGolpe();
  if (!m || m.tipo !== "tumba" || QUIETO) { golpe(r.obj, ev.accion); return; }
  const o = m.obj, casa = m.casa.clone(), dx = r.obj.position.x, dz = r.obj.position.z + 0.05, alto = 4.6;
  m.ocupado = true;
  const tl = gsap.timeline({ onComplete: () => { m.ocupado = false; o.rotation.set(0, 0.75, 0); o.position.copy(m.casa); } });
  tl.to(o.scale, { y: 0.7, x: 1.2, z: 1.2, duration: 0.14 })
    .to(o.scale, { y: 1, x: 1, z: 1, duration: 0.2, ease: "back.out(3)" })
    .to(o.position, { x: dx, z: dz, duration: 0.85, ease: "none" }, "<")
    .to(o.position, { y: alto, duration: 0.42, ease: "power2.out" }, "<")
    .to(o.position, { y: 1.78, duration: 0.43, ease: "power2.in" }, ">")
    .to(o.rotation, { z: -Math.PI * 2, duration: 0.85, ease: "none" }, "<-0.42")
    .set(o.rotation, { z: 0 })
    .add(() => golpe(r.obj, ev.accion))
    .to(o.position, { y: 2.3, duration: 0.13, yoyo: true, repeat: 3, ease: "power1.out" })
    .to(o.position, { x: casa.x, z: casa.z, duration: 0.85, ease: "none" }, "+=0.15")
    .to(o.position, { y: alto, duration: 0.42, ease: "power2.out" }, "<")
    .to(o.position, { y: 0, duration: 0.43, ease: "power2.in" }, ">")
    .to(o.rotation, { z: Math.PI * 2, duration: 0.85, ease: "none" }, "<-0.42")
    .to(o.scale, { y: 0.8, x: 1.12, z: 1.12, duration: 0.08 })
    .to(o.scale, { y: 1, x: 1, z: 1, duration: 0.18, ease: "back.out(3)" });
}

// ---- El Ozaru: chiquito de día, enorme con la luna ----
let noche = null, ozTl = null;
function ozCrecer(inst) {
  if (ozTl) ozTl.kill();
  const u = ozaru.userData, g = OZ_GRANDE;
  u.brazos.forEach((b) => { b.rotation.x = 0; });
  if (inst) { u.cabeza.rotation.x = 0; ozaru.position.copy(POS.ozGrande); ozaru.scale.setScalar(g); return; }
  ozTl = gsap.timeline();
  ozTl.to(u.cabeza.rotation, { x: -0.55, duration: 0.3, ease: "power2.out" }, 0)                       // mira la luna
    .to(ozaru.scale, { x: OZ_CHICO * 1.15, y: OZ_CHICO * 0.78, z: OZ_CHICO * 1.15, duration: 0.15 }, 0.55)
    .to(ozaru.position, { x: POS.ozGrande.x, z: POS.ozGrande.z, duration: 0.9, ease: "none" }, 0.7)   // salta al fondo…
    .to(ozaru.position, { y: 6, duration: 0.45, ease: "power2.out" }, 0.7)
    .to(ozaru.position, { y: 0, duration: 0.45, ease: "power2.in" }, 1.15)
    .to(ozaru.scale, { x: g, y: g, z: g, duration: 0.9, ease: "power1.in" }, 0.7)                     // …y crece en el aire
    .to(u.cabeza.rotation, { x: 0, duration: 0.3 }, 1.3)
    .add(() => { onda(POS.ozGrande.x, POS.ozGrande.z, 0xffc93c, 7); temblar(0.22); }, 1.6)
    .to(ozaru.scale, { y: g * 0.85, x: g * 1.08, z: g * 1.08, duration: 0.08 }, 1.6)
    .to(ozaru.scale, { y: g, x: g, z: g, duration: 0.5, ease: "elastic.out(1.1, 0.45)" }, 1.68);
}
function ozEncoger(inst) {
  if (ozTl) ozTl.kill();
  const u = ozaru.userData;
  u.cabeza.rotation.x = 0; u.brazos.forEach((b) => { b.rotation.x = 0; });
  if (inst) { ozaru.position.copy(POS.ozChico); ozaru.scale.setScalar(OZ_CHICO); return; }
  ozTl = gsap.timeline();
  ozTl.to(ozaru.scale, { x: OZ_CHICO, y: OZ_CHICO, z: OZ_CHICO, duration: 0.6, ease: "back.in(1.4)" }, 0)
    .to(ozaru.position, { x: POS.ozChico.x, z: POS.ozChico.z, duration: 0.8, ease: "none" }, 0.6)
    .to(ozaru.position, { y: 3.2, duration: 0.4, ease: "power2.out" }, 0.6)
    .to(ozaru.position, { y: 0, duration: 0.4, ease: "power2.in" }, 1.0);
}
// Cada ataque: el Ozaru levanta los brazos y golpea el piso; la onda y el temblor llegan con el monito.
function ozGolpe() {
  if (!noche || QUIETO || (ozTl && ozTl.isActive())) return;
  const u = ozaru.userData, g = OZ_GRANDE, br = u.brazos.map((b) => b.rotation);
  ozTl = gsap.timeline();
  ozTl.to(ozaru.position, { y: 1.6, duration: 0.28, ease: "power2.out" }, 0)
    .to(br, { x: -2.4, duration: 0.28, ease: "power2.out" }, 0)
    .to(ozaru.position, { y: 0, duration: 0.2, ease: "power3.in" }, 0.34)
    .to(br, { x: 0, duration: 0.16, ease: "power3.in" }, 0.38)
    .add(() => { onda(ozaru.position.x, ozaru.position.z, 0xff8a5c, 9); temblar(0.16); }, 0.54)
    .to(ozaru.scale, { y: g * 0.86, duration: 0.07 }, 0.54)
    .to(ozaru.scale, { y: g, duration: 0.4, ease: "elastic.out(1.1, 0.45)" }, 0.61);
}

// Golpe Ozaru (el superpoder del equipo Tumba): ruge mirando la luna y golpea dos veces, más fuerte.
function ozSuper() {
  if (!noche || QUIETO) return;
  if (ozTl) ozTl.kill();
  const u = ozaru.userData, g = OZ_GRANDE, br = u.brazos.map((b) => b.rotation);
  ozaru.position.copy(POS.ozGrande); ozaru.scale.setScalar(g);
  ozTl = gsap.timeline();
  ozTl.to(u.cabeza.rotation, { x: -0.6, duration: 0.25, ease: "power2.out" }, 0)
    .to(ozaru.scale, { x: g * 1.14, y: g * 1.14, z: g * 1.14, duration: 0.35, ease: "power2.out" }, 0)
    .add(() => { onda(ozaru.position.x, ozaru.position.z, 0xffc93c, 6); }, 0.3)
    .to(u.cabeza.rotation, { x: 0, duration: 0.2 }, 0.5);
  [0.7, 1.45].forEach((t, i) => {
    ozTl.to(ozaru.position, { y: 2.2, duration: 0.26, ease: "power2.out" }, t)
      .to(br, { x: -2.6, duration: 0.26, ease: "power2.out" }, t)
      .to(ozaru.position, { y: 0, duration: 0.18, ease: "power3.in" }, t + 0.3)
      .to(br, { x: 0, duration: 0.14, ease: "power3.in" }, t + 0.34)
      .add(() => { onda(ozaru.position.x, ozaru.position.z, i ? 0xff5a3c : 0xff8a5c, 13); temblar(0.3); }, t + 0.48)
      .to(ozaru.scale, { y: g * 0.95, duration: 0.07 }, t + 0.48)
      .to(ozaru.scale, { y: g * 1.14, duration: 0.3, ease: "elastic.out(1.1, 0.45)" }, t + 0.55);
  });
  ozTl.to(ozaru.scale, { x: g, y: g, z: g, duration: 0.5, ease: "power2.inOut" }, 2.3);
}

// ---- Ema, el Rey Mono: salta, esquiva y gira el bastón ----
let emaTl = null;
function emaListo() { ema.rotation.set(0, -0.75, 0); ema.userData.baston.rotation.set(0, 0, 0); }
function emaEntrada() {
  if (QUIETO) return;
  if (emaTl) emaTl.kill();
  emaListo(); ema.position.copy(POS.ema);
  const b = ema.userData.baston;
  emaTl = gsap.timeline({ onComplete: emaListo });
  emaTl.to(ema.position, { y: 1.5, duration: 0.3, ease: "power2.out" }, 0)
    .to(ema.position, { y: 0, duration: 0.3, ease: "power2.in" }, 0.3)
    .to(ema.rotation, { y: -0.75 - Math.PI * 2, duration: 0.6, ease: "power1.inOut" }, 0)
    .to(b.rotation, { z: -Math.PI * 4, duration: 0.9, ease: "power2.inOut" }, 0.5)
    .add(() => onda(POS.ema.x, POS.ema.z, 0x2bb673, 4), 1.3);
}
// Va hasta el servidor n: voltereta, dos esquivas y golpe de bastón. Si exito es false, el golpe rebota y cae sentado.
function emaIr(n, exito, rapido, icono) {
  const r = ents[n];
  if (!r || r.tipo !== "server") return;
  if (QUIETO) { if (exito) pulsoRack(r); return; }
  if (emaTl) emaTl.kill();
  emaListo();
  const b = ema.userData.baston, tx = r.obj.position.x - 1.05, tz = r.obj.position.z + 0.85;
  emaTl = gsap.timeline({ onComplete: emaListo });
  emaTl.to(ema.position, { x: tx, z: tz, duration: 0.55, ease: "power1.inOut" }, 0)
    .to(ema.position, { y: 2.6, duration: 0.28, ease: "power2.out" }, 0)
    .to(ema.position, { y: 0, duration: 0.27, ease: "power2.in" }, 0.28)
    .to(ema.rotation, { x: Math.PI * 2, duration: 0.55, ease: "none" }, 0)
    .set(ema.rotation, { x: 0 }, 0.56)
    .add(() => burbuja(r.obj, icono || "💥"), 0.6)
    .to(ema.position, { z: tz + 0.8, duration: 0.13, ease: "power2.out" }, 0.62)
    .to(ema.rotation, { z: 0.4, duration: 0.13 }, 0.62)
    .to(ema.position, { z: tz - 0.35, duration: 0.15, ease: "power2.inOut" }, 0.8)
    .to(ema.rotation, { z: -0.4, duration: 0.15 }, 0.8)
    .to(ema.position, { z: tz, duration: 0.1 }, 0.98)
    .to(ema.rotation, { z: 0, duration: 0.1 }, 0.98)
    .to(b.rotation, { z: -Math.PI * 4, duration: 0.5, ease: "power2.inOut" }, 1.1);
  if (exito) {
    emaTl.add(() => { pulsoRack(r); burbuja(r.obj, "✨"); onda(r.obj.position.x, r.obj.position.z, 0x2bb673, 3); }, 1.55)
      .to(ema.position, { y: 0.9, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out" }, 1.6);
  } else {
    emaTl.add(() => { burbuja(ema, "💫"); temblar(0.08); }, 1.55)
      .to(ema.position, { x: tx - 1.3, y: 0.7, duration: 0.2, ease: "power2.out" }, 1.55)
      .to(ema.position, { y: 0, duration: 0.18, ease: "power2.in" }, 1.75)
      .to(ema.rotation, { z: 1.35, duration: 0.3, ease: "power2.out" }, 1.55)
      .to(ema.rotation, { z: 0, duration: 0.35, ease: "back.out(2)" }, 2.6);
  }
  const fin = exito ? 2.3 : 3.1;
  emaTl.to(ema.position, { x: POS.ema.x, z: POS.ema.z, duration: 0.5, ease: "power1.inOut" }, fin)
    .to(ema.position, { y: 1.8, duration: 0.25, ease: "power2.out" }, fin)
    .to(ema.position, { y: 0, duration: 0.25, ease: "power2.in" }, fin + 0.25);
  if (rapido) emaTl.timeScale(1.6);
}

// ---- Día y noche: la noche es el turno de ataque ----
const DIA = new THREE.Color(0xfff4de), NOCHE = new THREE.Color(0xa9a3e6);
function ambiente(f, inst) {
  const n = f === "ataque";
  if (n === noche) return;
  noche = n;
  const c = n ? NOCHE : DIA, d = inst ? 0 : 1.2;
  gsap.to(escena.background, { r: c.r, g: c.g, b: c.b, duration: d });
  gsap.to(escena.fog.color, { r: c.r, g: c.g, b: c.b, duration: d });
  gsap.to(sol, { intensity: n ? 1.2 : 1.9, duration: d });
  gsap.to(hemi, { intensity: n ? 1.0 : 1.25, duration: d });
  if (luna) gsap.to(luna, { y: n ? 0 : -160, opacity: n ? 1 : 0, duration: inst ? 0 : 1.1, ease: n ? "back.out(1.4)" : "power2.in" });
  if (n) ozCrecer(inst); else ozEncoger(inst);
}

// ---- Cinemáticas: la coreografía la pide cine.js, que también pone la ficha del concepto ----
let camTl = null;
function camCine(d, pausa) {
  if (camTl) camTl.kill();
  gsap.killTweensOf(cam);
  camTl = gsap.timeline();
  camTl.to(cam, Object.assign({ duration: 0.7, ease: "power2.inOut" }, d))
    .to(cam, Object.assign({ duration: 0.9, ease: "power2.inOut" }, destinoCamara(faseActual)), "+=" + pausa);
}
function cine(c, rapido) {
  host.classList.toggle("en-cine", c.tipo === "luna" || c.tipo === "ema" || c.tipo === "super");
  if (c.tipo === "luna") { if (!QUIETO) camCine({ px: -2.4, py: 3.6, pz: 5.2, lx: -5.2, ly: 2.7, lz: -6.4 }, 2.2); }
  else if (c.tipo === "ema") { if (!QUIETO) camCine({ px: 3.9, py: 2.7, pz: 11.2, lx: 1.2, ly: 1.2, lz: 5.2 }, 1.5); emaEntrada(); }
  else if (c.tipo === "super") { if (!QUIETO) camCine({ px: -2.4, py: 3.6, pz: 5.2, lx: -5.2, ly: 2.7, lz: -6.4 }, 2.6); ozSuper(); }
  else if (c.tipo === "cura") emaIr(c.a, true, rapido, c.icono);
  else if (c.tipo === "fallo") emaIr(c.a, false, rapido, c.icono);
  else if (c.tipo === "final") { if (c.a !== undefined && c.a !== null) emaIr(c.a, false, false, c.icono); else emaEntrada(); }
}
function cineFin() {
  host.classList.remove("en-cine");
  if (camTl && camTl.isActive()) { camTl.kill(); gsap.to(cam, Object.assign({ duration: 0.5, ease: "power2.out" }, destinoCamara(faseActual))); }
}

// ---- Cámara por turno ----
let ancho = 2, alto = 1, extension = 6.5, compacto = false;
function destinoCamara(fase) {
  // La distancia sale de lo ocupado: con pocos jugadores la cámara se acerca; con muchos, o en un
  // lienzo angosto, se aleja hasta que entren todos.
  let z = Math.max(9.5, (extension + (fase === "ataque" || fase === "defensa" ? 1.4 : 0)) / (Math.tan(THREE.MathUtils.degToRad(19)) * (ancho / alto)));
  // También a lo alto: Ema y el Ozaru se paran adelante (z = 5.2). En un lienzo ancho la distancia que basta para
  // el ancho deja sus pies (y medio cuerpo) bajo el borde inferior; la cámara se aleja hasta que entren.
  const FRENTE = 6.0, MEDIO = THREE.MathUtils.degToRad(19 - 1.2);
  while (z < 22 && Math.atan2(z * 0.47, z - FRENTE) > Math.atan2(z * 0.47 - 1, z + 0.4) + MEDIO) z += 0.25;
  const y = z * 0.47;
  if (fase === "ataque") return { px: -1.5, py: y - 0.3, pz: z - 0.4, lx: -0.2, ly: 1.0, lz: -0.4 };
  if (fase === "defensa") return { px: 1.6, py: y - 0.3, pz: z - 0.4, lx: 0.6, ly: 1.0, lz: -0.4 };
  return { px: 0, py: y, pz: z, lx: 0.2, ly: 1.0, lz: -0.4 };
}
let ambienteVisto = false;
function fase(f) {
  faseActual = f;
  ambiente(f, QUIETO || !ambienteVisto);
  ambienteVisto = true;
  if (camTl && camTl.isActive()) return;   // una cinemática lleva la cámara y la devuelve sola
  const d = destinoCamara(f);
  if (QUIETO) Object.assign(cam, d); else gsap.to(cam, Object.assign({ duration: 1.4, ease: "power2.inOut" }, d));
}

// ---- Dibujo ----
const v3 = new THREE.Vector3();
function proyectar(x, y, z) {
  v3.set(x, y, z).project(camara);
  return { x: (v3.x * 0.5 + 0.5) * ancho, y: (-v3.y * 0.5 + 0.5) * alto };
}
function medir() {
  ancho = host.clientWidth || 1; alto = host.clientHeight || 1;
  compacto = ancho < 560;
  etEma.textContent = compacto ? "Ema" : "Ema, el Rey Mono";
  etOz.textContent = compacto ? "Ozaru" : "El Ozaru";
  renderer.setSize(ancho, alto, false);
  camara.aspect = ancho / alto;
  camara.updateProjectionMatrix();
  Object.assign(cam, destinoCamara(faseActual));
}
let activo = false, t0 = performance.now();
function cuadro(ahora) {
  if (!activo) return;
  requestAnimationFrame(cuadro);
  const t = (ahora - t0) / 1000;
  camara.position.set(cam.px + Math.sin(t * 71) * temblor.v, cam.py + Math.cos(t * 83) * temblor.v, cam.pz);
  camara.lookAt(cam.lx, cam.ly, cam.lz);
  if (!QUIETO) {
    ema.userData.cuerpo.position.y = Math.abs(Math.sin(t * 2.2)) * 0.04;
    ozaru.userData.cuerpo.position.y = Math.abs(Math.sin(t * (noche ? 1.4 : 2.6))) * 0.05;
  }
  let pj = proyectar(ema.position.x, ema.position.y + 2.45, ema.position.z);
  etEma.style.left = pj.x + "px"; etEma.style.top = pj.y + "px";
  pj = proyectar(ozaru.position.x, ozaru.position.y + 1.72 * ozaru.scale.y + 0.3, ozaru.position.z);
  etOz.style.left = pj.x + "px"; etOz.style.top = pj.y + "px";
  Object.keys(ents).forEach((n) => {
    const e = ents[n], o = e.obj;
    if (e.tipo === "tumba") {
      const brinco = faseActual === "ataque" ? 0.09 : 0.035;
      if (!QUIETO) { o.userData.cuerpo.position.y = Math.abs(Math.sin(t * 3 + n * 1.7)) * brinco; o.userData.cabeza.rotation.z = Math.sin(t * 1.6 + n) * 0.08; }
    } else {
      const u = o.userData;
      if (u.humo.visible && !QUIETO) u.humo.children.forEach((h, i) => { h.position.y = 2 + ((t * 0.6 + i * 0.27) % 1) * 1.1; h.material.opacity = 0.85; h.scale.setScalar(0.18 + ((t * 0.6 + i * 0.27) % 1) * 0.22); });
      if (u.aro.visible) { u.aro.rotation.z = t * 2; u.aro.scale.setScalar(1 + Math.sin(t * 5) * 0.06); }
    }
    const p = proyectar(o.position.x, e.tipo === "tumba" ? o.position.y + 1.75 : 2.15, o.position.z);
    e.et.style.left = p.x + "px"; e.et.style.top = p.y + "px";
  });
  renderer.render(escena, camara);
}
function encender() { if (activo) return; activo = true; medir(); requestAnimationFrame(cuadro); }
function apagar() { activo = false; }

// ---- Elegir blanco tocando un servidor ----
const rayo = new THREE.Raycaster(), punto = new THREE.Vector2();
lienzo.addEventListener("pointerdown", (ev) => {
  const r = lienzo.getBoundingClientRect();
  punto.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  rayo.setFromCamera(punto, camara);
  const racks = Object.keys(ents).filter((n) => ents[n].tipo === "server").map((n) => ents[n].obj);
  const toque = rayo.intersectObjects(racks, true)[0];
  if (!toque) return;
  let o = toque.object;
  while (o && o.userData.n === undefined) o = o.parent;
  if (o && window.__arena) window.__arena.elegir(o.userData.n);
});
new ResizeObserver(medir).observe(host);
document.addEventListener("visibilitychange", () => { if (!document.hidden && activo) { t0 = performance.now(); } });

window.Arena3D = { pintar, animar, fase, encender, apagar, medir, cine, cineFin };
if (window.__arena) window.__arena.listo3d();
