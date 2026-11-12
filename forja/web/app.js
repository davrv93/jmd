// Forja · estudio. Estado = { familia, variante, params, semilla }. Todo lo que se ve sale de resolver(reglas, estado).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resolver, sorpresa, mutar, PARAMS_BASE, css, clamp } from './motor/resolver.js';
import { iniciarP5 } from './motor/texturas.js';
import { construir } from './motor/personaje.js';
import { posar, duracion } from './motor/animar.js';
import { miniatura, hojaSprites, codigoPhaser } from './motor/sprites.js';
import { interpretar, aParams } from './motor/interprete.js';
import { iniciarMas } from './mas.js';

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, txt) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) e.setAttribute(k, v); if (txt != null) e.textContent = txt; return e; };
const [R, LEX] = await Promise.all([fetch('datos/reglas.json').then((r) => r.json()), fetch('datos/lexico.json').then((r) => r.json())]);
await new Promise((ok) => (window.p5 ? ok() : addEventListener('load', ok, { once: true })));
await iniciarP5();
const M = R.meta, T = R.T;

// ---------------------------------------------------------------- estado y enlace
let E = { familia: 'gato', variante: 'fuego', params: { ...PARAMS_BASE }, semilla: 1 + Math.floor(Math.random() * 99999) };
let anim = 'quieto', spec = null, pj = null;
function aEnlace() {
  const p = {}; for (const [k, v] of Object.entries(E.params)) if (JSON.stringify(v) !== JSON.stringify(PARAMS_BASE[k])) p[k] = typeof v === 'number' ? Math.round(v * 100) / 100 : v;
  return '#' + encodeURIComponent(JSON.stringify([E.familia, E.variante, E.semilla, p]));
}
function deEnlace() {
  try {
    const [f, v, s, p] = JSON.parse(decodeURIComponent(location.hash.slice(1)));
    if (!M.familias.some((x) => x.id === f) || !M.variantes.some((x) => x.id === v)) return false;
    const limpio = {};
    for (const [k, val] of Object.entries(p || {})) if (k in PARAMS_BASE) limpio[k] = val;
    E = { familia: f, variante: v, semilla: +s || 1, params: { ...PARAMS_BASE, ...limpio } }; return true;
  } catch { return false; }
}
if (location.hash.length > 3) deEnlace();

// ---------------------------------------------------------------- escena 3D
const lienzo = $('lienzo'), escenario = $('escenario');
const render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true }); // se conserva el dibujo para copiarlo al GIF y al video
render.setPixelRatio(Math.min(devicePixelRatio, 2));
const escena = new THREE.Scene();
escena.add(new THREE.HemisphereLight(0xffffff, 0x8a7f9c, 1.5));
const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(2.5, 4, 3.5); escena.add(sol);
const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const control = new OrbitControls(camara, lienzo);
Object.assign(control, { enablePan: false, enableDamping: true, dampingFactor: 0.08, minPolarAngle: 0.9, maxPolarAngle: 1.62, autoRotateSpeed: 2.2 });
// tarima y sombra de contacto
const tarima = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.12, 64), new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }));
tarima.position.y = -0.065; escena.add(tarima);
const sombra = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }));
sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.004; escena.add(sombra);
let objetivoY = 0.8, distancia = 6;
function tamano() {
  const w = escenario.clientWidth, h = escenario.clientHeight;
  render.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); encuadrar(false);
}
function encuadrar(mover = true) {
  if (!pj) return;
  const alto = Math.max(pj.alto, pj.ancho) * 1.5 + 0.5, fov = camara.fov * Math.PI / 180;
  distancia = alto / 2 / Math.tan(fov / 2) / Math.min(1, camara.aspect * 1.25);
  objetivoY = pj.alto * 0.5;
  control.minDistance = distancia * 0.6; control.maxDistance = distancia * 1.7;
  if (mover) { const dir = camara.position.clone().sub(control.target).normalize(); if (!dir.lengthSq()) dir.set(0.45, 0.2, 1).normalize(); control.target.set(0, objetivoY, 0); camara.position.copy(control.target).addScaledVector(dir, distancia); }
}
camara.position.set(1.6, 1.5, 5); control.target.set(0, 0.8, 0);
new ResizeObserver(tamano).observe(escenario);

