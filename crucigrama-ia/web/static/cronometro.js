// Cronómetro basado en marcas de tiempo (sin deriva de setInterval).
// Compatible con navegador y Node 20+. Sin dependencias.

function relojPorDefecto() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Crea un cronómetro.
 * @param {(ms:number)=>void} onTick  se llama en cada intervalo y en cada cambio de estado con los ms transcurridos.
 * @param {number} intervaloMs        periodo de notificación (por defecto 100 ms).
 * @param {{ahora?:()=>number, setInterval?:Function, clearInterval?:Function}} deps  reloj y temporizadores inyectables (pruebas).
 */
export function crearCronometro(onTick, intervaloMs = 100, deps = {}) {
  const ahora = typeof deps.ahora === 'function' ? deps.ahora : relojPorDefecto;
  const programar = typeof deps.setInterval === 'function'
    ? deps.setInterval
    : (fn, ms) => globalThis.setInterval(fn, ms);
  const cancelar = typeof deps.clearInterval === 'function'
    ? deps.clearInterval
    : (id) => globalThis.clearInterval(id);
  const periodo = Number.isFinite(intervaloMs) && intervaloMs > 0 ? intervaloMs : 100;

  let acumulado = 0;      // ms acumulados en tramos ya cerrados
  let marca = null;       // instante (según `ahora`) en que empezó el tramo abierto; null si no corre
  let temporizador = null;

  function transcurrido() {
    if (marca === null) return acumulado;
    return acumulado + Math.max(0, ahora() - marca);
  }

  function corriendo() {
    return marca !== null;
  }

  function emitir() {
    if (typeof onTick === 'function') onTick(transcurrido());
  }

  function detenerTemporizador() {
    if (temporizador !== null) {
      cancelar(temporizador);
      temporizador = null;
    }
  }

  function arrancarTemporizador() {
    detenerTemporizador();
    temporizador = programar(emitir, periodo);
  }

  function iniciar(desdeMs = 0) {
    const base = Number(desdeMs);
    acumulado = Number.isFinite(base) && base > 0 ? base : 0;
    marca = ahora();
    arrancarTemporizador();
    emitir();
  }

  function pausar() {
    if (marca === null) return;
    acumulado += Math.max(0, ahora() - marca);
    marca = null;
    detenerTemporizador();
    emitir();
  }

  function reanudar() {
    if (marca !== null) return;
    marca = ahora();
    arrancarTemporizador();
    emitir();
  }

  function detener() {
    pausar();
    return acumulado;
  }

  return { iniciar, pausar, reanudar, detener, transcurrido, corriendo };
}

function dosDigitos(n) {
  return String(n).padStart(2, '0');
}

/**
 * Formatea milisegundos como 'MM:SS.d' o, si hay horas, 'H:MM:SS.d'.
 * Ej.: 65300 → '01:05.3'; 3661000 → '1:01:01.0'.
 */
export function formatearTiempo(ms) {
  const valor = Number(ms);
  const total = Number.isFinite(valor) && valor > 0 ? valor : 0;
  const decimasTotales = Math.floor(total / 100);
  const decimas = decimasTotales % 10;
  const segundosTotales = Math.floor(decimasTotales / 10);
  const segundos = segundosTotales % 60;
  const minutosTotales = Math.floor(segundosTotales / 60);
  if (minutosTotales >= 60) {
    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;
    return `${horas}:${dosDigitos(minutos)}:${dosDigitos(segundos)}.${decimas}`;
  }
  return `${dosDigitos(minutosTotales)}:${dosDigitos(segundos)}.${decimas}`;
}
