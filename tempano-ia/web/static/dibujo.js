// Témpano IA · todo lo que se pinta: mar ártico, aurora, el témpano con sus
// grietas y trozos, los ositos polares y las salpicaduras. Canvas 2D a mano.
import { R_OSO, SECTORES, radioMax } from "./fisica.js";

const TAU = Math.PI * 2;

export function crearEscena(cv, opciones = {}) {
  const hud = opciones.hud ?? 120;
  const cx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  let zoom = 1, zoomObj = 1;
  const parts = [];   // gotas, chispas, estrellitas
  const ondas = [];   // anillos de agua
  const estrellas = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.45, r: Math.random() * 1.3 + 0.3, f: Math.random() * 6 }));
  const hielitos = Array.from({ length: 14 }, () => ({ a: Math.random() * TAU, d: 380 + Math.random() * 380, s: 6 + Math.random() * 14, f: Math.random() * 6 }));
  let sacudon = 0, destello = 0;

  function medir() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }

  // Cuánto mundo cabe: el témpano más un margen, dejando sitio al HUD y los
  // controles. La cámara se acerca a medida que el hielo se achica.
  function encuadre(m) {
    const alto = H - hud, ancho = W - 16;
    const radio = Math.max(150, radioMax(m.hielo) + 40);
    zoomObj = Math.min(ancho, alto) / (radio * 2);
  }

  function efecto(tipo, x, y, extra = 0) {
    if (tipo === "chapuzon") {
      ondas.push({ x, y, t: 0, max: 1.2 }); ondas.push({ x, y, t: -0.18, max: 1.2 });
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * TAU, v = 60 + Math.random() * 170;
        parts.push({ x, y, z: 0, vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v * 0.6, vz: 120 + Math.random() * 220, t: 0, vida: 0.9, color: "#bfe6ff", r: 2 + Math.random() * 3 });
      }
      sacudon = Math.max(sacudon, 0.35);
    } else if (tipo === "golpe") {
      const n = Math.min(10, 3 + Math.floor(extra / 70));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = 60 + Math.random() * 120;
        parts.push({ x, y, z: 18, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 40 + Math.random() * 80, t: 0, vida: 0.5, color: "#fff7c2", r: 1.8 + Math.random() * 2, estrella: true });
      }
      if (extra > 250) sacudon = Math.max(sacudon, Math.min(0.5, extra / 900));
    } else if (tipo === "embestida") {
      for (let i = 0; i < 8; i++) parts.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20, z: 2, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, vz: 30 + Math.random() * 50, t: 0, vida: 0.5, color: "#ffffff", r: 2 + Math.random() * 2.5 });
    } else if (tipo === "grieta") {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * TAU, v = 40 + Math.random() * 120;
        parts.push({ x, y, z: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 60 + Math.random() * 140, t: 0, vida: 0.8, color: "#e8f7ff", r: 1.5 + Math.random() * 3 });
      }
      ondas.push({ x, y, t: 0, max: 1.6 });
      sacudon = Math.max(sacudon, 0.18);
    } else if (tipo === "rayo") {
      destello = 0.8; sacudon = Math.max(sacudon, 0.7);
      ondas.push({ x, y, t: 0, max: 1.8 });
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * TAU, v = 80 + Math.random() * 220;
        parts.push({ x, y, z: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 80 + Math.random() * 200, t: 0, vida: 0.8, color: i % 3 ? "#e8f7ff" : "#ffe14d", r: 1.8 + Math.random() * 3, estrella: i % 3 === 0 });
      }
    } else if (tipo === "rescate") {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * TAU;
        parts.push({ x, y, z: 10, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, vz: 90, t: 0, vida: 0.8, color: i % 2 ? "#ffd166" : "#9be7ff", r: 2.5, estrella: true });
      }
    }
  }

  function mar(t) {
    const g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#041026"); g.addColorStop(0.45, "#082246"); g.addColorStop(1, "#0b3561");
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    // Estrellas y aurora.
    for (const e of estrellas) {
      cx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + e.f);
      cx.fillStyle = "#e8f4ff";
      cx.beginPath(); cx.arc(e.x * W, e.y * H, e.r, 0, TAU); cx.fill();
    }
    cx.globalAlpha = 1;
    for (let k = 0; k < 3; k++) {
      cx.beginPath();
      const base = H * (0.1 + k * 0.06);
      cx.moveTo(0, base);
      for (let x = 0; x <= W; x += 16) cx.lineTo(x, base + Math.sin(x / (120 + k * 40) + t * (0.3 + k * 0.1) + k) * (18 + k * 6));
      cx.lineTo(W, base + 70); cx.lineTo(0, base + 70); cx.closePath();
      const ga = cx.createLinearGradient(0, base - 20, 0, base + 70);
      const col = ["94, 255, 196", "122, 170, 255", "196, 132, 255"][k];
      ga.addColorStop(0, `rgba(${col}, 0)`); ga.addColorStop(0.35, `rgba(${col}, ${0.13 - k * 0.03})`); ga.addColorStop(1, `rgba(${col}, 0)`);
      cx.fillStyle = ga; cx.fill();
    }
  }

  function olas(t) {
    cx.strokeStyle = "rgba(160, 210, 255, .10)";
    cx.lineWidth = 2;
    for (let k = 0; k < 9; k++) {
      cx.beginPath();
      const y0 = -700 + k * 170;
      for (let x = -900; x <= 900; x += 30) {
        const y = y0 + Math.sin(x / 70 + t * 1.1 + k) * 8 + Math.sin(x / 31 - t * 0.7) * 3;
        if (x === -900) cx.moveTo(x, y); else cx.lineTo(x, y);
      }
      cx.stroke();
    }
    for (const h of hielitos) {
      const x = Math.cos(h.a + t * 0.01) * h.d, y = Math.sin(h.a + t * 0.01) * h.d + Math.sin(t + h.f) * 3;
      cx.fillStyle = "rgba(220, 240, 255, .55)";
      cx.beginPath(); cx.ellipse(x, y, h.s, h.s * 0.6, h.f, 0, TAU); cx.fill();
    }
  }

  function poligono(r, dy = 0) {
    cx.beginPath();
    for (let i = 0; i <= SECTORES; i++) {
      const k = i % SECTORES, a = (k / SECTORES) * TAU;
      const x = Math.cos(a) * r[k], y = Math.sin(a) * r[k] + dy;
      if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
    }
    cx.closePath();
  }

  function hielo(m, t) {
    const h = m.hielo;
    // Trozos que se van flotando y hundiendo.
    for (const tr of h.trozos) {
      const a = Math.max(0, 1 - tr.t / 5);
      cx.save();
      cx.translate(tr.x, tr.y + tr.t * 4); cx.rotate(tr.rot);
      const s = 1 - tr.t * 0.08; cx.scale(s, s);
      cx.globalAlpha = a;
      cx.beginPath(); tr.pts.forEach(([x, y], i) => (i ? cx.lineTo(x, y + 8) : cx.moveTo(x, y + 8))); cx.closePath();
      cx.fillStyle = "#5d93bf"; cx.fill();
      cx.beginPath(); tr.pts.forEach(([x, y], i) => (i ? cx.lineTo(x, y) : cx.moveTo(x, y))); cx.closePath();
      cx.fillStyle = "#e3f3fd"; cx.fill();
      cx.strokeStyle = "#9fd0ef"; cx.lineWidth = 2; cx.stroke();
      cx.restore();
    }
    cx.globalAlpha = 1;
    // Espuma, grosor del bloque y la cara de arriba.
    cx.save();
    cx.lineWidth = 10 + Math.sin(t * 2) * 2; cx.strokeStyle = "rgba(200, 235, 255, .16)";
    poligono(h.r, 6); cx.stroke();
    poligono(h.r, 14); cx.fillStyle = "#3f78a6"; cx.fill();
    poligono(h.r, 7); cx.fillStyle = "#79b3db"; cx.fill();
    const R = radioMax(h);
    const g = cx.createRadialGradient(-R * 0.3, -R * 0.35, 10, 0, 0, R * 1.05);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.55, "#eef8ff"); g.addColorStop(1, "#c4e2f6");
    poligono(h.r); cx.fillStyle = g; cx.fill();
    cx.strokeStyle = "#a9d6f2"; cx.lineWidth = 3; cx.stroke();
    // Brillos y rayitas del hielo.
    cx.clip();
    cx.strokeStyle = "rgba(150, 200, 235, .35)"; cx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const a = k * 1.1 + 0.3, d = 40 + k * 32;
      cx.beginPath(); cx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
      cx.lineTo(Math.cos(a) * d + 30, Math.sin(a) * d + 8); cx.stroke();
    }
    cx.restore();
    // Grietas avisadas: líneas que tiemblan y titilan.
    for (const gr of h.grietas) {
      const p = Math.min(1, (m.t - gr.t0) / 0.75);
      cx.strokeStyle = `rgba(30, 90, 140, ${0.35 + 0.5 * p})`;
      cx.lineWidth = 2 + p * 1.5;
      cx.beginPath();
      for (let k = 0; k <= gr.n; k++) {
        const i = (((gr.i + k) % SECTORES) + SECTORES) % SECTORES, a = (i / SECTORES) * TAU;
        const rr = h.r[i] - gr.prof * p * (k === 0 || k === gr.n ? 0 : 0.9) + Math.sin(k * 7.3 + t * 30) * 2 * p;
        if (k === 0) cx.moveTo(Math.cos(a) * h.r[i], Math.sin(a) * h.r[i]);
        cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      cx.stroke();
    }
  }

  // Un osito polar visto de frente y un poco desde arriba. (x, y) = sus pies.
  function osito(o, t, esYo) {
    const R = R_OSO;
    let alfa = 1, hundir = 0, s = 1;
    if (o.cayendo >= 0) {
      const k = Math.min(1, o.cayendo / 0.75);
      hundir = k * R * 1.4; alfa = 1 - k * 0.85; s = 1 - k * 0.25;
    } else if (!o.vivo) return;
    const v = Math.hypot(o.vx, o.vy);
    const bote = o.cayendo < 0 ? Math.abs(Math.sin(o.paso)) * Math.min(1, v / 120) * 3 : 0;
    const sq = o.golpe * 0.22;
    cx.save();
    cx.translate(o.x, o.y);
    // Sombra (o círculo de agua si se hunde).
    cx.globalAlpha = o.cayendo >= 0 ? 0.5 * alfa : 0.22;
    cx.fillStyle = o.cayendo >= 0 ? "#cfeaff" : "#18466e";
    cx.beginPath(); cx.ellipse(0, 2, R * 1.05, R * 0.42, 0, 0, TAU); cx.fill();
    cx.globalAlpha = alfa;
    // Aura de invulnerable (recién rescatado).
    if (o.inv > 0) {
      cx.strokeStyle = `rgba(255, 209, 102, ${0.5 + 0.4 * Math.sin(t * 18)})`;
      cx.lineWidth = 4;
      cx.beginPath(); cx.ellipse(0, -R * 0.7, R * 1.45, R * 1.6, 0, 0, TAU); cx.stroke();
    }
    // Estela de la embestida.
    if (o.dash > 0 && o.cayendo < 0) {
      cx.strokeStyle = "rgba(255, 255, 255, .7)"; cx.lineWidth = 3; cx.lineCap = "round";
      for (let k = -1; k <= 1; k++) {
        cx.beginPath();
        cx.moveTo(-o.fx * R * 1.1 + k * o.fy * 10, -R * 0.6 - o.fy * R * 1.1 - k * o.fx * 10);
        cx.lineTo(-o.fx * R * 2.4 + k * o.fy * 12, -R * 0.6 - o.fy * R * 2.4 - k * o.fx * 12);
        cx.stroke();
      }
    }
    // Recorte: lo que está bajo el agua no se ve.
    if (hundir > 0) { cx.beginPath(); cx.rect(-R * 3, -R * 4, R * 6, R * 4 + 4); cx.clip(); }
    cx.translate(0, hundir - bote);
    cx.scale(s * (1 + sq), s * (1 - sq));
    const mx = o.fx * R * 0.18, my = o.fy * R * 0.1;
    // Patas.
    cx.fillStyle = "#e6eef5";
    const pata = Math.sin(o.paso * 2) * 3 * Math.min(1, v / 100);
    cx.beginPath(); cx.ellipse(-R * 0.45, -R * 0.05 + pata, R * 0.3, R * 0.2, 0, 0, TAU); cx.fill();
    cx.beginPath(); cx.ellipse(R * 0.45, -R * 0.05 - pata, R * 0.3, R * 0.2, 0, 0, TAU); cx.fill();
    // Cuerpo.
    const gc = cx.createRadialGradient(-R * 0.3, -R * 0.9, 2, 0, -R * 0.55, R * 1.1);
    gc.addColorStop(0, "#ffffff"); gc.addColorStop(1, "#d9e6f0");
    cx.fillStyle = gc;
    cx.beginPath(); cx.ellipse(0, -R * 0.55, R * 0.95, R * 0.8, 0, 0, TAU); cx.fill();
    cx.strokeStyle = "#b9cddd"; cx.lineWidth = 1.5; cx.stroke();
    // Bracitos.
    cx.fillStyle = "#eef4f9";
    const brazo = o.dash > 0 ? -0.6 : 0;
    cx.beginPath(); cx.ellipse(-R * 0.85, -R * 0.55, R * 0.22, R * 0.34, 0.5 + brazo, 0, TAU); cx.fill(); cx.stroke();
    cx.beginPath(); cx.ellipse(R * 0.85, -R * 0.55, R * 0.22, R * 0.34, -0.5 - brazo, 0, TAU); cx.fill(); cx.stroke();
    // Bufanda.
    cx.fillStyle = o.color.bufanda;
    cx.beginPath(); cx.ellipse(mx * 0.5, -R * 1.02, R * 0.78, R * 0.2, 0, 0, TAU); cx.fill();
    cx.fillStyle = o.color.oscura;
    cx.beginPath(); cx.roundRect(R * 0.25 + mx * 0.5, -R * 1.02, R * 0.24, R * 0.55, 4); cx.fill();
    // Cabeza.
    const hx = mx, hy = -R * 1.5 + my;
    cx.fillStyle = "#ffffff";
    cx.beginPath(); cx.arc(hx - R * 0.48, hy - R * 0.45, R * 0.24, 0, TAU); cx.fill(); cx.stroke();
    cx.beginPath(); cx.arc(hx + R * 0.48, hy - R * 0.45, R * 0.24, 0, TAU); cx.fill(); cx.stroke();
    cx.fillStyle = "#ffc9d6";
    cx.beginPath(); cx.arc(hx - R * 0.48, hy - R * 0.45, R * 0.11, 0, TAU); cx.fill();
    cx.beginPath(); cx.arc(hx + R * 0.48, hy - R * 0.45, R * 0.11, 0, TAU); cx.fill();
    const gh = cx.createRadialGradient(hx - R * 0.2, hy - R * 0.3, 2, hx, hy, R * 0.75);
    gh.addColorStop(0, "#ffffff"); gh.addColorStop(1, "#e3edf5");
    cx.fillStyle = gh;
    cx.beginPath(); cx.ellipse(hx, hy, R * 0.68, R * 0.6, 0, 0, TAU); cx.fill(); cx.stroke();
    // Cara: mira hacia donde va.
    const ex = hx + o.fx * R * 0.14, ey = hy + o.fy * R * 0.08;
    const parpadeo = (Math.sin(t * 0.9 + o.id * 2) > 0.985) ? 0.15 : 1;
    cx.fillStyle = "#1b2433";
    cx.beginPath(); cx.ellipse(ex - R * 0.24, ey - R * 0.06, R * 0.08, R * 0.1 * parpadeo, 0, 0, TAU); cx.fill();
    cx.beginPath(); cx.ellipse(ex + R * 0.24, ey - R * 0.06, R * 0.08, R * 0.1 * parpadeo, 0, 0, TAU); cx.fill();
    cx.fillStyle = "#ffffff";
    cx.beginPath(); cx.arc(ex - R * 0.21, ey - R * 0.1, R * 0.03, 0, TAU); cx.fill();
    cx.beginPath(); cx.arc(ex + R * 0.27, ey - R * 0.1, R * 0.03, 0, TAU); cx.fill();
    cx.fillStyle = "#f3e6d8";
    cx.beginPath(); cx.ellipse(ex, ey + R * 0.16, R * 0.25, R * 0.18, 0, 0, TAU); cx.fill();
    cx.fillStyle = "#1b2433";
    cx.beginPath(); cx.ellipse(ex, ey + R * 0.1, R * 0.1, R * 0.07, 0, 0, TAU); cx.fill();
    cx.strokeStyle = "#1b2433"; cx.lineWidth = 1.4;
    cx.beginPath(); cx.arc(ex - R * 0.06, ey + R * 0.2, R * 0.06, 0.2, Math.PI - 0.2); cx.stroke();
    cx.beginPath(); cx.arc(ex + R * 0.06, ey + R * 0.2, R * 0.06, 0.2, Math.PI - 0.2); cx.stroke();
    cx.fillStyle = "rgba(255, 140, 160, .35)";
    cx.beginPath(); cx.arc(ex - R * 0.42, ey + R * 0.12, R * 0.09, 0, TAU); cx.fill();
    cx.beginPath(); cx.arc(ex + R * 0.42, ey + R * 0.12, R * 0.09, 0, TAU); cx.fill();
    cx.restore();
    // Marca de «TÚ».
    if (esYo && o.cayendo < 0) {
      const y = o.y - R * 2.75 - bote + Math.sin(t * 5) * 2;
      cx.fillStyle = o.color.bufanda;
      cx.beginPath(); cx.moveTo(o.x - 7, y); cx.lineTo(o.x + 7, y); cx.lineTo(o.x, y + 9); cx.closePath(); cx.fill();
      cx.font = "700 14px 'Space Grotesk', system-ui, sans-serif"; cx.textAlign = "center";
      cx.lineWidth = 4; cx.strokeStyle = "#062040"; cx.strokeText("TÚ", o.x, y - 4);
      cx.fillStyle = "#ffffff"; cx.fillText("TÚ", o.x, y - 4);
    }
  }

  function particulas(dt) {
    for (let i = ondas.length - 1; i >= 0; i--) {
      const o = ondas[i]; o.t += dt;
      if (o.t > o.max) { ondas.splice(i, 1); continue; }
      if (o.t < 0) continue;
      cx.strokeStyle = `rgba(200, 235, 255, ${0.6 * (1 - o.t / o.max)})`; cx.lineWidth = 3;
      cx.beginPath(); cx.ellipse(o.x, o.y, 12 + o.t * 70, (12 + o.t * 70) * 0.45, 0, 0, TAU); cx.stroke();
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t > p.vida) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 520 * dt; p.z = Math.max(0, p.z + p.vz * dt);
      cx.globalAlpha = 1 - p.t / p.vida;
      cx.fillStyle = p.color;
      if (p.estrella) {
        cx.save(); cx.translate(p.x, p.y - p.z); cx.rotate(p.t * 8);
        cx.fillRect(-p.r, -p.r * 0.3, p.r * 2, p.r * 0.6); cx.fillRect(-p.r * 0.3, -p.r, p.r * 0.6, p.r * 2);
        cx.restore();
      } else { cx.beginPath(); cx.arc(p.x, p.y - p.z, p.r, 0, TAU); cx.fill(); }
    }
    cx.globalAlpha = 1;
  }

  let tAnt = 0;
  function dibujar(m, t) {
    const dt = Math.min(0.05, tAnt ? t - tAnt : 0.016); tAnt = t;
    encuadre(m);
    zoom += (zoomObj - zoom) * Math.min(1, dt * 2);
    sacudon = Math.max(0, sacudon - dt);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mar(t);
    const sx = (Math.random() - 0.5) * sacudon * 14, sy = (Math.random() - 0.5) * sacudon * 14;
    cx.save();
    cx.translate(W / 2 + sx, (H + (hud ? 20 : 0)) / 2 + sy);
    cx.scale(zoom, zoom);
    olas(t);
    hielo(m, t);
    // De atrás hacia adelante: primero los de arriba.
    [...m.osos].sort((a, b) => a.y - b.y).forEach((o) => osito(o, t, !o.cpu));
    if (m.etiquetas) etiquetas(m);
    if (m.rayos) rayos(m.rayos, t);
    particulas(dt);
    cx.restore();
    if (destello > 0) {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.fillStyle = `rgba(255, 255, 240, ${Math.min(0.85, destello)})`; cx.fillRect(0, 0, W, H);
      destello = Math.max(0, destello - dt * 3);
    }
  }

  // Sala de 20: el nombre sobre cada osito (el tuyo resaltado).
  function etiquetas(m) {
    const k = 1 / zoom;
    cx.font = `700 ${13 * k}px system-ui, sans-serif`; cx.textAlign = "center"; cx.textBaseline = "bottom";
    for (const o of m.osos) {
      if (!o.etiqueta || o.cayendo > 0.4 || !o.vivo) continue;
      const y = o.y - R_OSO * 2.5, w = cx.measureText(o.etiqueta).width + 10 * k;
      cx.fillStyle = o.cpu ? "rgba(10, 30, 50, .55)" : "#ff7a3d";
      cx.beginPath(); cx.roundRect(o.x - w / 2, y - 17 * k, w, 18 * k, 6 * k); cx.fill();
      cx.fillStyle = "#fff"; cx.fillText(o.etiqueta, o.x, y);
    }
  }

  // Rayos: aviso (círculo rojo que late) y la descarga zigzag desde el cielo.
  function rayos(lista, t) {
    for (const r of lista) {
      if (!r.ya) {
        const p = 0.5 + 0.5 * Math.sin(t * 18);
        cx.save(); cx.setLineDash([10, 8]); cx.lineWidth = 4;
        cx.strokeStyle = `rgba(255, 40, 40, ${0.45 + 0.4 * p})`;
        cx.beginPath(); cx.ellipse(r.x, r.y, 85, 85 * 0.62, 0, 0, TAU); cx.stroke();
        cx.fillStyle = `rgba(255, 60, 60, ${0.12 + 0.12 * p})`; cx.fill();
        cx.setLineDash([]); cx.font = "900 34px system-ui"; cx.textAlign = "center"; cx.fillStyle = "#ffd21a";
        cx.fillText("⚡", r.x, r.y - 70 - p * 6);
        cx.restore();
      } else {
        const a = Math.max(0, 1 - (r.t - 1.4) / 0.6);
        if (a <= 0) continue;
        if (!r.zz) { r.zz = []; let x = r.x + (Math.random() - 0.5) * 120; for (let i = 0; i <= 9; i++) { const y = r.y - 760 + (760 * i) / 9; r.zz.push([i === 9 ? r.x : x, y]); x += (r.x - x) * 0.3 + (Math.random() - 0.5) * 70; } }
        cx.save(); cx.globalAlpha = a; cx.lineJoin = "round";
        for (const [w, c] of [[16, "rgba(255, 230, 90, .5)"], [6, "#fff7c2"], [2.5, "#ffffff"]]) {
          cx.lineWidth = w; cx.strokeStyle = c; cx.beginPath();
          r.zz.forEach(([x, y], i) => (i ? cx.lineTo(x, y) : cx.moveTo(x, y))); cx.stroke();
        }
        cx.fillStyle = "rgba(40, 30, 20, .35)"; cx.beginPath(); cx.ellipse(r.x, r.y, 46, 28, 0, 0, TAU); cx.fill();
        cx.restore();
      }
    }
  }

  // Para la pantalla de inicio: un osito suelto en un canvas pequeño.
  function retrato(o, t) {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    cx.save(); cx.translate(W / 2, H * 0.86); const k = H / 95; cx.scale(k, k);
    osito(o, t, false);
    cx.restore();
  }

  medir();
  return { medir, dibujar, efecto, retrato, encuadre };
}
