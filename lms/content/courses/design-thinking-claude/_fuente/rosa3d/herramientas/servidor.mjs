// Servidor de trabajo de Rosa 3D (puerto 18745). Copia propia del emulador del LIVE (dt-server.mjs) + /files/ +
// herramientas de conversión. No toca el emulador de :18722.
//   /api/v1/live/<lección>/escenas/<escena>/<archivo>   escenas del curso (HTML con la CSP del LMS)
//   /api/v1/live/<lección>/comun/<archivo>              _comun del curso (solo extensiones de extsEscena)
//   /files/design-thinking-claude/materials/<ruta>      materiales (como courseFile: solo los declarados)
//   /prueba/<archivo>                                   página de prueba de Rosa 3D (con la CSP del LMS)
//   /three/…  /dl/…  /build/…  /tex/…                   herramientas de conversión (sin CSP)
//   POST /guardar?n=<nombre>                            guarda el cuerpo en rosa3d/out/<nombre>
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SP = process.env.ROSA3D_TRABAJO || path.resolve('trabajo');   // carpeta de trabajo: dl/fa11 (FBX y TGA de Rocketbox), rosa3d/{tex,out}
const CURSO = path.resolve(AQUI, '../../..');   // content/courses/design-thinking-claude
const LIVE = CURSO + '/live';
const CSP = "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src data: 'self'; font-src data:; connect-src 'self'; frame-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'";
const EXTS = { '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const TIPOS = { ...EXTS, '.html': 'text/html; charset=utf-8', '.glb': 'application/octet-stream', '.jpg': 'image/jpeg', '.tga': 'application/octet-stream', '.fbx': 'application/octet-stream', '.hdr': 'application/octet-stream' };
const RAICES = { three: process.env.THREE_DIR || path.resolve('node_modules/three'), dl: SP + '/dl', build: AQUI, tex: SP + '/rosa3d/tex', out: SP + '/rosa3d/out', prueba: SP + '/rosa3d' };
// Materiales declarados (como el LMS: solo lo que una lección publica referencia).
const MATERIALES = new Set(['materials/rosa3d/rosa.glb']);

function enviar(res, f, extra = {}) {
  if (!f || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  const ext = path.extname(f).toLowerCase();
  const st = fs.statSync(f);
  res.writeHead(200, { 'content-type': TIPOS[ext] || 'application/octet-stream', 'content-length': st.size, 'last-modified': st.mtime.toUTCString(), 'cache-control': 'no-cache', ...(ext === '.html' ? { 'content-security-policy': CSP } : {}), ...extra });
  fs.createReadStream(f).pipe(res);
}
function dentro(raiz, rel) { const f = path.normalize(path.join(raiz, rel)); return f.startsWith(raiz) ? f : null; }

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const p = decodeURIComponent(u.pathname);
  if (req.method === 'POST' && p === '/guardar') {
    const n = path.basename(u.searchParams.get('n') || ''); if (!n) { res.writeHead(400); res.end(); return; }
    const out = fs.createWriteStream(path.join(RAICES.out, n)); req.pipe(out);
    out.on('finish', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, n, bytes: fs.statSync(path.join(RAICES.out, n)).size })); });
    return;
  }
  if (req.method === 'POST' && p === '/log') { let c = ''; req.on('data', (x) => c += x); req.on('end', () => { console.log('[pag]', c.slice(0, 4000)); res.end('ok'); }); return; }
  const f = p.match(/^\/files\/design-thinking-claude\/(.+)$/);
  if (f) {
    if (!MATERIALES.has(f[1])) { res.writeHead(404); res.end('404'); return; }
    return enviar(res, dentro(CURSO, f[1]), { 'cache-control': 'private, max-age=300' });
  }
  const m = p.match(/^\/api\/v1\/live\/([^/]+)\/(.*)$/);
  if (m && m[2] === 'escenario') { res.writeHead(503, { 'content-type': 'application/json' }); res.end('{}'); return; }
  if (m && m[2].startsWith('comun/')) {
    const nom = m[2].slice(6); if (!EXTS[path.extname(nom).toLowerCase()] || nom.includes('/')) { res.writeHead(404); res.end('404'); return; }
    return enviar(res, path.join(LIVE, '_comun', nom));
  }
  if (m && m[2].startsWith('escenas/')) return enviar(res, dentro(path.join(LIVE, m[1]), m[2].slice(8)));
  const r = p.match(/^\/([a-z]+)\/(.*)$/);
  if (r && RAICES[r[1]]) return enviar(res, dentro(RAICES[r[1]], r[2]));
  res.writeHead(404); res.end('404');
}).listen(18745, '127.0.0.1', () => console.log('rosa3d en :18745'));
