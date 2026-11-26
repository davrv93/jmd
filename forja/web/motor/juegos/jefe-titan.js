// Catálogo de «Jefe titán» (DEMO B · Titan Awakening). Motor: Anime Battle Engine (web/motores/anime/jefe.js).
import { clave } from './index.js';
import { luchador, procedimientos, reglasCombate, recursos, conflicto, limites, presentacion, medidas } from './anime-comun.js';

const P = 'jefe-titan';
const nums = (el, gr, k, aj, lista, def, extra) => clave(P, el, gr, k, aj, lista.map(([n, v, d]) => [String(v).replace('.', '_'), n, v, d || '', v === def]), extra);
const si = (el, gr, k, aj, def = true, d = '') => clave(P, el, gr, k, aj, [['si', 'Sí', true, d, def], ['no', 'No', false, '', !def]]);
export const ficha = {
  tipo: 'Batalla contra un jefe',
  objetivo: 'Derribar a un titán de piedra que despierta, cambia de forma y ataca avisando dónde va a golpear.',
  recursos: ['Vida', 'Energía', 'Aguante para esquivar', 'Las ventanas en que el titán queda agotado'],
  conflicto: 'Puños sísmicos, barridos, ondas, lluvias de rocas y la mirada del núcleo, cada vez más rápidos.',
  limites: 'La cantera del templo: el titán ocupa un lado y no se le puede atravesar.',
  gana: 'La vida del titán llega a cero.',
  pierde: 'Tu vida llega a cero (sin continuaciones).',
};
export function reglas() {
  return [
    ...luchador(P), ...medidas(P, 'ren', 'Ren'), ...medidas(P, 'mako', 'Mako'),
    ...nums('jugadores', 'El titán', 'jefe.salud', 'Vida del titán', [['3000', 3000], ['5200', 5200], ['8000', 8000], ['12000', 12000]], 5200, { simple: true }),
    ...clave(P, 'jugadores', 'El titán', 'jefe.nombre', 'Nombre del titán', [['gaiaron', 'Gaiaron, el Titán Dormido', 'Gaiaron, el Titán Dormido', '', true], ['orograno', 'Orograno, el que sostiene el valle', 'Orograno, el que sostiene el valle'], ['petrovel', 'Petrovel, guardián de la cantera', 'Petrovel, guardián de la cantera']]),
    ...clave(P, 'jugadores', 'El titán', 'jefe.colores', 'Piedra del titán', [['gris', 'Granito gris', { piedra: '#6f6a7d', piedra2: '#8e889e' }, '', true], ['arenisca', 'Arenisca', { piedra: '#9a7a58', piedra2: '#b8966e' }], ['basalto', 'Basalto', { piedra: '#3d3a46', piedra2: '#56525f' }], ['jade', 'Jade', { piedra: '#3f7a62', piedra2: '#5a9a7e' }]]),
    ...clave(P, 'objetivo', 'Fases', 'jefe.fases', 'Formas del titán', [['1', 'Una', 1], ['2', 'Dos', 2], ['3', 'Tres', 3, '', true]], { simple: true }),
    ...nums('objetivo', 'Fases', 'jefe.umbralFase2', 'Cambia de forma al llegar a', [['70 % de vida', 0.7], ['60 %', 0.6], ['50 %', 0.5]], 0.6),
    ...nums('objetivo', 'Fases', 'jefe.umbralFase3', 'Furia final al llegar a', [['35 %', 0.35], ['25 %', 0.25], ['15 %', 0.15]], 0.25),
    ...si('objetivo', 'Escena', 'jefe.intro', 'Cinemática del despertar', true),
    ...nums('procedimientos', 'Avisos', 'jefe.avisos', 'Tiempo de aviso de cada ataque', [['Largo', 1.5], ['Normal', 1], ['Corto', 0.75], ['Relámpago', 0.55]], 1, { simple: true }),
    ...nums('procedimientos', 'Avisos', 'jefe.enfurecido', 'Avisos en la furia final', [['Como la fase 1', 1], ['Más rápidos', 1.5], ['Rapidísimos', 1.8]], 1.5),
    ...nums('procedimientos', 'Ritmo', 'jefe.recuperacion', 'Pausa del titán tras atacar', [['Corta', 0.7], ['Normal', 1], ['Larga', 1.4, 'Más tiempo para castigar']], 1),
    ...si('procedimientos', 'Ritmo', 'jefe.repetir', 'Puede repetir el mismo ataque seguido', false),
    ...procedimientos(P),
    ...reglasCombate(P),
    ...nums('reglas', 'El titán', 'jefe.dano', 'Daño del titán', [['Suave', 0.6], ['Normal', 1], ['Fuerte', 1.4], ['Brutal', 2]], 1, { simple: true }),
    ...nums('reglas', 'El titán', 'jefe.empuje', 'Empuje de sus golpes', [['Poco', 0.7], ['Normal', 1], ['Mucho', 1.4]], 1),
    ...nums('reglas', 'Punto débil', 'jefe.nucleoMul', 'Daño al núcleo expuesto', [['×1,3', 1.3], ['×1,6', 1.6], ['×2,2', 2.2]], 1.6),
    ...si('reglas', 'Punto débil', 'jefe.puntoDebil', 'La mano que golpea el suelo es vulnerable', true, 'Golpéala mientras está apoyada: ×1,3'),
    ...recursos(P),
    ...clave(P, 'recursos', 'Intentos', 'jugador.continues', 'Continuaciones', [['0', 'Ninguna', 0, '', true], ['1', 'Una', 1, 'El titán conserva el daño que le hiciste'], ['3', 'Tres', 3]]),
    ...nums('recursos', 'El titán', 'jefe.agotado', 'Cuánto dura agotado', [['Poco', 0.6], ['Normal', 1], ['Mucho', 1.6]], 1),
    ...clave(P, 'recursos', 'El titán', 'jefe.agotadoCada', 'Se agota cada', [['3', '3 ataques', 3], ['4', '4 ataques', 4, '', true], ['6', '6 ataques', 6]]),
    ...conflicto(P),
    ...si('conflicto', 'Ataques', 'jefe.ataque.puno', 'Puño sísmico', true, 'Marca el suelo donde estás y cae'),
    ...si('conflicto', 'Ataques', 'jefe.ataque.barrido', 'Barrido de cantera', true, 'Barre el suelo: salta'),
    ...si('conflicto', 'Ataques', 'jefe.ataque.onda', 'Pisotón', true, 'Una onda recorre el suelo: salta'),
    ...si('conflicto', 'Ataques', 'jefe.ataque.lluvia', 'Lluvia de rocas', true, 'Mira las sombras en el suelo'),
    ...si('conflicto', 'Ataques', 'jefe.ataque.rayo', 'Mirada del núcleo', true, 'Alto: agáchate. Bajo: salta'),
    ...si('conflicto', 'Ataques', 'jefe.ataque.doble', 'Doble impacto', true, 'Solo en la furia final'),
    ...nums('conflicto', 'Ataques', 'jefe.rocas', 'Rocas por lluvia', [['3', 3], ['5', 5], ['8', 8]], 5),
    ...si('conflicto', 'Ataques', 'jefe.lluviaApunta', 'Una roca te apunta siempre', true),
    ...nums('conflicto', 'Ataques', 'jefe.ondaVel', 'Velocidad del pisotón', [['Lenta', 6], ['Normal', 9], ['Rápida', 13]], 9),
    ...limites(P), ...presentacion(P),
  ];
}
