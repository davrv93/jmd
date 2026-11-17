// DeepSeek Harness · sesión 1: un clic copia el pedido (con el caso y la dirección que escribió el alumno)
// y abre DeepSeek Harness al lado de la escena.
// El LMS escucha {tipo: "abrir-dsh"} (pestaña DeepSeek Harness), {tipo: "dsh-clave"} (guardar la clave)
// y {tipo: "abrir-visor", ruta: "carpeta/archivo.html"} (Visor en esa ruta de /trabajo).
window.DH = (() => {
  const toast = document.getElementById('dh-toast');
  let t = null;
  const avisar = (txt) => { if (!toast) return; toast.textContent = txt; toast.classList.add('ver'); clearTimeout(t); t = setTimeout(() => toast.classList.remove('ver'), 5200); };

  // Lo que el alumno escribe pasa de una escena a otra: dh01.url, dh01.caso…
  const mem = {
    leer(k) { try { return localStorage.getItem('dh01.' + k) || ''; } catch (e) { return ''; } },
    guardar(k, v) { try { localStorage.setItem('dh01.' + k, v); } catch (e) { /* sin almacenamiento: se escribe de nuevo */ } },
  };

  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) { /* abajo */ }
    try { await window.parent.navigator.clipboard.writeText(txt); return true; } catch (e) { /* abajo */ }
    const a = document.createElement('textarea'); a.value = txt; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(a); a.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* sin portapapeles */ } a.remove(); return ok;
  }
  const aLMS = (msg) => { try { window.parent.postMessage(msg, location.origin); } catch (e) { /* fuera del LMS */ } };

  const campo = (n) => document.querySelector('[data-campo="' + n + '"]');
  const limpio = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const valor = (n) => { const c = campo(n); return limpio(c ? c.value : mem.leer(n)); };

  // Cada <pre data-pedido> trae la plantilla con {campo}; se pinta con lo escrito y así mismo se copia.
  const pedidos = Array.from(document.querySelectorAll('pre[data-pedido]'));
  pedidos.forEach((p) => { p.dataset.plantilla = limpio(p.textContent); });
  function armar(pre) {
    const faltan = [];
    const partes = (pre.dataset.plantilla || limpio(pre.textContent)).split(/\{([a-z]+)\}/);
    const txt = partes.map((s, i) => { if (i % 2 === 0) return s; const v = valor(s); if (!v) faltan.push(s); return v; }).join('');
    return { txt: limpio(txt), faltan, partes };
  }
  function pintar(pre) {
    const { partes } = armar(pre);
    if (partes.length < 2) return;
    pre.textContent = '';
    partes.forEach((s, i) => {
      if (i % 2 === 0) { pre.appendChild(document.createTextNode(s)); return; }
      const v = valor(s), c = campo(s), e = document.createElement('span');
      e.className = v ? 'dh-dato' : 'dh-hueco';
      e.textContent = v || (c && c.dataset.vacio) || '(falta: ' + s + ')';
      pre.appendChild(e);
    });
  }
  // La Tienda Sol da una tienda propia a cada alumno: al pedir /tienda-sol/ redirige a /tienda-sol/<código>/.
  // La escena la pide sola (mismo origen) y deja la dirección completa en el campo: el alumno no copia nada.
  const CON_CODIGO = /tienda-sol\/[\w-]{8,}/;
  let creando = false, falloTienda = false;
  function tiendaSola() {
    const c = campo('url');
    if (!c || creando || CON_CODIGO.test(c.value)) return;
    if (c.value.trim() && !/tienda-sol\/?$/.test(c.value.trim())) return;   // escribió otro sistema: no se toca
    creando = true; revisarUrl();
    fetch('/tienda-sol/', { credentials: 'same-origin', redirect: 'follow', cache: 'no-store' })
      .then((r) => { const m = /\/tienda-sol\/([\w-]{8,})\//.exec(r.url || ''); if (!m) throw new Error('sin código'); return m[1]; })
      .then((codigo) => {
        c.value = location.host + '/tienda-sol/' + codigo + '/';
        mem.guardar('url', c.value); c.classList.remove('falta'); falloTienda = false;
        document.querySelectorAll('[data-tienda]').forEach((b) => { b.dataset.copiar = c.value; });
      })
      .catch(() => { falloTienda = true; })
      .then(() => { creando = false; repintar(); });
  }
  function revisarUrl() {
    const e = document.getElementById('dh-url-estado'); if (!e) return;
    const v = valor('url');
    e.className = 'dh-estado';
    if (creando) { e.textContent = 'Creando tu tienda de práctica…'; return; }
    if (CON_CODIGO.test(v)) {
      e.textContent = 'Tu tienda ya está lista y su dirección quedó guardada. No tienes que copiar nada.'; e.classList.add('ok');
      document.querySelectorAll('[data-tienda]').forEach((b) => { b.dataset.copiar = v; });
      return;
    }
    if (!v) { e.textContent = falloTienda ? 'No pude crear tu tienda sola. Abre jmd-learn.online/tienda-sol/ en otra pestaña y pega aquí la dirección que te quede.' : ''; if (falloTienda) e.classList.add('ojo'); return; }
    if (/tienda-sol\/?$/.test(v.trim())) { tiendaSola(); if (falloTienda) { e.textContent = 'No pude crear tu tienda sola. Ábrela en otra pestaña y pega aquí la dirección completa, con su código.'; e.classList.add('ojo'); } return; }
    e.textContent = 'Usarás tu propio sistema: recuerda que debe ser tuyo o tener permiso, y con una cuenta de prueba.'; e.classList.add('ok');
  }
  const repintar = () => { pedidos.forEach(pintar); revisarUrl(); };

  document.querySelectorAll('[data-campo]').forEach((c) => {
    const n = c.dataset.campo, previo = mem.leer(n);
    if (previo && !c.value) c.value = previo;
    c.addEventListener('input', () => { mem.guardar(n, c.value); c.classList.remove('falta'); repintar(); });
  });
  tiendaSola();

  // Casillas de revisión (botones con role="checkbox"): se recuerdan en dh01.rev
  const casillas = Array.from(document.querySelectorAll('[role="checkbox"]'));
  const cuenta = document.getElementById('dh-cuenta');
  const contar = () => { if (cuenta) cuenta.textContent = casillas.filter((b) => b.getAttribute('aria-checked') === 'true').length + ' de ' + casillas.length; };
  if (casillas.length) {
    const rev = mem.leer('rev');
    casillas.forEach((b, i) => { if (rev[i] === '1') b.setAttribute('aria-checked', 'true'); });
    contar();
  }
  repintar();

  async function abrir(txt) {
    const ok = await copiar(txt);
    aLMS({ tipo: 'abrir-dsh' });
    avisar(ok ? 'Listo: pégalo en DeepSeek Harness (Ctrl+V o ⌘V) y presiona Enter.' : 'Abrí DeepSeek Harness: selecciona el texto del pedido, cópialo y pégalo ahí.');
    return ok;
  }

  document.addEventListener('click', async (ev) => {
    const el = ev.target instanceof Element ? ev.target : null; if (!el) return;
    const b = el.closest('[data-pedido-de]');
    if (b) {
      const pre = document.getElementById(b.dataset.pedidoDe); if (!pre) return;
      const r = armar(pre);
      if (r.faltan.length) {
        const c = campo(r.faltan[0]);
        avisar('Antes de copiar, completa: ' + ((c && c.dataset.nombre) || r.faltan[0]) + '.');
        if (c) { c.classList.add('falta'); c.focus(); }
        return;
      }
      await abrir(r.txt); b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 2400); return;
    }
    const cp = el.closest('[data-copiar]');
    if (cp) { const ok = await copiar(cp.dataset.copiar); avisar(ok ? (cp.dataset.aviso || 'Copiado.') : 'No pude copiar: selecciona el texto y cópialo a mano.'); return; }
    const ej = el.closest('[data-ejemplo]');
    if (ej) {
      const c = campo('caso'), txt = ej.querySelector('.dh-ej-txt');
      if (c && txt) { c.value = limpio(txt.textContent); c.dispatchEvent(new Event('input', { bubbles: true })); }
      document.querySelectorAll('[data-ejemplo]').forEach((x) => x.setAttribute('aria-pressed', x === ej ? 'true' : 'false'));
      avisar('Caso cargado. Puedes cambiarle lo que quieras.'); return;
    }
    const ck = el.closest('[role="checkbox"]');
    if (ck) {
      ck.setAttribute('aria-checked', ck.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      mem.guardar('rev', casillas.map((x) => (x.getAttribute('aria-checked') === 'true' ? '1' : '0')).join('')); contar(); return;
    }
    if (el.closest('[data-abrir-dsh]')) { aLMS({ tipo: 'abrir-dsh' }); avisar('DeepSeek Harness está abierto al lado.'); return; }
    const v = el.closest('[data-visor]');
    if (v) { aLMS({ tipo: 'abrir-visor', ruta: v.dataset.visor }); avisar('Abrí el Visor. Si sale vacío, espera a que DeepSeek Harness termine y toca de nuevo.'); return; }
    if (el.closest('[data-clave]')) { aLMS({ tipo: 'dsh-clave' }); avisar('Se abrió una pestaña para guardar tu clave. Vuelve aquí cuando termines.'); return; }
    // Un clic sobre el pedido lo selecciona entero, por si hay que copiarlo a mano.
    const pre = el.closest('pre[data-pedido]');
    if (pre && String(window.getSelection()) === '') { const r = document.createRange(); r.selectNodeContents(pre); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  });

  return { abrir, copiar, armar };
})();
