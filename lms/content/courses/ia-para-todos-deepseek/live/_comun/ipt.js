// IA para todos · sesión 1: un clic copia el pedido y abre DeepSeek Harness al lado de la escena.
// El LMS escucha {tipo: "abrir-dsh"} (pestaña DeepSeek Harness) y {tipo: "dsh-clave"} (guardar tu clave).
window.IPT = (() => {
  const toast = document.getElementById('ipt-toast');
  let t = null;
  const avisar = (txt) => { if (!toast) return; toast.textContent = txt; toast.classList.add('ver'); clearTimeout(t); t = setTimeout(() => toast.classList.remove('ver'), 5200); };
  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) { /* abajo */ }
    try { await window.parent.navigator.clipboard.writeText(txt); return true; } catch (e) { /* abajo */ }
    const a = document.createElement('textarea'); a.value = txt; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* sin portapapeles */ } a.remove(); return ok;
  }
  const aLMS = (msg) => { try { window.parent.postMessage(msg, location.origin); } catch (e) { /* fuera del LMS */ } };
  async function abrir(txt) {
    const ok = await copiar(txt);
    aLMS({ tipo: 'abrir-dsh' });
    avisar(ok ? 'Listo: pégalo en DeepSeek Harness (Ctrl+V o ⌘V) y presiona Enter.' : 'Abrí DeepSeek Harness: copia el texto de la tarjeta y pégalo ahí.');
  }
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-pedido], [data-pedido-de]');
    if (b) {
      const txt = b.dataset.pedido || (document.getElementById(b.dataset.pedidoDe) || {}).textContent || '';
      abrir(txt.trim()); b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 2400); return;
    }
    if (ev.target.closest('[data-abrir-dsh]')) { aLMS({ tipo: 'abrir-dsh' }); avisar('DeepSeek Harness está abierto al lado.'); return; }
    if (ev.target.closest('[data-clave]')) { aLMS({ tipo: 'dsh-clave' }); avisar('Se abrió una pestaña para guardar tu clave. Vuelve aquí cuando termines.'); }
  });
  return { abrir, copiar };
})();
