/* Arena JMD · motor de juegos en tiempo real para el modo LIVE de JMD Learning.
 *
 *   <script src="../../arena/arena-jmd.js"></script>
 *   <script> ArenaJMD.crear({ raiz: "#juego", titulo: "…", curso: "…", sesion: "…", objetos: {…}, zonas: […], entregar: fn }); </script>
 *
 * Una sola copia para todos los cursos: la sirve la API en /api/v1/live/{lección}/arena/ (va dentro del
 * binario del LMS, junto a la sala que habla: live_patio.go). Guía para autores: docs/ARENA_JMD.md.
 *
 * Lo que trae: robots JMD con color y accesorio (quieto, camina, festeja, aturdido), emotes y nombre; WASD o
 * flechas, clic o toque para ir y joystick en el celular; los demás se mueven en vivo e interpolados; mapa
 * cenital con muros, objetos que se recogen, zonas de entrega, peligros que solo te hacen soltar lo que
 * llevas, reloj de ronda, puntos que saltan, meta del grupo, tabla en vivo, sonidos sintetizados (Web Audio,
 * sin archivos) con silencio, práctica sola para quien llega tarde, reflexión al muro y «la fotito» en PNG.
 * Nadie queda eliminado: un error no resta y enseña con una explicación corta.
 */
