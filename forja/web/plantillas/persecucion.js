// PERSECUCIÓN · junta todas las gemas del laberinto sin que te atrapen. Con una supergema, por unos segundos, ellos huyen.
// Plantilla de Forja (JMD Learning) para Phaser 4. Algoritmos: generar el laberinto, buscar el camino (BFS, A*, voraz),
// la regla de objetivo de cada rival, huir con un mapa de Dijkstra (Walker, 2010) y turnos con temporizador.
// Todo lo que elegiste en «Diseña tu videojuego» se lee con Forja.regla('clave', defecto): cambia un número y mira qué pasa.
const RG = (k, d) => Forja.regla(k, d);
const RR = (n, k, d) => Forja.regla('rival' + n + '.' + k, d);          // reglas de un rival: rival1.regla, rival2.busqueda…
const [COLS, FILAS] = RG('laberinto.tamano', [19, 11]);
const CW = 960 / COLS, CH = 540 / FILAS, TAM = CH * 1.25, PIE = CH * 0.24, MITAD = (COLS - 1) / 2;
const centro = (c, f) => ({ x: c * CW + CW / 2, y: f * CH + CH / 2 });
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const COLORES = [0xff5a4e, 0x7a5cff, 0x19a974, 0xffb020, 0x2ec4b6, 0xff6fd8];
const DEF = { regla: ['cazador', 'emboscada', 'pinza', 'indeciso', 'azar', 'espejo'], esquina: ['arribaDer', 'arribaIzq', 'abajoDer', 'abajoIzq', 'arribaDer', 'abajoIzq'], salida: [0, 2, 4, 6, 8, 10] };
const NOMBRE = { cazador: 'cazador', emboscada: 'emboscada', pinza: 'pinza', indeciso: 'indeciso', esquina: 'guardián', azar: 'paseante', espejo: 'espejo', bfs: 'BFS', astar: 'A*', voraz: 'voraz' };
const igual = (a, b) => a && b && a.c === b.c && a.f === b.f;

// >>> generar
// Generar el laberinto («excavar con vuelta atrás») a partir de una semilla: mismo número, mismo laberinto.
// Si es SIMÉTRICO se excava solo la mitad izquierda y la derecha se copia como en un espejo.
// Después se abren atajos (o se quitan TODOS los callejones sin salida), la casa de los rivales y los túneles.
function generar(semilla) {
  const r = azar(semilla), m = Array.from({ length: FILAS }, () => Array(COLS).fill(1));       // 1 = muro, 0 = pasillo
  const espejo = RG('laberinto.simetria', 'espejo') === 'espejo', limite = espejo ? MITAD : COLS - 2;
  const pila = [[1, 1]]; m[1][1] = 0;
  while (pila.length) {
    const [c, f] = pila[pila.length - 1];
    const vec = DIRS.map(([dc, df]) => [c + 2 * dc, f + 2 * df, c + dc, f + df]).filter(([nc, nf]) => nc > 0 && nf > 0 && nc <= limite && nf < FILAS - 1 && m[nf][nc] === 1);
    if (!vec.length) { pila.pop(); continue; }
    const [nc, nf, pc, pf] = vec[Math.floor(r() * vec.length)];
    m[pf][pc] = 0; m[nf][nc] = 0; pila.push([nc, nf]);
  }
  const atajos = RG('laberinto.atajos', -1), pasillo = (c, f) => m[f]?.[c] === 0;
  if (atajos > 0) {
    for (let i = 0, hechos = 0; i < atajos * 8 && hechos < atajos; i++) {
      const c = 1 + Math.floor(r() * (limite - 1)), f = 1 + Math.floor(r() * (FILAS - 2));
      if (m[f][c] === 1 && ((pasillo(c - 1, f) && pasillo(c + 1, f)) || (pasillo(c, f - 1) && pasillo(c, f + 1)))) { m[f][c] = 0; hechos++; }
    }
  } else if (atajos < 0) {   // sin callejones: a cada punta sin salida se le abre un muro hacia otro pasillo
    for (let f = 1; f < FILAS - 1; f++) for (let c = 1; c <= limite; c++) {
      if (!pasillo(c, f) || DIRS.filter(([dc, df]) => pasillo(c + dc, f + df)).length !== 1) continue;
      const op = DIRS.filter(([dc, df]) => m[f + df]?.[c + dc] === 1 && pasillo(c + 2 * dc, f + 2 * df) && c + dc > 0 && c + dc <= limite && f + df > 0 && f + df < FILAS - 1);
      if (op.length) { const [dc, df] = op[Math.floor(r() * op.length)]; m[f + df][c + dc] = 0; }
    }
  }
  if (espejo) for (let f = 0; f < FILAS; f++) for (let c = 0; c < MITAD; c++) m[f][COLS - 1 - c] = m[f][c];
  // la casa: una fila de celdas abiertas al centro (o arriba)
  const fc = RG('casa.lugar', 'centro') === 'arriba' ? 1 : (((FILAS - 1) / 2) | 1), ancho = RG('casa.ancho', 3), casa = [];
  for (let c = MITAD - (ancho - 1) / 2; c <= MITAD + (ancho - 1) / 2; c++) { m[fc][c] = 0; casa.push({ c, f: fc }); }
  // túneles: la fila se abre en los dos bordes y queda conectada de un lado al otro
  const filas = []; for (let f = 1; f < FILAS - 1; f += 2) if (f !== fc) filas.push(f);
  const medio = (FILAS - 1) / 2;
  filas.sort((a, b) => (RG('tuneles.fila', 'centro') === 'centro' ? Math.abs(a - medio) - Math.abs(b - medio) : Math.abs(b - medio) - Math.abs(a - medio)));
  const tuneles = filas.slice(0, RG('laberinto.tuneles', 1));
  for (const f of tuneles) { m[f][0] = 0; m[f][COLS - 1] = 0; m[f][1] = 0; m[f][COLS - 2] = 0; }
  return { m, casa, fc, tuneles };
}
// <<<

