// OpenMontage · sesión 1: un clic copia el comando o el prompt. Sin dependencias.
window.OM = (() => {
  const toast = document.getElementById('om-toast'); let t = null;
  const avisar = (txt) => { if (!toast) return; toast.textContent = txt; toast.classList.add('ver'); clearTimeout(t); t = setTimeout(() => toast.classList.remove('ver'), 4200); };
  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) { /* abajo */ }
    const a = document.createElement('textarea'); a.value = txt; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* sin portapapeles */ } a.remove(); return ok;
  }
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-copiar-de]');
    if (!b) return;
    const txt = (document.getElementById(b.dataset.copiarDe) || {}).textContent || '';
    const ok = await copiar(txt.trim());
    avisar(ok ? 'Copiado. Pégalo en tu terminal o en tu asistente (Ctrl+V o ⌘V).' : 'Selecciona el texto y cópialo a mano.');
    b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 2000);
  });
})();
