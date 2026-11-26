// Forja · voxel · render con p5.js 1.11 en modo WEBGL. NUNCA un box() por bloque: cada chunk es UNA p5.Geometry
// opaca y una transparente que salen del mallado codicioso del Worker, y se dibujan con model() y shaders propios.
//
// ADAPTADOR DE GEOMETRÍA EMPAQUETADA (documentado porque toca la tubería interna de p5 1.11):
//   p5.Geometry guarda vértices como p5.Vector y los aplana al subirlos (RenderBuffer._prepareBuffer → map(src) →
//   _bindBuffer). Crear 3 millones de p5.Vector para 400 chunks costaría cientos de MB. Por eso cada geometría recibe
//   envoltorios con la misma interfaz ({ length, flatMap() } / { length, flat() }) que devuelven directamente nuestros
//   TypedArrays, y _bindBuffer los sube sin copiar (ya son Float32Array/Uint16Array/Uint32Array). Tras la primera
//   subida en el pase PRINCIPAL (que usa los 4 atributos) se sueltan los arreglos de CPU: la geometría queda solo en
//   la GPU. El pase de sombras solo dibuja geometrías ya subidas (su shader no lee el color: no lo subiría).
//   Ojo: p5 1.11 desata las texturas (unbindTextures) después de CADA model(): las texturas se vuelven a fijar antes
//   de cada dibujo, si no el shader muestrea la textura vacía. Y p5 sube las texturas PREMULTIPLICADAS por alfa
//   (UNPACK_PREMULTIPLY_ALPHA_WEBGL) y mezcla con (ONE, ONE_MINUS_SRC_ALPHA): los shaders desmultiplican al leer y
//   el pase transparente escribe color premultiplicado.
//   Lo que se toca de WebGL directamente: CULL_FACE (opacos: atrás; sombras: adelante), depthMask(false) en el cielo y
//   en los transparentes, y DEPTH_TEST apagado en las pasadas de pantalla completa; todo se restaura al terminar.
//   p5 sigue dueño de los programas, los atributos, el blending, los framebuffers (p5.Framebuffer) y el viewport.
// Cámara: matrices propias (uVP) con la cámara en el origen (coordenadas relativas = floating origin).
//
// LUZ (todo en espacio lineal; al final tono ACES, gradación por hora y bioma, viñeta y tramado — función grado()):
//   · sol (o luna de noche) direccional con N·L por cara: caras al sol cálidas, a la sombra frías
//   · cielo hemisférico (color de arriba y rebote del suelo) por la luz de cielo del vértice (BFS suavizado)
//   · AO por vértice más marcado, luz de bloques cálida con parpadeo, mínimo frío para leer cuevas y noches
//   · sombras: mapa de sombras (perfil alto/ultra) con PCF bilineal; en bajo/medio, sombra «falsa» por la luz de cielo
//   · niebla = el MISMO color del cielo en esa dirección (esconde el borde de los chunks), más bruma baja en los valles
//   · agua: olas en la normal, fresnel, reflejo del cielo, brillo del sol, espuma en la orilla, color por clima
//   · hojas y plantas: vaivén con el viento y luz a contraluz; césped, hojas y agua teñidos por el clima de la columna
//   · emisivos (lava, cristales, lámparas, antorchas) brillan más allá de 1: el bloom (alto/ultra) los hace resplandecer
import { perspectiva, vista, mult, planos, cajaVisible } from './mat.js';

// ---------------------------------------------------------------- calidad por perfil (perfiles.js decide el perfil)
//   detalle 0: sin fundido lejano ni olas finas · sombras: lado del mapa (0 = sombra falsa) · mitad: medio lado de la
//   caja de sombras en bloques · post: bloom + rayos de sol + MSAA (muestras)
export const CALIDAD = {
  bajo: { detalle: 0, sombras: 0, post: false, nubes: 1 },
  medio: { detalle: 1, sombras: 0, post: false, nubes: 2 },
  alto: { detalle: 2, sombras: 2048, mitad: 48, post: true, msaa: 2, nubes: 2 },
  ultra: { detalle: 2, sombras: 3072, mitad: 72, post: true, msaa: 4, nubes: 3 },
};

// ---------------------------------------------------------------- GLSL compartido
const COMUN = `
uniform float uExpo; uniform vec3 uLift; uniform vec3 uGain; uniform float uSat; uniform float uVineta; uniform vec2 uRes;
float h12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
// lineal HDR → pantalla: exposición, ACES, gamma 2, gradación (lift/gain/saturación), viñeta y tramado
vec3 grado(vec3 c) {
  c = sqrt(aces(c * uExpo));
  c = c * uGain + uLift * (1.0 - c);
  float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, uSat);
  vec2 q = gl_FragCoord.xy / uRes - 0.5; c *= 1.0 - uVineta * dot(q, q) * 1.7;
  return c + (h12(gl_FragCoord.xy) - 0.5) / 160.0;
}`;
// cielo de fondo (degradado, resplandor del sol en el horizonte, halo de la luna): lo comparten el cielo y la niebla
const CIELO_GLSL = `
uniform vec3 uCenit; uniform vec3 uHorizonte; uniform vec3 uSuelo; uniform vec3 uHalo; uniform vec3 uHaloLuna; uniform vec3 uSolDir;
vec3 cieloBase(vec3 d) {
  float y = d.y, sube = clamp(y, 0.0, 1.0);
  vec3 c = mix(uHorizonte, uCenit, pow(sube, 0.5));
  c = mix(c, uSuelo, smoothstep(0.0, -0.3, y));
  float s = max(dot(d, uSolDir), 0.0), m = max(dot(d, -uSolDir), 0.0);
  float banda = pow(1.0 - sube, 6.0);
  c += uHalo * (pow(s, 5.0) * (0.35 + 0.9 * banda) + pow(s, 64.0) * 1.4);
  c += uHaloLuna * pow(m, 40.0);
  return c;
}`;

