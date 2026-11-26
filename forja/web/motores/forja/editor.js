// Forja · motores · pestaña «Editor» del diálogo de juegos (solo plantillas de los motores anime y voxel).
// Paneles del motor (personajes, combos, hitboxes, biomas, bloques…) + JSON completo validado + «Describe tu juego».
// Los cambios que se pueden aplicar en caliente viajan al juego por postMessage ({ forja: 'config', config }); los
// demás (semilla, modo) reinician la partida. Nada de esto ejecuta código: es JSON validado con el esquema del motor.
import { configDe, guardarConfig, borrarConfig, motorDe } from './config.js';
import { traducir } from './agente.js';
import { validar } from '../nucleo/esquema.js';

const el = (t, a = {}, ...h) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) (k in e && k !== 'list' ? (e[k] = v) : e.setAttribute(k, v)); e.append(...h.flat().filter((x) => x != null)); return e; };

export async function montarEditor(caja, { meta, marco, reiniciar, aviso = () => {} }) {
  const id = meta.id, m = motorDe(id); let config = configDe(id);
  const ed = await import(`../${meta.motor}/editor.js`);
  const nota = el('p', { class: 'nota' }, 'Configuración avanzada de este juego. Los cambios se ven en vivo en el juego de arriba; lo que no se puede cambiar en caliente reinicia la partida. Se guarda en este navegador y viaja en config.json de tu ZIP.');
  const estado = el('p', { class: 'nota', role: 'status' });
  const enVivo = (c) => { try { marco?.contentWindow?.postMessage({ forja: 'config', config: c }, '*'); } catch { /* sin juego abierto */ } };
  const cambiar = (nueva, { reiniciar: r = false } = {}) => {
    const errores = guardarConfig(id, nueva);
    if (errores.length) { estado.textContent = 'No se aplicó: ' + errores.slice(0, 3).join(' · '); return false; }
    config = nueva; estado.textContent = 'Guardado.'; texto.value = JSON.stringify(config, null, 1);
    if (r) reiniciar(); else enVivo(config);
    return true;
  };
  const cont = el('div', { class: 'motor-editor' });
  const pintar = () => cont.replaceChildren(...ed.paneles({ id, config, cambiar, el }).map((p, i) => { const d = el('details', { class: 'algoritmo' }); d.open = i === 0; d.append(el('summary', {}, p.titulo), p.nodo); return d; }));
  // describe tu juego → configuración (traductor determinista, sin LLM en tiempo de juego)
  const desc = el('textarea', { rows: 2, placeholder: meta.motor === 'anime' ? 'Crea un juego de lucha anime con combate rápido, ataques eléctricos, arena nocturna y transformación' : 'Crea un mundo voxel con semilla ANDES-2026, montañas elevadas, lagos, bosques, cuevas y aldeas', 'aria-label': 'Describe tu juego', style: 'width:100%;box-sizing:border-box' });
  const bDesc = el('button', { type: 'button', class: 'btn mini' }, 'Traducir a configuración');
  bDesc.onclick = () => { const r = traducir(desc.value, id); if (!r.ok) { estado.textContent = r.errores.join(' · '); return; } if (cambiar(r.config, { reiniciar: true })) { pintar(); estado.textContent = `Entendido: ${r.entendido.join(', ') || 'nada nuevo'}.`; aviso('Configuración aplicada'); } };
  // JSON completo
  const texto = el('textarea', { rows: 12, spellcheck: false, 'aria-label': 'Configuración en JSON', style: 'width:100%;box-sizing:border-box;font:12px ui-monospace,Menlo,monospace' }); texto.value = JSON.stringify(config, null, 1);
  const bJson = el('button', { type: 'button', class: 'btn mini' }, 'Aplicar JSON');
  bJson.onclick = () => { let v; try { v = JSON.parse(texto.value); } catch (e) { estado.textContent = 'JSON inválido: ' + e.message; return; } const er = validar(v, m.ESQUEMA); if (er.length) { estado.textContent = er.slice(0, 4).join(' · '); return; } if (cambiar(v, { reiniciar: true })) pintar(); };
  const bDef = el('button', { type: 'button', class: 'btn mini' }, 'Volver a los valores de fábrica');
  bDef.onclick = () => { borrarConfig(id); config = configDe(id); texto.value = JSON.stringify(config, null, 1); pintar(); reiniciar(); estado.textContent = 'Valores de fábrica.'; };
  pintar();
  const dJson = el('details', { class: 'algoritmo' }); dJson.append(el('summary', {}, 'Todo en JSON'), texto, el('div', { class: 'chips' }, bJson, bDef));
  const dDesc = el('details', { class: 'algoritmo' }); dDesc.open = true; dDesc.append(el('summary', {}, 'Describe tu juego'), desc, el('div', { class: 'chips' }, bDesc));
  caja.replaceChildren(nota, dDesc, cont, dJson, estado);
}
