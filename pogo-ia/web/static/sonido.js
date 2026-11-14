// Sonidos sintetizados con WebAudio: nada de archivos. El contexto nace con
// el primer toque (los navegadores no dejan sonar antes).
let ctx = null, master = null, ruido = null;
let mudo = false;
try { mudo = localStorage.getItem("pogo_mudo") === "1"; } catch (e) { /* sin almacenamiento */ }

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
  try { localStorage.setItem("pogo_mudo", si ? "1" : "0"); } catch (e) { /* nada */ }
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

// Rebote del resorte: «boing» que sube y vibra un poco. Más suave para los
// robots de la máquina, para que el tuyo se distinga.
export function rebote(mio = true) {
  if (!listo()) return;
  const v = mio ? 0.09 : 0.025;
  tono(170, 0.16, { tipo: "triangle", vol: v, hasta: 420 });
  tono(340, 0.1, { tipo: "sine", vol: v * 0.6, hasta: 700, cuando: 0.02 });
}

// Casilla pintada: un «plic» corto.
export function pintar() {
  if (!listo()) return;
  tono(880 + Math.random() * 160, 0.05, { tipo: "square", vol: 0.025 });
}

// Dos robots quieren la misma casilla: «tonc».
export function choque() {
  if (!listo()) return;
  tono(140, 0.12, { tipo: "square", vol: 0.1, hasta: 70 });
  soplo(0.08, { f0: 500, q: 2, vol: 0.08 });
}

// Alguien tomó un chip IA: destello.
export function chip() {
  if (!listo()) return;
  [988, 1319, 1760].forEach((f, i) => tono(f, 0.12, { tipo: "triangle", vol: 0.12, cuando: i * 0.06 }));
}

// Ráfaga de pintura alrededor del robot.
export function rafaga() {
  if (!listo()) return;
  soplo(0.45, { filtro: "lowpass", f0: 2400, f1: 200, q: 0.8, vol: 0.25 });
  tono(110, 0.4, { tipo: "sawtooth", vol: 0.08, hasta: 55 });
}

// Robot mareado: tono que tambalea hacia abajo.
export function mareo() {
  if (!listo()) return;
  tono(660, 0.5, { tipo: "sine", vol: 0.12, hasta: 220 });
  tono(700, 0.5, { tipo: "sine", vol: 0.06, hasta: 240, cuando: 0.05 });
}

// Cohete que sale: silbido que sube.
export function lanzar() {
  if (!listo()) return;
  soplo(0.6, { f0: 600, f1: 3200, q: 4, vol: 0.12 });
  tono(300, 0.5, { tipo: "sawtooth", vol: 0.04, hasta: 900 });
}

// Cohete que da en el blanco: explosión corta.
export function impacto() {
  if (!listo()) return;
  soplo(0.5, { filtro: "lowpass", f0: 1800, f1: 120, q: 0.7, vol: 0.35 });
  tono(90, 0.35, { tipo: "square", vol: 0.12, hasta: 40 });
}

// Turbo: arpegio que sube rápido.
export function turbo() {
  if (!listo()) return;
  [440, 660, 880, 1320].forEach((f, i) => tono(f, 0.08, { tipo: "square", vol: 0.06, cuando: i * 0.04 }));
}

// Triple: tres golpes graves, pesados.
export function triple() {
  if (!listo()) return;
  [0, 0.14, 0.28].forEach((c) => tono(110, 0.14, { tipo: "triangle", vol: 0.2, hasta: 80, cuando: c }));
}

// Balde: chapuzón de pintura que llena la mesa.
export function balde() {
  if (!listo()) return;
  soplo(0.9, { filtro: "lowpass", f0: 3000, f1: 300, q: 0.6, vol: 0.3 });
  [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.14, { tipo: "triangle", vol: 0.1, cuando: 0.1 + i * 0.06 }));
}

export function bien() {
  if (!listo()) return;
  tono(660, 0.12, { tipo: "triangle", vol: 0.2 });
  tono(990, 0.22, { tipo: "triangle", vol: 0.2, cuando: 0.1 });
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

// Ritmo de fondo mientras se juega: bombo y charles sintetizados a 150 bpm,
// bajito. Un intervalo agenda cada compás con el reloj de audio.
let ritmo = null;
export function ambiente(si) {
  if (!ctx) return;
  if (si && !ritmo) {
    const negra = 60 / 150;
    let siguiente = ctx.currentTime + 0.1, n = 0;
    const agendar = () => {
      while (siguiente < ctx.currentTime + 0.4) {
        const cuando = siguiente - ctx.currentTime;
        if (!mudo) {
          if (n % 2 === 0) tono(90, 0.14, { tipo: "sine", vol: 0.14, hasta: 45, cuando });
          soplo(0.04, { filtro: "highpass", f0: 7000, q: 0.7, vol: n % 2 ? 0.05 : 0.025, cuando: cuando + negra / 2 });
          if (n % 4 === 3) soplo(0.1, { f0: 1800, q: 1.2, vol: 0.06, cuando });
        }
        siguiente += negra; n++;
      }
    };
    agendar();
    ritmo = setInterval(agendar, 150);
  } else if (!si && ritmo) {
    clearInterval(ritmo); ritmo = null;
  }
}