// ---------------------------------------------------------------- chunks
const CHUNK_V = (def) => `precision highp float;
${def}

attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aTexCoord; attribute vec4 aVertexColor;
uniform mat4 uVP; uniform vec3 uOffset; uniform float uTiempo; uniform float uOla; uniform vec3 uCam; uniform float uViento;
#ifdef SOMBRAS
uniform mat4 uLuzVP; varying vec3 vSombra;
#endif
varying vec2 vUV; varying float vTile; varying vec4 vCol; varying float vCara; varying float vFlags; varying vec3 vRel;
vec3 normalDe(float c) { return c < 0.5 ? vec3(0.0, 1.0, 0.0) : c < 1.5 ? vec3(0.0, -1.0, 0.0) : c < 2.5 ? vec3(1.0, 0.0, 0.0) : c < 3.5 ? vec3(-1.0, 0.0, 0.0) : c < 4.5 ? vec3(0.0, 0.0, 1.0) : c < 5.5 ? vec3(0.0, 0.0, -1.0) : vec3(0.0, 1.0, 0.0); }
void main() {
  vec3 p = aPosition + uOffset;
  float fl = aNormal.z;
  // vaivén igual para todos los vértices del agua: así las uniones en T del mallado codicioso no abren rendijas
  if (mod(fl, 2.0) >= 1.0 && aNormal.x < 0.5) p.y += -0.12 + uOla * 0.04 * sin(uTiempo * 1.3);
  if (mod(floor(fl / 8.0), 2.0) >= 1.0 && uViento > 0.0) {   // hojas y plantas: el viento (función continua del mundo)
    vec3 w = mod(p + uCam, 512.0);
    float fase = uTiempo * 1.6 + w.x * 0.37 + w.z * 0.29 + w.y * 0.21;
    float amp = aNormal.x > 5.5 ? aTexCoord.y * 0.1 : 0.03;
    p.x += sin(fase) * amp * uViento; p.z += cos(fase * 0.83 + 1.3) * amp * 0.8 * uViento;
  }
  vUV = aTexCoord; vTile = aNormal.y; vCol = aVertexColor; vCara = aNormal.x; vFlags = fl; vRel = p;
#ifdef SOMBRAS
  vSombra = (uLuzVP * vec4(p + normalDe(aNormal.x) * 0.06, 1.0)).xyz * 0.5 + 0.5;
#endif
  gl_Position = uVP * vec4(p, 1.0);
}`;
const SOMBRA_GLSL = `
#ifdef SOMBRAS
uniform sampler2D uSombraTex; uniform float uSombraTam;
float prof(vec2 uv) { return dot(texture2D(uSombraTex, uv).rgb, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0)); }
// PCF bilineal de 4 muestras; -1 = fuera del mapa (se usa la sombra falsa)
float sombraMapa(vec3 s) {
  if (s.x < 0.002 || s.x > 0.998 || s.y < 0.002 || s.y > 0.998 || s.z > 0.999) return -1.0;
  float t = 1.0 / uSombraTam, z = s.z - 0.0007;
  vec2 c = s.xy * uSombraTam - 0.5, fr = fract(c), b = (floor(c) + 0.5) * t;
  float a = step(z, prof(b)), bb = step(z, prof(b + vec2(t, 0.0))), cc = step(z, prof(b + vec2(0.0, t))), dd = step(z, prof(b + vec2(t, t)));
  float v = mix(mix(a, bb, fr.x), mix(cc, dd, fr.x), fr.y);
  vec2 borde = min(s.xy, 1.0 - s.xy);
  return mix(-1.0, v, smoothstep(0.0, 0.08, min(borde.x, borde.y)));
}
#endif`;
const CHUNK_F = (def) => `precision highp float;
${def}

${COMUN}
${CIELO_GLSL}
${SOMBRA_GLSL}
uniform sampler2D uAtlas; uniform sampler2D uMedia;
uniform vec3 uLuzDir; uniform vec3 uLuzColor; uniform vec3 uAmbArriba; uniform vec3 uAmbAbajo; uniform vec3 uColorBloque; uniform vec3 uMinLuz;
uniform float uAO; uniform float uTiempo; uniform float uTransp; uniform float uBrilloBloques; uniform float uOla;
uniform float uNieblaDens; uniform float uNieblaFin; uniform float uNieblaAlt; uniform float uMar; uniform vec3 uCam;
uniform float uBajoAgua; uniform vec3 uAguaNiebla; uniform vec3 uAguaColor;
varying vec2 vUV; varying float vTile; varying vec4 vCol; varying float vCara; varying float vFlags; varying vec3 vRel;
#ifdef SOMBRAS
varying vec3 vSombra;
#endif
vec3 normalDe(float c) { return c < 0.5 ? vec3(0.0, 1.0, 0.0) : c < 1.5 ? vec3(0.0, -1.0, 0.0) : c < 2.5 ? vec3(1.0, 0.0, 0.0) : c < 3.5 ? vec3(-1.0, 0.0, 0.0) : c < 4.5 ? vec3(0.0, 0.0, 1.0) : c < 5.5 ? vec3(0.0, 0.0, -1.0) : vec3(0.0, 1.0, 0.0); }
// tinte por clima (t = temperatura, h = humedad, 0..1): frío azulado, seco amarillento, cálido y húmedo exuberante
vec3 tinteClima(vec2 th) {
  vec3 fs = vec3(1.0, 1.04, 0.96), fh = vec3(0.78, 0.98, 1.02), cs = vec3(1.42, 1.12, 0.55), ch = vec3(0.68, 1.1, 0.6);
  return mix(mix(fs, fh, th.y), mix(cs, ch, th.y), th.x) / vec3(0.98, 1.06, 0.78);
}
// color del agua: uno por bioma (uniforme que cambia suave al caminar). No sale del clima de cada cara: en una superficie
// lisa como el agua, los escalones del código de clima se verían como costuras rectas.
vec3 aguaColor() { return uAguaColor; }
float vruido(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h12(i), h12(i + vec2(1.0, 0.0)), f.x), mix(h12(i + vec2(0.0, 1.0)), h12(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() {
  vec2 f = fract(vUV); f.y = 1.0 - f.y;
  float fl = vFlags;
  bool agua = mod(fl, 2.0) >= 1.0, lava = mod(floor(fl / 4.0), 2.0) >= 1.0, emis = mod(floor(fl / 2.0), 2.0) >= 1.0, hoja = mod(floor(fl / 8.0), 2.0) >= 1.0;
  float t = uTiempo;
  if (agua || lava) f = fract(f + vec2(t * 0.02, t * 0.035));
  vec2 tile = vec2(mod(vTile, 16.0), floor(vTile / 16.0));
  vec4 tex = texture2D(uAtlas, (tile * 16.0 + min(floor(f * 16.0), 15.0) + 0.5) / 256.0);
  if (tex.a < 0.5 && uTransp < 0.5) discard;
  vec3 alb = tex.rgb / max(tex.a, 0.004);
  float dist = length(vRel);
#if DETALLE > 0
  alb = mix(alb, texture2D(uMedia, (tile + 0.5) / 16.0).rgb, smoothstep(22.0, 60.0, dist) * 0.8);   // sin parpadeo a lo lejos
#endif
  alb *= alb;
  float codigo = floor(vCol.a * 255.0 + 0.5);
  vec2 th = vec2(floor(codigo / 16.0), mod(codigo, 16.0)) / 15.0;
  if (uTransp < 0.5 && tex.a < 0.9) alb *= tinteClima(th);
  vec3 n = normalDe(vCara), V = -vRel / max(dist, 0.001), mundo = vRel + uCam;
  float ao = vCol.r, cielo = vCol.g * vCol.g, blq = vCol.b;
  float aoF = mix(1.0, 0.26 + 0.74 * ao * (1.5 - 0.5 * ao), uAO);
  // sombra del sol: mapa (alto/ultra) o la luz de cielo como sombra falsa (bajo las copas y los techos)
  float falsa = smoothstep(0.82, 0.985, vCol.g);
  float sol = falsa;
#ifdef SOMBRAS
  float sm = sombraMapa(vSombra);
  if (sm >= 0.0) sol = sm * smoothstep(0.35, 0.75, vCol.g);
#endif
  bool planta = vCara > 5.5;
  float ndl = planta ? 0.5 + 0.35 * max(uLuzDir.y, 0.0) : max(dot(n, uLuzDir), 0.0);
  vec3 amb = mix(uAmbAbajo, uAmbArriba, planta ? 0.75 : n.y * 0.5 + 0.5) * cielo;
  float parpadeo = 0.93 + 0.07 * sin(t * 9.0 + mundo.x * 1.7 + mundo.z * 2.3) * sin(t * 5.3 + mundo.y);
  vec3 bl = uColorBloque * (pow(blq, 3.6) * 2.6 + blq * 0.08) * uBrilloBloques * parpadeo;   // charcos de luz que se apagan
  vec3 dir = uLuzColor * ndl * sol;
  vec3 luz = (amb + bl + uMinLuz) * aoF + dir * (0.45 + 0.55 * aoF);
  if (hoja) luz += uLuzColor * pow(max(dot(-V, uLuzDir), 0.0), 3.0) * 0.6 * max(sol, 0.55) * cielo;   // contraluz: la luz atraviesa las hojas
  vec3 c = alb * luz;
  if (emis) {
    float lum = max(alb.r, max(alb.g, alb.b));
    float g = lava ? 1.0 : smoothstep(0.32, 0.75, lum);
    c += alb * g * (lava ? 2.6 : 3.2) * parpadeo * uBrilloBloques;
  }
  float alfa = 1.0;
  if (uTransp > 0.5) {
    vec3 nn = n;
    if (agua && vCara < 0.5) {
      vec2 q = mod(mundo.xz, 512.0);
      vec2 g = vec2(0.8, 0.6) * cos(dot(q, vec2(0.8, 0.6)) * 1.2 + t * 1.5) * 0.06 + vec2(-0.5, 0.86) * cos(dot(q, vec2(-0.5, 0.86)) * 2.3 + t * 2.0) * 0.045;
#if DETALLE > 0
      g += vec2(0.3, -0.95) * cos(dot(q, vec2(0.3, -0.95)) * 4.1 + t * 2.9) * 0.03 + (vec2(vruido(q * 1.7 + t * 0.6), vruido(q * 1.7 - t * 0.5 + 9.0)) - 0.5) * 0.09;
#endif
      nn = normalize(vec3(-g.x * uOla, 1.0, -g.y * uOla));
    }
    float cv = max(dot(nn, V), 0.0), fres = 0.025 + 0.975 * pow(1.0 - cv, 5.0);
    vec3 R = reflect(-V, nn); R.y = abs(R.y);
    vec3 refl = cieloBase(R) * (0.04 + 0.88 * cielo);   // bajo tierra no hay cielo que reflejar
    float spec = pow(max(dot(R, uLuzDir), 0.0), agua ? 260.0 : 120.0) * (agua ? 9.0 : 5.0) * sol;
    if (agua) {
      vec3 cuerpo = aguaColor() * (amb * 2.2 + bl + uLuzColor * max(uLuzDir.y, 0.0) * 0.45 * sol + uMinLuz);
      c = mix(cuerpo, refl, fres) + uLuzColor * spec;
      alfa = mix(0.7, 0.96, fres);
      if (vCara < 0.5) {   // espuma de orilla: la esquina sabe cuánta tierra tiene al lado
        float costa = 1.0 - ao, rizo = vruido(mundo.xz * 2.3 + vec2(t * 0.4, -t * 0.3)) * 0.6 + vruido(mundo.xz * 5.1 - t * 0.7) * 0.4;
        float espuma = smoothstep(0.25, 0.75, costa * (0.75 + 0.5 * sin(t * 1.6 + costa * 4.0 + rizo * 3.0)) + (rizo - 0.5) * 0.35) * smoothstep(0.02, 0.2, costa);
        c = mix(c, (amb * 1.6 + dir + bl + uMinLuz) * 0.95, espuma * 0.85);
        alfa = max(alfa, espuma * 0.95);
      }
      if (uBajoAgua > 0.5) { c = aguaColor() * (amb * 3.0 + uLuzColor * 0.6 * sol) + refl * 0.15; alfa = 0.75; }
    } else {   // vidrio y hielo: un poco de color, reflejo del cielo y brillo
      c = mix(c, refl, fres * 0.8) + uLuzColor * spec;
      alfa = clamp(tex.a + fres * 0.5 + spec * 0.2, 0.0, 1.0);
    }
  }
  // cáusticas bajo el agua (cuando la cámara está sumergida)
  if (uBajoAgua > 0.5 && mundo.y < uMar && uTransp < 0.5) {
    vec2 q = mundo.xz * 0.9;
    float ca = pow(abs(sin(q.x + sin(q.y * 1.3 + t) * 1.2 + t * 0.7) * sin(q.y * 1.1 + sin(q.x * 0.9 - t * 0.8) + t * 0.5)), 6.0);
    c += alb * uLuzColor * ca * 0.9 * cielo;
  }
  // niebla del color del cielo en esa dirección + bruma baja en los valles; al borde de la vista, cielo puro
  vec3 nc; float fn;
  if (uBajoAgua > 0.5) { nc = uAguaNiebla; fn = 1.0 - exp(-dist * uNieblaDens); }
  else {
    nc = cieloBase(normalize(vec3(V.x * -1.0, max(-V.y, -0.12), V.z * -1.0)));
    float altura = exp(-max(mundo.y - uMar, 0.0) * uNieblaAlt);
    fn = (1.0 - exp(-dist * uNieblaDens * (0.5 + 0.8 * altura))) * 0.8;
    fn = max(fn, smoothstep(uNieblaFin * 0.62, uNieblaFin, dist));
  }
  c = mix(c, nc, clamp(fn, 0.0, 1.0));
  vec3 o = grado(c);
  gl_FragColor = uTransp > 0.5 ? vec4(o * alfa, alfa) : vec4(o, 1.0);
}`;

