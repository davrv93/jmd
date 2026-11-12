// Forja · objetos del juego (monedas, gemas, cofres…) con el mismo estilo toon y contorno que los personajes.
// El color sale de la tabla «objeto» (objeto x variante). Cada uno mide ~1 unidad y gira sobre Y para animarse.
import * as THREE from 'three';

const PI = Math.PI;
export const NOMBRES = { moneda: 'Moneda', gema: 'Gema', corazon: 'Corazón', llave: 'Llave', cofre: 'Cofre', pocion: 'Poción', estrella: 'Estrella', bomba: 'Bomba', proyectil: 'Proyectil', meta: 'Meta', balon: 'Balón' };

export function construirObjeto(id, regla) {
  const [h, s, l, em] = regla, basura = [], raiz = new THREE.Group();
  const grad = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true; basura.push(grad);
  const col = (hh, ss, ll) => new THREE.Color().setHSL((((hh % 360) + 360) % 360) / 360, ss, ll, THREE.SRGBColorSpace);
  const mat = (hh, ss, ll, luz = 0, alfa = 1) => { const m = new THREE.MeshToonMaterial({ color: col(hh, ss, ll), gradientMap: grad }); if (luz) { m.emissive = col(hh, ss, ll); m.emissiveIntensity = luz; } if (alfa < 1) { m.transparent = true; m.opacity = alfa; m.depthWrite = false; } basura.push(m); return m; };
  const negro = new THREE.MeshBasicMaterial({ color: 0x120e1a, side: THREE.BackSide }); basura.push(negro);
  const pieza = (geo, m, x = 0, y = 0, z = 0, sin = false) => { basura.push(geo); const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (!sin) { geo.computeBoundingSphere(); const c = new THREE.Mesh(geo, negro); c.scale.setScalar(Math.min(1.3, 1 + 0.035 / Math.max(geo.boundingSphere.radius, 0.03))); o.add(c); } raiz.add(o); return o; };
  const P = mat(h, s, l, em), oro = mat(46, 0.9, 0.56, 0.15), claro = mat(h, s * 0.6, Math.min(0.92, l + 0.25), em);

  switch (id) {
    case 'moneda': pieza(new THREE.CylinderGeometry(0.4, 0.4, 0.09, 28), P).rotation.x = PI / 2; pieza(new THREE.CylinderGeometry(0.27, 0.27, 0.11, 24), claro, 0, 0, 0, true).rotation.x = PI / 2; break;
    case 'gema': pieza(new THREE.OctahedronGeometry(0.42), P).scale.y = 1.25; pieza(new THREE.OctahedronGeometry(0.2), claro, 0.05, 0.14, 0.2, true); break;
    case 'corazon': for (const sx of [-1, 1]) pieza(new THREE.SphereGeometry(0.25, 18, 14), P, sx * 0.17, 0.12, 0).scale.z = 0.7; { const c = pieza(new THREE.ConeGeometry(0.4, 0.52, 18), P, 0, -0.2, 0); c.rotation.x = PI; c.scale.z = 0.62; } break;
    case 'llave': pieza(new THREE.TorusGeometry(0.17, 0.06, 8, 20), P, 0, 0.25, 0); pieza(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 10), P, 0, -0.15, 0); pieza(new THREE.BoxGeometry(0.16, 0.06, 0.06), P, 0.09, -0.36, 0); pieza(new THREE.BoxGeometry(0.12, 0.06, 0.06), P, 0.07, -0.24, 0); break;
    case 'cofre': {
      pieza(new THREE.BoxGeometry(0.76, 0.4, 0.5), P, 0, -0.16, 0);
      const t = pieza(new THREE.CylinderGeometry(0.25, 0.25, 0.76, 16, 1, false, 0, PI), P, 0, 0.04, 0); t.rotation.set(0, 0, PI / 2);
      pieza(new THREE.BoxGeometry(0.78, 0.07, 0.52), oro, 0, 0.04, 0); pieza(new THREE.BoxGeometry(0.14, 0.18, 0.06), oro, 0, 0, 0.27); break;
    }
    case 'pocion': pieza(new THREE.SphereGeometry(0.3, 20, 16), P, 0, -0.12, 0); pieza(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 12), mat(200, 0.25, 0.86, 0, 0.9), 0, 0.22, 0); pieza(new THREE.CylinderGeometry(0.11, 0.1, 0.1, 12), mat(28, 0.5, 0.4), 0, 0.37, 0); pieza(new THREE.SphereGeometry(0.07, 10, 8), mat(0, 0, 1, 0.5), -0.11, -0.02, 0.24, true); break;
    case 'estrella': { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.2 : 0.46, a = PI / 2 + i * PI / 5; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }); g.center(); pieza(g, P); break; }
    case 'bomba': pieza(new THREE.SphereGeometry(0.36, 22, 16), P, 0, -0.06, 0); pieza(new THREE.CylinderGeometry(0.08, 0.1, 0.1, 10), mat(0, 0, 0.4), 0, 0.3, 0); pieza(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), mat(30, 0.4, 0.5), 0.04, 0.42, 0, true).rotation.z = -0.4; pieza(new THREE.SphereGeometry(0.07, 10, 8), mat(40, 1, 0.6, 1), 0.09, 0.51, 0, true); pieza(new THREE.SphereGeometry(0.08, 10, 8), mat(0, 0, 1, 0.6), -0.13, 0.08, 0.28, true); break;
    case 'proyectil': pieza(new THREE.SphereGeometry(0.22, 18, 14), mat(h, s, Math.min(0.9, l + 0.2), 1), 0, 0, 0, true); pieza(new THREE.SphereGeometry(0.36, 18, 14), mat(h, s, l, 0.6, 0.4), 0, 0, 0, true); { const c = pieza(new THREE.ConeGeometry(0.2, 0.5, 12), mat(h, s, l, 0.6, 0.5), -0.3, 0, 0, true); c.rotation.z = -PI / 2; } break;
    case 'meta': pieza(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), mat(0, 0, 0.85), -0.25, 0, 0); pieza(new THREE.SphereGeometry(0.07, 10, 8), oro, -0.25, 0.52, 0); pieza(new THREE.BoxGeometry(0.5, 0.32, 0.03), P, 0.03, 0.3, 0); break;
    case 'balon': pieza(new THREE.SphereGeometry(0.4, 22, 16), P); for (const [x, y, z] of [[0, 0, 1], [0.75, 0.4, 0.5], [-0.75, 0.4, 0.5], [0.45, -0.75, 0.5], [-0.45, -0.75, 0.5], [0, 0.85, -0.5], [0.8, -0.2, -0.55], [-0.8, -0.2, -0.55], [0, -0.5, -0.86]]) pieza(new THREE.SphereGeometry(0.13, 10, 8), mat(0, 0, 0.1), x * 0.33, y * 0.33, z * 0.33, true); break;
    default: pieza(new THREE.BoxGeometry(0.5, 0.5, 0.5), P);
  }
  return { raiz, gira: !['cofre', 'proyectil', 'meta', 'bomba', 'corazon'].includes(id), late: ['corazon', 'proyectil', 'bomba'].includes(id), liberar() { for (const b of basura) b.dispose?.(); } };
}
