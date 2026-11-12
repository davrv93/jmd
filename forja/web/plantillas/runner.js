// RUNNER · corre sin parar: salta las bombas, agáchate bajo los proyectiles y junta monedas. Cada vez va más rápido.
// Plantilla de Forja (JMD Learning) para Phaser 4. Algoritmos: mundo infinito, generación por azar, dificultad creciente, reciclaje.
const F = D.fisica, SUELO = 476, X_HEROE = 220;

class Runner extends Phaser.Scene {
  preload() { Forja.precargar(this, ['cielo', 'capa0', 'capa1', 'capa2', 'suelo']); }

  create() {
    Forja.fondo(this); Forja.animaciones(this); Forja.efectos(this);
    // >>> infinito
    // Mundo infinito: el héroe NO avanza. Lo que se mueve es el suelo (una imagen que se repite) y los obstáculos,
    // que vienen hacia él. «distancia» es solo un número que crece con la velocidad.
    this.piso = this.add.tileSprite(0, SUELO, 960, 64, 'suelo').setOrigin(0);
    const solido = this.physics.add.staticImage(480, SUELO + 32, 'suelo').setDisplaySize(960, 64).setVisible(false); solido.refreshBody();
    // <<<
    this.heroe = Forja.cuerpo(this.physics.add.sprite(X_HEROE, SUELO - 60, 'heroe', 'correr_0'), D.heroe);
    this.heroe.body.setGravityY(F.gravedad); this.physics.add.collider(this.heroe, solido);
    this.altoCuerpo = this.heroe.body.height; this.offY = this.heroe.body.offset.y;
    this.yProyectil = SUELO - Math.max(70, this.altoCuerpo * this.heroe.scaleY) * 0.82; // a la altura de la cabeza: de pie te da, agachado no
    // >>> reciclaje
    // Reciclaje (pool): en vez de crear y destruir cientos de objetos, hay un grupo con un máximo. Cuando un obstáculo
    // sale de la pantalla se apaga y se guarda; el siguiente que haga falta reutiliza ese mismo objeto.
    this.cosas = this.physics.add.group({ allowGravity: false, maxSize: 40 });
    // <<<
    this.physics.add.overlap(this.heroe, this.cosas, (h, o) => this.tocar(o));
    this.capaX = this.add.graphics().setDepth(940);
    this.r = azar(D.semilla * 13 + 3); this.leer = Forja.controles(this);
    this.distancia = 0; this.monedas = 0; this.vidas = 3; this.inmune = 0; this.saltos = 0; this.proximo = 500; this.fin = false; this.tiempo = 0;
    this.texto = Forja.marcador(this);
  }

  poner(tipo, x, y) {
    const o = this.cosas.get(x, y, 'objetos', tipo + '_0'); if (!o) return null; // el grupo está lleno: no se crea nada
    o.setActive(true).setVisible(true).setScale(tipo === 'moneda' ? 0.7 : 0.95).play(tipo).setData('tipo', tipo).setAngle(tipo === 'proyectil' ? 180 : 0);
    o.body.enable = true; o.body.setCircle(tipo === 'moneda' ? 20 : 17, tipo === 'moneda' ? 12 : 15, tipo === 'moneda' ? 12 : 15);
    return o;
  }
  guardar(o) { this.cosas.killAndHide(o); o.body.enable = false; }

  // >>> generar
  // Generación por azar con reglas: cada cierta distancia se elige un «patrón» (bomba, proyectil, monedas en arco…).
  // La separación entre patrones se achica con la dificultad, pero nunca tanto que sea imposible reaccionar.
  generar() {
    const r = this.r, dif = Math.min(1, this.tiempo / 70), x = 1020, suerte = r();
    if (suerte < 0.34) this.poner('bomba', x, SUELO - 26);
    else if (suerte < 0.56) this.poner('proyectil', x, this.yProyectil);                       // alto: hay que agacharse
    else if (suerte < 0.72) { this.poner('bomba', x, SUELO - 26); this.poner('bomba', x + 58, SUELO - 26); }
    else if (suerte < 0.9) for (let i = 0; i < 5; i++) this.poner('moneda', x + i * 46, SUELO - 70 - Math.sin(i / 4 * Math.PI) * 95);
    else { this.poner('bomba', x, SUELO - 26); for (let i = 0; i < 3; i++) this.poner('moneda', x - 46 + i * 46, SUELO - 150 - Math.sin(i / 2 * Math.PI) * 30); }
    this.proximo = this.distancia + Phaser.Math.Linear(620, 330, dif) + r() * 220;
  }
  // <<<

