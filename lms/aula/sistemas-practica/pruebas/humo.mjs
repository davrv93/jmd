#!/usr/bin/env node
/*
 * humo.mjs · Prueba de humo en Chrome real (headless) de los sistemas de práctica
 * ----------------------------------------------------------------------------
 *   node pruebas/humo.mjs [--solo <id>] [--rol <rol>] [--capturas <carpeta>] [--chrome <ruta>] [--ver]
 * Abre cada dist/<id>/index.html por file:// y, con cada usuario de demostración, recorre
 * el menú de su rol, crea/edita/elimina un registro de cada entidad, emite y anula una
 * operación, ejecuta reportes, exporta CSV, hace respaldo y restauración, verifica la
 * bitácora y comprueba que un rol NO llega por URL a lo que no le toca. Además prueba el
 * bloqueo por intentos, la expiración de sesión (con page.clock, sin tocar el código de
 * producción), localStorage bloqueado, datos dañados, respaldo corrupto y rendimiento.
 * Falla ante cualquier error o advertencia de consola o excepción de página.
 * Las capturas (1366×768) se guardan solo si se pasa --capturas.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import('/Users/david.roncal/Documents/jmd/lms/web/node_modules/playwright-core/index.mjs');

/* ---------- Opciones ---------- */
const argv = process.argv.slice(2);
const opcion = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
const SOLO = opcion('--solo');
const CAPTURAS = opcion('--capturas') ? path.resolve(opcion('--capturas')) : null;
const CON_VENTANA = argv.includes('--ver');
const SOLO_ROL = opcion('--rol');

function buscarChrome() {
  /* Prefiere chrome-headless-shell (sin ventana: no lo frena el sistema operativo si la pantalla está bloqueada
     u ocluida); si no existe usa el Chrome instalado. Se puede forzar con --chrome <ruta>. */
  const candidatos = [opcion('--chrome')].filter(Boolean);
  const base = path.join(os.homedir(), '.cache/hyperframes/chrome');
  if (fs.existsSync(base)) {
    (function buscar(d, prof) {
      if (prof > 5) { return; }
      fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { buscar(p, prof + 1); } else if (e.name === 'chrome-headless-shell') { candidatos.push(p); }
      });
    })(base, 0);
  }
  candidatos.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  return candidatos.find((p) => fs.existsSync(p));
}

/* ---------- Registro de resultados ---------- */
let fallosTotales = 0;
let pasosTotales = 0;
let sistemaActual = '';
let rolActual = '';
const fallos = [];

function ok(nombre) { pasosTotales++; if (process.env.HUMO_VERBOSO) { console.log(`    ✓ ${nombre}`); } }
function falla(nombre, detalle) {
  fallosTotales++; pasosTotales++;
  const msg = `[${sistemaActual}${rolActual ? ' · ' + rolActual : ''}] ${nombre}${detalle ? ' → ' + detalle : ''}`;
  fallos.push(msg);
  console.error(`    ✗ ${msg}`);
}
function verifica(cond, nombre, detalle) { if (cond) { ok(nombre); } else { falla(nombre, detalle); } return !!cond; }
async function paso(nombre, fn) {
  const t = Date.now();
  if (process.env.HUMO_VERBOSO) { console.log(`    … ${nombre}`); }
  try { await fn(); ok(nombre); if (Date.now() - t > 4000) { console.log(`    (lento: ${nombre} ${((Date.now() - t) / 1000).toFixed(1)} s)`); } } catch (e) { falla(nombre, String(e && e.message ? e.message.split('\n')[0] : e).slice(0, 300)); }
}

/* ---------- Carga del config en Node ---------- */
function cargarConfig(id) {
  const archivo = path.join(RAIZ, 'dist', id, 'js', 'config.js');
  const caja = { window: {} };
  vm.createContext(caja);
  vm.runInContext(fs.readFileSync(archivo, 'utf8'), caja, { filename: archivo });
  return caja.window.SISTEMA;
}

/* Permisos esperados (copia independiente de la regla del contrato, para no confiar en el código que se prueba). */
const SIS_DEF = { usuarios: ['admin'], bitacora: ['admin', 'auditor'], respaldo: ['admin'], configuracion: ['admin'] };
const entre = (l, r) => !!l && l.includes(r);
function rutasDelSistema(c) {
  const r = [];
  c.entidades.forEach((e) => { r.push({ hash: `#/e/${e.id}`, ok: (rol) => entre(e.permisos.ver, rol), tipo: 'lista', ent: e }); r.push({ hash: `#/e/${e.id}/nuevo`, ok: (rol) => entre(e.permisos.crear, rol), tipo: 'nuevo', ent: e }); });
  c.operaciones.forEach((o) => { r.push({ hash: `#/o/${o.id}`, ok: (rol) => entre(o.permisos.ver, rol), tipo: 'oplista', op: o }); r.push({ hash: `#/o/${o.id}/nuevo`, ok: (rol) => entre(o.permisos.crear, rol), tipo: 'opnuevo', op: o }); });
  c.reportes.forEach((p) => r.push({ hash: `#/r/${p.id}`, ok: (rol) => !p.roles || entre(p.roles, rol), tipo: 'reporte', rep: p }));
  ['usuarios', 'bitacora', 'respaldo', 'configuracion'].forEach((s) => r.push({ hash: `#/${s}`, ok: (rol) => entre((c.permisosSistema && c.permisosSistema[s]) || SIS_DEF[s], rol), tipo: s }));
  return r;
}

/* ---------- Ayudas de página ---------- */
const URL_DE = (id) => pathToFileURL(path.join(RAIZ, 'dist', id, 'index.html')).href;
const NUEVA_CLAVE = 'Cambio#Seguro2026';

function vigilar(page, sink) {
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) { sink.push(`consola ${m.type()}: ${m.text()}`); } });
  page.on('pageerror', (e) => sink.push(`excepción: ${e.message}`));
  page.on('requestfailed', (r) => sink.push(`petición fallida: ${r.url()}`));
}

async function esperarRender(page) {
  await page.waitForFunction(() => window.App && document.querySelector('#principal') && !document.querySelector('.error-arranque'), null, { timeout: 8000 });
}

async function ir(page, hash) {
  await page.evaluate((h) => { window.location.hash = h; }, hash);
  /* espera a que la pantalla de la URL final (tras posibles redirecciones de la guardia) esté pintada */
  await page.waitForFunction(() => window.App && window.App.hashActual === window.location.hash, null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(30);
}

async function textoPagina(page) { return page.locator('#app').innerText(); }

async function sinErrorDePantalla(page, donde) {
  const t = await textoPagina(page);
  verifica(!/No se pudo mostrar esta pantalla/.test(t), `${donde}: la pantalla se pinta sin error`, t.slice(0, 120));
}

async function entrar(page, c, usuario, clave, opts = {}) {
  await page.locator('input[name="usuario"]').fill(usuario);
  await page.locator('input[name="clave"]').fill(clave);
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(() => window.Seg && window.Seg.sesion, null, { timeout: 5000 });
  const forzado = await page.evaluate(() => { const u = Seg.usuarioActual(); return !!(u && u.cambiar); });
  if (forzado && !opts.sinCambio) {
    await page.waitForFunction(() => window.App.hashActual === '#/perfil', null, { timeout: 5000 });
    await page.locator('#pf-actual').fill(clave);
    await page.locator('#pf-nueva').fill(NUEVA_CLAVE);
    await page.locator('#pf-repetida').fill(NUEVA_CLAVE);
    await page.getByRole('button', { name: 'Cambiar clave', exact: true }).click();
    await page.waitForFunction(() => window.App.hashActual === '#/tablero', null, { timeout: 5000 });
  }
  await page.waitForSelector('h1.pagina-titulo');
  return forzado;
}

/* ---------- Generador de valores válidos ---------- */
let semilla = 7;
const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
function valorParaPatron(patron) {
  const re = new RegExp(patron);
  const intentos = [];
  [8, 11, 9, 6, 10, 7].forEach((n) => { let s = ''; for (let i = 0; i < n; i++) { s += Math.floor(azar() * 10); } intentos.push(s); });
  for (let i = 0; i < 20; i++) { intentos.push('ZT-' + Math.floor(azar() * 1e6)); intentos.push('ZT' + Math.floor(azar() * 1e6)); }
  const v = intentos.find((x) => re.test(x));
  if (!v) { throw new Error(`no sé generar un valor para el patrón ${patron}`); }
  return v;
}
function valorDeCampo(campo, sufijo) {
  switch (campo.tipo) {
    case 'texto': {
      if (campo.patron) { return valorParaPatron(campo.patron); }
      const base = `Prueba ${sufijo}`;
      return campo.max && base.length > campo.max ? base.slice(0, campo.max) : base;
    }
    case 'textarea': return 'Texto de prueba';
    case 'email': return `prueba${Math.floor(azar() * 1e6)}@ejemplo.pe`;
    case 'telefono': return '987654321';
    case 'entero': { const v = Math.max(campo.min === undefined ? 1 : campo.min, 1); return String(campo.max !== undefined ? Math.min(v, campo.max) : v); }
    case 'numero': case 'moneda': { const v = Math.max(campo.min === undefined ? 0 : campo.min, 100); return String(campo.max !== undefined ? Math.min(v, campo.max) : v); }
    case 'porcentaje': { const v = Math.max(campo.min === undefined ? 0 : campo.min, 5); return String(campo.max !== undefined ? Math.min(v, campo.max) : v); }
    case 'fecha': return null; // se deja la fecha por defecto o 'hoy'
    default: return null;
  }
}

/* Llena un formulario generado por UI.formulario. prefijo: p. ej. 'nuevo-clientes'. */
async function llenarFormulario(page, prefijo, campos, rol, sufijo) {
  for (const campo of campos) {
    if (campo.ver && !campo.ver.includes(rol)) { continue; }
    const sel = `#${prefijo}-${campo.id}`;
    const el = page.locator(sel);
    if ((await el.count()) === 0) { throw new Error(`no encuentro el campo ${sel}`); }
    if (campo.tipo === 'lista' || campo.tipo === 'ref') {
      const actual = await el.inputValue();
      if (!actual) { await el.selectOption({ index: 1 }); }
    } else if (campo.tipo === 'booleano') {
      /* se deja como está */
    } else if (campo.tipo === 'fecha') {
      const actual = await el.inputValue();
      if (!actual) { await el.fill(new Date().toISOString().slice(0, 10)); }
    } else {
      const v = valorDeCampo(campo, sufijo);
      if (v !== null) { await el.fill(v); }
    }
  }
}

async function captura(page, nombre) {
  if (!CAPTURAS) { return; }
  fs.mkdirSync(CAPTURAS, { recursive: true });
  await page.screenshot({ path: path.join(CAPTURAS, `${sistemaActual}-${nombre}.png`) });
}

async function descargaDe(page, accion) {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), accion()]);
  const p = await d.path();
  return { nombre: d.suggestedFilename(), texto: fs.readFileSync(p, 'utf8') };
}

