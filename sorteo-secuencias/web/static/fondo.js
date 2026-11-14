// Fondo en WebGL: una espiral de girasol (filotaxis, el ángulo áureo de
// Fibonacci) hecha de partículas que gira despacio. Con girar(true) acelera
// mientras corre una ruleta y con rafaga() estalla en confeti de colores.
// Sin WebGL queda el degradado del CSS.
const VERT = `
attribute float i;
uniform float t, giro, rafaga, escala, aspecto;
varying vec3 vColor;
varying float vAlfa;
void main() {
  float n = i;
  float ang = n * 2.39996323 + t * (0.05 + giro * 0.9);
  float r = sqrt(n) * escala * (1.0 + rafaga * (0.6 + 0.4 * fract(n * 0.618)));
  r += 0.012 * sin(t * 1.3 + n * 0.21);
  vec2 p = vec2(cos(ang), sin(ang)) * r;
  p.x /= aspecto;
  gl_Position = vec4(p, 0.0, 1.0);
  float k = fract(n * 0.0618 + t * 0.02);
  vec3 oro = vec3(1.0, 0.78, 0.34), verde = vec3(0.30, 0.85, 0.78), lila = vec3(0.62, 0.49, 1.0), rosa = vec3(1.0, 0.49, 0.70);
  vColor = k < 0.25 ? oro : k < 0.5 ? verde : k < 0.75 ? lila : rosa;
  vAlfa = (0.25 + 0.55 * (1.0 - sqrt(n) / 46.0)) * (1.0 + rafaga);
  gl_PointSize = (1.6 + 2.6 * fract(n * 0.381)) * (1.0 + rafaga * 1.5) * escala * 160.0;
}`;
const FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vAlfa;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, vAlfa * smoothstep(0.5, 0.1, d));
}`;

export function fondo(canvas) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const api = { girar() {}, rafaga() {} };
  if (!gl) return api;
  const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return api;
  gl.useProgram(prog);
  const N = 2100;
  const idx = new Float32Array(N).map((_, k) => k + 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  const aI = gl.getAttribLocation(prog, "i");
  gl.enableVertexAttribArray(aI);
  gl.vertexAttribPointer(aI, 1, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(["t", "giro", "rafaga", "escala", "aspecto"].map((n) => [n, gl.getUniformLocation(prog, n)]));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  let giroObj = 0, giro = 0, rafaga = 0, t0 = performance.now();
  function medir() {
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  addEventListener("resize", medir);
  medir();
  function cuadro(ahora) {
    const t = (ahora - t0) / 1000;
    giro += (giroObj - giro) * 0.04;
    rafaga *= 0.965;
    const aspecto = canvas.width / canvas.height;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.t, quieto ? 0 : t);
    gl.uniform1f(u.giro, giro);
    gl.uniform1f(u.rafaga, rafaga);
    gl.uniform1f(u.escala, (aspecto < 1 ? 0.034 : 0.026) * (aspecto < 1 ? 1 : 1));
    gl.uniform1f(u.aspecto, aspecto);
    gl.drawArrays(gl.POINTS, 0, N);
    if (!document.hidden) requestAnimationFrame(cuadro);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) requestAnimationFrame(cuadro); });
  requestAnimationFrame(cuadro);
  api.girar = (si) => { giroObj = si ? 1 : 0; };
  api.rafaga = () => { if (!quieto) rafaga = 1.2; };
  return api;
}
