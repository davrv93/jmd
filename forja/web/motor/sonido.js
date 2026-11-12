// Forja · efectos de sonido por reglas. Síntesis pura (sin archivos ni modelos): la regla da frecuencia, duración,
// onda, barrido y ruido; aquí se calculan las muestras. Sirve para sonar en el estudio y para exportar WAV.
const TASA = 22050, TAU = Math.PI * 2;
const ONDAS = [
  (f) => Math.sin(f), (f) => (Math.sin(f) >= 0 ? 0.6 : -0.6), (f) => ((f / TAU) % 1) * 1.4 - 0.7, (f) => Math.abs(((f / TAU) % 1) * 4 - 2) - 1,
];

export function sintetizar(nombre, regla, semilla = 1) {
  const [frec, dur, onda, barrido, ruido] = regla, n = Math.floor(TASA * dur), out = new Float32Array(n);
  let fase = 0, s = (semilla * 2654435761) >>> 0;
  const azar = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
  const arpegio = nombre === 'moneda' ? [1, 1.5] : nombre === 'celebrar' ? [1, 1.26, 1.5, 2] : null;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    let f = frec * Math.pow(2, barrido * u);
    if (arpegio) f = frec * arpegio[Math.min(arpegio.length - 1, Math.floor(u * arpegio.length))];
    fase += TAU * f / TASA;
    const env = Math.min(1, u * 40) * Math.pow(1 - u, nombre === 'moneda' || nombre === 'celebrar' ? 1.2 : 2.2);
    out[i] = (ONDAS[onda](fase) * (1 - ruido) + azar() * ruido) * env * 0.55;
  }
  return out;
}

export function wav(muestras) {
  const b = new DataView(new ArrayBuffer(44 + muestras.length * 2)), txt = (o, t) => { for (let i = 0; i < t.length; i++) b.setUint8(o + i, t.charCodeAt(i)); };
  txt(0, 'RIFF'); b.setUint32(4, 36 + muestras.length * 2, true); txt(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, TASA, true); b.setUint32(28, TASA * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); txt(36, 'data'); b.setUint32(40, muestras.length * 2, true);
  for (let i = 0; i < muestras.length; i++) b.setInt16(44 + i * 2, Math.max(-1, Math.min(1, muestras[i])) * 32767, true);
  return new Uint8Array(b.buffer);
}

// Banco de sonidos de un personaje: { salto: Float32Array, ... }
export function banco(R, spec) {
  const o = {};
  for (const n of R.meta.sonidos) o[n] = sintetizar(n, R.T.sonido[`${spec.familia.id}|${n}`], spec.semilla);
  return o;
}

let ctx = null;
const cache = new WeakMap();
export function sonar(muestras, volumen = 0.5) {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    let buf = cache.get(muestras);
    if (!buf) { buf = ctx.createBuffer(1, muestras.length, TASA); buf.getChannelData(0).set(muestras); cache.set(muestras, buf); }
    const src = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = volumen; src.buffer = buf; src.connect(g).connect(ctx.destination); src.start();
  } catch { /* sin audio: el estudio sigue */ }
}
