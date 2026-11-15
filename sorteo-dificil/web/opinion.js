// Formulario de opinión: el servidor valida, guarda y cierra a la hora indicada.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const mostrar = (id) => { for (const s of ['pedir', 'gracias', 'cerrado']) $(s).hidden = s !== id; };
  const error = (id, texto) => { $('e-' + id).textContent = texto; const c = $(id); if (c) c.setAttribute('aria-invalid', texto ? 'true' : 'false'); };
  fetch('api/opinion/estado').then((r) => (r.ok ? r.json() : null)).then((e) => { if (e && !e.abierto) mostrar('cerrado'); }).catch(() => {});
  for (const id of ['nombre', 'whatsapp', 'texto']) $(id).addEventListener('input', () => error(id, ''));
  $('f').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    error('general', '');
    const b = $('enviar');
    b.disabled = true;
    b.textContent = 'Enviando…';
    try {
      const r = await fetch('api/opinion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: $('nombre').value, whatsapp: $('whatsapp').value, texto: $('texto').value }) });
      const j = await r.json();
      if (r.ok) { $('numero').textContent = j.numero; $('n-nombre').textContent = $('nombre').value.trim(); mostrar('gracias'); $('gracias').focus(); return; }
      if (j.motivo === 'cerrado') { mostrar('cerrado'); return; }
      if (['nombre', 'whatsapp', 'texto'].includes(j.motivo)) { error(j.motivo, j.error); $(j.motivo).focus(); } else error('general', j.error || 'No pudimos guardar tu opinión.');
    } catch { error('general', 'No hay conexión. Revisa tu internet y vuelve a intentarlo.'); }
    b.disabled = false;
    b.textContent = 'Enviar mi opinión';
  });
})();
