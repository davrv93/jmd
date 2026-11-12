// Forja · exportación completa: ZIP con proyecto Phaser 4 listo para abrir, video corto y modelo GLB.
import * as THREE from 'three';
import { zip, pngDeLienzo } from './zip.js';
import { wav } from './sonido.js';
import { recorte } from './escenario.js';
import { nivel as crearNivel, fisicaJugable } from './nivel.js';

const PHASER = 'https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.min.js';

function codigoJuego(d) {
  return `// ${d.nombre} · proyecto generado por Forja (JMD Learning). Phaser 4. Edita con libertad: es tu juego.
const NIVEL = ${JSON.stringify(d.nivel)};
const FISICA = ${JSON.stringify(d.fisica)};
const HEROE = ${JSON.stringify(d.heroe)};
const ENEMIGO = ${JSON.stringify(d.enemigo)};
const SONIDOS = ${JSON.stringify(d.sonidos)};
const TAM = 150; // alto en pantalla de un cuadro del personaje

class Juego extends Phaser.Scene {
  preload() {
    this.load.setPath('assets/');
    this.load.atlas(HEROE.clave, HEROE.clave + '.png', HEROE.clave + '.json');
    this.load.atlas('enemigo', 'enemigo.png', 'enemigo.json');
    this.load.atlas('objetos', 'objetos.png', 'objetos.json');
    for (const k of ['cielo', 'capa0', 'capa1', 'capa2', 'suelo', 'plat_izq', 'plat_cen', 'plat_der']) this.load.image(k, k + '.png');
    for (const s of SONIDOS) this.load.audio(s, 'sonidos/' + s + '.wav');
  }

  animaciones(p, clave) {
    for (const a of p.animaciones) this.anims.create({ key: clave + ':' + a.clave, frames: this.anims.generateFrameNames(clave, { prefix: a.clave + '_', start: 0, end: a.cuadros - 1 }), frameRate: a.fps, repeat: a.repetir });
  }

  cuerpo(sprite, p) { // caja de choque a partir de las medidas reales del personaje dentro del cuadro
    const w = Math.max(30, TAM * p.relAncho * 0.6) / (TAM / p.px), h = Math.max(40, TAM * p.relAlto * 0.92) / (TAM / p.px);
    sprite.setScale(TAM / p.px).setOrigin(0.5, 0.96);
    sprite.body.setSize(w, h).setOffset((p.px - w) / 2, p.px * 0.96 - h);
  }

  create() {
    const W = 960, H = 540;
    this.add.image(0, 0, 'cielo').setOrigin(0).setScrollFactor(0);
    this.capas = ['capa0', 'capa1', 'capa2'].map((k) => this.add.tileSprite(0, 0, W, H, k).setOrigin(0).setScrollFactor(0));
    const suelo = this.physics.add.staticGroup(), plats = this.physics.add.staticGroup();
    NIVEL.suelo.forEach((hay, c) => { if (hay) suelo.create(c * 64 + 32, 476 + 32, 'suelo'); });
    for (const p of NIVEL.plataformas) for (let i = 0; i < p.w; i++) {
      const s = plats.create(p.x + i * 64 + 32, p.y + 15, i === 0 ? 'plat_izq' : i === p.w - 1 ? 'plat_der' : 'plat_cen');
      s.body.checkCollision.down = s.body.checkCollision.left = s.body.checkCollision.right = false; // se atraviesan desde abajo
    }
    this.animaciones(HEROE, HEROE.clave); this.animaciones(ENEMIGO, 'enemigo');
    for (const o of ['moneda', 'gema', 'corazon', 'meta']) this.anims.create({ key: o, frames: this.anims.generateFrameNames('objetos', { prefix: o + '_', start: 0, end: 5 }), frameRate: 9, repeat: -1 });

    this.add.sprite(NIVEL.meta.x, NIVEL.meta.y - 60, 'objetos').setScale(120 / 64).play('meta');
    this.monedas = this.physics.add.group({ allowGravity: false });
    for (const m of NIVEL.monedas) this.monedas.create(m.x, m.y, 'objetos').setScale(46 / 64).play('moneda').setData('vale', 1);
    this.monedas.create(NIVEL.gema.x, NIVEL.gema.y, 'objetos').setScale(58 / 64).play('gema').setData('vale', 5);
    this.monedas.create(NIVEL.corazon.x, NIVEL.corazon.y, 'objetos').setScale(58 / 64).play('corazon').setData('vida', 1);

    this.enemigos = NIVEL.enemigos.map((e) => {
      const s = this.physics.add.sprite(e.x, 400, 'enemigo', 'caminar_0'); this.cuerpo(s, ENEMIGO); s.play('enemigo:caminar'); s.setData({ min: e.min, max: e.max, dir: -1, vivo: true });
      this.physics.add.collider(s, suelo); return s;
    });

    this.heroe = this.physics.add.sprite(NIVEL.inicio.x, NIVEL.inicio.y - 90, HEROE.clave, 'quieto_0'); this.cuerpo(this.heroe, HEROE);
    this.heroe.setData({ vidas: 3, inmune: 0, golpe: 0, gana: false, seguro: NIVEL.inicio.x });
    this.physics.add.collider(this.heroe, suelo); this.physics.add.collider(this.heroe, plats);
    this.physics.add.overlap(this.heroe, this.monedas, (h, m) => {
      if (m.getData('vida')) h.setData('vidas', Math.min(5, h.getData('vidas') + 1)); else this.puntos += m.getData('vale');
      this.sound.play(m.getData('vale') === 1 ? 'moneda' : 'celebrar', { volume: 0.4 }); m.destroy(); this.marcador();
    });
    for (const e of this.enemigos) this.physics.add.overlap(this.heroe, e, () => this.choque(e));

    this.physics.world.setBounds(0, 0, NIVEL.ancho, H + 400);
    this.cameras.main.setBounds(0, 0, NIVEL.ancho, H).startFollow(this.heroe, true, 0.12, 0.12, -W * 0.1, 80);
    this.teclas = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,SPACE,X,A,D,W,S,R');
    this.puntos = 0; this.inicio = this.time.now;
    this.texto = this.add.text(16, 14, '', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff', backgroundColor: 'rgba(15,12,24,.6)', padding: { x: 12, y: 6 } }).setScrollFactor(0).setDepth(10);
    this.marcador();
  }

  marcador() { this.texto.setText('Monedas ' + this.puntos + '   Vidas ' + this.heroe.getData('vidas')); }

  choque(e) {
    const h = this.heroe; if (!e.getData('vivo') || h.getData('gana')) return;
    const pisa = h.body.velocity.y > 200 && h.y < e.y - 30;
    if (pisa || h.getData('golpe') > 0.12) {
      e.setData('vivo', false); e.body.enable = false; e.play('enemigo:morir'); this.tweens.add({ targets: e, alpha: 0, delay: 500, duration: 300 });
      this.puntos += 3; this.sound.play('golpe', { volume: 0.5 }); if (pisa) h.setVelocityY(-520); this.marcador();
    } else if (h.getData('inmune') <= 0) this.herir();
  }

  herir() {
    const h = this.heroe; h.setData({ vidas: h.getData('vidas') - 1, inmune: 1.2 }); h.setVelocity(h.flipX ? 260 : -260, -420); this.sound.play('dano', { volume: 0.6 });
    if (h.getData('vidas') <= 0) { this.sound.play('morir', { volume: 0.5 }); h.setData('vidas', 3); h.setPosition(NIVEL.inicio.x, 300); }
    this.marcador();
  }

  update(t, ms) {
    const dt = ms / 1000, h = this.heroe, k = this.teclas, cam = this.cameras.main;
    this.capas.forEach((c, i) => { c.tilePositionX = cam.scrollX * [0.12, 0.3, 0.55][i]; });
    for (const e of this.enemigos) { if (!e.getData('vivo')) continue; let d = e.getData('dir'); if (e.x < e.getData('min')) d = 1; if (e.x > e.getData('max')) d = -1; e.setData('dir', d); e.setVelocityX(70 * d); e.setFlipX(d < 0); }
    if (Phaser.Input.Keyboard.JustDown(k.R)) { this.scene.restart(); return; }
    if (h.getData('gana')) { h.setVelocityX(0); h.play(HEROE.clave + ':celebrar', true); return; }
    h.setData('inmune', Math.max(0, h.getData('inmune') - dt)); h.setData('golpe', Math.max(0, h.getData('golpe') - dt));
    h.setAlpha(h.getData('inmune') > 0 && Math.floor(h.getData('inmune') * 14) % 2 ? 0.45 : 1);
    const piso = h.body.blocked.down || h.body.touching.down, dir = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0), agach = (k.DOWN.isDown || k.S.isDown) && piso;
    h.setVelocityX(Phaser.Math.Linear(h.body.velocity.x, agach ? 0 : dir * FISICA.velocidad, Math.min(1, dt * (piso ? 12 : 6))));
    if (dir) h.setFlipX(dir < 0);
    const salta = k.UP.isDown || k.W.isDown || k.SPACE.isDown;
    if (salta && piso && !agach) { h.setVelocityY(-FISICA.salto); this.sound.play('salto', { volume: 0.45 }); }
    if (!salta && h.body.velocity.y < -260) h.setVelocityY(-260);
    if (Phaser.Input.Keyboard.JustDown(k.X) && h.getData('golpe') <= 0) { h.setData('golpe', 0.38); this.sound.play('golpe', { volume: 0.5 }); }
    if (piso && NIVEL.suelo[Math.floor(h.x / 64)]) h.setData('seguro', h.x);
    if (h.y > 760) { h.setPosition(h.getData('seguro'), 300); h.setVelocity(0, 0); this.herir(); }
    if (Math.abs(h.x - NIVEL.meta.x) < 40 && piso) { h.setData('gana', true); this.sound.play('celebrar', { volume: 0.6 }); const s = Math.floor((this.time.now - this.inicio) / 1000); this.texto.setText('¡Meta! ' + this.puntos + ' puntos en ' + s + ' s · R para repetir'); }
    const v = Math.abs(h.body.velocity.x);
    const a = h.getData('inmune') > 0.9 ? 'dano' : h.getData('golpe') > 0 ? 'golpe' : !piso ? 'saltar' : agach ? 'agachado' : v > 250 ? 'correr' : v > 40 ? 'caminar' : 'quieto';
    h.play(HEROE.clave + ':' + a, true);
  }
}

window.juego = new Phaser.Game({
  type: Phaser.AUTO, parent: 'juego', width: 960, height: 540, backgroundColor: '#14111c',
  physics: { default: 'arcade', arcade: { gravity: { y: FISICA.gravedad }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: Juego,
});
`;
}

