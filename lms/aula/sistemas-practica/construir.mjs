#!/usr/bin/env node
/*
 * construir.mjs · Constructor de los sistemas de práctica (Node, sin dependencias)
 * ----------------------------------------------------------------------------
 * Uso:
 *   node construir.mjs                    construye todos los sistemas de sistemas/*
 *   node construir.mjs --solo muebleria   construye uno solo
 *   node construir.mjs --clave ../clave   además escribe, FUERA del repositorio, un Markdown
 *                                         por sistema con los hallazgos de auditoría
 *                                         derivados del config (nunca guardes esa carpeta en git)
 *
 * Por cada sistema:
 *   1. Carga sistemas/<id>/config.js en un contexto aislado (vm) y lo VALIDA contra el contrato.
 *      Si hay errores, los imprime con archivo y campo y sale con código 1 sin construir nada.
 *   2. Arma dist/<id>/ (index.html, LEEME.txt, css/app.css, js/00…80 y js/config.js).
 *   3. Crea dist/<id>.zip con un escritor ZIP propio (reproducible: fechas fijas, orden fijo).
 *   4. Actualiza dist/indice.json y copia el zip a
 *      lms/content/courses/deepseek-harness/materials/sistemas/.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const DIR_SISTEMAS = path.join(RAIZ, 'sistemas');
const DIR_NUCLEO = path.join(RAIZ, 'nucleo');
const DIR_DIST = path.join(RAIZ, 'dist');
const DIR_MATERIALES = path.resolve(RAIZ, '../../content/courses/deepseek-harness/materials/sistemas');

/* ---------- Constantes del contrato ---------- */

const DEFECTOS_SEGURIDAD = {
  minClave: 10, intentosMax: 5, bloqueoMin: 5, sesionMin: 15, cadenaBitacora: true, confirmarEliminar: true,
  exigirCambioClave: true, ayudaLogin: false, exportaRespetaPermisos: true, cspMeta: true
};
const TIPOS_CAMPO = ['texto', 'textarea', 'numero', 'entero', 'moneda', 'porcentaje', 'fecha', 'lista', 'ref', 'booleano', 'email', 'telefono'];
const TIPOS_PARAM_NEGOCIO = ['porcentaje', 'numero', 'moneda', 'entero', 'texto'];
const TIPOS_PARAM_REPORTE = ['fecha', 'lista', 'numero', 'entero', 'texto', 'ref', 'porcentaje', 'moneda'];
const TIPOS_INDICADOR = ['moneda', 'numero', 'entero', 'porcentaje', 'texto'];
const TIPOS_GRAFICO = ['barras', 'columnas', 'linea'];
const ACCIONES_ENTIDAD = ['ver', 'crear', 'editar', 'eliminar'];
const ACCIONES_OP = ['ver', 'crear', 'editar', 'emitir', 'anular'];
const ORDEN_SCRIPTS = ['config.js', '00-util.js', '10-sha256.js', '20-almacen.js', '30-seguridad.js', '35-auditoria.js', '40-datos.js', '45-calculos.js', '50-ui.js', '60-vistas.js', '70-reportes.js', '80-app.js'];
/* style-src admite solo la hoja <style> VACÍA (hash SHA-256 de ""), donde el tema inserta reglas con insertRule: ni atributos style ni estilos en línea. */
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
const ID_SIMPLE = /^[a-z][a-zA-Z0-9]*$/;

/* ---------- Argumentos ---------- */

function leerArgs(argv) {
  const a = { solo: null, clave: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--solo') { a.solo = argv[++i]; }
    else if (argv[i] === '--clave') { a.clave = argv[++i]; }
    else if (argv[i] === '--ayuda' || argv[i] === '-h') { a.ayuda = true; }
    else { console.error(`Opción desconocida: ${argv[i]}`); process.exit(2); }
  }
  return a;
}

/* ---------- Carga del config ---------- */

function cargarConfig(archivo) {
  const codigo = fs.readFileSync(archivo, 'utf8');
  const caja = { window: {}, console };
  vm.createContext(caja);
  vm.runInContext(codigo, caja, { filename: archivo, timeout: 5000 });
  return caja.window.SISTEMA;
}

/* ---------- Validación ---------- */

class Informe {
  constructor(archivo) { this.archivo = archivo; this.errores = []; this.avisos = []; }
  error(campo, msg) { this.errores.push(`${this.archivo} › ${campo}: ${msg}`); }
  aviso(campo, msg) { this.avisos.push(`${this.archivo} › ${campo}: ${msg}`); }
  exige(cond, campo, msg) { if (!cond) { this.error(campo, msg); } return !!cond; }
}

const esTexto = (v) => typeof v === 'string' && v.trim() !== '';
const esNum = (v) => typeof v === 'number' && Number.isFinite(v);
const esFn = (v) => typeof v === 'function';
const esFechaSemilla = (v) => v === 'hoy' || /^@-?\d+$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v);

function validarRoles(inf, lista, ruta, roles) {
  if (!inf.exige(Array.isArray(lista), ruta, 'debe ser un arreglo de ids de rol')) { return; }
  lista.forEach((r, i) => inf.exige(roles.has(r), `${ruta}[${i}]`, `el rol «${r}» no existe en roles`));
}

function validarCampos(inf, campos, ruta, ctx, esLinea = false) {
  if (!inf.exige(Array.isArray(campos) && campos.length > 0, ruta, 'debe tener al menos un campo')) { return new Map(); }
  const ids = new Map();
  campos.forEach((c, i) => {
    const r = `${ruta}[${i}]`;
    if (!inf.exige(c && typeof c === 'object', r, 'debe ser un objeto')) { return; }
    inf.exige(ID_SIMPLE.test(c.id || ''), `${r}.id`, `«${c.id}» no es válido: usa letras y números sin tildes ni espacios, empezando por minúscula`);
    inf.exige(!ids.has(c.id), `${r}.id`, `«${c.id}» está repetido en esta lista de campos`);
    ids.set(c.id, c);
    inf.exige(esTexto(c.etiqueta), `${r}.etiqueta`, 'falta la etiqueta (con tildes, visible para la persona usuaria)');
    inf.exige(TIPOS_CAMPO.includes(c.tipo), `${r}.tipo`, `«${c.tipo}» no es un tipo válido (${TIPOS_CAMPO.join(', ')})`);
    if (c.tipo === 'lista') {
      inf.exige(Array.isArray(c.opciones) && c.opciones.length > 0 && c.opciones.every(esTexto), `${r}.opciones`, 'una lista necesita opciones (arreglo de textos)');
    }
    if (c.tipo === 'ref') { ctx.refs.push({ ruta: r, entidad: c.entidad, mostrar: c.mostrar }); }
    if (c.patron !== undefined) {
      try { new RegExp(c.patron); } catch { inf.error(`${r}.patron`, 'no es una expresión regular válida'); }
    }
    if (c.unico && !['texto', 'email', 'telefono', 'lista'].includes(c.tipo)) { inf.error(`${r}.unico`, 'solo se puede pedir único en campos de texto'); }
    if (c.min !== undefined && c.tipo !== 'fecha') { inf.exige(esNum(c.min), `${r}.min`, 'debe ser un número'); }
    if (c.max !== undefined && c.tipo !== 'fecha') { inf.exige(esNum(c.max), `${r}.max`, 'debe ser un número'); }
    if (c.ver !== undefined) { ctx.pendientesRoles.push({ ruta: `${r}.ver`, lista: c.ver }); }
    if (c.requerido && c.defecto === undefined && c.tipo === 'booleano') { inf.aviso(`${r}.requerido`, 'un booleano nunca está vacío; «requerido» no hace nada'); }
  });
  return ids;
}

