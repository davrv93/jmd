// Muñequitos del sorteo: personajes originales dibujados en canvas a partir de una semilla (piel, pelo, peinado,
// camiseta, zapatillas, vincha). Trazo de tinta grueso y sombra desplazada, como los recortes del video del taller.
// Sin aretes ni joyas. Poses: quieto, carga, tiro, festeja. Se cachean como sprites.
(function () {
  'use strict';
  const TINTA = '#151410';
  const PIELES = ['#f5d0b0', '#e8b38c', '#d39a6c', '#b57a50', '#8c5634', '#5e3a22'];
  const PELOS = ['#151410', '#2e1d12', '#5a3318', '#8a4a22', '#c9a050', '#a8a29a'];
  const CAMISETAS = [
    ['#ff473e', '#151410'], ['#f0ff00', '#151410'], ['#151410', '#f3eddf'], ['#f3eddf', '#151410'],
    ['#2f5bd3', '#f3eddf'], ['#1f8a5c', '#f3eddf'], ['#ff473e', '#f3eddf'], ['#151410', '#f0ff00'],
  ];
  const ZAPAS = ['#f3eddf', '#ff473e', '#f0ff00', '#151410'];

  function prng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rasgos(seed) {
    const r = prng(seed || 1);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const cam = pick(CAMISETAS);
    return {
      piel: pick(PIELES), pelo: pick(PELOS), peinado: Math.floor(r() * 8),
      camiseta: cam[0], numero: cam[1], short: r() < 0.5 ? TINTA : cam[0],
      zapa: pick(ZAPAS), vincha: r() < 0.28 ? pick(['#ff473e', '#f0ff00', '#f3eddf']) : null,
      cejas: r() < 0.5 ? 0 : 1, boca: Math.floor(r() * 3),
    };
  }

  // Dibuja en unidades de 100 de alto, pies en (0,0), y hacia arriba negativo.
  function cuerpo(ctx, k, pose, num, conPelota) {
    const L = 3.2; // grosor de tinta
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = L;
    const salto = pose === 'festeja' ? -8 : pose === 'tiro' ? -3 : 0;
    const agache = pose === 'carga' ? 5 : 0;
    ctx.translate(0, salto);

    // piernas
    const cadera = -40 + agache;
    const pierna = (x0, x1) => {
      ctx.beginPath();
      if (agache) {
        ctx.moveTo(x0, cadera);
        ctx.lineTo(x0 + (x0 > 0 ? 6 : -6), -20);
        ctx.lineTo(x1, -5);
      } else {
        ctx.moveTo(x0, cadera);
        ctx.lineTo(x1, -5);
      }
      ctx.lineWidth = 9 + L * 2;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
      ctx.lineWidth = 9;
      ctx.strokeStyle = k.piel;
      ctx.stroke();
    };
    pierna(-6, -9);
    pierna(6, 9);
    // zapatillas
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 11, -3.5, 7.5, 4.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = k.zapa;
      ctx.fill();
      ctx.lineWidth = L;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
    }
    // short
    ctx.beginPath();
    ctx.moveTo(-15, -54 + agache);
    ctx.lineTo(15, -54 + agache);
    ctx.lineTo(17, -36 + agache);
    ctx.lineTo(2, -36 + agache);
    ctx.lineTo(0, -42 + agache);
    ctx.lineTo(-2, -36 + agache);
    ctx.lineTo(-17, -36 + agache);
    ctx.closePath();
    ctx.fillStyle = k.short === TINTA && k.camiseta === TINTA ? '#ff473e' : k.short;
    ctx.fill();
    ctx.lineWidth = L;
    ctx.strokeStyle = TINTA;
    ctx.stroke();

    const hombroY = -77 + agache;
    // brazos (detrás o delante según pose)
    const brazos = {
      quieto: [[-18, -62, -9, -60], [18, -62, 9, -60]],
      carga: [[-17, -86, -7, -96], [17, -86, 7, -96]],
      tiro: [[-12, -100, -6, -116], [12, -100, 6, -116]],
      festeja: [[-24, -94, -30, -110], [24, -94, 30, -110]],
    }[pose] || [[-18, -62, -9, -60], [18, -62, 9, -60]];
    const brazo = (sx, codoX, codoY, manoX, manoY) => {
      ctx.beginPath();
      ctx.moveTo(sx, hombroY + 3);
      ctx.lineTo(codoX, codoY + agache);
      ctx.lineTo(manoX, manoY + agache);
      ctx.lineWidth = 7 + L * 2;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = k.piel;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(manoX, manoY + agache, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = k.piel;
      ctx.fill();
      ctx.lineWidth = L * 0.8;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
    };

    // camiseta sin mangas
    ctx.beginPath();
    ctx.moveTo(-9, hombroY - 2);
    ctx.quadraticCurveTo(0, hombroY + 6, 9, hombroY - 2);
    ctx.lineTo(15, hombroY);
    ctx.quadraticCurveTo(12, hombroY + 9, 16, hombroY + 14);
    ctx.lineTo(17, -50 + agache);
    ctx.lineTo(-17, -50 + agache);
    ctx.lineTo(-16, hombroY + 14);
    ctx.quadraticCurveTo(-12, hombroY + 9, -15, hombroY);
    ctx.closePath();
    ctx.fillStyle = k.camiseta;
    ctx.fill();
    ctx.lineWidth = L;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    // número
    ctx.fillStyle = k.numero;
    ctx.font = '15px Anton, Impact, "Arial Narrow", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num == null ? '' : num), 0, -60 + agache);

    for (const [i, b] of brazos.entries()) brazo(i === 0 ? -15 : 15, b[0], b[1], b[2], b[3]);

    // pelota en las manos
    if (conPelota && (pose === 'quieto' || pose === 'carga')) {
      const py = pose === 'quieto' ? -58 : -103;
      pelota(ctx, 0, py + agache, 9);
    }

    // cabeza
    cabeza(ctx, k, 0, -91 + agache, 13);
  }

  function cabeza(ctx, k, cx, cy, r) {
    const L = 3.2;
    ctx.lineWidth = L;
    ctx.strokeStyle = TINTA;
    // cuello
    ctx.fillStyle = k.piel;
    ctx.fillRect(cx - 4, cy + r - 4, 8, 8);
    // pelo de atrás
    ctx.fillStyle = k.pelo;
    if (k.peinado === 3) { // cola
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.95, cy + 2, 5, 10, -0.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (k.peinado === 2) { // afro
      ctx.beginPath();
      ctx.arc(cx, cy - 3, r * 1.45, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (k.peinado === 4) { // moño
      ctx.beginPath();
      ctx.arc(cx, cy - r - 4, 6.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (k.peinado === 7) { // melena corta
      ctx.beginPath();
      ctx.moveTo(cx - r - 2, cy - 2);
      ctx.lineTo(cx - r - 2, cy + r * 0.8);
      ctx.lineTo(cx + r + 2, cy + r * 0.8);
      ctx.lineTo(cx + r + 2, cy - 2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // orejas
    ctx.fillStyle = k.piel;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * r, cy + 1, 3.4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    // cara
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = k.piel;
    ctx.fill(); ctx.stroke();
    // pelo de arriba
    ctx.fillStyle = k.pelo;
    ctx.beginPath();
    switch (k.peinado) {
      case 0: // corto
        ctx.arc(cx, cy - 1, r + 0.5, Math.PI * 1.05, Math.PI * 1.95);
        ctx.quadraticCurveTo(cx + 3, cy - r * 0.35, cx - r, cy - 3);
        break;
      case 1: // rapado
        ctx.arc(cx, cy, r, Math.PI * 1.1, Math.PI * 1.9);
        ctx.quadraticCurveTo(cx, cy - r * 0.55, cx - r * 0.95, cy - r * 0.3);
        break;
      case 5: // rizos arriba
        for (let i = -2; i <= 2; i++) ctx.arc(cx + i * 4.6, cy - r + 1 - (2 - Math.abs(i)), 4.2, 0, Math.PI * 2);
        break;
      case 6: // flequillo de lado
        ctx.moveTo(cx - r, cy - 1);
        ctx.arc(cx, cy - 1, r + 0.5, Math.PI, Math.PI * 1.95);
        ctx.quadraticCurveTo(cx - 1, cy - r * 0.1, cx - r * 0.2, cy - r * 0.62);
        ctx.quadraticCurveTo(cx - r * 0.6, cy - r * 0.2, cx - r, cy - 1);
        break;
      case 2:
        break;
      default: // 3, 4, 7: pelo recogido o melena, copete liso
        ctx.arc(cx, cy - 1, r + 0.5, Math.PI * 1.0, Math.PI * 2.0);
        ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.45, cx - r, cy - 1);
    }
    if (k.peinado !== 2) {
      ctx.fill();
      ctx.stroke();
    }
    // vincha deportiva
    if (k.vincha && k.peinado !== 2) {
      ctx.beginPath();
      ctx.moveTo(cx - r + 0.5, cy - r * 0.42);
      ctx.quadraticCurveTo(cx, cy - r * 0.62, cx + r - 0.5, cy - r * 0.42);
      ctx.lineWidth = 4.2 + L;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = k.vincha;
      ctx.stroke();
      ctx.lineWidth = L;
      ctx.strokeStyle = TINTA;
    }
    // ojos, cejas y boca
    ctx.fillStyle = TINTA;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * 4.6, cy + 1.5, 1.7, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      const cy0 = cy - 3.2 - (k.cejas ? s * 0.6 : 0);
      ctx.moveTo(cx + s * 2.6, cy0);
      ctx.lineTo(cx + s * 7, cy0 - 0.6);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.beginPath();
    if (k.boca === 0) ctx.arc(cx, cy + 5, 3.4, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (k.boca === 1) { ctx.moveTo(cx - 3, cy + 7); ctx.quadraticCurveTo(cx + 1, cy + 8.6, cx + 3.6, cy + 6.2); }
    else ctx.arc(cx, cy + 6, 2.4, 0, Math.PI);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.lineWidth = L;
  }

  function pelota(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6a2b';
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    ctx.clip();
    ctx.lineWidth = Math.max(0.8, r * 0.14);
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
    ctx.moveTo(x - r * 0.55, y - r); ctx.quadraticCurveTo(x - r * 0.1, y, x - r * 0.55, y + r);
    ctx.moveTo(x + r * 0.55, y - r); ctx.quadraticCurveTo(x + r * 0.1, y, x + r * 0.55, y + r);
    ctx.stroke();
    ctx.restore();
  }

  const cache = new Map();
  // sprite: canvas con el muñequito de `alto` px (pies abajo al centro, con margen para brazos y sombra).
  function sprite(seed, pose, alto, num, conPelota) {
    const clave = seed + '|' + pose + '|' + Math.round(alto) + '|' + num + '|' + (conPelota ? 1 : 0);
    let c = cache.get(clave);
    if (c) return c;
    const esc = alto / 100;
    const w = Math.ceil(80 * esc), h = Math.ceil(140 * esc);
    c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const k = rasgos(seed);
    const fig = document.createElement('canvas');
    fig.width = w; fig.height = h;
    const f = fig.getContext('2d');
    f.translate(w / 2, h - 6 * esc);
    f.scale(esc, esc);
    cuerpo(f, k, pose, num, conPelota);
    // sombra desplazada (como el «lift» del video): silueta en tinta
    const som = document.createElement('canvas');
    som.width = w; som.height = h;
    const s = som.getContext('2d');
    s.drawImage(fig, 0, 0);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = TINTA;
    s.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.3;
    ctx.drawImage(som, Math.max(1, 3 * esc), Math.max(1, 2 * esc));
    ctx.globalAlpha = 1;
    ctx.drawImage(fig, 0, 0);
    c.pieX = w / 2; c.pieY = h - 6 * esc;
    if (cache.size > 900) cache.clear();
    cache.set(clave, c);
    return c;
  }

  const retratos = new Map();
  // retrato: dataURL de la cabeza sobre un círculo (tabla y panel).
  function retrato(seed, px) {
    const clave = seed + '|' + px;
    if (retratos.has(clave)) return retratos.get(clave);
    const c = document.createElement('canvas');
    c.width = c.height = px;
    const ctx = c.getContext('2d');
    const k = rasgos(seed);
    ctx.fillStyle = k.camiseta === '#f3eddf' ? '#e0d6c0' : k.camiseta;
    ctx.fillRect(0, 0, px, px);
    ctx.translate(px / 2, px * 0.62);
    ctx.scale(px / 40, px / 40);
    cabeza(ctx, k, 0, 0, 13);
    const u = c.toDataURL();
    retratos.set(clave, u);
    return u;
  }

  window.Muneco = { sprite, retrato, pelota, rasgos };
})();
