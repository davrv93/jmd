// Forja · Anime Battle Engine · personajes ORIGINALES (§5). Cada personaje es un objeto JSON: se puede guardar en un
// archivo, editarlo en el Editor de Forja o mandarlo desde un agente; el motor no tiene ningún personaje «cableado».
// Frame data (§7) en cuadros de 60 Hz: arranque (startup), activo, recuperacion; aturd = hitstun, aturdB = blockstun,
// pausa = hitstop; caja = hitbox relativa al luchador mirando a la derecha (x adelante, y desde el suelo).
// cancel: a qué movimientos puede encadenarse; ventana: [desde, hasta] en cuadros del movimiento; invul: i-frames.

// movimiento base: los personajes sobreescriben solo lo que cambia
const M = (o) => ({ tipo: 'ligero', arranque: 5, activo: 3, recuperacion: 9, aturd: 15, aturdB: 10, pausa: 6, dano: 30, empuje: [3, 0], prioridad: 1,
  cancel: [], ventana: null, invul: null, energia: 0, gana: 6, combo: true, contra: true, caja: { x: 18, y: 60, w: 46, h: 24 }, malabar: 1, golpes: 1, avance: 0, ...o });

const BASE = {
  ligero: M({ entrada: 'ligero', cancel: ['ligero2', 'medio', 'fuerte', 'bajoMedio', 'especial'], ventana: [4, 14] }),
  ligero2: M({ entrada: 'ligero', solo: 'cancel', dano: 34, arranque: 5, caja: { x: 16, y: 70, w: 50, h: 24 }, cancel: ['fuerte', 'especial', 'medio'], ventana: [4, 15] }),
  medio: M({ tipo: 'medio', entrada: 'medio', arranque: 8, activo: 4, recuperacion: 13, aturd: 19, aturdB: 13, pausa: 8, dano: 55, empuje: [5, 0], prioridad: 2, gana: 9, caja: { x: 20, y: 54, w: 62, h: 28 }, cancel: ['fuerte', 'especial', 'definitivo'], ventana: [6, 18], avance: 2 }),
  fuerte: M({ tipo: 'fuerte', entrada: 'fuerte', arranque: 12, activo: 5, recuperacion: 20, aturd: 24, aturdB: 16, pausa: 11, dano: 90, empuje: [9, 0], prioridad: 3, gana: 13, caja: { x: 22, y: 48, w: 76, h: 34 }, cancel: ['especial', 'definitivo'], ventana: [10, 22], avance: 3 }),
  bajoLigero: M({ entrada: '2+ligero', bajo: true, arranque: 5, dano: 26, caja: { x: 16, y: 4, w: 52, h: 22 }, cancel: ['bajoLigero', 'bajoMedio', 'especial'], ventana: [4, 13] }),
  bajoMedio: M({ tipo: 'medio', entrada: '2+medio', bajo: true, arranque: 8, activo: 4, recuperacion: 14, aturd: 19, aturdB: 12, pausa: 8, dano: 50, empuje: [5, 0], prioridad: 2, caja: { x: 18, y: 2, w: 78, h: 24 }, cancel: ['lanzador', 'especial'], ventana: [6, 18] }),
  lanzador: M({ tipo: 'fuerte', entrada: '2+fuerte', arranque: 11, activo: 5, recuperacion: 22, aturd: 30, aturdB: 14, pausa: 10, dano: 70, empuje: [2, 15.5], lanza: true, malabar: 2, prioridad: 3, caja: { x: 10, y: 60, w: 52, h: 70 }, cancel: ['especial'], ventana: [10, 20], invul: null }),
  impulsoFuerte: M({ tipo: 'fuerte', entrada: '66+fuerte', arranque: 10, activo: 6, recuperacion: 18, aturd: 22, aturdB: 14, pausa: 10, dano: 80, empuje: [13, 4], rebotePared: true, avance: 9, caja: { x: 14, y: 40, w: 70, h: 40 }, cancel: ['especial'], ventana: [10, 22] }),
  aereoLigero: M({ tipo: 'aereo', entrada: 'aire+ligero', aire: true, alto: true, arranque: 4, activo: 6, recuperacion: 7, dano: 32, empuje: [3, 3], caja: { x: 10, y: 26, w: 52, h: 34 }, cancel: ['aereoMedio', 'aereoFuerte', 'aereoEspecial', 'saltoAereo'], ventana: [4, 14] }),
  aereoMedio: M({ tipo: 'aereo', entrada: 'aire+medio', aire: true, alto: true, arranque: 7, activo: 5, recuperacion: 10, aturd: 18, dano: 52, empuje: [5, 4], caja: { x: 12, y: 20, w: 64, h: 40 }, cancel: ['aereoFuerte', 'aereoEspecial', 'saltoAereo'], ventana: [6, 16] }),
  aereoFuerte: M({ tipo: 'aereo', entrada: 'aire+fuerte', aire: true, alto: true, arranque: 10, activo: 6, recuperacion: 14, aturd: 24, pausa: 11, dano: 82, empuje: [6, -12], reboteSuelo: true, malabar: 2, prioridad: 3, caja: { x: 6, y: -6, w: 70, h: 52 }, cancel: ['aereoEspecial'], ventana: [10, 20] }),
  rompeGuardia: M({ tipo: 'fuerte', entrada: 'ligero+medio', arranque: 22, activo: 4, recuperacion: 24, imbloqueable: true, aturd: 34, pausa: 12, dano: 60, empuje: [10, 0], prioridad: 4, caja: { x: 14, y: 40, w: 60, h: 50 }, gana: 4 }),
  definitivo: M({ tipo: 'definitivo', entrada: 'definitivo', arranque: 14, activo: 8, recuperacion: 36, invul: [0, 20], energia: 100, gana: 0, dano: 60, aturd: 60, aturdB: 20, pausa: 14, empuje: [2, 0], prioridad: 9, caja: { x: 10, y: 20, w: 120, h: 110 }, cinematica: 'definitivo', combo: false, contra: false }),
};