function validarPermisos(inf, permisos, ruta, acciones, roles, requeridas) {
  if (!inf.exige(permisos && typeof permisos === 'object', ruta, 'faltan los permisos')) { return; }
  requeridas.forEach((a) => inf.exige(Array.isArray(permisos[a]), `${ruta}.${a}`, 'falta la lista de roles'));
  Object.keys(permisos).forEach((a) => {
    inf.exige(acciones.includes(a), `${ruta}.${a}`, `acción desconocida (válidas: ${acciones.join(', ')})`);
    validarRoles(inf, permisos[a], `${ruta}.${a}`, roles);
  });
}

function validarSemillaCampo(inf, ruta, campo, valor, semillasPorEntidad) {
  if (valor === undefined || valor === null || valor === '') { return; }
  const t = campo.tipo;
  if (['texto', 'textarea', 'email', 'telefono'].includes(t)) {
    if (!inf.exige(typeof valor === 'string', ruta, 'debe ser un texto')) { return; }
    if (campo.max && valor.length > campo.max) { inf.error(ruta, `supera el máximo de ${campo.max} caracteres`); }
    if (campo.patron && !new RegExp(campo.patron).test(valor)) { inf.error(ruta, `«${valor}» no cumple el patrón ${campo.patron}`); }
    if (t === 'email' && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(valor)) { inf.error(ruta, `«${valor}» no es un correo válido`); }
    if (t === 'telefono' && !/^[0-9+()\- ]{6,20}$/.test(valor)) { inf.error(ruta, `«${valor}» no es un teléfono válido`); }
  } else if (['numero', 'entero', 'moneda', 'porcentaje'].includes(t)) {
    if (!inf.exige(esNum(valor), ruta, 'debe ser un número')) { return; }
    if (t === 'entero' && !Number.isInteger(valor)) { inf.error(ruta, 'debe ser entero'); }
    if (t === 'moneda' && Math.abs(Math.round(valor * 100) / 100 - valor) > 1e-9) { inf.error(ruta, 'la moneda admite solo 2 decimales'); }
    if (campo.min !== undefined && valor < campo.min) { inf.error(ruta, `${valor} es menor que el mínimo ${campo.min}`); }
    if (campo.max !== undefined && valor > campo.max) { inf.error(ruta, `${valor} es mayor que el máximo ${campo.max}`); }
    if (t === 'porcentaje' && (valor < 0 || valor > 100)) { inf.error(ruta, 'un porcentaje va de 0 a 100'); }
  } else if (t === 'fecha') {
    if (!inf.exige(typeof valor === 'string' && esFechaSemilla(valor), ruta, `«${valor}» no es una fecha (usa AAAA-MM-DD, 'hoy' o '@-45')`)) { return; }
  } else if (t === 'lista') {
    inf.exige(campo.opciones.includes(valor), ruta, `«${valor}» no está entre las opciones ${JSON.stringify(campo.opciones)}`);
  } else if (t === 'ref') {
    const ids = semillasPorEntidad[campo.entidad];
    if (ids) { inf.exige(ids.has(valor), ruta, `«${valor}» no existe en las semillas de ${campo.entidad}`); }
  } else if (t === 'booleano') {
    inf.exige(typeof valor === 'boolean', ruta, 'debe ser true o false');
  }
}

