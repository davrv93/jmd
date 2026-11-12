// LABERINTO · recoge todas las gemas y sal por la meta sin que te atrapen. Los rivales te buscan por el camino más corto.
// Plantilla de Forja (JMD Learning) para Phaser 4. Algoritmos: generar un laberinto, búsqueda en anchura (BFS), estados.
const COLS = 15, FILAS = 9, CW = 64, CH = 60, TAM = 74;
const centro = (c, f) => ({ x: c * CW + CW / 2, y: f * CH + CH / 2 });
const celda = (x, y) => ({ c: Math.floor(x / CW), f: Math.floor(y / CH) });

// >>> generar
// Generar el laberinto («excavar con vuelta atrás»): se parte de una rejilla llena de muros. Desde una celda se elige
// un vecino al azar que aún sea muro, se excava hasta él y se sigue desde ahí. Si no quedan vecinos, se vuelve atrás.
// Así todas las celdas quedan conectadas. Al final se abren algunos muros extra para que haya más de un camino.
function generar(semilla) {
  const r = azar(semilla), m = Array.from({ length: FILAS }, () => Array(COLS).fill(1)); // 1 = muro, 0 = pasillo
  const pila = [[1, 1]]; m[1][1] = 0;
  while (pila.length) {
    const [c, f] = pila[pila.length - 1];
    const vecinos = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dc, df]) => [c + dc, f + df, c + dc / 2, f + df / 2]).filter(([nc, nf]) => nc > 0 && nf > 0 && nc < COLS - 1 && nf < FILAS - 1 && m[nf][nc] === 1);
    if (!vecinos.length) { pila.pop(); continue; }
    const [nc, nf, pc, pf] = vecinos[Math.floor(r() * vecinos.length)];
    m[pf][pc] = 0; m[nf][nc] = 0; pila.push([nc, nf]);
  }
  for (let i = 0; i < 14; i++) { const c = 1 + Math.floor(r() * (COLS - 2)), f = 1 + Math.floor(r() * (FILAS - 2)); if (m[f][c] === 1 && ((m[f][c - 1] === 0 && m[f][c + 1] === 0) || (m[f - 1][c] === 0 && m[f + 1][c] === 0))) m[f][c] = 0; }
  return m;
}
// <<<

// >>> bfs
// Búsqueda en anchura (BFS): desde el origen se visitan primero las celdas a 1 paso, luego las de 2, luego las de 3…
// como una mancha que crece. La primera vez que la mancha toca el destino, ese es el camino más corto.
// «viene» guarda desde qué celda se llegó a cada una: al final se recorre hacia atrás para reconstruir la ruta.
function bfs(mapa, desde, hasta) {
  const clave = (c, f) => f * COLS + c, viene = new Map([[clave(desde.c, desde.f), null]]), cola = [desde];
  let visitadas = 0;
  while (cola.length) {
    const a = cola.shift(); visitadas++;
    if (a.c === hasta.c && a.f === hasta.f) {
      const ruta = []; for (let p = a; p; p = viene.get(clave(p.c, p.f))) ruta.unshift(p);
      return { ruta, visitadas };
    }
    for (const [dc, df] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { c: a.c + dc, f: a.f + df };
      if (mapa[n.f]?.[n.c] !== 0 || viene.has(clave(n.c, n.f))) continue;
      viene.set(clave(n.c, n.f), a); cola.push(n);
    }
  }
  return { ruta: [], visitadas };
}
// <<<

class Laberinto extends Phaser.Scene {
  preload() { Forja.precargar(this, ['relleno', 'cielo']); }

