// Canje de cupón: muestra el cupón, los cursos donde vale con su precio ya
// descontado y guarda el curso elegido. El servidor exige el WhatsApp ganador.
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const codigo = (new URLSearchParams(location.search).get('c') || '').trim().toUpperCase();
  const soles = (v) => (v === 0 ? 'Gratis' : Number.isInteger(v) ? `S/ ${v}` : `S/ ${v.toFixed(2)}`);
  let datos = null;
  let elegido = '';

  const precio = (c) => Math.round(c.soles * (100 - datos.descuento)) / 100;
  const waLink = (texto) => `https://wa.me/${datos ? datos.whatsapp : '51986149476'}?text=${encodeURIComponent(texto)}`;

  function pintarCursos() {
    const cont = $('#cursos');
    cont.replaceChildren();
    for (const c of datos.cursos) {
      const l = document.createElement('label'); l.className = 'curso';
      const r = document.createElement('input'); r.type = 'radio'; r.name = 'curso'; r.value = c.slug; r.checked = c.slug === elegido;
      r.addEventListener('change', () => { elegido = c.slug; $('#e-curso').textContent = ''; resumen(); });
      const img = document.createElement('img'); img.src = `brochures/${c.brochure}.webp`; img.alt = ''; img.loading = 'lazy';
      const txt = document.createElement('span');
      const t = document.createElement('span'); t.className = 'curso-titulo'; t.textContent = c.titulo;
      const f = document.createElement('span'); f.className = 'curso-fecha'; f.textContent = [c.formato, (c.fechas || [])[0]].filter(Boolean).join(' · ');
      const p = document.createElement('span'); p.className = 'curso-precio';
      const s = document.createElement('s'); s.textContent = soles(c.soles);
      const b = document.createElement('b'); b.textContent = soles(precio(c));
      const v = document.createElement('a'); v.className = 'curso-brochure'; v.href = `brochures/${c.brochure}.webp`; v.target = '_blank'; v.rel = 'noopener'; v.textContent = 'Ver brochure';
      p.append(s, b, v);
      txt.append(t, f, p);
      l.append(r, img, txt);
      cont.append(l);
    }
  }

  function resumen() {
    const c = datos.cursos.find((x) => x.slug === elegido);
    $('#resumen').hidden = !c;
    if (!c) return;
    $('#r-curso').textContent = c.titulo;
    $('#r-antes').textContent = soles(c.soles);
    $('#r-precio').textContent = soles(precio(c));
  }

  function bloquear(mensaje) {
    const a = $('#aviso'); a.textContent = mensaje; a.className = 'aviso mal'; a.hidden = false;
    $('#canje').hidden = true;
  }

  async function cargar() {
    try {
      const r = await fetch(`api/canje?c=${encodeURIComponent(codigo)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('sin cupón');
      datos = await r.json();
    } catch {
      $('#cargando').hidden = true; $('#sin-cupon').hidden = false;
      $('#sin-wa').href = waLink(`Hola, quiero usar mi cupón ${codigo || ''} de JMD Learning.`);
      return;
    }
    elegido = datos.eleccion || '';
    $('#b-hola').textContent = `Cupón de ${datos.nombre}`;
    $('#b-pct').textContent = datos.descuento;
    $('#b-codigo').textContent = datos.codigo;
    $('#b-vence').textContent = `Vale hasta el ${datos.vence_texto}.`;
    pintarCursos(); resumen();
    if (datos.canjeado) bloquear('Este cupón ya se usó. Si crees que es un error, escríbenos por WhatsApp.');
    else if (datos.vencido) bloquear(`Este cupón venció el ${datos.vence_texto}.`);
    else if (datos.eleccion) {
      const a = $('#aviso'); a.hidden = false; a.className = 'aviso';
      a.textContent = 'Ya elegiste un curso con este cupón. Puedes cambiarlo mientras no esté pagado.';
    }
    $('#cargando').hidden = true; $('#contenido').hidden = false;
  }

  $('#canje').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#e-general').textContent = ''; $('#e-whatsapp').textContent = ''; $('#whatsapp').setAttribute('aria-invalid', 'false');
    if (!elegido) { $('#e-curso').textContent = 'Elige un curso de la lista.'; $('#cursos input')?.focus(); return; }
    const wa = $('#whatsapp').value.trim();
    if (!/^9\d{8}$/.test(wa.replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, ''))) {
      $('#e-whatsapp').textContent = 'Escribe tu WhatsApp: 9 dígitos y empieza con 9.';
      $('#whatsapp').setAttribute('aria-invalid', 'true'); $('#whatsapp').focus(); return;
    }
    const b = $('#enviar'); b.disabled = true; b.textContent = 'Guardando…';
    try {
      const r = await fetch('api/canje', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: datos.codigo, whatsapp: wa, slug: elegido }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.motivo === 'whatsapp') { $('#e-whatsapp').textContent = j.error; $('#whatsapp').setAttribute('aria-invalid', 'true'); $('#whatsapp').focus(); }
        else $('#e-general').textContent = j.error || 'No pudimos guardar tu elección.';
        return;
      }
      const c = datos.cursos.find((x) => x.slug === elegido);
      $('#l-nombre').textContent = datos.nombre;
      $('#l-texto').textContent = `Reservamos ${c.titulo} con tu ${datos.descuento} %: pagas ${soles(precio(c))} en lugar de ${soles(c.soles)}. Avísanos por WhatsApp para coordinar el pago.`;
      $('#l-wa').href = waLink(`Hola, soy ${j.nombre}. Usé mi cupón ${datos.codigo} (${datos.descuento} %) para inscribirme en ${c.titulo}. Precio con cupón: ${soles(precio(c))}.`);
      $('#canje').hidden = true; $('#aviso').hidden = true; $('#listo').hidden = false;
      $('#l-titulo').focus();
    } catch {
      $('#e-general').textContent = 'No hay conexión. Revisa tu internet y vuelve a intentarlo.';
    } finally { b.disabled = false; b.textContent = 'Inscribirme con mi cupón'; }
  });

  cargar();
})();