function validarConfig(c, carpeta, archivo) {
  const inf = new Informe(archivo);
  if (!inf.exige(c && typeof c === 'object', 'window.SISTEMA', 'el archivo no define window.SISTEMA')) { return inf; }
  const ctx = { refs: [], pendientesRoles: [] };

  /* Identidad */
  inf.exige(c.id === carpeta, 'id', `debe ser igual al nombre de la carpeta («${carpeta}»), pero es «${c.id}»`);
  inf.exige(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(c.id || ''), 'id', 'usa minúsculas, números y guiones medios (sin guion al inicio ni al final)');
  ['nombre', 'rubro', 'moneda'].forEach((k) => inf.exige(esTexto(c[k]), k, 'es obligatorio'));
  inf.exige(/^\d+\.\d+\.\d+$/.test(c.version || ''), 'version', 'debe tener forma 1.0.0');
  if (c.tema !== undefined) {
    inf.exige(c.tema && typeof c.tema === 'object', 'tema', 'debe ser un objeto {primario, acento, siglas}');
    if (c.tema) {
      inf.exige(/^#[0-9a-fA-F]{6}$/.test(c.tema.primario || ''), 'tema.primario', 'debe ser un color #rrggbb');
      if (c.tema.acento !== undefined) { inf.exige(/^#[0-9a-fA-F]{6}$/.test(c.tema.acento), 'tema.acento', 'debe ser un color #rrggbb'); }
      if (c.tema.siglas !== undefined) { inf.exige(typeof c.tema.siglas === 'string' && c.tema.siglas.length >= 1 && c.tema.siglas.length <= 2, 'tema.siglas', 'deben ser 1 o 2 letras'); }
    }
  } else { inf.aviso('tema', 'sin tema: se verá con los colores por defecto'); }

  /* Parámetros */
  const paramIds = new Set();
  inf.exige(Array.isArray(c.parametros), 'parametros', 'debe ser un arreglo (puede estar vacío)');
  (c.parametros || []).forEach((p, i) => {
    const r = `parametros[${i}]`;
    inf.exige(ID_SIMPLE.test(p.id || ''), `${r}.id`, 'id no válido');
    inf.exige(!paramIds.has(p.id), `${r}.id`, `«${p.id}» repetido`);
    paramIds.add(p.id);
    inf.exige(esTexto(p.etiqueta), `${r}.etiqueta`, 'falta');
    inf.exige(TIPOS_PARAM_NEGOCIO.includes(p.tipo), `${r}.tipo`, `debe ser uno de ${TIPOS_PARAM_NEGOCIO.join(', ')}`);
    inf.exige(p.tipo === 'texto' ? typeof p.valor === 'string' : esNum(p.valor), `${r}.valor`, 'valor inicial inválido para su tipo');
  });

  /* Seguridad */
  if (c.seguridad !== undefined) {
    Object.keys(c.seguridad).forEach((k) => {
      if (!inf.exige(k in DEFECTOS_SEGURIDAD, `seguridad.${k}`, `clave desconocida (válidas: ${Object.keys(DEFECTOS_SEGURIDAD).join(', ')})`)) { return; }
      inf.exige(typeof c.seguridad[k] === typeof DEFECTOS_SEGURIDAD[k], `seguridad.${k}`, `debe ser ${typeof DEFECTOS_SEGURIDAD[k] === 'boolean' ? 'true o false' : 'un número'}`);
    });
  }

  /* Roles y usuarios */
  const roles = new Set();
  inf.exige(Array.isArray(c.roles) && c.roles.length >= 4, 'roles', 'se necesitan al menos 4 roles (admin, jefe, operador y auditor)');
  (c.roles || []).forEach((r, i) => {
    inf.exige(ID_SIMPLE.test(r.id || ''), `roles[${i}].id`, 'id no válido');
    inf.exige(!roles.has(r.id), `roles[${i}].id`, `«${r.id}» repetido`);
    roles.add(r.id);
    inf.exige(esTexto(r.nombre), `roles[${i}].nombre`, 'falta el nombre');
    inf.exige(esTexto(r.descripcion), `roles[${i}].descripcion`, 'falta la descripción');
  });
  inf.exige(roles.has('admin'), 'roles', 'debe existir el rol «admin»');
  inf.exige(roles.has('auditor'), 'roles', 'debe existir el rol «auditor»');
  const nombresUsuario = new Set();
  const rolesConUsuario = new Set();
  inf.exige(Array.isArray(c.usuarios) && c.usuarios.length > 0, 'usuarios', 'faltan los usuarios de demostración');
  (c.usuarios || []).forEach((u, i) => {
    const r = `usuarios[${i}]`;
    inf.exige(/^[a-z0-9._-]{3,30}$/.test(u.usuario || ''), `${r}.usuario`, 'de 3 a 30 caracteres: minúsculas, números, punto, guion');
    inf.exige(!nombresUsuario.has(u.usuario), `${r}.usuario`, `«${u.usuario}» repetido`);
    nombresUsuario.add(u.usuario);
    inf.exige(esTexto(u.nombre), `${r}.nombre`, 'falta el nombre completo');
    inf.exige(roles.has(u.rol), `${r}.rol`, `el rol «${u.rol}» no existe`);
    rolesConUsuario.add(u.rol);
    const k = u.clave || '';
    inf.exige(k.length >= 10 && /[a-z]/.test(k) && /[A-Z]/.test(k) && /[0-9]/.test(k) && /[^A-Za-z0-9]/.test(k), `${r}.clave`, 'la clave de demostración debe cumplir la política segura (10+ caracteres, mayúscula, minúscula, número y símbolo)');
  });
  roles.forEach((r) => inf.exige(rolesConUsuario.has(r), 'usuarios', `falta un usuario de demostración con el rol «${r}»`));

  /* Entidades */
  const ents = new Map();
  const prefijos = new Map();
  const defsCampos = new Map();
  inf.exige(Array.isArray(c.entidades) && c.entidades.length >= 3 && c.entidades.length <= 5, 'entidades', 'se necesitan de 3 a 5 entidades');
  (c.entidades || []).forEach((e, i) => {
    const r = `entidades[${i}]`;
    inf.exige(ID_SIMPLE.test(e.id || ''), `${r}.id`, 'id no válido');
    inf.exige(!ents.has(e.id), `${r}.id`, `«${e.id}» repetido`);
    ents.set(e.id, e);
    ['nombre', 'plural'].forEach((k) => inf.exige(esTexto(e[k]), `${r}.${k}`, 'es obligatorio'));
    inf.exige(/^[A-Z]{2,4}$/.test(e.prefijo || ''), `${r}.prefijo`, 'de 2 a 4 letras mayúsculas');
    inf.exige(!prefijos.has(e.prefijo), `${r}.prefijo`, `«${e.prefijo}» ya lo usa ${prefijos.get(e.prefijo)}`);
    prefijos.set(e.prefijo, r);
    const campos = validarCampos(inf, e.campos, `${r}.campos`, ctx);
    defsCampos.set(e.id, campos);
    const calcIds = new Set();
    (e.calculados || []).forEach((k, j) => {
      const rr = `${r}.calculados[${j}]`;
      inf.exige(ID_SIMPLE.test(k.id || ''), `${rr}.id`, 'id no válido');
      inf.exige(!campos.has(k.id) && !calcIds.has(k.id), `${rr}.id`, `«${k.id}» choca con otro campo o calculado`);
      calcIds.add(k.id);
      inf.exige(esTexto(k.etiqueta), `${rr}.etiqueta`, 'falta');
      inf.exige(esFn(k.formula), `${rr}.formula`, 'debe ser una función (r, ctx)');
      inf.exige(['moneda', 'numero', 'entero', 'porcentaje', 'texto', 'fecha'].includes(k.tipo), `${rr}.tipo`, 'tipo no válido');
      if (k.ver !== undefined) { ctx.pendientesRoles.push({ ruta: `${rr}.ver`, lista: k.ver }); }
    });
    inf.exige(Array.isArray(e.lista) && e.lista.length > 0, `${r}.lista`, 'faltan las columnas de la tabla');
    (e.lista || []).forEach((id, j) => inf.exige(id === 'id' || campos.has(id) || calcIds.has(id), `${r}.lista[${j}]`, `«${id}» no es un campo ni un calculado de ${e.id}`));
    inf.exige(Array.isArray(e.buscar) && e.buscar.length > 0, `${r}.buscar`, 'faltan los campos de búsqueda');
    (e.buscar || []).forEach((id, j) => inf.exige(campos.has(id), `${r}.buscar[${j}]`, `«${id}» no es un campo de ${e.id}`));
    (e.reglas || []).forEach((k, j) => {
      inf.exige(esTexto(k.id) && esTexto(k.mensaje) && esFn(k.validar), `${r}.reglas[${j}]`, 'una regla necesita id, mensaje y validar(r, ctx)');
    });
    validarPermisos(inf, e.permisos, `${r}.permisos`, ACCIONES_ENTIDAD, roles, ['ver']);
  });

  /* Operaciones */
  const ops = new Map();
  inf.exige(Array.isArray(c.operaciones) && c.operaciones.length >= 1 && c.operaciones.length <= 2, 'operaciones', 'se necesitan 1 o 2 operaciones');
  (c.operaciones || []).forEach((o, i) => {
    const r = `operaciones[${i}]`;
    inf.exige(ID_SIMPLE.test(o.id || ''), `${r}.id`, 'id no válido');
    inf.exige(!ops.has(o.id) && !ents.has(o.id), `${r}.id`, `«${o.id}» repetido (las entidades y operaciones comparten el espacio de ids)`);
    ops.set(o.id, o);
    ['nombre', 'plural'].forEach((k) => inf.exige(esTexto(k && o[k]), `${r}.${k}`, 'es obligatorio'));
    inf.exige(/^[A-Z]{2,4}$/.test(o.prefijo || ''), `${r}.prefijo`, 'de 2 a 4 letras mayúsculas');
    inf.exige(!prefijos.has(o.prefijo), `${r}.prefijo`, `«${o.prefijo}» ya lo usa ${prefijos.get(o.prefijo)}`);
    prefijos.set(o.prefijo, r);
    if (o.serie !== undefined) { inf.exige(/^[A-Z0-9]{2,6}$/.test(o.serie), `${r}.serie`, 'de 2 a 6 caracteres en mayúscula'); }
    const campos = validarCampos(inf, o.campos, `${r}.campos`, ctx);
    defsCampos.set(o.id, campos);
    inf.exige(Array.isArray(o.estados) && o.estados.length >= 3 && new Set(o.estados).size === o.estados.length && o.estados.every(esTexto), `${r}.estados`, 'al menos 3 estados distintos: el primero inicial, el segundo emitido y el último anulado');
    if (o.lista !== undefined) { (o.lista || []).forEach((id, j) => inf.exige(campos.has(id), `${r}.lista[${j}]`, `«${id}» no es un campo de ${o.id}`)); }
    if (o.lineas) {
      const l = o.lineas;
      inf.exige(ents.has(l.entidad), `${r}.lineas.entidad`, `la entidad «${l.entidad}» no existe`);
      const objetivo = ents.get(l.entidad);
      if (objetivo) {
        const cs = (objetivo.campos || []).map((x) => x.id);
        inf.exige(cs.includes(l.mostrar || 'nombre'), `${r}.lineas.mostrar`, `«${l.mostrar || 'nombre'}» no es un campo de ${l.entidad}`);
        const pc = (objetivo.campos || []).find((x) => x.id === (l.precio || 'precio'));
        inf.exige(pc && ['moneda', 'numero'].includes(pc.tipo), `${r}.lineas.precio`, `«${l.precio || 'precio'}» debe ser un campo numérico o de moneda de ${l.entidad}`);
      }
      validarCampos(inf, l.campos, `${r}.lineas.campos`, ctx, true);
      ['importe', 'info'].forEach((k) => { if (l[k] !== undefined) { inf.exige(esFn(l[k]), `${r}.lineas.${k}`, 'debe ser una función'); } });
      inf.exige(esFn(o.calcular), `${r}.calcular`, 'una operación con líneas necesita calcular(doc, ctx)');
    }
    if (o.calcular) {
      inf.exige(esFn(o.calcular), `${r}.calcular`, 'debe ser una función');
      inf.exige(Array.isArray(o.totales) && o.totales.length > 0, `${r}.totales`, 'faltan los totales a mostrar');
      (o.totales || []).forEach((t, j) => inf.exige(esTexto(t.id) && esTexto(t.etiqueta), `${r}.totales[${j}]`, 'necesita id y etiqueta'));
      inf.exige((o.totales || []).some((t) => t.fuerte), `${r}.totales`, 'marca un total con fuerte: true (el principal)');
    }
    ['alEmitir', 'alAnular'].forEach((k) => { if (o[k] !== undefined) { inf.exige(esFn(o[k]), `${r}.${k}`, 'debe ser una función (doc, ctx)'); } });
    (o.reglas || []).forEach((k, j) => inf.exige(esTexto(k.id) && esTexto(k.mensaje) && esFn(k.validar), `${r}.reglas[${j}]`, 'una regla necesita id, mensaje y validar(doc, ctx)'));
    validarPermisos(inf, o.permisos, `${r}.permisos`, [...ACCIONES_OP, 'eliminar'], roles, ['ver', 'crear', 'editar', 'emitir', 'anular']);
  });

  /* Referencias entre entidades */
  ctx.refs.forEach((f) => {
    if (!inf.exige(ents.has(f.entidad), `${f.ruta}.entidad`, `la entidad «${f.entidad}» no existe`)) { return; }
    const m = f.mostrar || 'nombre';
    inf.exige(defsCampos.get(f.entidad).has(m), `${f.ruta}.mostrar`, `«${m}» no es un campo de ${f.entidad}`);
  });
  ctx.pendientesRoles.forEach((p) => validarRoles(inf, p.lista, p.ruta, roles));

  /* Reportes */
  inf.exige(Array.isArray(c.reportes) && c.reportes.length >= 3 && c.reportes.length <= 5, 'reportes', 'se necesitan de 3 a 5 reportes');
  const repIds = new Set();
  (c.reportes || []).forEach((p, i) => {
    const r = `reportes[${i}]`;
    inf.exige(ID_SIMPLE.test(p.id || '') || /^[a-z][a-z0-9-]*$/.test(p.id || ''), `${r}.id`, 'id no válido (minúsculas, números y guiones)');
    inf.exige(!repIds.has(p.id), `${r}.id`, `«${p.id}» repetido`);
    repIds.add(p.id);
    inf.exige(esTexto(p.titulo), `${r}.titulo`, 'falta');
    inf.exige(esFn(p.ejecutar), `${r}.ejecutar`, 'debe ser una función (p, ctx)');
    if (p.roles !== undefined) { validarRoles(inf, p.roles, `${r}.roles`, roles); }
    inf.exige(Array.isArray(p.parametros), `${r}.parametros`, 'debe ser un arreglo (puede estar vacío)');
    (p.parametros || []).forEach((q, j) => {
      inf.exige(ID_SIMPLE.test(q.id || ''), `${r}.parametros[${j}].id`, 'id no válido');
      inf.exige(TIPOS_PARAM_REPORTE.includes(q.tipo), `${r}.parametros[${j}].tipo`, `debe ser uno de ${TIPOS_PARAM_REPORTE.join(', ')}`);
      if (q.tipo === 'fecha' && q.defecto !== undefined) { inf.exige(esFechaSemilla(q.defecto), `${r}.parametros[${j}].defecto`, "fecha inválida (AAAA-MM-DD, 'hoy' o '@-45')"); }
    });
    const tieneRango = (p.parametros || []).some((q) => q.id === 'desde') && (p.parametros || []).some((q) => q.id === 'hasta');
    if (!tieneRango) { inf.aviso(`${r}.parametros`, 'sin filtros desde/hasta: el contrato pide filtros de fecha en los reportes'); }
  });

  /* Tablero */
  inf.exige(Array.isArray(c.tablero) && c.tablero.length >= 4 && c.tablero.length <= 6, 'tablero', 'se necesitan de 4 a 6 indicadores');
  (c.tablero || []).forEach((t, i) => {
    inf.exige(esTexto(t.titulo), `tablero[${i}].titulo`, 'falta');
    inf.exige(esFn(t.calcular), `tablero[${i}].calcular`, 'debe ser una función (ctx)');
    inf.exige(TIPOS_INDICADOR.includes(t.tipo), `tablero[${i}].tipo`, `debe ser uno de ${TIPOS_INDICADOR.join(', ')}`);
    if (t.roles !== undefined) { validarRoles(inf, t.roles, `tablero[${i}].roles`, roles); }
  });
  if (inf.exige(c.tableroGrafico && esTexto(c.tableroGrafico.titulo) && esFn(c.tableroGrafico.calcular), 'tableroGrafico', 'falta el gráfico del tablero {titulo, calcular(ctx)}')) {
    if (c.tableroGrafico.tipo !== undefined) { inf.exige(TIPOS_GRAFICO.includes(c.tableroGrafico.tipo), 'tableroGrafico.tipo', `debe ser uno de ${TIPOS_GRAFICO.join(', ')}`); }
  }

  /* Semillas */
  const sem = c.semillas || {};
  inf.exige(c.semillas && typeof c.semillas === 'object', 'semillas', 'faltan los datos de demostración');
  const idsSem = {};
  const nombresColecciones = new Set([...ents.keys(), ...ops.keys()]);
  Object.keys(sem).forEach((k) => inf.exige(nombresColecciones.has(k), `semillas.${k}`, 'no corresponde a ninguna entidad ni operación'));
  const principales = (c.entidades || []).slice(0, 3).map((e) => e.id);
  (c.entidades || []).forEach((e) => {
    const lista = sem[e.id];
    if (!inf.exige(Array.isArray(lista), `semillas.${e.id}`, 'falta el arreglo de semillas')) { return; }
    const min = principales.includes(e.id) ? 12 : 5;
    inf.exige(lista.length >= min, `semillas.${e.id}`, `tiene ${lista.length} registros y se piden al menos ${min}${principales.includes(e.id) ? ' (entidad principal)' : ''}`);
    idsSem[e.id] = new Set();
    lista.forEach((reg, i) => {
      const r = `semillas.${e.id}[${i}]`;
      if (!inf.exige(esTexto(reg.id) && reg.id.startsWith(e.prefijo + '-'), `${r}.id`, `debe empezar por «${e.prefijo}-» (es «${reg.id}»)`)) { return; }
      inf.exige(!idsSem[e.id].has(reg.id), `${r}.id`, `«${reg.id}» está repetido`);
      idsSem[e.id].add(reg.id);
    });
  });
  (c.entidades || []).forEach((e) => {
    const campos = defsCampos.get(e.id);
    const vistos = {};
    (sem[e.id] || []).forEach((reg, i) => {
      const r = `semillas.${e.id}[${i}]`;
      Object.keys(reg).forEach((k) => { if (k !== 'id') { inf.exige(campos.has(k), `${r}.${k}`, `«${k}» no es un campo de ${e.id}`); } });
      campos.forEach((campo, id) => {
        if (campo.requerido && (reg[id] === undefined || reg[id] === null || reg[id] === '') && campo.tipo !== 'booleano') { inf.error(`${r}.${id}`, 'es obligatorio y falta'); }
        validarSemillaCampo(inf, `${r}.${id}`, campo, reg[id], idsSem);
        if (campo.unico && reg[id] !== undefined) {
          const clave = `${id}:${String(reg[id]).toLowerCase()}`;
          inf.exige(!vistos[clave], `${r}.${id}`, `«${reg[id]}» repetido y el campo es único`);
          vistos[clave] = true;
        }
      });
    });
  });
  const mesesVistos = new Set();
  let totalOps = 0;
  (c.operaciones || []).forEach((o, oi) => {
    const lista = sem[o.id];
    if (!inf.exige(Array.isArray(lista), `semillas.${o.id}`, 'falta el arreglo de semillas')) { return; }
    totalOps += lista.length;
    const min = oi === 0 ? 30 : 8;
    inf.exige(lista.length >= min, `semillas.${o.id}`, `tiene ${lista.length} documentos y se piden al menos ${min}`);
    const campos = defsCampos.get(o.id);
    const ids = new Set();
    lista.forEach((d, i) => {
      const r = `semillas.${o.id}[${i}]`;
      inf.exige(esTexto(d.id) && d.id.startsWith(o.prefijo + '-'), `${r}.id`, `debe empezar por «${o.prefijo}-»`);
      inf.exige(!ids.has(d.id), `${r}.id`, `«${d.id}» repetido`);
      ids.add(d.id);
      inf.exige((o.estados || []).includes(d.estado), `${r}.estado`, `«${d.estado}» no está en estados ${JSON.stringify(o.estados)}`);
      Object.keys(d).forEach((k) => { if (!['id', 'estado', 'lineas', 'numero', 'motivoAnulacion'].includes(k)) { inf.exige(campos.has(k), `${r}.${k}`, `«${k}» no es un campo de ${o.id}`); } });
      campos.forEach((campo, id) => {
        if (campo.requerido && (d[id] === undefined || d[id] === null || d[id] === '') && campo.tipo !== 'booleano') { inf.error(`${r}.${id}`, 'es obligatorio y falta'); }
        validarSemillaCampo(inf, `${r}.${id}`, campo, d[id], idsSem);
      });
      if (d.fecha !== undefined) {
        const m = /^@-(\d+)$/.exec(d.fecha);
        if (oi === 0 && m) { mesesVistos.add(Math.floor(Number(m[1]) / 30)); }
        if (m && Number(m[1]) > 190) { inf.error(`${r}.fecha`, 'fuera de los últimos 6 meses'); }
      }
      if (o.lineas) {
        inf.exige(Array.isArray(d.lineas) && (d.estado === o.estados[0] || d.lineas.length > 0), `${r}.lineas`, 'un documento emitido necesita al menos una línea');
        const items = new Set();
        (d.lineas || []).forEach((l, j) => {
          const rl = `${r}.lineas[${j}]`;
          inf.exige(idsSem[o.lineas.entidad] && idsSem[o.lineas.entidad].has(l.item), `${rl}.item`, `«${l.item}» no existe en las semillas de ${o.lineas.entidad}`);
          inf.exige(!items.has(l.item), `${rl}.item`, 'ítem repetido en el mismo documento');
          items.add(l.item);
          inf.exige(esNum(l.precio) && l.precio >= 0, `${rl}.precio`, 'falta el precio (número ≥ 0)');
          (o.lineas.campos || []).forEach((lc) => {
            if (lc.requerido && l[lc.id] === undefined) { inf.error(`${rl}.${lc.id}`, 'es obligatorio y falta'); }
            validarSemillaCampo(inf, `${rl}.${lc.id}`, lc, l[lc.id], idsSem);
          });
        });
      }
    });
  });
  inf.exige(mesesVistos.size >= 4 || (c.operaciones || []).length === 0, 'semillas', `las operaciones principales deben repartirse en varios meses (hay ${mesesVistos.size}; mínimo 4)`);
  inf.exige(totalOps >= 30, 'semillas', `en total se piden al menos 30 operaciones (hay ${totalOps})`);

  return inf;
}

/* ---------- Hallazgos de auditoría (solo para el instructor) ---------- */

function textoFuncion(fn) { return String(fn).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

function hallarFunciones(c) {
  const lista = [];
  (c.entidades || []).forEach((e) => {
    (e.calculados || []).forEach((k) => lista.push([`entidades.${e.id}.calculados.${k.id}.formula`, k.formula]));
    (e.reglas || []).forEach((k) => lista.push([`entidades.${e.id}.reglas.${k.id}.validar`, k.validar]));
  });
  (c.operaciones || []).forEach((o) => {
    ['calcular', 'alEmitir', 'alAnular'].forEach((k) => { if (o[k]) { lista.push([`operaciones.${o.id}.${k}`, o[k]]); } });
    (o.reglas || []).forEach((k) => lista.push([`operaciones.${o.id}.reglas.${k.id}.validar`, k.validar]));
    if (o.lineas && o.lineas.importe) { lista.push([`operaciones.${o.id}.lineas.importe`, o.lineas.importe]); }
  });
  (c.reportes || []).forEach((r) => lista.push([`reportes.${r.id}.ejecutar`, r.ejecutar]));
  (c.tablero || []).forEach((t, i) => lista.push([`tablero[${i}].calcular`, t.calcular]));
  return lista;
}

function derivarHallazgos(c) {
  const h = [];
  const seg = Object.assign({}, DEFECTOS_SEGURIDAD, c.seguridad || {});
  const agregar = (sev, cat, donde, que, evidencia, arreglo) => h.push({ sev, cat, donde, que, evidencia, arreglo });
  const debil = {
    minClave: (v) => v < 10, intentosMax: (v) => v === 0, sesionMin: (v) => v === 0, bloqueoMin: (v) => v < 1,
    cadenaBitacora: (v) => v === false, confirmarEliminar: (v) => v === false, exigirCambioClave: (v) => v === false,
    ayudaLogin: (v) => v === true, exportaRespetaPermisos: (v) => v === false, cspMeta: (v) => v === false
  };
  const texto = {
    minClave: ['Media', 'Contraseñas', 'La política de contraseñas acepta claves cortas.', 'Subir minClave a 10 o más.'],
    intentosMax: ['Alta', 'Autenticación', 'No hay bloqueo por intentos fallidos: se puede adivinar una clave por fuerza bruta.', 'Poner intentosMax en 5 (o menos) y bloqueoMin en 5 o más.'],
    sesionMin: ['Media', 'Sesión', 'La sesión nunca expira por inactividad.', 'Poner sesionMin en 15 (o menos).'],
    bloqueoMin: ['Baja', 'Autenticación', 'El bloqueo dura menos de un minuto.', 'Subir bloqueoMin a 5.'],
    cadenaBitacora: ['Alta', 'Auditoría', 'La bitácora no se encadena con hashes: se puede alterar sin que se note.', 'Volver cadenaBitacora a true.'],
    confirmarEliminar: ['Media', 'Integridad', 'Se elimina sin pedir confirmación.', 'Volver confirmarEliminar a true.'],
    exigirCambioClave: ['Media', 'Contraseñas', 'No se obliga a cambiar la clave de demostración en el primer ingreso.', 'Volver exigirCambioClave a true.'],
    ayudaLogin: ['Alta', 'Divulgación', 'La pantalla de ingreso publica usuarios y claves de demostración.', 'Volver ayudaLogin a false.'],
    exportaRespetaPermisos: ['Alta', 'Confidencialidad', 'El CSV incluye columnas que el rol no puede ver (por ejemplo costos).', 'Volver exportaRespetaPermisos a true.'],
    cspMeta: ['Media', 'Navegador', 'No hay Content-Security-Policy: un XSS tendría más margen.', 'Volver cspMeta a true.']
  };
  Object.keys(debil).forEach((k) => {
    if (debil[k](seg[k])) {
      const [sev, cat, que, arreglo] = texto[k];
      agregar(sev, cat, `seguridad.${k}`, que, `seguridad.${k} = ${JSON.stringify(seg[k])} (seguro por defecto: ${JSON.stringify(DEFECTOS_SEGURIDAD[k])})`, arreglo);
    }
  });
  (c.reportes || []).forEach((r) => {
    if (!r.roles) {
      const camposOcultos = [];
      (c.entidades || []).forEach((e) => (e.campos || []).forEach((f) => { if (f.ver) { camposOcultos.push(`${e.id}.${f.id}`); } }));
      agregar('Alta', 'Control de acceso', `reportes.${r.id}`, `El reporte «${r.titulo}» no declara roles: cualquier usuario con sesión puede abrirlo.${camposOcultos.length ? ' Revisa si muestra datos de campos restringidos (' + camposOcultos.join(', ') + ').' : ''}`, `reportes.${r.id} no tiene la propiedad roles`, 'Agregar roles: [...] con los roles que de verdad lo necesitan.');
    }
  });
  /* Constantes que debían ser parámetros */
  const valores = new Map();
  (c.parametros || []).forEach((p) => { if (typeof p.valor === 'number') { valores.set(p.id, p.valor); } });
  hallarFunciones(c).forEach(([donde, fn]) => {
    const src = textoFuncion(fn).replace(/ctx\.param\(\s*['"][^'"]+['"]\s*\)/g, 'PARAM');
    valores.forEach((v, id) => {
      const candidatos = new Set([String(v / 100), String(1 + v / 100)]);
      if (v >= 5) { candidatos.add(String(v)); }
      candidatos.forEach((lit) => {
        const esc = lit.replace('.', '\\.');
        const re = new RegExp(`(^|[^\\w.])${esc}(?![\\w.])`);
        if (re.test(src)) {
          /* Un literal entero solo cuenta si está dentro de una multiplicación o división (no de un índice o un tamaño). */
          if (!lit.includes('.') && !new RegExp(`[*/]\\s*${esc}(?![\\w.])|(?<![\\w.])${esc}\\s*[*/]`).test(src)) { return; }
          agregar('Media', 'Reglas de negocio', donde, `La función usa la constante ${lit} escrita a mano, pero el valor vive en el parámetro «${id}» (${v}). Si un administrador lo cambia en Configuración, este cálculo no se entera.`, `${donde} contiene el literal ${lit}`, `Reemplazar por ctx.param('${id}')${lit.includes('.') ? ' / 100' : ''}.`);
        }
      });
    });
  });
  /* Permisos sospechosos */
  const ESCRITURA = ['crear', 'editar', 'eliminar', 'emitir', 'anular'];
  [...(c.entidades || []).map((e) => ['entidades', e]), ...(c.operaciones || []).map((o) => ['operaciones', o])].forEach(([tipo, d]) => {
    ESCRITURA.forEach((a) => {
      if ((d.permisos || {})[a] && d.permisos[a].includes('auditor')) {
        agregar('Alta', 'Control de acceso', `${tipo}.${d.id}.permisos.${a}`, `El rol auditor puede «${a}» en ${d.plural}; debería ser de solo lectura.`, `${tipo}.${d.id}.permisos.${a} incluye «auditor»`, 'Quitar auditor de esa lista.');
      }
    });
    if (tipo === 'entidades' && (d.permisos.eliminar || []).filter((r) => r !== 'admin').length) {
      agregar('Baja', 'Segregación de funciones', `entidades.${d.id}.permisos.eliminar`, `Roles distintos de admin pueden eliminar ${d.plural}: ${(d.permisos.eliminar || []).join(', ')}.`, JSON.stringify(d.permisos.eliminar), 'Limitar eliminar a admin.');
    }
    if (tipo === 'operaciones' && (d.permisos.anular || []).filter((r) => !['admin', 'gerente'].includes(r)).length) {
      agregar('Media', 'Segregación de funciones', `operaciones.${d.id}.permisos.anular`, `Un rol operativo puede anular ${d.plural}: ${d.permisos.anular.join(', ')}.`, JSON.stringify(d.permisos.anular), 'Reservar anular a admin o al jefe.');
    }
  });
  (c.operaciones || []).forEach((o) => {
    const e = new Set(o.permisos.emitir || []), a = new Set(o.permisos.anular || []);
    const cruce = [...e].filter((r) => a.has(r) && r !== 'admin');
    if (cruce.length) { agregar('Media', 'Segregación de funciones', `operaciones.${o.id}.permisos`, `El mismo rol emite y anula ${o.plural}: ${cruce.join(', ')}.`, `emitir y anular comparten ${cruce.join(', ')}`, 'Separar quién emite de quién anula.'); }
  });
  return h;
}

function escribirClave(dir, c, hallazgos) {
  fs.mkdirSync(dir, { recursive: true });
  const orden = { Alta: 0, Media: 1, Baja: 2 };
  hallazgos.sort((a, b) => orden[a.sev] - orden[b.sev]);
  const filas = hallazgos.map((x, i) => `### H${i + 1} · ${x.sev} · ${x.cat}\n\n- **Dónde:** \`${x.donde}\`\n- **Qué pasa:** ${x.que}\n- **Evidencia en el config:** \`${x.evidencia}\`\n- **Cómo se corrige:** ${x.arreglo}\n`).join('\n');
  const md = `# Clave del instructor · ${c.nombre} (\`${c.id}\`)\n\n> Documento generado por \`construir.mjs --clave\`. NO lo subas al repositorio ni lo compartas con el grupo.\n> Se deriva solo del config (claves de seguridad debilitadas, reportes sin roles, constantes fijas y permisos sospechosos). Pueden existir otros hallazgos que no se detectan por patrón: la auditoría sigue siendo humana.\n\n**Hallazgos derivados:** ${hallazgos.length}\n\n${filas || '_No se derivó ningún hallazgo._\n'}`;
  fs.writeFileSync(path.join(dir, `${c.id}.md`), md);
}

/* ---------- LEEME.txt ---------- */

function leeme(c) {
  const seg = Object.assign({}, DEFECTOS_SEGURIDAD, c.seguridad || {});
  const linea = '='.repeat(72);
  const l = [];
  l.push(linea, `${c.nombre.toUpperCase()}`, `Sistema de práctica · ${c.rubro} · versión ${c.version}`, linea, '');
  l.push('QUÉ ES', '  Un sistema web completo (inicio de sesión, mantenimientos, operaciones,', '  reportes, usuarios, bitácora y respaldo) hecho para que lo DOCUMENTES y lo', '  AUDITES con DeepSeek Harness. Los datos son inventados: no uses datos reales.', '');
  l.push('CÓMO ABRIRLO', '  1. Descomprime la carpeta completa.', '  2. Haz doble clic en index.html. No necesita servidor, internet ni instalación.', '  3. Ingresa con uno de los usuarios de la tabla de abajo.', '');
  l.push('NAVEGADORES', '  Objetivo: Chrome, Edge, Firefox, Safari 10 o superior e Internet Explorer 11.', '  El código está escrito en ES5 y se revisó con análisis estático; la prueba real', '  se hizo en Chrome. No se afirma que se haya probado en Internet Explorer.', '  Si tu navegador bloquea el almacenamiento local de archivos, el sistema avisa y', '  guarda los datos solo en esa pestaña: usa Respaldo para no perderlos.', '');
  l.push('USUARIOS DE DEMOSTRACIÓN', '  usuario        contraseña        rol');
  c.usuarios.forEach((u) => {
    const rol = c.roles.find((r) => r.id === u.rol);
    l.push(`  ${u.usuario.padEnd(14)} ${u.clave.padEnd(17)} ${rol ? rol.nombre : u.rol}`);
  });
  if (seg.exigirCambioClave) { l.push('', '  La primera vez, el sistema te obliga a cambiar la contraseña de demostración.'); }
  l.push('');
  l.push('ROLES');
  c.roles.forEach((r) => l.push(`  - ${r.nombre} (${r.id}): ${r.descripcion}`));
  l.push('');
  l.push('QUÉ INCLUYE');
  l.push(`  Mantenimientos: ${c.entidades.map((e) => e.plural).join(', ')}.`);
  l.push(`  Operaciones: ${c.operaciones.map((o) => o.plural).join(', ')}.`);
  l.push(`  Reportes: ${c.reportes.map((r) => r.titulo).join('; ')}.`);
  l.push('  Administración: usuarios y roles, bitácora con verificación de integridad,');
  l.push('  respaldo y restauración, parámetros del negocio y cambio de contraseña.', '');
  l.push('DÓNDE SE GUARDAN LOS DATOS', `  En el navegador (localStorage, clave sis_${c.id}_v1). Para volver a empezar:`, '  Respaldo > Restablecer demostración. Para llevarte los datos: Respaldo > Descargar.', '');
  l.push('AVISO DE SEGURIDAD', '  La seguridad de este sistema es DE DEMOSTRACIÓN: todo corre en tu navegador y', '  cualquiera con las herramientas del navegador puede saltársela. Sirve para', '  aprender a auditar, no para proteger información real.', '');
  l.push('ARCHIVOS', '  index.html           página de entrada', '  css/app.css          estilos', '  js/config.js         lo que hace distinto a este sistema (entidades, reglas, reportes)', '  js/00-util.js … js/80-app.js   el núcleo común a todos los sistemas de práctica', '');
  return l.join('\r\n') + '\r\n';
}

/* ---------- Escritor ZIP (sin dependencias) ---------- */

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) { c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } t[n] = c >>> 0; }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) { c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); }
  return (c ^ 0xffffffff) >>> 0;
}

