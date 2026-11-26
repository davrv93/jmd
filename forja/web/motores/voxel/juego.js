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
import { crearCuerpo, pasoCuerpo, solidoDe, dentroDelCuerpo } from './fisica.js';
import { lanzarRayo } from './rayo.js';
import { T, ID, bloque, PORCLAVE, registrarBloque, BLOQUES } from './bloques.js';
import { crearSupervivencia, OFERTAS, BOTIN, esBloque, nombreDe } from './supervivencia.js';
import { crearCriaturas, TIPOS } from './criaturas.js';
import { cielo, climaDe, crearClima } from './ambiente.js';
import { almacenIDB, guardarPartida, cargarPartida, serializar, exportarArchivo, importarArchivo, deserializar } from './persistencia.js';
import { ESQUEMA, defecto, opcionesGenerador } from './config.js';
import { adelante } from './mat.js';

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
  const criaturas = crearCriaturas({ mundo, cfg, semilla, alAtacar: (e, d, tipo) => { if (sup.dano(d, 'criatura')) { ui.dano(); audio.tocar('dano'); const dir = [jug.c.x - e.x, 0, jug.c.z - e.z], l = Math.hypot(dir[0], dir[2]) || 1; jug.c.vx += (dir[0] / l) * (tipo === 'onda' ? 9 : 5); jug.c.vz += (dir[2] / l) * (tipo === 'onda' ? 9 : 5); jug.c.vy = Math.max(jug.c.vy, 4); } },
    alMorir: (e) => { audio.tocar('criatura'); for (const [it, n] of e.t.suelta || []) sup.meter(it, n); sup.ganarXP(e.t.clase === 'jefe' ? 40 : 3); sup.vencidos[e.tipo] = (sup.vencidos[e.tipo] || 0) + 1; if (e.marcador) vencidos.add(e.marcador); ui.aviso(e.t.clase === 'jefe' ? `¡Venciste al ${e.t.nombre}!` : `${e.t.nombre} vencido`); if (e.t.clase === 'jefe') hud.texto('¡GUARDIÁN VENCIDO!', { y: 34, color: '#c6ff4a' }); },
    alEvento: (t, e) => { if (t === 'fase') { ui.aviso(`${e.t.nombre}: ¡segunda fase!`); hud.texto('¡FASE 2!', { y: 30, color: '#96f0ff', ms: 1100 }); audio.tocar('rugido'); } if (t === 'onda') audio.tocar('temblor'); } });
  const clima = crearClima(cont, { presupuesto: PERFILES[perfilId].particulas });
  const ui = (await import('./interfaz.js')).crearInterfaz(cont, { atlas, cfg, sup, acc, alFabricar: (r, est) => { const ok = sup.fabricar(r, est); if (ok) { audio.tocar('recoger'); ui.pintarBarra(); } return ok; }, alComerciar: (o) => { const ok = sup.comerciar(o); if (ok) { audio.tocar('mision'); ui.pintarBarra(); } return ok; }, alSeleccionar: (i) => { sup.mano = i; ui.pintarBarra(); } });
  // avatar: el personaje del alumno (hoja de sprites de Forja) o un muñeco de cajas
  const heroe = cfg.jugador.avatar === 'personaje' ? await atlasDe('heroe') : null;
  let spriteImg = null;
  if (heroe && render.p5) { const s = render.p5, im = s.createImage(heroe.imagen.width, heroe.imagen.height); im.drawingContext.drawImage(heroe.imagen, 0, 0); im.setModified?.(true); spriteImg = im; }
  const color = datos.colores ? Object.values(datos.colores) : null, rgb = (h) => { const m = /hsl\((\d+)\s+(\d+)%\s+(\d+)%/.exec(h || ''); if (!m) return [90, 140, 220]; const [H2, S, L] = [m[1] / 360, m[2] / 100, m[3] / 100], f = (n) => { const k = (n + H2 * 12) % 12, a = S * Math.min(L, 1 - L); return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
  const geomAvatar = render.geomObjeto('vx-avatar', cajasAGeom([[-0.3, 0, -0.15, 0.6, 0.75, 0.3, color ? rgb(color[1]) : [60, 70, 140]], [-0.32, 0.75, -0.17, 0.64, 0.65, 0.34, color ? rgb(color[0]) : [90, 150, 220]], [-0.27, 1.4, -0.27, 0.54, 0.45, 0.54, [235, 195, 160]], [-0.15, 1.55, -0.28, 0.1, 0.1, 0.02, [30, 30, 40]], [0.05, 1.55, -0.28, 0.1, 0.1, 0.02, [30, 30, 40]]]));
  const geomTipo = new Map(); const geomDe = (tipo) => { if (!geomTipo.has(tipo)) geomTipo.set(tipo, render.geomObjeto('vx-cr-' + tipo, cajasAGeom(TIPOS[tipo].cajas))); return geomTipo.get(tipo); };
  const geomMarco = render.geomObjeto('vx-marco', cajasAGeom([
    ...[0, 1].flatMap((y) => [0, 1].map((z) => [-0.002, y * 1.004 - 0.012, z * 1.004 - 0.012, 1.004, 0.024, 0.024, [15, 15, 20]])),
    ...[0, 1].flatMap((y) => [0, 1].map((x) => [x * 1.004 - 0.012, y * 1.004 - 0.012, -0.002, 0.024, 0.024, 1.004, [15, 15, 20]])),
    ...[0, 1].flatMap((x) => [0, 1].map((z) => [x * 1.004 - 0.012, -0.002, z * 1.004 - 0.012, 0.024, 1.004, 0.024, [15, 15, 20]]))]));

  // ---------------------------------------------------------------- jugador
  const inicio = buscarInicio();
  const jug = { c: crearCuerpo(inicio[0] + 0.5, inicio[1], inicio[2] + 0.5, fisicaDe(cfg)), yaw: 0.6, pitch: -0.15, camara: cfg.jugador.camara, px: 0, py: 0, pz: 0, corriendo: false, maxAltura: inicio[1], minAltura: inicio[1], maxPuesto: 0, objetivo: null, minando: null };
  jug.c.volando = false; Object.assign(jug, { px: jug.c.x, py: jug.c.y, pz: jug.c.z });
  // la hora que elegiste en el estudio (Día, Tarde, Noche, Amanecer) manda si la regla «Hora al empezar» quedó de fábrica
  const HORAS = { dia: 0.4, tarde: 0.7, noche: 0.9, amanecer: 0.25 };
  if (datos.hora && HORAS[datos.hora] != null && cfg.ambiente.horaInicio === defecto(plantilla).ambiente.horaInicio) cfg.ambiente.horaInicio = HORAS[datos.hora];
  let hora = cfg.ambiente.horaInicio, dias = 0, tiempoJuego = 0, pausado = false, terminado = false, ultimoEspacio = -1;
  const entrada = crearEntrada({ mapa: { adelante: ['KeyW', 'ArrowUp'], atras: ['KeyS', 'ArrowDown'], izq: ['KeyA', 'ArrowLeft'], der: ['KeyD', 'ArrowRight'], salto: ['Space'], carrera: ['ShiftLeft', 'ShiftRight'], agachar: ['ControlLeft', 'KeyC'], camara: ['KeyF'], inventario: ['KeyE'], misiones: ['KeyQ'], pausa: ['KeyP', 'Escape'], guardar: ['KeyG'], comer: ['KeyR'], ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ['h' + n, ['Digit' + n]])) } });
  const lienzo = render.p5.canvas;
  const puntero = bloquearPuntero(lienzo, (dx, dy) => { if (pausado || ui.abierto()) return; const k = 0.0024 * cfg.jugador.sensibilidad; jug.yaw += dx * k; jug.pitch = Math.max(-1.55, Math.min(1.55, jug.pitch - dy * k * (cfg.jugador.invertirY ? -1 : 1))); });
  const raton = { izq: false, der: false };
  lienzo.addEventListener('mousedown', (e) => { if (!puntero.bloqueado() && !globalThis.__vxSinBloqueo) return; if (e.button === 0) raton.izq = true; if (e.button === 2) { raton.der = true; usar(); } });
  addEventListener('mouseup', (e) => { if (e.button === 0) { raton.izq = false; jug.minando = null; ui.progreso(0); } if (e.button === 2) raton.der = false; });
  lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
  lienzo.addEventListener('wheel', (e) => { if (!cfg.modulos.hotbar) return; sup.mano = (sup.mano + (e.deltaY > 0 ? 1 : 8)) % 9; ui.pintarBarra(); e.preventDefault(); }, { passive: false });

  function fisicaDe(c) { return { velocidad: c.jugador.velocidad, carrera: c.jugador.carrera, salto: c.jugador.salto, gravedad: c.jugador.gravedad, nado: c.jugador.nado, caidaSegura: c.jugador.caidaSegura, pasoAuto: c.jugador.pasoAuto }; }
  function buscarInicio() {   // espiral desde (0, 0) hasta tierra firme fuera del agua
    for (let r = 0; r < 900; r += 6) for (let a = 0; a < 6.283; a += r ? 6 / r : 7) {
      const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r), c = gen.columna(x, z);
      if (c.h > MAR + 1 && c.bioma.id !== 'oceano' && c.montana < 0.4) return [x, c.h + 2, z];
    }
    return [0, H - 20, 0];
  }
  // ---------------------------------------------------------------- acciones
  const ojo = () => [jug.c.x, jug.c.y + (jug.c.agachado ? 1.25 : 1.62), jug.c.z];
  function apuntar() {
    const o = ojo(), d = adelante(jug.yaw, jug.pitch), alc = cfg.jugador.alcance;
    const b = lanzarRayo((x, y, z) => mundo.bloque(x, y, z), o[0], o[1], o[2], d[0], d[1], d[2], alc);
    const e = criaturas.apuntada(o, d, b ? b.dist : alc);
    return { b: e ? null : b, e: e?.e || null, o, d };
  }
  function romper(t) {
    const m = sup.minado(t.id); if (!m.puede) return;
    if (t.id === ID.cofre) abrirCofre(t.x, t.y, t.z);
    if (mundo.poner(t.x, t.y, t.z, 0) == null) return;
    const b = bloque(t.id); audio.tocar('romper', { semilla: t.id });
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
    if (t.e) { if (t.e.t.clase === 'comerciante') { if (cfg.modulos.comercio) { document.exitPointerLock?.(); ui.abrirInventario({ estaciones: estacionesCerca(), ofertas: OFERTAS }); } else ui.aviso(`${t.e.t.nombre}: «¡Buen viaje, ${datos.nombre || 'viajero'}!»`); return; }
      if (t.e.t.clase === 'exploradora') { const c = gen.estructuras.cerca(jug.c.x, jug.c.z, 400).find((e) => !sup.visitadas.has(e.tipo)); ui.aviso(c ? `${t.e.t.nombre}: «Hay ${c.tipo === 'aldea' ? 'una aldea' : c.tipo === 'ruina' ? 'unas ruinas' : 'un(a) ' + c.tipo} a ${Math.round(Math.hypot(c.x - jug.c.x, c.z - jug.c.z))} bloques»` : `${t.e.t.nombre}: «Ya lo has visto todo por aquí»`, 3500); jug.objetivo = c || jug.objetivo; return; } }
    if (sup.enMano && !esBloque(sup.enMano.it) && sup.comer()) { audio.tocar('recoger'); ui.pintarBarra(); return; }
    if (!t.b) return;
    if (t.b.id === ID.cofre && abrirCofre(t.b.x, t.b.y, t.b.z)) return;
    if ((t.b.id === ID.mesa || t.b.id === ID.horno) && !sup.enMano?.it?.match?.(/^(mesa|horno)$/)) { document.exitPointerLock?.(); ui.abrirInventario({ estaciones: estacionesCerca() }); return; }
    const x = sup.enMano; if (!x || !esBloque(x.it)) return;
    const p = [t.b.x + t.b.nx, t.b.y + t.b.ny, t.b.z + t.b.nz], ya = mundo.bloque(...p);
    if (ya < 0 || (T.solido[ya] && ya !== 0) || dentroDelCuerpo(jug.c, ...p)) return;   // nunca dentro del jugador
    if (criaturas.lista.some((e) => Math.floor(e.x) === p[0] && Math.floor(e.z) === p[2] && p[1] >= Math.floor(e.y) && p[1] < e.y + e.t.alto)) return;
    if (!sup.sacar(x.it, 1)) return;
    if (mundo.poner(p[0], p[1], p[2], PORCLAVE[x.it].id) == null) { sup.meter(x.it, 1); return; }
    sup.cont.poner++; sup.cont.poner_bloque[x.it] = (sup.cont.poner_bloque[x.it] || 0) + 1; jug.maxPuesto = Math.max(jug.maxPuesto, p[1]);
    audio.tocar('poner'); ui.pintarBarra();
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
    if (terminado) return; terminado = true; pausado = true; document.exitPointerLock?.();
    audio.tocar(gano ? 'victoria' : 'derrota');
    hud.menu(gano ? '¡Lo lograste!' : 'Fin de la partida', texto, [{ texto: 'Seguir explorando', accion: () => { terminado = false; pausado = false; } }, { texto: 'Empezar de nuevo', accion: () => nueva() }]);
  }
  // ---------------------------------------------------------------- guardar y continuar (delta en IndexedDB)
  const almacen = almacenIDB(), claveGuardado = `${plantilla}:${cfg.semilla}`;
  async function estadoPartida() {
    return { semilla, semillaTexto: cfg.semilla, plantilla, jugador: { x: jug.c.x, y: jug.c.y, z: jug.c.z, yaw: jug.yaw, pitch: jug.pitch, camara: jug.camara, volando: jug.c.volando }, inventario: sup.exportar(), entidades: criaturas.exportar(), juego: { hora, dias, tiempoJuego, cofres: [...cofresAbiertos], vencidos: [...vencidos], maxAltura: jug.maxAltura, minAltura: jug.minAltura, maxPuesto: jug.maxPuesto } };
  }
  async function guardar(silencio = false) { const o = await guardarPartida(almacen, claveGuardado, await estadoPartida(), mundo.exportarDeltas()); if (!silencio) ui.aviso(`Guardado: ${o.cambios} bloques cambiados`); return o; }
  function restaurar(o) {
    mundo.importarDeltas(o.deltas); const j = o.jugador || {};
    Object.assign(jug.c, { x: +j.x || jug.c.x, y: +j.y || jug.c.y, z: +j.z || jug.c.z, vx: 0, vy: 0, vz: 0 }); jug.c.caidaDesde = jug.c.y; jug.yaw = +j.yaw || 0; jug.pitch = +j.pitch || 0; jug.camara = j.camara === 'tercera' ? 'tercera' : 'primera'; jug.c.volando = !!j.volando && cfg.jugador.vuelo;
    Object.assign(jug, { px: jug.c.x, py: jug.c.y, pz: jug.c.z });
    sup.importar(o.inventario); const g = o.juego || {}; hora = +g.hora || hora; dias = +g.dias || 0; tiempoJuego = +g.tiempoJuego || 0;
    for (const k of g.cofres || []) cofresAbiertos.add(k); for (const k of g.vencidos || []) vencidos.add(k);
    jug.maxAltura = g.maxAltura ?? jug.maxAltura; jug.minAltura = g.minAltura ?? jug.minAltura; jug.maxPuesto = g.maxPuesto || 0;
    if (o.avisoVersion) ui.aviso(o.avisoVersion, 6000);
    ui.pintarBarra();
  }
  function nueva() { sup.inicial(); sup.prepararMisiones(misiones); ui.pintarBarra(); terminado = false; pausado = false; }
  async function exportar() { const o = await serializar(await estadoPartida(), mundo.exportarDeltas()); const a = document.createElement('a'); a.href = URL.createObjectURL(exportarArchivo(o)); a.download = `mundo-${String(cfg.semilla).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  function importar() { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => { try { restaurar(await importarArchivo(await i.files[0].text())); ui.aviso('Mundo importado'); } catch (e) { ui.aviso('No se pudo importar: ' + e.message, 4000); } }; i.click(); }
  function pausa() {
    pausado = true; document.exitPointerLock?.();
    hud.menu('Pausa', `Semilla «${cfg.semilla}» · ${PERFILES[perfilId].nombre} · F3: monitor`, [
      { texto: 'Seguir', accion: () => { pausado = false; } }, { texto: 'Guardar partida', accion: () => { guardar(); pausado = false; } },
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
  function actualizar(dt) {
    const s = entrada.muestrear(), r = s.recien;
    if (r.has('pausa') && !ui.abierto() && !hud.hayMenu) { pausa(); return; }
    if (r.has('inventario') && cfg.modulos.inventario) { if (ui.abierto()) { ui.cerrar(); lienzo.focus(); } else { document.exitPointerLock?.(); ui.abrirInventario({ estaciones: estacionesCerca() }); } }
    if (pausado || hud.hayMenu) return;
    if (r.has('misiones')) ui.alternarMisiones();
    if (r.has('camara')) jug.camara = jug.camara === 'primera' ? 'tercera' : 'primera';
    if (r.has('guardar')) guardar();
    if (r.has('comer') && sup.comer()) ui.pintarBarra();
    for (let n = 1; n <= 9; n++) if (r.has('h' + n) && cfg.modulos.hotbar) { sup.mano = n - 1; ui.pintarBarra(); }
    if (r.has('salto') && cfg.jugador.vuelo) { if (tiempoJuego - ultimoEspacio < 0.3) { jug.c.volando = !jug.c.volando; ui.aviso(jug.c.volando ? 'Volando' : 'A pie'); } ultimoEspacio = tiempoJuego; }
    tiempoJuego += dt;
    const ab = s.abajo, enUI = ui.abierto();
    const fx = Math.sin(jug.yaw), fz = -Math.cos(jug.yaw), rx = Math.cos(jug.yaw), rz = Math.sin(jug.yaw);
    let mx = 0, mz = 0; if (!enUI) { const a = (ab.has('adelante') ? 1 : 0) - (ab.has('atras') ? 1 : 0), b = (ab.has('der') ? 1 : 0) - (ab.has('izq') ? 1 : 0); mx = fx * a + rx * b; mz = fz * a + rz * b; const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; } }
    jug.corriendo = !enUI && ab.has('carrera') && sup.puedeCorrer() && (mx || mz);
    jug.px = jug.c.x; jug.py = jug.c.y; jug.pz = jug.c.z;
    const res = pasoCuerpo(jug.c, dt, { x: mx, z: mz, salto: !enUI && ab.has('salto'), carrera: jug.corriendo, agachar: !enUI && ab.has('agachar'), subir: ab.has('salto'), bajar: ab.has('agachar'), adelante: ab.has('adelante') }, mundo, solido);
    if (cfg.mundo.borde > 0) { const B = cfg.mundo.borde; if (Math.abs(jug.c.x) > B || Math.abs(jug.c.z) > B) { jug.c.x = Math.max(-B, Math.min(B, jug.c.x)); jug.c.z = Math.max(-B, Math.min(B, jug.c.z)); if (!jug._avBorde) { ui.aviso('Llegaste al borde del mundo'); jug._avBorde = true; } } else jug._avBorde = false; }
    if (res.dano && cfg.modulos.danoAmbiental && cfg.supervivencia.danoCaida > 0) { if (sup.dano(Math.round(res.dano * cfg.supervivencia.danoCaida), 'caída')) { ui.dano(); audio.tocar('dano'); } }
    if (cfg.modulos.danoAmbiental && mundo.bloque(Math.floor(jug.c.x), Math.floor(jug.c.y - 0.1), Math.floor(jug.c.z)) === ID.cactus && (jug._cac = (jug._cac || 0) + dt) > 0.8) { jug._cac = 0; if (sup.dano(1, 'cactus')) ui.dano(); }
    if (cfg.audio.pasos && jug.c.enSuelo && (mx || mz) && (jug._paso = (jug._paso || 0) + dt * (jug.corriendo ? 1.6 : 1)) > 0.42) { jug._paso = 0; audio.tocar(jug.c.enAgua ? 'agua' : 'paso', { volumen: 0.35 }); }
    sup.paso(dt, jug.c, jug.corriendo);
    // minar: mantener el clic izquierdo; las criaturas apuntadas reciben el golpe
    if (raton.izq && !enUI) {
      const t = apuntar();
      if (t.e) { if (!jug._golpe || tiempoJuego - jug._golpe > 0.45) { jug._golpe = tiempoJuego; criaturas.golpear(t.e, sup.danoArma(), t.d); audio.tocar('golpe_ligero'); sup.gastarHerramienta(); } jug.minando = null; ui.progreso(0); }
      else if (t.b) {
        const k = `${t.b.x},${t.b.y},${t.b.z}`;
        if (!jug.minando || jug.minando.k !== k) jug.minando = { k, t: 0, ...sup.minado(t.b.id) };
        if (jug.minando.puede) { jug.minando.t += dt; const p = jug.minando.segundos ? jug.minando.t / jug.minando.segundos : 1; ui.progreso(Math.min(1, p)); if (p >= 1) { romper(t.b); jug.minando = null; ui.progreso(0); if (!sup.creativo && cfg.modulos.minado === 'instantaneo') raton.izq = false; else if (sup.creativo) raton.izq = false; } }
      }
    }
    const noche = hora < 0.22 || hora > 0.8;
    criaturas.paso(dt, { x: jug.c.x, y: jug.c.y, z: jug.c.z, enSuelo: jug.c.enSuelo, corriendo: jug.corriendo }, { noche, mar: MAR, pacifica: cfg.supervivencia.dificultad === 'pacifica', biomaEn: (x, z) => gen.columna(x, z).bioma });
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
      for (const m of nuevas) { ui.aviso(`✓ ${m.texto}`, 3000); audio.tocar('mision'); hud.texto('MISIÓN CUMPLIDA', { y: 26, color: '#c6ff4a', ms: 1200 }); }
      if (cfg.modulos.misiones) ui.misiones(sup.misiones, sup.completas, ctx);
      if (cfg.resultado.fin === 'misiones' && sup.misiones.length && sup.misiones.every((m) => sup.completas.has(m.id))) fin(true, `Cumpliste las ${sup.misiones.length} misiones.`);
      if (cfg.resultado.fin === 'jefe' && (sup.vencidos.guardian || 0) > 0) fin(true, 'El guardián de la mazmorra cayó: el reino perdido vuelve a estar en paz.');
      if (cfg.resultado.fin === 'tiempo' && tiempoJuego > cfg.resultado.tiempo) fin(true, `Se acabó el tiempo: pusiste ${sup.cont.poner} bloques y descubriste ${sup.biomas.size} biomas.`);
      // objetivo de la brújula: la estructura de la siguiente misión «visitar»
      const sig = sup.siguiente; jug.objetivo = sig?.tipo === 'visitar' ? gen.estructuras.cerca(jug.c.x, jug.c.z, 700).find((e) => e.tipo === sig.estructura) || null : jug.objetivo && !sup.visitadas.has(jug.objetivo.tipo) ? jug.objetivo : null;
      if (relojAuto++ > 60) { relojAuto = 0; guardar(true).catch(() => {}); }   // cada 30 s
    }
  }
  let relojAuto = 0;
  const contexto = () => ({ mar: MAR, maxAltura: jug.maxAltura, minAltura: jug.minAltura, maxPuesto: jug.maxPuesto, distancia: Math.hypot(jug.c.x - inicio[0], jug.c.z - inicio[2]) });

  // ---------------------------------------------------------------- dibujo (interpolado)
  let dtAcum = 0;
  function dibujar(alfa, dt) {
    hud.tick();
    const x = jug.px + (jug.c.x - jug.px) * alfa, y = jug.py + (jug.c.y - jug.py) * alfa, z = jug.pz + (jug.c.z - jug.pz) * alfa;
    const balanceo = !acc.reducirMovimiento && jug.c.enSuelo && Math.hypot(jug.c.vx, jug.c.vz) > 0.5 ? Math.sin(tiempoJuego * 10) * 0.04 : 0;
    let cam = { x, y: y + (jug.c.agachado ? 1.25 : 1.62) + balanceo, z, yaw: jug.yaw, pitch: jug.pitch };
    if (jug.camara === 'tercera') {   // la cámara retrocede hasta 4 bloques, sin meterse en la pared
      const d = adelante(jug.yaw, jug.pitch), hit = lanzarRayo((a, b, c) => mundo.bloque(a, b, c), cam.x, cam.y, cam.z, -d[0], -d[1], -d[2], 4.2, (id) => T.opaco[id] === 1), dist = hit ? Math.max(0.6, hit.dist - 0.3) : 4;
      cam = { ...cam, x: cam.x - d[0] * dist, y: cam.y - d[1] * dist, z: cam.z - d[2] * dist };
    }
    const bajoAgua = T.liquido[mundo.bloque(Math.floor(cam.x), Math.floor(cam.y), Math.floor(cam.z))] === 1;
    const col = gen.columna(Math.floor(x), Math.floor(z)), amb = cielo(hora, col.bioma, cfg, bajoAgua);
    const tipoClima = climaDe(cfg, col.bioma, dias + hora, semilla), solClima = tipoClima ? 0.72 : 1;
    const objetos = [];
    for (const e of criaturas.lista) if (e.activa) { const ex = e.px + (e.x - e.px) * alfa, ey = e.py + (e.y - e.py) * alfa, ez = e.pz + (e.z - e.pz) * alfa; objetos.push({ geom: geomDe(e.tipo), x: ex, y: ey, z: ez, giro: -e.giro, escala: e.t.escala || 1, tinte: e.golpe > 0 ? [1, 0.2, 0.2, 0.45] : e.slam != null ? [1, 1, 1, 0.5 * (1 - e.slam / 0.8)] : null, luz: e.t.luz || 0 }); }
    const t = !ui.abierto() && !pausado ? apuntar() : null;
    if (t?.b) objetos.push({ geom: geomMarco, x: t.b.x, y: t.b.y, z: t.b.z, escala: 1 });
    let sprite = null;
    if (jug.camara === 'tercera') {
      if (spriteImg && heroe) {
        const mov = Math.hypot(jug.c.vx, jug.c.vz) > 0.4, anim = !jug.c.enSuelo && !jug.c.enAgua ? 'saltar' : mov ? (jug.corriendo ? 'correr' : 'caminar') : jug.c.agachado ? 'agachado' : 'quieto';
        const cuadros = heroe.anim[anim] || heroe.anim.quieto || Object.values(heroe.anim)[0], f = cuadros[Math.floor(tiempoJuego * 10) % cuadros.length], W = heroe.imagen.width, Hh = heroe.imagen.height;
        const altoM = 1.9 / (datos.heroe?.relAlto || 0.8);
        sprite = { imagen: spriteImg, x, y: y - altoM * 0.04, z, tam: [altoM, altoM], marco: [f.x / W, f.y / Hh, f.w / W, f.h / Hh] };
      } else objetos.push({ geom: geomAvatar, x, y, z, giro: -jug.yaw, escala: 1 });
    }
    render.dibujar({ cam, H, sol: amb.sol * solClima, colorSol: amb.colorSol, cenit: amb.cenit, horizonte: amb.horizonte, solDir: amb.solDir, noche: amb.noche, niebla: amb.niebla, nieblaRango: amb.nieblaRango, tiempo: tiempoJuego, ao: cfg.render.ao, olas: cfg.render.olas, brilloBloques: cfg.render.brilloBloques, distancia: distancia() * 16 + 8, lejos: distancia() * 16 + 64, fov: cfg.jugador.fov, objetos, sprite });
    const particulas = clima.dibujar(bajoAgua ? null : tipoClima, cfg.ambiente.intensidadClima, dt, 0);
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
      monitor.poner('entidades', criaturas.lista.filter((e) => e.activa).length); monitor.poner('partículas', particulas); monitor.poner('latencia', `${entrada.latencia.toFixed(1)} ms`);
      monitor.poner('perfil', `${PERFILES[perfilId].nombre}${auto ? ' (auto)' : ''}`); monitor.poner('workers', ejecutor.hilos || 'hilo principal'); monitor.poner('gpu', cap.gpu.slice(0, 38));
    }
  }
  const bucle = crearBucle({ actualizar, dibujar, monitor });
  addEventListener('resize', () => render.redimensionar());
  addEventListener('pagehide', () => { guardar(true).catch(() => {}); });

  // ---------------------------------------------------------------- arranque: ¿continuar o empezar?
  const previa = await cargarPartida(almacen, claveGuardado).catch(() => null);
  sup.inicial(); sup.prepararMisiones(misiones); ui.pintarBarra();
  if (previa && !new URLSearchParams(location.search).has('nueva')) restaurar(previa);
  mundo.actualizar(jug.c.x, jug.c.z);
  bucle.iniciar();
  if (previa) ui.aviso(`Partida recuperada (${previa.cambios ?? Object.values(previa.deltas || {}).reduce((s, l) => s + l.length, 0)} bloques cambiados)`, 3500);
  else ui.aviso(`${datos.juego || 'Mundo voxel'} · semilla «${cfg.semilla}»`, 3000);
  const api = { cfg, semilla, gen, mundo, render, jug, sup, criaturas, monitor, bucle, entrada, guardar, restaurar, cargarPartida: () => cargarPartida(almacen, claveGuardado), almacen, claveGuardado, apuntar, romper, usar, abrirCofre, get hora() { return hora; }, set hora(v) { hora = v; }, deserializar, perfil: () => perfilId, cap };
  globalThis.__voxel = api;   // para las pruebas automáticas y para curiosear en la consola
  alIniciar?.(api);
  return api;
}
