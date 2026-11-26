// Forja · Anime Battle Engine · máquina de estados finitos del luchador (§6).
// Cada estado declara: animación, si está en el suelo o en el aire, duración (en cuadros a 60 Hz, o 'mov' si la da el
// movimiento, o null si dura lo que el jugador quiera), a qué estados puede pasar POR VOLUNTAD (a), qué reacciones
// FORZADAS acepta (recibe: si se le puede golpear/bloquear) y restricciones (sin control, invulnerable…).
// Las transiciones que no están en la tabla se rechazan y se cuentan: las pruebas exigen cero rechazos inesperados.
const ATAQUES_SUELO = ['ataqueLigero', 'ataqueMedio', 'ataqueFuerte', 'especial', 'definitivo'];
const LIBRES = ['reposo', 'caminar', 'correr', 'agachado'];
const DESDE_LIBRE = [...LIBRES, 'impulso', 'salto', ...ATAQUES_SUELO, 'bloqueo', 'parada', 'esquiva', 'carga', 'transformacion'];
const REACCIONES = ['aturdido', 'aturdidoBloqueo', 'empujado', 'derribado'];
const FIN = ['victoria', 'derrota'];

export const ESTADOS = {
  reposo:          { anim: 'reposo',   suelo: true,  dur: null, a: DESDE_LIBRE, recibe: true },
  caminar:         { anim: 'caminar',  suelo: true,  dur: null, a: DESDE_LIBRE, recibe: true },
  correr:          { anim: 'correr',   suelo: true,  dur: null, a: DESDE_LIBRE, recibe: true },
  impulso:         { anim: 'impulso',  suelo: true,  dur: 14,   a: ['reposo', 'correr', 'ataqueFuerte', 'ataqueMedio', 'especial', 'salto'], recibe: true, sinGiro: true },
  salto:           { anim: 'salto',    suelo: false, dur: null, a: ['caida', 'ataqueAereo', 'esquiva', 'especial', 'aterrizaje'], recibe: true, sinGiro: true },
  caida:           { anim: 'caida',    suelo: false, dur: null, a: ['ataqueAereo', 'esquiva', 'especial', 'aterrizaje'], recibe: true, sinGiro: true },
  aterrizaje:      { anim: 'aterrizaje', suelo: true, dur: 4,   a: ['reposo', ...LIBRES, 'bloqueo', 'parada'], recibe: true },
  agachado:        { anim: 'agachado', suelo: true,  dur: null, a: DESDE_LIBRE, recibe: true, bajo: true },
  ataqueLigero:    { anim: 'ataque',   suelo: true,  dur: 'mov', a: ['reposo', 'combo'], recibe: true, ataque: true },
  ataqueMedio:     { anim: 'ataque',   suelo: true,  dur: 'mov', a: ['reposo', 'combo'], recibe: true, ataque: true },
  ataqueFuerte:    { anim: 'ataque',   suelo: true,  dur: 'mov', a: ['reposo', 'combo'], recibe: true, ataque: true },
  ataqueAereo:     { anim: 'ataque',   suelo: false, dur: 'mov', a: ['caida', 'aterrizaje', 'combo'], recibe: true, ataque: true, sinGiro: true },
  combo:           { anim: 'ataque',   suelo: null,  dur: 'mov', a: ['reposo', 'caida', 'aterrizaje', 'combo'], recibe: true, ataque: true, sinGiro: true },
  bloqueo:         { anim: 'bloqueo',  suelo: true,  dur: null, a: [...LIBRES, 'esquiva', 'parada', 'salto'], recibe: true },
  parada:          { anim: 'parada',   suelo: true,  dur: 16,   a: ['reposo', ...ATAQUES_SUELO, 'combo'], recibe: false, sinGiro: true },
  esquiva:         { anim: 'esquiva',  suelo: null,  dur: 22,   a: ['reposo', 'caida', 'aterrizaje'], recibe: true, sinGiro: true },
  carga:           { anim: 'carga',    suelo: true,  dur: null, a: [...LIBRES, 'especial', 'definitivo', 'transformacion', 'bloqueo', 'parada', 'esquiva', 'salto'], recibe: true },
  especial:        { anim: 'especial', suelo: null,  dur: 'mov', a: ['reposo', 'caida', 'aterrizaje', 'combo', 'definitivo'], recibe: true, ataque: true, sinGiro: true },
  definitivo:      { anim: 'definitivo', suelo: true, dur: 'mov', a: ['reposo'], recibe: true, ataque: true, sinGiro: true },
  transformacion:  { anim: 'transformacion', suelo: true, dur: 70, a: ['reposo'], recibe: false, sinGiro: true },
  aturdido:        { anim: 'dano',     suelo: null,  dur: 'golpe', a: ['reposo', 'caida', 'levantarse', 'derribado'], recibe: true, sinControl: true, sinGiro: true },
  aturdidoBloqueo: { anim: 'bloqueo',  suelo: true,  dur: 'golpe', a: ['reposo', 'bloqueo', 'agachado', 'parada'], recibe: true, sinControl: true, sinGiro: true },
  empujado:        { anim: 'empujado', suelo: false, dur: 'golpe', a: ['derribado', 'caida', 'levantarse'], recibe: true, sinControl: true, sinGiro: true },
  derribado:       { anim: 'derribado', suelo: true, dur: 34,   a: ['levantarse'], recibe: false, sinControl: true, sinGiro: true },
  levantarse:      { anim: 'levantarse', suelo: true, dur: 18,  a: ['reposo', 'esquiva', 'bloqueo'], recibe: false, sinControl: true },
  victoria:        { anim: 'victoria', suelo: null,  dur: null, a: [], recibe: false, sinControl: true, sinGiro: true },
  derrota:         { anim: 'derrota',  suelo: null,  dur: null, a: [], recibe: false, sinControl: true, sinGiro: true },
};
// reacciones que el motor impone (golpe, bloqueo, KO): no las pide el jugador, pero se validan con «recibe»
export const FORZADAS = new Set([...REACCIONES, ...FIN]);
export const LIBRE = new Set(LIBRES);
export const ESTADOS_ATAQUE = new Set(Object.keys(ESTADOS).filter((k) => ESTADOS[k].ataque));
// nombres de la especificación (§6) ↔ ids del motor, para documentación, editor y pruebas
export const NOMBRES = { reposo: 'Idle', caminar: 'Walk', correr: 'Run', impulso: 'Dash', salto: 'Jump', caida: 'Fall', aterrizaje: 'Landing', agachado: 'Crouch',
  ataqueLigero: 'AttackLight', ataqueMedio: 'AttackMedium', ataqueFuerte: 'AttackHeavy', ataqueAereo: 'AirAttack', combo: 'Combo', bloqueo: 'Block', parada: 'Parry',
  esquiva: 'Dodge', carga: 'Charge', especial: 'SpecialAttack', definitivo: 'UltimateAttack', transformacion: 'Transformation', aturdido: 'HitStun',
  aturdidoBloqueo: 'BlockStun', empujado: 'Knockback', derribado: 'Knockdown', levantarse: 'Recovery', victoria: 'Victory', derrota: 'Defeat' };

// ¿puede el luchador pasar de su estado al pedido?  forzada: reacción impuesta por el motor
export function permitida(de, a, forzada = false) {
  if (!ESTADOS[a]) return false;
  if (FIN.includes(a)) return !FIN.includes(de);
  if (forzada) return FORZADAS.has(a) && (ESTADOS[de]?.recibe || ESTADOS[de]?.a.includes(a));
  return !!ESTADOS[de]?.a.includes(a);
}
