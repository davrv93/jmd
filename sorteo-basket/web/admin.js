// Panel del sorteo basket. La clave viaja en ?k= (como los demás sorteos) y se manda en X-Clave.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const clave = new URLSearchParams(location.search).get('k') || '';
  let datos = null;

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function td(txt) { return el('td', null, txt); }

  async function pedir(ruta, metodo) {
    const r = await fetch('api/admin/' + ruta, { method: metodo || 'GET', headers: { 'X-Clave': clave }, cache: 'no-store' });
    if (!r.ok) throw new Error('El servidor respondió ' + r.status);
    return r.json();
  }
  async function cargar() {
    try { pintar(await pedir('estado')); } catch (e) { $('estado').textContent = 'Sin conexión con el servidor'; }
  }
  async function accion(ruta, aviso) {
    try { pintar(await pedir(ruta, 'POST')); toast(aviso); } catch (e) { toast('No se pudo: ' + e.message); }
  }

  function nombrePremio(id) {
    const p = datos.premios.find((x) => x.id === id);
    return p ? p.nombre : id;
  }
  function grupoTxt(pid, gid) {
    const p = datos.premios.find((x) => x.id === pid);
    const g = p && p.grupos && p.grupos.find((x) => x.id === gid);
    return g ? g.id + ' · ' + g.dias + ', ' + g.hora : (p && p.dias ? 'Lun 23, mar 24 y mié 25 nov' : '');
  }
  function telTxt(t) { return t.slice(0, 3) + ' ' + t.slice(3, 6) + ' ' + t.slice(6); }
  // «S/ 17,50»: en céntimos, dos decimales con coma
  function soles(precio, pct) {
    const c = Math.round(precio * pct);
    return 'S/ ' + Math.floor(c / 100) + ',' + String(c % 100).padStart(2, '0');
  }
  function corto(id) { return id === 'qwen' ? 'Qwen Coder' : 'Videos con IA'; }
  function precios(pct) { return datos.premios.map((p) => corto(p.id) + ' ' + soles(p.precio, pct)).join(' · '); }
  // premioDe: texto del premio de un jugador (cupo, 80 % o porcentaje que paga)
  function premioDe(j) {
    if (j.gano) {
      const g = datos.ganadores.find((x) => x.orden === j.gano);
      return g ? 'Cupo 100 %: ' + nombrePremio(g.premio) + (g.grupo ? ', grupo ' + g.grupo : '') : 'Cupo 100 %';
    }
    if (j.paga) return (j.esp ? (datos.consuelo.especial_texto || '80 % de descuento') + ', paga ' : 'Paga ') + j.paga + ' %: ' + precios(j.paga);
    if (!j.n) return 'No tiró';
    return datos.cerrado ? 'Sin premio' : 'Se sortea al cerrar';
  }

  function pintar(d) {
    datos = d;
    const est = $('estado');
    est.className = 'estado-chip ' + (d.cerrado ? 'cerrado' : d.abierto ? 'abierto' : 'pausa');
    est.textContent = d.cerrado ? 'Ceremonia en pantalla' : d.abierto ? 'Juego abierto' : 'En pausa';
    $('b-abrir').hidden = d.abierto || d.cerrado;
    $('b-pausar').hidden = !d.abierto || d.cerrado;
    $('b-cerrar').hidden = d.cerrado;
    $('b-reabrir').hidden = !d.cerrado;
    const enLinea = d.jugadores.filter((j) => j.on).length;
    $('conectados').textContent = d.conectados + ' pantallas · ' + enLinea + ' jugando';

    $('cupos').replaceChildren(...d.premios.map((p) => {
      const r = el('p');
      r.appendChild(el('span', null, p.nombre + ' · ' + p.etiqueta));
      r.appendChild(el('b', null, 'quedan ' + d.restantes[p.id] + ' de ' + p.cupos));
      return r;
    }));

    const gs = d.ganadores.map((g) => {
      const tr = el('tr');
      tr.appendChild(td(String(g.orden)));
      tr.appendChild(td(g.nombre));
      const t = el('td');
      const a = el('a', null, telTxt(g.tel));
      a.href = 'https://wa.me/51' + g.tel;
      a.target = '_blank';
      a.rel = 'noopener';
      t.appendChild(a);
      tr.appendChild(t);
      tr.appendChild(td(nombrePremio(g.premio)));
      tr.appendChild(td(grupoTxt(g.premio, g.grupo)));
      tr.appendChild(td(String(g.tiros)));
      tr.appendChild(td(g.hora));
      return tr;
    });
    if (!gs.length) { const tr = el('tr', 'vacio'); const c = td('Todavía nadie llegó a ' + d.meta + ' encestes.'); c.colSpan = 7; tr.appendChild(c); gs.push(tr); }
    $('ganadores').replaceChildren(...gs);

    const js = [...d.jugadores].sort((a, b) => (a.gano || 1e9) - (b.gano || 1e9) || b.a - a.a || a.n - b.n);
    $('njug').textContent = '(' + js.length + ')';
    const filas = js.map((j) => {
      const tr = el('tr', j.gano ? 'gano' : j.esp ? 'esp' : '');
      const c = el('td');
      const img = el('img');
      img.src = Muneco.retrato(j.s, 60);
      img.alt = '';
      c.appendChild(img);
      tr.appendChild(c);
      tr.appendChild(td(j.nombre));
      tr.appendChild(td(telTxt(j.tel)));
      const pr = td(premioDe(j));
      pr.className = 'premio-col';
      tr.appendChild(pr);
      tr.appendChild(td(String(j.a)));
      tr.appendChild(td(String(j.n)));
      tr.appendChild(td(j.on ? 'Sí' : 'No'));
      tr.appendChild(td(j.hora));
      return tr;
    });
    if (!filas.length) { const tr = el('tr', 'vacio'); const c = td('Nadie ha entrado todavía.'); c.colSpan = 8; tr.appendChild(c); filas.push(tr); }
    $('jugadores').replaceChildren(...filas);
  }

  // Copiar lista: texto plano para pegar en WhatsApp o en una hoja
  function textoLista() {
    const fecha = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long' });
    const lin = ['Sorteo basket, ' + fecha, ''];
    const js = datos.jugadores;
    const fila = (j, extra) => j.nombre + ' · ' + telTxt(j.tel) + ' · ' + extra;
    lin.push('CUPOS 100 %');
    if (!datos.ganadores.length) lin.push('(ninguno)');
    for (const g of datos.ganadores) {
      const p = datos.premios.find((x) => x.id === g.premio);
      const gr = p && p.grupos && p.grupos.find((x) => x.id === g.grupo);
      lin.push(g.orden + '. ' + g.nombre + ' · ' + telTxt(g.tel) + ' · ' + nombrePremio(g.premio) + (gr ? ', grupo ' + gr.id + ' (' + gr.dias + ', ' + gr.hora + ')' : p && p.dias ? ' (' + p.dias + ')' : ''));
    }
    const esp = js.filter((j) => j.esp && !j.gano);
    if (esp.length) {
      lin.push('', (datos.consuelo.especial_texto || '80 % de descuento').toUpperCase());
      for (const j of esp) lin.push(fila(j, 'paga ' + j.paga + ' %: ' + precios(j.paga)));
    }
    const otros = js.filter((j) => j.paga && !j.esp && !j.gano).sort((a, b) => a.paga - b.paga || a.nombre.localeCompare(b.nombre));
    if (otros.length) {
      lin.push('', 'DESCUENTOS');
      for (const j of otros) lin.push(fila(j, 'paga ' + j.paga + ' %: ' + precios(j.paga)));
    }
    const sin = js.filter((j) => !j.gano && !j.paga);
    if (sin.length) {
      lin.push('', datos.cerrado ? 'SIN PREMIO (no tiraron)' : 'SIN PREMIO TODAVÍA (los descuentos se sortean al cerrar)');
      for (const j of sin) lin.push(fila(j, j.n + ' tiros'));
    }
    return lin.join('\n');
  }
  async function copiar() {
    if (!datos) return;
    const t = textoLista();
    try {
      await navigator.clipboard.writeText(t);
    } catch (e) {
      const ta = el('textarea', 'copia');
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Lista copiada: ' + datos.jugadores.length + ' jugadores.');
  }
  $('b-copiar').addEventListener('click', copiar);
  window.__textoLista = () => (datos ? textoLista() : '');

  let toastTimer = 0;
  function toast(t) {
    const e = $('toast');
    e.textContent = t;
    e.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { e.hidden = true; }, 2800);
  }

  // Diálogo propio (nunca window.confirm)
  let antesFoco = null;
  function abrirDialogo() {
    antesFoco = document.activeElement;
    $('dialogo').hidden = false;
    $('d-no').focus();
  }
  function cerrarDialogo() {
    $('dialogo').hidden = true;
    if (antesFoco) antesFoco.focus();
  }
  $('dialogo').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarDialogo();
    if (e.key === 'Tab') {
      const f = [$('d-no'), $('d-si')];
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  $('dialogo').addEventListener('click', (e) => { if (e.target === $('dialogo')) cerrarDialogo(); });
  $('d-no').addEventListener('click', cerrarDialogo);
  $('d-si').addEventListener('click', () => { cerrarDialogo(); accion('reiniciar', 'Sorteo reiniciado. Hay una copia del anterior en el servidor.'); });

  $('b-abrir').addEventListener('click', () => accion('abrir', 'Juego abierto: ya se puede tirar.'));
  $('b-pausar').addEventListener('click', () => accion('pausar', 'Juego en pausa.'));
  $('b-cerrar').addEventListener('click', () => accion('cerrar', 'Ceremonia en todas las pantallas.'));
  $('b-reabrir').addEventListener('click', () => accion('reabrir', 'Ceremonia cerrada. El juego sigue en pausa o abierto como estaba.'));
  $('b-reiniciar').addEventListener('click', abrirDialogo);

  cargar();
  setInterval(cargar, 2000);
})();
