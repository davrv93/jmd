// Pruebas de foto.mjs. Uso: node motor/pruebas/prueba.mjs   |   bun motor/pruebas/prueba.mjs
// Corre foto.mjs con el mismo motor que ejecuta la prueba (node o bun). No toca el repo: trabaja en una carpeta temporal.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FOTO = join(AQUI, '..', 'foto.mjs');
const FIXTURE = join(AQUI, 'fixture');
const MOTOR = typeof Bun !== 'undefined' ? 'bun' : 'node';
const tmp = mkdtempSync(join(tmpdir(), 'foto-prueba-'));
let ok = 0, mal = 0;
const prueba = (nombre, f) => { try { f(); ok++; console.log('  ok   ' + nombre); } catch (e) { mal++; console.log('  FALLA ' + nombre + '\n         ' + String(e.message).split('\n').join('\n         ')); } };
const afirma = (c, msg) => { if (!c) throw new Error(msg || 'afirmación falsa'); };
const igual = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'no coincide') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); };
function correr(args, runtime = process.execPath) {
  const t0 = Date.now();
  const r = spawnSync(runtime, [FOTO, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('foto.mjs terminó con ' + r.status + '\n' + r.stderr + r.stdout);
  return { ms: Date.now() - t0, out: r.stdout };
}
const leer = (d, f) => readFileSync(join(d, f));
const json = (d) => JSON.parse(leer(d, 'FOTO.json').toString('utf8'));
const mec = (j, id) => j.seguridad.mecanismos.find((m) => m.id === id);
const hall = (j, re) => j.hallazgos.lista.find((h) => re.test(h.titulo));

console.log('foto.mjs · pruebas con ' + MOTOR + ' ' + (typeof Bun !== 'undefined' ? Bun.version : process.version));

// ── 1. determinismo ──
const A = join(tmp, 'a'), B = join(tmp, 'b');
let ms1;
prueba('determinismo: dos corridas dan los mismos bytes (JSON, MD, hashes)', () => {
  ms1 = correr([FIXTURE, '--salida', A, '--silencio']).ms; correr([FIXTURE, '--salida', B, '--silencio']);
  for (const f of ['FOTO.json', 'FOTO.md', 'hashes.txt']) afirma(leer(A, f).equals(leer(B, f)), f + ' difiere entre corridas');
});
prueba('la fecha de captura está solo en el JSON y no cambia la huella', () => {
  const C = join(tmp, 'c'); correr([FIXTURE, '--salida', C, '--fecha', '2020-01-02', '--silencio']);
  igual(json(C).captura.fecha, '2020-01-02'); igual(json(C).huella_global, json(A).huella_global);
  afirma(leer(C, 'FOTO.md').equals(leer(A, 'FOTO.md')), 'el .md no debe depender de la fecha');
});
prueba('rendimiento: el fixture se fotografía en menos de 2 s', () => afirma(ms1 < 2000, ms1 + ' ms'));
prueba('hashes.txt es formato sha256sum y coincide con los archivos', () => {
  const lineas = leer(A, 'hashes.txt').toString().trim().split('\n');
  afirma(lineas.length === json(A).archivos.total, 'una línea por archivo');
  for (const l of lineas) { const m = /^([0-9a-f]{64})  (.+)$/.exec(l); afirma(m, 'formato: ' + l); afirma(createHash('sha256').update(readFileSync(join(FIXTURE, m[2]))).digest('hex') === m[1], 'hash de ' + m[2]); }
  const orden = lineas.map((l) => l.slice(66)); igual(orden, [...orden].sort(), 'orden por ruta');
  igual(json(A).huella_global, createHash('sha256').update(leer(A, 'hashes.txt')).digest('hex'), 'huella global');
});
prueba('la carpeta de salida dentro del sistema, docs/, skills/ y AGENTS.md no entran al inventario', () => {
  const D = join(tmp, 'copia'); cpSync(FIXTURE, D, { recursive: true });
  mkdirSync(join(D, 'docs'), { recursive: true }); mkdirSync(join(D, 'skills', 'x'), { recursive: true }); writeFileSync(join(D, 'skills', 'x', 'SKILL.md'), 'x'); writeFileSync(join(D, 'docs', 'MAPA.md'), 'x'); writeFileSync(join(D, 'AGENTS.md'), 'x');
  correr([D, '--silencio']); const h1 = json(join(D, 'FOTO')).huella_global; correr([D, '--silencio']); const j = json(join(D, 'FOTO'));
  igual(j.huella_global, h1, 'segunda corrida con FOTO/ presente'); igual(j.huella_global, json(A).huella_global, 'igual que el original');
  afirma(!j.archivos.lista.some((a) => /^(FOTO|docs|skills)\//.test(a.ruta) || a.ruta === 'AGENTS.md'), 'inventario limpio');
});

// ── 2. contenido del fixture ──
const J = json(A);
prueba('modo sistema: id, entidades, operaciones, reportes, roles, usuarios', () => {
  igual(J.sistema.modo, 'sistema'); igual(J.sistema.id, 'taller');
  igual(J.entidades.map((e) => e.id), ['clientes', 'productos']); igual(J.operaciones.map((o) => o.id), ['ventas']); igual(J.reportes.map((r) => r.id), ['ventas-mes', 'stock-bajo']);
  igual(J.roles.map((r) => r.id), ['admin', 'vendedor', 'auditor']); igual(J.usuarios.length, 3);
  const c = J.entidades[1].campos.find((x) => x.id === 'codigo'); afirma(c.requerido && c.unico && c.max === 20 && c.patron, 'campo código');
  igual(J.operaciones[0].estados, ['Borrador', 'Emitida', 'Anulada']); igual(J.operaciones[0].lineas.entidad, 'productos');
  igual(J.reportes[1].roles, null);
  afirma(J.entidades.every((e) => Number.isInteger(e.linea)), 'línea de cada entidad');
});
prueba('credenciales del config se muestran (no se ocultan) y se reportan', () => {
  afirma(J.usuarios.some((u) => u.usuario === 'ventas' && u.clave === 'Ventas#2026x'), 'clave visible en JSON');
  afirma(leer(A, 'FOTO.md').toString().includes('Ventas#2026x'), 'clave visible en MD');
  afirma(hall(J, /Credenciales de demostración/), 'hallazgo credenciales');
});
prueba('matriz de permisos rol × recurso × acción', () => {
  const f = J.matriz_permisos.filas.find((x) => x.recurso === 'entidad:productos');
  igual(f.celdas.auditor, ['ver', 'editar']); igual(f.celdas.vendedor, ['ver']); igual(f.celdas.admin, ['ver', 'crear', 'editar', 'eliminar']);
  igual(J.matriz_permisos.filas.find((x) => x.recurso === 'operacion:ventas').celdas.vendedor, ['ver', 'crear', 'editar', 'emitir']);
  const r = J.matriz_permisos.filas.find((x) => x.recurso === 'reporte:stock-bajo'); afirma(r.sin_restriccion && r.celdas.vendedor.length === 1, 'reporte sin roles');
  afirma(J.matriz_permisos.pantallas_fijas.find((p) => p.pantalla === 'usuarios').pistas.length > 0, 'pista de pantalla usuarios');
});
prueba('fórmulas con código fuente y archivo:línea', () => {
  const f = J.formulas.find((x) => x.dueno === 'operacion:ventas' && x.tipo === 'calcular');
  afirma(f.codigo.includes('0.18') && f.archivo === 'js/config.js' && f.linea === 61, JSON.stringify([f.archivo, f.linea]));
  afirma(J.formulas.filter((x) => x.tipo === 'regla').length === 1 && J.formulas.some((x) => x.tipo === 'reporte'), 'reglas y reportes');
});
prueba('seguridad: configuración efectiva frente a los defectos', () => {
  const s = (k) => J.seguridad.configuracion.find((x) => x.clave === k);
  afirma(s('sesionMin').desviacion && s('sesionMin').efectivo === 0, 'sesionMin'); afirma(s('minClave').desviacion, 'minClave'); afirma(s('ayudaLogin').desviacion, 'ayudaLogin');
  afirma(!s('cspMeta').desviacion && !s('cspMeta').declarado, 'cspMeta sin declarar = seguro'); afirma(!s('intentosMax').desviacion, 'intentosMax');
});
prueba('mecanismos: estados esperados con evidencia archivo:línea', () => {
  const ids = ['hash_clave', 'bloqueo_intentos', 'expiracion_sesion', 'guardia_ruta', 'escape_salida', 'innerhtml_datos', 'eval_funcion', 'csp', 'cadena_bitacora', 'checksum_respaldo', 'confirmacion_borrado', 'validacion', 'politica_clave', 'permisos_en_datos'];
  for (const id of ids) { const m = mec(J, id); afirma(m, 'falta ' + id); afirma(['presente', 'débil', 'no encontrado'].includes(m.estado), id + ': estado ' + m.estado); if (m.estado !== 'no encontrado' && id !== 'eval_funcion' && m.estado !== 'presente') afirma(m.evidencia.length > 0, id + ' sin evidencia'); }
  igual(mec(J, 'hash_clave').estado, 'presente'); igual(mec(J, 'bloqueo_intentos').estado, 'presente'); igual(mec(J, 'cadena_bitacora').estado, 'presente');
  igual(mec(J, 'guardia_ruta').estado, 'presente'); igual(mec(J, 'csp').estado, 'débil'); igual(mec(J, 'innerhtml_datos').estado, 'débil'); igual(mec(J, 'eval_funcion').estado, 'presente');
  igual(mec(J, 'expiracion_sesion').estado, 'débil'); afirma(/la configuración lo desactiva/.test(mec(J, 'expiracion_sesion').nota), 'sesionMin=0 apaga el mecanismo aunque el código exista');
  afirma(mec(J, 'innerhtml_datos').evidencia[0].archivo === 'js/60-vistas.js' && mec(J, 'innerhtml_datos').evidencia[0].linea === 18, 'evidencia innerHTML');
  afirma(mec(J, 'guardia_ruta').evidencia.every((e) => e.archivo === 'js/80-app.js'), '«guardar» no debe contar como guardia');
});
prueba('hallazgos: ordenados por riesgo, con evidencia y aviso de pista', () => {
  const r = { alto: 0, medio: 1, bajo: 2 }; const L = J.hallazgos.lista;
  for (let i = 1; i < L.length; i++) afirma(r[L[i - 1].riesgo] <= r[L[i].riesgo], 'orden en ' + L[i].id);
  afirma(L.every((h) => h.id && h.titulo && h.nota && h.verificado === false), 'campos');
  afirma(L.filter((h) => h.tipo === 'patron').every((h) => /Pista automática/.test(h.nota)), 'los patrones se declaran pistas');
  for (const re of [/Rol de solo lectura con escritura/, /Reporte sin restricción de rol/, /Constante igual al parámetro «igv»/, /sesionMin debilitada/, /innerHTML.*: débil/, /Content-Security-Policy.*débil/, /ES6\+/, /Claves previsibles/]) afirma(hall(J, re), 'falta hallazgo ' + re);
  igual(hall(J, /Rol de solo lectura/).riesgo, 'alto');
  igual(J.hallazgos.resumen.alto + J.hallazgos.resumen.medio + J.hallazgos.resumen.bajo, L.length);
});
prueba('dependencias, almacenamiento, rutas, carga y compatibilidad', () => {
  igual(J.dependencias_externas.resultado, 'ninguna');
  afirma(J.almacenamiento.usos.some((u) => u.mecanismo === 'localStorage' && u.archivo === 'js/20-almacen.js') && J.almacenamiento.usos.some((u) => u.mecanismo === 'window.name'), 'usos de almacenamiento');
  afirma(J.almacenamiento.claves_candidatas.some((c) => c.clave === 'sis_taller_v1'), 'clave sis_taller_v1');
  igual(J.carga.orden.map((o) => o.ruta), ['css/app.css', 'js/00-util.js', 'js/20-almacen.js', 'js/30-seguridad.js', 'js/35-auditoria.js', 'js/config.js', 'js/60-vistas.js', 'js/80-app.js']);
  afirma(J.rutas.literales.some((r) => r.ruta === '#/login'), 'ruta #/login'); afirma(J.rutas.esperadas_segun_config.some((r) => r.ruta === '#/e/productos' && r.confirmada), 'ruta derivada');
  afirma(J.compatibilidad.sintaxis.some((s) => s.id === 'flecha'), 'flecha'); afirma(J.compatibilidad.apis.some((a) => /includes/.test(a.api)), 'includes'); afirma(J.compatibilidad.css.some((c) => /var\(/.test(c.propiedad)), 'css var');
  afirma(!J.compatibilidad.apis.some((a) => /incluye/.test(a.api)), 'U.incluye es propio, no una pista');
});
prueba('FOTO.md trae las secciones, los diagramas Mermaid y el banco de verificación', () => {
  const m = leer(A, 'FOTO.md').toString();
  for (const t of ['## 1. Resumen', '## 3. Orden de carga', '## 8. Matriz de permisos', '## 9. Fórmulas', '## 10. Seguridad', '## 12. Hallazgos', '## 13. Banco de verificación', '```mermaid', 'erDiagram']) afirma(m.includes(t), 'falta ' + t);
  afirma(J.banco_de_verificacion.length >= 8 && J.banco_de_verificacion.every((b) => b.comando.startsWith('sed -n')), 'banco');
});

// ── 3. modo genérico (sin window.SISTEMA) ──
const G = join(tmp, 'generico'); mkdirSync(join(G, 'js'), { recursive: true }); mkdirSync(join(G, 'css'), { recursive: true });
writeFileSync(join(G, 'index.html'), `<!doctype html><html><head><title>Sistema de Ana</title>
<link rel="stylesheet" href="css/x.css"><link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
</head><body onload="iniciar()"><script src="https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js"></script>
<script src="js/app.js"></script><script src="js/falta.js"></script>
<script>var inline = 1;</script></body></html>\n`);
writeFileSync(join(G, 'css', 'x.css'), `body { background: url(http://img.example.com/fondo.png); display: grid; }\n/* var(--no) */\n`);
writeFileSync(join(G, 'js', 'app.js'), `// eval("no cuenta, es comentario")
var s = "eval(esto es una cadena)";
var re = /https?:\\/\\//;
localStorage.setItem('mi_clave', JSON.stringify({a: 1}));
document.cookie = 'x=1';
function f(x) { document.body.innerHTML = '<p>' + x + '</p>'; eval(x); }
fetch('/api/datos').then(r => r.json());
const doble = (n) => n * 2;
`);
writeFileSync(join(G, 'js', 'huerfano.js'), 'var z = 1;\n');
const OG = join(tmp, 'generico-out');
prueba('modo genérico: sin window.SISTEMA entrega archivos, carga, dependencias, almacenamiento, seguridad y compatibilidad', () => {
  correr([G, '--salida', OG, '--silencio']); const j = json(OG);
  igual(j.sistema.modo, 'generico'); igual(j.config.presente, false); igual(j.entidades.length, 0); igual(j.sistema.nombre, 'Sistema de Ana');
  const d = j.dependencias_externas.externas.map((x) => x.destino);
  afirma(d.includes('https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js') && d.includes('https://fonts.googleapis.com/css?family=Roboto') && d.includes('http://img.example.com/fondo.png'), 'externas: ' + d.join(' | '));
  afirma(j.dependencias_externas.llamadas_de_red.some((x) => x.api === 'fetch'), 'fetch');
  afirma(!d.some((x) => /^https?:\/\/?$/.test(x)), 'la regex /https?:\\/\\// no es una dependencia');
  igual(j.carga.faltan.map((x) => x.ruta), ['js/falta.js']); igual(j.carga.huerfanos, ['js/huerfano.js']); afirma(j.carga.manejadores_en_linea.length === 1, 'onload');
  igual(mec(j, 'eval_funcion').estado, 'débil'); igual(mec(j, 'eval_funcion').evidencia[0].linea, 6, 'eval de comentario y de cadena no cuentan');
  igual(mec(j, 'innerhtml_datos').estado, 'débil'); igual(mec(j, 'hash_clave').estado, 'no encontrado'); igual(mec(j, 'csp').estado, 'no encontrado');
  afirma(j.almacenamiento.usos.some((u) => u.mecanismo === 'localStorage' && u.clave === "'mi_clave'") && j.almacenamiento.usos.some((u) => u.mecanismo === 'cookie'), 'almacenamiento');
  afirma(j.compatibilidad.sintaxis.some((s) => s.id === 'let-const') && j.compatibilidad.sintaxis.some((s) => s.id === 'flecha') && j.compatibilidad.css.some((c) => /grid/.test(c.propiedad)), 'compat');
  afirma(!j.compatibilidad.css.some((c) => /variables/.test(c.propiedad)), 'var(--no) está en un comentario CSS');
  afirma(j.hallazgos.lista.some((h) => /Recurso externo cargado/.test(h.titulo) && h.riesgo === 'alto'), 'hallazgo CDN'); afirma(j.matriz_permisos.filas.length === 0, 'sin matriz');
  const md = leer(OG, 'FOTO.md').toString(); afirma(md.includes('genérico') && !md.includes('## 6. Modelo de datos') && md.includes('## 6. Seguridad'), 'md genérico');
});
prueba('modo genérico determinista', () => { const O2 = join(tmp, 'generico-out2'); correr([G, '--salida', O2, '--silencio']); for (const f of ['FOTO.json', 'FOTO.md', 'hashes.txt']) afirma(leer(OG, f).equals(leer(O2, f)), f); });

// ── 4. config roto o malicioso ──
for (const [nombre, codigo, re] of [['lanza una excepción', "window.SISTEMA = (function(){ throw new Error('boom'); })();", /boom/], ['bucle infinito', 'while (true) {}', /timed out|time/i], ['no define SISTEMA', 'window.SISTEMA = 5;', /objeto/], ['usa eval', "window.SISTEMA = eval('({id:1})');", /Code generation|eval/i]]) {
  prueba('config que ' + nombre + ': la foto se genera igual y lo informa', () => {
    const D = join(tmp, 'roto-' + nombre.replace(/\W/g, '')); mkdirSync(join(D, 'js'), { recursive: true });
    writeFileSync(join(D, 'index.html'), '<script src="js/config.js"></script>'); writeFileSync(join(D, 'js', 'config.js'), codigo + '\n');
    const t0 = Date.now(); correr([D, '--silencio']); const j = json(join(D, 'FOTO'));
    igual(j.config.presente, false); afirma(re.test(j.config.error || ''), 'error: ' + j.config.error); afirma(Date.now() - t0 < 6000, 'tiempo límite');
  });
}

// ── 5. mismo resultado en node y en bun ──
if (MOTOR === 'node') {
  const hayBun = spawnSync('bun', ['--version'], { encoding: 'utf8' });
  if (hayBun.status === 0) prueba('node y bun producen los mismos bytes', () => { const Bn = join(tmp, 'bun'); correr([FIXTURE, '--salida', Bn, '--silencio'], 'bun'); for (const f of ['FOTO.json', 'FOTO.md', 'hashes.txt']) afirma(leer(A, f).equals(leer(Bn, f)), f + ' difiere entre node y bun'); });
  else console.log('  (bun no está instalado: se omite la comparación node/bun)');
}

rmSync(tmp, { recursive: true, force: true });
console.log(ok + ' ok, ' + mal + ' con falla');
process.exit(mal ? 1 : 0);
