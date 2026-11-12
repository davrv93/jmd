// comun.js · lo que comparten las cuatro plantillas de Forja (JMD Learning). Phaser 4.
// DATOS viene de datos.js: lo generó el estudio con las medidas, la física y el nivel de TU personaje.
const D = window.DATOS;
const EN_ESTUDIO = window.FORJA_ASSETS || null;             // dentro del estudio los recursos llegan en memoria
const recurso = (n) => (EN_ESTUDIO ? EN_ESTUDIO[n] : 'assets/' + n);
const TACTO = (window.TACTO = window.TACTO || {});           // botones táctiles de index.html

// Números al azar que se repiten con la misma semilla: el nivel sale igual para todos.
function azar(semilla) {
  let s = (semilla >>> 0) || 1;
  return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const Forja = {
  // --- RECURSOS: una hoja de sprites es UNA imagen con todos los cuadros; el atlas (JSON) dice dónde está cada uno.
  precargar(escena, imagenes = []) {
    for (const k of ['heroe', 'enemigo', 'objetos']) escena.load.atlas(k, recurso(k + '.png'), EN_ESTUDIO ? EN_ESTUDIO[k + '.json'] : 'assets/' + k + '.json');
    for (const k of imagenes) escena.load.image(k, recurso(k + '.png'));
    for (const s of D.sonidos) escena.load.audio(s, EN_ESTUDIO ? { type: 'wav', url: recurso('sonidos/' + s + '.wav') } : recurso('sonidos/' + s + '.wav'));
  },

  // --- ANIMACIÓN: cada animación es una lista de cuadros del atlas que se pasan a cierta velocidad (fps).
  animaciones(escena) {
    for (const clave of ['heroe', 'enemigo']) for (const a of D[clave].animaciones) {
      escena.anims.create({ key: clave + ':' + a.clave, frames: escena.anims.generateFrameNames(clave, { prefix: a.clave + '_', start: 0, end: a.cuadros - 1 }), frameRate: a.fps, repeat: a.repetir });
    }
    for (const o of D.objetos) escena.anims.create({ key: o, frames: escena.anims.generateFrameNames('objetos', { prefix: o + '_', start: 0, end: 5 }), frameRate: 9, repeat: -1 });
  },

  // --- COLISIÓN: la caja de choque es más pequeña que el dibujo. Se calcula con las medidas reales del personaje.
  cuerpo(sprite, p, alto = 150, pie = false) {
    const k = alto / p.px, w = Math.max(30, alto * p.relAncho * 0.6) / k, h = Math.max(40, alto * p.relAlto * 0.92) / k;
    sprite.setScale(k).setOrigin(0.5, 0.96);
    if (pie) sprite.body.setSize(w * 0.8, h * 0.28).setOffset((p.px - w * 0.8) / 2, p.px * 0.96 - h * 0.28); // vista desde arriba: solo chocan los pies
    else sprite.body.setSize(w, h).setOffset((p.px - w) / 2, p.px * 0.96 - h);
    return sprite;
  },

  // --- ENTRADA: teclado y botones táctiles se leen igual. Devuelve una función que se llama en cada cuadro.
  controles(escena) {
    const k = escena.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,SPACE,X,A,D,W,S,R,V');
    const antes = {}, J = Phaser.Input.Keyboard.JustDown;
    const recien = (n) => { const ya = !!TACTO[n] && !antes[n]; antes[n] = !!TACTO[n]; return ya; };
    return () => ({
      x: (k.RIGHT.isDown || k.D.isDown || TACTO.der ? 1 : 0) - (k.LEFT.isDown || k.A.isDown || TACTO.izq ? 1 : 0),
      y: (k.DOWN.isDown || k.S.isDown || TACTO.abajo ? 1 : 0) - (k.UP.isDown || k.W.isDown || TACTO.arriba ? 1 : 0),
      salto: k.UP.isDown || k.W.isDown || k.SPACE.isDown || !!TACTO.salto,
      saltoYa: J(k.UP) | J(k.W) | J(k.SPACE) | recien('salto'),
      golpeYa: J(k.X) | recien('golpe'),
      abajo: k.DOWN.isDown || k.S.isDown || !!TACTO.abajo,
      repetir: J(k.R), rayosX: J(k.V) | recien('rayosx'),
    });
  },

  // --- EFECTOS: partículas. Una «mota» blanca teñida sirve de polvo y de chispa.
  efectos(escena) {
    if (!escena.textures.exists('mota')) { const g = escena.make.graphics({ x: 0, y: 0 }, false); g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8); g.generateTexture('mota', 16, 16); g.destroy(); }
    const e = (tinte, vel, vida) => escena.add.particles(0, 0, 'mota', { speed: { min: vel * 0.3, max: vel }, angle: { min: 200, max: 340 }, lifespan: vida, scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 }, gravityY: 520, tint: tinte, emitting: false }).setDepth(900);
    escena.polvo = e(0xffffff, 130, 380); escena.chispas = e(0xffd94a, 240, 480);
  },

  sonar(escena, nombre, volumen = 0.5) { if (escena.cache.audio.exists(nombre)) escena.sound.play(nombre, { volume: volumen }); },

  marcador(escena) {
    return escena.add.text(16, 14, '', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff', backgroundColor: 'rgba(15,12,24,.62)', padding: { x: 12, y: 6 } }).setScrollFactor(0).setDepth(1000);
  },
  aviso(escena, texto) {
    return escena.add.text(480, 250, texto, { fontFamily: 'system-ui, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#c6ff4a', backgroundColor: 'rgba(15,12,24,.78)', padding: { x: 24, y: 16 }, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
  },

  // --- RAYOS X (tecla V): muestra lo que el juego «piensa»: cajas de choque, estados, caminos.
  rayosX(escena) {
    const m = escena.physics.world;
    escena.verX = !escena.verX; m.drawDebug = escena.verX;
    if (escena.verX && !m.debugGraphic) m.createDebugGraphic();
    if (m.debugGraphic) { m.debugGraphic.clear(); m.debugGraphic.setVisible(escena.verX).setDepth(950); }
    if (escena.capaX) escena.capaX.clear();
    return escena.verX;
  },

  fondo(escena) { // cielo fijo y tres capas que se mueven a distinta velocidad: eso es el paralaje
    escena.add.image(0, 0, 'cielo').setOrigin(0).setScrollFactor(0).setDepth(-10);
    escena.capas = ['capa0', 'capa1', 'capa2'].map((k, i) => escena.add.tileSprite(0, 0, 960, 540, k).setOrigin(0).setScrollFactor(0).setDepth(-9 + i));
  },
  paralaje(escena, x) { escena.capas.forEach((c, i) => { c.tilePositionX = x * [0.12, 0.3, 0.55][i]; }); },

  iniciar(Escena, gravedad = 0) {
    window.juego = new Phaser.Game({
      type: Phaser.AUTO, parent: 'juego', width: 960, height: 540, backgroundColor: '#14111c',
      physics: { default: 'arcade', arcade: { gravity: { y: gravedad }, debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: Escena,
    });
  },
};
