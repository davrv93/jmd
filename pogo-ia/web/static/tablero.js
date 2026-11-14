// Pogo IA · el tablero: 9 × 9 casillas, cuatro robots que rebotan en su pogo y
// pintan la casilla donde caen, y poderes que aparecen en el tablero. Sin
// dibujo ni DOM: escena3d.js lo pinta y pogo.js lo maneja. Todo en casillas
// enteras (c = columna, f = fila; la fila 0 es la del fondo, la 8 la más
// cercana a la cámara).
export const N = 9;
export const DURACION = 45;      // segundos por ronda
export const SALTO = 0.3;        // segundos por rebote
export const SALTO_TURBO = 0.17; // con turbo
export const SALTO_TRIPLE = 0.46; // con triple: lento
export const T_TURBO = 5, T_TRIPLE = 6;
export const MAREO = 1.6;        // segundos sin moverse tras fallar una pregunta
export const ATURDIDO = 2;       // segundos sin moverse tras un cohete
export const VUELO_COHETE = 0.75;
export const VIDA_PODER = 9;     // segundos que un poder espera en el tablero
const MAX_PODERES = 2;           // en el tablero a la vez

// Poderes: peso = qué tan seguido sale. El balde (pinta toda la mesa) es raro: uno por ronda como mucho y
// nunca en los primeros 10 segundos.
export const PODERES = {
  chip: { nombre: "Chip IA", peso: 26, texto: "cobras tus casillas" },
  cohete: { nombre: "Cohete", peso: 26, texto: "aturde al rival más cercano" },
  turbo: { nombre: "Turbo", peso: 22, texto: "rebotas el doble de rápido" },
  triple: { nombre: "Triple", peso: 18, texto: "vas lento, pero tus casillas valen ×3" },
  balde: { nombre: "Balde", peso: 8, texto: "pintas toda la mesa" },
};

// 16 colores bien distintos para la mesa de toda la clase (los 4 primeros son los de la partida contra la
// máquina) y, al final, el gris del robot de la máquina cuando juega en la mesa en vivo.
export const ROBOTS = [
  { nombre: "Tú", color: "#e8322f", claro: "#ff8f7a" },
  { nombre: "Bit", color: "#1d4fd8", claro: "#7fa2ff" },
  { nombre: "Byte", color: "#f2b705", claro: "#ffe27a" },
  { nombre: "Pixel", color: "#12a150", claro: "#7fe0a8" },
  { nombre: "Nano", color: "#ff7a00", claro: "#ffb36b" },
  { nombre: "Giga", color: "#8b3dff", claro: "#c9a6ff" },
  { nombre: "Tera", color: "#00b8d9", claro: "#7fe3f5" },
  { nombre: "Mega", color: "#ff3fa4", claro: "#ff9bd0" },
  { nombre: "Kilo", color: "#7a4b12", claro: "#c99a62" },
  { nombre: "Hexa", color: "#2f7d32", claro: "#8fd18f" },
  { nombre: "Octa", color: "#6b7280", claro: "#b8bec9" },
  { nombre: "Delta", color: "#b5179e", claro: "#f0a3e4" },
  { nombre: "Sigma", color: "#0b5fff", claro: "#86b0ff" },
  { nombre: "Omega", color: "#c9a500", claro: "#ffe680" },
  { nombre: "Zeta", color: "#ff5a36", claro: "#ffb3a3" },
  { nombre: "Lambda", color: "#1aa39a", claro: "#8ee0da" },
  { nombre: "Máquina", color: "#3a3f4a", claro: "#9aa0ad" },
];
export const SOLO = 4; // robots en la partida contra la máquina
const ESQUINAS = [[0, N - 1], [N - 1, 0], [N - 1, N - 1], [0, 0]];

export const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };

const dentro = (c, f) => c >= 0 && f >= 0 && c < N && f < N;
const dist = (a, b, c, f) => Math.abs(a - c) + Math.abs(b - f);