// ---------------------------------------------------------------- cielo: degradado, sol, luna, estrellas y nubes
const CIELO_V = `precision highp float; attribute vec3 aPosition; uniform mat4 uVP; varying vec3 vDir;
void main() { vDir = aPosition; vec4 p = uVP * vec4(aPosition * 10.0, 1.0); gl_Position = p.xyww; }`;
const CIELO_F = (def) => `precision highp float;
${def}

${COMUN}
${CIELO_GLSL}
uniform float uNoche; uniform float uTiempo; uniform vec3 uDisco; uniform vec3 uLunaColor; uniform float uRotEstrellas;
uniform float uNubes; uniform vec3 uNubeLuz; uniform vec3 uNubeSombra; uniform float uBajoAgua; uniform vec3 uAguaNiebla;
varying vec3 vDir;
float vr(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h12(i), h12(i + vec2(1.0, 0.0)), f.x), mix(h12(i + vec2(0.0, 1.0)), h12(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < NUBES_OCT; i++) { s += vr(p) * a; p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s / (1.0 - 2.0 * a); }
void main() {
  vec3 d = normalize(vDir);
  if (uBajoAgua > 0.5) { gl_FragColor = vec4(grado(uAguaNiebla * (0.6 + 0.6 * max(d.y, 0.0))), 1.0); return; }
  vec3 c = cieloBase(d);
  float y = d.y;
  // estrellas: giran con la hora; puntos con brillo propio, se apagan en el horizonte y bajo las nubes
  if (uNoche > 0.02 && y > -0.05) {
    float a = uRotEstrellas, ca = cos(a), sa = sin(a);
    vec3 e = vec3(ca * d.x - sa * d.y, sa * d.x + ca * d.y, d.z) * 150.0;
    vec3 celda = floor(e), dentro = fract(e) - 0.5;
    float hh = h12(celda.xy + celda.z * 17.13);
    if (hh > 0.985) {
      float brillo = (hh - 0.985) / 0.015, tam = 0.16 + 0.2 * brillo;
      float pt = smoothstep(tam, 0.0, length(dentro));
      float tint = h12(celda.zy);
      c += mix(vec3(1.0, 0.85, 0.7), vec3(0.75, 0.85, 1.0), tint) * pt * (0.6 + 2.2 * brillo * brillo) * uNoche * (0.75 + 0.25 * sin(uTiempo * 2.3 + hh * 300.0)) * smoothstep(-0.02, 0.25, y);
    }
  }
  // sol: disco con borde suave (más allá de 1: el bloom lo hace resplandecer)
  float s = dot(d, uSolDir);
  c += uDisco * smoothstep(0.99925, 0.99962, s);
  // luna: disco con un lado más oscuro (fase) y manchas
  vec3 ld = -uSolDir; float m = dot(d, ld);
  if (m > 0.9985) {
    vec3 lado = normalize(cross(ld, vec3(0.0, 1.0, 0.001)));
    float borde = smoothstep(0.99866, 0.99905, m), fase = 0.42 + 0.58 * smoothstep(-0.03, 0.03, dot(d - ld, lado) * 30.0 + 0.012);
    float mancha = 0.78 + 0.22 * smoothstep(0.3, 0.7, h12(floor((d.xz - ld.xz) * 900.0)));
    c = mix(c, uLunaColor * fase * mancha, borde);
  }
  // nubes: capa plana a gran altura (fBm), iluminadas por el sol, con borde plateado hacia él
  if (uNubes > 0.01 && y > 0.0) {
    vec2 uv = d.xz / (y + 0.12) * 1.4 + vec2(uTiempo * 0.012, uTiempo * 0.004);
    float n = fbm(uv * 1.6);
    float dens = smoothstep(1.0 - uNubes - 0.05, 1.0 - uNubes + 0.32, n);
    float lateral = max(dot(d, uSolDir), 0.0);
    vec3 nc = mix(uNubeLuz, uNubeSombra, smoothstep(0.2, 1.0, dens) * 0.75) + uHalo * pow(lateral, 6.0) * (1.0 - dens) * 1.2;
    c = mix(c, nc, dens * smoothstep(0.0, 0.22, y) * 0.92);
  }
  gl_FragColor = vec4(grado(c), 1.0);
}`;

