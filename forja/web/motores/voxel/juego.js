// Forja · voxel · el juego: une generador, chunks, Workers, render p5, física, criaturas, supervivencia, ambiente,
// persistencia e interfaz. Las cuatro plantillas voxel llaman a iniciarVoxel() con su configuración.
// Bucle de timestep fijo (nucleo/bucle.js): la simulación va a 60 pasos/s y el dibujo interpola la cámara.
import { crearBucle } from '../nucleo/bucle.js';
import { crearEntrada, bloquearPuntero } from '../nucleo/entrada.js';
import { crearMonitor } from '../nucleo/monitor.js';
import { semillaDe, crearPRNG } from '../nucleo/semilla.js';
import { validar, conDefectos } from '../nucleo/esquema.js';
import { capacidades, perfilSugerido, crearAutoCalidad, PERFILES, accesibilidad } from '../nucleo/perfiles.js';
import { crearAudio } from '../nucleo/audio.js';
import { crearHUD } from '../nucleo/hud.js';
import { atlasDe } from '../nucleo/recursos.js';
import { crearGenerador } from './generador.js';
import { crearEjecutor } from './ejecutor.js';
import { crearMundo } from './mundo.js';
import { crearRender, cajasAGeom } from './render.js';
import { crearAtlas, registrarReceta } from './atlas.js';
import { crearCuerpo, pasoCuerpo, solidoDe, dentroDelCuerpo, atascado } from './fisica.js';
import { lanzarRayo } from './rayo.js';
import { T, ID, bloque, PORCLAVE, registrarBloque, BLOQUES, LOSETA } from './bloques.js';
import { crearSupervivencia, OFERTAS, BOTIN, MISIONES, esBloque, nombreDe } from './supervivencia.js';
import { crearCriaturas, TIPOS, partesDe } from './criaturas.js';
import { cielo, climaDe, crearClima } from './ambiente.js';
import { almacenIDB, guardarPartida, cargarPartida, serializar, exportarArchivo, importarArchivo, deserializar } from './persistencia.js';
import { ESQUEMA, defecto, opcionesGenerador } from './config.js';
import { adelante } from './mat.js';