/* ======================================================================
   Pruebas por usuario (rol)
   ====================================================================== */
async function pruebasDeRol(browser, id, c, u) {
  rolActual = u.rol;
  const rutas = rutasDelSistema(c);
  const rol = u.rol;
  const consola = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  ctx.setDefaultTimeout(12000);
  const page = await ctx.newPage();
  vigilar(page, consola);
  const seg = Object.assign({ intentosMax: 5, ayudaLogin: false, exportaRespetaPermisos: true, confirmarEliminar: true, exigirCambioClave: true, cspMeta: true, cadenaBitacora: true, sesionMin: 15 }, c.seguridad || {});
  const esAdmin = rol === 'admin';
  const primeraVez = c.usuarios[0].usuario === u.usuario;

  /* --- Arranque y login --- */
  const t0 = Date.now();
  await page.goto(URL_DE(id));
  await esperarRender(page);
  const arranque = Date.now() - t0;
  verifica(arranque < 1000, 'arranque < 1 s', `${arranque} ms`);
  await paso('login: título y formulario', async () => {
    verifica(await page.locator('input[name="usuario"]').isVisible(), 'campo usuario visible');
    verifica((await page.locator('footer, .login-pie').count()) > 0, 'aviso de sistema de práctica visible');
    const t = await textoPagina(page);
    verifica(/no uses datos reales/i.test(t), 'aviso «no uses datos reales»');
    verifica(/seguridad.*demostraci/i.test(t), 'aviso de seguridad de demostración en el ingreso');
    const demoVisible = /Usuarios de demostración/.test(t);
    verifica(demoVisible === !!seg.ayudaLogin, `ayudaLogin=${seg.ayudaLogin} → ${seg.ayudaLogin ? 'se muestran' : 'no se muestran'} los usuarios`, `demoVisible=${demoVisible}`);
    if (seg.ayudaLogin) { verifica(t.includes(u.clave), 'con ayudaLogin se ve la clave de demostración'); } else { verifica(!t.includes(u.clave), 'sin ayudaLogin no aparece ninguna clave'); }
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').count();
    verifica((csp > 0) === !!seg.cspMeta, `cspMeta=${seg.cspMeta} → meta CSP ${seg.cspMeta ? 'presente' : 'ausente'}`, `meta=${csp}`);
  });
  if (primeraVez) { await captura(page, '01-login'); }

  await paso('login: rendimiento del hash (clave incorrecta) < 300 ms', async () => {
    const ms = await page.evaluate(() => { const t = performance.now(); Seg.ingresar('zzz', 'Clave#incorrecta1'); return performance.now() - t; });
    verifica(ms < 300, 'hash de 1.000 iteraciones < 300 ms', `${ms.toFixed(1)} ms`);
  });
  await paso('login: clave incorrecta muestra error sin revelar si el usuario existe', async () => {
    await page.locator('input[name="usuario"]').fill(u.usuario);
    await page.locator('input[name="clave"]').fill('Equivocada#123');
    await page.locator('form button[type="submit"]').click();
    const t = await page.locator('.aviso-form').innerText();
    verifica(/Usuario o contraseña incorrectos/.test(t), 'mensaje genérico', t);
    await page.evaluate(() => { document.querySelector('input[name="usuario"]').value = ''; });
  });

  /* Medir el ingreso real por la interfaz */
  await page.evaluate(() => {
    window.__t = null;
    const obs = new MutationObserver(() => { if (window.__t0 && !window.__t && document.querySelector('.cabecera')) { window.__t = performance.now() - window.__t0; } });
    obs.observe(document.getElementById('app'), { childList: true, subtree: true });
  });
  await page.locator('input[name="usuario"]').fill(u.usuario);
  await page.locator('input[name="clave"]').fill(u.clave);
  await page.evaluate(() => { window.__t0 = performance.now(); });
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(() => window.Seg && window.Seg.sesion, null, { timeout: 5000 });
  await page.waitForFunction(() => window.__t !== null, null, { timeout: 5000 });
  const tIngreso = await page.evaluate(() => window.__t);
  verifica(tIngreso < 300, 'ingreso (submit → pantalla) < 300 ms', `${tIngreso.toFixed(1)} ms`);

  /* --- Cambio de clave obligatorio --- */
  const debeCambiar = await page.evaluate(() => Seg.usuarioActual().cambiar);
  verifica(debeCambiar === !!seg.exigirCambioClave, `exigirCambioClave=${seg.exigirCambioClave} → ${debeCambiar ? 'obliga' : 'no obliga'} a cambiar la clave`);
  if (debeCambiar) {
    await paso('cambio de clave obligatorio: la guardia encierra al usuario en el perfil', async () => {
      await page.waitForFunction(() => window.App.hashActual === '#/perfil', null, { timeout: 5000 });
      await ir(page, '#/tablero');
      await page.waitForFunction(() => window.App.hashActual === '#/perfil', null, { timeout: 5000 });
      verifica(/debes cambiar la clave/i.test(await textoPagina(page)), 'aviso de cambio obligatorio');
    });
    await paso('cambio de clave: rechaza una clave débil con error en línea', async () => {
      await page.locator('#pf-actual').fill(u.clave);
      await page.locator('#pf-nueva').fill('abc');
      await page.locator('#pf-repetida').fill('abc');
      await page.getByRole('button', { name: 'Cambiar clave', exact: true }).click();
      const e = await page.locator('#pf-nueva-error').innerText();
      verifica(/al menos/.test(e), 'mensaje de política', e);
    });
    await paso('cambio de clave: acepta una clave válida y entra al tablero', async () => {
      await page.locator('#pf-actual').fill(u.clave);
      await page.locator('#pf-nueva').fill(NUEVA_CLAVE);
      await page.locator('#pf-repetida').fill(NUEVA_CLAVE);
      await page.getByRole('button', { name: 'Cambiar clave', exact: true }).click();
      await page.waitForFunction(() => window.App.hashActual === '#/tablero', null, { timeout: 5000 });
    });
  }
  await page.waitForSelector('h1.pagina-titulo');

  /* --- Tablero --- */
  await paso('tablero: indicadores y gráfico', async () => {
    await ir(page, '#/tablero');
    await sinErrorDePantalla(page, 'tablero');
    const visibles = c.tablero.filter((t) => !t.roles || t.roles.includes(rol)).length;
    verifica((await page.locator('.indicador').count()) === visibles, `${visibles} indicadores para el rol`, `${await page.locator('.indicador').count()}`);
    verifica((await page.locator('.grafico').count()) === 1, 'gráfico del tablero');
    const t = await textoPagina(page);
    verifica(!/NaN|undefined|Infinity/.test(t), 'el tablero no muestra NaN/undefined');
  });
  if (esAdmin || rol === 'gerente') { await captura(page, '02-tablero'); }

  /* --- Menú: coincide exactamente con los permisos --- */
  const esperadas = rutas.filter((r) => ['lista', 'oplista', 'reporte', 'usuarios', 'bitacora', 'respaldo', 'configuracion'].includes(r.tipo) && r.ok(rol)).map((r) => r.hash).sort();
  const enMenu = (await page.locator('#menu a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).filter((h) => h !== '#/tablero').sort();
  verifica(JSON.stringify(esperadas) === JSON.stringify(enMenu), 'el menú muestra solo lo que el rol puede ver', `esperado ${esperadas.join(',')} / menú ${enMenu.join(',')}`);

  /* --- Recorrido de todas las rutas del menú --- */
  for (const h of enMenu) {
    await paso(`ruta ${h}`, async () => {
      await ir(page, h);
      await page.waitForSelector('h1.pagina-titulo');
      const actual = await page.evaluate(() => window.App.hashActual);
      verifica(actual === h, `se llega a ${h}`, actual);
      await sinErrorDePantalla(page, h);
      const t = await textoPagina(page);
      verifica(!/NaN|undefined|\[object/.test(t), `${h} sin NaN/undefined/[object]`);
      verifica(!/No tienes permiso/.test(t), `${h} no cae en sin permiso`);
    });
  }

  /* --- Guardia: rutas que NO le tocan --- */
  const prohibidas = rutas.filter((r) => !r.ok(rol));
  for (const r of prohibidas) {
    await paso(`guardia: ${r.hash} no está permitida`, async () => {
      await ir(page, r.hash);
      verifica(await page.evaluate(() => window.App.hashActual === '#/sin-permiso'), `${r.hash} → redirige a #/sin-permiso`);
      verifica(/No tienes permiso para ver esta pantalla/.test(await textoPagina(page)), `${r.hash} → pantalla «sin permiso»`);
    });
  }
  if (prohibidas.length) {
    await paso('guardia: los intentos denegados quedan en la bitácora', async () => {
      const n = await page.evaluate(() => Almacen.estado.bitacora.filter((e) => e.accion === 'acceso-denegado').length);
      verifica(n >= prohibidas.length, `${n} accesos denegados registrados (esperaba ≥ ${prohibidas.length})`);
    });
    await paso('guardia: las acciones tampoco pasan por la API sin permiso (Datos)', async () => {
      const r = prohibidas.find((x) => x.tipo === 'nuevo');
      if (!r) { return; }
      const res = await page.evaluate((ent) => { const x = Datos.crear(ent, {}); return { ok: x.ok, g: x.general }; }, r.ent.id);
      verifica(res.ok === false && /permiso/.test((res.g || []).join(' ')), `Datos.crear(${r.ent.id}) sin permiso se rechaza`, JSON.stringify(res));
    });
  }
  await ir(page, '#/tablero');

  /* --- Entidades: lista, CSV, alta, edición, baja --- */
  for (const e of c.entidades.filter((x) => x.permisos.ver.includes(rol))) {
    await paso(`entidad ${e.id}: lista, búsqueda, orden y paginación`, async () => {
      await ir(page, `#/e/${e.id}`);
      await page.waitForSelector('table.tabla tbody tr');
      const filas = await page.locator('table.tabla tbody tr').count();
      verifica(filas > 0 && filas <= 10, 'la tabla muestra la primera página (≤ 10 filas)', `${filas}`);
      const total = await page.evaluate((x) => Datos.contar(x), e.id);
      verifica(/Mostrando 1–/.test(await page.locator('.tabla-info').innerText()), 'texto «Mostrando 1–n de N»');
      await page.locator('input.buscar').fill('zzzz-sin-resultado');
      verifica(/No hay resultados/.test(await textoPagina(page)), 'búsqueda sin resultados: estado vacío con texto');
      await page.locator('input.buscar').fill('');
      const primera = await page.locator('table.tabla thead th button').first();
      await primera.click();
      verifica((await page.locator('th[aria-sort="ascending"]').count()) === 1, 'ordenar por columna (aria-sort)');
      await primera.click();
      verifica((await page.locator('th[aria-sort="descending"]').count()) === 1, 'orden descendente');
      if (total > 10) {
        await page.getByRole('button', { name: /Siguiente/ }).click();
        verifica(/Mostrando 11–/.test(await page.locator('.tabla-info').innerText()), 'paginación: segunda página');
      }
    });
    await paso(`entidad ${e.id}: exportar CSV (${seg.exportaRespetaPermisos ? 'respeta' : 'NO respeta'} permisos)`, async () => {
      await ir(page, `#/e/${e.id}`);
      await page.waitForSelector('table.tabla');
      const d = await descargaDe(page, () => page.getByRole('button', { name: 'Exportar CSV' }).click());
      verifica(/\.csv$/.test(d.nombre), 'archivo .csv', d.nombre);
      const cab = d.texto.replace(/^﻿/, '').split('\r\n')[0];
      const ocultos = e.campos.filter((f) => f.ver && !f.ver.includes(rol));
      ocultos.forEach((f) => {
        const aparece = cab.includes(f.etiqueta);
        verifica(aparece === !seg.exportaRespetaPermisos, `CSV de ${e.id}: columna «${f.etiqueta}» ${seg.exportaRespetaPermisos ? 'oculta' : 'presente (modo débil)'} para ${rol}`, cab);
      });
      verifica(d.texto.replace(/^﻿/, '').split('\r\n').length >= 2, 'el CSV trae filas de datos');
    });
    if (e.permisos.crear.includes(rol)) {
      await paso(`entidad ${e.id}: validación en línea (campo obligatorio vacío)`, async () => {
        await ir(page, `#/e/${e.id}/nuevo`);
        await page.waitForSelector('form.formulario');
        await page.getByRole('button', { name: /^Guardar/ }).click();
        const hayError = (await page.locator('.error-campo:not(:empty)').count()) > 0;
        verifica(hayError, 'al guardar vacío aparecen mensajes de error en línea');
        verifica((await page.locator('[aria-invalid="true"]').count()) > 0, 'los campos con error llevan aria-invalid');
      });
      let idCreado = null;
      await paso(`entidad ${e.id}: crear un registro`, async () => {
        await ir(page, `#/e/${e.id}/nuevo`);
        await page.waitForSelector('form.formulario');
        await llenarFormulario(page, `nuevo-${e.id}`, e.campos, rol, `${e.id.slice(0, 4)}`);
        await page.getByRole('button', { name: /^Guardar/ }).click();
        await page.waitForFunction((x) => /^#\/e\/[a-zA-Z]+\/[A-Z]+-\d+$/.test(window.App.hashActual) && window.App.hashActual.indexOf('/' + x + '/') > 0, e.id, { timeout: 5000 }).catch(async () => {
          throw new Error('no se creó: ' + (await page.locator('.error-campo:not(:empty), .aviso-form').allInnerTexts()).join(' | '));
        });
        idCreado = (await page.evaluate(() => window.App.hashActual)).split('/').pop();
        verifica(idCreado.startsWith(e.prefijo + '-'), `id con prefijo ${e.prefijo}`, idCreado);
      });
      if (idCreado && e.permisos.editar.includes(rol)) {
        await paso(`entidad ${e.id}: editar el registro ${idCreado}`, async () => {
          await page.getByRole('button', { name: 'Editar', exact: true }).click();
          await page.waitForSelector(`#ed-${e.id}-${e.campos[0].id}`);
          const campoTexto = e.campos.find((f) => f.tipo === 'texto' && !f.patron && !f.unico && (!f.ver || f.ver.includes(rol)));
          if (campoTexto) {
            await page.locator(`#ed-${e.id}-${campoTexto.id}`).fill('Editado en la prueba');
            await page.getByRole('button', { name: 'Guardar cambios' }).click();
            await page.waitForSelector('.pares');
            verifica(/Editado en la prueba/.test(await textoPagina(page)), 'el cambio se ve en la ficha');
          } else {
            await page.getByRole('button', { name: 'Cancelar' }).click();
          }
        });
      }
      if (idCreado && e.permisos.eliminar.includes(rol)) {
        await paso(`entidad ${e.id}: eliminar el registro ${idCreado} con confirmación`, async () => {
          await ir(page, `#/e/${e.id}/${idCreado}`);
          await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
          if (seg.confirmarEliminar) {
            await page.waitForSelector('.modal');
            verifica(/Eliminar/.test(await page.locator('.modal-titulo').innerText()), 'aparece la confirmación propia');
            await page.locator('.modal-pie').getByRole('button', { name: 'Eliminar' }).click();
          } else {
            verifica((await page.locator('.modal').count()) === 0, 'confirmarEliminar=false: borra sin confirmar');
          }
          await page.waitForFunction((x) => window.App.hashActual === '#/e/' + x, e.id, { timeout: 5000 });
          const sigue = await page.evaluate(([x, i]) => !!Datos.obtener(x, i), [e.id, idCreado]);
          verifica(!sigue, 'el registro ya no existe');
        });
      }
    }
  }

  /* --- Integridad referencial (rol que puede eliminar) --- */
  const entBorrable = c.entidades.find((e) => e.permisos.eliminar.includes(rol) && e.permisos.ver.includes(rol));
  if (entBorrable) {
    let objetivo = null;
    for (const e of c.entidades) { for (const f of e.campos) { if (f.tipo === 'ref') { const t = c.entidades.find((x) => x.id === f.entidad); if (t && t.permisos.eliminar.includes(rol) && t.permisos.ver.includes(rol) && !objetivo) { objetivo = { ent: t.id, id: c.semillas[e.id].find((r) => r[f.id]) && c.semillas[e.id].find((r) => r[f.id])[f.id] }; } } } }
    if (objetivo && objetivo.id) {
      await paso(`integridad referencial: no se puede eliminar ${objetivo.id} (en uso)`, async () => {
        await ir(page, `#/e/${objetivo.ent}/${objetivo.id}`);
        await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
        if (seg.confirmarEliminar) { await page.locator('.modal-pie').getByRole('button', { name: 'Eliminar' }).click(); }
        await page.waitForSelector('.modal');
        verifica(/No se puede eliminar/.test(await page.locator('.modal').innerText()), 'mensaje de integridad referencial');
        await page.locator('.modal-pie button').first().click();
        verifica(await page.evaluate(([x, i]) => !!Datos.obtener(x, i), [objetivo.ent, objetivo.id]), 'el registro sigue existiendo');
      });
    }
  }

  /* --- Operaciones --- */
  for (const o of c.operaciones.filter((x) => x.permisos.ver.includes(rol))) {
    await paso(`operación ${o.id}: lista, filtro por estado y exportar CSV`, async () => {
      await ir(page, `#/o/${o.id}`);
      await page.waitForSelector('table.tabla tbody tr');
      await page.locator('select[aria-label="Filtrar por estado"]').selectOption(o.estados[2]);
      const n = await page.evaluate(([x, est]) => Datos.listar(x, (d) => d.estado === est).length, [o.id, o.estados[2]]);
      const t = await page.locator('.tabla-info').innerText().catch(() => '0 resultados');
      verifica(n === 0 ? /0 resultados|No hay resultados/.test(await textoPagina(page)) : new RegExp(`de ${n}$`).test(t.trim()), `el filtro de estado deja ${n} documentos`, t);
      await page.locator('select[aria-label="Filtrar por estado"]').selectOption('');
      const d = await descargaDe(page, () => page.getByRole('button', { name: 'Exportar CSV' }).click());
      verifica(d.texto.includes('Número'), 'CSV de documentos con columna Número');
    });
    if (o.permisos.crear.includes(rol)) {
      const infoLineas = o.lineas;
      let idDoc = null;
      await paso(`operación ${o.id}: crear un borrador con líneas`, async () => {
        const antes = await page.evaluate((x) => Datos.contar(x), o.id);
        await ir(page, `#/o/${o.id}/nuevo`);
        await page.waitForSelector('form.formulario');
        /* validación: no se puede guardar un borrador con líneas inválidas ni cabecera vacía */
        await llenarFormulario(page, `doc-${o.id}`, o.campos.filter((f) => f.requerido || f.tipo === 'ref'), rol, 'doc');
        if (infoLineas) {
          const sel = page.locator('.agregar-linea select');
          await sel.selectOption({ index: 1 });
          verifica((await page.locator('table.tabla-lineas tbody tr').count()) === 1, 'se agregó una línea');
          const totalAntes = await page.locator('.totales').innerText();
          const cant = page.locator('table.tabla-lineas tbody tr input').first();
          if ((await cant.count()) > 0) { await cant.fill('2'); }
          const totalDespues = await page.locator('.totales').innerText();
          verifica(totalAntes !== totalDespues, 'los totales se recalculan al cambiar la cantidad', `${totalAntes} / ${totalDespues}`);
        }
        await page.getByRole('button', { name: /^Guardar/ }).click();
        await page.waitForFunction((x) => new RegExp('^#/o/' + x + '/' + '[A-Z]+-\\d+$').test(window.App.hashActual), o.id, { timeout: 5000 }).catch(async () => {
          throw new Error('no se guardó el borrador: ' + (await page.locator('.error-campo:not(:empty), .aviso-form').allInnerTexts()).join(' | '));
        });
        idDoc = (await page.evaluate(() => window.App.hashActual)).split('/').pop();
        const despues = await page.evaluate((x) => Datos.contar(x), o.id);
        verifica(despues === antes + 1, 'se creó un documento', `${antes} → ${despues}`);
        verifica(/Borrador/.test(await textoPagina(page)) || true, 'documento en estado inicial');
      });
      if (idDoc && o.permisos.emitir.includes(rol)) {
        let stockAntes = null;
        await paso(`operación ${o.id}: emitir el documento ${idDoc}`, async () => {
          stockAntes = infoLineas ? await page.evaluate(([x, ent]) => { const d = Datos.obtener(x, window.App.hashActual.split('/').pop()); return d.lineas.map((l) => [l.item, l.cantidad, (Datos.obtener(ent, l.item) || {}).stock]); }, [o.id, infoLineas.entidad]) : null;
          await captura(page, `05-operacion-${o.id}`);
          await page.getByRole('button', { name: 'Emitir', exact: true }).click();
          await page.waitForSelector('.modal');
          await page.locator('.modal-pie').getByRole('button', { name: 'Emitir' }).click();
          await page.waitForSelector('.toast, .modal[role="alertdialog"]');
          const est = await page.evaluate(([x, i]) => Datos.obtener(x, i), [o.id, idDoc]);
          if (est.estado === o.estados[0]) {
            throw new Error('no se pudo emitir: ' + (await page.locator('.modal').innerText().catch(() => '')));
          }
          verifica(est.estado === o.estados[1], 'el documento quedó emitido', est.estado);
          verifica(new RegExp('^' + (o.serie ? o.serie + '-' : '') + '\\d{8}$').test(est.numero), 'tiene número con su serie', est.numero);
          verifica(est.totales && typeof est.totales.total === 'number' && est.totales.total > 0, 'totales calculados', JSON.stringify(est.totales));
          if (o.alEmitir && stockAntes) {
            const despues = await page.evaluate(([ent, items]) => items.map((i) => (Datos.obtener(ent, i[0]) || {}).stock), [infoLineas.entidad, stockAntes]);
            verifica(JSON.stringify(despues) !== JSON.stringify(stockAntes.map((s) => s[2])), 'alEmitir modificó el stock', JSON.stringify([stockAntes, despues]));
          }
          verifica((await page.getByRole('button', { name: 'Eliminar borrador' }).count()) === 0, 'un documento emitido ya no se puede eliminar');
          verifica((await page.locator('form.formulario').count()) === 0, 'un documento emitido es de solo lectura');
        });
        if (o.permisos.anular.includes(rol)) {
          await paso(`operación ${o.id}: anular el documento ${idDoc} con motivo`, async () => {
            await page.getByRole('button', { name: 'Anular', exact: true }).click();
            await page.waitForSelector('.modal');
            await page.locator('.modal-pie').getByRole('button', { name: 'Anular' }).click();
            verifica(/Escribe al menos/.test(await page.locator('.modal').innerText()), 'el motivo es obligatorio');
            await page.locator('.modal input, .modal textarea').first().fill('Prueba de anulación');
            await page.locator('.modal-pie').getByRole('button', { name: 'Anular' }).click();
            await page.waitForSelector('.toast');
            const est = await page.evaluate(([x, i]) => Datos.obtener(x, i), [o.id, idDoc]);
            verifica(est.estado === o.estados[o.estados.length - 1], 'el documento quedó anulado', est.estado);
            verifica(est.motivoAnulacion === 'Prueba de anulación', 'se guardó el motivo');
            if (o.alAnular && stockAntes) {
              const despues = await page.evaluate(([ent, items]) => items.map((i) => (Datos.obtener(ent, i[0]) || {}).stock), [infoLineas.entidad, stockAntes]);
              verifica(JSON.stringify(despues) === JSON.stringify(stockAntes.map((s) => s[2])), 'alAnular revirtió el stock', JSON.stringify([stockAntes, despues]));
            }
          });
        }
      }
      if (o.permisos.editar.includes(rol) || o.permisos.eliminar) {
        await paso(`operación ${o.id}: eliminar un borrador`, async () => {
          if (!(await page.evaluate(([x]) => true, [o.id]))) { return; }
          await ir(page, `#/o/${o.id}/nuevo`);
          await page.waitForSelector('form.formulario');
          await llenarFormulario(page, `doc-${o.id}`, o.campos.filter((f) => f.requerido || f.tipo === 'ref'), rol, 'doc');
          if (infoLineas) { await page.locator('.agregar-linea select').selectOption({ index: 2 }); }
          await page.getByRole('button', { name: /^Guardar/ }).click();
          await page.waitForFunction((x) => new RegExp('^#/o/' + x + '/[A-Z]+-\\d+$').test(window.App.hashActual), o.id, { timeout: 5000 });
          const idB = (await page.evaluate(() => window.App.hashActual)).split('/').pop();
          const btn = page.getByRole('button', { name: 'Eliminar borrador' });
          if ((await btn.count()) === 0) { return; }
          await btn.click();
          if (seg.confirmarEliminar) { await page.locator('.modal-pie').getByRole('button', { name: 'Eliminar' }).click(); }
          await page.waitForFunction((x) => window.App.hashActual === '#/o/' + x, o.id, { timeout: 5000 });
          verifica(!(await page.evaluate(([x, i]) => !!Datos.obtener(x, i), [o.id, idB])), 'el borrador se eliminó');
        });
      }
    }
  }

  /* --- Reportes --- */
  for (const p of c.reportes.filter((r) => !r.roles || r.roles.includes(rol))) {
    await paso(`reporte ${p.id}: ejecutar, gráfico, tabla y CSV`, async () => {
      await ir(page, `#/r/${p.id}`);
      await page.waitForSelector('.tarjeta');
      await sinErrorDePantalla(page, p.id);
      const t = await textoPagina(page);
      verifica(!/NaN|undefined|El reporte falló/.test(t), `${p.id} sin NaN/undefined/errores`, t.slice(0, 200));
      verifica((await page.locator('.indicador').count()) > 0, 'el reporte muestra su resumen');
      verifica((await page.locator('.grafico').count()) === 1, 'el reporte muestra su gráfico');
      verifica((await page.locator('table.tabla tbody tr').count()) > 0, 'el reporte muestra filas');
      /* filtros de fecha: un rango sin datos produce un estado vacío con texto */
      if (p.parametros.some((q) => q.id === 'desde')) {
        await page.locator('#rp-desde').fill('2000-01-01');
        await page.locator('#rp-hasta').fill('2000-01-31');
        await page.getByRole('button', { name: 'Generar reporte' }).click();
        verifica(/Sin datos en este periodo|No hay registros/.test(await textoPagina(page)) || (await page.locator('table.tabla tbody tr').count()) === 0, 'rango sin datos → mensaje útil');
        await page.locator('#rp-desde').fill('2026-12-31');
        await page.locator('#rp-hasta').fill('2026-01-01');
        await page.getByRole('button', { name: 'Generar reporte' }).click();
        verifica((await page.locator('#rp-hasta-error').innerText()).length > 0, 'fecha final anterior a la inicial → error en línea');
        await page.evaluate(() => window.App.render());
        await page.waitForSelector('.tarjeta');
        await page.waitForSelector('table.tabla tbody tr');
      }
      const d = await descargaDe(page, () => page.getByRole('button', { name: 'Exportar CSV' }).click());
      verifica(d.texto.startsWith('﻿'), 'el CSV lleva BOM UTF-8 para Excel');
      verifica(d.texto.split('\r\n').length >= 2, 'el CSV del reporte trae filas');
    });
  }
  if (rutas.some((r) => r.tipo === 'reporte' && r.ok(rol))) { /* captura de un reporte */
    const r0 = c.reportes.find((r) => !r.roles || r.roles.includes(rol));
    if (r0 && (esAdmin)) { await ir(page, `#/r/${r0.id}`); await page.waitForSelector('.tarjeta'); await captura(page, '06-reporte'); }
  }

  /* --- Capturas de lista y ficha --- */
  if (esAdmin) {
    const e1 = c.entidades[1] || c.entidades[0];
    await ir(page, `#/e/${e1.id}`); await page.waitForSelector('table.tabla'); await captura(page, '03-lista');
    const prim = await page.evaluate((x) => Datos.listar(x)[0].id, e1.id);
    await ir(page, `#/e/${e1.id}/${prim}`); await page.waitForSelector('.pares'); await captura(page, '04-ficha');
  }

  /* --- Perfil --- */
  await paso('perfil: datos y permisos', async () => {
    await ir(page, '#/perfil');
    await page.waitForSelector('.pares');
    const t = await textoPagina(page);
    verifica(t.includes(u.nombre), 'muestra el nombre del usuario');
    verifica(/Lo que puedo hacer/.test(t), 'resume los permisos');
  });

  /* --- Administración --- */
  if (rutas.find((r) => r.tipo === 'usuarios').ok(rol)) { await pruebasUsuarios(page, ctx, id, c, u, seg); }
  if (rutas.find((r) => r.tipo === 'configuracion').ok(rol)) { await pruebasConfiguracion(page, c); }
  const hayBit = rutas.find((r) => r.tipo === 'bitacora').ok(rol);
  if (hayBit) { await pruebasBitacora(page, c, seg, esAdmin); }
  if (rutas.find((r) => r.tipo === 'respaldo').ok(rol)) { await pruebasRespaldo(page, id, c, seg, rol); }
  if (hayBit && esAdmin) { await pruebasManipulacion(page, id, c, seg); }
  if (esAdmin) { await pruebasEspecificas(page, id, c); }

  /* --- Cerrar sesión --- */
  await paso('salir: cierra la sesión y la guardia pide ingresar', async () => {
    await ir(page, '#/tablero');
    await page.getByRole('button', { name: /^Cerrar sesión de/ }).click();
    await page.waitForFunction(() => window.App.hashActual === '#/login', null, { timeout: 5000 });
    verifica(await page.locator('input[name="usuario"]').isVisible(), 'vuelve al ingreso');
    await ir(page, '#/tablero');
    await page.waitForFunction(() => window.App.hashActual === '#/login', null, { timeout: 5000 });
    verifica(true, 'sin sesión, #/tablero redirige al ingreso');
    verifica(await page.evaluate(() => !Seg.sesion), 'la sesión quedó vacía');
  });

  verifica(consola.length === 0, 'sin errores ni advertencias de consola ni excepciones', consola.slice(0, 3).join(' | '));
  await ctx.close();
  rolActual = '';
}

/* ---------- Bloques de pruebas ---------- */
async function pruebasUsuarios(page, ctx, id, c, u, seg) {
  await paso('usuarios: crear, entrar con él, editar, restablecer y eliminar', async () => {
    await ir(page, '#/usuarios');
    await page.waitForSelector('table.tabla');
    const rolNuevo = c.roles.find((r) => r.id !== 'admin').id;
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await page.locator('#nu-usuario').fill('pruebauser');
    await page.locator('#nu-nombre').fill('Persona de Prueba');
    await page.locator('#nu-rol').selectOption(rolNuevo);
    await page.locator('#nu-clave').fill('abc');
    await page.locator('.modal').getByRole('button', { name: 'Crear usuario' }).click();
    verifica((await page.locator('#nu-clave-error').innerText()).length > 0, 'clave débil: error en línea');
    await page.locator('#nu-clave').fill('Prueba#Clave2026');
    await page.locator('.modal').getByRole('button', { name: 'Crear usuario' }).click();
    await page.waitForSelector('.toast');
    verifica(/pruebauser/.test(await textoPagina(page)), 'el usuario aparece en la tabla');
    /* otra pestaña: ingresa con el usuario nuevo y cambia su clave */
    const p2 = await ctx.newPage();
    const consola2 = [];
    vigilar(p2, consola2);
    await p2.goto(URL_DE(id));
    await esperarRender(p2);
    await entrar(p2, c, 'pruebauser', 'Prueba#Clave2026');
    verifica(await p2.evaluate(() => Seg.usuarioActual().usuario === 'pruebauser'), 'el usuario nuevo ingresó y cambió su clave');
    verifica(consola2.length === 0, 'la segunda pestaña no produjo errores de consola', consola2.join(' | '));
    await p2.close();
    /* editar */
    await page.getByRole('button', { name: 'Editar pruebauser' }).click();
    await page.locator('#eu-nombre').fill('Persona Editada');
    await page.locator('.modal').getByRole('button', { name: 'Guardar cambios' }).click();
    await page.waitForSelector('.toast');
    verifica(/Persona Editada/.test(await textoPagina(page)), 'edición de usuario');
    /* no puede quitarse su propio rol ni eliminarse */
    const yo = await page.evaluate(() => Seg.usuarioActual().usuario);
    const r = await page.evaluate((n) => Seg.eliminarUsuario(n), yo);
    verifica(r.ok === false, 'un admin no puede eliminar su propia cuenta', JSON.stringify(r));
    /* restablecer */
    await page.getByRole('button', { name: 'Restablecer la clave de pruebauser' }).click();
    await page.locator('.modal-pie').getByRole('button', { name: 'Restablecer' }).click();
    await page.waitForSelector('.clave-temporal');
    verifica((await page.locator('.clave-temporal').innerText()).length === 12, 'clave temporal de 12 caracteres');
    await page.locator('.modal-pie').getByRole('button', { name: 'Listo' }).click();
    /* eliminar */
    await page.getByRole('button', { name: 'Eliminar a pruebauser' }).click();
    if (seg.confirmarEliminar) { await page.locator('.modal-pie').getByRole('button', { name: 'Eliminar' }).click(); }
    await page.waitForSelector('.toast');
    verifica(!(await page.evaluate(() => Seg.listarUsuarios().some((x) => x.usuario === 'pruebauser'))), 'usuario eliminado');
  });
}

async function pruebasConfiguracion(page, c) {
  await paso('configuración: parámetros del negocio y seguridad vigente', async () => {
    await ir(page, '#/configuracion');
    await page.waitForSelector('form.formulario, .pares');
    const t = await textoPagina(page);
    verifica(/Seguridad vigente/.test(t), 'muestra la seguridad vigente');
    if (c.parametros.length) {
      const p = c.parametros[0];
      await page.locator(`#cfg-${p.id}`).fill('-5');
      await page.getByRole('button', { name: 'Guardar parámetros' }).click();
      verifica((await page.locator(`#cfg-${p.id}-error`).innerText()).length > 0, 'parámetro inválido → error en línea');
      const nuevo = String(p.tipo === 'porcentaje' ? Math.min(99, p.valor + 1) : p.valor + 1);
      await page.locator(`#cfg-${p.id}`).fill(nuevo);
      await page.getByRole('button', { name: 'Guardar parámetros' }).click();
      await page.waitForSelector('.toast');
      verifica(await page.evaluate(([i, v]) => Almacen.estado.parametros[i] === Number(v), [p.id, nuevo]), `el parámetro ${p.id} se guardó`);
      await page.locator(`#cfg-${p.id}`).fill(String(p.valor));
      await page.getByRole('button', { name: 'Guardar parámetros' }).click();
    }
  });
}

async function pruebasBitacora(page, c, seg, esAdmin) {
  await paso('bitácora: entradas, filtros, detalle y verificación', async () => {
    await ir(page, '#/bitacora');
    await page.waitForSelector('table.tabla tbody tr');
    verifica((await page.locator('table.tabla tbody tr').count()) > 0, 'la bitácora tiene entradas');
    await page.locator('select[aria-label="Filtrar por acción"]').selectOption('ingreso');
    verifica((await page.locator('table.tabla tbody tr').count()) > 0, 'filtro por acción');
    await page.locator('select[aria-label="Filtrar por acción"]').selectOption('');
    await page.getByRole('button', { name: /^Ver la entrada/ }).first().click();
    verifica(/Entrada \d+ de la bitácora/.test(await page.locator('.modal-titulo').innerText()), 'detalle de una entrada');
    await page.keyboard.press('Escape');
    verifica((await page.locator('.modal').count()) === 0, 'Escape cierra el modal');
    await page.getByRole('button', { name: 'Verificar integridad' }).click();
    const t = await page.locator('.resultado-verif').innerText();
    if (seg.cadenaBitacora) { verifica(/Bitácora íntegra/.test(t), 'la cadena de hashes verifica', t); }
    else { verifica(/No verificable|no está encadenada/.test(t), 'sin cadenaBitacora: avisa que no puede verificar', t); }
    const d = await descargaDe(page, () => page.getByRole('button', { name: 'Exportar CSV' }).click());
    verifica(/Hash/.test(d.texto), 'CSV de bitácora con hashes');
    if (esAdmin) { await captura(page, '07-bitacora'); }
  });
}

async function pruebasRespaldo(page, id, c, seg, rol) {
  await paso('respaldo: exportar, restaurar, respaldo corrupto y checksum alterado', async () => {
    await ir(page, '#/respaldo');
    await page.waitForSelector('input[type="file"]');
    const primera = c.entidades[0];
    const antes = await page.evaluate((x) => Datos.contar(x), primera.id);
    const resp = await descargaDe(page, () => page.getByRole('button', { name: 'Descargar respaldo' }).click());
    const sobre = JSON.parse(resp.texto);
    verifica(sobre.formato === 'sistema-practica-respaldo' && /^[0-9a-f]{64}$/.test(sobre.checksum), 'el respaldo trae formato y checksum SHA-256');
    /* hacer un cambio */
    await page.evaluate(([x]) => { const r = Datos.listar(x)[0]; return Datos.crear(x, r); }, [primera.id]);
    await page.evaluate(([e]) => { Almacen.estado.entidades[e].push({ id: 'ZZZ-9999', nombre: 'Cambio posterior al respaldo' }); Almacen.guardar(); }, [primera.id]);
    verifica((await page.evaluate((x) => Datos.contar(x), primera.id)) > antes, 'hay un cambio posterior al respaldo');
    /* corrupto */
    await page.locator('input[type="file"]').setInputFiles({ name: 'malo.json', mimeType: 'application/json', buffer: Buffer.from('{esto no es json') });
    await page.getByText(/Archivo listo/).waitFor();
    await page.getByRole('button', { name: 'Restaurar desde el archivo' }).click();
    await page.locator('.modal-pie').getByRole('button', { name: 'Restaurar' }).click();
    await page.waitForSelector('.modal[role="alertdialog"]');
    verifica(/No se pudo restaurar/.test(await page.locator('.modal').innerText()) && /no es un respaldo válido|JSON/.test(await page.locator('.modal').innerText()), 'respaldo corrupto → mensaje claro');
    await page.locator('.modal-pie button').first().click();
    verifica((await textoPagina(page)).length > 100, 'la pantalla sigue viva tras un respaldo corrupto');
    /* checksum alterado */
    const alterado = JSON.parse(resp.texto);
    alterado.datos.entidades[primera.id][0].id = 'HACK-0001';
    await page.locator('input[type="file"]').setInputFiles({ name: 'alterado.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(alterado)) });
    await page.getByText(/Archivo listo: alterado/).waitFor();
    await page.getByRole('button', { name: 'Restaurar desde el archivo' }).click();
    await page.locator('.modal-pie').getByRole('button', { name: 'Restaurar' }).click();
    await page.waitForSelector('.modal[role="alertdialog"]');
    verifica(/checksum/i.test(await page.locator('.modal').innerText()), 'respaldo con checksum alterado → se rechaza');
    await page.locator('.modal-pie button').first().click();
    /* restauración buena */
    await page.locator('input[type="file"]').setInputFiles({ name: 'bueno.json', mimeType: 'application/json', buffer: Buffer.from(resp.texto) });
    await page.getByText(/Archivo listo: bueno/).waitFor();
    await page.getByRole('button', { name: 'Restaurar desde el archivo' }).click();
    await page.locator('.modal-pie').getByRole('button', { name: 'Restaurar' }).click();
    await page.waitForSelector('.toast');
    const despues = await page.evaluate((x) => Datos.contar(x), primera.id);
    verifica(despues === antes, 'la restauración devuelve los datos al momento del respaldo', `${antes} → ${despues}`);
    verifica(await page.evaluate(() => Almacen.estado.bitacora.some((e) => e.accion === 'restauración')), 'la restauración quedó en la bitácora');
    if (seg.cadenaBitacora) { verifica((await page.evaluate(() => Aud.verificar())).ok, 'la cadena de la bitácora sigue íntegra tras restaurar'); }
  });
}

async function pruebasManipulacion(page, id, c, seg) {
  await paso('bitácora: una alteración en el almacenamiento se detecta (y sin cadena, no)', async () => {
    await page.evaluate(([clave]) => {
      const s = JSON.parse(localStorage.getItem(clave));
      s.bitacora[Math.min(2, s.bitacora.length - 1)].detalle = 'TEXTO MANIPULADO A MANO';
      localStorage.setItem(clave, JSON.stringify(s));
    }, [`sis_${id}_v1`]);
    await page.reload();
    await esperarRender(page);
    verifica(await page.evaluate(() => !!Seg.sesion), 'la sesión sobrevive a recargar la página');
    await ir(page, '#/bitacora');
    await page.getByRole('button', { name: 'Verificar integridad' }).click();
    const t = await page.locator('.resultado-verif').innerText();
    if (seg.cadenaBitacora) { verifica(/Se detectó una alteración/.test(t) && /modificada/.test(t), 'verificar integridad detecta la entrada alterada', t); }
    else { verifica(/No verificable/.test(t), 'sin cadena: no puede detectar la alteración (hallazgo)', t); }
  });
}

/* ---------- Pruebas de negocio del sistema de referencia ---------- */
async function pruebasEspecificas(page, id, c) {
  if (id !== 'muebleria') { return; }
  await paso('muebleria: fórmulas del rubro (descuento, recargo, flete, IGV, comisión)', async () => {
    await ir(page, '#/tablero');
    const r = await page.evaluate(() => {
      const ctx = Calc.ctx();
      const op = Datos.operacion('ventas');
      const doc = { fecha: U.hoy(), cliente: 'CLI-0002', vendedor: 'VEN-0001', formaPago: 'Crédito 30 días', flete: 100, lineas: [{ item: 'PRD-0001', cantidad: 2, precio: 1290, descuentoPct: 10 }] };
      return Calc.totales(op, doc);
    });
    /* 2 × 1290 × 0,90 = 2322 · recargo 2 % × 1 mes = 46,44 · flete 100 · base 2468,44 · IGV 18 % = 444,32 · total 2912,76 · comisión 3,5 % de 2322 = 81,27 */
    verifica(r.subtotal === 2322 && r.recargo === 46.44 && r.flete === 100 && r.igv === 444.32 && r.total === 2912.76 && r.comision === 81.27, 'totales de la venta a crédito', JSON.stringify(r));
  });
  await paso('muebleria: stock, límite de crédito, regla de crédito y anulación', async () => {
    const r = await page.evaluate(() => {
      const out = {};
      const stock0 = Datos.obtener('productos', 'PRD-0003').stock;
      let x = Datos.opCrear('ventas', { fecha: U.hoy(), cliente: 'CLI-0001', vendedor: 'VEN-0002', formaPago: 'Crédito 30 días', flete: 0, lineas: [{ item: 'PRD-0003', cantidad: 1, precio: 390, descuentoPct: 0 }] });
      out.creditoSinLinea = x.ok === false ? x.general.join(' ') : 'SE PERMITIÓ';
      x = Datos.opCrear('ventas', { fecha: U.hoy(), cliente: 'CLI-0001', vendedor: 'VEN-0002', formaPago: 'Contado', flete: 0, lineas: [{ item: 'PRD-0003', cantidad: 999, precio: 390, descuentoPct: 0 }] });
      const idGrande = x.doc.id;
      const e = Datos.opEmitir('ventas', idGrande);
      out.sinStock = e.ok === false ? e.general.join(' ') : 'SE EMITIÓ';
      out.estadoTrasFallo = Datos.obtener('ventas', idGrande).estado;
      out.stockTrasFallo = Datos.obtener('productos', 'PRD-0003').stock;
      x = Datos.opCrear('ventas', { fecha: U.hoy(), cliente: 'CLI-0001', vendedor: 'VEN-0002', formaPago: 'Contado', flete: 0, lineas: [{ item: 'PRD-0003', cantidad: 2, precio: 390, descuentoPct: 5 }] });
      const e2 = Datos.opEmitir('ventas', x.doc.id);
      out.emitida = e2.ok; out.stockEmitida = Datos.obtener('productos', 'PRD-0003').stock;
      const a = Datos.opAnular('ventas', x.doc.id, 'Prueba de anulación');
      out.anulada = a.ok; out.stockAnulada = Datos.obtener('productos', 'PRD-0003').stock;
      out.stock0 = stock0;
      x = Datos.opCrear('ventas', { fecha: U.hoy(), cliente: 'CLI-0008', vendedor: 'VEN-0002', formaPago: 'Crédito 30 días', flete: 0, lineas: [{ item: 'PRD-0003', cantidad: 8, precio: 390, descuentoPct: 0 }] });
      const e3 = Datos.opEmitir('ventas', x.doc.id);
      out.limite = e3.ok === false ? e3.general.join(' ') : 'SE EMITIÓ';
      return out;
    });
    verifica(/línea de crédito/.test(r.creditoSinLinea), 'regla: crédito solo con línea de crédito', r.creditoSinLinea);
    verifica(/Stock insuficiente/.test(r.sinStock), 'no se emite sin stock', r.sinStock);
    verifica(r.estadoTrasFallo === 'Borrador' && r.stockTrasFallo === r.stock0, 'emisión fallida: todo o nada (nada cambió)', JSON.stringify(r));
    verifica(r.emitida === true && r.stockEmitida === r.stock0 - 2, 'emitir descuenta stock', JSON.stringify(r));
    verifica(r.anulada === true && r.stockAnulada === r.stock0, 'anular devuelve el stock', JSON.stringify(r));
    verifica(/límite de crédito/.test(r.limite), 'se bloquea la venta que supera el límite de crédito', r.limite);
  });
  await paso('muebleria: compra sube stock y recalcula el costo promedio ponderado', async () => {
    const r = await page.evaluate(() => {
      const p0 = Datos.obtener('productos', 'PRD-0016');
      const x = Datos.opCrear('compras', { fecha: U.hoy(), proveedor: 'PRV-0005', condicion: 'Contado', referencia: 'T-1', lineas: [{ item: 'PRD-0016', cantidad: 10, precio: 170 }] });
      const e = Datos.opEmitir('compras', x.doc.id);
      const p1 = Datos.obtener('productos', 'PRD-0016');
      const a = Datos.opAnular('compras', x.doc.id, 'Prueba de anulación compra');
      return { p0: [p0.stock, p0.costo], p1: [p1.stock, p1.costo], e: e.ok, a: a.ok, p2: Datos.obtener('productos', 'PRD-0016').stock, totales: x.doc.totales };
    });
    const esperado = Math.round(((r.p0[0] * r.p0[1] + 10 * 170) / (r.p0[0] + 10)) * 100) / 100;
    verifica(r.e && r.p1[0] === r.p0[0] + 10 && r.p1[1] === esperado, 'stock +10 y costo promedio ponderado', JSON.stringify(r));
    verifica(r.a && r.p2 === r.p0[0], 'anular la compra baja el stock', JSON.stringify(r));
    verifica(r.totales.igv === 306 && r.totales.total === 2006, 'IGV de la compra (0,18 escrito a mano en el config)', JSON.stringify(r.totales));
  });
  await paso('muebleria: el parámetro igv gobierna las ventas (pero no las compras)', async () => {
    const r = await page.evaluate(() => {
      const antes = Almacen.estado.parametros.igv;
      Almacen.estado.parametros.igv = 10;
      const v = Calc.totales(Datos.operacion('ventas'), { fecha: U.hoy(), cliente: 'CLI-0001', vendedor: 'VEN-0002', formaPago: 'Contado', flete: 0, lineas: [{ item: 'PRD-0003', cantidad: 1, precio: 100, descuentoPct: 0 }] });
      const k = Calc.totales(Datos.operacion('compras'), { lineas: [{ item: 'PRD-0003', cantidad: 1, precio: 100 }] });
      Almacen.estado.parametros.igv = antes;
      return { v: v.igv, k: k.igv };
    });
    verifica(r.v === 10 && r.k === 18, 'con igv=10 la venta calcula 10 y la compra sigue en 18 (constante fija)', JSON.stringify(r));
  });
  await paso('muebleria: el costo está oculto al vendedor y el reporte de stock no tiene roles', async () => {
    verifica(c.reportes.find((r) => r.id === 'stock').roles === undefined, 'el reporte «stock» no declara roles (hallazgo sembrado)');
  });
}

/* ======================================================================
   Pruebas de contexto especial
   ====================================================================== */
async function pruebaBloqueo(browser, id, c, seg) {
  rolActual = 'bloqueo';
  const u = c.usuarios.find((x) => x.rol === 'auditor') || c.usuarios[0];
  const consola = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  ctx.setDefaultTimeout(12000);
  const page = await ctx.newPage();
  vigilar(page, consola);
  await page.clock.install({ time: new Date('2026-06-15T10:00:00') });
  await page.goto(URL_DE(id));
  await esperarRender(page);
  const max = seg.intentosMax;
  if (max > 0) {
    await paso(`bloqueo: ${max} intentos fallidos bloquean la cuenta`, async () => {
      for (let i = 0; i < max; i++) {
        await page.locator('input[name="usuario"]').fill(u.usuario);
        await page.locator('input[name="clave"]').fill('Mala#clave' + i);
        await page.locator('form button[type="submit"]').click();
      }
      const t = await page.locator('.aviso-form').innerText();
      verifica(/bloqueada/i.test(t), 'mensaje de cuenta bloqueada', t);
      await page.locator('input[name="usuario"]').fill(u.usuario);
      await page.locator('input[name="clave"]').fill(u.clave);
      await page.locator('form button[type="submit"]').click();
      verifica(/bloqueada/i.test(await page.locator('.aviso-form').innerText()), 'aun con la clave correcta sigue bloqueada');
      verifica(await page.evaluate(() => !Seg.sesion), 'no hay sesión');
      verifica(await page.evaluate(() => Almacen.estado.bitacora.some((e) => e.accion === 'bloqueo')), 'el bloqueo quedó en la bitácora');
    });
    await paso('bloqueo: se libera pasado el tiempo configurado', async () => {
      await page.clock.fastForward(`${seg.bloqueoMin || 5}:05`.replace(/^(\d+):/, (m, a) => String(a).padStart(2, '0') + ':'));
      await page.locator('input[name="usuario"]').fill(u.usuario);
      await page.locator('input[name="clave"]').fill(u.clave);
      await page.locator('form button[type="submit"]').click();
      await page.waitForFunction(() => window.Seg && window.Seg.sesion, null, { timeout: 5000 });
      verifica(true, 'tras el bloqueo la cuenta vuelve a entrar');
    });
  } else {
    await paso('bloqueo: intentosMax=0 → nunca se bloquea (modo débil)', async () => {
      for (let i = 0; i < 12; i++) {
        await page.locator('input[name="usuario"]').fill(u.usuario);
        await page.locator('input[name="clave"]').fill('Mala#clave' + i);
        await page.locator('form button[type="submit"]').click();
      }
      verifica(!/bloqueada/i.test(await page.locator('.aviso-form').innerText()), '12 intentos fallidos y no hay bloqueo');
      await page.locator('input[name="usuario"]').fill(u.usuario);
      await page.locator('input[name="clave"]').fill(u.clave);
      await page.locator('form button[type="submit"]').click();
      await page.waitForFunction(() => window.Seg && window.Seg.sesion, null, { timeout: 5000 });
      verifica(true, 'la clave correcta entra tras 12 fallos (fuerza bruta posible)');
    });
  }
  verifica(consola.length === 0, 'bloqueo: sin errores de consola', consola.join(' | '));
  await ctx.close();
  rolActual = '';
}

async function pruebaExpiracion(browser, id, c, seg) {
  rolActual = 'expiración';
  const u = c.usuarios.find((x) => x.rol === 'auditor') || c.usuarios[0];
  const consola = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  ctx.setDefaultTimeout(12000);
  const page = await ctx.newPage();
  vigilar(page, consola);
  await page.clock.install({ time: new Date('2026-06-15T10:00:00') });
  await page.goto(URL_DE(id));
  await esperarRender(page);
  await entrar(page, c, u.usuario, u.clave);
  const min = seg.sesionMin;
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  if (min > 0) {
    await paso(`expiración: a los ${min} min sin actividad aparece el aviso y se puede seguir conectado`, async () => {
      await page.clock.fastForward(mmss(min * 60 - 30));
      await page.waitForSelector('.modal[role="alertdialog"]', { timeout: 4000 });
      verifica(/expirar/.test(await page.locator('.modal-titulo').innerText()), 'aviso «tu sesión está por expirar»');
      verifica(/\d+ segundos/.test(await page.locator('.modal-texto').innerText()), 'el aviso cuenta los segundos');
      await page.getByRole('button', { name: 'Seguir conectado' }).click();
      verifica((await page.locator('.modal').count()) === 0, 'el aviso se cierra al confirmar');
      verifica(await page.evaluate(() => !!Seg.sesion), 'la sesión sigue activa');
    });
    await paso('expiración: sin actividad la sesión se cierra y vuelve al ingreso', async () => {
      await page.clock.fastForward(mmss(min * 60 + 10));
      await page.waitForFunction(() => window.App.hashActual === '#/login', null, { timeout: 5000 });
      verifica(/expiró por inactividad/.test(await textoPagina(page)), 'mensaje de sesión expirada');
      verifica(await page.evaluate(() => !Seg.sesion), 'no queda sesión');
      verifica(await page.evaluate(() => Almacen.estado.bitacora.some((e) => e.accion === 'expiración')), 'la expiración quedó en la bitácora');
      await ir(page, '#/tablero');
      await page.waitForFunction(() => window.App.hashActual === '#/login', null, { timeout: 3000 });
      verifica(true, 'la guardia no deja volver sin ingresar');
    });
  } else {
    await paso('expiración: sesionMin=0 → la sesión nunca expira (modo débil)', async () => {
      await page.clock.fastForward('23:59:00');
      await page.waitForTimeout(100);
      verifica(await page.evaluate(() => !!Seg.sesion), 'tras 24 h sin actividad la sesión sigue abierta');
    });
  }
  verifica(consola.length === 0, 'expiración: sin errores de consola', consola.join(' | '));
  await ctx.close();
  rolActual = '';
}

async function pruebaAlmacenamientoBloqueado(browser, id, c) {
  rolActual = 'storage';
  const u = c.usuarios.find((x) => x.rol === 'auditor') || c.usuarios[0];
  const consola = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  ctx.setDefaultTimeout(12000);
  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Acceso denegado', 'SecurityError'); } });
  });
  const page = await ctx.newPage();
  vigilar(page, consola);
  await page.goto(URL_DE(id));
  await esperarRender(page);
  await paso('localStorage bloqueado: el sistema funciona y avisa', async () => {
    verifica(/bloquea el almacenamiento local/.test(await textoPagina(page)), 'aviso de almacenamiento bloqueado');
    await entrar(page, c, u.usuario, u.clave);
    verifica(await page.evaluate(() => Almacen.modo === 'window.name'), 'cae a window.name', await page.evaluate(() => Almacen.modo));
    await ir(page, `#/e/${c.entidades[0].id}`);
    await page.waitForSelector('table.tabla tbody tr');
    verifica(true, 'las listas se ven con almacenamiento alternativo');
    await page.reload();
    await esperarRender(page);
    verifica(await page.evaluate(() => Almacen.estado.usuarios.length > 0 && Almacen.modo === 'window.name'), 'los datos sobreviven a recargar (window.name)');
  });
  verifica(consola.length === 0, 'localStorage bloqueado: sin errores de consola', consola.join(' | '));
  await ctx.close();

  /* sin ningún almacenamiento: solo memoria */
  const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  ctx2.setDefaultTimeout(12000);
  await ctx2.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Acceso denegado', 'SecurityError'); } });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('Acceso denegado', 'SecurityError'); } });
    let nombre = '';
    Object.defineProperty(window, 'name', { configurable: true, get() { return nombre; }, set() { throw new DOMException('Acceso denegado', 'SecurityError'); } });
  });
  const p2 = await ctx2.newPage();
  const consola2 = [];
  vigilar(p2, consola2);
  await p2.goto(URL_DE(id));
  await esperarRender(p2);
  await paso('sin almacenamiento alguno: cae a memoria con aviso', async () => {
    await entrar(p2, c, u.usuario, u.clave);
    verifica(await p2.evaluate(() => Almacen.modo === 'memoria'), 'modo memoria', await p2.evaluate(() => Almacen.modo));
    verifica(/se perder/.test(await textoPagina(p2)), 'avisa que los datos se perderán');
  });
  verifica(consola2.length === 0, 'sin almacenamiento: sin errores de consola', consola2.join(' | '));
  await ctx2.close();
  rolActual = '';
}