const INDEX = (nombre) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${nombre} · mi juego</title>
<link rel="icon" href="data:,">
<style>html,body{margin:0;height:100%;background:#14111c;color:#f5f0ff;font:15px system-ui,sans-serif}#juego{height:calc(100% - 34px)}p{margin:0;padding:8px;text-align:center;opacity:.7}</style>
</head><body><div id="juego"></div><p>← → moverte · ↑ o espacio saltar · X golpear · ↓ agacharte · R repetir</p>
<script src="${PHASER}"></script><script src="juego.js"></script></body></html>
`;

const LEEME = (nombre, enlace) => `${nombre} · proyecto Phaser 4 hecho con Forja (JMD Learning)

CÓMO ABRIRLO
Los navegadores no cargan imágenes de un juego abriendo index.html con doble clic: hace falta un servidor local.
  Opción 1 (terminal, dentro de esta carpeta):   npx serve        y abre la dirección que muestra
  Opción 2 (VS Code): extensión «Live Server» → clic derecho en index.html → Open with Live Server
  Opción 3 (Python):  python3 -m http.server 8000   y abre http://localhost:8000

QUÉ HAY
  index.html, juego.js      el juego (todo el código está en juego.js)
  assets/                   personaje, enemigo, objetos, fondo en capas, losetas y sonidos
  ficha.json                medidas, física y reglas aplicadas a tu personaje

Phaser se carga desde internet (${PHASER}).
Para volver a editar el personaje: ${enlace}
`;

// d: { spec, hoja, enemigo: { spec, hoja }, objetos, escenario, sonidos (banco), semilla, estado, enlace }
export async function zipProyecto(d) {
  const clave = d.hoja.clave, A = 'assets/', archivos = [];
  const png = async (nombre, lienzo) => archivos.push({ nombre: A + nombre, datos: await pngDeLienzo(lienzo) });
  await png(`${clave}.png`, d.hoja.hoja); archivos.push({ nombre: `${A}${clave}.json`, datos: JSON.stringify(d.hoja.atlas) });
  const atlasE = JSON.parse(JSON.stringify(d.enemigo.hoja.atlas)); atlasE.meta.image = 'enemigo.png';
  await png('enemigo.png', d.enemigo.hoja.hoja); archivos.push({ nombre: `${A}enemigo.json`, datos: JSON.stringify(atlasE) });
  await png('objetos.png', d.objetos.hoja); archivos.push({ nombre: `${A}objetos.json`, datos: JSON.stringify(d.objetos.atlas) });
  await png('cielo.png', d.escenario.cielo);
  for (const [i, c] of d.escenario.capas.entries()) await png(`capa${i}.png`, c);
  await png('suelo.png', recorte(d.escenario, 0));
  for (const [i, n] of [[2, 'plat_izq'], [3, 'plat_cen'], [4, 'plat_der']]) await png(`${n}.png`, recorte(d.escenario, i, 30));
  for (const [n, m] of Object.entries(d.sonidos)) archivos.push({ nombre: `${A}sonidos/${n}.wav`, datos: wav(m) });
  const datos = (h) => ({ clave: h.clave, px: h.px, relAlto: +h.relAlto.toFixed(3), relAncho: +h.relAncho.toFixed(3), animaciones: h.animaciones });
  archivos.push({ nombre: 'juego.js', datos: codigoJuego({ nombre: d.spec.nombre, nivel: crearNivel(d.semilla), fisica: fisicaJugable(d.spec.fisica), heroe: datos(d.hoja), enemigo: { ...datos(d.enemigo.hoja), clave: 'enemigo' }, sonidos: Object.keys(d.sonidos) }) });
  archivos.push({ nombre: 'index.html', datos: INDEX(d.spec.nombre) }, { nombre: 'LEEME.txt', datos: LEEME(d.spec.nombre, d.enlace) });
  archivos.push({ nombre: 'ficha.json', datos: JSON.stringify({ nombre: d.spec.nombre, estado: d.estado, fisica: d.spec.fisica, medidas: d.spec.dims, reglas: d.spec.reglas, enlace: d.enlace }, null, 1) });
  return zip(archivos.map((a) => ({ ...a, nombre: `${clave}/${a.nombre}` })));
}

// Video corto del personaje girando (MP4 si el navegador lo graba; si no, WebM).
export function grabarVideo(lienzo3d, nombre, fondo = ['#3a2f6b', '#17132a'], segundos = 4) {
  return new Promise((ok, mal) => {
    const c = document.createElement('canvas'); c.width = c.height = 720; const x = c.getContext('2d');
    const tipo = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!tipo) return mal(new Error('este navegador no graba video'));
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: tipo, videoBitsPerSecond: 4e6 }), trozos = [];
    rec.ondataavailable = (e) => e.data.size && trozos.push(e.data);
    rec.onstop = () => ok({ blob: new Blob(trozos, { type: tipo.split(';')[0] }), ext: tipo.includes('mp4') ? 'mp4' : 'webm' });
    const t0 = performance.now();
    (function cuadro(t) {
      const g = x.createRadialGradient(360, 520, 40, 360, 420, 560); g.addColorStop(0, fondo[0]); g.addColorStop(1, fondo[1]); x.fillStyle = g; x.fillRect(0, 0, 720, 720);
      const w = lienzo3d.width, h = lienzo3d.height, lado = Math.min(w, h); x.drawImage(lienzo3d, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 20, 720, 720);
      x.fillStyle = '#fff'; x.font = '900 40px Unbounded, system-ui, sans-serif'; x.textAlign = 'center'; x.fillText(nombre, 360, 70, 660);
      x.font = '600 20px Figtree, system-ui, sans-serif'; x.globalAlpha = 0.75; x.fillText('Forja · JMD Learning', 360, 690); x.globalAlpha = 1;
      if (t - t0 < segundos * 1000) requestAnimationFrame(cuadro); else rec.stop();
    })(t0);
    rec.start();
  });
}

export async function modeloGLB(raiz) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const copia = raiz.clone(true), fuera = [];
  copia.traverse((o) => { if (o.userData.contorno) fuera.push(o); else if (o.isMesh) { const m = o.material; o.material = new THREE.MeshStandardMaterial({ color: m.color, map: m.map || null, roughness: 0.85, metalness: 0, transparent: m.transparent, opacity: m.opacity, emissive: m.emissive || 0x000000, emissiveIntensity: m.emissiveIntensity || 0 }); } });
  for (const o of fuera) o.parent.remove(o);
  const buf = await new GLTFExporter().parseAsync(copia, { binary: true });
  return new Blob([buf], { type: 'model/gltf-binary' });
}