/** Crea un ZIP reproducible: entradas ordenadas, fecha fija 2026-01-01 00:00. entradas: [{ nombre, datos: Buffer|null }] (null = carpeta). */
function crearZip(entradas) {
  const DOS_HORA = 0;
  const DOS_FECHA = ((2026 - 1980) << 9) | (1 << 5) | 1;
  const partes = [];
  const central = [];
  let desplazamiento = 0;
  [...entradas].sort((a, b) => (a.nombre < b.nombre ? -1 : 1)).forEach((e) => {
    const nombre = Buffer.from(e.nombre, 'utf8');
    const esCarpeta = e.datos === null;
    const datos = esCarpeta ? Buffer.alloc(0) : e.datos;
    let comp = datos, metodo = 0;
    if (!esCarpeta && datos.length > 0) {
      const d = zlib.deflateRawSync(datos, { level: 9 });
      if (d.length < datos.length) { comp = d; metodo = 8; }
    }
    const crc = esCarpeta ? 0 : crc32(datos);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(metodo, 8);
    local.writeUInt16LE(DOS_HORA, 10); local.writeUInt16LE(DOS_FECHA, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(datos.length, 22); local.writeUInt16LE(nombre.length, 26); local.writeUInt16LE(0, 28);
    partes.push(local, nombre, comp);
    const reg = Buffer.alloc(46);
    reg.writeUInt32LE(0x02014b50, 0); reg.writeUInt16LE(0x031e, 4); reg.writeUInt16LE(20, 6); reg.writeUInt16LE(0x0800, 8); reg.writeUInt16LE(metodo, 10);
    reg.writeUInt16LE(DOS_HORA, 12); reg.writeUInt16LE(DOS_FECHA, 14); reg.writeUInt32LE(crc, 16);
    reg.writeUInt32LE(comp.length, 20); reg.writeUInt32LE(datos.length, 24); reg.writeUInt16LE(nombre.length, 28);
    reg.writeUInt16LE(0, 30); reg.writeUInt16LE(0, 32); reg.writeUInt16LE(0, 34); reg.writeUInt16LE(0, 36);
    reg.writeUInt32LE(((esCarpeta ? 0o40755 : 0o100644) << 16) >>> 0, 38); reg.writeUInt32LE(desplazamiento, 42);
    central.push(reg, nombre);
    desplazamiento += local.length + nombre.length + comp.length;
  });
  const dirCentral = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entradas.length, 8); fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(dirCentral.length, 12); fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...partes, dirCentral, fin]);
}

