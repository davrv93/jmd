// FORTALEZA · cruza la fortaleza sala por sala: trepa bordes, esquiva trampas, cruza espadas y sal antes de que acabe el reloj.
// Plantilla de Forja (JMD Learning) para Phaser 4, del género de plataformas cinemáticas (movimiento con peso, saltos medidos).
// Algoritmos: generar la fortaleza con una semilla, colgarse de un borde, daño por caída, trampas con ritmo, duelo de espadas.
// Todo número que ves con R('…', …) es una REGLA que elegiste en «Diseña tu videojuego» (catálogo motor/juegos/fortaleza.js).
const R = (k, d) => Forja.regla(k, d);
const W = 64, GR = 26, TOPE = 40;                          // ancho de baldosa, grosor del piso, margen de arriba
const jugar = (s, k) => { if (s.scene && s.scene.anims.exists(k)) s.play(k, true); };
const CONTACTO = 0.38;   // en el dibujo del golpe, el brazo (o la embestida) llega al blanco al 38 % de la animación

// Las reglas del nivel n (con la dificultad creciente si hay varios niveles seguidos)
function reglasDelNivel(n) {
  const dif = ({ no: 0, suave: 1, fuerte: 2 }[R('nivel.dificultad', 'suave')] || 0) * (n - 1);
  return {
    PH: R('nivel.alturaPiso', 185), COLS: R('nivel.columnasSala', 15), SALAS: R('nivel.salas', 3) + Math.floor(dif / 2), PISOS: R('nivel.pisos', 3),
    densidad: Math.min(0.6, R('trampas.densidad', 0.15) + 0.04 * dif), huecos: Math.min(0.45, R('nivel.huecos', 0.1) + 0.02 * dif),
    gSalud: R('guardias.salud', 3) + Math.floor(dif / 2), gAtaque: Math.max(0.45, R('guardias.ataqueCada', 1.6) - 0.1 * dif),
  };
}

// >>> generar
// La fortaleza es una rejilla: filas = pisos, columnas = baldosas. Cada celda es piso (P), hueco (H), piso que se
// desmorona (D), pinchos (S), cuchilla (C), placa (L) o salida (E). Todo sale de una semilla: misma semilla, misma fortaleza.
// Para que siempre se pueda cruzar: en cada sala y piso hay al menos un hueco para trepar (con piso firme debajo y a los
// lados), los huecos no pasan del ancho que permiten las reglas, y cada reja tiene una placa a cada lado.
function generar(semilla, K) {
  const r = azar(semilla), COLS = K.SALAS * K.COLS, G = [];
  for (let p = 0; p < K.PISOS; p++) G.push(Array.from({ length: COLS }, () => ({ t: 'P' })));
  const fijo = new Set(), k = (p, c) => p + ',' + c, libre = (p, c) => c > 0 && c < COLS - 1 && G[p][c].t === 'P' && !fijo.has(k(p, c));
  const reservar = (p, c) => { if (p >= 0 && p < K.PISOS && c >= 0 && c < COLS) fijo.add(k(p, c)); };
  const azarEn = (a, b) => a + Math.floor(r() * (b - a + 1));
  // inicio y salida
  const ini = { p: { arriba: 0, abajo: K.PISOS - 1 }[R('nivel.inicio', 'arriba')] ?? azarEn(0, K.PISOS - 1), c: 1 };
  for (let c = 0; c < 4; c++) reservar(ini.p, c);
  const reglaSal = R('nivel.salida', 'ultima');
  const sSal = reglaSal === 'azar' ? azarEn(Math.max(1, Math.floor(K.SALAS / 2)), K.SALAS - 1) : K.SALAS - 1;
  const sal = { p: reglaSal === 'alto' ? 0 : reglaSal === 'bajo' ? K.PISOS - 1 : azarEn(0, K.PISOS - 1), c: sSal * K.COLS + (reglaSal === 'azar' ? azarEn(4, K.COLS - 3) : K.COLS - 3) };
  if (sSal === 0 && sal.p === ini.p) sal.c = Math.max(sal.c, 8);
  for (let c = sal.c - 2; c <= sal.c + 2; c++) reservar(sal.p, c);
  G[sal.p][sal.c].t = 'E';
  // huecos para trepar entre pisos
  for (let s = 0; s < K.SALAS; s++) for (let p = 0; p < K.PISOS - 1; p++) for (let n = 0; n < R('nivel.subidas', 1); n++) {
    for (let intento = 0; intento < 60; intento++) {
      const c = s * K.COLS + azarEn(2, K.COLS - 3);
      if (!libre(p, c) || (!libre(p, c - 1) && !libre(p, c + 1)) || fijo.has(k(p + 1, c)) || G[p + 1][c].t !== 'P') continue;
      G[p][c].t = 'H'; reservar(p, c - 1); reservar(p, c + 1); reservar(p + 1, c); reservar(p + 1, c - 1); reservar(p + 1, c + 1); break;
    }
  }
  // rejas con una placa a cada lado (y a veces una placa trampa que la cierra)
  const rejas = [], placas = [], nRejas = { no: 0, pocas: Math.ceil(K.SALAS / 2), muchas: K.SALAS }[R('trampas.rejas', 'pocas')] || 0;
  for (let n = 0; n < nRejas; n++) {
    for (let intento = 0; intento < 90; intento++) {
      const s = intento < 30 ? n % K.SALAS : azarEn(0, K.SALAS - 1), p = azarEn(0, K.PISOS - 1), c = s * K.COLS + azarEn(4, K.COLS - 5);   // primero en su sala; si no cabe, en otra
      let ok = true; for (let i = -3; i <= 3; i++) if (!libre(p, c + i)) ok = false;
      if (!ok) continue;
      const id = rejas.length; rejas.push({ p, c });
      for (let i = -3; i <= 3; i++) reservar(p, c + i);
      G[p][c - 2].t = 'L'; placas.push({ p, c: c - 2, modo: 'abre', reja: id });
      G[p][c + 2].t = 'L'; placas.push({ p, c: c + 2, modo: 'abre', reja: id });
      if (R('rejas.placasTrampa', false)) { G[p][c + 1].t = 'L'; placas.push({ p, c: c + 1, modo: 'cierra', reja: id }); }
      break;
    }
  }
  // huecos para saltar (y fosos en el piso de abajo)
  const fosos = R('nivel.fosos', 'no');
  for (let p = 0; p < K.PISOS; p++) {
    if (p === K.PISOS - 1 && fosos === 'no') continue;
    for (let c = 3; c < COLS - 3; c++) {
      if (r() > K.huecos * 0.5) continue;
      const w = azarEn(1, R('nivel.huecoMax', 2));
      let ok = true; for (let i = -1; i <= w; i++) if (!libre(p, c + i)) ok = false;
      if (!ok) continue;
      for (let i = 0; i < w; i++) G[p][c + i].t = 'H';
      reservar(p, c - 1); reservar(p, c + w); c += w + 2;
    }
  }
  // celdas libres para objetos y guardias
  const celdaLibre = (desdeSala = 0, hastaSala = K.SALAS - 1) => {
    for (let intento = 0; intento < 300; intento++) {
      const p = azarEn(0, K.PISOS - 1), c = azarEn(desdeSala * K.COLS + 2, Math.min(COLS - 3, (hastaSala + 1) * K.COLS - 2));
      if (G[p][c].t === 'P' && !fijo.has(k(p, c))) { fijo.add(k(p, c)); return { p, c }; }
    }
    return null;
  };
  const objetos = [], pon = (tipo, n, desde = 0, extra = {}) => { for (let i = 0; i < n; i++) { const q = celdaLibre(desde); if (q) objetos.push({ tipo, ...q, ...extra }); } };
  const objetivo = R('objetivo.tipo', 'salir');
  pon('gema', Math.max(R('recursos.gemas', 5), objetivo === 'gemas' ? R('objetivo.gemas', 5) : 0));
  pon('moneda', R('recursos.monedas', 2) * K.SALAS);
  pon('curar', R('recursos.pocionCurar', 2)); pon('max', R('recursos.pocionMax', 1)); pon('pluma', R('recursos.pocionPluma', 1));
  pon('reloj', R('recursos.relojes', 1)); pon('cofre', R('recursos.cofres', 1));
  if (objetivo === 'tesoro') pon('tesoro', 1, Math.max(0, K.SALAS - 2));
  if (objetivo === 'llave' && R('objetivo.llaveJefe', 'escondida') === 'escondida') pon('llave', R('objetivo.llaves', 1), 1);
  if (R('objetivo.salidaAbre', 'objetivo') === 'placa') { const q = celdaLibre(Math.max(0, sSal - 1)); if (q) { G[q.p][q.c].t = 'L'; placas.push({ ...q, modo: 'salida' }); } }
  // guardias
  const guardias = [], por = R('guardias.porSala', 0.5);
  for (let s = 0; s < K.SALAS; s++) {
    const n = por === 0.5 ? (s % 2 === 1 ? 1 : 0) : por === 2 ? (s === 0 ? 1 : 2) : por === 1 ? (s === 0 ? 0 : 1) : 0;
    for (let i = 0; i < n; i++) { const q = celdaLibre(s, s); if (q && (s > 0 || q.c > 7)) guardias.push(q); }
  }
  if ((objetivo === 'guardias' || (objetivo === 'llave' && R('objetivo.llaveJefe', 'escondida') === 'guardia')) && !guardias.length) { const q = celdaLibre(K.SALAS - 1); if (q) guardias.push(q); }
  // trampas sobre el piso que queda libre
  const tipos = [];
  if (R('trampas.pinchos', 'visibles') !== 'no') tipos.push('S', 'S');
  if (R('trampas.cuchillas', true)) tipos.push('C', 'C');
  const dm = R('trampas.desmorona', 'pocos'); if (dm === 'pocos') tipos.push('D'); if (dm === 'muchos') tipos.push('D', 'D', 'D', 'D');
  if (tipos.length) for (let p = 0; p < K.PISOS; p++) for (let c = 4; c < COLS - 2; c++) {
    if (!libre(p, c) || r() > K.densidad) continue;
    G[p][c].t = tipos[Math.floor(r() * tipos.length)]; reservar(p, c - 1); reservar(p, c + 1);
  }
  return { G, COLS, ini, sal, rejas, placas, objetos, guardias };
}
// <<<

class Fortaleza extends Phaser.Scene {
  init(datos) { this.lleva = datos && datos.nivel ? datos : { nivel: 1 }; }
  preload() { Forja.precargar(this, ['cielo', 'capa0', 'capa1', 'relleno', 'suelo']); }

