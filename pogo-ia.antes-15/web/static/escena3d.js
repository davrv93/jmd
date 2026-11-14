// Pogo IA · el dibujo en 3D con Three.js: tablero en perspectiva con cámara
// fija, robots con resorte de pocos polígonos, sombreado de cómic (tres tonos)
// y contorno negro. Solo lee el estado de tablero.js; no decide nada.
import * as THREE from "./three.module.min.js";
import { N, ROBOTS, VUELO_COHETE } from "./tablero.js";

const TINTA = 0x111111, PAPEL = 0xf5ecd7;
const ALTO_SALTO = 0.95;

// Rampa de tres tonos para MeshToonMaterial: sombra, medio y luz planos.
const rampa = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1);
rampa.minFilter = rampa.magFilter = THREE.NearestFilter;
rampa.needsUpdate = true;
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: rampa, ...extra });
const contornoMat = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide });

// Contorno de cómic por «casco invertido»: una copia algo más grande, negra y por dentro.
function conContorno(malla, grosor = 1.12) {
  const c = new THREE.Mesh(malla.geometry, contornoMat);
  c.scale.setScalar(grosor);
  malla.add(c);
  return malla;
}

function textura(dibujar, w = 256, h = 128) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  dibujar(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function etiqueta(texto, color, mio) {
  const t = textura((g, w, h) => {
    g.font = `italic 900 ${mio ? 62 : 50}px system-ui, sans-serif`;
    const ancho = Math.min(w - 12, g.measureText(texto).width + 34);
    const x = (w - ancho) / 2, y = mio ? 14 : 26, alto = mio ? 74 : 62;
    g.fillStyle = "#111"; g.fillRect(x + 6, y + 6, ancho, alto);
    g.fillStyle = mio ? "#ffd21a" : "#fff"; g.fillRect(x, y, ancho, alto);
    g.lineWidth = 6; g.strokeStyle = "#111"; g.strokeRect(x, y, ancho, alto);
    g.fillStyle = mio ? "#111" : color;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(texto, w / 2, y + alto / 2 + 3);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(1.3, 0.65, 1);
  s.renderOrder = 10;
  return s;
}

// Colores de los poderes (también los usa el halo del suelo y la onda al tomarlos).
export const COLOR_PODER = { chip: 0xffd21a, cohete: 0xff5a36, turbo: 0x24d1ff, triple: 0x8b3dff, balde: 0xff3fa4 };

// Cohete apuntando a +z (para usar lookAt): cuerpo blanco, punta y aletas rojas, llama naranja.
function modeloCohete(escala = 1) {
  const g = new THREE.Group(), dentro = new THREE.Group();
  dentro.rotation.x = Math.PI / 2;   // el modelo se arma en +y; girado queda en +z
  g.add(dentro);
  const rojo = toon(0xe8322f);
  const cuerpo = conContorno(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10), toon(0xf4f4f4)), 1.18);
  dentro.add(cuerpo);
  const punta = conContorno(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 10), rojo), 1.18);
  punta.position.y = 0.22;
  dentro.add(punta);
  for (let k = 0; k < 3; k++) {
    const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.09), rojo);
    const a = (k / 3) * Math.PI * 2;
    aleta.position.set(Math.cos(a) * 0.08, -0.12, Math.sin(a) * 0.08);
    aleta.rotation.y = -a;
    dentro.add(aleta);
  }
  const llama = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), new THREE.MeshBasicMaterial({ color: 0xffa21a }));
  llama.position.y = -0.24; llama.rotation.x = Math.PI;
  dentro.add(llama);
  g.userData.llama = llama;
  g.scale.setScalar(escala);
  return g;
}

