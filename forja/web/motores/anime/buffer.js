// Forja · Anime Battle Engine · Input Buffer (§8). Guarda, cuadro a cuadro, la dirección (notación numérica de los
// juegos de lucha: 1–9 vista desde el luchador, 6 = adelante, 2 = abajo, 5 = neutro) y cada botón con el cuadro en que se
// apretó y cuánto se mantuvo. Así se reconocen: secuencias (ligero, ligero, fuerte), movimientos (↓↘→ + golpe = 236),
// impulso (6 6), salto + ataque, carga mantenida + especial y botones simultáneos (ligero + medio).
// Todo está en CUADROS de simulación: nada depende del reloj de pared ni del framerate.
export const BOTONES = ['ligero', 'medio', 'fuerte', 'especial', 'bloqueo', 'esquiva', 'carga', 'definitivo', 'transformar', 'salto'];

export function crearBuffer({ largo = 30, ventanaMovimiento = 14, ventanaSimultaneo = 3, ventanaPulsacion = 6 } = {}) {
  const dirs = new Uint8Array(largo).fill(5), pulsos = [];   // pulsos: { b, f, usado }
  const mantenido = new Map(), soltadoEn = new Map(), duracion = new Map();   // botón → cuadro en que empezó / se soltó / cuánto duró
  let f = 0, usadoMov = -1;
  const b = {
    config: { largo, ventanaMovimiento, ventanaSimultaneo, ventanaPulsacion },
    get cuadro() { return f; },
    // entrada: { x: -1|0|1, y: -1 (arriba) | 0 | 1 (abajo), recien: Set de botones, abajo: Set } ; dir del luchador (1|-1)
    registrar(e, mira = 1) {
      f++;
      const x = (e.x || 0) * mira, y = e.y || 0;   // x relativo: + es «adelante»
      dirs[f % largo] = 5 + x - 3 * y;              // 7 8 9 / 4 5 6 / 1 2 3
      for (const n of e.recien || []) if (BOTONES.includes(n)) pulsos.push({ b: n, f, usado: false });
      while (pulsos.length && f - pulsos[0].f > largo) pulsos.shift();
      for (const n of BOTONES) { const ab = e.abajo?.has(n); if (ab && !mantenido.has(n)) mantenido.set(n, f); else if (!ab && mantenido.has(n)) { soltadoEn.set(n, f); duracion.set(n, f - mantenido.get(n)); mantenido.delete(n); } }
    },
    dir(atras = 0) { return dirs[(f - atras + largo * 4) % largo]; },
    // cuadros que lleva mantenido un botón (0 si no)
    mantiene(n) { return mantenido.has(n) ? f - mantenido.get(n) + 1 : 0; },
    // ¿se apretó n en los últimos `ventana` cuadros sin que otro movimiento lo consumiera?
    pulsado(n, ventana = ventanaPulsacion) { return pulsos.some((p) => p.b === n && !p.usado && f - p.f < ventana); },
    consumir(n) { for (let i = pulsos.length - 1; i >= 0; i--) if (pulsos[i].b === n && !pulsos[i].usado) { pulsos[i].usado = true; return true; } return false; },
    // dos botones apretados con menos de ventanaSimultaneo cuadros de diferencia
    simultaneo(a, c) {
      const pa = pulsos.filter((p) => p.b === a && !p.usado && f - p.f < ventanaPulsacion), pc = pulsos.filter((p) => p.b === c && !p.usado && f - p.f < ventanaPulsacion);
      return pa.some((x) => pc.some((y) => Math.abs(x.f - y.f) < ventanaSimultaneo));
    },
    // secuencia de direcciones en orden (p. ej. '236' o '66'), dentro de la ventana, terminando hace ≤ 4 cuadros.
    // Para '66' exige un neutro (5) entre las dos pulsaciones: mantener → no es impulso.
    movimiento(seq, ventana = ventanaMovimiento) {
      if (seq === '66' || seq === '44') {   // doble toque: toque reciente, hueco (otra dirección) y toque anterior
        const t = +seq[0]; let a = 0;
        while (a < 4 && b.dir(a) !== t) a++;
        if (b.dir(a) !== t || f - a <= usadoMov) return false;
        while (a < ventana && b.dir(a) === t) a++;
        let hueco = 0; while (a < ventana && b.dir(a) !== t) { a++; hueco++; }
        return hueco > 0 && a < ventana && b.dir(a) === t && f - a > usadoMov;
      }
      let k = seq.length - 1, ultimo = -1;
      for (let a = 0; a < ventana && a < largo; a++) {
        const d = b.dir(a);
        // tolerancia: la diagonal intermedia (3 en 236) puede faltar si se soltó una tecla antes de apretar la otra
        if (k > 0 && k < seq.length - 1 && [1, 3, 7, 9].includes(+seq[k]) && d === +seq[k - 1]) k--;
        if (d === +seq[k]) { if (k === seq.length - 1) ultimo = f - a; k--; if (k < 0) return ultimo > usadoMov; }
        else if (k === seq.length - 1 && a > 4) return false;   // el último paso tiene que ser reciente
      }
      return false;
    },
    consumirMovimiento() { usadoMov = f; },
    // carga mantenida al menos n cuadros, ahora o soltada hace ≤ 8 cuadros
    cargado(n) { return b.mantiene('carga') >= n || (f - soltadoEn.get('carga') <= 8 && duracion.get('carga') >= n); },
    reiniciar() { dirs.fill(5); pulsos.length = 0; mantenido.clear(); soltadoEn.clear(); duracion.clear(); usadoMov = f; },
    // historial legible (editor, pruebas, IA que estudia patrones)
    historial(n = 12) { return pulsos.slice(-n).map((p) => `${p.b}@${p.f}`); },
  };
  return b;
}

