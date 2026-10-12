// Efectos del «Lo logré»: sonido de moneda (dos pulsos cuadrados, como un videojuego de 8 bits)
// y conteo del puntaje hasta su valor nuevo.

let ctx: AudioContext | undefined;

export function moneda() {
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    for (const [f, ini, dur] of [[988, 0, 0.07], [1319, 0.07, 0.32]] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + ini);
      g.gain.exponentialRampToValueAtTime(0.05, t + ini + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ini + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t + ini);
      o.stop(t + ini + dur + 0.02);
    }
  } catch {
    /* sin audio: la animación basta */
  }
}

// Sube `mostrado` hasta `total` en ~0,9 s, como el contador de monedas.
export function contar(p: { total: number; mostrado: number }) {
  const hasta = p.total;
  const paso = Math.max(1, Math.ceil((hasta - p.mostrado) / 18));
  const t = setInterval(() => {
    p.mostrado = Math.min(hasta, p.mostrado + paso);
    if (p.mostrado >= hasta) clearInterval(t);
  }, 50);
}
