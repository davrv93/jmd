// Persistencia de partidas en localStorage con respaldo en memoria.
// Compatible con navegador y Node 20+. Sin dependencias.

export const LLAVE_PARTIDAS = 'crucigrama-ia:partidas';
export const LLAVE_EN_CURSO = 'crucigrama-ia:en-curso';
export const MAX_PARTIDAS = 200;

// ---------- almacén ----------

const memoria = new Map();
const almacenMemoria = {
  getItem: (llave) => (memoria.has(llave) ? memoria.get(llave) : null),
  setItem: (llave, valor) => { memoria.set(llave, String(valor)); },
  removeItem: (llave) => { memoria.delete(llave); },
};

let almacenInyectado = null;

/** Inyecta un almacén con getItem/setItem/removeItem (pruebas). Pasar null restaura el comportamiento normal. */
export function configurarAlmacen(almacen) {
  if (almacen && typeof almacen.getItem === 'function'
    && typeof almacen.setItem === 'function'
    && typeof almacen.removeItem === 'function') {
    almacenInyectado = almacen;
  } else {
    almacenInyectado = null;
  }
}

function almacenPrincipal() {
  if (almacenInyectado) return almacenInyectado;
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch {
    // acceso a localStorage prohibido (p. ej. cookies bloqueadas)
  }
  return almacenMemoria;
}

function leer(llave) {
  try {
    const valor = almacenPrincipal().getItem(llave);
    return typeof valor === 'string' ? valor : null;
  } catch {
    return almacenMemoria.getItem(llave);
  }
}

function escribir(llave, valor) {
  try {
    almacenPrincipal().setItem(llave, valor);
  } catch {
    almacenMemoria.setItem(llave, valor);
  }
}

function quitar(llave) {
  try {
    almacenPrincipal().removeItem(llave);
  } catch {
    // ignorar
  }
  memoria.delete(llave);
}

function leerJson(llave, porDefecto) {
  const texto = leer(llave);
  if (texto === null) return porDefecto;
  try {
    const valor = JSON.parse(texto);
    return valor === null || valor === undefined ? porDefecto : valor;
  } catch {
    return porDefecto;
  }
}

function escribirJson(llave, valor) {
  try {
    escribir(llave, JSON.stringify(valor));
  } catch {
    // valor no serializable: no persistimos
  }
}

// ---------- utilidades ----------

function aleatorioBase36(largo = 6) {
  let salida = '';
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(largo);
      crypto.getRandomValues(bytes);
      for (const b of bytes) salida += (b % 36).toString(36);
      return salida;
    }
  } catch {
    // seguimos con Math.random
  }
  while (salida.length < largo) salida += Math.floor(Math.random() * 36).toString(36);
  return salida;
}

export function nuevoId() {
  return `p-${Date.now().toString(36)}-${aleatorioBase36(6)}`;
}

function marcaFin(partida) {
  const t = Date.parse(partida && partida.fin);
  return Number.isFinite(t) ? t : 0;
}

function ordenarPorFinDesc(lista) {
  return lista.slice().sort((a, b) => {
    const d = marcaFin(b) - marcaFin(a);
    if (d !== 0) return d;
    return String(b.id).localeCompare(String(a.id));
  });
}

function normalizarSemilla(semilla) {
  return String(semilla ?? '').trim().toUpperCase();
}