const historial = [], futuro = []; let ultimo = '', enHistoria = false;
function anotar() { const j = JSON.stringify(E); if (j === ultimo) return; if (ultimo && !enHistoria) { historial.push(ultimo); if (historial.length > 80) historial.shift(); futuro.length = 0; } ultimo = j; enHistoria = false; $('bDeshacer').disabled = !historial.length; $('bRehacer').disabled = !futuro.length; }
function saltarA(j, pila) { pila.push(ultimo); E = JSON.parse(j); ultimo = ''; enHistoria = true; interfazDe = ''; fondos(); pintar(true); }
function deshacer() { if (historial.length) saltarA(historial.pop(), futuro); }
function rehacer() { if (futuro.length) saltarA(futuro.pop(), historial); }
let pendiente = false, golpe = 0; // «golpe»: rebote de aparición al cambiar de personaje
function pintar(cambioTipo = false) {
  if (pendiente) { pendiente = pendiente === 'tipo' || cambioTipo ? 'tipo' : true; return; }
  pendiente = cambioTipo ? 'tipo' : true;
  requestAnimationFrame(() => {
    const fueTipo = pendiente === 'tipo'; pendiente = false;
    spec = resolver(R, E.familia, E.variante, E.params, E.semilla);
    const nuevo = construir(spec);
    if (pj) { escena.remove(pj.raiz); pj.liberar(); }
    pj = nuevo; escena.add(pj.raiz);
    sombra.scale.setScalar(clamp(pj.ancho * 0.5, 0.25, 1.4));
    encuadrar(fueTipo || !camara.userData.listo); camara.userData.listo = true;
    if (fueTipo) golpe = performance.now();
    interfaz(); history.replaceState(null, '', aEnlace());
    clearTimeout(pintar.t); pintar.t = setTimeout(() => { anotar(); if (hojaActiva === 'variar') variaciones(); }, 450);
  });
}
const t0 = performance.now();
(function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  if (!pj) return;
  const d = duracion(spec, anim) * (anim === 'saltar' || anim === 'golpe' ? 1.25 : 1), u = (((ahora - t0) / 1000) / d) % 1;
  posar(pj, spec, anim, u);
  const k = Math.min(1, (ahora - golpe) / 420); // aparece con un rebote
  if (k < 1) { const e = 1 - Math.pow(1 - k, 3), r = 1 + 0.16 * Math.sin(k * Math.PI * 2.2) * (1 - k); pj.raiz.scale.setScalar(spec.dims.escala * (0.55 + 0.45 * e) * r); } else pj.raiz.scale.setScalar(spec.dims.escala);
  sombra.material.opacity = 0.3 / (1 + pj.P.todo.position.y * 1.6);
  control.update(); render.render(escena, camara);
})(t0);

// ---------------------------------------------------------------- interfaz
const fijar = (cambios, tipo = false) => { Object.assign(E.params, cambios); pintar(tipo); };
function chips(caja, lista, activo, alElegir, o = {}) {
  caja.replaceChildren(...lista.map((x) => {
    const b = el('button', { type: 'button', class: 'chip', role: o.rol || 'radio', [o.attr || 'aria-checked']: String(o.multi ? activo.includes(x.id) : activo === x.id), disabled: x.no ? '' : null, title: x.no ? 'No disponible para esta familia' : null }, x.nombre);
    b.onclick = () => alElegir(x.id); return b;
  }));
}
const BONITO = { dano: 'Daño', bebe: 'Bebé', arcoiris: 'Arcoíris', dia: 'Día' };
const nombreDe = (id) => BONITO[id] || id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
const lista = (ids) => ids.map((id) => ({ id, nombre: nombreDe(id) }));

function deslizador(k, nombre, a = 'bajo', b = 'alto') {
  const c = el('label', { class: 'campo' }), v = E.params[k];
  const cab = el('span'); cab.append(nombre, el('output', {}, v < 0.33 ? a : v > 0.67 ? b : 'medio'));
  const i = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: v, style: `--p:${v * 100}%` });
  i.oninput = () => { const x = +i.value; i.style.setProperty('--p', x * 100 + '%'); cab.lastChild.textContent = x < 0.33 ? a : x > 0.67 ? b : 'medio'; E.params[k] = x; pintar(); };
  c.append(cab, i); return c;
}