(function () {
  "use strict";
  if (window.ArenaJMD) return;
  var VERSION = "1.0.0";
  var SCRIPT = (document.currentScript && document.currentScript.src) || "";

  // ------------------------------------------------------------------ utilidades
  function mm(q) { try { return matchMedia(q).matches; } catch (e) { return false; } }
  var REDUCIDO = mm("(prefers-reduced-motion: reduce)");
  var TACTIL = mm("(pointer: coarse)") || ("ontouchstart" in window && mm("(hover: none)"));
  var SIN_RED = /[?&]sinred=1/.test(location.search);
  var VER_FPS = /[?&]fps=1/.test(location.search);
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function hash32(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // rng(semilla) → función que da [0, 1): mulberry32, la misma en todos los navegadores.
  function rng(sem) {
    var a = (typeof sem === "number" ? sem : hash32(sem)) >>> 0;
    return function () { a = (a + 0x6d2b79f5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function el(tag, cls, padre, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    if (padre) padre.appendChild(n);
    return n;
  }
  function boton(cls, padre, txt, fn) { var b = el("button", cls, padre, txt); b.type = "button"; if (fn) b.addEventListener("click", fn); return b; }
  function leer(k, def) { try { var v = localStorage.getItem("arena-jmd:" + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem("arena-jmd:" + k, JSON.stringify(v)); } catch (e) {} }
  function slug(t) { return String(t || "alumno").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "alumno"; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function rgba(hex, a) {
    var h = hex.replace("#", ""); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }
  function mezclar(hex, otro, k) {
    var a = parseInt(hex.slice(1), 16), b = parseInt(otro.slice(1), 16);
    var r = Math.round(lerp(a >> 16 & 255, b >> 16 & 255, k)), g = Math.round(lerp(a >> 8 & 255, b >> 8 & 255, k)), bl = Math.round(lerp(a & 255, b & 255, k));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  var FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

  // Hoja de estilos: arena-jmd.css, junto a este archivo.
  (function () {
    if (document.querySelector("link[data-arena-jmd]")) return;
    var l = document.createElement("link"); l.rel = "stylesheet"; l.setAttribute("data-arena-jmd", "");
    l.href = SCRIPT ? SCRIPT.replace(/[^/]*$/, "arena-jmd.css") : "arena-jmd.css";
    document.head.appendChild(l);
  })();
  try { var tm = new URLSearchParams(location.search).get("tema"); if (tm === "dark" || tm === "light") document.documentElement.setAttribute("data-tema", tm); } catch (e) {}

  // ------------------------------------------------------------------ la marca: colores, accesorios, emotes
  var COLORES = [
    { id: "violeta", nombre: "Violeta", c: "#6a58e8" }, { id: "oro", nombre: "Oro", c: "#e3a614" },
    { id: "turquesa", nombre: "Turquesa", c: "#12a7a0" }, { id: "coral", nombre: "Coral", c: "#f0644b" },
    { id: "verde", nombre: "Verde", c: "#2fa35f" }, { id: "rosa", nombre: "Rosa", c: "#e2559b" },
    { id: "azul", nombre: "Azul", c: "#2f6bff" }, { id: "naranja", nombre: "Naranja", c: "#f28c1c" },
    { id: "cielo", nombre: "Cielo", c: "#38b2e6" }, { id: "ciruela", nombre: "Ciruela", c: "#9446c1" },
    { id: "lima", nombre: "Lima", c: "#86bb24" }, { id: "granate", nombre: "Granate", c: "#b8344c" },
  ];
  var ACCESORIOS = [
    { id: "", nombre: "Antena" }, { id: "casco", nombre: "Casco minero" }, { id: "chullo", nombre: "Chullo" },
    { id: "gorra", nombre: "Gorra" }, { id: "corona", nombre: "Corona" }, { id: "audifonos", nombre: "Audífonos" },
    { id: "birrete", nombre: "Birrete" }, { id: "mono", nombre: "Moño" }, { id: "sombrero", nombre: "Sombrero" },
  ];
  var EMOTES = [
    { id: "hola", e: "👋", t: "¡Hola!" }, { id: "bien", e: "👍", t: "¡Bien!" }, { id: "risa", e: "😂", t: "Jaja" },
    { id: "idea", e: "💡", t: "¡Idea!" }, { id: "fuego", e: "🔥", t: "¡Fuego!" }, { id: "wow", e: "😮", t: "¡Wow!" },
  ];
  var TINTA = "#1b2350", CARCASA = "#f4f6fb", VISOR = "#162040", OJO = "#6fe3ff", ORO = "#f2c14e";
  function colorDe(i) { return COLORES[((i | 0) % COLORES.length + COLORES.length) % COLORES.length].c; }
  function emoteDe(id) { for (var i = 0; i < EMOTES.length; i++) if (EMOTES[i].id === id) return EMOTES[i]; return null; }

  // ------------------------------------------------------------------ el robot JMD (Canvas 2D)
  // Origen en los pies; mide ~86 unidades con la antena. dir: 0 de frente, 1 izquierda, 2 de espaldas, 3 derecha.
  function pintarCabeza(ctx, color, acc, dir) {
    var lado = dir === 1 ? -1 : dir === 3 ? 1 : 0;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    // orejas (del color del jugador)
    ctx.fillStyle = color; ctx.strokeStyle = TINTA; ctx.lineWidth = 2.4;
    if (acc !== "audifonos") {
      if (lado <= 0) { ctx.beginPath(); ctx.arc(lado ? 19 : -24, -54, 5.5, 0, 7); ctx.fill(); ctx.stroke(); }
      if (lado >= 0) { ctx.beginPath(); ctx.arc(lado ? -19 : 24, -54, 5.5, 0, 7); ctx.fill(); ctx.stroke(); }
    }
    // antena (si no hay sombrero)
    if (acc === "" || acc === "audifonos" || acc === "mono" || acc === "corona") {
      ctx.strokeStyle = TINTA; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(lado * 3, -72); ctx.lineTo(lado * 4, -81); ctx.stroke();
      ctx.fillStyle = ORO; ctx.beginPath(); ctx.arc(lado * 4, -84, 4, 0, 7); ctx.fill(); ctx.stroke();
    }
    // carcasa
    ctx.fillStyle = CARCASA; ctx.strokeStyle = TINTA; ctx.lineWidth = 2.6;
    rr(ctx, -23, -73, 46, 38, 15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.9)"; rr(ctx, -16, -70, 18, 6, 3); ctx.fill(); // brillo
    if (dir === 2) {
      ctx.fillStyle = color; rr(ctx, -12, -60, 24, 13, 5); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(0, -53.5, 2.4, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = VISOR; rr(ctx, -16 + lado * 6, -63, 32 - Math.abs(lado) * 6, 18, 9); ctx.fill();
      ctx.fillStyle = "rgba(111,227,255,.14)"; rr(ctx, -13 + lado * 6, -61, 26 - Math.abs(lado) * 6, 5, 2.5); ctx.fill();
    }
    pintarAccesorio(ctx, acc, color, dir, lado);
  }
  function pintarAccesorio(ctx, acc, color, dir, lado) {
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = TINTA; ctx.lineWidth = 2.4;
    if (acc === "casco") {
      ctx.fillStyle = "#f5c518"; ctx.beginPath(); ctx.moveTo(-25, -66); ctx.quadraticCurveTo(-24, -92, 0, -92); ctx.quadraticCurveTo(24, -92, 25, -66); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#d9a21b"; rr(ctx, -29, -69, 58, 7, 3.5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.moveTo(0, -91); ctx.lineTo(0, -70); ctx.stroke();
      if (dir !== 2) { ctx.fillStyle = "#fff6d6"; ctx.strokeStyle = TINTA; ctx.beginPath(); ctx.arc(lado * 12, -80, 5.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#ffe27a"; ctx.beginPath(); ctx.arc(lado * 12, -80, 2.6, 0, 7); ctx.fill(); }
    } else if (acc === "chullo") {
      // Gorro andino: rojo con franjas en zigzag, orejeras y borlas.
      ctx.fillStyle = "#d63a3a"; ctx.beginPath(); ctx.moveTo(-25, -64); ctx.quadraticCurveTo(-25, -94, 0, -95); ctx.quadraticCurveTo(25, -94, 25, -64); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 2.6; ctx.beginPath();
      for (var i = 0; i <= 10; i++) { var x = -22 + i * 4.4, y = -74 + (i % 2 ? -4 : 0); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      ctx.strokeStyle = "#2a9df4"; ctx.beginPath(); for (i = 0; i <= 10; i++) { x = -21 + i * 4.2; y = -83 + (i % 2 ? 3 : 0); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      ctx.strokeStyle = TINTA; ctx.lineWidth = 2.2; ctx.fillStyle = "#d63a3a";
      if (lado <= 0) { ctx.beginPath(); ctx.moveTo(-25, -66); ctx.lineTo(-27, -46); ctx.lineTo(-19, -52); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(-27, -43, 3, 0, 7); ctx.fill(); ctx.fillStyle = "#d63a3a"; }
      if (lado >= 0) { ctx.beginPath(); ctx.moveTo(25, -66); ctx.lineTo(27, -46); ctx.lineTo(19, -52); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(27, -43, 3, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(0, -97, 4.5, 0, 7); ctx.fill(); ctx.stroke();
    } else if (acc === "gorra") {
      var osc = mezclar(color, "#000000", .25);
      ctx.fillStyle = osc; ctx.beginPath(); ctx.moveTo(-24, -67); ctx.quadraticCurveTo(-23, -88, 0, -88); ctx.quadraticCurveTo(23, -88, 24, -67); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (dir !== 2) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(lado * 16, -67, lado ? 14 : 19, 4.5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, -88, 2.6, 0, 7); ctx.fill();
    } else if (acc === "corona") {
      ctx.fillStyle = ORO; ctx.beginPath(); ctx.moveTo(-17, -71); ctx.lineTo(-19, -88); ctx.lineTo(-9, -79); ctx.lineTo(0, -92); ctx.lineTo(9, -79); ctx.lineTo(19, -88); ctx.lineTo(17, -71); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e2559b"; ctx.beginPath(); ctx.arc(0, -78, 2.6, 0, 7); ctx.fill(); ctx.fillStyle = "#38b2e6"; ctx.beginPath(); ctx.arc(-10, -75, 2, 0, 7); ctx.arc(10, -75, 2, 0, 7); ctx.fill();
    } else if (acc === "audifonos") {
      ctx.strokeStyle = TINTA; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(0, -58, 24, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.lineWidth = 2.4; ctx.fillStyle = color;
      if (lado <= 0) { rr(ctx, -30, -64, 10, 17, 5); ctx.fill(); ctx.stroke(); }
      if (lado >= 0) { rr(ctx, 20, -64, 10, 17, 5); ctx.fill(); ctx.stroke(); }
    } else if (acc === "birrete") {
      ctx.fillStyle = "#1f1d33"; rr(ctx, -16, -82, 32, 11, 3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-30, -84); ctx.lineTo(0, -94); ctx.lineTo(30, -84); ctx.lineTo(0, -75); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = ORO; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -85); ctx.lineTo(20, -82); ctx.lineTo(21, -70); ctx.stroke();
      ctx.fillStyle = ORO; ctx.beginPath(); ctx.arc(21, -68, 2.8, 0, 7); ctx.fill();
    } else if (acc === "mono") {
      ctx.fillStyle = "#ff6fae"; ctx.save(); ctx.translate(-12, -74); ctx.rotate(-.35);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, -7); ctx.lineTo(-11, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(11, -7); ctx.lineTo(11, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    } else if (acc === "sombrero") {
      ctx.fillStyle = "#e7bf6a"; ctx.beginPath(); ctx.ellipse(0, -70, 38, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-17, -70); ctx.quadraticCurveTo(-16, -92, 0, -92); ctx.quadraticCurveTo(16, -92, 17, -70); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color; ctx.fillRect(-17, -77, 34, 5.5);
    }
  }
  function pintarCuerpo(ctx, color) {
    ctx.lineJoin = "round"; ctx.strokeStyle = TINTA; ctx.lineWidth = 2.4;
    ctx.fillStyle = color; rr(ctx, -15, -36, 30, 24, 11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.88)"; rr(ctx, -8, -30, 16, 10, 4); ctx.fill();
    ctx.fillStyle = ORO; ctx.beginPath(); ctx.arc(0, -25, 2.6, 0, 7); ctx.fill();
  }
  // Caché de piezas: cabeza y cuerpo por (color, accesorio, dirección, escala). Las piernas, los brazos y
  // los ojos se pintan en vivo (son pocas líneas) para poder animarlos.
  var cachePiezas = {}, cacheN = 0;
  function pieza(tipo, color, acc, dir, k) {
    var clave = tipo + "|" + color + "|" + acc + "|" + dir + "|" + k.toFixed(2);
    var p = cachePiezas[clave];
    if (p) return p;
    if (++cacheN > 600) { cachePiezas = {}; cacheN = 1; }
    var x0 = tipo === "c" ? -42 : -18, y0 = tipo === "c" ? -102 : -39, w = tipo === "c" ? 84 : 36, h = tipo === "c" ? 70 : 30;
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(h * k));
    var g = c.getContext("2d"); g.scale(k, k); g.translate(-x0, -y0);
    if (tipo === "c") pintarCabeza(g, color, acc, dir); else pintarCuerpo(g, color);
    p = { c: c, x0: x0, y0: y0, w: w, h: h };
    cachePiezas[clave] = p;
    return p;
  }
  // pintarRobot(ctx, x, y, escala, o): o = {color (índice o #hex), accesorio, dir, anim, fase, t, parpadeo, k}
  // k: píxeles reales por unidad (para la caché); si falta, se pinta sin caché (fotito, vistas previas).
  function pintarRobot(ctx, x, y, esc, o) {
    var color = typeof o.color === "string" ? o.color : colorDe(o.color);
    var dir = o.dir | 0, anim = o.anim || "", t = o.t || 0, fase = o.fase || 0, lado = dir === 1 ? -1 : dir === 3 ? 1 : 0;
    var camina = anim === "camina", fiesta = anim === "festeja", mareo = anim === "aturdido";
    var bob = REDUCIDO ? 0 : fiesta ? -Math.abs(Math.sin(t * 9)) * 10 : camina ? -Math.abs(Math.sin(fase)) * 3.2 : Math.sin(t * 2.2) * 1.1;
    var incl = REDUCIDO ? 0 : camina ? lado * 0.06 : mareo ? Math.sin(t * 14) * 0.12 : 0;
    ctx.save();
    ctx.translate(x, y); ctx.scale(esc, esc);
    // sombra
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(0, 1, 19 + bob * .4, 5.5, 0, 0, 7); ctx.fill();
    // piernas
    var paso = camina && !REDUCIDO ? Math.sin(fase) * 4 : 0;
    ctx.strokeStyle = TINTA; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-7, -14 + bob); ctx.lineTo(-7 + (lado ? paso : 0), -2 - (lado ? 0 : Math.max(0, paso))); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -14 + bob); ctx.lineTo(7 - (lado ? paso : 0), -2 - (lado ? 0 : Math.max(0, -paso))); ctx.stroke();
    ctx.translate(0, bob); ctx.rotate(incl);
    // brazos (detrás del cuerpo si va de espaldas)
    var brazo = function (s) {
      var ang = fiesta ? -2.3 + Math.sin(t * 12 + s) * .25 : camina ? (REDUCIDO ? .2 : Math.sin(fase + (s > 0 ? Math.PI : 0)) * .55) : mareo ? .9 : .18;
      var hx = s * 15, hy = -31, ex = hx + s * Math.sin(Math.abs(ang)) * 13 * (fiesta ? .5 : 1), ey = hy + Math.cos(ang) * 13;
      if (fiesta) { ex = hx + s * 6; ey = hy - 15; }
      ctx.strokeStyle = TINTA; ctx.lineWidth = 7.5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = CARCASA; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    };
    if (dir === 2) { brazo(-1); brazo(1); }
    var k = o.k;
    if (k) { var pc = pieza("b", color, "", 0, k); ctx.drawImage(pc.c, pc.x0, pc.y0, pc.w, pc.h); } else pintarCuerpo(ctx, color);
    if (dir !== 2) { if (lado <= 0) brazo(-1); if (lado >= 0) brazo(1); }
    // cabeza
    var cab = REDUCIDO ? 0 : camina ? Math.sin(fase * 2) * .8 : fiesta ? -2 : 0;
    ctx.translate(0, cab);
    if (k) { var ph = pieza("c", color, o.accesorio || "", dir, k); ctx.drawImage(ph.c, ph.x0, ph.y0, ph.w, ph.h); } else pintarCabeza(ctx, color, o.accesorio || "", dir);
    // ojos (en vivo)
    if (dir !== 2) {
      var ex1 = lado * 6 - 7.5 + lado * 2, ex2 = lado * 6 + 7.5 + lado * 2, ey = -54;
      if (lado) { ex1 = lado * 6 - 5; ex2 = lado * 6 + 6; }
      ctx.fillStyle = OJO; ctx.strokeStyle = OJO; ctx.lineWidth = 2.6; ctx.lineCap = "round";
      if (fiesta || anim === "feliz") {
        ctx.beginPath(); ctx.arc(ex1, ey + 2, 3.6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        ctx.beginPath(); ctx.arc(ex2, ey + 2, 3.6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      } else if (mareo) {
        [ex1, ex2].forEach(function (cx) { ctx.beginPath(); ctx.moveTo(cx - 3, ey - 3); ctx.lineTo(cx + 3, ey + 3); ctx.moveTo(cx + 3, ey - 3); ctx.lineTo(cx - 3, ey + 3); ctx.stroke(); });
      } else if (o.parpadeo) {
        ctx.fillRect(ex1 - 3, ey, 6, 1.6); ctx.fillRect(ex2 - 3, ey, 6, 1.6);
      } else {
        var alto = anim === "triste" ? 4.5 : 8;
        rr(ctx, ex1 - 3, ey - alto / 2 + (anim === "triste" ? 1.5 : 0), 6, alto, 3); ctx.fill();
        rr(ctx, ex2 - 3, ey - alto / 2 + (anim === "triste" ? 1.5 : 0), 6, alto, 3); ctx.fill();
      }
      // boca de luz
      ctx.strokeStyle = TINTA; ctx.lineWidth = 2; ctx.beginPath();
      if (anim === "triste") ctx.arc(lado * 6, -38, 3.5, Math.PI * 1.2, Math.PI * 1.8);
      else ctx.arc(lado * 6, -43, fiesta ? 4.5 : 3, Math.PI * .2, Math.PI * .8);
      ctx.stroke();
    }
    if (mareo && !REDUCIDO) { // estrellitas
      for (var i = 0; i < 3; i++) {
        var a = t * 5 + i * 2.1; ctx.fillStyle = ORO;
        estrella(ctx, Math.cos(a) * 22, -92 + Math.sin(a) * 5, 4.2);
      }
    }
    ctx.restore();
  }
  function estrella(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath(); ctx.fill();
  }
  function robotCanvas(px, o) {
    var c = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(px * dpr); c.height = Math.round(px * dpr); c.style.width = px + "px"; c.style.height = px + "px";
    c.setAttribute("aria-hidden", "true");
    var g = c.getContext("2d"); g.scale(dpr, dpr);
    pintarRobot(g, px / 2, px * .92, px / 108, o);
    return c;
  }

  // ------------------------------------------------------------------ sonido (Web Audio, sin archivos)
  var Sonido = (function () {
    var ctx = null, maestro = null, mudo = !!leer("mudo", false), ruido = null;
    function asegurar() {
      if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      maestro = ctx.createGain(); maestro.gain.value = .22; maestro.connect(ctx.destination);
      return ctx;
    }
    function tono(f, t, dur, tipo, vol, f2) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tipo || "square"; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(maestro); o.start(t); o.stop(t + dur + .03);
    }
    function soplo(t, dur, vol, frec) {
      if (!ruido) { ruido = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate); var d = ruido.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = ruido; f.type = "lowpass"; f.frequency.value = frec || 900;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(maestro); s.start(t); s.stop(t + dur + .03);
    }
    var TABLA = {
      tomar: function (t) { tono(520, t, .09, "square", .22); tono(780, t + .06, .1, "square", .2); },
      bien: function (t) { [523, 659, 784, 1046].forEach(function (f, i) { tono(f, t + i * .065, .16, "triangle", .32); }); },
      bonus: function (t) { [784, 988, 1175, 1568].forEach(function (f, i) { tono(f, t + i * .05, .14, "square", .16); }); },
      mal: function (t) { tono(330, t, .18, "triangle", .3, 220); tono(262, t + .14, .26, "triangle", .26, 196); },
      golpe: function (t) { soplo(t, .3, .7, 500); tono(140, t, .25, "sine", .5, 60); },
      emote: function (t) { tono(880, t, .07, "sine", .25, 1320); },
      soltar: function (t) { tono(400, t, .1, "triangle", .2, 260); },
      tic: function (t) { tono(1200, t, .04, "square", .12); },
      inicio: function (t) { [392, 523, 659, 784].forEach(function (f, i) { tono(f, t + i * .11, .22, "square", .18); }); soplo(t + .44, .3, .25, 3000); },
      fin: function (t) { [523, 659, 784].forEach(function (f) { tono(f, t, .9, "triangle", .2); }); tono(1046, t + .2, .8, "triangle", .16); },
      meta: function (t) { [659, 784, 988, 1318, 1568].forEach(function (f, i) { tono(f, t + i * .08, .25, "triangle", .26); }); },
    };
    return {
      tocar: function (n) { if (mudo || !TABLA[n] || !asegurar()) return; try { TABLA[n](ctx.currentTime + .01); } catch (e) {} },
      despertar: function () { if (!mudo) asegurar(); },
      mudo: function () { return mudo; },
      alternar: function () { mudo = !mudo; guardar("mudo", mudo); if (!mudo) asegurar(); return mudo; },
    };
  })();

  // ------------------------------------------------------------------ la red: sala del servidor o práctica local
  function rutaLive() {
    var m = location.pathname.match(/\/api\/v1\/live\/([^/]+)\/escenas\/([^/]+)\//);
    return m ? { leccion: decodeURIComponent(m[1]), escena: decodeURIComponent(m[2]) } : null;
  }
  function pedir(url, cuerpo, keepalive) {
    var op = { method: cuerpo ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: {} };
    if (cuerpo) { op.headers["Content-Type"] = "application/json"; op.body = JSON.stringify(cuerpo); }
    if (keepalive) op.keepalive = true;
    try {
      return fetch(url, op).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, datos: d || {} }; });
      }).catch(function () { return { ok: false, status: 0, datos: {} }; });
    } catch (e) { return Promise.resolve({ ok: false, status: 0, datos: {} }); }
  }

  // ------------------------------------------------------------------ el juego
  function crear(op) {
    op = op || {};
    var raiz = typeof op.raiz === "string" ? document.querySelector(op.raiz) : op.raiz;
    if (!raiz) { raiz = el("div", "", document.body); }
    var ruta = rutaLive();
    var LECCION = op.leccion || (ruta && ruta.leccion) || "";
    var ESCENA = op.escena || (ruta && ruta.escena) || "";
    var BASE = "/api/v1/live/" + encodeURIComponent(LECCION);
    var conRed = !!(LECCION && ESCENA) && !SIN_RED;
    var M = { ancho: (op.mundo && op.mundo.ancho) || 1600, alto: (op.mundo && op.mundo.alto) || 1000, tema: (op.mundo && op.mundo.tema) || "patio" };
    var DUR = op.duracion || 180;
    var VEL = (op.jugador && op.jugador.velocidad) || 270;
    var R_JUG = 17;

    // ---- estado
    var srv = { t: 0, r: { n: 0, estado: "espera", semilla: hash32(ESCENA || "arena"), duracion_s: DUR }, c: {}, j: [], tb: [], tt: 0, o: [] };
    var desfase = 0, desfases = [], conectado = false, hola = null, fuente = null, fallosRed = 0;
    var practica = null; // {r, objetos:{}, contadores:{}}
    var yo = { dentro: false, id: "", nombre: "", staff: false };
    var avatar = leer("avatar", null) || { color: Math.floor(Math.random() * COLORES.length), accesorio: (op.jugador && op.jugador.accesorio) || "" };
    var P = { x: M.ancho / 2, y: M.alto / 2, vx: 0, vy: 0, dir: 0, anim: "", fase: 0, carga: "", puntos: 0, emote: "", emoteT: 0,
      aturdido: 0, invulnerable: 0, festeja: 0, triste: 0, objetivo: null, parpadeo: 0, ocupado: false };
    var stats = { aciertos: 0, fallos: 0, entregas: 0, bonus: 0, golpes: 0, puntos: 0 };
    var remotos = {}, popups = [], particulas = [], feed = [], ultimaRonda = -1, finMostrado = -1, metaCelebrada = -1;
    var mundo = { muros: [], zonas: [], peligros: [], decor: [] }, defObjetos = {}, fondo = null, fondoClave = "";
    var pendientes = {}; // objeto → {tipo, hasta}
    var vLocal = {}; // objeto → versión que ya consumí (hasta que el instante la confirme)
    var envio = { vuelo: false, ultimo: 0, firma: "", frenoHasta: 0, emote: "" };
    var teclas = {}, joy = { activo: false, x: 0, y: 0, id: null }, quiz = null, cam = { x: 0, y: 0, s: 1, sacude: 0 };
    var vista = { w: 0, h: 0, dpr: 1 }, calidad = { dprMax: 2, muestras: [] };

    function ahoraSrv() { return Date.now() + desfase; }
    function ronda() { return practica ? practica.r : srv.r; }
    function jugando() { var r = ronda(); return r.estado !== "final"; }
    function enRonda() { return ronda().estado === "jugando"; }

    // ---- DOM: marco de marca, escenario, panel
    raiz.classList.add("aj");
    raiz.textContent = "";
    var marco = el("header", "aj-marco", raiz);
    var marca = el("div", "aj-marca", marco);
    marca.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 28 L15 12 L24 21 L34 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" opacity=".55"/><circle cx="6" cy="28" r="3.2"/><circle cx="15" cy="12" r="3.8"/><circle cx="24" cy="21" r="3"/><circle cx="34" cy="8" r="4.4" class="o"/></svg>';
    el("b", "", marca, "JMD Learning");
    el("span", "aj-sello", marca, "Arena");
    var clase = el("div", "aj-clase", marco);
    el("span", "aj-curso", clase, op.curso || "");
    el("span", "aj-sesion", clase, op.sesion || "");
    var titulo = el("h1", "aj-titulo", marco, op.titulo || "Arena JMD");
    var metaCaja = el("div", "aj-meta", marco); metaCaja.hidden = !op.meta;
    var metaTxt = el("span", "aj-meta-t", metaCaja, (op.meta && op.meta.texto) || "Meta del grupo");
    var metaBarra = el("div", "aj-barra", metaCaja); var metaRelleno = el("i", "", metaBarra);
    var metaNum = el("span", "aj-meta-n", metaCaja, "0");
    var reloj = el("div", "aj-reloj", marco, "—"); reloj.setAttribute("aria-label", "Tiempo de la ronda");
    var bSon = boton("aj-ico aj-son", marco, "", function () { var m = Sonido.alternar(); pintarSon(m); });
    function pintarSon(m) { bSon.textContent = m ? "🔇" : "🔊"; bSon.setAttribute("aria-pressed", String(!m)); bSon.setAttribute("aria-label", m ? "Sonido apagado: tocar para encender" : "Sonido encendido: tocar para silenciar"); bSon.title = m ? "Sonido apagado" : "Sonido encendido"; }
    pintarSon(Sonido.mudo());

    var cuerpo = el("div", "aj-cuerpo", raiz);
    var esc = el("div", "aj-escenario", cuerpo);
    var lienzo = el("canvas", "aj-lienzo", esc); lienzo.tabIndex = 0;
    lienzo.setAttribute("role", "application");
    lienzo.setAttribute("aria-label", (op.titulo || "Arena") + ": muévete con WASD o las flechas, o toca el mapa para ir. Los números del 1 al 6 lanzan emotes.");
    var ctx = lienzo.getContext("2d", { alpha: false });
    var banner = el("div", "aj-banner", esc); banner.setAttribute("aria-live", "polite");
    var miniTabla = el("ol", "aj-mini", esc);
    var carta = el("div", "aj-carta", esc); carta.hidden = true; carta.setAttribute("aria-live", "polite");
    var lupa = el("div", "aj-lupa", esc); lupa.hidden = true; lupa.setAttribute("role", "status");
    var joyEl = el("div", "aj-joy", esc); var joyPomo = el("i", "", joyEl); joyEl.hidden = !TACTIL; joyEl.setAttribute("aria-hidden", "true");
    var acciones = el("div", "aj-acciones", esc);
    var bSoltar = boton("aj-accion aj-soltar", acciones, "Soltar", function () { soltarCarga(false, true); }); bSoltar.hidden = true;
    var bEmote = boton("aj-accion aj-emote-b", acciones, "😊", function () { ruedaEmotes.hidden = !ruedaEmotes.hidden; });
    bEmote.setAttribute("aria-label", "Emotes"); bEmote.setAttribute("aria-expanded", "false");
    var ruedaEmotes = el("div", "aj-rueda", esc); ruedaEmotes.hidden = true;
    EMOTES.forEach(function (em, i) {
      var b = boton("aj-em", ruedaEmotes, em.e, function () { lanzarEmote(em.id); ruedaEmotes.hidden = true; });
      b.setAttribute("aria-label", em.t + " (tecla " + (i + 1) + ")"); b.title = em.t + " · " + (i + 1);
    });
    var toastEl = el("div", "aj-toast", esc); toastEl.setAttribute("role", "status");
    var capaEntrada = el("div", "aj-capa aj-entrada", esc);
    var capaQuiz = el("div", "aj-capa aj-quiz", esc); capaQuiz.hidden = true; capaQuiz.setAttribute("role", "dialog"); capaQuiz.setAttribute("aria-modal", "true");
    var capaFin = el("div", "aj-capa aj-fin", esc); capaFin.hidden = true; capaFin.setAttribute("role", "dialog"); capaFin.setAttribute("aria-modal", "true");
    var fpsEl = VER_FPS ? el("div", "aj-fps", esc, "") : null;

    var lado = el("aside", "aj-lado", cuerpo);
    var cajaTabla = el("section", "aj-caja", lado); el("h2", "", cajaTabla, "En vivo");
    var tablaEl = el("ol", "aj-tabla", cajaTabla); var yoEl = el("p", "aj-yo", cajaTabla, "");
    var cajaStaff = el("section", "aj-caja aj-staff", lado); cajaStaff.hidden = true; el("h2", "", cajaStaff, "Instructor");
    var staffTxt = el("p", "aj-nota", cajaStaff, "");
    var duraciones = op.duraciones || [DUR, Math.max(DUR + 120, 300)];
    duraciones.forEach(function (d, i) { boton("aj-btn" + (i ? "" : " fuerte"), cajaStaff, "Ronda nueva de " + (d % 60 ? d + " s" : d / 60 + " min"), function () { staff("iniciar", { duracion_s: d }); }); });
    var bTerminar = boton("aj-btn", cajaStaff, "Terminar la ronda", function () { staff("terminar"); });
    boton("aj-btn", cajaStaff, "Volver al calentamiento", function () { staff("reiniciar"); });
    var bJugarStaff = boton("aj-btn", cajaStaff, "Jugar yo también", function () { entrar(); });
    var cajaReglas = el("section", "aj-caja", lado);
    var detReglas = el("details", "", cajaReglas); detReglas.open = true;
    el("summary", "", detReglas).appendChild(el("h2", "", null, "Cómo se juega"));
    var reglasEl = el("ol", "aj-reglas", detReglas);
    (op.reglas || ["Camina por el mapa y recoge un objeto pasando encima.", "Llévalo a la zona correcta.", "Si te equivocas no pierdes puntos: lee la explicación y sigue."]).forEach(function (r) { el("li", "", reglasEl, r); });
    el("p", "aj-teclas", detReglas, TACTIL ? "Joystick para moverte o toca el mapa · 😊 emotes · «Soltar» deja lo que llevas" : "WASD o flechas · clic en el mapa para ir · 1–6 emotes · Espacio suelta lo que llevas");
    var cajaFeed = el("section", "aj-caja", lado); el("h2", "", cajaFeed, "Jugadas");
    var feedEl = el("ul", "aj-feed", cajaFeed); el("li", "aj-vacio", feedEl, "Aún no hay jugadas.");

    // ---- avisos
    var toastT = 0;
    function toast(texto, tipo, ms) {
      toastEl.textContent = texto; toastEl.className = "aj-toast ve" + (tipo ? " " + tipo : "");
      clearTimeout(toastT); toastT = setTimeout(function () { toastEl.className = "aj-toast"; }, ms || 2600);
    }
    var lupaT = 0;
    function mostrarLupa(d) {
      lupa.textContent = "";
      var cab = el("div", "aj-lupa-cab", lupa);
      el("span", "aj-lupa-ico", cab, d.icono || "🔍");
      el("b", "", cab, d.titulo || "Ojo aquí");
      if (d.texto) el("p", "", lupa, d.texto);
      if (d.real) el("p", "aj-lupa-real", lupa, d.real);
      var cerrar = boton("aj-lupa-x", lupa, "Entendido", function () { lupa.hidden = true; lienzo.focus({ preventScroll: true }); });
      cerrar.setAttribute("aria-label", "Cerrar la explicación");
      lupa.className = "aj-lupa " + (d.tipo || "mal");
      lupa.hidden = false;
      clearTimeout(lupaT); lupaT = setTimeout(function () { lupa.hidden = true; }, d.ms || 7000);
    }
    function pintarBanner() {
      var r = ronda(), txt = "";
      if (!yo.dentro && !practica) txt = yo.staff ? "Estás mirando como instructor" : "";
      else if (practica) txt = "Práctica sola · solo tú ves esta partida";
      else if (r.estado === "espera") txt = "Calentamiento · camina, saluda y prueba: los puntos cuentan cuando el instructor abra la ronda";
      else if (r.estado === "final") txt = "Ronda terminada · espera la próxima o practica sola";
      else txt = "";
      if (!conRed && !practica && !yo.dentro) txt = "Sin conexión con la clase";
      if (banner.textContent !== txt) banner.textContent = txt;
      banner.hidden = !txt || ((!carta.hidden || !lupa.hidden) && vista.w <= 860); // en el celular, la carta manda
      var juega = (yo.dentro || !!practica) && capaEntrada.hidden;
      acciones.hidden = !juega; joyEl.hidden = !(juega && TACTIL);
      if (!juega) ruedaEmotes.hidden = true;
    }

    // ---- mundo: generación con la semilla de la ronda
    var ayudas = {
      ancho: M.ancho, alto: M.alto,
      // lugarLibre(rnd, radio, zona?): un punto lejos de muros, zonas y rieles (y dentro de zona {x,y,w,h} si se da).
      lugarLibre: function (rnd, radio, zona) {
        radio = radio || 30;
        for (var i = 0; i < 80; i++) {
          var z = zona || { x: 60, y: 60, w: M.ancho - 120, h: M.alto - 120 };
          var x = z.x + radio + rnd() * (z.w - radio * 2), y = z.y + radio + rnd() * (z.h - radio * 2);
          if (libre(x, y, radio)) return { x: x, y: y };
        }
        return { x: M.ancho / 2, y: M.alto / 2 };
      },
      rng: rng, hash: hash32,
    };
    function dentroRect(x, y, r, m) { return x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m; }
    function libre(x, y, radio) {
      for (var i = 0; i < mundo.muros.length; i++) if (dentroRect(x, y, mundo.muros[i], radio)) return false;
      for (i = 0; i < mundo.zonas.length; i++) if (dentroRect(x, y, mundo.zonas[i], radio)) return false;
      for (i = 0; i < mundo.peligros.length; i++) {
        var pr = mundo.peligros[i];
        for (var s = 0; s < pr.ruta.length - 1; s++) if (distSeg(x, y, pr.ruta[s], pr.ruta[s + 1]) < radio + pr.radio) return false;
      }
      return true;
    }
    function distSeg(x, y, a, b) {
      var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1) : 0;
      var px = a[0] + dx * t, py = a[1] + dy * t; return Math.hypot(x - px, y - py);
    }
    function generar() {
      var sem = ronda().semilla >>> 0;
      var g = typeof op.generar === "function" ? (op.generar(rng(sem ^ 0x51ed), ayudas) || {}) : {};
      mundo.muros = (g.muros || op.muros || []).map(function (m) { return Array.isArray(m) ? { x: m[0], y: m[1], w: m[2], h: m[3] } : m; });
      mundo.zonas = (g.zonas || op.zonas || []).map(function (z) { return Object.assign({ color: "#6a58e8", icono: "", nombre: "" }, z); });
      mundo.peligros = (g.peligros || op.peligros || []).map(function (p, i) {
        var q = Object.assign({ tipo: "dron", vel: 120, radio: 24, aviso: "¡Uy! Te chocaste: suelta lo que llevabas y sigue." }, p);
        q.largos = []; q.total = 0;
        for (var s = 0; s < q.ruta.length - 1; s++) { var l = Math.hypot(q.ruta[s + 1][0] - q.ruta[s][0], q.ruta[s + 1][1] - q.ruta[s][1]); q.largos.push(l); q.total += l; }
        q.desfase = (hash32(sem + ":" + i) % 1000) / 1000;
        return q;
      });
      mundo.decor = g.decor || op.decor || [];
      mundo.salida = g.salida || op.salida || null;
      defObjetos = {};
      fondoClave = "";
    }
    var CANT = (op.objetos && op.objetos.cantidad) || 0, PREFIJO = (op.objetos && op.objetos.prefijo) || "ob";
    function versionDe(id) {
      if (practica) { var po = practica.objetos[id]; return po ? po.v : 0; }
      var v = 0;
      for (var i = 0; i < srv.o.length; i++) if (srv.o[i].id === id) { v = srv.o[i].v; break; }
      return Math.max(v, vLocal[id] || 0);
    }
    function duenoDe(id) {
      var pe = pendientes[id];
      if (pe && pe.hasta > Date.now()) return pe.tipo === "tomar" ? yo.id || "yo" : "";
      if (practica) { var po = practica.objetos[id]; return po && po.d ? po.d : ""; }
      for (var i = 0; i < srv.o.length; i++) if (srv.o[i].id === id) return srv.o[i].d || "";
      return "";
    }
    function objeto(id, v) {
      var clave = id + "@" + v, d = defObjetos[clave];
      if (d) return d;
      var i = parseInt(id.slice(PREFIJO.length), 10) || 0;
      var sem = (ronda().semilla >>> 0) ^ Math.imul(i + 1, 2654435761) ^ Math.imul(v + 1, 40503);
      d = op.objetos && op.objetos.crear ? op.objetos.crear(i, v, rng(sem >>> 0), ayudas) : null;
      d = Object.assign({ x: M.ancho / 2, y: M.alto / 2, texto: "", forma: "orbe", color: ORO }, d || {});
      d.id = id; d.v = v; d.i = i;
      defObjetos[clave] = d;
      return d;
    }
    function posPeligro(p, t) {
      var u = ((t / 1000) * p.vel / Math.max(1, p.total) + p.desfase) % 2, d = (u < 1 ? u : 2 - u) * p.total;
      if (p.circular) d = (((t / 1000) * p.vel / Math.max(1, p.total) + p.desfase) % 1) * p.total;
      var s = 0;
      while (s < p.largos.length - 1 && d > p.largos[s]) { d -= p.largos[s]; s++; }
      var a = p.ruta[s], b = p.ruta[s + 1], k = p.largos[s] ? clamp(d / p.largos[s], 0, 1) : 0;
      var ida = p.circular || u < 1;
      return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), dx: (b[0] - a[0]) * (ida ? 1 : -1), dy: (b[1] - a[1]) * (ida ? 1 : -1) };
    }

    // ---- fondo pre-pintado (suelo, rieles, muros): una vez por ronda y tamaño
    function temaColores() {
      if (M.tema === "mina") return { suelo: "#2b2019", losa: ["#3a2c22", "#34271e", "#40312a", "#2f241c"], junta: "#1c140f", muro: "#5a4637", muroLuz: "#7a6250", muroOsc: "#32261d" };
      return { suelo: "#e9e7fb", losa: ["#f2f1fd", "#eceafb", "#f6f5fe", "#e6e4f8"], junta: "#d3cff1", muro: "#7b6cf0", muroLuz: "#a99cff", muroOsc: "#4f3fd1" };
    }
    function prepararFondo(k) {
      var clave = (ronda().semilla >>> 0) + "|" + k.toFixed(3) + "|" + mundo.muros.length;
      if (fondo && fondoClave === clave) return;
      fondoClave = clave;
      var px = Math.min(4096 / M.ancho, 4096 / M.alto, Math.sqrt(14e6 / (M.ancho * M.alto)), k);
      var c = fondo && fondo.c || document.createElement("canvas");
      c.width = Math.ceil(M.ancho * px); c.height = Math.ceil(M.alto * px);
      var g = c.getContext("2d"); g.setTransform(px, 0, 0, px, 0, 0);
      var tc = temaColores(), r = rng((ronda().semilla >>> 0) ^ 0xa11ce);
      g.fillStyle = tc.suelo; g.fillRect(0, 0, M.ancho, M.alto);
      var L = M.tema === "mina" ? 90 : 80;
      for (var y = 0; y < M.alto; y += L) for (var x = 0; x < M.ancho; x += L) {
        var off = M.tema === "mina" ? (Math.floor(y / L) % 2) * L / 2 : 0;
        g.fillStyle = tc.losa[Math.floor(r() * tc.losa.length)];
        rr(g, x - off + 3, y + 3, L - 6, L - 6, M.tema === "mina" ? 14 : 10); g.fill();
        if (M.tema === "mina" && r() < .35) { g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.arc(x - off + r() * L, y + r() * L, 2 + r() * 4, 0, 7); g.fill(); }
      }
      if (M.tema === "patio") { // constelación JMD tenue en el suelo
        g.strokeStyle = "rgba(90,73,214,.10)"; g.lineWidth = 3;
        for (var e = 0; e < 7; e++) { var cx = r() * M.ancho, cy = r() * M.alto; g.beginPath(); g.moveTo(cx, cy); for (var s = 0; s < 3; s++) { cx += 60 + r() * 80; cy += (r() - .5) * 120; g.lineTo(cx, cy); } g.stroke(); }
      }
      // rieles de los peligros que van por riel
      mundo.peligros.forEach(function (p) {
        if (p.tipo !== "vagoneta") return;
        for (var s = 0; s < p.ruta.length - 1; s++) {
          var a = p.ruta[s], b = p.ruta[s + 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), l = p.largos[s];
          g.save(); g.translate(a[0], a[1]); g.rotate(ang);
          g.fillStyle = "#4a3426"; for (var d = 0; d <= l; d += 26) g.fillRect(d - 4, -20, 8, 40);
          g.fillStyle = "#9aa3ad"; g.fillRect(-6, -15, l + 12, 4); g.fillRect(-6, 11, l + 12, 4);
          g.restore();
        }
      });
      // decoración del autor: [{tipo:"cristal"|"farol"|"roca"|"planta", x, y, s}]
      mundo.decor.forEach(function (d) { pintarDecor(g, d); });
      if (typeof op.fondo === "function") { try { op.fondo(g, ayudas, rng((ronda().semilla >>> 0) ^ 0xf0), mundo); } catch (err) { console.error(err); } }
      mundo.muros.forEach(function (m) {
        g.fillStyle = "rgba(0,0,0,.25)"; rr(g, m.x + 4, m.y + 8, m.w, m.h, 12); g.fill();
        g.fillStyle = tc.muro; rr(g, m.x, m.y, m.w, m.h, 12); g.fill();
        g.fillStyle = tc.muroLuz; rr(g, m.x + 4, m.y + 4, m.w - 8, Math.min(14, m.h / 3), 7); g.fill();
        g.strokeStyle = tc.muroOsc; g.lineWidth = 3; rr(g, m.x, m.y, m.w, m.h, 12); g.stroke();
        if (M.tema === "mina") { g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 2; for (var q = 0; q < m.w * m.h / 2600; q++) { var qx = m.x + 10 + r() * (m.w - 20), qy = m.y + 18 + r() * (m.h - 26); g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx + 8, qy + 5); g.stroke(); } }
      });
      // viñeta
      var vg = g.createRadialGradient(M.ancho / 2, M.alto / 2, Math.min(M.ancho, M.alto) * .35, M.ancho / 2, M.alto / 2, Math.max(M.ancho, M.alto) * .75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, M.tema === "mina" ? "rgba(0,0,0,.5)" : "rgba(60,52,140,.12)");
      g.fillStyle = vg; g.fillRect(0, 0, M.ancho, M.alto);
      fondo = { c: c, px: px };
    }
    function pintarDecor(g, d) {
      var s = d.s || 1;
      g.save(); g.translate(d.x, d.y); g.scale(s, s);
      if (d.tipo === "cristal") {
        var col = d.color || "#7fd8ff";
        var gl = g.createRadialGradient(0, -10, 2, 0, -10, 44); gl.addColorStop(0, rgba(col, .35)); gl.addColorStop(1, rgba(col, 0)); g.fillStyle = gl; g.fillRect(-44, -54, 88, 88);
        [[-8, 0, 7, 26], [3, 2, 8, 34], [12, 2, 6, 20]].forEach(function (q) { g.fillStyle = col; g.beginPath(); g.moveTo(q[0] - q[2] / 2, q[1]); g.lineTo(q[0], q[1] - q[3]); g.lineTo(q[0] + q[2] / 2, q[1]); g.closePath(); g.fill(); g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.moveTo(q[0] - q[2] / 4, q[1] - 2); g.lineTo(q[0], q[1] - q[3] + 4); g.lineTo(q[0], q[1] - 2); g.closePath(); g.fill(); });
      } else if (d.tipo === "farol") {
        var lz = g.createRadialGradient(0, 0, 4, 0, 0, 120); lz.addColorStop(0, "rgba(255,200,90,.34)"); lz.addColorStop(1, "rgba(255,200,90,0)"); g.fillStyle = lz; g.fillRect(-120, -120, 240, 240);
        g.fillStyle = "#3b2a1e"; g.fillRect(-3, -6, 6, 16); g.fillStyle = "#ffd27a"; rr(g, -8, -22, 16, 18, 5); g.fill(); g.strokeStyle = "#3b2a1e"; g.lineWidth = 2.5; rr(g, -8, -22, 16, 18, 5); g.stroke();
      } else if (d.tipo === "roca") {
        g.fillStyle = "#4b3b2f"; g.beginPath(); g.ellipse(0, 0, 22, 14, 0, 0, 7); g.fill(); g.fillStyle = "#5e4b3c"; g.beginPath(); g.ellipse(-4, -4, 13, 8, 0, 0, 7); g.fill();
      } else if (d.tipo === "planta") {
        g.fillStyle = "#2fa35f"; for (var i = 0; i < 5; i++) { g.save(); g.rotate(-1 + i * .5); g.beginPath(); g.ellipse(0, -14, 5, 15, 0, 0, 7); g.fill(); g.restore(); }
      } else if (d.tipo === "texto") {
        g.fillStyle = d.color || "rgba(255,255,255,.4)"; g.font = "800 " + (d.px || 28) + "px " + FUENTE; g.textAlign = "center"; g.fillText(d.texto || "", 0, 0);
      }
      g.restore();
    }

    // ---- objetos: forma por defecto
    function pintarObjeto(g, d, x, y, t, chico) {
      var s = chico ? .62 : 1;
      if (typeof d.pintar === "function") { d.pintar(g, x, y, s, t, d); return; }
      g.save(); g.translate(x, y); g.scale(s, s);
      var flota = REDUCIDO || chico ? 0 : Math.sin(t * 2.6 + d.i) * 3;
      g.translate(0, flota);
      if (!chico) { g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(0, 16 - flota, 16, 5, 0, 0, 7); g.fill(); }
      if (d.forma === "pepita") {
        var gr = g.createLinearGradient(-16, -14, 16, 14); gr.addColorStop(0, "#fff0b0"); gr.addColorStop(.45, d.color || "#f2c14e"); gr.addColorStop(1, "#a06b00");
        g.fillStyle = gr; g.strokeStyle = "#6b4700"; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(-16, 2); g.lineTo(-10, -11); g.lineTo(2, -14); g.lineTo(14, -7); g.lineTo(17, 5); g.lineTo(8, 13); g.lineTo(-7, 12); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.moveTo(-8, -6); g.lineTo(-2, -10); g.lineTo(0, -5); g.closePath(); g.fill();
        if (!REDUCIDO) { var br = (Math.sin(t * 4 + d.i * 1.7) + 1) / 2; g.globalAlpha = br; g.fillStyle = "#fff"; estrella(g, 10, -10, 4.5); g.globalAlpha = 1; }
      } else if (d.forma === "gema") {
        g.fillStyle = d.color || "#38b2e6"; g.strokeStyle = TINTA; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -16); g.lineTo(14, -4); g.lineTo(0, 15); g.lineTo(-14, -4); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.moveTo(0, -16); g.lineTo(5, -4); g.lineTo(-5, -4); g.closePath(); g.fill();
      } else if (d.forma === "carta") {
        g.fillStyle = "#fffdf6"; g.strokeStyle = TINTA; g.lineWidth = 2; rr(g, -13, -17, 26, 32, 4); g.fill(); g.stroke();
        g.fillStyle = d.color || "#6a58e8"; g.fillRect(-8, -10, 16, 3); g.fillRect(-8, -4, 11, 3); g.fillRect(-8, 2, 14, 3);
      } else {
        var go = g.createRadialGradient(-5, -6, 2, 0, 0, 16); go.addColorStop(0, "#ffffff"); go.addColorStop(.3, d.color || ORO); go.addColorStop(1, mezclar(d.color || ORO, "#000000", .35));
        g.fillStyle = go; g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill(); g.strokeStyle = TINTA; g.lineWidth = 2; g.stroke();
      }
      g.restore();
    }

    // ---- peligros
    function pintarPeligro(g, p, pos, t) {
      g.save(); g.translate(pos.x, pos.y);
      var giro = Math.atan2(pos.dy, pos.dx);
      if (p.tipo === "vagoneta") {
        g.rotate(Math.abs(Math.cos(giro)) > .5 ? 0 : Math.PI / 2);
        g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 18, 30, 8, 0, 0, 7); g.fill();
        g.fillStyle = "#2b2b33"; [-16, 16].forEach(function (wx) { g.beginPath(); g.arc(wx, 14, 7, 0, 7); g.fill(); });
        g.fillStyle = "#8a5a2b"; g.strokeStyle = "#3b2414"; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(-28, -12); g.lineTo(28, -12); g.lineTo(22, 12); g.lineTo(-22, 12); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = "#b9c0c8"; g.fillRect(-28, -14, 56, 5);
        g.fillStyle = "#6f6a66"; g.beginPath(); g.arc(-10, -16, 9, Math.PI, 0); g.arc(6, -15, 10, Math.PI, 0); g.fill();
        g.fillStyle = ORO; g.beginPath(); g.arc(-3, -20, 3, 0, 7); g.fill();
      } else if (p.tipo === "roca") {
        g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 18, 24, 7, 0, 0, 7); g.fill();
        g.rotate(REDUCIDO ? 0 : t * 3);
        g.fillStyle = "#857565"; g.strokeStyle = "#3e342b"; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 21, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = "#5c4f43"; g.beginPath(); g.moveTo(-10, -6); g.lineTo(0, 2); g.lineTo(8, -8); g.moveTo(2, 2); g.lineTo(4, 14); g.stroke();
      } else {
        var al = REDUCIDO ? 0 : Math.sin(t * 6) * 3;
        g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(0, 22, 18, 5, 0, 0, 7); g.fill();
        g.translate(0, al - 6);
        g.fillStyle = "#e3262e"; g.strokeStyle = TINTA; g.lineWidth = 2.4; rr(g, -18, -10, 36, 20, 9); g.fill(); g.stroke();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(-6, 0, 4, 0, 7); g.arc(6, 0, 4, 0, 7); g.fill();
        g.fillStyle = TINTA; g.beginPath(); g.arc(-6 + Math.cos(giro) * 1.5, Math.sin(giro) * 1.5, 2, 0, 7); g.arc(6 + Math.cos(giro) * 1.5, Math.sin(giro) * 1.5, 2, 0, 7); g.fill();
        g.strokeStyle = TINTA; g.lineWidth = 2; var hel = REDUCIDO ? 10 : 6 + Math.abs(Math.sin(t * 30)) * 8;
        g.beginPath(); g.moveTo(-14, -12); g.lineTo(-14, -16); g.moveTo(14, -12); g.lineTo(14, -16); g.moveTo(-14 - hel, -17); g.lineTo(-14 + hel, -17); g.moveTo(14 - hel, -17); g.lineTo(14 + hel, -17); g.stroke();
      }
      g.restore();
    }

    // ---- zonas
    function pintarZona(g, z, t, resalta) {
      if (typeof z.pintar === "function") { z.pintar(g, z, t, resalta); return; }
      var pulso = resalta && !REDUCIDO ? (Math.sin(t * 5) + 1) / 2 : 0;
      g.fillStyle = rgba(z.color, .16 + pulso * .12); rr(g, z.x, z.y, z.w, z.h, 18); g.fill();
      g.setLineDash([14, 10]); g.lineDashOffset = REDUCIDO ? 0 : -t * 20; g.strokeStyle = z.color; g.lineWidth = resalta ? 5 : 3.5; rr(g, z.x, z.y, z.w, z.h, 18); g.stroke(); g.setLineDash([]);
      if (z.icono) { g.font = "40px " + FUENTE; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(z.icono, z.x + z.w / 2, z.y + z.h / 2 + 4); }
    }

    // ---- cámara y tamaño
    function medir() {
      raiz.style.setProperty("--aj-cab", marco.offsetHeight + "px");
      var r = esc.getBoundingClientRect();
      vista.w = Math.max(200, Math.floor(r.width)); vista.h = Math.max(200, Math.floor(r.height));
      vista.dpr = Math.min(calidad.dprMax, window.devicePixelRatio || 1);
      lienzo.width = Math.round(vista.w * vista.dpr); lienzo.height = Math.round(vista.h * vista.dpr);
      lienzo.style.width = vista.w + "px"; lienzo.style.height = vista.h + "px";
      var ajuste = Math.min(vista.w / M.ancho, vista.h / M.alto);
      var espectador = !yo.dentro && !practica;
      cam.s = ajuste >= .5 || espectador ? ajuste : Math.max(ajuste, Math.min(.85, Math.max(vista.w, vista.h) / 1050));
      var antes = cam.todo;
      cam.todo = cam.s === ajuste;
      if (antes !== cam.todo) cam.saltar = true; // de espectador a jugador: la cámara salta, no viaja
      if (cam.todo) { cam.x = (M.ancho - vista.w / cam.s) / 2; cam.y = (M.alto - vista.h / cam.s) / 2; }
    }
    var medirT = 0;
    function medirLuego() { clearTimeout(medirT); medirT = setTimeout(medir, 60); }
    window.addEventListener("resize", medirLuego);
    if (window.ResizeObserver) { try { new ResizeObserver(medirLuego).observe(esc); } catch (e) {} }
    var hoja = document.querySelector("link[data-arena-jmd]");
    if (hoja) hoja.addEventListener("load", medirLuego);
    function seguirCamara(dt) {
      if (cam.todo) return;
      var vw = vista.w / cam.s, vh = vista.h / cam.s, mg = TACTIL ? 110 : 0; // en el celular, margen para que el joystick no tape al robot
      var tx = clamp(P.x - vw / 2, -mg, Math.max(-mg, M.ancho - vw + mg)), ty = clamp(P.y - vh / 2, -40, Math.max(-40, M.alto - vh + mg));
      if (M.ancho < vw) tx = (M.ancho - vw) / 2;
      if (M.alto < vh) ty = (M.alto - vh) / 2;
      var k = REDUCIDO || cam.saltar ? 1 : 1 - Math.exp(-dt * 7);
      cam.saltar = false;
      cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k);
    }
    function aPantalla(x, y) { return { x: (x - cam.x) * cam.s, y: (y - cam.y) * cam.s }; }
    function aMundo(x, y) { return { x: x / cam.s + cam.x, y: y / cam.s + cam.y }; }

    // ---- entrada: teclado, puntero, joystick
    var MAPA = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    function escribiendo(e) { var t = e.target; return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable); }
    document.addEventListener("keydown", function (e) {
      if (escribiendo(e)) return;
      Sonido.despertar();
      if (quiz) {
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= quiz.opciones.length) { e.preventDefault(); responderQuiz(n - 1); }
        else if (e.key === "Escape") { e.preventDefault(); cerrarQuiz(true); }
        return;
      }
      if (!capaFin.hidden || !capaEntrada.hidden) return;
      if (MAPA[e.code]) { teclas[e.code] = true; P.objetivo = null; e.preventDefault(); return; }
      if (e.key === " " || e.code === "Space") { e.preventDefault(); if (P.carga) soltarCarga(false, true); return; }
      var k = parseInt(e.key, 10);
      if (k >= 1 && k <= EMOTES.length) { e.preventDefault(); lanzarEmote(EMOTES[k - 1].id); return; }
      if (e.key === "Escape") { ruedaEmotes.hidden = true; lupa.hidden = true; }
    });
    document.addEventListener("keyup", function (e) { if (MAPA[e.code]) teclas[e.code] = false; });
    window.addEventListener("blur", function () { teclas = {}; });
    lienzo.addEventListener("pointerdown", function (e) {
      Sonido.despertar();
      try { window.focus(); lienzo.focus({ preventScroll: true }); } catch (err) {}
      ruedaEmotes.hidden = true;
      if (!yo.dentro && !practica) return;
      var r = lienzo.getBoundingClientRect(), w = aMundo(e.clientX - r.left, e.clientY - r.top);
      P.objetivo = { x: clamp(w.x, R_JUG, M.ancho - R_JUG), y: clamp(w.y, R_JUG, M.alto - R_JUG), t: performance.now() };
    });
    function joyMover(e) {
      var r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width / 2;
      var dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / rad);
      joy.x = dx / d * m; joy.y = dy / d * m;
      if (m < .18) { joy.x = 0; joy.y = 0; }
      joyPomo.style.transform = "translate(" + (joy.x * rad * .55).toFixed(1) + "px," + (joy.y * rad * .55).toFixed(1) + "px)";
    }
    joyEl.addEventListener("pointerdown", function (e) { Sonido.despertar(); joy.activo = true; joy.id = e.pointerId; P.objetivo = null; try { joyEl.setPointerCapture(e.pointerId); } catch (err) {} joyMover(e); e.preventDefault(); });
    joyEl.addEventListener("pointermove", function (e) { if (joy.activo && e.pointerId === joy.id) joyMover(e); });
    function joySuelta(e) { if (e.pointerId !== joy.id) return; joy.activo = false; joy.x = 0; joy.y = 0; joyPomo.style.transform = ""; }
    joyEl.addEventListener("pointerup", joySuelta); joyEl.addEventListener("pointercancel", joySuelta);

    // ---- red: SSE y POST
    function conectar() {
      if (!conRed || !window.EventSource) { conRed = false; pintarEntrada(); return; }
      try { fuente = new EventSource(BASE + "/patio/stream?escena=" + encodeURIComponent(ESCENA)); } catch (e) { conRed = false; pintarEntrada(); return; }
      fuente.addEventListener("hola", function (ev) {
        try { hola = JSON.parse(ev.data); } catch (e) { return; }
        conectado = true; fallosRed = 0;
        yo.staff = !!hola.staff; yo.nombre = hola.nombre || yo.nombre;
        if (hola.yo) { yo.id = hola.yo; delete remotos[yo.id]; }
        cajaStaff.hidden = !yo.staff; if (yo.staff) detReglas.open = false;
        pintarEntrada();
      });
      fuente.addEventListener("instante", function (ev) {
        var d; try { d = JSON.parse(ev.data); } catch (e) { return; }
        aplicarInstante(d);
      });
      fuente.onerror = function () {
        conectado = false; fallosRed++;
        if (fuente.readyState === 2) { // cerrado: 401, 404 o la API no tiene la sala
          if (!yo.dentro) { conRed = false; pintarEntrada(); }
          else { toast("Se cortó la conexión con la clase. Reintentando…", "mal", 3000); setTimeout(conectar, 3000); }
        }
      };
    }
    function aplicarInstante(d) {
      var llegada = Date.now();
      desfases.push(d.t - llegada); if (desfases.length > 24) desfases.shift();
      desfase = Math.max.apply(null, desfases); // el más rápido en llegar es el más cercano a la hora real
      var anterior = srv.r;
      srv = d; srv.o = d.o || []; srv.c = d.c || {}; srv.tb = d.tb || []; srv.j = d.j || [];
      // jugadores remotos
      var vivos = {};
      srv.j.forEach(function (j) {
        if (j.id === yo.id && yo.id) { delete remotos[j.id]; return; } // yo no soy un remoto (ni mi fantasma)
        vivos[j.id] = true;
        var r = remotos[j.id];
        if (!r) { r = remotos[j.id] = { id: j.id, buf: [], x: j.x, y: j.y, px: j.x, py: j.y, fase: 0, vel: 0, tag: null, tagClave: "" }; }
        r.n = j.n; r.c = j.c; r.a = j.a || ""; r.d = j.d; r.m = j.m || ""; r.k = j.k || ""; r.p = j.p; r.q = j.q;
        if (j.e && j.es && j.es !== r.es) { r.es = j.es; r.e = j.e; r.eT = performance.now(); }
        var ult = r.buf[r.buf.length - 1];
        if (!ult || ult.x !== j.x || ult.y !== j.y || d.t - ult.t > 250) r.buf.push({ t: d.t, x: j.x, y: j.y });
        if (r.buf.length > 10) r.buf.shift();
        if (Math.hypot(j.x - r.x, j.y - r.y) > 400) { r.x = r.px = j.x; r.y = r.py = j.y; r.buf = [{ t: d.t, x: j.x, y: j.y }]; }
      });
      Object.keys(remotos).forEach(function (id) { if (!vivos[id]) delete remotos[id]; });
      // eventos de los demás
      (d.ev || []).forEach(function (e) { if (e.de !== yo.id) eventoAjeno(e); });
      // ¿lo mío sigue siendo mío?
      if (!practica && P.carga && yo.dentro) {
        var pe = pendientes[P.carga];
        if (!(pe && pe.hasta > Date.now())) {
          var dueno = duenoDe(P.carga);
          if (dueno !== yo.id) { P.carga = ""; cerrarCarta(); toast("¡Te lo ganaron! Busca otro.", "", 2000); }
        }
      }
      if (practica && srv.r.estado === "jugando" && srv.r.n !== ultimaRonda && ultimaRonda !== -1) {
        // el instructor abrió una ronda: la práctica termina y entras a la de todos
        practica = null; cerrarFin(); ultimaRonda = -2;
        if (!yo.dentro) { capaEntrada.hidden = true; entrar(); }
        medir();
      }
      if (!practica) revisarRonda(anterior);
      pintarTabla();
    }
    function revisarRonda(anterior) {
      var r = srv.r;
      if (r.n !== ultimaRonda) {
        var primera = ultimaRonda === -1;
        ultimaRonda = r.n;
        nuevaRonda(primera);
        if (!primera && r.estado === "jugando") {
          banner.hidden = true; mostrarAnuncio("¡A jugar!", Math.round(r.duracion_s / 60 * 10) / 10 + " min · " + (op.anuncio || "todos a la vez"));
          Sonido.tocar("inicio");
        }
      }
      if (r.estado === "final" && anterior && anterior.estado === "jugando" && anterior.n === r.n) { Sonido.tocar("fin"); mostrarAnuncio("¡Fin!", ""); }
      if (r.estado === "final" && finMostrado !== r.n && yo.dentro) { finMostrado = r.n; setTimeout(mostrarFin, 900); }
      if (r.estado !== "final" && !capaFin.hidden && !practica) cerrarFin();
    }
    function nuevaRonda() {
      generar();
      P.puntos = 0; P.carga = ""; cerrarCarta(); cerrarQuiz(false); pendientes = {}; vLocal = {};
      stats = { aciertos: 0, fallos: 0, entregas: 0, bonus: 0, golpes: 0, puntos: 0 };
      if (op.alRonda) try { op.alRonda(ronda(), api); } catch (e) { console.error(e); }
      if (yo.dentro) { var s = salida(); P.x = s.x; P.y = s.y; envio.firma = ""; }
      metaCelebrada = -1;
    }
    function salida() {
      var r = rng((Date.now() ^ hash32(yo.id || "yo")) >>> 0);
      return mundo.salida ? ayudas.lugarLibre(r, 26, mundo.salida) : ayudas.lugarLibre(r, 26);
    }
    function enviar(extra, forzar) {
      if (!conRed || practica || !yo.dentro) return Promise.resolve(null);
      var ahora = performance.now();
      if (ahora < envio.frenoHasta && !forzar) return Promise.resolve(null);
      var cuerpo = { escena: ESCENA, accion: "estado", x: Math.round(P.x * 10) / 10, y: Math.round(P.y * 10) / 10, dir: P.dir, anim: P.anim, carga: P.carga, puntos: P.puntos, avatar: { color: avatar.color, accesorio: avatar.accesorio } };
      if (envio.emote) { cuerpo.emote = envio.emote; envio.emote = ""; }
      if (extra) Object.assign(cuerpo, extra);
      envio.vuelo = true; envio.ultimo = ahora;
      return pedir(BASE + "/patio", cuerpo).then(function (r) {
        envio.vuelo = false;
        if (r.status === 429) envio.frenoHasta = performance.now() + 600;
        if (r.ok && r.datos.yo) { yo.id = r.datos.yo; delete remotos[yo.id]; }
        if (r.status === 409 && !r.ok) toast((r.datos.error && r.datos.error.message) || "No se pudo entrar", "mal", 4000);
        return r;
      });
    }
    function latir(ahora) {
      if (!conRed || practica || !yo.dentro || envio.vuelo) return;
      var firma = Math.round(P.x) + "," + Math.round(P.y) + "," + P.dir + "," + P.anim + "," + P.carga + "," + P.puntos + "," + avatar.color + avatar.accesorio + envio.emote;
      var desde = ahora - envio.ultimo;
      if ((firma !== envio.firma && desde >= 100) || desde >= 3000) { envio.firma = firma; enviar(); }
    }
    function accion(cuerpo) {
      if (practica || !conRed) return Promise.resolve(local(cuerpo));
      cuerpo.escena = ESCENA;
      return pedir(BASE + "/patio", cuerpo);
    }
    function staff(acc, extra) {
      var c = Object.assign({ accion: acc }, extra || {});
      if (acc === "iniciar" && op.meta && op.meta.fija) c.meta = op.meta.fija;
      c.escena = ESCENA;
      pedir(BASE + "/patio", c).then(function (r) { if (!r.ok) toast((r.datos.error && r.datos.error.message) || "No se pudo: ¿entraste como instructor?", "mal"); });
    }
    // la sala en local (práctica o sin red): las mismas reglas que live_patio.go
    function local(c) {
      var pr = practica; if (!pr) return { ok: false, status: 0, datos: {} };
      if (c.accion === "tomar") {
        var o = pr.objetos[c.objeto] || (pr.objetos[c.objeto] = { v: 0, d: "" });
        if (o.v !== c.v || (o.d && o.d !== "yo") || pr.r.estado === "final") return { ok: false, status: 409, datos: {} };
        o.d = "yo"; return { ok: true, status: 200, datos: { objeto: { id: c.objeto, v: o.v, d: "yo" } } };
      }
      if (c.accion === "soltar") { var q = pr.objetos[c.objeto]; if (!q) return { ok: false, status: 409, datos: {} }; q.d = ""; if (c.consumir) q.v++; return { ok: true, status: 200, datos: { objeto: { id: c.objeto, v: q.v } } }; }
      if (c.accion === "sumar") { pr.contadores[c.contador] = Math.max(0, (pr.contadores[c.contador] || 0) + c.valor); return { ok: true, status: 200, datos: { valor: pr.contadores[c.contador] } }; }
      return { ok: true, status: 200, datos: {} };
    }

    // ---- entrar, practicar, salir
    function entrar() {
      Sonido.despertar();
      guardar("avatar", avatar);
      capaEntrada.hidden = true;
      if (practica) salirPractica(true);
      yo.dentro = true;
      var s = salida(); P.x = s.x; P.y = s.y;
      medir(); cam.saltar = true;
      if (conRed) enviar(null, true).then(function (r) {
        if (r && r.status === 409) { yo.dentro = false; pintarEntrada(); capaEntrada.hidden = false; }
      });
      bJugarStaff.hidden = true;
      pintarBanner();
      setTimeout(function () { try { lienzo.focus({ preventScroll: true }); } catch (e) {} }, 30);
      toast(TACTIL ? "Usa el joystick o toca el mapa para moverte" : "Muévete con WASD o las flechas, o haz clic en el mapa", "", 3200);
    }
    function practicar() {
      Sonido.despertar();
      guardar("avatar", avatar);
      if (yo.dentro && conRed) pedir(BASE + "/patio", { escena: ESCENA, accion: "salir" });
      var d = op.duracionPractica || Math.min(DUR, 120), ahora = ahoraSrv();
      practica = { r: { n: -1 - Math.floor(Math.random() * 1e6), estado: "jugando", semilla: (Math.random() * 4294967295) >>> 0, inicio_ms: ahora, fin_ms: ahora + d * 1000, duracion_s: d }, objetos: {}, contadores: {} };
      capaEntrada.hidden = true; cerrarFin();
      nuevaRonda();
      var s = salida(); P.x = s.x; P.y = s.y;
      medir(); cam.saltar = true; pintarBanner(); pintarTabla();
      mostrarAnuncio("Práctica", d + " s · a tu ritmo");
      Sonido.tocar("inicio");
      setTimeout(function () { try { lienzo.focus({ preventScroll: true }); } catch (e) {} }, 30);
    }
    function salirPractica(volver) {
      practica = null; ultimaRonda = -1;
      revisarRonda(null);
      if (yo.dentro) enviar(null, true);
      else if (volver) { pintarEntrada(); capaEntrada.hidden = false; }
      medir(); pintarBanner(); pintarTabla();
    }
    window.addEventListener("pagehide", function () { if (yo.dentro && conRed && !practica) pedir(BASE + "/patio", { escena: ESCENA, accion: "salir" }, true); });

    // ---- la capa de entrada (elige tu robot)
    var vistaPrevia = null;
    function pintarEntrada() {
      capaEntrada.textContent = "";
      var caja = el("div", "aj-cajon", capaEntrada);
      var cab = el("div", "aj-cajon-cab", caja);
      vistaPrevia = el("div", "aj-previa", cab);
      var txt = el("div", "", cab);
      var eb = el("p", "aj-eyebrow", txt, op.curso || "JMD Learning");
      if (op.sesion) el("span", "aj-ancho", eb, " · " + op.sesion);
      el("h2", "", txt, op.titulo || "Arena JMD");
      if (op.subtitulo) el("p", "aj-sub", txt, op.subtitulo);
      var pasos = el("ol", "aj-pasos", caja);
      (op.reglas || []).slice(0, 3).forEach(function (r, i) { var li = el("li", "", pasos); el("i", "", li, String(i + 1)); el("span", "", li, r); });
      el("p", "aj-etq", caja, "Tu robot");
      var colores = el("div", "aj-colores", caja); colores.setAttribute("role", "radiogroup"); colores.setAttribute("aria-label", "Color de tu robot");
      COLORES.forEach(function (c, i) {
        var b = boton("aj-color", colores, "", function () { avatar.color = i; pintarEntrada(); });
        b.style.setProperty("--c", c.c); b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(avatar.color === i)); b.setAttribute("aria-label", c.nombre); b.title = c.nombre;
      });
      var accs = el("div", "aj-accs", caja); accs.setAttribute("role", "radiogroup"); accs.setAttribute("aria-label", "Accesorio");
      ACCESORIOS.forEach(function (a) {
        var b = boton("aj-acc", accs, "", function () { avatar.accesorio = a.id; pintarEntrada(); });
        b.appendChild(robotCanvas(40, { color: avatar.color, accesorio: a.id }));
        el("span", "", b, a.nombre);
        b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String((avatar.accesorio || "") === a.id));
      });
      var bots = el("div", "aj-botones", caja);
      var nombre = yo.nombre ? " como " + yo.nombre : "";
      if (conRed) {
        if (yo.staff && !yo.dentro) {
          boton("aj-btn fuerte", bots, "Mirar la sala", function () { capaEntrada.hidden = true; medir(); pintarBanner(); });
          boton("aj-btn", bots, "Jugar yo también", entrar);
        } else boton("aj-btn fuerte", bots, "Entrar a jugar" + nombre, entrar);
      }
      boton("aj-btn" + (conRed ? "" : " fuerte"), bots, "Practicar solo", practicar);
      el("p", "aj-nota", caja, conRed ? (conectado ? "Hasta 40 a la vez. Llegaste tarde: entra igual o practica a tu ritmo." : "Conectando con la clase…") : "Sin conexión con la clase: practicas en tu pantalla y nadie más te ve.");
      previa();
    }
    function previa() {
      if (!vistaPrevia) return;
      vistaPrevia.textContent = "";
      vistaPrevia.appendChild(robotCanvas(96, { color: avatar.color, accesorio: avatar.accesorio, anim: "feliz" }));
    }

    // ---- recoger, entregar, soltar
    function intentarTomar() {
      if (P.carga || P.aturdido > performance.now() || P.ocupado || quiz || !jugando()) return;
      if (!yo.dentro && !practica) return;
      var mejor = null, md = 40;
      for (var i = 0; i < CANT; i++) {
        var id = PREFIJO + i, v = versionDe(id);
        if (duenoDe(id)) continue;
        var d = objeto(id, v), dist = Math.hypot(d.x - P.x, d.y - P.y + 10);
        if (dist < md) { md = dist; mejor = d; }
      }
      if (!mejor) return;
      var ob = mejor;
      P.carga = ob.id; P.ocupado = true;
      pendientes[ob.id] = { tipo: "tomar", hasta: Date.now() + 1500 };
      Sonido.tocar("tomar");
      abrirCarta(ob);
      accion({ accion: "tomar", objeto: ob.id, v: ob.v }).then(function (r) {
        P.ocupado = false; delete pendientes[ob.id];
        if (r.ok) { if (op.alTomar) try { op.alTomar(ob, api); } catch (e) { console.error(e); } return; }
        if (P.carga === ob.id) { P.carga = ""; cerrarCarta(); }
        toast(r.status === 409 ? "¡Te lo ganaron! Busca otro." : "No se pudo recoger: reintenta", "", 1800);
      });
    }
    function soltarCarga(consumir, aMano) {
      var id = P.carga; if (!id) return;
      P.carga = ""; cerrarCarta();
      pendientes[id] = { tipo: "soltar", hasta: Date.now() + 1500 };
      if (aMano) Sonido.tocar("soltar");
      if (consumir && !practica) vLocal[id] = versionDe(id) + 1;
      accion({ accion: "soltar", objeto: id, consumir: !!consumir }).then(function () { delete pendientes[id]; });
      if (aMano) toast("Lo dejaste: volvió a su lugar en el mapa.", "", 1800);
    }
    function zonaEn(x, y) {
      for (var i = 0; i < mundo.zonas.length; i++) { var z = mundo.zonas[i]; if (z.entrega !== false && x > z.x && x < z.x + z.w && y > z.y && y < z.y + z.h) return z; }
      return null;
    }
    function intentarEntregar() {
      if (!P.carga || P.ocupado || quiz) return;
      var z = zonaEn(P.x, P.y); if (!z) return;
      var ob = objeto(P.carga, versionDe(P.carga));
      var res = { ok: true, puntos: 10 };
      if (typeof op.entregar === "function") { try { res = op.entregar(ob, z, api) || res; } catch (e) { console.error(e); } }
      if (res.rechazar) { if (!P.avisoRechazo || performance.now() - P.avisoRechazo > 2500) { P.avisoRechazo = performance.now(); toast(res.mensaje || "Aquí no va", "", 2000); } return; }
      soltarCarga(true, false);
      var pts = Math.max(0, res.puntos | 0);
      stats.entregas++;
      if (res.ok) { stats.aciertos++; Sonido.tocar("bien"); festejar(); } else { stats.fallos++; Sonido.tocar("mal"); P.triste = performance.now() + 900; }
      if (pts) sumarPuntos(pts, P.x, P.y - 100, res.ok ? ORO : "#9fb4ff");
      if (pts && op.meta && op.meta.contador && res.meta !== false) sumarMeta(res.meta != null ? res.meta : pts);
      if (res.explicacion || res.real) mostrarLupa({ tipo: res.ok ? "bien" : "mal", icono: res.ok ? "✨" : "🔍", titulo: res.titulo || (res.ok ? "¡Bien!" : "Casi"), texto: res.explicacion, real: res.real, ms: res.ok ? 4500 : 8000 });
      else if (res.titulo) toast(res.titulo, res.ok ? "bien" : "mal", 2200);
      var texto = res.feed || (res.ok ? "acertó en " + (z.nombre || "la zona") : "aprendió en " + (z.nombre || "la zona"));
      emitir("entrega", texto, pts, P.x, P.y - 100);
      agregarFeed(yo.nombre || "Tú", texto, avatar.color, true);
      if (res.bonus && res.ok) setTimeout(function () { abrirQuiz(res.bonus); }, REDUCIDO ? 150 : 450);
      if (op.alEntregar) try { op.alEntregar(ob, z, res, api); } catch (e) { console.error(e); }
    }
    function sumarPuntos(n, x, y, color) {
      P.puntos = Math.min(1000000, P.puntos + n); stats.puntos = P.puntos;
      popup(x == null ? P.x : x, y == null ? P.y - 100 : y, "+" + n + ((op.meta && op.meta.unidad) ? " " + op.meta.unidad : ""), color || ORO);
      pintarTabla();
    }
    function sumarMeta(n) {
      var c = op.meta.contador;
      accion({ accion: "sumar", contador: c, valor: clamp(Math.round(n), -100, 100) }).then(function (r) {
        if (r.ok && practica) { practica.contadores[c] = r.datos.valor; }
        else if (r.ok) { srv.c[c] = r.datos.valor; }
      });
    }
    function emitir(tipo, texto, valor, x, y) {
      if (practica || !conRed || !yo.dentro) return;
      pedir(BASE + "/patio", { escena: ESCENA, accion: "evento", tipo: tipo, texto: String(texto || "").slice(0, 80), valor: valor | 0, ex: x, ey: y });
    }
    function eventoAjeno(e) {
      var r = remotos[e.de], col = r ? colorDe(r.c) : "#ffffff";
      if (e.tipo === "entrega") {
        if (e.valor && e.x != null) popup(e.x, e.y, "+" + e.valor + ((op.meta && op.meta.unidad) ? " " + op.meta.unidad : ""), col);
        agregarFeed(r ? r.n : "Alguien", e.texto, r ? r.c : 0, false);
      }
      if (op.alEvento) try { op.alEvento(e, api); } catch (err) { console.error(err); }
    }
    function agregarFeed(nombre, texto, color, mio) {
      feed.unshift({ n: nombre, t: texto, c: color, mio: mio });
      feed = feed.slice(0, 6);
      feedEl.textContent = "";
      feed.forEach(function (f) { var li = el("li", f.mio ? "mio" : "", feedEl); var i = el("i", "", li); i.style.background = colorDe(f.c); el("b", "", li, f.n); el("span", "", li, " " + f.t); });
    }
    function festejar() {
      P.festeja = performance.now() + 1200;
      if (REDUCIDO) return;
      for (var i = 0; i < 14; i++) particulas.push({ x: P.x, y: P.y - 50, vx: (Math.random() - .5) * 260, vy: -120 - Math.random() * 220, vida: 1, c: i % 3 ? ORO : colorDe(avatar.color), r: 2.5 + Math.random() * 3 });
      if (particulas.length > 160) particulas.splice(0, particulas.length - 160);
    }
    function popup(x, y, texto, color) {
      popups.push({ x: x, y: y, t: texto, c: color || ORO, nace: performance.now() });
      if (popups.length > 24) popups.shift();
    }
    function lanzarEmote(id) {
      if (!yo.dentro && !practica) return;
      P.emote = id; P.emoteT = performance.now(); envio.emote = id;
      Sonido.tocar("emote");
      if (conRed && !practica) enviar(null, true);
    }

    // ---- la carta de lo que llevas
    function abrirCarta(ob) {
      var t = typeof op.tarjeta === "function" ? op.tarjeta(ob, api) : { titulo: ob.texto };
      carta.textContent = "";
      if (!t) { carta.hidden = true; return; }
      var cab = el("div", "aj-carta-cab", carta);
      if (t.etiqueta) { var et = el("span", "aj-chip", cab, t.etiqueta); if (t.color) et.style.setProperty("--c", t.color); }
      el("span", "aj-carta-lleva", cab, "Llevas");
      if (t.titulo) el("p", "aj-carta-tit", carta, t.titulo);
      if (t.destacado) { var dd = el("p", "aj-carta-dato", carta); if (t.destacadoEtiqueta) el("small", "", dd, t.destacadoEtiqueta); el("b", "", dd, t.destacado); }
      if (t.lineas && t.lineas.length) { var pre = el("div", "aj-codigo", carta); t.lineas.forEach(function (l, i) { var p = el("div", "aj-linea", pre); el("i", "", p, String(i + 1)); el("code", "", p, l); }); }
      if (t.pie) el("p", "aj-carta-pie", carta, t.pie);
      carta.hidden = false;
      bSoltar.hidden = false;
    }
    function cerrarCarta() { carta.hidden = true; bSoltar.hidden = true; }

    // ---- bono: pregunta rápida (p. ej. «¿qué línea tiene la impureza?»)
    function abrirQuiz(b) {
      quiz = { opciones: b.opciones || [], correcta: b.correcta, puntos: b.puntos || 5, explicacion: b.explicacion || "", hasta: performance.now() + (b.segundos || 12) * 1000 };
      capaQuiz.textContent = "";
      var caja = el("div", "aj-cajon aj-quiz-caja", capaQuiz);
      el("p", "aj-eyebrow", caja, "Bono · +" + quiz.puntos + ((op.meta && op.meta.unidad) ? " " + op.meta.unidad : ""));
      el("h2", "", caja, b.pregunta || "¿Cuál es?");
      quiz.barra = el("i", "", el("div", "aj-quiz-reloj", caja));
      quiz.barra.style.animationDuration = (b.segundos || 12) + "s";
      var ops = el("div", "aj-quiz-ops" + (b.codigo ? " codigo" : ""), caja);
      quiz.botones = quiz.opciones.map(function (o, i) {
        var bt = boton("aj-op", ops, "", function () { responderQuiz(i); });
        el("kbd", "", bt, String(i + 1)); el(b.codigo ? "code" : "span", "", bt, o);
        return bt;
      });
      boton("aj-btn ligero", caja, "Saltar", function () { cerrarQuiz(true); });
      capaQuiz.hidden = false;
      if (quiz.botones[0]) quiz.botones[0].focus();
    }
    function responderQuiz(i) {
      if (!quiz || quiz.listo) return;
      quiz.listo = true;
      var ok = i === quiz.correcta;
      quiz.botones.forEach(function (b, k) { b.disabled = true; if (k === quiz.correcta) b.classList.add("bien"); else if (k === i) b.classList.add("mal"); });
      if (ok) { stats.bonus++; Sonido.tocar("bonus"); sumarPuntos(quiz.puntos, P.x, P.y - 120, "#7ef0c3"); if (op.meta && op.meta.contador) sumarMeta(quiz.puntos); festejar(); }
      else Sonido.tocar("mal");
      var exp = quiz.explicacion;
      setTimeout(function () { cerrarQuiz(false); if (exp) mostrarLupa({ tipo: ok ? "bien" : "mal", icono: ok ? "🎯" : "🔍", titulo: ok ? "¡Esa era! +" + (quiz ? quiz.puntos : "") : "Era otra línea", texto: exp, ms: 6500 }); }, 650);
    }
    function cerrarQuiz(saltado) {
      if (!quiz) return;
      quiz = null; capaQuiz.hidden = true;
      if (saltado) toast("Bono saltado: sigue jugando", "", 1500);
      try { lienzo.focus({ preventScroll: true }); } catch (e) {}
    }

    // ---- anuncio grande
    var anuncioEl = el("div", "aj-anuncio", esc); anuncioEl.hidden = true; var anuncioT = 0;
    function mostrarAnuncio(grande, chico) {
      anuncioEl.textContent = ""; el("b", "", anuncioEl, grande); if (chico) el("span", "", anuncioEl, chico);
      anuncioEl.hidden = false; anuncioEl.classList.remove("ve"); void anuncioEl.offsetWidth; anuncioEl.classList.add("ve");
      clearTimeout(anuncioT); anuncioT = setTimeout(function () { anuncioEl.hidden = true; }, 1900);
    }

    // ---- tabla, reloj y meta
    var tablaClave = "";
    function filasTabla() {
      if (practica) return [{ id: "yo", n: yo.nombre || "Tú", c: avatar.color, a: avatar.accesorio, p: P.puntos, on: true }];
      var l = (srv.tb || []).map(function (f) { return f.id === yo.id ? Object.assign({}, f, { p: P.puntos }) : f; });
      if (yo.dentro && yo.id && !l.some(function (f) { return f.id === yo.id; })) l.push({ id: yo.id, n: yo.nombre || "Tú", c: avatar.color, a: avatar.accesorio, p: P.puntos, on: true });
      l.sort(function (a, b) { return b.p - a.p; });
      return l;
    }
    function puesto() { var l = filasTabla(); for (var i = 0; i < l.length; i++) if (l[i].id === (practica ? "yo" : yo.id)) return i + 1; return 0; }
    function pintarTabla() {
      var l = filasTabla(), mioId = practica ? "yo" : yo.id;
      var clave = l.map(function (f) { return f.id + ":" + f.p + ":" + f.on + ":" + f.c; }).join(",") + "|" + mioId;
      if (clave === tablaClave) return;
      tablaClave = clave;
      tablaEl.textContent = ""; miniTabla.textContent = "";
      if (!l.length) el("li", "aj-vacio", tablaEl, "Aún nadie juega. ¡Entra tú primero!");
      l.slice(0, yo.staff ? 10 : 8).forEach(function (f, i) {
        var li = el("li", (f.id === mioId ? "mio" : "") + (f.on ? "" : " fuera"), tablaEl);
        el("span", "aj-pos", li, String(i + 1));
        var ic = el("i", "", li); ic.style.background = colorDe(f.c);
        el("span", "aj-n", li, f.n + (f.id === mioId && f.n !== "Tú" ? " (tú)" : ""));
        el("b", "", li, String(f.p));
      });
      l.slice(0, 3).forEach(function (f, i) {
        var li = el("li", f.id === mioId ? "mio" : "", miniTabla);
        var ic = el("i", "", li); ic.style.background = colorDe(f.c);
        el("span", "", li, (i + 1) + ". " + f.n.split(" ")[0]); el("b", "", li, String(f.p));
      });
      var p = puesto();
      if (p > 3) { var li = el("li", "mio", miniTabla); var ic = el("i", "", li); ic.style.background = colorDe(avatar.color); el("span", "", li, p + ". Tú"); el("b", "", li, String(P.puntos)); }
      yoEl.textContent = (yo.dentro || practica) ? (p ? "Vas " + p + "º de " + Math.max(l.length, srv.tt || 0) + " · " : "") + P.puntos + " puntos" : "";
      if (yo.staff) { staffTxt.textContent = (srv.j || []).length + " jugando ahora · ronda " + (srv.r.n || 0) + " (" + srv.r.estado + ")"; bTerminar.disabled = srv.r.estado !== "jugando"; }
    }
    var relojTxt = "", ultimoTic = -1;
    function pintarReloj() {
      var r = ronda(), txt = "—", cls = "aj-reloj";
      if (r.estado === "jugando" && r.fin_ms) {
        var s = Math.max(0, Math.ceil((r.fin_ms - ahoraSrv()) / 1000));
        txt = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
        cls += s <= 10 ? " poco" : " corre";
        if (s <= 10 && s > 0 && s !== ultimoTic) { ultimoTic = s; if (yo.dentro || practica) Sonido.tocar("tic"); }
        if (practica && s === 0) terminarPractica();
      } else if (r.estado === "final") txt = "Fin";
      else txt = "Calentamiento";
      if (txt !== relojTxt) { relojTxt = txt; reloj.textContent = txt; }
      if (!/\d/.test(txt)) cls += " texto";
      if (reloj.className !== cls) reloj.className = cls;
      // meta
      if (op.meta) {
        var v = practica ? (practica.contadores[op.meta.contador] || 0) : (srv.c[op.meta.contador] || 0);
        var nAct = practica ? 1 : Math.max(1, (srv.j || []).length);
        var obj = r.meta || (typeof op.meta.objetivo === "function" ? op.meta.objetivo(nAct) : op.meta.objetivo) || nAct * 30;
        var pct = clamp(v / obj, 0, 1);
        var mt = v + " / " + obj + (op.meta.unidad ? " " + op.meta.unidad : "");
        if (metaNum.textContent !== mt) { metaNum.textContent = mt; metaRelleno.style.transform = "scaleX(" + pct.toFixed(3) + ")"; metaCaja.classList.toggle("llena", pct >= 1); }
        if (pct >= 1 && metaCelebrada !== r.n && r.estado === "jugando") { metaCelebrada = r.n; Sonido.tocar("meta"); mostrarAnuncio("¡Meta del grupo!", op.meta.logro || "entre todos lo lograron"); }
      }
    }
    function terminarPractica() {
      if (!practica || practica.r.estado === "final") return;
      practica.r.estado = "final"; Sonido.tocar("fin"); mostrarAnuncio("¡Fin!", "");
      setTimeout(mostrarFin, 900);
    }

    // ---- final: resultado, podio, reflexión al muro y la fotito
    function resultado() {
      var base = { titulo: "", resultado: P.puntos + " puntos", detalle: stats.aciertos + " aciertos de " + stats.entregas };
      if (typeof op.resultado === "function") { try { return Object.assign(base, op.resultado(stats, api) || {}); } catch (e) { console.error(e); } }
      return base;
    }
    var reflexionTexto = "";
    function mostrarFin() {
      if (!capaFin.hidden) return;
      cerrarQuiz(false);
      capaFin.textContent = "";
      var caja = el("div", "aj-cajon aj-fin-caja", capaFin);
      var res = resultado();
      el("p", "aj-eyebrow", caja, practica ? "Fin de tu práctica" : "Fin de la ronda");
      var cab = el("div", "aj-fin-cab", caja);
      cab.appendChild(robotCanvas(92, { color: avatar.color, accesorio: avatar.accesorio, anim: "feliz" }));
      var ct = el("div", "", cab);
      el("h2", "", ct, res.titulo || "¡Bien jugado!");
      el("p", "aj-fin-res", ct, res.resultado);
      if (res.detalle) el("p", "aj-fin-det", ct, res.detalle);
      if (!practica) {
        var top = filasTabla().slice(0, 3);
        if (top.length) {
          var pod = el("ol", "aj-podio", caja);
          top.forEach(function (f, i) { var li = el("li", "p" + (i + 1), pod); li.appendChild(robotCanvas(54, { color: f.c, accesorio: f.a || "", anim: i ? "" : "feliz" })); el("b", "", li, (i + 1) + "º " + f.n); el("span", "", li, f.p + " pts"); });
        }
      }
      if (op.meta) { var mm2 = el("p", "aj-fin-meta", caja); mm2.textContent = (op.meta.texto || "Meta del grupo") + ": " + metaNum.textContent + (metaCaja.classList.contains("llena") ? " · ¡cumplida!" : ""); }
      // reflexión
      var rf = op.reflexion;
      if (rf) {
        var sec = el("div", "aj-reflexion", caja);
        var lab = el("label", "aj-etq", sec, rf.pregunta || "¿Qué te llevas?"); lab.setAttribute("for", "aj-refl");
        var fila = el("div", "aj-fila", sec);
        var inp = el("input", "", fila); inp.id = "aj-refl"; inp.maxLength = 160; inp.placeholder = rf.placeholder || "Una línea, con tus palabras"; inp.autocomplete = "off"; inp.enterKeyHint = "send";
        inp.value = reflexionTexto || leer("refl-" + (rf.clave || ESCENA), "");
        var pub = boton("aj-btn fuerte", fila, "Publicar", function () { publicar(); });
        var muro = el("ul", "aj-muro", sec);
        var publicar = function () {
          var t = inp.value.replace(/\s+/g, " ").trim();
          if (!t) { inp.focus(); toast("Escribe una línea antes de publicar.", "", 2000); return; }
          reflexionTexto = t; guardar("refl-" + (rf.clave || ESCENA), t); pub.disabled = true;
          var fin = function (lista) { pub.disabled = false; pub.textContent = "✓ Publicado"; pintarMuro(muro, lista || [{ nombre: "Tú", texto: t, mia: true }]); armarFoto(); if (op.alReflexion) try { op.alReflexion(t, api); } catch (e) { console.error(e); } };
          if (!conRed) { fin(null); return; }
          pedir(BASE + "/muro", { escena: rf.clave || ESCENA, texto: t }).then(function (r) { fin(r.ok && r.datos.entradas); if (!r.ok) toast("Lo guardé en tu pantalla; el muro de la clase no respondió.", "", 3000); });
        };
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); publicar(); } });
        if (conRed) pedir(BASE + "/muro?escena=" + encodeURIComponent(rf.clave || ESCENA)).then(function (r) { if (r.ok) pintarMuro(muro, r.datos.entradas || []); });
      }
      var fotoCaja = el("div", "aj-foto", caja);
      var bots = el("div", "aj-botones", caja);
      boton("aj-btn", bots, "Armar mi fotito", function () { armarFoto(true); });
      boton("aj-btn", bots, practica ? "Practicar otra vez" : "Practicar solo", practicar);
      boton("aj-btn ligero", bots, "Seguir en el mapa", function () { cerrarFin(); if (practica && practica.r.estado === "final") salirPractica(true); });
      capaFin.hidden = false;
      function armarFoto(desplazar) {
        var c = fotito({ nombre: yo.nombre || "Alumno", avatar: avatar, resultado: res, reflexion: reflexionTexto });
        fotoCaja.textContent = "";
        var img = el("img", "", fotoCaja); img.alt = "Tu fotito: nombre, robot, resultado y reflexión"; img.src = c.toDataURL("image/png"); img.width = 1080; img.height = 1350;
        var fb = el("div", "aj-botones", fotoCaja);
        var archivo = "fotito-" + slug(op.titulo || "arena") + "-" + slug(yo.nombre) + ".png";
        boton("aj-btn fuerte", fb, "⬇ Descargar PNG", function () { descargar(c, archivo); });
        el("p", "aj-nota", fotoCaja, "¿No se descargó? Mantén pulsada la imagen (celular) o clic derecho → «Guardar imagen como…».");
        if (desplazar) fotoCaja.scrollIntoView({ block: "nearest", behavior: REDUCIDO ? "auto" : "smooth" });
      }
      var cerrarBtn = capaFin.querySelector(".aj-btn.fuerte, input");
      if (cerrarBtn) setTimeout(function () { cerrarBtn.focus(); }, 50);
    }
    function pintarMuro(ul, lista) {
      ul.textContent = "";
      lista.slice(0, 4).forEach(function (e) { var li = el("li", e.mia ? "mia" : "", ul); el("b", "", li, e.mia ? "Tú" : e.nombre); el("span", "", li, " " + e.texto); });
    }
    function cerrarFin() { capaFin.hidden = true; try { lienzo.focus({ preventScroll: true }); } catch (e) {} }

    function fechaLima() {
      try { return new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" }).format(new Date()); } catch (e) { return new Date().toLocaleDateString(); }
    }
    function envolver(g, texto, ancho, max) {
      var ps = String(texto || "").split(/\s+/).filter(Boolean), ls = [], l = "";
      ps.forEach(function (p) { var pr = l ? l + " " + p : p; if (g.measureText(pr).width > ancho && l) { ls.push(l); l = p; } else l = pr; });
      if (l) ls.push(l);
      if (ls.length > max) { ls = ls.slice(0, max); ls[max - 1] = ls[max - 1].replace(/\s*\S*$/, "") + "…"; }
      return ls;
    }
    function ajustar(g, texto, ancho, px, peso, min) {
      var f = px; do { g.font = peso + " " + f + "px " + FUENTE; if (g.measureText(texto).width <= ancho) break; f -= 2; } while (f > (min || 20)); return f;
    }
    // fotito: PNG 1080 × 1350 con la marca JMD.
    function fotito(d) {
      var W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
      var g = c.getContext("2d");
      var bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#14122b"); bg.addColorStop(.55, "#251d52"); bg.addColorStop(1, "#3b2a12");
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      var hal = g.createRadialGradient(W * .82, 160, 10, W * .82, 160, 560); hal.addColorStop(0, "rgba(242,193,78,.32)"); hal.addColorStop(1, "rgba(242,193,78,0)"); g.fillStyle = hal; g.fillRect(0, 0, W, H);
      var hv = g.createRadialGradient(140, 1220, 10, 140, 1220, 600); hv.addColorStop(0, "rgba(123,108,240,.35)"); hv.addColorStop(1, "rgba(123,108,240,0)"); g.fillStyle = hv; g.fillRect(0, 0, W, H);
      // constelación propia (sale del nombre)
      var r = rng(hash32(d.nombre + "|" + (d.resultado && d.resultado.resultado)));
      g.strokeStyle = "rgba(242,193,78,.35)"; g.lineWidth = 2; g.beginPath(); var sx = 720, sy = 70;
      g.moveTo(sx, sy); for (var i = 0; i < 4; i++) { sx += 70 + r() * 40; sy += (r() - .3) * 70; g.lineTo(sx, sy); } g.stroke();
      for (i = 0; i < 70; i++) { var x = r() * W, y = r() * H, a = (x > 60 && x < W - 60 && y > 190 && y < H - 120) ? .12 : .55; g.fillStyle = "rgba(255,240,200," + (a * (.4 + r() * .6)).toFixed(2) + ")"; g.beginPath(); g.arc(x, y, 1 + r() * 2.4, 0, 7); g.fill(); }
      g.textBaseline = "alphabetic"; g.textAlign = "left";
      g.fillStyle = ORO; g.font = "800 30px " + FUENTE; g.fillText("JMD LEARNING", 72, 100);
      g.fillStyle = "rgba(242,193,78,.18)"; rr(g, 330, 72, 118, 38, 19); g.fill(); g.fillStyle = ORO; g.font = "800 20px " + FUENTE; g.fillText("ARENA", 352, 98);
      g.fillStyle = "rgba(243,238,220,.88)"; var curso = op.curso || ""; ajustar(g, curso, W - 144, 30, "600", 20); g.fillText(curso, 72, 146);
      g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 56, 190, W - 112, 1040, 44); g.fill();
      g.strokeStyle = "rgba(242,193,78,.3)"; g.lineWidth = 2; rr(g, 56, 190, W - 112, 1040, 44); g.stroke();
      var ha = g.createRadialGradient(W / 2, 400, 20, W / 2, 400, 210); ha.addColorStop(0, "rgba(242,193,78,.5)"); ha.addColorStop(1, "rgba(242,193,78,0)"); g.fillStyle = ha; g.beginPath(); g.arc(W / 2, 400, 210, 0, 7); g.fill();
      g.fillStyle = "#f6f3ff"; g.beginPath(); g.arc(W / 2, 400, 150, 0, 7); g.fill(); g.strokeStyle = ORO; g.lineWidth = 6; g.stroke();
      g.save(); g.beginPath(); g.arc(W / 2, 400, 147, 0, 7); g.clip();
      pintarRobot(g, W / 2, 510, 2.55, { color: d.avatar.color, accesorio: d.avatar.accesorio, anim: "feliz", t: 0 });
      g.restore();
      g.textAlign = "center"; g.fillStyle = "#ffffff";
      var nom = String(d.nombre).slice(0, 48); ajustar(g, nom, W - 200, 68, "800", 32); g.fillText(nom, W / 2, 624);
      g.fillStyle = "rgba(243,238,220,.92)"; var ses = (op.sesion || "") + (op.titulo ? " · " + op.titulo : ""); ajustar(g, ses, W - 200, 31, "600", 20); g.fillText(ses, W / 2, 672);
      g.fillStyle = "#e9bd52"; g.font = "600 26px " + FUENTE; g.fillText(op.fecha || fechaLima(), W / 2, 714);
      g.fillStyle = "rgba(10,8,24,.55)"; rr(g, 110, 750, W - 220, 230, 30); g.fill(); g.strokeStyle = "rgba(242,193,78,.4)"; g.lineWidth = 2; rr(g, 110, 750, W - 220, 230, 30); g.stroke();
      g.save(); g.translate(205, 866); g.fillStyle = ORO; estrella(g, 0, 0, 56); g.fillStyle = "#fff3c4"; estrella(g, -6, -8, 18); g.restore();
      g.textAlign = "left"; var rs = d.resultado || {};
      g.fillStyle = ORO; g.font = "800 23px " + FUENTE; g.fillText(String(rs.etiqueta || "Mi resultado").toUpperCase(), 300, 806);
      g.fillStyle = "#ffffff"; var rt = String(rs.resultado || ""); ajustar(g, rt, W - 440, 58, "800", 26); g.fillText(rt, 300, 868);
      if (rs.titulo) { g.fillStyle = "#ffe9a3"; ajustar(g, rs.titulo, W - 440, 32, "700", 20); g.fillText(rs.titulo, 300, 912); }
      if (rs.detalle) { g.fillStyle = "rgba(243,238,220,.85)"; ajustar(g, rs.detalle, W - 440, 25, "600", 17); g.fillText(rs.detalle, 300, 952); }
      g.textAlign = "center"; g.font = "italic 500 36px " + FUENTE;
      var refl = String(d.reflexion || "").trim();
      var ls = envolver(g, refl ? "«" + refl + "»" : "«" + ((op.reflexion && op.reflexion.porDefecto) || "Hoy aprendí jugando.") + "»", W - 250, 4);
      var y0 = 1110 - (ls.length - 1) * 23; g.fillStyle = "#f6f2e4"; ls.forEach(function (l, j) { g.fillText(l, W / 2, y0 + j * 46); });
      g.fillStyle = "rgba(243,238,220,.75)"; g.font = "600 26px " + FUENTE; g.fillText("jmd-learn.online  ·  " + (op.hashtag || "#ArenaJMD"), W / 2, 1294);
      return c;
    }
    function docPadre() { try { if (window.parent !== window && window.parent.document && window.parent.document.body) return window.parent.document; } catch (e) {} return null; }
    function descargar(c, archivo) {
      function con(d) {
        return new Promise(function (ok) {
          var win = d.defaultView || window;
          c.toBlob(function (b) {
            try {
              var url = b ? win.URL.createObjectURL(b) : c.toDataURL("image/png");
              var a = d.createElement("a"); a.href = url; a.download = archivo; a.rel = "noopener"; a.style.display = "none";
              d.body.appendChild(a); a.click();
              setTimeout(function () { a.remove(); if (b) try { win.URL.revokeObjectURL(url); } catch (e) {} }, 4000);
              ok(true);
            } catch (e) { ok(false); }
          }, "image/png");
        });
      }
      // primero desde la página del LMS (mismo origen): así funciona aunque el sandbox del iframe no traiga allow-downloads
      var padre = docPadre();
      (padre ? con(padre) : Promise.resolve(false)).then(function (s) { return s ? s : con(document); }).then(function (s) {
        toast(s ? "Listo: revisa tus descargas (" + archivo + ")" : "Tu navegador no dejó descargar: mantén pulsada la imagen.", s ? "bien" : "mal", 3800);
      });
    }

    // ---- el bucle
    var previo = performance.now(), parpadeoProx = previo + 2500, fpsN = 0, fpsT = previo, fps = 60;
    var estadoDebug = window.__arenaJMD = { fps: 60, jugadores: 0, dpr: 1, frames: 0, errores: 0, version: VERSION };
    estadoDebug.libres = function () {
      var r = lienzo.getBoundingClientRect(), out = [];
      for (var i = 0; i < CANT; i++) { var id = PREFIJO + i; if (duenoDe(id)) continue; var d = objeto(id, versionDe(id)), p = aPantalla(d.x, d.y); out.push({ id: id, x: r.left + p.x, y: r.top + p.y, dist: Math.hypot(d.x - P.x, d.y - P.y) }); }
      return out.sort(function (a, b) { return a.dist - b.dist; });
    };
    estadoDebug.yo = function () { return { x: P.x, y: P.y, carga: P.carga, puntos: P.puntos, anim: P.anim, dentro: yo.dentro, practica: !!practica }; };
    estadoDebug.ir = function (x, y) { P.objetivo = { x: x, y: y, t: performance.now() }; };
    function moverYo(dt, ahora) {
      if (!yo.dentro && !practica) return;
      var ix = 0, iy = 0;
      Object.keys(teclas).forEach(function (k) { if (teclas[k] && MAPA[k]) { ix += MAPA[k][0]; iy += MAPA[k][1]; } });
      if (joy.activo) { ix = joy.x; iy = joy.y; }
      if (!ix && !iy && P.objetivo) {
        var dx = P.objetivo.x - P.x, dy = P.objetivo.y - P.y, d = Math.hypot(dx, dy);
        if (d < 8 || ahora - P.objetivo.t > 9000) P.objetivo = null; else { ix = dx / d; iy = dy / d; if (d < 60) { ix *= d / 60 + .25; iy *= d / 60 + .25; } }
      }
      var m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
      var quieto = P.aturdido > ahora || quiz || !capaFin.hidden;
      if (quieto) { ix = 0; iy = 0; }
      var k = 1 - Math.exp(-dt * 14);
      P.vx = lerp(P.vx, ix * VEL, k); P.vy = lerp(P.vy, iy * VEL, k);
      if (P.empuje) { P.vx += P.empuje.x; P.vy += P.empuje.y; P.empuje.x *= .86; P.empuje.y *= .86; if (Math.abs(P.empuje.x) + Math.abs(P.empuje.y) < 4) P.empuje = null; }
      var nx = P.x + P.vx * dt, ny = P.y + P.vy * dt;
      // choque con muros: círculo (los pies) contra rectángulo; se empuja hacia fuera y así se desliza
      nx = clamp(nx, R_JUG, M.ancho - R_JUG); ny = clamp(ny, R_JUG + 40, M.alto - R_JUG);
      for (var mi = 0; mi < mundo.muros.length; mi++) {
        var w = mundo.muros[mi], cx = clamp(nx, w.x, w.x + w.w), cy = clamp(ny, w.y, w.y + w.h), ddx = nx - cx, ddy = ny - cy, dd = Math.hypot(ddx, ddy);
        if (dd >= R_JUG) continue;
        if (dd > 0.001) { nx = cx + ddx / dd * R_JUG; ny = cy + ddy / dd * R_JUG; continue; }
        var izq = nx - w.x, der = w.x + w.w - nx, arr = ny - w.y, aba = w.y + w.h - ny, mn = Math.min(izq, der, arr, aba);
        if (mn === izq) nx = w.x - R_JUG; else if (mn === der) nx = w.x + w.w + R_JUG; else if (mn === arr) ny = w.y - R_JUG; else ny = w.y + w.h + R_JUG;
      }
      var vel = Math.hypot(nx - P.x, ny - P.y) / Math.max(dt, .001);
      P.x = nx; P.y = ny;
      if (vel > 25) {
        P.fase += dt * 11;
        if (Math.abs(P.vx) > Math.abs(P.vy) * 1.1) P.dir = P.vx < 0 ? 1 : 3; else P.dir = P.vy < 0 ? 2 : 0;
      }
      P.anim = P.aturdido > ahora ? "aturdido" : P.festeja > ahora ? "festeja" : P.triste > ahora ? "triste" : vel > 25 ? "camina" : "";
      // peligros
      if (P.invulnerable < ahora && (yo.dentro || practica)) {
        var t = ahoraSrv();
        for (var i = 0; i < mundo.peligros.length; i++) {
          var pz = mundo.peligros[i], q = posPeligro(pz, t);
          if (Math.hypot(q.x - P.x, q.y - (P.y - 14)) < pz.radio + R_JUG) { golpe(pz, q, ahora); break; }
        }
      }
      intentarTomar(); intentarEntregar();
      // ¿estoy cerca de una zona con carga? resalte
    }
    function golpe(pz, q, ahora) {
      P.aturdido = ahora + 900; P.invulnerable = ahora + 2600; stats.golpes++;
      var dx = P.x - q.x, dy = P.y - q.y, d = Math.hypot(dx, dy) || 1;
      P.empuje = { x: dx / d * 420, y: dy / d * 420 }; P.objetivo = null;
      if (!REDUCIDO) cam.sacude = 10;
      Sonido.tocar("golpe");
      var tenia = !!P.carga;
      if (tenia) soltarCarga(false, false);
      toast(tenia ? pz.aviso : (pz.avisoSinCarga || "¡Uy! Esquiva " + (pz.nombre || "eso") + ": nadie queda fuera, sigue."), "mal", 2600);
      if (op.alGolpe) try { op.alGolpe(pz, api); } catch (e) { console.error(e); }
    }
    function moverRemotos(dt) {
      var rt = ahoraSrv() - 140, k = 1 - Math.exp(-dt * 16);
      Object.keys(remotos).forEach(function (id) {
        var r = remotos[id], b = r.buf, tx = r.x, ty = r.y;
        if (b.length) {
          var a = b[0], z = b[b.length - 1];
          if (rt <= a.t) { tx = a.x; ty = a.y; }
          else if (rt >= z.t) { tx = z.x; ty = z.y; }
          else for (var i = 0; i < b.length - 1; i++) if (rt >= b[i].t && rt <= b[i + 1].t) { var u = (rt - b[i].t) / Math.max(1, b[i + 1].t - b[i].t); tx = lerp(b[i].x, b[i + 1].x, u); ty = lerp(b[i].y, b[i + 1].y, u); break; }
        }
        var ox = r.x, oy = r.y;
        r.x = REDUCIDO ? tx : lerp(r.x, tx, k); r.y = REDUCIDO ? ty : lerp(r.y, ty, k);
        var v = Math.hypot(r.x - ox, r.y - oy) / Math.max(dt, .001);
        r.vel = lerp(r.vel, v, .3);
        if (r.vel > 20) r.fase += dt * 11;
      });
    }
    function etiqueta(r, nombre, color, mio) {
      var clave = nombre + "|" + color + "|" + mio + "|" + vista.dpr;
      if (r.tagClave === clave && r.tag) return r.tag;
      var dpr = vista.dpr, g0 = document.createElement("canvas").getContext("2d");
      g0.font = "700 12px " + FUENTE; var w = Math.ceil(g0.measureText(nombre).width) + 24, h = 20;
      var c = document.createElement("canvas"); c.width = w * dpr; c.height = h * dpr;
      var g = c.getContext("2d"); g.scale(dpr, dpr);
      g.fillStyle = mio ? "#ffffff" : "rgba(20,18,43,.78)"; rr(g, 0, 0, w, h, 10); g.fill();
      if (mio) { g.strokeStyle = ORO; g.lineWidth = 2; rr(g, 1, 1, w - 2, h - 2, 9); g.stroke(); }
      g.fillStyle = colorDe(color); g.beginPath(); g.arc(10, 10, 4, 0, 7); g.fill();
      g.fillStyle = mio ? TINTA : "#ffffff"; g.font = "700 12px " + FUENTE; g.textBaseline = "middle"; g.fillText(nombre, 18, 10.5);
      r.tag = { c: c, w: w, h: h }; r.tagClave = clave;
      return r.tag;
    }
    var yoTag = {};
    function cuadro(ahora) {
      var dt = Math.min(.05, (ahora - previo) / 1000); previo = ahora;
      var t0 = performance.now();
      try {
        moverYo(dt, ahora); moverRemotos(dt); seguirCamara(dt); latir(ahora);
        if (quiz && !quiz.listo && ahora > quiz.hasta) { cerrarQuiz(false); toast("Se acabó el tiempo del bono: sigue jugando", "", 1800); }
        pintar(ahora, dt);
        if (ahora > parpadeoProx) { P.parpadeo = ahora + 130; parpadeoProx = ahora + 2400 + Math.random() * 2600; }
        if (Math.floor(ahora / 250) !== Math.floor((ahora - dt * 1000) / 250)) { pintarReloj(); pintarBanner(); }
      } catch (e) { estadoDebug.errores++; if (estadoDebug.errores < 5) console.error(e); }
      var costo = performance.now() - t0;
      estadoDebug.ms = estadoDebug.ms ? estadoDebug.ms * .95 + costo * .05 : costo; // costo medio de un cuadro (ms)
      if (costo > (estadoDebug.msMax || 0)) estadoDebug.msMax = costo;
      // fps y calidad adaptable
      fpsN++; estadoDebug.frames++;
      if (ahora - fpsT >= 1000) {
        fps = fpsN * 1000 / (ahora - fpsT); fpsN = 0; fpsT = ahora;
        estadoDebug.fps = Math.round(fps); estadoDebug.jugadores = Object.keys(remotos).length + (yo.dentro ? 1 : 0); estadoDebug.dpr = vista.dpr;
        if (fpsEl) fpsEl.textContent = Math.round(fps) + " fps · " + estadoDebug.jugadores + " · dpr " + vista.dpr.toFixed(1);
        // calidad adaptable: si pintar un cuadro cuesta mucho (no si el sistema va lento por otra cosa), baja la resolución
        calidad.muestras.push(estadoDebug.ms || 0); if (calidad.muestras.length > 3) calidad.muestras.shift();
        if (calidad.muestras.length === 3 && calidad.muestras.every(function (m) { return m > 9; }) && calidad.dprMax > 1 && !document.hidden) { calidad.dprMax = 1; calidad.muestras = []; medir(); }
      }
      requestAnimationFrame(cuadro);
    }
    function pintar(ahora, dt) {
      var t = ahora / 1000, dpr = vista.dpr, s = cam.s, k = s * dpr;
      var sx = 0, sy = 0;
      if (cam.sacude > .3) { sx = (Math.random() - .5) * cam.sacude; sy = (Math.random() - .5) * cam.sacude; cam.sacude *= Math.pow(.02, dt); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = M.tema === "mina" ? "#120c09" : "#d9d6f3"; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      prepararFondo(k);
      ctx.setTransform(k, 0, 0, k, (-cam.x * s + sx) * dpr, (-cam.y * s + sy) * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(fondo.c, 0, 0, fondo.c.width, fondo.c.height, 0, 0, M.ancho, M.alto);
      // zonas
      var conCarga = !!P.carga;
      for (var i = 0; i < mundo.zonas.length; i++) pintarZona(ctx, mundo.zonas[i], t, conCarga);
      // objetos en el suelo
      var vx0 = cam.x - 60, vy0 = cam.y - 80, vx1 = cam.x + vista.w / s + 60, vy1 = cam.y + vista.h / s + 80;
      var enSuelo = [];
      for (i = 0; i < CANT; i++) {
        var id = PREFIJO + i, v = versionDe(id);
        if (duenoDe(id) || P.carga === id) continue;
        var d = objeto(id, v);
        if (d.x < vx0 || d.x > vx1 || d.y < vy0 || d.y > vy1) continue;
        pintarObjeto(ctx, d, d.x, d.y, t, false); enSuelo.push(d);
      }
      // y-orden: jugadores y peligros
      var lista = [], tsrv = ahoraSrv();
      if (!practica) Object.keys(remotos).forEach(function (id2) { var r = remotos[id2]; if (r.x > vx0 && r.x < vx1 && r.y > vy0 && r.y < vy1 + 100) lista.push({ y: r.y, r: r }); });
      if (yo.dentro || practica) lista.push({ y: P.y, yo: true });
      mundo.peligros.forEach(function (p) { var q = posPeligro(p, tsrv); lista.push({ y: q.y + 14, p: p, q: q }); });
      lista.sort(function (a, b) { return a.y - b.y; });
      var mioParpadeo = P.parpadeo > ahora;
      for (i = 0; i < lista.length; i++) {
        var e = lista[i];
        if (e.p) { pintarPeligro(ctx, e.p, e.q, t); continue; }
        if (e.yo) {
          ctx.strokeStyle = rgba(ORO, .85); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(P.x, P.y + 1, 24, 8, 0, 0, 7); ctx.stroke();
          var parpa = P.invulnerable > ahora && !REDUCIDO && Math.floor(ahora / 90) % 2 === 0;
          ctx.globalAlpha = parpa ? .55 : 1;
          pintarRobot(ctx, P.x, P.y, 1, { color: avatar.color, accesorio: avatar.accesorio, dir: P.dir, anim: P.anim, fase: P.fase, t: t, parpadeo: mioParpadeo, k: k });
          ctx.globalAlpha = 1;
          if (P.carga) { var dc = objeto(P.carga, versionDe(P.carga)); pintarObjeto(ctx, dc, P.x, P.y - 108 + (REDUCIDO ? 0 : Math.sin(t * 5) * 2), t, true); }
        } else {
          var r = e.r, an = r.m === "aturdido" || r.m === "festeja" || r.m === "triste" ? r.m : r.vel > 20 ? "camina" : "";
          pintarRobot(ctx, r.x, r.y, 1, { color: r.c, accesorio: r.a, dir: r.d, anim: an, fase: r.fase, t: t + (hash32(r.id) % 100) / 10, parpadeo: (Math.floor(t * 10 + hash32(r.id) % 37) % 41) === 0, k: k });
          if (r.k) { var ver = versionDe(r.k); var dr = objeto(r.k, ver); pintarObjeto(ctx, dr, r.x, r.y - 108, t, true); }
        }
      }
      // partículas
      if (particulas.length) {
        for (i = particulas.length - 1; i >= 0; i--) {
          var pa = particulas[i]; pa.vida -= dt * 1.1; if (pa.vida <= 0) { particulas.splice(i, 1); continue; }
          pa.vy += 520 * dt; pa.x += pa.vx * dt; pa.y += pa.vy * dt;
          ctx.globalAlpha = Math.min(1, pa.vida * 1.6); ctx.fillStyle = pa.c; ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.r, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // capa de pantalla: etiquetas de zona, de objetos, nombres, emotes, popups
      ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (i = 0; i < mundo.zonas.length; i++) {
        var z = mundo.zonas[i]; if (!z.nombre) continue;
        var pz = aPantalla(z.x + z.w / 2, z.y);
        ctx.font = "800 13px " + FUENTE; var tw = ctx.measureText(z.nombre).width + 22;
        ctx.fillStyle = z.color; rr(ctx, pz.x - tw / 2, pz.y - 11, tw, 22, 11); ctx.fill();
        ctx.fillStyle = z.colorTexto || "#ffffff"; ctx.fillText(z.nombre, pz.x, pz.y + .5);
      }
      if (s > .38) {
        ctx.font = "700 11px " + FUENTE;
        for (i = 0; i < enSuelo.length; i++) {
          var ob = enSuelo[i]; if (!ob.texto) continue;
          var po = aPantalla(ob.x, ob.y + 24), w = Math.min(150, ctx.measureText(ob.texto).width + 14);
          ctx.fillStyle = "rgba(20,18,43,.82)"; rr(ctx, po.x - w / 2, po.y - 9, w, 18, 9); ctx.fill();
          ctx.fillStyle = "#fff6d6"; ctx.fillText(ob.texto, po.x, po.y + .5, 140);
        }
      }
      for (i = 0; i < lista.length; i++) {
        var e2 = lista[i]; if (e2.p) continue;
        var rr2 = e2.yo ? yoTag : e2.r, nx = e2.yo ? P.x : e2.r.x, ny = e2.yo ? P.y : e2.r.y;
        var nombre = e2.yo ? (yo.nombre || "Tú") : (e2.r.n || "");
        var tg = etiqueta(rr2, nombre, e2.yo ? avatar.color : e2.r.c, !!e2.yo), pn = aPantalla(nx, ny - (e2.yo ? (P.carga ? 128 : 100) : (e2.r.k ? 128 : 100)));
        ctx.drawImage(tg.c, pn.x - tg.w / 2, pn.y - tg.h, tg.w, tg.h);
        var em = e2.yo ? (P.emote && ahora - P.emoteT < 2600 ? emoteDe(P.emote) : null) : (e2.r.e && ahora - e2.r.eT < 2600 ? emoteDe(e2.r.e) : null);
        if (em) {
          var et = e2.yo ? ahora - P.emoteT : ahora - e2.r.eT, sube = REDUCIDO ? 0 : Math.min(1, et / 180) * 6;
          var pe = aPantalla(nx + 26, ny - 92);
          ctx.fillStyle = "#ffffff"; rr(ctx, pe.x - 17, pe.y - 34 - sube, 34, 30, 12); ctx.fill();
          ctx.beginPath(); ctx.moveTo(pe.x - 8, pe.y - 5 - sube); ctx.lineTo(pe.x - 14, pe.y + 4 - sube); ctx.lineTo(pe.x, pe.y - 5 - sube); ctx.fill();
          ctx.font = "19px " + FUENTE; ctx.fillText(em.e, pe.x, pe.y - 18 - sube);
        }
      }
      if (P.objetivo && (yo.dentro || practica) && !REDUCIDO) {
        var pob = aPantalla(P.objetivo.x, P.objetivo.y); ctx.strokeStyle = rgba(ORO, .8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pob.x, pob.y, 7 + Math.sin(t * 8) * 2, 0, 7); ctx.stroke();
      }
      for (i = popups.length - 1; i >= 0; i--) {
        var pp = popups[i], edad = (ahora - pp.nace) / 1000;
        if (edad > 1.3) { popups.splice(i, 1); continue; }
        var pq = aPantalla(pp.x, pp.y - (REDUCIDO ? 0 : edad * 50));
        ctx.globalAlpha = edad < 1 ? 1 : 1 - (edad - 1) / .3;
        ctx.font = "900 " + (REDUCIDO ? 18 : Math.round(16 + Math.min(1, edad * 6) * 4)) + "px " + FUENTE;
        ctx.lineWidth = 4; ctx.strokeStyle = "rgba(20,18,43,.9)"; ctx.strokeText(pp.t, pq.x, pq.y); ctx.fillStyle = pp.c; ctx.fillText(pp.t, pq.x, pq.y);
        ctx.globalAlpha = 1;
      }
    }

    // ---- api para el autor del juego
    var api = {
      version: VERSION, mundo: mundo, ayudas: ayudas,
      get puntos() { return P.puntos; }, get stats() { return stats; },
      yo: function () { return { id: practica ? "yo" : yo.id, nombre: yo.nombre, staff: yo.staff, dentro: yo.dentro, practica: !!practica, x: P.x, y: P.y, carga: P.carga, avatar: avatar }; },
      ronda: ronda, ahora: ahoraSrv,
      sumarPuntos: function (n) { sumarPuntos(n | 0); },
      popup: popup, toast: toast, lupa: mostrarLupa, anuncio: mostrarAnuncio, sonido: function (n) { Sonido.tocar(n); },
      festejar: festejar, emitir: emitir, bono: abrirQuiz, soltar: function () { soltarCarga(false, false); },
      sumarMeta: function (n) { if (op.meta) sumarMeta(n); },
      practicar: practicar, entrar: entrar, objeto: function (id) { return objeto(id, versionDe(id)); },
    };

    // ---- arranque
    medir(); generar(); pintarEntrada(); pintarTabla(); pintarReloj(); pintarBanner();
    yo.nombre = leer("nombre", "") || "";
    if (conRed) conectar();
    else { setTimeout(function () { if (/[?&]demo=1/.test(location.search)) practicar(); }, 50); }
    if (/[?&]demo=1/.test(location.search) && conRed) setTimeout(function () { if (!yo.dentro && !practica) entrar(); }, 400);
    requestAnimationFrame(function (t) { previo = t; requestAnimationFrame(cuadro); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { previo = performance.now(); envio.firma = ""; } });
    if (ruta) pedir("/api/v1/me").then(function (r) { if (r.ok && r.datos) { var n = String(r.datos.name || (r.datos.email || "").split("@")[0] || "").trim(); if (n) { var ps = n.split(/\s+/); yo.nombre = yo.nombre || (ps.length > 1 ? ps[0] + " " + ps[1].charAt(0) + "." : ps[0]); guardar("nombre", yo.nombre); pintarEntrada(); } } });
    return api;
  }

  window.ArenaJMD = { version: VERSION, crear: crear, pintarRobot: pintarRobot, robotCanvas: robotCanvas, colores: COLORES, accesorios: ACCESORIOS, emotes: EMOTES, rng: rng, hash: hash32 };
})();
