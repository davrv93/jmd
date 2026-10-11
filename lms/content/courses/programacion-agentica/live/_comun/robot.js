// robot.js — modelo procedural y animación del robotito (Three.js).
// Exporta crearRobot(scene) con EXACTAMENTE la misma API que crearOsito:
// { grupo, animo, setAnimo, hablar(ms), escuchar(bool), parpadear, saludar, mirar, update(dt) }.
//
// Estilo: robot mascota redondeado y lustroso. Cabeza en caja muy redondeada
// (~45 % de la altura), visor azul marino en forma de píldora que abraza la
// curvatura del frente, ojos grandes luminosos celestes y boca de luz pequeña.
// Carcasa blanca con clearcoat, acentos azules, cuerpo ovoide pequeño.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { COLORES_LED } from './osito.js';

const REDUCIR_MOVIMIENTO = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Paleta.
const COLOR_CARCASA = 0xf4f6fb;
const COLOR_AZUL = 0x2f6bff;
const COLOR_VISOR = 0x162040;
const COLOR_OJO = 0x6fe3ff;
const COLOR_RUBOR = 0x8fb8ff;

// Dimensiones de la cabeza (caja redondeada con radio grande: sin esquinas visibles).
const CAB_ANCHO = 1.15, CAB_ALTO = 0.98, CAB_FONDO = 0.95, CAB_RADIO = 0.44;
const CABEZA_Y = 1.62;
// Visor: píldora centrada un poco por encima del medio de la cara.
const VISOR_W = 0.46, VISOR_H = 0.235, VISOR_Y = 0.05;
// Ojos: grandes y bien separados.
const OJO_X = 0.21, OJO_Y = VISOR_Y + 0.03, OJO_R = 0.115;
const BOCA_Y = VISOR_Y - 0.135;

// Pose objetivo por ánimo. Todo se interpola en update().
// cabX/cabZ: inclinación de cabeza; cabY: altura extra; ojoAp: apertura vertical;
// ojoTam: tamaño; ojoIncl: inclinación (negativo = extremos exteriores caídos);
// ojoY: desplazamiento vertical de la mirada; ojoIzq: escala extra del ojo izquierdo;
// masc: 'no' | 'feliz' (media luna sonriente) | 'triste' (párpado caído);
// boca: 'u' | 'o' | 'linea' | 'triste'; brazoZ: brazos separados del cuerpo;
// led: 'fijo' | 'pulso' | 'respira'; rebote: amplitud del brinco continuo; rebFrec: frecuencia.
const POSES = {
  neutral:     { cabX: 0,     cabZ: 0,     cabY: 0,     ojoAp: 1,   ojoTam: 1,    ojoIncl: 0,     ojoY: 0,    ojoIzq: 1,    masc: 'no',     boca: 'linea',  brazoZ: 0,     led: 'fijo',    rebote: 0,    rebFrec: 0 },
  feliz:       { cabX: -0.05, cabZ: 0.07,  cabY: 0.01,  ojoAp: 1,   ojoTam: 1.05, ojoIncl: 0,     ojoY: 0,    ojoIzq: 1,    masc: 'feliz',  boca: 'u',      brazoZ: 0.25,  led: 'fijo',    rebote: 0,    rebFrec: 0 },
  pensando:    { cabX: -0.08, cabZ: 0.18,  cabY: 0,     ojoAp: 0.9, ojoTam: 0.95, ojoIncl: 0,     ojoY: 0.035, ojoIzq: 0.78, masc: 'no',     boca: 'linea',  brazoZ: 0.05,  led: 'pulso',   rebote: 0,    rebFrec: 0 },
  escuchando:  { cabX: 0.04,  cabZ: -0.08, cabY: 0.01,  ojoAp: 1,   ojoTam: 1.14, ojoIncl: 0,     ojoY: 0.01, ojoIzq: 1,    masc: 'no',     boca: 'linea',  brazoZ: 0.1,   led: 'respira', rebote: 0,    rebFrec: 0 },
  hablando:    { cabX: 0.02,  cabZ: 0,     cabY: 0,     ojoAp: 1,   ojoTam: 1,    ojoIncl: 0,     ojoY: 0,    ojoIzq: 1,    masc: 'no',     boca: 'o',      brazoZ: 0.12,  led: 'respira', rebote: 0,    rebFrec: 0 },
  sorprendido: { cabX: 0.1,   cabZ: 0,     cabY: 0.03,  ojoAp: 1,   ojoTam: 1.32, ojoIncl: 0,     ojoY: 0.01, ojoIzq: 1,    masc: 'no',     boca: 'o',      brazoZ: 0.55,  led: 'pulso',   rebote: 0,    rebFrec: 0 },
  triste:      { cabX: 0.22,  cabZ: -0.06, cabY: -0.05, ojoAp: 0.9, ojoTam: 1,    ojoIncl: -0.35, ojoY: -0.02, ojoIzq: 1,   masc: 'triste', boca: 'triste', brazoZ: -0.15, led: 'respira', rebote: 0,    rebFrec: 0 },
  dormido:     { cabX: 0.26,  cabZ: 0.16,  cabY: -0.07, ojoAp: 0.1, ojoTam: 1,    ojoIncl: 0,     ojoY: 0,    ojoIzq: 1,    masc: 'no',     boca: 'linea',  brazoZ: -0.2,  led: 'respira', rebote: 0,    rebFrec: 0 },
  emocionado:  { cabX: -0.08, cabZ: 0,     cabY: 0.03,  ojoAp: 1,   ojoTam: 1.1,  ojoIncl: 0,     ojoY: 0,    ojoIzq: 1,    masc: 'feliz',  boca: 'u',      brazoZ: 1.9,   led: 'pulso',   rebote: 0.05, rebFrec: 7 },
};

