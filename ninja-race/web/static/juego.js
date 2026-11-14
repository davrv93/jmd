// Ninja Race · motor de la carrera.
//
// Un jugador contra dos cpu en tres carriles con la MISMA pista (mismo patrón
// de obstáculos, semilla fija: nadie tiene rocas distintas). Física del guion
// del kit: salto v0 -640 px/s, gravedad 1750 px/s², velocidad de 250 a 430
// px/s, golpe al 45 % durante 0,7 s y 0,9 s de invulnerabilidad.
//
// Cada corredor tiene 3 vidas: cada choque consume una y lo frena, pero nadie
// queda eliminado por un golpe. El marcador crece mientras dure sin caerse
// (10 puntos por segundo vivo y 5 por obstáculo esquivado). Los rivales tienen 6
// vidas y te lanzan jutsus; tú tienes kamui (doble espacio: atraviesas todo),
// amaterasu (P: quema lo que viene en tu carril) y teletransporte (↓), pagados
// con la barra de chakra. La pista avanza por arenas (meta a los ~2:10). El jugador además
// avanza o frena por la pista (← →, A D o los botones): adelantarse esquiva más
// obstáculos por segundo, pero deja menos tiempo para saltar. La carrera sigue y
// sigue hasta que el jugador pierde sus 3 vidas (el servidor fija el tope, de
// minutos); el puesto se decide por puntaje. Devuelve los datos que el servidor valida.
const AN = 980, AL = 552;               // mismo 16:9 del fondo ilustrado
// Corredor, CPU1 y CPU2 usan carriles centrales 2, 3 y 4 del fondo de cinco.
const SUELO = [240, 340, 438];
const ESC = 0.42;                        // ninjas caben en la separación entre carriles
const CELDA = { an: 240, al: 204 };
// Física del kit + ajustes de la carrera: los cpu fallan 1 de cada 10 saltos
// (su error es su desventaja) y los obstáculos se miden en SEGUNDOS, no en
// píxeles, para que la pista no se acelere sola cuando sube la velocidad.
const F = { v0: -640, g: 1750, velIni: 270, velMax: 520, acel: 3.0, golpe: .7, invul: .9,
  vidas: 3, vidasCpu: 6, fallaCpu: .06, reactCpu: .24,
  avance: .4,                // ± 40 % de velocidad al avanzar o frenar
  delante: 470, detras: 150 };  // cuánto puede alejarse del pelotón por la pista
// Chakra: la barra que paga las técnicas para que no se abusen.
const CHAKRA = { max: 100, inicio: 60, regen: 8, porEsquivada: 4,
  kamui: 45, amaterasu: 35, tele: 30,
  kamuiDur: 1.6,             // segundos intangible: atraviesa obstáculos y jutsus
  teleDist: 170,             // píxeles que salta hacia adelante
  dobleToque: .32 };         // segundos entre dos espacios para el kamui
const vel = (t) => Math.min(F.velMax, F.velIni + t * F.acel);
// Distancia que recorre el pelotón hasta el segundo t (integral de vel).
function distancia(t) {
  const tMax = (F.velMax - F.velIni) / F.acel;
  if (t <= tMax) return F.velIni * t + F.acel * t * t / 2;
  return F.velIni * tMax + F.acel * tMax * tMax / 2 + F.velMax * (t - tMax);
}

// Arenas: la pista avanza (el fondo se desliza) y la meta de la primera arena
// recién aparece a los ~2:10; luego empieza otra arena igual, con otra luz.
// El fondo del kit se parte en salida (0-300 px), tramo del medio (300-1400,
// que se repite en espejo para no notar la costura) y meta (1400-1672).
const BG = { an: 1672, al: 941, salida: 300, meta: 1400 };
const KF = AL / BG.al;
const ARENA_T = [130, 120];               // segundos por arena (las siguientes, 120)
const ARENAS = (() => {
  const out = [];
  let x0 = 0, tFin = 0;
  for (let i = 0; i < 16; i++) {
    tFin += ARENA_T[Math.min(i, ARENA_T.length - 1)];
    const meta = Math.max(x0 + BG.salida * KF + 400, 230 + distancia(tFin));
    const x1 = meta + (BG.an - BG.meta) * KF;
    out.push({ i, x0, meta, x1 });
    x0 = x1;
  }
  return out;
})();
const enTransicion = (x) => ARENAS.some((a) => x > a.meta - 420 && x < a.x1 + BG.salida * KF + 260);

const NOMBRES_CPU = ["KAGE", "YUKI"];    // los dos rivales de la casa
const ONOMATOPEYAS = ["¡PUM!", "¡CRACK!", "¡ZAS!", "¡BOF!", "¡PAC!"];
const REGLAS_CPU = ["¡Uf!", "¡Que va!", "¡Te espero!", "¡Más rápido!", "¡Uy!"];
const COLORES = ["#ff3b30", "#24c2e0", "#ff7a00", "#2fbf71"];
const ASSET_VERSION = "sprites-fondo-20261030e";
// Las imágenes tienen versión propia: cambiar el código no obliga a bajarlas
// otra vez (el servidor las cachea un año cuando llevan ?v=).
const IMG_VERSION = "webp-20261030";
const IMAGENES = {
  fondo: `static/escenarios/pista_v2.webp?v=${IMG_VERSION}`,
  hojas: ["ninja_renegado", "ninja_chunin", "ninja_joven"].map((n) => `static/hojas/${n}.webp?v=${IMG_VERSION}`),
  obstaculos: ["piedra_pequena", "piedra_mediana", "tronco", "valla_baja"],
};
const rutaObst = (n) => `static/obstaculos/${n}.webp?v=${IMG_VERSION}`;
// Precarga: se llama al abrir la página para que, al pulsar «Correr», ya estén.
export function precargar() {
  for (const src of [IMAGENES.fondo, ...IMAGENES.hojas, ...IMAGENES.obstaculos.map(rutaObst)]) {
    const im = new Image(); im.decoding = "async"; im.src = src;
  }
}

