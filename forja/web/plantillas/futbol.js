// FÚTBOL · mini cancha: tú y tu arquero contra un defensa y su arquero. Gana quien meta 3 goles o vaya arriba al acabar el tiempo.
// Plantilla de Forja (JMD Learning) para Phaser 4. Algoritmos: máquina de estados, perseguir un punto, rebotes y gol.
const CAMPO = { x1: 60, x2: 900, y1: 90, y2: 500, arcoY1: 225, arcoY2: 365 };
const TAM = 96; // en la cancha los jugadores se ven más pequeños

class Futbol extends Phaser.Scene {
  preload() { Forja.precargar(this); }

  create() {
    Forja.animaciones(this); Forja.efectos(this);
    this.cancha();
    this.capaX = this.add.graphics().setDepth(940);
    this.etiquetas = [];
    const jugador = (clave, x, y) => { const s = Forja.cuerpo(this.physics.add.sprite(x, y, clave, 'quieto_0'), D[clave], TAM, true); s.setCollideWorldBounds(true); return s; };
    this.physics.world.setBounds(CAMPO.x1, CAMPO.y1, CAMPO.x2 - CAMPO.x1, CAMPO.y2 - CAMPO.y1);
    this.heroe = jugador('heroe', 250, 295);
    this.defensa = jugador('enemigo', 640, 295).setData({ estado: 'volver', casa: { x: 640, y: 295 } });
    this.arquero = jugador('enemigo', CAMPO.x2 - 30, 295).setData({ estado: 'cubrir' });
    this.miArquero = jugador('heroe', CAMPO.x1 + 30, 295).setTint(0xbfd4ff); // tu arquero: mismo personaje, teñido para distinguirlo
    this.balon = this.physics.add.sprite(480, 295, 'objetos', 'balon_0').setScale(0.55).play('balon');
    // >>> rebote
    // El balón es un círculo que rebota en los bordes (bounce) y se va frenando solo (damping + drag): eso imita el roce con el pasto.
    this.balon.body.setCircle(22, 10, 10); this.balon.setBounce(0.75).setCollideWorldBounds(true).setDamping(true).setDrag(0.45);
    // <<<
    for (const j of [this.heroe, this.defensa, this.arquero, this.miArquero]) this.physics.add.overlap(j, this.balon, () => this.toque(j));
    this.leer = Forja.controles(this); this.goles = [0, 0]; this.tiempo = 90; this.fin = false; this.pausa = 0;
    this.texto = Forja.marcador(this);
  }

  cancha() { // se dibuja con código: franjas, líneas y arcos. Ningún archivo de imagen.
    const g = this.add.graphics().setDepth(-5), c = CAMPO;
    g.fillStyle(0x1f7a3d, 1).fillRect(0, 0, 960, 540);
    for (let i = 0; i < 8; i++) g.fillStyle(i % 2 ? 0x2a9550 : 0x248746, 1).fillRect(c.x1 + i * (c.x2 - c.x1) / 8, c.y1, (c.x2 - c.x1) / 8, c.y2 - c.y1);
    g.lineStyle(4, 0xffffff, 0.85).strokeRect(c.x1, c.y1, c.x2 - c.x1, c.y2 - c.y1).lineBetween(480, c.y1, 480, c.y2).strokeCircle(480, 295, 62);
    g.strokeRect(c.x1, 185, 90, 220).strokeRect(c.x2 - 90, 185, 90, 220);
    g.fillStyle(0xffffff, 0.9).fillRect(c.x1 - 26, c.arcoY1, 26, c.arcoY2 - c.arcoY1).fillRect(c.x2, c.arcoY1, 26, c.arcoY2 - c.arcoY1);
    g.lineStyle(2, 0x9aa0a8, 1); for (let y = c.arcoY1; y <= c.arcoY2; y += 14) g.lineBetween(c.x1 - 26, y, c.x1, y).lineBetween(c.x2, y, c.x2 + 26, y);
  }

