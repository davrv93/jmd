// osito.js — modelo procedural y animación del osito 3D (Three.js).
// Exporta crearEscena(canvas) para montar renderer/luces/suelo y
// crearOsito(scene) que devuelve el controlador del personaje.
//
// Proporciones (estilo Pusheen / Rilakkuma): altura total ~2.2 unidades,
// cabeza ancha y algo achatada que ocupa ~55 % y se solapa con un cuerpo en
// forma de pera casi tan ancho como ella; sin cuello visible.
import * as THREE from 'three';

const REDUCIR_MOVIMIENTO = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Color del LED por ánimo.
export const COLORES_LED = {
  neutral: 0x9ad5ff,
  feliz: 0x7fe3c0,
  pensando: 0xffc46b,
  escuchando: 0x5aa9ff,
  hablando: 0x9ad5ff,
  sorprendido: 0xffe27a,
  triste: 0x7f93b3,
  dormido: 0x5a6a8a,
  emocionado: 0xff8ad1,
};

export const ANIMOS = Object.keys(COLORES_LED);

// Pose objetivo por ánimo. Todo se interpola en update().
// cabX/cabZ: inclinación de cabeza; cabY: altura extra; ojoAp: apertura de párpados (1 = abierto);
// ojoTam: tamaño del ojo; ojoY: mirada vertical; orejaX: orejas adelante (+) o atrás (-);
// orejaZ: orejas abiertas (+) o caídas (-); brazoZ: brazos separados del cuerpo;
// boca: 'u' | 'o' | 'linea' | 'triste'; led: 'fijo' | 'pulso' | 'respira';
// rebote: amplitud del brinco continuo (solo emocionado); rebFrec: frecuencia.
const POSES = {
  neutral:     { cabX: 0,     cabZ: 0,     cabY: 0,     ojoAp: 1,    ojoTam: 1,    ojoY: 0,     orejaX: 0,    orejaZ: 0,     brazoZ: 0,    boca: 'u',      led: 'fijo',    rebote: 0,    rebFrec: 0 },
  feliz:       { cabX: -0.05, cabZ: 0.07,  cabY: 0.01,  ojoAp: 0.78, ojoTam: 1,    ojoY: 0,     orejaX: 0.1,  orejaZ: 0.05,  brazoZ: 0.2,  boca: 'u',      led: 'fijo',    rebote: 0,    rebFrec: 0 },
  pensando:    { cabX: -0.08, cabZ: 0.18,  cabY: 0,     ojoAp: 0.9,  ojoTam: 0.95, ojoY: 0.03,  orejaX: -0.1, orejaZ: -0.05, brazoZ: 0.05, boca: 'linea',  led: 'pulso',   rebote: 0,    rebFrec: 0 },
  escuchando:  { cabX: 0.04,  cabZ: -0.08, cabY: 0.01,  ojoAp: 1,    ojoTam: 1.1,  ojoY: 0.01,  orejaX: 0.35, orejaZ: 0.15,  brazoZ: 0.1,  boca: 'linea',  led: 'respira', rebote: 0,    rebFrec: 0 },
  hablando:    { cabX: 0.02,  cabZ: 0,     cabY: 0,     ojoAp: 1,    ojoTam: 1,    ojoY: 0,     orejaX: 0.1,  orejaZ: 0.05,  brazoZ: 0.12, boca: 'o',      led: 'respira', rebote: 0,    rebFrec: 0 },
  sorprendido: { cabX: 0.1,   cabZ: 0,     cabY: 0.03,  ojoAp: 1,    ojoTam: 1.3,  ojoY: 0.02,  orejaX: 0.4,  orejaZ: 0.25,  brazoZ: 0.5,  boca: 'o',      led: 'pulso',   rebote: 0,    rebFrec: 0 },
  triste:      { cabX: 0.22,  cabZ: -0.06, cabY: -0.05, ojoAp: 0.62, ojoTam: 1,    ojoY: -0.03, orejaX: -0.35, orejaZ: -0.3, brazoZ: -0.15, boca: 'triste', led: 'respira', rebote: 0,   rebFrec: 0 },
  dormido:     { cabX: 0.26,  cabZ: 0.16,  cabY: -0.07, ojoAp: 0.04, ojoTam: 1,    ojoY: 0,     orejaX: -0.25, orejaZ: -0.25, brazoZ: -0.2, boca: 'linea', led: 'respira', rebote: 0,    rebFrec: 0 },
  emocionado:  { cabX: -0.08, cabZ: 0,     cabY: 0.03,  ojoAp: 1,    ojoTam: 1.1,  ojoY: 0.02,  orejaX: 0.25, orejaZ: 0.2,   brazoZ: 1.9,  boca: 'u',      led: 'pulso',   rebote: 0.05, rebFrec: 7 },
};