let hojaActiva = null, interfazDe = '', nombreVisto = '';
function interfaz() {
  if (spec.nombre !== nombreVisto) { const h = $('nombre'); nombreVisto = h.textContent = spec.nombre; h.classList.remove('cambia'); void h.offsetWidth; h.classList.add('cambia'); }
  $('ficha').textContent = `${M.familias.find((f) => f.id === E.familia).rig} · semilla ${E.semilla} · ${spec.reglas.length} reglas aplicadas`;
  const f = spec.fisica;
  $('fisica').replaceChildren(...[['Velocidad', f.velocidad, 320], ['Salto', f.salto, 640], ['Masa', f.masa, 4]].map(([n, v, max]) => { const d = el('div'); d.append(el('span', {}, n), el('b', {}, String(v)), el('i', { style: `--v:${clamp(v / max * 100, 4, 100)}%` })); return d; }));
  // catálogo: solo marca la selección (las miniaturas se pintan una vez)
  for (const b of $('familias').children) b.setAttribute('aria-selected', String(b.dataset.id === E.familia));
  chips($('variantes'), M.variantes.map((v) => ({ id: v.id, nombre: v.id === 'clasico' ? 'Clásico' : v.nombre })), E.variante, (id) => { E.variante = id; E.params.tono = null; E.params.patron = null; E.params.accesorios = null; pintar(true); }, { rol: 'option', attr: 'aria-selected' });
  // las hojas de ajustes solo se rehacen si cambió algo que las afecta (no mientras se arrastra un deslizador)
  const firma = [E.familia, E.variante, hojaActiva, E.params.armonia, E.params.animo, E.params.patron, E.params.expresion, E.params.ojoEstilo, E.params.edad, (spec.accesorios.map((a) => a.id)).join(), E.params.tono == null, E.params.tonos == null, hojaActiva === 'reglas' ? spec.reglas.length : ''].join('|');
  if (firma !== interfazDe) { interfazDe = firma; hojas(); } else if (hojaActiva === 'color') muestras();
}
function muestras() {
  const m = $('muestras'); if (!m) return;
  m.replaceChildren(...['cuerpo', 'panza', 'extremidad', 'detalle', 'accesorio'].map((p) => el('i', { style: `background:${css(spec.colores[p])}`, 'data-n': p })));
}
function hojas() {
  const tC = $('tCuerpo'), tCo = $('tColor'), tCa = $('tCara'), tE = $('tExtras'), tR = $('tReglas');
  if (hojaActiva === 'cuerpo') {
    tC.replaceChildren(deslizador('altura', 'Altura', 'bajo', 'alto'), deslizador('peso', 'Peso', 'flaco', 'gordo'), deslizador('cabeza', 'Cabeza', 'pequeña', 'grande'),
      deslizador('ojos', 'Ojos', 'pequeños', 'grandes'), deslizador('brazos', 'Brazos', 'cortos', 'largos'), deslizador('piernas', 'Piernas', 'cortas', 'largas'));
    const g = el('div'); g.append(el('div', { class: 'grupo-t' }, 'Edad')); const c = el('div', { class: 'chips', role: 'radiogroup' }); chips(c, lista(M.edades), E.params.edad, (id) => fijar({ edad: id })); g.append(c); tC.append(g);
    const re = el('button', { type: 'button', class: 'btn mini' }, 'Volver a las medidas base'); re.onclick = () => { fijar({ altura: 0.5, peso: 0.5, cabeza: 0.5, ojos: 0.5, brazos: 0.5, piernas: 0.5, edad: 'adulto' }); interfazDe = ''; }; tC.append(re);
    const gb = el('div'); gb.append(el('div', { class: 'grupo-t' }, 'Al sorprender, conservar')); const cb = el('div', { class: 'chips' });
    (function candados() { chips(cb, lista(['familia', 'variante', 'color', 'medidas']), [...bloqueos], (id) => { bloqueos.has(id) ? bloqueos.delete(id) : bloqueos.add(id); candados(); }, { multi: true, rol: 'switch' }); })();
    gb.append(cb); tC.append(gb);
  } else if (hojaActiva === 'color') {
    const tono = E.params.tono ?? T.tipo[spec.id].tono;
    const c = el('label', { class: 'campo' }), cab = el('span'); cab.append('Color principal'); const auto = el('button', { type: 'button', class: 'btn mini' }, 'Color del tipo'); auto.onclick = (e) => { e.preventDefault(); fijar({ tono: null, luzAbs: null, satAbs: null }); };
    const i = el('input', { type: 'range', class: 'tono', min: 0, max: 359, step: 1, value: tono }); i.oninput = () => { E.params.tono = +i.value; E.params.luzAbs = E.params.satAbs = null; pintar(); };
    c.append(cab, i); tCo.replaceChildren(c, el('div', { class: 'muestras', id: 'muestras', style: 'margin-bottom:14px' }));
    if (E.params.tono != null) tCo.append(auto);
    for (const [titulo, k, ops] of [['Armonía', 'armonia', M.armonias], ['Ánimo', 'animo', M.animos]]) { const g = el('div'); g.append(el('div', { class: 'grupo-t' }, titulo)); const cc = el('div', { class: 'chips', role: 'radiogroup' }); chips(cc, ops, E.params[k], (id) => fijar({ [k]: id })); g.append(cc); tCo.append(g); }
    const g = el('div'); g.append(el('div', { class: 'grupo-t' }, 'Patrón')); const cc = el('div', { class: 'chips', role: 'radiogroup' });
    chips(cc, M.patrones.map((p) => ({ id: p, nombre: nombreDe(p), no: !T.patronFam[`${E.familia}|${p}`][0] })), spec.patron.tipo, (id) => fijar({ patron: id })); g.append(cc); tCo.append(g);
    const det = el('details'); det.open = !!E.params.tonos; det.append(el('summary', { class: 'grupo-t', style: 'cursor:pointer' }, 'Color por parte'));
    for (const parte of ['panza', 'extremidad', 'detalle', 'accesorio']) {
      const cp = el('label', { class: 'campo' }); cp.append(el('span', {}, nombreDe(parte)));
      const ip = el('input', { type: 'range', class: 'tono', min: 0, max: 359, step: 1, value: Math.round(spec.colores[parte].h) }); ip.oninput = () => { E.params.tonos = { ...(E.params.tonos || {}), [parte]: +ip.value }; pintar(); };
      cp.append(ip); det.append(cp);
    }
    const qt = el('button', { type: 'button', class: 'btn mini' }, 'Volver a la armonía'); qt.onclick = () => { fijar({ tonos: null }); interfazDe = ''; }; det.append(qt); tCo.append(det);
    muestras();
  } else if (hojaActiva === 'cara') {
    tCa.replaceChildren();
    for (const [titulo, k, ops, act] of [['Expresión', 'expresion', lista(M.expresiones), E.params.expresion], ['Ojos', 'ojoEstilo', M.ojos.map((o) => ({ id: o, nombre: nombreDe(o), no: !T.ojo[`${E.familia}|${o}`][0] })), spec.ojoEstilo]]) {
      const g = el('div'); g.append(el('div', { class: 'grupo-t' }, titulo)); const cc = el('div', { class: 'chips', role: 'radiogroup' }); chips(cc, ops, act, (id) => fijar({ [k]: id })); g.append(cc); tCa.append(g);
    }
  } else if (hojaActiva === 'extras') {
    const puestos = spec.accesorios.map((a) => a.id);
    const cc = el('div', { class: 'chips' });
    chips(cc, M.accesorios.map((a) => ({ id: a.id, nombre: a.nombre, no: !T.acc[`${E.familia}|${a.id}`][0] })), puestos, (id) => { const s = new Set(puestos); s.has(id) ? s.delete(id) : s.add(id); fijar({ accesorios: [...s] }); }, { multi: true, rol: 'switch' });
    const q = el('button', { type: 'button', class: 'btn mini' }, 'Los del tipo'); q.onclick = () => fijar({ accesorios: null });
    // mover y escalar cada accesorio puesto: tamaño, altura y adelante/atrás
    const filas = spec.accesorios.map((a) => {
      const f = el('div', { class: 'ajuste' }), aj = { e: 1, y: 0, z: 0, ...(E.params.accAjuste?.[a.id] || {}) };
      f.append(el('b', {}, M.accesorios.find((x) => x.id === a.id)?.nombre || a.id));
      for (const [k, nombre, min, max] of [['e', 'Tamaño', 0.5, 1.8], ['y', 'Altura', -0.4, 0.4], ['z', 'Adelante', -0.4, 0.4]]) {
        const l = el('label', {}, nombre), i = el('input', { type: 'range', min, max, step: 0.01, value: aj[k], 'aria-label': `${nombre} de ${a.id}`, style: `--p:${(aj[k] - min) / (max - min) * 100}%` });
        i.oninput = () => { aj[k] = +i.value; i.style.setProperty('--p', (aj[k] - min) / (max - min) * 100 + '%'); E.params.accAjuste = { ...(E.params.accAjuste || {}), [a.id]: { e: aj.e, y: aj.y, z: aj.z } }; pintar(); };
        l.append(i); f.append(l);
      }
      return f;
    });
    tE.replaceChildren(el('p', { class: 'nota' }, 'Las reglas de compatibilidad apagan lo que no encaja con esta familia.'), cc, q, ...(filas.length ? [el('div', { class: 'grupo-t' }, 'Mover y escalar'), ...filas] : []));
  } else if (hojaActiva === 'reglas') {
    const n = el('div', { class: 'reglas-n' });
    for (const [k, v] of Object.entries(M.cuenta)) n.append(el('span', {}, k), el('b', {}, v.toLocaleString('es-PE')));
    n.append(el('span', { class: 'tot' }, 'Total compilado'), el('b', { class: 'tot' }, M.total.toLocaleString('es-PE')));
    tR.replaceChildren(el('p', { class: 'nota' }, 'Cada personaje sale de tablas de reglas locales. Ningún modelo generativo dibuja nada.'), n,
      el('div', { class: 'grupo-t' }, `Aplicadas a este personaje: ${spec.reglas.length}`), el('div', { class: 'rastro' }, spec.reglas.join('\n')));
    tR.lastChild.style.whiteSpace = 'pre-wrap';
  }
}
// Muelle: una sola herramienta abierta a la vez. Tocar la que ya está abierta la cierra y deja todo el espacio al personaje.
const TITULOS = { catalogo: 'Catálogo', cuerpo: 'Cuerpo', color: 'Color', cara: 'Cara', extras: 'Accesorios', variar: 'Variaciones', reglas: 'Reglas' };
function abrir(id) {
  hojaActiva = id && TITULOS[id] ? id : null; interfazDe = '';
  $('cajon').classList.toggle('abierto', !!hojaActiva);
  for (const b of $('muelle').children) b.setAttribute('aria-selected', String(b.dataset.t === hojaActiva));
  for (const h of document.querySelectorAll('.cajon .hoja')) h.hidden = h.dataset.t !== hojaActiva;
  $('cajonTitulo').textContent = TITULOS[hojaActiva] || '';
  try { localStorage.setItem('forja.hoja', JSON.stringify(hojaActiva)); } catch { /* sin almacenamiento */ }
  if (spec && hojaActiva) { hojas(); if (hojaActiva === 'variar') variaciones(); }
}
$('muelle').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) abrir(hojaActiva === b.dataset.t ? null : b.dataset.t); };
$('bCerrarCajon').onclick = () => abrir(null);


