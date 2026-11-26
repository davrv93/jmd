// Forja · los controles de cada juego, elegidos por el alumno al crearlo (paso «Procedimientos» de «Diseña tu videojuego»).
// Fullerton llama «procedimientos» a los métodos de juego: quién hace qué y cómo. En un videojuego, eso son los controles,
// así que se deciden ahí y no quedan fijos en el código.
//
// CONTRATO: el juego lee ACCIONES, no teclas. DATOS.controles = { accion: ['KeyJ', 'ArrowUp', …] } (KeyboardEvent.code).
//  - Plantillas Phaser: Forja.controles(escena) en plantillas/comun.js.
//  - Motores anime y voxel: crearEntrada() en motores/nucleo/entrada.js.
// Se guarda en forja.ajustes → controles[plantilla]. Lo que el alumno no cambió vale lo de fábrica.

// Teclas de fábrica por familia (las mismas que el juego tenía antes de poder elegirlas).
const PHASER = {
  izq: ['ArrowLeft', 'KeyA'], der: ['ArrowRight', 'KeyD'], arriba: ['ArrowUp', 'KeyW'], abajo: ['ArrowDown', 'KeyS'],
  salto: ['ArrowUp', 'KeyW', 'Space'], golpe: ['KeyX'], cuidado: ['ShiftLeft', 'ShiftRight'], pocion: ['KeyC'], turbo: ['Space'],
  repetir: ['KeyR'], rayosx: ['KeyV'],
};
// Anime simple: UN botón de golpe que encadena ligero → medio → fuerte (motores/anime/juego.js), especial y bloquear.
// Los tres golpes por separado siguen existiendo sin tecla: el esquema «Clásico» se los da (J K L).
const ANIME = {
  izq: ['KeyA', 'ArrowLeft'], der: ['KeyD', 'ArrowRight'], salto: ['Space', 'KeyW', 'ArrowUp'], abajo: ['KeyS', 'ArrowDown'],
  golpe: ['KeyJ'], especial: ['KeyK'], bloqueo: ['KeyL', 'ShiftLeft'],
  ligero: [], medio: [], fuerte: [], esquiva: ['KeyO'], carga: ['KeyH'], definitivo: ['KeyY'], transformar: ['KeyT'], relevo: ['KeyQ'], pausa: ['Escape', 'KeyP'],
};
const ANIME_CLASICO = { ...ANIME, golpe: [], ligero: ['KeyJ'], medio: ['KeyK'], fuerte: ['KeyL'], especial: ['KeyI'], bloqueo: ['KeyU', 'ShiftLeft'] };
const VOXEL = {
  adelante: ['KeyW', 'ArrowUp'], atras: ['KeyS', 'ArrowDown'], izq: ['KeyA', 'ArrowLeft'], der: ['KeyD', 'ArrowRight'],
  salto: ['Space'], carrera: ['ShiftLeft', 'ShiftRight'], agachar: ['KeyC'], romper: ['KeyJ'], usar: ['KeyK'], camara: ['KeyF'],
  inventario: ['KeyE'], misiones: ['KeyQ'], comer: ['KeyR'], guardar: ['KeyG'], rayos: ['KeyV'], pausa: ['KeyP', 'Escape'],
};
const NOMBRES = {
  izq: 'Izquierda', der: 'Derecha', arriba: 'Arriba', abajo: 'Abajo / agacharte', salto: 'Saltar', golpe: 'Golpear',
  cuidado: 'Caminar con cuidado', pocion: 'Beber poción', turbo: 'Turbo', repetir: 'Repetir', rayosx: 'Rayos X',
  ligero: 'Golpe ligero', medio: 'Golpe medio', fuerte: 'Golpe fuerte', especial: 'Especial', bloqueo: 'Bloquear',
  esquiva: 'Esquivar', carga: 'Cargar energía', definitivo: 'Definitivo', transformar: 'Transformarte', relevo: 'Relevo', pausa: 'Pausa',
  adelante: 'Adelante', atras: 'Atrás', carrera: 'Correr', agachar: 'Agacharte / bajar', camara: 'Cámara 1.ª/3.ª',
  romper: 'Romper / atacar', usar: 'Poner / usar', rayos: 'Rayos X', inventario: 'Inventario', misiones: 'Misiones', comer: 'Comer', guardar: 'Guardar partida',
};
// Qué acciones usa cada juego: [lo básico, más controles]. Lo básico es lo que hace falta para jugar (moverse, saltar
// y una o dos acciones); lo demás queda plegado en «Más controles» y en el menú del juego.
const USA = {
  plataformas: [['izq', 'der', 'salto', 'golpe'], ['abajo', 'repetir', 'rayosx']],
  futbol: [['izq', 'der', 'arriba', 'abajo', 'golpe'], ['repetir', 'rayosx']],
  laberinto: [['izq', 'der', 'arriba', 'abajo'], ['repetir', 'rayosx']],
  runner: [['salto', 'abajo'], ['repetir', 'rayosx']],
  fortaleza: [['izq', 'der', 'arriba', 'abajo', 'golpe'], ['cuidado', 'pocion', 'repetir', 'rayosx']],
  persecucion: [['izq', 'der', 'arriba', 'abajo'], ['turbo', 'repetir', 'rayosx']],
  'duelo-anime': [['izq', 'der', 'salto', 'abajo', 'golpe', 'especial', 'bloqueo'], ['esquiva', 'carga', 'definitivo', 'transformar', 'relevo', 'pausa', 'ligero', 'medio', 'fuerte']],
  'jefe-titan': [['izq', 'der', 'salto', 'abajo', 'golpe', 'especial', 'bloqueo'], ['esquiva', 'carga', 'definitivo', 'transformar', 'pausa', 'ligero', 'medio', 'fuerte']],
  'mundo-voxel': [['adelante', 'atras', 'izq', 'der', 'salto'], ['carrera', 'agachar', 'romper', 'usar', 'camara', 'rayos', 'pausa']],
  'supervivencia-voxel': [['adelante', 'atras', 'izq', 'der', 'salto', 'inventario'], ['carrera', 'agachar', 'romper', 'usar', 'comer', 'camara', 'guardar', 'rayos', 'pausa']],
  'creativo-voxel': [['adelante', 'atras', 'izq', 'der', 'salto'], ['carrera', 'agachar', 'romper', 'usar', 'camara', 'guardar', 'rayos', 'pausa']],
  'aventura-voxel': [['adelante', 'atras', 'izq', 'der', 'salto', 'inventario'], ['carrera', 'agachar', 'romper', 'usar', 'misiones', 'comer', 'camara', 'guardar', 'rayos', 'pausa']],
};
// Lo que no se cambia aquí (ratón, números), para que la leyenda lo diga igual.
const EXTRA = {
  'mundo-voxel': 'Ratón: mirar · clic izq. romper · clic der. poner · 1-9 o rueda: bloque',
  'supervivencia-voxel': 'Ratón: mirar · clic izq. romper o atacar · clic der. poner o usar · 1-9 barra',
  'creativo-voxel': 'Ratón: mirar · clic izq. romper · clic der. poner · 1-9 o rueda: bloque · doble salto: volar',
  'aventura-voxel': 'Ratón: mirar · clic izq. romper o atacar · clic der. poner o usar · 1-9 barra',
  'duelo-anime': 'Golpear varias veces seguidas arma un combo · rayos X en la pausa',
  'jefe-titan': 'Golpear varias veces seguidas arma un combo · rayos X en la pausa',
};
// Diferencias de fábrica de un juego respecto de su familia.
const PROPIO = { futbol: { golpe: ['KeyX', 'Space'] } };
// Nombres que cambian según el juego (en fútbol «golpe» es patear).
const NOMBRE_EN = { 'duelo-anime': { golpe: 'Golpear (combo)', abajo: 'Agacharte' }, 'jefe-titan': { golpe: 'Golpear (combo)', abajo: 'Agacharte' }, futbol: { golpe: 'Patear' }, runner: { abajo: 'Agacharte o caer rápido' }, fortaleza: { golpe: 'Espada', arriba: 'Trepar / puerta', abajo: 'Agacharte / bajar / bloquear' }, laberinto: { abajo: 'Abajo' }, persecucion: { abajo: 'Abajo' } };
const nombreDe = (id, a) => NOMBRE_EN[id]?.[a] || NOMBRES[a];
const minus = (t) => t[0].toLowerCase() + t.slice(1);
const familia = (id) => (/-anime$|^jefe-titan$/.test(id) ? ANIME : /-voxel$/.test(id) ? VOXEL : PHASER);
const solo = (m, lista) => Object.fromEntries(lista.map((a) => [a, m[a]]));

