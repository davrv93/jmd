// Forja · motores · Audio Manager. Reutiliza la síntesis del estudio (motor/sonido.js): cada sonido es una regla
// [frecuencia, duración, onda, barrido, ruido] y las muestras se calculan, no se graban. Aquí se añade lo que un juego
// necesita: banco con nombre, volumen por categoría, silencio, y un tope para no apilar el mismo sonido 20 veces.
import { sintetizar, sonar } from '../../motor/sonido.js';

// onda: 0 seno · 1 cuadrada · 2 sierra · 3 triángulo
export const SONIDOS = {
  golpe_ligero: [220, 0.08, 1, -1.2, 0.55], golpe_medio: [160, 0.12, 1, -1.5, 0.6], golpe_fuerte: [95, 0.22, 2, -2, 0.7],
  bloqueo: [520, 0.07, 3, -0.6, 0.35], parada: [880, 0.18, 0, 0.8, 0.1], esquiva: [600, 0.12, 0, 1.2, 0.5], salto: [330, 0.14, 3, 1.1, 0.05],
  aterrizar: [90, 0.1, 0, -1, 0.6], carga: [140, 0.5, 2, 1.6, 0.25], rayo: [70, 0.7, 2, 2.4, 0.45], explosion: [60, 0.55, 2, -1.8, 0.85],
  electrico: [1200, 0.25, 1, -2.5, 0.6], fuego: [180, 0.35, 2, -0.4, 0.9], corte: [1500, 0.12, 2, -3, 0.5], teletransporte: [400, 0.3, 0, 3, 0.15],
  transformar: [110, 1.1, 2, 2.2, 0.3], victoria: [523, 0.6, 3, 0, 0], derrota: [196, 0.8, 3, -1, 0.1], ko: [80, 0.9, 2, -2.5, 0.5],
  menu: [660, 0.05, 3, 0, 0], aviso: [440, 0.25, 1, 0, 0.05], rugido: [55, 1.2, 2, -0.6, 0.7], temblor: [40, 0.8, 0, -0.3, 0.9],
  romper: [300, 0.12, 2, -2, 0.8], poner: [180, 0.07, 3, -0.4, 0.3], paso: [120, 0.05, 0, -0.5, 0.7], agua: [260, 0.3, 0, -0.6, 0.8],
  recoger: [880, 0.12, 3, 0.7, 0], mision: [523, 0.5, 3, 0.5, 0], dano: [150, 0.2, 1, -1.4, 0.4], criatura: [210, 0.35, 3, 0.4, 0.2],
};
export function crearAudio({ volumen = 0.5, categorias = { efectos: 1, interfaz: 0.6 }, extra = {} } = {}) {
  const banco = new Map(), ultimo = new Map();
  const reglas = { ...SONIDOS, ...extra };
  const a = {
    silencio: false, volumen, categorias,
    muestras(nombre, semilla = 1) { const k = nombre + '|' + semilla; if (!banco.has(k)) { const r = reglas[nombre]; if (!r) return null; banco.set(k, sintetizar(nombre, r, semilla)); } return banco.get(k); },
    tocar(nombre, { volumen: v = 1, categoria = 'efectos', semilla = 1, cada = 0.04 } = {}) {
      if (a.silencio || !globalThis.AudioContext && !globalThis.webkitAudioContext) return false;
      const ahora = performance.now() / 1000; if (ahora - (ultimo.get(nombre) || -1) < cada) return false; ultimo.set(nombre, ahora);
      const m = a.muestras(nombre, semilla); if (!m) return false;
      sonar(m, a.volumen * v * (a.categorias[categoria] ?? 1)); return true;
    },
    registrar(nombre, regla) { reglas[nombre] = regla; },
    get nombres() { return Object.keys(reglas); },
  };
  return a;
}
