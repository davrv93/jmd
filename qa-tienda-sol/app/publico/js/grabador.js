// Grabador de sesión con consentimiento informado («semilla frontend»).
// Guarda, SOLO si la persona acepta: la semilla (URL, pantalla, hora), cada clic y lo que escribe
// (la clave se enmascara como •••), la pantalla antes de cada clic, los avisos que vio, las
// peticiones que fallaron y los errores de JavaScript. Se envía a /api/sesiones de ESTA tienda,
// se guarda 24 h en memoria y se puede detener en cualquier momento. Sin dependencias.
(function () {
  'use strict';
  const CLAVE_ELECCION = 'sol-grabar';          // 'si' | 'no'
  const CLAVE_SESION = 'sol-sesion';            // id de la grabación (dura lo que la pestaña)
  const MAX_EVENTOS = 300;
  const MAX_SNAP = 60_000;
  let eleccion = null;
  try { eleccion = localStorage.getItem(CLAVE_ELECCION); } catch { /* sin almacenamiento */ }

  const cola = [];
  let sesionId = null;
  let enviando = false;
  let temporizador = null;

  // ---------- localizadores accesibles (los mismos que usa Playwright) ----------
  function textoDe(el) { return (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80); }
  function etiquetaDe(el) {
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return l.textContent.trim(); }
    const padre = el.closest('label');
    if (padre) return padre.textContent.trim();
    return el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || '';
  }
  function localizador(el) {
    const tag = el.tagName.toLowerCase();
    const testid = el.getAttribute('data-testid');
    if (testid) return { tipo: 'testid', valor: testid, tag };
    if (tag === 'button' || (tag === 'input' && /^(submit|button)$/.test(el.type)) || el.getAttribute('role') === 'button') {
      return { tipo: 'role', role: 'button', name: textoDe(el) || el.value, tag };
    }
    if (tag === 'a') return { tipo: 'role', role: 'link', name: textoDe(el), tag };
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return { tipo: 'label', name: etiquetaDe(el), tag, inputType: el.type };
    if (/^h[1-6]$/.test(tag)) return { tipo: 'role', role: 'heading', name: textoDe(el), tag };
    return { tipo: 'text', name: textoDe(el).slice(0, 40), tag };
  }
  function rutaCss(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const partes = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      let s = el.tagName.toLowerCase();
      const hermanos = Array.from(el.parentNode.children).filter((h) => h.tagName === el.tagName);
      if (hermanos.length > 1) s += `:nth-of-type(${hermanos.indexOf(el) + 1})`;
      partes.unshift(s);
      el = el.parentNode;
    }
    return 'body > ' + partes.join(' > ');
  }

  // ---------- captura de pantalla (DOM con los valores escritos, clave enmascarada) ----------
  function capturar() {
    const copia = document.documentElement.cloneNode(true);
    copia.querySelectorAll('script').forEach((s) => s.remove());
    copia.querySelectorAll('#sol-consentimiento, #sol-grabando').forEach((s) => s.remove());
    const vivos = document.querySelectorAll('input, select, textarea');
    const copias = copia.querySelectorAll('input, select, textarea');
    vivos.forEach((v, i) => {
      const c = copias[i]; if (!c) return;
      if (v.type === 'password') c.setAttribute('value', v.value ? '•••' : '');
      else if (v.type === 'checkbox' || v.type === 'radio') { if (v.checked) c.setAttribute('checked', ''); else c.removeAttribute('checked'); }
      else if (v.tagName === 'SELECT') c.querySelectorAll('option').forEach((o) => { if (o.value === v.value) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
      else c.setAttribute('value', v.value);
    });
    let html = '<!doctype html>' + copia.outerHTML;
    if (html.length > MAX_SNAP) html = html.slice(0, MAX_SNAP);
    return html;
  }

  function registrar(evento) {
    if (!sesionId || cola.length + 1 > MAX_EVENTOS) return;
    cola.push({ t: Date.now(), pagina: location.pathname, ...evento });
    clearTimeout(temporizador);
    temporizador = setTimeout(enviar, 800);
  }

  async function enviar() {
    if (enviando || !sesionId || cola.length === 0) return;
    enviando = true;
    const lote = cola.splice(0, cola.length);
    try {
      await fetchOriginal('/api/sesiones/' + sesionId, {
        method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventos: lote }),
      });
    } catch { /* si falla, se pierde el lote: nunca bloquea la app */ }
    enviando = false;
    if (cola.length) enviar();
  }

  // ---------- qué se observa ----------
  const fetchOriginal = window.fetch.bind(window);
  function observar() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('button, a, input, select, label, [role="button"]') || e.target;
      if (el.closest('#sol-consentimiento, #sol-grabando, #sol-controles')) return;
      registrar({ tipo: 'clic', loc: localizador(el), sel: rutaCss(el), pantalla: capturar() });
    }, true);
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (!el.matches || !el.matches('input, select, textarea') || el.closest('#sol-consentimiento, #sol-controles')) return;
      const valor = el.type === 'password' ? '•••' : (el.type === 'checkbox' ? String(el.checked) : el.value);
      registrar({ tipo: 'escribe', loc: localizador(el), sel: rutaCss(el), valor });
    }, true);
    window.addEventListener('error', (e) => registrar({ tipo: 'error', mensaje: String(e.message).slice(0, 300) }));
    window.addEventListener('unhandledrejection', (e) => registrar({ tipo: 'error', mensaje: String(e.reason && e.reason.message || e.reason).slice(0, 300) }));
    // Avisos que la persona vio en pantalla (role=alert / role=status).
    const mo = new MutationObserver(() => {
      document.querySelectorAll('[role="alert"], [role="status"]').forEach((n) => {
        const texto = n.textContent.trim();
        if (texto && n.dataset.solVisto !== texto) { n.dataset.solVisto = texto; registrar({ tipo: 'aviso', role: n.getAttribute('role'), texto: texto.slice(0, 200) }); }
      });
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    // Peticiones: se anota método, ruta, estado y un resumen del cuerpo (nunca el de /api/login).
    window.fetch = async function (ruta, opciones) {
      const metodo = (opciones && opciones.method) || 'GET';
      const url = typeof ruta === 'string' ? ruta : ruta.url;
      const res = await fetchOriginal(ruta, opciones);
      if (!sesionId || /\/api\/sesiones/.test(url)) return res;
      const esLogin = /\/api\/login/.test(url);
      let enviado = null;
      if (!esLogin && opciones && typeof opciones.body === 'string') enviado = opciones.body.slice(0, 300);
      let recibido = null;
      try { recibido = (await res.clone().text()).slice(0, 300); } catch { /* cuerpo no legible */ }
      registrar({ tipo: 'http', metodo, url: url.replace(/^https?:\/\/[^/]+/, ''), estado: res.status, enviado, recibido: esLogin ? null : recibido });
      return res;
    };
  }

  // ---------- interfaz: consentimiento y botón «Dejar de grabar» ----------
  function estilos() {
    const s = document.createElement('style');
    s.textContent = `
#sol-consentimiento{position:fixed;top:72px;right:16px;max-width:400px;z-index:1000}
#sol-consentimiento .caja{background:#fff;color:#1d2433;border:1px solid #e3c488;border-radius:14px;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3);font:15px/1.45 system-ui,sans-serif}
#sol-consentimiento h2{margin:0 0 8px;font-size:20px}#sol-consentimiento ul{margin:8px 0 12px;padding-left:20px}#sol-consentimiento li{margin:3px 0}
#sol-consentimiento .acciones{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
#sol-consentimiento button{font:600 15px system-ui,sans-serif;padding:10px 16px;border-radius:9px;border:1px solid #c8ccd6;background:#fff;color:#1d2433;cursor:pointer}
#sol-consentimiento button.si{background:#f5a623;border-color:#f5a623;color:#1d2433}
#sol-grabando{margin-left:auto;display:inline-flex;align-items:center;gap:8px;font:600 13px system-ui,sans-serif;color:#b3261e}
#sol-grabando i{width:9px;height:9px;border-radius:50%;background:#d8322a;display:inline-block}
#sol-grabando button{font:600 13px system-ui,sans-serif;padding:5px 10px;border-radius:8px;border:1px solid #c8ccd6;background:#fff;cursor:pointer;color:#1d2433}
@media(prefers-reduced-motion:no-preference){#sol-grabando i{animation:sol-latido 1.4s infinite}@keyframes sol-latido{50%{opacity:.35}}}`;
    document.head.append(s);
  }

  function pedirConsentimiento() {
    const caja = document.createElement('div');
    caja.id = 'sol-consentimiento';
    caja.setAttribute('role', 'dialog');
        caja.setAttribute('aria-labelledby', 'sol-ct');
    caja.innerHTML = `<div class="caja">
      <h2 id="sol-ct">¿Nos ayudas a reproducir errores?</h2>
      <p>Si aceptas, <strong>grabamos esta sesión</strong> para que el equipo de calidad pueda ver exactamente lo que te pasó y corregirlo. Se guarda:</p>
      <ul>
        <li>tus clics y lo que escribes en el punto de venta (<strong>nunca la clave</strong>: se guarda como •••);</li>
        <li>la pantalla tal como la viste antes de cada clic, los avisos que aparecieron;</li>
        <li>las peticiones al servidor que fallaron y los errores de JavaScript.</li>
      </ul>
      <p>Se conserva <strong>24 horas</strong> en esta tienda y luego se borra. Puedes <strong>dejar de grabar</strong> cuando quieras con el botón de arriba. No se usa para nada más.</p>
      <div class="acciones"><button type="button" class="no">No, gracias</button><button type="button" class="si">Sí, grabar esta sesión</button></div>
    </div>`;
    caja.querySelector('.si').onclick = () => { guardarEleccion('si'); caja.remove(); iniciar(); };
    caja.querySelector('.no').onclick = () => { guardarEleccion('no'); caja.remove(); };
    document.body.append(caja);
    caja.querySelector('.si').focus();
  }
  function guardarEleccion(v) { eleccion = v; try { localStorage.setItem(CLAVE_ELECCION, v); } catch { /* sin almacenamiento */ } }

  function pintarIndicador() {
    const barra = document.querySelector('header .barra');
    if (!barra || document.getElementById('sol-grabando')) return;
    const ind = document.createElement('span');
    ind.id = 'sol-grabando';
    ind.innerHTML = '<i aria-hidden="true"></i> Grabando <button type="button">Dejar de grabar</button>';
    ind.querySelector('button').onclick = () => {
      registrar({ tipo: 'fin', motivo: 'la persona dejó de grabar' });
      enviar();
      guardarEleccion('no');
      try { sessionStorage.removeItem(CLAVE_SESION); } catch { /* nada */ }
      sesionId = null;
      ind.remove();
    };
    barra.append(ind);
  }

  async function iniciar() {
    try { sesionId = sessionStorage.getItem(CLAVE_SESION); } catch { /* nada */ }
    const nueva = !sesionId;
    if (nueva) {
      sesionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try { sessionStorage.setItem(CLAVE_SESION, sesionId); } catch { /* nada */ }
      const semilla = {
        url: location.href, pagina: location.pathname, hora: new Date().toISOString(),
        pantalla: { ancho: window.innerWidth, alto: window.innerHeight }, navegador: navigator.userAgent.slice(0, 120),
        idioma: navigator.language, version: (window.TIENDA && window.TIENDA.version) || null,
      };
      try { await fetchOriginal('/api/sesiones', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: sesionId, semilla }) }); }
      catch { sesionId = null; return; }
    }
    pintarIndicador();
    registrar({ tipo: 'nav', url: location.pathname, pantalla: capturar() });
  }

  function arrancar() {
    estilos();
    observar();
    if (eleccion === 'si') iniciar();
    // A una persona se le pregunta; a un navegador automatizado (Playwright, codegen) no: así tus pruebas no ven el aviso.
    else if (eleccion !== 'no' && !navigator.webdriver) pedirConsentimiento();
    window.addEventListener('pagehide', enviar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