  create() {
    Forja.animaciones(this); Forja.efectos(this);
    this.add.image(0, 0, 'cielo').setOrigin(0).setDepth(-10).setTint(0x555577);
    const r = azar(D.semilla * 31 + 7), mapa = (this.mapa = generar(D.semilla));
    const muros = this.physics.add.staticGroup(), libres = [];
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
      const p = centro(c, f);
      if (mapa[f][c]) { const s = muros.create(p.x, p.y, 'relleno').setDisplaySize(CW, CH); s.refreshBody(); } else libres.push({ c, f });
    }
    const lejos = (a, b) => Math.abs(a.c - b.c) + Math.abs(a.f - b.f);
    const inicio = { c: 1, f: 1 }, salida = libres.reduce((m, x) => (lejos(x, inicio) > lejos(m, inicio) ? x : m), inicio);
    const ps = centro(salida.c, salida.f); this.meta = this.add.sprite(ps.x, ps.y + 4, 'objetos').setScale(1.1).play('meta').setAlpha(0.35); this.salida = salida;
    this.gemas = this.physics.add.group();
    const candidatas = libres.filter((x) => lejos(x, inicio) > 3 && lejos(x, salida) > 1).sort(() => r() - 0.5).slice(0, 7);
    for (const g of candidatas) { const p = centro(g.c, g.f); this.gemas.create(p.x, p.y, 'objetos').setScale(0.62).play('gema'); }
    const pi = centro(1, 1);
    this.heroe = Forja.cuerpo(this.physics.add.sprite(pi.x, pi.y + 14, 'heroe', 'quieto_0'), D.heroe, TAM, true);
    this.heroe.setData({ vidas: 3, inmune: 0 });
    this.physics.add.collider(this.heroe, muros);
    this.physics.add.overlap(this.heroe, this.gemas, (h, g) => { this.chispas.explode(8, g.x, g.y); Forja.sonar(this, 'moneda', 0.4); g.destroy(); if (!this.gemas.countActive()) { this.meta.setAlpha(1); Forja.sonar(this, 'celebrar', 0.4); } });
    const puestos = libres.filter((x) => lejos(x, inicio) > 9).sort(() => r() - 0.5);
    this.rivales = [0, 1].map((i) => {
      const cel = puestos[i] || salida, p = centro(cel.c, cel.f);
      const s = this.add.sprite(p.x, p.y + 14, 'enemigo', 'caminar_0').setScale(TAM / D.enemigo.px).setOrigin(0.5, 0.96).play('enemigo:caminar');
      s.setData({ estado: 'patrulla', ruta: [], destino: null, piensa: i * 0.2, visitadas: 0 }); return s;
    });
    this.capaX = this.add.graphics().setDepth(940);
    this.leer = Forja.controles(this); this.fin = false; this.inicio = this.time.now;
    this.texto = Forja.marcador(this);
    this.libres = libres; this.r = r;
  }

  // >>> estados
  // Cada rival tiene dos estados. «patrulla»: camina hacia una celda cualquiera. «persigue»: si estás a 6 celdas o menos,
  // calcula con BFS el camino hasta ti y lo sigue. No recalcula en cada cuadro (sería caro): piensa cada 0,35 s.
  pensar(e, dt) {
    const yo = celda(e.x, e.y - 14), tu = celda(this.heroe.x, this.heroe.y - 10);
    e.setData('piensa', e.getData('piensa') - dt);
    if (e.getData('piensa') <= 0) {
      e.setData('piensa', 0.35);
      const cerca = Math.abs(yo.c - tu.c) + Math.abs(yo.f - tu.f) <= 6;
      e.setData('estado', cerca ? 'persigue' : 'patrulla');
      let destino = tu;
      if (!cerca) { destino = e.getData('destino'); if (!destino || (destino.c === yo.c && destino.f === yo.f)) destino = this.libres[Math.floor(this.r() * this.libres.length)]; e.setData('destino', destino); }
      const res = bfs(this.mapa, yo, destino); e.setData({ ruta: res.ruta, visitadas: res.visitadas });
    }
    const ruta = e.getData('ruta'), sig = ruta[1] || ruta[0];
    if (!sig) return;
    const p = centro(sig.c, sig.f), dx = p.x - e.x, dy = p.y + 14 - e.y, d = Math.hypot(dx, dy), v = (e.getData('estado') === 'persigue' ? 104 : 70) * dt;
    if (d <= v) { e.setPosition(p.x, p.y + 14); ruta.shift(); } else { e.x += dx / d * v; e.y += dy / d * v; if (Math.abs(dx) > 1) e.setFlipX(dx < 0); }
  }
  // <<<

  update(t, ms) {
    const dt = ms / 1000, h = this.heroe, c = this.leer();
    if (c.repetir) { this.scene.restart(); return; }
    if (c.rayosX) Forja.rayosX(this);
    this.texto.setText('Gemas ' + this.gemas.countActive() + '   Vidas ' + h.getData('vidas'));
    if (this.fin) { h.setVelocity(0, 0); return; }
    const m = Math.hypot(c.x, c.y) || 1, vel = Math.min(175, D.fisica.velocidad * 0.7);
    h.setVelocity(c.x / m * vel, c.y / m * vel); if (c.x) h.setFlipX(c.x < 0);
    h.setData('inmune', Math.max(0, h.getData('inmune') - dt)); h.setAlpha(h.getData('inmune') > 0 && Math.floor(h.getData('inmune') * 14) % 2 ? 0.45 : 1);
    h.play('heroe:' + (h.getData('inmune') > 1 ? 'dano' : c.x || c.y ? 'caminar' : 'quieto'), true); h.setDepth(h.y);
    for (const e of this.rivales) {
      this.pensar(e, dt); e.setDepth(e.y);
      if (h.getData('inmune') <= 0 && Phaser.Math.Distance.Between(e.x, e.y, h.x, h.y) < 34) {
        const p = centro(1, 1); h.setData({ vidas: h.getData('vidas') - 1, inmune: 1.6 }); h.setPosition(p.x, p.y + 14); Forja.sonar(this, 'dano', 0.6);
        if (h.getData('vidas') <= 0) { this.fin = true; Forja.sonar(this, 'morir'); h.play('heroe:morir'); Forja.aviso(this, 'Te atraparon\nR para repetir'); }
      }
    }
    const aqui = celda(h.x, h.y - 10);
    if (!this.gemas.countActive() && aqui.c === this.salida.c && aqui.f === this.salida.f) {
      this.fin = true; h.play('heroe:celebrar'); Forja.sonar(this, 'celebrar', 0.6); this.chispas.explode(30, h.x, h.y - 40);
      Forja.aviso(this, '¡Escapaste en ' + Math.floor((this.time.now - this.inicio) / 1000) + ' s!\nR para repetir');
    }
    if (this.verX) this.dibujarX();
  }

  dibujarX() { // rayos X: la ruta que calculó cada rival con BFS y cuántas celdas tuvo que visitar
    const g = this.capaX.clear(); let info = '';
    this.rivales.forEach((e, i) => {
      const ruta = e.getData('ruta'), col = e.getData('estado') === 'persigue' ? 0xff7a66 : 0xc6ff4a;
      g.lineStyle(4, col, 0.9);
      for (let k = 0; k < ruta.length - 1; k++) { const a = centro(ruta[k].c, ruta[k].f), b = centro(ruta[k + 1].c, ruta[k + 1].f); g.lineBetween(a.x, a.y, b.x, b.y); }
      g.fillStyle(col, 1); for (const p of ruta) { const q = centro(p.c, p.f); g.fillCircle(q.x, q.y, 5); }
      info += '   R' + (i + 1) + ' ' + e.getData('estado') + ' · ruta ' + Math.max(0, ruta.length - 1) + ' · BFS visitó ' + e.getData('visitadas');
    });
    this.texto.setText(this.texto.text + info);
  }
}
Forja.iniciar(Laberinto);