const def = (o) => ({ nivel: 1, salud: 1000, energia: 100, resistencia: 100, velocidad: 4.2, aceleracion: 0.9, masa: 1, fuerza: 1, defensa: 1, alcance: 1, velAtaque: 1, salto: 15.5,
  saltosAereos: 1, ancho: 44, alto: 116, debilidades: {}, transformaciones: [], sonidos: {}, efectos: {}, sprites: { fuente: 'articulado' }, animaciones: {},
  hurtbox: { depie: { x: -22, y: 0, w: 44, h: 116 }, agachado: { x: -24, y: 0, w: 48, h: 72 }, aire: { x: -20, y: 10, w: 40, h: 92 } }, ...o,
  movimientos: Object.fromEntries(Object.entries({ ...BASE, ...(o.movimientos || {}) }).map(([k, v]) => [k, { ...(BASE[k] || M({})), ...v, id: k }])) });

export const PERSONAJES = {
  ren: def({
    id: 'ren', nombre: 'Ren Shiden', clase: 'Velocista del trueno', lema: 'Llega antes que su propio eco', elemento: 'electrico',
    salud: 950, velocidad: 4.8, aceleracion: 1.05, masa: 0.9, fuerza: 0.95, defensa: 0.95, salto: 16, saltosAereos: 2,
    debilidades: { agua: 1.15 }, efectos: { aura: '#7fd4ff', estela: '#bfe9ff', elemento: 'electrico' },
    sonidos: { especial: 'electrico', definitivo: 'rayo', golpe: 'golpe_medio' },
    cuerpo: { piel: '#f0c9a0', pelo: '#1e2a4a', ropa: '#2b3f8f', ropa2: '#e8f1ff', acento: '#7fd4ff', cinta: '#ffd94a', peinado: 'puntas', cintaFrente: true },
    transformaciones: [{ id: 'tormenta', nombre: 'Modo Tormenta', costo: 50, duracion: 600, mult: { fuerza: 1.25, velocidad: 1.18, defensa: 1.1, velAtaque: 1.15 }, colores: { pelo: '#e8f6ff', aura: '#d4f3ff', acento: '#ffffff' } }],
    movimientos: {
      especial: M({ tipo: 'especial', entrada: '236+especial', arranque: 13, activo: 2, recuperacion: 22, energia: 15, gana: 0, dano: 70, aturd: 22, aturdB: 14, pausa: 8, empuje: [7, 2], prioridad: 4,
        proyectil: { vx: 11, vida: 80, w: 44, h: 34, y: 62, golpes: 1, efecto: 'electrico', color: '#9fe3ff' }, combo: true }),
      antiaereo: M({ tipo: 'especial', entrada: '623+especial', arranque: 4, activo: 10, recuperacion: 26, invul: [0, 8], energia: 20, dano: 95, aturd: 34, pausa: 10, empuje: [3, 17], lanza: true, malabar: 2, prioridad: 6, avance: 4, sube: 13, caja: { x: 4, y: 40, w: 46, h: 100 }, efecto: 'electrico' }),
      teleporte: M({ tipo: 'especial', entrada: '214+especial', arranque: 9, activo: 0, recuperacion: 12, energia: 15, invul: [0, 14], teleporta: 150, combo: false, contra: false, dano: 0 }),
      cargado: M({ tipo: 'especial', entrada: 'carga>40+especial', arranque: 16, activo: 30, recuperacion: 28, energia: 35, dano: 28, golpes: 5, cadaGolpe: 6, aturd: 18, aturdB: 10, pausa: 4, empuje: [2, 0], prioridad: 7, rayo: { largo: 620, alto: 46, y: 60, color: '#bfe9ff' }, efecto: 'rayo' }),
      aereoEspecial: M({ tipo: 'especial', entrada: 'aire+especial', aire: true, arranque: 9, activo: 2, recuperacion: 16, energia: 15, dano: 60, aturd: 20, empuje: [6, -6], proyectil: { vx: 9, vy: -6, vida: 50, w: 36, h: 30, y: 20, golpes: 1, efecto: 'electrico', color: '#9fe3ff' } }),
      definitivo: { cinematica: 'tormentaCelestial', dano: 60, golpesCine: [70, 70, 90, 120, 160], nombre: 'Tormenta Celestial' },
    },
  }),
  mako: def({
    id: 'mako', nombre: 'Mako Enjin', clase: 'Coloso de brasas', lema: 'Cada paso suyo calienta el suelo', elemento: 'fuego',
    salud: 1100, velocidad: 3.7, aceleracion: 0.8, masa: 1.25, fuerza: 1.15, defensa: 1.1, salto: 14.5, saltosAereos: 1, ancho: 52, alto: 124,
    hurtbox: { depie: { x: -26, y: 0, w: 52, h: 124 }, agachado: { x: -28, y: 0, w: 56, h: 78 }, aire: { x: -24, y: 10, w: 48, h: 100 } },
    debilidades: { electrico: 1.1 }, efectos: { aura: '#ff9a3c', estela: '#ffd08a', elemento: 'fuego' },
    sonidos: { especial: 'fuego', definitivo: 'explosion', golpe: 'golpe_fuerte' },
    cuerpo: { piel: '#c98b5e', pelo: '#7a2a12', ropa: '#8f2b1d', ropa2: '#f3d9a4', acento: '#ff9a3c', cinta: '#2a1a12', peinado: 'moño', hombrera: 'izq' },
    transformaciones: [{ id: 'volcan', nombre: 'Corazón Volcánico', costo: 50, duracion: 600, mult: { fuerza: 1.3, velocidad: 1.08, defensa: 1.2, velAtaque: 1.05 }, colores: { pelo: '#ffcf6a', aura: '#ffd27a', acento: '#fff1c0' } }],
    movimientos: {
      fuerte: { dano: 100, arranque: 13 },
      especial: M({ tipo: 'especial', entrada: '236+especial', arranque: 15, activo: 2, recuperacion: 24, energia: 15, dano: 80, aturd: 24, aturdB: 16, pausa: 9, empuje: [8, 3], prioridad: 4,
        proyectil: { vx: 8, vida: 90, w: 54, h: 44, y: 58, golpes: 2, cadaGolpe: 10, efecto: 'fuego', color: '#ffb35a' } }),
      antiaereo: M({ tipo: 'especial', entrada: '623+especial', arranque: 6, activo: 8, recuperacion: 30, invul: [0, 9], energia: 20, dano: 110, aturd: 34, pausa: 12, empuje: [4, 15], lanza: true, malabar: 2, prioridad: 6, avance: 3, sube: 10, caja: { x: 0, y: 40, w: 60, h: 100 }, efecto: 'fuego' }),
      embestida: M({ tipo: 'especial', entrada: '214+especial', arranque: 12, activo: 14, recuperacion: 22, energia: 15, dano: 90, aturd: 26, aturdB: 18, pausa: 12, empuje: [14, 5], rebotePared: true, avance: 10, prioridad: 5, caja: { x: 8, y: 20, w: 64, h: 90 }, efecto: 'fuego' }),
      cargado: M({ tipo: 'especial', entrada: 'carga>40+especial', arranque: 18, activo: 12, recuperacion: 30, energia: 35, dano: 60, golpes: 3, cadaGolpe: 4, aturd: 26, pausa: 10, empuje: [10, 9], prioridad: 7, caja: { x: -60, y: 0, w: 200, h: 140 }, onda: true, efecto: 'explosion' }),
      aereoEspecial: M({ tipo: 'especial', entrada: 'aire+especial', aire: true, arranque: 10, activo: 20, recuperacion: 14, energia: 15, dano: 85, aturd: 24, empuje: [5, -14], reboteSuelo: true, caida: -16, caja: { x: -10, y: -10, w: 70, h: 60 }, efecto: 'fuego' }),
      definitivo: { cinematica: 'puñoDelVolcan', dano: 60, golpesCine: [90, 110, 260], nombre: 'Puño del Volcán Dormido' },
    },
  }),
  // enemigo menor para supervivencia, lateral y práctica
  eco: def({ id: 'eco', nombre: 'Eco de sombra', clase: 'Eco', salud: 260, velocidad: 3.4, fuerza: 0.7, defensa: 0.8, masa: 0.85, saltosAereos: 0, efectos: { aura: '#8a7fd1', elemento: 'sombra' },
    cuerpo: { piel: '#4b4270', pelo: '#2a2440', ropa: '#3a3260', ropa2: '#6f64a8', acento: '#b7a9ff', cinta: '#b7a9ff', peinado: 'corto', sombra: true },
    movimientos: { especial: M({ tipo: 'especial', entrada: '236+especial', arranque: 18, activo: 2, recuperacion: 26, energia: 0, dano: 45, proyectil: { vx: 7, vida: 70, w: 30, h: 26, y: 60, golpes: 1, efecto: 'sombra', color: '#b7a9ff' } }), definitivo: { energia: 999 } } }),
};