// rnd: función de azar (Math.random); nivel 0–1: qué tan bien juegan los robots de la máquina.
export function nuevaRonda(rnd, nivel = 0.6, { todosCpu = false } = {}) {
  const robots = ROBOTS.slice(0, SOLO).map((r, id) => {
    const [c, f] = ESQUINAS[id];
    return { id, nombre: r.nombre, cpu: todosCpu || id > 0, c, f, dc: c, df: f, fase: rnd() * 0.6, mareo: 0, meta: null, dir: [0, 0],
      turbo: 0, triple: 0, cohetes: 0, disparo: 0 };
  });
  const dueno = new Int8Array(N * N).fill(-1);
  const valor = new Int8Array(N * N);  // 1 normal, 3 si se pintó con triple
  robots.forEach((r) => { dueno[r.f * N + r.c] = r.id; valor[r.f * N + r.c] = 1; });
  // banco: casillas que cada robot ya cobró con un chip (salen del tablero y quedan guardadas).
  return { t: 0, n: N, rnd, nivel, robots, dueno, valor, banco: [0, 0, 0, 0], poderes: [], vuelos: [], proxPoder: 2.5 + rnd() * 2,
    baldes: 0, salidos: 0, eventos: [], fin: false };
}

export const salto = (r) => (r.turbo > 0 ? SALTO_TURBO : r.triple > 0 ? SALTO_TRIPLE : SALTO);

// Valor de cada robot que sigue pintado en el tablero (las casillas triples cuentan 3).
export function enTablero(m) {
  const n = new Array(m.robots.length).fill(0);
  for (let k = 0; k < m.dueno.length; k++) if (m.dueno[k] >= 0) n[m.dueno[k]] += m.valor[k];
  return n;
}

// Total de cada robot: lo cobrado más lo que sigue pintado.
export function conteo(m) {
  return enTablero(m).map((x, i) => x + m.banco[i]);
}

// Índice del robot con más casillas en total, o -1 si hay empate arriba.
export function lider(m) {
  const n = conteo(m), max = Math.max(...n);
  return n.filter((x) => x === max).length > 1 ? -1 : n.indexOf(max);
}

function ocupada(m, c, f, yo) {
  return m.robots.some((r) => r.id !== yo && ((r.c === c && r.f === f) || (r.dc === c && r.df === f)));
}

function pintar(m, c, f, id, v) {
  const k = f * N + c;
  if (m.dueno[k] === id && m.valor[k] >= v) return;
  const antes = m.dueno[k];
  m.dueno[k] = id; m.valor[k] = v;
  m.eventos.push({ tipo: "pintar", c, f, id, antes });
}

// Chip IA: el robot cobra. Sus casillas se vacían (vuelven a papel) y su valor pasa a su banco; las tiene
// que volver a pintar para seguir sumando, y los demás pueden pisar el tablero libre.
export function cobrar(m, id) {
  const r = m.robots[id];
  let n = 0;
  for (let k = 0; k < m.dueno.length; k++) if (m.dueno[k] === id) { n += m.valor[k]; m.dueno[k] = -1; m.valor[k] = 0; }
  m.banco[id] += n;
  m.eventos.push({ tipo: "cobro", id, c: r.c, f: r.f, n });
}

export function marear(m, id, seg = MAREO) {
  m.robots[id].mareo = Math.max(m.robots[id].mareo, seg);
  m.eventos.push({ tipo: "mareo", id });
}

// Rival más cercano (en casillas) que no esté ya aturdido; si todos lo están, el más cercano.
function blanco(m, r) {
  let mejor = -1, d = Infinity;
  for (const o of m.robots) {
    if (o.id === r.id) continue;
    const x = dist(o.c, o.f, r.c, r.f) + (o.mareo > 0 ? 20 : 0) + m.rnd() * 0.5;
    if (x < d) { d = x; mejor = o.id; }
  }
  return mejor;
}