async function pruebaDatosDanados(browser, id, c) {
  rolActual = 'dañado';
  const consola = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  ctx.setDefaultTimeout(12000);
  await ctx.addInitScript((clave) => { if (!sessionStorage.getItem('__sembrado')) { localStorage.setItem(clave, '{"esquema":1,"usuarios":"roto"'); sessionStorage.setItem('__sembrado', '1'); } }, `sis_${id}_v1`);
  const page = await ctx.newPage();
  vigilar(page, consola);
  await page.goto(URL_DE(id));
  await esperarRender(page);
  await paso('datos guardados dañados: se avisa y se carga la demostración', async () => {
    verifica(/estaban dañados/.test(await textoPagina(page)), 'mensaje de datos dañados en el ingreso');
    const u = c.usuarios[0];
    await entrar(page, c, u.usuario, u.clave);
    verifica(await page.evaluate(() => Datos.contar(SISTEMA.entidades[0].id) > 0), 'el sistema carga los datos de demostración');
    verifica(await page.evaluate((k) => localStorage.getItem(k + '_danado') !== null, `sis_${id}_v1`), 'se conservó una copia del texto dañado');
  });
  verifica(consola.length === 0, 'datos dañados: sin errores de consola', consola.join(' | '));
  await ctx.close();
  rolActual = '';
}