const COLOR_PELO = 0xc99a6b;
const COLOR_CLARO = 0xf3e3cf;
const COLOR_OREJA = 0xffb3d9;
const COLOR_OJO = 0x1d1b2a;
const COLOR_NARIZ = 0x2b1d22;
const COLOR_TEC = 0x2a2f45;

const peluche = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: false });

// Lerp exponencial independiente del framerate.
const suav = (dt, vel) => 1 - Math.exp(-dt * vel);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Esfera deformada en pera: más ancha abajo (t=1) que arriba (t=0). */
function geometriaPera(radio, arriba = 0.86, abajo = 1.12) {
  const g = new THREE.SphereGeometry(radio, 48, 36);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (radio - y) / (2 * radio);
    const f = lerp(arriba, abajo, Math.sin(t * Math.PI * 0.5));
    pos.setX(i, pos.getX(i) * f);
    pos.setZ(i, pos.getZ(i) * f);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Monta renderer, cámara, luces, suelo y niebla sobre un canvas transparente. */
export function crearEscena(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x14182e, 8, 16);

  // Cámara cerca y un poco por encima: el oso ocupa ~70 % de la altura del cuadro.
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const camBase = new THREE.Vector3(0, 1.9, 5.4);
  camera.position.copy(camBase);
  const mira = new THREE.Vector3(0, 1.18, 0);

  // Luces: hemisférica suave, direccional con sombra, relleno pastel.
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a2f4a, 0.95));
  const sol = new THREE.DirectionalLight(0xfff1e0, 1.7);
  sol.position.set(3, 6, 4.5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.camera.near = 1;
  sol.shadow.camera.far = 20;
  sol.shadow.camera.left = sol.shadow.camera.bottom = -3;
  sol.shadow.camera.right = sol.shadow.camera.top = 3;
  sol.shadow.radius = 6;
  sol.shadow.bias = -0.0005;
  scene.add(sol);
  const relleno = new THREE.PointLight(0xffb3d9, 0.9, 12, 1.6);
  relleno.position.set(-3, 2, 3);
  scene.add(relleno);
  const relleno2 = new THREE.PointLight(0x9ad5ff, 0.7, 12, 1.6);
  relleno2.position.set(3, 1.5, -3);
  scene.add(relleno2);

  // Suelo circular que recibe sombra + anillo tecnológico.
  const suelo = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 64),
    new THREE.ShadowMaterial({ opacity: 0.35 }),
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  scene.add(suelo);
  const disco = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x1b2040, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.55 }),
  );
  disco.rotation.x = -Math.PI / 2;
  disco.position.y = -0.005;
  disco.receiveShadow = true;
  scene.add(disco);
  const anillo = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.025, 12, 96),
    new THREE.MeshStandardMaterial({ color: 0x9ad5ff, emissive: 0x9ad5ff, emissiveIntensity: 0.7, roughness: 0.3 }),
  );
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.01;
  scene.add(anillo);

  const puntero = { x: 0, y: 0 };
  const api = {
    renderer, scene, camera, anillo,
    /** Puntero normalizado en [-1, 1]; mueve la cámara (máx 0.12 rad). */
    apuntar(nx, ny) { puntero.x = clamp(nx, -1, 1); puntero.y = clamp(ny, -1, 1); },
    puntero,
    resize() {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // En formato vertical la cámara se aleja un poco para que quepan las orejas.
      camBase.z = camera.aspect < 0.9 ? 5.9 : 5.4;
      camera.position.z = camBase.z;
      camera.updateProjectionMatrix();
    },
    render(dt) {
      const ang = 0.12;
      const ox = Math.sin(puntero.x * ang) * camBase.z;
      const oy = Math.sin(puntero.y * ang) * camBase.z * 0.5;
      camera.position.x = lerp(camera.position.x, ox, suav(dt, 3));
      camera.position.y = lerp(camera.position.y, camBase.y - oy, suav(dt, 3));
      camera.lookAt(mira);
      renderer.render(scene, camera);
    },
  };
  api.resize();
  return api;
}

