// Forja · motores · Game Core: bucle de timestep fijo («Fix your timestep», G. Fiedler 2004).
// La simulación avanza SIEMPRE en pasos de `paso` segundos (1/60 por defecto), pase lo que pase con el framerate;
// el dibujo recibe alfa ∈ [0,1) para interpolar entre el estado anterior y el actual. Con 30, 60 o 144 Hz de pantalla
// el resultado de la simulación es idéntico: solo cambia cuántos pasos caben en cada cuadro.
//   const b = crearBucle({ actualizar(dt, paso) {…}, dibujar(alfa, dtCuadro) {…} }); b.iniciar();
//   b.tick(ms)   para pruebas: avanza a mano con un reloj inventado (sin requestAnimationFrame)
export function crearBucle({ paso = 1 / 60, actualizar, dibujar = () => {}, maxPasos = 6, monitor = null, ahora = () => performance.now() } = {}) {
  let acumulado = 0, previo = null, corriendo = false, id = 0, pasos = 0;
  const b = {
    paso, escala: 1, pausado: false, pasos: 0, tiempo: 0,
    tick(ms) {
      if (previo == null) { previo = ms; return 0; }
      let dt = (ms - previo) / 1000; previo = ms;
      if (dt > 0.25) dt = 0.25;   // pestaña dormida: no intentes recuperar minutos de simulación de golpe
      if (!b.pausado && !globalThis.FORJA_PAUSA) acumulado += dt * b.escala;   // FORJA_PAUSA: el menú fijo del juego (plantillas/menu.js)
      const t0 = ahora(); pasos = 0;
      while (acumulado >= paso && pasos < maxPasos) { actualizar(paso, b.pasos); b.pasos++; b.tiempo += paso; acumulado -= paso; pasos++; }
      if (pasos === maxPasos) acumulado = Math.min(acumulado, paso);   // espiral de la muerte: se suelta el atraso
      const t1 = ahora();
      dibujar(acumulado / paso, dt);
      if (monitor) { monitor.medir('sim', t1 - t0); monitor.medir('render', ahora() - t1); monitor.cuadro(dt * 1000); }
      return pasos;
    },
    iniciar() { if (corriendo) return b; corriendo = true; previo = null; const f = (ms) => { if (!corriendo) return; b.tick(ms); id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); return b; },
    detener() { corriendo = false; cancelAnimationFrame(id); },
    get alfa() { return acumulado / paso; },
  };
  return b;
}

// Interpolación visual: guarda el estado previo de cada cosa que se mueve y mezcla con alfa al dibujar.
export const mezclar = (a, b, alfa) => a + (b - a) * alfa;