  // >>> perseguir
  // Perseguir un punto: se resta «a dónde quiero ir» menos «dónde estoy», y ese vector se ajusta a la velocidad deseada.
  // Sirve igual para ir al balón, volver a casa o cubrir el arco.
  irA(j, x, y, velocidad) {
    const dx = x - j.x, dy = y - j.y, d = Math.hypot(dx, dy);
    if (d < 6) { j.setVelocity(0, 0); return d; }
    j.setVelocity(dx / d * velocidad, dy / d * velocidad);
    if (Math.abs(dx) > 4) j.setFlipX(dx < 0);
    return d;
  }
  // <<<

  toque(j) { // quien toca el balón lo empuja en la dirección en que venía; si patea, sale más fuerte
    const b = this.balon, dx = b.x - j.x, dy = b.y - (j.y - 18), d = Math.hypot(dx, dy) || 1;
    const fuerza = j.getData('patea') ? (j === this.heroe ? 540 : 400) : 150 + Math.hypot(j.body.velocity.x, j.body.velocity.y) * 0.9;
    let vx = dx / d, vy = dy / d;
    if (j.getData('patea')) { const meta = j === this.heroe || j === this.miArquero ? CAMPO.x2 : CAMPO.x1, mx = meta - b.x, my = 295 + (j.getData('apunta') || 0) * 60 - b.y, m = Math.hypot(mx, my); vx = mx / m; vy = my / m; Forja.sonar(this, 'golpe'); this.polvo.explode(5, b.x, b.y); j.setData('patea', false); }
    b.setVelocity(vx * fuerza, vy * fuerza);
  }

  // >>> estados
  // Máquina de estados del defensa. En cada cuadro está en UN estado y solo ahí decide si cambia a otro:
  //   volver    → regresa a su posición        (cambia a «perseguir» si el balón entra en su mitad)
  //   perseguir → corre hacia el balón         (cambia a «despejar» si lo alcanza, o a «volver» si el balón se aleja)
  //   despejar  → patea hacia el arco contrario (y vuelve a «perseguir»)
  pensar(dt) {
    const d = this.defensa, b = this.balon, casa = d.getData('casa');
    const enSuMitad = b.x > 430, cerca = Phaser.Math.Distance.Between(d.x, d.y - 18, b.x, b.y);
    switch (d.getData('estado')) {
      case 'volver': this.irA(d, casa.x, casa.y, 150); if (enSuMitad) d.setData('estado', 'perseguir'); break;
      case 'perseguir': this.irA(d, b.x + 26, b.y + 18, 185); if (cerca < 46) d.setData('estado', 'despejar'); else if (!enSuMitad) d.setData('estado', 'volver'); break;
      case 'despejar': d.setData({ patea: true, apunta: Math.sin(this.time.now / 300), estado: 'perseguir' }); break;
    }
    // El arquero solo tiene un estado: seguir la altura del balón sin salir de su arco.
    for (const [a, x] of [[this.arquero, CAMPO.x2 - 34], [this.miArquero, CAMPO.x1 + 34]]) {
      this.irA(a, x, Phaser.Math.Clamp(b.y + 18, CAMPO.arcoY1 + 10, CAMPO.arcoY2 + 30), 150);
      if (Phaser.Math.Distance.Between(a.x, a.y - 18, b.x, b.y) < 50) a.setData({ patea: true, apunta: b.y < 295 ? -1 : 1 });
    }
  }
  // <<<

  gol(quien) {
    this.goles[quien]++; this.pausa = 1.4; Forja.sonar(this, quien === 0 ? 'celebrar' : 'dano', 0.6);
    this.chispas.explode(30, this.balon.x, this.balon.y);
    const t = Forja.aviso(this, quien === 0 ? '¡GOOOL!' : 'Gol del rival'); this.time.delayedCall(1300, () => t.destroy());
    this.balon.setPosition(480, 295).setVelocity(0, 0); this.heroe.setPosition(250, 295); this.defensa.setPosition(640, 295); this.arquero.setPosition(CAMPO.x2 - 30, 295); this.miArquero.setPosition(CAMPO.x1 + 30, 295);
    if (this.goles[quien] >= 3) this.terminar();
  }
  terminar() { this.fin = true; const [a, b] = this.goles; Forja.aviso(this, (a > b ? '¡Ganaste ' : a < b ? 'Perdiste ' : 'Empate ') + a + ' - ' + b + '\nR para repetir'); }