// Lanza el cohete que el robot tenga guardado. Vuela VUELO_COHETE segundos y aturde a quien persigue.
export function disparar(m, id) {
  const r = m.robots[id];
  if (r.cohetes < 1 || m.fin) return false;
  const a = blanco(m, r);
  if (a < 0) return false;
  r.cohetes = 0;
  m.vuelos.push({ de: id, a, t: 0, c: r.c, f: r.f });
  m.eventos.push({ tipo: "lanzar", id, a });
  return true;
}

// Efecto de un poder ya ganado (con pregunta acertada o sin pregunta).
export function aplicar(m, id, tipo) {
  const r = m.robots[id];
  if (tipo === "chip") { cobrar(m, id); return; }
  if (tipo === "cohete") { r.cohetes = 1; r.disparo = 0.4 + m.rnd() * 1.1; }
  else if (tipo === "turbo") { r.turbo = T_TURBO; r.triple = 0; }
  else if (tipo === "triple") { r.triple = T_TRIPLE; r.turbo = 0; }
  else if (tipo === "balde") {
    // Siempre a valor 1, aunque tenga triple: 81 × 3 decidiría la ronda de un golpe.
    for (let k = 0; k < m.dueno.length; k++) { m.dueno[k] = id; m.valor[k] = 1; }
  }
  m.eventos.push({ tipo: "poder", id, poder: tipo, c: r.c, f: r.f });
}

function ponerPoder(m) {
  const libres = [];
  for (let f = 0; f < N; f++)
    for (let c = 0; c < N; c++)
      if (!ocupada(m, c, f, -1) && m.robots.every((r) => dist(c, f, r.c, r.f) >= 2) && !m.poderes.some((p) => p.c === c && p.f === f)) libres.push([c, f]);
  if (!libres.length) return;
  const tipos = Object.keys(PODERES).filter((t) => t !== "balde" || (m.baldes < 1 && m.t > 10));
  let x = m.rnd() * tipos.reduce((s, t) => s + PODERES[t].peso, 0), tipo = tipos[0];
  for (const t of tipos) { x -= PODERES[t].peso; if (x <= 0) { tipo = t; break; } }
  if (tipo === "balde") m.baldes++;
  const [c, f] = libres[Math.floor(m.rnd() * libres.length)];
  m.poderes.push({ tipo, c, f, vida: VIDA_PODER });
  m.salidos++;
  m.eventos.push({ tipo: "poderNuevo", poder: tipo, c, f });
}

// Robot de la máquina: va a un poder si lo tiene a su alcance; si no, a una casilla que no sea suya, mejor si
// es del líder. Con nivel bajo se distrae más.
function decidir(m, r) {
  const rnd = m.rnd;
  if (rnd() > 0.55 + m.nivel * 0.45) {
    const ds = Object.values(DIRS);
    return ds[Math.floor(rnd() * ds.length)];
  }
  let meta = null;
  let cerca = null, dc = Infinity;
  for (const p of m.poderes) { const d = dist(p.c, p.f, r.c, r.f); if (d < dc) { dc = d; cerca = p; } }
  if (cerca && dc <= 3 + m.nivel * 5 && rnd() < m.nivel + 0.2) meta = [cerca.c, cerca.f];
  else {
    const vale = r.meta && m.dueno[r.meta[1] * N + r.meta[0]] !== r.id && !(r.meta[0] === r.c && r.meta[1] === r.f);
    if (!vale || rnd() < 0.08) {
      const lid = lider(m);
      let mejor = null, puntos = Infinity;
      for (let k = 0; k < 14; k++) {
        const c = Math.floor(rnd() * N), f = Math.floor(rnd() * N), d = m.dueno[f * N + c];
        if (d === r.id) continue;
        const p = dist(c, f, r.c, r.f) - (d === lid && lid >= 0 && lid !== r.id ? 1.5 : 0) - (d >= 0 ? 0.4 * m.valor[f * N + c] : 0) + rnd() * 1.2;
        if (p < puntos) { puntos = p; mejor = [c, f]; }
      }
      r.meta = mejor;
    }
    meta = r.meta;
  }
  if (!meta) return [0, 0];
  const dx = Math.sign(meta[0] - r.c), dy = Math.sign(meta[1] - r.f);
  const opciones = [];
  if (dx) opciones.push([dx, 0]);
  if (dy) opciones.push([0, dy]);
  if (rnd() < 0.5) opciones.reverse();
  for (const o of opciones) if (!ocupada(m, r.c + o[0], r.f + o[1], r.id)) return o;
  // Bloqueado: rodea por un costado.
  return dx ? [0, rnd() < 0.5 ? 1 : -1] : [rnd() < 0.5 ? 1 : -1, 0];
}