// Vecinos de una celda. Por un túnel, el vecino de la columna 0 hacia la izquierda es la última columna.
function vecinos(m, c, f) {
  const out = [];
  for (const [dc, df] of DIRS) { let nc = c + dc; const nf = f + df; if (nc < 0) nc = COLS - 1; else if (nc >= COLS) nc = 0; if (m[nf]?.[nc] === 0) out.push({ c: nc, f: nf, dc, df }); }
  return out;
}

// >>> buscar
// Buscar el camino, con el algoritmo que eligió cada rival:
//  · BFS: la ola. Visita primero lo que está a 1 paso, luego a 2… El primero en tocar la meta es el más corto.
//  · A*: la ola con brújula. Ordena por «lo andado + lo que falta a ojo» (g + h). Mismo camino, menos celdas revisadas.
//  · voraz: solo la brújula (h). Piensa rápido, pero puede meterse en un callejón y dar un rodeo.
// «prohibida» es la celda de la que viene: si los rivales no pueden dar media vuelta, el primer paso no puede ir ahí.
function buscar(m, desde, hasta, algo, prohibida) {
  const K = (p) => p.f * COLS + p.c, h = (p) => Math.abs(p.c - hasta.c) + Math.abs(p.f - hasta.f);
  const viene = new Map([[K(desde), null]]), g = new Map([[K(desde), 0]]), abiertos = [{ c: desde.c, f: desde.f, p: 0 }];
  let visitadas = 0;
  while (abiertos.length) {
    let a;
    if (algo === 'bfs') a = abiertos.shift();
    else { let b = 0; for (let i = 1; i < abiertos.length; i++) if (abiertos[i].p < abiertos[b].p) b = i; a = abiertos.splice(b, 1)[0]; }
    visitadas++;
    if (a.c === hasta.c && a.f === hasta.f) { const ruta = []; for (let p = a; p; p = viene.get(K(p))) ruta.unshift({ c: p.c, f: p.f }); return { ruta, visitadas }; }
    for (const n of vecinos(m, a.c, a.f)) {
      if (prohibida && a.c === desde.c && a.f === desde.f && igual(n, prohibida)) continue;
      const k = K(n), ng = g.get(K(a)) + 1;
      if (algo === 'astar') { if (g.has(k) && g.get(k) <= ng) continue; } else if (viene.has(k)) continue;
      viene.set(k, a); g.set(k, ng); abiertos.push({ c: n.c, f: n.f, p: algo === 'astar' ? ng + h(n) : h(n) });
    }
  }
  return { ruta: [], visitadas };
}
// <<<

// >>> huir
// Huir con un MAPA DE DIJKSTRA (Brian Walker, «The Incredible Power of Dijkstra Maps», 2010):
// 1) una ola desde el héroe pone en cada celda su distancia; 2) se multiplica todo por un número negativo (−1,2);
// 3) se vuelve a pasar la ola: cada celda vale como mucho «su vecino más bajo + 1». El asustado solo baja la cuesta.
// Así no huye a la esquina más cercana (se arrinconaría): huye hacia donde hay salida, aunque tenga que pasar cerca.
function mapaHuida(m, desde, coef) {
  const N = COLS * FILAS, v = new Float32Array(N).fill(Infinity), K = (c, f) => f * COLS + c, cola = [desde];
  v[K(desde.c, desde.f)] = 0;
  while (cola.length) { const a = cola.shift(); for (const n of vecinos(m, a.c, a.f)) if (v[K(n.c, n.f)] === Infinity) { v[K(n.c, n.f)] = v[K(a.c, a.f)] + 1; cola.push(n); } }
  for (let i = 0; i < N; i++) if (v[i] !== Infinity) v[i] *= coef;
  for (let cambio = true, vueltas = 0; cambio && vueltas < 200; vueltas++) {
    cambio = false;
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
      const i = K(c, f); if (v[i] === Infinity) continue;
      for (const n of vecinos(m, c, f)) { const w = v[K(n.c, n.f)] + 1; if (w < v[i]) { v[i] = w; cambio = true; } }
    }
  }
  return v;
}
// <<<

class Persecucion extends Phaser.Scene {
  constructor() { super('persecucion'); }
  init(datos) { this.previo = datos && datos.nivel ? datos : null; }
  preload() { Forja.precargar(this, ['relleno', 'cielo']); }

