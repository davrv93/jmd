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
    this.heroe = Forja.cuerpo(this.physics.add.sprite(X_HEROE, SUELO - 60, 'heroe', 'correr_0'), D.heroe).setDepth(3);
    this.heroe.body.setGravityY(F.gravedad); this.physics.add.collider(this.heroe, solido);
    // >>> agacharse
    // De pie, la caja de choque llega a la cabeza; agachado, solo hasta donde llega el dibujo agachado. El proyectil pasa
    // justo por encima del dibujo agachado (con 4 px de aire) y por dentro de la caja de pie: de pie te da, agachado no.
    // Si tu personaje casi no baja al agacharse, se aplasta un poco para que la diferencia se vea.
    const h0 = this.heroe, k = h0.scaleY, R = 17 * 0.95;                   // R = radio del proyectil
    this.altoCuerpo = h0.body.sourceHeight; const dePie = this.altoCuerpo * k;
    this.aplasta = Math.min(1, (dePie - 2 * R + 6) / Forja.altoDibujo(h0, 'agachado'));
    const agachado = Forja.altoDibujo(h0, 'agachado') * this.aplasta;
    this.altoAgachado = (agachado * 0.92) / (k * this.aplasta);
    this.yProyectil = SUELO - agachado - R - 4;
    // <<<
    // >>> reciclaje
    // Reciclaje (pool): en vez de crear y destruir cientos de objetos, hay un grupo con un máximo. Cuando un obstáculo
    // sale de la pantalla se apaga y se guarda; el siguiente que haga falta reutiliza ese mismo objeto.
    this.cosas = this.physics.add.group({ allowGravity: false, maxSize: 40 });
    // <<<
    this.physics.add.overlap(this.heroe, this.cosas, (h, o) => this.tocar(o));
    this.capaX = this.add.graphics().setDepth(940);
    this.r = azar(D.semilla * 13 + 3); this.leer = Forja.controles(this);
    this.distancia = 0; this.monedas = 0; this.vidas = Forja.regla('vidas.inicio', 3); this.inmune = 0; this.saltos = 0; this.proximo = 500; this.fin = false; this.tiempo = 0;
    this.texto = Forja.marcador(this);
    this.arte();
  }

  // ARTE: lo que solo se ve. Matas y flores que corren con el suelo, sombras (también de lo que vuela: así se lee a qué
  // altura pasa), brillo en las monedas, partículas de ambiente, primer plano y viñeta.
  arte() {
    const P = Forja.paleta(this);
    Forja.decorados(this);
    this.heroe.setTint(Forja.luzPersonaje(this));
    this.tira = this.add.tileSprite(0, SUELO - 27, 960, 30, 'tira').setOrigin(0).setDepth(0.2);
    Forja.sombra(this, this.heroe, { piso: () => SUELO, prof: 0.5 });
    if (P.noche) Forja.halo(this, this.heroe, P.hex(P.acento), 320, { alfa: 0.14, late: 0.06, dy: -50, prof: 0.45 });
    Forja.ambiente(this, { x: 0, y: 40, w: 960, h: 420 }, { cuantas: 16, prof: 4 });
    Forja.primerPlano(this);
    Forja.vineta(this, P.noche ? 0.5 : 0.3);
    Forja.vigilar(this);
  }

  poner(tipo, x, y) {
    const o = this.cosas.get(x, y, 'objetos', tipo + '_0'); if (!o) return null; // el grupo está lleno: no se crea nada
    o.setActive(true).setVisible(true).setScale(tipo === 'moneda' ? 0.7 : 0.95).play(tipo).setData('tipo', tipo).setAngle(tipo === 'proyectil' ? 180 : 0);
    o.body.enable = true; o.body.setCircle(tipo === 'moneda' ? 20 : 17, tipo === 'moneda' ? 12 : 15, tipo === 'moneda' ? 12 : 15);
    if (!o.getData('arte')) {   // la primera vez que se usa este objeto del grupo: su sombra y su brillo (luego se reciclan con él)
      o.setData('arte', true).setDepth(2);
      Forja.sombra(this, o, { piso: () => SUELO, prof: 0.5, ancho: () => (o.getData('tipo') === 'moneda' ? 26 : 44), alfa: 0.45, pie: (s) => s.y + s.displayHeight * 0.3 });
      o.setData('halo', Forja.halo(this, o, 0xffffff, 80, { alfa: 0.4, prof: 1.5 }));
    }
    const brillo = { moneda: [0xffd25a, 64], proyectil: [0xff7a5a, 96], bomba: [0xff9a40, 40] }[tipo];
    o.getData('halo')?.setTint(brillo[0]).setDisplaySize(brillo[1], brillo[1]);
    return o;
  }
  guardar(o) { this.cosas.killAndHide(o); o.body.enable = false; }

  // >>> generar
  // Generación por azar con reglas: cada cierta distancia se elige un «patrón» (bomba, proyectil, monedas en arco…).
  // La separación entre patrones se achica con la dificultad, pero nunca tanto que sea imposible reaccionar.
  generar() {
    const r = this.r, dif = Math.min(1, this.tiempo / Forja.regla('dificultad.segundos', 70)), x = 1020, suerte = r() * Forja.regla('peligros.mezcla', 1);
    if (suerte < 0.34) this.poner('bomba', x, SUELO - 26);
    else if (suerte < 0.56) this.poner('proyectil', x, this.yProyectil);                       // alto: hay que agacharse
    else if (suerte < 0.72) { this.poner('bomba', x, SUELO - 26); this.poner('bomba', x + 58, SUELO - 26); }
    else if (suerte < 0.9) for (let i = 0; i < 5; i++) this.poner('moneda', x + i * 46, SUELO - 70 - Math.sin(i / 4 * Math.PI) * 95);
    else { this.poner('bomba', x, SUELO - 26); for (let i = 0; i < 3; i++) this.poner('moneda', x - 46 + i * 46, SUELO - 150 - Math.sin(i / 2 * Math.PI) * 30); }
    // Justicia: un salto recorre L = tiempo en el aire × velocidad. Si el siguiente peligro cae «a un salto» de este
    // (entre 0,55 L y 1,1 L) aterrizarías encima sin poder evitarlo: entonces se aleja hasta 1,1 L (tiempo para caer y volver a saltar).
    const vel = Math.min(Forja.regla('ritmo.tope', 760), Forja.regla('ritmo.inicio', 300) + this.tiempo * Forja.regla('ritmo.aumento', 7));
    const L = (2 * F.salto / F.gravedad) * vel;
    let sep = Phaser.Math.Linear(620, 330, dif) + r() * 220;
    if (sep > L * 0.55 && sep < L * 1.1) sep = L * 1.1;
    this.proximo = this.distancia + sep;
  }
  // <<<

  tocar(o) {
    if (o.getData('tipo') === 'moneda') { this.monedas += Forja.regla('monedas.valor', 1); const pide = Forja.regla('objetivo.monedas', 0); if (pide && this.monedas >= pide && !this.fin) { this.fin = true; this.heroe.play('heroe:celebrar'); Forja.sonar(this, 'celebrar', 0.6); Forja.aviso(this, '¡Juntaste ' + pide + ' monedas!\nR para repetir'); } this.chispas.explode(6, o.x, o.y); Forja.sonar(this, 'moneda', 0.4); return this.guardar(o); }
    if (this.inmune > 0 || this.fin) return;
    this.vidas -= Forja.regla('dano.golpe', 1); this.inmune = Forja.regla('jugador.inmunidad', 1.3); this.tDano = Forja.dura('heroe', 'dano'); this.guardar(o); this.polvo.explode(12, o.x, o.y); Forja.sonar(this, 'dano', 0.6); this.cameras.main.shake(180, 0.008);
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
    const velocidad = Math.min(Forja.regla('ritmo.tope', 760), Forja.regla('ritmo.inicio', 300) + this.tiempo * Forja.regla('ritmo.aumento', 7));
    const meta = Forja.regla('resultado.metros', 0);   // regla: 0 = sin meta; si no, metros para ganar
    if (meta && this.distancia / 10 >= meta) { this.fin = true; this.heroe.play('heroe:celebrar'); Forja.sonar(this, 'celebrar', 0.6); Forja.aviso(this, '¡Llegaste a ' + meta + ' m!\n' + this.monedas + ' monedas · R para repetir'); return; }
    // <<<
    this.distancia += velocidad * dt; this.piso.tilePositionX = this.distancia; this.tira.tilePositionX = this.distancia; Forja.paralaje(this, this.distancia);
    if (this.distancia >= this.proximo) this.generar();
    for (const o of this.cosas.getChildren()) { if (!o.active) continue; o.x -= (o.getData('tipo') === 'proyectil' ? velocidad * 1.25 : velocidad) * dt; if (o.x < -60) this.guardar(o); }
    const piso = h.body.blocked.down || h.body.touching.down, agachado = c.abajo && piso;
    if (piso) this.saltos = 0;
    if (c.saltoYa && this.saltos < Forja.regla('salto.maximos', 2)) { h.setVelocityY(-F.salto * (this.saltos ? 0.85 : 1)); this.saltos++; Forja.sonar(this, 'salto', 0.45); this.polvo.explode(5, h.x, h.y); } // doble salto
    if (c.abajo && !piso) h.setVelocityY(Math.max(h.body.velocity.y, 700));                                                                                      // caer rápido
    // la caja se apoya siempre en la fila de los pies del cuadro que se ve (h.originY): baja la cabeza, no los pies
    const alto = agachado ? this.altoAgachado : this.altoCuerpo, fila = h.originY * h.frame.height;
    h.setScale(h.scaleX, h.scaleX * (agachado ? this.aplasta : 1));
    h.body.setSize(h.body.sourceWidth, alto, false).setOffset(h.body.offset.x, fila - alto);
    h.x = X_HEROE; h.setAlpha(this.inmune > 0 && Math.floor(this.inmune * 14) % 2 ? 0.45 : 1);
    this.tDano = Math.max(0, (this.tDano || 0) - dt);
    // los pasos al ritmo del suelo que pasa; en el aire, el cuadro según suba o baje
    const pose = this.tDano > 0 ? 'dano' : !piso ? 'aire' : agachado ? 'agachado' : 'correr';
    Forja.pose(h, pose, { vy: h.body.velocity.y, salto: F.salto, ritmo: pose === 'correr' ? Math.max(0.6, Math.min(1.8, velocidad / 420)) : 1 });
    this.texto.setText(Math.floor(this.distancia / 10) + ' m   Monedas ' + this.monedas + '   Vidas ' + this.vidas);
    if (this.verX) {
      const g = this.capaX.clear(), px = 1020 - (this.proximo - this.distancia);
      g.lineStyle(2, 0xc6ff4a, 0.9).lineBetween(px, 60, px, SUELO); g.lineStyle(2, 0xff7a66, 0.8).lineBetween(X_HEROE, this.yProyectil, 960, this.yProyectil);
      this.texto.setText(this.texto.text + '   vel ' + Math.round(velocidad) + ' px/s · activos ' + this.cosas.countActive() + '/' + this.cosas.getLength() + ' · próximo en ' + Math.max(0, Math.round(this.proximo - this.distancia)));
    }
  }
}
Forja.iniciar(Runner);