// Misma pista para todos: semilla fija. Los huecos se calculan simulando el
// tiempo: de 1,9-2,8 s al empezar a 1,2-1,7 s a los 3 minutos (la dificultad
// sube), y nunca sobre la meta ni la salida de una arena.
function pista() {
  let s = 0x9e3779b9;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const out = [];
  let x = 0, t = 0, prox = 6.5;         // 6,5 s de pista libre para arrancar
  const tipos = [
    { img: "piedra_pequena", esc: .30 },
    { img: "piedra_mediana", esc: .34 },
    { img: "tronco", esc: .34 },
    { img: "valla_baja", esc: .40 },
  ];
  const dt = .2;
  while (t < 1900) {                    // ~30 min de pista: la carrera sigue y sigue
    x += vel(t) * dt;
    t += dt;
    if (t >= prox) {
      if (enTransicion(x + 230)) { prox = t + .4; continue; }
      const tipo = tipos[Math.floor(rnd() * tipos.length)];
      out.push({ x, ...tipo, marcado: new Set(), dec: {}, quemado: false });
      const dif = Math.min(1, t / 180);
      prox = t + (1.9 - .7 * dif) + rnd() * (.9 - .4 * dif);
      if (rnd() < .18 - .08 * dif) prox += .9 + rnd() * .9;   // algún respiro
    }
  }
  return out;
}