const TECLAS = { Space: 'espacio', ShiftLeft: 'Mayús', ShiftRight: 'Mayús', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', Escape: 'Esc', Enter: 'Intro', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backquote: 'º' };
const nombreTecla = (c) => (!c ? '—' : TECLAS[c] || c.replace(/^Key|^Digit|^Numpad/, ''));
const ruta = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
const fijar = (o, k, v) => { const p = k.split('.'); let a = o; for (let i = 0; i < p.length - 1; i++) a = a[p[i]] ??= {}; a[p[p.length - 1]] = v; };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Reglas del catálogo → configuración. Una regla que el alumno dejó en su valor de fábrica no pisa lo que se cambió
// en el Editor (configuración avanzada); si la cambió en «Diseña tu videojuego», manda la regla.
export function aplicarReglas(config, reglas, claves, fabrica) {
  const c = structuredClone(config);
  for (const k of claves) {
    if (!(k in (reglas || {}))) continue;
    const v = reglas[k]; if (fabrica && igual(ruta(fabrica, k), v) && !igual(ruta(config, k), v)) continue;
    fijar(c, k, structuredClone(v));
  }
  return c;
}
export { opcionesGenerador };

export async function iniciarVoxel({ datos = globalThis.DATOS || {}, config, plantilla = datos.plantilla || 'mundo-voxel', misiones = null, bloquesExtra = [], alIniciar = null } = {}) {
  // plugins de bloques: se registran aquí y en cada Worker (mismo id → misma loseta en los dos lados)
  for (const b of bloquesExtra) { if (!BLOQUES[b.id]) registrarBloque(b); registrarReceta(b.textura, b.receta); }
  let cfg = config || datos.config || defecto(plantilla);
  const errores = validar(cfg, ESQUEMA);
  if (errores.length) { console.warn('configuración voxel inválida, se usan los valores de fábrica:', errores.slice(0, 5)); cfg = defecto(plantilla); }
  cfg = conDefectos(cfg, ESQUEMA);
  const cont = document.getElementById('juego') || document.body; document.getElementById('cargando')?.remove();
  cont.style.position = 'relative'; cont.style.display = 'block';
  const lienzoCaja = document.createElement('div'); lienzoCaja.style.cssText = 'position:absolute;inset:0'; cont.appendChild(lienzoCaja);
  const acc = accesibilidad(cfg.accesibilidad.reducirMovimiento || cfg.accesibilidad.reducirDestellos ? cfg.accesibilidad : {});
  if (cfg.accesibilidad.reducirMovimiento) acc.reducirMovimiento = true; if (cfg.accesibilidad.reducirDestellos) acc.reducirDestellos = true;
  const semilla = semillaDe(cfg.semilla), opts = opcionesGenerador(cfg), H = cfg.mundo.altura, MAR = cfg.mundo.mar;
  const gen = crearGenerador(semilla, opts), azarJuego = crearPRNG(semilla ^ 0x9e37);   // en el hilo principal solo para consultas puntuales (biomas, estructuras, aparición)
  const atlas = crearAtlas();
  const monitor = crearMonitor({ padre: cont });
  const audio = crearAudio({ volumen: cfg.audio.volumen }); audio.silencio = !cfg.audio.efectos || cfg.audio.volumen <= 0;
  const hud = crearHUD(cont, { acc });
  // render (p5 WEBGL) — se espera a que p5 cree el contexto
  let perfilId = cfg.render.perfil === 'auto' ? 'medio' : cfg.render.perfil;
  const render = await new Promise((ok) => crearRender({ padre: lienzoCaja, atlas, perfil: { resolucion: Math.min(cfg.render.resolucion, PERFILES[perfilId].resolucion) }, fov: cfg.jugador.fov, alListo: ok }));
  const cap = capacidades(render.gl);
  if (cfg.render.perfil === 'auto') perfilId = perfilSugerido(cap);
  const distancia = () => Math.min(cfg.render.distancia, cfg.render.perfil === 'auto' ? PERFILES[perfilId].distancia : 99);
  const auto = cfg.render.perfil === 'auto' ? crearAutoCalidad({ inicial: perfilId, alCambiar: (p, k) => { perfilId = p; mundo.radio = distancia(); render.densidad(Math.min(cfg.render.resolucion, k)); ui.aviso(`Calidad automática: ${PERFILES[p].nombre}`); } }) : null;
  render.densidad(Math.min(cfg.render.resolucion, PERFILES[perfilId].resolucion));
  const ejecutor = crearEjecutor({ semilla, opciones: opts, bloquesExtra });
  const vencidos = new Set(), cofresAbiertos = new Set();
  const mundo = crearMundo({ ejecutor, H, radio: distancia(), ao: cfg.render.ao, cacheMax: 160,
    alMalla: (c, m) => render.subirChunk(c, m), alQuitar: (c) => render.quitarChunk(c), alCargar: (c) => criaturas?.desdeMarcadores(c.marcadores, vencidos) });
  const sup = crearSupervivencia(cfg, { alEvento: (t, a, b) => evento(t, a, b) });
  const criaturas = crearCriaturas({ mundo, cfg, semilla, alAtacar: (e, d, tipo) => { if (sup.dano(d, 'criatura')) { ui.dano(); audio.tocar('dano'); jug.sacude = 0.3; const dir = [jug.c.x - e.x, 0, jug.c.z - e.z], l = Math.hypot(dir[0], dir[2]) || 1; jug.c.vx += (dir[0] / l) * (tipo === 'onda' ? 9 : 5); jug.c.vz += (dir[2] / l) * (tipo === 'onda' ? 9 : 5); jug.c.vy = Math.max(jug.c.vy, 4); } },
    alMorir: (e) => { audio.tocar('criatura'); for (const [it, n] of e.t.suelta || []) sup.meter(it, n); sup.ganarXP(e.t.clase === 'jefe' ? 40 : 3); sup.vencidos[e.tipo] = (sup.vencidos[e.tipo] || 0) + 1; if (e.marcador) vencidos.add(e.marcador); ui.aviso(e.t.clase === 'jefe' ? `¡Venciste al ${e.t.nombre}!` : `${e.t.nombre} vencido`); if (e.t.clase === 'jefe') hud.texto('¡GUARDIÁN VENCIDO!', { y: 62, color: '#c6ff4a' }); },
    alEvento: (t, e) => { if (t === 'fase') { ui.aviso(`${e.t.nombre}: ¡segunda fase!`); hud.texto('¡FASE 2!', { y: 62, color: '#96f0ff', ms: 1100 }); audio.tocar('rugido'); } if (t === 'onda') { audio.tocar('temblor'); jug.sacude = Math.max(jug.sacude, 0.35); } if (t === 'polvo') polvo(e.x, e.y + 0.4 * (e.t.escala || 1), e.z, colorCriatura(e.tipo), 14, 0.9 * (e.t.escala || 1)); } });
  const clima = crearClima(cont, { presupuesto: PERFILES[perfilId].particulas });
  const ui = (await import('./interfaz.js')).crearInterfaz(cont, { atlas, cfg, sup, acc, alFabricar: (r, est) => { const ok = sup.fabricar(r, est); if (ok) { audio.tocar('recoger'); ui.pintarBarra(); } return ok; }, alComerciar: (o) => { const ok = sup.comerciar(o); if (ok) { audio.tocar('mision'); ui.pintarBarra(); } return ok; }, alSeleccionar: (i) => { sup.mano = i; ui.pintarBarra(); } });
  // avatar: el personaje del alumno (hoja de sprites de Forja) o un muñeco de cajas
  const heroe = cfg.jugador.avatar === 'personaje' ? await atlasDe('heroe') : null;
  let spriteImg = null;
  if (heroe && render.p5) { const s = render.p5, im = s.createImage(heroe.imagen.width, heroe.imagen.height); im.drawingContext.drawImage(heroe.imagen, 0, 0); im.setModified?.(true); spriteImg = im; }
  const color = datos.colores ? Object.values(datos.colores) : null, rgb = (h) => { const m = /hsl\((\d+)\s+(\d+)%\s+(\d+)%/.exec(h || ''); if (!m) return [90, 140, 220]; const [H2, S, L] = [m[1] / 360, m[2] / 100, m[3] / 100], f = (n) => { const k = (n + H2 * 12) % 12, a = S * Math.min(L, 1 - L); return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
  // avatar de cajas ARTICULADO (el frente es −Z): piernas y brazos giran sobre cadera y hombro, la cabeza sobre el cuello
  const pantalon = color ? rgb(color[1]) : [60, 70, 140], camisa = color ? rgb(color[0]) : [90, 150, 220], piel = [235, 195, 160];
  const pieza = (id, cajas, pivote) => ({ geom: render.geomObjeto('vx-av-' + id, cajasAGeom(cajas)), pivote });
  const AVATAR = {
    piernaI: pieza('pi', [[-0.29, 0, -0.15, 0.28, 0.75, 0.3, pantalon], [-0.29, 0, -0.17, 0.28, 0.12, 0.34, [50, 40, 36]]], [-0.15, 0.75, 0]),
    piernaD: pieza('pd', [[0.01, 0, -0.15, 0.28, 0.75, 0.3, pantalon], [0.01, 0, -0.17, 0.28, 0.12, 0.34, [50, 40, 36]]], [0.15, 0.75, 0]),
    cuerpo: pieza('cu', [[-0.32, 0.75, -0.17, 0.64, 0.65, 0.34, camisa]], [0, 0.75, 0]),
    brazoI: pieza('bi', [[-0.5, 0.78, -0.13, 0.18, 0.62, 0.26, camisa], [-0.5, 0.7, -0.13, 0.18, 0.12, 0.26, piel]], [-0.41, 1.34, 0]),
    brazoD: pieza('bd', [[0.32, 0.78, -0.13, 0.18, 0.62, 0.26, camisa], [0.32, 0.7, -0.13, 0.18, 0.12, 0.26, piel]], [0.41, 1.34, 0]),
    cabeza: pieza('ca', [[-0.27, 1.4, -0.27, 0.54, 0.5, 0.54, piel], [-0.28, 1.78, -0.28, 0.56, 0.14, 0.56, [70, 46, 30]], [-0.15, 1.58, -0.285, 0.1, 0.1, 0.02, [30, 30, 40]], [0.05, 1.58, -0.285, 0.1, 0.1, 0.02, [30, 30, 40]]], [0, 1.4, 0]),
  };
  // criaturas: el modelo entero (lejos, o al caer derribadas) y despiezado en cuerpo + patas/brazos (cerca, animado)
  const geomTipo = new Map(); const geomDe = (tipo) => {
    if (!geomTipo.has(tipo)) { const { cuerpo, piezas } = partesDe(TIPOS[tipo].cajas); geomTipo.set(tipo, { entero: render.geomObjeto('vx-cr-' + tipo, cajasAGeom(TIPOS[tipo].cajas)), cuerpo: cuerpo.length ? render.geomObjeto('vx-crc-' + tipo, cajasAGeom(cuerpo)) : null, piezas: piezas.map((q, i) => ({ ...q, geom: render.geomObjeto(`vx-crp-${tipo}-${i}`, cajasAGeom(q.cajas)) })) }); }
    return geomTipo.get(tipo);
  };
  // partículas (bloques que se rompen, criaturas que caen, golpes): cubitos con el color medio de la loseta
  const geomParticula = render.geomObjeto('vx-part', cajasAGeom([[-0.5, -0.5, -0.5, 1, 1, 1, [255, 255, 255]]]));
  const coloresBloque = new Map();
  const colorBloque = (id) => {
    if (!coloresBloque.has(id)) { const t = LOSETA[id * 3 + 2], tx = (t % 16) * 16, ty = Math.floor(t / 16) * 16, W = atlas.W; let r = 0, g = 0, b = 0, n = 0; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const i = ((ty + y) * W + tx + x) * 4; if (atlas.datos[i + 3] > 40) { r += atlas.datos[i]; g += atlas.datos[i + 1]; b += atlas.datos[i + 2]; n++; } } coloresBloque.set(id, n ? [r / n / 255, g / n / 255, b / n / 255] : [0.6, 0.6, 0.6]); }
    return coloresBloque.get(id);
  };
  const colorCriatura = (tipo) => { const c = TIPOS[tipo].cajas[0][6]; return [c[0] / 255, c[1] / 255, c[2] / 255]; };
  const particulas = [];
  function polvo(x, y, z, color, n = 10, tam = 1) {
    if (acc.reducirMovimiento) n = Math.ceil(n / 3);
    for (let i = 0; i < n && particulas.length < 90; i++) { const a = azarJuego.num() * 6.283, v = 1 + azarJuego.num() * 2.2; particulas.push({ x: x + (azarJuego.num() - 0.5) * 0.6 * tam, y: y + (azarJuego.num() - 0.5) * 0.6 * tam, z: z + (azarJuego.num() - 0.5) * 0.6 * tam, px: x, py: y, pz: z, vx: Math.cos(a) * v, vy: 2 + azarJuego.num() * 3, vz: Math.sin(a) * v, t: 0, vida: 0.45 + azarJuego.num() * 0.35, tam: (0.08 + azarJuego.num() * 0.08) * Math.max(1, tam * 0.8), color }); }
  }
  function pasoParticulas(dt) {
    for (let i = particulas.length - 1; i >= 0; i--) {
      const q = particulas[i]; q.px = q.x; q.py = q.y; q.pz = q.z; q.t += dt; if (q.t > q.vida) { particulas.splice(i, 1); continue; }
      q.vy -= 18 * dt; const ny = q.y + q.vy * dt;
      if (solido(Math.floor(q.x), Math.floor(ny - q.tam / 2), Math.floor(q.z))) { q.vy = -q.vy * 0.25; q.vx *= 0.5; q.vz *= 0.5; } else q.y = ny;
      q.x += q.vx * dt; q.z += q.vz * dt;
    }
  }
  // rayos X (V): marcos de las cajas de choque
  const marcos = new Map();
  const geomMarcoCaja = (w, h, d, c) => { const k = `${w}|${h}|${d}|${c}`; if (!marcos.has(k)) { const e = 0.03, cajas = []; for (const y of [0, h - e]) for (const z of [-d / 2, d / 2 - e]) cajas.push([-w / 2, y, z, w, e, e, c]); for (const y of [0, h - e]) for (const x of [-w / 2, w / 2 - e]) cajas.push([x, y, -d / 2, e, e, d, c]); for (const x of [-w / 2, w / 2 - e]) for (const z of [-d / 2, d / 2 - e]) cajas.push([x, 0, z, e, h, e, c]); marcos.set(k, render.geomObjeto('vx-rx-' + marcos.size, cajasAGeom(cajas))); } return marcos.get(k); };
  const geomMarco = render.geomObjeto('vx-marco', cajasAGeom([
    ...[0, 1].flatMap((y) => [0, 1].map((z) => [-0.002, y * 1.004 - 0.012, z * 1.004 - 0.012, 1.004, 0.024, 0.024, [15, 15, 20]])),
    ...[0, 1].flatMap((y) => [0, 1].map((x) => [x * 1.004 - 0.012, y * 1.004 - 0.012, -0.002, 0.024, 0.024, 1.004, [15, 15, 20]])),
    ...[0, 1].flatMap((x) => [0, 1].map((z) => [x * 1.004 - 0.012, -0.002, z * 1.004 - 0.012, 0.024, 1.004, 0.024, [15, 15, 20]]))]));

  // ---------------------------------------------------------------- jugador
  const inicio = buscarInicio();
  const jug = { c: crearCuerpo(inicio[0] + 0.5, inicio[1], inicio[2] + 0.5, fisicaDe(cfg)), yaw: 0.6, pitch: -0.15, camara: cfg.jugador.camara, px: 0, py: 0, pz: 0, corriendo: false, maxAltura: inicio[1], minAltura: inicio[1], maxPuesto: 0, objetivo: null, minando: null,
    // animación y cámara: fase de la zancada, amplitud, hacia dónde mira el avatar, brazo que golpea, escalón suavizado, sacudida
    fase: 0, amp: 0, giroAv: 0.6, golpeAnim: 0, suave: 0, psuave: 0, sacude: 0, mira: 1, rayos: false };
  jug.c.volando = false; Object.assign(jug, { px: jug.c.x, py: jug.c.y, pz: jug.c.z });
  // la hora que elegiste en el estudio (Día, Tarde, Noche, Amanecer) manda si la regla «Hora al empezar» quedó de fábrica
  const HORAS = { dia: 0.4, tarde: 0.7, noche: 0.9, amanecer: 0.25 };
  if (datos.hora && HORAS[datos.hora] != null && cfg.ambiente.horaInicio === defecto(plantilla).ambiente.horaInicio) cfg.ambiente.horaInicio = HORAS[datos.hora];
  let hora = cfg.ambiente.horaInicio, dias = 0, tiempoJuego = 0, pausado = false, terminado = false, ultimoEspacio = -1;
  // Acciones del teclado (los nombres son los que lee DATOS.controles). Agacharse NO va en Ctrl: Ctrl+W cierra la pestaña.
  // romper y usar también van en el ratón (clic izquierdo y derecho); J y K sirven en un panel táctil.
  const entrada = crearEntrada({ mapa: { adelante: ['KeyW', 'ArrowUp'], atras: ['KeyS', 'ArrowDown'], izq: ['KeyA', 'ArrowLeft'], der: ['KeyD', 'ArrowRight'], salto: ['Space'], carrera: ['ShiftLeft', 'ShiftRight'], agachar: ['KeyC'], romper: ['KeyJ'], usar: ['KeyK'], camara: ['KeyF'], inventario: ['KeyE'], misiones: ['KeyQ'], pausa: ['KeyP', 'Escape'], guardar: ['KeyG'], comer: ['KeyR'], rayos: ['KeyV'], ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ['h' + n, ['Digit' + n]])) } });
  const lienzo = render.p5.canvas;
  const puntero = bloquearPuntero(lienzo, (dx, dy) => { if (pausado || ui.abierto()) return; const k = 0.0024 * cfg.jugador.sensibilidad; jug.yaw += dx * k; jug.pitch = Math.max(-1.55, Math.min(1.55, jug.pitch - dy * k * (cfg.jugador.invertirY ? -1 : 1))); });
  const raton = { izq: false, der: false };
  // Si el navegador no deja capturar el ratón (iframe sin permiso, Safari antiguo), se juega arrastrando: el clic rompe y pone igual.
  // (Chrome rechaza volver a capturar durante ~1 s después de soltar con Esc: solo se pasa a «arrastrar» tras 3 fallos seguidos)
  let sinCaptura = false, fallosCaptura = 0, teniaCaptura = false, soltandoAdrede = false;
  document.addEventListener('pointerlockerror', () => { if (++fallosCaptura >= 3 && !sinCaptura) { sinCaptura = true; ui.aviso('El navegador no deja capturar el ratón: arrastra para mirar', 3500); } });
  // Esc suelta el ratón: el juego se pausa (como en cualquier juego en primera persona) en vez de seguir sin control
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === lienzo) { teniaCaptura = true; fallosCaptura = 0; return; }
    const adrede = soltandoAdrede; soltandoAdrede = false;
    if (teniaCaptura && !adrede && listo && !pausado && !hud.hayMenu && !ui.abierto()) { raton.izq = false; pausa(); }
    teniaCaptura = false;
  });
  function soltarRaton() { if (document.pointerLockElement) { soltandoAdrede = true; document.exitPointerLock?.(); } }
  lienzo.addEventListener('mousedown', (e) => { lienzo.focus({ preventScroll: true }); if (!puntero.bloqueado() && !sinCaptura && !globalThis.__vxSinBloqueo) return; if (pausado || hud.hayMenu || ui.abierto()) return; if (e.button === 0) raton.izq = true; if (e.button === 2) { raton.der = true; usar(); } });
  addEventListener('mouseup', (e) => { if (e.button === 0) { raton.izq = false; jug.minando = null; ui.progreso(0); } if (e.button === 2) raton.der = false; });
  lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
  lienzo.addEventListener('wheel', (e) => { if (!cfg.modulos.hotbar) return; sup.mano = (sup.mano + (e.deltaY > 0 ? 1 : 8)) % 9; ui.pintarBarra(); e.preventDefault(); }, { passive: false });

  function fisicaDe(c) { return { velocidad: c.jugador.velocidad, carrera: c.jugador.carrera, salto: c.jugador.salto, gravedad: c.jugador.gravedad, nado: c.jugador.nado, caidaSegura: c.jugador.caidaSegura, pasoAuto: c.jugador.pasoAuto }; }
  function buscarInicio() {   // espiral desde (0, 0) hasta tierra firme fuera del agua
    const firme = (x, z) => { const c = gen.columna(x, z); return c.h > MAR + 1 && c.bioma.id !== 'oceano' && c.montana < 0.4 ? c : null; };
    // si la primera misión es visitar una estructura (la aventura), se aparece en tierra a ~30 bloques de ella: el
    // primer objetivo se ve en la brújula y se alcanza caminando, no al otro lado del mar
    const primera = cfg.modulos.misiones ? (misiones || MISIONES[cfg.misiones.lista] || [])[0] : null;
    const meta = primera?.tipo === 'visitar' ? gen.estructuras.cerca(0, 0, 900).find((e) => e.tipo === primera.estructura) : null;
    // se prefiere un CLARO: sin árboles a 3 bloques (la primera vista no es un tronco en la cara); si no hay, el menos tupido
    const tupido = (x, z) => { let n = 0; for (let dz = -6; dz <= 6; dz += 1) for (let dx = -6; dx <= 6; dx += 1) { const d = Math.max(Math.abs(dx), Math.abs(dz)); if (d > 2 && (dx + dz) & 1) continue; if (gen.arbolEn(x + dx, z + dz)) n += d <= 2 ? 4 : d <= 4 ? 2 : 1; } return n; };
    let mejor = null, nMejor = 1e9, vistos = 0;
    const probar = (x, z, c) => { const n = tupido(x, z) + Math.hypot(x, z) / 60; if (n < nMejor) { nMejor = n; mejor = [x, c.h + 2, z]; } return n < 0.6 || ++vistos > 40; };
    if (meta) for (let r = 28; r <= 60; r += 4) for (let k = 0; k < 24; k++) {
      const a = Math.atan2(-meta.z, -meta.x) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.26, x = Math.round(meta.x + Math.cos(a) * r), z = Math.round(meta.z + Math.sin(a) * r), c = firme(x, z);
      if (c && probar(x, z, c)) return mejor;
    }
    if (mejor) return mejor;
    // tierra adentro: la columna y sus vecinas a 8 bloques son tierra firme (no se aparece en la orilla mirando al mar)
    for (let r = 0; r < 300; r += 6) for (let a = 0; a < 6.283; a += r ? 6 / r : 7) {
      const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r), c = firme(x, z);
      if (c && firme(x + 8, z) && firme(x - 8, z) && firme(x, z + 8) && firme(x, z - 8) && probar(x, z, c)) return mejor;
    }
    if (mejor) return mejor;
    for (let r = 0; r < 900; r += 6) for (let a = 0; a < 6.283; a += r ? 6 / r : 7) {
      const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r), c = firme(x, z);
      if (c) return [x, c.h + 2, z];
    }
    return [0, H - 20, 0];
  }
  // Con los chunks de alrededor ya cargados: el punto exacto donde aparecer. Se busca cerca del inicio una columna a
  // cielo abierto (de arriba abajo, el primer bloque es suelo firme: ni hojas, ni tronco, ni agua) con 2 de aire encima.
  const NO_PISAR = new Set([ID.hojas, ID.pino, ID.madera, ID.abedul, ID.cactus, ID.lava, ID.arbusto, ID.hojas_flor, ID.hojas_oro].filter((v) => v != null));
  function cimaFirme(x, z) {
    for (let y = H - 2; y > 1; y--) { const id = mundo.bloque(x, y, z); if (id < 0) return null; if (id === 0 || (!T.solido[id] && !T.liquido[id])) continue; return T.liquido[id] || NO_PISAR.has(id) ? null : y + 1; }
    return null;
  }
  function asentarInicio() {
    for (let r = 0; r <= 10; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = inicio[0] + dx, z = inicio[2] + dz, y = cimaFirme(x, z); if (y == null) continue;
      inicio[0] = x; inicio[1] = y; inicio[2] = z; return true;
    }
    return false;
  }
  // Hacia dónde mirar al aparecer: la estructura de la primera misión si la hay; si no, la dirección con más vista
  // despejada y más tierra firme (no un muro de tierra ni el mar abierto).
  function elegirMirada() {
    const sig = sup.siguiente, meta = sig?.tipo === 'visitar' ? gen.estructuras.cerca(inicio[0], inicio[2], 700).find((e) => e.tipo === sig.estructura) : null;
    let mejor = 0.6, puntos = -1e9; const ojoY = inicio[1] + 1.62;
    // cada tramo de vista despejada vale más si es tierra (se puede ir caminando) que si es mar abierto; también se
    // miran dos rayos a los lados (±20°): un tronco al borde de la pantalla también tapa la primera vista
    const rayo = (a) => { const fx = Math.sin(a), fz = -Math.cos(a); let v = 0;
      for (let d = 1; d <= 40; d++) {
        const x = Math.floor(inicio[0] + 0.5 + fx * d), z = Math.floor(inicio[2] + 0.5 + fz * d), y = Math.floor(ojoY), id = mundo.bloque(x, y, z), id2 = mundo.bloque(x, y + 1, z), id3 = d < 12 ? mundo.bloque(x, y + 2, z) : 0;
        if (id < 0 || T.solido[id] || T.solido[id2]) break;
        if (id3 > 0 && T.solido[id3]) v -= 0.5;   // ramas bajas encima: camino incómodo
        v += gen.columna(x, z).h > MAR ? 1 : 0.3;
      }
      return v; };
    // con una meta (la estructura de la primera misión) se mira hacia ella, pero por el hueco más despejado de un cono
    // de ±40°: la brújula sigue señalándola y la primera vista no es un tronco
    const haciaMeta = meta ? Math.atan2(meta.x - inicio[0], -(meta.z - inicio[2])) : null;
    for (let k = 0; k < 24; k++) {
      const a = meta ? haciaMeta + ((k - 11.5) / 11.5) * 0.7 : (k / 24) * Math.PI * 2, v = rayo(a) + 0.5 * (rayo(a - 0.35) + rayo(a + 0.35)) - (meta ? Math.abs(a - haciaMeta) * 6 : 0);
      if (v > puntos) { puntos = v; mejor = a; }
    }
    return mejor;
  }
  // ---------------------------------------------------------------- acciones
  const ojo = () => [jug.c.x, jug.c.y + (jug.c.agachado ? 1.25 : 1.62), jug.c.z];
  // en 3.ª persona la cámara gira sobre un punto encima del hombro derecho; el rayo de apuntar sale de ese punto, así
  // la mirilla (centro de la pantalla) señala exactamente el bloque que se va a romper o donde se pondrá el nuevo
  const opaco = (id) => T.opaco[id] === 1;
  function pivote(o) {
    if (jug.camara !== 'tercera') return o;
    const lado = [Math.cos(jug.yaw) * 0.55, 0.38, Math.sin(jug.yaw) * 0.55], l = Math.hypot(...lado);
    const hit = lanzarRayo((a, b, c) => mundo.bloque(a, b, c), o[0], o[1], o[2], lado[0] / l, lado[1] / l, lado[2] / l, l + 0.25, opaco), k = hit ? Math.max(0, hit.dist - 0.25) / l : 1;
    return [o[0] + lado[0] * k, o[1] + lado[1] * k, o[2] + lado[2] * k];
  }
  const ALCANCE_GOLPE = 3.5;
  function apuntar() {
    const o = pivote(ojo()), d = adelante(jug.yaw, jug.pitch), alc = cfg.jugador.alcance + (jug.camara === 'tercera' ? 0.6 : 0);
    const b = lanzarRayo((x, y, z) => mundo.bloque(x, y, z), o[0], o[1], o[2], d[0], d[1], d[2], alc);
    // a una criatura se la alcanza con el brazo (3,5 bloques), no a la distancia de minar; a los que comercian, hasta el alcance
    const e = criaturas.apuntada(o, d, b ? b.dist : alc), lejos = e && e.dist > ALCANCE_GOLPE + (jug.camara === 'tercera' ? 0.6 : 0) && e.e.t.clase !== 'comerciante' && e.e.t.clase !== 'exploradora';
    return { b: e ? null : b, e: e && !lejos ? e.e : null, o, d };
  }
  function romper(t) {
    const m = sup.minado(t.id); if (!m.puede) return;
    if (t.id === ID.cofre) abrirCofre(t.x, t.y, t.z);
    if (mundo.poner(t.x, t.y, t.z, 0) == null) return;
    const b = bloque(t.id); audio.tocar('romper', { semilla: t.id }); polvo(t.x + 0.5, t.y + 0.5, t.z + 0.5, colorBloque(t.id), 12);
    if (m.suelta && b.suelta && (b.probSuelta == null || azarJuego.num() < b.probSuelta)) { sup.meter(b.suelta, 1); if (b.xp) sup.ganarXP(b.xp); }
    if (m.buena) sup.gastarHerramienta();
    ui.pintarBarra();
  }
  function abrirCofre(x, y, z) {
    const k = `${x},${y},${z}`; if (cofresAbiertos.has(k) || !cfg.modulos.cofres) return false;
    cofresAbiertos.add(k); sup.cont.cofres++;
    const ch = mundo.chunk(Math.floor(x / 16), Math.floor(z / 16)), mk = ch?.marcadores.find((m) => m.tipo === 'cofre' && m.x === x && m.y === y && m.z === z);
    const botin = BOTIN[mk?.botin || 'ruina'], h = (Math.imul(x * 73856093 ^ y * 19349663 ^ z * 83492791, 2654435761) >>> 0);
    const dado = botin.map(([it, a, b], i) => [it, a + ((h >>> (i * 4)) % (b - a + 1))]);
    for (const [it, n] of dado) sup.meter(it, n);
    ui.aviso(`Cofre: ${dado.map(([it, n]) => `${n} ${nombreDe(it)}`).join(', ')}`); audio.tocar('recoger'); ui.pintarBarra(); return true;
  }
  function estacionesCerca() {
    const s = new Set(), [x0, y0, z0] = [Math.floor(jug.c.x), Math.floor(jug.c.y), Math.floor(jug.c.z)];
    for (let y = y0 - 2; y <= y0 + 3; y++) for (let z = z0 - 4; z <= z0 + 4; z++) for (let x = x0 - 4; x <= x0 + 4; x++) { const b = bloque(mundo.bloque(x, y, z)); if (b.estacion) s.add(b.estacion); }
    return s;
  }
  function usar() {
    const t = apuntar();
    if (t.e) { if (t.e.t.clase === 'comerciante') { if (cfg.modulos.comercio) { soltarRaton(); ui.abrirInventario({ estaciones: estacionesCerca(), ofertas: OFERTAS }); } else ui.aviso(`${t.e.t.nombre}: «¡Buen viaje, ${datos.nombre || 'viajero'}!»`); return; }
      if (t.e.t.clase === 'exploradora') { const c = gen.estructuras.cerca(jug.c.x, jug.c.z, 400).find((e) => !sup.visitadas.has(e.tipo)); ui.aviso(c ? `${t.e.t.nombre}: «Hay ${c.tipo === 'aldea' ? 'una aldea' : c.tipo === 'ruina' ? 'unas ruinas' : 'un(a) ' + c.tipo} a ${Math.round(Math.hypot(c.x - jug.c.x, c.z - jug.c.z))} bloques»` : `${t.e.t.nombre}: «Ya lo has visto todo por aquí»`, 3500); jug.objetivo = c || jug.objetivo; return; } }
    if (sup.enMano && !esBloque(sup.enMano.it) && sup.comer()) { audio.tocar('recoger'); ui.pintarBarra(); return; }
    if (!t.b) return;
    if (t.b.id === ID.cofre && abrirCofre(t.b.x, t.b.y, t.b.z)) return;
    if ((t.b.id === ID.mesa || t.b.id === ID.horno) && !sup.enMano?.it?.match?.(/^(mesa|horno)$/)) { soltarRaton(); ui.abrirInventario({ estaciones: estacionesCerca() }); return; }
    const x = sup.enMano; if (!x || !esBloque(x.it)) return;
    // sobre hierba alta o una flor el bloque nuevo ocupa su lugar (no flota encima): así se puede apilar bajo los pies
    const encima = bloque(t.b.id).forma === 'planta' && t.b.id !== ID.antorcha && t.b.id !== ID.bandera;
    const p = encima ? [t.b.x, t.b.y, t.b.z] : [t.b.x + t.b.nx, t.b.y + t.b.ny, t.b.z + t.b.nz], ya = mundo.bloque(...p);
    if (ya < 0 || (T.solido[ya] && ya !== 0) || dentroDelCuerpo(jug.c, ...p)) return;   // nunca dentro del jugador
    jug.golpeAnim = 0.25;
    if (criaturas.lista.some((e) => { const w = 0.3 * (e.t.escala || 1); return p[0] + 1 > e.x - w && p[0] < e.x + w && p[2] + 1 > e.z - w && p[2] < e.z + w && p[1] + 1 > e.y && p[1] < e.y + e.t.alto * (e.t.escala || 1); })) return;   // ni dentro de una criatura
    if (!sup.sacar(x.it, 1)) return;
    if (mundo.poner(p[0], p[1], p[2], PORCLAVE[x.it].id) == null) { sup.meter(x.it, 1); return; }
    sup.cont.poner++; sup.cont.poner_bloque[x.it] = (sup.cont.poner_bloque[x.it] || 0) + 1; jug.maxPuesto = Math.max(jug.maxPuesto, p[1]);
    audio.tocar('poner'); jug.golpeAnim = 0.25; ui.pintarBarra();
  }
  function evento(t, a) {
    if (t === 'aviso') ui.aviso(a); if (t === 'nivel') { ui.aviso(`¡Nivel ${a}!`); audio.tocar('mision'); } if (t === 'fabricar') ui.aviso(`Fabricaste: ${nombreDe(a)}`);
    if (t === 'muerte') morir(a);
  }
  function morir(causa) {
    sup.muertes++; audio.tocar('derrota');
    if (cfg.resultado.derrota === 'fin') { fin(false, `Tu salud llegó a cero (${causa}).`); return; }
    if (cfg.resultado.derrota === 'perder_objetos') sup.inv.fill(null);
    Object.assign(jug.c, { x: inicio[0] + 0.5, y: inicio[1], z: inicio[2] + 0.5, vx: 0, vy: 0, vz: 0 }); jug.c.caidaDesde = jug.c.y;
    sup.salud = cfg.supervivencia.saludMax; sup.hambre = 20; ui.aviso('Reapareces en el punto de inicio'); ui.pintarBarra();
  }
  function fin(gano, texto) {
    if (terminado) return; terminado = true; pausado = true; soltarRaton();
    audio.tocar(gano ? 'victoria' : 'derrota');
    hud.menu(gano ? '¡Lo lograste!' : 'Fin de la partida', texto, [{ texto: 'Seguir explorando', accion: () => { terminado = false; pausado = false; puntero.pedir(); } }, { texto: 'Empezar de nuevo', accion: () => nueva() }]);
  }
  // ---------------------------------------------------------------- guardar y continuar (delta en IndexedDB)
  const almacen = almacenIDB(), claveGuardado = `${plantilla}:${cfg.semilla}`;
  async function estadoPartida() {
    return { semilla, semillaTexto: cfg.semilla, plantilla, jugador: { x: jug.c.x, y: jug.c.y, z: jug.c.z, yaw: jug.yaw, pitch: jug.pitch, camara: jug.camara, volando: jug.c.volando }, inventario: sup.exportar(), entidades: criaturas.exportar(), juego: { hora, dias, tiempoJuego, cofres: [...cofresAbiertos], vencidos: [...vencidos], maxAltura: jug.maxAltura, minAltura: jug.minAltura, maxPuesto: jug.maxPuesto } };
  }
  async function guardar(silencio = false) { const o = await guardarPartida(almacen, claveGuardado, await estadoPartida(), mundo.exportarDeltas()); if (!silencio) ui.aviso(`Guardado: ${o.cambios} bloques cambiados`); return o; }
  function restaurar(o) {
    mundo.importarDeltas(o.deltas); const j = o.jugador || {}; nuevoInicio = false;
    Object.assign(jug.c, { x: +j.x || jug.c.x, y: +j.y || jug.c.y, z: +j.z || jug.c.z, vx: 0, vy: 0, vz: 0 }); jug.c.caidaDesde = jug.c.y; jug.yaw = +j.yaw || 0; jug.pitch = +j.pitch || 0; jug.camara = j.camara === 'tercera' ? 'tercera' : 'primera'; jug.c.volando = !!j.volando && cfg.jugador.vuelo;
    Object.assign(jug, { px: jug.c.x, py: jug.c.y, pz: jug.c.z });
    sup.importar(o.inventario); const g = o.juego || {}; hora = +g.hora || hora; dias = +g.dias || 0; tiempoJuego = +g.tiempoJuego || 0;
    for (const k of g.cofres || []) cofresAbiertos.add(k); for (const k of g.vencidos || []) vencidos.add(k);
    jug.maxAltura = g.maxAltura ?? jug.maxAltura; jug.minAltura = g.minAltura ?? jug.minAltura; jug.maxPuesto = g.maxPuesto || 0;
    if (o.avisoVersion) ui.aviso(o.avisoVersion, 6000);
    ui.pintarBarra();
  }
  // «Empezar de nuevo»: inventario, misiones, bloques cambiados, cofres, criaturas vencidas, hora y posición de inicio
  function nueva() {
    sup.inicial(); sup.prepararMisiones(misiones); mundo.reiniciarDeltas(); cofresAbiertos.clear(); vencidos.clear();
    for (const c of mundo.chunks.values()) criaturas.desdeMarcadores(c.marcadores, vencidos);
    hora = cfg.ambiente.horaInicio; dias = 0; tiempoJuego = 0;
    Object.assign(jug.c, { x: inicio[0] + 0.5, y: inicio[1], z: inicio[2] + 0.5, vx: 0, vy: 0, vz: 0, volando: false }); jug.c.caidaDesde = jug.c.y; Object.assign(jug, { px: jug.c.x, py: jug.c.y, pz: jug.c.z, maxAltura: inicio[1], minAltura: inicio[1], maxPuesto: 0 });
    jug.yaw = elegirMirada(); jug.pitch = -0.12;
    ui.pintarBarra(); terminado = false; pausado = false; guardar(true).catch(() => {});
  }
  async function exportar() { const o = await serializar(await estadoPartida(), mundo.exportarDeltas()); const a = document.createElement('a'); a.href = URL.createObjectURL(exportarArchivo(o)); a.download = `mundo-${String(cfg.semilla).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  function importar() { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => { try { restaurar(await importarArchivo(await i.files[0].text())); ui.aviso('Mundo importado'); } catch (e) { ui.aviso('No se pudo importar: ' + e.message, 4000); } }; i.click(); }
  function pausa() {
    pausado = true; soltarRaton();
    // la ayuda sale del mapa de teclas en uso: si el alumno cambió los controles, aquí se ven los suyos
    const t = (a) => nombreTecla(entrada.mapa[a]?.[0]);
    const ayuda = `${t('adelante')} ${t('izq')} ${t('atras')} ${t('der')} caminar · ${t('salto')} ${cfg.jugador.vuelo ? 'saltar (dos veces: volar)' : 'saltar'} · ${t('carrera')} correr · ${t('agachar')} agacharte · clic izq. o ${t('romper')} romper · clic der. o ${t('usar')} poner${cfg.modulos.inventario ? ` · ${t('inventario')} inventario` : ''}${cfg.modulos.misiones ? ` · ${t('misiones')} misiones` : ''} · ${t('camara')} cámara · ${t('rayos')} rayos X`;
    hud.menu('Pausa', `${ayuda}. Semilla «${cfg.semilla}» · ${PERFILES[perfilId].nombre} · F3: monitor`, [
      { texto: 'Seguir', accion: () => { pausado = false; puntero.pedir(); } }, { texto: 'Guardar partida', accion: () => { guardar(); pausado = false; } },
      { texto: 'Exportar mundo (archivo)', accion: () => { exportar(); pausado = false; } }, { texto: 'Importar mundo', accion: () => { importar(); pausado = false; } },
      { texto: `Cámara: ${jug.camara === 'primera' ? 'primera' : 'tercera'} persona (F)`, accion: () => { jug.camara = jug.camara === 'primera' ? 'tercera' : 'primera'; pausado = false; } }]);
  }
  // ---------------------------------------------------------------- configuración en caliente (Editor de Forja)
  addEventListener('message', (ev) => {
    if (ev.data?.forja !== 'config' || !ev.data.config) return;
    if (validar(ev.data.config, ESQUEMA).length) return;
    const n = conDefectos(ev.data.config, ESQUEMA);
    Object.assign(cfg.ambiente, n.ambiente); Object.assign(cfg.render, { niebla: n.render.niebla, olas: n.render.olas, brilloBloques: n.render.brilloBloques, distancia: n.render.distancia });
    Object.assign(cfg.jugador, n.jugador); Object.assign(jug.c.f, fisicaDe(n)); Object.assign(cfg.criaturas, n.criaturas); Object.assign(cfg.audio, n.audio); Object.assign(cfg.accesibilidad, n.accesibilidad); Object.assign(cfg.supervivencia, n.supervivencia);
    mundo.radio = distancia(); audio.volumen = cfg.audio.volumen; audio.silencio = !cfg.audio.efectos || cfg.audio.volumen <= 0;
    ui.aviso('Configuración aplicada en vivo');
  });

  // ---------------------------------------------------------------- simulación (paso fijo)
  let relojMundo = 0, relojLento = 0, ultimoBioma = null, mallasAntes = 0;
  const solido = solidoDe(mundo);
  // Carga: hasta que los 3×3 chunks de alrededor no tengan malla, el mundo no corre (ni gravedad, ni hambre, ni reloj).
  // Así nunca se aparece flotando sobre un hueco, metido en un árbol o mirando al vacío mientras el terreno llega.
  let listo = false, tiempoCarga = 0, nuevoInicio = true;
  const velo = document.createElement('div'); velo.textContent = 'Generando el mundo…';
  velo.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;background:#0e0b16;color:#c6ff4a;font:700 18px system-ui,sans-serif;z-index:7;transition:opacity .4s';
  cont.appendChild(velo);
  function revisarCarga() {
    const cx = Math.floor(jug.c.x / 16), cz = Math.floor(jug.c.z / 16);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const c = mundo.chunk(cx + dx, cz + dz); if (!c || !render.geoms.has(c.k)) return false; }
    return true;
  }
  function arrancar() {
    listo = true;
    if (nuevoInicio && asentarInicio()) { Object.assign(jug.c, { x: inicio[0] + 0.5, y: inicio[1], z: inicio[2] + 0.5, vx: 0, vy: 0, vz: 0 }); jug.maxAltura = jug.minAltura = inicio[1]; }
    for (let i = 0; i < 40 && atascado(jug.c, solido); i++) jug.c.y = Math.floor(jug.c.y) + 1;   // nunca dentro de un bloque
    jug.c.caidaDesde = jug.c.y; jug.c.enSuelo = true;
    if (nuevoInicio) { jug.yaw = jug.giroAv = elegirMirada(); jug.pitch = -0.12; }
    Object.assign(jug, { px: jug.c.x, py: jug.c.y, pz: jug.c.z });
    velo.style.opacity = '0'; setTimeout(() => velo.remove(), 450);
  }
  const giroHacia = (a, b, k) => a + ((((b - a) % 6.2832) + 9.4248) % 6.2832 - 3.1416) * k;
  function actualizar(dt) {
    const s = entrada.muestrear(), r = s.recien;
    if (!listo) { tiempoCarga += dt; relojMundo += dt; if (relojMundo > 0.1) { relojMundo = 0; mundo.actualizar(jug.c.x, jug.c.z); } if (revisarCarga() || tiempoCarga > 12) arrancar(); return; }
    if (r.has('pausa')) { if (ui.abierto()) { ui.cerrar(); lienzo.focus(); puntero.pedir(); } else if (!hud.hayMenu) { pausa(); return; } }
    if (r.has('inventario') && cfg.modulos.inventario) { if (ui.abierto()) { ui.cerrar(); lienzo.focus(); puntero.pedir(); } else { soltarRaton(); raton.izq = false; ui.abrirInventario({ estaciones: estacionesCerca() }); } }
    if (pausado || hud.hayMenu) return;
    if (r.has('misiones')) ui.alternarMisiones();
    if (r.has('camara')) jug.camara = jug.camara === 'primera' ? 'tercera' : 'primera';
    if (r.has('rayos')) { jug.rayos = !jug.rayos; ui.aviso(jug.rayos ? 'Rayos X: cajas de choque y estados (V)' : 'Rayos X apagados', 1600); }
    if (r.has('guardar')) guardar();
    if (r.has('comer') && sup.comer()) ui.pintarBarra();
    if (r.has('usar') && !ui.abierto()) usar();
    for (let n = 1; n <= 9; n++) if (r.has('h' + n) && cfg.modulos.hotbar) { sup.mano = n - 1; ui.pintarBarra(); }
    if (r.has('salto') && cfg.jugador.vuelo) { if (tiempoJuego - ultimoEspacio < 0.3) { jug.c.volando = !jug.c.volando; ui.aviso(jug.c.volando ? 'Volando' : 'A pie'); } ultimoEspacio = tiempoJuego; }
    tiempoJuego += dt;
    const ab = s.abajo, enUI = ui.abierto();
    const fx = Math.sin(jug.yaw), fz = -Math.cos(jug.yaw), rx = Math.cos(jug.yaw), rz = Math.sin(jug.yaw);
    let mx = 0, mz = 0; if (!enUI) { const a = (ab.has('adelante') ? 1 : 0) - (ab.has('atras') ? 1 : 0), b = (ab.has('der') ? 1 : 0) - (ab.has('izq') ? 1 : 0); mx = fx * a + rx * b; mz = fz * a + rz * b; const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; } }
    jug.corriendo = !enUI && ab.has('carrera') && sup.puedeCorrer() && !!(mx || mz);
    jug.px = jug.c.x; jug.py = jug.c.y; jug.pz = jug.c.z; jug.psuave = jug.suave;
    const res = pasoCuerpo(jug.c, dt, { x: mx, z: mz, salto: !enUI && ab.has('salto'), carrera: jug.corriendo, agachar: !enUI && ab.has('agachar'), subir: !enUI && ab.has('salto'), bajar: !enUI && ab.has('agachar'), adelante: !enUI && ab.has('adelante') }, mundo, solido);
    // escalón suavizado: la física sube el bloque de golpe; la cámara y el avatar lo recorren en ~0,15 s
    jug.suave = (jug.suave + (res.subida || 0)) * Math.exp(-dt * 16); if (jug.suave < 0.002) jug.suave = 0;
    // las criaturas no se atraviesan: el jugador se corre lo que le toca (si cabe)
    const [ex, ez] = criaturas.empujar(jug.c);
    if (ex || ez) { const x0 = jug.c.x, z0 = jug.c.z; jug.c.x += ex; if (atascado(jug.c, solido)) jug.c.x = x0; jug.c.z += ez; if (atascado(jug.c, solido)) jug.c.z = z0; }
    if (cfg.mundo.borde > 0) { const B = cfg.mundo.borde; if (Math.abs(jug.c.x) > B || Math.abs(jug.c.z) > B) { jug.c.x = Math.max(-B, Math.min(B, jug.c.x)); jug.c.z = Math.max(-B, Math.min(B, jug.c.z)); if (!jug._avBorde) { ui.aviso('Llegaste al borde del mundo'); jug._avBorde = true; } } else jug._avBorde = false; }
    if (res.dano && cfg.modulos.danoAmbiental && cfg.supervivencia.danoCaida > 0) { if (sup.dano(Math.round(res.dano * cfg.supervivencia.danoCaida), 'caída')) { ui.dano(); audio.tocar('dano'); jug.sacude = 0.25; } }
    if (cfg.modulos.danoAmbiental && mundo.bloque(Math.floor(jug.c.x), Math.floor(jug.c.y - 0.1), Math.floor(jug.c.z)) === ID.cactus && (jug._cac = (jug._cac || 0) + dt) > 0.8) { jug._cac = 0; if (sup.dano(1, 'cactus')) ui.dano(); }
    if (cfg.audio.pasos && jug.c.enSuelo && (mx || mz) && (jug._paso = (jug._paso || 0) + dt * (jug.corriendo ? 1.6 : 1)) > 0.42) { jug._paso = 0; audio.tocar(jug.c.enAgua ? 'agua' : 'paso', { volumen: 0.35 }); }
    sup.paso(dt, jug.c, jug.corriendo);
    // animación del avatar: la zancada avanza con la distancia recorrida; el cuerpo gira hacia donde camina
    const vh = Math.hypot(jug.c.vx, jug.c.vz);
    jug.fase = (jug.fase + (vh * dt * Math.PI * 2) / 1.7) % (Math.PI * 2);
    jug.amp += ((jug.c.enSuelo || jug.c.enAgua ? Math.min(0.95, (vh / 4.4) * 0.6) : 0) - jug.amp) * Math.min(1, dt * 10);
    if (jug.golpeAnim > 0 || raton.izq) jug.giroAv = giroHacia(jug.giroAv, jug.yaw, Math.min(1, dt * 14));
    else if (vh > 0.3) jug.giroAv = giroHacia(jug.giroAv, Math.atan2(jug.c.vx, -jug.c.vz), Math.min(1, dt * 10));
    const vr = jug.c.vx * Math.cos(jug.yaw) + jug.c.vz * Math.sin(jug.yaw); if (Math.abs(vr) > 0.4) jug.mira = Math.sign(vr);
    if (jug.golpeAnim > 0) jug.golpeAnim -= dt; if (jug.sacude > 0) jug.sacude -= dt;
    // minar: mantener el clic izquierdo (o J); las criaturas apuntadas reciben el golpe
    const golpea = (raton.izq || ab.has('romper')) && !enUI;
    if (!golpea) { jug.esperaSoltar = false; if (jug.minando) { jug.minando = null; ui.progreso(0); } }
    if (golpea && !jug.esperaSoltar) {
      const t = apuntar();
      if (t.e) {
        if (!jug._golpe || tiempoJuego - jug._golpe > 0.45) {
          jug._golpe = tiempoJuego; jug.golpeAnim = 0.25;
          criaturas.golpear(t.e, sup.danoArma(), [t.e.x - jug.c.x, 0, t.e.z - jug.c.z]); audio.tocar('golpe_ligero'); sup.gastarHerramienta();
          polvo(t.e.x, t.e.y + t.e.t.alto * (t.e.t.escala || 1) * 0.6, t.e.z, [1, 0.35, 0.3], 5, 0.5);
        }
        jug.minando = null; ui.progreso(0);
      } else if (t.b) {
        const k = `${t.b.x},${t.b.y},${t.b.z}`;
        if (!jug.minando || jug.minando.k !== k) jug.minando = { k, t: 0, ...sup.minado(t.b.id) };
        if (jug.golpeAnim <= 0) jug.golpeAnim = 0.25;
        if (jug.minando.puede) {
          jug.minando.t += dt; const p = jug.minando.segundos ? jug.minando.t / jug.minando.segundos : 1; ui.progreso(Math.min(1, p));
          if (jug.minando.segundos && Math.floor(jug.minando.t / 0.25) !== Math.floor((jug.minando.t - dt) / 0.25)) polvo(t.b.x + 0.5 + t.b.nx * 0.55, t.b.y + 0.5 + t.b.ny * 0.55, t.b.z + 0.5 + t.b.nz * 0.55, colorBloque(t.b.id), 2, 0.4);
          if (p >= 1) { romper(t.b); jug.minando = null; ui.progreso(0); if (sup.creativo || cfg.modulos.minado === 'instantaneo') { raton.izq = false; jug.esperaSoltar = true; } }
        }
      } else if (jug.minando) { jug.minando = null; ui.progreso(0); }
    }
    const noche = hora < 0.22 || hora > 0.8;
    criaturas.paso(dt, { x: jug.c.x, y: jug.c.y, z: jug.c.z, enSuelo: jug.c.enSuelo, corriendo: jug.corriendo }, { noche, mar: MAR, pacifica: cfg.supervivencia.dificultad === 'pacifica', biomaEn: (x, z) => gen.columna(x, z).bioma });
    pasoParticulas(dt);
    if (cfg.ambiente.cicloDia) { const antes = hora; hora += dt / cfg.ambiente.duracionDia; if (hora >= 1) { hora -= 1; dias++; } if (antes < 0.25 && hora >= 0.25 && tiempoJuego > 30) sup.cont.noches++; }
    relojMundo += dt; if (relojMundo > 0.1) { relojMundo = 0; mundo.actualizar(jug.c.x, jug.c.z, jug.c.vx, jug.c.vz); }
    jug.maxAltura = Math.max(jug.maxAltura, jug.c.y); jug.minAltura = Math.min(jug.minAltura, jug.c.y);
    relojLento += dt;
    if (relojLento > 0.5) {
      relojLento = 0;
      const col = gen.columna(Math.floor(jug.c.x), Math.floor(jug.c.z)); sup.biomas.add(col.bioma.id);
      if (ultimoBioma !== col.bioma.id) { if (ultimoBioma) ui.aviso(col.bioma.nombre, 1600); ultimoBioma = col.bioma.id; }
      for (const e of gen.estructuras.cerca(jug.c.x, jug.c.z, 40)) { const rr = e.tipo === 'mazmorra' ? 30 : e.tipo === 'aldea' ? 26 : 14, yOk = e.tipo !== 'mazmorra' || jug.c.y < col.h - 6; if (Math.hypot(e.x - jug.c.x, e.z - jug.c.z) < rr && yOk && !sup.visitadas.has(e.tipo)) { sup.visitadas.add(e.tipo); ui.aviso(`Descubriste: ${{ aldea: 'una aldea', ruina: 'unas ruinas', mazmorra: 'la mazmorra', torre: 'una torre', templo: 'un templo', campamento: 'un campamento' }[e.tipo]}`); } }
      const ctx = contexto(), nuevas = sup.revisarMisiones(ctx);
      for (const m of nuevas) { ui.aviso(`✓ ${m.texto}`, 3000); audio.tocar('mision'); hud.texto('MISIÓN CUMPLIDA', { y: 64, color: '#c6ff4a', ms: 1200 }); }
      if (cfg.modulos.misiones) ui.misiones(sup.misiones, sup.completas, ctx);
      if (cfg.resultado.fin === 'misiones' && sup.misiones.length && sup.misiones.every((m) => sup.completas.has(m.id))) fin(true, `Cumpliste las ${sup.misiones.length} misiones.`);
      if (cfg.resultado.fin === 'jefe' && (sup.vencidos.guardian || 0) > 0) fin(true, 'El guardián de la mazmorra cayó: el reino perdido vuelve a estar en paz.');
      if (cfg.resultado.fin === 'tiempo' && tiempoJuego > cfg.resultado.tiempo) fin(true, `Se acabó el tiempo: pusiste ${sup.cont.poner} bloques y descubriste ${sup.biomas.size} biomas.`);
      // objetivo de la brújula: la estructura de la siguiente misión «visitar»; en «abre cofres», el cofre cerrado más cercano
      const sig = sup.siguiente; jug.objetivo = sig?.tipo === 'visitar' ? gen.estructuras.cerca(jug.c.x, jug.c.z, 700).find((e) => e.tipo === sig.estructura) || null : sig?.tipo === 'cofres' && cfg.modulos.cofres ? cofreCercano() : jug.objetivo && jug.objetivo.tipo !== 'cofre' && !sup.visitadas.has(jug.objetivo.tipo) ? jug.objetivo : null;
      if (relojAuto++ > 60) { relojAuto = 0; guardar(true).catch(() => {}); }   // cada 30 s
    }
  }
  let relojAuto = 0;
  function cofreCercano() {
    let mejor = null, dm = 1e9;
    for (const c of mundo.chunks.values()) for (const m of c.marcadores) { if (m.tipo !== 'cofre' || cofresAbiertos.has(`${m.x},${m.y},${m.z}`) || mundo.bloque(m.x, m.y, m.z) !== ID.cofre) continue; const d = Math.hypot(m.x - jug.c.x, m.z - jug.c.z); if (d < dm) { dm = d; mejor = { tipo: 'cofre', x: m.x + 0.5, z: m.z + 0.5 }; } }
    return mejor || gen.estructuras.cerca(jug.c.x, jug.c.z, 500).find((e) => ['ruina', 'torre', 'templo', 'campamento'].includes(e.tipo) && Math.hypot(e.x - jug.c.x, e.z - jug.c.z) > 12) || null;
  }
  const contexto = () => ({ mar: MAR, maxAltura: jug.maxAltura, minAltura: jug.minAltura, maxPuesto: jug.maxPuesto, distancia: Math.hypot(jug.c.x - inicio[0], jug.c.z - inicio[2]) });

  // ---------------------------------------------------------------- dibujo (interpolado)
  let dtAcum = 0, ojoReloj = 0, ojoMeta = 0, ojoBajo = 0, expo = 1, relojLuz = 0, aguaSuave = null;
  // luz de bloques aproximada en un punto (0..1, como el BFS del mallado: la fuente emisiva más cercana menos la
  // distancia): así una criatura o el avatar junto a una lámpara de la mazmorra no se ven negros. Caché por celda.
  const cacheLuz = new Map();
  function luzEn(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), k = X + ',' + Y + ',' + Z; let v = cacheLuz.get(k); if (v != null) return v;
    v = 0;
    for (let dy = -3; dy <= 4; dy++) for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) { const id = mundo.bloque(X + dx, Y + dy, Z + dz); if (id > 0 && T.luz[id]) { const l = (T.luz[id] - Math.abs(dx) - Math.abs(dy) - Math.abs(dz)) / 15; if (l > v) v = l; } }
    cacheLuz.set(k, v); return v;
  }
  const luzCurva = (l) => Math.pow(l, 3.6) * 2.6 * cfg.render.brilloBloques;
  // ¿la cámara está bajo tierra? techo opaco encima y varios bloques por debajo de la superficie del terreno (0..1)
  function bajoTierraEn(c, col) {
    const hondo = col.h - c.y; if (hondo < 2) return 0;
    const x = Math.floor(c.x), z = Math.floor(c.z);
    for (let y = Math.floor(c.y) + 1; y < Math.min(H, Math.floor(c.y) + 48); y++) { const id = mundo.bloque(x, y, z); if (id > 0 && T.opaco[id]) return Math.min(1, (hondo - 1) / 6); }
    return 0;
  }
  function dibujar(alfa, dt) {
    hud.tick();
    const suave = jug.psuave + (jug.suave - jug.psuave) * alfa;   // el escalón se recorre, no se salta
    const x = jug.px + (jug.c.x - jug.px) * alfa, y = jug.py + (jug.c.y - jug.py) * alfa - suave, z = jug.pz + (jug.c.z - jug.pz) * alfa;
    const mueve = !acc.reducirMovimiento;
    // cabeceo al caminar: sigue la zancada (dos pasos por ciclo), no el reloj; sacudida corta al recibir daño
    const balanceo = mueve && jug.c.enSuelo ? Math.sin(jug.fase * 2) * 0.035 * Math.min(1, jug.amp / 0.5) : 0;
    const sac = mueve && jug.sacude > 0 ? jug.sacude * 0.25 : 0;
    let cam = { x: x + Math.sin(tiempoJuego * 71) * sac, y: y + (jug.c.agachado ? 1.25 : 1.62) + balanceo + Math.sin(tiempoJuego * 53) * sac, z: z + Math.cos(tiempoJuego * 67) * sac, yaw: jug.yaw, pitch: jug.pitch };
    let distCam = 0;
    if (jug.camara === 'tercera') {   // sobre el hombro: retrocede hasta 3,6 bloques desde el pivote, sin meterse en la pared
      const p = pivote([x, y + (jug.c.agachado ? 1.25 : 1.62), z]), d = adelante(jug.yaw, jug.pitch);
      const hit = lanzarRayo((a, b, c) => mundo.bloque(a, b, c), p[0], p[1], p[2], -d[0], -d[1], -d[2], 3.9, opaco);
      distCam = hit ? Math.max(0.2, hit.dist - 0.3) : 3.6;
      cam = { ...cam, x: p[0] - d[0] * distCam, y: p[1] - d[1] * distCam, z: p[2] - d[2] * distCam };
    }
    const bajoAgua = T.liquido[mundo.bloque(Math.floor(cam.x), Math.floor(cam.y), Math.floor(cam.z))] === 1;
    const col = gen.columna(Math.floor(x), Math.floor(z));
    const tipoClima = climaDe(cfg, col.bioma, dias + hora, semilla);
    // adaptación del ojo: bajo tierra (cueva, mazmorra) la exposición sube despacio, como al entrar a un túnel
    if ((ojoReloj -= dt) <= 0) { ojoReloj = 0.25; ojoMeta = bajoTierraEn(cam, col); }
    ojoBajo += (ojoMeta - ojoBajo) * (1 - Math.exp(-dt * 1.4));
    const amb = cielo(hora, col.bioma, cfg, bajoAgua, { clima: bajoAgua ? null : tipoClima, bajoTierra: ojoBajo, distancia: distancia() });
    expo += (amb.exposicion - expo) * (1 - Math.exp(-dt * 2));
    const ka = 1 - Math.exp(-dt * 0.8); aguaSuave = aguaSuave ? aguaSuave.map((v, i) => v + (amb.aguaColor[i] - v) * ka) : amb.aguaColor.slice(); amb.aguaColor = aguaSuave;   // el agua cambia de color despacio entre biomas
    const objetos = [];
    if ((relojLuz += dt) > 1.5) { relojLuz = 0; cacheLuz.clear(); }
    // criaturas: cerca se dibujan despiezadas (patas y brazos animados por su velocidad); lejos, de una pieza
    for (const e of criaturas.lista) {
      if (!e.activa) continue;
      const ex = e.px + (e.x - e.px) * alfa, ey = e.py + (e.y - e.py) * alfa, ez = e.pz + (e.z - e.pz) * alfa, esc = e.t.escala || 1, g = geomDe(e.tipo), giro = -e.giro;
      const carga0 = e.t.clase === 'jefe' ? 0.6 : 0.4, enCarga = e.carga > 0 ? 1 - e.carga / carga0 : 0;
      const luzE = Math.max(e.t.luz || 0, Math.hypot(ex - cam.x, ez - cam.z) < 40 ? luzCurva(luzEn(ex, ey + 0.6, ez)) : 0);
      const tinte = e.muriendo != null ? [0.85, 0.85, 0.85, 0.65 * (1 - e.muriendo / 0.6)] : e.golpe > 0 ? [1, 0.2, 0.2, 0.5] : e.carga > 0 ? [1, 0.95, 0.55, 0.15 + 0.25 * enCarga] : e.slam != null ? [1, 1, 1, 0.5 * (1 - e.slam / 0.8)] : null;
      if (e.muriendo != null || !g.piezas.length || Math.hypot(ex - cam.x, ez - cam.z) > 28) {   // derribada: cae de espaldas
        objetos.push({ geom: g.entero, x: ex, y: ey, z: ez, giro, escala: esc, tinte, luz: luzE, pivote: [0, 0, 0.3], balanceo: e.muriendo != null ? -1.45 * Math.min(1, (0.6 - e.muriendo) / 0.35) : 0 });
        continue;
      }
      const bote = Math.abs(Math.sin(e.fase)) * 0.05 * e.amp * esc, inclina = e.carga > 0 ? -0.3 * enCarga : e.ataque > 0 ? 0.35 * (e.ataque / 0.25) : 0;
      if (g.cuerpo) objetos.push({ geom: g.cuerpo, x: ex, y: ey + bote, z: ez, giro, escala: esc, tinte, luz: luzE, pivote: [0, 0, 0], balanceo: inclina });
      for (const q of g.piezas) {
        let b = Math.sin(e.fase + q.fase) * e.amp * (q.tipo === 'brazo' ? 0.8 : 1);
        if (q.tipo === 'brazo' && e.carga > 0) b = 2.4 * enCarga; else if (q.tipo === 'brazo' && e.ataque > 0) b = 2.4 * (e.ataque / 0.25) - 0.3;
        if (q.tipo === 'pata' && !e.enSuelo && !e.t.vuela) b = (q.fase ? -0.35 : 0.45);
        objetos.push({ geom: q.geom, x: ex, y: ey + (q.tipo === 'brazo' ? bote : 0), z: ez, giro, escala: esc, tinte, luz: luzE, pivote: q.pivote, balanceo: b });
      }
      if (jug.rayos) objetos.push({ geom: geomMarcoCaja(0.6 * esc, e.t.alto * esc, 0.6 * esc, e.estado === 'atacar' || e.estado === 'perseguir' ? [255, 70, 70] : e.estado === 'huir' ? [255, 200, 60] : [120, 255, 140]), x: ex, y: ey, z: ez, escala: 1, tinte: null, luz: 1 });
    }
    for (const q of particulas) objetos.push({ geom: geomParticula, x: q.px + (q.x - q.px) * alfa, y: q.py + (q.y - q.py) * alfa, z: q.pz + (q.z - q.pz) * alfa, escala: q.tam * (1 - 0.5 * q.t / q.vida), tinte: [...q.color, 0.9] });
    const t = !ui.abierto() && !pausado && listo ? apuntar() : null;
    if (t?.b) objetos.push({ geom: geomMarco, x: t.b.x, y: t.b.y, z: t.b.z, escala: 1 });
    let sprite = null;
    if (jug.rayos) objetos.push({ geom: geomMarcoCaja(0.6, jug.c.agachado ? 1.5 : 1.8, 0.6, [80, 200, 255]), x, y, z, escala: 1, luz: 1 });
    if (jug.camara === 'tercera' && distCam > 0.9) {   // con la cámara pegada a la cabeza el avatar taparía todo: no se dibuja
      const aire = !jug.c.enSuelo && !jug.c.enAgua && !jug.c.volando, agach = jug.c.agachado;
      if (spriteImg && heroe) {
        // personaje 2D del alumno: mira a la izquierda o a la derecha según se mueve en la pantalla; los cuadros de la
        // caminata avanzan con la distancia recorrida; en el aire, el cuadro del salto según suba o caiga
        const mov = jug.amp > 0.12, anim = aire ? 'saltar' : mov ? (jug.corriendo ? 'correr' : 'caminar') : agach ? 'agachado' : 'quieto';
        const cuadros = heroe.anim[anim] || heroe.anim.caminar || heroe.anim.quieto || Object.values(heroe.anim)[0], n = cuadros.length;
        const i = anim === 'saltar' ? Math.min(n - 1, Math.max(0, Math.floor(((5 - jug.c.vy) / 10) * n))) : mov ? Math.floor((jug.fase / (Math.PI * 2)) * n * 2) % n : Math.floor(tiempoJuego * 6) % n;
        const f = cuadros[i] || cuadros[0], W = heroe.imagen.width, Hh = heroe.imagen.height;
        const altoM = 1.9 / (datos.heroe?.relAlto || 0.8);
        sprite = { luz: luzCurva(luzEn(x, y + 1, z)), imagen: spriteImg, x, y: y - altoM * 0.04, z, tam: [altoM, altoM], marco: jug.mira < 0 ? [(f.x + f.w) / W, f.y / Hh, -f.w / W, f.h / Hh] : [f.x / W, f.y / Hh, f.w / W, f.h / Hh] };
      } else {
        // muñeco de cajas: piernas y brazos opuestos al ritmo de la zancada; salto con las piernas recogidas; el brazo
        // derecho golpea al romper o atacar; la cabeza sigue la mirada hacia arriba o abajo
        const giro = -jug.giroAv, osc = Math.sin(jug.fase) * jug.amp, yb = y - (agach ? 0.18 : 0) + (mueve ? Math.abs(Math.sin(jug.fase)) * 0.04 * jug.amp : 0);
        const golpe = jug.golpeAnim > 0 ? Math.sin((1 - jug.golpeAnim / 0.25) * Math.PI) * 1.9 + 0.3 : null;
        const pI = aire ? 0.55 : agach ? 0.35 + osc * 0.5 : osc, pD = aire ? -0.25 : agach ? 0.35 - osc * 0.5 : -osc;
        const bI = aire ? 0.9 : -osc * 0.8, bD = golpe != null ? golpe : aire ? 0.9 : osc * 0.8;
        const mirar = Math.cos(jug.giroAv - jug.yaw) > 0.5 ? Math.max(-0.6, Math.min(0.6, jug.pitch * 0.7)) : 0;
        const luzAv = luzCurva(luzEn(x, y + 1, z));
        for (const [pz, b] of [[AVATAR.piernaI, pI], [AVATAR.piernaD, pD], [AVATAR.cuerpo, agach ? 0.25 : 0], [AVATAR.brazoI, bI], [AVATAR.brazoD, bD], [AVATAR.cabeza, mirar]]) objetos.push({ geom: pz.geom, x, y: yb, z, giro, escala: 1, pivote: pz.pivote, balanceo: b, luz: luzAv });
      }
    }
    render.dibujar({ cam, H, calidad: perfilId, atm: amb, exposicion: expo, bajoAgua, mar: MAR, cieloObj: 1 - ojoBajo * 0.85, viento: (mueve ? 1 : 0.25) * (tipoClima ? 1.8 : 1), tiempo: tiempoJuego, ao: cfg.render.ao, olas: cfg.render.olas, brilloBloques: cfg.render.brilloBloques, distancia: distancia() * 16 + 8, lejos: distancia() * 16 + 64, fov: cfg.jugador.fov, objetos, sprite });
    const nClima = clima.dibujar(bajoAgua ? null : tipoClima, cfg.ambiente.intensidadClima, dt, 0);
    auto?.observar(monitor.msCuadro, dt);
    dtAcum += dt;
    if (dtAcum > 0.1) {
      dtAcum = 0;
      ui.clic(!puntero.bloqueado() && !ui.abierto() && !pausado && !hud.hayMenu && !globalThis.__vxSinBloqueo);
      const hh = Math.floor(hora * 24), mm = Math.floor((hora * 24 - hh) * 60);
      ui.info(`${col.bioma.nombre} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${tipoClima ? ' · ' + tipoClima : ''}<br>${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)} · semilla «${cfg.semilla}»${sup.creativo ? '' : cfg.modulos.experiencia ? ` · nivel ${sup.nivel}` : ''}`);
      ui.medir({ salud: sup.salud / cfg.supervivencia.saludMax, hambre: sup.hambre / 20, resistencia: sup.resistencia / 10, aire: sup.aire / cfg.supervivencia.ahogo, xp: (sup.xp % 40) / 40 });
      if (cfg.misiones.brujula && jug.objetivo) { const ang = Math.atan2(jug.objetivo.x - x, -(jug.objetivo.z - z)) - jug.yaw; ui.brujula(`${jug.objetivo.tipo} · ${Math.round(Math.hypot(jug.objetivo.x - x, jug.objetivo.z - z))} m`, ang); } else ui.brujula(null);
      const st = mundo.stats, gp = render.est;
      monitor.poner('chunks', mundo.chunks.size); monitor.poner('pendientes', mundo.pendientes); monitor.poner('en caché', mundo.cache.size);
      monitor.poner('triángulos', gp.tris); monitor.poner('draw calls', gp.drawCalls); monitor.poner('geometría', `${(gp.bytes / 1048576).toFixed(1)} MB`);
      monitor.poner('ms/chunk gen', st.generados ? +(st.msGen / st.generados).toFixed(2) : 0); monitor.poner('ms/chunk malla', st.mallados ? +(st.msMalla / st.mallados).toFixed(2) : 0);
      monitor.poner('entidades', criaturas.lista.filter((e) => e.activa).length); monitor.poner('partículas', nClima + particulas.length); monitor.poner('latencia', `${entrada.latencia.toFixed(1)} ms`);
      monitor.poner('perfil', `${PERFILES[perfilId].nombre}${auto ? ' (auto)' : ''}`); monitor.poner('workers', ejecutor.hilos || 'hilo principal'); monitor.poner('gpu', cap.gpu.slice(0, 38));
    }
  }
  const bucle = crearBucle({ actualizar, dibujar, monitor });
  addEventListener('resize', () => render.redimensionar());
  addEventListener('pagehide', () => { guardar(true).catch(() => {}); });

  // ---------------------------------------------------------------- arranque: ¿continuar o empezar?
  const previa = await cargarPartida(almacen, claveGuardado).catch(() => null);
  sup.inicial(); sup.prepararMisiones(misiones); ui.pintarBarra();
  // ?nueva en la dirección, o DATOS.nueva = true (el botón «Reiniciar» del estudio), empieza sin cargar lo guardado
  if (previa && !new URLSearchParams(location.search).has('nueva') && !datos.nueva) restaurar(previa);
  mundo.actualizar(jug.c.x, jug.c.z);
  bucle.iniciar();
  if (previa && !datos.nueva && !new URLSearchParams(location.search).has('nueva')) ui.aviso(`Partida recuperada (${previa.cambios ?? Object.values(previa.deltas || {}).reduce((s, l) => s + l.length, 0)} bloques cambiados)`, 3500);
  else ui.aviso(`${datos.juego || 'Mundo voxel'} · semilla «${cfg.semilla}»`, 3000);
  const api = { cfg, semilla, gen, mundo, render, jug, sup, criaturas, monitor, bucle, entrada, guardar, restaurar, cargarPartida: () => cargarPartida(almacen, claveGuardado), almacen, claveGuardado, apuntar, romper, usar, abrirCofre, nueva, get hora() { return hora; }, set hora(v) { hora = v; }, deserializar, perfil: () => perfilId, cap };
  globalThis.__voxel = api;   // para las pruebas automáticas y para curiosear en la consola
  alIniciar?.(api);
  return api;
}