  create() {
    Forja.animaciones(this); Forja.efectos(this);
    const P = this.previo || {};
    this.nivel = P.nivel || 1; this.puntos = P.puntos || 0; this.cazados = P.cazados || 0; this.tiempoTotal = P.tiempoTotal || 0;
    this.vidas = P.vidas ?? RG('vidas.inicio', 3); this.proximaVida = P.proximaVida ?? RG('vida.extra', 10000);
    const semilla = D.semilla * 97 + RG('laberinto.semilla', 0) * 7919 + (RG('niveles.nuevo', true) ? (this.nivel - 1) * 131 : 0);
    const L = generar(semilla); this.mapa = L.m; this.casa = L.casa; this.fc = L.fc; this.r = azar(semilla + 5);
    this.add.image(0, 0, 'cielo').setOrigin(0).setDisplaySize(960, 540).setDepth(-10).setTint(0x40405a);
    const tinte = RG('laberinto.estilo', 0xffffff), libres = [];
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
      const p = centro(c, f);
      if (this.mapa[f][c]) this.add.image(p.x, p.y, 'relleno').setDisplaySize(CW + 0.6, CH + 0.6).setTint(tinte).setDepth(-5); else libres.push({ c, f });
    }
    this.libres = libres;
    const g0 = this.add.graphics().setDepth(-4); g0.fillStyle(0xffffff, 0.08); for (const k of this.casa) { const p = centro(k.c, k.f); g0.fillRect(p.x - CW / 2, p.y - CH / 2, CW, CH); }
    const enCasa = (x) => this.casa.some((k) => igual(k, x)), cerca = (o) => libres.reduce((b, x) => ((x.c - o.c) ** 2 + (x.f - o.f) ** 2 < (b.c - o.c) ** 2 + (b.f - o.f) ** 2 ? x : b), libres[0]);
    this.cerca = cerca;
    // dónde empiezas
    const ini = RG('heroe.inicio', 'abajo');
    this.inicioHeroe = cerca(ini === 'esquina' ? { c: 1, f: FILAS - 2 } : ini === 'cerca' ? { c: MITAD, f: this.fc + 2 } : { c: MITAD, f: FILAS - 2 });
    if (enCasa(this.inicioHeroe)) this.inicioHeroe = cerca({ c: MITAD, f: this.fc + 2 });
    // gemas y supergemas
    const forma = RG('gemas.forma', 'gema'), dens = RG('gemas.densidad', 1), clave = (x) => x.f * COLS + x.c;
    const anim = (id) => (this.anims.exists(id) ? id : 'gema');
    this.gemas = new Map(); this.superg = new Map();
    let nSuper = Math.max(0, RG('supergemas.cantidad', 4) - (RG('niveles.supergemas', false) ? this.nivel - 1 : 0));
    const esquinas = [{ c: 1, f: 1 }, { c: COLS - 2, f: FILAS - 2 }, { c: COLS - 2, f: 1 }, { c: 1, f: FILAS - 2 }, { c: 1, f: (FILAS - 1) / 2 }, { c: COLS - 2, f: (FILAS - 1) / 2 }];
    const libresGema = libres.filter((x) => !enCasa(x) && !igual(x, this.inicioHeroe) && x.c > 0 && x.c < COLS - 1);
    const sitios = RG('supergemas.lugar', 'esquinas') === 'azar' ? libresGema.slice().sort(() => this.r() - 0.5) : esquinas.map(cerca);
    const idSuper = forma === 'estrella' ? 'gema' : 'estrella';
    for (const s of sitios) {
      if (nSuper <= 0) break; if (this.superg.has(clave(s)) || enCasa(s)) continue;
      const p = centro(s.c, s.f), o = this.add.sprite(p.x, p.y, 'objetos').setScale((CW * 0.9) / 64).play(anim(idSuper)).setDepth(2);
      this.tweens.add({ targets: o, scale: (CW * 1.05) / 64, yoyo: true, repeat: -1, duration: 420 }); this.superg.set(clave(s), o); nSuper--;
    }
    for (const x of libresGema) {
      if (this.superg.has(clave(x)) || (dens > 1 && (x.c + x.f) % dens !== 0)) continue;
      const p = centro(x.c, x.f); this.gemas.set(clave(x), this.add.sprite(p.x, p.y, 'objetos').setScale((CW * 0.36) / 64).play(anim(forma)).setDepth(2));
    }
    this.total = this.gemas.size + this.superg.size; this.comidas = 0; this.clave = clave; this.anim = anim;
    // el héroe (se mueve por la rejilla, no con física: así gira justo en los cruces)
    const ph = centro(this.inicioHeroe.c, this.inicioHeroe.f);
    this.heroe = Forja.cuerpo(this.physics.add.sprite(ph.x, ph.y + PIE, 'heroe', 'quieto_0'), D.heroe, TAM, true).setDepth(20);
    this.H = { x: ph.x, y: ph.y, desde: { ...this.inicioHeroe }, hacia: { ...this.inicioHeroe }, dir: { c: 0, f: 0 }, quiere: null, ultima: { c: -1, f: 0 }, freno: 1, inmune: 0 };
    this.velHeroe = RG('heroe.velocidad', 160) * (CW / 64) * (1 + 0.03 * (this.nivel - 1));
    // los rivales
    const extra = RG('niveles.rivalExtra', 0), cuantos = Math.min(6, RG('rivales.cantidad', 4) + (extra ? Math.floor((this.nivel - 1) / extra) : 0));
    const ESQ = { arribaIzq: { c: 1, f: 1 }, arribaDer: { c: COLS - 2, f: 1 }, abajoIzq: { c: 1, f: FILAS - 2 }, abajoDer: { c: COLS - 2, f: FILAS - 2 } };
    const marca = RG('rivales.marca', 'anillo');
    this.rivales = [];
    for (let i = 0; i < cuantos; i++) {
      const n = i + 1, s = this.add.sprite(0, 0, 'enemigo', 'caminar_0').setScale(TAM / D.enemigo.px).setOrigin(0.5, 0.96).play('enemigo:caminar');
      if (marca !== 'anillo') s.setTint(COLORES[i]);
      const nn = RR(n, 'n', 'auto'), rep = RR(n, 'repiensa', 'global');
      const e = {
        i, n, s, color: COLORES[i], regla: RR(n, 'regla', DEF.regla[i]), busqueda: RR(n, 'busqueda', 'bfs'), ritmo: RR(n, 'ritmo', 1),
        N: nn === 'auto' ? RG('rivales.n', 4) : nn, miedo: RR(n, 'miedo', 'huye'), vision: RR(n, 'vision', 99),
        salida: RR(n, 'salida', DEF.salida[i]) + i * RG('rivales.salida', 0), repiensa: rep === 'global' ? RG('rivales.repiensa', 0.35) : rep,
        esquina: cerca(ESQ[RR(n, 'esquina', DEF.esquina[i])] || ESQ.arribaDer), empieza: RR(n, 'inicio', 'casa'),
      };
      this.rivales.push(e);
    }
    this.reiniciarPosiciones();
    // turnos dispersa/persigue
    this.modos = RG('rivales.modos', [[7, 20]]); this.turno = 0; this.turnoT = 0; this.modoGlobal = this.modos[0][0] > 0 ? 'dispersa' : 'persigue';
    this.cadena = 0; this.susto = 0; this.huida = null; this.bonusHechos = 0; this.bonus = null; this.tiempo = 0; this.turboT = 0; this.turboCarga = 0; this.sonidoT = 0;
    this.aros = this.add.graphics().setDepth(3); this.niebla = this.add.graphics().setDepth(960); this.capaX = this.add.graphics().setDepth(965);
    this.etiquetas = this.rivales.map((e) => this.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#ffffff', backgroundColor: 'rgba(15,12,24,.7)', padding: { x: 5, y: 2 } }).setOrigin(0.5, 1).setDepth(970).setVisible(false));
    this.leer = Forja.controles(this); this.fin = false; this.texto = Forja.marcador(this);
    try { this.record = RG('resultado.record', true) ? +(localStorage.getItem('forja.persecucion.record') || 0) : 0; } catch { this.record = 0; }
    this.empezar(RG('inicio.listos', 2), this.nivel > 1 ? 'Nivel ' + this.nivel : '¡Listos!');
  }

