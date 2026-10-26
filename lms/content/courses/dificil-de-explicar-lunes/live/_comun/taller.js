// taller.js · «Mesa de prompts» de las escenas LIVE del kit Steamboat.
//
// El alumno escribe en español lo que quiere («gorro azul y zapatos dorados», «notas corazones más
// grandes», «que el pájaro se pose en el gorro», «más lluvia»). Un intérprete local, sin modelo ni
// cuota, convierte cada frase en acciones del kit y las aplica al instante. Lo que no entiende lo
// convierte en un pedido de seis partes para el agente JMD (terminal: `jmd chat`).
//
//   import { montarTaller } from '../../comun/taller.js';
//   montarTaller(document.getElementById('taller'), { s, escena: 'colores', sugerencias: [...], acciones: {...} });
//
// `acciones` es el diccionario de la escena: { nombre: (valor) => void }. El intérprete solo llama a
// las que existen en la escena; así cada escena decide qué se puede cambiar en vivo.

const COLORES = {
  rojo: '#d6452f', roja: '#d6452f', rojos: '#d6452f', rojas: '#d6452f', azul: '#2f5fa8', azules: '#2f5fa8', celeste: '#4aa3df',
  verde: '#2f9e5a', verdes: '#2f9e5a', amarillo: '#f2c94c', amarilla: '#f2c94c', amarillos: '#f2c94c', dorado: '#d9ad56', dorada: '#d9ad56',
  dorados: '#d9ad56', naranja: '#f2a65a', naranjas: '#f2a65a', morado: '#7a2bff', morada: '#7a2bff', violeta: '#7a2bff', lila: '#d6c5f0',
  rosa: '#f4c2cf', rosado: '#f4c2cf', rosada: '#f4c2cf', fucsia: '#ff2bd6', blanco: '#f4f4f4', blanca: '#f4f4f4', blancos: '#f4f4f4',
  negro: '#121212', negra: '#121212', negros: '#121212', gris: '#8d8d8d', plomo: '#8d8d8d', marrón: '#7a4a2a', marron: '#7a4a2a',
  café: '#7a4a2a', turquesa: '#00bfa5', crema: '#ffe7c2', beige: '#ffe7c2', menta: '#bde6cc', cian: '#00e5ff', 'verde limón': '#e9ff70',
};
const PARTES = {
  gorro: 'gorro', sombrero: 'gorro', gorra: 'gorro', copa: 'visera', visera: 'visera', pantalón: 'pantalon', pantalon: 'pantalon',
  short: 'pantalon', shorts: 'pantalon', zapatos: 'zapatos', zapato: 'zapatos', botas: 'zapatos', cara: 'cara', rostro: 'cara',
  manos: 'guantes', mano: 'guantes', guantes: 'guantes', puños: 'guantes', orejas: 'orejas', oreja: 'orejas', cuerpo: 'cuerpo',
  torso: 'cuerpo', tinta: 'tinta', contorno: 'tinta', contornos: 'tinta', líneas: 'tinta', lineas: 'tinta',
};
const PALETAS = {
  pastel: { tinta: '#2b2340', cara: '#fff3e0', gorro: '#bdd7f3', visera: '#6c5b9e', orejas: '#2b2340', guantes: '#2b2340', pantalon: '#f4c2cf', zapatos: '#efe6a4', cuerpo: '#6c5b9e', otros: '#fff3e0' },
  neón: { tinta: '#0a0014', cara: '#e9ff70', gorro: '#00e5ff', visera: '#7a2bff', orejas: '#ff2bd6', guantes: '#0a0014', pantalon: '#7a2bff', zapatos: '#ff2bd6', cuerpo: '#1a0033', otros: '#e9ff70' },
  neon: null, // alias, se resuelve abajo
  clásico: { tinta: '#121212', cara: '#ffe7c2', gorro: '#2f5fa8', visera: '#1c3a6b', orejas: '#121212', guantes: '#121212', pantalon: '#d6452f', zapatos: '#f2a65a', cuerpo: '#121212', otros: '#ffe7c2' },
  clasico: null,
  '1928': { tinta: '#121212', cara: '#bebebe', gorro: '#bebebe', visera: '#121212', orejas: '#121212', guantes: '#121212', pantalon: '#bebebe', zapatos: '#a8a8a8', cuerpo: '#121212', otros: '#bebebe' },
  original: null, 'blanco y negro': null,
  atardecer: { tinta: '#1f0d2b', cara: '#ffe7c2', gorro: '#7a1f3d', visera: '#1f0d2b', orejas: '#1f0d2b', guantes: '#1f0d2b', pantalon: '#d6452f', zapatos: '#f2a65a', cuerpo: '#1f0d2b', otros: '#ffe7c2' },
};
PALETAS.neon = PALETAS.neón; PALETAS.clasico = PALETAS.clásico; PALETAS.original = PALETAS['1928']; PALETAS['blanco y negro'] = PALETAS['1928'];
const SIMBOLOS = {
  corazones: '♥', corazón: '♥', corazon: '♥', estrellas: '★', estrella: '★', notas: '♪', flores: '❀', flor: '❀', soles: '☀', rayos: '⚡',
  burbujas: '○', círculos: '●', circulos: '●', emojis: '🎵', música: '♪', musica: '♪', letras: 'la', copos: '❄', pájaros: '🐦',
};
const quitarTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Lee una frase y devuelve las acciones que entiende: [{ nombre, valor, texto }] y lo que no entendió. */
export function interpretar(frase, disponibles) {
  const t = ' ' + frase.toLowerCase().replace(/[.,;!¡¿?]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const acciones = [];
  const hay = (n) => disponibles.includes(n);
  const colorDe = (txt) => {
    const hex = /#[0-9a-f]{6}\b/i.exec(txt); if (hex) return hex[0];
    const n = Object.keys(COLORES).sort((a, b) => b.length - a.length).find((c) => txt.includes(' ' + c + ' '));
    return n ? COLORES[n] : null;
  };
  // paleta completa
  for (const p of Object.keys(PALETAS)) if (PALETAS[p] && t.includes(' ' + p + ' ') && hay('colores')) {
    acciones.push({ nombre: 'colores', valor: PALETAS[p], texto: `paleta ${p}` }); break;
  }
  // «<parte> <color>» o «<color> <parte>» por cada parte nombrada
  if (hay('colores')) {
    for (const [palabra, parte] of Object.entries(PARTES)) {
      const i = t.indexOf(' ' + palabra + ' ');
      if (i < 0) continue;
      const ventana = t.slice(Math.max(0, i - 22), i + palabra.length + 24);
      const c = colorDe(ventana);
      if (c) acciones.push({ nombre: 'colores', valor: { [parte]: c }, texto: `${parte} ${c}` });
    }
    if (/ todo (en )?(negro|oscuro) /.test(t)) acciones.push({ nombre: 'colores', valor: { cara: '#3a3a3a', pantalon: '#3a3a3a', zapatos: '#2a2a2a', gorro: '#3a3a3a' }, texto: 'todo oscuro' });
  }
  // notas
  if (hay('simbolo')) for (const [k, v] of Object.entries(SIMBOLOS)) if (t.includes(' ' + k + ' ') && / (nota|notas|símbolo|simbolo|salga|salgan|que sean|sean|pon|poner) /.test(t)) { acciones.push({ nombre: 'simbolo', valor: v, texto: `símbolo ${v}` }); break; }
  if (hay('simbolo')) { const e = /(?:\p{Extended_Pictographic})/u.exec(frase); if (e) acciones.push({ nombre: 'simbolo', valor: e[0], texto: `símbolo ${e[0]}` }); }
  if (hay('tamano')) {
    if (/ (más|mas) (grande|grandes|gordas?) / .test(t) || / enormes? /.test(t)) acciones.push({ nombre: 'tamano', valor: 1.6, texto: 'más grande' });
    if (/ (más|mas) (pequeñ|pequen|chic)\w* /.test(t) || / diminut/.test(t)) acciones.push({ nombre: 'tamano', valor: 0.6, texto: 'más pequeño' });
  }
  if (hay('velocidad')) {
    if (/ (más|mas) (lento|lentas|lentos|despacio) /.test(t)) acciones.push({ nombre: 'velocidad', valor: 0.5, texto: 'más lento' });
    if (/ (más|mas) (rápido|rapido|rápidas|rapidas|veloz) /.test(t)) acciones.push({ nombre: 'velocidad', valor: 2, texto: 'más rápido' });
  }
  if (hay('colorNota')) { const c = colorDe(t.replace(/ (gorro|pantal[oó]n|zapatos|cara|manos|cuerpo) \S+/g, ' ')); if (c && / (nota|notas|símbolo|simbolos|símbolos|corazones|estrellas) /.test(t)) acciones.push({ nombre: 'colorNota', valor: c, texto: `notas de color ${c}` }); }
  // personaje
  if (hay('vuelo')) {
    if (/ (pose|posa|posarse|sentad|sobre el gorro|en el gorro|en la cabeza|encima) /.test(t)) acciones.push({ nombre: 'vuelo', valor: 'cabeza', texto: 'se posa en el gorro' });
    else if (/ (ronde|ronda|rodee|alrededor|gire|círculos|circulos|vueltas) /.test(t)) acciones.push({ nombre: 'vuelo', valor: 'ronda', texto: 'ronda la boca' });
    else if (/ (cruce|cruza|atraviese|vuele|pase|de lado a lado) /.test(t)) acciones.push({ nombre: 'vuelo', valor: 'cruza', texto: 'cruza la escena' });
  }
  if (hay('escala')) {
    if (/ (pájaro|pajaro|personaje|ave) .*(más|mas) (grande|grandes) /.test(t) || / (grande|enorme) /.test(t) && / (pájaro|pajaro|ave) /.test(t)) acciones.push({ nombre: 'escala', valor: 1.5, texto: 'pájaro más grande' });
    if (/ (pájaro|pajaro|personaje|ave) .*(más|mas) (pequeñ|pequen|chic)\w* /.test(t)) acciones.push({ nombre: 'escala', valor: 0.6, texto: 'pájaro más pequeño' });
  }
  if (hay('volteado') && / (mire|mira|voltea|voltee|gira|gire|al otro lado|al revés|al reves|hacia la derecha|hacia la izquierda) /.test(t) && / (pájaro|pajaro|ave|personaje) /.test(t)) acciones.push({ nombre: 'volteado', valor: true, texto: 'pájaro volteado' });
  if (hay('colorPajaro')) { const c = colorDe(t); if (c && / (pájaro|pajaro|ave|personaje) /.test(t)) acciones.push({ nombre: 'colorPajaro', valor: c, texto: `pájaro ${c}` }); }
  // agua
  if (hay('lluvia')) {
    if (/ (más|mas|mucha|muchísima|fuerte|torrencial|diluvio|tormenta) /.test(t) && / (lluvia|llueva|gotas|agua) /.test(t)) acciones.push({ nombre: 'lluvia', valor: 50, texto: 'mucha lluvia' });
    if (/ (menos|poca|poquita|suave|ligera|fina|llovizna) /.test(t) && / (lluvia|llueva|gotas|agua) /.test(t)) acciones.push({ nombre: 'lluvia', valor: 6, texto: 'poca lluvia' });
    if (/ (sin lluvia|que no llueva|pare de llover|deje de llover|para la lluvia) /.test(t)) acciones.push({ nombre: 'lluvia', valor: 0, texto: 'sin lluvia' });
  }
  if (hay('nivel')) { const m = / (\d{1,3}) ?% /.exec(t); if (m && / (agua|nivel|bote|barco|llen|hund) /.test(t)) acciones.push({ nombre: 'nivel', valor: Math.min(100, +m[1]) / 100, texto: `agua al ${m[1]} %` }); if (/ (vac[ií]a|vaciar|achica|achicar|saca el agua|sin agua) /.test(t)) acciones.push({ nombre: 'nivel', valor: 0, texto: 'bote vacío' }); }
  if (hay('balde') && / (balde|cubo|baldazo|tira agua|echa agua|chorro) /.test(t)) acciones.push({ nombre: 'balde', valor: true, texto: 'un balde' });
  if (hay('colorAgua')) { const c = colorDe(t); if (c && / (agua|lluvia|gotas|mar) /.test(t) && !/ (pájaro|gorro|pantal) /.test(t)) acciones.push({ nombre: 'colorAgua', valor: c, texto: `agua ${c}` }); }
  // comunes
  if (hay('pausa')) { if (/ (pausa|para|detén|deten|congela|quieto) /.test(t)) acciones.push({ nombre: 'pausa', valor: true, texto: 'pausa' }); if (/ (reproduce|sigue|continúa|continua|anda|play|arranca) /.test(t)) acciones.push({ nombre: 'pausa', valor: false, texto: 'reproducir' }); }
  if (hay('vaiven') && / (sin vaivén|sin vaiven|cámara fija|camara fija|sin temblor|quita el vaivén) /.test(t)) acciones.push({ nombre: 'vaiven', valor: false, texto: 'cámara fija' });
  // quitar duplicados por nombre+texto
  const vistos = new Set();
  const unicas = acciones.filter((a) => { const k = a.nombre + '|' + a.texto; if (vistos.has(k)) return false; vistos.add(k); return true; });
  return { acciones: unicas, entendido: unicas.length > 0 };
}

/** Pedido en seis partes para el agente JMD, a partir de lo que escribió el alumno. */
export function pedidoSeisPartes(frase, escena, archivo) {
  return [
    `1. Contexto: trabajo en el kit Steamboat Willie (HTML + SVG + kit.js) en /trabajo/steamboat. Estoy en el ejemplo ${archivo}.`,
    `2. Objetivo: ${frase.trim()}.`,
    `3. Archivo: ${archivo}. No toques kit.js ni las celdas; solo el HTML del ejemplo.`,
    `4. Cambio: edita el JavaScript del ejemplo (la API de kit.js está en LEEME.md: colores(), alNota(), agregarPersonaje(), toca()).`,
    `5. Restricciones: sin librerías nuevas, sin romper lo que ya funciona, estilo de 1928 (formas redondas, tinta gruesa).`,
    `6. Comprobación: abre ${archivo} en el Visor; recarga y mira que se vea el cambio y no haya errores en la consola.`,
  ].join('\n');
}

const CSS = `
.tl { display: grid; gap: .5em; margin-top: 1vh; }
.tl-caja { display: grid; grid-template-columns: 1fr auto; gap: .5em; }
.tl textarea { width: 100%; min-height: 3.2em; resize: vertical; font: .82em/1.4 inherit; padding: .55em .7em; border-radius: .7em; border: 1px solid var(--line2); background: var(--s1); color: var(--fg); }
.tl textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.tl-btns { display: grid; gap: .4em; align-content: start; }
.tl button { font: 700 .76em/1 system-ui, sans-serif; padding: .7em .9em; border: 0; border-radius: .7em; cursor: pointer; background: var(--accent); color: var(--on-accent); white-space: nowrap; }
.tl button.sec { background: var(--s3); color: var(--fg); border: 1px solid var(--line2); }
.tl button.ok { background: var(--ok); }
.tl-sug { display: flex; flex-wrap: wrap; gap: .35em; }
.tl-sug button { font-size: .68em; padding: .45em .7em; background: var(--s1); color: var(--fg); border: 1px solid var(--line2); border-radius: 99px; }
.tl-sug button.viva { background: var(--accent-bg); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
.tl-log { font-size: .72em; color: var(--muted); margin: 0; min-height: 1.2em; }
.tl-log b { color: var(--ok); }
.tl-log i { color: var(--warn); font-style: normal; }
.tl-titulo { font-size: .78em; font-weight: 700; margin: 0; display: flex; gap: .5em; align-items: baseline; }
.tl-titulo small { font-weight: 400; color: var(--muted); }
`;

/**
 * Monta la mesa de prompts.
 *   opciones.acciones: { nombre: (valor) => void }   lo que la escena sabe hacer
 *   opciones.sugerencias: ['gorro azul', ...]        chips de arranque
 *   opciones.archivo: 'ejemplos/01-colores.html'     para el pedido al agente
 */
export function montarTaller(contenedor, opciones) {
  const { acciones = {}, sugerencias = [], archivo = 'ejemplos/01-colores.html', titulo = 'Escribe lo que quieres cambiar' } = opciones;
  if (!document.getElementById('tl-css')) { const st = document.createElement('style'); st.id = 'tl-css'; st.textContent = CSS; document.head.appendChild(st); }
  contenedor.classList.add('tl');
  contenedor.innerHTML = `
    <p class="tl-titulo">${titulo} <small>en tus palabras; se aplica al instante</small></p>
    <div class="tl-caja">
      <textarea placeholder="por ejemplo: ${sugerencias[0] || 'gorro azul y zapatos dorados'}" aria-label="Tu pedido"></textarea>
      <div class="tl-btns"><button type="button" data-ap>Aplicar ↵</button><button type="button" class="sec" data-cp>Copiar para el agente</button></div>
    </div>
    <div class="tl-sug" aria-label="Sugerencias"></div>
    <p class="tl-log" aria-live="polite"></p>`;
  const ta = contenedor.querySelector('textarea'), sug = contenedor.querySelector('.tl-sug'), log = contenedor.querySelector('.tl-log');
  const btnAp = contenedor.querySelector('[data-ap]'), btnCp = contenedor.querySelector('[data-cp]');
  const disponibles = Object.keys(acciones);
  const historial = [];

  function pintarSugerencias(texto = '') {
    const t = quitarTildes(texto.toLowerCase());
    const lista = t.length >= 3 ? sugerencias.filter((s) => quitarTildes(s.toLowerCase()).split(' ').some((w) => w.length > 3 && t.includes(w))) : [];
    const mostrar = (lista.length ? lista : sugerencias).slice(0, 8);
    sug.innerHTML = '';
    for (const s of mostrar) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s; if (lista.length) b.classList.add('viva');
      b.onclick = () => { ta.value = ta.value.trim() ? ta.value.trim() + ' y ' + s : s; ta.focus(); aplicar(); };
      sug.appendChild(b);
    }
  }
  function aplicar() {
    const frase = ta.value.trim();
    if (!frase) { log.textContent = 'Escribe algo o toca una sugerencia.'; return; }
    const r = interpretar(frase, disponibles);
    const hechas = [];
    for (const a of r.acciones) { try { acciones[a.nombre](a.valor); hechas.push(a.texto); } catch (e) { /* una acción rota no para las demás */ } }
    historial.push({ frase, hechas });
    if (hechas.length) {
      log.innerHTML = '<b>Hecho:</b> ' + hechas.join(' · ') + (hechas.length < 2 && frase.split(/ y |,/).length > hechas.length ? ' <i>· lo demás, pídeselo al agente (botón de la derecha)</i>' : '');
      btnAp.classList.add('ok'); setTimeout(() => btnAp.classList.remove('ok'), 900);
    } else {
      log.innerHTML = '<i>Eso no lo sé hacer aquí.</i> Prueba una sugerencia, o copia el pedido y pégalo en la terminal: <code>jmd chat</code>.';
    }
    pintarSugerencias('');
  }
  async function copiar() {
    const frase = ta.value.trim() || sugerencias[0] || '';
    const texto = pedidoSeisPartes(frase, opciones.escena, archivo);
    let ok = false;
    try { await navigator.clipboard.writeText(texto); ok = true; } catch (e) { try { await window.parent.navigator.clipboard.writeText(texto); ok = true; } catch (e2) {} }
    if (!ok) { const a = document.createElement('textarea'); a.value = texto; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { ok = document.execCommand('copy'); } catch (e) {} a.remove(); }
    log.innerHTML = ok ? '<b>Pedido copiado</b> (seis partes). Pégalo en la terminal del aula: <code>jmd chat</code> y Enter.' : '<i>No pude copiar.</i> Selecciona el texto y cópialo a mano.';
  }
  btnAp.onclick = aplicar; btnCp.onclick = copiar;
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aplicar(); } });
  ta.addEventListener('input', () => pintarSugerencias(ta.value));
  pintarSugerencias('');
  return { aplicar: (f) => { ta.value = f; aplicar(); }, historial };
}