// Cinemáticas de definitivos (§12): declarativas. t en milisegundos de SIMULACIÓN. Los eventos 'impacto' llevan el
// índice del golpe (golpesCine del movimiento): el motor aplica cada uno una sola vez, aunque se omita o se repita.
export const CINEMATICAS = {
  tormentaCelestial: { duracion: 2600, fondo: 'tormenta', color: '#9fe3ff', texto: 'TORMENTA CELESTIAL',
    camara: [{ t: 0, zoom: 1.9, foco: 'atacante', dur: 360, ease: 'outCubic' }, { t: 900, zoom: 1.35, foco: 'medio', dur: 400 }, { t: 1900, zoom: 1.7, foco: 'objetivo', dur: 300 }, { t: 2300, zoom: 1, foco: 'medio', dur: 300 }],
    lento: [{ t: 1900, escala: 0.35, dur: 300 }], retrato: { t: 120, dur: 760 },
    eventos: [{ t: 260, tipo: 'sonido', nombre: 'carga' }, { t: 980, tipo: 'impacto', golpe: 0 }, { t: 1180, tipo: 'impacto', golpe: 1 }, { t: 1380, tipo: 'impacto', golpe: 2 }, { t: 1600, tipo: 'impacto', golpe: 3 }, { t: 1960, tipo: 'sonido', nombre: 'rayo' }, { t: 2040, tipo: 'impacto', golpe: 4, final: true }, { t: 2600, tipo: 'fin' }] },
  'puñoDelVolcan': { duracion: 2400, fondo: 'volcan', color: '#ffb35a', texto: 'PUÑO DEL VOLCÁN DORMIDO',
    camara: [{ t: 0, zoom: 2.1, foco: 'atacante', dur: 400, ease: 'outCubic' }, { t: 1000, zoom: 1.4, foco: 'medio', dur: 300 }, { t: 1700, zoom: 1.9, foco: 'objetivo', dur: 220 }, { t: 2100, zoom: 1, foco: 'medio', dur: 300 }],
    lento: [{ t: 1700, escala: 0.3, dur: 320 }], retrato: { t: 100, dur: 820 },
    eventos: [{ t: 220, tipo: 'sonido', nombre: 'carga' }, { t: 1100, tipo: 'impacto', golpe: 0 }, { t: 1400, tipo: 'impacto', golpe: 1 }, { t: 1760, tipo: 'sonido', nombre: 'explosion' }, { t: 1780, tipo: 'impacto', golpe: 2, final: true }, { t: 2400, tipo: 'fin' }] },
  definitivo: { duracion: 1600, fondo: 'energia', color: '#ffffff', texto: 'DEFINITIVO', camara: [{ t: 0, zoom: 1.6, foco: 'atacante', dur: 300 }, { t: 1200, zoom: 1, foco: 'medio', dur: 300 }], lento: [], retrato: { t: 80, dur: 600 },
    eventos: [{ t: 700, tipo: 'impacto', golpe: 0, final: true }, { t: 1600, tipo: 'fin' }] },
  despertar: { duracion: 3200, fondo: 'temblor', color: '#ffd27a', texto: 'EL TITÁN DESPIERTA', camara: [{ t: 0, zoom: 0.8, foco: 'objetivo', dur: 900, ease: 'inOutSine' }, { t: 2400, zoom: 1, foco: 'medio', dur: 500 }], lento: [], retrato: null,
    eventos: [{ t: 300, tipo: 'sonido', nombre: 'temblor' }, { t: 1400, tipo: 'sonido', nombre: 'rugido' }, { t: 1500, tipo: 'sacudida', fuerza: 14 }, { t: 3200, tipo: 'fin' }] },
  fase: { duracion: 2200, fondo: 'temblor', color: '#ff8a5c', texto: 'SEGUNDA FORMA', camara: [{ t: 0, zoom: 0.85, foco: 'objetivo', dur: 600 }, { t: 1700, zoom: 1, foco: 'medio', dur: 400 }], lento: [], retrato: null,
    eventos: [{ t: 400, tipo: 'sonido', nombre: 'rugido' }, { t: 700, tipo: 'sacudida', fuerza: 12 }, { t: 2200, tipo: 'fin' }] },
};
