// Forja · constructor 3D. Toma la ficha del resolver y arma el personaje con primitivas de Three.js,
// material toon y contorno (casco invertido). Mira hacia +Z, pies en Y=0. Devuelve los pivotes para animarlo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, azar } from './resolver.js';
import { texturaPatron } from './texturas.js';

const PI = Math.PI;
let GRAD = null;
function gradiente() {
  if (GRAD) return GRAD;
  GRAD = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;
  return GRAD;
}
const col = (c) => new THREE.Color().setHSL(c.h / 360, c.s, c.l, THREE.SRGBColorSpace);
const H = (h, s, l) => ({ h, s, l });

export function construir(spec) {
  const d = spec.dims, C = spec.colores, f = spec.familia, rig = spec.rig, rnd = azar(spec.semilla * 31 + 7);
  const basura = [], graficos = [];
  const G = (geo) => { basura.push(geo); return geo; };
  const mats = new Map();
  const g = spec.grosor;
  const matContorno = new THREE.MeshBasicMaterial({ color: col(C.contorno), side: THREE.BackSide }); basura.push(matContorno);

  // textura de patrón (p5) solo para el cuerpo
  let mapa = null;
  const gp = texturaPatron(spec);
  if (gp) { graficos.push(gp); mapa = new THREE.CanvasTexture(gp.elt); mapa.wrapS = mapa.wrapT = THREE.RepeatWrapping; mapa.colorSpace = THREE.SRGBColorSpace; mapa.repeat.set(2, 1); basura.push(mapa); }

  function mat(c, o = {}) {
    const k = `${c.h.toFixed(1)}|${c.s.toFixed(2)}|${c.l.toFixed(2)}|${o.mapa ? 1 : 0}|${o.luz || 0}|${o.alfa || 1}|${o.doble ? 1 : 0}|${o.plano ? 1 : 0}`;
    if (mats.has(k)) return mats.get(k);
    let m;
    if (o.plano) m = new THREE.MeshBasicMaterial({ color: col(c) });
    else {
      m = new THREE.MeshToonMaterial({ color: o.mapa && mapa ? 0xffffff : col(c), gradientMap: gradiente(), map: o.mapa && mapa ? mapa : null });
      const em = (o.luz || 0) + (o.cuerpo ? spec.emisivo : 0);
      if (em > 0) { m.emissive = col(c); m.emissiveIntensity = em; }
    }
    if (o.alfa && o.alfa < 1) { m.transparent = true; m.opacity = o.alfa; m.depthWrite = o.alfa > 0.5; }
    if (o.doble) m.side = THREE.DoubleSide;
    mats.set(k, m); basura.push(m);
    return m;
  }
  const alfaCuerpo = spec.translucido ? 0.8 : 1;
  const M = {
    cuerpo: () => mat(C.cuerpo, { mapa: true, cuerpo: true, alfa: alfaCuerpo }), liso: () => mat(C.cuerpo, { cuerpo: true, alfa: alfaCuerpo }),
    panza: () => mat(C.panza, { cuerpo: true, alfa: alfaCuerpo }), ext: () => mat(C.extremidad, { cuerpo: true, alfa: alfaCuerpo }),
    det: () => mat(C.detalle), acc: () => mat(C.accesorio), oscuro: () => mat(C.ojo), blanco: () => mat(H(0, 0, 0.97)),
    oro: () => mat(H(46, 0.9, 0.58), { luz: 0.15 }), metal: () => mat(H(C.cuerpo.h, 0.12, 0.72)), hueso: () => mat(H(45, 0.4, 0.88)),
    madera: () => mat(H(28, 0.5, 0.36)), brillo: () => mat(H(0, 0, 1), { plano: true }),
    luz: (c = C.detalle) => mat(H(c.h, 0.9, 0.66), { luz: 0.9 }),
  };

  // pieza con su contorno
  function pieza(geo, material, o = {}) {
    const m = new THREE.Mesh(geo, material);
    if (o.sinContorno || material.transparent && material.opacity < 0.5) return m;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const k = clamp(1 + g / Math.max(geo.boundingSphere.radius, 0.02), 1.02, 1.3);
    const c = new THREE.Mesh(geo, matContorno); c.scale.setScalar(k); c.userData.contorno = true; m.add(c);
    return m;
  }
  const esfera = (r, material, sx = 1, sy = 1, sz = 1, o) => { const m = pieza(G(new THREE.SphereGeometry(r, 22, 16)), material, o); m.scale.set(sx, sy, sz); return m; };
  const cono = (r, h, material, seg = 14, o) => pieza(G(new THREE.ConeGeometry(r, h, seg)), material, o);
  const cil = (r1, r2, h, material, seg = 18, o) => pieza(G(new THREE.CylinderGeometry(r1, r2, h, seg)), material, o);
  const caja = (w, h, p, material, radio, o) => pieza(G(new RoundedBoxGeometry(w, h, p, 3, radio ?? Math.min(w, h, p) * 0.2)), material, o);
  const toro = (R, t, material, arco = PI * 2, o) => pieza(G(new THREE.TorusGeometry(R, t, 8, 24, arco)), material, o);
  const capsula = (r, l, material, o) => pieza(G(new THREE.CapsuleGeometry(r, Math.max(0.01, l), 6, 14)), material, o);
  const grupo = (x = 0, y = 0, z = 0, padre) => { const q = new THREE.Group(); q.position.set(x, y, z); padre?.add(q); return q; };
  const pon = (m, padre, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); padre.add(m); return m; };

  const raiz = new THREE.Group(), todo = grupo(0, 0, 0, raiz), cuerpo = grupo(0, 0, 0, todo);
  const P = { raiz, todo, cuerpo, cabeza: null, piernas: [], brazos: [], cola: null, alas: [], antenas: [], tentaculos: [], llamas: [], orejas: [], manos: [] };
  const { tw, th, td } = d;

  // ---------------------------------------------------------------- torso
  function torso(forma) {
    const q = new THREE.Group(); let rx = tw / 2, ry = th / 2, rz = td / 2, yCara = 0, plano = false;
    switch (forma) {
      case 'caja': q.add(caja(tw, th, td, M.cuerpo())); plano = true; break;
      case 'cono': q.add(cil(tw * 0.3, tw * 0.62, th, M.cuerpo(), 22)); rx = tw * 0.42; rz = tw * 0.42; break;
      case 'gota': case 'sabana': {
        const pts = [];
        for (let i = 0; i <= 18; i++) {
          const u = i / 18, y = (u - 0.5) * th;
          const r = forma === 'gota' ? (tw / 2) * Math.pow(Math.sin(PI * Math.min(1, u * 0.9 + 0.1)), 0.62) * (1 - 0.32 * u)
            : (tw / 2) * (u < 0.42 ? 1 + 0.06 * Math.sin(u * 22) : Math.sqrt(Math.max(0, 1 - ((u - 0.42) / 0.58) ** 2)));
          pts.push(new THREE.Vector2(Math.max(0.001, r), y));
        }
        const m = pieza(G(new THREE.LatheGeometry(pts, 26)), forma === 'sabana' ? mat(C.cuerpo, { cuerpo: true, alfa: alfaCuerpo, doble: true }) : M.cuerpo()); m.scale.z = td / tw; q.add(m);
        yCara = forma === 'gota' ? -th * 0.1 : th * 0.12; ry = th * 0.4; rx = tw * 0.46; rz = td * 0.46; break;
      }
      case 'campana': { const m = pieza(G(new THREE.SphereGeometry(tw / 2, 24, 14, 0, PI * 2, 0, PI * 0.56)), mat(C.cuerpo, { mapa: true, cuerpo: true, alfa: alfaCuerpo, doble: true })); m.scale.y = th / tw * 1.5; m.position.y = -th * 0.2; q.add(m); yCara = th * 0.05; ry = th * 0.4; break; }
      case 'nube': {
        for (const [x, y, r] of [[0, 0, 0.5], [-0.42, -0.08, 0.36], [0.42, -0.08, 0.36], [-0.2, 0.2, 0.34], [0.22, 0.22, 0.32]]) pon(esfera(r * tw, M.liso(), 1, th / tw, td / tw), q, x * tw, y * th, 0);
        ry = th * 0.45; break;
      }
      case 'estrella': {
        const s = new THREE.Shape(), R1 = tw * 0.62, R2 = tw * 0.3;
        for (let i = 0; i < 10; i++) { const r = i % 2 ? R2 : R1, a = PI / 2 + i * PI / 5; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
        const geo = G(new THREE.ExtrudeGeometry(s, { depth: td * 0.3, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 })); geo.center();
        q.add(pieza(geo, M.liso())); plano = true; rz = td * 0.21; rx = tw * 0.3; ry = tw * 0.3; yCara = -tw * 0.04; break;
      }
      case 'hongo': { // tallo corto y gordito color crema, sombrero ancho que lo cubre: silueta de seta de cuento
        const crema = mat(H(42, 0.4, 0.92));
        pon(esfera(1, crema, tw * 0.4, th * 0.4, tw * 0.4), q, 0, -th * 0.2, 0);
        const s = pieza(G(new THREE.SphereGeometry(tw * 0.78, 26, 14, 0, PI * 2, 0, PI * 0.56)), M.cuerpo()); s.scale.y = 0.72; pon(s, q, 0, th * 0.02, 0);
        pon(cil(tw * 0.74, tw * 0.5, 0.05, crema, 26, { sinContorno: true }), q, 0, -th * 0.01, 0);
        rx = tw * 0.36; rz = tw * 0.39; ry = th * 0.36; yCara = -th * 0.2; break;
      }
      case 'calabaza': q.add(esfera(tw / 2, M.cuerpo(), 1.12, th / tw * 0.9, td / tw * 1.1)); pon(cil(0.04, 0.06, 0.16, mat(H(110, 0.5, 0.36))), q, 0, th * 0.47); rx *= 1.1; ry *= 0.9; break;
      default:
        if (forma === 'capsula' && th > tw * 1.1) { const m = capsula(tw / 2, th - tw, M.cuerpo()); m.scale.z = td / tw; q.add(m); } else q.add(esfera(0.5, M.cuerpo(), tw, th, td));
    }
    return { q, rx, ry, rz, yCara, plano };
  }

  // ---------------------------------------------------------------- cara
  function cara(padre, rx, ry, rz, plano) {
    const sz = (x, y) => plano ? rz : rz * Math.sqrt(Math.max(0.08, 1 - (x / rx) ** 2 - (y / ry) ** 2));
    const conHocico = f.hocico !== 'ninguno', est = spec.ojoEstilo, ca = spec.cara;
    const er = Math.min(d.ojo * rx * 1.2, rx * 0.52), ey = (d.ojoAlt + (conHocico ? 0.12 : 0)) * ry, ex = d.ojoSep * rx * (f.ojos === 1 ? 0 : 1);
    const ojos = [];
    if (est === 'visor') {
      pon(caja(rx * 1.45, er * 1.15, 0.06, M.oscuro(), 0.025), padre, 0, ey, sz(0, ey) * 0.96);
      for (const s of [-1, 1]) pon(esfera(er * 0.3, M.luz(), 1, 1, 0.4, { sinContorno: true }), padre, s * ex, ey, sz(0, ey) + 0.035);
    } else for (const s of f.ojos === 1 ? [0] : [-1, 1]) {
      const x = s * ex, salt = est === 'saltones';
      const o = grupo(x, ey, sz(x, salt ? ey * 0.5 : ey) * (salt ? 0.72 : 0.97), padre); o.rotation.y = s * 0.22;
      if (est === 'robot') o.add(caja(er * 1.6, er * 1.6, 0.05, M.luz(), 0.02));
      else if (est === 'hueco') { o.add(esfera(er, M.oscuro(), 1, 1.15, 0.4)); }
      else {
        o.add(esfera(er, M.blanco(), 1, est === 'ovalado' ? 1.3 : 1, salt ? 0.95 : 0.5));
        pon(esfera(er * 0.56, M.oscuro(), 1, 1, 0.6, { sinContorno: true }), o, ca.mirada * er * 0.3, 0, er * (salt ? 0.72 : 0.36));
        pon(esfera(er * 0.17, M.brillo(), 1, 1, 0.5, { sinContorno: true }), o, er * 0.2 + ca.mirada * er * 0.3, er * 0.22, er * (salt ? 1.15 : 0.66));
      }
      if (est !== 'robot') o.scale.y = clamp(1 - ca.parpado * 0.82, 0.12, 1.2);
      ojos.push(o);
      if (Math.abs(ca.ceja) > 0.05 && est !== 'robot' && est !== 'hueco') pon(capsula(0.018, er * 1.1, M.oscuro(), { sinContorno: true }), padre, x, ey + er * 1.28, sz(x, ey + er) + 0.03, 0, 0, PI / 2 + (s || 1) * ca.ceja);
    }
    const my = ey - er * 1.5 - ry * 0.08, mz = sz(0, my);
    if (conHocico) {
      const hy = ey - er * 1.25 - ry * 0.1;
      if (f.hocico === 'pico') pon(cono(rx * 0.24, rx * 0.56, M.ext(), 12), padre, 0, hy + ry * 0.06, sz(0, hy) + rx * 0.2, PI / 2);
      else if (f.hocico === 'chato') { pon(cil(rx * 0.3, rx * 0.32, rx * 0.2, M.det(), 18), padre, 0, hy, sz(0, hy) + rx * 0.04, PI / 2); for (const s of [-1, 1]) pon(esfera(rx * 0.06, M.oscuro(), 1, 1.3, 0.5, { sinContorno: true }), padre, s * rx * 0.11, hy, sz(0, hy) + rx * 0.15); }
      else {
        const largo = f.hocico === 'largo' ? 0.62 : 0.3;
        pon(esfera(rx * 0.4, M.panza(), 1, 0.74, largo * 2.2), padre, 0, hy, sz(0, hy) * 0.92 + rx * largo * 0.25);
        pon(esfera(rx * 0.11, M.oscuro(), 1.2, 0.85, 0.8, { sinContorno: true }), padre, 0, hy + rx * 0.16, sz(0, hy) * 0.92 + rx * largo * 1.05);
      }
    } else if (est !== 'visor' || true) {
      const b = ca.boca, mr = rx * 0.22;
      if (b === 2) pon(esfera(rx * 0.12, M.oscuro(), 1, 1.2, 0.4, { sinContorno: true }), padre, 0, my, mz);
      else if (Math.abs(b) < 0.1) pon(capsula(0.017, rx * 0.26, M.oscuro(), { sinContorno: true }), padre, 0, my, mz + 0.01, 0, 0, PI / 2);
      else pon(toro(mr * clamp(Math.abs(b), 0.55, 1), 0.019, M.oscuro(), PI, { sinContorno: true }), padre, 0, my + (b > 0 ? mr * 0.5 : -mr * 0.3), mz + 0.01, b > 0 ? -0.2 : 0.2, 0, b > 0 ? PI : 0);
    }
    return { sz, er, ex, ey, ojos };
  }

  // ---------------------------------------------------------------- rasgos de cabeza
  function rasgosCabeza(c, rx, ry, rz) {
    for (const s of [-1, 1]) {
      let o = null;
      if (f.orejas === 'gato') o = pon(cono(rx * 0.3, ry * 0.6, M.liso(), 10), c, s * rx * 0.6, ry * 0.86, 0, 0, 0, -s * 0.28);
      else if (f.orejas === 'punta') o = pon(cono(rx * 0.17, rx * 0.8, M.liso(), 10), c, s * rx * 1.02, ry * 0.22, 0, 0, 0, -s * 1.15);
      else if (f.orejas === 'caida') o = pon(esfera(1, M.ext(), rx * 0.2, ry * 0.5, rz * 0.3), c, s * rx * 0.95, ry * 0.05, 0, 0, 0, s * 0.2);
      else if (f.orejas === 'redonda') { const k = f.orejaK || 1; o = pon(esfera(rx * 0.3 * k, k > 1.3 ? M.det() : M.liso(), 1, 1, 0.42), c, s * rx * (0.72 + (k - 1) * 0.22), ry * (0.78 + (k - 1) * 0.2), -rz * 0.05); }
      else if (f.orejas === 'larga') o = pon(esfera(1, M.liso(), rx * 0.17, ry * 0.75, rz * 0.12), c, s * rx * 0.36, ry * 1.45, 0, 0, 0, -s * 0.14);
      if (o) P.orejas.push(o);
      if (f.cuernos === 2) pon(cono(rx * 0.14, rx * 0.52, M.hueso(), 10), c, s * rx * 0.46, ry * 0.92, rz * 0.1, 0, 0, -s * 0.4);
    }
    if (f.melena) { pon(esfera(rx * 1.34, M.det(), 1, 1.02, 0.7), c, 0, -ry * 0.02, -rz * 0.32); for (let i = 0; i < 9; i++) { const an = i / 9 * PI * 2; pon(esfera(rx * 0.3, M.det()), c, Math.cos(an) * rx * 1.18, Math.sin(an) * ry * 1.18, -rz * 0.15); } }
    if (f.cuernos === 1) pon(cono(rx * 0.12, rx * 0.85, M.oro(), 10), c, 0, ry * 1.1, rz * 0.45, 0.4);
    const na = f.antenas;
    for (let i = 0; i < na; i++) antena(c, na === 1 ? 0 : (i ? 1 : -1) * rx * 0.42, ry * 0.9, rx);
    if (f.cresta) for (let i = 0; i < 3; i++) pon(cono(rx * 0.14, rx * 0.36, M.det(), 8), c, 0, ry * (0.98 - i * 0.08), rz * (0.25 - i * 0.38), -0.3 - i * 0.35);
  }
  function antena(c, x, y, rx) {
    const a = grupo(x, y, 0, c); a.rotation.z = -Math.sign(x) * 0.25;
    pon(cil(0.014, 0.014, rx * 0.6, M.oscuro(), 6), a, 0, rx * 0.3); pon(esfera(0.055, M.luz()), a, 0, rx * 0.62); P.antenas.push(a);
  }

  // ---------------------------------------------------------------- armado por esqueleto
  const rl = rig === 'ave' ? 0.045 : clamp(0.1 * tw + 0.035, 0.06, 0.16), L = d.pierna, rc = d.cab * 0.55;
  let A = {}; // anclas para accesorios
  const sinBrazos = ['slime', 'hongo', 'calabaza', 'medusa', 'nube'].includes(f.id) || d.brazo < 0.06;

  function brazosVerticales(yHombro, xHombro, padre) {
    for (const s of [-1, 1]) {
      const b = grupo(s * xHombro, yHombro, 0, padre); b.rotation.z = s * 0.3;
      if (rig === 'ave') pon(esfera(1, mat(H(C.cuerpo.h, C.cuerpo.s, C.cuerpo.l - 0.09), { cuerpo: true }), 0.09, d.brazo * 0.5, 0.24), b, 0, -d.brazo * 0.42, 0);
      else {
        const ra = f.id === 'golem' ? rl * 1.5 : rl * 0.85;
        if (f.id === 'golem' || f.torso === 'caja') pon(caja(ra * 2, d.brazo, ra * 2, M.ext()), b, 0, -d.brazo / 2, 0);
        else pon(capsula(ra, d.brazo - ra, M.ext()), b, 0, -d.brazo / 2, 0);
        const mano = grupo(0, -d.brazo, 0, b); mano.add(esfera(ra * 1.3, M.panza())); P.manos.push(mano);
      }
      b.userData.lado = s; P.brazos.push(b);
    }
  }
  function manosFlotantes(y, x, padre) { for (const s of [-1, 1]) { const mano = grupo(s * x, y, 0.08, padre); if (!sinBrazos) mano.add(esfera(0.085, M.panza())); mano.userData.lado = s; P.manos.push(mano); if (!sinBrazos) P.brazos.push(mano); } }

  if (rig === 'bipedo' || rig === 'ave') {
    const yT = L + th / 2 - 0.05, t = torso(f.torso); t.q.position.y = yT; cuerpo.add(t.q);
    if (f.panza) pon(esfera(0.5, M.panza(), tw * 0.72, th * 0.78, td * 0.5, { sinContorno: true }), cuerpo, 0, yT - th * 0.06, td * 0.3);
    for (const s of [-1, 1]) {
      const p = grupo(s * tw * 0.24, L + 0.03, 0, todo);
      if (f.torso === 'caja') pon(caja(rl * 1.9, L, rl * 1.9, M.ext()), p, 0, -L / 2, 0); else pon(capsula(rl, L - rl, M.ext()), p, 0, -L / 2, 0);
      pon(esfera(rl * 1.5, rig === 'ave' ? M.ext() : M.det(), 1, 0.6, 1.5), p, 0, -L - 0.01 + rl * 0.7, rl * 0.7);
      P.piernas.push(p);
    }
    const yC = L + th - 0.08 + rc * 0.8, c = grupo(0, yC, 0, cuerpo); P.cabeza = c;
    const cajaC = f.cabeza === 'caja';
    c.add(cajaC ? caja(rc * 2, rc * 1.7, rc * 1.7, M.liso()) : esfera(rc, M.liso(), 1, 0.94, 0.96));
    const rx = rc, ry = cajaC ? rc * 0.85 : rc * 0.94, rz = cajaC ? rc * 0.85 : rc * 0.96;
    const ca = cara(c, rx, ry, rz, cajaC); rasgosCabeza(c, rx, ry, rz);
    brazosVerticales(L + th * 0.72, tw / 2 - 0.02, cuerpo);
    A = { cab: c, rx, ry, rz, cara: ca, espalda: grupo(0, yT, -td / 2, cuerpo), cintura: { g: cuerpo, y: L + th * 0.2, r: tw * 0.49 }, cola: grupo(0, L + th * 0.18, -td * 0.45, cuerpo), altoT: th };
  } else if (rig === 'cuadrupedo') {
    const r = tw * 0.42, len = Math.max(th * 1.15, r * 2.1), yT = L + r * 0.82;
    const cu = capsula(r, len - r * 2, M.cuerpo()); pon(cu, cuerpo, 0, yT, 0, PI / 2);
    for (const [sx, szz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const p = grupo(sx * r * 0.58, L + 0.04, szz * (len / 2 - r * 0.6), todo);
      pon(capsula(rl, L - rl, M.ext()), p, 0, -L / 2, 0); pon(esfera(rl * 1.35, M.det(), 1, 0.6, 1.3), p, 0, -L + rl * 0.6, rl * 0.4);
      P.piernas.push(p);
    }
    const c = grupo(0, yT + r * 0.55 + rc * 0.4, len / 2 + rc * 0.25, cuerpo); P.cabeza = c;
    c.add(esfera(rc, M.liso(), 1, 0.94, 0.96));
    const ca = cara(c, rc, rc * 0.94, rc * 0.96, false); rasgosCabeza(c, rc, rc * 0.94, rc * 0.96);
    if (f.caparazon) { const s = pieza(G(new THREE.SphereGeometry(1, 22, 12, 0, PI * 2, 0, PI * 0.5)), M.det()); s.scale.set(r * 1.3, r * 1.25, len * 0.56); pon(s, cuerpo, 0, yT + r * 0.1, 0); }
    if (f.cresta) for (let i = 0; i < 4; i++) pon(cono(r * 0.2, r * 0.5, M.det(), 8), cuerpo, 0, yT + r * 1.08, len * (0.3 - i * 0.2));
    const esp = grupo(0, yT + r, 0, cuerpo); esp.rotation.x = -PI / 2;
    A = { cab: c, rx: rc, ry: rc * 0.94, rz: rc * 0.96, cara: ca, espalda: esp, cintura: null, cola: grupo(0, yT + r * 0.3, -len / 2 + r * 0.1, cuerpo), altoT: len * 0.8, cuad: true };
  } else { // flotante y blob: la cara va en el cuerpo
    const flota = rig === 'flotante', pie = !flota && d.pierna > 0.05 ? d.pierna * 0.3 : 0;
    const yT = (flota ? 0.5 : pie) + th / 2, t = torso(f.id === 'fantasma' ? 'sabana' : f.torso);
    const c = grupo(0, yT, 0, cuerpo); c.add(t.q); P.cabeza = c;
    const fc = grupo(0, t.yCara, 0, c);
    const ca = cara(fc, t.rx, t.ry, t.rz, t.plano);
    for (let i = 0; i < f.antenas; i++) antena(c, (i ? 1 : -1) * t.rx * 0.4, th / 2, t.rx);
    if (pie) for (const s of [-1, 1]) { const p = grupo(s * tw * 0.24, pie + 0.04, 0, todo); pon(esfera(rl * 1.5, M.det(), 1, 0.7, 1.4), p, 0, -pie + rl * 0.5, rl * 0.3); P.piernas.push(p); }
    if (f.id === 'cactus' || f.id === 'golem') { d.brazo = Math.min(d.brazo, yT + th * 0.15 - 0.12); brazosVerticales(yT + th * 0.15, tw / 2 - 0.02, cuerpo); } else manosFlotantes(yT - th * 0.05, tw / 2 + 0.14, cuerpo);
    if (f.id === 'cactus') for (const b of P.brazos) b.rotation.z = b.userData.lado * 2.2;
    if (f.tentaculos) for (let i = 0; i < f.tentaculos; i++) {
      const a = i / f.tentaculos * PI * 2, tg = grupo(Math.cos(a) * tw * 0.3, yT - th * 0.22, Math.sin(a) * tw * 0.3, cuerpo);
      pon(cil(0.05, 0.015, th * 0.9, M.ext(), 8), tg, 0, -th * 0.45, 0); tg.userData.fase = a; P.tentaculos.push(tg);
    }
    if (f.espinas) for (let i = 0; i < 16; i++) {
      const a = rnd() * PI * 2, v = (rnd() - 0.5) * 0.8, e = cono(0.018, 0.09, M.hueso(), 5, { sinContorno: true });
      e.position.set(Math.cos(a) * tw * 0.5, v * th, Math.sin(a) * td * 0.5);
      e.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); c.add(e);
    }
    A = { cab: fc, rx: t.rx, ry: t.ry, rz: t.rz, cara: ca, techo: th / 2 - t.yCara, espalda: grupo(0, 0, -td / 2, c), cintura: flota ? null : { g: c, y: -th * 0.28, r: tw * 0.47 }, cola: grupo(0, -th * 0.25, -td * 0.45, c), altoT: th, sinCabeza: true };
  }

  // ---------------------------------------------------------------- cola y alas
  function cola(tipo, ancla) {
    const q = grupo(0, 0, 0, ancla); P.cola = q;
    if (tipo === 'larga') { q.rotation.x = -0.75; pon(capsula(0.05, tw * 0.75, M.ext()), q, 0, tw * 0.4, 0); }
    else if (tipo === 'corta') q.add(esfera(0.09, M.ext()));
    else if (tipo === 'pompon') { q.rotation.x = -0.9; pon(capsula(0.05, tw * 0.3, M.liso()), q, 0, tw * 0.18, 0); pon(esfera(0.17, M.panza()), q, 0, tw * 0.45, 0); }
    else if (tipo === 'dragon') { q.rotation.x = -PI / 2 - 0.2; pon(cono(0.15, tw * 0.95, M.liso(), 12), q, 0, tw * 0.45, 0); }
  }
  if (f.cola !== 'ninguna') cola(f.cola, A.cola);
  function alas(tipo, ancla, k = 1) {
    for (const s of [-1, 1]) {
      const a = grupo(s * 0.06, A.cuad ? 0 : A.altoT * 0.2, -0.03, ancla); a.userData.lado = s;
      if (tipo === 'murcielago') {
        const sh = new THREE.Shape(); [[0, 0.1], [0.8, 0.5], [0.66, 0], [0.44, 0.04], [0.32, -0.3], [0, -0.16]].forEach(([x, y], i) => sh[i ? 'lineTo' : 'moveTo'](x * tw * k, y * tw * k));
        const m = pieza(G(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false })), mat(C.detalle, { doble: true })); m.scale.x = s; a.add(m);
      } else for (const [y, r] of [[0.16, 0.34], [-0.12, 0.24]]) pon(esfera(1, mat(H(C.detalle.h, 0.5, 0.88), { alfa: 0.62, luz: 0.2 }), r * k, r * 1.25 * k, 0.015, { sinContorno: true }), a, s * r * 0.95 * k, y, 0, 0, 0, -s * 0.5);
      P.alas.push(a);
    }
  }
  if (f.alas === 'murcielago' || f.alas === 'hada') alas(f.alas, A.espalda);

  // ---------------------------------------------------------------- accesorios
  const c = A.cab, { rx, ry, rz } = A, techo = A.techo ?? ry;
  const ACC = {
    sombrero_mago: (e) => { const q = grupo(0, techo * 0.82, 0, c); q.rotation.z = 0.12; q.add(cil(rx * 1.12 * e, rx * 1.12 * e, 0.04, M.acc(), 22)); pon(cono(rx * 0.72 * e, rx * 1.5 * e, M.acc(), 18), q, 0, rx * 0.75 * e, 0); pon(toro(rx * 0.7 * e, 0.03, M.oro(), PI * 2, { sinContorno: true }), q, 0, 0.05, 0, PI / 2); },
    corona: (e) => { const q = grupo(0, techo * 0.95, 0, c); q.add(cil(rx * 0.5 * e, rx * 0.46 * e, rx * 0.28, M.oro(), 16)); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; pon(cono(rx * 0.1, rx * 0.26, M.oro(), 6), q, Math.cos(a) * rx * 0.44 * e, rx * 0.24, Math.sin(a) * rx * 0.44 * e); } },
    casco: (e) => { const s = pieza(G(new THREE.SphereGeometry(rx * 1.1 * e, 22, 10, 0, PI * 2, 0, PI * 0.48)), M.metal()); pon(s, c, 0, techo - ry + ry * 0.08, 0); pon(caja(0.06, rx * 0.5, rx * 1.3, M.acc()), c, 0, techo + rx * 0.16, -rx * 0.05); },
    gorro: (e) => { const s = pieza(G(new THREE.SphereGeometry(rx * 1.04 * e, 22, 10, 0, PI * 2, 0, PI * 0.45)), M.acc()); s.scale.y = 1.25; pon(s, c, 0, techo - ry + ry * 0.1, 0); pon(esfera(rx * 0.2, M.blanco()), c, 0, techo + rx * 0.42, 0); },
    lazo: () => { const q = grupo(rx * 0.5, techo * 0.92, rz * 0.2, c); q.rotation.z = -0.3; for (const s of [-1, 1]) pon(cono(rx * 0.2, rx * 0.34, M.acc(), 10), q, s * rx * 0.2, 0, 0, 0, 0, s * PI / 2); q.add(esfera(rx * 0.09, M.acc())); },
    lentes: () => { const { ex, ey, er, sz } = A.cara; for (const s of [-1, 1]) pon(toro(er * 1.2, 0.022, M.oscuro(), PI * 2, { sinContorno: true }), c, s * ex, ey, sz(s * ex, ey) + er * 0.3, 0, s * 0.22); pon(capsula(0.016, Math.max(0.02, ex * 2 - er * 2.4), M.oscuro(), { sinContorno: true }), c, 0, ey, sz(0, ey) + er * 0.35, 0, 0, PI / 2); },
    parche: () => { const { ex, ey, er, sz } = A.cara; pon(esfera(er * 1.15, M.oscuro(), 1, 1, 0.3, { sinContorno: true }), c, ex, ey, sz(ex, ey) + er * 0.3, 0, 0.22); pon(toro(rx * 1.0, 0.018, M.oscuro(), PI * 2, { sinContorno: true }), c, 0, ey * 0.6, 0, PI / 2 - 0.25, 0.2); },
    mascara: () => { const s = pieza(G(new THREE.SphereGeometry(rx * 1.05, 22, 8, 0, PI * 2, PI * 0.56, PI * 0.3)), mat(H(C.accesorio.h, 0.3, 0.2)), { sinContorno: true }); s.scale.set(1, ry / rx, rz / rx); c.add(s); },
    barba: () => pon(esfera(1, M.blanco(), rx * 0.72, ry * 0.62, rz * 0.5), c, 0, -ry * 0.62, rz * 0.6),
    bufanda: () => { pon(toro(rx * 0.86, rx * 0.16, M.acc()), c, 0, -ry * 0.82, 0, PI / 2); pon(caja(rx * 0.3, rx * 0.7, 0.06, M.acc()), c, rx * 0.45, -ry * 0.82 - rx * 0.35, rz * 0.75, 0, 0, 0.15); },
    collar: () => { pon(toro(rx * 0.82, 0.03, M.acc(), PI * 2, { sinContorno: true }), c, 0, -ry * 0.8, 0, PI / 2); pon(esfera(rx * 0.11, M.oro()), c, 0, -ry * 0.86, rz * 0.82); },
    capa: () => { const geo = G(new THREE.CylinderGeometry(tw * 0.64, tw * 0.82, A.altoT * 1.15, 18, 1, true, PI * 0.5, PI)); const m = pieza(geo, mat(C.accesorio, { doble: true }), { sinContorno: true }); pon(m, A.espalda, 0, -A.altoT * 0.12, td * 0.5); },
    mochila: () => pon(caja(tw * 0.56, A.altoT * 0.5, 0.24, M.acc()), A.espalda, 0, 0, -0.1),
    jetpack: () => { for (const s of [-1, 1]) { pon(cil(0.09, 0.09, A.altoT * 0.5, M.metal(), 12), A.espalda, s * 0.11, 0, -0.1); const fl = pon(cono(0.07, 0.2, M.luz(H(30, 1, 0.6)), 8, { sinContorno: true }), A.espalda, s * 0.11, -A.altoT * 0.33, -0.1, PI); P.llamas.push(fl); } },
    aleta: () => { const m = cono(A.altoT * 0.32, A.altoT * 0.5, M.det(), 3); m.scale.x = 0.12; pon(m, A.espalda, 0, 0, -0.12, -PI / 2 + 0.5); },
    alas_extra: () => alas('hada', A.espalda, 1.1),
    espada: () => { const m = P.manos[1]; if (!m) return; const q = grupo(0, 0, 0.02, m); q.rotation.x = 1.25; pon(caja(0.07, 0.62, 0.025, M.metal(), 0.01), q, 0, 0.42, 0); pon(caja(0.24, 0.05, 0.06, M.oro()), q, 0, 0.1, 0); pon(cil(0.03, 0.03, 0.16, M.madera(), 8), q, 0, 0, 0); },
    baston: () => { const m = P.manos[1]; if (!m) return; const q = grupo(0, 0, 0.03, m); q.rotation.z = -0.3; pon(cil(0.028, 0.028, 1.05, M.madera(), 8), q, 0, 0.12, 0); pon(esfera(0.075, M.luz()), q, 0, 0.68, 0); },
    varita: () => { const m = P.manos[1]; if (!m) return; const q = grupo(0, 0, 0.02, m); q.rotation.x = 0.9; pon(cil(0.018, 0.022, 0.46, M.madera(), 8), q, 0, 0.2, 0); pon(esfera(0.07, M.luz(H(50, 1, 0.7))), q, 0, 0.46, 0); },
    escudo: () => { const m = P.manos[0]; if (!m) return; const q = grupo(-0.04, 0.05, 0.08, m); q.rotation.set(PI / 2, 0, 0.2); q.add(cil(0.27, 0.27, 0.05, M.acc(), 20)); pon(esfera(0.08, M.oro(), 1, 0.5, 1), q, 0, 0.04, 0); },
    antena: () => antena(c, 0, techo * 0.92, rx),
    auricular: () => { pon(toro(rx * 1.04, 0.035, M.oscuro(), PI), c, 0, techo - ry + ry * 0.1, 0); for (const s of [-1, 1]) pon(cil(rx * 0.26, rx * 0.26, 0.1, M.acc(), 14), c, s * rx * 1.03, techo - ry + ry * 0.05, 0, 0, 0, PI / 2); },
    cuerno_extra: () => { for (const s of [-1, 1]) pon(cono(rx * 0.14, rx * 0.52, M.hueso(), 10), c, s * rx * 0.46, techo * 0.9, rz * 0.1, 0, 0, -s * 0.4); },
    flor: () => { const q = grupo(rx * 0.2, techo * 0.98, 0, c); pon(cil(0.014, 0.014, 0.14, mat(H(120, 0.6, 0.4)), 6), q, 0, 0.07, 0); const fq = grupo(0, 0.17, 0, q); fq.rotation.x = 0.5; for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; pon(esfera(0.055, mat(H(C.accesorio.h + 160, 0.8, 0.72)), 1, 0.4, 1), fq, Math.cos(a) * 0.075, 0, Math.sin(a) * 0.075); } fq.add(esfera(0.05, mat(H(48, 0.95, 0.6)))); },
    hoja: () => { const q = grupo(0, techo * 0.98, 0, c); pon(cil(0.012, 0.012, 0.12, mat(H(110, 0.5, 0.35)), 6), q, 0, 0.06, 0); pon(esfera(1, mat(H(115, 0.7, 0.5)), 0.11, 0.02, 0.06), q, 0.09, 0.13, 0, 0, 0, 0.5); },
    aureola: () => { const m = pon(toro(rx * 0.56, 0.03, M.oro(), PI * 2, { sinContorno: true }), c, 0, techo + rx * 0.4, 0, PI / 2 - 0.15); m.material.emissiveIntensity = 0.6; },
    cinturon: () => { if (!A.cintura) return; const m = toro(A.cintura.r, 0.045, M.acc()); m.scale.y = td / tw; pon(m, A.cintura.g, 0, A.cintura.y, 0, PI / 2); pon(caja(0.12, 0.1, 0.05, M.oro()), A.cintura.g, 0, A.cintura.y, td * 0.49); },
    burbuja: () => pon(esfera(Math.max(rx, ry) * 1.32, mat(H(195, 0.6, 0.85), { alfa: 0.2 }), 1, 1, 1, { sinContorno: true }), c, 0, techo - ry, 0),
    llama: () => { const q = grupo(0, techo * 0.95, 0, c); pon(cono(rx * 0.3, rx * 0.75, M.luz(H(18, 1, 0.56)), 8, { sinContorno: true }), q, 0, rx * 0.3, 0); pon(cono(rx * 0.17, rx * 0.46, M.luz(H(46, 1, 0.66)), 8, { sinContorno: true }), q, 0, rx * 0.24, 0.02); P.llamas.push(q); },
    cola_extra: () => cola('larga', A.cola),
    sombrero_ala: (e) => { const q = grupo(0, techo * 0.84, 0, c); q.rotation.z = 0.08; q.add(cil(rx * 1.55 * e, rx * 1.55 * e, 0.035, M.madera(), 26)); pon(cil(rx * 0.6 * e, rx * 0.7 * e, rx * 0.62, M.madera(), 18), q, 0, rx * 0.3, 0); pon(toro(rx * 0.7 * e, 0.025, M.acc(), PI * 2, { sinContorno: true }), q, 0, 0.06, 0, PI / 2); },
    antifaz: () => { const { ey } = A.cara; const s = pieza(G(new THREE.SphereGeometry(rx * 1.035, 22, 6, 0, PI * 2, PI * 0.5 - (ey / ry) * 1.1 - 0.3, 0.6)), mat(H(C.accesorio.h, 0.5, 0.2)), { sinContorno: true }); s.scale.set(1, ry / rx, rz / rx); c.add(s); },
    balon: () => { const q = grupo(tw * 0.75 + 0.2, 0.15, 0.25, todo); q.add(esfera(0.15, M.blanco())); for (const [x, y, z] of [[0, 0.13, 0.07], [0.12, 0, 0.09], [-0.1, -0.04, 0.11], [0, -0.1, 0.11], [0.05, 0.06, 0.14]]) pon(esfera(0.05, M.oscuro(), 1, 1, 1, { sinContorno: true }), q, x * 0.82, y * 0.82, z * 0.82); },
  };
  for (const a of spec.accesorios) ACC[a.id]?.(a.escala);

  raiz.scale.setScalar(d.escala);
  // posturas de reposo para poder reiniciar antes de cada cuadro de animación
  const reposo = [];
  raiz.traverse((o) => { if (o.isGroup) reposo.push([o, o.position.clone(), o.rotation.clone(), o.scale.clone()]); });
  P.reiniciar = () => { for (const [o, p, r, s] of reposo) { if (o === raiz) continue; o.position.copy(p); o.rotation.copy(r); o.scale.copy(s); } };
  raiz.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(raiz);
  return {
    raiz, P, alto: bb.max.y, ancho: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z), caja: bb,
    liberar() { for (const b of basura) b.dispose?.(); for (const gr of graficos) gr.remove(); },
  };
}
