// Panel del sorteo. La clave viaja en la cabecera X-Clave y solo se guarda en
// la sesión de esta pestaña; el servidor responde 401 si no coincide.
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const crear = (tag, clase, texto) => {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  };
  const sesion = {
    leer() { try { return sessionStorage.getItem('gachapon:clave') || ''; } catch { return ''; } },
    poner(v) { try { v ? sessionStorage.setItem('gachapon:clave', v) : sessionStorage.removeItem('gachapon:clave'); } catch { /* sin almacenamiento */ } },
  };
  let clave = sesion.leer();
  let datos = { participantes: [], resumen: [], abierto: true, whatsapp: '' };

  const fmtFecha = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
  const fmtDia = new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  const hoyLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const bonito = (n) => n.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

  async function pedir(ruta, opciones = {}) {
    const r = await fetch(ruta, { ...opciones, headers: { ...(opciones.headers || {}), 'X-Clave': clave } });
    if (r.status === 401) { const e = new Error('clave'); e.clave = true; throw e; }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo completar el pedido.');
    return r;
  }

  function mostrar(dentro) {
    $('#entrada').hidden = dentro;
    $('#tablero').hidden = !dentro;
    $('#salir').hidden = !dentro;
  }

  function salir(mensaje) {
    clave = ''; sesion.poner('');
    mostrar(false);
    $('#e-clave').textContent = mensaje || '';
    $('#clave').value = '';
    $('#clave').focus();
  }

  async function cargar() {
    $('#e-tablero').textContent = '';
    try {
      datos = await (await pedir('api/admin/participantes')).json();
      mostrar(true);
      pintar();
    } catch (e) {
      if (e.clave) salir('Clave incorrecta.');
      else if ($('#tablero').hidden) $('#e-clave').textContent = 'No hay conexión con el servidor.';
      else $('#e-tablero').textContent = 'No se pudo actualizar. Revisa tu conexión.';
    }
  }

  function pintar() {
    const ps = datos.participantes;
    const sinPremio = ps.filter((p) => !p.descuento).length;
    $('#estado').textContent = `${ps.length} ${ps.length === 1 ? 'participante' : 'participantes'}. El sorteo está ${datos.abierto ? 'abierto' : 'cerrado: ya no entrega cupones'}.`;
    const resumen = $('#resumen');
    resumen.replaceChildren();
    for (const f of datos.resumen) {
      const li = crear('li');
      li.append(crear('b', '', `${f.descuento} %`), crear('span', '', f.tope ? `${f.entregados} de ${f.tope} entregados` : `${f.entregados} ${f.entregados === 1 ? 'entregado' : 'entregados'}, sin tope`), crear('span', '', `${f.canjeados} ${f.canjeados === 1 ? 'canjeado' : 'canjeados'}`));
      resumen.append(li);
    }
    const li = crear('li');
    li.append(crear('b', '', 'Sin premio'), crear('span', '', `${sinPremio} ${sinPremio === 1 ? 'persona' : 'personas'}`));
    resumen.append(li);
    filtrar();
  }

  function filtrar() {
    const q = $('#buscar').value.trim().toLowerCase();
    const qNum = q.replace(/\s/g, '');
    const modo = $('#filtro').value;
    const hoy = hoyLima();
    const filas = $('#filas');
    filas.replaceChildren();
    let n = 0;
    for (const p of [...datos.participantes].reverse()) {
      if (modo === 'pendientes' && !(p.descuento && !p.canjeado)) continue;
      if (modo === 'canjeados' && !p.canjeado) continue;
      if (modo === 'sin' && p.descuento) continue;
      if (q && !(p.nombre.toLowerCase().includes(q) || p.whatsapp.includes(qNum) || (p.codigo || '').toLowerCase().includes(q))) continue;
      n++;
      const tr = crear('tr');
      const celda = (rotulo, ...hijos) => { const td = crear('td'); td.dataset.rotulo = rotulo; td.append(...hijos); tr.append(td); return td; };
      celda('Participante', p.nombre);
      const wa = crear('a', 'a-fijo', bonito(p.whatsapp));
      wa.href = `https://wa.me/51${p.whatsapp}`; wa.target = '_blank'; wa.rel = 'noopener';
      celda('WhatsApp', wa);
      celda('Resultado', p.descuento ? crear('span', 'a-pct', `${p.descuento} %`) : crear('span', 'a-sin', 'Sin premio'));
      if (p.descuento) {
        celda('Cupón', crear('span', 'a-codigo', p.codigo));
        const vencido = p.vence < hoy && !p.canjeado;
        celda('Vence', crear('span', vencido ? 'a-vencido' : 'a-fijo', fmtDia.format(new Date(p.vence + 'T12:00:00Z')) + (vencido ? ' (venció)' : '')));
      } else { celda('Cupón'); celda('Vence'); }
      celda('Participó', crear('span', 'a-fijo', fmtFecha.format(new Date(p.creado))));
      const canje = crear('div', 'a-canje');
      if (p.descuento) {
        if (p.canjeado) canje.append(crear('span', 'a-hecho', `Canjeado el ${fmtFecha.format(new Date(p.canjeado))}`));
        const b = crear('button', p.canjeado ? 'deshacer' : '', p.canjeado ? 'Deshacer canje' : 'Marcar canjeado');
        b.type = 'button';
        b.setAttribute('aria-label', `${b.textContent}: cupón ${p.codigo} de ${p.nombre}`);
        b.addEventListener('click', () => canjear(p, !p.canjeado, b));
        canje.append(b);
      }
      celda('Canje', ...(p.descuento ? [canje] : []));
      filas.append(tr);
    }
    $('#vacio').hidden = datos.participantes.length > 0;
    $('#cuenta').textContent = datos.participantes.length ? `Mostrando ${n} de ${datos.participantes.length}.` : '';
  }

  async function canjear(p, valor, boton) {
    boton.disabled = true;
    $('#e-tablero').textContent = '';
    try {
      const r = await pedir('api/admin/canjear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: p.codigo, canjeado: valor }) });
      const nuevo = await r.json();
      p.canjeado = nuevo.canjeado || null;
      await cargar();
    } catch (e) {
      if (e.clave) salir('La clave ya no es válida. Vuelve a entrar.');
      else { $('#e-tablero').textContent = e.message; boton.disabled = false; }
    }
  }

  $('#f-clave').addEventListener('submit', (e) => {
    e.preventDefault();
    clave = $('#clave').value.trim();
    if (!clave) { $('#e-clave').textContent = 'Escribe la clave.'; return; }
    sesion.poner(clave);
    cargar();
  });
  $('#salir').addEventListener('click', () => salir(''));
  $('#actualizar').addEventListener('click', cargar);
  $('#buscar').addEventListener('input', filtrar);
  $('#filtro').addEventListener('change', filtrar);
  $('#csv').addEventListener('click', async () => {
    try {
      const blob = await (await pedir('api/admin/csv')).blob();
      const a = crear('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'gachapon-participantes.csv';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      if (e.clave) salir('La clave ya no es válida. Vuelve a entrar.');
      else $('#e-tablero').textContent = 'No se pudo descargar el CSV.';
    }
  });

  if (clave) cargar(); else mostrar(false);
})();
