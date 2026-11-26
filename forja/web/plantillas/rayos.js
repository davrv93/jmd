// rayos.js · «Rayos X del framework»: cada 250 ms mira qué pieza del juego está trabajando y se lo cuenta a la página
// que lo contiene (el estudio Forja, que lo pasa a la escena del LIVE). Solo LEE: no cambia nada del juego.
// En tu computadora (sin página que lo contenga) no hace nada.
//   mensaje: { forja: 'rayos', juego, motor, fps, teclas: [...], acciones: [...], capas: [{ id, nombre, fw, nivel 0..1, detalle }] }
(function () {
  if (window.parent === window) return;
  const D = window.DATOS || {}, motor = D.motor || 'phaser';
  const abajo = new Set();
  addEventListener('keydown', (e) => abajo.add(e.code)); addEventListener('keyup', (e) => abajo.delete(e.code)); addEventListener('blur', () => abajo.clear());
  const NOMBRE = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Espacio', ShiftLeft: 'Mayús', ShiftRight: 'Mayús', Escape: 'Esc', Enter: 'Enter' };
  const tecla = (c) => NOMBRE[c] || c.replace(/^Key/, '').replace(/^Digit/, '');
  const acciones = () => Object.entries(D.controles || {}).filter(([, ts]) => Array.isArray(ts) && ts.some((t) => abajo.has(t))).map(([a]) => a);
  const lim = (x) => Math.max(0, Math.min(1, x));
  let antes = {}, tAntes = performance.now();
  const delta = (k, v) => { const d = v - (antes[k] ?? v); antes[k] = v; return d; };

  // ---------------------------------------------------------------- Phaser 4 (las seis plantillas clásicas)
  function phaser() {
    const j = window.juego; if (!j || !j.scene) return null;
    const s = j.scene.getScenes(true)[0]; if (!s) return { capas: [], fps: 0 };
    const capas = [], hijos = s.children ? s.children.list : [];
    const fps = Math.round(j.loop ? j.loop.actualFps : 0);
    capas.push({ id: 'bucle', nombre: 'Bucle del juego', fw: 'Phaser 4', nivel: lim(fps / 60), detalle: `${fps} cuadros por segundo · escena «${s.scene.key}»: cada cuadro llama a update()` });
    // física Arcade
    const mundo = s.physics && s.physics.world;
    if (mundo) {
      const cuerpos = mundo.bodies ? [...mundo.bodies] : [], mueven = cuerpos.filter((b) => b.enable && b.speed > 8), tocan = cuerpos.filter((b) => b.enable && (!b.blocked.none || !b.touching.none));
      const h = s.heroe && s.heroe.body;
      let det = `${cuerpos.length} cuerpos, ${mueven.length} en movimiento, ${tocan.length} chocando`;
      if (h) det += ` · tu héroe: vx ${Math.round(h.velocity.x)}, vy ${Math.round(h.velocity.y)}${h.blocked.down || h.touching.down ? ', en el suelo' : mundo.gravity.y ? ', en el aire' : ''}`;
      capas.push({ id: 'fisica', nombre: 'Física Arcade', fw: 'Phaser 4', nivel: lim(mueven.length / 6 + tocan.length / 10), detalle: det + (mundo.gravity.y ? ` · gravedad ${Math.round(mundo.gravity.y)}` : '') });
    }
    // animaciones de sprites (la hoja de sprites de tu personaje)
    const anim = hijos.filter((c) => c.anims && c.anims.isPlaying), h = s.heroe;
    const clave = h && h.anims && h.anims.currentAnim ? h.anims.currentAnim.key.replace(/^heroe:/, '') : null;
    const cambio = clave !== antes.claveHeroe; antes.claveHeroe = clave;
    capas.push({ id: 'animacion', nombre: 'Animación de sprites', fw: 'Phaser 4', nivel: lim(anim.length / 6 + (cambio ? 0.5 : 0)),
      detalle: `${anim.length} sprites animando${clave ? ` · tu héroe: «${clave}», cuadro ${h.anims.currentFrame ? h.anims.currentFrame.index : 0}` : ''} · los cuadros salen de la hoja de sprites (atlas)` });
    // tweens, partículas, cámara, sonido
    const tweens = s.tweens && s.tweens.getTweens ? s.tweens.getTweens().length : 0;
    capas.push({ id: 'tweens', nombre: 'Tweens (movimiento suave)', fw: 'Phaser 4', nivel: lim(tweens / 8), detalle: `${tweens} tweens activos: gemas que flotan, carteles, parpadeos` });
    const emisores = hijos.filter((c) => c.type === 'ParticleEmitter'); let vivas = 0; for (const e of emisores) vivas += e.getAliveParticleCount ? e.getAliveParticleCount() : 0;
    capas.push({ id: 'particulas', nombre: 'Partículas', fw: 'Phaser 4', nivel: lim(vivas / 60), detalle: `${vivas} partículas vivas en ${emisores.length} emisores (polvo, chispas, ambiente)` });
    const cam = s.cameras && s.cameras.main;
    if (cam) { const dx = Math.abs(delta('camx', cam.scrollX)) + Math.abs(delta('camy', cam.scrollY)); capas.push({ id: 'camara', nombre: 'Cámara', fw: 'Phaser 4', nivel: lim(dx / 40), detalle: `scroll ${Math.round(cam.scrollX)}, ${Math.round(cam.scrollY)}${cam._follow ? ' · sigue a tu héroe' : ''}${dx > 1 ? ' · moviéndose' : ''}` }); }
    const sonando = j.sound && j.sound.sounds ? j.sound.sounds.filter((x) => x.isPlaying).length : 0;
    capas.push({ id: 'sonido', nombre: 'Sonido', fw: 'Web Audio', nivel: lim(sonando / 2), detalle: sonando ? `${sonando} sonidos sonando (ondas calculadas por Forja)` : 'en silencio' });
    capas.push({ id: 'render', nombre: 'Dibujo en pantalla', fw: j.renderer && j.renderer.type === 2 ? 'WebGL' : 'Canvas 2D', nivel: lim(hijos.length / 120), detalle: `${hijos.length} objetos en la escena, dibujados ${Math.round(fps)} veces por segundo` });
    return { capas, fps };
  }

  // ---------------------------------------------------------------- motores propios: anime (p5 + Anime.js) y voxel (p5 WEBGL + Workers)
  function anime() {
    const g = globalThis.__juego; if (!g) return null;
    const r = g.monitor && g.monitor.resumen ? g.monitor.resumen() : {}, p = g.partida, c = p && p.combate, capas = [];
    const yo = c && c.luchadores && c.luchadores[0], el = c && c.luchadores && c.luchadores[1];
    capas.push({ id: 'bucle', nombre: 'Bucle de paso fijo', fw: 'Motor Forja', nivel: lim((r.fps || 0) / 60), detalle: `${Math.round(r.fps || 0)} cuadros por segundo · la simulación avanza siempre 60 pasos por segundo` });
    capas.push({ id: 'simulacion', nombre: 'Simulación del combate', fw: 'Motor Forja', nivel: c ? lim(0.3 + (r.ms_sim || 0) / 2) : 0,
      detalle: c ? `cuadro ${c.cuadro}${yo ? ` · tú: ${yo.estado}${yo.mov ? ' «' + (yo.mov.nombre || 'golpe') + '»' : ''}` : ''}${el ? ` · rival: ${el.estado}` : ''} · ${(r.ms_sim || 0).toFixed(2)} ms` : 'en el menú' });
    capas.push({ id: 'ia', nombre: 'IA del rival', fw: 'Motor Forja', nivel: el && el.control === 'cpu' ? lim(0.25 + (el.mov ? 0.5 : 0)) : 0, detalle: el ? `la CPU decide con retraso humano y aprende de lo que repites${el.mov ? ' · ahora ataca' : ''}` : '—' });
    const fx = g.fx ? g.fx.particulas || 0 : 0;
    capas.push({ id: 'particulas', nombre: 'Efectos (chispas, auras)', fw: 'Motor Forja', nivel: lim(fx / 80), detalle: `${fx} partículas` });
    const cine = p && p.director && p.director.activa;
    capas.push({ id: 'animejs', nombre: 'Cinemáticas, menús y marcador', fw: 'Anime.js', nivel: cine ? 1 : (g.hud && g.hud.hayMenu ? 0.6 : 0.15), detalle: cine ? 'cinemática en curso: Anime.js mueve cámara, textos y destellos' : 'barras de vida, textos de combo y menús' });
    capas.push({ id: 'render', nombre: 'Dibujo del escenario y luchadores', fw: 'p5.js', nivel: lim((r.ms_render || 0) / 6 + 0.2), detalle: `${(r.ms_render || 0).toFixed(2)} ms por cuadro · ${r.dibujos || 0} trazos` });
    return { capas, fps: Math.round(r.fps || 0) };
  }
  function voxel() {
    const g = globalThis.__voxel; if (!g) return null;
    const r = g.monitor && g.monitor.resumen ? g.monitor.resumen() : {}, capas = [], j = g.jug || {};
    const mueve = Math.hypot(delta('vx', j.x || 0), delta('vz', j.z || 0));
    capas.push({ id: 'bucle', nombre: 'Bucle de paso fijo', fw: 'Motor Forja', nivel: lim((r.fps || 0) / 60), detalle: `${Math.round(r.fps || 0)} cuadros por segundo` });
    capas.push({ id: 'fisica', nombre: 'Física del jugador', fw: 'Motor Forja', nivel: lim(mueve * 2), detalle: `posición ${Math.round(j.x || 0)}, ${Math.round(j.y || 0)}, ${Math.round(j.z || 0)}${mueve > 0.05 ? ' · caminando' : ' · quieto'} · choca con cada bloque` });
    const pend = r.pendientes || 0;
    capas.push({ id: 'workers', nombre: 'Generar el mundo', fw: 'Web Workers', nivel: lim(pend / 6), detalle: `${pend} trozos (chunks) generándose en otros hilos · ${r.chunks || 0} listos` });
    capas.push({ id: 'render', nombre: 'Dibujo 3D con shaders', fw: 'p5.js WEBGL', nivel: lim((r['draw calls'] || 0) / 160 + 0.2), detalle: `${r['draw calls'] || 0} draw calls · ${Math.round((r['triángulos'] || 0) / 1000)} mil triángulos` });
    capas.push({ id: 'criaturas', nombre: 'Criaturas', fw: 'Motor Forja', nivel: lim((r.entidades || 0) / 12), detalle: `${r.entidades || 0} criaturas activas` });
    capas.push({ id: 'animejs', nombre: 'Interfaz (barra, avisos)', fw: 'Anime.js', nivel: 0.15, detalle: 'avisos y menús animados' });
    return { capas, fps: Math.round(r.fps || 0) };
  }

  setInterval(() => {
    const t = performance.now(); tAntes = t;
    let x = null;
    try { x = motor === 'anime' ? anime() : motor === 'voxel' ? voxel() : phaser(); } catch (e) { x = { capas: [], fps: 0, error: String(e && e.message) }; }
    if (!x) return;
    const acc = acciones();
    x.capas.unshift({ id: 'entrada', nombre: 'Teclado → acciones', fw: motor === 'phaser' ? 'Forja (comun.js)' : 'Motor Forja (entrada)', nivel: abajo.size ? 1 : 0,
      detalle: abajo.size ? `teclas: ${[...abajo].map(tecla).join(' ')}${acc.length ? ' → acciones: ' + acc.join(', ') : ''}` : 'nadie aprieta nada' });
    try { window.parent.postMessage({ forja: 'rayos', juego: D.juego || '', plantilla: D.plantilla || '', motor, fps: x.fps, teclas: [...abajo].map(tecla), acciones: acc, capas: x.capas, error: x.error || null }, '*'); } catch (e) { /* nada */ }
  }, 250);
})();