/* ---------- Construcción ---------- */

function listarArchivos(base) {
  const r = [];
  (function recorrer(dir, rel) {
    fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1)).forEach((d) => {
      const p = path.join(dir, d.name), q = rel ? `${rel}/${d.name}` : d.name;
      if (d.isDirectory()) { r.push({ nombre: q + '/', datos: null }); recorrer(p, q); } else { r.push({ nombre: q, datos: fs.readFileSync(p) }); }
    });
  })(base, '');
  return r;
}

function construir(id, c) {
  const destino = path.join(DIR_DIST, id);
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(path.join(destino, 'css'), { recursive: true });
  fs.mkdirSync(path.join(destino, 'js'), { recursive: true });
  const seg = Object.assign({}, DEFECTOS_SEGURIDAD, c.seguridad || {});
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let html = fs.readFileSync(path.join(DIR_NUCLEO, 'index.plantilla.html'), 'utf8');
  html = html.replace('<!--@CSP@-->', seg.cspMeta ? `<meta http-equiv="Content-Security-Policy" content="${CSP}">` : '<!-- cspMeta desactivado en el config: esta página no lleva Content-Security-Policy -->');
  html = html.replace('@NOMBRE@', esc(c.nombre));
  fs.writeFileSync(path.join(destino, 'index.html'), html);
  fs.writeFileSync(path.join(destino, 'LEEME.txt'), leeme(c));
  fs.copyFileSync(path.join(DIR_NUCLEO, 'css', 'app.css'), path.join(destino, 'css', 'app.css'));
  ORDEN_SCRIPTS.forEach((f) => {
    const origen = f === 'config.js' ? path.join(DIR_SISTEMAS, id, 'config.js') : path.join(DIR_NUCLEO, 'js', f);
    fs.copyFileSync(origen, path.join(destino, 'js', f));
  });
  const entradas = listarArchivos(destino).map((e) => ({ nombre: `${id}/${e.nombre}`, datos: e.datos }));
  entradas.unshift({ nombre: `${id}/`, datos: null });
  const zip = crearZip(entradas);
  const archivoZip = path.join(DIR_DIST, `${id}.zip`);
  fs.writeFileSync(archivoZip, zip);
  fs.mkdirSync(DIR_MATERIALES, { recursive: true });
  fs.copyFileSync(archivoZip, path.join(DIR_MATERIALES, `${id}.zip`));
  return { bytes: zip.length, sha256: crypto.createHash('sha256').update(zip).digest('hex') };
}

