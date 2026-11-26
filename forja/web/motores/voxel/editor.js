// Forja · voxel · paneles del Editor (pestaña «Editor» del diálogo de juegos). Cada control cambia UNA ruta de la
// configuración; los de mundo (semilla, biomas, relieve, estructuras, bloques) reinician la partida porque cambian
// la generación; los demás (física, cámara, luz, clima, criaturas, sonido) viajan en vivo por postMessage.
import { BIOMAS } from './biomas.js';
import { BLOQUES } from './bloques.js';
import { TIPOS } from './criaturas.js';
import { semillaDe } from '../nucleo/semilla.js';

const ruta = (o, k) => k.split('.').reduce((a, p) => a?.[p], o);
const fijar = (o, k, v) => { const p = k.split('.'); let a = o; for (let i = 0; i < p.length - 1; i++) a = a[p[i]]; a[p[p.length - 1]] = v; };

export function paneles({ config, cambiar, el }) {
  const c0 = () => structuredClone(config);
  const poner = (k, v, reiniciar) => { const c = c0(); fijar(c, k, v); if (cambiar(c, { reiniciar })) config = c; };
  const fila = (etq, ...h) => el('label', { style: 'display:flex;align-items:center;gap:8px;margin:4px 0;font-size:13px' }, el('span', { style: 'min-width:170px' }, etq), ...h);
  const desliz = (etq, k, min, max, paso, reiniciar = false, fmt = (v) => String(v)) => {
    const v = el('b', { style: 'min-width:44px;text-align:right' }, fmt(ruta(config, k)));
    const i = el('input', { type: 'range', min, max, step: paso, value: ruta(config, k), 'aria-label': etq, style: 'flex:1' });
    i.oninput = () => { v.textContent = fmt(+i.value); }; i.onchange = () => poner(k, paso >= 1 ? Math.round(+i.value) : +i.value, reiniciar);
    return fila(etq, i, v);
  };
  const casilla = (etq, k, reiniciar = false) => { const i = el('input', { type: 'checkbox', 'aria-label': etq }); i.checked = !!ruta(config, k); i.onchange = () => poner(k, i.checked, reiniciar); return fila(etq, i); };
  const lista = (etq, k, ops, reiniciar = false) => { const s = el('select', { 'aria-label': etq }); for (const [v, n] of ops) { const o = el('option', { value: v }, n); if (ruta(config, k) === v) o.selected = true; s.append(o); } s.onchange = () => poner(k, s.value, reiniciar); return fila(etq, s); };
  const caja = (...h) => el('div', {}, ...h);

  // semilla con vista previa del número
  const sem = el('input', { value: config.semilla, maxlength: 80, 'aria-label': 'Semilla', style: 'flex:1' }), num = el('code', {}, String(semillaDe(config.semilla)));
  sem.oninput = () => { num.textContent = String(semillaDe(sem.value)); };
  const bSem = el('button', { type: 'button', class: 'btn mini' }, 'Usar'); bSem.onclick = () => poner('semilla', sem.value.trim().slice(0, 80) || 'aleatoria', true);
  const bAzar = el('button', { type: 'button', class: 'btn mini' }, 'Al azar'); bAzar.onclick = () => { const t = 'MUNDO-' + (semillaDe('aleatoria') % 100000); sem.value = t; poner('semilla', t, true); };
  // mapa del bioma: 64×64 columnas muestreadas con el generador real
  const mapa = el('canvas', { width: 128, height: 128, style: 'width:128px;height:128px;image-rendering:pixelated;border-radius:8px;border:1px solid #3b3354', 'aria-label': 'Mapa de biomas alrededor del inicio' });
  Promise.all([import('./generador.js'), import('./config.js')]).then(([{ crearGenerador }, { opcionesGenerador }]) => {
    const g = crearGenerador(semillaDe(config.semilla), opcionesGenerador(config)), x = mapa.getContext('2d');
    for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const c = g.columna((i - 32) * 24, (j - 32) * 24), col = c.h <= config.mundo.mar ? [40, 90, 180] : c.bioma.cielo.map((v, k) => Math.round(v * 0.4 + [0, 60, 0][k] + Math.min(80, (c.h - config.mundo.mar) * 1.4))); x.fillStyle = `rgb(${col.join(',')})`; x.fillRect(i * 2, j * 2, 2, 2); }
  }).catch(() => {});
  const biomas = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' });
  for (const b of BIOMAS) {
    const i = el('input', { type: 'checkbox', 'aria-label': b.nombre }); i.checked = !config.mundo.biomas.length || config.mundo.biomas.includes(b.id);
    i.onchange = () => { const marcados = [...biomas.querySelectorAll('input')].map((x, n) => (x.checked ? BIOMAS[n].id : null)).filter(Boolean); poner('mundo.biomas', marcados.length === BIOMAS.length ? [] : marcados, true); };
    biomas.append(el('label', { style: 'font-size:12px;display:flex;gap:4px;align-items:center' }, i, b.nombre));
  }
  const bloques = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px;font-size:12px' });
  for (const b of BLOQUES.filter((x) => x && x.id)) {
    const i = el('input', { type: 'checkbox', 'aria-label': `En la barra: ${b.nombre}` }); i.checked = config.hotbar.includes(b.clave);
    i.onchange = () => { const h = config.hotbar.filter((x) => x !== b.clave); if (i.checked) h.push(b.clave); poner('hotbar', h.slice(0, 9), true); };
    bloques.append(el('label', { title: `dureza ${b.dureza} · ${b.pase}${b.luz ? ' · luz ' + b.luz : ''}${b.herramienta ? ' · ' + b.herramienta : ''}` }, i, ` ${b.nombre}`));
  }
  return [
    { titulo: 'Semilla', nodo: caja(fila('Texto o número', sem, bSem, bAzar), el('p', { class: 'nota' }, 'Hash estable del texto → número: '), num, el('div', { style: 'margin-top:8px' }, mapa)) },
    { titulo: 'Biomas y clima', nodo: caja(el('p', { class: 'nota' }, 'Desmarca los que no quieres: se reemplazan por el más parecido en temperatura y humedad.'), biomas, desliz('Temperatura', 'mundo.temperatura', -0.8, 0.8, 0.05, true), desliz('Humedad', 'mundo.humedad', -0.8, 0.8, 0.05, true)) },
    { titulo: 'Terreno', nodo: caja(desliz('Relieve', 'mundo.relieve', 0.3, 2.5, 0.1, true), desliz('Montañas', 'mundo.montanas', 0, 2.5, 0.1, true), desliz('Océanos', 'mundo.oceanos', 0, 2, 0.1, true), desliz('Lagos', 'mundo.lagos', 0, 2, 0.1, true), desliz('Ríos', 'mundo.rios', 0, 2, 0.1, true), desliz('Escala de paisajes', 'mundo.escala', 0.5, 2.5, 0.1, true), desliz('Nivel del mar', 'mundo.mar', 24, 80, 1, true), desliz('Túneles', 'mundo.cuevas', 0, 2.5, 0.1, true), desliz('Cavernas', 'mundo.cavernas', 0, 2, 0.1, true), desliz('Minerales', 'mundo.minerales', 0, 4, 0.1, true), desliz('Vegetación', 'mundo.vegetacion', 0, 2.5, 0.1, true)) },
    { titulo: 'Bloques (barra rápida)', nodo: caja(el('p', { class: 'nota' }, 'Elige hasta 9 bloques para la barra. Pasa el ratón para ver dureza, transparencia y luz de cada uno.'), bloques) },
    { titulo: 'Estructuras', nodo: caja(...['aldea', 'ruina', 'mazmorra', 'torre', 'templo', 'campamento'].map((e) => desliz(e[0].toUpperCase() + e.slice(1), `estructuras.${e}`, 0, 3, 0.1, true)), casilla('Caminos', 'estructuras.caminos', true), casilla('Puentes', 'estructuras.puentes', true)) },
    { titulo: 'Criaturas', nodo: caja(casilla('Criaturas', 'modulos.criaturas', true), casilla('Hostiles', 'modulos.enemigos', true), casilla('Jefe de mazmorra', 'criaturas.jefe', true), desliz('Densidad', 'criaturas.densidad', 0, 3, 0.1), desliz('Agresividad', 'criaturas.agresividad', 0, 3, 0.1), desliz('Velocidad', 'criaturas.velocidad', 0.4, 2, 0.1), desliz('Radio de simulación', 'criaturas.radioSim', 16, 96, 4), el('p', { class: 'nota' }, Object.values(TIPOS).map((t) => `${t.nombre} (${t.clase})`).join(' · '))) },
    { titulo: 'Física', nodo: caja(desliz('Gravedad', 'jugador.gravedad', 8, 50, 1), desliz('Salto', 'jugador.salto', 5, 14, 0.1), desliz('Velocidad', 'jugador.velocidad', 2, 9, 0.1), desliz('Carrera', 'jugador.carrera', 1, 2.5, 0.05), desliz('Nado', 'jugador.nado', 1, 6, 0.1), desliz('Caída sin daño', 'jugador.caidaSegura', 2, 50, 0.5), casilla('Volar', 'jugador.vuelo'), casilla('Subir escalones solo', 'jugador.pasoAuto')) },
    { titulo: 'Cámara', nodo: caja(lista('Cámara', 'jugador.camara', [['primera', 'Primera persona'], ['tercera', 'Tercera persona']], true), desliz('Campo de visión', 'jugador.fov', 50, 110, 1), desliz('Sensibilidad', 'jugador.sensibilidad', 0.2, 3, 0.1), casilla('Invertir eje Y', 'jugador.invertirY'), desliz('Distancia (chunks)', 'render.distancia', 2, 12, 1)) },
    { titulo: 'Iluminación', nodo: caja(desliz('Duración del día (s)', 'ambiente.duracionDia', 60, 3600, 30), casilla('Ciclo día/noche', 'ambiente.cicloDia'), desliz('Luz de luna', 'ambiente.luzNoche', 0, 0.6, 0.02), casilla('Estrellas', 'ambiente.estrellas'), desliz('Niebla', 'render.niebla', 0.3, 2, 0.1), desliz('Brillo de antorchas', 'render.brilloBloques', 0.3, 2, 0.1), casilla('Oclusión ambiental (AO)', 'render.ao', true), lista('Calidad', 'render.perfil', [['auto', 'Automática'], ['bajo', 'Baja'], ['medio', 'Media'], ['alto', 'Alta'], ['ultra', 'Ultra']], true)) },
    { titulo: 'Clima y partículas', nodo: caja(lista('Clima', 'ambiente.clima', [['auto', 'Según el bioma'], ['despejado', 'Despejado'], ['lluvia', 'Lluvia'], ['nieve', 'Nieve']]), desliz('Intensidad', 'ambiente.intensidadClima', 0, 2, 0.1), desliz('Olas del agua', 'render.olas', 0, 2, 0.1)) },
    { titulo: 'Audio', nodo: caja(desliz('Volumen', 'audio.volumen', 0, 1, 0.05), casilla('Efectos', 'audio.efectos'), casilla('Pasos', 'audio.pasos')) },
  ];
}