// Un paso de simulación. mando() devuelve la dirección [dc, df] que la persona quiere en este momento (o
// null); solo se lee cuando su robot toca el suelo. Los poderes que toma la persona salen como evento
// «tomar»: pogo.js decide si van con pregunta y luego llama a aplicar() o marear().
export function paso(m, dt, mando) {
  if (m.fin) return;
  m.t += dt;
  for (let k = m.poderes.length - 1; k >= 0; k--) {
    const p = m.poderes[k];
    if ((p.vida -= dt) <= 0) { m.poderes.splice(k, 1); m.eventos.push({ tipo: "poderFuera", poder: p.tipo, c: p.c, f: p.f }); }
  }
  if (m.poderes.length < MAX_PODERES && (m.proxPoder -= dt) <= 0 && m.t < DURACION - 3) { ponerPoder(m); m.proxPoder = 2.5 + m.rnd() * 2.5; }

  for (let k = m.vuelos.length - 1; k >= 0; k--) {
    const v = m.vuelos[k];
    if ((v.t += dt) < VUELO_COHETE) continue;
    m.vuelos.splice(k, 1);
    const o = m.robots[v.a];
    o.mareo = Math.max(o.mareo, ATURDIDO);
    m.eventos.push({ tipo: "impacto", id: v.a, de: v.de, c: o.c, f: o.f });
  }

  for (const r of m.robots) {
    if (r.mareo > 0) r.mareo = Math.max(0, r.mareo - dt);
    if (r.turbo > 0) r.turbo = Math.max(0, r.turbo - dt);
    if (r.triple > 0) r.triple = Math.max(0, r.triple - dt);
    if (r.cpu && r.cohetes > 0 && (r.disparo -= dt) <= 0) disparar(m, r.id);
    r.fase += dt / salto(r);
    if (r.fase < 1) continue;
    r.fase -= Math.floor(r.fase);
    // Aterriza.
    r.c = r.dc; r.f = r.df;
    pintar(m, r.c, r.f, r.id, r.triple > 0 ? 3 : 1);
    m.eventos.push({ tipo: "salto", id: r.id });
    const k = m.poderes.findIndex((p) => p.c === r.c && p.f === r.f);
    if (k >= 0) {
      const [p] = m.poderes.splice(k, 1);
      m.eventos.push({ tipo: "tomar", id: r.id, poder: p.tipo, c: r.c, f: r.f });
      // La máquina «responde» la pregunta en la mitad de los poderes; falla más en los niveles bajos.
      if (r.cpu) { if (m.rnd() < 0.5 && m.rnd() > 0.5 + m.nivel * 0.4) marear(m, r.id); else aplicar(m, r.id, p.tipo); }
    }
    // Elige el siguiente rebote.
    const d = r.mareo > 0 ? null : r.cpu ? decidir(m, r) : mando && mando();
    r.dir = d || [0, 0];
    if (!d || (!d[0] && !d[1])) continue;
    const c = r.c + d[0], f = r.f + d[1];
    if (!dentro(c, f)) continue;
    if (ocupada(m, c, f, r.id)) { m.eventos.push({ tipo: "choque", id: r.id, c, f }); continue; }
    r.dc = c; r.df = f;
  }
  if (m.t >= DURACION) m.fin = true;
}

// Resultado al acabar el reloj: conteo, líder (-1 = empate) y si ganó la persona.
export function resultado(m) {
  if (!m.fin) return null;
  const n = conteo(m), l = lider(m);
  return { conteo: n, lider: l, gano: l === 0 };
}
