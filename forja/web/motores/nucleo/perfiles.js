// Forja · motores · perfiles gráficos, detección de capacidades WebGL, calidad automática y accesibilidad.
// «Automático» elige un perfil por las capacidades y luego lo AJUSTA con lo medido: si el cuadro pasa de ~20 ms
// (menos de 50 FPS) durante 2 s seguidos baja un nivel y la resolución; si sobra margen 8 s, sube uno.
export const PERFILES = {
  bajo:  { nombre: 'Bajo',  resolucion: 0.6, particulas: 300,  distancia: 3, sombras: false, ao: false, efectos: 0.5, lod: true,  geometria: 250e3 },
  medio: { nombre: 'Medio', resolucion: 0.8, particulas: 900,  distancia: 5, sombras: false, ao: true,  efectos: 0.8, lod: true,  geometria: 600e3 },
  alto:  { nombre: 'Alto',  resolucion: 1,   particulas: 2000, distancia: 7, sombras: true,  ao: true,  efectos: 1,   lod: false, geometria: 1.2e6 },
  ultra: { nombre: 'Ultra', resolucion: 1,   particulas: 4000, distancia: 10, sombras: true, ao: true,  efectos: 1.2, lod: false, geometria: 2.5e6 },
};
export const ORDEN = ['bajo', 'medio', 'alto', 'ultra'];

export function capacidades(gl) {
  const c = { webgl: !!gl, webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext, gpu: 'desconocida', maxTextura: 0, indices32: false, software: false, nucleos: globalThis.navigator?.hardwareConcurrency || 2, memoria: globalThis.navigator?.deviceMemory || null };
  if (!gl) return c;
  c.maxTextura = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  c.indices32 = c.webgl2 || !!gl.getExtension('OES_element_index_uint');
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  c.gpu = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  c.software = /swiftshader|llvmpipe|software|basic render/i.test(c.gpu);
  return c;
}
export function perfilSugerido(c) {
  if (!c.webgl || c.software) return 'bajo';
  if (c.nucleos <= 4 || (c.memoria && c.memoria <= 4)) return 'medio';
  return /apple m\d|rtx|radeon rx|arc a/i.test(c.gpu) ? 'alto' : 'medio';
}

// Observa el tiempo de cuadro y decide. alCambiar(perfilId, escalaResolucion)
// Pantallas a 30 Hz (modo ahorro de batería, algunos portátiles): el cuadro dura 33 ms aunque la máquina vaya
// sobrada. Por eso los primeros 90 cuadros (menú y carga, que dibujan poco) solo miden la cadencia de la pantalla
// —el cuadro más corto visto— y el objetivo nunca queda por debajo de 1,2 veces esa cadencia.
export function crearAutoCalidad({ inicial = 'medio', alCambiar = () => {}, objetivoMs = 20, holguraMs = 12 } = {}) {
  let actual = inicial, malo = 0, bueno = 0, escala = PERFILES[inicial].resolucion, cadencia = Infinity, vistos = 0;
  return {
    get perfil() { return actual; }, get escala() { return escala; }, get cadencia() { return cadencia; },
    observar(msCuadro, dt) {
      if (vistos < 90) { vistos++; if (msCuadro > 0) cadencia = Math.min(cadencia, msCuadro); return; }
      const objetivo = Math.max(objetivoMs, cadencia * 1.2);
      if (msCuadro > objetivo) { malo += dt; bueno = 0; } else if (msCuadro < holguraMs) { bueno += dt; malo = 0; } else { malo = Math.max(0, malo - dt); bueno = 0; }
      if (malo > 2) {
        malo = 0; const k = ORDEN.indexOf(actual);
        if (escala > PERFILES[actual].resolucion * 0.75) escala = +(escala * 0.85).toFixed(2);   // primero baja la resolución
        else if (k > 0) { actual = ORDEN[k - 1]; escala = PERFILES[actual].resolucion; }
        alCambiar(actual, escala);
      } else if (bueno > 8) {
        bueno = 0; const k = ORDEN.indexOf(actual);
        if (escala < PERFILES[actual].resolucion) escala = Math.min(PERFILES[actual].resolucion, +(escala * 1.15).toFixed(2));
        else if (k < ORDEN.length - 2) { actual = ORDEN[k + 1]; escala = PERFILES[actual].resolucion; }   // automático nunca sube solo a Ultra
        alCambiar(actual, escala);
      }
    },
  };
}

// Accesibilidad: reducir movimiento (sin sacudidas ni zoom brusco) y reducir destellos (flashes a ≤ 3 por segundo y
// con brillo limitado, criterio WCAG 2.3.1). Respeta prefers-reduced-motion y lo que el jugador elija en el juego.
export function accesibilidad(preferencias = {}) {
  const sistema = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const a = { reducirMovimiento: preferencias.reducirMovimiento ?? sistema, reducirDestellos: preferencias.reducirDestellos ?? sistema, ultimoDestello: -1e9 };
  a.sacudida = (v) => (a.reducirMovimiento ? 0 : v);
  a.duracion = (ms) => (a.reducirMovimiento ? 0 : ms);
  // ¿se permite un destello ahora? (t en segundos de simulación) y con qué opacidad máxima
  a.destello = (t, alfa) => { if (!a.reducirDestellos) return alfa; if (t - a.ultimoDestello < 0.34) return 0; a.ultimoDestello = t; return Math.min(alfa, 0.25); };
  return a;
}
