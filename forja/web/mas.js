// Forja · lo que convierte el editor en estudio: mis personajes y elenco, pista jugable, galería de la clase,
// proyecto Phaser en ZIP, video, modelo GLB y sonidos. Recibe de app.js una API mínima del estado.
import { resolver, sorpresa, PARAMS_BASE } from './motor/resolver.js';
import { miniatura, hojaSprites, hojaObjetos } from './motor/sprites.js';
import { generarEscenario } from './motor/escenario.js';
import { banco, sonar } from './motor/sonido.js';
import { crearPista } from './motor/pista.js';
import { zipProyecto, grabarVideo, modeloGLB } from './motor/exportar.js';
import { zip, pngDeLienzo } from './motor/zip.js';

export function iniciarMas(A) {
  const { R, $, el, aviso, bajar } = A;
  const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const lee = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const fichaDe = (e) => resolver(R, e.familia, e.variante, e.params, e.semilla);
  const copiaEstado = () => JSON.parse(JSON.stringify(A.estado()));
  const ocupado = async (boton, fn) => { const t = boton.textContent; boton.disabled = true; boton.textContent = 'Preparando…'; await new Promise((ok) => setTimeout(ok, 30)); try { await fn(); } catch (e) { console.error(e); aviso('No se pudo: ' + e.message); } boton.disabled = false; boton.textContent = t; };
  // el villano de la pista: otro personaje de las mismas reglas, en versión sombría
  const villano = (semilla) => { const s = sorpresa(R, semilla * 7 + 999, { variante: 'sombra' }); return fichaDe({ ...s, params: { ...PARAMS_BASE, ...s.params, expresion: 'enojado' } }); };
  let hora = 'dia', semillaNivel = 1;
  function paquete(px = 128) {
    const spec = A.spec(), malo = villano(spec.semilla);
    return { spec, hoja: hojaSprites(spec, R, px), enemigo: { spec: malo, hoja: hojaSprites(malo, R, px) }, objetos: hojaObjetos(R, spec.variante, 64),
      escenario: generarEscenario(R, spec.params.fondo, hora, semillaNivel), sonidos: banco(R, spec), semilla: semillaNivel, estado: copiaEstado(), enlace: A.enlace() };
  }

  // ---------------------------------------------------------------- mis personajes y elenco
  let mios = lee('forja.mios', []);
  const cuenta = () => { $('nMios').textContent = mios.length ? `(${mios.length})` : ''; };
  function pintarMios() {
    const caja = $('mios');
    if (!mios.length) { caja.replaceChildren(el('p', { class: 'nota' }, 'Aún no guardas ninguno. Usa «Guardar» cuando un personaje te guste.')); return; }
    caja.replaceChildren(...mios.map((m, i) => {
      const t = el('div', { class: 'tarjeta' }), img = el('button', { type: 'button', class: 'foto', 'aria-label': `Abrir ${m.nombre}` });
      setTimeout(() => { img.style.backgroundImage = `url(${miniatura(fichaDe(m.e), 140)})`; }, 30 * i);
      img.onclick = () => { A.cargar(m.e); $('dMios').close(); };
      const nom = el('input', { value: m.nombre, maxlength: 40, 'aria-label': 'Nombre' }); nom.onchange = () => { m.nombre = nom.value.trim() || 'Sin nombre'; guarda('forja.mios', mios); };
      const fila = el('div', { class: 'fila' });
      const est = el('button', { type: 'button', class: 'btn mini', 'aria-pressed': String(!!m.elenco), title: 'En mi elenco' }, m.elenco ? '★ Elenco' : '☆ Elenco'); est.onclick = () => { m.elenco = !m.elenco; guarda('forja.mios', mios); pintarMios(); };
      const bo = el('button', { type: 'button', class: 'btn mini peligro', 'aria-label': `Borrar ${m.nombre}` }, 'Borrar'); bo.onclick = () => { if (bo.dataset.seguro) { mios.splice(i, 1); guarda('forja.mios', mios); cuenta(); pintarMios(); } else { bo.dataset.seguro = 1; bo.textContent = '¿Seguro?'; setTimeout(() => { delete bo.dataset.seguro; bo.textContent = 'Borrar'; }, 2500); } };
      fila.append(est, bo); t.append(img, nom, fila); return t;
    }));
  }
  $('bGuardar').onclick = () => {
    const e = copiaEstado(), j = JSON.stringify(e);
    if (mios.some((m) => JSON.stringify(m.e) === j)) return aviso('Ya estaba guardado');
    mios.unshift({ nombre: A.spec().nombre, e, elenco: false, t: Date.now() });
    if (!guarda('forja.mios', mios)) { mios.shift(); return aviso('No hay espacio en este navegador'); }
    cuenta(); aviso('Guardado en Mis personajes');
  };
  $('bMios').onclick = () => { pintarMios(); $('dMios').showModal(); };
  $('bElenco').onclick = (ev) => ocupado(ev.currentTarget, async () => {
    const elenco = mios.filter((m) => m.elenco); if (!elenco.length) throw new Error('marca al menos uno con ★');
    const archivos = [], indice = [];
    for (const [i, m] of elenco.entries()) {
      const spec = fichaDe(m.e), h = hojaSprites(spec, R, 128), clave = `${String(i + 1).padStart(2, '0')}_${h.clave}`;
      h.atlas.meta.image = `${clave}.png`;
      archivos.push({ nombre: `elenco/${clave}.png`, datos: await pngDeLienzo(h.hoja) }, { nombre: `elenco/${clave}.json`, datos: JSON.stringify(h.atlas) });
      indice.push({ clave, nombre: m.nombre, tipo: spec.nombre, fisica: spec.fisica, animaciones: h.animaciones, px: h.px, estado: m.e });
    }
    const ob = hojaObjetos(R, elenco[0].e.variante, 64);
    archivos.push({ nombre: 'elenco/objetos.png', datos: await pngDeLienzo(ob.hoja) }, { nombre: 'elenco/objetos.json', datos: JSON.stringify(ob.atlas) }, { nombre: 'elenco/elenco.json', datos: JSON.stringify(indice, null, 1) });
    bajar('elenco-forja.zip', zip(archivos)); aviso(`Elenco de ${elenco.length} descargado`);
  });
  $('bRespaldo').onclick = () => bajar('mis-personajes-forja.json', new Blob([JSON.stringify(mios)], { type: 'application/json' }));
  $('iRespaldo').onchange = async (ev) => {
    try {
      const nuevos = JSON.parse(await ev.target.files[0].text()).filter((m) => m && m.e && R.T.tipo[`${m.e.familia}|${m.e.variante}`]).map((m) => ({ nombre: String(m.nombre || 'Sin nombre').slice(0, 40), e: { familia: m.e.familia, variante: m.e.variante, semilla: +m.e.semilla || 1, params: { ...PARAMS_BASE, ...Object.fromEntries(Object.entries(m.e.params || {}).filter(([k]) => k in PARAMS_BASE)) } }, elenco: !!m.elenco, t: Date.now() }));
      const ya = new Set(mios.map((m) => JSON.stringify(m.e))); mios.push(...nuevos.filter((m) => !ya.has(JSON.stringify(m.e)))); guarda('forja.mios', mios); cuenta(); pintarMios(); aviso(`${nuevos.length} importados`);
    } catch { aviso('Ese archivo no es un respaldo de Forja'); }
    ev.target.value = '';
  };
  cuenta();

  // ---------------------------------------------------------------- pista jugable
  let pista = null;
  function arrancarPista() {
    pista?.detener();
    const d = paquete(128);
    pista = crearPista($('pista'), { ...d, alRepetir: arrancarPista });
    A.chips($('horas'), A.lista(R.meta.horas), hora, (id) => { hora = id; arrancarPista(); });
    $('pista').focus();
  }
  $('bProbar').onclick = (ev) => ocupado(ev.currentTarget, async () => { $('dPista').showModal(); arrancarPista(); });
  $('bOtroNivel').onclick = () => { semillaNivel++; arrancarPista(); };
  $('dPista').addEventListener('close', () => { pista?.detener(); pista = null; });
  for (const b of $('tactil').querySelectorAll('button')) {
    const pon = (v) => (e) => { e.preventDefault(); pista?.tecla(b.dataset.k, v); };
    b.addEventListener('pointerdown', pon(true)); b.addEventListener('pointerup', pon(false)); b.addEventListener('pointerleave', pon(false)); b.addEventListener('pointercancel', pon(false));
  }
  window.__forjaPista = () => pista; // para las pruebas automáticas

  // ---------------------------------------------------------------- exportación completa
  $('bZip').onclick = (ev) => ocupado(ev.currentTarget, async () => { const d = paquete(128); bajar(`${d.hoja.clave}-phaser.zip`, await zipProyecto(d)); aviso('Proyecto Phaser descargado'); });
  $('bVideo').onclick = (ev) => ocupado(ev.currentTarget, async () => {
    const antes = A.control.autoRotate; A.control.autoRotate = true;
    const f = A.COL_FONDO[A.estado().params.fondo] || '#3a2f6b';
    const { blob, ext } = await grabarVideo(A.lienzo, A.spec().nombre, [f, '#14111c']).finally(() => { A.control.autoRotate = antes; });
    bajar(`${A.spec().id.replace('|', '_')}.${ext}`, blob); aviso(ext === 'mp4' ? 'Video MP4 descargado' : 'Video WebM descargado');
  });
  $('bGlb').onclick = (ev) => ocupado(ev.currentTarget, async () => { bajar(`${A.spec().id.replace('|', '_')}.glb`, await modeloGLB(A.pj().raiz)); aviso('Modelo GLB descargado'); });
  $('bExportar').addEventListener('click', () => {
    const b = banco(R, A.spec());
    $('sonidos').replaceChildren(...Object.keys(b).map((n) => { const x = el('button', { type: 'button', class: 'chip' }, `♪ ${n}`); x.onclick = () => sonar(b[n], 0.5); return x; }));
  });

  // ---------------------------------------------------------------- galería de la clase
  let quien = lee('forja.quien', null); if (!quien) { quien = Math.random().toString(36).slice(2) + Date.now().toString(36); guarda('forja.quien', quien); }
  let sala = lee('forja.sala', ''), reloj = null, misVotos = new Set(lee('forja.votos', []));
  const q = new URLSearchParams(location.search); if (q.get('sala')) sala = q.get('sala').toLowerCase();
  $('sala').value = sala; $('autor').value = lee('forja.autor', '');
  const salaLimpia = () => $('sala').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 24);
  async function cargarGaleria() {
    if (!sala) return;
    let d; try { d = await (await fetch(`api/galeria?sala=${encodeURIComponent(sala)}`)).json(); } catch { $('notaGaleria').textContent = 'Sin conexión con la galería.'; return; }
    if (!d.items) { $('notaGaleria').textContent = d.error || 'No se pudo abrir la sala.'; return; }
    $('notaGaleria').textContent = d.items.length ? `Sala ${sala}: ${d.items.length} personajes. El orden es por votos.` : `Sala ${sala}: aún vacía. ¡Publica el primero!`;
    const caja = $('galeria'), firma = d.items.map((i) => i.id + i.votos).join();
    if (caja.dataset.firma === firma) return; caja.dataset.firma = firma;
    caja.replaceChildren(...d.items.map((it, i) => {
      const e = { familia: it.e[0], variante: it.e[1], semilla: it.e[2], params: { ...PARAMS_BASE, ...it.e[3] } };
      const t = el('div', { class: 'tarjeta' }), img = el('button', { type: 'button', class: 'foto', 'aria-label': `Abrir ${it.nombre} de ${it.autor}` });
      if (i < 3) img.append(el('span', { class: 'puesto' }, `#${i + 1}`));
      setTimeout(() => { try { img.style.backgroundImage = `url(${miniatura(fichaDe(e), 140)})`; } catch { /* estado raro: sin foto */ } }, 25 * i);
      img.onclick = () => { A.cargar(e); $('dGaleria').close(); };
      const voto = el('button', { type: 'button', class: 'btn mini', 'aria-pressed': String(misVotos.has(it.id)) }, `♥ ${it.votos}`);
      voto.onclick = async () => { try { const r = await (await fetch('api/galeria/voto', { method: 'POST', body: JSON.stringify({ id: it.id, quien }) })).json(); r.mio ? misVotos.add(it.id) : misVotos.delete(it.id); guarda('forja.votos', [...misVotos]); caja.dataset.firma = ''; cargarGaleria(); } catch { aviso('No se pudo votar'); } };
      const pie = el('div', { class: 'fila' }); pie.append(el('span', { class: 'autor' }, it.autor), voto);
      t.append(img, el('b', {}, it.nombre), pie); return t;
    }));
  }
  function entrar() { sala = salaLimpia(); $('sala').value = sala; guarda('forja.sala', sala); guarda('forja.autor', $('autor').value.trim()); $('galeria').dataset.firma = ''; cargarGaleria(); }
  $('fSala').onsubmit = (e) => { e.preventDefault(); if (salaLimpia().length < 2) return aviso('Escribe el código de la sala'); entrar(); };
  $('bPublicar').onclick = async () => {
    const autor = $('autor').value.trim(); if (salaLimpia().length < 2 || autor.length < 2) return aviso('Escribe la sala y tu nombre');
    entrar(); const E = A.estado();
    try {
      const r = await fetch('api/galeria', { method: 'POST', body: JSON.stringify({ sala, autor, quien, nombre: A.spec().nombre, e: [E.familia, E.variante, E.semilla, E.params] }) }), d = await r.json();
      aviso(r.ok ? (d.repetido ? 'Ya lo habías publicado' : '¡Publicado en la galería!') : d.error || 'No se pudo publicar'); cargarGaleria();
    } catch { aviso('Sin conexión con la galería'); }
  };
  $('bGaleria').onclick = () => { $('dGaleria').showModal(); cargarGaleria(); clearInterval(reloj); reloj = setInterval(cargarGaleria, 6000); };
  $('dGaleria').addEventListener('close', () => clearInterval(reloj));
  if (q.get('sala')) setTimeout(() => $('bGaleria').click(), 600);
}
