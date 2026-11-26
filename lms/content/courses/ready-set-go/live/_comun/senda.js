/* Ready Set Go · Clase 2 · «Senda»: motor de las láminas de pathfinding (window.SENDA).
 *
 * Idea: la lámina no cambia de diapositiva. Hay UN mundo (una cuadrícula que no termina) y una
 * cámara. Cada paso solo mueve números: cámara, alto de las paredes, avance de la ola, avance del
 * camino, opacidad de los números… GSAP los anima y el lienzo se redibuja en cada cuadro.
 * Como todo es un número, «Anterior» es solo animar hacia atrás: no hay estados rotos.
 *
 *   SENDA.Mundo(filas)               mapa de texto → cuadrícula ('#' pared, '.' piso, '~' barro, letras = marcas)
 *   SENDA.buscar(m, a, b, op)        bfs | dijkstra | astar | greedy, paso a paso (orden de revisión)
 *   SENDA.Vista(canvas)              cámara + capas de dibujo
 *   SENDA.escena({...})              pasos, relato, controles, herramientas para tocar el mapa
 *
 * Reglas (las mismas de teoria-animada): cada paso termina quieto; nada infinito en las líneas de
 * tiempo; sin GSAP todo queda visible y estático; «reducir movimiento» = duraciones 0.
 */
