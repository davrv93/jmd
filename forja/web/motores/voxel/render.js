// Forja · voxel · render con p5.js 1.11 en modo WEBGL. NUNCA un box() por bloque: cada chunk es UNA p5.Geometry
// opaca y una transparente que salen del mallado codicioso del Worker, y se dibujan con model() y shaders propios.
//
// ADAPTADOR DE GEOMETRÍA EMPAQUETADA (documentado porque toca la tubería interna de p5 1.11):
//   p5.Geometry guarda vértices como p5.Vector y los aplana al subirlos (RenderBuffer._prepareBuffer → map(src) →
//   _bindBuffer). Crear 3 millones de p5.Vector para 400 chunks costaría cientos de MB. Por eso cada geometría recibe
//   envoltorios con la misma interfaz ({ length, flatMap() } / { length, flat() }) que devuelven directamente nuestros
//   TypedArrays, y _bindBuffer los sube sin copiar (ya son Float32Array/Uint16Array/Uint32Array). Tras la primera
//   subida (dirtyFlags = false) se sueltan los arreglos de CPU: la geometría queda solo en la GPU.
//   Ojo: p5 1.11 desata las texturas (unbindTextures) después de CADA model(): el atlas se vuelve a fijar antes de
//   cada dibujo, si no el shader muestrea la textura vacía.
//   Lo único que se toca de WebGL directamente es: CULL_FACE en el pase opaco y depthMask(false) en el transparente,
//   siempre restaurado al terminar el pase. p5 sigue dueño del programa, los atributos, el blending y el viewport.
// Cámara: matrices propias (uVP) con la cámara en el origen (coordenadas relativas = floating origin).
import { perspectiva, vista, mult, planos, cajaVisible } from './mat.js';

