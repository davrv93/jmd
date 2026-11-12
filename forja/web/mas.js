// Forja · lo que convierte el editor en estudio: mis personajes y elenco, pista jugable, galería de la clase,
// proyecto Phaser en ZIP, video, modelo GLB y sonidos. Recibe de app.js una API mínima del estado.
import { resolver, sorpresa, PARAMS_BASE } from './motor/resolver.js';
import { miniatura, hojaSprites, hojaObjetos } from './motor/sprites.js';
import { generarEscenario } from './motor/escenario.js';
import { banco, sonar } from './motor/sonido.js';
import { zipProyecto, armarProyecto, paginaEnMemoria, plantillas, extracto, grabarVideo, modeloGLB } from './motor/exportar.js';
import { zip, pngDeLienzo } from './motor/zip.js';
import { gif } from './motor/gif.js';

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

  // ---------------------------------------------------------------- comparar lado a lado
  let fijo = null;
  $('bFijar').onclick = () => {
    const caja = $('fijado');
    if (fijo && JSON.stringify(fijo) === JSON.stringify(A.estado())) { fijo = null; caja.hidden = true; return; }
    fijo = copiaEstado(); caja.hidden = false; caja.style.backgroundImage = `url(${miniatura(A.spec(), 260)})`; caja.firstChild.textContent = A.spec().nombre; aviso('Fijado: cambia algo y compáralo');
  };
  $('fijado').onclick = () => { if (!fijo) return; const actual = copiaEstado(), antes = fijo; fijo = actual; const sp = A.spec(); $('fijado').style.backgroundImage = `url(${miniatura(sp, 260)})`; $('fijado').firstChild.textContent = sp.nombre; A.cargar(antes); };

  // ---------------------------------------------------------------- plantillas de juego (el mismo código que se exporta, corriendo aquí)
  let plantilla = lee('forja.plantilla', 'plataformas'), enMemoria = null, vista = 'algoritmos', PL = [];
  const marco = $('marcoJuego');
  async function arrancarJuego() {
    PL = PL.length ? PL : await plantillas();
    const meta = PL.find((p) => p.id === plantilla) || PL[0]; plantilla = meta.id; guarda('forja.plantilla', plantilla);
    const proyecto = await armarProyecto(paquete(128), plantilla);
    enMemoria?.liberar(); enMemoria = paginaEnMemoria(proyecto); marco.srcdoc = enMemoria.html;
    marco.onload = () => marco.contentWindow?.focus();
    $('plantillas').replaceChildren(...PL.map((p) => { const b = el('button', { type: 'button', role: 'tab', 'aria-selected': String(p.id === plantilla), class: 'plantilla' }); b.append(el('b', {}, p.nombre), el('span', {}, p.lema)); b.onclick = () => { plantilla = p.id; arrancarJuego(); }; return b; }));
    $('controlesJuego').textContent = meta.controles;
    A.chips($('horas'), A.lista(R.meta.horas), hora, (id) => { hora = id; arrancarJuego(); });
    explicar(meta, proyecto);
  }
  function explicar(meta, proyecto) {
    const caja = $('explica');
    for (const b of $('pExplica').children) { b.setAttribute('aria-selected', String(b.dataset.v === vista)); b.onclick = () => { vista = b.dataset.v; explicar(meta, proyecto); }; }
    if (vista === 'algoritmos') {
      caja.replaceChildren(el('p', { class: 'nota' }, 'Cada tarjeta es un trozo real de juego.js. En el juego pulsa V (rayos X) para ver lo que el código «piensa».'), ...meta.algoritmos.map((a, i) => {
        const d = el('details', { class: 'algoritmo' }); d.open = i === 0;
        d.append(el('summary', {}, a.nombre), el('p', {}, a.idea), el('pre', {}, extracto(proyecto.juego, a.id) || '(sin extracto)'), el('p', { class: 'prueba' }, 'Pruébalo: ' + a.prueba)); return d;
      }));
    } else {
      const kb = (a) => `${Math.max(1, Math.round((a.datos.length ?? a.datos.byteLength) / 1024))} KB`;
      const QUE = { 'heroe.png': 'Hoja de sprites de tu personaje: todas las animaciones en una sola imagen.', 'enemigo.png': 'Hoja de sprites del rival: otro personaje de las mismas reglas.', 'objetos.png': 'Monedas, gemas, bombas… 6 cuadros por objeto.', 'cielo.png': 'Fondo fijo.', 'capa0.png': 'Capa lejana: se mueve muy lento.', 'capa1.png': 'Capa media.', 'capa2.png': 'Capa cercana: se mueve más rápido. Eso es el paralaje.', 'suelo.png': 'Loseta de 64 px que se repite.', 'relleno.png': 'Loseta de muro.', 'plat_izq.png': 'Plataforma: borde izquierdo.', 'plat_cen.png': 'Plataforma: centro (se repite).', 'plat_der.png': 'Plataforma: borde derecho.' };
      const filas = proyecto.archivos.filter((a) => a.lienzo).map((a) => {
        const f = el('div', { class: 'recurso' }), n = a.nombre.slice(7), h = n === 'heroe.png' ? proyecto.DATOS.heroe : null;
        const img = el('img', { alt: '', loading: 'lazy' }); img.src = a.lienzo.toDataURL('image/png');
        const t = el('div'); t.append(el('b', {}, `${n} · ${a.lienzo.width}×${a.lienzo.height} · ${kb(a)}`), el('span', {}, (QUE[n] || '') + (h ? ` ${h.animaciones.reduce((s2, x) => s2 + x.cuadros, 0)} cuadros de ${h.px} px en ${h.animaciones.length} filas.` : '')));
        f.append(img, t); return f;
      });
      const son = el('div', { class: 'chips' }); for (const a of proyecto.archivos.filter((x) => x.muestras)) { const b = el('button', { type: 'button', class: 'chip' }, `♪ ${a.nombre.split('/').pop()} · ${kb(a)}`); b.onclick = () => sonar(a.muestras, 0.5); son.append(b); }
      const atlas = JSON.parse(proyecto.archivos.find((a) => a.nombre === 'assets/heroe.json').datos), primero = Object.entries(atlas.frames)[0];
      caja.replaceChildren(el('p', { class: 'nota' }, 'Esto es todo lo que el juego carga. Ninguna imagen se dibujó a mano ni con IA generativa: salen de las reglas.'), ...filas,
        el('div', { class: 'grupo-t' }, 'El atlas (heroe.json) dice dónde está cada cuadro'), el('pre', {}, `"${primero[0]}": ${JSON.stringify(primero[1].frame)}\n… ${Object.keys(atlas.frames).length} cuadros en total`),
        el('div', { class: 'grupo-t' }, 'Sonidos: ondas calculadas, no grabaciones'), son,
        el('div', { class: 'grupo-t' }, 'datos.js: los números de tu personaje'), el('pre', {}, proyecto.datosJS.split('\n').slice(0, 26).join('\n') + '\n…'));
    }
  }
  $('bProbar').onclick = (ev) => ocupado(ev.currentTarget, async () => { $('dPista').showModal(); await arrancarJuego(); });
  $('bOtroNivel').onclick = () => { semillaNivel++; arrancarJuego(); };
  $('bReiniciarJuego').onclick = () => { marco.srcdoc = enMemoria.html; };
  $('bZipJuego').onclick = (ev) => ocupado(ev.currentTarget, async () => { const { blob, carpeta } = await zipProyecto(paquete(128), plantilla); bajar(`${carpeta}.zip`, blob); aviso('Proyecto descargado'); });
  $('dPista').addEventListener('close', () => { marco.srcdoc = ''; enMemoria?.liberar(); enMemoria = null; });
  window.__forjaJuego = () => marco.contentWindow; // para las pruebas automáticas

  // ---------------------------------------------------------------- exportación completa
  $('bZip').onclick = (ev) => ocupado(ev.currentTarget, async () => { const { blob, carpeta } = await zipProyecto(paquete(128), plantilla); bajar(`${carpeta}.zip`, blob); aviso('Proyecto Phaser descargado'); });
  $('bVideo').onclick = (ev) => ocupado(ev.currentTarget, async () => {
    const antes = A.control.autoRotate; A.control.autoRotate = true;
    const f = A.COL_FONDO[A.estado().params.fondo] || '#3a2f6b';
    const { blob, ext } = await grabarVideo(A.lienzo, A.spec().nombre, [f, '#14111c']).finally(() => { A.control.autoRotate = antes; });
    bajar(`${A.spec().id.replace('|', '_')}.${ext}`, blob); aviso(ext === 'mp4' ? 'Video MP4 descargado' : 'Video WebM descargado');
  });
  $('bGif').onclick = (ev) => ocupado(ev.currentTarget, async () => { // una vuelta completa en 36 cuadros de 320 px
    const antes = A.control.autoRotate, c = document.createElement('canvas'); c.width = c.height = 320; const x = c.getContext('2d', { willReadFrequently: true }), cuadros = [];
    A.control.autoRotate = true; const vel = A.control.autoRotateSpeed; A.control.autoRotateSpeed = 20; // 20 = una vuelta cada 3 s a 60 cuadros por segundo
    const fondo = A.COL_FONDO[A.estado().params.fondo] || '#3a2f6b';
    try {
      for (let i = 0; i < 36; i++) {
        for (let k = 0; k < 5; k++) await new Promise((ok) => requestAnimationFrame(ok));
        const w = A.lienzo.width, h = A.lienzo.height, lado = Math.min(w, h);
        x.fillStyle = fondo; x.fillRect(0, 0, 320, 320); x.drawImage(A.lienzo, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 0, 320, 320);
        cuadros.push(x.getImageData(0, 0, 320, 320));
      }
    } finally { A.control.autoRotate = antes; A.control.autoRotateSpeed = vel; }
    bajar(`${A.spec().id.replace('|', '_')}.gif`, gif(cuadros, 8)); aviso('GIF descargado');
  });
  $('bGlb').onclick = (ev) => ocupado(ev.currentTarget, async () => { bajar(`${A.spec().id.replace('|', '_')}.glb`, await modeloGLB(A.pj().raiz)); aviso('Modelo GLB descargado'); });
  $('bExportar').addEventListener('click', () => {
    const b = banco(R, A.spec());
    plantillas().then((ps) => A.chips($('zipPlantilla'), ps.map((p) => ({ id: p.id, nombre: p.nombre })), plantilla, function elegir(id) { plantilla = id; guarda('forja.plantilla', id); A.chips($('zipPlantilla'), ps.map((p) => ({ id: p.id, nombre: p.nombre })), plantilla, elegir); }));
    $('sonidos').replaceChildren(...Object.keys(b).map((n) => { const x = el('button', { type: 'button', class: 'chip' }, `♪ ${n}`); x.onclick = () => sonar(b[n], 0.5); return x; }));
  });

  // ---------------------------------------------------------------- galería de la clase
  let quien = lee('forja.quien', null); if (!quien) { quien = Math.random().toString(36).slice(2) + Date.now().toString(36); guarda('forja.quien', quien); }
  let sala = lee('forja.sala', ''), reloj = null, misVotos = new Set(lee('forja.votos', []));
  const q = new URLSearchParams(location.search); if (q.get('sala')) sala = q.get('sala').toLowerCase();
  if (q.get('clase')) { sala = q.get('clase').toLowerCase(); guarda('forja.sala', sala); } // ?clase=rsg-01 deja la sala lista sin abrir la galería (escena LIVE)
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
  const entrarSala = () => { if (salaLimpia().length < 2) return aviso('Escribe el código de la sala'); entrar(); };
  $('bEntrar').onclick = entrarSala; $('sala').onkeydown = $('autor').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); entrarSala(); } };
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

  // ---------------------------------------------------------------- recorrido inicial: qué es cada parte y qué algoritmo hay detrás
  const PASOS = [
    { titulo: 'Bienvenido a Forja', texto: 'Aquí diseñas un personaje y lo conviertes en un videojuego. Nada lo dibuja una IA generativa: todo sale de reglas que puedes leer. Este recorrido te muestra cada parte y la idea de programación que hay detrás.' },
    { sel: '.describe', titulo: '1 · Describe', idea: 'Algoritmo: buscar por significado', texto: 'Escribes en español. Primero se buscan palabras conocidas («michi» → gato). Si no hay ninguna, un modelo pequeño que corre aquí mismo convierte tu frase en una lista de 384 números y elige la familia cuyos números se parecen más (similitud del coseno).' },
    { sel: '#cajon', antes: () => A.abrir('catalogo'), titulo: '2 · Catálogo', idea: 'Idea: combinar tablas', texto: `${R.meta.familias.length} familias × ${R.meta.variantes.length} variantes = ${R.meta.tipos} tipos. No hay ${R.meta.tipos} dibujos guardados: hay dos tablas que se combinan. Así pocas reglas escritas producen ${R.meta.total.toLocaleString('es-PE')} reglas concretas.` },
    { sel: '#cajon', antes: () => A.abrir('cuerpo'), titulo: '3 · Ajustes', idea: 'Algoritmo: interpolar', texto: 'Cada deslizador va de 0 a 1. Las reglas solo guardan 5 valores (muy bajo… muy alto); para lo que queda en medio se calcula el punto intermedio. El muelle de la izquierda abre una herramienta a la vez; en «Reglas» ves cuáles se aplicaron a tu personaje.' },
    { sel: '#escenario', titulo: '4 · El personaje', idea: 'Recurso: un modelo 3D hecho de piezas', texto: 'Tu personaje se arma con esferas, cápsulas y conos, como plastilina. Arrástralo para girarlo. Guardar su «semilla» basta para volver a crearlo idéntico.' },
    { sel: '#animaciones', titulo: '5 · Animaciones', idea: 'Idea: líneas de tiempo', texto: 'Cada animación es una línea de tiempo: «en el instante 0,18 estírate; en el 0,5 estás arriba». Antes de saltar se agacha (anticipación) y al caer se aplasta: por eso se siente vivo. Teclas 1 a 9.' },
    { sel: '#bProbar', titulo: '6 · Probar', idea: 'Algoritmos: física, estados, caminos', texto: 'Cuatro plantillas de juego: plataformas, fútbol, laberinto y runner. Cada una explica sus algoritmos con el código real, y con la tecla V (rayos X) ves lo que el juego «piensa».' },
    { sel: '#bExportar', titulo: '7 · Llévalo a tu juego', idea: 'Recursos: hoja de sprites, atlas, sonidos', texto: 'Un juego no carga 72 imágenes: carga UNA hoja con todos los cuadros y un archivo (atlas) que dice dónde está cada uno. Aquí descargas el proyecto completo, listo para abrir y modificar.' },
    { sel: '#bGaleria', titulo: '8 · Galería', texto: 'Entra a la sala de tu clase, publica tu personaje y vota. Con «Guardar» y «Mis personajes» armas tu elenco. Si te pierdes, toca a Chispa (abajo a la derecha): te dice qué hacer ahora.' },
  ];
  let paso = 0;
  const capa = $('recorrido'), foco = $('foco'), globo = $('globo');
  function mostrar() {
    const p = PASOS[paso]; p.antes?.();
    const obj = p.sel ? document.querySelector(p.sel) : null, visible = obj && obj.getClientRects().length;
    if (visible) obj.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (p.antes && !mostrar.espera) { mostrar.espera = true; return setTimeout(() => { mostrar(); mostrar.espera = false; }, 320); } // deja terminar la animación del cajón
    const r = visible ? obj.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0, bottom: innerHeight / 2, right: innerWidth / 2 };
    Object.assign(foco.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px', opacity: visible ? 1 : 0 });
    globo.replaceChildren(el('small', {}, `${paso + 1} de ${PASOS.length}`), el('h3', {}, p.titulo), ...(p.idea ? [el('b', { class: 'idea' }, p.idea)] : []), el('p', {}, p.texto));
    const fila = el('div', { class: 'fila' }), salir = el('button', { type: 'button', class: 'btn mini' }, 'Saltar'), atras = el('button', { type: 'button', class: 'btn mini' }, 'Atrás'), sig = el('button', { type: 'button', class: 'btn mini primario' }, paso === PASOS.length - 1 ? '¡A forjar!' : 'Siguiente');
    salir.onclick = cerrar; atras.onclick = () => { paso--; mostrar(); }; sig.onclick = () => { if (paso === PASOS.length - 1) cerrar(); else { paso++; mostrar(); } };
    if (paso === 0) atras.hidden = true; fila.append(salir, atras, sig); globo.append(fila);
    // el globo va debajo, encima o al lado, donde quepa
    const g = globo.getBoundingClientRect(), margen = 14;
    let x = Math.min(innerWidth - g.width - 10, Math.max(10, r.left + r.width / 2 - g.width / 2)), y = r.bottom + margen;
    if (!visible) y = innerHeight / 2 - g.height / 2;
    else if (y + g.height > innerHeight - 10) { y = r.top - g.height - margen; if (y < 10) { y = Math.min(innerHeight - g.height - 10, Math.max(10, r.top)); x = r.right + margen + g.width < innerWidth ? r.right + margen : Math.max(10, r.left - g.width - margen); } }
    Object.assign(globo.style, { left: x + 'px', top: y + 'px' }); sig.focus();
  }
  function cerrar() { capa.hidden = true; guarda('forja.recorrido', 1); removeEventListener('resize', mostrar); }
  function abrirRecorrido() { paso = 0; capa.hidden = false; addEventListener('resize', mostrar); mostrar(); }
  capa.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); if (e.key === 'ArrowRight' && paso < PASOS.length - 1) { paso++; mostrar(); } if (e.key === 'ArrowLeft' && paso > 0) { paso--; mostrar(); } });
  // ---------------------------------------------------------------- Chispa: el asistente que dice qué hacer ahora
  const guia = $('bAyuda'), burbuja = $('burbuja');
  try { guia.style.backgroundImage = `url(${miniatura(resolver(R, 'llama', 'clasico', { ...PARAMS_BASE, expresion: 'feliz', ojos: 0.8 }, 3), 120)})`; guia.classList.add('con-cara'); } catch { /* se queda el signo de pregunta */ }
  const vistos = new Set(lee('forja.consejos', []));
  function consejoAhora() { // el consejo depende de lo que aún no has hecho
    if (!vistos.has('describir')) return 'Empieza por arriba: describe tu personaje con una frase y pulsa Forjar.';
    if (!A.hoja()) return 'El muelle de la izquierda abre una herramienta a la vez. Prueba «Cuerpo» y mueve el peso.';
    if (!mios.length) return 'Cuando un personaje te guste, guárdalo con el corazón. Luego armas tu elenco.';
    if (!vistos.has('juegos')) return 'Ya tienes personaje: pulsa «Juegos» y pruébalo en una de las cuatro plantillas.';
    if (!vistos.has('exportar')) return 'Lleva tu juego a tu computadora con «Llevar a mi juego». Trae todo el código para que lo cambies.';
    return 'En cualquier juego pulsa V (rayos X): verás cajas de choque, estados y caminos.';
  }
  function abrirBurbuja(texto) {
    const cerrarB = () => { burbuja.hidden = true; guia.setAttribute('aria-expanded', 'false'); };
    const accion = (nombre, fn) => { const b = el('button', { type: 'button' }, nombre); b.onclick = () => { cerrarB(); fn(); }; return b; };
    const lista = el('div', { class: 'lista' });
    const guiaLink = el('a', { href: 'guia.html', target: '_blank', rel: 'noopener' }, 'Guía de una página');
    lista.append(accion('Hacer el recorrido', abrirRecorrido), accion('Crear con una frase', () => { $('texto').value = A.ejemplos[Math.floor(Math.random() * A.ejemplos.length)]; A.forjar(); }),
      accion('Probar un juego', () => $('bProbar').click()), accion('Entender los algoritmos', () => { vista = 'algoritmos'; $('bProbar').click(); }), guiaLink);
    burbuja.replaceChildren(el('h3', {}, 'Soy Chispa, tu guía'), el('p', { class: 'consejo' }, texto || consejoAhora()), lista);
    burbuja.hidden = false; guia.setAttribute('aria-expanded', 'true');
  }
  guia.onclick = () => { if (burbuja.hidden) abrirBurbuja(); else { burbuja.hidden = true; guia.setAttribute('aria-expanded', 'false'); } };
  addEventListener('pointerdown', (e) => { if (!burbuja.hidden && !e.target.closest('#burbuja, #bAyuda')) { burbuja.hidden = true; guia.setAttribute('aria-expanded', 'false'); } });
  // consejos que aparecen solos, una sola vez cada uno
  function consejo(id, texto) { const nuevo = !vistos.has(id); vistos.add(id); guarda('forja.consejos', [...vistos]); if (!nuevo || !capa.hidden || document.querySelector('dialog[open]')) return; abrirBurbuja(texto); guia.classList.remove('llama'); void guia.offsetWidth; guia.classList.add('llama'); clearTimeout(consejo.t); consejo.t = setTimeout(() => { burbuja.hidden = true; }, 9000); }
  document.addEventListener('forja:descrito', () => setTimeout(() => consejo('describir', '¡Listo! Arriba ves lo que entendí. Ahora abre «Cuerpo» o «Color» en el muelle para afinarlo, o pulsa el dado para una sorpresa.'), 1600));
  $('bGuardar').addEventListener('click', () => consejo('guardar', 'Guardado. En «Mis personajes» puedes marcarlo con ★ para tu elenco: héroe, enemigos y jefe.'));
  $('bProbar').addEventListener('click', () => { vistos.add('juegos'); guarda('forja.consejos', [...vistos]); });
  $('bExportar').addEventListener('click', () => { vistos.add('exportar'); guarda('forja.consejos', [...vistos]); });
  if (!lee('forja.recorrido', 0) && !q.get('sala') && !q.has('sinrecorrido')) setTimeout(abrirRecorrido, 900);
}