(function () {
  "use strict";
  var G = window.gsap || null;
  var quieto = false;
  try { quieto = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  try { var tq = new URLSearchParams(location.search).get("tema"); if (tq === "dark" || tq === "light") document.documentElement.setAttribute("data-tema", tq); } catch (e) {}

  var SQ2 = Math.SQRT2;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ───────────────────────── Mundo ───────────────────────── */
  var TIPOS = { "#": 1, ".": 0, " ": 0, "~": 2, "w": 3, "*": 4 }; // 4 = luz (antorcha)
  function Mundo(filas) {
    if (!(this instanceof Mundo)) return new Mundo(filas);
    this.h = filas.length; this.w = 0;
    for (var r = 0; r < filas.length; r++) this.w = Math.max(this.w, filas[r].length);
    this.t = new Uint8Array(this.w * this.h);
    this.marcas = {};
    this.costos = { 0: 1, 2: 5, 3: 9, 4: 1 };
    this.dir = {}; // celda → lista de vecinos desde donde SÍ se puede entrar (flechas de un sentido)
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) {
      var c = filas[y][x] || " ";
      if (c in TIPOS) this.t[y * this.w + x] = TIPOS[c];
      else { this.t[y * this.w + x] = 0; (this.marcas[c] = this.marcas[c] || []).push([x, y]); }
    }
    this.version = 0;
  }
  Mundo.prototype = {
    i: function (x, y) { return y * this.w + x; },
    x: function (i) { return i % this.w; },
    y: function (i) { return (i / this.w) | 0; },
    en: function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; },
    tipo: function (i) { return this.t[i]; },
    pared: function (i) { return this.t[i] === 1; },
    poner: function (i, tipo) { if (this.t[i] !== tipo) { this.t[i] = tipo; this.version++; return true; } return false; },
    costo: function (i) { var c = this.costos[this.t[i]]; return c == null ? 1 : c; },
    marca: function (k) { var m = this.marcas[k]; return m ? m[0] : null; },
    celda: function (k) { var m = this.marca(k); return m ? this.i(m[0], m[1]) : -1; },
    /* Vecinos caminables de i. op.diag: 8 vecinos; op.esquinas: permite cortar el canto de una pared. */
    vecinos: function (i, op) {
      var x = this.x(i), y = this.y(i), out = [], w = this.w, self = this;
      function ok(nx, ny) { return self.en(nx, ny) && self.t[ny * w + nx] !== 1; }
      var d4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      for (var k = 0; k < 4; k++) { var nx = x + d4[k][0], ny = y + d4[k][1]; if (ok(nx, ny)) out.push(ny * w + nx); }
      if (op && op.diag) {
        var d8 = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
        for (k = 0; k < 4; k++) {
          var dx = d8[k][0], dy = d8[k][1];
          if (!ok(x + dx, y + dy)) continue;
          var a = ok(x + dx, y), b = ok(x, y + dy);
          if (op.esquinas ? (a || b) : (a && b)) out.push((y + dy) * w + x + dx);
        }
      }
      var me = this;
      if (Object.keys(this.dir).length) out = out.filter(function (j) { var p = me.dir[j]; return !p || p.indexOf(i) >= 0; });
      return out;
    },
    copiar: function () { var m = Object.create(Mundo.prototype); m.w = this.w; m.h = this.h; m.t = new Uint8Array(this.t); m.marcas = JSON.parse(JSON.stringify(this.marcas)); m.costos = Object.assign({}, this.costos); m.dir = Object.assign({}, this.dir); m.version = 0; return m; },
    filas: function () { var out = []; for (var y = 0; y < this.h; y++) { var f = []; for (var x = 0; x < this.w; x++) f.push(this.t[y * this.w + x]); out.push(f); } return out; }
  };

  /* ───────────────────────── Búsquedas ───────────────────────── */
  function Monton() { this.a = []; }
  Monton.prototype = {
    push: function (v, p, s) { var a = this.a; a.push([p, s, v]); var i = a.length - 1; while (i > 0) { var j = (i - 1) >> 1; if (menor(a[i], a[j])) { var t = a[i]; a[i] = a[j]; a[j] = t; i = j; } else break; } },
    pop: function () { var a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && menor(a[l], a[m])) m = l; if (r < a.length && menor(a[r], a[m])) m = r; if (m === i) break; var t = a[i]; a[i] = a[m]; a[m] = t; i = m; } } return top[2]; },
    get n() { return this.a.length; }
  };
  function menor(p, q) { return p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]); }

  function h(m, i, b, diag) {
    if (b < 0) return 0;
    var dx = Math.abs(m.x(i) - m.x(b)), dy = Math.abs(m.y(i) - m.y(b));
    return diag ? (dx + dy) + (SQ2 - 2) * Math.min(dx, dy) : dx + dy;
  }

  /* buscar(m, a, b, op): op.algo = "bfs" | "dijkstra" | "astar" | "greedy"; op.diag; op.esquinas;
     b = -1 recorre todo el mapa (una ola completa). a puede ser un arreglo de orígenes.
     Devuelve { orden, g, padre, camino, t (0..1 por celda para dibujar la ola), revisadas, costo }. */
  function buscar(m, a, b, op) {
    op = op || {}; var algo = op.algo || "bfs", N = m.w * m.h;
    var g = new Float64Array(N).fill(Infinity), padre = new Int32Array(N).fill(-1), cerrado = new Uint8Array(N), orden = [];
    var origen = Array.isArray(a) ? a : [a];
    var uniforme = algo === "bfs";
    function paso(i, j) { var diag = m.x(i) !== m.x(j) && m.y(i) !== m.y(j); var base = diag ? SQ2 : 1; return uniforme ? base : base * (op.costo ? op.costo(j) : m.costo(j)); }
    if (algo === "bfs") {
      var cola = [], qi = 0;
      origen.forEach(function (o) { if (o >= 0) { g[o] = 0; cola.push(o); cerrado[o] = 1; } });
      while (qi < cola.length) {
        var i = cola[qi++]; orden.push(i);
        if (i === b) break;
        var vs = m.vecinos(i, op);
        for (var k = 0; k < vs.length; k++) { var j = vs[k]; if (!cerrado[j]) { cerrado[j] = 1; g[j] = g[i] + 1; padre[j] = i; cola.push(j); } }
      }
    } else {
      var H = new Monton(), sello = 0;
      origen.forEach(function (o) { if (o >= 0) { g[o] = 0; H.push(o, algo === "dijkstra" ? 0 : h(m, o, b, op.diag), sello++); } });
      while (H.n) {
        var i2 = H.pop(); if (cerrado[i2]) continue; cerrado[i2] = 1; orden.push(i2);
        if (i2 === b) break;
        var v2 = m.vecinos(i2, op);
        for (var k2 = 0; k2 < v2.length; k2++) {
          var j2 = v2[k2]; if (cerrado[j2]) continue;
          var ng = g[i2] + paso(i2, j2);
          if (algo === "greedy" ? padre[j2] === -1 && origen.indexOf(j2) < 0 : ng < g[j2]) {
            g[j2] = ng; padre[j2] = i2;
            var pr = algo === "dijkstra" ? ng : algo === "astar" ? ng + h(m, j2, b, op.diag) * (op.peso || 1) : h(m, j2, b, op.diag);
            H.push(j2, pr, sello++);
          }
        }
      }
    }
    var camino = null, costo = 0;
    if (b >= 0 && (padre[b] >= 0 || origen.indexOf(b) >= 0)) {
      camino = []; for (var c = b; c >= 0; c = padre[c]) camino.push(c); camino.reverse();
      for (var q = 1; q < camino.length; q++) costo += paso(camino[q - 1], camino[q]);
    }
    // t: cuándo aparece cada celda en la ola. Para bfs/dijkstra, por su g (anillos); para A*/voraz, por su turno.
    var t = new Float32Array(N).fill(-1);
    if (orden.length) {
      if (algo === "bfs" || algo === "dijkstra") {
        var gmax = 0; orden.forEach(function (i) { if (g[i] > gmax) gmax = g[i]; });
        orden.forEach(function (i) { t[i] = gmax ? g[i] / gmax : 0; });
      } else orden.forEach(function (i, n) { t[i] = orden.length > 1 ? n / (orden.length - 1) : 0; });
    }
    return { orden: orden, g: g, padre: padre, camino: camino, t: t, revisadas: orden.length, costo: costo, algo: algo };
  }

  /* Campo de flujo: cada celda apunta al vecino con menor g (de una ola completa). */
  function flujo(m, res, op) {
    var N = m.w * m.h, dir = new Int32Array(N).fill(-1);
    for (var i = 0; i < N; i++) {
      if (m.pared(i) || !isFinite(res.g[i])) continue;
      var best = res.g[i], bj = -1, vs = m.vecinos(i, op);
      for (var k = 0; k < vs.length; k++) if (res.g[vs[k]] < best - 1e-9) { best = res.g[vs[k]]; bj = vs[k]; }
      dir[i] = bj;
    }
    return dir;
  }

  /* ───────────────────────── Colores ───────────────────────── */
  var C = {};
  function hex(s) { s = (s || "").trim(); if (s[0] !== "#") return [128, 128, 128]; if (s.length === 4) s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]; return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]; }
  function leerColores() {
    var cs = getComputedStyle(document.documentElement);
    ["fondo", "tinta", "suave", "rejilla", "piso", "pared", "pared-lado", "barro", "agua", "luz", "heroe", "rival", "rival2", "rival3", "ola0", "ola1", "ola2", "camino", "acento"].forEach(function (k) { C[k] = cs.getPropertyValue("--" + k).trim(); });
    C.o0 = hex(C.ola0); C.o1 = hex(C.ola1); C.o2 = hex(C.ola2);
  }
  function calor(t, a) { // 0 = cerca (rojo) → 0.5 ámbar → 1 lejos (turquesa)
    var p, q, u; if (t < .5) { p = C.o0; q = C.o1; u = t * 2; } else { p = C.o1; q = C.o2; u = (t - .5) * 2; }
    return "rgba(" + (lerp(p[0], q[0], u) | 0) + "," + (lerp(p[1], q[1], u) | 0) + "," + (lerp(p[2], q[2], u) | 0) + "," + a + ")";
  }
  function rgba(col, a) { var c = hex(col); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  /* ───────────────────────── Vista (cámara + capas) ───────────────────────── */
  function Vista(canvas, marcoFn) {
    this.cv = canvas; this.cx = canvas.getContext("2d"); this.marcoFn = marcoFn || Vista.marcoLamina;
    this.resize(); var self = this;
    window.addEventListener("resize", function () { self.resize(); });
  }
  /* Dónde vive el mapa en la pantalla: a la derecha del texto (ancho) o arriba (móvil). */
  Vista.marcoLamina = function (W, H) {
    if (W <= 900 || W / H <= 1) return { x: 16, y: H * 0.19, w: W - 32, h: H * 0.33 };
    return { x: W * 0.36, y: H * 0.13, w: W * 0.615, h: H * 0.72 };
  };
  Vista.prototype = {
    resize: function () {
      var r = this.cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      this.W = Math.max(1, r.width); this.H = Math.max(1, r.height); this.d = d;
      this.cv.width = Math.round(this.W * d); this.cv.height = Math.round(this.H * d);
      this.marco = this.marcoFn(this.W, this.H);
    },
    /* Ajusta la cámara: S.cx, S.cy en celdas (centro), S.z multiplica el encuadre del mapa entero. */
    camara: function (m, S) {
      var f = Math.min(this.marco.w / m.w, this.marco.h / m.h) * 0.96;
      this.T = f * (S.z || 1);
      this.ox = this.marco.x + this.marco.w / 2 - (S.cx == null ? m.w / 2 : S.cx) * this.T;
      this.oy = this.marco.y + this.marco.h / 2 - (S.cy == null ? m.h / 2 : S.cy) * this.T;
    },
    px: function (x) { return this.ox + x * this.T; },
    py: function (y) { return this.oy + y * this.T; },
    celdaEn: function (m, sx, sy) { var x = Math.floor((sx - this.ox) / this.T), y = Math.floor((sy - this.oy) / this.T); return m.en(x, y) ? m.i(x, y) : -1; },
    limpiar: function () { var c = this.cx; c.setTransform(this.d, 0, 0, this.d, 0, 0); c.clearRect(0, 0, this.W, this.H); },
    /* El mapa puede crecer con la cámara, pero nunca tapa el texto ni los botones. */
    recortar: function () {
      var c = this.cx, M = this.marco, W = this.W, H = this.H; c.save(); c.beginPath();
      if (W <= 900 || W / H <= 1) c.rect(0, M.y - 10, W, M.h + 20); else c.rect(M.x - W * .015, 0, W, H * .87);
      c.clip();
    },
    soltar: function () { this.cx.restore(); },
    /* La cuadrícula infinita del fondo: se mueve con la cámara, así el mundo no tiene bordes. */
    rejilla: function (a) {
      if (a <= 0) return; var c = this.cx, T = this.T; if (T < 6) return;
      c.save(); c.globalAlpha = a; c.strokeStyle = C.rejilla; c.lineWidth = 1; c.beginPath();
      var x0 = this.ox % T, y0 = this.oy % T;
      for (var x = x0; x < this.W; x += T) { c.moveTo(Math.round(x) + .5, 0); c.lineTo(Math.round(x) + .5, this.H); }
      for (var y = y0; y < this.H; y += T) { c.moveTo(0, Math.round(y) + .5); c.lineTo(this.W, Math.round(y) + .5); }
      c.stroke(); c.restore();
    },
    /* Piso: baldosas que, con S.grafo → 1, se encogen hasta ser nodos. */
    piso: function (m, a, grafo, revela) {
      if (a <= 0) return; var c = this.cx, T = this.T, g = grafo || 0;
      c.save(); c.globalAlpha = a;
      for (var i = 0; i < m.t.length; i++) {
        if (m.t[i] === 1) continue;
        var x = m.x(i), y = m.y(i), r = revela == null ? 1 : clamp((revela * (m.w + m.h + 3) - (x + y)) / 3, 0, 1); if (r <= 0) continue;
        var s = T * lerp(0.92, 0.26, g) * r, cx = this.px(x + .5), cy = this.py(y + .5);
        var tipo = m.t[i];
        c.fillStyle = g > .5 ? C.tinta : tipo === 2 ? C.barro : tipo === 3 ? C.agua : C.piso;
        rr(c, cx - s / 2, cy - s / 2, s, s, lerp(T * 0.12, s / 2, g)); c.fill();
        if (tipo === 2 && g < .5) { // grumos de barro
          c.fillStyle = "rgba(0,0,0,.18)";
          for (var k = 0; k < 3; k++) { var ax = ((x * 7 + k * 13) % 10) / 10 - .5, ay = ((y * 11 + k * 5) % 10) / 10 - .5; c.beginPath(); c.arc(cx + ax * s * .6, cy + ay * s * .6, s * .07, 0, 7); c.fill(); }
        }
        if (tipo === 4 && g < .5) { c.fillStyle = C.luz; c.beginPath(); c.arc(cx, cy, s * .22, 0, 7); c.fill(); }
      }
      c.restore();
    },
    /* Paredes con volumen: S.alto 0 → planas, 1 → bloques que se levantan. */
    paredes: function (m, a, alto, revela) {
      if (a <= 0) return; var c = this.cx, T = this.T, L = T * 0.24 * (alto == null ? 1 : alto);
      c.save(); c.globalAlpha = a;
      for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) {
        var i = y * m.w + x; if (m.t[i] !== 1) continue;
        var r = revela == null ? 1 : clamp((revela * (m.w + m.h + 3) - (x + y)) / 3, 0, 1); if (r <= 0) continue;
        var sx = this.px(x), sy = this.py(y), l = L * r;
        var abajoPared = y + 1 < m.h && m.t[i + m.w] === 1;
        if (!abajoPared) { c.fillStyle = C["pared-lado"]; c.fillRect(sx, sy + T - l, T + .5, l + .5); }
        c.fillStyle = C.pared; c.fillRect(sx, sy - l, T + .5, T + .5);
      }
      c.restore();
    },
    /* Aristas del grafo (con diagonales si op.diag). */
    aristas: function (m, a, op) {
      if (a <= 0) return; var c = this.cx, T = this.T;
      c.save(); c.globalAlpha = a; c.strokeStyle = C.tinta; c.lineWidth = Math.max(1, T * 0.05); c.beginPath();
      for (var i = 0; i < m.t.length; i++) {
        if (m.t[i] === 1) continue;
        var vs = m.vecinos(i, op);
        for (var k = 0; k < vs.length; k++) { var j = vs[k]; if (j < i) continue; c.moveTo(this.px(m.x(i) + .5), this.py(m.y(i) + .5)); c.lineTo(this.px(m.x(j) + .5), this.py(m.y(j) + .5)); }
      }
      c.stroke(); c.restore();
    },
    /* Números por celda: fn(i) → texto o null. */
    numeros: function (m, a, fn, color) {
      if (a <= 0) return; var c = this.cx, T = this.T; if (T < 12) return;
      c.save(); c.globalAlpha = a; c.font = "700 " + Math.round(T * 0.36) + "px ui-monospace, Menlo, Consolas, monospace"; c.textAlign = "center"; c.textBaseline = "middle";
      for (var i = 0; i < m.t.length; i++) { var s = fn(i); if (s == null) continue; c.fillStyle = typeof color === "function" ? color(i) : color || C.tinta; c.fillText(s, this.px(m.x(i) + .5), this.py(m.y(i) + .53)); }
      c.restore();
    },
    /* La ola: p ∈ [0,1]. Cada celda aparece cuando p pasa su t; el frente brilla. */
    ola: function (m, res, p, a) {
      if (!res || a <= 0 || p <= 0) return; var c = this.cx, T = this.T, ancho = 0.045;
      c.save();
      for (var n = 0; n < res.orden.length; n++) {
        var i = res.orden[n], t = res.t[i]; if (t < 0 || t > p) continue;
        var e = clamp((p - t) / ancho, 0, 1), frente = p >= .999 ? 0 : 1 - e;
        var s = T * (0.94 - 0.25 * frente), cx = this.px(m.x(i) + .5), cy = this.py(m.y(i) + .5);
        c.globalAlpha = a * (0.72 + 0.28 * frente);
        c.fillStyle = calor(t, 1); rr(c, cx - s / 2, cy - s / 2, s, s, T * .14); c.fill();
        if (frente > .05) { c.globalAlpha = a * frente; c.strokeStyle = C.tinta; c.lineWidth = Math.max(1.5, T * .06); c.stroke(); }
      }
      c.restore();
    },
    /* Migas: flecha corta de cada celda hacia su padre. */
    migas: function (m, res, a, p) {
      if (!res || a <= 0) return; var c = this.cx, T = this.T; p = p == null ? 1 : p;
      c.save(); c.globalAlpha = a; c.strokeStyle = C.tinta; c.lineWidth = Math.max(1.2, T * .055); c.lineCap = "round";
      for (var n = 0; n < res.orden.length; n++) {
        var i = res.orden[n], pj = res.padre[i]; if (pj < 0 || res.t[i] > p) continue;
        var x = m.x(i) + .5, y = m.y(i) + .5, dx = m.x(pj) - m.x(i), dy = m.y(pj) - m.y(i), L = Math.hypot(dx, dy); dx /= L; dy /= L;
        var x1 = this.px(x - dx * .18), y1 = this.py(y - dy * .18), x2 = this.px(x + dx * .3), y2 = this.py(y + dy * .3);
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
        var hx = -dy, hy = dx, k = T * .12;
        c.moveTo(x2 - dx * k + hx * k * .8, y2 - dy * k + hy * k * .8); c.lineTo(x2, y2); c.lineTo(x2 - dx * k - hx * k * .8, y2 - dy * k - hy * k * .8);
        c.stroke();
      }
      c.restore();
    },
    /* Flechas del campo de flujo. */
    flechas: function (m, dir, a) {
      if (!dir || a <= 0) return; var c = this.cx, T = this.T;
      c.save(); c.globalAlpha = a; c.strokeStyle = C.tinta; c.lineWidth = Math.max(1.2, T * .06); c.lineCap = "round"; c.lineJoin = "round";
      for (var i = 0; i < dir.length; i++) {
        var j = dir[i]; if (j < 0) continue;
        var x = m.x(i) + .5, y = m.y(i) + .5, dx = m.x(j) - m.x(i), dy = m.y(j) - m.y(i), L = Math.hypot(dx, dy); dx /= L; dy /= L;
        var x1 = this.px(x - dx * .26), y1 = this.py(y - dy * .26), x2 = this.px(x + dx * .26), y2 = this.py(y + dy * .26), k = T * .14, hx = -dy, hy = dx;
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
        c.moveTo(x2 - dx * k + hx * k * .75, y2 - dy * k + hy * k * .75); c.lineTo(x2, y2); c.lineTo(x2 - dx * k - hx * k * .75, y2 - dy * k - hy * k * .75); c.stroke();
      }
      c.restore();
    },
    /* Camino: polilínea por los centros, dibujada hasta la fracción p, con una cabeza que brilla. */
    camino: function (m, celdas, p, color, ancho, desfase) {
      if (!celdas || celdas.length < 2 || p <= 0) return; var c = this.cx, T = this.T;
      var pts = celdas.map(function (i) { return [m.x(i) + .5, m.y(i) + .5]; });
      var seg = [], tot = 0; for (var k = 1; k < pts.length; k++) { var d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(d); tot += d; }
      var meta = tot * clamp(p, 0, 1), o = (desfase || 0) * T;
      c.save(); c.strokeStyle = color || C.camino; c.lineWidth = T * (ancho || .2); c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(this.px(pts[0][0]) + o, this.py(pts[0][1]) + o);
      var hx = pts[0][0], hy = pts[0][1];
      for (k = 1; k < pts.length; k++) {
        if (meta <= 0) break;
        var u = Math.min(1, meta / seg[k - 1]);
        hx = lerp(pts[k - 1][0], pts[k][0], u); hy = lerp(pts[k - 1][1], pts[k][1], u);
        c.lineTo(this.px(hx) + o, this.py(hy) + o); meta -= seg[k - 1];
      }
      c.stroke();
      if (p < 1) { c.fillStyle = color || C.camino; c.beginPath(); c.arc(this.px(hx) + o, this.py(hy) + o, T * .26, 0, 7); c.fill(); }
      c.restore();
    },
    /* Personajes propios: Cubito (héroe) y los bichos (rivales). x, y en celdas (centro = +.5). */
    heroe: function (x, y, a, mira, t) {
      if (a <= 0) return; var c = this.cx, T = this.T, s = T * .78, b = Math.sin((t || 0) * 5) * T * .03;
      var cx = this.px(x + .5), cy = this.py(y + .5) + b;
      c.save(); c.globalAlpha = a;
      c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(cx, this.py(y + .5) + s * .5, s * .42, s * .1, 0, 0, 7); c.fill();
      c.fillStyle = C.heroe; c.strokeStyle = C.tinta; c.lineWidth = Math.max(1.5, T * .06); rr(c, cx - s / 2, cy - s / 2, s, s, s * .26); c.fill(); c.stroke();
      ojos(c, cx, cy - s * .06, s, mira); c.restore();
    },
    bicho: function (x, y, a, color, mira, t, fase) {
      if (a <= 0) return; var c = this.cx, T = this.T, r = T * .38, f = (t || 0) * 6 + (fase || 0), b = Math.sin(f) * T * .035;
      var cx = this.px(x + .5), cy = this.py(y + .5) + b;
      c.save(); c.globalAlpha = a;
      c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(cx, this.py(y + .5) + r * 1.05, r * .9, r * .2, 0, 0, 7); c.fill();
      c.strokeStyle = C.tinta; c.lineWidth = Math.max(1.5, T * .06); c.lineCap = "round";
      for (var k = -1; k <= 1; k += 2) { // antenas
        var ax = cx + k * r * .45, ay = cy - r * .8, tx = cx + k * r * (.75 + Math.sin(f + k) * .08), ty = cy - r * 1.45;
        c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(cx + k * r * .9, cy - r * 1.1, tx, ty); c.stroke();
        c.fillStyle = color || C.rival; c.beginPath(); c.arc(tx, ty, r * .16, 0, 7); c.fill(); c.stroke();
      }
      c.fillStyle = color || C.rival; c.beginPath(); c.ellipse(cx, cy, r, r * .9, 0, 0, 7); c.fill(); c.stroke();
      for (k = -1; k <= 1; k += 2) { c.beginPath(); c.moveTo(cx + k * r * .55, cy + r * .75); c.lineTo(cx + k * r * .75, cy + r * 1.05); c.stroke(); } // patitas
      ojos(c, cx, cy - r * .08, r * 1.7, mira); c.restore();
    },
    anillo: function (x, y, rad, a, color, grosor) {
      if (a <= 0) return; var c = this.cx; c.save(); c.globalAlpha = a; c.strokeStyle = color || C.acento; c.lineWidth = this.T * (grosor || .08);
      c.beginPath(); c.arc(this.px(x + .5), this.py(y + .5), Math.max(0, rad * this.T), 0, 7); c.stroke(); c.restore();
    },
    marcoCelda: function (i, m, a, color) {
      if (a <= 0 || i < 0) return; var c = this.cx, T = this.T; c.save(); c.globalAlpha = a; c.strokeStyle = color || C.acento; c.lineWidth = T * .09;
      rr(c, this.px(m.x(i)) + T * .04, this.py(m.y(i)) + T * .04, T * .92, T * .92, T * .16); c.stroke(); c.restore();
    }
  };
  function ojos(c, cx, cy, s, mira) {
    var dx = 0, dy = 0; if (mira) { var L = Math.hypot(mira[0], mira[1]) || 1; dx = mira[0] / L; dy = mira[1] / L; }
    for (var k = -1; k <= 1; k += 2) {
      var ex = cx + k * s * .17, ey = cy; c.fillStyle = "#fff"; c.beginPath(); c.ellipse(ex, ey, s * .12, s * .14, 0, 0, 7); c.fill();
      c.fillStyle = "#14161B"; c.beginPath(); c.arc(ex + dx * s * .05, ey + dy * s * .05, s * .06, 0, 7); c.fill();
    }
  }
  function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ───────────────────────── GSAP o respaldo ───────────────────────── */
  function quitarOpciones(v) { var o = {}; for (var k in v) if (["duration", "ease", "delay", "onComplete", "onUpdate", "stagger", "overwrite"].indexOf(k) < 0) o[k] = v[k]; return o; }
  var ticker = [];
  function cadaCuadro(fn) { ticker.push(fn); }
  (function bucle() { var t = performance.now() / 1000; for (var k = 0; k < ticker.length; k++) ticker[k](t); requestAnimationFrame(bucle); })();

  /* Texto partido en palabras para animarlo. */
  function palabras(el) {
    if (el.dataset.partido) return $$(".w", el);
    var out = [];
    (function rec(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (p) { if (!p) return; if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; } var s = document.createElement("span"); s.className = "w"; s.textContent = p; frag.appendChild(s); out.push(s); });
          n.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && !/^(CODE|B|EM|STRONG|SPAN)$/.test(ch.tagName)) rec(ch);
        else if (ch.nodeType === 1) { ch.classList.add("w"); out.push(ch); }
      });
    })(el);
    el.dataset.partido = "1"; return out;
  }

  /* ───────────────────────── Escena con pasos ───────────────────────── */
  /* cfg = {
       mapas: { base: [...filas], ... }       los mundos; se editan y se conservan al navegar
       S: { ...números iniciales }            cámara (cx, cy, z), alfas de capas, avances (ola, camino…)
       pasos: [{ s: {...}, fijar(D, api), anim(tl, S, api), toca: ["pared","borrar","barro","heroe","rival"], dur }]
       dibujar(v, S, D, api, t)               dibuja el cuadro (usa las capas de la Vista)
       alEditar(D, api)                       recalcula tras tocar el mapa
       textoFin
     } */
  function escena(cfg) {
    var cv = $("#sd-lienzo"), v = new Vista(cv), items = $$(".sd-relato > li"), n = cfg.pasos.length;
    if (items.length !== n) console.warn("SENDA: " + items.length + " <li> y " + n + " pasos");
    leerColores();
    try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", leerColores); } catch (e) {}
    var mundos = {}; Object.keys(cfg.mapas).forEach(function (k) { mundos[k] = new Mundo(cfg.mapas[k]); });
    var S = Object.assign({ cx: null, cy: null, z: 1, rejilla: 1, piso: 1, paredes: 1, alto: 1, revela: 1, ola: 0, camino: 0, numeros: 0, migas: 0, grafo: 0, aristas: 0, actores: 1, gig: 0, codigo: 0 }, cfg.S || {});
    var base = Object.assign({}, S);
    var D = { mapa: Object.keys(cfg.mapas)[0], herr: null, herrs: null };
    var api = {
      S: S, D: D, v: v, C: C, mundo: function (k) { return mundos[k || D.mapa]; }, buscar: buscar, flujo: flujo, quieto: quieto,
      dato: dato, gigante: gigante, codigo: codigo, replay: replay, paso: function () { return actual; }, calor: calor, rgba: rgba
    };
    if (S.cx == null) { var m0 = mundos[D.mapa]; S.cx = base.cx = m0.w / 2; S.cy = base.cy = m0.h / 2; }

    // Controles
    var pie = document.createElement("nav"); pie.className = "sd-pie"; pie.setAttribute("aria-label", "Pasos");
    pie.innerHTML = '<span class="sd-num" aria-live="polite"></span><div class="sd-senda"></div><button class="sd-btn" type="button" data-ir="-1">‹ Anterior</button><button class="sd-btn pri" type="button" data-ir="1">Siguiente ›</button>';
    $(".sd").appendChild(pie);
    var senda = $(".sd-senda", pie), num = $(".sd-num", pie), bPrev = $('[data-ir="-1"]', pie), bNext = $('[data-ir="1"]', pie);
    for (var k = 0; k < n; k++) { var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Paso " + (k + 1)); b.dataset.p = k; senda.appendChild(b); }
    var marca = document.createElement("i"); marca.className = "sd-marca"; senda.appendChild(marca);
    pie.addEventListener("click", function (e) { var t = e.target.closest("button"); if (!t) return; if (t.dataset.ir) ir(actual + +t.dataset.ir); else if (t.dataset.p) ir(+t.dataset.p); });
    window.addEventListener("keydown", function (e) {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); ir(actual + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); ir(actual - 1); }
    });

    // Herramientas
    var herr = document.createElement("div"); herr.className = "sd-herr"; herr.hidden = true; herr.setAttribute("role", "toolbar"); herr.setAttribute("aria-label", "Herramientas para tocar el mapa"); $(".sd").appendChild(herr);
    var NOMBRES = { pared: "▦ Pared", borrar: "◻ Borrar", barro: "≋ Barro", heroe: "◆ Mover héroe", rival: "● Mover bicho", meta: "◎ Mover meta" };
    function pintarHerr(lista) {
      herr.innerHTML = ""; herr.hidden = !lista; if (!lista) return;
      lista.forEach(function (h) {
        if (typeof h === "object") { var x = document.createElement("button"); x.type = "button"; x.className = "sd-btn"; x.textContent = h.texto; x.addEventListener("click", function () { h.accion(api, x); }); if (h.pulsado) x.setAttribute("aria-pressed", h.pulsado(api) ? "true" : "false"); herr.appendChild(x); return; }
        var b = document.createElement("button"); b.type = "button"; b.className = "sd-btn"; b.textContent = NOMBRES[h] || h; b.dataset.h = h;
        b.setAttribute("aria-pressed", D.herr === h ? "true" : "false");
        b.addEventListener("click", function () { D.herr = h; $$("[data-h]", herr).forEach(function (o) { o.setAttribute("aria-pressed", o.dataset.h === h ? "true" : "false"); }); });
        herr.appendChild(b);
      });
    }
    api.refrescarHerr = function () { pintarHerr(D.herrs); };

    // Datos (contadores)
    var datos = document.createElement("div"); datos.className = "sd-datos"; $(".sd").appendChild(datos);
    var datosEl = {};
    function dato(id, etiqueta, valor, clase) {
      if (valor == null) { if (datosEl[id]) { datosEl[id].remove(); delete datosEl[id]; } return; }
      var el = datosEl[id];
      if (!el) { el = document.createElement("div"); el.className = "sd-dato " + (clase || ""); el.innerHTML = "<i></i><b></b>"; datos.appendChild(el); datosEl[id] = el; }
      $("i", el).textContent = etiqueta; var bb = $("b", el); if (bb.textContent !== String(valor)) bb.textContent = valor;
    }
    api.limpiarDatos = function () { Object.keys(datosEl).forEach(function (k) { dato(k); }); };

    // Gigante y código
    var gig = $(".sd-gigante") || (function () { var g = document.createElement("div"); g.className = "sd-gigante"; g.setAttribute("aria-hidden", "true"); $(".sd").appendChild(g); return g; })();
    function gigante(html) { gig.innerHTML = html || ""; }
    var cod = $(".sd-codigo") || (function () { var g = document.createElement("pre"); g.className = "sd-codigo"; $(".sd").appendChild(g); return g; })();
    function codigo(html) { cod.innerHTML = html || ""; }

    // Tocar el mapa
    var arr = null;
    function evCelda(e) { var r = cv.getBoundingClientRect(); return v.celdaEn(api.mundo(), e.clientX - r.left, e.clientY - r.top); }
    cv.addEventListener("pointerdown", function (e) {
      if (!D.herrs) return; var m = api.mundo(), i = evCelda(e); if (i < 0) return;
      var hz = D.herr || D.herrs[0];
      // arrastrar un personaje si se toca su celda (cualquier herramienta)
      var act = (D.actores || []).filter(function (a) { return a.mov !== false && Math.round(a.x) === m.x(i) && Math.round(a.y) === m.y(i); })[0];
      if (act) arr = { act: act };
      else if (hz === "heroe" || hz === "rival" || hz === "meta") { var a2 = (D.actores || []).filter(function (a) { return a.tipo === hz; })[0]; if (a2 && !m.pared(i)) { a2.x = m.x(i); a2.y = m.y(i); arr = { act: a2 }; editar(); } }
      else { var pon = hz === "pared" ? (m.t[i] === 1 ? 0 : 1) : hz === "barro" ? (m.t[i] === 2 ? 0 : 2) : 0; arr = { pon: pon }; aplicar(i); }
      cv.setPointerCapture(e.pointerId); cv.classList.add("arrastra");
    });
    cv.addEventListener("pointermove", function (e) {
      if (!arr) return; var m = api.mundo(), i = evCelda(e); if (i < 0) return;
      if (arr.act) { if (!m.pared(i) && (Math.round(arr.act.x) !== m.x(i) || Math.round(arr.act.y) !== m.y(i))) { arr.act.x = m.x(i); arr.act.y = m.y(i); editar(); } }
      else aplicar(i);
    });
    function soltar() { if (!arr) return; arr = null; cv.classList.remove("arrastra"); editar(true); }
    cv.addEventListener("pointerup", soltar); cv.addEventListener("pointercancel", soltar);
    function ocupada(i) { var m = api.mundo(); return (D.actores || []).some(function (a) { return Math.round(a.x) === m.x(i) && Math.round(a.y) === m.y(i); }); }
    function aplicar(i) { if (ocupada(i) && arr.pon === 1) return; if (api.mundo().poner(i, arr.pon)) editar(); }
    var esperaReplay = null;
    function editar(fin) {
      if (cfg.alEditar) cfg.alEditar(D, api);
      if (fin) replay();
    }
    /* Repite la ola del paso tras una edición (la ola y el camino vuelven a correr). */
    function replay(dur) {
      if (!G || quieto || !(S.ola > 0 || S.camino > 0)) return;
      clearTimeout(esperaReplay);
      var tgt = objetivo(actual);
      G.killTweensOf(S, "ola,camino");
      var tl = G.timeline();
      if (tgt.ola > 0) tl.fromTo(S, { ola: 0 }, { ola: tgt.ola, duration: dur || 1.1, ease: "power1.inOut" });
      if (tgt.camino > 0) tl.fromTo(S, { camino: 0 }, { camino: tgt.camino, duration: .7, ease: "power2.inOut" }, tgt.ola > 0 ? "-=0.15" : 0);
    }

    // Navegación
    var actual = -1, tlActual = null;
    function objetivo(i) { var o = Object.assign({}, base); for (var k = 0; k <= i; k++) { var ps = cfg.pasos[k].s; Object.assign(o, typeof ps === "function" ? ps(D, api) : ps || {}); } return o; }
    function fijarHasta(i) {
      D.mapa = Object.keys(cfg.mapas)[0]; D.herrs = null;
      if (cfg.reiniciar) cfg.reiniciar(D, api);
      for (var k = 0; k <= i; k++) { var p = cfg.pasos[k]; if (p.mapa) D.mapa = p.mapa; if (p.fijar) p.fijar(D, api); D.herrs = p.toca || null; }
      if (D.herrs && D.herrs.indexOf(D.herr) < 0) D.herr = typeof D.herrs[0] === "string" ? D.herrs[0] : null;
      pintarHerr(D.herrs); cv.classList.toggle("toca", !!D.herrs);
      if (cfg.alEditar) cfg.alEditar(D, api);
    }
    function ir(i) {
      i = clamp(i, 0, n - 1); if (i === actual) return;
      var antes = actual; actual = i;
      if (tlActual) { tlActual.kill(); tlActual = null; }
      fijarHasta(i);
      var tgt = objetivo(i), p = cfg.pasos[i];
      if (!G || quieto) { Object.assign(S, tgt); }
      else if (i === antes + 1 && p.anim) {
        G.killTweensOf(S);
        if (antes >= 0) Object.assign(S, objetivo(antes)); // el paso anterior termina quieto
        var tl = G.timeline(); p.anim(tl, S, api);
        tl.to(S, Object.assign({ duration: .35, ease: "power1.out" }, tgt));
        tlActual = tl;
      } else {
        G.killTweensOf(S);
        var hacia = i > antes && antes >= 0 ? (p.dur || 1.3) : antes < 0 ? 1.6 : .7;
        tlActual = G.to(S, Object.assign({ duration: hacia, ease: "power3.inOut" }, tgt));
      }
      relato(i, antes);
      // Controles
      $$("button", senda).forEach(function (b, k) { b.classList.toggle("hecho", k <= i); b.setAttribute("aria-current", k === i ? "step" : "false"); });
      var bs = $$("button", senda)[i]; var x = bs.offsetLeft;
      if (G && !quieto) G.to(marca, { x: x, duration: .8, ease: "power3.inOut" }); else marca.style.transform = "translateX(" + x + "px)";
      num.textContent = (i + 1) + " / " + n;
      bPrev.disabled = i === 0; bNext.textContent = i === n - 1 ? (cfg.textoFin || "Fin ✓") : "Siguiente ›"; bNext.disabled = i === n - 1;
      if (cfg.alCambiar) cfg.alCambiar(i, D, api);
    }
    api.ir = ir;

    function relato(i, antes) {
      items.forEach(function (li, k) { if (k !== i && k !== antes) li.classList.remove("vivo"); });
      var nuevo = items[i], viejo = antes >= 0 ? items[antes] : null;
      if (!nuevo) return;
      nuevo.classList.add("vivo");
      if (!G || quieto) { if (viejo) viejo.classList.remove("vivo"); return; }
      var dir = antes > i ? -1 : 1;
      if (viejo) G.to(viejo, { opacity: 0, y: -24 * dir, filter: "blur(6px)", duration: .35, ease: "power2.in", onComplete: function () { viejo.classList.remove("vivo"); G.set(viejo, { clearProps: "opacity,transform,filter" }); } });
      var h2 = $("h2 span", nuevo) || (function () { var h = $("h2", nuevo); if (!h) return null; var s = document.createElement("span"); s.innerHTML = h.innerHTML; h.innerHTML = ""; h.appendChild(s); return s; })();
      var ws = []; $$("p", nuevo).forEach(function (p) { ws = ws.concat(palabras(p)); });
      var resto = $$(".sd-tuturno, pre", nuevo);
      G.set(nuevo, { opacity: 1, y: 0, filter: "none" });
      var tl = G.timeline({ delay: viejo ? .25 : .1 });
      if (h2) tl.fromTo(h2, { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: .75, ease: "expo.out" });
      if (resto.length) tl.fromTo(resto, { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .4, ease: "back.out(2)" }, 0);
      tl.fromTo(ws, { opacity: 0, y: "0.5em", filter: "blur(4px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: .5, stagger: Math.min(.025, 1.2 / Math.max(1, ws.length)), ease: "power3.out", clearProps: "filter" }, .15);
    }

    // Cuadro
    var tInicio = performance.now() / 1000;
    cadaCuadro(function (tt) {
      var t = tt - tInicio, m = api.mundo();
      v.camara(m, S); v.limpiar();
      gig.style.opacity = S.gig; cod.style.opacity = S.codigo;
      if (cfg.dibujar) cfg.dibujar(v, S, D, api, t); else dibujoBase(v, S, D, api, t);
    });

    // Arranque
    if (G && !quieto) {
      var cab = $(".sd-cab");
      if (cab) G.from(cab.children, { y: 30, opacity: 0, duration: 1, stagger: .12, ease: "expo.out" });
      actual = 0; fijarHasta(0); actual = -1;
      var ini = objetivo(0); Object.assign(S, ini, { revela: 0, alto: 0, z: (ini.z || 1) * 1.25 });
    }
    ir(0);
    return api;
  }

  /* El dibujo por defecto: rejilla, piso, paredes, ola, números, migas, grafo, camino y personajes. */
  function dibujoBase(v, S, D, api, t) {
    var m = api.mundo();
    v.rejilla(S.rejilla); v.recortar();
    v.piso(m, S.piso, S.grafo, S.revela);
    v.ola(m, D.res, S.ola, 1 - S.grafo);
    v.paredes(m, S.paredes * (1 - S.grafo * .6), S.alto, S.revela);
    v.aristas(m, S.aristas, D.op);
    if (D.res) {
      v.numeros(m, S.numeros, function (i) { var tt = D.res.t[i]; return tt >= 0 && tt <= S.ola + 1e-6 && isFinite(D.res.g[i]) ? String(Math.round(D.res.g[i] * 10) / 10) : null; }, "#14161B");
      v.migas(m, D.res, S.migas, S.ola);
    }
    (D.caminos || (D.res && D.res.camino ? [{ celdas: D.res.camino, clave: "camino" }] : [])).forEach(function (c) { v.camino(m, c.celdas, S[c.clave || "camino"], c.color, c.ancho, c.desfase); });
    dibujarActores(v, S, D, t); v.soltar();
  }
  function dibujarActores(v, S, D, t) {
    var acts = D.actores || [], heroe = acts.filter(function (a) { return a.tipo === "heroe"; })[0];
    acts.forEach(function (a, k) {
      var al = S.actores * (a.alfa == null ? 1 : a.alfa);
      if (a.tipo === "heroe") { var r = acts.filter(function (b) { return b.tipo === "rival"; })[0]; v.heroe(a.x, a.y, al, r ? [r.x - a.x, r.y - a.y] : null, t); }
      else if (a.tipo === "rival") v.bicho(a.x, a.y, al, a.color, heroe ? [heroe.x - a.x, heroe.y - a.y] : null, t, k * 1.7);
      else if (a.tipo === "meta") { v.anillo(a.x, a.y, .32 + Math.sin(t * 4) * .04, al, C.acento, .1); v.anillo(a.x, a.y, .12, al, C.acento, .2); }
    });
  }

  window.SENDA = { Mundo: Mundo, buscar: buscar, flujo: flujo, Vista: Vista, escena: escena, dibujoBase: dibujoBase, dibujarActores: dibujarActores, colores: function () { return C; }, leerColores: leerColores, calor: calor, rgba: rgba, cadaCuadro: cadaCuadro, palabras: palabras, quieto: quieto, clamp: clamp, lerp: lerp, rr: rr };
})();