// Esquemas listos: un clic y todo el juego cambia de teclas.
const ESQUEMAS = {
  phaser: [
    { id: 'fabrica', nombre: 'Flechas y WASD', d: 'Los dos a la vez (de fábrica)', m: PHASER },
    { id: 'flechas', nombre: 'Solo flechas', d: 'Flechas, Espacio salta, X golpea', m: { ...PHASER, izq: ['ArrowLeft'], der: ['ArrowRight'], arriba: ['ArrowUp'], abajo: ['ArrowDown'], salto: ['ArrowUp', 'Space'], golpe: ['KeyX'], pocion: ['KeyC'] } },
    { id: 'wasd', nombre: 'WASD + J', d: 'Mano izquierda mueve, derecha golpea', m: { ...PHASER, izq: ['KeyA'], der: ['KeyD'], arriba: ['KeyW'], abajo: ['KeyS'], salto: ['KeyW', 'Space'], golpe: ['KeyJ'], pocion: ['KeyK'] } },
  ],
  anime: [
    { id: 'fabrica', nombre: 'Simple', d: 'De fábrica: J golpea (combo), K especial, L bloquea', m: ANIME },
    { id: 'flechas', nombre: 'Flechas + ZXC', d: 'Flechas mueven; Z golpea, X especial, C bloquea', m: { ...ANIME, izq: ['ArrowLeft'], der: ['ArrowRight'], salto: ['ArrowUp', 'Space'], abajo: ['ArrowDown'], golpe: ['KeyZ'], especial: ['KeyX'], bloqueo: ['KeyC', 'ShiftLeft'], esquiva: ['KeyV'], carga: ['KeyA'], definitivo: ['KeyS'], transformar: ['KeyD'] } },
    { id: 'clasico', nombre: 'Clásico (J K L)', d: 'Un botón por golpe: J ligero, K medio, L fuerte, I especial, U bloquea', m: ANIME_CLASICO },
  ],
  voxel: [
    { id: 'fabrica', nombre: 'WASD', d: 'De fábrica: W A S D y el ratón', m: VOXEL },
    { id: 'flechas', nombre: 'Flechas', d: 'Flechas para caminar, Espacio salta', m: { ...VOXEL, adelante: ['ArrowUp'], atras: ['ArrowDown'], izq: ['ArrowLeft'], der: ['ArrowRight'], agachar: ['ControlRight', 'KeyC'], romper: ['KeyZ'], usar: ['KeyX'] } },
  ],
};
const familiaId = (id) => (familia(id) === ANIME ? 'anime' : familia(id) === VOXEL ? 'voxel' : 'phaser');

