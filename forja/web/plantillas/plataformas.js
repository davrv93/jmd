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
    this.metaSpr = this.add.sprite(N.meta.x, N.meta.y - 60, 'objetos').setScale(120 / 64).play('meta').setDepth(1);
    this.monedas = this.physics.add.group({ allowGravity: false });
    for (const m of N.monedas) this.monedas.create(m.x, m.y, 'objetos').setScale(46 / 64).play('moneda').setData('vale', Forja.regla('monedas.valor', 1)).setDepth(1);
    this.monedas.create(N.gema.x, N.gema.y, 'objetos').setScale(58 / 64).play('gema').setData({ vale: Forja.regla('gema.valor', 5), gema: true }).setDepth(1);
    this.totalMonedas = N.monedas.length; this.recogidas = 0; this.tieneGema = false;
    this.monedas.create(N.corazon.x, N.corazon.y, 'objetos').setScale(58 / 64).play('corazon').setData('vida', 1).setDepth(1);
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
      const s = Forja.cuerpo(this.physics.add.sprite(e.x, 400, 'enemigo', 'caminar_0'), D.enemigo).setDepth(2); s.play('enemigo:caminar'); s.setData({ min: e.min, max: e.max, dir: -1, vivo: true });
      this.physics.add.collider(s, suelo); return s;
    });
    this.heroe = Forja.cuerpo(this.physics.add.sprite(N.inicio.x, N.inicio.y - 90, 'heroe', 'quieto_0'), D.heroe).setDepth(3);
    this.heroe.setData({ vidas: Forja.regla('vidas.inicio', 3), inmune: 0, golpe: 0, gana: false, seguro: N.inicio.x });
    this.physics.add.collider(this.heroe, suelo); this.physics.add.collider(this.heroe, plats, (h, pieza) => { this.sobre = pieza; }); // sobre = la loseta que pisa
    this.physics.add.overlap(this.heroe, this.monedas, (h, m) => {
      if (m.getData('vida')) h.setData('vidas', Math.min(Forja.regla('vidas.maximo', 5), h.getData('vidas') + 1)); else { this.puntos += m.getData('vale'); if (m.getData('gema')) this.tieneGema = true; else this.recogidas++; }
      this.chispas.explode(m.getData('vale') === 1 ? 6 : 14, m.x, m.y); Forja.sonar(this, m.getData('vale') === 1 ? 'moneda' : 'celebrar', 0.4); m.destroy(); this.pinta();
    });
    for (const e of this.enemigos) this.physics.add.overlap(this.heroe, e, () => this.choque(e));
    this.tGolpe = Forja.dura('heroe', 'golpe'); this.tDano = Forja.dura('heroe', 'dano');   // el golpe y el daño duran lo que dura su dibujo

    this.physics.world.setBounds(0, 0, N.ancho, 940);
    // >>> camara
    // La cámara no deja ver fuera del nivel y persigue al héroe con suavidad (0.12 = cuánto se acerca en cada cuadro).
    const sigue = Forja.regla('camara.suavidad', 0.12);   // regla: qué tan rápido te sigue la cámara
    this.cameras.main.setBounds(0, 0, N.ancho, 540).startFollow(this.heroe, true, sigue, sigue, -96, 80);
    // <<<
    this.arte(suelo, plats);
    this.leer = Forja.controles(this); this.puntos = 0; this.inicio = this.time.now; this.enSuelo = true;
    this.texto = Forja.marcador(this); this.pinta();
    const deClase = [];
    if (D.ajustesDeClase && /gravedad|salto|velocidad/.test(D.ajustesDeClase)) deClase.push('gravedad ' + F.gravedad + ' · salto ' + F.salto + ' · velocidad ' + F.velocidad);
    if (D.ajustesDeClase && D.oscilacion) deClase.push('plataformas ' + (this.flotan ? 'que flotan' : 'quietas') + ': A ' + D.oscilacion.amp + ' px · ω ' + String(D.oscilacion.vel).replace('.', ','));
    if (deClase.length) { const av = Forja.aviso(this, 'Física de tu clase\n' + deClase.join('\n')); this.time.delayedCall(3000, () => av.destroy()); }
  }

  // ARTE: lo que solo se ve (no cambia la física ni las cajas de choque). Losetas volteadas al azar para que no se note el
  // sello repetido, cantos en los barrancos, matas y flores sobre el pasto, sombras bajo los pies, brillo en lo que se
  // recoge, partículas de ambiente, primer plano y viñeta. Todo sale de la paleta del escenario que elegiste.
  arte(suelo, plats) {
    const P = Forja.paleta(this), r = azar(D.semilla * 5 + 2), luz = Forja.luzPersonaje(this);
    Forja.decorados(this);
    for (const s of [this.heroe, ...this.enemigos]) s.setTint(luz);
    suelo.getChildren().forEach((s) => s.setFlipX(r() < 0.5));
    N.suelo.forEach((hay, c) => {
      if (!hay) return;
      if (c > 0 && !N.suelo[c - 1]) this.add.image(c * 64, 476, 'canto').setOrigin(0, 0).setDepth(0.1);
      if (c < N.suelo.length - 1 && !N.suelo[c + 1]) this.add.image(c * 64 + 64, 476, 'canto').setOrigin(1, 0).setFlipX(true).setDepth(0.1);
      for (let k = 0; k < 2; k++) if (r() < 0.5) this.add.image(c * 64 + 10 + r() * 44, 479, 'deco', 'deco:' + Math.floor(r() * 8)).setOrigin(0.5, 1).setDepth(0.2).setScale(0.75 + r() * 0.5).setFlipX(r() < 0.5);
    });
    // ¿dónde está el piso debajo de (x, y)? El suelo de esa columna o la plataforma más alta que quede por debajo.
    const piezas = plats.getChildren();
    const piso = (x, y) => {
      let mejor = N.suelo[Math.floor(x / 64)] ? 476 : null;
      for (const p of piezas) { const top = p.body ? p.body.top : p.y - 15; if (Math.abs(x - p.x) <= 33 && top >= y - 6 && (mejor === null || top < mejor)) mejor = top; }
      return mejor;
    };
    Forja.sombra(this, this.heroe, { piso, prof: 0.5 });
    for (const e of this.enemigos) Forja.sombra(this, e, { piso, prof: 0.5 });
    for (const m of this.monedas.getChildren()) {
      Forja.sombra(this, m, { piso, prof: 0.5, ancho: m.displayWidth * 0.55, alfa: 0.3, pie: (s) => s.y + s.displayHeight * 0.3 });
      Forja.halo(this, m, m.getData('gema') ? 0x8fe4ff : m.getData('vida') ? 0xff7aa8 : 0xffd25a, m.getData('vale') === 1 ? 64 : 120, { alfa: P.noche ? 0.5 : 0.32, prof: 0.8 });
    }
    Forja.halo(this, this.metaSpr, 0xfff0b8, 240, { alfa: P.noche ? 0.45 : 0.3, prof: 0.4, late: 0.15 });
    if (P.noche) Forja.halo(this, this.heroe, P.hex(P.acento), 320, { alfa: 0.14, late: 0.06, dy: -50, prof: 0.45 });   // de noche, el héroe lleva su propia luz
    Forja.ambiente(this, { x: 0, y: 40, w: N.ancho, h: 430 }, { cuantas: 14, prof: 4 });
    Forja.primerPlano(this);
    Forja.vineta(this, P.noche ? 0.5 : 0.3);
    Forja.vigilar(this);
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
    // Pisotón: vienes cayendo y tus pies estaban por encima de su cintura en el paso anterior (no vale «pisar» de lado).
    const pisa = Forja.regla('enemigos.pisar', true) && h.body.velocity.y > 120 && h.body.prev.y + h.body.height <= e.body.y + e.body.height * 0.5;
    // El golpe solo hace daño en el tramo del dibujo en que el brazo sale (no al tomar impulso ni al recoger), y hacia donde miras.
    const g = this.tGolpe - h.getData('golpe'), delante = Math.sign(e.x - h.x) === (h.flipX ? -1 : 1);
    const golpea = Forja.regla('golpe.permitido', true) && h.getData('golpe') > 0 && g > this.tGolpe * 0.2 && g < this.tGolpe * 0.8 && delante;
    if (pisa || golpea) {
      e.setData('vivo', false); e.body.enable = false; e.play('enemigo:morir'); this.tweens.add({ targets: e, alpha: 0, delay: Forja.dura('enemigo', 'morir') * 1000, duration: 300 });
      if (pisa) this.tweens.add({ targets: e, scaleY: e.scaleY * 0.6, duration: 90, yoyo: true });   // aplastado
      else e.x += Math.sign(e.x - h.x) * 14;                                                         // el golpe lo empuja
      this.chispas.explode(16, e.x, e.y - 50); this.puntos += Forja.regla('enemigos.puntos', 3); Forja.sonar(this, 'golpe'); if (pisa) h.setVelocityY(-Math.max(420, F.salto * 0.6)); this.pinta();
    } else if (h.getData('inmune') <= 0) this.herir(e.x);
  }

  // desde = x de quien te golpeó: el empujón va al lado contrario. Sin «desde» (una caída) no hay empujón.
  herir(desde) {
    const h = this.heroe; h.setData({ vidas: h.getData('vidas') - Forja.regla('dano.golpe', 1), inmune: Forja.regla('jugador.inmunidad', 1.2), golpe: 0 }); Forja.sonar(this, 'dano', 0.6);
    if (desde !== undefined) { const lado = Math.sign(h.x - desde) || (h.flipX ? 1 : -1); h.setVelocity(lado * 260, -420); this.empujon = 0.3; this.cameras.main.shake(120, 0.005); }
    if (h.getData('vidas') <= 0) {
      Forja.sonar(this, 'morir');
      if (Forja.regla('resultado.alMorir', 'reiniciar') === 'fin') { this.perdio = true; h.setData('gana', true); h.play('heroe:morir'); Forja.aviso(this, 'Sin vidas\nR para repetir'); this.pinta(); return; }
      h.setData('vidas', Forja.regla('vidas.inicio', 3)); h.setPosition(N.inicio.x, 300); h.setVelocity(0, 0);
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
      Forja.pose(e, 'andar', { v: Forja.rapidez(e, 'x'), max: 160 });   // los pasos al ritmo de lo que avanza
    }
    // <<<
    if (h.getData('gana')) { h.setVelocityX(0); if (!this.perdio && h.body.blocked.down) Forja.pose(h, 'celebrar'); return; }
    const limite = Forja.regla('resultado.tiempo', 0);   // regla: 0 = sin límite; si no, segundos para llegar a la meta
    if (limite && (this.time.now - this.inicio) / 1000 > limite) { this.perdio = true; h.setData('gana', true); h.play('heroe:morir'); Forja.aviso(this, 'Se acabó el tiempo\nR para repetir'); return; }
    h.setData('inmune', Math.max(0, h.getData('inmune') - dt)); h.setData('golpe', Math.max(0, h.getData('golpe') - dt)); this.empujon = Math.max(0, (this.empujon || 0) - dt);
    h.setAlpha(h.getData('inmune') > 0 && Math.floor(h.getData('inmune') * 14) % 2 ? 0.45 : 1);
    const piso = h.body.blocked.down || h.body.touching.down, agachado = c.abajo && piso;
    // >>> salto
    // La velocidad horizontal se acerca poco a poco a la deseada (aceleración). La gravedad tira hacia abajo todo el tiempo;
    // saltar es dar una velocidad hacia arriba de golpe. Si sueltas la tecla pronto, el salto se corta: salto corto.
    const frena = piso && h.getData('golpe') > 0 ? 0.35 : 1;                     // golpe en el suelo: casi se planta (el dibujo del golpe no corre)
    if (this.empujon <= 0) h.setVelocityX(Phaser.Math.Linear(h.body.velocity.x, agachado ? 0 : c.x * F.velocidad * frena, Math.min(1, dt * (piso ? 12 : 6))));   // tras un golpe, el empujón manda un instante
    if (c.x && this.empujon <= 0) h.setFlipX(c.x < 0);
    if (c.salto && piso && !agachado) { h.setVelocityY(-F.salto); Forja.sonar(this, 'salto', 0.45); this.polvo.explode(5, h.x, h.y); }
    if (piso) this.saltosAire = 0;
    if (c.saltoYa && !piso && this.saltosAire < Forja.regla('salto.aire', 0)) { this.saltosAire++; h.setVelocityY(-F.salto * 0.85); Forja.sonar(this, 'salto', 0.45); this.polvo.explode(5, h.x, h.y); }   // regla: saltos extra en el aire
    if (Forja.regla('salto.variable', true) && !c.salto && h.body.velocity.y < -260) h.setVelocityY(-260);
    // <<<
    if (piso && !this.enSuelo) this.polvo.explode(7, h.x, h.y);
    this.enSuelo = piso;
    const aturdido = h.getData('inmune') > 0 && Forja.regla('jugador.inmunidad', 1.2) - h.getData('inmune') < this.tDano;   // mientras se ve el golpe recibido, no atacas
    if (Forja.regla('golpe.permitido', true) && c.golpeYa && h.getData('golpe') <= 0 && !aturdido) { h.setData('golpe', this.tGolpe); Forja.sonar(this, 'golpe'); Forja.pose(h, 'golpe', { reinicia: true }); }
    if (piso && N.suelo[Math.floor(h.x / 64)]) h.setData('seguro', h.x);
    if (h.y > 760) {   // regla: qué pasa si caes al vacío
      const cae = Forja.regla('caida.castigo', 'vida');
      h.setPosition(cae === 'inicio' ? N.inicio.x : h.getData('seguro'), 300); h.setVelocity(0, 0); if (cae !== 'nada') this.herir();
      if (h.getData('gana')) return;
    }
    const pide = Forja.regla('meta.requiere', 'nada');   // regla: qué hace falta para que la meta cuente
    const falta = pide === 'gema' ? (this.tieneGema ? '' : 'la gema') : pide === 'mitad' ? (this.recogidas >= Math.ceil(this.totalMonedas / 2) ? '' : 'la mitad de las monedas') : pide === 'todas' ? (this.recogidas >= this.totalMonedas ? '' : 'todas las monedas') : '';
    if (Math.abs(h.x - N.meta.x) < 40 && piso && falta && !this.avisoFalta) { this.avisoFalta = Forja.aviso(this, 'Te falta ' + falta); this.time.delayedCall(1600, () => { this.avisoFalta.destroy(); this.avisoFalta = null; }); }
    if (Math.abs(h.x - N.meta.x) < 40 && piso && !falta) {
      h.setData('gana', true); Forja.sonar(this, 'celebrar', 0.6); this.chispas.explode(30, h.x, h.y - 90);
      const seg = Math.floor((this.time.now - this.inicio) / 1000), mide = Forja.regla('resultado.mide', 'ambos');   // regla: qué número se muestra al ganar
      Forja.aviso(this, '¡Meta!\n' + (mide === 'puntos' ? this.puntos + ' puntos' : mide === 'tiempo' ? seg + ' s' : this.puntos + ' puntos en ' + seg + ' s') + ' · R para repetir');
    }
    // >>> pose
    // La animación sale del estado del cuerpo: daño (lo que dura su dibujo), golpe (entero, una vez), en el aire (según suba o
    // baje), agachado, o andando con pasos al ritmo de la rapidez real.
    const dano = Forja.regla('jugador.inmunidad', 1.2) - h.getData('inmune') < this.tDano && h.getData('inmune') > 0;
    Forja.pose(h, dano ? 'dano' : h.getData('golpe') > 0 ? 'golpe' : !piso ? 'aire' : agachado ? 'agachado' : 'andar', { v: Forja.rapidez(h, 'x'), max: F.velocidad, vy: h.body.velocity.y, salto: F.salto });
    // <<<
  }
}
Forja.iniciar(Plataformas, F.gravedad);
