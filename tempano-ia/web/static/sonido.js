// Sonidos sintetizados con WebAudio: nada de archivos. El contexto nace con
// el primer toque (los navegadores no dejan sonar antes).
let ctx = null, master = null, ruido = null, viento = null;
let mudo = false;
try { mudo = localStorage.getItem("tempano_mudo") === "1"; } catch (e) { /* sin almacenamiento */ }

export const estaMudo = () => mudo;

export function despertar() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = mudo ? 0 : 0.7;
    master.connect(ctx.destination);
    // Un segundo de ruido blanco, reusado por todos los efectos.
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
}

export function silenciar(si) {
  mudo = si;
  try { localStorage.setItem("tempano_mudo", si ? "1" : "0"); } catch (e) { /* nada */ }
  if (master) master.gain.setTargetAtTime(si ? 0 : 0.7, ctx.currentTime, 0.03);
}

const listo = () => ctx && ctx.state === "running" && !mudo;

function tono(frec, dur, { tipo = "sine", vol = 0.3, hasta = null, cuando = 0, ataque = 0.005 } = {}) {
  const t = ctx.currentTime + cuando;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(frec, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function soplo(dur, { filtro = "bandpass", f0 = 800, f1 = null, q = 1, vol = 0.3, cuando = 0 } = {}) {
  const t = ctx.currentTime + cuando;
  const s = ctx.createBufferSource(); s.buffer = ruido;
  const f = ctx.createBiquadFilter(); f.type = filtro; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.02);
}

// Choque de ositos: un «pum» grave, más fuerte cuanto más rápido.
export function golpe(fuerza = 200) {
  if (!listo()) return;
  const k = Math.min(1, fuerza / 500);
  tono(150 + 60 * k, 0.16, { vol: 0.18 + 0.3 * k, hasta: 55 });
  soplo(0.06, { filtro: "lowpass", f0: 900, vol: 0.1 + 0.15 * k });
}

export function embestida() {
  if (!listo()) return;
  soplo(0.3, { f0: 500, f1: 2600, q: 0.8, vol: 0.22 });
}

// Grieta: chasquidos secos y agudos, como hielo que se parte.
export function grieta() {
  if (!listo()) return;
  for (let i = 0; i < 5; i++) soplo(0.035, { filtro: "highpass", f0: 2500 + Math.random() * 2500, vol: 0.2, cuando: i * 0.028 + Math.random() * 0.02 });
  tono(90, 0.25, { tipo: "triangle", vol: 0.12, hasta: 45, cuando: 0.05 });
}

export function aviso() {
  if (!listo()) return;
  soplo(0.02, { filtro: "highpass", f0: 4200, vol: 0.06 });
}

// Chapuzón: ola de ruido grave y burbujas que suben.
export function chapuzon() {
  if (!listo()) return;
  soplo(0.6, { filtro: "lowpass", f0: 1800, f1: 200, vol: 0.4 });
  for (let i = 0; i < 4; i++) tono(300 + Math.random() * 300, 0.07, { vol: 0.08, hasta: 700 + Math.random() * 400, cuando: 0.15 + i * 0.08 });
}

export function bien() {
  if (!listo()) return;
  tono(784, 0.18, { tipo: "triangle", vol: 0.25 });
  tono(1175, 0.32, { tipo: "triangle", vol: 0.25, cuando: 0.1 });
}

export function mal() {
  if (!listo()) return;
  tono(330, 0.22, { tipo: "square", vol: 0.08, hasta: 220 });
  tono(220, 0.3, { tipo: "square", vol: 0.08, hasta: 150, cuando: 0.16 });
}

export function tic() {
  if (!listo()) return;
  tono(1400, 0.04, { tipo: "square", vol: 0.04 });
}

export function victoria() {
  if (!listo()) return;
  [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.22, { tipo: "triangle", vol: 0.22, cuando: i * 0.11 }));
  tono(1319, 0.5, { tipo: "triangle", vol: 0.2, cuando: 0.46 });
}

export function derrota() {
  if (!listo()) return;
  [392, 330, 262].forEach((f, i) => tono(f, 0.28, { tipo: "triangle", vol: 0.18, cuando: i * 0.16 }));
}

export function cuenta(final = false) {
  if (!listo()) return;
  tono(final ? 880 : 587, final ? 0.3 : 0.12, { tipo: "triangle", vol: 0.2 });
}

// Viento ártico suave de fondo, solo mientras se juega.
export function ambiente(si) {
  if (!ctx) return;
  if (si && !viento) {
    const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420; f.Q.value = 0.6;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.13; lg.gain.value = 180; lfo.connect(lg).connect(f.frequency);
    const g = ctx.createGain(); g.gain.value = 0.0001;
    g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.8);
    s.connect(f).connect(g).connect(master);
    s.start(); lfo.start();
    viento = { s, lfo, g };
  } else if (!si && viento) {
    const v = viento; viento = null;
    v.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
    setTimeout(() => { try { v.s.stop(); v.lfo.stop(); } catch (e) { /* ya paró */ } }, 1200);
  }
}