// Una entrada de comando como en la ficha del personaje: 'ligero' · '236+especial' · '66+fuerte' · 'aire+ligero' ·
// 'carga>40+especial' (carga mantenida 40 cuadros) · 'ligero+medio' (simultáneos) · '2+medio' (agachado + medio)
export function parsearComando(txt) {
  const c = { botones: [], movimiento: null, aire: false, carga: 0, abajo: false, adelante: false, atras: false };
  for (const parte of String(txt).split('+')) {
    if (parte === 'aire') c.aire = true;
    else if (/^carga>\d+$/.test(parte)) c.carga = +parte.slice(6);
    else if (parte === '2') c.abajo = true;
    else if (parte === '6') c.adelante = true;
    else if (parte === '4') c.atras = true;
    else if (/^[1-9]{2,4}$/.test(parte)) c.movimiento = parte;
    else c.botones.push(parte);
  }
  return c;
}
// ¿el buffer cumple el comando? (no consume; consumir() aparte cuando el movimiento sale)
export function cumple(buf, c, { enAire, impulsando }) {
  if (c.aire !== !!enAire) return false;
  if (c.movimiento === '66' && !impulsando && !buf.movimiento('66')) return false;
  if (c.movimiento && c.movimiento !== '66' && !buf.movimiento(c.movimiento)) return false;
  if (c.carga && !buf.cargado(c.carga)) return false;
  const d = buf.dir();
  if (c.abajo && ![1, 2, 3].includes(d)) return false;
  if (!c.abajo && !c.movimiento && !enAire && [1, 2, 3].includes(d) && c.botones.length === 1 && !c.carga) return false;   // agachado usa otra versión
  if (c.adelante && ![3, 6, 9].includes(d)) return false;
  if (c.atras && ![1, 4, 7].includes(d)) return false;
  if (c.botones.length === 2) return buf.simultaneo(c.botones[0], c.botones[1]);
  return c.botones.every((n) => buf.pulsado(n));
}