/** Construye el osito y devuelve su controlador. */
export function crearOsito(scene) {
  const grupo = new THREE.Group();
  scene.add(grupo);

  const matPelo = peluche(COLOR_PELO);
  const matClaro = peluche(COLOR_CLARO);
  const matOreja = peluche(COLOR_OREJA);
  const matNariz = new THREE.MeshStandardMaterial({ color: COLOR_NARIZ, roughness: 0.45, metalness: 0 });
  const matTec = new THREE.MeshStandardMaterial({ color: COLOR_TEC, roughness: 0.35, metalness: 0.6 });

  const sombra = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- Cuerpo en forma de pera (centro 0.72; va de 0.10 a 1.34) ----
  const CUERPO_Y = 0.72;
  const CUERPO_ESC = new THREE.Vector3(1, 1.1, 0.92);
  const cuerpo = sombra(new THREE.Mesh(geometriaPera(0.56), matPelo));
  cuerpo.position.y = CUERPO_Y;
  cuerpo.scale.copy(CUERPO_ESC);
  grupo.add(cuerpo);

  // Vientre claro, achatado, al frente.
  const VIENTRE_ESC = new THREE.Vector3(1, 1.1, 0.42);
  const vientre = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.31, 36, 28), matClaro));
  vientre.position.set(0, 0.6, 0.45);
  vientre.scale.copy(VIENTRE_ESC);
  grupo.add(vientre);

  // Parche pequeño con corazón que late, dentro del vientre (arriba).
  const parche = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.02), matTec);
  parche.position.set(0, 0.8, 0.585);
  parche.rotation.x = -0.32;
  grupo.add(parche);
  const formaCorazon = new THREE.Shape();
  formaCorazon.moveTo(0, -0.5);
  formaCorazon.bezierCurveTo(-0.9, 0.2, -0.5, 0.9, 0, 0.45);
  formaCorazon.bezierCurveTo(0.5, 0.9, 0.9, 0.2, 0, -0.5);
  const matCorazon = new THREE.MeshStandardMaterial({ color: 0xff6fb5, emissive: 0xff6fb5, emissiveIntensity: 1.2, roughness: 0.3 });
  const corazon = new THREE.Mesh(new THREE.ExtrudeGeometry(formaCorazon, { depth: 0.25, bevelEnabled: false }), matCorazon);
  const CORAZON_ESC = 0.055;
  corazon.scale.setScalar(CORAZON_ESC);
  corazon.position.set(0, 0.805, 0.602);
  corazon.rotation.x = -0.32;
  grupo.add(corazon);

  // ---- Patitas al frente, sentado, con planta clara ----
  const patas = [];
  for (const lado of [-1, 1]) {
    const pata = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.18, 8, 24), matPelo));
    pata.position.set(lado * 0.3, 0.15, 0.38);
    pata.rotation.x = Math.PI / 2;
    grupo.add(pata);
    const planta = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 16), matClaro);
    planta.position.set(lado * 0.3, 0.16, 0.565);
    planta.scale.set(1, 1.1, 0.35);
    grupo.add(planta);
    patas.push(pata);
  }

  // ---- Brazos: cápsulas cortas pegadas al cuerpo, inclinadas hacia adelante ----
  const brazos = [];
  const BRAZO_Z = 0.22; // separación base del cuerpo
  const BRAZO_X = -0.45; // inclinación hacia adelante
  for (const lado of [-1, 1]) {
    const pivote = new THREE.Group();
    pivote.position.set(lado * 0.47, 1.0, 0.12);
    const brazo = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 8, 24), matPelo));
    brazo.position.y = -0.2;
    pivote.add(brazo);
    pivote.userData.lado = lado;
    pivote.rotation.z = lado * BRAZO_Z;
    pivote.rotation.x = BRAZO_X;
    grupo.add(pivote);
    brazos.push(pivote);
  }

  // ---- Cabeza ancha y algo achatada (centro 1.62; va de 1.08 a 2.16) ----
  const CABEZA_Y = 1.62;
  const cabeza = new THREE.Group();
  cabeza.position.y = CABEZA_Y;
  cabeza.scale.setScalar(1.08); // la cabeza manda: ~55 % de la altura
  grupo.add(cabeza);
  const craneo = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.6, 48, 36), matPelo));
  craneo.scale.set(1, 0.9, 0.95);
  cabeza.add(craneo);

  // Orejas: esferas achatadas arriba, a 45°, medio hundidas, con interior rosado.
  const orejas = [];
  for (const lado of [-1, 1]) {
    const pivote = new THREE.Group();
    pivote.position.set(lado * 0.44, 0.4, -0.04);
    const oreja = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), matPelo));
    oreja.scale.set(1, 0.9, 0.7);
    pivote.add(oreja);
    const interior = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 16), matOreja);
    interior.position.set(0, 0, 0.11);
    interior.scale.set(1, 0.95, 0.35);
    pivote.add(interior);
    pivote.userData.lado = lado;
    cabeza.add(pivote);
    orejas.push(pivote);
  }

  // Hocico claro en la mitad inferior de la cara; nariz oscura encima; boca debajo.
  const hocico = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 24), matClaro));
  hocico.position.set(0, -0.17, 0.45);
  hocico.scale.set(1, 0.72, 0.62);
  cabeza.add(hocico);
  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), matNariz);
  nariz.position.set(0, -0.06, 0.62);
  nariz.scale.set(1.35, 0.85, 0.7);
  cabeza.add(nariz);

  // Boca: tres geometrías intercambiables (U, O, línea). "triste" es la U invertida.
  const matBoca = new THREE.MeshStandardMaterial({ color: 0x5a3238, roughness: 0.6 });
  const bocaU = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 10, 32, Math.PI), matBoca);
  bocaU.rotation.z = Math.PI;
  const bocaO = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.016, 10, 32), new THREE.MeshStandardMaterial({ color: 0x4a2630, roughness: 0.6 }));
  const bocaInterior = new THREE.Mesh(new THREE.CircleGeometry(0.036, 24), new THREE.MeshStandardMaterial({ color: 0x2a141c, roughness: 0.9 }));
  bocaO.add(bocaInterior);
  const bocaLinea = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 0.016), matBoca);
  const boca = new THREE.Group();
  boca.position.set(0, -0.235, 0.615);
  boca.add(bocaU, bocaO, bocaLinea);
  cabeza.add(boca);

  // Ojos medianos: esfera oscura + reflejo; párpado = esfera del pelaje que baja.
  const OJO_X = 0.21;
  const OJO_Y = 0.06;
  const OJO_Z = 0.49;
  const PARPADO_R = 0.084;
  const ojos = [];
  const parpados = [];
  const matOjo = new THREE.MeshPhysicalMaterial({ color: COLOR_OJO, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
  const matBrillo = new THREE.MeshBasicMaterial({ color: 0xffffff });
  // El párpado lleva algo de emisivo para que su cara inferior no se vea como una ceja oscura.
  const matParpado = new THREE.MeshStandardMaterial({ color: COLOR_PELO, emissive: COLOR_PELO, emissiveIntensity: 0.28, roughness: 0.9, metalness: 0 });
  for (const lado of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(lado * OJO_X, OJO_Y, OJO_Z);
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.072, 32, 24), matOjo);
    g.add(ojo);
    const brillo = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), matBrillo);
    brillo.position.set(0.024, 0.028, 0.058);
    g.add(brillo);
    cabeza.add(g);
    ojos.push(g);
    const parpado = new THREE.Mesh(new THREE.SphereGeometry(PARPADO_R, 24, 16), matParpado);
    parpado.position.set(lado * OJO_X, OJO_Y, OJO_Z);
    parpado.visible = false;
    cabeza.add(parpado);
    parpados.push(parpado);
  }

  // Mejillas rosadas semitransparentes, bajo los ojos y hacia afuera.
  const matMejilla = new THREE.MeshBasicMaterial({ color: 0xff8fc4, transparent: true, opacity: 0.4, depthWrite: false });
  for (const lado of [-1, 1]) {
    const mejilla = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), matMejilla);
    mejilla.position.set(lado * 0.37, -0.09, 0.45);
    mejilla.rotation.y = lado * 0.62;
    mejilla.rotation.x = -0.1;
    cabeza.add(mejilla);
  }

  // Auricular fino tipo diadema: toro delgado sobre la cabeza, de oreja a oreja.
  const diadema = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.013, 8, 64, Math.PI - 1.2), matTec);
  diadema.rotation.z = 0.6;
  diadema.scale.set(1.04, 0.95, 1);
  diadema.position.set(0, 0.02, -0.08);
  cabeza.add(diadema);
  // Cápsula LED emisiva en la oreja derecha (pegada al pivote para que acompañe el gesto).
  const matLed = new THREE.MeshStandardMaterial({ color: 0x9ad5ff, emissive: 0x9ad5ff, emissiveIntensity: 1.6, roughness: 0.2 });
  const led = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.05, 6, 16), matLed);
  led.position.set(0.165, -0.05, 0.08);
  led.rotation.z = -0.8;
  orejas[1].add(led);
  const luzLed = new THREE.PointLight(0x9ad5ff, 0.5, 2, 2);
  luzLed.position.set(0.22, -0.05, 0.15);
  orejas[1].add(luzLed);

  // Sprite "zzz" para dormido.
  const zzz = crearSpriteTexto('z z z');
  zzz.position.set(0.6, 0.72, 0.2);
  zzz.scale.set(0.7, 0.35, 1);
  zzz.visible = false;
  cabeza.add(zzz);

  // ---- Estado interno ----
  const claves = ['cabX', 'cabZ', 'cabY', 'ojoAp', 'ojoTam', 'ojoY', 'orejaX', 'orejaZ', 'brazoZ', 'bocaU', 'bocaO', 'bocaLinea', 'bocaInv'];
  const estado = {
    animo: 'neutral',
    pose: null,
    actual: { cabX: 0, cabZ: 0, cabY: 0, ojoAp: 1, ojoTam: 1, ojoY: 0, orejaX: 0, orejaZ: 0, brazoZ: 0, bocaU: 1, bocaO: 0, bocaLinea: 0, bocaInv: 0 },
    ledColor: new THREE.Color(COLORES_LED.neutral),
    ledObjetivo: new THREE.Color(COLORES_LED.neutral),
    t: 0,
    hablaHasta: 0,
    escuchando: false,
    parpadeo: { en: 0, prox: 2 + Math.random() * 3 },
    saludo: 0,
    saltoY: 0,
    saltoV: 0,
    mirada: { x: 0, y: 0 },
    factorMov: REDUCIR_MOVIMIENTO ? 0 : 1,
  };

  function aplicarPose(nombre) {
    const p = POSES[nombre] || POSES.neutral;
    estado.pose = {
      ...p,
      bocaU: p.boca === 'u' || p.boca === 'triste' ? 1 : 0,
      bocaO: p.boca === 'o' ? 1 : 0,
      bocaLinea: p.boca === 'linea' ? 1 : 0,
      bocaInv: p.boca === 'triste' ? 1 : 0,
    };
    estado.ledObjetivo.setHex(COLORES_LED[nombre] ?? COLORES_LED.neutral);
  }

  // Velocidad inicial para un salto de `alto` unidades con gravedad 12.
  const impulso = (alto) => Math.sqrt(2 * 12 * alto);

  const api = {
    grupo,
    get animo() { return estado.animo; },
    /** Cambia el ánimo con transición suave. */
    setAnimo(nombre) {
      if (!POSES[nombre]) nombre = 'neutral';
      const anterior = estado.animo;
      estado.animo = nombre;
      aplicarPose(nombre);
      // Salto pequeño (0.15) solo al sorprenderse o emocionarse; nada si se reduce el movimiento.
      if ((nombre === 'sorprendido' || nombre === 'emocionado') && anterior !== nombre && estado.factorMov) {
        estado.saltoV = impulso(0.15);
      }
    },
    /** Mueve la boca durante `ms` milisegundos. */
    hablar(ms) { estado.hablaHasta = performance.now() + Math.max(200, ms || 0); },
    /** Modo escucha (orejas adelante, LED azul). */
    escuchar(activo) {
      estado.escuchando = !!activo;
      api.setAnimo(activo ? 'escuchando' : 'neutral');
    },
    parpadear() { estado.parpadeo.en = 0.001; },
    /** Saludo con el brazo derecho (~1,8 s). */
    saludar() { estado.saludo = 1.8; },
    /** Hacia dónde mira (puntero normalizado en [-1, 1]). */
    mirar(nx, ny) { estado.mirada.x = clamp(nx, -1, 1); estado.mirada.y = clamp(ny, -1, 1); },
    update(dt) {
      dt = Math.min(dt, 0.1);
      estado.t += dt;
      const { t, pose, actual, factorMov } = estado;
      const k = suav(dt, 5);
      const ahora = performance.now();
      const hablando = ahora < estado.hablaHasta;

      // Interpolación de la pose.
      for (const key of claves) actual[key] = lerp(actual[key], pose[key], k);
      // Al hablar, la boca O manda aunque el ánimo diga otra cosa.
      if (hablando) {
        actual.bocaO = lerp(actual.bocaO, 1, suav(dt, 12));
        actual.bocaU = lerp(actual.bocaU, 0, suav(dt, 12));
        actual.bocaLinea = lerp(actual.bocaLinea, 0, suav(dt, 12));
      }

      // Respiración sutil solo en el cuerpo y el vientre; balanceo leve.
      const resp = 1 + 0.012 * Math.sin(t * 2.1) * factorMov;
      cuerpo.scale.set(CUERPO_ESC.x, CUERPO_ESC.y * resp, CUERPO_ESC.z);
      vientre.scale.set(VIENTRE_ESC.x, VIENTRE_ESC.y * resp, VIENTRE_ESC.z);
      grupo.rotation.z = 0.015 * Math.sin(t * 0.9) * factorMov;
      grupo.rotation.y = 0.025 * Math.sin(t * 0.6) * factorMov;

      // Brinco continuo (solo emocionado) y salto físico simple.
      let rebote = 0;
      if (pose.rebote && factorMov) rebote = Math.abs(Math.sin(t * pose.rebFrec)) * pose.rebote;
      if (estado.saltoV !== 0 || estado.saltoY > 0) {
        estado.saltoV -= 12 * dt;
        estado.saltoY += estado.saltoV * dt;
        if (estado.saltoY <= 0) { estado.saltoY = 0; estado.saltoV = 0; }
      }
      grupo.position.y = rebote + estado.saltoY;

      // Cabeza: pose + seguir el puntero (límite ±0.25 rad) + gesto al hablar / dormir.
      const sigueX = clamp(estado.mirada.y * 0.2, -0.25, 0.25);
      const sigueY = clamp(estado.mirada.x * 0.25, -0.25, 0.25);
      let cabX = actual.cabX + sigueX;
      let cabZ = actual.cabZ;
      if (hablando) cabX += Math.sin(t * 9) * 0.015 * factorMov;
      if (estado.animo === 'dormido') cabZ += Math.sin(t * 1.2) * 0.025 * factorMov;
      if (estado.animo === 'pensando') cabZ += Math.sin(t * 1.6) * 0.02 * factorMov;
      cabeza.rotation.x = lerp(cabeza.rotation.x, cabX, suav(dt, 6));
      cabeza.rotation.y = lerp(cabeza.rotation.y, sigueY, suav(dt, 6));
      cabeza.rotation.z = lerp(cabeza.rotation.z, cabZ, suav(dt, 6));
      cabeza.position.y = CABEZA_Y + actual.cabY;

      // Parpadeo cada 3-6 s.
      const pp = estado.parpadeo;
      let cierre = 0;
      if (pp.en > 0) {
        pp.en += dt;
        const d = 0.2;
        cierre = pp.en < d ? Math.sin((pp.en / d) * Math.PI) : 0;
        if (pp.en >= d) { pp.en = 0; pp.prox = 3 + Math.random() * 3; }
      } else {
        pp.prox -= dt;
        if (pp.prox <= 0 && estado.animo !== 'dormido') pp.en = 0.001;
      }
      // Cierre total del párpado: lo que pide el ánimo más el parpadeo.
      const cerrado = clamp(Math.max(1 - actual.ojoAp, cierre), 0, 1);
      for (let i = 0; i < 2; i++) {
        const g = ojos[i];
        const lado = i === 0 ? -1 : 1;
        g.scale.setScalar(actual.ojoTam);
        g.position.y = OJO_Y + actual.ojoY + estado.mirada.y * -0.012;
        g.position.x = lado * OJO_X + estado.mirada.x * 0.015;
        const p = parpados[i];
        p.visible = cerrado > 0.02;
        const r = PARPADO_R * actual.ojoTam;
        p.scale.set(actual.ojoTam, Math.max(0.01, cerrado) * actual.ojoTam, actual.ojoTam);
        p.position.set(g.position.x, g.position.y + r * (1 - cerrado), OJO_Z);
      }

      // Orejas adelante/atrás y abiertas/caídas, con un meneo al escuchar.
      for (const o of orejas) {
        const lado = o.userData.lado;
        const meneo = estado.animo === 'escuchando' ? Math.sin(t * 6 + lado) * 0.05 * factorMov : 0;
        o.rotation.x = -actual.orejaX + meneo;
        o.rotation.z = lado * -actual.orejaZ;
      }

      // Boca: visibilidad y escala por estado; al hablar abre y cierra.
      bocaU.visible = actual.bocaU > 0.05;
      bocaO.visible = actual.bocaO > 0.05;
      bocaLinea.visible = actual.bocaLinea > 0.05;
      bocaU.scale.setScalar(Math.max(0.01, actual.bocaU));
      bocaU.rotation.z = Math.PI - actual.bocaInv * Math.PI;
      bocaU.position.y = actual.bocaInv * -0.045;
      bocaLinea.scale.set(Math.max(0.01, actual.bocaLinea), 1, 1);
      let aperturaO = actual.bocaO;
      if (hablando) {
        const onda = 0.55 + 0.45 * Math.sin(t * 17) * Math.sin(t * 7.3 + 1);
        aperturaO *= 0.35 + onda * 0.9;
      }
      bocaO.scale.set(Math.max(0.01, actual.bocaO), Math.max(0.01, aperturaO), 1);

      // Brazos: pose, saludo y agitación al emocionarse.
      estado.saludo = Math.max(0, estado.saludo - dt);
      for (const b of brazos) {
        const lado = b.userData.lado;
        let z = lado * (BRAZO_Z + actual.brazoZ);
        let x = BRAZO_X;
        if (estado.animo === 'emocionado' && factorMov) z += lado * Math.sin(t * 14) * 0.12;
        if (lado === 1 && estado.saludo > 0) {
          z = 2.3 + Math.sin(t * 12) * 0.3 * (factorMov || 0.2);
          x = -0.2;
        }
        b.rotation.z = lerp(b.rotation.z, z, suav(dt, 7));
        b.rotation.x = lerp(b.rotation.x, x, suav(dt, 7));
      }

      // LED: color según ánimo; intensidad fija, pulso o respiración.
      estado.ledColor.lerp(estado.ledObjetivo, suav(dt, 4));
      matLed.color.copy(estado.ledColor);
      matLed.emissive.copy(estado.ledColor);
      luzLed.color.copy(estado.ledColor);
      let intensidad = 1.6;
      if (pose.led === 'pulso') intensidad = 1 + Math.max(0, Math.sin(t * 6)) * 1.4;
      else if (pose.led === 'respira') intensidad = 1.1 + (Math.sin(t * 2.2) + 1) * 0.5;
      matLed.emissiveIntensity = intensidad;
      luzLed.intensity = intensidad * 0.3;

      // Corazón del pecho latiendo.
      const latido = 1 + Math.pow(Math.max(0, Math.sin(t * 2.6)), 6) * 0.22;
      corazon.scale.setScalar(CORAZON_ESC * latido);
      matCorazon.emissiveIntensity = 0.9 + (latido - 1) * 2.5;

      // zzz flotando.
      zzz.visible = estado.animo === 'dormido';
      if (zzz.visible) {
        zzz.position.y = 0.72 + Math.sin(t * 1.5) * 0.06 * factorMov;
        zzz.material.opacity = 0.55 + Math.sin(t * 1.5) * 0.3;
      }
    },
  };

  aplicarPose('neutral');
  return api;
}

/** Sprite con texto dibujado en un canvas 2D (para el "zzz"). */
function crearSpriteTexto(texto) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.font = 'italic 700 64px Nunito, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9ad5ff';
  ctx.shadowColor = 'rgba(154,213,255,.8)';
  ctx.shadowBlur = 16;
  ctx.fillText(texto, 128, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false });
  return new THREE.Sprite(mat);
}
