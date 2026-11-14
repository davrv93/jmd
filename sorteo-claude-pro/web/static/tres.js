// Tres escenas 3D del curso: corazón anatómico, pórtico de concreto armado y
// piano. Cada una devuelve { pausar, reanudar } y solo corre cuando está a la
// vista. three.js r128 llega como global (THREE); todo lo demás es procedural.
import { $, esc } from "./comun.js";

const reducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (t) => t * t * (3 - 2 * t);
const paso = (x, a, b) => suave(clamp((x - a) / (b - a), 0, 1));
const TAU = Math.PI * 2;
const difAng = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

// Bucle de animación que se puede pausar.
function bucle(paso) {
  let id = 0, activo = false;
  const marco = (t) => { if (!activo) return; paso(t); id = requestAnimationFrame(marco); };
  return {
    reanudar() { if (!activo) { activo = true; id = requestAnimationFrame(marco); } },
    pausar() { activo = false; cancelAnimationFrame(id); },
  };
}

// Audio compartido: se crea en el primer toque (política de autoplay).
let ac = null, salida = null;
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    const vol = ac.createGain();
    vol.gain.value = .8;
    const largo = ac.sampleRate * 2.2, ir = ac.createBuffer(2, largo, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3);
    }
    const rev = ac.createConvolver(); rev.buffer = ir;
    const humedo = ac.createGain(); humedo.gain.value = .28;
    salida = ac.createGain();
    salida.connect(comp); salida.connect(rev); rev.connect(humedo); humedo.connect(comp);
    comp.connect(vol); vol.connect(ac.destination);
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}
function ruido(seg) {
  const b = ac.createBuffer(1, Math.max(1, ac.sampleRate * seg), ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = b;
  return s;
}

// Ruido de valor 3D determinista: el mismo corazón para todos.
const hash = (x, y, z) => { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); };
function ruido3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = suave(x - xi), v = suave(y - yi), w = suave(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w) - .5;
}
// Textura de ruido (gris) para relieve o color: pequeña y repetible.
function texturaRuido(THREE, tam, base, amp, oct = 3, color = null) {
  const cv = document.createElement("canvas"); cv.width = cv.height = tam;
  const cx = cv.getContext("2d"), img = cx.createImageData(tam, tam), d = img.data;
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    let n = 0, f = 4 / tam, a = 1;
    for (let o = 0; o < oct; o++) { n += ruido3(x * f, y * f, o * 7.3) * a; f *= 2.3; a *= .5; }
    const g = clamp(base + n * amp, 0, 255), i = (y * tam + x) * 4;
    d[i] = color ? clamp(color[0] + n * amp, 0, 255) : g; d[i + 1] = color ? clamp(color[1] + n * amp, 0, 255) : g; d[i + 2] = color ? clamp(color[2] + n * amp, 0, 255) : g; d[i + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Estudio de luz para reflejos: cúpula con degradado y paneles luminosos,
// prefiltrada con PMREM (sin HDR externo).
function estudio(THREE, rend, calido = true) {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(20, 32, 16);
  const col = [], c = new THREE.Color(), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 20;
    c.setRGB(.3 + y * .25, .29 + y * .24, .28 + y * .23);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i * (calido ? .97 : 1), i * (calido ? .92 : 1.03)) }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(14, 6, 0, 14, 4, 2.4); panel(6, 10, -14, 2, 6, 1.2); panel(5, 8, 13, 0, -8, .9); panel(8, 3, 2, 3, 15, .6);
  const pm = new THREE.PMREMGenerator(rend);
  const env = pm.fromScene(s, .04).texture;
  pm.dispose();
  return env;
}