  empezar(seg, texto) {
    this.listos = seg; this.avisoListos?.destroy(); this.avisoListos = null;
    if (seg > 0) this.avisoListos = Forja.aviso(this, texto);
  }

  reiniciarPosiciones() {
    const ph = centro(this.inicioHeroe.c, this.inicioHeroe.f);
    Object.assign(this.H, { x: ph.x, y: ph.y, desde: { ...this.inicioHeroe }, hacia: { ...this.inicioHeroe }, dir: { c: 0, f: 0 }, quiere: null });
    this.rivales.forEach((e, k) => {
      const cel = e.empieza === 'esquina' ? e.esquina : this.casa[k % this.casa.length], p = centro(cel.c, cel.f);
      Object.assign(e, { x: p.x, y: p.y, desde: { ...cel }, hacia: { ...cel }, prev: null, ruta: [], objetivo: null, visitadas: 0, piensa: 0, tSusto: 0, congelado: false,
        modo: e.empieza === 'esquina' ? 'dispersa' : 'casa', espera: e.empieza === 'esquina' ? 0 : e.salida });
    });
  }

  // >>> objetivos
  // La «inteligencia» de cada rival es solo CÓMO ELIGE SU CELDA OBJETIVO; el camino lo pone el algoritmo de búsqueda.
  //  cazador: tu celda · emboscada: N celdas delante de ti · pinza: la flecha del rival 1 a «N delante de ti», duplicada
  //  indeciso: si está a más de N te persigue, si no se va a su esquina · guardián: su esquina · paseante: al azar
  //  espejo: tu posición reflejada en el centro del laberinto (te corta el paso).
  // Si te ve solo a cierta distancia y estás más lejos, pasea. En el turno «dispersa», todos van a su esquina.
  objetivoDe(e) {
    const tu = this.H.desde, d = this.H.dir.c || this.H.dir.f ? this.H.dir : this.H.ultima, N = e.N;
    const lejos = Math.abs(e.desde.c - tu.c) + Math.abs(e.desde.f - tu.f);
    const pasear = () => { if (!e.azar || igual(e.azar, e.desde)) e.azar = this.libres[Math.floor(this.r() * this.libres.length)]; return e.azar; };
    if (e.modo === 'dispersa') return e.esquina;
    if (e.vision < 99 && lejos > e.vision) return pasear();
    switch (e.regla) {
      case 'cazador': return tu;
      case 'emboscada': return { c: tu.c + d.c * N, f: tu.f + d.f * N };
      case 'pinza': {
        const t = { c: tu.c + d.c * N, f: tu.f + d.f * N }, otro = (this.rivales[0] !== e ? this.rivales[0] : this.rivales[1]) || { desde: tu };
        return { c: 2 * t.c - otro.desde.c, f: 2 * t.f - otro.desde.f };
      }
      case 'indeciso': return Math.hypot(e.desde.c - tu.c, e.desde.f - tu.f) > N ? tu : e.esquina;
      case 'esquina': { if (!e.ronda || igual(e.ronda, e.desde)) e.ronda = this.cerca({ c: e.esquina.c + Math.floor(this.r() * 7) - 3, f: e.esquina.f + Math.floor(this.r() * 5) - 2 }); return e.ronda; }
      case 'azar': return pasear();
      case 'espejo': return { c: COLS - 1 - tu.c, f: FILAS - 1 - tu.f };
      default: return tu;
    }
  }
  // <<<

  // >>> modos
  // Turnos con temporizador: «dispersa» (cada uno a su esquina, te dan respiro) ↔ «persigue». El reloj se detiene
  // mientras hay asustados. Con la supergema: «susto» (huyen, los puedes atrapar) → atrapado: «regresa» a casa → «casa».
  turnos(dt) {
    if (this.rivales.some((e) => e.modo === 'susto' || e.modo === 'lento')) return;
    const [disp, pers] = this.modos[Math.min(this.turno, this.modos.length - 1)];
    this.turnoT += dt;
    const fase = this.modoGlobal === 'dispersa' ? disp : pers;
    if (this.turnoT < fase) return;
    this.turnoT = 0;
    if (this.modoGlobal === 'persigue') this.turno++;
    const nuevo = this.modoGlobal === 'dispersa' ? 'persigue' : ((this.modos[Math.min(this.turno, this.modos.length - 1)][0] > 0) ? 'dispersa' : 'persigue');
    if (nuevo === this.modoGlobal) return;
    this.modoGlobal = nuevo;
    for (const e of this.rivales) if (e.modo === 'dispersa' || e.modo === 'persigue') { e.modo = nuevo; e.piensa = 0; if (RG('rivales.reversa', true)) this.darVuelta(e); }
  }
  // <<<

