// Forja · motores · integración con agentes de IA (§37). Un agente (o el alumno) describe el juego con palabras o con
// una especificación JSON; aquí se TRADUCE a la configuración del motor con un léxico determinista y se valida con el
// esquema. El juego corre luego solo con esa configuración: ninguna consulta a un LLM mientras se juega.
//   traducir('Crea un mundo voxel con semilla ANDES-2026, montañas elevadas, lagos, bosques, cuevas y aldeas')
//   → { ok, plantilla: 'mundo-voxel', config, entendido: [...] }
// También acepta JSON: { "plantilla": "duelo-anime", "config": { … } } (validado; nunca evaluado).
import * as anime from '../anime/agente.js';
import * as voxel from '../voxel/agente.js';
import { configDe, motorDe, PLANTILLAS } from './config.js';
import { validar, conDefectos } from '../nucleo/esquema.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function plantillaDeTexto(t, actual) {
  const n = norm(t);
  if (/\b(jefe|titan|coloso|boss|gigante)\b/.test(n)) return 'jefe-titan';
  if (/\b(lucha|pelea|combate|duelo|anime|guerrero|luchador)/.test(n)) return 'duelo-anime';
  if (/\b(superviv|hambre|sobrevivir)/.test(n)) return 'supervivencia-voxel';
  if (/\b(creativo|construir libre|volar|sin limites)/.test(n)) return 'creativo-voxel';
  if (/\b(aventura|mision|mazmorra|ruina|reino)/.test(n)) return 'aventura-voxel';
  if (/\b(voxel|bloques|mundo|semilla|bioma|explora)/.test(n)) return 'mundo-voxel';
  return actual && PLANTILLAS[actual] ? actual : null;
}
export function traducir(entrada, actual = null) {
  let espec = null;
  if (typeof entrada === 'object' && entrada) espec = entrada;
  else if (/^\s*\{/.test(entrada || '')) { try { espec = JSON.parse(entrada); } catch (e) { return { ok: false, errores: ['JSON inválido: ' + e.message] }; } }
  if (espec) {
    const id = espec.plantilla || actual; const m = motorDe(id); if (!m) return { ok: false, errores: [`plantilla desconocida: ${id}`] };
    const errores = validar(espec.config || {}, m.ESQUEMA); if (errores.length) return { ok: false, errores };
    return { ok: true, plantilla: id, config: conDefectos({ ...configDe(id), ...espec.config }, m.ESQUEMA), entendido: ['especificación JSON'] };
  }
  const id = plantillaDeTexto(entrada, actual);
  if (!id) return { ok: false, errores: ['No reconocí el tipo de juego: di «lucha», «jefe», «mundo voxel», «supervivencia», «creativo» o «aventura».'] };
  const mot = PLANTILLAS[id] === 'anime' ? anime : voxel, m = motorDe(id);
  const r = mot.traducir(norm(entrada), structuredClone(configDe(id)), id, String(entrada || ''));
  const errores = validar(r.config, m.ESQUEMA);
  return errores.length ? { ok: false, errores } : { ok: true, plantilla: id, config: r.config, entendido: r.entendido };
}
