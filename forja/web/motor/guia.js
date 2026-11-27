// Forja · «Tu juego»: la guía de primeros pasos. Reemplaza al recorrido automático de 9 tarjetas.
// Por qué así (investigación del 26-11-2026):
//  - un tour que arranca solo se salta y se olvida; la ayuda que el usuario pide rinde más (NN/g, «onboarding tutorials»);
//  - se aprende haciendo, no leyendo (Andersen et al., CHI 2012): cada paso es UNA acción con UN botón;
//  - lista corta con avance real (Nunes y Drèze, 2006, progreso dotado: solo se marca lo que de verdad está hecho);
//  - primero un juego que funciona, luego las capas (Roblox, GDevelop, Mario Maker: editar → probar);
//  - al volver se muestra «te falta 1 paso» (Ovsiankina: retomar lo inacabado).
// Los pasos se marcan solos mirando lo que pasa en la Forja; nada se marca por pulsar «siguiente».
const CLAVE = 'forja.guia';
export const PASOS = [
  { id: 'personaje', titulo: 'Elige tu personaje', pista: 'Toca una familia del catálogo o escribe una frase arriba.', boton: 'Ver catálogo' },
  { id: 'juego', titulo: 'Elige tu juego', pista: 'Plataformas, fútbol, laberinto o carrera: tu personaje entra solo.', boton: 'Elegir juego' },
  { id: 'jugar', titulo: 'Juégalo', pista: 'Juega medio minuto. Lo que juegas es el código que te llevas.', boton: 'Jugar' },
  { id: 'ajustar', titulo: 'Cambia un número', pista: 'Mueve un deslizador del cuerpo: cambia cómo salta y corre en el juego.', boton: 'Ajustar cuerpo' },
  { id: 'guardar', titulo: 'Guárdalo', pista: 'En tu aula (lo abres en el Visor) o en un ZIP.', boton: 'Guardar' },
];

export function crearGuia({ el, acciones, alTerminar = () => {} }) {
  // plegada: solo la cabecera · cerrada: oculta del todo (se vuelve a abrir desde la ayuda «?» → «Ver Tu juego»)
  let hecho = {}, plegada = false, cerrada = false;
  try { const g = JSON.parse(localStorage.getItem(CLAVE) || '{}'); hecho = g.hecho || {}; plegada = !!g.plegada; cerrada = !!g.cerrada; } catch { /* sin almacenamiento */ }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify({ hecho, plegada, cerrada })); } catch { /* nada */ } };
  const caja = el('aside', { class: 'guia', 'aria-label': 'Tu juego: primeros pasos' });
  document.body.append(caja);
  const cuantos = () => PASOS.filter((p) => hecho[p.id]).length;
  function pintar() {
    const n = cuantos(), sig = PASOS.find((p) => !hecho[p.id]);
    caja.hidden = cerrada; caja.classList.toggle('plegada', plegada); caja.classList.toggle('lista', !sig);
    const cab = el('button', { type: 'button', class: 'guia-cab', 'aria-expanded': String(!plegada) });
    cab.append(el('b', {}, sig ? 'Tu juego' : '¡Tu juego está listo!'), el('span', { class: 'guia-n' }, `${n} de ${PASOS.length}`));
    const barra = el('i', { class: 'guia-barra', style: `--p:${n / PASOS.length}` }); cab.append(barra);
    cab.onclick = () => { plegada = !plegada; guardar(); pintar(); };
    const x = el('button', { type: 'button', class: 'guia-cerrar', 'aria-label': 'Cerrar «Tu juego»', title: 'Cerrar (vuelve con la ayuda «?»)' }, '✕');
    x.onclick = () => { cerrada = true; guardar(); pintar(); };
    const lista = el('ol', { class: 'guia-pasos' });
    for (const p of PASOS) {
      const li = el('li', { class: hecho[p.id] ? 'hecho' : p === sig ? 'ahora' : '' });
      li.append(el('span', { class: 'guia-marca', 'aria-hidden': 'true' }, hecho[p.id] ? '✓' : String(PASOS.indexOf(p) + 1)), el('b', {}, p.titulo));
      if (p === sig) {
        li.append(el('p', {}, p.pista));
        const b = el('button', { type: 'button', class: 'btn mini primario' }, p.boton); b.onclick = () => acciones[p.id]?.(); li.append(b);
      }
      lista.append(li);
    }
    const pie = el('p', { class: 'guia-pie' });
    if (!sig) {
      pie.append('Ahora: cambia la regla del rival, prueba otra plantilla o publica en la galería de tu clase. ');
      const listo = el('button', { type: 'button', class: 'btn mini' }, 'Listo, cerrar'); listo.onclick = () => { cerrada = true; guardar(); pintar(); }; pie.append(listo);
    }
    caja.replaceChildren(cab, x, ...(plegada ? [] : [lista, pie]));
  }
  function marcar(id) {
    if (hecho[id] || !PASOS.some((p) => p.id === id)) return;
    hecho[id] = Date.now(); guardar(); pintar();
    caja.classList.remove('festeja'); void caja.offsetWidth; caja.classList.add('festeja');
    if (!PASOS.some((p) => !hecho[p.id])) { alTerminar(); setTimeout(() => { plegada = true; guardar(); pintar(); }, 8000); }   // celebrada, se pliega sola
  }
  function reiniciar() { hecho = {}; plegada = false; cerrada = false; guardar(); pintar(); }
  function mostrar() { cerrada = false; plegada = false; guardar(); pintar(); }
  pintar();
  return { marcar, reiniciar, mostrar, hecho: () => ({ ...hecho }), caja };
}