// Modo clase (red): los dos rivales pueden ser compañeros de mesa en vez de cpu. Cada navegador simula
// solo a su corredor (siempre en el carril de abajo) y manda su estado; los rivales humanos se dibujan
// con lo que manda el servidor (posición relativa al pelotón, salto, vidas y puntaje). La salida es común
// (red.salida, en el reloj local ya corregido) y, si alguien llega tarde, entra con la carrera en marcha.
export function carrera({ canvas, hud, cfg, onCuenta, onFin, audio = { on: true }, red = null }) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = AN * dpr;
  canvas.height = AL * dpr;
  canvas.style.aspectRatio = AN + " / " + AL;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const hojas = {};
  const obstImg = {};
  const sonidos = {};
  let imgFondo = null;
  const cargar = (src) => new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ok(null);
    im.src = src;
  });
  const base = new URL(".", location.href).pathname;

  // ---------- corredores ----------
  const corredor = (nombre, hoja, lane, cpu, remoto = false) => ({
    nombre, hoja, lane, cpu, remoto, puntos: 0, objX: null, objY: 0,
    x: 230, y: 0, vy: 0, suelo: true, estado: "RUN", frame: Math.random() * 8,
    golpe: 0, invul: 0, vidas: cpu ? F.vidasCpu : F.vidas, ko: false, kamui: 0,
    chakra: CHAKRA.inicio, proxJutsu: 0,
    tiempoVivo: 0, esquivadas: 0, burbuja: "", burbujaT: 0,
    react: F.reactCpu + Math.random() * .08,
  });
  let r = [];                 // [cpu1, cpu2, jugador] en orden de carril
  let jugador = null;
  let obstaculos = [], polvo = [], onos = [], lineas = [];
  let jutsus = [], fuegos = [], estelas = [];   // jutsus de los cpu, amaterasu y rastros de lanzamiento
  let fondos = [], arenaActual = 0, proxJutsu = 22, ultimoEspacio = -9;
  let camX = 0, t = 0, cuenta = 3.2, fase = "cuenta";
  let ritmo = 230, mando = 0;  // ritmo: dónde va el pelotón; mando: -1 frena, 0, +1 avanza
  let sacudida = 0, destello = 0, finT = 0, ultimoTick = 0;
  const tope = cfg.max_ms || 1800000;   // el servidor fija el tope (30 min): corre hasta caer

  function pintarHUD() {
    if (!hud) return;
    const vidas = jugador ? jugador.vidas : F.vidas;
    hud.vidas.textContent = "❤".repeat(vidas) + "🖤".repeat(F.vidas - vidas);
    hud.puntos.textContent = `${puntaje(jugador)} pts`;
    const seg = Math.floor(t);
    hud.tiempo.textContent = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
    hud.puesto.textContent = puestoDe(jugador) + ".º";
    hud.esquivadas.textContent = `${jugador ? jugador.esquivadas : 0} esquivadas`;
  }
  const puntaje = (c) => !c ? 0 : c.remoto ? (c.puntos || 0) : Math.floor(c.tiempoVivo * 10) + c.esquivadas * 5;
  function puestoDe(c) {
    if (!c) return 1;
    let p = 1;
    for (const o of r) if (o !== c && puntaje(o) > puntaje(c)) p++;
    return p;
  }

  // ---------- sonido ----------
  function pon(nombre, vol = 1) {
    if (!audio.on || !sonidos[nombre]) return;
    try {
      const a = sonidos[nombre].cloneNode();
      a.volume = vol;
      a.play().catch(() => {});
    } catch (_) { /* sin audio: la carrera sigue */ }
  }

  // ---------- entrada ----------
  function saltar() {
    if (fase === "espera" || fase === "fin") return;
    if (fase !== "corre") return;
    if (!jugador || jugador.ko || !jugador.suelo) return;
    jugador.vy = F.v0;
    jugador.suelo = false;
    jugador.estado = "SALTO";
    chispas(jugador, 6, "#cdbba8");
    pon("salto", .9);
  }
  // ---------- técnicas (pagan chakra) ----------
  function gastar(costo) {
    if (fase !== "corre" || !jugador || jugador.ko || jugador.chakra < costo) {
      if (fase === "corre" && jugador && !jugador.ko) onomatopeya("SIN CHAKRA", 2, "#9aa0a6");
      return false;
    }
    jugador.chakra -= costo;
    return true;
  }
  function kamui() {
    if (!jugador || jugador.kamui > 0 || !gastar(CHAKRA.kamui)) return;
    jugador.kamui = CHAKRA.kamuiDur;
    onomatopeya("¡KAMUI!", 2, "#b48cff");
    pon("checkpoint", .7);
  }
  function amaterasu() {
    if (!gastar(CHAKRA.amaterasu)) return;
    fuegos.push({ x: jugador.x + 26, vida: 1.5 });
    onomatopeya("¡AMATERASU!", 2, "#ff3b30");
    pon("colision", .5);
  }
  function teletransporte() {
    if (!gastar(CHAKRA.tele)) return;
    estelas.push({ x0: jugador.x, x1: 0, lane: 2, vida: .45, tipo: "tele" });
    jugador.x = Math.min(ritmo + F.delante, jugador.x + CHAKRA.teleDist);
    estelas[estelas.length - 1].x1 = jugador.x;
    jugador.invul = Math.max(jugador.invul, .3);
    chispas(jugador, 10, "#9fe7ff");
    onomatopeya("¡ZUUM!", 2, "#24c2e0");
    pon("salto", .6);
  }
  function espacio() {
    const ahora = performance.now() / 1000;
    if (ahora - ultimoEspacio < CHAKRA.dobleToque) { ultimoEspacio = -9; kamui(); return; }
    ultimoEspacio = ahora;
    saltar();
  }
  const jutsu = (n) => { if (n === "kamui") kamui(); else if (n === "amaterasu") amaterasu(); else if (n === "tele") teletransporte(); };

  const alTocar = (e) => { e.preventDefault(); espacio(); };
  canvas.addEventListener("pointerdown", alTocar);
  const onKey = (e) => {
    if (e.repeat && [" ", "p", "P", "ArrowDown", "s", "S"].includes(e.key)) { e.preventDefault(); return; }
    if ([" ", "ArrowUp", "w", "W"].includes(e.key)) { e.preventDefault(); espacio(); }
    else if (["p", "P"].includes(e.key)) { e.preventDefault(); amaterasu(); }
    else if (["ArrowDown", "s", "S"].includes(e.key)) { e.preventDefault(); teletransporte(); }
    else if (["ArrowRight", "d", "D"].includes(e.key)) { e.preventDefault(); mando = 1; }
    else if (["ArrowLeft", "a", "A"].includes(e.key)) { e.preventDefault(); mando = -1; }
  };
  const onKeyUp = (e) => {
    if (["ArrowRight", "d", "D"].includes(e.key) && mando === 1) mando = 0;
    if (["ArrowLeft", "a", "A"].includes(e.key) && mando === -1) mando = 0;
  };
  addEventListener("keydown", onKey);
  addEventListener("keyup", onKeyUp);
  // botones táctiles: mantener apretado para avanzar o frenar
  const mover = (m) => { if (fase === "corre" || fase === "cuenta") mando = m; };

  // ---------- efectos ----------
  function chispas(c, n, color) {
    for (let i = 0; i < n; i++) {
      polvo.push({
        x: c.x + (Math.random() - .5) * 30, lane: c.lane,
        y: -Math.random() * 8, vx: -40 - Math.random() * 110, vy: -30 - Math.random() * 80,
        vida: .55, color,
      });
    }
  }
  function onomatopeya(texto, lane, color) {
    onos.push({ texto, lane, color, x: 250 + Math.random() * 460, t: 0,
      rot: (Math.random() - .5) * .5, esc: .6 });
    if (onos.length > 6) onos.shift();
  }
  function chispasEn(x, lane, n, color) {
    for (let i = 0; i < n; i++) {
      polvo.push({ x: x + (Math.random() - .5) * 30, lane, y: -10 - Math.random() * 30,
        vx: (Math.random() - .5) * 160, vy: -60 - Math.random() * 120, vida: .6, color });
    }
  }
  function globo(c) {
    c.burbuja = REGLAS_CPU[Math.floor(Math.random() * REGLAS_CPU.length)];
    c.burbujaT = 2.2;
  }

  // golpe de obstáculo o de jutsu: una vida menos, frena y queda invulnerable
  // Solo para probar en local (127.0.0.1?dios): el jugador no pierde vidas.
  const DIOS = location.hostname === "127.0.0.1" && new URLSearchParams(location.search).has("dios");
  function golpear(c, texto) {
    if (!c.cpu && DIOS) { c.invul = F.invul; return; }
    c.invul = F.invul;
    c.vidas--;
    chispas(c, 14, "#ffd633");
    if (!c.cpu) {
      sacudida = .35; destello = .22;
      onomatopeya(texto || ONOMATOPEYAS[Math.floor(Math.random() * ONOMATOPEYAS.length)],
        c.lane, COLORES[Math.floor(Math.random() * COLORES.length)]);
      pon("colision", .95);
    } else {
      pon("colision", .35);
    }
    if (c.vidas <= 0) {
      c.ko = true;
      c.estado = "KO";
      if (!c.cpu) { onomatopeya("¡KO!", c.lane, "#ff3b30"); pon("meta", .8); }
    } else {
      c.golpe = F.golpe;
      c.estado = "HIT";
    }
  }

  // ---------- física ----------
  function paso(dt) {
    t += dt;
    const vel = Math.min(F.velMax, F.velIni + t * F.acel);
    ritmo += vel * dt;
    const dif = Math.min(1, t / 180);         // la dificultad sube hasta los 3 minutos

    // chakra y kamui del jugador
    if (jugador && !jugador.ko) {
      jugador.chakra = Math.min(CHAKRA.max, jugador.chakra + CHAKRA.regen * dt);
      if (jugador.kamui > 0) jugador.kamui -= dt;
    }

    // nueva arena: cartel y sonido al cruzar la meta
    const ai = ARENAS.findIndex((a) => ritmo < a.x1);
    if (ai > arenaActual) {
      arenaActual = ai;
      onos.push({ texto: `¡ARENA ${ai + 1}!`, lane: 1, color: "#ffd633", x: AN / 2, t: -.4, rot: 0, esc: 1, grande: true });
      pon("checkpoint", 1);
    }

    // los cpu lanzan jutsus al carril del jugador: vuelan a la altura del
    // cuerpo, así que se esquivan saltando (o con kamui, o quemándolos)
    if (t >= proxJutsu && jugador && !jugador.ko && !enTransicion(ritmo + AN)) {
      // la casa sigue atacando aunque KAGE o YUKI ya estén KO
      const vivos = r.filter((c) => c.cpu && !c.ko).length ? r.filter((c) => c.cpu && !c.ko) : r.filter((c) => c.cpu);
      if (vivos.length) {
        const de = vivos[Math.floor(Math.random() * vivos.length)];
        const x = ritmo + AN * .74;
        jutsus.push({ x, vx: vel * (.35 - .15 * dif), giro: 0, de });
        estelas.push({ x0: de.x, x1: x, lane: de.lane, vida: .35, tipo: "lanza" });
        de.burbuja = Math.random() < .5 ? "¡Shuriken!" : "¡Toma!"; de.burbujaT = 1.2;
      }
      proxJutsu = t + Math.max(2.6, 8.5 - 5.5 * dif) + Math.random() * 2;
    }
    for (const j of jutsus) { j.x += j.vx * dt; j.giro += dt * 18; }
    for (const f of fuegos) { f.x += (vel + 560) * dt; f.vida -= dt; }
    for (const e of estelas) e.vida -= dt;

    for (const c of r) {
      if (c.remoto) { seguirRemoto(c, dt); continue; }
      if (c.burbujaT > 0) c.burbujaT -= dt;
      if (c.invul > 0) c.invul -= dt;
      if (c.golpe > 0) {
        c.golpe -= dt;
        if (c.golpe <= 0 && !c.ko) c.estado = c.suelo ? "RUN" : "SALTO";
      }
      if (c.ko) continue;

      c.tiempoVivo += dt;
      const factor = c.golpe > 0 ? .45 : 1;
      const impulso = c.cpu ? 1 : 1 + F.avance * mando;
      c.x += vel * factor * impulso * dt;
      if (!c.cpu) c.x = Math.min(ritmo + F.delante, Math.max(ritmo - F.detras, c.x));
      c.frame += dt * 12;

      if (!c.suelo) {
        c.vy += F.g * dt;
        c.y += c.vy * dt;
        if (c.y >= 0) {
          c.y = 0; c.vy = 0; c.suelo = true;
          if (c.estado === "SALTO") { c.estado = "RUN"; if (!c.cpu) pon("aterrizaje", .5); chispas(c, 5, "#cdbba8"); }
        }
      }

      // los cpu saltan con reacción imperfecta: su error es su desventaja
      if (c.cpu) {
        for (const o of obstaculos) {
          const d = o.x - c.x;
          if (d <= vel * (c.react + (o.dec[c.lane] !== undefined ? 0 : Math.random() * .12)) && d > -20) {
            if (o.dec[c.lane] === undefined) o.dec[c.lane] = Math.random() > F.fallaCpu;
            if (o.dec[c.lane] && c.suelo && c.golpe <= 0) {
              c.vy = F.v0; c.suelo = false; c.estado = "SALTO";
            }
            break;
          }
        }
      }

      // choque: AABB del cuerpo contra el obstáculo, con invulnerabilidad.
      // El obstáculo está pintado en los tres carriles: cada uno choca con el
      // suyo.
      const caja = { l: c.x - 17, r: c.x + 17, t: SUELO[c.lane] + c.y - 64, b: SUELO[c.lane] + c.y - 2 };
      const intangible = !c.cpu && c.kamui > 0;
      for (const o of obstaculos) {
        const w = o.w, h = o.h;
        const ox = o.x, oy = SUELO[c.lane] - h;
        if (ox > c.x + 90 || ox + w < c.x - 90) continue;
        if (c.invul > 0 || intangible) break;
        if (!c.cpu && o.quemado) continue;      // el amaterasu lo quemó en tu carril
        if (caja.l < ox + w - 8 && caja.r > ox + 8 && caja.t < oy + h && caja.b > oy + 6) {
          golpear(c);
          break;
        }
      }
      // jutsus de los cpu contra el jugador
      if (!c.cpu && !intangible && c.invul <= 0) {
        const cy = SUELO[c.lane] - 30;
        for (const j of jutsus) {
          if (j.fuera) continue;
          if (Math.abs(j.x - c.x) < 24 && cy > caja.t - 8 && cy < caja.b + 8) {
            j.fuera = true;
            golpear(c, "¡JUTSU!");
            break;
          }
        }
      }

      // obstáculo esquivado: sumó y pasó de largo
      for (const o of obstaculos) {
        if (!o.marcado.has(c.lane) && o.x + o.w < c.x - 20) {
          o.marcado.add(c.lane);
          c.esquivadas++;
          if (!c.cpu) c.chakra = Math.min(CHAKRA.max, c.chakra + CHAKRA.porEsquivada);
        }
      }
    }

    for (const f of fuegos) {
      for (const o of obstaculos) {
        if (!o.quemado && o.x < f.x + 20 && o.x + o.w > f.x - 20) { o.quemado = true; f.vida = Math.min(f.vida, .25); chispasEn(o.x + o.w / 2, 2, 16, "#ff5a1f"); }
      }
      for (const j of jutsus) {
        if (!j.fuera && Math.abs(j.x - f.x) < 30) { j.fuera = true; chispasEn(j.x, 2, 10, "#ff5a1f"); }
      }
    }
    fuegos = fuegos.filter((f) => f.vida > 0);
    jutsus = jutsus.filter((j) => !j.fuera && j.x > camX - 80);
    estelas = estelas.filter((e) => e.vida > 0);

    camX = Math.max(0, ritmo - AN * .28);   // la cámara sigue al pelotón: tú te mueves por la pista
    for (const p of polvo) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.vida -= dt; }
    polvo = polvo.filter((p) => p.vida > 0);
    for (const o of onos) o.t += dt;
    onos = onos.filter((o) => o.t < (o.grande ? 2.2 : .9));
    if (sacudida > 0) sacudida -= dt;
    if (destello > 0) destello -= dt;
    if (Math.random() < dt * 1.6 && jugador && !jugador.ko) {
      lineas.push({ y: Math.random() * AL, x: AN, vida: .5 });
    }
    for (const l of lineas) { l.x -= vel * 1.6 * dt; l.vida -= dt; }
    lineas = lineas.filter((l) => l.vida > 0 && l.x > -300);

    // los cpu hablan cuando van bien o cuando la vuelven a comer
    if (Math.random() < dt * .5) {
      const candidatos = r.filter((c) => c.cpu && !c.ko && c.burbujaT <= 0);
      if (candidatos.length) globo(candidatos[Math.floor(Math.random() * candidatos.length)]);
    }

    // latido al servidor cada 3 s: la carrera sigue viva y el panel del instructor ve tu puntaje
    if (t * 1000 - ultimoTick > 3000) {
      ultimoTick = t * 1000;
      onCuenta && onCuenta({ tiempo_ms: Math.round(t * 1000), puntaje: puntaje(jugador) });
    }

    if (red) {
      // tu estado a la mesa unas 10 veces por segundo (cada 0,5 s si ya caíste: solo miras)
      if (red.onEstado && t - ultimoEnvio > (jugador.ko ? .5 : .1)) {
        ultimoEnvio = t;
        red.onEstado({ dx: Math.round(jugador.x - ritmo), y: Math.round(jugador.y), estado: jugador.estado,
          vidas: Math.max(0, jugador.vidas), ko: jugador.ko, kamui: jugador.kamui > 0, invul: jugador.invul > 0,
          puntos: puntaje(jugador), esq: jugador.esquivadas, ms: Math.round(t * 1000) });
      }
      // al caer (o al tope) mandas tu resultado una vez y sigues mirando a tu mesa hasta que acabe la ronda
      if (!finEnviado && (jugador.ko || t * 1000 >= tope)) { finEnviado = true; terminar(true); }
      if (t * 1000 >= tope + 400) fase = "fin";
      pintarHUD();
      return;
    }
    const acabados = jugador.ko || t * 1000 >= tope;
    if (acabados) {
      finT += dt;
      if (finT > (jugador.ko ? 1.1 : .3)) terminar();
    }
    pintarHUD();
  }

  // Rival humano: se acerca con suavidad a lo último que mandó (unos 10 datos por segundo).
  function seguirRemoto(c, dt) {
    if (c.objX === null) return;
    const k = Math.min(1, dt * 10);
    c.x += (ritmo + c.objX - c.x) * k;
    c.y += (c.objY - c.y) * Math.min(1, dt * 16);
    c.frame += dt * (c.ko ? 0 : 12);
    if (c.burbujaT > 0) c.burbujaT -= dt;
  }
  // Lo que manda el servidor de cada rival humano: [{lane, dx, y, estado, vidas, ko, kamui, invul, puntos}].
  function rivales(lista) {
    for (const d of lista || []) {
      const c = r.find((x) => x.lane === d.lane && x.remoto);
      if (!c) continue;
      if (c.objX === null) c.x = ritmo + (+d.dx || 0);
      c.objX = Math.max(-F.detras - 40, Math.min(F.delante + 40, +d.dx || 0));
      c.objY = Math.min(0, +d.y || 0);
      const antes = c.vidas;
      c.vidas = Math.max(0, Math.min(F.vidas, d.vidas | 0));
      if (c.vidas < antes) { chispas(c, 10, "#ffd633"); pon("colision", .3); }
      c.ko = !!d.ko;
      c.estado = c.ko ? "KO" : ["RUN", "SALTO", "HIT"].includes(d.estado) ? d.estado : "RUN";
      c.vy = c.estado === "SALTO" ? F.v0 * .5 : 0;
      c.kamui = d.kamui ? .2 : 0;
      c.invul = d.invul ? .2 : 0;
      c.puntos = d.puntos | 0;
    }
  }

  function terminar(mirando = false) {
    if (!mirando) fase = "fin";
    const cpu = r.filter((c) => c.cpu).map(puntaje);
    const miPuntaje = puntaje(jugador);
    let puesto = 1;
    for (const o of r) if (o !== jugador && puntaje(o) > miPuntaje) puesto++;
    onFin({
      carrera: carreraId,
      tiempo_ms: Math.round(Math.min(t * 1000, tope)),
      esquivadas: jugador.esquivadas,
      vidas: Math.max(0, jugador.vidas),
      puesto,
      cpu,
      puntaje: miPuntaje,
      mejor: Math.max(miPuntaje, mejorLocal),
    });
  }

  // ---------- dibujo ----------
  function fondo() {
    if (!imgFondo) {
      ctx.fillStyle = "#16264a";
      ctx.fillRect(0, 0, AN, AL);
      return;
    }
    // La pista avanza: salida, tramo del medio repetido en espejo y meta, arena
    // tras arena, cada una con su luz (fondos ya teñidos al cargar).
    const v0 = camX, v1 = camX + AN;
    const tramo = (fuente, sx, sAncho, wx, wAncho) =>
      ctx.drawImage(fuente, sx, 0, sAncho, BG.al, Math.floor(wx - camX), 0, Math.ceil(wAncho) + 1, AL);
    const M = (BG.meta - BG.salida) * KF;
    for (const a of ARENAS) {
      if (a.x1 < v0 || a.x0 > v1) continue;
      const f = fondos[a.i % fondos.length] || { normal: imgFondo, espejo: imgFondo };
      tramo(f.normal, 0, BG.salida, a.x0, BG.salida * KF);
      let k = Math.max(0, Math.floor((v0 - a.x0 - BG.salida * KF) / M));
      for (let x = a.x0 + BG.salida * KF + k * M; x < a.meta && x < v1; x += M, k++) {
        const w = Math.min(M, a.meta - x);
        if (k % 2) tramo(f.espejo, 0, w / KF, x, w);
        else tramo(f.normal, BG.salida, w / KF, x, w);
      }
      tramo(f.normal, BG.meta, BG.an - BG.meta, a.meta, (BG.an - BG.meta) * KF);
    }
  }

  // Tres luces de arena (día, atardecer, noche) y el tramo del medio en espejo.
  function prepararFondos() {
    const luces = ["none", "hue-rotate(-28deg) saturate(1.3) brightness(.96)", "hue-rotate(200deg) saturate(.75) brightness(.62)"];
    fondos = luces.map((filtro) => {
      const normal = document.createElement("canvas");
      normal.width = BG.an; normal.height = BG.al;
      const n = normal.getContext("2d");
      n.filter = filtro; n.drawImage(imgFondo, 0, 0);
      const espejo = document.createElement("canvas");
      espejo.width = BG.meta - BG.salida; espejo.height = BG.al;
      const e = espejo.getContext("2d");
      e.translate(espejo.width, 0); e.scale(-1, 1);
      e.drawImage(normal, BG.salida, 0, espejo.width, BG.al, 0, 0, espejo.width, BG.al);
      return { normal, espejo };
    });
  }

  function rotulosCarriles() {
    for (let i = 0; i < 3; i++) {
      const c = r.find((x) => x.lane === i);
      if (!c) continue;
      const y = SUELO[i] - 7;
      const texto = `${c.nombre}${c.ko ? " · ¡KO!" : ""}`;
      ctx.save();
      ctx.font = "900 14px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(20,17,15,.9)";
      ctx.strokeText(texto, 118, y);
      ctx.fillStyle = c.lane === 2 ? "#fff2a8" : "#fff";
      ctx.fillText(texto, 118, y);
      ctx.textAlign = "right";
      const max = c.cpu ? F.vidasCpu : F.vidas;
      const corazones = "♥".repeat(Math.max(0, c.vidas)) + "♡".repeat(Math.max(0, max - c.vidas));
      ctx.strokeText(corazones, AN - 112, y);
      ctx.fillStyle = c.ko ? "#fff" : "#ff3b30";
      ctx.fillText(corazones, AN - 112, y);
      ctx.restore();
    }
  }

  function dibujarObstaculos() {
    for (const o of obstaculos) {
      const x = o.x - camX;
      if (x < -260 || x > AN + 60) continue;
      const im = obstImg[o.img];
      if (im) ctx.drawImage(im, x, SUELO[0] - o.h, o.w, o.h);
      // cada obstáculo se repite en los tres carriles: misma pista para todos
      for (let lane = 1; lane < 3; lane++) {
        if (lane === 2 && o.quemado) {         // ceniza: el amaterasu lo quemó
          ctx.fillStyle = "rgba(30,20,20,.55)";
          ctx.beginPath(); ctx.ellipse(x + o.w / 2, SUELO[lane] - 4, o.w / 2, 6, 0, 0, Math.PI * 2); ctx.fill();
          continue;
        }
        if (im) ctx.drawImage(im, x, SUELO[lane] - o.h, o.w, o.h);
      }
    }
  }

  function dibujarCorredor(c) {
    const im = c.hoja;
    const x = c.x - camX;
    const suelo = SUELO[c.lane] + c.y;
    const w = CELDA.an * ESC, h = CELDA.al * ESC;
    if (!im) return;
    let idx = 0;
    if (c.estado === "KO") idx = 17;
    else if (c.estado === "HIT") idx = 14 + (Math.floor(t * 10) % 4);
    else if (c.estado === "SALTO") idx = 8 + Math.min(5, Math.floor((Math.abs(c.vy) / Math.abs(F.v0)) * 5.5));
    else idx = Math.floor(c.frame) % 8;

    ctx.save();
    // Nunca hacemos parpadear con alpha: el ninja permanecía semitransparente
    // o parecía desaparecer al recibir un golpe. La invulnerabilidad ahora se
    // marca con un aro opaco, sin tocar la opacidad del sprite.
    if (c.invul > 0 && c.estado !== "KO") {
      ctx.beginPath();
      ctx.ellipse(x, suelo - 37, 31, 42, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffd633";
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (!c.cpu && c.kamui > 0 && c.estado !== "KO") {   // también el de un compañero de mesa
      ctx.save();
      ctx.translate(x, suelo - 37);
      ctx.rotate(t * 9);
      ctx.strokeStyle = "rgba(150,110,255,.85)";
      ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.arc(0, 0, 18 + k * 9, k * 2.1, k * 2.1 + 3.4); ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = .45;
    }
    if (c.estado === "KO") {
      // caído, de costado y con sombra: el final cómic del que se cayó 3 veces
      ctx.translate(x, suelo);
      ctx.rotate(-.38);
      ctx.translate(-x, -suelo);
    }
    ctx.drawImage(im, idx * CELDA.an, 0, CELDA.an, CELDA.al,
      x - w / 2, suelo - h + 6, w, h);
    ctx.restore();

    // globo de los cpu
    if (c.cpu && c.burbujaT > 0 && c.burbuja) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, c.burbujaT);
      ctx.font = "900 15px system-ui, sans-serif";
      const tw = ctx.measureText(c.burbuja).width + 18;
      const bx = Math.min(AN - tw - 8, Math.max(8, x - tw / 2));
      const by = suelo - h - 34;
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#14110f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, tw, 26, 10);
      else ctx.rect(bx, by, tw, 26);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#14110f";
      ctx.textAlign = "center";
      ctx.fillText(c.burbuja, bx + tw / 2, by + 18);
      ctx.restore();
    }
  }

  function pintar() {
    ctx.save();
    if (sacudida > 0) ctx.translate((Math.random() - .5) * 10, (Math.random() - .5) * 8);
    fondo();
    rotulosCarriles();
    dibujarObstaculos();

    // líneas de velocidad
    ctx.strokeStyle = "rgba(255,255,255,.5)";
    ctx.lineWidth = 3;
    for (const l of lineas) {
      ctx.globalAlpha = Math.max(0, Math.min(1, l.vida * 2));
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x + 130, l.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const p of polvo) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.vida * 1.7));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, SUELO[p.lane] + p.y, 3 + (0.55 - p.vida) * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // estelas: el lanzamiento del cpu hacia tu carril y el rastro del teletransporte
    for (const e of estelas) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, e.vida * 2.4);
      if (e.tipo === "lanza") {
        ctx.strokeStyle = "#ff7a00"; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(e.x0 - camX, SUELO[e.lane] - 40); ctx.lineTo(e.x1 - camX, SUELO[2] - 30); ctx.stroke();
      } else {
        ctx.strokeStyle = "#9fe7ff"; ctx.lineWidth = 10; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(e.x0 - camX, SUELO[2] - 34); ctx.lineTo(e.x1 - camX, SUELO[2] - 34); ctx.stroke();
      }
      ctx.restore();
    }
    // jutsus de los cpu: shurikens que giran a la altura del cuerpo
    for (const j of jutsus) {
      const x = j.x - camX, y = SUELO[2] - 30;
      ctx.save(); ctx.translate(x, y); ctx.rotate(j.giro);
      ctx.fillStyle = "#3a3f4a"; ctx.strokeStyle = "#14110f"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) { const rr = k % 2 ? 4 : 14, a = k * Math.PI / 4; ctx[k ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ff7a00"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // amaterasu: llamas oscuras que avanzan por tu carril
    for (const f of fuegos) {
      const x = f.x - camX, y = SUELO[2];
      for (let k = 0; k < 7; k++) {
        const fx = x - k * 9, h = 34 + Math.sin(t * 30 + k) * 8 - k * 3;
        ctx.fillStyle = k % 2 ? "rgba(20,10,14,.9)" : "rgba(170,20,40,.85)";
        ctx.beginPath(); ctx.moveTo(fx - 9, y - 2); ctx.quadraticCurveTo(fx - 4, y - h * .6, fx, y - h); ctx.quadraticCurveTo(fx + 4, y - h * .6, fx + 9, y - 2); ctx.fill();
      }
    }

    for (const c of r) dibujarCorredor(c);

    // onomatopeyas
    for (const o of onos) {
      if (o.grande) {                          // cartel de arena nueva
        if (o.t < 0) continue;
        ctx.save();
        ctx.globalAlpha = o.t < 1.7 ? 1 : 1 - (o.t - 1.7) / .5;
        ctx.translate(AN / 2, AL * .42);
        ctx.rotate(-.04);
        ctx.scale(1 + Math.max(0, .4 - o.t), 1 + Math.max(0, .4 - o.t));
        ctx.font = "900 78px 'Arial Black', system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.lineWidth = 12; ctx.strokeStyle = "#14110f";
        ctx.strokeText(o.texto, 0, 0); ctx.fillStyle = o.color; ctx.fillText(o.texto, 0, 0);
        ctx.restore();
        continue;
      }
      const k = o.t / .9;
      ctx.save();
      ctx.globalAlpha = k < .75 ? 1 : 1 - (k - .75) / .25;
      ctx.translate(o.x, SUELO[o.lane] - 74 - k * 40);
      ctx.rotate(o.rot);
      ctx.scale(1 + (1 - k) * .5, 1 + (1 - k) * .5);
      ctx.font = "900 46px 'Arial Black', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#14110f";
      ctx.strokeText(o.texto, 0, 0);
      ctx.fillStyle = o.color;
      ctx.fillText(o.texto, 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // barra de chakra y técnicas listas
    if (jugador) {
      const ch = jugador.chakra;
      ctx.save();
      ctx.fillStyle = "rgba(20,17,15,.78)"; ctx.fillRect(10, 8, 330, 44);
      ctx.fillStyle = "#2b2f3a"; ctx.fillRect(84, 14, 246, 12);
      ctx.fillStyle = ch >= CHAKRA.kamui ? "#4fa3ff" : "#2f6fb5"; ctx.fillRect(84, 14, 246 * ch / CHAKRA.max, 12);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.strokeRect(84, 14, 246, 12);
      ctx.font = "900 12px system-ui, sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "left";
      ctx.fillText("CHAKRA", 18, 25);
      const tec = [["␣␣ KAMUI", CHAKRA.kamui], ["P AMATERASU", CHAKRA.amaterasu], ["↓ ZUUM", CHAKRA.tele]];
      let tx = 18;
      for (const [nom, costo] of tec) {
        ctx.fillStyle = ch >= costo ? "#ffd633" : "#6c6459";
        ctx.fillText(`${nom} ${costo}`, tx, 45); tx += ctx.measureText(`${nom} ${costo}`).width + 14;
      }
      ctx.restore();
    }

    if (destello > 0) {
      ctx.fillStyle = `rgba(255,59,48,${destello * 1.6})`;
      ctx.fillRect(0, 0, AN, AL);
    }

    // cuenta regresiva
    if (fase === "cuenta") {
      ctx.fillStyle = "rgba(20,17,15,.55)";
      ctx.fillRect(0, 0, AN, AL);
      ctx.save();
      ctx.translate(AN / 2, AL / 2);
      ctx.rotate(-.05);
      ctx.textAlign = "center";
      ctx.font = "900 120px 'Arial Black', system-ui, sans-serif";
      const txt = cuenta > .35 ? String(Math.ceil(cuenta - .2)) : "¡YA!";
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#14110f";
      ctx.strokeText(txt, 0, 40);
      ctx.fillStyle = "#ffd633";
      ctx.fillText(txt, 0, 40);
      ctx.restore();
    }
    if (fase === "fin") {
      ctx.fillStyle = "rgba(20,17,15,.45)";
      ctx.fillRect(0, 0, AN, AL);
    }
  }

  // ---------- bucle ----------
  let previo = 0;
  function bucle(ahora) {
    const dt = Math.min(.05, (ahora - previo) / 1000 || 0);
    previo = ahora;
    if (fase === "cuenta") {
      cuenta = red && red.salida ? (red.salida - Date.now()) / 1000 : cuenta - dt;
      onCuenta && onCuenta({ cuenta: Math.max(0, cuenta) });
      if (cuenta <= 0) {
        fase = "corre";
        pon("salida", 1);
        // llegaste tarde a la salida común: entras con la carrera en marcha, en el mismo punto que tu mesa
        const tarde = red && red.salida ? (Date.now() - red.salida) / 1000 : 0;
        if (tarde > .25) {
          t = tarde; ritmo = 230 + distancia(tarde); camX = Math.max(0, ritmo - AN * .28);
          proxJutsu = Math.max(proxJutsu, t + 6);
          for (const c of r) c.x = ritmo;
          for (const o of obstaculos) if (o.x < ritmo + 120) { o.marcado.add(0); o.marcado.add(1); o.marcado.add(2); }
        }
      }
    } else if (fase === "corre") {
      paso(dt);
    } else if (fase === "fin") {
      for (const c of r) c.frame += dt * 6;
    }
    pintar();
    if (fase !== "muerto") requestAnimationFrame(bucle);
  }

  let carreraId = 0, mejorLocal = 0, finEnviado = false, ultimoEnvio = -9;
  async function arrancar(idCarrera) {
    carreraId = idCarrera;
    // KAGE (carril 1), YUKI (carril 2) y tú (carril 3); todo en paralelo y con avance a la vista
    const total = 1 + IMAGENES.hojas.length + IMAGENES.obstaculos.length;
    let listas = 0;
    const contar = (pr) => pr.then((im) => { listas++; onCuenta && onCuenta({ cargando: `${listas}/${total}` }); return im; });
    onCuenta && onCuenta({ cargando: `0/${total}` });
    const [fondoIm, imgs, obst] = await Promise.all([
      contar(cargar(IMAGENES.fondo)),
      Promise.all(IMAGENES.hojas.map((src) => contar(cargar(src)))),
      Promise.all(IMAGENES.obstaculos.map((n) => contar(cargar(rutaObst(n))))),
    ]);
    imgFondo = fondoIm;
    if (!imgFondo) throw new Error("No cargó el fondo Ninja Race. Recarga la página.");
    if (imgs.some((im) => !im)) throw new Error("No cargaron los ninjas. Recarga la página.");
    IMAGENES.obstaculos.forEach((n, k) => { obstImg[n] = obst[k]; });
    prepararFondos();
    for (const n of ["salto", "aterrizaje", "colision", "salida", "cuenta_regresiva", "meta", "checkpoint"]) {
      try { sonidos[n] = new Audio(base + `static/audio/${n}.wav`); sonidos[n].preload = "auto"; } catch (_) { /* sin audio */ }
    }
    if (!red || !red.salida || red.salida - Date.now() > 1500) pon("cuenta_regresiva", .8);
    const riv = red && red.rivales ? red.rivales : [];
    r = [0, 1].map((k) => riv[k] && riv[k].humano
      ? corredor(String(riv[k].nombre || "RIVAL").toUpperCase().slice(0, 16), imgs[k], k, false, true)
      : corredor(riv[k] && riv[k].nombre ? riv[k].nombre : NOMBRES_CPU[k], imgs[k], k, true));
    r.push(corredor("TÚ", imgs[2], 2, false));
    if (red && red.salida) cuenta = Math.max(0, (red.salida - Date.now()) / 1000);
    jugador = r[2];
    mejorLocal = cfg.record || 0;
    obstaculos = pista();
    for (const o of obstaculos) {
      const im = obstImg[o.img];
      const ancho0 = im ? im.width : 200;
      o.w = ancho0 * o.esc;
      o.h = (im ? im.height : 120) * o.esc;
      o.lane = 0;
    }
    previo = performance.now();
    requestAnimationFrame(bucle);
    pintarHUD();
  }

  function cancelar() {
    fase = "muerto";
    removeEventListener("keydown", onKey);
    removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("pointerdown", alTocar);
  }

  return { arrancar, cancelar, saltar: espacio, mover, jutsu, rivales, get fase() { return fase; } };
}