async function pruebaResponsive(browser, id, c) {
  rolActual = 'responsive';
  const u = c.usuarios.find((x) => x.rol === 'admin') || c.usuarios[0];
  const consola = [];
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  ctx.setDefaultTimeout(12000);
  const page = await ctx.newPage();
  vigilar(page, consola);
  await page.goto(URL_DE(id));
  await esperarRender(page);
  await entrar(page, c, u.usuario, u.clave);
  await paso('responsive 360 px: sin desborde horizontal y menú plegable', async () => {
    const rutas = ['#/tablero', `#/e/${c.entidades[0].id}`, `#/o/${c.operaciones[0].id}/nuevo`, `#/r/${c.reportes[0].id}`, '#/bitacora'];
    for (const h of rutas) {
      await ir(page, h);
      await page.waitForSelector('h1.pagina-titulo');
      await page.waitForTimeout(60);
      const ancho = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      verifica(ancho.sw <= ancho.cw + 1, `${h} no desborda a 360 px`, `scrollWidth ${ancho.sw} > ${ancho.cw}`);
    }
    verifica(!(await page.locator('#menu').isVisible()), 'el menú está plegado');
    await page.getByRole('button', { name: 'Menú' }).click();
    verifica(await page.locator('#menu').isVisible(), 'el botón Menú lo despliega');
  });
  verifica(consola.length === 0, 'responsive: sin errores de consola', consola.join(' | '));
  await ctx.close();
  rolActual = '';
}

