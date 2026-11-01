// «Tienda Sol» — app bajo prueba del taller de QA.
// Sin dependencias: solo módulos de Node (node:http, node:fs). Datos en memoria.
//
// Variables de entorno:
//   PORT=3000          puerto (por defecto 3000)
//   HOST=127.0.0.1     interfaz (usa 0.0.0.0 si un navegador en Docker debe entrar)
//   MODO=prueba        habilita POST /api/semilla (reinicia datos) — nunca en producción
//   BUGS=0             versión corregida (por defecto la app trae sus defectos)
//   LATENCIA_MS=800    agrega demora artificial a cada respuesta
//   CAIDA=1            /salud responde 503 (para probar alertas de monitoreo)
//   LOG=1              imprime cada petición

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerSemilla, semillaAleatoria } from './semilla.mjs';

// También se aceptan argumentos (funcionan igual en Windows, Mac y Linux):
//   node servidor.mjs --modo=prueba --bugs=0 --port=3100 --latencia_ms=500 --caida=1
for (const arg of process.argv.slice(2)) {
  const m = /^--([a-z_]+)=(.*)$/i.exec(arg);
  if (m) process.env[m[1].toUpperCase()] = m[2];
}

const aqui = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(aqui, 'publico');
const VERSION = '1.4.2';
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';
const MODO = process.env.MODO ?? 'normal';
// Cada instancia conserva datos, sesiones y fallos propios.
export function crearTienda(opciones = {}) {
const MODO = opciones.modo ?? process.env.MODO ?? 'normal';
let CON_BUGS = process.env.BUGS !== '0';
const inicio = Date.now();

const caos = {
  caida: process.env.CAIDA === '1',
  latenciaMs: Number(process.env.LATENCIA_MS ?? 0),
};

// ---------- almacén en memoria ----------
let db;
const sesiones = new Map(); // token -> usuario
const grabaciones = new Map(); // id -> grabación de sesión (con consentimiento)

function cargar(datos) {
  db = {
    usuarios: datos.usuarios.map((u) => ({ ...u })),
    productos: datos.productos.map((p) => ({ ...p })),
    ventas: [],
    siguienteVenta: 1,
  };
  sesiones.clear();
}
cargar(leerSemilla());

// ---------- utilidades ----------
const aCentimos = (soles) => Math.round(soles * 100);
const aSoles = (c) => Math.round(c) / 100;
const fechaLima = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(d); // AAAA-MM-DD
const hoyLima = () => fechaLima();
const vencido = (p) => p.vencimiento < hoyLima();
const precioFinal = (p) => aCentimos(p.precio) * (100 - (p.promo ?? 0)) / 100; // en céntimos

function enviarJson(res, estado, cuerpo) {
  res.writeHead(estado, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}

async function leerCuerpo(req) {
  let texto = '';
  for await (const trozo of req) {
    texto += trozo;
    if (texto.length > 1e6) throw new Error('cuerpo demasiado grande');
  }
  if (!texto) return {};
  try { return JSON.parse(texto); } catch { return null; }
}

function usuarioDe(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
  return m ? sesiones.get(m[1]) : undefined;
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

async function servirEstatico(res, ruta) {
  if (ruta === '/') ruta = '/index.html';
  const archivo = normalize(join(PUBLICO, ruta));
  if (!archivo.startsWith(PUBLICO)) return enviarJson(res, 404, { error: 'No encontrado' });
  try {
    const contenido = await readFile(archivo);
    res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(contenido);
  } catch {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><title>No encontrado</title><h1>Página no encontrada</h1>');
  }
}

// ---------- rutas de la API ----------
async function api(req, res, url) {
  const { pathname } = url;
  const metodo = req.method;

  if (metodo === 'POST' && pathname === '/api/login') {
    const cuerpo = await leerCuerpo(req);
    const u = db.usuarios.find((x) => x.usuario === cuerpo?.usuario && x.clave === cuerpo?.clave);
    if (!u) return enviarJson(res, 401, { error: 'Usuario o clave incorrectos' });
    const token = randomUUID();
    if (sesiones.size >= 100) sesiones.delete(sesiones.keys().next().value);
    sesiones.set(token, u);
    return enviarJson(res, 200, { token, nombre: u.nombre, rol: u.rol });
  }

  if (metodo === 'POST' && pathname === '/api/semilla') {
    if (MODO !== 'prueba') return enviarJson(res, 404, { error: 'Solo disponible con MODO=prueba' });
    const cuerpo = (await leerCuerpo(req)) ?? {};
    if (typeof cuerpo.bugs === 'boolean') CON_BUGS = cuerpo.bugs;
    const datos = cuerpo.semilla !== undefined ? semillaAleatoria(Number(cuerpo.semilla)) : leerSemilla();
    cargar(datos);
    return enviarJson(res, 200, { ok: true, productos: db.productos.length, semilla: datos.semilla ?? 'determinista' });
  }

  if (metodo === 'POST' && pathname === '/api/caos') {
    if (MODO === 'produccion') return enviarJson(res, 404, { error: 'No disponible' });
    const cuerpo = (await leerCuerpo(req)) ?? {};
    if (typeof cuerpo.bugs === 'boolean') CON_BUGS = cuerpo.bugs;
    if (typeof cuerpo.caida === 'boolean') caos.caida = cuerpo.caida;
    if (Number.isFinite(cuerpo.latenciaMs)) caos.latenciaMs = Math.min(5000, Math.max(0, cuerpo.latenciaMs));
    return enviarJson(res, 200, { ...caos });
  }

  // ---- grabaciones de sesión con consentimiento («semilla frontend») ----
  // Solo las crea el navegador cuando la persona aceptó. En memoria, 24 h, máximo 20 por tienda.
  if (pathname.startsWith('/api/sesiones')) {
    const ahora = Date.now();
    for (const [id, g] of grabaciones) if (ahora - g.creada > 24 * 3600_000) grabaciones.delete(id);
    const m = /^\/api\/sesiones(?:\/([a-z0-9]{6,24}))?(\/eventos)?$/.exec(pathname);
    if (!m) return enviarJson(res, 404, { error: 'Ruta no encontrada' });
    if (metodo === 'POST' && !m[1]) {
      const cuerpo = await leerCuerpo(req);
      if (!cuerpo || !/^[a-z0-9]{6,24}$/.test(cuerpo.id ?? '')) return enviarJson(res, 400, { error: 'Grabación inválida' });
      if (grabaciones.size >= 20) grabaciones.delete(grabaciones.keys().next().value);
      grabaciones.set(cuerpo.id, { id: cuerpo.id, creada: ahora, semilla: cuerpo.semilla ?? {}, eventos: [] });
      return enviarJson(res, 201, { ok: true, id: cuerpo.id });
    }
    if (metodo === 'POST' && m[1]) { // agrega eventos (también acepta /eventos)
      const g = grabaciones.get(m[1]);
      if (!g) return enviarJson(res, 404, { error: 'Grabación no encontrada' });
      const cuerpo = await leerCuerpo(req);
      const nuevos = Array.isArray(cuerpo?.eventos) ? cuerpo.eventos.slice(0, 300 - g.eventos.length) : [];
      g.eventos.push(...nuevos);
      return enviarJson(res, 200, { ok: true, eventos: g.eventos.length });
    }
    if (metodo === 'GET' && !m[1]) {
      const lista = [...grabaciones.values()].map((g) => ({
        id: g.id, creada: new Date(g.creada).toISOString(), pagina: g.semilla.pagina ?? '/', eventos: g.eventos.length,
        huboError: g.eventos.some((e) => e.tipo === 'error' || (e.tipo === 'http' && e.estado >= 400) || (e.tipo === 'aviso' && e.role === 'alert')),
      })).sort((a, b) => (a.creada < b.creada ? 1 : -1));
      return enviarJson(res, 200, lista);
    }
    if (metodo === 'GET' && m[1] && !m[2]) {
      const g = grabaciones.get(m[1]);
      return g ? enviarJson(res, 200, g) : enviarJson(res, 404, { error: 'Grabación no encontrada' });
    }
    return enviarJson(res, 405, { error: 'Método no permitido' });
  }

  if (caos.caida) return enviarJson(res, 503, { error: 'Servicio no disponible' });

  const usuario = usuarioDe(req);
  if (!usuario) return enviarJson(res, 401, { error: 'Sesión no válida. Inicia sesión.' });

  if (metodo === 'GET' && pathname === '/api/productos') {
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const lista = db.productos
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase() === q)
      .map((p) => ({ ...p, vencido: vencido(p), precioFinal: aSoles(precioFinal(p)) }));
    return enviarJson(res, 200, lista);
  }

  if (metodo === 'POST' && pathname === '/api/ventas') {
    const cuerpo = await leerCuerpo(req);
    if (!cuerpo || !Array.isArray(cuerpo.items) || cuerpo.items.length === 0) {
      return enviarJson(res, 400, { error: 'La venta no tiene productos' });
    }
    let totalC = 0;
    const lineas = [];
    for (const item of cuerpo.items) {
      const p = db.productos.find((x) => x.codigo === item.codigo);
      const cantidad = Number(item.cantidad);
      if (!p) return enviarJson(res, 422, { error: `Producto ${item.codigo} no existe` });
      if (!Number.isInteger(cantidad) || cantidad < 1) return enviarJson(res, 422, { error: `Cantidad inválida para ${p.nombre}` });
      if (vencido(p)) return enviarJson(res, 422, { error: `${p.nombre} está vencido (${p.vencimiento})` });
      if (p.stock < cantidad) return enviarJson(res, 422, { error: `Stock insuficiente de ${p.nombre}: quedan ${p.stock}` });
      const subtotal = Math.round(precioFinal(p) * cantidad);
      totalC += subtotal;
      lineas.push({ codigo: p.codigo, nombre: p.nombre, cantidad, subtotal: aSoles(subtotal) });
    }
    const efectivoC = aCentimos(Number(cuerpo.efectivo));
    if (!Number.isFinite(efectivoC) || efectivoC < totalC) {
      return enviarJson(res, 422, { error: `Efectivo insuficiente: el total es S/ ${aSoles(totalC).toFixed(2)}` });
    }
    for (const l of lineas) db.productos.find((x) => x.codigo === l.codigo).stock -= l.cantidad;
    const venta = {
      id: db.siguienteVenta++, fecha: new Date().toISOString(), dia: hoyLima(), cajero: usuario.usuario,
      lineas, total: aSoles(totalC), efectivo: aSoles(efectivoC), vuelto: aSoles(efectivoC - totalC),
    };
    if (db.ventas.length >= 1000) return enviarJson(res, 429, { error: 'Límite de práctica: reinicia tu tienda' });
    db.ventas.push(venta);
    return enviarJson(res, 201, venta);
  }

  if (metodo === 'GET' && pathname === '/api/reporte') {
    const dia = hoyLima();
    const ventas = db.ventas.filter((v) => v.dia === dia);
    const totalC = ventas.reduce((s, v) => s + aCentimos(v.total), 0);
    return enviarJson(res, 200, { dia, numeroVentas: ventas.length, totalVendido: aSoles(totalC), ventas });
  }

  return enviarJson(res, 404, { error: 'Ruta no encontrada' });
}

// ---------- servidor ----------
return async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (process.env.LOG === '1') console.log(new Date().toISOString(), req.method, url.pathname);
  try {
    if (caos.latenciaMs > 0 && url.pathname !== '/api/caos') {
      await new Promise((r) => setTimeout(r, caos.latenciaMs));
    }
    if (url.pathname === '/salud') {
      const cuerpo = {
        estado: caos.caida ? 'caido' : 'ok', version: VERSION, modo: MODO,
        activoSegundos: Math.round((Date.now() - inicio) / 1000), ventasHoy: db.ventas.length,
        hora: new Date().toISOString(),
      };
      return enviarJson(res, caos.caida ? 503 : 200, cuerpo);
    }
    if (url.pathname === '/js/config.js') {
      // Banderas de funcionalidad que lee el punto de venta.
      const config = { version: VERSION, cobroExacto: CON_BUGS, recalculoIncremental: CON_BUGS };
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(`window.TIENDA = ${JSON.stringify(config)};\n`);
    }
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return enviarJson(res, 405, { error: 'Método no permitido' });
    return await servirEstatico(res, url.pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) enviarJson(res, 500, { error: 'Error interno' });
  }
};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
const servidor = createServer(crearTienda());
servidor.listen(PORT, HOST, () => {
  console.log(`Tienda Sol ${VERSION} en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}  (modo=${MODO})`);
});

for (const senal of ['SIGINT', 'SIGTERM']) process.on(senal, () => process.exit(0));
}
