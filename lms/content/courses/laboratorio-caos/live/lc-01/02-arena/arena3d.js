// Vista 3D de la arena del monito (three.js r169 + GSAP, copias locales en live/_comun).
// No guarda estado del juego: pinta lo que le pasa escena.html y avisa qué servidor se tocó.
//   Arena3D.pintar(est, blanco, yoN)   sincroniza monitos y servidores con el estado del servidor
//   Arena3D.animar(evento)             ataque (salto sobre la valla) o defensa (pulso verde)
//   Arena3D.fase(fase)                 mueve la cámara con el turno
//   Arena3D.encender() / apagar()      arranca o detiene el dibujo (la vista 2D sigue de respaldo)
import * as THREE from "../../comun/three.module.min.js";

const gsap = window.gsap;
const host = document.getElementById("escenario3d");
const lienzo = document.getElementById("lienzo3d");
const capa = document.getElementById("etiquetas3d");
let QUIETO = false;
try { QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

const ICONO = { apagar: "🔌", disco: "💾", base: "🗑️", atascar: "🐢", fuga: "🏃", clones: "👥", pesados: "📦", formulario: "✍️", sesion: "🔓", clave: "🔑", reiniciar: "🩹", limpiar: "🧹" };
const FALLA = { app: "🔌", disco: "💾", base: "🗑️", lenta: "🐢", fuga: "🏃", clones: "👥", datos: "✍️", sesion: "🔓", clave: "🔑", sin_lab: "📦", aula: "💤" };

const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const escena = new THREE.Scene();
escena.background = new THREE.Color(0xfff4de);
escena.fog = new THREE.Fog(0xfff4de, 26, 46);
const camara = new THREE.PerspectiveCamera(38, 2, 0.1, 100);
const cam = { px: 0, py: 6.6, pz: 14, lx: 0.2, ly: 1.0, lz: -0.4 };

escena.add(new THREE.HemisphereLight(0xffffff, 0xcfe6b8, 1.25));
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
};
const G = {
  esfera: new THREE.SphereGeometry(1, 20, 14), caja: new THREE.BoxGeometry(1, 1, 1),
  brazo: new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), banda: new THREE.TorusGeometry(0.345, 0.055, 8, 24),
  cola: new THREE.TorusGeometry(0.22, 0.04, 6, 16, Math.PI * 1.25), sonrisa: new THREE.TorusGeometry(0.09, 0.02, 6, 12, Math.PI),
  aro: new THREE.TorusGeometry(0.75, 0.06, 8, 32),
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
function crearMono() {
  const g = new THREE.Group();          // se mueve y salta
  const c = new THREE.Group();          // se mece (para no pelear con el salto)
  g.add(c);
  c.add(esfera(0.42, M.piel, 0, 0.5, 0, 1, 1.15, 1), esfera(0.3, M.cara, 0, 0.47, 0.2, 1, 1.1, 0.6));
  c.add(esfera(0.14, M.piel, -0.17, 0.1, 0.06, 1, 0.6, 1.3), esfera(0.14, M.piel, 0.17, 0.1, 0.06, 1, 0.6, 1.3));
  [-1, 1].forEach((s) => {
    const b = new THREE.Mesh(G.brazo, M.piel);
    b.position.set(0.44 * s, 0.62, 0.02); b.rotation.z = 0.55 * s; b.castShadow = true;
    c.add(b, esfera(0.09, M.cara, 0.56 * s, 0.42, 0.04));
  });
  const cola = new THREE.Mesh(G.cola, M.piel);
  cola.position.set(0, 0.42, -0.4); cola.rotation.y = Math.PI / 2;
  c.add(cola);
  const cab = new THREE.Group();
  cab.position.y = 1.14;
  cab.add(esfera(0.36, M.piel, 0, 0, 0));
  [-1, 1].forEach((s) => {
    cab.add(esfera(0.13, M.piel, 0.37 * s, 0.02, 0), esfera(0.07, M.cara, 0.39 * s, 0.02, 0.06));
    cab.add(esfera(0.2, M.cara, 0.11 * s, 0.03, 0.24, 1, 1, 0.5), esfera(0.05, M.negro, 0.11 * s, 0.07, 0.34));
  });
  cab.add(esfera(0.22, M.cara, 0, -0.12, 0.26, 1.1, 0.7, 0.6));
  const sonrisa = new THREE.Mesh(G.sonrisa, M.negro);
  sonrisa.position.set(0, -0.11, 0.4); sonrisa.rotation.z = Math.PI;
  const banda = new THREE.Mesh(G.banda, M.rojo);
  banda.position.y = 0.16; banda.rotation.x = Math.PI / 2 - 0.12;
  cab.add(sonrisa, banda, esfera(0.07, M.rojo, -0.36, 0.1, -0.12, 1.6, 0.7, 0.7));
  c.add(cab);
  g.rotation.y = 0.75;                  // mira hacia la valla y un poco a la cámara
  g.userData = { cuerpo: c, cabeza: cab };
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
      e.et.textContent = (estado === "ok" ? "✅" : estado === "caido" ? "❌" + (compacto ? "" : fallas) : "📦") + (conNombre ? " " + corto(j.nombre) : "");
      e.et.className = "et3d srv " + estado + (j.n === yoN ? " yo" : "");
      estadoRack(e.obj, estado);
      e.obj.userData.aro.visible = blanco === j.n;
    }
  });
  Object.keys(ents).forEach((n) => { if (!vistos[n]) quitar(Number(n)); });
  let ext = 6.5;
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
function animar(ev) {
  if (ev.tipo === "defensa") {
    const r = ents[ev.a];
    if (!r || r.tipo !== "server") return;
    burbuja(r.obj, ICONO[ev.accion] || "🩹");
    const p = r.obj.userData.pulso;
    gsap.fromTo(p.scale, { x: 0.4, y: 0.4, z: 0.4 }, { x: 2.2, y: 2.2, z: 2.2, duration: 0.9, ease: "power2.out" });
    gsap.fromTo(p.material, { opacity: 0.9 }, { opacity: 0, duration: 0.9 });
    return;
  }
  if (ev.tipo !== "ataque") return;
  const r = ents[ev.a], m = ents[ev.de];
  if (!r || r.tipo !== "server") return;
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

// ---- Cámara por turno ----
let ancho = 2, alto = 1, extension = 6.5, compacto = false;
function destinoCamara(fase) {
  // La distancia sale de lo ocupado: con pocos jugadores la cámara se acerca; con muchos, o en un
  // lienzo angosto, se aleja hasta que entren todos.
  const z = Math.max(9.5, (extension + (fase === "ataque" || fase === "defensa" ? 1.4 : 0)) / (Math.tan(THREE.MathUtils.degToRad(19)) * (ancho / alto))), y = z * 0.47;
  if (fase === "ataque") return { px: -1.5, py: y - 0.3, pz: z - 0.4, lx: -0.2, ly: 1.0, lz: -0.4 };
  if (fase === "defensa") return { px: 1.6, py: y - 0.3, pz: z - 0.4, lx: 0.6, ly: 1.0, lz: -0.4 };
  return { px: 0, py: y, pz: z, lx: 0.2, ly: 1.0, lz: -0.4 };
}
function fase(f) {
  faseActual = f;
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
  camara.position.set(cam.px, cam.py, cam.pz);
  camara.lookAt(cam.lx, cam.ly, cam.lz);
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

window.Arena3D = { pintar, animar, fase, encender, apagar, medir };
if (window.__arena) window.__arena.listo3d();