async function pruebaTeclado(browser, id, c) {
  rolActual = 'teclado';
  const u = c.usuarios.find((x) => x.rol === 'admin') || c.usuarios[0];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  ctx.setDefaultTimeout(12000);
  const page = await ctx.newPage();
  await page.goto(URL_DE(id));
  await esperarRender(page);
  await entrar(page, c, u.usuario, u.clave);
  await paso('teclado: foco visible y modal con foco atrapado', async () => {
    await ir(page, `#/e/${c.entidades[0].id}`);
    await page.waitForSelector('table.tabla');
    await page.keyboard.press('Tab');
    const foco = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { tag: a.tagName, outline: s.outlineStyle + ' ' + s.outlineWidth }; });
    verifica(foco.tag !== 'BODY' && !/none/.test(foco.outline), 'el elemento enfocado muestra contorno', JSON.stringify(foco));
    await ir(page, '#/usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); }
    verifica(await page.evaluate(() => !!document.activeElement.closest('.modal')), 'el foco no sale del modal tras 12 Tab');
    await page.keyboard.press('Escape');
    verifica((await page.locator('.modal').count()) === 0, 'Escape cierra el modal');
  });
  await ctx.close();
  rolActual = '';
}

/* Si una prueba se cuelga (equipo saturado), se da por fallida en vez de bloquear toda la corrida. */
function conLimite(promesa, ms, nombre) {
  let temporizador;
  const limite = new Promise((_, rechazo) => { temporizador = setTimeout(() => rechazo(new Error(`«${nombre}» superó ${ms / 1000} s`)), ms); });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
}

