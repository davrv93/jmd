// comun.js · lo que comparten las plantillas Phaser de Forja (JMD Learning). Phaser 4.
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
  // --- REGLAS DEL JUEGO: lo que el alumno eligió en «Diseña tu videojuego» (catálogo motor/juegos/<plantilla>.js).
  // Cada regla tiene una clave; si el alumno no eligió nada, vale el defecto que se pasa aquí.
  regla(clave, defecto) { const v = D.reglas && D.reglas[clave]; return v === undefined ? defecto : v; },

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
    for (const clave of ['heroe', 'enemigo']) Forja.medir(escena, clave);
  },
  // Cuánto dura una animación entera, en segundos (cuadros ÷ fps). Sirve para que un golpe dure lo que dura su dibujo.
  dura(clave, anim) { const a = D[clave].animaciones.find((x) => x.clave === anim); return a ? a.cuadros / a.fps : 0.4; },
  cuadros(clave, anim) { const a = D[clave].animaciones.find((x) => x.clave === anim); return a ? a.cuadros : 0; },

  // --- PIES: en qué fila del cuadro toca el suelo cada dibujo. La hoja deja aire arriba (para el salto) y el dibujo no
  // termina justo en la misma fila en todas las poses: se mide en la imagen (la fila más baja con color de cada cuadro).
  // Con eso: los pies quedan SOBRE el suelo (ni flotan ni se hunden), al agacharse no queda un hueco debajo, y en el aire
  // el dibujo del salto no «sube» por su cuenta (la física ya lo sube: si no, saltaría dos veces).
  medir(escena, clave) {
    const tex = escena.textures.get(clave), p = D[clave];
    if (tex.forja) return tex.forja;
    const M = { pie: {}, cab: {}, anim: {} };
    try {
      const img = tex.getSourceImage(), cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
      const px = cx.getImageData(0, 0, img.width, img.height).data;
      for (const n of tex.getFrameNames()) {
        const f = tex.get(n); let cab = -1, pie = -1;
        for (let y = 0; y < f.cutHeight; y++) {
          const fila = (f.cutY + y) * img.width + f.cutX;
          for (let x = 0; x < f.cutWidth; x += 2) if (px[(fila + x) * 4 + 3] > 40) { if (cab < 0) cab = y; pie = y; break; }
        }
        if (pie >= 0) { M.pie[n] = pie + 1; M.cab[n] = cab; }
      }
    } catch (e) { /* abierto como archivo (file://): el navegador no deja leer los píxeles; se usa la medida del estudio */ }
    for (const a of p.animaciones) { let m = 0; for (let i = 0; i < a.cuadros; i++) m = Math.max(m, M.pie[a.clave + '_' + i] || 0); M.anim[a.clave] = m || p.px * 0.96; }
    M.base = M.anim.quieto || p.px * 0.96;                                            // la fila del suelo de pie
    M.alto = M.base - (M.cab.quieto_0 ?? p.px * (0.96 - p.relAlto));                  // alto del dibujo de pie (px del cuadro)
    return (tex.forja = M);
  },
  // Alto visible del dibujo en el juego (px del mundo), en la pose «anim» (cuadro i). Para colgarse de bordes, alturas de trampas…
  altoDibujo(sprite, anim = 'quieto', i = 0) {
    const M = sprite.texture.forja, n = anim + '_' + i; if (!M) return sprite.displayHeight * 0.75;
    const pie = anim === 'saltar' ? M.pie[n] ?? M.base : M.anim[anim] ?? M.base;
    return (pie - (M.cab[n] ?? M.base - M.alto)) * Math.abs(sprite.scaleY);
  },
  // Ajusta el origen al cuadro que se ve ahora, sin mover la caja de choque (se corrige su desplazamiento lo mismo).
  apoyar(s) {
    const M = s.texture.forja; if (!M || !s.frame) return;
    const n = s.frame.name, a = n.slice(0, n.lastIndexOf('_'));
    const pie = a === 'saltar' ? M.pie[n] || M.anim[a] : M.anim[a] || M.base;      // en el salto, cada cuadro con sus pies
    const oy = pie / s.frame.height;
    if (Math.abs(oy - s.originY) < 1e-4) return;
    const d = (oy - s.originY) * s.frame.height;
    s.setOrigin(s.originX, oy);
    if (s.body && s.body.offset) s.body.offset.y += d;
  },
  // Apunta un sprite para que se apoye solo en cada cuadro (después de la física y antes de dibujar).
  apoyo(escena, s) {
    if (!escena._apoyos) {
      const lista = (escena._apoyos = []), fn = () => { for (const x of lista) if (x.active) Forja.apoyar(x); };
      escena.events.on('postupdate', fn);
      escena.events.once('shutdown', () => { escena.events.off('postupdate', fn); escena._apoyos = null; });
    }
    if (!escena._apoyos.includes(s)) escena._apoyos.push(s);
    Forja.apoyar(s);
    return s;
  },

  // --- COLISIÓN: la caja de choque es más pequeña que el dibujo. Se calcula con las medidas reales del personaje.
  // Su borde de abajo está en la fila donde el dibujo toca el suelo: los pies se ven sobre la losa, sin hueco ni hundidos.
  cuerpo(sprite, p, alto = 150, pie = false) {
    if (p === D.heroe) alto *= Forja.regla('jugador.tamano', 1);   // regla común: tamaño del héroe
    const k = alto / p.px, w = Math.max(30, alto * p.relAncho * 0.6) / k, h = Math.max(40, alto * p.relAlto * 0.92) / k;
    const M = Forja.medir(sprite.scene, sprite.texture.key), suelo = M.base;
    sprite.setScale(k).setOrigin(0.5, suelo / p.px);
    if (pie) sprite.body.setSize(w * 0.8, h * 0.28).setOffset((p.px - w * 0.8) / 2, suelo - h * 0.28); // vista desde arriba: solo chocan los pies
    else sprite.body.setSize(w, h).setOffset((p.px - w) / 2, suelo - h);
    Forja.apoyo(sprite.scene, sprite);
    return sprite;
  },

  // --- POSE: del estado del cuerpo a la animación. Una sola regla para todos los juegos:
  //  · «andar»: quieto, caminar o correr según la rapidez real (con margen, para no saltar entre dos poses cada cuadro),
  //    y los pasos van más rápido cuanto más rápido avanza: los pies no patinan sobre el suelo.
  //  · «aire»: el cuadro del salto sale de la velocidad vertical (subiendo se estira, arriba se recoge, bajando se prepara).
  //    Un solo cuadro sin piso (una costura, el canto de una losa) no cuenta como estar en el aire.
  //  · al caer con fuerza, un instante de aterrizaje (se aplasta) antes de seguir.
  //  · golpe, daño, morir y celebrar se ven UNA vez enteros: pedirlos de nuevo en cada cuadro no los reinicia.
  // o: { v: rapidez, max: rapidez de carrera, vy: velocidad vertical, salto: velocidad del salto, ritmo, reinicia }
  pose(s, estado, o = {}) {
    const q = s.texture.key, A = s.anims, ahora = s.scene.time.now, P = (s._pose ||= { estado: '', anim: '', suelo: 0, vy: 0, aterriza: 0 });
    if (estado === 'aire' && P.estado !== 'aire' && (o.vy ?? 0) > -60 && ahora - P.suelo < 90) estado = P.estado || 'quieto';
    const v = Math.abs(o.v || 0), max = o.max || 250;
    if (estado !== 'aire') {
      if (P.estado === 'aire' && P.vy > (o.duro ?? 420) && (estado === 'quieto' || (estado === 'andar' && v < max * 0.6))) P.aterriza = ahora + 110;
      P.suelo = ahora;
    } else P.vy = o.vy || 0;
    P.estado = estado;
    const fija = (anim, u) => {                                                     // un cuadro quieto de una animación
      const n = Forja.cuadros(q, anim); if (!n) return;
      const i = Math.max(0, Math.min(n - 1, Math.round(u * n))), nombre = anim + '_' + i;
      if (A.isPlaying) A.stop();
      if (s.frame.name !== nombre) s.setFrame(nombre);
      P.anim = '#' + nombre;
    };
    const juega = (anim, ritmo = 1) => {
      const una = !['quieto', 'caminar', 'correr', 'agachado'].includes(anim);
      const mismo = P.anim === anim && A.currentAnim?.key === q + ':' + anim;
      if (!mismo || (!una && !A.isPlaying) || (una && o.reinicia)) { A.play(q + ':' + anim); P.anim = anim; }
      A.timeScale = ritmo;
    };
    if (estado === 'aire') {
      const sube = o.salto || 800, k = Math.max(0, Math.min(1, ((o.vy || 0) + sube) / (2 * sube)));
      return fija('saltar', 0.25 + 0.5 * k);                                        // 2/8 impulso … 4/8 cima … 6/8 cayendo
    }
    if (ahora < P.aterriza) return fija('saltar', 0.875);                         // aterrizaje: el cuadro aplastado
    if (estado === 'colgado') return fija('saltar', 0.45);                         // brazos arriba
    if (estado === 'andar') {
      const corre = max * 0.7, quieto = P.anim === 'quieto' ? (o.min ?? 22) : (o.min ?? 22) * 0.5;
      if (v < quieto) return juega('quieto');
      const anim = (P.anim === 'correr' ? v > corre * 0.85 : v > corre) ? 'correr' : 'caminar';
      return juega(anim, Math.max(0.45, Math.min(1.8, v / (anim === 'correr' ? max : max * 0.5))));
    }
    return juega(estado, o.ritmo || 1);
  },
  // Velocidad real de un cuerpo en el último paso de la física (lo que de verdad se movió, aunque choque con un muro).
  // eje 'x': solo lo horizontal (vista de lado: subir con una plataforma que flota no es caminar).
  rapidez(s, eje) { const b = s.body; return b ? (eje === 'x' ? Math.abs(b.deltaX()) : Math.hypot(b.deltaX(), b.deltaY())) * (s.scene.physics.world.fps || 60) : 0; },

  // --- ENTRADA: el juego lee ACCIONES («salto», «golpe»), no teclas. Qué tecla hace cada acción lo eligió el alumno
  // al crear su juego (paso «Procedimientos») y llega en DATOS.controles = { accion: ['Space', 'KeyW', …] }.
  // Los botones táctiles (window.TACTO) encienden las mismas acciones. Devuelve una función que se llama en cada cuadro.
  TECLAS: {
    izq: ['ArrowLeft', 'KeyA'], der: ['ArrowRight', 'KeyD'], arriba: ['ArrowUp', 'KeyW'], abajo: ['ArrowDown', 'KeyS'],
    salto: ['ArrowUp', 'KeyW', 'Space'], golpe: ['KeyX'], cuidado: ['ShiftLeft', 'ShiftRight'], pocion: ['KeyC'], turbo: ['Space'],
    repetir: ['KeyR'], rayosx: ['KeyV'],
  },
  controles(escena) {
    const mapa = { ...Forja.TECLAS, ...(D.controles || {}) }, usadas = new Set(Object.values(mapa).flat());
    const abajo = new Set(), recien = new Set();
    const bajar = (e) => {
      if (!usadas.has(e.code)) return;
      e.preventDefault();                                     // flechas y espacio no mueven la página
      if (!e.repeat && !abajo.has(e.code)) for (const [a, ts] of Object.entries(mapa)) if (ts.includes(e.code)) recien.add(a);
      abajo.add(e.code);
    };
    const subir = (e) => abajo.delete(e.code), soltar = () => abajo.clear();
    window.addEventListener('keydown', bajar); window.addEventListener('keyup', subir); window.addEventListener('blur', soltar);
    const quitar = () => { window.removeEventListener('keydown', bajar); window.removeEventListener('keyup', subir); window.removeEventListener('blur', soltar); };
    escena.events.once('shutdown', quitar); escena.events.once('destroy', quitar);   // al repetir (R) la escena vuelve a crear los suyos
    const antesTacto = {};
    const toca = (a) => (mapa[a] || []).some((c) => abajo.has(c)) || !!TACTO[a];
    return () => {
      for (const a of Object.keys(mapa)) { const t = !!TACTO[a]; if (t && !antesTacto[a]) recien.add(a); antesTacto[a] = t; }
      const ya = new Set(recien); recien.clear();
      return {
        x: (toca('der') ? 1 : 0) - (toca('izq') ? 1 : 0),
        y: (toca('abajo') ? 1 : 0) - (toca('arriba') ? 1 : 0),
        salto: toca('salto'), saltoYa: ya.has('salto'),
        golpeYa: ya.has('golpe'), abajo: toca('abajo'),
        cuidado: toca('cuidado'), pocionYa: ya.has('pocion'), turboYa: ya.has('turbo'),
        repetir: ya.has('repetir'), rayosX: ya.has('rayosx'),
        tiene: toca, ya: (a) => ya.has(a),                    // cualquier otra acción por su nombre
      };
    };
  },

  // --- EFECTOS: partículas. Una «mota» blanca de borde suave, teñida, sirve de polvo y de chispa.
  efectos(escena) {
    Forja.texturas(escena);
    const e = (tinte, vel, vida, mezcla) => escena.add.particles(0, 0, 'mota', { speed: { min: vel * 0.3, max: vel }, angle: { min: 200, max: 340 }, lifespan: vida, scale: { start: 0.55, end: 0 }, alpha: { start: 0.9, end: 0 }, gravityY: 520, tint: tinte, blendMode: mezcla || 'NORMAL', emitting: false }).setDepth(900);
    escena.polvo = e(0xefe6da, 130, 380); escena.chispas = e(0xffd94a, 240, 480, 'ADD');
  },

  // --- ARTE: luces, sombras y ambiente dibujados con código al empezar (lienzo 2D → textura). Ningún archivo extra.
  // Un lienzo nuevo: si ya había una textura con esa clave (al repetir el nivel), se reemplaza.
  lienzo(escena, clave, w, h, dibujar) {
    if (escena.textures.exists(clave)) escena.textures.remove(clave);
    const t = escena.textures.createCanvas(clave, w, h); dibujar(t.getContext(), w, h); t.refresh(); return t;
  },
  // Texturas de base: la mota (punto de luz suave), la sombra (óvalo difuso), el halo (luz redonda) y una hoja.
  texturas(escena) {
    const hacer = (k, w, h, fn) => { if (!escena.textures.exists(k)) Forja.lienzo(escena, k, w, h, fn); };
    const radial = (x, cx, cy, r, paradas) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); for (const [t, c] of paradas) g.addColorStop(t, c); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
    hacer('mota', 32, 32, (x) => radial(x, 16, 16, 16, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]));
    hacer('sombra', 128, 48, (x) => { x.setTransform(1, 0, 0, 48 / 128, 0, 0); radial(x, 64, 64, 64, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]); });
    hacer('halo', 128, 128, (x) => radial(x, 64, 64, 64, [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,.55)'], [0.5, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']]));
    hacer('hoja', 16, 10, (x) => { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(8, 5, 7.5, 3.6, 0.25, 0, 6.283); x.fill(); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(2, 5, 12, 0.8); });
  },
  // Color promedio de un trozo de una textura ([r, g, b]), o null si el navegador no deja leer los píxeles (file://).
  muestra(escena, clave, x = 0, y = 0, w = 0, h = 0) {
    try {
      const img = escena.textures.get(clave).getSourceImage(); w = w || img.width; h = h || img.height;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d', { willReadFrequently: true });
      k.drawImage(img, -x, -y); const d = k.getImageData(0, 0, w, h).data; let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      return n ? [r / n, g / n, b / n] : null;
    } catch (e) { return null; }
  },
  // Color de un cuadro de un atlas (por ejemplo 'gema_0' de 'objetos'), más vivo: sirve para teñir su halo del mismo color.
  colorDe(escena, clave, cuadro, defecto = 0xfff0b0) {
    const f = escena.textures.exists(clave) && escena.textures.get(clave).get(cuadro); if (!f) return defecto;
    const c = Forja.muestra(escena, clave, f.cutX, f.cutY, f.cutWidth, f.cutHeight); if (!c) return defecto;
    const m = Math.max(...c, 1), k = 255 / m;                                        // lo lleva al máximo brillo sin cambiar el tono
    return (Math.round(c[0] * k) << 16) | (Math.round(c[1] * k) << 8) | Math.round(c[2] * k);
  },
  // Paleta del lugar y la hora que eligió el alumno. Si están las losetas del escenario, sus colores mandan (así el
  // laberinto o la mazmorra combinan con el resto); si no, una tabla por ambiente. luz = color de la luz de esa hora.
  PALETA: {
    noche: { piso: [36, 38, 74], muro: [74, 78, 140], filo: [70, 160, 130], acento: [170, 186, 255], motas: 'luciernagas' },
    bosque: { piso: [88, 72, 50], muro: [46, 104, 52], filo: [96, 168, 72], acento: [255, 232, 150], motas: 'hojas' },
    cielo: { piso: [196, 214, 236], muro: [96, 160, 214], filo: [124, 204, 120], acento: [255, 255, 255], motas: 'brillos' },
    desierto: { piso: [196, 160, 108], muro: [176, 101, 58], filo: [232, 204, 146], acento: [255, 222, 160], motas: 'polvo' },
    nieve: { piso: [210, 224, 236], muro: [140, 178, 200], filo: [240, 248, 255], acento: [205, 232, 255], motas: 'nieve' },
    cueva: { piso: [40, 36, 50], muro: [78, 70, 94], filo: [112, 102, 132], acento: [140, 230, 255], motas: 'polvo' },
    ciudad: { piso: [56, 64, 82], muro: [94, 108, 134], filo: [150, 152, 162], acento: [255, 210, 120], motas: 'polvo' },
    lava: { piso: [44, 24, 22], muro: [96, 44, 36], filo: [255, 120, 50], acento: [255, 150, 60], motas: 'brasas' },
  },
  paleta(escena) {
    if (escena._paleta) return escena._paleta;
    const amb = Forja.PALETA[D.ambiente] ? D.ambiente : 'noche', hora = D.hora || 'dia', noche = hora === 'noche' || amb === 'noche' || amb === 'cueva';
    const T = Forja.PALETA[amb], luzHora = { dia: [1, 1, 1], tarde: [1, 0.86, 0.72], noche: [0.56, 0.62, 0.88], amanecer: [1, 0.86, 0.9] }[hora] || [1, 1, 1];
    const luz = amb === 'noche' || amb === 'cueva' ? luzHora.map((v, i) => v * 0.5 + [0.56, 0.62, 0.88][i] * 0.5) : luzHora;
    const muro = (escena.textures.exists('relleno') && Forja.muestra(escena, 'relleno')) || T.muro;
    const filo = (escena.textures.exists('suelo') && Forja.muestra(escena, 'suelo', 0, 3, 64, 6)) || T.filo;
    const hex = (c) => (Math.round(Math.max(0, Math.min(255, c[0]))) << 16) | (Math.round(Math.max(0, Math.min(255, c[1]))) << 8) | Math.round(Math.max(0, Math.min(255, c[2])));
    const mezcla = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t), alumbra = (c) => c.map((v, i) => v * luz[i]);
    return (escena._paleta = {
      amb, hora, noche, luz, muro, filo, piso: alumbra(T.piso), acento: T.acento, motas: T.motas, hex, mezcla, alumbra,
      css: (c, a = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`,
      sombra: noche ? 0x05040f : hora === 'tarde' ? 0x1e0c04 : 0x0d0a14,       // de qué color es la sombra (nunca negro puro)
    });
  },
  // Luz sobre los personajes: un tinte muy suave del color de la luz de esa hora (de noche azulado, en la tarde cálido),
  // para que no parezcan pegados encima del escenario. Es leve a propósito: el jugador tiene que verse siempre.
  luzPersonaje(escena) { const P = Forja.paleta(escena); return P.noche ? 0xdde3ff : P.hora === 'tarde' ? 0xffeedd : P.hora === 'amanecer' ? 0xfff0f2 : 0xffffff; },
  // Lista de cosas que se actualizan justo antes de dibujar (después de la física y de apoyar los pies).
  antesDeDibujar(escena, fn) {
    if (!escena._antes) {
      const lista = (escena._antes = []), paso = () => { for (const f of lista) f(); };
      escena.events.on('prerender', paso);
      escena.events.once('shutdown', () => { escena.events.off('prerender', paso); escena._antes = null; });
    }
    escena._antes.push(fn);
  },
  // Sombra de contacto: un óvalo oscuro y difuso bajo los pies. En el aire, la sombra se queda en el piso de abajo,
  // más chica y más clara: así se lee la altura del salto. o = { ancho, piso: (x, y) => y del piso debajo o null,
  // pie: (s) => y de los pies (si el origen del dibujo no está en los pies), prof, alfa, dx, dy, aplasta }
  sombra(escena, s, o = {}) {
    Forja.texturas(escena);
    const sh = escena.add.image(s.x, s.y, 'sombra').setDepth(o.prof ?? s.depth - 1).setTint(Forja.paleta(escena).sombra).setVisible(false);
    const ancho = o.ancho ?? (s.body ? s.body.width * 1.7 : s.displayWidth * 0.55);
    Forja.antesDeDibujar(escena, () => {
      if (!sh.active) return;
      if (!s.active || !s.visible) { sh.setVisible(false); return; }
      const pie = o.pie ? o.pie(s) : s.y, piso = o.piso ? o.piso(s.x, pie) : pie;
      if (piso == null || piso < pie - 2) { sh.setVisible(false); return; }
      const k = Math.max(0.3, 1 - (piso - pie) / 280), w = (typeof ancho === 'function' ? ancho() : ancho) * k;
      sh.setVisible(true).setPosition(s.x + (o.dx || 0), piso + (o.dy ?? 0)).setDisplaySize(w, w * (o.aplasta ?? 0.3)).setAlpha((o.alfa ?? 0.6) * k * s.alpha);
    });
    s.once('destroy', () => sh.destroy());
    return sh;
  },
  // Halo: luz redonda detrás de un objeto, con mezcla aditiva (suma luz, como un brillo). Late despacio.
  // Si el objeto desaparece, el halo también. o = { alfa, prof, dx, dy, late }
  halo(escena, obj, color = 0xfff0b0, tam = 90, o = {}) {
    Forja.texturas(escena);
    const h = escena.add.image(obj.x, obj.y, 'halo').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDisplaySize(tam, tam).setDepth(o.prof ?? obj.depth - 0.5);
    const fase = Math.random() * 6.283, alfa = o.alfa ?? 0.5, late = o.late ?? 0.25;
    if (obj.scrollFactorX !== undefined) h.setScrollFactor(obj.scrollFactorX, obj.scrollFactorY);
    Forja.antesDeDibujar(escena, () => {
      if (!h.active) return;
      h.setPosition(obj.x + (o.dx || 0), obj.y + (o.dy || 0)).setVisible(obj.active && obj.visible && !Forja.bajo);
      h.setAlpha(alfa * (obj.alpha ?? 1) * (1 - late + late * Math.sin(escena.time.now / 520 + fase)));
    });
    obj.once('destroy', () => h.destroy());
    return Forja.lujo(escena, h);
  },
  // Partículas de ambiente según el lugar y la hora: luciérnagas, hojas que caen, nieve, brasas, polvo en la luz.
  // zona = rectángulo del mundo donde aparecen. Pocas y lentas: dan vida sin distraer del juego.
  ambiente(escena, zona = { x: 0, y: 0, w: 960, h: 540 }, o = {}) {
    Forja.texturas(escena);
    const P = Forja.paleta(escena), tipo = o.tipo || (P.noche && P.motas !== 'nieve' && P.motas !== 'brasas' ? 'luciernagas' : P.motas);
    const A = {
      luciernagas: { tex: 'mota', tint: [0xd8ff8a, 0xfff0a0, 0xa8ffcf], blendMode: 'ADD', scale: { min: 0.12, max: 0.28 }, speedX: { min: -14, max: 14 }, speedY: { min: -12, max: 10 }, lifespan: 6000, brillo: 0.95 },
      hojas: { tex: 'hoja', tint: [0xc9d86a, 0xe0a24a, 0x8fbf4f], scale: { min: 0.7, max: 1.1 }, speedX: { min: 10, max: 40 }, speedY: { min: 25, max: 55 }, rotate: { start: 0, end: 540 }, lifespan: 9000, brillo: 0.85 },
      nieve: { tex: 'mota', tint: [0xffffff, 0xe6f2ff], scale: { min: 0.08, max: 0.22 }, speedX: { min: -18, max: 8 }, speedY: { min: 25, max: 60 }, lifespan: 9000, brillo: 0.9 },
      brasas: { tex: 'mota', tint: [0xffb050, 0xff7a2a, 0xffd27a], blendMode: 'ADD', scale: { min: 0.08, max: 0.2 }, speedX: { min: -12, max: 12 }, speedY: { min: -55, max: -18 }, lifespan: 5000, brillo: 0.95 },
      polvo: { tex: 'mota', tint: [P.hex(P.mezcla(P.acento, [255, 255, 255], 0.5))], blendMode: 'ADD', scale: { min: 0.06, max: 0.14 }, speedX: { min: -8, max: 8 }, speedY: { min: -6, max: 6 }, lifespan: 7000, brillo: 0.35 },
      brillos: { tex: 'mota', tint: [0xffffff, 0xfff4c8], blendMode: 'ADD', scale: { min: 0.06, max: 0.16 }, speedX: { min: -6, max: 6 }, speedY: { min: -10, max: -2 }, lifespan: 5000, brillo: 0.8 },
    }[tipo];
    if (!A) return null;
    const n = Math.max(6, Math.round((zona.w * zona.h) / (960 * 540) * (o.cuantas || 18))), vida = A.lifespan;
    const em = escena.add.particles(0, 0, A.tex, {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(zona.x, zona.y, zona.w, zona.h) },
      tint: A.tint, blendMode: A.blendMode || 'NORMAL', scale: A.scale, speedX: A.speedX, speedY: A.speedY, ...(A.rotate ? { rotate: A.rotate } : {}), lifespan: { min: vida * 0.6, max: vida },
      alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(Math.PI * t) * A.brillo * (tipo === 'luciernagas' ? 0.6 + 0.4 * Math.sin(t * 40) : 1) },
      frequency: vida / n, quantity: 1, maxParticles: n + 4, advance: vida,
    }).setDepth(o.prof ?? 950);
    if (o.fijo) em.setScrollFactor(0);
    return Forja.lujo(escena, em);
  },
  // Viñeta: oscurece un poco los bordes de la pantalla y lleva la mirada al centro.
  vineta(escena, fuerza = 0.45, color = 0x05040c) {
    if (!escena.textures.exists('vineta')) Forja.lienzo(escena, 'vineta', 480, 270, (x, w, h) => {
      x.setTransform(1, 0, 0, h / w, 0, 0); const g = x.createRadialGradient(w / 2, w / 2, w * 0.22, w / 2, w / 2, w * 0.62);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, 0, w, w);
    });
    return Forja.lujo(escena, escena.add.image(0, 0, 'vineta').setOrigin(0).setScrollFactor(0).setDisplaySize(960, 540).setDepth(980).setAlpha(fuerza).setTint(color));
  },
  // Decorados de los juegos vistos de lado: matas, flores, piedras (cuadros 'deco:0'…), el canto de un barranco ('canto')
  // y la franja de primer plano ('frente': siluetas oscuras que pasan por delante, abajo, y dan profundidad).
  decorados(escena) {
    const P = Forja.paleta(escena), c = P.css, filo = P.filo, osc = P.mezcla(filo, [0, 0, 0], 0.45), cla = P.mezcla(filo, [255, 255, 255], 0.3);
    const r = azar(D.semilla * 7 + 1), W = 40, H = 30, N = 8;
    const t = Forja.lienzo(escena, 'deco', W * N, H, (x) => {
      const mata = (ox, alto, n) => { for (let i = 0; i < n; i++) { const bx = ox + W / 2 + (i - n / 2) * 3 + r() * 2, inc = (i - n / 2) * 1.6 + (r() - 0.5) * 3, h = alto * (0.55 + r() * 0.45); x.strokeStyle = c(i % 2 ? osc : filo); x.lineWidth = 2.2; x.beginPath(); x.moveTo(bx, H); x.quadraticCurveTo(bx + inc * 0.3, H - h * 0.6, bx + inc, H - h); x.stroke(); } x.strokeStyle = c(cla, 0.8); x.lineWidth = 1; x.beginPath(); x.moveTo(ox + W / 2, H); x.lineTo(ox + W / 2 + 1, H - alto * 0.7); x.stroke(); };
      const piedra = (ox, w, h, col) => { x.fillStyle = c(P.mezcla(col, [0, 0, 0], 0.35)); x.beginPath(); x.ellipse(ox + W / 2 + 1, H - h / 2 + 1, w / 2, h / 2, 0, 0, 6.283); x.fill(); x.fillStyle = c(col); x.beginPath(); x.ellipse(ox + W / 2, H - h / 2, w / 2, h / 2, 0, 0, 6.283); x.fill(); x.fillStyle = c(P.mezcla(col, [255, 255, 255], 0.35), 0.7); x.beginPath(); x.ellipse(ox + W / 2 - w * 0.12, H - h * 0.7, w * 0.25, h * 0.16, 0, 0, 6.283); x.fill(); };
      const roca = P.mezcla(P.muro, [128, 128, 128], 0.3);
      for (let k = 0; k < N; k++) {
        const ox = k * W, tipo = ['mata', 'mata', 'flor', 'piedra', 'mata', 'arbusto', 'flor', 'piedra'][k];
        if (P.amb === 'nieve' && tipo !== 'piedra') { x.fillStyle = c([240, 247, 255]); x.beginPath(); x.ellipse(ox + W / 2, H, 12 + r() * 6, 6 + r() * 5, 0, Math.PI, 0); x.fill(); x.fillStyle = c([200, 220, 240], 0.7); x.fillRect(ox + W / 2 - 8, H - 2, 16, 2); continue; }
        if (P.amb === 'cueva' && (tipo === 'flor' || tipo === 'arbusto')) { const cr = r() < 0.5 ? [120, 230, 255] : [210, 150, 255]; for (const [dx, h, a] of [[0, 18, 0], [-6, 11, -0.4], [6, 13, 0.35]]) { x.save(); x.translate(ox + W / 2 + dx, H); x.rotate(a); x.fillStyle = c(cr, 0.9); x.beginPath(); x.moveTo(-3, 0); x.lineTo(0, -h); x.lineTo(3, 0); x.fill(); x.fillStyle = c([255, 255, 255], 0.6); x.fillRect(-0.5, -h + 3, 1, h - 4); x.restore(); } continue; }
        if (P.amb === 'lava' && tipo !== 'piedra') { piedra(ox, 16 + r() * 8, 9 + r() * 5, [60, 30, 28]); x.fillStyle = 'rgba(255,140,50,.9)'; x.fillRect(ox + W / 2 - 4, H - 6, 7, 1.5); x.fillRect(ox + W / 2 + 1, H - 9, 1.5, 4); continue; }
        if (tipo === 'piedra') piedra(ox, 14 + r() * 10, 8 + r() * 6, roca);
        else if (tipo === 'arbusto') { for (const [dx, dy, rr] of [[-7, 9, 8], [6, 9, 8], [0, 14, 10]]) { x.fillStyle = c(osc); x.beginPath(); x.arc(ox + W / 2 + dx, H - dy, rr, 0, 6.283); x.fill(); } for (const [dx, dy, rr] of [[-4, 17, 5], [5, 13, 4]]) { x.fillStyle = c(filo, 0.9); x.beginPath(); x.arc(ox + W / 2 + dx, H - dy, rr, 0, 6.283); x.fill(); } }
        else if (tipo === 'flor' && P.amb !== 'desierto' && P.amb !== 'ciudad') { mata(ox, 10, 4); const pc = r() < 0.5 ? [255, 214, 92] : [255, 150, 196]; for (const [dx, h] of [[-4, 18], [5, 14]]) { x.strokeStyle = c(osc); x.lineWidth = 1.4; x.beginPath(); x.moveTo(ox + W / 2 + dx, H); x.lineTo(ox + W / 2 + dx, H - h); x.stroke(); x.fillStyle = c(pc); for (let a = 0; a < 5; a++) { x.beginPath(); x.arc(ox + W / 2 + dx + Math.cos(a * 1.257) * 2.6, H - h + Math.sin(a * 1.257) * 2.6, 2, 0, 6.283); x.fill(); } x.fillStyle = 'rgba(255,250,220,.95)'; x.beginPath(); x.arc(ox + W / 2 + dx, H - h, 1.4, 0, 6.283); x.fill(); } }
        else mata(ox, 12 + r() * 10, 6 + Math.floor(r() * 4));
      }
    });
    for (let k = 0; k < N; k++) t.add('deco:' + k, 0, k * W, 0, W, H);
    // tira de decorados de 960 px que se repite sin costura (para el suelo que corre en el runner)
    const fuente = t.getSourceImage(), r3 = azar(D.semilla * 11 + 4);
    Forja.lienzo(escena, 'tira', 960, H, (x) => {
      for (let i = 0; i < 22; i++) { const px = r3() * 960, k = Math.floor(r3() * N), esc = 0.75 + r3() * 0.45; for (const dx of [0, 960, -960]) x.drawImage(fuente, k * W, 0, W, H, px + dx - W * esc / 2, H - H * esc, W * esc, H * esc); }
    });
    // canto de un barranco: la cara de la tierra que mira al hueco queda en sombra, con el pasto que se asoma
    Forja.lienzo(escena, 'canto', 18, 64, (x) => {
      const g = x.createLinearGradient(0, 0, 18, 0); g.addColorStop(0, c(P.mezcla(P.muro, [0, 0, 0], 0.55), 0.85)); g.addColorStop(1, c(P.mezcla(P.muro, [0, 0, 0], 0.55), 0));
      x.fillStyle = g; x.fillRect(0, 12, 18, 52);
      x.fillStyle = c(filo); x.beginPath(); x.moveTo(0, 0); x.lineTo(10, 0); x.quadraticCurveTo(4, 6, 6, 15); x.quadraticCurveTo(1, 12, 0, 18); x.fill();
      x.fillStyle = c(cla, 0.8); x.fillRect(0, 0, 9, 2);
    });
    // primer plano: siluetas de matas y piedras que se repiten sin costura (ancho 960)
    const sil = P.mezcla(P.piso, [0, 0, 0], P.noche ? 0.72 : 0.62);
    Forja.lienzo(escena, 'frente', 960, 80, (x) => {
      x.fillStyle = c(sil);
      const r2 = azar(D.semilla * 3 + 9), dib = (fn) => { for (const dx of [0, 960, -960]) fn(dx); };
      x.fillRect(0, 72, 960, 8);
      for (let i = 0; i < 26; i++) {
        const px = r2() * 960, k = r2(), w = 30 + r2() * 70, h = 14 + r2() * 30;
        dib((dx) => {
          x.beginPath();
          if (k < 0.45) { for (let b = 0; b < 9; b++) { const bx = px + dx + (b - 4.5) * w / 12, bh = h * (0.5 + r2() * 0.6); x.moveTo(bx - 3, 80); x.quadraticCurveTo(bx + (b - 4.5) * 0.8, 80 - bh * 0.6, bx + (b - 4.5) * 2, 80 - bh); x.quadraticCurveTo(bx + 1, 80 - bh * 0.5, bx + 3, 80); } }
          else if (k < 0.8) { x.ellipse(px + dx, 80, w / 2, h, 0, Math.PI, 0); x.ellipse(px + dx + w * 0.3, 80, w / 3, h * 0.75, 0, Math.PI, 0); }
          else { x.moveTo(px + dx - w / 3, 80); x.lineTo(px + dx - w / 6, 80 - h * 0.7); x.lineTo(px + dx + w / 5, 80 - h * 0.55); x.lineTo(px + dx + w / 3, 80); }
          x.fill();
        });
      }
    });
  },

  // LABERINTO EN 3/4 (vista desde arriba y un poco de frente). mapa[f][c]: 1 = muro, 0 = pasillo. Se pintan dos lienzos:
  //  · piso: baldosas (o tierra, arena, nieve…) con sombra al pie de los muros (oclusión ambiental) y viñeta.
  //  · muros: cada muro es un bloque. Su cara de arriba está iluminada (bisel claro donde da al pasillo) y, si abajo hay
  //    pasillo, se ve su cara de frente, más oscura. Los bloques vecinos se funden: no se nota la rejilla.
  // La caja de choque de cada muro sigue siendo su celda entera: el dibujo no se sale de ella.
  // o = { cw, ch, alto (fracción de la celda que ocupa la cara de frente), tinte (color que multiplica los muros), clave }
  laberinto(escena, mapa, o) {
    const P = Forja.paleta(escena), FIL = mapa.length, COL = mapa[0].length, cw = o.cw, ch = o.ch, W = Math.ceil(COL * cw), H = Math.ceil(FIL * ch);
    const r = azar(D.semilla * 13 + 5), css = P.css, mz = P.mezcla, amb = P.amb, clave = o.clave || 'laberinto';
    const esMuro = (c, f) => (f < 0 || f >= FIL || c < 0 || c >= COL ? true : mapa[f][c] !== 0);
    const hf = Math.round(ch * (o.alto ?? 0.3)), X = (c) => Math.round(c * cw), Y = (f) => Math.round(f * ch);
    const muro = P.muro, cima = mz(muro, [255, 255, 255], 0.3), frente = mz(muro, [0, 0, 0], 0.42);
    const piso = amb === 'lava' ? [40, 22, 22] : mz(mz(P.piso, mz(muro, [0, 0, 0], 0.5), 0.3), [0, 0, 0], amb === 'nieve' || amb === 'cielo' || amb === 'desierto' ? 0 : 0.18);
    const tinte = o.tinte && o.tinte !== 0xffffff ? [(o.tinte >> 16) & 255, (o.tinte >> 8) & 255, o.tinte & 255].map((v) => v / 255) : null;
    const tinta = (col) => (tinte ? col.map((v, i) => v * tinte[i]) : col);
    // ---- piso
    Forja.lienzo(escena, clave + ':piso', W, H, (x) => {
      x.fillStyle = css(piso); x.fillRect(0, 0, W, H);
      for (let f = 0; f < FIL; f++) for (let c = 0; c < COL; c++) {
        if (mapa[f][c] !== 0) continue;
        const x0 = X(c), y0 = Y(f), w = X(c + 1) - x0, h = Y(f + 1) - y0;
        if (amb === 'bosque' || amb === 'desierto') {                                // tierra o arena: granos y alguna piedrita
          for (let i = 0; i < 14; i++) { x.fillStyle = css(mz(piso, r() < 0.5 ? [255, 255, 255] : [0, 0, 0], 0.08 + r() * 0.1)); x.fillRect(x0 + r() * w, y0 + r() * h, 1.5 + r() * 2, 1.5 + r() * 1.5); }
          if (amb === 'desierto') { x.strokeStyle = css(mz(piso, [255, 255, 255], 0.12), 0.6); x.lineWidth = 1; for (let k = 0; k < 2; k++) { const yy = y0 + h * (0.3 + k * 0.4) + r() * 4; x.beginPath(); x.moveTo(x0, yy); x.quadraticCurveTo(x0 + w / 2, yy - 3, x0 + w, yy); x.stroke(); } }
          if (r() < 0.5) { const pw = 4 + r() * 5, px = x0 + 6 + r() * (w - 12), py = y0 + 6 + r() * (h - 12); x.fillStyle = css(mz(piso, [0, 0, 0], 0.3)); x.beginPath(); x.ellipse(px + 1, py + 1, pw / 2, pw / 3, 0, 0, 6.283); x.fill(); x.fillStyle = css(mz(piso, [255, 255, 255], 0.22)); x.beginPath(); x.ellipse(px, py, pw / 2, pw / 3, 0, 0, 6.283); x.fill(); }
          if (amb === 'bosque' && r() < 0.35) { x.strokeStyle = css(mz(P.filo, [0, 0, 0], 0.2), 0.8); x.lineWidth = 1.4; const px = x0 + r() * w, py = y0 + h - 4 - r() * (h - 10); for (let b = -2; b <= 2; b++) { x.beginPath(); x.moveTo(px + b * 2, py); x.lineTo(px + b * 3, py - 5 - r() * 4); x.stroke(); } }
        } else if (amb === 'nieve') {                                                 // nieve: montoncitos suaves y destellos
          for (let i = 0; i < 2; i++) { const px = x0 + r() * w, py = y0 + r() * h, rr = 8 + r() * 12, g = x.createRadialGradient(px - 2, py - 2, 0, px, py, rr); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
          for (let i = 0; i < 2; i++) { x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(x0 + r() * w, y0 + r() * h, 1.2, 1.2); }
        } else {                                                                      // baldosas: 2 × 2 por celda, cada una con su tono y su bisel
          const junta = mz(piso, [0, 0, 0], 0.22);
          x.fillStyle = css(junta); x.fillRect(x0, y0, w, h);
          for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
            const bx = x0 + i * w / 2 + 1, by = y0 + j * h / 2 + 1, bw = w / 2 - 2, bh = h / 2 - 2, t = mz(piso, r() < 0.5 ? [255, 255, 255] : [0, 0, 0], r() * 0.05);
            x.fillStyle = css(t); x.fillRect(bx, by, bw, bh);
            x.fillStyle = css(mz(t, [255, 255, 255], 0.09)); x.fillRect(bx, by, bw, 1); x.fillRect(bx, by, 1, bh);
            x.fillStyle = css(mz(t, [0, 0, 0], 0.15)); x.fillRect(bx, by + bh - 1, bw, 1); x.fillRect(bx + bw - 1, by, 1, bh);
            if (r() < 0.25) { x.strokeStyle = css(mz(t, [0, 0, 0], 0.3), 0.7); x.lineWidth = 0.8; x.beginPath(); x.moveTo(bx + r() * bw, by); x.lineTo(bx + r() * bw, by + bh * (0.4 + r() * 0.5)); x.stroke(); }
          }
        }
      }
      if (amb === 'lava') for (let f = 0; f < FIL; f++) for (let c = 0; c < COL; c++) {   // grietas de lava encendida entre algunas baldosas
        if (mapa[f][c] !== 0 || r() > 0.4) continue;
        const x0 = X(c), y0 = Y(f), w = X(c + 1) - x0, h = Y(f + 1) - y0, vertical = r() < 0.5;
        x.strokeStyle = 'rgba(255,120,40,.9)'; x.lineWidth = 1.6; x.shadowColor = 'rgba(255,110,30,.9)'; x.shadowBlur = 6; x.beginPath();
        if (vertical) { x.moveTo(x0 + w / 2, y0 + r() * h * 0.3); x.lineTo(x0 + w / 2, y0 + h * (0.6 + r() * 0.4)); } else { x.moveTo(x0 + r() * w * 0.3, y0 + h / 2); x.lineTo(x0 + w * (0.6 + r() * 0.4), y0 + h / 2); }
        x.stroke(); x.shadowBlur = 0;
      }
      // sombra al pie de los muros: la luz viene de arriba a la izquierda, así que la sombra cae a la derecha y abajo
      for (let f = 0; f < FIL; f++) for (let c = 0; c < COL; c++) {
        if (mapa[f][c] !== 0) continue;
        const x0 = X(c), y0 = Y(f), w = X(c + 1) - x0, h = Y(f + 1) - y0, banda = (x1, y1, x2, y2, a) => { const g = x.createLinearGradient(x1, y1, x2, y2); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); return g; };
        if (esMuro(c, f - 1)) { x.fillStyle = banda(0, y0, 0, y0 + 14, 0.5); x.fillRect(x0, y0, w, 14); }
        if (esMuro(c - 1, f)) { x.fillStyle = banda(x0, 0, x0 + 16, 0, 0.42); x.fillRect(x0, y0, 16, h); }
        if (esMuro(c + 1, f)) { x.fillStyle = banda(x0 + w, 0, x0 + w - 6, 0, 0.25); x.fillRect(x0 + w - 6, y0, 6, h); }
        if (esMuro(c, f + 1)) { x.fillStyle = banda(0, y0 + h, 0, y0 + h - 5, 0.22); x.fillRect(x0, y0 + h - 5, w, 5); }
      }
      Forja.grano(x, W, H, 9, r);
    });
    // ---- muros
    const pat = escena.textures.exists('relleno') ? escena.textures.get('relleno').getSourceImage() : null;
    Forja.lienzo(escena, clave + ':muros', W, H, (x) => {
      const patron = pat ? x.createPattern(pat, 'repeat') : null;
      const hielo = x.createLinearGradient(0, 0, W, H); hielo.addColorStop(0, css(tinta(P.alumbra([226, 244, 255])))); hielo.addColorStop(1, css(tinta(P.alumbra([170, 208, 230]))));
      for (let f = 0; f < FIL; f++) for (let c = 0; c < COL; c++) {
        if (!esMuro(c, f)) continue;
        const x0 = X(c), y0 = Y(f), w = X(c + 1) - x0, h = Y(f + 1) - y0, conFrente = !esMuro(c, f + 1), hTop = conFrente ? h - hf : h;
        // cara de arriba
        if (amb === 'bosque') { x.fillStyle = css(tinta(P.alumbra(mz(P.filo, [0, 0, 0], 0.45)))); x.fillRect(x0, y0, w, hTop); for (let i = 0; i < 12; i++) { const lx = x0 + 4 + r() * (w - 8), ly = y0 + 4 + r() * (hTop - 8), lr = 3.5 + r() * 4.5, t = tinta(P.alumbra(mz(P.filo, [0, 0, 0], 0.12 + r() * 0.28))); x.fillStyle = css(mz(t, [0, 0, 0], 0.35), 0.8); x.beginPath(); x.arc(lx + 1, ly + 1.5, lr, 0, 6.283); x.fill(); x.fillStyle = css(t); x.beginPath(); x.arc(lx, ly, lr, 0, 6.283); x.fill(); x.fillStyle = css(mz(t, [255, 255, 255], 0.25), 0.7); x.beginPath(); x.arc(lx - lr * 0.3, ly - lr * 0.35, lr * 0.4, 0, 6.283); x.fill(); } }
        else if (amb === 'nieve') { x.fillStyle = hielo; x.fillRect(x0, y0, w, hTop); for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(x0 + r() * w, y0 + r() * hTop, 6 + r() * 8, 3 + r() * 3, 0, 0, 6.283); x.fill(); } }
        else { x.fillStyle = css(tinta(cima)); x.fillRect(x0, y0, w, hTop); if (patron) { x.save(); x.globalAlpha = 0.5; x.globalCompositeOperation = 'overlay'; x.fillStyle = patron; x.fillRect(x0, y0, w, hTop); x.restore(); } }
        // bisel: claro donde da al pasillo de arriba o de la izquierda, oscuro a la derecha
        if (!esMuro(c, f - 1)) { x.fillStyle = 'rgba(255,255,255,.32)'; x.fillRect(x0, y0, w, 2.5); }
        if (!esMuro(c - 1, f)) { x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(x0, y0, 2, hTop); }
        if (!esMuro(c + 1, f)) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(x0 + w - 2.5, y0, 2.5, hTop); }
        // cara de frente: más oscura, con juntas, y un filo de luz donde se encuentra con la de arriba
        if (conFrente) {
          const yf = y0 + hTop, g = x.createLinearGradient(0, yf, 0, yf + hf);
          const cf = amb === 'bosque' ? P.alumbra(mz(P.filo, [0, 0, 0], 0.62)) : amb === 'nieve' ? P.alumbra([120, 168, 196]) : frente;
          g.addColorStop(0, css(tinta(mz(cf, [255, 255, 255], 0.08)))); g.addColorStop(1, css(tinta(mz(cf, [0, 0, 0], 0.35))));
          x.fillStyle = g; x.fillRect(x0, yf, w, hf);
          if (patron && amb !== 'bosque' && amb !== 'nieve') { x.save(); x.globalAlpha = 0.4; x.globalCompositeOperation = 'overlay'; x.fillStyle = patron; x.fillRect(x0, yf, w, hf); x.restore(); }
          x.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 1; k < 3; k++) x.fillRect(x0, yf + (hf * k) / 3, w, 1);
          x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(x0, yf, w, 1.5);
          if (amb === 'lava' && r() < 0.35) { x.strokeStyle = 'rgba(255,140,50,.8)'; x.lineWidth = 1.2; x.beginPath(); let sx = x0 + 6 + r() * (w - 12); x.moveTo(sx, yf + hf); for (let k = 1; k <= 3; k++) { sx += (r() - 0.5) * 5; x.lineTo(sx, yf + hf - (hf * k) / 3); } x.stroke(); }
          if (!esMuro(c - 1, f)) { x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(x0, yf, 2, hf); }
          if (!esMuro(c + 1, f)) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(x0 + w - 2.5, yf, 2.5, hf); }
        }
      }
    });
    const pisoImg = escena.add.image(0, 0, clave + ':piso').setOrigin(0).setDepth(-6);
    const murosImg = escena.add.image(0, 0, clave + ':muros').setOrigin(0).setDepth(-5);
    if (o.ancho) { pisoImg.setDisplaySize(o.ancho, o.alto2 || H); murosImg.setDisplaySize(o.ancho, o.alto2 || H); }
    // viñeta y luz de la hora encima de todo el laberinto (fija, no cuesta nada mientras se juega)
    Forja.lienzo(escena, clave + ':luz', 480, 270, (x, w, h) => {
      const g = x.createRadialGradient(w * 0.42, h * 0.38, w * 0.15, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, css(P.mezcla(P.luz.map((v) => v * 255), [255, 255, 255], 0.5), 0.08)); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${P.noche ? 0.55 : 0.35})`);
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    escena.add.image(0, 0, clave + ':luz').setOrigin(0).setDisplaySize(W, H).setDepth(-4.5);
    return { piso: pisoImg, muros: murosImg };
  },
  // grano: ruido fino sobre un lienzo (como la textura de un papel o de la piedra)
  grano(x, w, h, fuerza, r) {
    const img = x.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * fuerza; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    x.putImageData(img, 0, 0);
  },

  // --- CALIDAD: si el juego no llega a ~40 cuadros por segundo, se prueba apagar los lujos (partículas de ambiente,
  // halos, viñeta, primer plano) unos segundos. Si así va más rápido, quedan apagados; si va igual (el navegador limita
  // los cuadros, por ejemplo en modo ahorro de batería), se vuelven a encender: no tiene sentido verse peor para nada.
  // En datos.js, «calidad: 'baja'» (o 'alta') lo fija a mano.
  bajo: D.calidad === 'baja',
  lujo(escena, obj) {
    if (!escena._lujos) { escena._lujos = []; escena.events.once('shutdown', () => { escena._lujos = null; }); }
    escena._lujos.push(obj); if (Forja.bajo) obj.setVisible(false); return obj;
  },
  lujos(escena, encender) {
    for (const o of escena._lujos || []) if (o.active) { o.setVisible(encender); if (o.stop && !encender) o.stop(); if (o.start && encender) o.start(); }
  },
  vigilar(escena) {
    window.FORJA_CALIDAD = Forja.bajo ? 'baja' : 'alta';
    if (Forja.bajo || D.calidad === 'alta' || Forja.sinCulpa) return;
    let malas = 0, prueba = null;
    const fps = () => escena.game.loop.actualFps;
    escena.time.delayedCall(3000, () => escena.time.addEvent({ delay: 1500, loop: true, callback: () => {   // mide después de 3 s (al empezar todo va lento)
      if (Forja.sinCulpa || (Forja.bajo && !prueba)) return;
      if (prueba) {                                                                  // 3 s sin lujos: ¿mejoró?
        if (++prueba.n < 2) return;
        if (fps() > prueba.antes + 8) { window.FORJA_CALIDAD = 'baja'; Forja.bajo = true; }
        else { Forja.bajo = false; Forja.sinCulpa = true; Forja.lujos(escena, true); window.FORJA_CALIDAD = 'alta'; }   // no eran los lujos
        prueba = null; return;
      }
      malas = fps() < 40 ? malas + 1 : 0;                                            // tres medidas malas seguidas (4,5 s): no es un tirón suelto
      if (malas < 3) return;
      prueba = { antes: fps(), n: 0 }; Forja.bajo = true; Forja.lujos(escena, false); window.FORJA_CALIDAD = 'probando';
    } }));
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
    // Cada capa empieza en la primera fila que tiene dibujo: lo de arriba es transparente y pintarlo gastaría tiempo.
    escena.capas = ['capa0', 'capa1', 'capa2'].map((k, i) => { const y = Forja.techo(escena, k); return escena.add.tileSprite(0, y, 960, 540 - y, k).setOrigin(0).setScrollFactor(0).setDepth(-9 + i).setTilePosition(0, y); });
  },
  // primera fila (de arriba hacia abajo) en la que una imagen tiene algo dibujado; 0 si no se puede medir
  techo(escena, clave) {
    try {
      const img = escena.textures.get(clave).getSourceImage(), c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, img.width, img.height).data;
      for (let y = 0; y < img.height; y++) for (let px = 0; px < img.width; px += 3) if (d[(y * img.width + px) * 4 + 3] > 8) return Math.max(0, y - 2);
    } catch (e) { /* sin permiso para leer píxeles */ }
    return 0;
  },
  paralaje(escena, x) { escena.capas.forEach((c, i) => { c.tilePositionX = x * [0.12, 0.3, 0.55][i]; }); if (escena.frente) escena.frente.tilePositionX = x * 1.3; },
  // primer plano: la franja de siluetas pasa por delante, más rápido que el juego (está más cerca de la cámara)
  primerPlano(escena) { escena.frente = Forja.lujo(escena, escena.add.tileSprite(0, 460, 960, 80, 'frente').setOrigin(0).setScrollFactor(0).setDepth(960)); return escena.frente; },

  iniciar(Escena, gravedad = 0) {
    window.juego = new Phaser.Game({
      type: Phaser.AUTO, parent: 'juego', width: 960, height: 540, backgroundColor: '#14111c',
      physics: { default: 'arcade', arcade: { gravity: { y: gravedad }, debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: Escena,
    });
  },
};