// ---------------------------------------------------------------- objetos sueltos (criaturas, resaltado, avatar de cajas)
// Color por vértice, giro en Y y escala por uniforme. Las piezas articuladas (piernas, brazos, cabeza) giran además
// alrededor de su eje X local (uBalanceo) sobre una bisagra (uPivote, en coordenadas del modelo): así caminan, saltan
// y miran arriba sin rehacer la geometría.
const OBJ_V = (def) => `precision highp float;
${def}
 attribute vec3 aPosition; attribute vec3 aNormal; attribute vec4 aVertexColor;
uniform mat4 uVP; uniform vec3 uOffset; uniform float uGiro; uniform float uEscala; uniform vec3 uPivote; uniform float uBalanceo; varying vec4 vCol; varying vec3 vN; varying vec3 vRel;
#ifdef SOMBRAS
uniform mat4 uLuzVP; varying vec3 vSombra;
#endif
void main() { float cb = cos(uBalanceo), sb = sin(uBalanceo); vec3 q = aPosition - uPivote; q = vec3(q.x, cb * q.y - sb * q.z, sb * q.y + cb * q.z); vec3 m = vec3(aNormal.x, cb * aNormal.y - sb * aNormal.z, sb * aNormal.y + cb * aNormal.z);
  float c = cos(uGiro), s = sin(uGiro); vec3 p = (q + uPivote) * uEscala; p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); vec3 n = vec3(c * m.x + s * m.z, m.y, -s * m.x + c * m.z);
  p += uOffset; vCol = aVertexColor; vN = n; vRel = p;
#ifdef SOMBRAS
  vSombra = (uLuzVP * vec4(p + n * 0.05, 1.0)).xyz * 0.5 + 0.5;
#endif
  gl_Position = uVP * vec4(p, 1.0); }`;