  darVuelta(e) { if (igual(e.hacia, e.desde)) return; const t = e.desde; e.desde = e.hacia; e.hacia = t; e.prev = null; e.ruta = []; }

  update(t, ms) {
    const dt = Math.min(0.05, ms / 1000), c = this.leer(), H = this.H;
    if (c.repetir) { this.scene.restart(this.fin === 'perdio' && RG('resultado.continuar', 'cero') === 'nivel' ? { nivel: this.nivel, puntos: 0, vidas: RG('vidas.inicio', 3), cazados: 0 } : {}); return; }
    if (c.rayosX) { Forja.rayosX(this); this.etiquetas.forEach((x) => x.setVisible(this.verX)); }
    this.marcador();
    if (this.fin) { this.heroe.setVelocity(0, 0); this.pintar(t); return; }
    if (this.listos > 0) { this.listos -= dt; if (this.listos <= 0) { this.avisoListos?.destroy(); this.avisoListos = null; } this.pintar(t); return; }
    this.tiempo += dt; this.tiempoTotal += dt; this.sonidoT -= dt;
    this.turnos(dt);
    this.moverHeroe(dt, c);
    H.inmune = Math.max(0, H.inmune - dt);
    for (const e of this.rivales) this.moverRival(e, dt);
    this.choques();
    if (this.bonus) { this.bonus.t -= dt; if (this.bonus.t <= 0) { this.bonus.s.destroy(); this.bonus = null; } }
    this.revisarMeta();
    this.pintar(t);
  }

  // Tu héroe avanza de celda en celda. Gira en el cruce que pediste (o unos píxeles antes) y por los túneles aparece del otro lado.
  moverHeroe(dt, c) {
    const H = this.H, continuo = RG('controles.modo', 'continuo') === 'continuo', tol = RG('heroe.esquinas', 8) * (CW / 64);
    let quiere = null;
    if (c.x || c.y) quiere = Math.abs(c.x) >= Math.abs(c.y) ? { c: Math.sign(c.x), f: 0 } : { c: 0, f: Math.sign(c.y) };
    if (quiere) H.quiere = quiere; else if (!continuo) H.quiere = null;
    if (H.quiere && (H.dir.c || H.dir.f) && H.quiere.c === -H.dir.c && H.quiere.f === -H.dir.f && RG('heroe.mediavuelta', true)) {
      const tmp = H.desde; H.desde = H.hacia; H.hacia = tmp; H.dir = { ...H.quiere };   // sin normalizar: en un túnel sigue del lado correcto
    }
    // turbo con Espacio
    const tipo = RG('heroe.turbo', 'no'); this.turboT = Math.max(0, this.turboT - dt); this.turboCarga = Math.max(0, this.turboCarga - dt);
    if (tipo !== 'no' && c.saltoYa && this.turboCarga <= 0) { this.turboT = tipo === 'largo' ? 2 : 1; this.turboCarga = tipo === 'largo' ? 9 : 5; Forja.sonar(this, 'salto', 0.3); }
    H.freno = Math.min(1, H.freno + dt * 3);
    let v = this.velHeroe * (this.turboT > 0 ? 1.6 : 1) * H.freno * dt;
    for (let vuelta = 0; v > 0 && vuelta < 6; vuelta++) {
      if (!(H.dir.c || H.dir.f)) {
        if (H.quiere && this.pasable(H.desde, H.quiere)) { H.dir = { ...H.quiere }; H.hacia = { c: H.desde.c + H.dir.c, f: H.desde.f + H.dir.f }; } else break;
      }
      const p = centro(H.hacia.c, H.hacia.f), dx = p.x - H.x, dy = p.y - H.y, d = Math.hypot(dx, dy);
      const gira = H.quiere && !(H.quiere.c === H.dir.c && H.quiere.f === H.dir.f) && this.pasable(H.hacia, H.quiere);
      if (d > v && !(gira && d <= tol)) { H.x += (dx / d) * v; H.y += (dy / d) * v; break; }
      v -= Math.min(v, d); H.desde = { c: (H.hacia.c + COLS) % COLS, f: H.hacia.f }; const q = centro(H.desde.c, H.desde.f); H.x = q.x; H.y = q.y;
      this.comer(H.desde);
      if (H.dir.c || H.dir.f) H.ultima = { ...H.dir };
      let sig = null;
      if (H.quiere && this.pasable(H.desde, H.quiere)) sig = H.quiere; else if (continuo && this.pasable(H.desde, H.dir)) sig = H.dir;
      if (!sig) { H.dir = { c: 0, f: 0 }; H.hacia = { ...H.desde }; break; }
      H.dir = { ...sig }; H.hacia = { c: H.desde.c + sig.c, f: H.desde.f + sig.f };
    }
  }
  pasable(cel, dir) { let c = cel.c + dir.c; const f = cel.f + dir.f; if (c < 0) c = COLS - 1; else if (c >= COLS) c = 0; return (dir.c || dir.f) && this.mapa[f]?.[c] === 0; }