const usa = (id) => USA[id] || USA.plataformas;
export const accionesDe = (id) => [...usa(id)[0], ...usa(id)[1]];
export const basicasDe = (id) => usa(id)[0];
export const defectoDe = (id) => solo({ ...familia(id), ...PROPIO[id] }, accionesDe(id));
export const esquemasDe = (id) => ESQUEMAS[familiaId(id)].map((e) => ({ ...e, m: solo(e.id === 'fabrica' ? { ...e.m, ...PROPIO[id] } : e.m, accionesDe(id)) }));
// El mapa completo que va al juego: lo de fábrica con lo que eligió el alumno encima.
export function mapaDe(id, propios) {
  const m = defectoDe(id);
  if (propios) for (const [a, t] of Object.entries(propios)) if (a in m && Array.isArray(t)) m[a] = [...t];   // [] = sin tecla
  return m;
}

const NOMBRE_TECLA = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Espacio', ShiftLeft: 'Mayús', ShiftRight: 'Mayús', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab', Backspace: '⌫', Backquote: '`', Comma: ',', Period: '.', Slash: '/', Semicolon: 'Ñ', Quote: '´', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', MetaLeft: '⌘' };
export function nombreTecla(c) {
  if (NOMBRE_TECLA[c]) return NOMBRE_TECLA[c];
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);
  if (/^Digit\d$/.test(c)) return c.slice(5);
  if (/^Numpad/.test(c)) return 'Num ' + c.slice(6);
  return c;
}
const unicos = (ts) => [...new Set(ts.map(nombreTecla))];
// «← A izquierda · → D derecha · …» para la leyenda del juego, el LEEME y la prueba de Juul.
//   todo = false: solo lo básico (lo que se ve bajo el juego); el LEEME lleva todo.
export function textoControles(id, mapa = mapaDe(id), { todo = true } = {}) {
  const partes = (todo ? accionesDe(id) : basicasDe(id)).filter((a) => mapa[a]?.length).map((a) => `${unicos(mapa[a]).join(' ')} ${minus(nombreDe(id, a))}`);
  if (EXTRA[id]) partes.push(EXTRA[id]);
  return partes.join(' · ');
}
export function leyenda(id, mapa = mapaDe(id)) {
  const b = new Set(basicasDe(id));
  return accionesDe(id).filter((a) => mapa[a]?.length).map((a) => ({ accion: a, nombre: nombreDe(id, a), teclas: unicos(mapa[a]), basica: b.has(a) })).concat(EXTRA[id] ? [{ accion: 'extra', nombre: EXTRA[id], teclas: [], basica: true }] : []);
}
// Validación al guardar: nombres de acción y de tecla razonables, como mucho 4 teclas por acción.
export function limpiarControles(c) {
  const o = {};
  if (!c || typeof c !== 'object') return o;
  for (const [pl, m] of Object.entries(c)) {
    if (!/^[a-z0-9-]{1,30}$/.test(pl) || !m || typeof m !== 'object') continue;
    const r = {};
    for (const [a, ts] of Object.entries(m)) {
      if (!/^[a-z]{1,20}$/.test(a) || !Array.isArray(ts)) continue;
      const t = ts.filter((x) => typeof x === 'string' && /^[A-Za-z0-9]{1,24}$/.test(x)).slice(0, 4);
      if (t.length || !ts.length) r[a] = t;   // [] a propósito = acción sin tecla (p. ej. el esquema Simple del anime)
    }
    if (Object.keys(r).length) o[pl] = r;
  }
  return o;
}