function entradaIndice(c, zip) {
  return {
    id: c.id, nombre: c.nombre, rubro: c.rubro, version: c.version,
    roles: c.roles.map((r) => r.id), entidades: c.entidades.map((e) => e.id), operaciones: c.operaciones.map((o) => o.id), reportes: c.reportes.map((r) => r.id),
    usuarios: c.usuarios.length, zip: { archivo: `${c.id}.zip`, bytes: zip.bytes, sha256: zip.sha256 }
  };
}

/* ---------- Programa principal ---------- */

function principal() {
  const args = leerArgs(process.argv.slice(2));
  if (args.ayuda) { console.log('Uso: node construir.mjs [--solo <id>] [--clave <carpeta-fuera-del-repo>]'); return; }
  if (!fs.existsSync(DIR_SISTEMAS)) { console.error('No existe la carpeta sistemas/'); process.exit(1); }
  const carpetas = fs.readdirSync(DIR_SISTEMAS, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(DIR_SISTEMAS, d.name, 'config.js'))).map((d) => d.name).sort();
  const objetivo = args.solo ? carpetas.filter((c) => c === args.solo) : carpetas;
  if (args.solo && !objetivo.length) { console.error(`No existe sistemas/${args.solo}/config.js`); process.exit(1); }
  if (args.clave) {
    const rel = path.relative(RAIZ, path.resolve(args.clave));
    const repoRaiz = path.resolve(RAIZ, '../../..');
    const abs = path.resolve(args.clave);
    if (abs === repoRaiz || abs.startsWith(repoRaiz + path.sep)) { console.error(`La carpeta de la clave (${abs}) está DENTRO del repositorio. Elige una carpeta fuera (${rel}).`); process.exit(1); }
  }
  let hayErrores = false;
  const configs = new Map();
  objetivo.forEach((id) => {
    const archivo = `sistemas/${id}/config.js`;
    let c;
    try { c = cargarConfig(path.join(DIR_SISTEMAS, id, 'config.js')); } catch (e) {
      console.error(`ERROR ${archivo}: no se pudo ejecutar el config: ${e.message}`); hayErrores = true; return;
    }
    const inf = validarConfig(c, id, archivo);
    inf.avisos.forEach((a) => console.warn(`  aviso  ${a}`));
    if (inf.errores.length) { hayErrores = true; inf.errores.forEach((m) => console.error(`  ERROR  ${m}`)); console.error(`✗ ${id}: ${inf.errores.length} error(es)`); }
    else { configs.set(id, c); }
  });
  if (hayErrores) { console.error('\nNo se construyó nada: corrige los errores de arriba.'); process.exit(1); }
  fs.mkdirSync(DIR_DIST, { recursive: true });
  const archivoIndice = path.join(DIR_DIST, 'indice.json');
  let indice = [];
  if (args.solo && fs.existsSync(archivoIndice)) { try { indice = JSON.parse(fs.readFileSync(archivoIndice, 'utf8')); } catch { indice = []; } }
  objetivo.forEach((id) => {
    const c = configs.get(id);
    const zip = construir(id, c);
    indice = indice.filter((x) => x.id !== id);
    indice.push(entradaIndice(c, zip));
    if (args.clave) { escribirClave(path.resolve(args.clave), c, derivarHallazgos(c)); }
    console.log(`✓ ${id}: dist/${id}/ · dist/${id}.zip (${(zip.bytes / 1024).toFixed(1)} KB)${args.clave ? ' · clave escrita' : ''}`);
  });
  indice.sort((a, b) => (a.id < b.id ? -1 : 1));
  fs.writeFileSync(archivoIndice, JSON.stringify(indice, null, 2) + '\n');
  console.log(`✓ dist/indice.json (${indice.length} sistema(s)) · zips copiados a ${path.relative(RAIZ, DIR_MATERIALES)}`);
}

principal();
