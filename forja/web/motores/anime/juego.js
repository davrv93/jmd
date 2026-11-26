// Forja · Anime Battle Engine · el juego en el navegador: une partida (simulación), p5 (dibujo), efectos, sonido,
// HUD/menús con Anime.js, entrada, monitor y perfiles. Las plantillas (plantillas/duelo-anime.js, jefe-titan.js) solo
// traducen las reglas del alumno a estas opciones y llaman a iniciarAnime().
import { crearPartida, MODOS } from './modos.js';
import { PERSONAJES, CINEMATICAS } from './personajes.js';
import { JEFES } from './jefe.js';
import { crearRender, ANCHO, ALTO, TEMAS, elegirEscenario } from './render.js';
import { crearFX } from './fx.js';
import { crearBucle } from '../nucleo/bucle.js';
import { crearEntrada, MAPA_BASE } from '../nucleo/entrada.js';
import { crearMonitor } from '../nucleo/monitor.js';
import { crearAudio } from '../nucleo/audio.js';
import { crearHUD } from '../nucleo/hud.js';
import { accesibilidad, PERFILES, crearAutoCalidad, capacidades, perfilSugerido } from '../nucleo/perfiles.js';
import { atlasDe } from '../nucleo/recursos.js';
import { validar } from '../nucleo/esquema.js';
import { ESQUEMA } from './config.js';