  create() {
    Forja.animaciones(this); Forja.efectos(this);
    const K = (this.K = reglasDelNivel(this.lleva.nivel)), PH = K.PH;
    const semilla = R('nivel.semilla', 'fija') === 'nueva' ? 1 + Math.floor(Math.random() * 1e6) : D.semilla * 977 + this.lleva.nivel * 131;
    const N = (this.N = generar(semilla, K));
    this.yS = (p) => TOPE + (p + 1) * PH;                                       // altura del piso de la fila p
    this.techo = (p) => (p === 0 ? TOPE : this.yS(p - 1) + GR);                 // dónde empieza el techo de esa fila
    const ancho = N.COLS * W, alto = this.yS(K.PISOS - 1) + GR + 220;
    this.ancho = ancho; this.alto = alto;
    // fondo: cielo y dos capas (se ven por las ventanas) y la muralla de piedra de cada sala (ver mazmorra())
    this.add.image(0, 0, 'cielo').setOrigin(0).setScrollFactor(0).setDepth(-10).setTint(0xb4aac8);
    this.capas = ['capa0', 'capa1'].map((k, i) => { const y = Forja.techo(this, k); return this.add.tileSprite(0, y, 960, 540 - y, k).setOrigin(0).setScrollFactor(0).setDepth(-9 + i).setTilePosition(0, y).setTint(i ? 0x8a80a8 : 0xa096bc); });
    this.mazmorra(ancho, alto);
    // pisos (cuerpos sólidos) y lo que va dibujado encima de cada celda
    this.pisos = this.physics.add.staticGroup();
    this.dib = this.add.graphics().setDepth(3);
    this.pinchos = []; this.cuchillas = []; this.desmoronan = [];
    const fase = R('trampas.cuchillaFase', 'desfase'), r = azar(semilla + 5);
    for (let p = 0; p < K.PISOS; p++) for (let c = 0; c < N.COLS; c++) {
      const cel = N.G[p][c]; if (cel.t === 'H') continue;
      this.losa(p, c);
      if (cel.t === 'S') this.pinchos.push({ p, c, alto: R('trampas.pinchos', 'visibles') === 'ocultos' ? 0 : 1 });
      if (cel.t === 'C') this.cuchillas.push({ p, c, fase: fase === 'juntas' ? 0 : r() * 10, cierre: 0 });
      if (cel.t === 'D') { cel.slab.setTint(0xc79a6a); this.desmoronan.push({ p, c, t: -1 }); }
    }
    if (R('nivel.fosos', 'no') === 'pinchos') this.fosoPinchos = true;
    this.rejas = N.rejas.map((g) => ({ ...g, x: g.c * W + W / 2, abierto: 0, objetivo: 0, timer: 0, rapido: false }));
    this.placas = N.placas.map((q) => ({ ...q, pisada: false }));
    this.salidaPlaca = false;
    // salida
    this.puerta = { x: N.sal.c * W + W / 2, p: N.sal.p };
    this.add.sprite(this.puerta.x + 46, this.yS(N.sal.p) - 70, 'objetos').setScale(70 / 64).play('meta').setDepth(4);
    // objetos
    this.items = this.physics.add.group({ allowGravity: false });
    const SPR = { gema: 'gema', moneda: 'moneda', curar: 'pocion', max: 'corazon', pluma: 'pocion', reloj: 'estrella', cofre: 'cofre', tesoro: 'cofre', llave: 'llave' };
    for (const o of N.objetos) this.ponItem(o.tipo, o.c * W + W / 2, this.yS(o.p) - 34, SPR);
    this.SPR = SPR;
    // héroe
    const ini = N.ini;
    const h = (this.heroe = Forja.cuerpo(this.physics.add.sprite(ini.c * W + W / 2, this.yS(ini.p) - 2, 'heroe', 'quieto_0'), D.heroe, 100));
    // Alturas medidas en el dibujo (no en el cuadro, que tiene aire arriba): de pie y colgado con los brazos arriba
    this.altoHeroe = Forja.altoDibujo(h, 'quieto'); this.altoColgado = Forja.altoDibujo(h, 'saltar', Math.round(0.45 * Forja.cuadros('heroe', 'saltar')));
    this.tGolpe = Forja.dura('heroe', 'golpe'); this.tDano = Forja.dura('heroe', 'dano'); this.ritmoGolpe = 1; this.pasoAtras = 0; this.empujeT = 0;
    h.setDepth(10).setMaxVelocity(900, R('reglas.velocidadCaida', 900));
    this.physics.add.collider(h, this.pisos, (a, losa) => { if (losa.getData('tipo') === 'D' && h.body.touching.down) this.pisaDesmorona(losa); });
    this.physics.add.overlap(h, this.items, (a, it) => this.tocaItem(it));
    // guardias
    const est = R('guardias.estilo', 'espada'), E = { espada: [70, 1, 1, 0], lanza: [100, 1.3, 1, 0], escudo: [70, 1.1, 2, 0], veloz: [65, 0.65, 0.8, -1] }[est] || [70, 1, 1, 0];
    const llaveGuardia = R('objetivo.tipo', 'salir') === 'llave' && R('objetivo.llaveJefe', 'escondida') === 'guardia';
    this.guardias = N.guardias.map((q, i) => {
      const jefe = R('guardias.jefe', false) && i === N.guardias.length - 1 && Math.floor(q.c / K.COLS) === K.SALAS - 1;
      const g = Forja.cuerpo(this.physics.add.sprite(q.c * W + W / 2, this.yS(q.p) - 2, 'enemigo', 'quieto_0'), D.enemigo, jefe ? 118 : 104).setDepth(9);
      if (jefe) g.setTint(0xffd27a);
      const salud = Math.max(1, K.gSalud + E[3] + (jefe ? 3 : 0));
      g.setData({ p: q.p, estado: 'patrulla', dir: i % 2 ? 1 : -1, salud, max: salud, t: 1, prep: 0, inmune: 0, alerta: 0, alc: E[0], mAtaque: E[1], mBloqueo: E[2], llave: llaveGuardia && i < R('objetivo.llaves', 1) });
      g.vida = this.add.text(g.x, g.y - 130, '', { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ff8fa8', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);
      this.physics.add.collider(g, this.pisos);
      return g;
    });
    // estado del juego
    const L = this.lleva;
    this.corMax = L.corMax || R('heroe.corazonesMax', 5);
    this.cor = Math.min(this.corMax, L.cor || R('heroe.corazones', 3));
    this.vidasExtra = L.vidasExtra ?? R('heroe.vidasExtra', 0);
    this.tiempoTotal = R('recursos.tiempo', 5) * 60; this.tiempo = L.tiempo ?? this.tiempoTotal; this.sinBonus = false;
    this.puntos = L.puntos || 0; this.gemas = 0; this.llaves = 0; this.tesoro = false; this.guardado = 0;
    this.gemasTotal = N.objetos.filter((o) => o.tipo === 'gema').length;
    // la misión nunca pide más de lo que el generador logró colocar
    this.gemasMeta = Math.min(R('objetivo.gemas', 5), this.gemasTotal);
    this.llavesMeta = Math.min(R('objetivo.llaves', 1), N.objetos.filter((o) => o.tipo === 'llave').length + this.guardias.filter((g) => g.getData('llave')).length) || 0;
    this.modo = 'suelo'; this.mira = 1; this.girando = 0; this.tCorrer = 0; this.caidaDesde = h.y; this.inmune = R('heroe.inicioInvencible', 0); this.pluma = 0;
    this.atacando = 0; this.bloqueoT = 0; this.contra = false; this.recupera = 0; this.salasVistas = new Set([0]);
    this.seguro = { x: h.x, y: h.y };
    this.leer = Forja.controles(this); this.abajoAntes = false;   // caminar con cuidado y beber poción son acciones (c.cuidado, c.pocionYa)
    this.texto = Forja.marcador(this); this.pista = this.add.graphics().setDepth(940); this.capaX = this.add.graphics().setDepth(960);
    // cámara y límites
    this.physics.world.setBounds(0, 0, ancho, alto + 400); this.physics.world.setBoundsCollision(true, true, false, false);   // paredes a los lados, sin piso abajo (fosos)
    h.setCollideWorldBounds(true); for (const g of this.guardias || []) g.setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, Math.max(ancho, 960), Math.max(alto, 540));
    if (R('nivel.camara', 'salas') === 'sigue') this.cameras.main.startFollow(h, true, 0.12, 0.12, 0, 60);
    this.luz();
    this.arte();
    this.inicio = this.time.now;
    if (L.nivel > 1) { const av = Forja.aviso(this, 'Nivel ' + L.nivel); this.time.delayedCall(1600, () => av.destroy()); }
    this.pinta();
  }

  // ARTE DE LA MAZMORRA: muralla de sillares con ventanas en arco (por ellas se ve el cielo), columnas entre salas, techo
  // con cornisa, losas de piedra para los pisos y un abismo oscuro abajo. Todo se dibuja con código al empezar.
  mazmorra(ancho, alto) {
    const P = Forja.paleta(this), K = this.K, PH = K.PH, r = azar(D.semilla * 17 + 3), css = P.css, mz = P.mezcla;
    const piedra = mz(mz(P.muro, [74, 68, 86], 0.55), [0, 0, 0], 0.42), luzVentana = P.noche ? [150, 170, 230] : P.hora === 'tarde' ? [255, 190, 120] : [255, 244, 214];
    const bloque = (x, bx, by, bw, bh, base) => {                                    // un sillar con bisel
      const t = mz(base, r() < 0.5 ? [255, 255, 255] : [0, 0, 0], r() * 0.12);
      x.fillStyle = css(t); x.fillRect(bx, by, bw, bh);
      x.fillStyle = css(mz(t, [255, 255, 255], 0.14)); x.fillRect(bx, by, bw, 1.5); x.fillRect(bx, by, 1.5, bh);
      x.fillStyle = css(mz(t, [0, 0, 0], 0.3)); x.fillRect(bx, by + bh - 2, bw, 2); x.fillRect(bx + bw - 2, by, 2, bh);
      if (r() < 0.12) { x.strokeStyle = css(mz(t, [0, 0, 0], 0.4), 0.8); x.lineWidth = 1; x.beginPath(); let cx = bx + r() * bw, cy = by + 2; x.moveTo(cx, cy); for (let k = 0; k < 3; k++) { cx += (r() - 0.5) * 10; cy += bh / 3.5; x.lineTo(cx, cy); } x.stroke(); }
      if ((P.amb === 'bosque' || P.amb === 'noche') && r() < 0.14) { x.fillStyle = css(mz(P.filo, [0, 0, 0], 0.45), 0.55); for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(bx + r() * bw, by + r() * 4, 1.5 + r() * 2.5, 0, 6.283); x.fill(); } }
    };
    // muralla: una franja de 480 × alto de un piso; se repite. La ventana queda en medio de lo que se ve de la pared.
    Forja.lienzo(this, 'muralla', 480, PH, (x, w, h) => {
      x.fillStyle = css(mz(piedra, [0, 0, 0], 0.45)); x.fillRect(0, 0, w, h);
      const filas = Math.max(4, Math.round(h / 26)), bh = h / filas;
      for (let f = 0; f < filas; f++) {                                              // cada hilera suma exactamente el ancho: se repite sin costura
        const anchos = []; let suma = 0; while (suma < w) { const bw = 44 + Math.floor(r() * 4) * 12; anchos.push(bw); suma += bw; }
        anchos[anchos.length - 1] -= suma - w; if (anchos[anchos.length - 1] < 30) { const u = anchos.pop(); anchos[anchos.length - 1] += u; }
        let bx = f % 2 ? -30 : 0;
        for (const bw of anchos) { for (const dx of [0, w, -w]) bloque(x, bx + dx + 1, f * bh + 1, bw - 2, bh - 2, piedra); bx += bw; r(); }
      }
      const cx = w / 2, vw = 26, ys = GR + (h - GR) * 0.66, alto2 = Math.min(78, (h - GR) * 0.48);
      // rayo de luz que entra por la ventana
      const rayo = x.createLinearGradient(cx, ys - alto2, cx + 60, h); rayo.addColorStop(0, css(luzVentana, 0.16)); rayo.addColorStop(1, css(luzVentana, 0));
      x.fillStyle = rayo; x.beginPath(); x.moveTo(cx - vw, ys - alto2 + vw); x.lineTo(cx + vw, ys - alto2 + vw); x.lineTo(cx + vw + 70, h); x.lineTo(cx - vw + 30, h); x.fill();
      const arco = () => { x.beginPath(); x.moveTo(cx - vw, ys); x.lineTo(cx - vw, ys - alto2 + vw); x.arc(cx, ys - alto2 + vw, vw, Math.PI, 0); x.lineTo(cx + vw, ys); x.closePath(); };
      arco(); x.lineWidth = 12; x.strokeStyle = css(mz(piedra, [255, 255, 255], 0.12)); x.stroke(); x.lineWidth = 2; x.strokeStyle = css(mz(piedra, [0, 0, 0], 0.5)); x.stroke();
      x.fillStyle = css(mz(piedra, [255, 255, 255], 0.2)); x.fillRect(cx - vw - 8, ys, vw * 2 + 16, 6); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(cx - vw - 8, ys + 6, vw * 2 + 16, 3);
      x.save(); x.globalCompositeOperation = 'destination-out'; arco(); x.fill(); x.restore();              // el hueco: aquí se ve el cielo
      x.fillStyle = 'rgba(20,18,28,.9)'; x.fillRect(cx - 1.5, ys - alto2, 3, alto2); x.fillRect(cx - vw, ys - alto2 * 0.45, vw * 2, 3);   // reja de la ventana
      // sombra del techo arriba y del piso abajo
      const g = x.createLinearGradient(0, GR, 0, GR + 36); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, GR, w, 36);
      const g2 = x.createLinearGradient(0, h - 26, 0, h); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.4)'); x.fillStyle = g2; x.fillRect(0, h - 26, w, 26);
    });
    this.add.tileSprite(0, TOPE, ancho, alto - TOPE, 'muralla').setOrigin(0).setDepth(-5);
    // columnas entre salas: cilindro de piedra con capitel y basa
    Forja.lienzo(this, 'pilar', 34, PH, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, css(mz(piedra, [0, 0, 0], 0.5))); g.addColorStop(0.35, css(mz(piedra, [255, 255, 255], 0.18))); g.addColorStop(1, css(mz(piedra, [0, 0, 0], 0.6)));
      x.fillStyle = g; x.fillRect(3, 0, w - 6, h);
      for (let y = GR + 26; y < h; y += 26) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(3, y, w - 6, 1.5); }
      x.fillStyle = css(mz(piedra, [255, 255, 255], 0.1)); x.fillRect(0, GR, w, 7); x.fillRect(0, h - 8, w, 8);
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, GR + 7, w, 2);
    });
    for (let s = 0; s <= K.SALAS; s++) this.add.tileSprite(s * K.COLS * W - 17, TOPE, 34, alto - TOPE, 'pilar').setOrigin(0).setDepth(-4);
    // techo con cornisa
    Forja.lienzo(this, 'techo', 64, TOPE, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, css(mz(piedra, [0, 0, 0], 0.7))); g.addColorStop(1, css(mz(piedra, [0, 0, 0], 0.35))); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = css(mz(piedra, [255, 255, 255], 0.15)); x.fillRect(0, h - 9, w, 4); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, h - 5, w, 5); x.fillRect(31, 0, 2, h - 9);
    });
    this.add.tileSprite(0, 0, ancho, TOPE, 'techo').setOrigin(0).setDepth(2);
    // losas de los pisos: cara de arriba gastada y clara, cara de frente con juntas. Tres variantes y una agrietada.
    const losa = mz(piedra, [255, 255, 255], 0.1);
    const t = Forja.lienzo(this, 'losaF', W * 4, GR, (x) => {
      for (let k = 0; k < 4; k++) {
        const ox = k * W, b = mz(losa, r() < 0.5 ? [255, 255, 255] : [0, 0, 0], r() * 0.08);
        const g = x.createLinearGradient(0, 7, 0, GR); g.addColorStop(0, css(b)); g.addColorStop(1, css(mz(b, [0, 0, 0], 0.4))); x.fillStyle = g; x.fillRect(ox, 7, W, GR - 7);
        x.fillStyle = css(mz(b, [255, 255, 255], 0.22)); x.fillRect(ox, 0, W, 7);
        x.fillStyle = css(mz(b, [255, 255, 255], 0.45)); x.fillRect(ox, 0, W, 1.5);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ox, 7, W, 1.5); x.fillRect(ox, GR - 2, W, 2);
        const jx = ox + 14 + Math.floor(r() * 36); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(jx, 8, 1.5, GR - 9); x.fillStyle = css(mz(b, [255, 255, 255], 0.15)); x.fillRect(jx + 1.5, 8, 1, GR - 9);
        for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},.12)`; x.fillRect(ox + r() * W, 1 + r() * (GR - 3), 1.5, 1.5); }
        if (k === 3) { x.strokeStyle = 'rgba(30,18,10,.85)'; x.lineWidth = 1.4; for (const sx of [14, 38, 52]) { x.beginPath(); let cx = ox + sx, cy = 0; x.moveTo(cx, cy); while (cy < GR) { cx += (r() - 0.5) * 9; cy += 4 + r() * 4; x.lineTo(cx, cy); } x.stroke(); } }
      }
    });
    for (let k = 0; k < 4; k++) t.add('l' + k, 0, k * W, 0, W, GR);
    // abismo: debajo del último piso todo se pierde en la oscuridad
    const yAb = this.yS(K.PISOS - 1) + GR;
    Forja.lienzo(this, 'abismo', 4, 64, (x) => { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(4,3,8,0)'); g.addColorStop(0.5, 'rgba(4,3,8,.75)'); g.addColorStop(1, 'rgba(4,3,8,.97)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); });
    this.add.image(0, yAb, 'abismo').setOrigin(0).setDisplaySize(ancho, alto - yAb + 400).setDepth(-3);
  }

  // Antorchas (una por sala y piso), sombras bajo los pies, brillo en lo que se recoge, polvo en la luz y viñeta.
  arte() {
    const P = Forja.paleta(this), K = this.K;
    this.heroe.setTint(Forja.luzPersonaje(this));   // (los guardias no: su color avisa si es el jefe o si va a atacar)
    Forja.lienzo(this, 'antorcha', 20, 36, (x) => {
      x.fillStyle = '#2a2230'; x.fillRect(4, 22, 12, 4); x.fillRect(8, 26, 4, 10);                       // soporte de hierro
      const g = x.createLinearGradient(6, 0, 14, 0); g.addColorStop(0, '#5a3a22'); g.addColorStop(0.5, '#8a5a34'); g.addColorStop(1, '#4a2e1a');
      x.fillStyle = g; x.fillRect(7, 6, 6, 18); x.fillStyle = '#3a2416'; x.fillRect(6, 4, 8, 4);          // palo y cabeza
    });
    this.antorchas = [];
    for (let s = 0; s < K.SALAS; s++) for (let p = 0; p < K.PISOS; p++) {
      const x = s * K.COLS * W + (K.COLS * W) / 2, y = this.yS(p) - (K.PH - GR) * 0.58;
      this.add.image(x, y, 'antorcha').setOrigin(0.5, 0.15).setDepth(-2);
      Forja.lujo(this, this.add.particles(x, y - 2, 'mota', { speedY: { min: -60, max: -25 }, speedX: { min: -8, max: 8 }, scale: { start: 0.42, end: 0 }, alpha: { start: 0.95, end: 0 }, lifespan: { min: 260, max: 460 }, frequency: 45, tint: [0xffe08a, 0xffa040, 0xff7a2a], blendMode: 'ADD' }).setDepth(-1.9));
      const luz = Forja.lujo(this, this.add.image(x, y, 'halo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff9040).setDisplaySize(440, 440).setDepth(-1.8));
      this.antorchas.push({ luz, fase: Math.random() * 10 });
    }
    // la luz de la antorcha tiembla: dos ondas rápidas que no coinciden nunca
    Forja.antesDeDibujar(this, () => { const t = this.time.now / 1000; for (const a of this.antorchas) a.luz.setAlpha(0.5 + 0.07 * Math.sin(t * 9 + a.fase) + 0.05 * Math.sin(t * 23.7 + a.fase * 2)); });
    this.luzPuerta = Forja.lujo(this, this.add.image(this.puerta.x, this.yS(this.puerta.p) - 60, 'halo').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe2a0).setDisplaySize(260, 260).setAlpha(0.6).setDepth(3.5).setVisible(false));
    // el piso que hay debajo de (x, y): la primera fila de losas por debajo de los pies que no sea hueco
    const piso = (this.pisoDe = (x, y) => { const c = Math.floor(x / W); for (let p = 0; p < K.PISOS; p++) if (this.yS(p) >= y - 4 && this.solido(p, c)) return this.yS(p); return null; });
    Forja.sombra(this, this.heroe, { piso, prof: 4.5 });
    for (const g of this.guardias) Forja.sombra(this, g, { piso, prof: 4.5 });
    for (const it of this.items.getChildren()) this.arteItem(it);
    Forja.halo(this, this.heroe, 0xffe2b0, 240, { alfa: 0.1, late: 0.05, dy: -50, prof: 4.6 });
    Forja.ambiente(this, { x: 0, y: TOPE, w: this.ancho, h: this.alto - TOPE - 200 }, { tipo: 'polvo', cuantas: 9, prof: 12 });
    Forja.vineta(this, 0.5);
    Forja.vigilar(this);
  }
  arteItem(it) {
    Forja.sombra(this, it, { piso: this.pisoDe, prof: 4.5, ancho: 30, alfa: 0.4, pie: (q) => q.y + 14 });
    const col = { gema: 0x8fe4ff, moneda: 0xffd25a, curar: 0xff7aa8, max: 0xff7aa8, pluma: 0x9fd8ff, reloj: 0xfff07a, cofre: 0xffd24a, tesoro: 0xffd24a, llave: 0xffe08a }[it.getData('tipo')] || 0xfff0b0;
    Forja.halo(this, it, col, 90, { alfa: 0.45, prof: 4.6 });
  }

  losa(p, c) {
    const cel = this.N.G[p][c], s = this.pisos.create(c * W + W / 2, this.yS(p) + GR / 2, 'losaF', cel.t === 'D' ? 'l3' : 'l' + ((c * 7 + p * 3) % 3)).setDisplaySize(W, GR).refreshBody();
    s.setData({ tipo: cel.t, p, c }); cel.slab = s; return s;
  }
  ponItem(tipo, x, y, SPR = this.SPR) {
    const nombre = D.objetos.includes(SPR[tipo]) ? SPR[tipo] : 'gema';
    const it = this.items.create(x, y, 'objetos').setScale((tipo === 'tesoro' ? 64 : 44) / 64).play(nombre).setData('tipo', tipo).setDepth(5);
    if (tipo === 'pluma') it.setTint(0x9fd8ff); if (tipo === 'tesoro') it.setTint(0xffd24a);
    if (this.pisoDe) this.arteItem(it);   // lo que aparece a mitad del juego (un cofre que se abre, una llave) también brilla
    return it;
  }

  // ---------------------------------------------------------------- utilidades de la rejilla
  solido(p, c) { return p >= 0 && p < this.K.PISOS && c >= 0 && c < this.N.COLS && this.N.G[p][c].t !== 'H'; }
  filaDe(y) { for (let p = 0; p < this.K.PISOS; p++) if (Math.abs(y - this.yS(p)) < 10) return p; return -1; }
  salaDe(x) { return Math.max(0, Math.min(this.K.SALAS - 1, Math.floor(x / (this.K.COLS * W)))); }

  // >>> bordes
  // Colgarse de un borde: un borde es el canto de un piso que tiene un hueco al lado. Se busca en la fila de arriba
  // (para trepar desde el suelo con ↑) o en la propia fila (para bajar colgándose con ↓). Colgado, el cuerpo no cae:
  // se apaga la física y el héroe queda con las manos en el canto. ↑ trepa, ↓ se suelta.
  bordeCerca(p, x, rango) {
    if (p < 0) return null;
    const c0 = Math.floor(x / W);
    for (const c of [c0, c0 - 1, c0 + 1]) {
      if (this.solido(p, c)) continue;                                              // c debe ser un hueco
      for (const lado of [-1, 1]) {                                                  // lado = hacia dónde está el piso firme
        if (!this.solido(p, c + lado)) continue;
        const bx = lado < 0 ? c * W : (c + 1) * W;
        if (Math.abs(bx - x) < rango) return { p, x: bx, lado };
      }
    }
    return null;
  }
  colgar(b, desdeAbajo) {
    const h = this.heroe; this.modo = 'trepando'; h.body.enable = false; h.setVelocity(0, 0); this.borde = b; this.tColgado = 0;
    h.setFlipX(b.lado < 0); this.mira = b.lado;
    // colgado: asoma sobre el canto lo de arriba del dibujo (manos y cabeza, el 18 %), pegado a la pared del hueco
    const destino = { x: b.x - b.lado * 20, y: this.yS(b.p) + this.altoColgado * 0.82 };
    this.tweens.add({ targets: h, x: destino.x, y: destino.y, duration: desdeAbajo ? R('mov.trepar', 0.6) * 450 : 160, ease: 'Sine.easeOut',
      onComplete: () => { this.modo = 'colgado'; } });
    Forja.pose(h, 'colgado');
  }
  trepar() {
    const h = this.heroe, b = this.borde; this.modo = 'trepando';
    // primero se impulsa colgado; en la segunda mitad sube las piernas: agachado sobre el canto; al final, de pie
    Forja.pose(h, 'colgado'); this.time.delayedCall(R('mov.trepar', 0.6) * 650 * 0.55, () => { if (this.modo === 'trepando') Forja.pose(h, 'agachado'); });
    this.tweens.add({ targets: h, y: this.yS(b.p) - 2, duration: R('mov.trepar', 0.6) * 650, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: h, x: b.x + b.lado * 26, duration: R('mov.trepar', 0.6) * 650, ease: 'Sine.easeIn',
      onComplete: () => { h.body.enable = true; h.body.reset(h.x, h.y); this.modo = 'suelo'; this.caidaDesde = h.y; } });
  }
  soltar() {
    const h = this.heroe; h.body.enable = true; h.body.reset(h.x - this.borde.lado * 8, h.y); this.modo = 'aire'; this.caidaDesde = h.y;
  }
  // <<<

  // >>> caida
  // Daño por caída: al despegar se anota la altura de los pies; al aterrizar se mide cuántos pisos bajaste.
  // Hasta «caída segura» no pasa nada; cada piso de más quita corazones; desde «caída que te vence», pierdes todo.
  // Con la poción de caída lenta la gravedad baja y no hay daño.
  aterrizar() {
    const h = this.heroe, pisos = (h.y - this.caidaDesde) / this.K.PH;
    this.polvo.explode(6, h.x, h.y);
    const p = this.filaDe(h.y), c = Math.floor(h.x / W);
    if (p >= 0 && this.N.G[p][c].t === 'S' && this.pincho(p, c)?.alto > 0.5) this.herir(R('reglas.danoPinchos', 1), null);
    if (this.pluma > 0) return;
    const mortal = R('reglas.caidaMortal', 3), segura = R('reglas.caidaSegura', 1);
    if (mortal > 0 && pisos >= mortal - 0.15) this.herir(99, null);
    else if (pisos > segura + 0.15) this.herir(Math.ceil(pisos - segura) * R('reglas.danoCaida', 1), null);   // una caída no empuja
  }
  // <<<

  pincho(p, c) { return this.pinchos.find((s) => s.p === p && s.c === c); }
  pisaDesmorona(losa) { const d = this.desmoronan.find((x) => x.p === losa.getData('p') && x.c === losa.getData('c')); if (d && d.t < 0) d.t = R('trampas.desmoronaTiempo', 0.6); }

  tocaItem(it) {
    const tipo = it.getData('tipo'), modoP = R('reglas.pocionesAuto', 'tocar');
    if (['curar', 'max', 'pluma'].includes(tipo)) {
      if (modoP === 'abajo' && !(this.ctl && this.ctl.abajo)) return;
      if (tipo === 'curar' && modoP === 'guardar') { this.guardado++; return this.recoger(it, 'moneda'); }
      this.beber(tipo); return this.recoger(it, 'celebrar');
    }
    if (tipo === 'gema') { this.gemas++; this.puntos += R('resultado.puntosGema', 10); this.tiempo += R('recursos.tiempoGema', 0); }
    if (tipo === 'moneda') this.puntos += R('resultado.puntosMoneda', 1);
    if (tipo === 'reloj') this.tiempo += R('recursos.relojSuma', 30);
    if (tipo === 'llave') this.llaves++;
    if (tipo === 'corazon') this.cor = Math.min(this.corMax, this.cor + 1);
    if (tipo === 'cofre' || tipo === 'tesoro') {
      this.puntos += R('resultado.puntosCofre', 10);
      if (tipo === 'tesoro') this.tesoro = true;
      else { const da = R('recursos.cofreDa', 'tiempo'); if (da === 'tiempo') this.tiempo += 30; if (da === 'corazon') this.cor = Math.min(this.corMax, this.cor + 1); if (da === 'pocion') this.guardado++; if (da === 'gemas') { this.gemas += 3; this.puntos += 3 * R('resultado.puntosGema', 10); } }
    }
    this.recoger(it, tipo === 'moneda' ? 'moneda' : 'celebrar');
  }
  recoger(it, sonido) { this.chispas.explode(10, it.x, it.y); Forja.sonar(this, sonido, 0.4); it.destroy(); this.pinta(); }
  beber(tipo) {
    if (tipo === 'curar') { const n = R('recursos.curaCantidad', 1); this.cor = Math.min(this.corMax, this.cor + n); }
    if (tipo === 'max') { this.corMax++; this.cor = this.corMax; }
    if (tipo === 'pluma') this.pluma = R('recursos.plumaDura', 8);
    this.pinta();
  }

  // desde = x de lo que te golpeó (el empujón te aleja de ahí); null = sin empujón (caídas, pinchos al aterrizar)
  herir(n, desde) {
    const h = this.heroe; if (this.inmune > 0 || this.modo === 'fin') return;
    this.cor -= n; this.inmune = R('jugador.inmunidad', 1); Forja.sonar(this, 'dano', 0.6); this.cameras.main.shake(140, 0.006);
    this.atacando = 0;                                                             // el golpe recibido corta tu ataque
    const emp = R('reglas.empujeGolpe', 220), lado = desde == null ? 0 : Math.sign(h.x - desde) || -this.mira;
    if (this.modo === 'suelo' && emp && lado) { h.setVelocity(lado * emp, -emp * 0.6); this.modo = 'aire'; this.caidaDesde = h.y; this.empujeT = 0.25; }
    const pausa = R('reglas.pausaGolpe', 60); if (pausa) { this.physics.world.pause(); this.time.delayedCall(pausa, () => this.physics.world.resume()); }
    if (this.cor <= 0) this.sinCorazones();
    this.pinta();
  }
  sinCorazones() {
    if (this.vidasExtra > 0) { this.vidasExtra--; this.cor = R('heroe.corazones', 3); this.volver('sala'); const av = Forja.aviso(this, 'Otro intento · quedan ' + this.vidasExtra); this.time.delayedCall(1200, () => av.destroy()); return; }
    this.fin(false, 'Sin corazones');
  }
  volver(donde) {
    const h = this.heroe, N = this.N;
    let x = this.seguro.x, y = this.seguro.y;
    if (donde === 'nivel') { x = N.ini.c * W + W / 2; y = this.yS(N.ini.p) - 2; }
    if (donde === 'sala') {
      const s = this.salaDe(h.x), c = s * this.K.COLS + 1;
      for (let p = 0; p < this.K.PISOS; p++) if (this.solido(p, c)) { x = c * W + W / 2; y = this.yS(p) - 2; break; }
    }
    if (this.modo === 'colgado' || this.modo === 'trepando') { this.tweens.killTweensOf(h); h.body.enable = true; }
    h.body.reset(x, y); this.modo = 'suelo'; this.caidaDesde = y;
  }

  objetivoCumplido() {
    const o = R('objetivo.tipo', 'salir');
    if (o === 'llave') return this.llaves >= this.llavesMeta;
    if (o === 'gemas') return this.gemas >= this.gemasMeta;
    if (o === 'guardias') return this.guardias.every((g) => g.getData('estado') === 'muerto');
    if (o === 'tesoro') return this.tesoro;
    return true;
  }
  salidaAbierta() {
    const a = R('objetivo.salidaAbre', 'objetivo');
    return this.objetivoCumplido() && (a !== 'placa' || this.salidaPlaca);
  }

  fin(gana, texto) {
    if (this.modo === 'fin') return;
    const h = this.heroe; this.modo = 'fin';
    if (!h.body.enable) { this.tweens.killTweensOf(h); h.body.enable = true; }
    h.setVelocity(0, 0);
    if (!gana) { jugar(h, 'heroe:morir'); Forja.sonar(this, 'morir'); Forja.aviso(this, texto + '\nR para repetir'); return; }
    jugar(h, 'heroe:celebrar'); Forja.sonar(this, 'celebrar', 0.6); this.chispas.explode(30, h.x, h.y - 60);
    if (!this.sinBonus && this.tiempoTotal) this.puntos += Math.floor(this.tiempo) * R('resultado.puntosTiempo', 1);
    this.puntos += this.cor * R('resultado.puntosCorazon', 10);
    const niveles = R('objetivo.niveles', 1);
    if (this.lleva.nivel < niveles) {
      Forja.aviso(this, 'Nivel ' + this.lleva.nivel + ' superado\n' + this.puntos + ' puntos');
      this.time.delayedCall(2200, () => this.scene.restart({ nivel: this.lleva.nivel + 1, puntos: this.puntos, cor: this.cor, corMax: this.corMax, vidasExtra: this.vidasExtra, tiempo: this.tiempoTotal ? this.tiempo : undefined }));
      return;
    }
    // estrellas: qué tan bien lo hiciste según la regla elegida
    const crit = R('resultado.estrellas', 'tiempo'), um = R('resultado.umbral', 0.66);
    const frac = crit === 'corazones' || (crit === 'tiempo' && !this.tiempoTotal) ? this.cor / this.corMax : crit === 'gemas' ? (this.gemasTotal ? this.gemas / this.gemasTotal : 1) : this.tiempo / this.tiempoTotal;
    const est = frac >= um ? 3 : frac >= um / 2 ? 2 : 1;
    const seg = Math.floor((this.time.now - this.inicio) / 1000), muestra = R('resultado.muestra', 'ambos');
    let linea = muestra === 'puntos' ? this.puntos + ' puntos' : muestra === 'tiempo' ? seg + ' s' : this.puntos + ' puntos · ' + seg + ' s';
    if (R('resultado.record', true)) { try { const k = 'forja.fortaleza.record', antes = +localStorage.getItem(k) || 0; if (this.puntos > antes) localStorage.setItem(k, this.puntos); linea += '\nRécord: ' + Math.max(antes, this.puntos); } catch (e) { /* sin almacenamiento */ } }
    Forja.aviso(this, '¡Escapaste! ' + '★'.repeat(est) + '☆'.repeat(3 - est) + '\n' + linea + '\nR para repetir');
  }

  pinta() {
    const tl = this.tiempoTotal ? '   ⏱ ' + Math.floor(Math.max(0, this.tiempo) / 60) + ':' + String(Math.floor(Math.max(0, this.tiempo) % 60)).padStart(2, '0') : '';
    const o = R('objetivo.tipo', 'salir'), meta = o === 'gemas' ? '   Gemas ' + this.gemas + '/' + this.gemasMeta : o === 'llave' ? '   Llaves ' + this.llaves + '/' + this.llavesMeta : o === 'guardias' ? '   Guardias ' + this.guardias.filter((g) => g.getData('estado') !== 'muerto').length : o === 'tesoro' ? (this.tesoro ? '   Tesoro ✓' : '   Tesoro ✗') : '   Gemas ' + this.gemas;
    this.texto.setText('♥'.repeat(Math.max(0, this.cor)) + '♡'.repeat(Math.max(0, this.corMax - this.cor)) + (this.guardado ? '   Pociones ' + this.guardado : '') + tl + meta + '   ' + this.puntos + ' pts' + (this.pluma > 0 ? '   Pluma ' + Math.ceil(this.pluma) + ' s' : ''));
  }

  luz() {
    const modo = R('nivel.luz', 'clara'); if (modo === 'clara') return;
    const k = 'fortaleza-luz-' + modo;
    if (!this.textures.exists(k)) {
      const t = this.textures.createCanvas(k, 1200, 1200), x = t.getContext(), [a, b, fuera] = modo === 'oscuro' ? [0.1, 0.24, 0.96] : [0.1, 0.32, 0.68];
      const g = x.createRadialGradient(600, 600, 0, 600, 600, 600);
      g.addColorStop(0, 'rgba(8,6,14,0)'); g.addColorStop(a, 'rgba(8,6,14,0)'); g.addColorStop(b, `rgba(8,6,14,${fuera})`); g.addColorStop(1, `rgba(8,6,14,${fuera})`);
      x.fillStyle = g; x.fillRect(0, 0, 1200, 1200); t.refresh();
    }
    this.sombra = this.add.image(0, 0, k).setScale(2).setDepth(900);
  }

  update(t, ms) {
    const dt = Math.min(0.05, ms / 1000), h = this.heroe, c = (this.ctl = this.leer()), K = this.K;
    if (c.rayosX) Forja.rayosX(this);
    if (c.repetir) { this.scene.restart({ nivel: 1 }); return; }
    h.body.debugShowBody = h.body.enable;                                         // colgado (sin física) no se dibuja una caja vieja
    const abajoYa = (c.ya ? c.ya('abajo') : false) || (c.abajo && !this.abajoAntes); this.abajoAntes = c.abajo;   // un toque rápido de ↓ también cuenta
    this.actualizarTrampas(t / 1000, dt);
    this.actualizarGuardias(dt);
    this.camara(dt);
    if (this.sombra) this.sombra.setPosition(h.x, h.y - 50);
    if (this.verX) this.dibujarX(t / 1000);
    if (this.modo === 'fin') return;
    // reloj, recuperación, pociones guardadas, inmunidad, pluma
    if (this.tiempoTotal && !this.sinBonus) {
      this.tiempo -= dt;
      if (this.tiempo <= 0) { this.tiempo = 0; if (R('resultado.sinTiempo', 'pierdes') === 'pierdes') { this.fin(false, 'Se acabó el tiempo'); return; } this.sinBonus = true; }
    }
    const cada = R('heroe.recupera', 0); if (cada) { this.recupera += dt; if (this.recupera >= cada) { this.recupera = 0; if (this.cor < this.corMax) { this.cor++; this.pinta(); } } }
    if (c.pocionYa && this.guardado > 0) { this.guardado--; this.beber('curar'); Forja.sonar(this, 'celebrar', 0.4); }
    this.inmune = Math.max(0, this.inmune - dt); h.setAlpha(this.inmune > 0 && Math.floor(this.inmune * 14) % 2 ? 0.45 : 1);
    if (this.pluma > 0) { this.pluma -= dt; h.body.setGravityY(-this.physics.world.gravity.y * (1 - R('reglas.plumaGravedad', 0.35))); h.body.maxVelocity.y = 200; }
    else { h.body.setGravityY(0); h.body.maxVelocity.y = R('reglas.velocidadCaida', 900); }
    if (Math.floor(t / 250) !== this.ultPinta) { this.ultPinta = Math.floor(t / 250); this.pinta(); }
    // sala nueva: segundos extra
    const sala = this.salaDe(h.x); if (!this.salasVistas.has(sala)) { this.salasVistas.add(sala); this.tiempo += R('recursos.tiempoSala', 0); }

    if (this.modo === 'trepando') return;
    if (this.modo === 'colgado') {
      this.tColgado += dt; const max = R('mov.colgarMax', 3);
      if (c.saltoYa) this.trepar(); else if (abajoYa || (max > 0 && this.tColgado > max)) this.soltar();
      return;
    }
    const piso = h.body.blocked.down || h.body.touching.down;
    if (piso && this.modo === 'aire') { this.modo = 'suelo'; this.aterrizar(); if (this.modo === 'fin') return; }
    if (!piso && this.modo === 'suelo') { this.modo = 'aire'; this.caidaDesde = h.y; }
    const p = piso ? this.filaDe(h.y) : -1;
    if (piso && p >= 0 && ['P', 'L', 'E'].includes(this.N.G[p][Math.floor(h.x / W)].t)) this.seguro = { x: h.x, y: h.y };
    // caer a un foso
    if (h.y > this.yS(K.PISOS - 1) + 170) {
      this.herir(this.fosoPinchos ? R('reglas.danoPinchos', 1) : 1, null); if (this.modo === 'fin') return;
      this.inmune = 0.6; this.volver(R('heroe.respawn', 'seguro')); return;
    }
    const duelo = this.guardias.find((g) => g.getData('estado') === 'duelo' && g.getData('p') === p && Math.abs(g.x - h.x) < g.getData('alc') * 3);
    const cuidado = !!this.ctl?.cuidado;
    // ---- espada (fuera o dentro del duelo)
    this.atacando = Math.max(0, this.atacando - dt); this.bloqueoT = Math.max(0, this.bloqueoT - dt); this.empujeT = Math.max(0, this.empujeT - dt);
    // El dibujo del golpe va a un ritmo tal que el brazo llega al blanco JUSTO cuando cuenta el golpe (tras «preparar»);
    // después termina a su velocidad normal. Así lo que ves y lo que pasa coinciden.
    const aturdido = this.inmune > 0 && R('jugador.inmunidad', 1) - this.inmune < this.tDano;   // mientras se ve el golpe recibido, no atacas
    if (c.golpeYa && this.atacando <= 0 && !aturdido) {
      const prep = this.contra && R('duelo.contraataque', 'normal') === 'rapido' ? 0 : R('duelo.preparar', 0.12); this.contra = false;
      this.ritmoGolpe = Phaser.Math.Clamp((CONTACTO * this.tGolpe) / Math.max(0.01, prep), 0.4, 3);
      this.atacando = (CONTACTO * this.tGolpe) / this.ritmoGolpe + (1 - CONTACTO) * this.tGolpe;
      Forja.pose(h, 'golpe', { reinicia: true, ritmo: this.ritmoGolpe });
      this.time.delayedCall(prep * 1000, () => { this.ritmoGolpe = 1; if (this.modo !== 'fin') this.golpear(); });
    }
    if (duelo && abajoYa) { this.bloqueoT = R('duelo.bloqueo', 0.3); }
    // ---- movimiento
    if (piso) {
      if (duelo) {                                                               // en duelo: de frente, pasos cortos
        const hacia = Math.sign(duelo.x - h.x) || 1; this.mira = hacia; h.setFlipX(hacia < 0);
        const atras = c.x && Math.sign(c.x) !== hacia, adelante = c.x && Math.sign(c.x) === hacia;
        // paso atrás: un saltito corto de «duelo.retroceso» px en 0,12 s (no un salto de posición), sin caerse del borde
        if (atras && !this.atrasAntes && this.pasoAtras <= 0) this.pasoAtras = 0.12;
        this.atrasAntes = atras;
        let vx = adelante && Math.abs(duelo.x - h.x) > 50 ? hacia * 55 : 0;
        if (this.pasoAtras > 0) { this.pasoAtras -= dt; vx = -hacia * R('duelo.retroceso', 25) / 0.12; if (!this.solido(p, Math.floor((h.x + vx * dt - hacia * h.body.width / 2) / W))) vx = 0; }
        if (this.empujeT <= 0) h.setVelocityX(vx);
        if (c.saltoYa && R('duelo.saltar', false)) this.saltar(c, piso);
      } else {
        const objetivo = c.abajo ? 0 : c.x * (cuidado ? R('mov.cuidado', 80) : R('mov.correr', 220)) * (this.atacando > 0 ? 0.3 : 1);   // al dar el golpe frena: el dibujo del golpe no camina
        if (c.x && Math.sign(c.x) !== this.mira && !this.girando) this.girando = R('mov.giro', 0.08) || 0.0001;
        if (this.girando > 0) { this.girando -= dt; if (this.girando <= 0) { this.girando = 0; this.mira = Math.sign(c.x) || this.mira; } }
        h.setFlipX(this.mira < 0);
        let vx = this.girando > 0 ? 0 : Phaser.Math.Linear(h.body.velocity.x, objetivo, Math.min(1, dt * R('mov.aceleracion', 7)));
        if (this.empujeT > 0) vx = h.body.velocity.x;                              // durante el empujón de un golpe no frenas
        if (cuidado && R('mov.cuidadoBorde', 'frena') === 'frena' && p >= 0) {     // con cuidado no te caes del borde
          const delante = h.x + vx * dt + Math.sign(vx) * h.body.width * 0.25;
          if (!this.solido(p, Math.floor(delante / W))) vx = 0;
        }
        h.setVelocityX(vx);
        this.tCorrer = Math.abs(vx) > R('mov.correr', 220) * 0.8 ? this.tCorrer + dt : 0;
        if (c.saltoYa) this.saltar(c, piso);
        else if (abajoYa && p >= 0) {                                             // ↓ junto a un borde: bajar colgándose
          const b = this.bordeCerca(p, h.x, W * 0.7);
          if (b && Math.abs(b.x - h.x) < W * 0.6) this.colgar(b, false);
        }
      }
    } else if (this.modo === 'aire') {
      // agarrarse en el aire: las manos cruzan la altura de un piso junto a un borde
      const ag = R('mov.agarre', 'arriba');
      if (ag !== 'no' && h.body.velocity.y > 0 && (ag === 'auto' || c.salto)) {
        const manos = h.y - this.altoHeroe * 0.92;
        for (let q = 0; q < K.PISOS; q++) {
          if (Math.abs(manos - this.yS(q)) > 14) continue;
          const b = this.bordeCerca(q, h.x, W * 0.55); if (b) { this.colgar(b, false); break; }
        }
      }
    }
    // rejas que bloquean el paso
    for (const g of this.rejas) {
      if (g.p !== p && !(this.modo === 'aire' && Math.abs(h.y - this.yS(g.p)) < 60)) continue;
      const fondo = this.techo(g.p) + (this.yS(g.p) - this.techo(g.p)) * (1 - g.abierto), cabeza = h.y - this.altoHeroe * 0.9;
      const medio = h.body.width / 2 + 8;
      if (fondo > cabeza + 8 && Math.abs(h.x - g.x) < medio) {
        const lado = h.x < g.x ? -1 : 1; h.x = g.x + lado * medio; h.setVelocityX(0);
        if (g.cerrando && R('reglas.rejaAplasta', 'empuja') === 'dana') this.herir(1, g.x);
      }
    }
    // pinchos al pasar corriendo
    if (piso && p >= 0) {
      const cc = Math.floor(h.x / W), s = this.N.G[p][cc].t === 'S' ? this.pincho(p, cc) : null;
      if (s && s.alto > 0.5 && (Math.abs(h.body.velocity.x) > R('mov.cuidado', 80) + 15 || R('reglas.pinchosCuidado', 'seguro') === 'dana')) this.herir(R('reglas.danoPinchos', 1), h.x + this.mira * 10);   // te echa hacia atrás
    }
    // salida
    if (piso && p === this.puerta.p && Math.abs(h.x - this.puerta.x) < W * 0.6 && c.saltoYa && this.salidaAbierta()) { this.fin(true); return; }
    // animación
    // >>> pose
    // La animación sale del estado del cuerpo: daño (lo que dura su dibujo), golpe (entero), en el aire (según suba o baje),
    // agachado, o andando con pasos al ritmo de la rapidez real (con cuidado, pasos lentos).
    const dano = this.inmune > 0 && R('jugador.inmunidad', 1) - this.inmune < this.tDano;
    const g0 = this.physics.world.gravity.y, sube = Math.sqrt(2 * g0 * R('mov.alturaSalto', 40));
    if (this.modo !== 'trepando' && this.modo !== 'colgado') Forja.pose(h, dano ? 'dano' : this.atacando > 0 ? 'golpe' : !piso ? 'aire' : c.abajo && !duelo ? 'agachado' : 'andar',
      { v: Forja.rapidez(h, 'x'), max: R('mov.correr', 220), vy: h.body.velocity.y, salto: sube, ritmo: this.atacando > 0 ? this.ritmoGolpe : 1 });
    // <<<
    this.marcaRuta();
  }

  saltar(c, piso) {
    const h = this.heroe, p = this.filaDe(h.y);
    // ↑ debajo de un hueco con borde: saltar y colgarse
    const b = this.bordeCerca(p - 1, h.x, W * 0.9);
    if (b && !c.x) { this.colgar(b, true); return; }
    if (b && Math.abs(b.x - h.x) < W * 0.5) { this.colgar(b, true); return; }
    const g = this.physics.world.gravity.y * (this.pluma > 0 ? R('reglas.plumaGravedad', 0.35) : 1);
    const vy = Math.sqrt(2 * g * R('mov.alturaSalto', 40)), aire = (2 * vy) / g;
    const largo = this.tCorrer >= R('mov.carreraNecesaria', 0.2) && Math.abs(h.body.velocity.x) > R('mov.correr', 220) * 0.7;
    const dist = largo ? R('mov.saltoCarrera', 2.5) * W : c.x ? R('mov.saltoParado', 1.25) * W : 0;
    h.setVelocity(this.mira * dist / aire, -vy); this.modo = 'aire'; this.caidaDesde = h.y;
    Forja.sonar(this, 'salto', 0.4); this.polvo.explode(5, h.x, h.y);
  }

  // >>> duelo
  // Duelo de espadas: el golpe tiene una preparación (te pueden ver venir) y un alcance. El guardia bloquea con cierta
  // probabilidad. Tú bloqueas con ↓ en una ventana corta: si su golpe llega dentro de la ventana, no te hace daño.
  // El guardia decide con una máquina de estados: patrulla → alerta → duelo, y vuelve a patrullar si te alejas.
  golpear() {
    const h = this.heroe, p = this.filaDe(h.y), alc = R('duelo.alcance', 75);
    for (const g of this.guardias) {
      if (g.getData('estado') === 'muerto' || g.getData('p') !== p || g.getData('inmune') > 0) continue;
      const dx = g.x - h.x; if (Math.sign(dx) !== this.mira || Math.abs(dx) > alc + g.body.width / 2) continue;
      const enDuelo = g.getData('estado') === 'duelo';
      if (enDuelo && g.getData('prep') <= 0 && Math.random() < R('guardias.bloqueo', 0.3) * g.getData('mBloqueo')) { this.chispas.explode(8, (g.x + h.x) / 2, g.y - 70); Forja.sonar(this, 'golpe', 0.3); return; }
      g.setData('salud', g.getData('salud') - 1).setData('inmune', Math.max(0.3, Forja.dura('enemigo', 'dano'))).setData('estado', 'duelo');
      // retrocede «guardias.retrocede» px en 0,15 s, alejándose de ti (sin salirse de su tramo de piso), y corta su ataque
      g.setData({ empuje: 0.15, empujeV: Math.sign(dx) * R('guardias.retrocede', 40) / 0.15, prep: 0, remata: 0 }); g.clearTint(); g.anims.timeScale = 1;
      Forja.pose(g, 'dano', { reinicia: true }); Forja.sonar(this, 'golpe');
      const pausa = R('reglas.pausaGolpe', 60); if (pausa) { this.physics.world.pause(); this.time.delayedCall(pausa, () => this.physics.world.resume()); }
      if (g.getData('salud') <= 0) this.vencer(g);
      return;
    }
  }
  vencer(g) {
    g.setData('estado', 'muerto'); g.body.enable = false; jugar(g, 'enemigo:morir'); g.vida.setText('');
    this.tweens.add({ targets: g, alpha: 0, delay: 600, duration: 400 });
    this.puntos += R('resultado.puntosGuardia', 25); this.chispas.explode(18, g.x, g.y - 60);
    const y = this.yS(g.getData('p')) - 34, cor = R('guardias.corazon', 'nada');
    if (cor === 'siempre' || (cor === 'mitad' && Math.random() < 0.5)) this.ponItem('corazon', g.x, y, { ...this.SPR, corazon: 'corazon' });
    for (let i = 0; i < R('recursos.monedasGuardia', 1); i++) this.ponItem('moneda', g.x + (i - 1) * 26, y - 20);
    if (g.getData('llave')) this.ponItem('llave', g.x, y - 40);
    this.pinta();
  }
  actualizarGuardias(dt) {
    const h = this.heroe, hp = this.filaDe(h.y), cuidado = !!this.ctl?.cuidado;
    for (const g of this.guardias) {
      g.vida.setPosition(g.x, g.y - (g.displayHeight || 120) - 8);
      if (g.getData('estado') === 'muerto') continue;
      g.vida.setText('♥'.repeat(Math.max(0, g.getData('salud'))));
      const p = g.getData('p'), seg = this.segmento(p, g.x), vel = R('guardias.velocidad', 80);
      g.setData('inmune', Math.max(0, g.getData('inmune') - dt));
      const dx = h.x - g.x, mismo = hp === p && this.modo !== 'colgado' && this.modo !== 'trepando';
      const ve = mismo && Math.abs(dx) < R('guardias.alcance', 300) * (cuidado ? R('mov.sigilo', 0.5) : 1) && !this.rejaEntre(p, g.x, h.x);
      let estado = g.getData('estado'), vx = 0;
      if (estado === 'patrulla') {
        if (ve) { g.setData('alerta', g.getData('alerta') + dt); if (g.getData('alerta') >= R('guardias.alerta', 0.3)) estado = 'duelo'; }
        let dir = g.getData('dir'); if (g.x <= seg.min + 4) dir = 1; if (g.x >= seg.max - 4) dir = -1; g.setData('dir', dir); vx = dir * vel * 0.5;
      } else {
        const lejos = !mismo || (R('duelo.envainar', 'auto') === 'auto' && Math.abs(dx) > R('guardias.alcance', 300) * 1.5);
        if (lejos) { estado = 'patrulla'; g.setData('alerta', 0); }
        else {
          const d0 = g.getData('alc') * 0.85; g.setData('dir', Math.sign(dx) || 1);
          vx = Math.abs(dx) > d0 + 10 ? Math.sign(dx) * vel : Math.abs(dx) < d0 - 18 ? -Math.sign(dx) * vel * 0.5 : 0;
          // ataque: preparar y luego golpear
          let tA = g.getData('t') - dt, prep = g.getData('prep');
          // aviso del golpe: se tiñe y el dibujo toma impulso despacio; el brazo llega justo cuando el golpe cuenta
          if (prep > 0) { prep -= dt; g.setTint(0xffb0b0); if (prep <= 0) { g.clearTint(); g.anims.timeScale = 1; g.setData('remata', (1 - CONTACTO) * Forja.dura('enemigo', 'golpe')); this.golpeGuardia(g); tA = R('guardias.ataqueCada', 1.6) * g.getData('mAtaque') * (0.8 + Math.random() * 0.4); } }
          // solo ataca si llega: se planta y golpea (si te alejas a tiempo, falla)
          else if (tA <= 0 && Math.abs(dx) < g.getData('alc') + h.body.width / 2) { prep = 0.35; Forja.pose(g, 'golpe', { reinicia: true, ritmo: (CONTACTO * Forja.dura('enemigo', 'golpe')) / prep }); }
          g.setData({ t: tA, prep });
        }
      }
      g.setData('estado', estado);
      if (g.getData('prep') > 0 || g.getData('remata') > 0) vx = 0;                // mientras golpea se planta: no patina con los pies quietos
      if (g.getData('empuje') > 0) { g.setData('empuje', g.getData('empuje') - dt); vx = g.getData('empujeV'); }   // retrocede por tu golpe
      if (g.x + vx * dt < seg.min || g.x + vx * dt > seg.max) vx = 0;              // nunca se cae de su tramo de piso
      // en duelo mira siempre hacia ti (retrocede de espaldas, no se da la vuelta); patrullando mira hacia donde camina
      g.setVelocityX(vx); g.setFlipX((estado === 'duelo' ? g.getData('dir') : vx || g.getData('dir')) < 0);
      g.setData('remata', Math.max(0, (g.getData('remata') || 0) - dt));
      if (g.getData('prep') <= 0 && g.getData('inmune') <= 0 && g.getData('remata') <= 0) Forja.pose(g, 'andar', { v: Forja.rapidez(g, 'x'), max: vel * 2 });
      if (R('rejas.guardiaPisa', false)) this.pisarPlacas(p, g.x);
    }
  }
  golpeGuardia(g) {
    const h = this.heroe, dx = h.x - g.x;
    if (this.filaDe(h.y) !== g.getData('p') || Math.abs(dx) > g.getData('alc') + h.body.width / 2 || this.modo === 'colgado') return;
    if (this.bloqueoT > 0) { this.chispas.explode(12, (g.x + h.x) / 2, h.y - 70); Forja.sonar(this, 'golpe', 0.35); this.contra = true; this.bloqueoT = 0; return; }
    this.herir(R('guardias.dano', 1), g.x);
  }
  // <<<

  segmento(p, x) {                                                               // tramo de piso firme donde está x (sin trampas)
    const c0 = Math.floor(x / W), bueno = (c) => this.solido(p, c) && ['P', 'L', 'E'].includes(this.N.G[p][c].t) && !this.rejas.some((g) => g.p === p && g.c === c && g.abierto < 0.7);
    let a = c0, b = c0; while (bueno(a - 1)) a--; while (bueno(b + 1)) b++;
    return { min: a * W + 20, max: (b + 1) * W - 20 };
  }
  rejaEntre(p, x1, x2) { return this.rejas.some((g) => g.p === p && g.abierto < 0.7 && (g.x - x1) * (g.x - x2) < 0); }
  pisarPlacas(p, x) {
    const c = Math.floor(x / W);
    for (const q of this.placas) if (q.p === p && q.c === c) this.activarPlaca(q);
  }
  activarPlaca(q) {
    if (q.pisada) return; q.pisada = true; Forja.sonar(this, 'paso', 0.5);
    if (q.modo === 'salida') { this.salidaPlaca = true; return; }
    const g = this.rejas[q.reja]; if (!g) return;
    if (q.modo === 'cierra') { g.objetivo = 0; g.rapido = true; g.timer = 0; }
    else { g.objetivo = 1; g.rapido = false; g.timer = R('rejas.abierta', 8); }
  }

  // >>> trampas
  // Trampas con ritmo: cada cuchilla tiene un ciclo (se cierra cada X segundos) y está abierta una parte del ciclo.
  // Saber el ritmo es la clave: se cruza justo cuando se abre. Los pisos que se desmoronan tiemblan y caen; las rejas
  // suben al pisar su placa, se quedan abiertas un tiempo y bajan a una velocidad fija.
  actualizarTrampas(t, dt) {
    const h = this.heroe, hp = this.filaDe(h.y), K = this.K, dib = this.dib; dib.clear();
    const ritmo = R('trampas.cuchillaRitmo', 1.25), abierta = R('trampas.cuchillaAbierta', 0.6), anchoC = R('trampas.cuchillaAncho', 28);
    for (const k of this.cuchillas) {
      const u = ((t + k.fase) % ritmo) / ritmo, cerrada = u > abierta;
      const obj = cerrada ? 1 : 0; k.cierre += (obj - k.cierre) * Math.min(1, dt * (cerrada ? 22 : 9));
      const x = k.c * W + W / 2, piso = this.yS(k.p), techo = this.techo(k.p), mitad = piso - this.altoHeroe * 0.55;
      const hA = (mitad - techo) * k.cierre, hB = (piso - mitad) * k.cierre;            // hoja de acero: brillo a la izquierda, sombra a la derecha
      dib.fillGradientStyle(0xf6f8fc, 0x7c8296, 0xf6f8fc, 0x7c8296, 1);
      if (hA > 0.5) dib.fillRect(x - 5, techo, 10, hA); if (hB > 0.5) dib.fillRect(x - 5, piso - hB, 10, hB);
      dib.fillStyle(0xffffff, 0.9); if (hA > 0.5) dib.fillRect(x - 5, techo, 1.5, hA); if (hB > 0.5) dib.fillRect(x - 5, piso - hB, 1.5, hB);
      dib.fillStyle(0x24222e, 1); dib.fillRect(x - 10, techo, 20, 7); dib.fillRect(x - 10, piso - 7, 20, 7);
      dib.fillStyle(0x9aa0b4, 1); for (const rx of [x - 6, x + 6]) { dib.fillCircle(rx, techo + 3.5, 1.4); dib.fillCircle(rx, piso - 3.5, 1.4); }
      if (k.cierre > 0.8 && hp === k.p && Math.abs(h.x - x) < anchoC / 2 + h.body.width * 0.35 && this.modo !== 'fin') {
        const agachado = !!(this.ctl && this.ctl.abajo) && R('mov.agachadoEsquiva', 'esquiva') === 'esquiva';
        if (!agachado) this.herir(R('reglas.danoCuchilla', 2), x);
      }
    }
    const ocultos = R('trampas.pinchos', 'visibles') === 'ocultos', dist = R('trampas.pinchosDistancia', 128);
    for (const s of this.pinchos) {
      const x = s.c * W, y = this.yS(s.p);
      if (ocultos && s.alto < 1 && hp === s.p && Math.abs(h.x - (x + W / 2)) < dist) s.alto = Math.min(1, s.alto + dt * 6);
      if (s.alto <= 0) { dib.fillStyle(0x24222e, 1); for (let i = 0; i < 4; i++) dib.fillRect(x + 6 + i * 15, y - 3, 8, 3); continue; }
      for (let i = 0; i < 4; i++) {                                                  // cada pincho: cara iluminada y cara en sombra
        const bx = x + 4 + i * 15, punta = y - 26 * s.alto;
        dib.fillStyle(0xf0f2f8, 1); dib.fillTriangle(bx, y, bx + 7.5, punta, bx + 7.5, y);
        dib.fillStyle(0x80869a, 1); dib.fillTriangle(bx + 7.5, punta, bx + 15, y, bx + 7.5, y);
      }
      dib.fillStyle(0x24222e, 1); dib.fillRect(x + 2, y - 3, W - 4, 3);
    }
    // desmoronar
    const vuelve = R('trampas.desmoronaVuelve', 0);
    for (const d of this.desmoronan) {
      if (d.t < 0) continue;
      const cel = this.N.G[d.p][d.c];
      if (cel.slab && cel.t === 'D') {
        d.t -= dt; cel.slab.x = d.c * W + W / 2 + Math.sin(t * 60) * 2;
        if (d.t <= 0) {
          const cae = this.add.image(cel.slab.x, cel.slab.y, 'losaF', 'l3').setDisplaySize(W, GR).setTint(0xc79a6a).setDepth(4);
          this.tweens.add({ targets: cae, y: cae.y + 420, angle: 25, alpha: 0, duration: 900, ease: 'Quad.easeIn', onComplete: () => cae.destroy() });
          cel.slab.destroy(); cel.slab = null; cel.t = 'H'; Forja.sonar(this, 'golpe', 0.3);
          if (vuelve) this.time.delayedCall(vuelve * 1000, () => { cel.t = 'D'; this.losa(d.p, d.c).setTint(0xc79a6a); d.t = -1; });
          else d.t = -1;
        }
      }
    }
    // placas
    for (const q of this.placas) {
      const x = q.c * W, y = this.yS(q.p), encima = hp === q.p && Math.floor(h.x / W) === q.c && this.modo === 'suelo';
      if (encima) this.activarPlaca(q); else if (!this.guardias.some((g) => g.getData('p') === q.p && Math.floor(g.x / W) === q.c)) q.pisada = false;
      const ph = q.pisada ? 2 : 6;                                                     // placa con marco oscuro y filo de luz
      dib.fillStyle(0x1c1a24, 1); dib.fillRect(x + 10, y - ph - 1.5, W - 20, ph + 1.5);
      dib.fillStyle(q.modo === 'salida' ? 0xffd24a : q.modo === 'cierra' ? 0xd06a5a : 0x9fc7ff, 1); dib.fillRect(x + 12, y - ph, W - 24, ph);
      dib.fillStyle(0xffffff, 0.55); dib.fillRect(x + 12, y - ph, W - 24, 1);
    }
    // rejas
    for (const g of this.rejas) {
      const H = this.yS(g.p) - this.techo(g.p), antes = g.abierto;
      if (g.objetivo === 1) { g.abierto = Math.min(1, g.abierto + dt * 2); if (g.abierto >= 1 && g.timer > 0) { g.timer -= dt; if (g.timer <= 0) g.objetivo = 0; } }
      else g.abierto = Math.max(0, g.abierto - dt * (g.rapido ? 4 : R('rejas.cierre', 40) / H));
      g.cerrando = g.abierto < antes;
      const fondo = this.techo(g.p) + H * (1 - g.abierto);
      dib.lineStyle(5, 0x2c2c3a, 1); for (let i = -2; i <= 2; i++) dib.lineBetween(g.x + i * 7, this.techo(g.p), g.x + i * 7, fondo);   // barrotes de hierro
      dib.lineStyle(1.5, 0xa8aec2, 1); for (let i = -2; i <= 2; i++) dib.lineBetween(g.x + i * 7 - 1.2, this.techo(g.p), g.x + i * 7 - 1.2, fondo);
      dib.lineStyle(4, 0x24222e, 1); dib.lineBetween(g.x - 18, fondo - 4, g.x + 18, fondo - 4); dib.lineBetween(g.x - 18, this.techo(g.p) + 10, g.x + 18, this.techo(g.p) + 10);
      dib.fillStyle(0x2c2c3a, 1); for (let i = -2; i <= 2; i++) dib.fillTriangle(g.x + i * 7 - 3, fondo, g.x + i * 7 + 3, fondo, g.x + i * 7, fondo + 6);
    }
    // puerta de salida
    const pu = this.puerta, py = this.yS(pu.p), abierta2 = this.salidaAbierta();
    const arco = (m) => ({ tl: 30 - m, tr: 30 - m, bl: 0, br: 0 });                  // puerta en arco: marco de piedra y hoja de madera
    dib.fillStyle(0x2e2a3a, 1); dib.fillRoundedRect(pu.x - 34, py - 122, 68, 122, arco(-4));
    dib.fillStyle(abierta2 ? 0xffe9a8 : 0x5a3a24, 1); dib.fillRoundedRect(pu.x - 26, py - 114, 52, 114, arco(4));
    if (!abierta2) {
      dib.fillStyle(0x3a2414, 1); for (let k = 1; k < 4; k++) dib.fillRect(pu.x - 26 + k * 13 - 1, py - 104, 2, 104);
      dib.fillStyle(0x24202c, 1); dib.fillRect(pu.x - 26, py - 78, 52, 5); dib.fillRect(pu.x - 26, py - 30, 52, 5); dib.fillCircle(pu.x + 15, py - 52, 3);
    }
    dib.lineStyle(3, 0xc9a24a, 1); dib.strokeRoundedRect(pu.x - 34, py - 122, 68, 122, arco(-4));
    if (this.luzPuerta) this.luzPuerta.setVisible(abierta2 && !Forja.bajo);
  }
  // <<<

  camara(dt) {
    const h = this.heroe, cam = this.cameras.main;
    if (R('nivel.camara', 'salas') === 'salas') {
      const salaW = this.K.COLS * W, s = this.salaDe(h.x);
      const destinoX = Phaser.Math.Clamp(s * salaW - (960 - salaW) / 2, 0, Math.max(0, this.ancho - 960));
      const destinoY = Phaser.Math.Clamp(h.y - 330, 0, Math.max(0, this.alto - 540));
      cam.scrollX = Math.abs(cam.scrollX - destinoX) > 0.5 ? Phaser.Math.Linear(cam.scrollX, destinoX, 1 - Math.exp(-dt * 9)) : destinoX;   // se acerca igual de suave a cualquier velocidad del equipo
      cam.scrollY = Phaser.Math.Linear(cam.scrollY, destinoY, 1 - Math.exp(-dt * 5));
    }
    this.capas.forEach((c, i) => { c.tilePositionX = cam.scrollX * [0.15, 0.35][i]; });
  }

  marcaRuta() {
    const modo = R('objetivo.marcaRuta', 'no'), g = this.pista; g.clear(); if (modo === 'no') return;
    const h = this.heroe; let x = this.puerta.x, y = this.yS(this.puerta.p) - 60;
    if (modo === 'objetivo' && !this.objetivoCumplido()) {
      const o = R('objetivo.tipo', 'salir'), quiere = { gemas: 'gema', llave: 'llave', tesoro: 'tesoro' }[o];
      const lista = quiere ? this.items.getChildren().filter((i) => i.getData('tipo') === quiere) : this.guardias.filter((q) => q.getData('estado') !== 'muerto');
      let mejor = 1e9; for (const i of lista) { const d = Math.hypot(i.x - h.x, i.y - h.y); if (d < mejor) { mejor = d; x = i.x; y = i.y; } }
    }
    const a = Math.atan2(y - (h.y - 60), x - h.x), cx = h.x + Math.cos(a) * 80, cy = h.y - 60 + Math.sin(a) * 80;
    g.fillStyle(0xc6ff4a, 0.9); g.fillTriangle(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, cx + Math.cos(a + 2.4) * 10, cy + Math.sin(a + 2.4) * 10, cx + Math.cos(a - 2.4) * 10, cy + Math.sin(a - 2.4) * 10);
  }

  // Rayos X (V): cajas de choque, bordes agarrables, alcance y ruta de los guardias, ritmo de las trampas, placas y rejas.
  dibujarX(t) {
    const g = this.capaX; g.clear();
    for (let p = 0; p < this.K.PISOS; p++) for (let c = 0; c < this.N.COLS; c++) {
      if (this.solido(p, c)) continue;
      for (const lado of [-1, 1]) if (this.solido(p, c + lado)) { const bx = lado < 0 ? c * W : (c + 1) * W; g.fillStyle(0xffd24a, 1); g.fillRect(bx - 4, this.yS(p) - 4, 8, 8); }
    }
    const h = this.heroe;
    for (const q of this.guardias) {
      if (q.getData('estado') === 'muerto') continue;
      const y = q.y - 60, alc = q.getData('alc'), ve = R('guardias.alcance', 300), seg = this.segmento(q.getData('p'), q.x);
      g.lineStyle(2, 0xff9f43, 0.9); g.strokeRect(q.x - alc, y - 30, alc * 2, 60);
      g.lineStyle(1, 0xff9f43, 0.4); g.lineBetween(q.x - ve, y, q.x + ve, y);
      const destino = q.getData('estado') === 'duelo' ? Phaser.Math.Clamp(h.x, seg.min, seg.max) : q.getData('dir') > 0 ? seg.max : seg.min;
      g.lineStyle(3, 0xff5a5a, 0.9); g.lineBetween(q.x, q.y - 6, destino, q.y - 6); g.fillStyle(0xff5a5a, 1); g.fillCircle(destino, q.y - 6, 5);
    }
    const ritmo = R('trampas.cuchillaRitmo', 1.25);
    for (const k of this.cuchillas) {
      const u = ((t + k.fase) % ritmo) / ritmo, x = k.c * W + W / 2, y = this.techo(k.p) + 22;
      g.lineStyle(4, u > R('trampas.cuchillaAbierta', 0.6) ? 0xff5a5a : 0x7dffb0, 1); g.beginPath(); g.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2); g.strokePath();
    }
    for (const q of this.placas) { const r = this.rejas[q.reja]; if (!r) continue; g.lineStyle(1, 0x9fc7ff, 0.8); g.lineBetween(q.c * W + W / 2, this.yS(q.p) - 4, r.x, this.yS(r.p) - 4); }
    for (const r of this.rejas) if (r.timer > 0 && r.objetivo === 1) { g.fillStyle(0x9fc7ff, 1); g.fillRect(r.x - 20, this.techo(r.p) + 4, 40 * (r.timer / Math.max(0.01, R('rejas.abierta', 8))), 5); }
    for (const d of this.desmoronan) if (d.t > 0) { g.fillStyle(0xff9f43, 1); g.fillRect(d.c * W + 8, this.yS(d.p) + GR + 2, (W - 16) * (d.t / R('trampas.desmoronaTiempo', 0.6)), 4); }
  }
}
Forja.iniciar(Fortaleza, R('reglas.gravedad', 1400));