const VERT = `precision highp float;
attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aTexCoord; attribute vec4 aVertexColor;
uniform mat4 uVP; uniform vec3 uOffset; uniform float uTiempo; uniform float uOla;
varying vec2 vUV; varying float vTile; varying vec4 vCol; varying float vCara; varying float vFlags; varying float vDist;
void main() {
  vec3 p = aPosition + uOffset;
  if (mod(aNormal.z, 2.0) >= 1.0 && aNormal.x < 0.5) p.y += -0.12 + uOla * 0.04 * sin(uTiempo * 1.3);   // vaivén igual para todos los vértices: así las uniones en T del mallado codicioso no abren rendijas
  vUV = aTexCoord; vTile = aNormal.y; vCol = aVertexColor; vCara = aNormal.x; vFlags = aNormal.z; vDist = length(p);
  gl_Position = uVP * vec4(p, 1.0);
}`;
const FRAG = `precision highp float;
uniform sampler2D uAtlas; uniform float uSol; uniform vec3 uColorSol; uniform vec3 uNiebla; uniform vec2 uNieblaRango;
uniform float uAO; uniform float uTiempo; uniform float uTransp; uniform float uBrilloBloques;
varying vec2 vUV; varying float vTile; varying vec4 vCol; varying float vCara; varying float vFlags; varying float vDist;
void main() {
  vec2 f = fract(vUV); f.y = 1.0 - f.y;
  float fl = vFlags;
  if (mod(fl, 2.0) >= 1.0 || mod(floor(fl / 4.0), 2.0) >= 1.0) f = fract(f + vec2(uTiempo * 0.02, uTiempo * 0.035));
  vec2 tile = vec2(mod(vTile, 16.0), floor(vTile / 16.0));
  vec4 tex = texture2D(uAtlas, (tile * 16.0 + 0.5 + f * 15.0) / 256.0);
  if (tex.a < 0.5 && uTransp < 0.5) discard;
  float cara = vCara < 0.5 ? 1.0 : vCara < 1.5 ? 0.55 : vCara < 3.5 ? 0.8 : vCara < 5.5 ? 0.66 : 0.9;
  float cielo = pow(vCol.g, 1.5) * uSol;
  vec3 luz = uColorSol * cielo * cara + vec3(1.0, 0.82, 0.6) * vCol.b * uBrilloBloques * (0.75 + 0.25 * cara);
  luz = max(luz, vec3(0.045, 0.05, 0.07));
  float ao = mix(1.0, 0.42 + 0.58 * vCol.r, uAO);
  vec3 c = tex.rgb * min(luz, vec3(1.15)) * ao;
  if (mod(floor(fl / 2.0), 2.0) >= 1.0) c = tex.rgb * (0.95 + 0.05 * sin(uTiempo * 3.0));
  c = mix(c, uNiebla, smoothstep(uNieblaRango.x, uNieblaRango.y, vDist));
  gl_FragColor = vec4(c, uTransp > 0.5 ? tex.a : 1.0);
}`;
// cielo procedural en un cubo pegado a la cámara: degradado, sol, luna y estrellas (hash de la dirección)
const CIELO_V = `precision highp float; attribute vec3 aPosition; uniform mat4 uVP; varying vec3 vDir;
void main() { vDir = aPosition; vec4 p = uVP * vec4(aPosition * 10.0, 1.0); gl_Position = p.xyww; }`;
const CIELO_F = `precision mediump float; uniform vec3 uCenit; uniform vec3 uHorizonte; uniform vec3 uSolDir; uniform float uNoche; uniform float uTiempo; varying vec3 vDir;
float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir); float y = d.y;
  vec3 c = mix(uHorizonte, uCenit, smoothstep(-0.05, 0.6, y));
  float s = dot(d, uSolDir), m = dot(d, -uSolDir);
  c += vec3(1.0, 0.85, 0.55) * smoothstep(0.9975, 0.999, s) * 1.4 + vec3(1.0, 0.7, 0.4) * pow(max(s, 0.0), 18.0) * 0.25 * (1.0 - uNoche);
  c += vec3(0.85, 0.9, 1.0) * smoothstep(0.9985, 0.9992, m) * 0.9;
  if (uNoche > 0.05 && y > 0.0) { vec3 q = floor(d * 220.0); float e = h(q); if (e > 0.9975) c += vec3(0.9) * uNoche * (0.6 + 0.4 * sin(uTiempo * 2.0 + e * 90.0)) * smoothstep(0.0, 0.15, y); }
  gl_FragColor = vec4(c, 1.0);
}`;
// objetos sueltos (criaturas, resaltado, avatar de cajas): color por vértice, giro en Y y escala por uniforme
const OBJ_V = `precision highp float; attribute vec3 aPosition; attribute vec3 aNormal; attribute vec4 aVertexColor;
uniform mat4 uVP; uniform vec3 uOffset; uniform float uGiro; uniform float uEscala; varying vec4 vCol; varying vec3 vN; varying float vDist;
void main() { float c = cos(uGiro), s = sin(uGiro); vec3 p = aPosition * uEscala; p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); vec3 n = vec3(c * aNormal.x + s * aNormal.z, aNormal.y, -s * aNormal.x + c * aNormal.z);
  p += uOffset; vCol = aVertexColor; vN = n; vDist = length(p); gl_Position = uVP * vec4(p, 1.0); }`;
const OBJ_F = `precision mediump float; uniform float uSol; uniform vec3 uColorSol; uniform vec3 uNiebla; uniform vec2 uNieblaRango; uniform vec4 uTinte; uniform float uLuzLocal; varying vec4 vCol; varying vec3 vN; varying float vDist;
void main() { float l = 0.55 + 0.45 * max(0.0, dot(normalize(vN), normalize(vec3(0.4, 1.0, 0.3)))); vec3 luz = max(uColorSol * uSol * l, vec3(uLuzLocal)); luz = max(luz, vec3(0.08));
  vec3 c = mix(vCol.rgb * luz, uTinte.rgb, uTinte.a); c = mix(c, uNiebla, smoothstep(uNieblaRango.x, uNieblaRango.y, vDist)); gl_FragColor = vec4(c, vCol.a); }`;