// animaciones, fondos y giro
chips($('animaciones'), lista(M.animaciones), anim, function elegir(id) { anim = id; chips($('animaciones'), lista(M.animaciones), anim, elegir); });
const COL_FONDO = { noche: '#3a2f6b', bosque: '#2f7a4c', cielo: '#8ec9ff', desierto: '#f2c070', nieve: '#f3f7ff', cueva: '#3b3340', ciudad: '#7b6ea8', lava: '#b8421c' };
function fondos() {
  $('fondos').replaceChildren(...M.fondos.map((f) => { const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(E.params.fondo === f), 'aria-label': `Fondo ${f}`, title: nombreDe(f), style: `--c:${COL_FONDO[f]}` }); b.onclick = () => { fijar({ fondo: f }); fondos(); }; return b; }));
  escenario.dataset.fondo = E.params.fondo; escenario.toggleAttribute('data-claro', ['cielo', 'desierto', 'nieve'].includes(E.params.fondo));
}
$('bGirar').onclick = (e) => { control.autoRotate = !control.autoRotate; e.currentTarget.setAttribute('aria-pressed', String(control.autoRotate)); };

// catálogo de familias con miniaturas reales (se pintan de a pocas para no trabar)
$('nFam').textContent = `${M.familias.length} · ${M.tipos} tipos en total`;
$('familias').replaceChildren(...M.familias.map((f) => { const b = el('button', { type: 'button', role: 'option', 'aria-selected': 'false', 'data-id': f.id, title: f.nombre }); b.append(el('span', {}, f.nombre)); b.onclick = () => { E.familia = f.id; E.params.accesorios = null; E.params.ojoEstilo = null; E.params.tono = null; E.params.patron = null; pintar(true); }; return b; }));
(async function miniFamilias() {
  for (const b of $('familias').children) { await new Promise((ok) => setTimeout(ok, 30)); b.style.backgroundImage = `url(${miniatura(resolver(R, b.dataset.id, 'clasico', {}, 5), 96)})`; }
})();

