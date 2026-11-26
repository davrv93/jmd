// Forja · motores · configuración avanzada de cada plantilla (la que edita la pestaña «Editor» del diálogo de juegos).
// Se guarda en el navegador del alumno (localStorage «forja.motores.config») y viaja en DATOS.config y config.json.
// Siempre se valida con el esquema del motor: lo que no pasa, no entra (y el juego vuelve a validarlo al arrancar).
import * as anime from '../anime/config.js';
import * as voxel from '../voxel/config.js';
import { validar, conDefectos } from '../nucleo/esquema.js';

export const MOTORES = { anime, voxel };
export const PLANTILLAS = { 'duelo-anime': 'anime', 'jefe-titan': 'anime', 'mundo-voxel': 'voxel', 'supervivencia-voxel': 'voxel', 'creativo-voxel': 'voxel', 'aventura-voxel': 'voxel' };
const CLAVE = 'forja.motores.config';
const leer = () => { try { return JSON.parse(globalThis.localStorage?.getItem(CLAVE) || '{}') || {}; } catch { return {}; } };

export const motorDe = (id) => MOTORES[PLANTILLAS[id]] || null;
export function configDe(id) {
  const m = motorDe(id); if (!m) return null;
  const g = leer()[id];
  if (g && !validar(g, m.ESQUEMA).length) return conDefectos(g, m.ESQUEMA);
  return m.defecto(id);
}
export function guardarConfig(id, cfg) {
  const m = motorDe(id); if (!m) return ['plantilla sin motor'];
  const errores = validar(cfg, m.ESQUEMA); if (errores.length) return errores;
  const todo = leer(); todo[id] = cfg;
  try { globalThis.localStorage?.setItem(CLAVE, JSON.stringify(todo)); } catch { return ['no hay espacio en este navegador']; }
  return [];
}
export function borrarConfig(id) { const todo = leer(); delete todo[id]; try { globalThis.localStorage?.setItem(CLAVE, JSON.stringify(todo)); } catch { /* nada */ } }