const OBJ_F = (def) => `precision highp float;
${def}

${COMUN}
${CIELO_GLSL}
${SOMBRA_GLSL}
uniform vec3 uLuzDir; uniform vec3 uLuzColor; uniform vec3 uAmbArriba; uniform vec3 uAmbAbajo; uniform vec3 uMinLuz; uniform float uCieloObj;
uniform vec4 uTinte; uniform float uLuzLocal; uniform float uNieblaDens; uniform float uNieblaFin; uniform float uBajoAgua; uniform vec3 uAguaNiebla;
varying vec4 vCol; varying vec3 vN; varying vec3 vRel;
#ifdef SOMBRAS
varying vec3 vSombra;
#endif
void main() {
  vec3 n = normalize(vN), alb = vCol.rgb * vCol.rgb;
  float sol = uCieloObj;
#ifdef SOMBRAS
  float sm = sombraMapa(vSombra); if (sm >= 0.0) sol *= sm;
#endif
  vec3 luz = mix(uAmbAbajo, uAmbArriba, n.y * 0.5 + 0.5) * uCieloObj * 1.15 + uLuzColor * max((dot(n, uLuzDir) + 0.25) / 1.25, 0.0) * sol + uMinLuz * 1.6 + vec3(1.0, 0.75, 0.5) * uLuzLocal;
  vec3 c = alb * luz;
  c = mix(c, uTinte.rgb * uTinte.rgb * (0.4 + luz), uTinte.a);
  float dist = length(vRel);
  vec3 V = vRel / max(dist, 0.001);
  vec3 nc = uBajoAgua > 0.5 ? uAguaNiebla : cieloBase(normalize(vec3(V.x, max(V.y, -0.12), V.z)));
  float fn = uBajoAgua > 0.5 ? 1.0 - exp(-dist * uNieblaDens) : max((1.0 - exp(-dist * uNieblaDens)) * 0.85, smoothstep(uNieblaFin * 0.62, uNieblaFin, dist));
  c = mix(c, nc, clamp(fn, 0.0, 1.0));
  gl_FragColor = vec4(grado(c), vCol.a);
}`;
// sprite (personaje de Forja como avatar en 3.ª persona): plano siempre de frente a la cámara
const SPR_V = `precision highp float; attribute vec3 aPosition; attribute vec2 aTexCoord; uniform mat4 uVP; uniform vec3 uOffset; uniform vec3 uDerecha; uniform vec2 uTam; uniform vec4 uMarco; varying vec2 vUV;
void main() { vec3 p = uOffset + uDerecha * (aPosition.x * uTam.x) + vec3(0.0, 1.0, 0.0) * (aPosition.y * uTam.y); vUV = uMarco.xy + vec2(aTexCoord.x, 1.0 - aTexCoord.y) * uMarco.zw; gl_Position = uVP * vec4(p, 1.0); }`;
const SPR_F = `precision highp float; ${COMUN} uniform sampler2D uTex; uniform vec3 uLuzSpr; varying vec2 vUV;
void main() { vec4 t = texture2D(uTex, vUV); if (t.a < 0.4) discard; vec3 a = t.rgb / t.a; gl_FragColor = vec4(grado(a * a * uLuzSpr), 1.0); }`;

// ---------------------------------------------------------------- pase de sombras: profundidad vista desde el sol
const SOMBRA_V = `precision highp float; attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aTexCoord;
uniform mat4 uLuzVP; uniform vec3 uOffset; varying vec2 vUV; varying float vTile;
void main() { vUV = aTexCoord; vTile = aNormal.y; gl_Position = uLuzVP * vec4(aPosition + uOffset, 1.0); }`;
const SOMBRA_F = `precision highp float; uniform sampler2D uAtlas; varying vec2 vUV; varying float vTile;
void main() {
  vec2 f = fract(vUV); f.y = 1.0 - f.y; vec2 tile = vec2(mod(vTile, 16.0), floor(vTile / 16.0));
  if (texture2D(uAtlas, (tile * 16.0 + min(floor(f * 16.0), 15.0) + 0.5) / 256.0).a < 0.5) discard;
  vec3 e = fract(gl_FragCoord.z * vec3(1.0, 255.0, 65025.0)); e.xy -= e.yz / 255.0;
  gl_FragColor = vec4(e, 1.0);
}`;

// ---------------------------------------------------------------- posproceso (alto/ultra): bloom y rayos de sol
const PANT_V = `precision highp float; attribute vec3 aPosition; varying vec2 vUV; void main() { vUV = aPosition.xy * 0.5 + 0.5; gl_Position = vec4(aPosition.xy, 0.0, 1.0); }`;
const BRILLO_F = `precision highp float; uniform sampler2D uTex; uniform vec2 uPaso; varying vec2 vUV;
void main() { vec3 c = vec3(0.0);
  for (int i = 0; i < 4; i++) { vec2 o = vec2(mod(float(i), 2.0) - 0.5, floor(float(i) / 2.0) - 0.5) * uPaso * 2.0; vec3 s = texture2D(uTex, vUV + o).rgb; float l = max(s.r, max(s.g, s.b)); c += s * smoothstep(0.88, 1.0, l); }
  gl_FragColor = vec4(c * 0.25, 1.0); }`;
const DESENFOQUE_F = `precision highp float; uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUV;
void main() { vec3 c = texture2D(uTex, vUV).rgb * 0.227;
  c += (texture2D(uTex, vUV + uDir * 1.385).rgb + texture2D(uTex, vUV - uDir * 1.385).rgb) * 0.316;
  c += (texture2D(uTex, vUV + uDir * 3.231).rgb + texture2D(uTex, vUV - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(c, 1.0); }`;
const FINAL_F = `precision highp float; uniform sampler2D uEscena; uniform sampler2D uBrillo; uniform float uBloom; uniform vec2 uSolPant; uniform float uRayos; uniform vec3 uRayosColor; varying vec2 vUV;
void main() {
  vec3 c = texture2D(uEscena, vUV).rgb + texture2D(uBrillo, vUV).rgb * uBloom;
  if (uRayos > 0.0) {   // rayos de sol: desenfoque radial del brillo hacia el sol (los árboles y montes lo cortan)
    vec2 d = (uSolPant - vUV) / 18.0; vec2 p = vUV; float acc = 0.0, w = 1.0;
    for (int i = 0; i < 18; i++) { p += d; vec3 s = texture2D(uBrillo, p).rgb; acc += dot(s, vec3(0.33)) * w; w *= 0.93; }
    c += uRayosColor * acc * uRayos / 18.0;
  }
  gl_FragColor = vec4(c, 1.0);
}`;

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

// Luz del sol para el mapa de sombras: base ortonormal y centro de la caja, ajustado a la rejilla de texeles (las
// sombras no «nadan» al caminar). dir = de la escena hacia el sol; centro en coordenadas del mundo.
export function cajaLuz(dir, centro, mitad, tam) {
  const f = [-dir[0], -dir[1], -dir[2]], arriba = Math.abs(f[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0];
  let r = [f[1] * arriba[2] - f[2] * arriba[1], f[2] * arriba[0] - f[0] * arriba[2], f[0] * arriba[1] - f[1] * arriba[0]];
  const lr = Math.hypot(...r) || 1; r = r.map((v) => v / lr);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const pd = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], texel = (2 * mitad) / tam;
  return { r, u, f, mitad, dir: dir.slice(), centro: centro.slice(), cx: Math.round(pd(centro, r) / texel) * texel, cy: Math.round(pd(centro, u) / texel) * texel, cz: pd(centro, f) };
}
// matriz de la caja para la cámara actual (relativa a la cámara: floating origin). La misma caja vale para cualquier
// posición de la cámara: así el mapa ya dibujado se reutiliza mientras la caja no cambie.
export function matrizLuz(c, cam, fondo = 170, o = new Float32Array(16)) {
  const { r, u, f, mitad } = c, pd = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const tx = (pd(cam, r) - c.cx) / mitad, ty = (pd(cam, u) - c.cy) / mitad, tz = (pd(cam, f) - c.cz) / fondo;
  o.set([r[0] / mitad, u[0] / mitad, f[0] / fondo, 0, r[1] / mitad, u[1] / mitad, f[1] / fondo, 0, r[2] / mitad, u[2] / mitad, f[2] / fondo, 0, tx, ty, tz, 1]);
  return o;
}

