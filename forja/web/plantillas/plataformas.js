// PLATAFORMAS · corre, salta, recoge monedas y llega a la meta. Plantilla de Forja (JMD Learning) para Phaser 4.
// Algoritmos que usa: gravedad y salto, plataformas de un solo sentido, cámara que sigue, patrulla de enemigos.
const N = D.nivel, F = D.fisica;

class Plataformas extends Phaser.Scene {
  preload() { Forja.precargar(this, ['cielo', 'capa0', 'capa1', 'capa2', 'suelo', 'plat_izq', 'plat_cen', 'plat_der']); }

  create() {
    Forja.fondo(this); Forja.animaciones(this); Forja.efectos(this);
    // >>> nivel
    // El nivel es una lista de datos (N): qué columnas tienen suelo y dónde va cada plataforma.
    // Aquí esos datos se convierten en cuerpos sólidos que no se mueven (staticGroup).
    const suelo = this.physics.add.staticGroup(), plats = this.physics.add.staticGroup();
    N.suelo.forEach((hay, columna) => { if (hay) suelo.create(columna * 64 + 32, 476 + 32, 'suelo'); });
    for (const p of N.plataformas) for (let i = 0; i < p.w; i++) {
      const s = plats.create(p.x + i * 64 + 32, p.y + 15, i === 0 ? 'plat_izq' : i === p.w - 1 ? 'plat_der' : 'plat_cen');
      s.body.checkCollision.down = s.body.checkCollision.left = s.body.checkCollision.right = false; // solo se pisa desde arriba
    }
    // <<<
    this.add.sprite(N.meta.x, N.meta.y - 60, 'objetos').setScale(120 / 64).play('meta');
    this.monedas = this.physics.add.group({ allowGravity: false });
    for (const m of N.monedas) this.monedas.create(m.x, m.y, 'objetos').setScale(46 / 64).play('moneda').setData('vale', 1);
    this.monedas.create(N.gema.x, N.gema.y, 'objetos').setScale(58 / 64).play('gema').setData('vale', 5);
    this.monedas.create(N.corazon.x, N.corazon.y, 'objetos').setScale(58 / 64).play('corazon').setData('vida', 1);

    this.enemigos = N.enemigos.map((e) => {
      const s = Forja.cuerpo(this.physics.add.sprite(e.x, 400, 'enemigo', 'caminar_0'), D.enemigo); s.play('enemigo:caminar'); s.setData({ min: e.min, max: e.max, dir: -1, vivo: true });
      this.physics.add.collider(s, suelo); return s;
    });
    this.heroe = Forja.cuerpo(this.physics.add.sprite(N.inicio.x, N.inicio.y - 90, 'heroe', 'quieto_0'), D.heroe);
    this.heroe.setData({ vidas: 3, inmune: 0, golpe: 0, gana: false, seguro: N.inicio.x });
    this.physics.add.collider(this.heroe, suelo); this.physics.add.collider(this.heroe, plats);
    this.physics.add.overlap(this.heroe, this.monedas, (h, m) => {
      if (m.getData('vida')) h.setData('vidas', Math.min(5, h.getData('vidas') + 1)); else this.puntos += m.getData('vale');
      this.chispas.explode(m.getData('vale') === 1 ? 6 : 14, m.x, m.y); Forja.sonar(this, m.getData('vale') === 1 ? 'moneda' : 'celebrar', 0.4); m.destroy(); this.pinta();
    });
    for (const e of this.enemigos) this.physics.add.overlap(this.heroe, e, () => this.choque(e));

    this.physics.world.setBounds(0, 0, N.ancho, 940);
    // >>> camara
    // La cámara no deja ver fuera del nivel y persigue al héroe con suavidad (0.12 = cuánto se acerca en cada cuadro).
    this.cameras.main.setBounds(0, 0, N.ancho, 540).startFollow(this.heroe, true, 0.12, 0.12, -96, 80);
    // <<<
    this.leer = Forja.controles(this); this.puntos = 0; this.inicio = this.time.now; this.enSuelo = true;
    this.texto = Forja.marcador(this); this.pinta();
  }

  pinta() { this.texto.setText('Monedas ' + this.puntos + '   Vidas ' + this.heroe.getData('vidas')); }