// Panel para elegir: esquemas arriba y, debajo, cada acción con sus teclas y «Cambiar» (pulsa la tecla nueva).
//   panelControles({ el, id, propios, alCambiar(nuevosPropios) }) → HTMLElement
export function panelControles({ el, id, propios = {}, alCambiar }) {
  const caja = el('div', { class: 'd-controles' });
  let actual = mapaDe(id, propios), escuchando = null, masAbierto = false;
  const guardar = () => {   // solo lo que difiere de fábrica
    const def = defectoDe(id), dif = {};
    for (const a of accionesDe(id)) if (JSON.stringify(actual[a]) !== JSON.stringify(def[a])) dif[a] = actual[a];
    alCambiar?.(dif);
  };
  function pintar() {
    caja.replaceChildren();
    const esq = el('div', { class: 'd-chips', role: 'radiogroup', 'aria-label': 'Esquema de controles' });
    for (const e of esquemasDe(id)) {
      const b = el('button', { type: 'button', class: 'd-chip', role: 'radio', 'aria-checked': String(JSON.stringify(e.m) === JSON.stringify(actual)), title: e.d }, e.nombre);
      b.onclick = () => { actual = { ...e.m }; guardar(); pintar(); };
      esq.append(b);
    }
    caja.append(el('p', { class: 'd-sub' }, 'Elige tus controles:'), esq);
    const usadas = new Map();
    for (const a of accionesDe(id)) for (const t of actual[a] || []) { if (!usadas.has(t)) usadas.set(t, []); usadas.get(t).push(a); }
    const fila = (a) => {
      const fila = el('div', { class: 'd-tecla-fila', role: 'listitem' });
      const teclas = el('span', { class: 'd-teclas-de' });
      for (const t of actual[a] || []) {
        const otras = (usadas.get(t) || []).filter((x) => x !== a && !(x === 'salto' && a === 'arriba') && !(x === 'arriba' && a === 'salto'));
        teclas.append(el('kbd', otras.length ? { class: 'choca', title: `También: ${otras.map((x) => nombreDe(id, x)).join(', ')}` } : {}, nombreTecla(t)));
      }
      const b = el('button', { type: 'button', class: 'd-cambiar' }, escuchando === a ? 'Pulsa una tecla…' : 'Cambiar');
      if (escuchando === a) b.classList.add('escucha');
      b.onclick = () => { escuchando = escuchando === a ? null : a; pintar(); };
      if (!(actual[a] || []).length) teclas.append(el('span', { class: 'd-sin' }, 'sin tecla'));
      fila.append(el('span', { class: 'd-accion' }, nombreDe(id, a)), teclas, b);
      return fila;
    };
    // Lo básico a la vista; lo demás plegado (se abre solo si estás cambiando una de esas teclas)
    const tabla = el('div', { class: 'd-teclado', role: 'list' }); tabla.append(...basicasDe(id).map(fila)); caja.append(tabla);
    const resto = accionesDe(id).filter((a) => !basicasDe(id).includes(a));
    if (resto.length) {
      const det = el('details', { class: 'd-mas' }); det.open = masAbierto || resto.includes(escuchando);
      det.ontoggle = () => { masAbierto = det.open; };
      const lista = el('div', { class: 'd-teclado', role: 'list' }); lista.append(...resto.map(fila));
      det.append(el('summary', {}, `Más controles (${resto.length}) · no hacen falta para empezar`), lista); caja.append(det);
    }
    if (EXTRA[id]) caja.append(el('p', { class: 'd-nota' }, EXTRA[id]));
    const fab = el('button', { type: 'button', class: 'd-enlace' }, 'Volver a los de fábrica');
    fab.onclick = () => { actual = defectoDe(id); escuchando = null; guardar(); pintar(); };
    caja.append(fab);
    if (escuchando) caja.querySelector('.escucha')?.focus({ preventScroll: true });
  }
  // La tecla se toma en fase de captura para que Escape no cierre el diálogo mientras se elige.
  const tomar = (ev) => {
    if (!caja.isConnected) { if (vivo) window.removeEventListener('keydown', tomar, true); return; }
    vivo = true;
    if (!escuchando) return;
    ev.preventDefault(); ev.stopPropagation();
    if (ev.code === 'Escape' || !ev.code) { escuchando = null; pintar(); return; }
    actual = { ...actual, [escuchando]: [ev.code] }; escuchando = null; guardar(); pintar();
  };
  let vivo = false;
  window.addEventListener('keydown', tomar, true);
  requestAnimationFrame(() => { vivo = true; });
  pintar();
  return caja;
}