// sprite (personaje de Forja como avatar en 3.ª persona): plano siempre de frente a la cámara
const SPR_V = `precision highp float; attribute vec3 aPosition; attribute vec2 aTexCoord; uniform mat4 uVP; uniform vec3 uOffset; uniform vec3 uDerecha; uniform vec2 uTam; uniform vec4 uMarco; varying vec2 vUV;
void main() { vec3 p = uOffset + uDerecha * (aPosition.x * uTam.x) + vec3(0.0, 1.0, 0.0) * (aPosition.y * uTam.y); vUV = uMarco.xy + vec2(aTexCoord.x, 1.0 - aTexCoord.y) * uMarco.zw; gl_Position = uVP * vec4(p, 1.0); }`;
const SPR_F = `precision mediump float; uniform sampler2D uTex; uniform float uSol; varying vec2 vUV; void main() { vec4 t = texture2D(uTex, vUV); if (t.a < 0.4) discard; gl_FragColor = vec4(t.rgb * max(0.35, uSol), 1.0); }`;

const envolver = (n, arr, metodo) => ({ length: n, [metodo]: () => arr });
function geometria(gid, g, transparente) {
  const G = new p5.Geometry();
  G.gid = gid; G.edges = [];
  G.vertices = envolver(g.nv, g.pos, 'flatMap'); G.vertexNormals = envolver(g.nv, g.nor, 'flatMap');
  G.uvs = envolver(g.nv * 2, g.uv || new Float32Array(g.nv * 2), 'flat'); G.vertexColors = g.col;
  G.faces = { length: g.nt, flat: () => g.idx };
  G._hasFillTransparency = !!transparente; G.bytes = g.pos.byteLength + g.nor.byteLength + (g.uv?.byteLength || 0) + g.col.byteLength + g.idx.byteLength; G.tris = g.nt;
  return G;
}
function soltarCPU(G) { G.vertices = { length: G.vertices.length, flatMap: () => [] }; G.vertexNormals = { length: G.vertexNormals.length, flatMap: () => [] }; G.uvs = { length: G.uvs.length, flat: () => [] }; G.vertexColors = { length: G.vertexColors.length }; G.faces = { length: G.faces.length, flat: () => [] }; G.subida = true; }

// cajas → arrays para el shader de objetos. cajas: [[x, y, z, ancho, alto, fondo, [r, g, b] (0..255), alfa?]]
export function cajasAGeom(cajas) {
  const n = cajas.length * 24, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 4), idx = new Uint16Array(cajas.length * 36);
  let v = 0, t = 0;
  const caras = [[[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]], [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]], [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]], [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]], [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]]];
  for (const [x, y, z, w, h, d, c, a = 1] of cajas) for (const [nn, esq] of caras) {
    const b = v; for (const [ex, ey, ez] of esq) { pos.set([x + ex * w, y + ey * h, z + ez * d], v * 3); nor.set(nn, v * 3); col.set([c[0] / 255, c[1] / 255, c[2] / 255, a], v * 4); v++; }
    idx.set([b, b + 1, b + 2, b, b + 2, b + 3], t); t += 6;
  }
  return { pos, nor, col, idx, nv: v, nt: t / 3, uv: new Float32Array(v * 2) };
}