  choque(e) {
    const h = this.heroe; if (!e.getData('vivo') || h.getData('gana')) return;
    const pisa = h.body.velocity.y > 200 && h.y < e.y - 30;
    if (pisa || h.getData('golpe') > 0.12) {
      e.setData('vivo', false); e.body.enable = false; e.play('enemigo:morir'); this.tweens.add({ targets: e, alpha: 0, delay: 500, duration: 300 });
      this.chispas.explode(16, e.x, e.y - 50); this.puntos += 3; Forja.sonar(this, 'golpe'); if (pisa) h.setVelocityY(-520); this.pinta();
    } else if (h.getData('inmune') <= 0) this.herir();
  }

  herir() {
    const h = this.heroe; h.setData({ vidas: h.getData('vidas') - 1, inmune: 1.2 }); h.setVelocity(h.flipX ? 260 : -260, -420); Forja.sonar(this, 'dano', 0.6);
    if (h.getData('vidas') <= 0) { Forja.sonar(this, 'morir'); h.setData('vidas', 3); h.setPosition(N.inicio.x, 300); }
    this.pinta();
  }

  update(t, ms) {
    const dt = ms / 1000, h = this.heroe, c = this.leer();
    Forja.paralaje(this, this.cameras.main.scrollX);
    if (c.rayosX) Forja.rayosX(this);
    if (c.repetir) { this.scene.restart(); return; }
    // >>> patrulla
    // Enemigo que patrulla: camina hasta un límite y da la vuelta. Es la «inteligencia» más simple que existe.
    for (const e of this.enemigos) {
      if (!e.getData('vivo')) continue;
      let dir = e.getData('dir');
      if (e.x < e.getData('min')) dir = 1;
      if (e.x > e.getData('max')) dir = -1;
      e.setData('dir', dir); e.setVelocityX(70 * dir); e.setFlipX(dir < 0);
    }
    // <<<
    if (h.getData('gana')) { h.setVelocityX(0); h.play('heroe:celebrar', true); return; }
    h.setData('inmune', Math.max(0, h.getData('inmune') - dt)); h.setData('golpe', Math.max(0, h.getData('golpe') - dt));
    h.setAlpha(h.getData('inmune') > 0 && Math.floor(h.getData('inmune') * 14) % 2 ? 0.45 : 1);
    const piso = h.body.blocked.down || h.body.touching.down, agachado = c.abajo && piso;
    // >>> salto
    // La velocidad horizontal se acerca poco a poco a la deseada (aceleración). La gravedad tira hacia abajo todo el tiempo;
    // saltar es dar una velocidad hacia arriba de golpe. Si sueltas la tecla pronto, el salto se corta: salto corto.
    h.setVelocityX(Phaser.Math.Linear(h.body.velocity.x, agachado ? 0 : c.x * F.velocidad, Math.min(1, dt * (piso ? 12 : 6))));
    if (c.x) h.setFlipX(c.x < 0);
    if (c.salto && piso && !agachado) { h.setVelocityY(-F.salto); Forja.sonar(this, 'salto', 0.45); this.polvo.explode(5, h.x, h.y); }
    if (!c.salto && h.body.velocity.y < -260) h.setVelocityY(-260);
    // <<<
    if (piso && !this.enSuelo) this.polvo.explode(7, h.x, h.y);
    this.enSuelo = piso;
    if (c.golpeYa && h.getData('golpe') <= 0) { h.setData('golpe', 0.38); Forja.sonar(this, 'golpe'); }
    if (piso && N.suelo[Math.floor(h.x / 64)]) h.setData('seguro', h.x);
    if (h.y > 760) { h.setPosition(h.getData('seguro'), 300); h.setVelocity(0, 0); this.herir(); }
    if (Math.abs(h.x - N.meta.x) < 40 && piso) {
      h.setData('gana', true); Forja.sonar(this, 'celebrar', 0.6); this.chispas.explode(30, h.x, h.y - 90);
      Forja.aviso(this, '¡Meta!\n' + this.puntos + ' puntos en ' + Math.floor((this.time.now - this.inicio) / 1000) + ' s · R para repetir');
    }
    const v = Math.abs(h.body.velocity.x);
    h.play('heroe:' + (h.getData('inmune') > 0.9 ? 'dano' : h.getData('golpe') > 0 ? 'golpe' : !piso ? 'saltar' : agachado ? 'agachado' : v > 250 ? 'correr' : v > 40 ? 'caminar' : 'quieto'), true);
  }
}
Forja.iniciar(Plataformas, F.gravedad);