function variaciones() {
  const base = { ...E, params: { ...E.params } }, s0 = Math.floor(Math.random() * 1e6);
  $('tira').replaceChildren(...Array.from({ length: 8 }, (_, i) => {
    const m = mutar(R, base, s0 + i * 13), b = el('button', { type: 'button', 'aria-label': `Variación ${i + 1}` });
    setTimeout(() => { b.style.backgroundImage = `url(${miniatura(resolver(R, m.familia, m.variante, m.params, m.semilla), 120)})`; }, 40 * i);
    b.onclick = () => { E = m; interfazDe = ''; pintar(true); }; return b;
  }));
}
$('bMas').onclick = variaciones;
const bloqueos = new Set();
function sorprender() {
  const antes = E, fijo = {}; if (bloqueos.has('familia')) fijo.familia = antes.familia; if (bloqueos.has('variante')) fijo.variante = antes.variante;
  E = sorpresa(R, Math.floor(Math.random() * 1e9), fijo); E.params = { ...PARAMS_BASE, ...E.params, fondo: antes.params.fondo || 'noche' };
  if (bloqueos.has('color')) for (const k of ['tono', 'luzAbs', 'satAbs', 'armonia', 'animo', 'patron', 'tonos']) E.params[k] = antes.params[k];
  if (bloqueos.has('medidas')) for (const k of ['altura', 'peso', 'cabeza', 'ojos', 'brazos', 'piernas', 'edad']) E.params[k] = antes.params[k]; $('entendido').replaceChildren(); interfazDe = ''; fondos(); pintar(true); }
