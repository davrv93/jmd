// Forja · estudio fotográfico fuera de pantalla: miniaturas y hojas de sprites con atlas para Phaser.
import * as THREE from 'three';
import { construir } from './personaje.js';
import { posar } from './animar.js';

let R = null, escena = null, cam = null;
function estudio(px) {
  if (!R) {
    R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    R.setPixelRatio(1); R.setClearColor(0x000000, 0);
    escena = new THREE.Scene();
    escena.add(new THREE.HemisphereLight(0xffffff, 0x8a7f9c, 1.5));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(2.5, 4, 3.5); escena.add(sol);
    cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
  }
  R.setSize(px, px, false);
  return R;
}
function encuadra(pj, giro, holgura = 1.12, aire = 0) {
  // marco cuadrado: el personaje de pie abajo, con aire arriba para el salto
  const alto = Math.max(pj.alto, pj.ancho * 0.9) * holgura + aire, m = alto / 2;
  cam.left = -m; cam.right = m; cam.bottom = -alto * 0.04; cam.top = alto * 0.96;
  cam.position.set(0, 0, 12); cam.rotation.set(0, 0, 0);
  cam.updateProjectionMatrix(); pj.raiz.rotation.y = giro;
}

export function miniatura(spec, px = 168) {
  const r = estudio(px), pj = construir(spec);
  escena.add(pj.raiz); posar(pj, spec, 'quieto', 0.2); encuadra(pj, 0.5);
  r.render(escena, cam);
  const url = r.domElement.toDataURL('image/png');
  escena.remove(pj.raiz); pj.liberar();
  return url;
}

// Hoja de sprites: una fila por animación. Devuelve el lienzo, el atlas (JSON Hash de Phaser) y los datos de animación.
export function hojaSprites(spec, reglas, px = 128, giro = 0.95) {
  const r = estudio(px), pj = construir(spec), T = reglas.T, anims = reglas.meta.animaciones;
  escena.add(pj.raiz);
  const filas = anims.map((a) => ({ a, regla: T.sprite[`${spec.familia.id}|${px}|${a}`] || [8, 10, 0.96, 6] }));
  const cols = Math.max(...filas.map((f) => f.regla[0]));
  const hoja = document.createElement('canvas'); hoja.width = cols * px; hoja.height = filas.length * px;
  const ctx = hoja.getContext('2d');
  const salto = spec.anim.saltar.amp * spec.anim.saltar.bo * 1.05 * Math.min(1.4, spec.dims.escala);
  encuadra(pj, giro, 1.16, salto); // el mismo marco para todas las filas: el personaje no cambia de tamaño entre animaciones
  const frames = {}, animaciones = [];
  filas.forEach((f, j) => {
    const [n, fps] = f.regla;
    for (let i = 0; i < n; i++) {
      posar(pj, spec, f.a, i / n); r.render(escena, cam);
      ctx.drawImage(r.domElement, i * px, j * px);
      frames[`${f.a}_${i}`] = { frame: { x: i * px, y: j * px, w: px, h: px }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: px, h: px }, sourceSize: { w: px, h: px } };
    }
    animaciones.push({ clave: f.a, cuadros: n, fps, repetir: f.a === 'quieto' || f.a === 'caminar' ? -1 : 0 });
  });
  escena.remove(pj.raiz); pj.liberar();
  const clave = spec.id.replace('|', '_');
  const atlas = { frames, meta: { app: 'Forja · JMD Learning', image: `${clave}.png`, format: 'RGBA8888', size: { w: hoja.width, h: hoja.height }, scale: '1' } };
  return { hoja, atlas, animaciones, clave, px };
}

export function codigoPhaser(res, spec) {
  const { clave, animaciones, px } = res, f = spec.fisica;
  const an = animaciones.map((a) => `  this.anims.create({ key: '${a.clave}', frames: this.anims.generateFrameNames('${clave}', { prefix: '${a.clave}_', start: 0, end: ${a.cuadros - 1} }), frameRate: ${a.fps}, repeat: ${a.repetir} });`).join('\n');
  return `// ${spec.nombre} · hecho con Forja (JMD Learning)
// preload()
this.load.atlas('${clave}', '${clave}.png', '${clave}.json');

// create()
${an}
  const heroe = this.physics.add.sprite(200, 300, '${clave}', 'quieto_0').play('quieto');
  heroe.body.setSize(${Math.round(px * f.hitW)}, ${Math.round(px * f.hitH * 0.8)}).setOffset(${Math.round(px * (1 - f.hitW) / 2)}, ${Math.round(px * 0.16)});
  heroe.setData({ velocidad: ${f.velocidad}, salto: ${f.salto}, masa: ${f.masa} });

// update(): izquierda / derecha / salto
  // heroe.setVelocityX(-${f.velocidad}); heroe.setFlipX(true); heroe.play('caminar', true);
  // if (heroe.body.blocked.down) heroe.setVelocityY(-${f.salto});
`;
}