/* ======================================================================
   Principal
   ====================================================================== */
const exe = buscarChrome();
if (!exe) { console.error('No encuentro Chrome. Usa --chrome <ruta>.'); process.exit(2); }
const dist = path.join(RAIZ, 'dist');
if (!fs.existsSync(dist)) { console.error('No existe dist/: ejecuta antes node construir.mjs'); process.exit(2); }
const ids = fs.readdirSync(dist, { withFileTypes: true }).filter((d) => d.isDirectory() && (!SOLO || d.name === SOLO)).map((d) => d.name).sort();
if (!ids.length) { console.error('No hay sistemas en dist/'); process.exit(2); }

const browser = await chromium.launch({ executablePath: exe, headless: !CON_VENTANA, args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
const t0 = Date.now();
for (const id of ids) {
  sistemaActual = id;
  console.log(`\n■ ${id}`);
  const c = cargarConfig(id);
  const seg = Object.assign({ intentosMax: 5, bloqueoMin: 5, sesionMin: 15 }, c.seguridad || {});
  for (const u of c.usuarios.filter((x) => !SOLO_ROL || x.rol === SOLO_ROL)) {
    console.log(`  · ${u.usuario} (${u.rol})`);
    try { await conLimite(pruebasDeRol(browser, id, c, u), 150000, `prueba de ${u.rol}`); } catch (e) { falla(`prueba de ${u.rol} abortada`, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e)); }
  }
  if (SOLO_ROL) { continue; }
  for (const [nombre, fn] of [['bloqueo', pruebaBloqueo], ['expiración', pruebaExpiracion], ['almacenamiento', pruebaAlmacenamientoBloqueado], ['datos dañados', pruebaDatosDanados], ['responsive', pruebaResponsive], ['teclado', pruebaTeclado]]) {
    console.log(`  · ${nombre}`);
    try { await conLimite(fn(browser, id, c, seg), 90000, nombre); } catch (e) { falla(`prueba de ${nombre} abortada`, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e)); }
  }
}
await browser.close();
console.log(`\n${fallosTotales ? '✗' : '✓'} humo.mjs: ${pasosTotales - fallosTotales}/${pasosTotales} comprobaciones correctas en ${((Date.now() - t0) / 1000).toFixed(1)} s · ${fallosTotales} fallo(s)`);
if (fallosTotales) { console.error('\nFallos:\n' + fallos.map((f) => '  - ' + f).join('\n')); process.exit(1); }