$('bSorpresa').onclick = sorprender;
addEventListener('keydown', (e) => { if (e.target.closest('textarea, input, dialog') || document.querySelector('dialog[open]')) return; if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? rehacer() : deshacer(); return; } if (e.metaKey || e.ctrlKey) return; if (e.key === 's' || e.key === 'S') sorprender(); const i = '123456789'.indexOf(e.key); if (i >= 0) $('animaciones').children[i]?.click(); });

// ---------------------------------------------------------------- describir (embeddings locales en el servidor, léxico de respaldo)
const EJEMPLOS = ['un michi rechoncho de fuego con lentes', 'robot alto y flaco, azul neón', 'dragón bebé de hielo con corona', 'fantasma travieso con sombrero de mago', 'una criatura del pantano que da miedo'];
$('ejemplos').replaceChildren(...EJEMPLOS.map((t) => { const b = el('button', { type: 'button' }, t); b.onclick = () => { $('texto').value = t; forjar(); }; return b; }));
let embeddings = false;
fetch('api/estado').then((r) => r.json()).then((d) => { embeddings = d.embeddings === 'listo'; $('estadoIA').textContent = embeddings ? 'IA externa: 0 · e5-small local' : 'IA externa: 0'; $('estadoIA').title = d.modelo || ''; }).catch(() => {});
$('nReglas').textContent = M.total.toLocaleString('es-PE'); $('nTipos').textContent = M.tipos;