// Lerp exponencial independiente del framerate.
const suav = (dt, vel) => 1 - Math.exp(-dt * vel);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Materiales. La carcasa lleva un emisivo muy leve para que lea como blanco y no gris bajo ACES.
const carcasa = () => new THREE.MeshPhysicalMaterial({ color: COLOR_CARCASA, emissive: COLOR_CARCASA, emissiveIntensity: 0.07, roughness: 0.25, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 });
const azul = () => new THREE.MeshPhysicalMaterial({ color: COLOR_AZUL, emissive: COLOR_AZUL, emissiveIntensity: 0.12, roughness: 0.3, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3 });
const visorMat = () => new THREE.MeshPhysicalMaterial({ color: COLOR_VISOR, emissive: COLOR_VISOR, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2 });
const emisivo = (color, intensidad = 1.2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensidad, roughness: 0.3, metalness: 0 });

/**
 * Punto y normal sobre el frente de la cabeza (caja redondeada) para unas
 * coordenadas (x, y) locales. La superficie es el desplazamiento del núcleo
 * de la caja en CAB_RADIO, así que el cálculo es exacto.
 */
function superficieCabeza(x, y) {
  const nx = CAB_ANCHO / 2 - CAB_RADIO, ny = CAB_ALTO / 2 - CAB_RADIO, nz = CAB_FONDO / 2 - CAB_RADIO;
  const dx = Math.sign(x) * Math.max(Math.abs(x) - nx, 0);
  const dy = Math.sign(y) * Math.max(Math.abs(y) - ny, 0);
  const dz = Math.sqrt(Math.max(CAB_RADIO * CAB_RADIO - dx * dx - dy * dy, 0));
  const n = new THREE.Vector3(dx, dy, dz).normalize();
  const p = new THREE.Vector3(x, y, nz + dz);
  return { p, n };
}