// Sombra de contacto: degradado radial bajo el modelo.
function sombraContacto(THREE, tam, y, alfa = .35) {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const cx = cv.getContext("2d"), g = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(40,20,10,${alfa})`); g.addColorStop(1, "rgba(40,20,10,0)");
  cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = y;
  return m;
}

// Fusiona geometrías (no indexadas) en una sola: menos llamadas de dibujo.
function fusionar(THREE, geos) {
  const ni = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const n = ni.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of ni) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  r.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  r.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return r;
}

// Rótulo flotante (sprite con texto) para cotas y nombres.
function rotulo(THREE, texto, alto = .4, oscuro = false) {
  const cv = document.createElement("canvas"), cx = cv.getContext("2d");
  const fuente = "600 48px 'Space Grotesk', system-ui, sans-serif";
  cx.font = fuente;
  const w = Math.ceil(cx.measureText(texto).width) + 56;
  cv.width = w + 8; cv.height = 104;
  cx.font = fuente;
  cx.fillStyle = oscuro ? "rgba(23,19,15,.92)" : "rgba(255,255,255,.95)";
  cx.beginPath(); cx.roundRect ? cx.roundRect(4, 8, w, 88, 22) : cx.rect(4, 8, w, 88); cx.fill();
  cx.strokeStyle = oscuro ? "rgba(255,255,255,.25)" : "rgba(23,19,15,.22)"; cx.lineWidth = 3; cx.stroke();
  cx.fillStyle = oscuro ? "#fff" : "#17130f"; cx.textAlign = "center"; cx.textBaseline = "middle";
  cx.fillText(texto, cv.width / 2, 53);
  const t = new THREE.CanvasTexture(cv);
  t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(alto * cv.width / cv.height, alto, 1);
  s.renderOrder = 20;
  return s;
}

// Órbita con inercia: arrastre, rueda y pellizco. `tocar` recibe el toque corto.
function orbita(lienzo, caja, cfg, tocar) {
  const o = { ...cfg, vaz: 0, vel: 0, arr: null, quieto: 0 };
  const ini = { ...cfg };
  const dedos = new Map();
  let pinza = 0, t0 = 0, p0 = null;
  lienzo.style.touchAction = "pan-y";
  lienzo.addEventListener("pointerdown", (e) => {
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lienzo.setPointerCapture(e.pointerId);
    if (dedos.size === 1) { o.arr = { x: e.clientX, y: e.clientY }; t0 = performance.now(); p0 = { x: e.clientX, y: e.clientY }; o.vaz = o.vel = 0; }
    if (dedos.size === 2) { const [a, b] = [...dedos.values()]; pinza = Math.hypot(a.x - b.x, a.y - b.y); }
    caja.classList.add("arrastra");
  });
  lienzo.addEventListener("pointermove", (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2) {
      const [a, b] = [...dedos.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinza) o.dist = clamp(o.dist * pinza / d, o.min, o.max);
      pinza = d; return;
    }
    if (!o.arr) return;
    o.vaz = (e.clientX - o.arr.x) * .008; o.vel = (e.clientY - o.arr.y) * .006;
    o.az -= o.vaz; o.el = clamp(o.el + o.vel, o.elMin ?? -.5, o.elMax ?? .95);
    o.arr = { x: e.clientX, y: e.clientY }; o.quieto = performance.now();
  });
  const soltar = (e) => {
    const fue = dedos.get(e.pointerId);
    dedos.delete(e.pointerId);
    if (!dedos.size) {
      caja.classList.remove("arrastra");
      if (fue && p0 && performance.now() - t0 < 450 && Math.hypot(fue.x - p0.x, fue.y - p0.y) < 8 && e.type === "pointerup") tocar?.(e.clientX, e.clientY);
      o.arr = null; p0 = null;
    } else { o.arr = null; pinza = 0; }
  };
  lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
  lienzo.addEventListener("wheel", (e) => { e.preventDefault(); o.dist = clamp(o.dist + e.deltaY * .004 * o.dist / 7, o.min, o.max); o.quieto = performance.now(); }, { passive: false });
  o.reiniciar = () => Object.assign(o, ini, { vaz: 0, vel: 0 });
  // Posición de cámara en torno al objetivo.
  o.aplicar = (cam, objetivo, giroAuto) => {
    if (!o.arr && !dedos.size) {
      if (giroAuto && performance.now() - o.quieto > 3500) o.az -= giroAuto;
      o.az -= o.vaz * .9; o.vaz *= .93;
    }
    cam.position.set(objetivo.x + Math.sin(o.az) * Math.cos(o.el) * o.dist, objetivo.y + Math.sin(o.el) * o.dist, objetivo.z + Math.cos(o.az) * Math.cos(o.el) * o.dist);
    cam.lookAt(objetivo);
  };
  return o;
}

// Estilos propios de las tres escenas (prefijo .t3-), inyectados una sola vez.
let estilosPuestos = false;
function estilos() {
  if (estilosPuestos) return;
  estilosPuestos = true;
  const s = document.createElement("style");
  s.textContent = `
.t3{--t3-tinta:#17130f;--t3-grafito:#6e655d;--t3-linea:#e8e2db;--t3-rojo:#c8362b;--t3-azul:#4b5fb8;font-variant-numeric:tabular-nums}
.t3-lienzo{position:absolute;inset:0;cursor:grab}
.t3-lienzo.arrastra{cursor:grabbing}
.t3-lienzo canvas{width:100%!important;height:100%!important;display:block}
.t3-chips{position:absolute;left:12px;right:12px;top:50px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;z-index:2;padding:2px 24px 4px 0;-webkit-mask:linear-gradient(90deg,#000 calc(100% - 28px),transparent);mask:linear-gradient(90deg,#000 calc(100% - 28px),transparent)}
.t3-chips::-webkit-scrollbar{display:none}
.t3-chips button{flex:none;font:inherit;font-size:12px;font-weight:500;color:var(--t3-tinta);background:rgba(255,255,255,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid var(--t3-linea);border-radius:99px;padding:5px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.t3-chips button i{width:8px;height:8px;border-radius:50%;flex:none}
.t3-chips button.on{background:var(--t3-tinta);color:#fff;border-color:var(--t3-tinta)}
.t3-hud{position:absolute;left:12px;right:12px;bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:8px;pointer-events:none;flex-wrap:wrap;z-index:2}
.t3-hud>*{pointer-events:auto}
.t3-dato{color:var(--t3-tinta);background:rgba(255,255,255,.8);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid var(--t3-linea);border-radius:12px;padding:8px 12px;min-width:150px}
.t3-dato>span{display:block;font-size:11px;color:var(--t3-grafito)}
.t3-dato b{font-size:20px;font-weight:600;display:flex;align-items:center;gap:6px;line-height:1.2}
.t3-dato em{font-style:normal}
.t3-dato small{display:block;font-size:12px;font-weight:600;color:var(--t3-rojo);margin-top:1px}
.t3-dato small.dia{color:var(--t3-azul)}
.t3-lat{width:9px;height:9px;border-radius:50%;background:var(--t3-rojo);flex:none}
.t3-lat.on{animation:t3-lat .45s ease-out}
@keyframes t3-lat{0%{transform:scale(1.8);box-shadow:0 0 0 6px rgba(200,54,43,.25)}}
.t3-ley[hidden]{display:none}
.t3-ley{display:flex;gap:10px;font-size:11px;color:var(--t3-grafito);margin-top:6px;padding-top:6px;border-top:1px solid var(--t3-linea)}
.t3-ley i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
.t3-ctl{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;align-items:center}
.t3-ctl button{font:inherit;color:var(--t3-tinta);border:1px solid var(--t3-linea);background:rgba(255,255,255,.84);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:10px;padding:7px 11px;font-size:13px;font-weight:500;cursor:pointer}
.t3-ctl button.on{background:var(--t3-tinta);color:#fff;border-color:var(--t3-tinta)}
.t3-ctl button:disabled{opacity:.5;cursor:default}
.t3-ctl .t3-seg{display:inline-flex;background:rgba(255,255,255,.84);border:1px solid var(--t3-linea);border-radius:10px;padding:2px;gap:2px}
.t3-ctl .t3-seg button{border:0;background:transparent;border-radius:8px;padding:5px 8px;font-size:12px;color:var(--t3-grafito);backdrop-filter:none}
.t3-ctl .t3-seg button.on{background:var(--t3-tinta);color:#fff}
.t3-ctl .t3-go{background:var(--t3-tinta);color:#fff;border-color:var(--t3-tinta);font-weight:600}
.t3-tarjeta{color:var(--t3-tinta);position:absolute;right:12px;top:92px;width:min(268px,calc(100% - 24px));max-height:calc(100% - 180px);overflow:auto;background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--t3-linea);border-radius:14px;padding:12px 14px 12px;font-size:13px;z-index:3;box-shadow:0 18px 40px -24px rgba(60,35,20,.45);line-height:1.45}
.t3-tarjeta[hidden]{display:none}
.t3-tarjeta .t3-x{position:absolute;top:6px;right:6px;width:26px;height:26px;border:0;background:transparent;font:inherit;font-size:18px;line-height:1;cursor:pointer;color:var(--t3-grafito);border-radius:8px}
.t3-tarjeta .t3-x:hover{background:rgba(23,19,15,.06)}
.t3-tarjeta .t3-tipo{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--t3-grafito)}
.t3-tarjeta .t3-tipo i{width:8px;height:8px;border-radius:50%}
.t3-tarjeta h5{font-size:16px;font-weight:600;letter-spacing:-.01em;margin:2px 24px 0 0;line-height:1.2}
.t3-tarjeta p{margin-top:6px;color:#3f3833}
.t3-tarjeta .t3-clave{margin-top:8px;padding:8px 10px;border-radius:10px;background:#fdf1eb;color:var(--t3-tinta)}
.t3-tarjeta .t3-clave b{display:block;font-size:11px;color:#b4532f;margin-bottom:2px}
.t3-tarjeta small{display:block;margin-top:8px;color:var(--t3-grafito);font-size:11px}
.t3-tarjeta ul{margin:6px 0 0;padding-left:16px;color:#3f3833}
.t3-tarjeta li{margin-top:3px}
.t3-fase{min-width:200px;max-width:min(360px,60%);backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(255,255,255,.94)}
.t3-dato.t3-fase b{display:block;color:var(--t3-tinta);font-size:13px}
.t3-fase .t3-barra{height:4px;border-radius:99px;background:var(--t3-linea);margin-top:6px;overflow:hidden}
.t3-fase .t3-barra i{display:block;height:100%;background:var(--t3-tinta);width:0;border-radius:99px}
.t3-fase b{font-size:13px;line-height:1.3}
.t3-pista{position:absolute;left:50%;transform:translateX(-50%);bottom:84px;font-size:12px;color:var(--t3-grafito);background:rgba(255,255,255,.8);border:1px solid var(--t3-linea);border-radius:99px;padding:4px 10px;pointer-events:none;z-index:2;white-space:nowrap}
@container (max-width:520px){
  .t3-tarjeta{left:12px;right:12px;top:auto;bottom:12px;width:auto;max-height:58%}
  .t3-con-tarjeta .t3-hud,.t3-con-tarjeta .t3-pista{display:none}
  .t3-ctl button{padding:6px 9px;font-size:12px}
  .t3-dato{min-width:0}
  .t3-dato b{font-size:17px}
  .t3-fase{max-width:100%;width:100%;padding:6px 10px}
  .t3-dato.t3-fase b{font-size:12px}
  .t3-pista{display:none}
}
@media (prefers-reduced-motion:reduce){.t3-lat.on{animation:none}}`;
  document.head.append(s);
}

const ROJO = "#c8362b", AZUL = "#4b5fb8";

// ================= 1. Corazón anatómico =================
// Hechos verificados en Texas Heart Institute, Cleveland Clinic y Wikipedia («Heart»).
const PARTES = [
  { id: "datos", n: "Datos del corazón", chip: "ⓘ Datos" },
  { id: "ad", n: "Aurícula derecha", rico: false, que: "Recibe la sangre pobre en oxígeno que vuelve de todo el cuerpo por las dos venas cavas y la pasa al ventrículo derecho.", dato: "En su pared superior está el nodo sinusal, el marcapasos natural que marca el ritmo de cada latido.", fuente: "Wikipedia (Heart)" },
  { id: "vd", n: "Ventrículo derecho", rico: false, que: "Bombea la sangre pobre en oxígeno hacia los pulmones a través del tronco pulmonar.", dato: "Su pared es mucho más delgada que la del ventrículo izquierdo: solo empuja hasta los pulmones, un circuito corto y de baja presión.", fuente: "Wikipedia (Heart)" },
  { id: "ai", n: "Aurícula izquierda", rico: true, que: "Recibe la sangre ya oxigenada que llega de los pulmones y la pasa al ventrículo izquierdo a través de la válvula mitral.", dato: "Cuatro venas pulmonares desembocan en ella, dos de cada pulmón.", fuente: "Wikipedia (Heart)" },
  { id: "vi", n: "Ventrículo izquierdo", rico: true, que: "La cámara más grande y fuerte del corazón: impulsa la sangre oxigenada a todo el cuerpo a través de la aorta.", dato: "Su pared mide cerca de 1,3 cm (media pulgada), la más gruesa del corazón, porque debe vencer la presión de todo el circuito arterial.", fuente: "Texas Heart Institute" },
  { id: "tric", n: "Válvula tricúspide", rico: false, dentro: true, que: "Entre la aurícula y el ventrículo derechos. Se abre en diástole para llenar el ventrículo y se cierra en sístole para que la sangre no regrese.", dato: "Tiene tres valvas (de ahí el nombre). La tricúspide y la mitral son las válvulas auriculoventriculares.", fuente: "Cleveland Clinic" },
  { id: "pulm", n: "Válvula pulmonar", rico: false, dentro: true, que: "Entre el ventrículo derecho y el tronco pulmonar. Se abre cuando el ventrículo se contrae y se cierra cuando se relaja.", dato: "La pulmonar y la aórtica son válvulas semilunares: tres bolsillos que se llenan y se cierran solos cuando la sangre intenta volver.", fuente: "Cleveland Clinic" },
  { id: "mitral", n: "Válvula mitral", rico: true, dentro: true, que: "Entre la aurícula y el ventrículo izquierdos. Deja pasar la sangre oxigenada al ventrículo y evita que vuelva a la aurícula cuando este se contrae.", dato: "Es la única válvula del corazón con dos valvas (bicúspide); las otras tres tienen tres.", fuente: "Wikipedia (Heart)" },
  { id: "aort", n: "Válvula aórtica", rico: true, dentro: true, que: "Entre el ventrículo izquierdo y la aorta. Se abre en cada sístole para dejar salir la sangre al cuerpo.", dato: "Justo por encima de ella nacen las dos arterias coronarias, que riegan al propio músculo del corazón.", fuente: "Wikipedia (Heart)" },
  { id: "sept", n: "Tabique (septo)", rico: true, dentro: true, que: "Pared muscular que separa el lado derecho del izquierdo, en aurículas y en ventrículos. La sangre pobre y la rica en oxígeno nunca se mezclan.", dato: "La arteria descendente anterior riega la parte frontal del tabique; la coronaria derecha, la parte posterior.", fuente: "Cleveland Clinic" },
  { id: "vcs", n: "Vena cava superior", rico: false, que: "Trae a la aurícula derecha la sangre pobre en oxígeno de la cabeza, el cuello y los brazos.", dato: "Las dos cavas desembocan en la aurícula derecha: la superior entra por arriba y la inferior por abajo.", fuente: "Cleveland Clinic" },
  { id: "vci", n: "Vena cava inferior", rico: false, que: "Trae a la aurícula derecha la sangre de la mitad inferior del cuerpo: abdomen y piernas.", dato: "El sistema completo de vasos sanguíneos mide más de 96 500 km; toda esa sangre vuelve al corazón por estas dos venas.", fuente: "Texas Heart Institute" },
  { id: "tp", n: "Tronco pulmonar", rico: false, que: "Arteria que sale del ventrículo derecho y se divide en las arterias pulmonares derecha e izquierda, una para cada pulmón.", dato: "Es la excepción de las arterias: lleva sangre pobre en oxígeno. Por eso aquí se pinta de azul.", fuente: "Wikipedia (Heart)" },
  { id: "vp", n: "Venas pulmonares", rico: true, que: "Cuatro venas que devuelven la sangre ya oxigenada desde los pulmones a la aurícula izquierda.", dato: "Son las únicas venas del cuerpo que llevan sangre rica en oxígeno; por eso se pintan de rojo.", fuente: "Wikipedia (Heart)" },
  { id: "aorta", n: "Aorta", rico: true, que: "La arteria más grande del cuerpo. Sale del ventrículo izquierdo, forma un arco del que salen las arterias de la cabeza y los brazos, y desciende por el tórax.", dato: "El corazón bombea cerca de 7 571 litros de sangre al día (unos 2 000 galones), todos a través de la aorta.", fuente: "Texas Heart Institute" },
  { id: "cor", n: "Arterias coronarias", rico: true, que: "Nacen de la aorta y recorren la superficie del corazón para alimentar al propio músculo: coronaria derecha, descendente anterior y circunfleja. Van sobre cojines de grasa en los surcos.", dato: "La descendente anterior riega el frente del ventrículo izquierdo y el tabique; la circunfleja, su costado y espalda; la derecha, las cavidades derechas.", fuente: "Cleveland Clinic" },
];
const PARTE = Object.fromEntries(PARTES.map((p) => [p.id, p]));

export function corazon(el) {
  const THREE = window.THREE;
  if (!THREE) { el.innerHTML = '<p class="sutil">No se pudo cargar el motor 3D.</p>'; return { pausar() {}, reanudar() {} }; }
  estilos();
  el.classList.add("t3");
  el.innerHTML = `<div class="t3-lienzo"></div>
    <div class="t3-chips" role="listbox" aria-label="Partes del corazón">${PARTES.map((p) => `<button data-p="${p.id}" role="option" aria-selected="false">${p.chip ? p.chip : `<i style="background:${p.rico ? ROJO : AZUL}"></i>${p.n}`}</button>`).join("")}</div>
    <aside class="t3-tarjeta" hidden aria-live="polite"></aside>
    <div class="t3-pista">Toca una parte del corazón</div>
    <div class="t3-hud">
      <div class="t3-dato"><span>Frecuencia en reposo</span><b><i class="t3-lat"></i><em class="t3-bpm">72</em> lpm</b><small class="t3-ciclo dia">Diástole · se llena</small>
        <div class="t3-ley" hidden><span><i style="background:${AZUL}"></i>Pobre en oxígeno</span><span><i style="background:${ROJO}"></i>Rica en oxígeno</span></div></div>
      <div class="t3-ctl">
        <button data-k="latir" class="on" aria-pressed="true">Latido</button>
        <button data-k="flujo" aria-pressed="false">Flujo de sangre</button>
        <button data-k="dentro" aria-pressed="false">Ver dentro</button>
        <button data-k="malla" aria-pressed="false">Malla</button>
        <button data-k="vista">Restablecer vista</button>
      </div>
    </div>`;
  const caja = $(".t3-lienzo", el), tarjeta = $(".t3-tarjeta", el), pista = $(".t3-pista", el);
  const rend = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  rend.setPixelRatio(Math.min(devicePixelRatio, 2));
  rend.outputEncoding = THREE.sRGBEncoding;
  rend.toneMapping = THREE.ACESFilmicToneMapping;
  rend.toneMappingExposure = 1;
  caja.append(rend.domElement);
  const escena = new THREE.Scene();
  escena.environment = estudio(THREE, rend);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 100);
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const relieve = texturaRuido(THREE, 256, 128, 90, 4);
  relieve.repeat.set(3, 3);

  // Materiales: músculo con barniz húmedo y brillo sedoso; vasos por color de la sangre.
  const material = (color, extra = {}) => new THREE.MeshPhysicalMaterial({
    color: lin(color), roughness: .52, metalness: 0, clearcoat: .32, clearcoatRoughness: .42, envMapIntensity: .8,
    bumpMap: relieve, bumpScale: .012, sheen: lin(0x3a0c0c), emissive: lin(0x000000), ...extra,
  });
  const COLOR = { musculoD: 0x7d3139, musculoI: 0x9a2c22, vena: 0x4a4f9c, arteria: 0xb8352a, grasa: 0xd6c49a, valva: 0xf1e1cf };

  // --- Masa ventricular: esfera deformada con ápice, surcos y ruido ---
  const AZ_A = .3, AZ_P = Math.PI - .1; // surcos interventriculares anterior y posterior
  const factorVD = (az, y) => paso(1.77 - Math.abs(difAng(az, -Math.PI / 2)), 0, .3) * paso(y, -.85, -.55);
  function forma(v, salida) {
    const az = Math.atan2(v.x, v.z), phi = Math.acos(clamp(v.y, -1, 1));
    let r = 1;
    const dA = difAng(az, AZ_A), dP = difAng(az, AZ_P), bajoBase = paso(.78 - v.y, 0, .3);
    r -= .05 * Math.exp(-(dA * dA) / .045) * bajoBase;
    r -= .04 * Math.exp(-(dP * dP) / .06) * bajoBase;
    r -= .035 * Math.exp(-Math.pow((phi - .95) / .11, 2));          // surco auriculoventricular
    r += .09 * (1 - factorVD(az, v.y)) * (1 - Math.abs(v.y)) * .9;   // ventrículo izquierdo más grueso
    r += .026 * ruido3(v.x * 3.5 + 7, v.y * 3.5, v.z * 3.5) + .009 * ruido3(v.x * 9, v.y * 9 + 3, v.z * 9);
    let x = v.x * r, y = v.y * r, z = v.z * r;
    if (y < 0) { const k = 1 + y * .34; x *= k; z *= k; x += y * y * .3; z += y * y * .12; y *= 1.14; }
    else { x *= 1 + y * .1; y *= .8; }
    x *= 1.08; z *= .88;
    return salida.set(x, y, z);
  }
  const PIV = .62; // pivote del latido ventricular (la base)
  const gVent = new THREE.Group(), gAur = new THREE.Group(), raiz = new THREE.Group();
  gVent.position.y = PIV; gAur.position.y = PIV;
  const geoV = new THREE.SphereGeometry(1, 128, 96);
  {
    const p = geoV.attributes.position, v = new THREE.Vector3(), q = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); forma(v, q); p.setXYZ(i, q.x, q.y - PIV, q.z); }
    geoV.computeVertexNormals();
  }
  // Color por vértice: tinte púrpura en el ventrículo derecho, rojo en el izquierdo.
  const cD = lin(COLOR.musculoD), cI = lin(COLOR.musculoI), colV = new Float32Array(geoV.attributes.position.count * 3);
  const regionVD = (x, y, z) => {
    const yy = y + PIV, y0 = yy < 0 ? yy / 1.14 : yy / .8;
    const ax = x / 1.08 - (yy < 0 ? y0 * y0 * .3 : 0), az = z / .88 - (yy < 0 ? y0 * y0 * .12 : 0);
    return factorVD(Math.atan2(ax, az), y0);
  };
  function pintarVentriculos(sel) {
    const p = geoV.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = regionVD(p.getX(i), p.getY(i), p.getZ(i));
      let r = cI.r + (cD.r - cI.r) * f, g = cI.g + (cD.g - cI.g) * f, b = cI.b + (cD.b - cI.b) * f;
      const k = sel === "vd" ? f : sel === "vi" ? 1 - f : 0;
      r += .5 * k; g += .14 * k; b += .08 * k;
      colV[i * 3] = r; colV[i * 3 + 1] = g; colV[i * 3 + 2] = b;
    }
    geoV.attributes.color.needsUpdate = true;
  }
  geoV.setAttribute("color", new THREE.BufferAttribute(colV, 3));
  pintarVentriculos(null);
  const matV = material(0xffffff, { vertexColors: true });
  const ventriculos = new THREE.Mesh(geoV, matV);
  ventriculos.userData.parte = "vent";
  gVent.add(ventriculos);

  // Aurículas y orejuelas: elipsoides con ruido, sobre la base.
  const elipsoide = (rad, centro, color, parte, grupo, piv) => {
    const g = new THREE.SphereGeometry(1, 48, 32), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const r = 1 + .05 * ruido3(v.x * 3 + centro[0] * 5, v.y * 3, v.z * 3);
      p.setXYZ(i, v.x * rad[0] * r + centro[0], v.y * rad[1] * r + centro[1] - piv, v.z * rad[2] * r + centro[2]);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, material(color));
    m.userData.parte = parte; grupo.add(m); return m;
  };
  elipsoide([.5, .42, .46], [-.55, .78, .02], COLOR.musculoD, "ad", gAur, PIV);
  elipsoide([.26, .2, .2], [-.42, .92, .46], COLOR.musculoD, "ad", gAur, PIV);       // orejuela derecha
  elipsoide([.56, .42, .5], [.33, .8, -.42], COLOR.musculoI, "ai", gAur, PIV);
  elipsoide([.24, .16, .18], [.78, .86, .18], COLOR.musculoI, "ai", gAur, PIV);     // orejuela izquierda

  // Vasos: tubos sobre curvas suaves. Los coronarios se proyectan a la superficie.
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const tubo = (pts, r, color, parte, grupo = raiz, piv = 0, cerrado = false, extra = {}) => {
    const curva = new THREE.CatmullRomCurve3(pts.map(V3), cerrado, "centripetal", .5);
    const g = new THREE.TubeGeometry(curva, Math.max(24, pts.length * 10), r, 18, cerrado);
    g.translate(0, -piv, 0);
    const m = new THREE.Mesh(g, material(color, extra));
    m.userData.parte = parte; grupo.add(m); return m;
  };
  tubo([[.05, .62, -.02], [.02, .95, -.05], [-.08, 1.3, -.08], [.05, 1.72, -.22], [.42, 1.74, -.45], [.62, 1.3, -.68], [.64, .6, -.74], [.6, -.2, -.74]], .19, COLOR.arteria, "aorta");
  tubo([[-.02, 1.68, -.18], [0, 2.1, -.14], [.03, 2.4, -.12]], .07, COLOR.arteria, "aorta");      // tronco braquiocefálico
  tubo([[.18, 1.74, -.3], [.18, 2.15, -.3], [.19, 2.4, -.3]], .055, COLOR.arteria, "aorta");       // carótida izquierda
  tubo([[.36, 1.72, -.4], [.42, 2.1, -.44], [.46, 2.35, -.46]], .055, COLOR.arteria, "aorta");    // subclavia izquierda
  tubo([[-.18, .5, .42], [-.08, .85, .5], [.1, 1.12, .4], [.3, 1.34, .18]], .17, COLOR.vena, "tp"); // tronco pulmonar
  tubo([[.28, 1.33, .16], [-.1, 1.34, -.02], [-.55, 1.3, -.22], [-.95, 1.26, -.38]], .11, COLOR.vena, "tp");   // arteria pulmonar derecha
  tubo([[.3, 1.33, .16], [.62, 1.36, 0], [.95, 1.3, -.2], [1.2, 1.2, -.34]], .11, COLOR.vena, "tp");          // arteria pulmonar izquierda
  tubo([[-.5, 2.2, -.06], [-.52, 1.6, -.06], [-.54, 1.25, -.04], [-.56, .95, 0]], .17, COLOR.vena, "vcs");
  tubo([[-.52, .55, -.12], [-.5, .05, -.3], [-.46, -.6, -.4], [-.42, -1.25, -.48]], .17, COLOR.vena, "vci");
  [[[.1, .9, -.6], [-.25, .92, -.74], [-.75, .96, -.86]], [[.1, .72, -.62], [-.25, .66, -.76], [-.75, .58, -.9]],
   [[.6, .92, -.62], [.9, .96, -.72], [1.3, 1.0, -.8]], [[.6, .72, -.64], [.9, .66, -.74], [1.3, .58, -.82]]]
    .forEach((pts) => tubo(pts, .085, COLOR.arteria, "vp"));

  // Coronarias y cojines de grasa en los surcos, pegados a la superficie ventricular.
  const sobreSuperficie = (puntos, escala) => puntos.map(([az, phi]) => {
    const v = new THREE.Vector3(Math.sin(phi) * Math.sin(az), Math.cos(phi), Math.sin(phi) * Math.cos(az)), q = new THREE.Vector3();
    return forma(v, q).multiplyScalar(escala).toArray();
  });
  const rango = (az0, az1, phi0, phi1, n) => Array.from({ length: n + 1 }, (_, i) => [az0 + (az1 - az0) * i / n, phi0 + (phi1 - phi0) * i / n]);
  const gCor = new THREE.Group(); gVent.add(gCor);
  const grasa = (pts, r) => tubo(pts, r, COLOR.grasa, null, gCor, PIV, false, { roughness: .6, clearcoat: .2, sheen: null });
  const cor = (pts, r, color = 0xc9453a) => tubo(pts, r, color, "cor", gCor, PIV, false, { clearcoat: .7 });
  const lad = rango(AZ_A, AZ_A, .95, 2.75, 22), pda = rango(AZ_P, AZ_P, 1.05, 2.45, 16);
  const circ = rango(.45, 2.55, 1.0, 1.02, 18), rca = rango(-.15, -2.75, 1.0, 1.04, 22);
  grasa(sobreSuperficie(lad, .98), .042); grasa(sobreSuperficie(pda, .98), .036);
  cor(sobreSuperficie(lad, 1.025), .03); cor(sobreSuperficie(circ, 1.03), .028); cor(sobreSuperficie(rca, 1.03), .03); cor(sobreSuperficie(pda, 1.025), .024);
  cor([[.02, .76, .17], [.14, .72, .3], ...sobreSuperficie(rango(AZ_A, AZ_A, .9, .96, 1), 1.02)], .03);                 // tronco coronario izquierdo
  cor([[-.1, .74, .2], [-.16, .7, .28], ...sobreSuperficie(rango(-.15, -.15, .98, 1.0, 1), 1.025)], .03);              // nacimiento de la derecha
  cor(sobreSuperficie(rango(AZ_A + .1, AZ_A + .1, 1.0, 2.6, 18), 1.018), .022, 0x4a4f9c);                               // vena cardíaca mayor
  cor(sobreSuperficie(rango(.4, 1.9, 1.08, 1.1, 14), 1.02), .02, 0x4a4f9c);                                             // seno coronario

  // Interior: válvulas (anillos) y tabique. Solo se ven en «Ver dentro».
  const gDentro = new THREE.Group(); gVent.add(gDentro);
  const anillo = (centro, r, rot, parte) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * .22, 10, 36), material(COLOR.valva, { roughness: .5, clearcoat: .3, sheen: null }));
    m.position.set(centro[0], centro[1] - PIV, centro[2]); m.rotation.set(rot[0], rot[1], rot[2]);
    m.userData.parte = parte; gDentro.add(m); return m;
  };
  anillo([-.48, .48, .18], .2, [1.35, 0, .3], "tric");
  anillo([-.14, .62, .42], .13, [.9, -.3, 0], "pulm");
  anillo([.32, .5, -.2], .18, [1.4, 0, -.3], "mitral");
  anillo([.02, .68, -.02], .13, [.4, 0, 0], "aort");
  {
    const g = new THREE.PlaneGeometry(1.15, 1.45, 12, 16), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); p.setXYZ(i, v.x, v.y, Math.sin(v.y * 1.6) * .08 - v.x * v.x * .18); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, material(0xa8585c, { side: THREE.DoubleSide, sheen: null }));
    m.position.set(.1, -.12 - PIV + .62, .02); m.rotation.set(0, AZ_A + Math.PI / 2 - .2, .35);
    m.userData.parte = "sept"; gDentro.add(m);
  }
  gDentro.visible = false;

  raiz.add(gVent, gAur);
  raiz.rotation.z = .2; raiz.rotation.y = -.15;
  escena.add(raiz);
  escena.add(sombraContacto(THREE, 3.6, -1.85));
  const luz = new THREE.DirectionalLight(0xfff3e8, 1.4); luz.position.set(3, 5, 4); escena.add(luz);
  const contra = new THREE.DirectionalLight(0xdfe6ff, .6); contra.position.set(-4, 2, -5); escena.add(contra);
  escena.add(new THREE.AmbientLight(0xffffff, .12));

  // Flujo de sangre: partículas sobre cuatro recorridos (dos azules, dos rojos).
  const RUTAS = [
    { c: AZUL, pts: [[-.5, 2.2, -.06], [-.54, 1.2, -.04], [-.56, .82, .02], [-.48, .5, .18], [-.48, .05, .3], [-.3, -.35, .35], [-.2, .2, .42], [-.14, .62, .42], [.1, 1.12, .4], [.28, 1.33, .16], [-.55, 1.3, -.22], [-.95, 1.26, -.38]] },
    { c: AZUL, pts: [[-.42, -1.25, -.48], [-.5, -.2, -.3], [-.55, .55, -.1], [-.5, .8, .04], [-.48, .5, .18], [-.45, .0, .32], [-.25, -.3, .36], [-.14, .62, .42], [.1, 1.12, .4], [.3, 1.33, .16], [.95, 1.3, -.2], [1.2, 1.2, -.34]] },
    { c: ROJO, pts: [[-.75, .96, -.86], [-.25, .92, -.74], [.3, .82, -.42], [.32, .5, -.2], [.42, .05, -.02], [.55, -.5, .12], [.3, .1, -.02], [.02, .68, -.02], [-.08, 1.3, -.08], [.05, 1.72, -.22], [.42, 1.74, -.45], [.62, 1.3, -.68], [.6, -.2, -.74]] },
    { c: ROJO, pts: [[1.3, .58, -.82], [.9, .66, -.74], [.36, .78, -.42], [.32, .5, -.2], [.46, -.05, .0], [.5, -.45, .1], [.28, .12, -.04], [.02, .68, -.02], [-.08, 1.3, -.08], [.03, 1.72, -.2], [0, 2.4, -.14]] },
  ];
  const N_PART = 110, muestras = [];
  const partGeo = new THREE.BufferGeometry();
  const partPos = new Float32Array(RUTAS.length * N_PART * 3), partCol = new Float32Array(RUTAS.length * N_PART * 3), partIni = [];
  RUTAS.forEach((r, k) => {
    muestras.push(new THREE.CatmullRomCurve3(r.pts.map(V3), false, "centripetal").getSpacedPoints(400));
    const c = lin(r.c === AZUL ? 0x6b7fe8 : 0xff5a46);
    for (let i = 0; i < N_PART; i++) {
      const j = k * N_PART + i;
      partCol.set([c.r, c.g, c.b], j * 3);
      partIni.push({ t0: i / N_PART + (hash(i, k, 1) - .5) / N_PART, j: [(hash(i, k, 2) - .5) * .07, (hash(i, k, 3) - .5) * .07, (hash(i, k, 4) - .5) * .07] });
    }
  });
  partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
  partGeo.setAttribute("color", new THREE.BufferAttribute(partCol, 3));
  const puntoTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const x = cv.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.8)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const particulas = new THREE.Points(partGeo, new THREE.PointsMaterial({ size: .075, map: puntoTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  particulas.visible = false; particulas.renderOrder = 5;
  raiz.add(particulas);
  let tiempoFlujo = 0;
  function moverParticulas(dt, vel) {
    tiempoFlujo += dt * vel;
    for (let k = 0; k < RUTAS.length; k++) {
      const m = muestras[k];
      for (let i = 0; i < N_PART; i++) {
        const j = k * N_PART + i, q = partIni[j], t = ((q.t0 + tiempoFlujo) % 1 + 1) % 1;
        const f = t * 399, a = Math.floor(f), b = Math.min(399, a + 1), u = f - a;
        partPos[j * 3] = m[a].x + (m[b].x - m[a].x) * u + q.j[0];
        partPos[j * 3 + 1] = m[a].y + (m[b].y - m[a].y) * u + q.j[1];
        partPos[j * 3 + 2] = m[a].z + (m[b].z - m[a].z) * u + q.j[2];
      }
    }
    partGeo.attributes.position.needsUpdate = true;
  }

  // Materiales que se vuelven translúcidos en «Ver dentro»; las coronarias casi no.
  const opacos = [];
  raiz.traverse((o) => { if (o.isMesh && o.material && o !== particulas) opacos.push(o); });
  const estado = { latir: true, flujo: false, dentro: false, malla: false, sel: null };
  function aplicarDentro() {
    const on = estado.dentro || estado.flujo || (estado.sel && PARTE[estado.sel]?.dentro);
    for (const m of opacos) {
      const cor = m.parent === gCor, interno = m.parent === gDentro;
      m.material.transparent = on && !interno;
      m.material.opacity = on && !interno ? (cor ? .85 : .34) : 1;
      m.material.depthWrite = !on || interno;
    }
    gDentro.visible = !!on;
    particulas.visible = estado.flujo;
    $(".t3-ley", el).hidden = !estado.flujo;
  }

  // Selección: resaltado y tarjeta.
  const seleccionables = () => opacos.filter((m) => m.userData.parte && m.visible && (m.parent !== gDentro || gDentro.visible));
  function resaltar(id) {
    for (const m of opacos) if (m.material.emissive) m.material.emissive.setHex(m.userData.parte && m.userData.parte === id ? 0x7a2a16 : 0);
    pintarVentriculos(id);
  }
  function mostrarTarjeta(id) {
    const p = PARTE[id];
    if (!p) { tarjeta.hidden = true; el.classList.remove("t3-con-tarjeta"); return; }
    tarjeta.innerHTML = id === "datos"
      ? `<button class="t3-x" aria-label="Cerrar">×</button><span class="t3-tipo">Ficha</span><h5>El corazón en números</h5>
        <ul><li>Late entre <b>60 y 100 veces por minuto</b> en reposo: unas <b>100 000</b> al día.</li>
        <li>Bombea unos <b>5 litros por minuto</b> (70 ml por latido) y cerca de <b>7 571 litros al día</b>.</li>
        <li>Pesa entre <b>250 y 350 g</b> y tiene el tamaño de un puño.</li>
        <li><b>Sístole</b>: los ventrículos se contraen y expulsan la sangre. <b>Diástole</b>: se relajan y se llenan.</li>
        <li>Recorrido: cuerpo → venas cavas → aurícula derecha → tricúspide → ventrículo derecho → pulmonar → pulmones → venas pulmonares → aurícula izquierda → mitral → ventrículo izquierdo → aorta → cuerpo.</li></ul>
        <small>Fuentes: Texas Heart Institute, Cleveland Clinic, Wikipedia (Heart).</small>`
      : `<button class="t3-x" aria-label="Cerrar">×</button><span class="t3-tipo"><i style="background:${p.rico ? ROJO : AZUL}"></i>Sangre ${p.rico ? "rica" : "pobre"} en oxígeno</span>
        <h5>${esc(p.n)}</h5><p>${esc(p.que)}</p><div class="t3-clave"><b>Dato clave</b>${esc(p.dato)}</div><small>Fuente: ${esc(p.fuente)}</small>`;
    tarjeta.hidden = false; el.classList.add("t3-con-tarjeta");
    tarjeta.scrollTop = 0;
  }
  function seleccionar(id) {
    estado.sel = id === estado.sel ? null : id;
    el.querySelectorAll(".t3-chips button").forEach((b) => { const on = b.dataset.p === estado.sel; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); if (on) b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); });
    resaltar(estado.sel === "datos" ? null : estado.sel);
    mostrarTarjeta(estado.sel);
    pista.hidden = !!estado.sel || pistaUsada;
    aplicarDentro();
  }
  let pistaUsada = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tocar(cx, cy) {
    const r = rend.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(seleccionables(), false)[0];
    pistaUsada = true; pista.hidden = true;
    if (!hit) { if (estado.sel) seleccionar(estado.sel); return; }
    let id = hit.object.userData.parte;
    if (id === "vent") { const q = hit.object.worldToLocal(hit.point.clone()); id = regionVD(q.x, q.y, q.z) > .5 ? "vd" : "vi"; }
    if (id !== estado.sel) seleccionar(id); else { resaltar(id); mostrarTarjeta(id); }
  }
  const orb = orbita(rend.domElement, caja, { az: .45, el: .1, dist: 8.6, min: 4, max: 13, elMin: -.5, elMax: .9 }, tocar);
  const objetivo = new THREE.Vector3(0, .5, 0);

  el.addEventListener("click", (e) => {
    const chip = e.target.closest(".t3-chips button");
    if (chip) { seleccionar(chip.dataset.p); return; }
    if (e.target.closest(".t3-x")) { seleccionar(estado.sel); return; }
    const b = e.target.closest("[data-k]");
    if (!b) return;
    const k = b.dataset.k;
    if (k === "vista") { orb.reiniciar(); return; }
    estado[k] = !estado[k];
    b.classList.toggle("on", estado[k]); b.setAttribute("aria-pressed", estado[k]);
    if (k === "malla") for (const m of opacos) m.material.wireframe = estado.malla;
    if (k === "flujo" || k === "dentro") aplicarDentro();
  });

  function medir() {
    const r = caja.getBoundingClientRect();
    if (!r.width) return;
    rend.setSize(r.width, r.height, false);
    cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
    cam.fov = r.width < r.height ? 38 : 30; cam.updateProjectionMatrix();
  }
  const bpmEl = $(".t3-bpm", el), latEl = $(".t3-lat", el), cicloEl = $(".t3-ciclo", el);
  let ultimaFase = 0, ultimoT = 0, enSistole = false, bpm = 72;
  const anim = bucle((t) => {
    const dt = ultimoT ? Math.min(.05, (t - ultimoT) / 1000) : .016; ultimoT = t;
    orb.aplicar(cam, objetivo, reducido() ? 0 : .0022);
    // Ciclo cardíaco a `bpm`: sístole (contracción ventricular) en el primer 38 %.
    const periodo = 60000 / bpm, fase = (t / periodo) % 1;
    const activo = estado.latir && !reducido();
    const s = activo ? Math.exp(-Math.pow((fase - .2) / .13, 2)) : 0;                                   // envolvente ventricular
    const a = activo ? Math.exp(-Math.pow((fase - .92) / .05, 2)) + Math.exp(-Math.pow((fase + .08) / .05, 2)) : 0; // contracción auricular
    gVent.scale.set(1 - s * .055, 1 - s * .045, 1 - s * .055);
    gAur.scale.set(1 - a * .05, 1 - a * .05, 1 - a * .05);
    const sist = activo ? fase > .04 && fase < .4 : false;
    if (sist !== enSistole) { enSistole = sist; cicloEl.textContent = sist ? "Sístole · expulsa" : "Diástole · se llena"; cicloEl.classList.toggle("dia", !sist); }
    if (activo && fase < ultimaFase) { latEl.classList.remove("on"); void latEl.offsetWidth; latEl.classList.add("on"); bpm = 70 + Math.round(hash(t, 1, 2) * 5); bpmEl.textContent = bpm; }
    ultimaFase = fase;
    if (estado.flujo) moverParticulas(dt, (reducido() ? .05 : .09) + s * .1);
    if (estado.sel && estado.sel !== "datos") {
      const k = .6 + .4 * Math.sin(t / 220);
      for (const m of opacos) if (m.userData.parte === estado.sel) m.material.emissiveIntensity = k;
    }
    rend.render(escena, cam);
  });
  new ResizeObserver(medir).observe(caja);
  return { pausar() { anim.pausar(); ultimoT = 0; }, reanudar() { medir(); anim.reanudar(); } };
}

// ================= 2. Pórtico de concreto armado =================
// Edificio de 2 × 2 vanos y 2 pisos. 1 unidad = 1 metro. Secuencia real de obra:
// excavación → zapatas → columnas → vigas y losa → escalera → siguiente piso.
const ELEMENTOS = {
  excav: { n: "Excavación", chip: "Excavación", rol: "Se abre el terreno hasta el estrato firme, aquí a 1,20 m, donde se apoyan las zapatas. Antes se traza en el suelo la posición de cada eje (A, B, C y 1, 2, 3).", dato: "La profundidad de cimentación la fija el estudio de suelos; en Lima la capacidad portante del cascajo ronda 3 a 4 kg/cm², y en suelos arenosos baja a 1." },
  zapata: { n: "Zapata aislada Z-1 · 1,20 × 1,20 × 0,50 m", chip: "Zapata", rol: "Reparte la carga concentrada de la columna sobre un área grande de terreno para no superar su capacidad portante. Es el pie del edificio.", dato: "Lleva una parrilla de acero en la cara inferior: ahí el concreto trabaja a tracción cuando la zapata se flexiona por la reacción del suelo." },
  columna: { n: "Columna C-1 · 30 × 30 cm", chip: "Columna", rol: "Lleva las cargas de vigas y losas hasta la zapata. Trabaja a compresión y, en un sismo, a flexión: por eso tiene acero en las cuatro caras.", dato: "8 barras Ø 5/8″ con estribos Ø 3/8″ cada 15 cm. Cerca de los nudos los estribos van más juntos: confinan el concreto para que no se desgrane." },
  viga: { n: "Viga V-101 · 25 × 50 cm", chip: "Viga", rol: "Recibe la losa y entrega su carga a las columnas. Trabaja a flexión: se tracciona abajo en el centro del vano y arriba sobre los apoyos.", dato: "Por eso el acero principal va abajo al centro y se refuerza arriba en los extremos (los «bastones»). Columnas y vigas forman el pórtico que resiste el sismo." },
  losa: { n: "Losa aligerada · e = 20 cm", chip: "Losa", rol: "Forma el piso y reparte el peso a las vigas. Su rigidez en planta (el «diafragma») hace que todos los pórticos se muevan juntos en un sismo.", dato: "Viguetas de concreto cada 40 cm con ladrillo hueco entre ellas: pesa cerca de 300 kg/m², bastante menos que una losa maciza del mismo espesor." },
  escalera: { n: "Escalera · 17 contrapasos de 17,6 cm", chip: "Escalera", rol: "Losa inclinada apoyada en las vigas de los dos pisos. Conecta los niveles y es la vía de evacuación.", dato: "Regla de comodidad: 2 contrapasos + 1 paso ≈ 63 cm. Aquí 2 × 17,6 + 28 = 63,2 cm. Dos tramos con descanso para que el tramo entre en el vano de 4 m." },
  acero: { n: "Armadura de acero", chip: "Acero", rol: "El concreto resiste muy bien la compresión pero casi nada la tracción (cerca del 10 %). El acero corrugado toma esa tracción; juntos forman el concreto armado.", dato: "Barras de fy = 4 200 kg/cm². El recubrimiento de concreto (4 cm en columnas, 7,5 cm en zapatas contra el suelo) protege al acero del óxido y del fuego." },
  encofrado: { n: "Encofrado y puntales", chip: "Encofrado", rol: "Molde provisional de madera o metal que da la forma al concreto fresco y lo sostiene hasta que endurece y puede cargarse solo.", dato: "Los puntales de una losa se retiran a los 14–21 días según la carga; el concreto alcanza su resistencia de diseño (f′c = 210 kg/cm²) a los 28 días." },
};

export function estructura(el) {
  const THREE = window.THREE;
  if (!THREE) { el.innerHTML = '<p class="sutil">No se pudo cargar el motor 3D.</p>'; return { pausar() {}, reanudar() {} }; }
  estilos();
  el.classList.add("t3");
  el.innerHTML = `<div class="t3-lienzo" style="background:linear-gradient(#f9f7f3,#e4ded5)"></div>
    <div class="t3-chips" role="listbox" aria-label="Elementos estructurales">${Object.entries(ELEMENTOS).map(([id, e]) => `<button data-p="${id}" role="option" aria-selected="false">${esc(e.chip)}</button>`).join("")}</div>
    <aside class="t3-tarjeta" hidden aria-live="polite"></aside>
    <div class="t3-pista">Toca un elemento para saber qué hace</div>
    <div class="t3-hud">
      <div class="t3-dato t3-fase"><span class="t3-num">Listo para construir</span><b class="t3-nombre">Terreno trazado · 9 zapatas, 2 pisos</b><div class="t3-barra"><i></i></div></div>
      <div class="t3-ctl">
        <div class="t3-seg" role="group" aria-label="Velocidad"><button data-v="0.5">0,5×</button><button data-v="1" class="on">1×</button><button data-v="2">2×</button></div>
        <button data-k="vista">Restablecer vista</button>
        <button data-k="go" class="t3-go">▶ Construir con sonido</button>
      </div>
    </div>`;
  const caja = $(".t3-lienzo", el), tarjeta = $(".t3-tarjeta", el), pista = $(".t3-pista", el);
  const rend = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  rend.setPixelRatio(Math.min(devicePixelRatio, 2));
  rend.outputEncoding = THREE.sRGBEncoding;
  rend.toneMapping = THREE.ACESFilmicToneMapping;
  rend.toneMappingExposure = 1.05;
  rend.shadowMap.enabled = true; rend.shadowMap.type = THREE.PCFSoftShadowMap;
  caja.append(rend.domElement);
  const escena = new THREE.Scene();
  escena.environment = estudio(THREE, rend, false);
  const cam = new THREE.PerspectiveCamera(34, 1, .1, 200);
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();

  // Geometría del edificio.
  const NX = 2, NZ = 2, LX = 4, LZ = 3, PISOS = 2, H = 3;
  const COL = .3, VB = .25, VH = .5, LOSA = .2, ZAP = 1.2, ZH = .5, PROF = 1.2, POZO = 1.8;
  const ejes = []; for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) ejes.push({ x: i * LX, z: j * LZ, i, j });
  const centro = new THREE.Vector3(NX * LX / 2, 2.4, NZ * LZ / 2);

  // Materiales.
  const texC = texturaRuido(THREE, 256, 196, 70, 4), texB = texturaRuido(THREE, 256, 128, 120, 3);
  texC.encoding = THREE.sRGBEncoding; texC.repeat.set(2, 2); texB.repeat.set(2, 2);
  const concreto = new THREE.MeshStandardMaterial({ color: lin(0xcfc9bf), roughness: .92, metalness: 0, map: texC, bumpMap: texB, bumpScale: .012, envMapIntensity: .5 });
  const fresco = new THREE.MeshStandardMaterial({ color: lin(0x7f7a73), roughness: .55, metalness: 0, map: texC, bumpMap: texB, bumpScale: .008, envMapIntensity: .8 });
  const acero = new THREE.MeshStandardMaterial({ color: lin(0x6e4433), roughness: .55, metalness: .55, envMapIntensity: .9 });
  const madera = new THREE.MeshStandardMaterial({ color: lin(0xcfa15d), roughness: .8, metalness: 0, transparent: true, opacity: .5, depthWrite: false });
  const metalPuntal = new THREE.MeshStandardMaterial({ color: lin(0xc9c3b8), roughness: .45, metalness: .7 });
  const tierra = new THREE.MeshStandardMaterial({ color: lin(0x6b4e3b), roughness: 1, metalness: 0, side: THREE.BackSide, map: texB });
  const terreno = new THREE.MeshStandardMaterial({ color: lin(0xd8d2c7), roughness: 1, metalness: 0, map: texC });
  const tierraTop = new THREE.MeshStandardMaterial({ color: lin(0x7a5b45), roughness: 1, metalness: 0, map: texB });
  const resCache = new Map();
  const resaltado = (mat) => { if (!resCache.has(mat)) { const m = mat.clone(); m.emissive = lin(0xd97757); m.emissiveIntensity = .55; resCache.set(mat, m); } return resCache.get(mat); };
  const CONCRETO = new Set(["zapata", "columna", "viga", "losa", "escalera"]);

  const caja3 = (w, h, d, desdeArriba = false) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, desdeArriba ? -h / 2 : h / 2, 0); return g; };
  const malla = (g, mat, parte, nombre) => { const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; m.userData = { parte, nombre, mat }; m.visible = false; m.scale.y = 1e-4; escena.add(m); return m; };

  // Terreno con los pozos de excavación recortados.
  {
    const forma = new THREE.Shape();
    forma.moveTo(-14, -14); forma.lineTo(26, -14); forma.lineTo(26, 20); forma.lineTo(-14, 20); forma.closePath();
    for (const e of ejes) { const h = new THREE.Path(); const a = e.x - POZO / 2, b = e.x + POZO / 2, c = -e.z - POZO / 2, d = -e.z + POZO / 2; h.moveTo(a, c); h.lineTo(b, c); h.lineTo(b, d); h.lineTo(a, d); h.closePath(); forma.holes.push(h); }
    const g = new THREE.ShapeGeometry(forma, 1); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 6);
    const m = new THREE.Mesh(g, terreno); m.receiveShadow = true; escena.add(m);
    const rejilla = new THREE.GridHelper(40, 40, 0xb5ada2, 0xcdc6bb); rejilla.position.set(4, .004, 3); rejilla.material.opacity = .55; rejilla.material.transparent = true; escena.add(rejilla);
    // Trazo de ejes sobre el terreno.
    const pts = [];
    for (let i = 0; i <= NX; i++) pts.push(i * LX, .01, -1.2, i * LX, .01, NZ * LZ + 1.2);
    for (let j = 0; j <= NZ; j++) pts.push(-1.2, .01, j * LZ, NX * LX + 1.2, .01, j * LZ);
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    escena.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x8a5a3c })));
    ["A", "B", "C"].forEach((t, i) => { const r = rotulo(THREE, t, .5, true); r.position.set(i * LX, .3, NZ * LZ + 1.7); escena.add(r); });
    ["1", "2", "3"].forEach((t, j) => { const r = rotulo(THREE, t, .5, true); r.position.set(-1.7, .3, j * LZ); escena.add(r); });
  }

  // Excavación, parrillas y zapatas.
  const pozos = [], parrillas = [], zapatas = [];
  const geoPozo = caja3(POZO, PROF + .1, POZO, true);
  const geoParrilla = (() => {
    const gs = [], n = 7, s = (ZAP - .15) / (n - 1);
    for (let i = 0; i < n; i++) {
      const a = new THREE.CylinderGeometry(.012, .012, ZAP - .1, 6); a.rotateZ(Math.PI / 2); a.translate(0, 0, -ZAP / 2 + .075 + i * s); gs.push(a);
      const b = new THREE.CylinderGeometry(.012, .012, ZAP - .1, 6); b.rotateX(Math.PI / 2); b.translate(-ZAP / 2 + .075 + i * s, .025, 0); gs.push(b);
    }
    for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4, c = new THREE.CylinderGeometry(.014, .014, .9, 6); c.translate(Math.cos(ang) * .11, .45, Math.sin(ang) * .11); gs.push(c); }
    return fusionar(THREE, gs);
  })();
  const geoZapata = caja3(ZAP, ZH, ZAP);
  const rellenos = [], geoRelleno = caja3(POZO - .02, PROF + .1, POZO - .02);
  for (const e of ejes) {
    const p = new THREE.Mesh(geoPozo, tierra); p.position.set(e.x, 0, e.z); p.visible = false; p.scale.y = 1e-4; p.userData = { parte: "excav", nombre: "Pozo de cimentación", mat: tierra }; p.receiveShadow = true; escena.add(p); pozos.push(p);
    const r = malla(geoParrilla, acero, "acero", "Parrilla de zapata"); r.position.set(e.x, -PROF + .075, e.z); r.castShadow = false; parrillas.push(r);
    const z = malla(geoZapata, fresco, "zapata", "Zapata Z-1"); z.position.set(e.x, -PROF, e.z); zapatas.push(z);
    // Se rellenan todos los pozos menos el más cercano a la cámara, que queda en corte.
    if (!(e.i === 0 && e.j === NZ)) { const f = malla(geoRelleno, tierraTop, "excav", "Relleno compactado"); f.position.set(e.x, -PROF - .1, e.z); f.castShadow = false; rellenos.push(f); }
  }

  // Columnas por piso: armadura, encofrado y concreto.
  const HCOL = (k) => (k ? H - VH : H - VH + PROF - ZH), YCOL = (k) => (k ? k * H : -PROF + ZH);
  const estribo = (w, d, r = .009) => { const g = new THREE.TorusGeometry(1, r, 5, 4); g.rotateZ(Math.PI / 4); g.scale(w / 2 * Math.SQRT2, d / 2 * Math.SQRT2, 1); g.rotateX(Math.PI / 2); return g; };
  const jaulaColumna = (h) => {
    const gs = [], a = COL / 2 - .045;
    for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4, rr = k % 2 ? a / Math.cos(Math.PI / 4) : a; const c = new THREE.CylinderGeometry(.013, .013, h + .4, 6); c.translate(Math.cos(ang) * rr, (h + .4) / 2, Math.sin(ang) * rr); gs.push(c); }
    for (let y = .05; y < h; y += y < .6 || y > h - .6 ? .1 : .15) { const e = estribo(COL - .08, COL - .08); e.translate(0, y, 0); gs.push(e); }
    return fusionar(THREE, gs);
  };
  const jaulaViga = (L) => {
    const gs = [], l = L - COL;
    [[-.08, .06], [.08, .06], [-.08, .42], [.08, .42]].forEach(([z, y]) => { const c = new THREE.CylinderGeometry(.013, .013, l, 6); c.rotateZ(Math.PI / 2); c.translate(l / 2, y, z); gs.push(c); });
    for (let x = .08; x < l; x += x < .9 || x > l - .9 ? .1 : .2) { const e = estribo(VB - .08, VH - .1); e.rotateX(Math.PI / 2); e.rotateY(Math.PI / 2); e.translate(x, VH / 2 - .01, 0); gs.push(e); }
    return fusionar(THREE, gs);
  };
  const mallaLosa = () => {
    const gs = [], W = NX * LX + .3, D = NZ * LZ + .3;
    for (let x = -.05; x <= W - .1; x += .25) { const c = new THREE.CylinderGeometry(.009, .009, D - .1, 5); c.rotateX(Math.PI / 2); c.translate(x, .04, D / 2 - .15); gs.push(c); }
    for (let z = -.05; z <= D - .1; z += .25) { const c = new THREE.CylinderGeometry(.009, .009, W - .1, 5); c.rotateZ(Math.PI / 2); c.translate(W / 2 - .15, .06, z); gs.push(c); }
    return fusionar(THREE, gs);
  };
  const puntalesPiso = () => {
    const gs = [];
    for (let x = .6; x < NX * LX; x += 1.4) for (let z = .6; z < NZ * LZ; z += 1.4) { const c = new THREE.CylinderGeometry(.035, .035, H - VH - .02, 8); c.translate(x, (H - VH) / 2, z); gs.push(c); const b = new THREE.BoxGeometry(.2, .03, .2); b.translate(x, .015, z); gs.push(b); }
    return fusionar(THREE, gs);
  };
  const losaForma = (hueco) => {
    const W = NX * LX + .3, D = NZ * LZ + .3, s = new THREE.Shape();
    s.moveTo(-.15, .15); s.lineTo(W - .15, .15); s.lineTo(W - .15, -(D - .15)); s.lineTo(-.15, -(D - .15)); s.closePath();
    if (hueco) { const h = new THREE.Path(); h.moveTo(4.3, -1.5); h.lineTo(7.9, -1.5); h.lineTo(7.9, -2.9); h.lineTo(4.3, -2.9); h.closePath(); s.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(s, { depth: LOSA, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, 0, 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    return g;
  };
  const piso = [];
  for (let k = 0; k < PISOS; k++) {
    const P = { jaulas: [], encof: [], cols: [], vigasJ: [], vigas: [] };
    const gJ = jaulaColumna(HCOL(k)), gC = caja3(COL, HCOL(k), COL), gE = caja3(COL + .06, HCOL(k) + .02, COL + .06);
    for (const e of ejes) {
      const j = malla(gJ, acero, "acero", "Armadura de columna"); j.position.set(e.x, YCOL(k), e.z); j.castShadow = false; P.jaulas.push(j);
      const f = malla(gE, madera, "encofrado", "Encofrado de columna"); f.position.set(e.x, YCOL(k), e.z); f.castShadow = false; P.encof.push(f);
      const c = malla(gC, fresco, "columna", `Columna ${"ABC"[e.i]}${e.j + 1}`); c.position.set(e.x, YCOL(k), e.z); P.cols.push(c);
    }
    const yViga = (k + 1) * H - VH, gJX = jaulaViga(LX), gJZ = jaulaViga(LZ), gVX = caja3(LX - COL, VH, VB), gVZ = caja3(LZ - COL, VH, VB);
    gVX.translate((LX - COL) / 2, 0, 0); gVZ.translate((LZ - COL) / 2, 0, 0);
    for (let j = 0; j <= NZ; j++) for (let i = 0; i < NX; i++) {
      const jj = malla(gJX, acero, "acero", "Armadura de viga"); jj.position.set(i * LX + COL / 2, yViga + .04, j * LZ); jj.castShadow = false; P.vigasJ.push(jj);
      const v = malla(gVX, fresco, "viga", `Viga V-${k + 1}0${j + 1}`); v.position.set(i * LX + COL / 2, yViga, j * LZ); P.vigas.push(v);
    }
    for (let i = 0; i <= NX; i++) for (let j = 0; j < NZ; j++) {
      const jj = malla(gJZ, acero, "acero", "Armadura de viga"); jj.position.set(i * LX, yViga + .04, j * LZ + COL / 2); jj.rotation.y = -Math.PI / 2; jj.castShadow = false; P.vigasJ.push(jj);
      const v = malla(gVZ, fresco, "viga", `Viga V-${k + 1}1${i + 1}`); v.position.set(i * LX, yViga, j * LZ + COL / 2); v.rotation.y = -Math.PI / 2; P.vigas.push(v);
    }
    P.puntales = malla(puntalesPiso(), metalPuntal, "encofrado", "Puntales"); P.puntales.position.y = k * H; P.puntales.castShadow = false;
    P.encLosa = malla(caja3(NX * LX + .36, LOSA + VH + .02, NZ * LZ + .36, true), madera, "encofrado", "Encofrado de losa"); P.encLosa.position.set(NX * LX / 2, (k + 1) * H + .01, NZ * LZ / 2); P.encLosa.castShadow = false;
    P.malla = malla(mallaLosa(), acero, "acero", "Malla de losa"); P.malla.position.set(0, (k + 1) * H - LOSA, 0); P.malla.castShadow = false;
    P.losa = malla(losaForma(k === 0), fresco, "losa", `Losa ${k === 0 ? "del 1.er piso" : "de techo"}`); P.losa.position.y = (k + 1) * H - LOSA;
    piso.push(P);
  }
  // Escalera: dos tramos con descanso, dentro del vano B-C / 1-2.
  const escalera = (() => {
    const gs = [], CP = H / 17, PASO = .28, ANCHO = 1.1;
    for (let i = 0; i < 9; i++) { const b = new THREE.BoxGeometry(PASO, (i + 1) * CP, ANCHO); b.translate(4.4 + PASO / 2 + i * PASO, (i + 1) * CP / 2, .3 + ANCHO / 2); gs.push(b); }
    const d = new THREE.BoxGeometry(.9, 9 * CP, 2.45); d.translate(6.92 + .45, 9 * CP / 2, .3 + 2.45 / 2); gs.push(d);
    for (let i = 9; i < 17; i++) { const b = new THREE.BoxGeometry(PASO, (i + 1) * CP, ANCHO); b.translate(6.92 - PASO / 2 - (i - 9) * PASO, (i + 1) * CP / 2, 1.65 + ANCHO / 2); gs.push(b); }
    return malla(fusionar(THREE, gs), fresco, "escalera", "Escalera");
  })();

  // Rótulos de cotas: aparecen cuando su elemento ya existe.
  const cotas = {
    zapata: [rotulo(THREE, "Zapata 1,20 × 1,20 × 0,50 m (en corte)"), [0, .6, 6.2]],
    columna: [rotulo(THREE, "Columna 30 × 30 cm · 8 Ø 5/8″"), [8.4, 1.5, 6.4]],
    viga: [rotulo(THREE, "Viga 25 × 50 cm"), [6, 3.6, 6.4]],
    losa: [rotulo(THREE, "Losa aligerada e = 20 cm"), [2, 6.6, 6.2]],
    escalera: [rotulo(THREE, "Escalera 17 × 17,6 cm"), [5.8, 1.9, 1.5]],
  };
  for (const [s, p] of Object.values(cotas)) { s.position.set(...p); s.visible = false; escena.add(s); }

  // Luces de estudio: cielo suave y un sol que proyecta sombra.
  escena.add(new THREE.HemisphereLight(0xf2f0ff, 0x9c8c78, .55));
  const sol = new THREE.DirectionalLight(0xfff2e2, 1.5); sol.position.set(9, 14, 7); sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024); sol.shadow.camera.near = 1; sol.shadow.camera.far = 50;
  Object.assign(sol.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11 }); sol.shadow.bias = -.0008; sol.shadow.normalBias = .02;
  sol.target.position.copy(centro); escena.add(sol, sol.target);
  const relleno = new THREE.DirectionalLight(0xdfe8ff, .35); relleno.position.set(-8, 6, -6); escena.add(relleno);

  // Línea de tiempo: cada paso es una función idempotente de su progreso p ∈ [0, 1].
  const crecer = (m, p) => { m.visible = p > 0; m.scale.y = Math.max(p, 1e-4); };
  const vaciar = (m, p) => { crecer(m, p); const base = p >= 1 ? concreto : fresco; m.material = m.userData.res ? resaltado(base) : base; };
  const bajar = (m, p, desde, base) => { m.visible = p > 0; m.scale.y = 1; m.position.y = base + (1 - suave(p)) * desde; };
  const escalonar = (p, i, n) => clamp((p * (n + 2) - i) / 3, 0, 1);
  const pasos = []; let T = 0;
  const agregar = (d, nombre, fn, son) => { pasos.push({ t: T, d, nombre, fn, son }); T += d; };
  agregar(1300, "Trazo de ejes y excavación de las 9 zapatas", (p) => pozos.forEach((m, i) => crecer(m, escalonar(p, i, 9))), "cavar");
  agregar(1100, "Parrilla de acero de las zapatas", (p) => parrillas.forEach((m, i) => crecer(m, escalonar(p, i, 9))), "ticks");
  agregar(1500, "Vaciado de concreto en las zapatas", (p) => { zapatas.forEach((m) => vaciar(m, p)); cotas.zapata[0].visible = p > .85; }, "vaciar");
  agregar(900, "Relleno y compactación (una zapata queda a la vista, en corte)", (p) => rellenos.forEach((m, i) => crecer(m, escalonar(p, i, 8))), "cavar");
  for (let k = 0; k < PISOS; k++) {
    const P = piso[k], n = k + 1;
    agregar(1300, `Piso ${n}: armadura de columnas`, (p) => P.jaulas.forEach((m, i) => crecer(m, escalonar(p, i, 9))), "ticks");
    agregar(500, `Piso ${n}: encofrado de columnas`, (p) => P.encof.forEach((m) => crecer(m, p)), "madera");
    agregar(1500, `Piso ${n}: vaciado de columnas`, (p) => { P.cols.forEach((m) => vaciar(m, p)); if (k === 0) cotas.columna[0].visible = p > .9; }, "vaciar");
    agregar(450, `Piso ${n}: desencofrado de columnas`, (p) => P.encof.forEach((m) => crecer(m, 1 - p)));
    agregar(700, `Piso ${n}: encofrado de vigas y losa, puntales`, (p) => { crecer(P.puntales, p); crecer(P.encLosa, p); }, "madera");
    agregar(1300, `Piso ${n}: la grúa iza la armadura de las vigas`, (p) => P.vigasJ.forEach((m, i) => bajar(m, escalonar(p, i, 12), 4, (k + 1) * H - VH + .04)), "grua");
    agregar(800, `Piso ${n}: malla de acero de la losa`, (p) => { P.malla.visible = p > 0; P.malla.scale.set(Math.max(p, 1e-4), 1, 1); }, "ticks");
    agregar(1700, `Piso ${n}: vaciado de vigas y losa`, (p) => { P.vigas.forEach((m) => vaciar(m, p)); vaciar(P.losa, p); if (k === 0) cotas.viga[0].visible = p > .9; else cotas.losa[0].visible = p > .9; }, "vaciar");
    if (k === 0) agregar(1100, "Escalera: encofrado y vaciado de los dos tramos", (p) => { vaciar(escalera, p); cotas.escalera[0].visible = p > .9; }, "vaciar");
    agregar(600, `Piso ${n}: curado y retiro de puntales`, (p) => { crecer(P.puntales, 1 - p); crecer(P.encLosa, 1 - p); });
  }
  agregar(500, "Estructura terminada: pórtico de concreto armado de 2 pisos", () => {}, "campana");
  const FIN = T;
  // Antes de aplicar, todo vuelve al estado inicial: así los pasos inversos
  // (desencofrado, retiro de puntales) no dejan nada a la vista antes de empezar.
  function aplicar(ms) {
    for (const m of todos) { m.visible = false; m.scale.y = 1e-4; }
    for (const [sp] of Object.values(cotas)) sp.visible = false;
    for (const s of pasos) if (ms >= s.t) s.fn(clamp((ms - s.t) / s.d, 0, 1));
    const i = Math.max(0, pasos.findIndex((s) => ms < s.t + s.d));
    const s = ms >= FIN ? pasos[pasos.length - 1] : pasos[i];
    $(".t3-num", el).textContent = ms <= 0 ? "Listo para construir" : `Fase ${pasos.indexOf(s) + 1} de ${pasos.length}`;
    $(".t3-nombre", el).textContent = ms <= 0 ? "Terreno trazado · 9 zapatas, 2 pisos" : s.nombre;
    $(".t3-barra i", el).style.width = clamp(ms / FIN * 100, 0, 100) + "%";
  }

  // Sonidos de obra, solo después de tocar «Construir».
  const SON = {
    cavar(t) { const n = ruido(.9), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = "lowpass"; f.frequency.setValueAtTime(220, t); f.frequency.linearRampToValueAtTime(90, t + .8); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .1); g.gain.exponentialRampToValueAtTime(.001, t + .9); n.connect(f); f.connect(g); g.connect(salida); n.start(t); n.stop(t + .95); },
    ticks(t, d) { for (let i = 0; i < 9; i++) { const s = t + i * d / 9000 + .02, o = ac.createOscillator(), g = ac.createGain(), n = ruido(.03), gn = ac.createGain(); o.type = "triangle"; o.frequency.value = 1800 + (i % 3) * 420; g.gain.setValueAtTime(.05, s); g.gain.exponentialRampToValueAtTime(.0005, s + .07); gn.gain.setValueAtTime(.08, s); gn.gain.exponentialRampToValueAtTime(.0005, s + .03); o.connect(g); g.connect(salida); n.connect(gn); gn.connect(salida); o.start(s); o.stop(s + .09); n.start(s); n.stop(s + .035); } },
    vaciar(t, d) { const L = d / 1000, n = ruido(L), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = "lowpass"; f.Q.value = .7; f.frequency.setValueAtTime(160, t); f.frequency.linearRampToValueAtTime(900, t + L * .6); f.frequency.linearRampToValueAtTime(200, t + L); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .25); g.gain.setValueAtTime(.3, t + L - .3); g.gain.exponentialRampToValueAtTime(.001, t + L); n.connect(f); f.connect(g); g.connect(salida); n.start(t); n.stop(t + L + .05); const o = ac.createOscillator(), go = ac.createGain(); o.type = "sine"; o.frequency.setValueAtTime(48, t); go.gain.setValueAtTime(0, t); go.gain.linearRampToValueAtTime(.22, t + .3); go.gain.exponentialRampToValueAtTime(.001, t + L); o.connect(go); go.connect(salida); o.start(t); o.stop(t + L + .05); },
    grua(t, d) { const L = d / 1000, n = ruido(L), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = "bandpass"; f.Q.value = 1.4; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1400, t + L * .5); f.frequency.exponentialRampToValueAtTime(260, t + L); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + L * .4); g.gain.exponentialRampToValueAtTime(.001, t + L); n.connect(f); f.connect(g); g.connect(salida); n.start(t); n.stop(t + L + .05); const o = ac.createOscillator(), go = ac.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(110, t + L); go.gain.setValueAtTime(.03, t); go.gain.exponentialRampToValueAtTime(.001, t + L); o.connect(go); go.connect(salida); o.start(t); o.stop(t + L); },
    madera(t) { for (let i = 0; i < 3; i++) { const s = t + i * .12, o = ac.createOscillator(), g = ac.createGain(); o.type = "square"; o.frequency.setValueAtTime(260 + i * 30, s); o.frequency.exponentialRampToValueAtTime(120, s + .08); g.gain.setValueAtTime(.08, s); g.gain.exponentialRampToValueAtTime(.0005, s + .1); o.connect(g); g.connect(salida); o.start(s); o.stop(s + .11); } },
    campana(t) { [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle"; o.frequency.value = fr; g.gain.setValueAtTime(0, t + i * .04); g.gain.linearRampToValueAtTime(.12, t + i * .04 + .01); g.gain.exponentialRampToValueAtTime(.001, t + 1.6); o.connect(g); g.connect(salida); o.start(t + i * .04); o.stop(t + 1.7); }); },
  };

  // Selección y tarjeta.
  const todos = []; escena.traverse((o) => { if (o.isMesh && o.userData.parte) todos.push(o); });
  let sel = null;
  function resaltar(id) {
    for (const m of todos) {
      const on = !!id && m.userData.parte === id;
      if (on === !!m.userData.res) continue;
      m.userData.res = on;
      const base = CONCRETO.has(m.userData.parte) ? (m.scale.y >= 1 ? concreto : fresco) : m.userData.mat;
      m.material = on ? resaltado(base) : base;
    }
  }
  function seleccionar(id, nombre) {
    sel = id === sel && !nombre ? null : id;
    el.querySelectorAll(".t3-chips button").forEach((b) => { const on = b.dataset.p === sel; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); if (on) b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); });
    resaltar(sel);
    const e = ELEMENTOS[sel];
    if (!e) { tarjeta.hidden = true; el.classList.remove("t3-con-tarjeta"); return; }
    tarjeta.innerHTML = `<button class="t3-x" aria-label="Cerrar">×</button><span class="t3-tipo">${esc(nombre || e.chip)}</span><h5>${esc(e.n)}</h5><p>${esc(e.rol)}</p><div class="t3-clave"><b>Dato de obra</b>${esc(e.dato)}</div>`;
    tarjeta.hidden = false; el.classList.add("t3-con-tarjeta"); tarjeta.scrollTop = 0;
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tocar(cx, cy) {
    const r = rend.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(todos.filter((m) => m.visible), false)[0];
    pista.hidden = true;
    if (!hit) { if (sel) seleccionar(sel); return; }
    seleccionar(hit.object.userData.parte, hit.object.userData.nombre);
  }
  const orb = orbita(rend.domElement, caja, { az: .75, el: .32, dist: 19, min: 8, max: 34, elMin: .06, elMax: 1.2 }, tocar);

  // Reproducción.
  let ms = 0, corriendo = false, vel = 1, ultimoT = 0, terminado = false;
  const go = $("[data-k=go]", el);
  function sonar(s) { if (!ac || !SON[s.son]) return; try { SON[s.son](ac.currentTime + .02, s.d / vel); } catch { /* sin audio */ } }
  function construir() {
    try { audio(); } catch { /* sin audio, igual se construye */ }
    resaltar(null);
    ms = 0; terminado = false; corriendo = true; go.disabled = true; go.textContent = "Construyendo…";
    if (reducido()) { ms = FIN; aplicar(ms); corriendo = false; terminado = true; go.disabled = false; go.textContent = "↻ Construir otra vez"; }
    anim.reanudar();
  }
  el.addEventListener("click", (e) => {
    const chip = e.target.closest(".t3-chips button");
    if (chip) { seleccionar(chip.dataset.p); return; }
    if (e.target.closest(".t3-x")) { seleccionar(sel); return; }
    // Solo los botones de velocidad: el contenedor de la escena también lleva data-v.
    const v = e.target.closest("button[data-v]");
    if (v) { vel = +v.dataset.v; el.querySelectorAll("button[data-v]").forEach((b) => b.classList.toggle("on", b === v)); return; }
    const b = e.target.closest("[data-k]");
    if (!b) return;
    if (b.dataset.k === "vista") orb.reiniciar();
    if (b.dataset.k === "go") construir();
  });

  function medir() {
    const r = caja.getBoundingClientRect();
    if (!r.width) return;
    rend.setSize(r.width, r.height, false);
    cam.aspect = r.width / r.height; cam.fov = r.width < r.height ? 44 : 34; cam.updateProjectionMatrix();
  }
  const anim = bucle((t) => {
    const dt = ultimoT ? Math.min(60, t - ultimoT) : 16; ultimoT = t;
    if (corriendo) {
      const antes = ms; ms += dt * vel;
      for (const s of pasos) if (antes < s.t && ms >= s.t) sonar(s);
      if (ms >= FIN) { ms = FIN; corriendo = false; terminado = true; go.disabled = false; go.textContent = "↻ Construir otra vez"; }
      aplicar(ms);
    }
    orb.aplicar(cam, centro, reducido() || (!corriendo && !terminado) ? 0 : corriendo ? .0028 : .0012);
    rend.render(escena, cam);
  });
  aplicar(0);
  new ResizeObserver(medir).observe(caja);
  return { pausar() { anim.pausar(); ultimoT = 0; }, reanudar() { medir(); anim.reanudar(); } };
}

// ================= 3. Piano con estrellas =================
export function piano(el) {
  const BLANCAS = ["C", "D", "E", "F", "G", "A", "B"];
  const NEGRAS = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };
  const SEMI = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  const teclas = [];
  for (let o = 3; o <= 4; o++) for (const n of BLANCAS) teclas.push({ n, o, negra: false });
  teclas.push({ n: "C", o: 5, negra: false });
  const nb = teclas.length;
  const negras = [];
  teclas.forEach((t, i) => { if (NEGRAS[t.n] && i < nb - 1) negras.push({ n: NEGRAS[t.n], o: t.o, negra: true, junto: i }); });
  const freq = (n, o) => 440 * Math.pow(2, (SEMI[n] + (o + 1) * 12 - 69) / 12);

  el.innerHTML = `<div class="pi-cielo"><canvas></canvas>
      <svg class="pi-mano" viewBox="0 0 60 90" aria-hidden="true">
        <path d="M22 4c0-3 6-3 6 0v38l3-2c0-3 6-3 6 0v4l3-1c0-3 6-3 6 0v4l2-1c0-3 6-3 6 0v22c0 12-8 20-19 20h-6C19 88 12 81 9 72L3 56c-2-4 3-7 6-4l7 9h6z"
          fill="#fff7f0" stroke="#d97757" stroke-width="2.5" stroke-linejoin="round"/></svg>
      <div class="pi-teclado">${teclas.map((t, i) => `<div class="pi-b" data-i="${i}" style="left:${(i / nb * 100).toFixed(3)}%;width:${(100 / nb).toFixed(3)}%"><span>${t.n === "C" ? "C" + t.o : ""}</span></div>`).join("")}
        ${negras.map((t, j) => `<div class="pi-n" data-j="${j}" style="left:${((t.junto + .68) / nb * 100).toFixed(3)}%;width:${(64 / nb).toFixed(3)}%"></div>`).join("")}</div>
    </div>
    <button class="ent-btn claro" data-k="go">▶ Tocar la escala</button>`;
  const cielo = $(".pi-cielo", el), cv = $("canvas", el), cx = cv.getContext("2d"), mano = $(".pi-mano", el);
  let W = 0, H = 0, tecladoTop = 0;
  const parts = [], rayos = [];
  const fondo = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * .6, r: Math.random() * 1.4 + .3, f: Math.random() * 6 }));
  function medir() {
    const r = cielo.getBoundingClientRect();
    W = cv.width = Math.round(r.width * devicePixelRatio);
    H = cv.height = Math.round(r.height * devicePixelRatio);
    tecladoTop = $(".pi-teclado", el).offsetTop * devicePixelRatio;
  }

  function nota(fr, t, dur = .5, vol = .16) {
    const a = audio();
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = "lowpass"; f.Q.value = 4;
    f.frequency.setValueAtTime(fr * 10, t); f.frequency.exponentialRampToValueAtTime(fr * 2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + dur + .4);
    f.connect(g); g.connect(salida);
    [-12, -5, 0, 6, 13].forEach((d) => {
      const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.detune.value = d;
      o.connect(f); o.start(t); o.stop(t + dur + .5);
    });
  }

  function estallar(el2, fuerte) {
    const rc = el2.getBoundingClientRect(), rr = cielo.getBoundingClientRect();
    const x = (rc.left - rr.left + rc.width / 2) * devicePixelRatio, y = tecladoTop;
    if (reducido()) return;
    rayos.push({ x, w: rc.width * devicePixelRatio, v: 1 });
    const n = fuerte ? 90 : 28;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - .5) * (fuerte ? 2.6 : 1.1), sp = (2 + Math.random() * (fuerte ? 9 : 6)) * devicePixelRatio;
      parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, v: 1, r: (1 + Math.random() * 2.4) * devicePixelRatio,
        c: ["#ffffff", "#ffe2b8", "#f2a57f", "#9fe6ff", "#d97757"][Math.floor(Math.random() * 5)], estrella: Math.random() < .35 });
    }
  }

  function tocar(tecla, el2, t, dur, fuerte) {
    nota(freq(tecla.n, tecla.o), t, dur, fuerte ? .1 : .16);
    const ms = Math.max(0, (t - audio().currentTime) * 1000);
    setTimeout(() => {
      el2.classList.add("on");
      estallar(el2, fuerte);
      setTimeout(() => el2.classList.remove("on"), Math.min(400, dur * 1000));
    }, ms);
  }

  function estrella(x, y, r) {
    cx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .35 : r * 1.8; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    cx.closePath(); cx.fill();
  }

  const anim = bucle((t) => {
    cx.clearRect(0, 0, W, H);
    for (const s of fondo) {
      cx.globalAlpha = .35 + .35 * Math.sin(t / 700 + s.f);
      cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(s.x * W, s.y * H, s.r * devicePixelRatio, 0, 6.28); cx.fill();
    }
    for (let i = rayos.length - 1; i >= 0; i--) {
      const r = rayos[i];
      const g = cx.createLinearGradient(0, tecladoTop, 0, 0);
      g.addColorStop(0, `rgba(255, 210, 170, ${.55 * r.v})`); g.addColorStop(1, "rgba(255, 210, 170, 0)");
      cx.globalAlpha = 1; cx.fillStyle = g;
      cx.beginPath(); cx.moveTo(r.x - r.w * .45, tecladoTop); cx.lineTo(r.x + r.w * .45, tecladoTop); cx.lineTo(r.x + r.w * 1.6, 0); cx.lineTo(r.x - r.w * 1.6, 0); cx.fill();
      r.v -= .03; if (r.v <= 0) rayos.splice(i, 1);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += .06 * devicePixelRatio; p.vx *= .985; p.v -= .012;
      cx.globalAlpha = Math.max(0, p.v); cx.fillStyle = p.c;
      if (p.estrella) estrella(p.x, p.y, p.r); else { cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); }
      if (p.v <= 0) parts.splice(i, 1);
    }
    cx.globalAlpha = 1;
  });

  // La mano virtual se mueve sobre la tecla y la presiona.
  function moverMano(el2, ms) {
    setTimeout(() => {
      const rc = el2.getBoundingClientRect(), rr = cielo.getBoundingClientRect();
      mano.style.opacity = 1;
      mano.style.transform = `translate(${rc.left - rr.left + rc.width / 2 - 12}px, ${$(".pi-teclado", el).offsetTop - 44}px)`;
      mano.classList.remove("pulsa"); void mano.offsetWidth; mano.classList.add("pulsa");
    }, ms);
  }

  $("[data-k=go]", el).onclick = () => {
    const a = audio(), t = a.currentTime + .08, PASO = .17;
    const blancas = [...el.querySelectorAll(".pi-b")];
    blancas.forEach((b, i) => { tocar(teclas[i], b, t + i * PASO, .35, false); moverMano(b, (i * PASO + .06) * 1000); });
    const tf = t + nb * PASO + .12;
    [7, 9, 11, 14].forEach((i) => tocar(teclas[i], blancas[i], tf, 1.8, true));
    setTimeout(() => { mano.style.opacity = 0; }, (nb * PASO + 1.4) * 1000);
  };
  el.querySelectorAll(".pi-b").forEach((b) => b.addEventListener("pointerdown", () => tocar(teclas[+b.dataset.i], b, audio().currentTime + .01, .45, false)));
  el.querySelectorAll(".pi-n").forEach((b) => b.addEventListener("pointerdown", () => tocar(negras[+b.dataset.j], b, audio().currentTime + .01, .45, false)));
  medir();
  addEventListener("resize", medir);
  return { pausar: anim.pausar, reanudar() { medir(); anim.reanudar(); } };
}