async function describir(texto) {
  let r = null;
  try { const res = await fetch('api/interpretar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }) }); if (res.ok) r = await res.json(); } catch { /* sin servidor: léxico local */ }
  r ??= { ...interpretar(texto, LEX, T.modificador), fuente: 'léxico (sin conexión)', alternativas: [] };
  const caja = $('entendido');
  if (!r.familia && !r.entendido.length) { caja.replaceChildren(el('span', {}, 'No reconocí ningún rasgo. Prueba con un animal, un oficio o un color.')); return; }
  const fam = r.familia || E.familia, va = r.variante || 'clasico';
  const acc = [...new Set([...(T.tipo[`${fam}|${va}`]?.acc || []), ...r.accesorios])];
  E = { familia: fam, variante: va, semilla: 1 + Math.floor(Math.random() * 99999), params: { ...PARAMS_BASE, fondo: E.params.fondo, ...aParams(r.cambios), accesorios: r.accesorios.length ? acc : null } };
  const nomF = (id) => M.familias.find((f) => f.id === id)?.nombre || id, nomV = (id) => M.variantes.find((v) => v.id === id)?.nombre || id, nomA = (id) => M.accesorios.find((a) => a.id === id)?.nombre || id;
  caja.replaceChildren(el('span', {}, 'Entendí:'), ...r.entendido.map((e) => el('span', { class: 'e', 'data-k': e.tipo, title: e.z ? `por significado (z = ${e.z})` : `por la palabra «${e.texto}»` }, e.tipo === 'familia' ? nomF(e.id) : e.tipo === 'variante' ? nomV(e.id) : e.tipo === 'accesorio' ? nomA(e.id) : e.texto)));
  const otras = (r.alternativas || []).filter((a) => a.id !== fam).slice(0, 3);
  if (otras.length) { caja.append(el('span', {}, '¿O quizá?')); for (const a of otras) { const b = el('button', { type: 'button', class: 'alt' }, nomF(a.id)); b.onclick = () => { E.familia = a.id; E.params.accesorios = null; pintar(true); }; caja.append(b); } }
  caja.append(el('span', { class: 'fuente' }, `Fuente: ${r.fuente}${r.ms != null ? ` · ${r.ms} ms` : ''} · sin IA externa`));
  interfazDe = ''; pintar(true);
  const sg = document.querySelector('.sugiere'); sg.classList.add('ver'); clearTimeout(describir.t); describir.t = setTimeout(() => sg.classList.remove('ver'), 6000);
}
// Sin <form>: dentro del aula en vivo el marco va en «sandbox» sin permiso de formularios, y un submit no llegaría nunca.
async function forjar() { const t = $('texto').value.trim() || 'un michi rechoncho de fuego con lentes'; const b = $('bForjar'); b.disabled = true; await describir(t); b.disabled = false; document.dispatchEvent(new CustomEvent('forja:descrito')); }
$('bForjar').onclick = forjar;
$('texto').onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); forjar(); } };
document.addEventListener('click', (e) => { const x = e.target.closest('button.cerrar'); if (x) x.closest('dialog')?.close(); });

// ---------------------------------------------------------------- exportar
let hoja = null, px = 128;
const aviso = (t) => { const a = $('aviso'); a.textContent = t; a.classList.add('ver'); clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('ver'), 1800); };
function bajar(nombre, blob) { const a = el('a', { href: URL.createObjectURL(blob), download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
function prepararHoja() {
  hoja = hojaSprites(spec, R, px);
  $('vistaHoja').replaceChildren(hoja.hoja);
  $('codigo').textContent = codigoPhaser(hoja, spec);
  chips($('tamanos'), M.tamanos.map((t) => ({ id: t, nombre: `${t} px` })), px, (id) => { px = id; prepararHoja(); });
}
$('bExportar').onclick = () => { prepararHoja(); $('dExportar').showModal(); };
$('bPng').onclick = () => hoja.hoja.toBlob((b) => { bajar(`${hoja.clave}.png`, b); aviso('PNG descargado'); });
$('bAtlas').onclick = () => { bajar(`${hoja.clave}.json`, new Blob([JSON.stringify(hoja.atlas)], { type: 'application/json' })); aviso('Atlas descargado'); };
const copiar = async (t, ok) => { try { await navigator.clipboard.writeText(t); aviso(ok); } catch { aviso('No se pudo copiar: selecciona el texto'); } };
$('bCodigo').onclick = () => copiar($('codigo').textContent, 'Código copiado');
$('bEnlace').onclick = () => copiar(location.href, 'Enlace copiado');

$('bDeshacer').onclick = deshacer; $('bRehacer').onclick = rehacer;
iniciarMas({ R, $, el, aviso, bajar, copiar, chips, lista, nombreDe, lienzo, control, COL_FONDO, abrir, forjar, hoja: () => hojaActiva, ejemplos: EJEMPLOS,
  estado: () => E, spec: () => spec, pj: () => pj, enlace: () => location.origin + location.pathname + aEnlace(),
  cargar: (e) => { E = { familia: e.familia, variante: e.variante, semilla: e.semilla, params: { ...PARAMS_BASE, ...e.params } }; interfazDe = ''; fondos(); pintar(true); } });
let inicial = innerWidth > 760 ? 'catalogo' : null; try { const g = JSON.parse(localStorage.getItem('forja.hoja')); if (g !== undefined && innerWidth > 760) inicial = g; } catch { /* valor por defecto */ }
abrir(inicial);
fondos(); tamano(); pintar(true);
document.documentElement.dataset.listo = '1';