function caraTexto(fondo, texto, colorTexto = "#111", tam = 120) {
  return textura((g, w, h) => {
    g.fillStyle = fondo; g.fillRect(0, 0, w, h);
    g.lineWidth = 14; g.strokeStyle = "#111"; g.strokeRect(7, 7, w - 14, h - 14);
    g.fillStyle = colorTexto; g.font = `italic 900 ${tam}px system-ui, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(texto, w / 2, h / 2 + 8);
  }, 256, 256);
}

// Modelo de cada poder tal como espera en el tablero (sin el halo).
function modeloPoder(tipo) {
  if (tipo === "chip") return conContorno(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshToonMaterial({ map: caraTexto("#ffd21a", "IA"), gradientMap: rampa })), 1.1);
  if (tipo === "triple") return conContorno(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshToonMaterial({ map: caraTexto("#8b3dff", "×3", "#fff"), gradientMap: rampa })), 1.1);
  if (tipo === "cohete") { const c = modeloCohete(1.6); c.rotation.x = -Math.PI / 2; return c; }
  if (tipo === "turbo") {
    const f = new THREE.Shape();
    [[0.06, 0.3], [-0.14, -0.02], [0, -0.02], [-0.06, -0.3], [0.14, 0.04], [0, 0.04]].forEach(([x, y], i) => (i ? f.lineTo(x, y) : f.moveTo(x, y)));
    const geo = new THREE.ExtrudeGeometry(f, { depth: 0.1, bevelEnabled: false });
    geo.center();
    return conContorno(new THREE.Mesh(geo, toon(0x24d1ff)), 1.15);
  }
  // Balde: franjas con los colores de los cuatro robots.
  const franjas = textura((g, w, h) => {
    ROBOTS.forEach((r, i) => { g.fillStyle = r.color; g.fillRect((i * w) / 4, 0, w / 4, h); });
    g.fillStyle = "#111"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
  }, 256, 64);
  const b = new THREE.Group();
  b.add(conContorno(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.32, 16), new THREE.MeshToonMaterial({ map: franjas, gradientMap: rampa })), 1.08));
  const asa = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 20, Math.PI), toon(0x111111));
  asa.position.y = 0.16;
  b.add(asa);
  return b;
}

// Resorte: hélice de 6 vueltas, de y = 0 a y = 1 (se escala en y para comprimirlo).
const geoResorte = (() => {
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2 * 6;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.11, i / 120, Math.sin(a) * 0.11));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.025, 6, false);
})();
const LARGO_RESORTE = 0.34;

function crearRobot(id, conNombre, mio) {
  const def = ROBOTS[id];
  const raiz = new THREE.Group();
  const color = toon(def.color), metal = toon(0xd9dde3), oscuro = toon(0x2a2f3a);

  // Sombra redonda sobre la casilla.
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.012;
  raiz.add(sombra);

  const vuelo = new THREE.Group();   // sube y baja con el rebote
  raiz.add(vuelo);
  const pie = conContorno(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 10), oscuro), 1.25);
  pie.position.y = 0.04;
  vuelo.add(pie);
  const resorte = new THREE.Mesh(geoResorte, metal);
  resorte.position.y = 0.08;
  vuelo.add(resorte);

  const arriba = new THREE.Group();  // todo lo que va encima del resorte
  vuelo.add(arriba);
  const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), metal);
  vara.position.y = 0.45;
  arriba.add(vara);
  const manubrio = conContorno(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 8), oscuro), 1.3);
  manubrio.rotation.z = Math.PI / 2; manubrio.position.y = 0.88;
  arriba.add(manubrio);
  const pedales = conContorno(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.12), oscuro), 1.15);
  pedales.position.y = 0.07;
  arriba.add(pedales);

  const cuerpo = new THREE.Group();
  cuerpo.position.set(0, 0.12, -0.14);
  arriba.add(cuerpo);
  for (const s of [-1, 1]) {
    const pierna = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 8), metal);
    pierna.position.set(s * 0.13, 0.12, 0.06);
    cuerpo.add(pierna);
    const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36, 8), metal);
    brazo.position.set(s * 0.22, 0.6, 0.1); brazo.rotation.x = -0.9; brazo.rotation.z = s * 0.25;
    cuerpo.add(brazo);
  }
  const torso = conContorno(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.18, 4, 12), toon(def.claro)), 1.1);
  torso.position.y = 0.5;
  cuerpo.add(torso);
  const panza = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), toon(0xffffff));
  panza.position.set(0, 0.5, 0.205);
  cuerpo.add(panza);
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.92;
  cuerpo.add(cabeza);
  const craneo = conContorno(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.36), color), 1.07);
  cabeza.add(craneo);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.02), toon(0x161b26));
  visor.position.set(0, 0, 0.18);
  cabeza.add(visor);
  const ojoMat = new THREE.MeshBasicMaterial({ color: 0x7ff6ff });
  const ojos = [];
  for (const s of [-1, 1]) {
    const ojo = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), ojoMat);
    ojo.position.set(s * 0.08, 0.01, 0.192);
    cabeza.add(ojo); ojos.push(ojo);
  }
  const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 6), oscuro);
  antena.position.y = 0.26;
  cabeza.add(antena);
  const bola = conContorno(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), color), 1.25);
  bola.position.y = 0.37;
  cabeza.add(bola);

  // Estrellitas de mareo.
  const mareo = new THREE.Group();
  mareo.position.y = 0.42;
  const estrella = new THREE.OctahedronGeometry(0.06);
  for (let k = 0; k < 3; k++) {
    const e = new THREE.Mesh(estrella, new THREE.MeshBasicMaterial({ color: 0xffd21a }));
    e.userData.a = (k / 3) * Math.PI * 2;
    mareo.add(e);
  }
  mareo.visible = false;
  cabeza.add(mareo);

  let nombre = null;
  if (conNombre) {
    nombre = etiqueta(mio ? "¡TÚ!" : def.nombre, def.color, mio);
    nombre.position.y = 2.25;
    raiz.add(nombre);
  }
  // Aura en el suelo: celeste con turbo, morada con triple. Mochila: el cohete guardado, listo para lanzar.
  const aura = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 28), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  aura.rotation.x = -Math.PI / 2; aura.position.y = 0.02; aura.visible = false;
  raiz.add(aura);
  const mochila = modeloCohete(0.9);
  mochila.position.set(0, 0.62, -0.26); mochila.rotation.x = -Math.PI / 2; mochila.visible = false;
  cuerpo.add(mochila);
  raiz.userData = { vuelo, resorte, arriba, cuerpo, cabeza, ojos, sombra, mareo, nombre, aura, mochila, giro: 0 };
  return raiz;
}

const suave = (x) => x * x * (3 - 2 * x);

export function crearEscena(canvas, { nombres = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  escena.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(-4, 10, 6);
  escena.add(sol);

  const centro = (N - 1) / 2;
  const pos = (c, f) => [c - centro, f - centro];

  // Base del tablero: bloque oscuro con borde amarillo y contorno negro.
  const base = new THREE.Mesh(new THREE.BoxGeometry(N + 0.7, 0.5, N + 0.7), toon(0x1d4fd8));
  base.position.y = -0.36;
  conContorno(base, 1.01);
  escena.add(base);
  const marco = new THREE.Mesh(new THREE.BoxGeometry(N + 0.3, 0.3, N + 0.3), toon(0xffd21a));
  marco.position.y = -0.2;
  escena.add(marco);

  // Casillas: una sola malla instanciada (1 llamada de dibujo para las 81) y todas las aristas en un solo
  // LineSegments. Solo se tocan las casillas que cambian de dueño o están rebotando.
  const geoCasilla = new THREE.BoxGeometry(0.92, 0.2, 0.92);
  const casillas = new THREE.InstancedMesh(geoCasilla, toon(0xffffff), N * N);
  const colores = [new THREE.Color(PAPEL), ...ROBOTS.map((r) => new THREE.Color(r.color))];
  // Casillas triples: el mismo color, más oscuro, para que se note cuánto valen.
  const coloresTriple = colores.map((c) => c.clone().multiplyScalar(0.55));
  const aristas = new THREE.EdgesGeometry(geoCasilla).attributes.position.array;
  const lineas = new Float32Array(aristas.length * N * N);
  const matriz = new THREE.Matrix4();
  const dueno = new Int8Array(N * N).fill(-2), valor = new Int8Array(N * N), pop = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) {
    const [x, z] = pos(k % N, Math.floor(k / N));
    casillas.setMatrixAt(k, matriz.makeTranslation(x, -0.1, z));
    casillas.setColorAt(k, colores[0]);
    for (let a = 0; a < aristas.length; a += 3) {
      const o = k * aristas.length + a;
      lineas[o] = aristas[a] + x; lineas[o + 1] = aristas[a + 1] - 0.1; lineas[o + 2] = aristas[a + 2] + z;
    }
  }
  escena.add(casillas);
  const geoLineas = new THREE.BufferGeometry();
  geoLineas.setAttribute("position", new THREE.BufferAttribute(lineas, 3));
  escena.add(new THREE.LineSegments(geoLineas, new THREE.LineBasicMaterial({ color: TINTA })));

  // Poderes: dos de cada tipo armados de antemano (en el tablero hay como mucho dos a la vez). Flotan,
  // giran y tienen un halo de su color en el suelo.
  const geoHalo = new THREE.RingGeometry(0.3, 0.44, 32);
  const poderes = {};
  for (const tipo of Object.keys(COLOR_PODER)) {
    poderes[tipo] = [0, 1].map(() => {
      const g = new THREE.Group();
      const modelo = modeloPoder(tipo);
      g.add(modelo);
      const halo = new THREE.Mesh(geoHalo, new THREE.MeshBasicMaterial({ color: COLOR_PODER[tipo], transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      halo.rotation.x = -Math.PI / 2;
      g.add(halo);
      g.visible = false;
      g.userData = { modelo, halo };
      escena.add(g);
      return g;
    });
  }

  // Cohetes en vuelo: cuatro, reusados.
  const cohetes = Array.from({ length: 4 }, () => { const c = modeloCohete(2.2); c.visible = false; escena.add(c); return c; });
  const desde = new THREE.Vector3(), hasta = new THREE.Vector3(), aqui = new THREE.Vector3();

  // Ondas de los cobros y choques: seis anillos fijos que se reusan (nada se crea durante el juego).
  const geoOnda = new THREE.RingGeometry(0.82, 1, 40);
  const ondas = Array.from({ length: 6 }, () => {
    const o = new THREE.Mesh(geoOnda, new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    o.rotation.x = -Math.PI / 2;
    o.visible = false;
    o.userData = { t: 0, dur: 1, radio: 1 };
    escena.add(o);
    return o;
  });
  function onda(c, f, color, radio, dur = 0.6) {
    const o = ondas.find((x) => !x.visible) || ondas.reduce((a, b) => (a.userData.t / a.userData.dur > b.userData.t / b.userData.dur ? a : b));
    const [x, z] = pos(c, f);
    o.position.set(x, 0.03, z);
    o.material.color.set(color);
    o.userData.t = 0; o.userData.dur = dur; o.userData.radio = radio;
    o.visible = true;
  }

  // Los cuatro robots se arman una sola vez y se reusan en cada ronda (no se crean ni se tiran mallas).
  const robots = ROBOTS.map((_, id) => {
    const g = crearRobot(id, nombres, nombres && id === 0);
    escena.add(g);
    return g;
  });

  let ancho = 1, alto = 1;
  function medir() {
    const caja = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : canvas.getBoundingClientRect();
    ancho = Math.max(1, Math.round(caja.width)); alto = Math.max(1, Math.round(caja.height));
    // Tope de resolución: densidad hasta 1,5 y como mucho ~2,2 millones de píxeles (un proyector 4K o una
    // laptop retina no pagan 4 veces más de GPU por una nitidez que no se nota).
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.2e6 / (ancho * alto))));
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    // Cámara fija mirando el tablero desde arriba y de frente: se aleja hasta que las cuatro esquinas, con
    // la altura de un robot en el salto, caben a lo ancho y a lo alto; luego corre la imagen para centrarlas
    // (arriba deja sitio al marcador).
    camara.clearViewOffset();
    const r = N / 2 + 0.4, v = new THREE.Vector3();
    const puntos = [[-r, -0.6, r], [r, -0.6, r], [-r, 2.4, -r], [r, 2.4, -r], [-r, 0, -r], [r, 0, -r]];
    const techo = nombres ? 1 - 170 / alto : 0.9, piso = -0.94;
    let d = 6, ymin = 0, ymax = 0;
    for (let k = 0; k < 90; k++, d *= 1.03) {
      camara.position.set(0, d * 0.74, d * 0.67);
      camara.lookAt(0, 0, 0);
      camara.updateMatrixWorld();
      let xmax = 0; ymin = Infinity; ymax = -Infinity;
      for (const [x, y, z] of puntos) {
        v.set(x, y, z).project(camara);
        xmax = Math.max(xmax, Math.abs(v.x)); ymin = Math.min(ymin, v.y); ymax = Math.max(ymax, v.y);
      }
      if (xmax < 0.96 && ymax - ymin < techo - piso) break;
    }
    // En vertical (celular) el tablero va pegado arriba, bajo el marcador, y deja abajo sitio a la cruz.
    const meta = camara.aspect < 1 ? techo - 0.06 - (ymax - ymin) / 2 : (techo + piso) / 2;
    const corre = ((ymax + ymin) / 2 - meta) * (alto / 2);
    camara.setViewOffset(ancho, alto, 0, -corre, ancho, alto);
  }
  medir();

  let modelo = null, tPrev = 0;
  function dibujar(m, t) {
    const dt = Math.min(0.1, tPrev ? t - tPrev : 0); tPrev = t;
    // Ronda nueva: el tablero vuelve a papel sin rebote y los robots miran a la cámara.
    if (m !== modelo) { modelo = m; dueno.fill(-2); robots.forEach((g) => { g.rotation.y = 0; g.userData.giro = 0; }); }

    let colorCambio = false, matrizCambio = false;
    for (let k = 0; k < N * N; k++) {
      const d = m.dueno[k];
      if (dueno[k] !== d || valor[k] !== m.valor[k]) {
        valor[k] = m.valor[k];
        casillas.setColorAt(k, (valor[k] === 3 ? coloresTriple : colores)[d + 1]);
        pop[k] = dueno[k] === -2 ? 0 : 1;
        if (dueno[k] === -2) { const [x, z] = pos(k % N, Math.floor(k / N)); casillas.setMatrixAt(k, matriz.makeTranslation(x, -0.1, z)); matrizCambio = true; }
        dueno[k] = d;
        colorCambio = true;
      }
      if (pop[k] > 0) {
        pop[k] = Math.max(0, pop[k] - dt * 4);
        const s = 1 + Math.sin(pop[k] * Math.PI) * 0.6;
        const [x, z] = pos(k % N, Math.floor(k / N));
        casillas.setMatrixAt(k, matriz.makeScale(1, s, 1).setPosition(x, -0.1 + (s - 1) * 0.1, z));
        matrizCambio = true;
      }
    }
    if (colorCambio) casillas.instanceColor.needsUpdate = true;
    if (matrizCambio) casillas.instanceMatrix.needsUpdate = true;

    for (const tipo in poderes) for (const g of poderes[tipo]) g.visible = false;
    for (const p of m.poderes) {
      const g = poderes[p.tipo].find((x) => !x.visible);
      if (!g) continue;
      const [x, z] = pos(p.c, p.f), u = g.userData;
      g.position.set(x, 0, z);
      u.modelo.position.y = 0.5 + Math.sin(t * 3 + x) * 0.1;
      u.modelo.rotation.y = t * 1.8;
      const s = 1 + Math.sin(t * 6) * 0.08;
      u.halo.scale.set(s, s, s);
      // Parpadea los últimos 2 segundos.
      g.visible = p.vida > 2 || Math.sin(t * 22) > 0;
    }

    m.robots.forEach((r, i) => {
      const g = robots[i], u = g.userData;
      // Asiento vacío en la mesa en vivo: sin robot.
      g.visible = !r.ausente;
      if (r.ausente) return;
      const p = Math.min(1, r.fase);
      const [x0, z0] = pos(r.c, r.f), [x1, z1] = pos(r.dc, r.df);
      const k = suave(p);
      g.position.set(x0 + (x1 - x0) * k, 0, z0 + (z1 - z0) * k);
      // Altura del rebote y compresión del resorte: apretado al tocar el suelo, estirado arriba.
      const h = Math.pow(Math.sin(Math.PI * p), 0.8) * ALTO_SALTO;
      const contacto = Math.max(0, 1 - h / 0.25);
      const estira = 1.15 - contacto * 0.55;
      u.vuelo.position.y = h;
      u.resorte.scale.set(1, LARGO_RESORTE * estira, 1);
      u.arriba.position.y = 0.08 + LARGO_RESORTE * estira;
      u.cuerpo.scale.set(1 + contacto * 0.12, 1 - contacto * 0.12, 1 + contacto * 0.12);
      u.sombra.scale.setScalar(1 - h * 0.45);
      u.sombra.material.opacity = 0.32 - h * 0.18;
      // Mira hacia donde va.
      if (r.dc !== r.c || r.df !== r.f) u.giro = Math.atan2(r.dc - r.c, r.df - r.f);
      let dg = u.giro - g.rotation.y;
      dg = Math.atan2(Math.sin(dg), Math.cos(dg));
      g.rotation.y += dg * Math.min(1, dt * 14);
      if (u.nombre) u.nombre.position.y = 2.15 + h;
      // Mareo: estrellitas y cabeza que tambalea.
      u.mareo.visible = r.mareo > 0;
      if (r.mareo > 0) {
        u.mareo.children.forEach((e) => { const a = e.userData.a + t * 6; e.position.set(Math.cos(a) * 0.3, Math.sin(t * 9 + a) * 0.04, Math.sin(a) * 0.3); });
        u.cabeza.rotation.z = Math.sin(t * 10) * 0.25;
      } else u.cabeza.rotation.z *= 0.8;
      u.ojos.forEach((o) => o.scale.set(1, Math.sin(t * 0.9 + i * 2) > 0.985 ? 0.15 : 1, 1));
      u.aura.visible = r.turbo > 0 || r.triple > 0;
      if (u.aura.visible) {
        u.aura.material.color.setHex(r.turbo > 0 ? COLOR_PODER.turbo : COLOR_PODER.triple);
        u.aura.rotation.z = t * 4;
        u.aura.scale.setScalar(1 + Math.sin(t * 12) * 0.08);
      }
      u.mochila.visible = r.cohetes > 0;
    });

    // Cohetes en vuelo: salen de la casilla de quien dispara y persiguen al robot, con una parábola.
    cohetes.forEach((c, k) => {
      const v = m.vuelos[k];
      c.visible = !!v;
      if (!v) return;
      const [x0, z0] = pos(v.c, v.f), q = Math.min(1, v.t / VUELO_COHETE);
      desde.set(x0, 1.3, z0);
      hasta.copy(robots[v.a].position); hasta.y += 1.1;
      const punto = (s, out) => out.lerpVectors(desde, hasta, s).setY(desde.y + (hasta.y - desde.y) * s + Math.sin(Math.PI * s) * 1.6);
      punto(q, c.position);
      c.lookAt(punto(Math.min(1, q + 0.05), aqui));
      c.userData.llama.scale.set(1, 0.7 + Math.random() * 0.6, 1);
    });

    for (const o of ondas) {
      if (!o.visible) continue;
      const ud = o.userData;
      ud.t += dt;
      const q = ud.t / ud.dur;
      o.scale.setScalar(0.2 + q * ud.radio);
      o.material.opacity = 0.9 * (1 - q);
      if (q >= 1) o.visible = false;
    }
    renderer.render(escena, camara);
  }

  function efecto(e) {
    if (e.tipo === "cobro") { onda(e.c, e.f, ROBOTS[e.id].color, 6, 0.9); onda(e.c, e.f, 0x111111, 4.5, 0.7); }
    else if (e.tipo === "tomar") onda(e.c, e.f, COLOR_PODER[e.poder], 1.4, 0.5);
    else if (e.tipo === "impacto") { onda(e.c, e.f, 0xff5a36, 2.2, 0.5); onda(e.c, e.f, 0x111111, 1.6, 0.4); }
    else if (e.tipo === "poder" && e.poder === "balde") { onda(e.c, e.f, ROBOTS[e.id].color, 12, 1.1); onda(e.c, e.f, 0xffffff, 9, 0.9); }
    else if (e.tipo === "choque") onda(e.c, e.f, 0xffffff, 0.8, 0.3);
  }

  // Etiquetas sobre cada robot (mesa en vivo: los nombres de la clase; «¡TÚ!» sobre el propio).
  function etiquetas(lista, mio) {
    robots.forEach((g, i) => {
      const u = g.userData;
      if (u.nombre) { g.remove(u.nombre); u.nombre.material.map.dispose(); u.nombre.material.dispose(); u.nombre = null; }
      const txt = i === mio ? "¡TÚ!" : (lista[i] || "");
      if (!txt) return;
      u.nombre = etiqueta(txt, ROBOTS[i].color, i === mio);
      u.nombre.position.y = 2.25;
      g.add(u.nombre);
    });
  }

  return { medir, dibujar, efecto, etiquetas };
}