export function crearRender({ padre, atlas, alListo, perfil = { resolucion: 1, ao: true }, fov = 75 }) {
  const est = { drawCalls: 0, tris: 0, chunksVisibles: 0, bytes: 0, geometrias: 0 };
  const geoms = new Map();   // clave de chunk → { op, tr, cx, cz }
  let s = null, gl = null, sh = null, shCielo = null, shObj = null, shSpr = null, tex = null, cubo = null, quad = null;
  const VP = new Float32Array(16), P = new Float32Array(16), V = new Float32Array(16), PL = new Float32Array(24);
  const r = {
    est, geoms,
    get p5() { return s; },
    subirChunk(c, malla) {
      r.quitarChunk(c);
      const v = c.version + '-' + (c._n = (c._n || 0) + 1);
      const e = { cx: c.cx, cz: c.cz, op: malla.opaco.nt ? geometria(`vx${c.k}o${v}`, malla.opaco, false) : null, tr: malla.transp.nt ? geometria(`vx${c.k}t${v}`, malla.transp, true) : null };
      for (const g of [e.op, e.tr]) if (g) { est.bytes += g.bytes; est.geometrias++; }
      geoms.set(c.k, e);
    },
    quitarChunk(c) {
      const e = geoms.get(c.k); if (!e) return;
      for (const g of [e.op, e.tr]) if (g) { est.bytes -= g.bytes; est.geometrias--; if (g.subida && s) s.freeGeometry(g); }
      geoms.delete(c.k);
    },
    geomObjeto(gid, datos) { return geometria(gid, datos, false); },
    // escena: { cam: {x,y,z,yaw,pitch}, sol, colorSol, cenit, horizonte, solDir, noche, niebla, nieblaRango, tiempo, ao, objetos: [{geom, x,y,z, giro, escala, tinte}], sprite, transp }
    dibujar(E) {
      if (!s) return;
      s.redraw = s.redraw; s._escena = E; s.redraw();
    },
    redimensionar() { if (s) s.resizeCanvas(padre.clientWidth, padre.clientHeight); },
    densidad(k) { if (s) s.pixelDensity(Math.max(0.35, Math.min(2, k * (globalThis.devicePixelRatio || 1)))); },
    destruir() { s?.remove(); s = null; },
    get gl() { return gl; },
  };
  new p5((p) => {
    s = p;
    p.setup = () => {
      p.createCanvas(padre.clientWidth || 960, padre.clientHeight || 540, p.WEBGL);
      p.pixelDensity(Math.max(0.35, (perfil.resolucion || 1) * Math.min(2, globalThis.devicePixelRatio || 1)));
      gl = p._renderer.GL; p.noStroke(); p.noLoop();
      sh = p.createShader(VERT, FRAG); shCielo = p.createShader(CIELO_V, CIELO_F); shObj = p.createShader(OBJ_V, OBJ_F); shSpr = p.createShader(SPR_V, SPR_F);
      const img = p.createImage(atlas.W, atlas.W); img.loadPixels(); img.pixels.set(atlas.datos); img.updatePixels(); r.atlasImg = img;
      tex = p._renderer.getTexture(img); tex.setInterpolation(p.NEAREST, p.NEAREST);
      const cb = cajasAGeom([[-1, -1, -1, 2, 2, 2, [255, 255, 255]]]); cubo = geometria('vx-cielo', cb, false);
      quad = geometria('vx-quad', { pos: new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), nor: new Float32Array(12), uv: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), col: new Float32Array(16).fill(1), idx: new Uint16Array([0, 1, 2, 0, 2, 3]), nv: 4, nt: 2 }, false);
      p.canvas.setAttribute('tabindex', '0'); p.canvas.setAttribute('aria-label', 'Mundo voxel');
      alListo?.(r);
    };
    p.draw = () => {
      const E = p._escena; if (!E) return;
      est.drawCalls = 0; est.tris = 0; est.chunksVisibles = 0;
      const a = p.width / p.height;
      perspectiva(((E.fov || fov) * Math.PI) / 180, a, 0.05, E.lejos || 600, P); vista(E.cam.yaw, E.cam.pitch, V); mult(P, V, VP); planos(VP, PL);
      p.background(E.horizonte[0] * 255, E.horizonte[1] * 255, E.horizonte[2] * 255);
      // cielo (sin escribir profundidad)
      gl.depthMask(false); p.shader(shCielo);
      shCielo.setUniform('uVP', VP); shCielo.setUniform('uCenit', E.cenit); shCielo.setUniform('uHorizonte', E.horizonte); shCielo.setUniform('uSolDir', E.solDir); shCielo.setUniform('uNoche', E.noche); shCielo.setUniform('uTiempo', E.tiempo);
      p.model(cubo); est.drawCalls++; gl.depthMask(true);
      // chunks opacos, de cerca a lejos (aprovecha el depth test)
      p.shader(sh);
      sh.setUniform('uVP', VP); sh.setUniform('uAtlas', r.atlasImg); sh.setUniform('uSol', E.sol); sh.setUniform('uColorSol', E.colorSol); sh.setUniform('uNiebla', E.niebla); sh.setUniform('uNieblaRango', E.nieblaRango);
      sh.setUniform('uAO', E.ao ? 1 : 0); sh.setUniform('uTiempo', E.tiempo); sh.setUniform('uOla', E.olas ?? 1); sh.setUniform('uBrilloBloques', E.brilloBloques ?? 1);
      const lista = [], lejos2 = (E.distancia || 1e9) ** 2;
      for (const e of geoms.values()) {
        const ox = e.cx * 16 - E.cam.x, oz = e.cz * 16 - E.cam.z, oy = -E.cam.y;
        const dx = ox + 8, dz = oz + 8; if (dx * dx + dz * dz > lejos2) continue;                       // distance culling
        if (!cajaVisible(PL, ox, oy, oz, ox + 16, oy + (E.H || 128), oz + 16)) continue;               // frustum culling
        lista.push([dx * dx + dz * dz, e, ox, oy, oz]);
      }
      lista.sort((x, y) => x[0] - y[0]);
      sh.setUniform('uTransp', 0); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
      for (const [, e, ox, oy, oz] of lista) if (e.op) { sh.setUniform('uOffset', [ox, oy, oz]); sh.setUniform('uAtlas', r.atlasImg); p.model(e.op); if (!e.op.subida) soltarCPU(e.op); est.drawCalls++; est.tris += e.op.tris; est.chunksVisibles++; }
      gl.disable(gl.CULL_FACE);
      // objetos: criaturas, resaltado del bloque apuntado, avatar
      if (E.objetos?.length) {
        p.shader(shObj); shObj.setUniform('uVP', VP); shObj.setUniform('uSol', E.sol); shObj.setUniform('uColorSol', E.colorSol); shObj.setUniform('uNiebla', E.niebla); shObj.setUniform('uNieblaRango', E.nieblaRango);
        for (const o of E.objetos) {
          shObj.setUniform('uOffset', [o.x - E.cam.x, o.y - E.cam.y, o.z - E.cam.z]); shObj.setUniform('uGiro', o.giro || 0); shObj.setUniform('uEscala', o.escala || 1);
          shObj.setUniform('uTinte', o.tinte || [0, 0, 0, 0]); shObj.setUniform('uLuzLocal', o.luz || 0);
          p.model(o.geom); if (!o.geom.subida && o.soltar) soltarCPU(o.geom); est.drawCalls++; est.tris += o.geom.tris || 0;
        }
      }
      if (E.sprite) {
        const sp = E.sprite; p.shader(shSpr); shSpr.setUniform('uVP', VP); shSpr.setUniform('uTex', sp.imagen); shSpr.setUniform('uOffset', [sp.x - E.cam.x, sp.y - E.cam.y, sp.z - E.cam.z]);
        shSpr.setUniform('uDerecha', [Math.cos(E.cam.yaw), 0, Math.sin(E.cam.yaw)]); shSpr.setUniform('uTam', sp.tam); shSpr.setUniform('uMarco', sp.marco); shSpr.setUniform('uSol', Math.max(E.sol, 0.3));
        p.model(quad); est.drawCalls++;
      }
      // transparentes (agua, vidrio, hielo): de lejos a cerca, sin escribir profundidad
      p.shader(sh); sh.setUniform('uTransp', 1); gl.depthMask(false);
      for (let i = lista.length - 1; i >= 0; i--) { const [, e, ox, oy, oz] = lista[i]; if (!e.tr) continue; sh.setUniform('uOffset', [ox, oy, oz]); sh.setUniform('uAtlas', r.atlasImg); p.model(e.tr); if (!e.tr.subida) soltarCPU(e.tr); est.drawCalls++; est.tris += e.tr.tris; }
      gl.depthMask(true);
    };
  }, padre);
  return r;
}
