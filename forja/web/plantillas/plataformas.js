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
    // Si en datos.js hay «oscilacion» (plataformas que flotan), las plataformas sí se mueven: grupo con física,
    // sin gravedad (no se caen) e inamovible (el héroe no las empuja).
    this.flotan = !!(D.oscilacion && D.oscilacion.amp > 0 && D.oscilacion.vel > 0);
    const suelo = this.physics.add.staticGroup(), plats = this.flotan ? this.physics.add.group({ allowGravity: false, immovable: true }) : this.physics.add.staticGroup();
    N.suelo.forEach((hay, columna) => { if (hay) suelo.create(columna * 64 + 32, 476 + 32, 'suelo'); });
    for (const p of N.plataformas) for (let i = 0; i < p.w; i++) {
      const s = plats.create(p.x + i * 64 + 32, p.y + 15, i === 0 ? 'plat_izq' : i === p.w - 1 ? 'plat_der' : 'plat_cen');
      s.body.checkCollision.down = s.body.checkCollision.left = s.body.checkCollision.right = false; // solo se pisa desde arriba
    }
    // <<<
    this.add.sprite(N.meta.x, N.meta.y - 60, 'objetos').setScale(120 / 64).play('meta');
    this.monedas = this.physics.add.group({ allowGravity: false });
    for (const m of N.monedas) this.monedas.create(m.x, m.y, 'objetos').setScale(46 / 64).play('moneda').setData('vale', Forja.regla('monedas.valor', 1));
    this.monedas.create(N.gema.x, N.gema.y, 'objetos').setScale(58 / 64).play('gema').setData({ vale: Forja.regla('gema.valor', 5), gema: true });
    this.totalMonedas = N.monedas.length; this.recogidas = 0; this.tieneGema = false;
    this.monedas.create(N.corazon.x, N.corazon.y, 'objetos').setScale(58 / 64).play('corazon').setData('vida', 1);
    // Plataformas que flotan: cada una se lleva sus losetas y lo que tiene encima (monedas, gema, corazón).
    // Cada plataforma tiene su fase: i · 2,4 rad (casi 140°), así ninguna sube y baja al mismo tiempo que otra.
    if (this.flotan) {
      const A = D.oscilacion.amp, w = D.oscilacion.vel;
      this.onda = N.plataformas.map((p, i) => {
        const fase = i * 2.4, dentro = (o) => o.x > p.x && o.x < p.x + p.w * 64;
        const piezas = [...plats.getChildren().filter((o) => dentro(o) && o.y === p.y + 15), ...this.monedas.getChildren().filter((o) => dentro(o) && o.y < p.y && o.y > p.y - 110)];
        for (const o of piezas) { o.setData('base', o.y).setY(o.y + A * Math.sin(fase)); o.body.setVelocityY(A * w * Math.cos(fase)); } // como en t = 0
        return { fase, piezas };
      });
      this.reloj = 0; this.physics.world.on('worldstep', this.oscilar, this);   // oscilar() corre en cada paso de la física
    }

    const cuantos = Forja.regla('enemigos.cuantos', 'todos');   // regla: ninguno | mitad | todos | doble
    const lista = cuantos === 'ninguno' ? [] : cuantos === 'mitad' ? N.enemigos.filter((_, i) => i % 2 === 0) : cuantos === 'doble' ? [...N.enemigos, ...N.enemigos.map((e) => ({ ...e, x: e.x + 90 }))] : N.enemigos;
    this.enemigos = lista.map((e) => {
      const s = Forja.cuerpo(this.physics.add.sprite(e.x, 400, 'enemigo', 'caminar_0'), D.enemigo); s.play('enemigo:caminar'); s.setData({ min: e.min, max: e.max, dir: -1, vivo: true });
      this.physics.add.collider(s, suelo); return s;
    });
    this.heroe = Forja.cuerpo(this.physics.add.sprite(N.inicio.x, N.inicio.y - 90, 'heroe', 'quieto_0'), D.heroe);
    this.heroe.setData({ vidas: Forja.regla('vidas.inicio', 3), inmune: 0, golpe: 0, gana: false, seguro: N.inicio.x });
    this.physics.add.collider(this.heroe, suelo); this.physics.add.collider(this.heroe, plats, (h, pieza) => { this.sobre = pieza; }); // sobre = la loseta que pisa
    this.physics.add.overlap(this.heroe, this.monedas, (h, m) => {
      if (m.getData('vida')) h.setData('vidas', Math.min(Forja.regla('vidas.maximo', 5), h.getData('vidas') + 1)); else { this.puntos += m.getData('vale'); if (m.getData('gema')) this.tieneGema = true; else this.recogidas++; }
      this.chispas.explode(m.getData('vale') === 1 ? 6 : 14, m.x, m.y); Forja.sonar(this, m.getData('vale') === 1 ? 'moneda' : 'celebrar', 0.4); m.destroy(); this.pinta();
    });
    for (const e of this.enemigos) this.physics.add.overlap(this.heroe, e, () => this.choque(e));

    this.physics.world.setBounds(0, 0, N.ancho, 940);
    // >>> camara
    // La cámara no deja ver fuera del nivel y persigue al héroe con suavidad (0.12 = cuánto se acerca en cada cuadro).
    const sigue = Forja.regla('camara.suavidad', 0.12);   // regla: qué tan rápido te sigue la cámara
    this.cameras.main.setBounds(0, 0, N.ancho, 540).startFollow(this.heroe, true, sigue, sigue, -96, 80);
    // <<<
    this.leer = Forja.controles(this); this.puntos = 0; this.inicio = this.time.now; this.enSuelo = true;
    this.texto = Forja.marcador(this); this.pinta();
    const deClase = [];
    if (D.ajustesDeClase && /gravedad|salto|velocidad/.test(D.ajustesDeClase)) deClase.push('gravedad ' + F.gravedad + ' · salto ' + F.salto + ' · velocidad ' + F.velocidad);
    if (D.ajustesDeClase && D.oscilacion) deClase.push('plataformas ' + (this.flotan ? 'que flotan' : 'quietas') + ': A ' + D.oscilacion.amp + ' px · ω ' + String(D.oscilacion.vel).replace('.', ','));
    if (deClase.length) { const av = Forja.aviso(this, 'Física de tu clase\n' + deClase.join('\n')); this.time.delayedCall(3000, () => av.destroy()); }
  }

  pinta() { this.texto.setText('Monedas ' + this.puntos + '   Vidas ' + this.heroe.getData('vidas')); }

  // >>> oscilar
  // Plataformas que flotan: la altura de cada pieza sigue una función seno.
  //     y = base + A · sin(ω · t + fase)
  // A (amplitud) = cuántos píxeles sube y baja desde su altura de base.
  // ω (omega, en radianes por segundo) = qué tan rápido: una subida y bajada completa tarda 2π / ω segundos.
  // fase = desfase: en qué punto de la onda empieza cada plataforma, para que no se muevan todas igual.
  // La «y» no se cambia a mano: se le da la velocidad que pide la función, que es su derivada A · ω · cos(ω · t + fase).
  // Así la física sabe que la plataforma se mueve y lleva al héroe encima sin que la atraviese ni tiemble.
  // Corre en cada paso de la física (60 por segundo, dt = 1/60 s), no en cada cuadro: igual de suave aunque el equipo vaya lento.
  oscilar(dt) {
    const A = D.oscilacion.amp, w = D.oscilacion.vel, t = (this.reloj += dt);   // t = segundos desde que empezó el nivel
    for (const p of this.onda) for (const o of p.piezas) {
      if (!o.body) continue;                                                     // esa moneda ya la recogiste
      const y = o.getData('base') + A * Math.sin(w * t + p.fase);                // dónde debería estar ahora
      const v = A * w * Math.cos(w * t + p.fase);                                // la derivada: qué tan rápido sube o baja
      o.body.setVelocityY(v + (y - o.body.center.y) * 8);                        // + un empujoncito si se desvió un poco
    }
    // Si el héroe está parado en una pieza que flota, viaja con ella: le damos su misma velocidad vertical.
    // (Sin esto, con A · ω² mayor que la gravedad la plataforma bajaría más rápido de lo que cae el héroe y se despegaría.)
    if (this.sobre?.body) this.heroe.body.setVelocityY(this.sobre.body.velocity.y);
    this.sobre = null;
  }
  // <<<

  choque(e) {
    const h = this.heroe; if (!e.getData('vivo') || h.getData('gana')) return;
    const pisa = Forja.regla('enemigos.pisar', true) && h.body.velocity.y > 200 && h.y < e.y - 30;
    if (pisa || (Forja.regla('golpe.permitido', true) && h.getData('golpe') > 0.12)) {
      e.setData('vivo', false); e.body.enable = false; e.play('enemigo:morir'); this.tweens.add({ targets: e, alpha: 0, delay: 500, duration: 300 });
      this.chispas.explode(16, e.x, e.y - 50); this.puntos += Forja.regla('enemigos.puntos', 3); Forja.sonar(this, 'golpe'); if (pisa) h.setVelocityY(-520); this.pinta();
    } else if (h.getData('inmune') <= 0) this.herir();
  }

  herir() {
    const h = this.heroe; h.setData({ vidas: h.getData('vidas') - Forja.regla('dano.golpe', 1), inmune: Forja.regla('jugador.inmunidad', 1.2) }); h.setVelocity(h.flipX ? 260 : -260, -420); Forja.sonar(this, 'dano', 0.6);
    if (h.getData('vidas') <= 0) {
      Forja.sonar(this, 'morir');
      if (Forja.regla('resultado.alMorir', 'reiniciar') === 'fin') { this.perdio = true; h.setData('gana', true); h.play('heroe:morir'); Forja.aviso(this, 'Sin vidas\nR para repetir'); this.pinta(); return; }
      h.setData('vidas', Forja.regla('vidas.inicio', 3)); h.setPosition(N.inicio.x, 300);
    }
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
      e.setData('dir', dir); e.setVelocityX(Forja.regla('enemigos.velocidad', 70) * dir); e.setFlipX(dir < 0);
    }
    // <<<
    if (h.getData('gana')) { h.setVelocityX(0); if (!this.perdio) h.play('heroe:celebrar', true); return; }
    const limite = Forja.regla('resultado.tiempo', 0);   // regla: 0 = sin límite; si no, segundos para llegar a la meta
    if (limite && (this.time.now - this.inicio) / 1000 > limite) { this.perdio = true; h.setData('gana', true); h.play('heroe:morir'); Forja.aviso(this, 'Se acabó el tiempo\nR para repetir'); return; }
    h.setData('inmune', Math.max(0, h.getData('inmune') - dt)); h.setData('golpe', Math.max(0, h.getData('golpe') - dt));
    h.setAlpha(h.getData('inmune') > 0 && Math.floor(h.getData('inmune') * 14) % 2 ? 0.45 : 1);
    const piso = h.body.blocked.down || h.body.touching.down, agachado = c.abajo && piso;
    // >>> salto
    // La velocidad horizontal se acerca poco a poco a la deseada (aceleración). La gravedad tira hacia abajo todo el tiempo;
    // saltar es dar una velocidad hacia arriba de golpe. Si sueltas la tecla pronto, el salto se corta: salto corto.
    h.setVelocityX(Phaser.Math.Linear(h.body.velocity.x, agachado ? 0 : c.x * F.velocidad, Math.min(1, dt * (piso ? 12 : 6))));
    if (c.x) h.setFlipX(c.x < 0);
    if (c.salto && piso && !agachado) { h.setVelocityY(-F.salto); Forja.sonar(this, 'salto', 0.45); this.polvo.explode(5, h.x, h.y); }
    if (piso) this.saltosAire = 0;
    if (c.saltoYa && !piso && this.saltosAire < Forja.regla('salto.aire', 0)) { this.saltosAire++; h.setVelocityY(-F.salto * 0.85); Forja.sonar(this, 'salto', 0.45); this.polvo.explode(5, h.x, h.y); }   // regla: saltos extra en el aire
    if (Forja.regla('salto.variable', true) && !c.salto && h.body.velocity.y < -260) h.setVelocityY(-260);
    // <<<
    if (piso && !this.enSuelo) this.polvo.explode(7, h.x, h.y);
    this.enSuelo = piso;
    if (Forja.regla('golpe.permitido', true) && c.golpeYa && h.getData('golpe') <= 0) { h.setData('golpe', 0.38); Forja.sonar(this, 'golpe'); }
    if (piso && N.suelo[Math.floor(h.x / 64)]) h.setData('seguro', h.x);
    if (h.y > 760) {   // regla: qué pasa si caes al vacío
      const cae = Forja.regla('caida.castigo', 'vida');
      h.setPosition(cae === 'inicio' ? N.inicio.x : h.getData('seguro'), 300); h.setVelocity(0, 0); if (cae !== 'nada') this.herir();
    }
    const pide = Forja.regla('meta.requiere', 'nada');   // regla: qué hace falta para que la meta cuente
    const falta = pide === 'gema' ? (this.tieneGema ? '' : 'la gema') : pide === 'mitad' ? (this.recogidas >= Math.ceil(this.totalMonedas / 2) ? '' : 'la mitad de las monedas') : pide === 'todas' ? (this.recogidas >= this.totalMonedas ? '' : 'todas las monedas') : '';
    if (Math.abs(h.x - N.meta.x) < 40 && piso && falta && !this.avisoFalta) { this.avisoFalta = Forja.aviso(this, 'Te falta ' + falta); this.time.delayedCall(1600, () => { this.avisoFalta.destroy(); this.avisoFalta = null; }); }
    if (Math.abs(h.x - N.meta.x) < 40 && piso && !falta) {
      h.setData('gana', true); Forja.sonar(this, 'celebrar', 0.6); this.chispas.explode(30, h.x, h.y - 90);
      const seg = Math.floor((this.time.now - this.inicio) / 1000), mide = Forja.regla('resultado.mide', 'ambos');   // regla: qué número se muestra al ganar
      Forja.aviso(this, '¡Meta!\n' + (mide === 'puntos' ? this.puntos + ' puntos' : mide === 'tiempo' ? seg + ' s' : this.puntos + ' puntos en ' + seg + ' s') + ' · R para repetir');
    }
    const v = Math.abs(h.body.velocity.x);
    h.play('heroe:' + (h.getData('inmune') > 0.9 ? 'dano' : h.getData('golpe') > 0 ? 'golpe' : !piso ? 'saltar' : agachado ? 'agachado' : v > 250 ? 'correr' : v > 40 ? 'caminar' : 'quieto'), true);
  }
}
Forja.iniciar(Plataformas, F.gravedad);
