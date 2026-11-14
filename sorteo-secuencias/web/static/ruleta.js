// Ruleta en canvas 2D. dibujar(gajos) la pinta quieta; girarHasta(i) la hace
// girar unas vueltas y frenar con el gajo i bajo la flecha de arriba.
// gajos: [{ texto, sub?, color }]
export function ruleta(canvas) {
  const ctx = canvas.getContext("2d");
  let gajos = [], angulo = 0, tam = 0;

  function medir() {
    const lado = canvas.clientWidth || 320;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(lado * dpr);
    tam = canvas.width;
    pintar();
  }

  function pintar() {
    const c = tam / 2, r = c * 0.94;
    ctx.clearRect(0, 0, tam, tam);
    if (!gajos.length) return;
    const n = gajos.length, paso = (Math.PI * 2) / n;
    ctx.save();
    ctx.translate(c, c);
    // aro exterior con puntos de luz
    ctx.beginPath(); ctx.arc(0, 0, r + c * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = "#14112b"; ctx.fill();
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * (r + c * 0.02), Math.sin(a) * (r + c * 0.02), c * 0.011, 0, Math.PI * 2);
      ctx.fillStyle = k % 2 ? "#ffc857" : "#fff3d1"; ctx.fill();
    }
    ctx.rotate(angulo);
    const fuente = Math.max(10, Math.min(c * 0.11, (c * 2.6) / Math.max(n, 4)));
    for (let k = 0; k < n; k++) {
      const a0 = -Math.PI / 2 + k * paso - paso / 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a0 + paso); ctx.closePath();
      const g = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
      g.addColorStop(0, gajos[k].color + "cc"); g.addColorStop(1, gajos[k].color);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(20,17,43,.55)"; ctx.lineWidth = Math.max(1, c * 0.006); ctx.stroke();
      // texto a lo largo del radio
      ctx.save();
      ctx.rotate(a0 + paso / 2);
      ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillStyle = "#14112b";
      const g2 = gajos[k];
      if (g2.sub) {
        ctx.font = `800 ${fuente}px Sora, system-ui, sans-serif`;
        ctx.fillText(g2.texto, r * 0.92, -fuente * 0.36, r * 0.62);
        ctx.font = `600 ${fuente * 0.62}px Sora, system-ui, sans-serif`;
        ctx.fillText(g2.sub, r * 0.92, fuente * 0.5, r * 0.62);
      } else {
        ctx.font = `800 ${fuente}px Sora, system-ui, sans-serif`;
        ctx.fillText(g2.texto, r * 0.92, 0, r * 0.7);
      }
      ctx.restore();
    }
    ctx.restore();
    // centro
    ctx.beginPath(); ctx.arc(c, c, r * 0.16, 0, Math.PI * 2);
    const gc = ctx.createRadialGradient(c - r * 0.05, c - r * 0.05, 2, c, c, r * 0.16);
    gc.addColorStop(0, "#fff3d1"); gc.addColorStop(1, "#ffc857");
    ctx.fillStyle = gc; ctx.fill();
    ctx.lineWidth = c * 0.02; ctx.strokeStyle = "#14112b"; ctx.stroke();
    ctx.fillStyle = "#14112b"; ctx.font = `900 ${r * 0.12}px Sora, system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("φ", c, c + r * 0.005);
  }

  function dibujar(nuevos, indice = null) {
    gajos = nuevos;
    if (indice !== null && gajos.length) angulo = -indice * ((Math.PI * 2) / gajos.length);
    pintar();
  }

  // Gira al menos `vueltas` y frena con el gajo i arriba. Resuelve al parar.
  // alPasar(k) se llama cada vez que un gajo cruza la flecha (para el tic).
  function girarHasta(i, { duracion = 5200, vueltas = 5, alPasar } = {}) {
    return new Promise((ok) => {
      const n = gajos.length, paso = (Math.PI * 2) / n;
      const desvio = (Math.random() - 0.5) * paso * 0.6; // que no caiga siempre al centro del gajo
      const actual = ((angulo % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const destino = ((-i * paso + desvio) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      let delta = destino - actual;
      if (delta < 0) delta += Math.PI * 2;
      const inicio = angulo, total = delta + vueltas * Math.PI * 2;
      const t0 = performance.now();
      let ultimo = Math.floor((inicio + paso / 2) / paso);
      const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dur = quieto ? 600 : duracion;
      function cuadro(ahora) {
        const x = Math.min(1, (ahora - t0) / dur);
        const e = 1 - Math.pow(1 - x, 4);
        angulo = inicio + total * e;
        const k = Math.floor((angulo + paso / 2) / paso);
        if (k !== ultimo) { ultimo = k; alPasar && alPasar(); }
        pintar();
        if (x < 1) requestAnimationFrame(cuadro); else ok();
      }
      requestAnimationFrame(cuadro);
    });
  }

  addEventListener("resize", medir);
  medir();
  return { dibujar, girarHasta, medir };
}