const EJE_Z = new THREE.Vector3(0, 0, 1);
/** Coloca un objeto pegado a la cara en (x, y), orientado según la normal, a `eps` de la superficie. */
function colocarEnCara(obj, x, y, eps) {
  const { p, n } = superficieCabeza(x, y);
  obj.position.copy(p).addScaledVector(n, eps);
  obj.quaternion.setFromUnitVectors(EJE_Z, n);
}

/**
 * Visor en forma de píldora (semiancho W, semialto H) proyectado sobre la
 * curvatura de la cabeza: una malla densa cuyos vértices se recortan a la
 * píldora y se posan sobre la superficie a `eps` de distancia.
 */
function geometriaVisor(W, H, cy, eps, nx = 56, ny = 28) {
  const g = new THREE.PlaneGeometry(2 * W, 2 * H, nx, ny);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i);
    const recto = W - H;
    if (Math.abs(x) > recto) {
      const c = Math.sign(x) * recto;
      const d = Math.hypot(x - c, y);
      if (d > H) { x = c + (x - c) * (H / d); y *= H / d; }
    }
    const { p, n } = superficieCabeza(x, y + cy);
    p.addScaledVector(n, eps);
    pos.setXYZ(i, p.x, p.y, p.z);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  return g;
}

/** Construye el robot y devuelve su controlador (misma API que crearOsito). */
export function crearRobot(scene) {
  const grupo = new THREE.Group();
  scene.add(grupo);

  const matCarcasa = carcasa();
  const matAzul = azul();
  const matVisor = visorMat();
  const matPanel = new THREE.MeshPhysicalMaterial({ color: 0xdfe6f6, roughness: 0.3, metalness: 0, clearcoat: 0.5 });

  const sombra = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- Pies: dos ovoides azules (0 a 0.2) y piernas cortas blancas ----
  for (const lado of [-1, 1]) {
    const pie = sombra(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), matAzul));
    pie.scale.set(0.16, 0.1, 0.2);
    pie.position.set(lado * 0.2, 0.1, 0.03);
    grupo.add(pie);
    const pierna = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.1, 6, 20), matCarcasa));
    pierna.position.set(lado * 0.2, 0.24, 0);
    grupo.add(pierna);
  }

  // ---- Cuerpo: ovoide blanco pequeño (ancho 0.8 ~ 70 % de la cabeza; 0.23 a 1.13) ----
  const CUERPO_Y = 0.68;
  const cuerpo = sombra(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), matCarcasa));
  cuerpo.scale.set(0.4, 0.45, 0.36);
  cuerpo.position.y = CUERPO_Y;
  grupo.add(cuerpo);

  // Cuello corto azul.
  const cuello = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 28), matAzul));
  cuello.position.y = 1.1;
  grupo.add(cuello);

  // Panel de pecho redondeado con corazón celeste pequeño que late.
  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.17, 0.05, 4, 0.084), matPanel);
  panel.position.set(0, 0.74, 0.335);
  grupo.add(panel);
  const formaCorazon = new THREE.Shape();
  formaCorazon.moveTo(0, -0.5);
  formaCorazon.bezierCurveTo(-0.9, 0.2, -0.5, 0.9, 0, 0.45);
  formaCorazon.bezierCurveTo(0.5, 0.9, 0.9, 0.2, 0, -0.5);
  const matCorazon = emisivo(COLOR_OJO, 1.0);
  const corazon = new THREE.Mesh(new THREE.ExtrudeGeometry(formaCorazon, { depth: 0.2, bevelEnabled: false }), matCorazon);
  const CORAZON_ESC = 0.05;
  corazon.scale.setScalar(CORAZON_ESC);
  corazon.position.set(0, 0.735, 0.355);
  grupo.add(corazon);
  // Indicador azul: anillo fino alrededor del corazón.
  const anilloPecho = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 8, 40), matAzul);
  anilloPecho.position.set(0, 0.74, 0.362);
  grupo.add(anilloPecho);

  // ---- Brazos: cápsulas blancas cortas con mano esférica azul ----
  const brazos = [];
  const BRAZO_Z = 0.3; // separación base del cuerpo
  const BRAZO_X = -0.2; // inclinación hacia adelante
  for (const lado of [-1, 1]) {
    const pivote = new THREE.Group();
    pivote.position.set(lado * 0.35, 0.92, 0.02);
    const hombro = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), matAzul));
    pivote.add(hombro);
    const brazo = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.2, 8, 24), matCarcasa));
    brazo.position.y = -0.17;
    pivote.add(brazo);
    const mano = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 16), matAzul));
    mano.position.y = -0.33;
    pivote.add(mano);
    pivote.userData.lado = lado;
    pivote.rotation.z = lado * BRAZO_Z;
    pivote.rotation.x = BRAZO_X;
    grupo.add(pivote);
    brazos.push(pivote);
  }

  // ---- Cabeza: caja muy redondeada (1.13 a 2.11; centro 1.62) ----
  const cabeza = new THREE.Group();
  cabeza.position.y = CABEZA_Y;
  grupo.add(cabeza);
  const craneo = sombra(new THREE.Mesh(new RoundedBoxGeometry(CAB_ANCHO, CAB_ALTO, CAB_FONDO, 10, CAB_RADIO), matCarcasa));
  cabeza.add(craneo);

  // Visor: píldora azul marino que abraza el frente, con un reborde apenas más claro.
  const reborde = new THREE.Mesh(geometriaVisor(VISOR_W + 0.022, VISOR_H + 0.022, VISOR_Y, 0.006),
    new THREE.MeshPhysicalMaterial({ color: 0x27375f, roughness: 0.35, metalness: 0, clearcoat: 0.6 }));
  cabeza.add(reborde);
  const visor = new THREE.Mesh(geometriaVisor(VISOR_W, VISOR_H, VISOR_Y, 0.014), matVisor);
  cabeza.add(visor);
  const EPS_CARA = 0.02; // distancia de los elementos luminosos sobre el visor

  // Orejas: tapas redondas azules con anillo blanco.
  const orejas = [];
  for (const lado of [-1, 1]) {
    const pivote = new THREE.Group();
    pivote.position.set(lado * (CAB_ANCHO / 2 - 0.01), -0.02, 0);
    const tapa = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 32), matAzul));
    tapa.rotation.z = Math.PI / 2;
    tapa.position.x = lado * 0.03;
    pivote.add(tapa);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.016, 8, 40), matCarcasa);
    anillo.rotation.y = Math.PI / 2;
    anillo.position.x = lado * 0.076;
    pivote.add(anillo);
    pivote.userData.lado = lado;
    cabeza.add(pivote);
    orejas.push(pivote);
  }

  // Antena corta con esfera LED (pivote en la coronilla para oscilar).
  const antena = new THREE.Group();
  antena.position.set(0, CAB_ALTO / 2 - 0.03, 0);
  cabeza.add(antena);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.05, 24), matAzul);
  base.position.y = 0.03;
  antena.add(base);
  const mastil = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 16), matCarcasa));
  mastil.position.y = 0.12;
  antena.add(mastil);
  const matLed = emisivo(COLORES_LED.neutral, 1.4);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), matLed);
  led.position.y = 0.24;
  antena.add(led);
  const luzLed = new THREE.PointLight(COLORES_LED.neutral, 0.6, 2.5, 2);
  luzLed.position.y = 0.3;
  antena.add(luzLed);

  // ---- Ojos: discos grandes luminosos con halo, brillo y máscara del color del visor ----
  const matOjo = emisivo(COLOR_OJO, 1.05);
  const matBrillo = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ojos = [];
  for (const lado of [-1, 1]) {
    const g = new THREE.Group();
    colocarEnCara(g, lado * OJO_X, OJO_Y, EPS_CARA);
    const matHalo = new THREE.MeshBasicMaterial({ color: COLOR_OJO, transparent: true, opacity: 0.22, depthWrite: false });
    const halo = new THREE.Mesh(new THREE.CircleGeometry(OJO_R * 1.45, 40), matHalo);
    g.add(halo);
    const disco = new THREE.Mesh(new THREE.CircleGeometry(OJO_R, 48), matOjo);
    disco.position.z = 0.003;
    g.add(disco);
    const brillo = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), matBrillo);
    brillo.position.set(-lado * 0.035, 0.048, 0.006);
    g.add(brillo);
    const brillo2 = new THREE.Mesh(new THREE.CircleGeometry(0.013, 14), matBrillo);
    brillo2.position.set(lado * 0.04, -0.04, 0.006);
    g.add(brillo2);
    // Máscara: disco del color del visor que recorta el ojo (media luna feliz o párpado triste).
    const mascara = new THREE.Mesh(new THREE.CircleGeometry(OJO_R * 1.12, 48), matVisor);
    mascara.position.set(0, -0.07, 0.009);
    mascara.scale.setScalar(0.01);
    g.add(mascara);
    g.userData = { lado, mascara, halo, brillos: [brillo, brillo2], x0: g.position.x, y0: g.position.y };
    cabeza.add(g);
    ojos.push(g);
  }

  // Rubor: dos discos muy sutiles bajo los ojos, fuera del visor.
  const matRubor = new THREE.MeshBasicMaterial({ color: COLOR_RUBOR, transparent: true, opacity: 0.18, depthWrite: false });
  for (const lado of [-1, 1]) {
    const rubor = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), matRubor);
    colocarEnCara(rubor, lado * 0.4, VISOR_Y - 0.3, 0.004);
    rubor.scale.set(1.25, 0.8, 1);
    cabeza.add(rubor);
  }

  // ---- Boca: curvas de luz limpias (toros parciales) ----
  const matBoca = emisivo(COLOR_OJO, 0.75);
  const boca = new THREE.Group();
  colocarEnCara(boca, 0, BOCA_Y, EPS_CARA);
  cabeza.add(boca);
  const bocaLinea = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.1, 4, 12), matBoca);
  bocaLinea.rotation.z = Math.PI / 2;
  const bocaU = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.016, 8, 36, Math.PI), matBoca);
  bocaU.rotation.z = Math.PI; // arco hacia abajo: sonrisa
  bocaU.position.y = 0.045;
  const bocaTriste = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.015, 8, 36, Math.PI), matBoca);
  bocaTriste.position.y = -0.05;
  const bocaO = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.015, 8, 36), matBoca);
  boca.add(bocaLinea, bocaU, bocaTriste, bocaO);

  // Sprite "zzz" para dormido.
  const zzz = crearSpriteTexto('z z z');
  zzz.position.set(0.7, 0.62, 0.2);
  zzz.scale.set(0.7, 0.35, 1);
  zzz.visible = false;
  cabeza.add(zzz);

  // ---- Estado interno ----
  const claves = ['cabX', 'cabZ', 'cabY', 'ojoAp', 'ojoTam', 'ojoIncl', 'ojoY', 'ojoIzq', 'mascFeliz', 'mascTriste', 'brazoZ', 'bocaU', 'bocaO', 'bocaLinea', 'bocaTriste'];
  const estado = {
    animo: 'neutral',
    pose: null,
    actual: { cabX: 0, cabZ: 0, cabY: 0, ojoAp: 1, ojoTam: 1, ojoIncl: 0, ojoY: 0, ojoIzq: 1, mascFeliz: 0, mascTriste: 0, brazoZ: 0, bocaU: 0, bocaO: 0, bocaLinea: 1, bocaTriste: 0 },
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
      mascFeliz: p.masc === 'feliz' ? 1 : 0,
      mascTriste: p.masc === 'triste' ? 1 : 0,
      bocaU: p.boca === 'u' ? 1 : 0,
      bocaO: p.boca === 'o' ? 1 : 0,
      bocaLinea: p.boca === 'linea' ? 1 : 0,
      bocaTriste: p.boca === 'triste' ? 1 : 0,
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
    /** Modo escucha (orejas con meneo, LED azul). */
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
        const kh = suav(dt, 12);
        actual.bocaO = lerp(actual.bocaO, 1, kh);
        actual.bocaU = lerp(actual.bocaU, 0, kh);
        actual.bocaLinea = lerp(actual.bocaLinea, 0, kh);
        actual.bocaTriste = lerp(actual.bocaTriste, 0, kh);
      }

      // Flotación suave (sube y baja 0.05) y balanceo leve.
      const flota = 0.05 * Math.sin(t * 1.6) * factorMov;
      grupo.rotation.z = 0.012 * Math.sin(t * 0.9) * factorMov;
      grupo.rotation.y = 0.02 * Math.sin(t * 0.6) * factorMov;

      // Brinco continuo (solo emocionado) y salto físico simple.
      let rebote = 0;
      if (pose.rebote && factorMov) rebote = Math.abs(Math.sin(t * pose.rebFrec)) * pose.rebote;
      if (estado.saltoV !== 0 || estado.saltoY > 0) {
        estado.saltoV -= 12 * dt;
        estado.saltoY += estado.saltoV * dt;
        if (estado.saltoY <= 0) { estado.saltoY = 0; estado.saltoV = 0; }
      }
      grupo.position.y = flota + 0.05 + rebote + estado.saltoY;

      // Cabeza: pose + seguir el puntero (límite ±0.25 rad) + gesto al hablar / dormir.
      const sigueX = clamp(estado.mirada.y * 0.2, -0.25, 0.25);
      const sigueY = clamp(estado.mirada.x * 0.25, -0.25, 0.25);
      let cabX = actual.cabX + sigueX;
      let cabZ = actual.cabZ;
      if (hablando) cabX += Math.sin(t * 9) * 0.012 * factorMov;
      if (estado.animo === 'dormido') cabZ += Math.sin(t * 1.2) * 0.025 * factorMov;
      if (estado.animo === 'pensando') cabZ += Math.sin(t * 1.6) * 0.02 * factorMov;
      cabeza.rotation.x = lerp(cabeza.rotation.x, cabX, suav(dt, 6));
      cabeza.rotation.y = lerp(cabeza.rotation.y, sigueY, suav(dt, 6));
      cabeza.rotation.z = lerp(cabeza.rotation.z, cabZ, suav(dt, 6));
      cabeza.position.y = CABEZA_Y + actual.cabY;

      // Antena que oscila (más al escuchar o emocionarse).
      const viva = estado.animo === 'escuchando' || estado.animo === 'emocionado' ? 2.2 : 1;
      antena.rotation.z = Math.sin(t * 2.3 * viva) * 0.14 * factorMov - cabeza.rotation.z * 0.5;
      antena.rotation.x = Math.sin(t * 1.7 * viva + 1) * 0.1 * factorMov;

      // Parpadeo cada 3-6 s: los ojos bajan a escala Y 0.1 durante ~120 ms.
      const pp = estado.parpadeo;
      let cierre = 0;
      if (pp.en > 0) {
        pp.en += dt;
        const d = 0.12;
        cierre = pp.en < d ? Math.sin((pp.en / d) * Math.PI) : 0;
        if (pp.en >= d) { pp.en = 0; pp.prox = 3 + Math.random() * 3; }
      } else {
        pp.prox -= dt;
        if (pp.prox <= 0 && estado.animo !== 'dormido') pp.en = 0.001;
      }
      const apertura = clamp(actual.ojoAp * (1 - cierre * 0.9), 0.1, 1.4);
      for (const g of ojos) {
        const { lado, mascara, halo, brillos, x0, y0 } = g.userData;
        g.position.x = x0 + estado.mirada.x * 0.02;
        g.position.y = y0 + actual.ojoY + estado.mirada.y * -0.015;
        const tam = actual.ojoTam * (lado < 0 ? actual.ojoIzq : 1);
        g.scale.set(tam, tam * apertura, 1);
        g.rotation.z = lado * actual.ojoIncl;
        // Máscara: crece en su sitio (feliz: tapa la mitad inferior; triste: párpado exterior caído).
        const peso = Math.max(actual.mascFeliz, actual.mascTriste);
        const mx = lerp(0, lado * 0.045, actual.mascTriste);
        const my = lerp(-0.07 * actual.mascFeliz, 0.075, actual.mascTriste);
        mascara.position.set(mx, my, 0.009);
        mascara.scale.setScalar(Math.max(0.01, peso));
        mascara.visible = peso > 0.03;
        // El halo se apaga mientras la máscara recorta el ojo: si no, dibuja un aro alrededor de la parte oculta.
        halo.material.opacity = 0.22 * (1 - peso);
        // Con el ojo casi cerrado (parpadeo, dormido) los brillos se esconden para que quede una línea limpia.
        for (const b of brillos) b.visible = apertura > 0.35;
      }

      // Orejas: meneo leve al escuchar.
      for (const o of orejas) {
        const lado = o.userData.lado;
        const meneo = estado.animo === 'escuchando' ? Math.sin(t * 6 + lado) * 0.06 * factorMov : 0;
        o.rotation.x = meneo;
      }

      // Boca: visibilidad y escala por estado; al hablar la O abre y cierra.
      bocaU.visible = actual.bocaU > 0.05;
      bocaO.visible = actual.bocaO > 0.05;
      bocaLinea.visible = actual.bocaLinea > 0.05;
      bocaTriste.visible = actual.bocaTriste > 0.05;
      bocaU.scale.setScalar(Math.max(0.01, actual.bocaU));
      bocaTriste.scale.setScalar(Math.max(0.01, actual.bocaTriste));
      bocaLinea.scale.set(1, Math.max(0.01, actual.bocaLinea), 1);
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
          z = 2.4 + Math.sin(t * 12) * 0.3 * (factorMov || 0.2);
          x = -0.1;
        }
        b.rotation.z = lerp(b.rotation.z, z, suav(dt, 7));
        b.rotation.x = lerp(b.rotation.x, x, suav(dt, 7));
      }

      // LED de la antena: color según ánimo; intensidad fija, pulso o respiración.
      estado.ledColor.lerp(estado.ledObjetivo, suav(dt, 4));
      matLed.color.copy(estado.ledColor);
      matLed.emissive.copy(estado.ledColor);
      luzLed.color.copy(estado.ledColor);
      let intensidad = 1.4;
      if (pose.led === 'pulso') intensidad = 0.9 + Math.max(0, Math.sin(t * 6)) * 1.2;
      else if (pose.led === 'respira') intensidad = 1 + (Math.sin(t * 2.2) + 1) * 0.45;
      matLed.emissiveIntensity = intensidad;
      luzLed.intensity = intensidad * 0.35;

      // Corazón del pecho latiendo.
      const latido = 1 + Math.pow(Math.max(0, Math.sin(t * 2.6)), 6) * 0.22;
      corazon.scale.setScalar(CORAZON_ESC * latido);
      matCorazon.emissiveIntensity = 0.8 + (latido - 1) * 2.2;

      // zzz flotando.
      zzz.visible = estado.animo === 'dormido';
      if (zzz.visible) {
        zzz.position.y = 0.62 + Math.sin(t * 1.5) * 0.06 * factorMov;
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
  ctx.fillStyle = '#6fe3ff';
  ctx.shadowColor = 'rgba(111,227,255,.8)';
  ctx.shadowBlur = 16;
  ctx.fillText(texto, 128, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false });
  return new THREE.Sprite(mat);
}