const MAPA_P1 = { izq: ['KeyA'], der: ['KeyD'], arriba: ['KeyW'], abajo: ['KeyS'], salto: ['KeyW'], ligero: ['KeyF'], medio: ['KeyG'], fuerte: ['KeyH'], especial: ['KeyR'], bloqueo: ['KeyT'], esquiva: ['KeyY'], carga: ['KeyV'], definitivo: ['KeyB'], transformar: ['KeyC'], relevo: ['KeyQ'], pausa: ['Escape'], omitir: ['Enter'] };
const MAPA_P2 = { izq: ['ArrowLeft'], der: ['ArrowRight'], arriba: ['ArrowUp'], abajo: ['ArrowDown'], salto: ['ArrowUp'], ligero: ['Numpad1', 'Digit1'], medio: ['Numpad2', 'Digit2'], fuerte: ['Numpad3', 'Digit3'], especial: ['Numpad4', 'Digit4'], bloqueo: ['Numpad5', 'Digit5'], esquiva: ['Numpad6', 'Digit6'], carga: ['Numpad0', 'Digit0'], definitivo: ['Numpad7', 'Digit7'], transformar: ['Numpad8', 'Digit8'], relevo: ['Numpad9', 'Digit9'] };
// golpe: botón único del esquema Simple (sin tecla aquí; DATOS.controles se la da). Ver golpeUnico() más abajo.
const MAPA_1P = { ...MAPA_BASE, relevo: ['KeyQ'], omitir: ['Enter'], golpe: [], ligero: ['KeyJ'], medio: ['KeyK'], fuerte: ['KeyL'], especial: ['KeyI'], salto: ['Space', 'KeyW', 'ArrowUp'] };
// Botón único de golpe: cada pulsación sigue el combo ligero → medio → fuerte si llega a menos de 28 pasos (~0,47 s)
// de la anterior; si no, empieza otra vez por el ligero. Solo traduce la entrada: la simulación recibe golpes normales.
const COMBO_UNICO = ['ligero', 'medio', 'fuerte'];
export function crearGolpeUnico(ventana = 28) {
  let i = -1, ultimo = -1e9, n = 0;
  return (s) => {
    n++;
    if (s.recien.has('golpe')) { i = n - ultimo <= ventana ? (i + 1) % 3 : 0; ultimo = n; s.recien.add(COMBO_UNICO[i]); }
    if (s.abajo.has('golpe') && i >= 0) s.abajo.add(COMBO_UNICO[i]);
    return s;
  };
}
// nombre legible de una tecla (KeyJ → J, ArrowLeft → ←, Space → Espacio…)
const TECLA = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Espacio', Escape: 'Esc', Enter: 'Enter', ShiftLeft: 'Shift', ShiftRight: 'Shift', Backquote: '`', Tab: 'Tab' };
export const nombreTecla = (c) => TECLA[c] || c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
// Ayuda de controles armada desde el mapa REAL (incluye las teclas que el alumno eligió en DATOS.controles)
export function ayudaControles(mapa, { breve = false } = {}) {
  const t = (a, n = 2) => [...(mapa[a] || [])].sort((x, y) => (y.startsWith('Key') ? 1 : 0) - (x.startsWith('Key') ? 1 : 0)).slice(0, n).map(nombreTecla).join(' / ');   // letras primero
  const partes = [
    ['Moverte', `${t('izq', 1)} ${t('der', 1)}`], ['Saltar', t('salto')], ['Agacharte', t('abajo', 1)],
    (mapa.golpe || []).length ? ['Golpe (combo)', t('golpe', 1)] : ['Golpes', `${t('ligero', 1)} ${t('medio', 1)} ${t('fuerte', 1)}`], ['Especial', t('especial', 1)], ['Bloquear', `${t('bloqueo', 1)} o atrás`],
    ['Esquivar', t('esquiva', 1)], ['Cargar energía', t('carga', 1)], ['Definitivo', t('definitivo', 1)], ['Transformarte', t('transformar', 1)], ['Pausa', t('pausa')],
  ].filter(([, v]) => v.trim() && !/^ *o atrás$/.test(v));
  return (breve ? partes.slice(0, 6) : partes).map(([k, v]) => `${k}: ${v}`).join(' · ');
}
const aEntrada = (s) => ({ x: (s.abajo.has('der') ? 1 : 0) - (s.abajo.has('izq') ? 1 : 0), y: (s.abajo.has('abajo') ? 1 : 0) - (s.abajo.has('arriba') ? 1 : 0), recien: s.recien, abajo: s.abajo });

export async function iniciarAnime(o) {
  const cont = o.contenedor || document.getElementById('juego');
  document.getElementById('cargando')?.remove();
  const errores = o.config ? validar(o.config, ESQUEMA) : [];
  if (errores.length) console.warn('config inválida, se usan valores de fábrica:', errores.slice(0, 5));
  const acc = accesibilidad({ reducirMovimiento: o.acc?.reducirMovimiento, reducirDestellos: o.acc?.reducirDestellos });
  const monitor = crearMonitor({ padre: cont, visible: !!o.monitor });
  const audio = crearAudio({ volumen: o.volumen ?? 0.5 }); audio.silencio = !!o.silencio;
  const pres = { numerosDano: true, cuentaCombo: true, koLento: true, ...(o.presentacion || {}) };
  const hud = crearHUD(cont, { acc, resortes: pres.resortes !== false });
  const personajes = { ...PERSONAJES, ...(o.personajes || {}) };
  const sprites = {};
  // tu personaje de Forja como luchador: la hoja de sprites del estudio, con su nombre
  if (o.usarForja !== false) { const h = await atlasDe('heroe'); if (h) { const base = personajes[o.jugador || 'ren']; personajes.forja = { ...base, id: 'forja', nombre: o.nombreForja || 'Tu personaje' }; sprites.forja = { ...h, relAlto: globalThis.DATOS?.heroe?.relAlto || 0.8 }; } }
  let perfilId = o.perfil && o.perfil !== 'auto' ? o.perfil : 'medio', p5i = null, partida = null, render = null, fx = null, pausa = false, opcionesPartida = null, enMenu = true;
  // GL por software (SwiftShader, llvmpipe): el canvas 2D «acelerado» corre en una GPU emulada y cada trazo cuesta.
  // Ahí el cuadro se rasteriza en un lienzo de CPU y se copia entero (render.js). o.lienzoCPU lo fuerza (true/false).
  let porSoftware = false;
  try { const cv = document.createElement('canvas'), gl = cv.getContext('webgl'); porSoftware = capacidades(gl).software; gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* sin WebGL: el 2D de siempre */ }
  const lienzoCPU = o.lienzoCPU ?? porSoftware;
  const auto = crearAutoCalidad({ inicial: perfilId, alCambiar: (id, esc) => { perfilId = id; if (fx) fx.presupuesto = Math.round(PERFILES[id].particulas * (o.fx?.presupuestoMul ?? 1)); render?.calidad(id); if (!lienzoCPU) { p5i?.pixelDensity(Math.min(2, devicePixelRatio || 1) * esc); ajustar?.(); } monitor.poner('perfil', `${PERFILES[id].nombre} ×${esc}${lienzoCPU ? ' · CPU' : ''}`); } });
  const dos = o.controles === '2p';
  const golpeUnico = crearGolpeUnico();
  const entradas = dos ? [crearEntrada({ mapa: MAPA_P1 }), crearEntrada({ mapa: MAPA_P2, propios: false })] : [crearEntrada({ mapa: MAPA_1P })];
  let barras = null, combos = [], ultimoTexto = 0, combateVisto = null, ajustar = null;   // ajustar: encaja el lienzo en su caja (también tras cambiar la resolución)
  // escenario: el del capítulo (historia) si lo trae; si no, el de la regla — un id o una elección ('hora', 'rotar',
  // 'elemento') que se resuelve por pelea con la hora de tu escenario en Forja, el número de pelea o tu elemento
  const temaDe = () => {
    const t = partida.combate.escenario?.tema; if (TEMAS[t]) return t;
    return elegirEscenario(o.escenario?.tema || (partida.modo.tipo === 'jefe' ? 'templo' : 'hora'), { hora: o.hora, indice: partida.indice, elemento: personajes[opcionesPartida?.jugador]?.elemento });
  };

  const bucle = crearBucle({
    monitor,
    actualizar: (dt) => {
      if (!partida || pausa || enMenu) { for (const e of entradas) e.muestrear(); return; }
      const ss = entradas.map((e) => e.muestrear());
      if (!dos) golpeUnico(ss[0]);
      if (ss[0].recien.has('pausa')) return abrirPausa();
      if (partida.director.activa && (ss[0].recien.has('omitir') || ss[0].recien.has('salto') || ss[0].recien.has('pausa'))) partida.omitir();
      const ev = partida.paso(ss.map(aEntrada), dt);
      for (const e of ev) efecto(e);
      fx.actualizarSim?.(dt);
    },
    dibujar: (alfa, dt) => {
      hud.tick();   // Anime.js avanza aquí (useDefaultMainLoop = false): menús y HUD siguen al bucle del juego
      if (!partida) return;
      if (!pausa) fx.actualizar(dt * bucle.escala);
      if (partida.combate !== combateVisto) { combateVisto = partida.combate; render.cambiarTema(temaDe()); }   // otra pelea: quizá otro escenario
      const t = performance.now() / 1000;
      render.camara(partida.combate, partida.director, alfa);
      render.dibujar(partida.combate, partida, alfa, t);
      actualizarHUD();
      auto.observar(dt * 1000, dt);
      const c = partida.combate;
      monitor.poner('entidades', c.luchadores.length + c.extras.length + c.proyectiles.length); monitor.poner('particulas', fx.particulas); monitor.poner('formas fx', fx.formas);
      monitor.poner('dibujos', render.dibujos + fx.particulas + fx.formas * 6); monitor.poner('latencia', entradas[0].latencia.toFixed(1) + ' ms'); monitor.poner('cuadro sim', c.cuadro);
    },
  });

  function efecto(e) {
    const c = partida.combate, P = (x, y) => render.aPant(x, y);
    switch (e.tipo) {
      case 'golpe': {
        const A = c.buscar(e.de), dir = A ? Math.sign((c.buscar(e.id)?.x ?? 0) - A.x) || 1 : 1;
        fx.impacto(e.x, e.y, { fuerza: e.fuerza, color: A?.def.efectos?.estela || '#ffe27a', dir, elemento: e.efecto });
        if (e.movTipo === 'fuerte' || e.movTipo === 'definitivo') fx.corte(e.x, e.y, { dir, color: A?.def.efectos?.estela || '#fff', radio: 70 });
        if (e.fuerza >= 12) fx.lineasVelocidad(0, 1);
        const [sx, sy] = P(e.x, e.y + 30); if (pres.numerosDano) hud.numero(sx, sy, String(e.dano), e.contra ? '#ff7a5c' : '#fff', e.dano >= 100);
        if (e.contra && performance.now() - ultimoTexto > 700) { hud.texto('¡CONTRA!', { y: 30, color: '#ff7a5c', ms: 700 }); ultimoTexto = performance.now(); }
        audio.tocar(e.movTipo === 'ligero' ? 'golpe_ligero' : e.movTipo === 'medio' || e.movTipo === 'aereo' ? 'golpe_medio' : 'golpe_fuerte');
        const lado = A?.eq === 0 ? 0 : 1; if (pres.cuentaCombo) combos[lado]?.poner(e.combo, e.comboDano, lado ? '#9fe3ff' : '#ffd94a');
        break;
      }
      case 'bloqueo': fx.impacto(e.x, e.y, { fuerza: 5, bloqueado: true }); audio.tocar('bloqueo'); break;
      case 'parada': fx.chispas(e.x, e.y, { color: '#bfe9ff', cantidad: 18 }); fx.destellar(0.35, '#dff6ff'); hud.texto('¡PARADA!', { y: 32, color: '#bfe9ff', ms: 700 }); audio.tocar('parada'); break;
      case 'guardiaRota': hud.texto('¡GUARDIA ROTA!', { y: 32, color: '#ff7a5c', ms: 900 }); fx.chispas(e.x, e.y, { cantidad: 20 }); audio.tocar('romper'); break;
      case 'teleporte': fx.teletransporte(e.x, 0); audio.tocar('teletransporte'); break;
      case 'transformacion':
        if (e.fase === 'inicio') { const L = c.buscar(e.id); fx.columna(L.x, { color: L.def.transformaciones[0].colores?.aura || '#fff' }); fx.distorsion(L.x, 80); hud.texto(e.nombre.toUpperCase(), { y: 26, color: L.def.transformaciones[0].colores?.aura, ms: 1400 }); audio.tocar('transformar'); }
        else if (e.fase === 'listo') { const L = c.buscar(e.id); fx.ondaExpansiva(L.x, 60, { color: '#ffffff', radio: 320 }); fx.destellar(0.5); }
        break;
      case 'ronda': hud.texto(textoRonda(), { y: 40, color: '#ffffff', ms: 1100 }); break;
      case 'pelea': hud.texto('¡A PELEAR!', { y: 40, color: '#c6ff4a', ms: 800 }); audio.tocar('aviso'); break;
      case 'sinEnergia': { const L = c.buscar(e.id); if (L?.control === 'humano' && performance.now() - ultimoTexto > 900) { hud.texto(`Falta energía · mantén ${nombreTecla(entradas[0].mapa.carga?.[0] || 'KeyH')} para cargar`, { y: 30, color: '#7fd4ff', ms: 900 }); ultimoTexto = performance.now(); } break; }
      case 'cinematica': audio.tocar('carga'); break;
      case 'cineInicio': hud.texto(e.texto, { y: 72, color: e.color, ms: 1600 }); break;
      case 'cine:sonido': audio.tocar(e.nombre); break;
      case 'cine:impacto': { const k = partida.director.actual?.ctx?.objetivo; if (k) { fx.impacto(k.x, 80, { fuerza: 13, color: CINEMATICAS[partida.director.actual?.id]?.color, elemento: c.buscar(partida.director.actual?.ctx?.atacante?.id)?.def.efectos?.elemento }); if (e.final) { fx.explosion(k.x, 70, { color: CINEMATICAS[partida.director.actual?.id]?.color }); } } break; }
      case 'rebotePared': fx.fragmentos(e.x + e.lado * 20, e.y, { color: '#9a90b0' }); render.grieta(e.lado); fx.sacudir(10); audio.tocar('romper'); break;
      case 'reboteSuelo': fx.polvo(e.x, 0, { cantidad: 16 }); fx.fragmentos(e.x, 0, { cantidad: 10, color: '#8a7a68' }); fx.sacudir(8); break;
      case 'derribo': fx.polvo(e.x, 0, { cantidad: 12 }); fx.sacudir(4); audio.tocar('aterrizar'); break;
      case 'romper': fx.fragmentos(e.x, e.y, { cantidad: 26, color: e.color || '#8e889e', fuerza: 11 }); fx.polvo(e.x, 0); audio.tocar('romper'); break;
      case 'impulso': { const L = c.buscar(e.id); fx.polvo(L.x - L.dir * 20, 0, { cantidad: 6 }); audio.tocar('esquiva'); break; }
      case 'esquiva': audio.tocar('esquiva'); break;
      case 'salto': case 'saltoAereo': audio.tocar('salto'); break;
      case 'carga': audio.tocar('carga', { cada: 0.6 }); break;
      case 'proyectil': audio.tocar(e.efecto === 'fuego' ? 'fuego' : e.efecto === 'electrico' ? 'electrico' : 'rayo'); break;
      case 'choqueProyectil': fx.explosion(e.x, e.y, { radio: 60 }); break;
      case 'ko': hud.texto('K.O.', { y: 38, color: '#ffd94a', ms: 1500 }); audio.tocar('ko'); fx.destellar(0.6); if (pres.koLento && !acc.reducirMovimiento) { bucle.escala = 0.3; setTimeout(() => { bucle.escala = o.velocidad || 1; }, 1100); } break;
      case 'fin': setTimeout(() => hud.texto(e.ganador == null ? 'EMPATE' : e.ganador === 0 ? '¡VICTORIA!' : 'DERROTA', { y: 44, color: e.ganador === 0 ? '#c6ff4a' : '#ff7a5c', ms: 1800 }), 500); break;
      case 'finPartida': setTimeout(() => menuFin(e), 900); break;
      case 'oleada': hud.texto(`OLEADA ${e.n} DE ${e.total}`, { y: 30, color: '#c6ff4a', ms: 1200 }); break;
      case 'oleadasCompletas': hud.texto('¡ZONA LIBRE! →', { y: 30, color: '#c6ff4a', ms: 1400 }); break;
      case 'jefeAviso': audio.tocar('aviso'); break;
      case 'jefeGolpe': fx.ondaExpansiva(e.x, 0, { color: '#ffd27a', radio: 260 }); fx.fragmentos(e.x, 10, { cantidad: 18 }); fx.polvo(e.x, 0, { cantidad: 14 }); fx.sacudir(12); audio.tocar('temblor'); break;
      case 'roca': fx.fragmentos(e.x, 10, { cantidad: 12 }); fx.polvo(e.x, 0, { cantidad: 8 }); fx.sacudir(5); break;
      case 'jefeFase': hud.texto(e.nombre.toUpperCase(), { y: 30, color: '#ff8a5c', ms: 1600 }); break;
      case 'jefeAgotado': hud.texto('¡NÚCLEO EXPUESTO!', { y: 30, color: '#ffd27a', ms: 1200 }); break;
      case 'malabarMax': case 'comboMax': if (opcionesPartida?.modo === 'entrenamiento') hud.texto(e.tipo === 'malabarMax' ? 'Límite de malabares' : 'Combo demasiado largo', { y: 30, color: '#fff', ms: 800 }); break;
      case 'comboFin': if (opcionesPartida?.modo === 'entrenamiento') entreno(e); break;
    }
  }
  function entreno(e) { const caja = document.getElementById('fx-entreno'); if (caja) caja.textContent = `Último combo: ${e.golpes} golpes · ${Math.round(e.dano)} de daño`; }

  function actualizarHUD() {
    const c = partida.combate, eq = (n) => [...c.luchadores, ...c.extras].filter((l) => l.eq === n && (l.activo || l.tipo === 'luchador'));
    for (const [i, b] of (barras || []).entries()) {
      const L = eq(i).find((l) => l.activo) || eq(i)[0]; if (!L) continue;
      b.vida.poner(L.vida / L.vidaMax); b.energia?.poner(L.energia / c.reglas.energiaMax); b.aguante?.poner(L.aguante / L.def.resistencia);
      b.vida.etiqueta(`${L.nombre}${L.transformado ? ' · ' + L.transformado.nombre : ''}`);
      b.energia?.color(L.energia >= 100 ? '#ffffff' : L.energia >= 50 ? '#ffd94a' : '#7fd4ff');
    }
    const t = document.getElementById('fx-tiempo'); if (t) t.textContent = c.tiempo > 6000 ? '∞' : String(Math.ceil(c.tiempo / 60));
    const m = document.getElementById('fx-marcador'); if (m) m.textContent = partida.modo.tipo === 'duelo' || partida.modo.tipo === 'equipos' ? `Ronda ${partida.ronda} · ${partida.marcador[0]} – ${partida.marcador[1]}` : partida.modo.nombre;
    const tj = document.getElementById('fx-tarjeta'); if (tj) { tj.style.display = partida.tarjeta ? 'grid' : 'none'; if (partida.tarjeta) tj.innerHTML = `<b>${partida.tarjeta.titulo}</b><span>${partida.tarjeta.texto}</span><small>Pulsa un golpe para empezar</small>`; }
  }
  function montarHUD() {
    hud.raiz.querySelectorAll('.fx-barra,.fx-extra').forEach((n) => n.remove());
    const c = partida.combate, jefe = c.extras.find((l) => l.tipo === 'jefe');
    barras = [{ vida: hud.barra({ x: 24, y: 30, ancho: 380, alto: 16, color: '#c6ff4a', etiqueta: '' }), energia: hud.barra({ x: 24, y: 52, ancho: 250, alto: 8, color: '#7fd4ff' }), aguante: hud.barra({ x: 24, y: 64, ancho: 160, alto: 5, color: '#ffffff' }) }];
    if (jefe) barras.push({ vida: hud.barra({ x: 200, y: 500, ancho: 560, alto: 16, color: '#ffb35a', etiqueta: '' }) });
    else barras.push({ vida: hud.barra({ x: 556, y: 30, ancho: 380, alto: 16, color: '#c6ff4a', etiqueta: '', derecha: true }), energia: hud.barra({ x: 686, y: 52, ancho: 250, alto: 8, color: '#7fd4ff', derecha: true }), aguante: hud.barra({ x: 776, y: 64, ancho: 160, alto: 5, color: '#ffffff', derecha: true }) });
    // las barras usan píxeles de un lienzo de 960×540: se reescalan con el contenedor
    for (const b of barras) for (const k of Object.values(b)) { const s = k.el.style; s.left = (parseFloat(s.left) / 9.6) + '%'; s.top = (parseFloat(s.top) / 5.4) + '%'; s.width = (parseFloat(s.width) / 9.6) + '%'; }
    combos = [hud.combo('izq'), hud.combo('der')];
    const extra = (html, css) => { const d = document.createElement('div'); d.className = 'fx-extra'; d.innerHTML = html; d.style.cssText = css; hud.raiz.appendChild(d); return d; };
    extra('<b id="fx-tiempo">99</b>', 'position:absolute;left:50%;top:3%;transform:translateX(-50%);font:900 30px/1 system-ui;text-shadow:0 2px 0 #000');
    extra('<span id="fx-marcador"></span>', 'position:absolute;left:50%;top:11%;transform:translateX(-50%);font:700 12px system-ui;opacity:.85;white-space:nowrap');
    extra('', 'display:none').id = 'fx-dummy';
    const tj = extra('', 'position:absolute;inset:auto 10% 18% 10%;display:grid;gap:6px;padding:16px 18px;border-radius:14px;background:rgba(10,8,18,.85);border:1px solid #3b3354;text-align:center;font:15px/1.4 system-ui'); tj.id = 'fx-tarjeta'; tj.style.display = 'none';
    if (opcionesPartida.modo === 'entrenamiento') { const e = extra('Entrenamiento: cajas visibles (azul = hurtbox, rojo = hitbox). Combos, frame data y ventaja aparecen aquí.', 'position:absolute;left:2%;bottom:3%;max-width:60%;font:600 12px system-ui;background:rgba(10,8,18,.7);padding:6px 10px;border-radius:8px'); e.id = 'fx-entreno'; }
  }

  function arrancar(op) {
    opcionesPartida = op; enMenu = false;
    const modo = typeof op.modo === 'object' ? op.modo : { ...MODOS[op.modo], ...(o.modos?.[op.modo] || {}) };
    partida = crearPartida({ ...op, modo, personajes, continues: o.continues, historiaReintentar: o.historiaReintentar, sinIntro: o.sinIntro, reglas: o.reglas, semilla: o.semilla ?? 1, acc, escenario: { tema: o.escenario?.tema, obstaculos: o.escenario?.obstaculos }, jefe: o.jefe, reglasJefe: o.reglasJefe, ajustesIA: o.ia, cinematicas: { ...CINEMATICAS, ...(o.cinematicas || {}) } });
    fx = crearFX({ max: 4000, acc, densidad: o.fx?.densidad ?? 1, intensidad: o.fx?.intensidad ?? 1, semilla: o.semilla ?? 3 }); fx.presupuesto = PERFILES[perfilId].particulas;
    render = crearRender(p5i, { tema: temaDe(), semilla: typeof o.semilla === 'number' ? o.semilla : 9, acc, fx, cuerpos: o.cuerpos, sprites, mostrarCajas: op.modo === 'entrenamiento' || !!o.mostrarCajas, postimagenes: pres.postimagenes !== false, estelas: pres.estelas !== false, zoomFijo: !!pres.zoomFijo, zoomMax: pres.zoomMax || 1.15, calidad: perfilId, cpu: lienzoCPU });
    combateVisto = partida.combate;
    fx.permitirImpacto = pres.impactoCuadro !== false; fx.permitirLineas = pres.lineasVelocidad !== false;
    bucle.escala = o.velocidad || 1;
    montarHUD();
    const tit = modo.tipo === 'jefe' ? (o.jefe || JEFES.gaiaron).nombre.toUpperCase() : partida.cuenta ? textoRonda() : '¡A PELEAR!';
    hud.texto(tit, { y: 40, color: '#ffffff', ms: 1100 });
    enfocar();
  }
  // el lienzo toma el teclado (dentro del iframe del estudio, un clic en el juego basta para jugar)
  function enfocar() { try { p5i?.canvas?.focus?.({ preventScroll: true }); } catch { /* sin foco: las teclas igual llegan a la ventana */ } }
  const textoRonda = () => { const m = partida?.modo?.tipo; return m === 'duelo' || m === 'equipos' ? `RONDA ${partida.ronda}` : m === 'oleadas' ? `RIVAL ${partida.indice + 1}` : m === 'torneo' ? 'TORNEO' : m === 'historia' ? `CAPÍTULO ${partida.indice + 1}` : 'PREPÁRATE'; };
  const ayuda = () => (dos ? `Jugador 1 · ${ayudaControles(entradas[0].mapa, { breve: true })}. Jugador 2 · ${ayudaControles(entradas[1].mapa, { breve: true })}.` : ayudaControles(entradas[0].mapa, { breve: true }) + ' · Menú (M): todos los controles' + '.');
  function menuInicio() {
    enMenu = true;
    const modos = (o.modosMenu || ['cpu']).filter((m) => MODOS[m]);
    hud.menu(o.titulo || 'Forja', `${o.subtitulo || 'Elige cómo jugar.'} ${ayuda()}`,
      modos.map((m) => ({ texto: MODOS[m].nombre, accion: () => elegirLuchador(m) })));
  }
  function elegirLuchador(modo) {
    const opciones = (o.luchadoresMenu || ['ren', 'mako']).filter((k) => personajes[k]);
    if (personajes.forja) opciones.unshift('forja');
    if (opciones.length <= 1 || o.saltarSeleccion) return arrancar({ modo, jugador: opciones[0] || 'ren', rival: o.rival, nivel: o.nivel });
    hud.menu('Elige a tu luchador', 'Cada uno tiene su ritmo, sus técnicas y su transformación.', opciones.map((k) => ({ texto: `${personajes[k].nombre} · ${personajes[k].clase}`, accion: () => arrancar({ modo, jugador: k, rival: o.rival || (k === 'mako' ? 'ren' : 'mako'), nivel: o.nivel }) })));
  }
  function abrirPausa() {
    pausa = true; entradas.forEach((e) => e.pausar(true));
    hud.menu('Pausa', ayuda(), [
      { texto: 'Seguir', accion: cerrarPausa },
      { texto: 'Reiniciar la pelea', accion: () => { cerrarPausa(); arrancar(opcionesPartida); } },
      { texto: render.mostrarCajas ? 'Ocultar cajas de golpe' : 'Ver cajas de golpe (rayos X)', accion: () => { render.mostrarCajas = !render.mostrarCajas; cerrarPausa(); } },
      { texto: acc.reducirMovimiento ? 'Activar sacudidas de cámara' : 'Reducir movimiento (sin sacudidas)', accion: () => { acc.reducirMovimiento = !acc.reducirMovimiento; cerrarPausa(); } },
      { texto: acc.reducirDestellos ? 'Permitir destellos' : 'Reducir destellos', accion: () => { acc.reducirDestellos = !acc.reducirDestellos; cerrarPausa(); } },
      { texto: audio.silencio ? 'Activar sonido' : 'Silenciar', accion: () => { audio.silencio = !audio.silencio; cerrarPausa(); } },
      { texto: 'Volver al menú', accion: () => { cerrarPausa(); menuInicio(); } },
    ]);
  }
  function cerrarPausa() { pausa = false; entradas.forEach((e) => e.pausar(false)); hud.cerrarMenu(); p5i?.canvas?.focus?.(); }
  function menuFin(e) {
    hud.menu(e.gane ? '¡Ganaste!' : 'Fin de la partida', e.campeon ? '¡Campeón del torneo!' : e.rivalesVencidos != null ? `Rivales vencidos: ${e.rivalesVencidos}` : e.gane ? 'Buena pelea.' : 'Prueba otra estrategia: bloquea, castiga y carga energía.', [
      { texto: 'Otra vez', accion: () => arrancar(opcionesPartida) }, { texto: 'Menú', accion: menuInicio }]);
  }
  // configuración en vivo desde el Editor de Forja (solo lo que se puede cambiar sin reiniciar)
  globalThis.addEventListener?.('message', (ev) => {
    const d = ev.data; if (!d || d.forja !== 'config' || !d.config) return;
    if (validar(d.config, ESQUEMA).length) return;
    const cf = d.config;
    if (cf.efectos && fx) { fx.intensidad = cf.efectos.intensidad ?? fx.intensidad; fx.densidad = cf.efectos.densidad ?? fx.densidad; }
    if (cf.accesibilidad) { acc.reducirMovimiento = !!cf.accesibilidad.reducirMovimiento; acc.reducirDestellos = !!cf.accesibilidad.reducirDestellos; }
    if (cf.camara?.cajas != null && render) render.mostrarCajas = !!cf.camara.cajas;
    if (cf.audio) { audio.volumen = cf.audio.volumen ?? audio.volumen; audio.silencio = !!cf.audio.silencio; }
    if (cf.velocidad) { o.velocidad = cf.velocidad; bucle.escala = cf.velocidad; }
    if (cf.personajes && partida) for (const L of [...partida.combate.luchadores, ...partida.combate.extras]) { const k = cf.personajes[L.def.id]; if (k?.cuerpo) L.def = { ...L.def, cuerpo: { ...L.def.cuerpo, ...k.cuerpo } }; }
  });

  await new Promise((ok) => {
    p5i = new globalThis.p5((s) => {
      s.setup = () => {
        const cv = s.createCanvas(ANCHO, ALTO); cv.elt.tabIndex = 0; cv.elt.setAttribute('aria-label', o.titulo || 'Juego');
        const c = capacidades(cv.elt.getContext('webgl') || null); void c;
        if (o.perfil === 'auto' || !o.perfil) perfilId = perfilSugerido({ ...capacidades(null), webgl: true, gpu: '' }) === 'bajo' ? 'bajo' : 'alto';
        // con lienzo de CPU la resolución no baja: copiar sin escalar es lo rápido (la calidad baja quitando efectos)
        s.pixelDensity(lienzoCPU ? 1 : Math.min(2, devicePixelRatio || 1) * PERFILES[perfilId].resolucion);
        ajustar = () => { const r = cont.getBoundingClientRect(), k = Math.min(r.width / ANCHO, r.height / ALTO); cv.elt.style.width = ANCHO * k + 'px'; cv.elt.style.height = ALTO * k + 'px'; const hr = hud.raiz.style; hr.left = (r.width - ANCHO * k) / 2 + 'px'; hr.top = (r.height - ALTO * k) / 2 + 'px'; hr.width = ANCHO * k + 'px'; hr.height = ALTO * k + 'px'; hr.right = 'auto'; hr.bottom = 'auto'; };
        ajustar(); globalThis.addEventListener('resize', ajustar);
        s.noLoop(); ok();
      };
    }, cont);
  });
  // menús con teclado: ↑ ↓ (o W S) recorren las opciones; Enter / Espacio eligen (botones nativos). Clic en el juego → foco.
  globalThis.addEventListener?.('keydown', (ev) => {
    const m = hud._menu; if (!m) return;
    if (pausa && (ev.code === 'Escape' || ev.code === 'KeyP') && !ev.repeat) { ev.preventDefault(); cerrarPausa(); return; }
    const bs = [...m.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    const paso = ev.code === 'ArrowDown' || ev.code === 'KeyS' ? 1 : ev.code === 'ArrowUp' || ev.code === 'KeyW' ? -1 : 0;
    if (paso) { ev.preventDefault(); bs[(i + paso + bs.length) % bs.length]?.focus(); }
    else if ((ev.code === 'Enter' || ev.code === 'Space') && i < 0 && bs[0]) { ev.preventDefault(); bs[0].click(); }
  });
  cont.addEventListener?.('pointerdown', (ev) => { if (!ev.target.closest?.('button')) enfocar(); });
  // p5 solo da el lienzo; el ritmo lo lleva el bucle de paso fijo (requestAnimationFrame propio)
  bucle.iniciar();
  if (o.directo) arrancar({ modo: o.directo, jugador: o.jugador || (personajes.forja ? 'forja' : 'ren'), rival: o.rival, nivel: o.nivel });
  else menuInicio();
  const api = { get partida() { return partida; }, bucle, get render() { return render; }, get fx() { return fx; }, monitor, hud, acc, arrancar, entradas, opciones: o };
  globalThis.__juego = api;
  return api;
}