  update(t, ms) {
    const dt = ms / 1000, h = this.heroe, b = this.balon, c = this.leer();
    if (c.repetir) { this.scene.restart(); return; }
    if (c.rayosX && !Forja.rayosX(this)) this.etiquetas.forEach((e) => e.setVisible(false));
    this.texto.setText('Tú ' + this.goles[0] + ' - ' + this.goles[1] + ' Rival   ' + Math.ceil(this.tiempo) + ' s');
    const todos = [h, this.defensa, this.arquero, this.miArquero];
    if (this.fin) { todos.forEach((j) => j.setVelocity(0, 0)); h.play('heroe:' + (this.goles[0] > this.goles[1] ? 'celebrar' : 'quieto'), true); return; }
    if (this.pausa > 0) { this.pausa -= dt; todos.forEach((j) => j.setVelocity(0, 0)); return; }
    this.tiempo -= dt; if (this.tiempo <= 0) return this.terminar();
    // tú: ocho direcciones. La diagonal se normaliza para no correr más rápido en diagonal.
    const m = Math.hypot(c.x, c.y) || 1, vel = Math.min(260, D.fisica.velocidad);
    h.setVelocity(c.x / m * vel, c.y / m * vel); if (c.x) h.setFlipX(c.x < 0);
    if (c.golpeYa || c.saltoYa) { h.setData({ patea: true, apunta: c.y }); this.time.delayedCall(220, () => h.setData('patea', false)); }
    this.pensar(dt);
    // >>> gol
    // Gol: el balón toca la línea de fondo Y su altura está entre los dos postes. Es una prueba de rectángulo.
    const enArco = b.y > CAMPO.arcoY1 && b.y < CAMPO.arcoY2;
    if (enArco && b.x >= CAMPO.x2 - 26) this.gol(0);
    else if (enArco && b.x <= CAMPO.x1 + 26) this.gol(1);
    // <<<
    for (const j of todos) { // animación y orden de dibujo: quien está más abajo se dibuja encima
      const clave = j === h || j === this.miArquero ? 'heroe' : 'enemigo', v = Math.hypot(j.body.velocity.x, j.body.velocity.y);
      j.play(clave + ':' + (j.getData('patea') ? 'golpe' : v > 200 ? 'correr' : v > 20 ? 'caminar' : 'quieto'), true); j.setDepth(j.y);
    }
    b.setDepth(b.y + 12);
    if (this.verX) this.dibujarX();
  }

  dibujarX() { // rayos X: el estado de cada rival y hacia dónde va
    const g = this.capaX.clear(), d = this.defensa, a = this.arquero, b = this.balon;
    g.lineStyle(3, 0xc6ff4a, 0.9).lineBetween(d.x, d.y - 20, d.x + d.body.velocity.x * 0.5, d.y - 20 + d.body.velocity.y * 0.5);
    g.lineStyle(2, 0xff7a66, 0.9).strokeRect(CAMPO.x2 - 26, CAMPO.arcoY1, 26, CAMPO.arcoY2 - CAMPO.arcoY1).strokeRect(CAMPO.x1, CAMPO.arcoY1, 26, CAMPO.arcoY2 - CAMPO.arcoY1);
    g.lineStyle(1, 0xffffff, 0.5).lineBetween(430, CAMPO.y1, 430, CAMPO.y2).strokeCircle(b.x, b.y, 46);
    [[d, 'defensa: ' + d.getData('estado')], [a, 'arquero: cubrir']].forEach(([j, txt], i) => {
      const e = (this.etiquetas[i] ??= this.add.text(0, 0, '', { fontFamily: 'ui-monospace, monospace', fontSize: '14px', color: '#14111c', backgroundColor: '#c6ff4a', padding: { x: 5, y: 2 } }).setDepth(960).setOrigin(0.5, 1));
      e.setVisible(true).setText(txt).setPosition(j.x, j.y - TAM * 0.86);
    });
  }
}
Forja.iniciar(Futbol);