export function crearRender({ padre, atlas, alListo, perfil = { resolucion: 1, ao: true }, fov = 75 }) {
  const est = { drawCalls: 0, tris: 0, chunksVisibles: 0, bytes: 0, geometrias: 0, sombras: 0, post: false };
  const geoms = new Map();   // clave de chunk → { op, tr, cx, cz }
  let s = null, gl = null, shCielo = {}, shObj = {}, shChunk = {}, shSpr = null, shSombra = null, shBrillo = null, shDesenfoque = null, shFinal = null;
  let cubo = null, quad = null, pantalla = null, texMedia = null;
  let fbSombra = null, tamSombra = 0, fbEscena = null, msaa = 0, fbA = null, fbB = null;
  const VP = new Float32Array(16), P = new Float32Array(16), V = new Float32Array(16), PL = new Float32Array(24), LVP = new Float32Array(16), PLL = new Float32Array(24);
  let cajaSol = null, versionGeo = 0, versionSombra = -1, cuadrosSombra = 0;
  const variante = (cache, clave, crear) => cache[clave] || (cache[clave] = crear());
  const r = {
    est, geoms,
    get p5() { return s; },
    subirChunk(c, malla) {
      r.quitarChunk(c);
      const v = c.version + '-' + (c._n = (c._n || 0) + 1);
      const e = { cx: c.cx, cz: c.cz, op: malla.opaco.nt ? geometria(`vx${c.k}o${v}`, malla.opaco, false) : null, tr: malla.transp.nt ? geometria(`vx${c.k}t${v}`, malla.transp, true) : null };
      for (const g of [e.op, e.tr]) if (g) { est.bytes += g.bytes; est.geometrias++; }
      geoms.set(c.k, e); versionGeo++;
    },
    quitarChunk(c) {
      const e = geoms.get(c.k); if (!e) return;
      for (const g of [e.op, e.tr]) if (g) { est.bytes -= g.bytes; est.geometrias--; if (g.subida && s) s.freeGeometry(g); }
      geoms.delete(c.k); versionGeo++;
    },
    geomObjeto(gid, datos) { return geometria(gid, datos, false); },
    // escena: { cam: {x,y,z,yaw,pitch}, calidad, atm (ambiente.cielo), tiempo, ao, olas, brilloBloques, viento, exposicion,
    //           bajoAgua, mar, distancia, lejos, fov, H, objetos: [{geom, x,y,z, giro, escala, tinte, pivote, balanceo, luz}], sprite }
    dibujar(E) {
      if (!s) return;
      s._escena = E; s.redraw();
    },
    redimensionar() { if (s) s.resizeCanvas(padre.clientWidth, padre.clientHeight); },
    densidad(k) { if (s) s.pixelDensity(Math.max(0.35, Math.min(2, k * (globalThis.devicePixelRatio || 1)))); },
    destruir() { for (const f of [fbSombra, fbEscena, fbA, fbB]) f?.remove(); s?.remove(); s = null; },
    get gl() { return gl; },
  };
  // uniformes de la atmósfera y la gradación (los mismos en todos los shaders de la escena)
  function atmosfera(sh, E, A) {
    sh.setUniform('uExpo', E.exposicion ?? 1); sh.setUniform('uLift', A.lift); sh.setUniform('uGain', A.gain); sh.setUniform('uSat', A.sat); sh.setUniform('uVineta', A.vineta);
    sh.setUniform('uRes', [s.width * s.pixelDensity(), s.height * s.pixelDensity()]);
    sh.setUniform('uCenit', A.cenit); sh.setUniform('uHorizonte', A.horizonte); sh.setUniform('uSuelo', A.suelo); sh.setUniform('uHalo', A.halo); sh.setUniform('uHaloLuna', A.haloLuna); sh.setUniform('uSolDir', A.solDir);
  }
  function luces(sh, E, A) {
    sh.setUniform('uLuzDir', A.luzDir); sh.setUniform('uLuzColor', A.luzColor); sh.setUniform('uAmbArriba', A.ambArriba); sh.setUniform('uAmbAbajo', A.ambAbajo); sh.setUniform('uMinLuz', A.minLuz);
    sh.setUniform('uNieblaDens', A.nieblaDens); sh.setUniform('uNieblaFin', A.nieblaFin); sh.setUniform('uBajoAgua', E.bajoAgua ? 1 : 0); sh.setUniform('uAguaNiebla', A.aguaNiebla);
  }
  function asegurarSombra(tam) {
    if (tamSombra === tam && fbSombra) return;
    fbSombra?.remove(); fbSombra = null; cajaSol = null; tamSombra = tam; if (!tam) return;
    fbSombra = s.createFramebuffer({ width: tam, height: tam, density: 1, depth: true, antialias: false, textureFiltering: s.NEAREST, format: s.UNSIGNED_BYTE });
  }
  function asegurarPost(q) {
    if (!q.post) { if (fbEscena) { fbEscena.remove(); fbA.remove(); fbB.remove(); fbEscena = fbA = fbB = null; } return; }
    if (fbEscena && msaa === q.msaa) { const w = Math.max(8, Math.ceil(s.width * s.pixelDensity() / 4)), h = Math.max(8, Math.ceil(s.height * s.pixelDensity() / 4)); if (fbA.width !== w || fbA.height !== h) { fbA.resize(w, h); fbB.resize(w, h); } return; }
    if (fbEscena) { fbEscena.remove(); fbA.remove(); fbB.remove(); }
    msaa = q.msaa;
    const w = Math.max(8, Math.ceil(s.width * s.pixelDensity() / 4)), h = Math.max(8, Math.ceil(s.height * s.pixelDensity() / 4));
    fbEscena = s.createFramebuffer({ antialias: q.msaa || false, depth: true, textureFiltering: s.LINEAR, format: s.UNSIGNED_BYTE });
    fbA = s.createFramebuffer({ width: w, height: h, density: 1, depth: false, antialias: false, textureFiltering: s.LINEAR });
    fbB = s.createFramebuffer({ width: w, height: h, density: 1, depth: false, antialias: false, textureFiltering: s.LINEAR });
  }
  new p5((p) => {
    s = p;
    p.setup = () => {
      p.createCanvas(padre.clientWidth || 960, padre.clientHeight || 540, p.WEBGL);
      p.pixelDensity(Math.max(0.35, (perfil.resolucion || 1) * Math.min(2, globalThis.devicePixelRatio || 1)));
      gl = p._renderer.GL; p.noStroke(); p.noLoop();
      shSpr = p.createShader(SPR_V, SPR_F); shSombra = p.createShader(SOMBRA_V, SOMBRA_F);
      shBrillo = p.createShader(PANT_V, BRILLO_F); shDesenfoque = p.createShader(PANT_V, DESENFOQUE_F); shFinal = p.createShader(PANT_V, FINAL_F);
      const img = p.createImage(atlas.W, atlas.W); img.loadPixels(); img.pixels.set(atlas.datos); img.updatePixels(); r.atlasImg = img;
      const tex = p._renderer.getTexture(img); tex.setInterpolation(p.NEAREST, p.NEAREST);
      const med = p.createImage(16, 16); med.loadPixels(); if (atlas.medias) med.pixels.set(atlas.medias); med.updatePixels(); texMedia = med;
      p._renderer.getTexture(med).setInterpolation(p.NEAREST, p.NEAREST);
      const cb = cajasAGeom([[-1, -1, -1, 2, 2, 2, [255, 255, 255]]]); cubo = geometria('vx-cielo', cb, false);
      quad = geometria('vx-quad', { pos: new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), nor: new Float32Array(12), uv: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), col: new Float32Array(16).fill(1), idx: new Uint16Array([0, 1, 2, 0, 2, 3]), nv: 4, nt: 2 }, false);
      pantalla = geometria('vx-pantalla', { pos: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), nor: new Float32Array(12), uv: new Float32Array(8), col: new Float32Array(16).fill(1), idx: new Uint16Array([0, 1, 2, 0, 2, 3]), nv: 4, nt: 2 }, false);
      p.canvas.setAttribute('tabindex', '0'); p.canvas.setAttribute('aria-label', 'Mundo voxel');
      alListo?.(r);
    };
    p.draw = () => {
      const E = p._escena; if (!E) return;
      const A = E.atm, q = CALIDAD[E.calidad] || CALIDAD.medio;
      est.drawCalls = 0; est.tris = 0; est.chunksVisibles = 0; est.sombras = 0;
      const a = p.width / p.height;
      perspectiva(((E.fov || fov) * Math.PI) / 180, a, 0.05, E.lejos || 600, P); vista(E.cam.yaw, E.cam.pitch, V); mult(P, V, VP); planos(VP, PL);
      const cam = [E.cam.x, E.cam.y, E.cam.z];
      // lista de chunks visibles, de cerca a lejos (aprovecha el depth test)
      const lista = [], lejos2 = (E.distancia || 1e9) ** 2;
      for (const e of geoms.values()) {
        const ox = e.cx * 16 - E.cam.x, oz = e.cz * 16 - E.cam.z, oy = -E.cam.y;
        const dx = ox + 8, dz = oz + 8; if (dx * dx + dz * dz > lejos2) continue;                       // distance culling
        if (!cajaVisible(PL, ox, oy, oz, ox + 16, oy + (E.H || 128), oz + 16)) continue;               // frustum culling
        lista.push([dx * dx + dz * dz, e, ox, oy, oz]);
      }
      lista.sort((x, y) => x[0] - y[0]);

      // ---------------------------------------------------------------- 1. sombras (alto/ultra, de día o con luna)
      const conSombra = q.sombras > 0 && !E.bajoAgua && A.luzColor[0] + A.luzColor[1] + A.luzColor[2] > 0.02;
      asegurarSombra(q.sombras > 0 ? q.sombras : 0);
      // el mapa se rehace solo si la caja se movió (> 2 bloques), el sol giró, cambió la geometría o pasaron 30 cuadros
      const fw = [Math.sin(E.cam.yaw), 0, -Math.cos(E.cam.yaw)], m = q.mitad;
      const centro = [cam[0] + fw[0] * m * 0.45, cam[1] - 4, cam[2] + fw[2] * m * 0.45];
      const viejo = cajaSol, rehacer = conSombra && (!viejo || viejo.mitad !== m || versionGeo !== versionSombra || ++cuadrosSombra > 30 ||
        Math.hypot(centro[0] - viejo.centro[0], centro[1] - viejo.centro[1], centro[2] - viejo.centro[2]) > 2 ||
        Math.abs(A.luzDir[0] - viejo.dir[0]) + Math.abs(A.luzDir[1] - viejo.dir[1]) + Math.abs(A.luzDir[2] - viejo.dir[2]) > 0.003);
      if (rehacer) { cajaSol = cajaLuz(A.luzDir, centro, m, q.sombras); versionSombra = versionGeo; cuadrosSombra = 0; }
      if (conSombra) matrizLuz(cajaSol, cam, 170, LVP);
      if (rehacer) {
        planos(LVP, PLL);
        fbSombra.begin(); p.background(255);
        p.shader(shSombra); shSombra.setUniform('uLuzVP', LVP);
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
        for (const e of geoms.values()) {
          if (!e.op || !e.op.subida) continue;
          const ox = e.cx * 16 - E.cam.x, oz = e.cz * 16 - E.cam.z, oy = -E.cam.y;
          if (!cajaVisible(PLL, ox, oy, oz, ox + 16, oy + (E.H || 128), oz + 16)) continue;
          shSombra.setUniform('uOffset', [ox, oy, oz]); shSombra.setUniform('uAtlas', r.atlasImg); p.model(e.op); est.drawCalls++; est.sombras++;
        }
        gl.cullFace(gl.BACK); gl.disable(gl.CULL_FACE);
        fbSombra.end();
      }
      const def = `#define DETALLE ${q.detalle}\n#define NUBES_OCT ${q.nubes + 2}\n${conSombra ? '#define SOMBRAS 1\n' : ''}`;
      const clave = def;
      const sh = variante(shChunk, clave, () => p.createShader(CHUNK_V(def), CHUNK_F(def)));
      const so = variante(shObj, clave, () => p.createShader(OBJ_V(def), OBJ_F(def)));
      const sc = variante(shCielo, 'n' + q.nubes, () => p.createShader(CIELO_V, CIELO_F(`#define NUBES_OCT ${q.nubes + 2}`)));

      // ---------------------------------------------------------------- 2. escena (al lienzo o, con posproceso, a un framebuffer)
      asegurarPost(q);
      est.post = !!fbEscena;
      if (fbEscena) fbEscena.begin();
      p.background(0);
      // cielo (sin escribir profundidad)
      gl.depthMask(false); p.shader(sc);
      sc.setUniform('uVP', VP); atmosfera(sc, E, A);
      sc.setUniform('uNoche', A.noche); sc.setUniform('uTiempo', E.tiempo); sc.setUniform('uDisco', A.disco); sc.setUniform('uLunaColor', A.lunaColor); sc.setUniform('uRotEstrellas', A.rotEstrellas);
      sc.setUniform('uNubes', A.nubes); sc.setUniform('uNubeLuz', A.nubeLuz); sc.setUniform('uNubeSombra', A.nubeSombra); sc.setUniform('uBajoAgua', E.bajoAgua ? 1 : 0); sc.setUniform('uAguaNiebla', A.aguaNiebla);
      p.model(cubo); est.drawCalls++; gl.depthMask(true);
      // chunks opacos
      p.shader(sh);
      sh.setUniform('uVP', VP); atmosfera(sh, E, A); luces(sh, E, A);
      sh.setUniform('uAO', E.ao ? 1 : 0); sh.setUniform('uTiempo', E.tiempo); sh.setUniform('uOla', E.olas ?? 1); sh.setUniform('uBrilloBloques', E.brilloBloques ?? 1);
      sh.setUniform('uColorBloque', A.colorBloque); sh.setUniform('uNieblaAlt', A.nieblaAlt); sh.setUniform('uMar', E.mar ?? 48); sh.setUniform('uCam', cam); sh.setUniform('uViento', E.viento ?? 1); sh.setUniform('uAguaColor', A.aguaColor);
      if (conSombra) { sh.setUniform('uLuzVP', LVP); sh.setUniform('uSombraTam', q.sombras); }
      const texturas = (x) => { x.setUniform('uAtlas', r.atlasImg); x.setUniform('uMedia', texMedia); if (conSombra) x.setUniform('uSombraTex', fbSombra); };
      sh.setUniform('uTransp', 0); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
      for (const [, e, ox, oy, oz] of lista) if (e.op) { sh.setUniform('uOffset', [ox, oy, oz]); texturas(sh); p.model(e.op); if (!e.op.subida) soltarCPU(e.op); est.drawCalls++; est.tris += e.op.tris; est.chunksVisibles++; }
      gl.disable(gl.CULL_FACE);
      // objetos: criaturas, resaltado del bloque apuntado, avatar
      if (E.objetos?.length) {
        p.shader(so); so.setUniform('uVP', VP); atmosfera(so, E, A); luces(so, E, A); so.setUniform('uCieloObj', E.cieloObj ?? 1);
        if (conSombra) so.setUniform('uLuzVP', LVP), so.setUniform('uSombraTam', q.sombras);
        for (const o of E.objetos) {
          so.setUniform('uOffset', [o.x - E.cam.x, o.y - E.cam.y, o.z - E.cam.z]); so.setUniform('uGiro', o.giro || 0); so.setUniform('uEscala', o.escala || 1);
          so.setUniform('uTinte', o.tinte || [0, 0, 0, 0]); so.setUniform('uLuzLocal', o.luz || 0); so.setUniform('uPivote', o.pivote || [0, 0, 0]); so.setUniform('uBalanceo', o.balanceo || 0);
          if (conSombra) so.setUniform('uSombraTex', fbSombra);
          p.model(o.geom); if (!o.geom.subida && o.soltar) soltarCPU(o.geom); est.drawCalls++; est.tris += o.geom.tris || 0;
        }
      }
      if (E.sprite) {
        const sp = E.sprite; p.shader(shSpr); shSpr.setUniform('uVP', VP); atmosfera(shSpr, E, A); shSpr.setUniform('uTex', sp.imagen); shSpr.setUniform('uOffset', [sp.x - E.cam.x, sp.y - E.cam.y, sp.z - E.cam.z]);
        shSpr.setUniform('uDerecha', [Math.cos(E.cam.yaw), 0, Math.sin(E.cam.yaw)]); shSpr.setUniform('uTam', sp.tam); shSpr.setUniform('uMarco', sp.marco);
        const L = A.ambArriba.map((v, i) => v * (E.cieloObj ?? 1) + A.luzColor[i] * 0.55 + A.minLuz[i] * 1.6 + [1, 0.75, 0.5][i] * (sp.luz || 0));
        shSpr.setUniform('uLuzSpr', L);
        p.model(quad); est.drawCalls++;
      }
      // transparentes (agua, vidrio, hielo): de lejos a cerca, sin escribir profundidad
      p.shader(sh); sh.setUniform('uTransp', 1); gl.depthMask(false);
      for (let i = lista.length - 1; i >= 0; i--) { const [, e, ox, oy, oz] = lista[i]; if (!e.tr) continue; sh.setUniform('uOffset', [ox, oy, oz]); texturas(sh); p.model(e.tr); if (!e.tr.subida) soltarCPU(e.tr); est.drawCalls++; est.tris += e.tr.tris; }
      gl.depthMask(true);

      // ---------------------------------------------------------------- 3. posproceso: brillo → desenfoque → composición
      if (fbEscena) {
        fbEscena.end();
        gl.disable(gl.DEPTH_TEST);
        const pw = 1 / fbA.width, ph = 1 / fbA.height;
        fbA.begin(); p.shader(shBrillo); shBrillo.setUniform('uTex', fbEscena); shBrillo.setUniform('uPaso', [pw / 4, ph / 4]); p.model(pantalla); fbA.end();
        for (let k = 0; k < 2; k++) {
          fbB.begin(); p.shader(shDesenfoque); shDesenfoque.setUniform('uTex', fbA); shDesenfoque.setUniform('uDir', [pw * (1 + k), 0]); p.model(pantalla); fbB.end();
          fbA.begin(); p.shader(shDesenfoque); shDesenfoque.setUniform('uTex', fbB); shDesenfoque.setUniform('uDir', [0, ph * (1 + k)]); p.model(pantalla); fbA.end();
        }
        // posición del sol en la pantalla (rayos solo si está delante y de día)
        const sd = A.solDir, cx = VP[0] * sd[0] + VP[4] * sd[1] + VP[8] * sd[2], cy = VP[1] * sd[0] + VP[5] * sd[1] + VP[9] * sd[2], cw = VP[3] * sd[0] + VP[7] * sd[1] + VP[11] * sd[2];
        const sx = cw > 0 ? (cx / cw) * 0.5 + 0.5 : -9, sy = cw > 0 ? (cy / cw) * 0.5 + 0.5 : -9;
        const enPantalla = cw > 0 ? Math.max(0, 1 - Math.max(Math.abs(sx - 0.5), Math.abs(sy - 0.5)) * 1.1) : 0;
        p.shader(shFinal); shFinal.setUniform('uEscena', fbEscena); shFinal.setUniform('uBrillo', fbA); shFinal.setUniform('uBloom', E.bajoAgua ? 0.2 : 0.42);
        shFinal.setUniform('uSolPant', [sx, sy]); shFinal.setUniform('uRayos', E.bajoAgua ? 0 : A.rayos * enPantalla); shFinal.setUniform('uRayosColor', A.rayosColor);
        p.model(pantalla); est.drawCalls += 7;
        gl.enable(gl.DEPTH_TEST);
      }
    };
  }, padre);
  return r;
}