  comer(cel) {
    const k = this.clave(cel), H = this.H;
    if (this.gemas.has(k)) {
      this.gemas.get(k).destroy(); this.gemas.delete(k); this.comidas++; this.sumar(RG('gemas.valor', 10)); H.freno = RG('heroe.freno', 1);
      if (this.sonidoT <= 0) { Forja.sonar(this, 'moneda', 0.25); this.sonidoT = 0.12; }
    } else if (this.superg.has(k)) {
      const o = this.superg.get(k); this.chispas.explode(14, o.x, o.y); o.destroy(); this.superg.delete(k); this.comidas++; this.sumar(RG('supergemas.valor', 50)); this.asustar();
    }
    if (this.bonus && igual(this.bonus.cel, cel)) {
      const v = RG('bonus.valor', 500); this.sumar(v); this.flotar(this.bonus.s.x, this.bonus.s.y, '+' + v); Forja.sonar(this, 'celebrar', 0.35); this.bonus.s.destroy(); this.bonus = null;
    }
    // el bonus aparece al juntar cierta parte de las gemas (una o varias veces por nivel)
    const veces = RG('bonus.veces', 1), aparece = RG('bonus.aparece', 0.5), tipo = RG('bonus.tipo', 'cofre');
    if (tipo !== 'ninguno' && this.bonusHechos < veces && this.comidas / this.total >= aparece + this.bonusHechos * ((1 - aparece) / veces)) {
      this.bonusHechos++; const lugar = RG('bonus.lugar', 'centro');
      const sitio = lugar === 'azar' ? this.libres[Math.floor(this.r() * this.libres.length)] : lugar === 'lejos' ? this.libres.reduce((b, x) => (Math.abs(x.c - cel.c) + Math.abs(x.f - cel.f) > Math.abs(b.c - cel.c) + Math.abs(b.f - cel.f) ? x : b), this.libres[0]) : this.cerca({ c: MITAD, f: this.fc + 2 });
      const p = centro(sitio.c, sitio.f); this.bonus?.s.destroy();
      this.bonus = { cel: sitio, t: RG('bonus.dura', 9), s: this.add.sprite(p.x, p.y, 'objetos').setScale((CW * 0.95) / 64).play(this.anim(tipo)).setDepth(4) };
    }
  }
  sumar(v) {
    this.puntos += v;
    if (this.proximaVida > 0 && this.puntos >= this.proximaVida) { this.vidas++; this.proximaVida += RG('vida.extra', 10000); Forja.sonar(this, 'celebrar', 0.3); this.flotar(this.H.x, this.H.y - 40, '+1 vida'); }
  }
  flotar(x, y, txt) {
    const t = this.add.text(x, y, txt, { fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#c6ff4a', stroke: '#14111c', strokeThickness: 4 }).setOrigin(0.5).setDepth(980);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  asustar() {
    const efecto = RG('supergema.efecto', 'asustar'), dur = Math.max(0.5, RG('susto.duracion', 6) - (this.nivel - 1) * RG('niveles.susto', 1));
    Forja.sonar(this, 'salto', 0.5); this.cadena = 0;
    for (const e of this.rivales) {
      if (e.modo === 'regresa' || e.modo === 'casa' || e.miedo === 'valiente') continue;
      e.modo = efecto === 'lentos' ? 'lento' : 'susto'; e.tSusto = dur; e.congelado = efecto === 'congelar' || e.miedo === 'congela';
      if (RG('rivales.reversa', true) && !e.congelado) this.darVuelta(e);
    }
  }

  // Cada rival decide su siguiente celda al llegar al centro de una: asustado baja por el mapa de huida;
  // si no, sigue la ruta que calculó su algoritmo hacia su celda objetivo (y la recalcula cada tanto).
  moverRival(e, dt) {
    e.piensa -= dt;
    if (e.modo === 'casa') {
      e.espera -= dt; const p = centro(e.desde.c, e.desde.f); e.y = p.y + Math.sin(this.tiempo * 6 + e.i) * CH * 0.08;
      if (e.espera <= 0) { e.modo = this.modoGlobal; e.y = p.y; e.piensa = 0; }
      return;
    }
    if (e.modo === 'susto' || e.modo === 'lento') { e.tSusto -= dt; if (e.tSusto <= 0) { e.modo = this.modoGlobal; e.congelado = false; e.piensa = 0; } }
    let vel = RG('rivales.velocidad', 115) * (CW / 64) * e.ritmo * (1 + RG('niveles.acelera', 0.1) * (this.nivel - 1));
    if (e.modo === 'susto' || e.modo === 'lento') vel *= e.congelado ? 0 : RG('susto.velocidad', 0.5);
    if (e.modo === 'regresa') vel *= RG('casa.regreso', 2);
    const acel = RG('rivales.acelera', 0.15);
    if (e.i === 0 && acel && e.modo === 'persigue' && 1 - this.comidas / this.total <= (acel >= 0.25 ? 0.1 : 0.2)) vel *= 1 + acel;
    if (this.esTunel(e.desde) && e.modo !== 'regresa') vel *= RG('tuneles.lentos', 0.5);
    let v = vel * dt;
    for (let vuelta = 0; v > 0 && vuelta < 6; vuelta++) {
      if (igual(e.hacia, e.desde)) { this.decidir(e); if (igual(e.hacia, e.desde)) break; }
      const p = centro(e.hacia.c, e.hacia.f), dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
      if (d > v) { e.x += (dx / d) * v; e.y += (dy / d) * v; if (Math.abs(dx) > 0.5) e.s.setFlipX(dx < 0); break; }
      v -= d; e.prev = { ...e.desde }; e.desde = { c: (e.hacia.c + COLS) % COLS, f: e.hacia.f }; const q = centro(e.desde.c, e.desde.f); e.x = q.x; e.y = q.y;
      if (e.ruta.length > 1 && igual(e.ruta[1], e.desde)) e.ruta.shift();
      if (e.modo === 'regresa' && this.casa.some((k) => igual(k, e.desde))) { e.modo = 'casa'; e.espera = RG('casa.espera', 2); e.hacia = { ...e.desde }; return; }
      this.decidir(e);
    }
  }
  decidir(e) {
    const opciones = vecinos(this.mapa, e.desde.c, e.desde.f);
    const sinVuelta = !RG('rivales.mediavuelta', false) && e.prev ? opciones.filter((n) => !igual(n, e.prev)) : opciones;
    const lista = sinVuelta.length ? sinVuelta : opciones;
    if (!lista.length) return;
    let elegido = null;
    if (e.modo === 'susto') {
      const huida = RG('susto.huida', 'dijkstra'), tu = this.H.desde;
      if (huida === 'dijkstra') {
        const k = tu.f * COLS + tu.c; if (!this.huida || this.huida.k !== k) this.huida = { k, v: mapaHuida(this.mapa, tu, RG('susto.coef', -1.2)) };
        elegido = lista.reduce((b, n) => (this.huida.v[n.f * COLS + n.c] < this.huida.v[b.f * COLS + b.c] ? n : b), lista[0]);
      } else if (huida === 'lejos') elegido = lista.reduce((b, n) => (Math.hypot(n.c - tu.c, n.f - tu.f) > Math.hypot(b.c - tu.c, b.f - tu.f) ? n : b), lista[0]);
      else elegido = lista[Math.floor(this.r() * lista.length)];
      e.ruta = []; e.objetivo = null;
    } else {
      const destino = e.modo === 'regresa' ? this.casa[Math.floor(this.casa.length / 2)] : this.cerca(this.objetivoDe(e));
      if (e.piensa <= 0 || !e.ruta.length || !igual(e.ruta[0], e.desde) || !igual(e.ruta[e.ruta.length - 1], destino)) {
        const res = buscar(this.mapa, e.desde, destino, e.modo === 'regresa' ? 'bfs' : e.busqueda, sinVuelta.length ? e.prev : null);
        e.ruta = res.ruta; e.visitadas = res.visitadas; e.objetivo = destino; e.piensa = e.repiensa;
      }
      const sig = e.ruta[1]; elegido = sig ? lista.find((n) => igual(n, sig)) || opciones.find((n) => igual(n, sig)) : null;
      if (!elegido) elegido = lista[Math.floor(this.r() * lista.length)];
    }
    e.hacia = { c: e.desde.c + elegido.dc, f: e.desde.f + elegido.df };
  }
  esTunel(cel) { return (cel.c <= 1 || cel.c >= COLS - 2) && this.mapa[cel.f]?.[0] === 0; }

  choques() {
    const H = this.H, alcance = RG('rivales.alcance', 0.45) * CW * (0.6 + 0.4 * RG('jugador.tamano', 1));
    for (const e of this.rivales) {
      if (e.modo === 'casa' || e.modo === 'regresa' || Math.hypot(e.x - H.x, e.y - H.y) > alcance) continue;
      if (e.modo === 'susto') {
        const cad = RG('puntos.cadena', 'doble'), v = cad === 'triple' ? 100 * 3 ** this.cadena : cad === 'fijo200' ? 200 : cad === 'fijo500' ? 500 : 200 * 2 ** this.cadena;
        this.cadena++; this.cazados++; this.sumar(v); this.flotar(e.x, e.y - 30, '+' + v); Forja.sonar(this, 'golpe', 0.6); this.chispas.explode(16, e.x, e.y);
        e.modo = 'regresa'; e.congelado = false; e.ruta = []; e.piensa = 0;
      } else if (H.inmune <= 0) this.perderVida();
    }
  }
  perderVida() {
    this.vidas--; Forja.sonar(this, 'dano', 0.6); this.H.inmune = RG('jugador.inmunidad', 2);
    if (RG('resultado.sacudida', true)) this.cameras.main.shake(220, 0.01);
    if (this.vidas <= 0) { this.terminar(false); return; }
    if (RG('resultado.perder', 'reinicio') === 'reinicio') { this.reiniciarPosiciones(); this.empezar(1, 'Vidas: ' + this.vidas); }
    else { const p = centro(this.inicioHeroe.c, this.inicioHeroe.f); Object.assign(this.H, { x: p.x, y: p.y, desde: { ...this.inicioHeroe }, hacia: { ...this.inicioHeroe }, dir: { c: 0, f: 0 } }); }
  }

  revisarMeta() {
    const modo = RG('objetivo.modo', 'todas');
    if (modo === 'puntos' && this.puntos >= RG('objetivo.puntos', 3000)) return this.terminar(true);
    if (modo === 'sobrevivir' && this.tiempoTotal >= RG('objetivo.segundos', 60)) return this.terminar(true);
    if (modo === 'cazar' && this.cazados >= RG('objetivo.cazar', 6)) return this.terminar(true);
    if (this.gemas.size || this.superg.size) return;
    if (RG('puntos.tiempo', false)) this.sumar(Math.max(0, Math.round((90 - this.tiempo) * 10)));
    const niveles = RG('objetivo.niveles', 3);
    if (modo === 'todas' && niveles > 0 && this.nivel >= niveles) return this.terminar(true);
    this.fin = 'nivel'; this.heroe.play('heroe:celebrar'); Forja.sonar(this, 'celebrar', 0.6); this.chispas.explode(30, this.H.x, this.H.y - 30);
    Forja.aviso(this, '¡Nivel ' + this.nivel + ' superado!');
    const datos = { nivel: this.nivel + 1, puntos: this.puntos, vidas: this.vidas, cazados: this.cazados, proximaVida: this.proximaVida, tiempoTotal: this.tiempoTotal };
    this.time.delayedCall(1800, () => this.scene.restart(datos));
  }
  terminar(gano) {
    this.fin = gano ? 'gano' : 'perdio';
    this.heroe.play('heroe:' + (gano ? 'celebrar' : 'morir')); Forja.sonar(this, gano ? 'celebrar' : 'morir', 0.6);
    if (gano) this.chispas.explode(40, this.H.x, this.H.y - 30);
    let nuevoRecord = false;
    if (RG('resultado.record', true) && this.puntos > this.record) { this.record = this.puntos; nuevoRecord = true; try { localStorage.setItem('forja.persecucion.record', String(this.puntos)); } catch { /* sin almacenamiento */ } }
    const msg = RG('resultado.mensaje', 'puntos'), cab = gano ? '¡Ganaste!' : '¡Te atraparon!';
    const cuerpo = msg === 'corto' ? '' : msg === 'puntos' ? '\n' + this.puntos + ' puntos' + (nuevoRecord ? ' · ¡récord!' : '')
      : '\n' + this.puntos + ' puntos · nivel ' + this.nivel + '\n' + this.comidas + ' gemas · ' + this.cazados + ' rivales · ' + Math.floor(this.tiempoTotal) + ' s';
    Forja.aviso(this, cab + cuerpo + '\nR para jugar otra vez');
  }

  marcador() {
    const modo = RG('objetivo.modo', 'todas'), meta = modo === 'puntos' ? '   Meta ' + RG('objetivo.puntos', 3000) : modo === 'sobrevivir' ? '   Aguanta ' + Math.max(0, Math.ceil(RG('objetivo.segundos', 60) - this.tiempoTotal)) + ' s' : modo === 'cazar' ? '   Rivales ' + this.cazados + '/' + RG('objetivo.cazar', 6) : '';
    let s = 'Puntos ' + this.puntos + '   Vidas ' + this.vidas + '   Nivel ' + this.nivel + meta;
    if (RG('resultado.reloj', false)) s += '   ' + Math.floor(this.tiempoTotal) + ' s';
    if (RG('resultado.record', true) && this.record) s += '   Récord ' + this.record;
    if (RG('heroe.turbo', 'no') !== 'no') s += this.turboT > 0 ? '   ¡TURBO!' : this.turboCarga > 0 ? '   Turbo en ' + Math.ceil(this.turboCarga) : '   Turbo listo (Espacio)';
    if (this.verX) { const [disp, pers] = this.modos[Math.min(this.turno, this.modos.length - 1)]; s += '\nTurno: ' + this.modoGlobal + ' · ' + Math.max(0, Math.ceil((this.modoGlobal === 'dispersa' ? disp : pers) - this.turnoT)) + ' s' + (this.rivales.some((e) => e.modo === 'susto') ? ' (detenido: hay asustados)' : ''); }
    this.texto.setText(s);
  }

  pintar(t) {
    const H = this.H, h = this.heroe, mueve = H.dir.c || H.dir.f;
    h.setPosition(H.x, H.y + PIE).setDepth(20 + H.y);
    if (!this.fin) {
      h.play('heroe:' + (H.inmune > 1.2 ? 'dano' : mueve ? RG('heroe.paso', 'caminar') : 'quieto'), true);
      if (H.dir.c) h.setFlipX(H.dir.c < 0);
      h.setAlpha(H.inmune > 0 && Math.floor(H.inmune * 14) % 2 ? 0.45 : 1);
    }
    const aro = RG('rivales.marca', 'anillo') !== 'tinte', parpadeo = RG('susto.parpadeo', 2);
    this.aros.clear();
    for (const e of this.rivales) {
      e.s.setPosition(e.x, e.y + PIE).setDepth(20 + e.y);
      const asustado = e.modo === 'susto' || e.modo === 'lento', aviso = asustado && e.tSusto < parpadeo && Math.floor(t / 150) % 2;
      if (e.modo === 'regresa') e.s.setAlpha(0.35).setTint(0xb8b8c8);
      else if (asustado) e.s.setAlpha(1).setTint(aviso ? 0xffffff : e.modo === 'lento' ? 0xffd36b : 0x6f8cff);
      else { e.s.setAlpha(1); if (RG('rivales.marca', 'anillo') === 'anillo') e.s.clearTint(); else e.s.setTint(e.color); }
      const anim = asustado && !e.congelado && this.anims.exists('enemigo:correr') ? 'enemigo:correr' : e.congelado || e.modo === 'casa' ? 'enemigo:quieto' : 'enemigo:caminar';
      if (this.anims.exists(anim)) e.s.play(anim, true);
      if (aro && e.modo !== 'regresa') { this.aros.lineStyle(3, e.color, 0.95); this.aros.strokeEllipse(e.x, e.y + PIE - 2, CW * 0.7, CH * 0.28); }
    }
    // oscuridad: un anillo negro gigante alrededor de tu héroe; solo se ve lo que está cerca
    const R = RG('laberinto.oscuridad', 0); this.niebla.clear();
    if (R > 0) { this.niebla.lineStyle(3000, 0x05040a, 0.94); this.niebla.strokeCircle(H.x, H.y, R * CW + 1500); }
    if (this.verX) this.dibujarX(); else this.capaX.clear();
  }

  dibujarX() { // rayos X: el objetivo (anillo) y la ruta de cada rival en su color, su regla, su algoritmo y su modo
    const g = this.capaX.clear();
    this.rivales.forEach((e, k) => {
      const col = e.color, lab = this.etiquetas[k];
      if (e.objetivo) { const q = centro(e.objetivo.c, e.objetivo.f); g.lineStyle(3, col, 0.95); g.strokeCircle(q.x, q.y, CW * 0.32); g.strokeCircle(q.x, q.y, CW * 0.12); }
      g.lineStyle(4, col, 0.85);
      for (let i = 0; i < e.ruta.length - 1; i++) { const a = e.ruta[i], b = e.ruta[i + 1]; if (Math.abs(a.c - b.c) > 1) continue; const p = centro(a.c, a.f), q = centro(b.c, b.f); g.lineBetween(p.x, p.y, q.x, q.y); }
      const modo = e.modo === 'susto' ? 'huye (' + RG('susto.huida', 'dijkstra') + ') ' + Math.ceil(e.tSusto) + ' s' : e.modo === 'casa' ? 'en casa ' + Math.max(0, Math.ceil(e.espera)) + ' s' : e.modo;
      lab.setText('R' + e.n + ' ' + NOMBRE[e.regla] + ' · ' + NOMBRE[e.busqueda] + ' · ' + modo + (e.visitadas && e.modo !== 'susto' ? ' · revisó ' + e.visitadas : '')).setPosition(e.x, e.y - TAM * 0.75 - (k % 3) * 17).setVisible(true);   // escalonadas: no se tapan
    });
  }
}
Forja.iniciar(Persecucion);