  tocar(o) {
    if (o.getData('tipo') === 'moneda') { this.monedas++; this.chispas.explode(6, o.x, o.y); Forja.sonar(this, 'moneda', 0.4); return this.guardar(o); }
    if (this.inmune > 0 || this.fin) return;
    this.vidas--; this.inmune = 1.3; this.guardar(o); this.polvo.explode(12, o.x, o.y); Forja.sonar(this, 'dano', 0.6); this.cameras.main.shake(180, 0.008);
    if (this.vidas <= 0) { this.fin = true; Forja.sonar(this, 'morir'); this.heroe.play('heroe:morir'); Forja.aviso(this, Math.floor(this.distancia / 10) + ' metros · ' + this.monedas + ' monedas\nR para repetir'); }
  }

  update(t, ms) {
    const dt = ms / 1000, h = this.heroe, c = this.leer();
    if (c.repetir) { this.scene.restart(); return; }
    if (c.rayosX) Forja.rayosX(this);
    if (this.fin) return;
    this.tiempo += dt; this.inmune = Math.max(0, this.inmune - dt);
    // >>> dificultad
    // Curva de dificultad: la velocidad sube poco a poco con el tiempo y tiene un tope. Todo lo demás depende de ella.
    const velocidad = Math.min(760, 300 + this.tiempo * 7);
    // <<<
    this.distancia += velocidad * dt; this.piso.tilePositionX = this.distancia; Forja.paralaje(this, this.distancia);
    if (this.distancia >= this.proximo) this.generar();
    for (const o of this.cosas.getChildren()) { if (!o.active) continue; o.x -= (o.getData('tipo') === 'proyectil' ? velocidad * 1.25 : velocidad) * dt; if (o.x < -60) this.guardar(o); }
    const piso = h.body.blocked.down || h.body.touching.down, agachado = c.abajo && piso;
    if (piso) this.saltos = 0;
    if (c.saltoYa && this.saltos < 2) { h.setVelocityY(-F.salto * (this.saltos ? 0.85 : 1)); this.saltos++; Forja.sonar(this, 'salto', 0.45); this.polvo.explode(5, h.x, h.y); } // doble salto
    if (c.abajo && !piso) h.setVelocityY(Math.max(h.body.velocity.y, 700));                                                                                      // caer rápido
    h.body.setSize(h.body.width, agachado ? this.altoCuerpo * 0.55 : this.altoCuerpo).setOffset(h.body.offset.x, agachado ? this.offY + this.altoCuerpo * 0.45 : this.offY);
    h.x = X_HEROE; h.setAlpha(this.inmune > 0 && Math.floor(this.inmune * 14) % 2 ? 0.45 : 1);
    h.play('heroe:' + (this.inmune > 1 ? 'dano' : !piso ? 'saltar' : agachado ? 'agachado' : 'correr'), true);
    h.anims.timeScale = velocidad / 420;
    this.texto.setText(Math.floor(this.distancia / 10) + ' m   Monedas ' + this.monedas + '   Vidas ' + this.vidas);
    if (this.verX) {
      const g = this.capaX.clear(), px = 1020 - (this.proximo - this.distancia);
      g.lineStyle(2, 0xc6ff4a, 0.9).lineBetween(px, 60, px, SUELO); g.lineStyle(2, 0xff7a66, 0.8).lineBetween(X_HEROE, this.yProyectil, 960, this.yProyectil);
      this.texto.setText(this.texto.text + '   vel ' + Math.round(velocidad) + ' px/s · activos ' + this.cosas.countActive() + '/' + this.cosas.getLength() + ' · próximo en ' + Math.max(0, Math.round(this.proximo - this.distancia)));
    }
  }
}
Forja.iniciar(Runner);
