// Forja · voxel · ambiente: ciclo de día y noche, sol, luna, estrellas, colores del cielo, niebla por bioma y clima
// (lluvia y nieve opcionales, dibujadas en una capa 2D encima del lienzo con un presupuesto fijo de gotas).
// hora: 0 = medianoche, 0,25 = amanecer, 0,5 = mediodía, 0,75 = atardecer.
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const s01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function cielo(hora, bioma, cfg, bajoAgua = false) {
  const a = (hora - 0.25) * Math.PI * 2, solDir = [Math.cos(a), Math.sin(a), 0.28], l = Math.hypot(...solDir);
  const alto = Math.sin(a), dia = s01(-0.12, 0.25, alto), ocaso = Math.max(0, 1 - Math.abs(alto) * 4) * (alto > -0.2 ? 1 : 0);
  const c = (bioma?.cielo || [120, 180, 245]).map((v) => v / 255), n = (bioma?.niebla || [190, 215, 245]).map((v) => v / 255);
  let cenit = mezcla([0.015, 0.02, 0.06], mezcla(c, [0.25, 0.45, 0.85], 0.4), dia);
  let horizonte = mezcla([0.03, 0.04, 0.09], n, dia); horizonte = mezcla(horizonte, [0.95, 0.55, 0.3], ocaso * 0.55);
  const sol = Math.max(cfg.ambiente.luzNoche * 2.5, dia * 0.95 + 0.05);   // luz de luna: la noche se ve, pero oscura
  const colorSol = mezcla([0.55, 0.62, 0.95], mezcla([1, 0.98, 0.92], [1, 0.72, 0.45], ocaso), dia);
  let niebla = horizonte, rango = [cfg.render.distancia * 16 * 0.55, cfg.render.distancia * 16 * 0.97].map((v) => v / Math.max(0.3, cfg.render.niebla * (bioma?.densidadNiebla ?? 1) ** 0.5));
  if (bajoAgua) { niebla = [0.08, 0.2, 0.42].map((v) => v * (0.3 + 0.7 * dia)); rango = [1, 18]; }
  return { solDir: solDir.map((v) => v / l), cenit, horizonte: bajoAgua ? niebla : horizonte, sol, colorSol, niebla, nieblaRango: rango, noche: cfg.ambiente.estrellas ? 1 - dia : 0, dia };
}
// clima por bioma, determinista por (día, semilla): cambia cada 1/3 de día
export function climaDe(cfg, bioma, dias, semilla) {
  if (cfg.ambiente.clima !== 'auto') return cfg.ambiente.clima === 'despejado' ? null : cfg.ambiente.clima;
  const tramo = Math.floor(dias * 3), h = (Math.imul(tramo ^ semilla, 2654435761) >>> 0) / 4294967296;
  if (!bioma || bioma.precipitacion === 'ninguna' || h > (bioma.lluvias || 0) * 0.6) return null;
  return bioma.precipitacion;
}
export function crearClima(padre, { presupuesto = 600 } = {}) {
  const c = document.createElement('canvas'); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2'; padre.appendChild(c);
  const x = c.getContext('2d'), N = presupuesto, px = new Float32Array(N), py = new Float32Array(N), pv = new Float32Array(N); let semilla = 1;
  const r = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
  for (let i = 0; i < N; i++) { px[i] = r(); py[i] = r(); pv[i] = 0.6 + r() * 0.8; }
  return {
    dibujar(tipo, intensidad, dt, giro) {
      const w = (c.width = c.clientWidth), h = (c.height = c.clientHeight); x.clearRect(0, 0, w, h);
      if (!tipo || intensidad <= 0) return 0;
      const n = Math.min(N, Math.round(N * Math.min(1, intensidad * 0.5))), nieve = tipo === 'nieve';
      x.strokeStyle = nieve ? 'rgba(255,255,255,.85)' : 'rgba(170,200,255,.45)'; x.fillStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.2; x.beginPath();
      for (let i = 0; i < n; i++) {
        py[i] += dt * pv[i] * (nieve ? 0.12 : 1.1); px[i] += dt * (nieve ? Math.sin(py[i] * 6 + i) * 0.02 : 0.05) - giro * 0.15;
        if (py[i] > 1) { py[i] -= 1; px[i] = r(); } px[i] = ((px[i] % 1) + 1) % 1;
        const X = px[i] * w, Y = py[i] * h;
        if (nieve) x.rect(X, Y, 2.2, 2.2); else { x.moveTo(X, Y); x.lineTo(X - 2, Y + 14 * pv[i]); }
      }
      nieve ? x.fill() : x.stroke(); return n;
    },
  };
}