function esNumero(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function esTextoNoVacio(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Comprueba la forma de una partida: campos obligatorios y tipos. Devuelve '' si es válida o el error. */
export function validarPartida(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'no es un objeto';
  if (!esTextoNoVacio(p.id)) return 'falta el id';
  if (typeof p.jugador !== 'string') return 'jugador debe ser texto';
  if (typeof p.semilla !== 'string') return 'semilla debe ser texto';
  if (!esTextoNoVacio(p.inicio) || !Number.isFinite(Date.parse(p.inicio))) return 'inicio debe ser una fecha ISO';
  if (!esTextoNoVacio(p.fin) || !Number.isFinite(Date.parse(p.fin))) return 'fin debe ser una fecha ISO';
  if (!esNumero(p.duracionMs) || p.duracionMs < 0) return 'duracionMs debe ser un número ≥ 0';
  if (typeof p.completada !== 'boolean') return 'completada debe ser booleano';
  if (!esNumero(p.correctas) || p.correctas < 0) return 'correctas debe ser un número ≥ 0';
  if (!esNumero(p.total) || p.total < 0) return 'total debe ser un número ≥ 0';
  if (p.revisiones !== undefined && (!esNumero(p.revisiones) || p.revisiones < 0)) return 'revisiones debe ser un número ≥ 0';
  if (p.respuestas !== undefined && p.respuestas !== null && !Array.isArray(p.respuestas)) return 'respuestas debe ser un arreglo';
  return '';
}

function sanearPartida(p) {
  return {
    id: String(p.id),
    jugador: String(p.jugador ?? ''),
    semilla: normalizarSemilla(p.semilla),
    inicio: String(p.inicio),
    fin: String(p.fin),
    duracionMs: Number(p.duracionMs),
    completada: Boolean(p.completada),
    correctas: Number(p.correctas),
    total: Number(p.total),
    revisiones: esNumero(p.revisiones) ? p.revisiones : 0,
    respuestas: Array.isArray(p.respuestas) ? p.respuestas : null,
  };
}

function cargarLista() {
  const bruto = leerJson(LLAVE_PARTIDAS, []);
  if (!Array.isArray(bruto)) return [];
  return bruto.filter((p) => validarPartida(p) === '').map(sanearPartida);
}

function guardarLista(lista) {
  const ordenada = ordenarPorFinDesc(lista).slice(0, MAX_PARTIDAS); // se descartan las más antiguas por `fin`
  escribirJson(LLAVE_PARTIDAS, ordenada);
  return ordenada;
}

// ---------- API de partidas ----------

/** Guarda (o reemplaza por id) una partida. Devuelve la partida persistida con id. */
export function guardarPartida(partida) {
  if (!partida || typeof partida !== 'object') {
    throw new Error('La partida debe ser un objeto');
  }
  const ahoraIso = new Date().toISOString();
  const completa = {
    ...partida,
    id: esTextoNoVacio(partida.id) ? partida.id : nuevoId(),
    jugador: String(partida.jugador ?? ''),
    semilla: normalizarSemilla(partida.semilla),
    inicio: esTextoNoVacio(partida.inicio) ? partida.inicio : ahoraIso,
    fin: esTextoNoVacio(partida.fin) ? partida.fin : ahoraIso,
    duracionMs: esNumero(partida.duracionMs) ? partida.duracionMs : 0,
    completada: Boolean(partida.completada),
    correctas: esNumero(partida.correctas) ? partida.correctas : 0,
    total: esNumero(partida.total) ? partida.total : 0,
    revisiones: esNumero(partida.revisiones) ? partida.revisiones : 0,
    respuestas: Array.isArray(partida.respuestas) ? partida.respuestas : null,
  };
  const error = validarPartida(completa);
  if (error) throw new Error(`Partida inválida: ${error}`);
  const saneada = sanearPartida(completa);
  const lista = cargarLista().filter((p) => p.id !== saneada.id);
  lista.push(saneada);
  guardarLista(lista);
  return saneada;
}

/** Todas las partidas ordenadas por fin descendente. */
export function listarPartidas() {
  return ordenarPorFinDesc(cargarLista());
}

export function partidasDeSemilla(semilla) {
  const buscada = normalizarSemilla(semilla);
  return listarPartidas().filter((p) => p.semilla === buscada);
}

/** Partida completada con menor duracionMs (de una semilla o global). undefined si no hay. */
export function mejorPartida(semilla) {
  const candidatas = (semilla === undefined || semilla === null || semilla === '')
    ? listarPartidas()
    : partidasDeSemilla(semilla);
  let mejor;
  for (const p of candidatas) {
    if (!p.completada) continue;
    if (!mejor || p.duracionMs < mejor.duracionMs) mejor = p;
  }
  return mejor;
}

export function borrarPartida(id) {
  const lista = cargarLista();
  const filtrada = lista.filter((p) => p.id !== id);
  if (filtrada.length === lista.length) return false;
  guardarLista(filtrada);
  return true;
}

export function borrarTodo() {
  quitar(LLAVE_PARTIDAS);
}

// ---------- partida en curso ----------

export function guardarEnCurso(estado) {
  if (!estado || typeof estado !== 'object') return;
  escribirJson(LLAVE_EN_CURSO, estado);
}

export function cargarEnCurso() {
  const valor = leerJson(LLAVE_EN_CURSO, null);
  return valor && typeof valor === 'object' ? valor : null;
}

export function borrarEnCurso() {
  quitar(LLAVE_EN_CURSO);
}

// ---------- exportar / importar ----------

export function exportarPartidasJson() {
  return JSON.stringify({
    version: 1,
    exportado: new Date().toISOString(),
    partidas: listarPartidas(),
  }, null, 2);
}

/**
 * Importa partidas desde un JSON (el exportado por exportarPartidasJson o un arreglo de partidas).
 * Fusiona por id sin duplicar y devuelve cuántas partidas nuevas se añadieron.
 * Lanza Error (en español) si el texto no es JSON o alguna partida no tiene la forma esperada.
 */
export function importarPartidasJson(texto) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    throw new Error('El archivo está vacío o no es texto');
  }
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es un JSON válido');
  }
  let entrantes;
  if (Array.isArray(datos)) {
    entrantes = datos;
  } else if (datos && typeof datos === 'object' && Array.isArray(datos.partidas)) {
    entrantes = datos.partidas;
  } else {
    throw new Error('El JSON no contiene una lista de partidas');
  }
  entrantes.forEach((p, i) => {
    const error = validarPartida(p);
    if (error) throw new Error(`La partida ${i + 1} no es válida: ${error}`);
  });

  const actuales = cargarLista();
  const ids = new Set(actuales.map((p) => p.id));
  let nuevas = 0;
  for (const p of entrantes) {
    const saneada = sanearPartida(p);
    if (ids.has(saneada.id)) continue;
    ids.add(saneada.id);
    actuales.push(saneada);
    nuevas += 1;
  }
  if (nuevas > 0) guardarLista(actuales);
  return nuevas;
}
