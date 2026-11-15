// vivo.js · sesión 1 del taller «¿Difícil de explicar? ¡No!»: la imagen base de FLUX y el editor en vivo.
// Vivo.base()        → la imagen base del alumno (data:…) o la de ejemplo (gato pirata hecho con FLUX en clase).
// Vivo.guardar(data) → la reduce a 1024 px y la guarda en este navegador (las escenas de p5, Three.js y GSAP la usan).
// Vivo.editor(caja, {lib, presets}) → editor con presets, fps y vista previa. El código corre en un iframe srcdoc:
// así no hace falta eval (el LMS lo prohíbe) y cada «Ejecutar» empieza de cero.
window.Vivo = (() => {
  const CLAVE = 'flux-base-v1';
  const COMUN = new URL('../../comun/', location.href).href;
  const EJEMPLO = COMUN + 'base-ejemplo.webp';
  // la escena del gato pirata en 9 capas (dibujadas en código, _fuente/capas.py), de atrás hacia adelante
  const CAPAS = ['capa-1-cielo', 'capa-2-sol', 'capa-3-nubes', 'capa-4-montanas', 'capa-5-colinas', 'capa-6-mar', 'capa-7-barco', 'capa-8-olas', 'capa-9-gaviotas'];
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };

  const base = () => leer(CLAVE) || EJEMPLO;
  const esPropia = () => !!leer(CLAVE);
  const olvidar = () => { try { localStorage.removeItem(CLAVE); } catch (e) {} };
  const cargar = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
  async function guardar(dataUrl) {
    const img = await cargar(dataUrl);
    const k = Math.min(1, 1024 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/jpeg', 0.86);
    if (!escribir(CLAVE, d)) throw new Error('El navegador no dejó guardar la imagen (¿modo privado?)');
    return d;
  }

  async function copiar(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
    try { await window.parent.navigator.clipboard.writeText(t); return true; } catch (e) {}
    const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} a.remove(); return ok;
  }

  // ---- el documento que corre dentro del iframe ----
  const seguro = (code) => code.replace(/<\/script/gi, '<\\/script');
  function documento(lib, codigo, fps, { standalone = false } = {}) {
    const b = base();
    const p5 = standalone ? 'https://cdn.jsdelivr.net/npm/p5@1.11.1/lib/p5.min.js' : COMUN + 'p5-1.11.1.min.js';
    const three = standalone ? 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js' : COMUN + 'three.module.min.js';
    const gsap = standalone ? 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js' : COMUN + 'gsap.min.js';
    const errores = standalone ? '' :
      `<script>addEventListener('error',e=>parent.postMessage({vivo:'error',msg:(e.message||'error')+(e.lineno?' · línea '+e.lineno:'')},'*'));` +
      `addEventListener('unhandledrejection',e=>parent.postMessage({vivo:'error',msg:String(e.reason)},'*'));` +
      `addEventListener('load',()=>parent.postMessage({vivo:'ok'},'*'));<\/script>` +
      // p5.loadImage hace fetch() de la imagen antes de dibujarla, y el CSP del LMS no deja hacer fetch a «data:»:
      // para esas URL se responde aquí mismo solo con el tipo (p5 luego la carga con <img>, que sí está permitido).
      `<script>{const f=window.fetch.bind(window);window.fetch=(u,o)=>(typeof u==='string'&&u.startsWith('data:'))?Promise.resolve(new Response(null,{headers:{'content-type':u.slice(5,u.indexOf(';'))}})):f(u,o);}<\/script>`;
    const capas = CAPAS.map((n) => (standalone ? 'recursos-capas/' : COMUN) + n + '.svg');
    const datos = `<script>window.BASE=${JSON.stringify(standalone && !esPropia() ? 'base.webp' : b)};window.FPS=${Number(fps) || 24};window.CAPAS=${JSON.stringify(capas)};<\/script>`;
    let cuerpo = '';
    if (lib === 'p5') cuerpo = `<script src="${p5}"><\/script><script>\n${seguro(codigo)}\n<\/script>`;
    else if (lib === 'three') cuerpo = `<script type="importmap">{"imports":{"three":"${three}"}}<\/script><script type="module">\n${seguro(codigo)}\n<\/script>`;
    else cuerpo = `<script src="${gsap}"><\/script><script>\n${seguro(codigo)}\n<\/script>`;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Mi pieza · ${lib}</title><style>html,body{margin:0;height:100%;background:#101018;overflow:hidden;color:#fff;font-family:system-ui,sans-serif}canvas{display:block}</style>` +
      `${errores}${datos}</head><body>${cuerpo}</body></html>`;
  }

  // ---- el editor ----
  function editor(caja, { lib, presets, clave, alEjecutar }) {
    const nombres = Object.keys(presets);
    const kCod = 'vivo-' + clave + '-codigo', kPre = 'vivo-' + clave + '-preset', kFps = 'vivo-' + clave + '-fps';
    let actual = leer(kPre) || nombres[0];
    if (!presets[actual]) actual = nombres[0];
    caja.innerHTML = `
      <div class="ve-izq">
        <div class="ve-fila ve-presets" role="group" aria-label="Ejemplos"></div>
        <div class="ve-fila"><label class="ve-fps">fps <input type="range" min="1" max="60" step="1"><b></b></label>
          <span class="ve-fpschips"></span></div>
        <textarea class="ve-codigo" spellcheck="false" aria-label="Código"></textarea>
        <div class="ve-fila ve-acciones">
          <button type="button" class="ve-run">▶ Ejecutar <small>Ctrl + Enter</small></button>
          <button type="button" class="ve-copiar">Copiar código</button>
          <button type="button" class="ve-bajar">Descargar .html</button>
          <button type="button" class="ve-reset" title="Volver al ejemplo original">↺</button>
        </div>
        <p class="ve-estado" aria-live="polite"></p>
      </div>
      <div class="ve-der">
        <div class="ve-marco"><iframe class="ve-vista" title="Vista previa" loading="eager"></iframe></div>
        <p class="ve-base"></p>
      </div>`;
    const $ = (s) => caja.querySelector(s);
    const ta = $('.ve-codigo'), fps = $('.ve-fps input'), fpsB = $('.ve-fps b'), vista = $('.ve-vista'), estado = $('.ve-estado');
    fps.value = leer(kFps) || 24;
    ta.value = leer(kCod) || presets[actual].codigo;
    function pintar() {
      fpsB.textContent = fps.value;
      $('.ve-presets').innerHTML = '';
      for (const n of nombres) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = presets[n].titulo;
        b.title = presets[n].que || ''; b.setAttribute('aria-pressed', String(n === actual));
        b.onclick = () => { actual = n; ta.value = presets[n].codigo; escribir(kPre, n); escribir(kCod, ta.value); pintar(); ejecutar(); };
        $('.ve-presets').appendChild(b);
      }
      $('.ve-fpschips').innerHTML = '';
      for (const f of [6, 12, 24, 30, 60]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = f; b.setAttribute('aria-pressed', String(+fps.value === f));
        b.onclick = () => { fps.value = f; escribir(kFps, f); pintar(); ejecutar(); };
        $('.ve-fpschips').appendChild(b);
      }
      $('.ve-base').innerHTML = esPropia() ? 'Imagen base: <b>la tuya</b> (la elegiste en la escena de FLUX).'
        : 'Imagen base: <b>el ejemplo</b> (gato pirata hecho con FLUX). Elige la tuya en la escena de FLUX y vuelve.';
    }
    function ejecutar() {
      estado.className = 've-estado'; estado.textContent = 'Corriendo…';
      vista.srcdoc = documento(lib, ta.value, fps.value);
      if (alEjecutar) alEjecutar();
    }
    addEventListener('message', (e) => {
      if (e.source !== vista.contentWindow || !e.data || !e.data.vivo) return;
      if (e.data.vivo === 'error') { estado.className = 've-estado mal'; estado.textContent = '✗ ' + e.data.msg; }
      else if (estado.textContent === 'Corriendo…') { estado.className = 've-estado ok'; estado.textContent = `✓ Corre a ${fps.value} fps. Cambia un número y vuelve a ejecutar.`; }
    });
    ta.addEventListener('input', () => escribir(kCod, ta.value));
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ejecutar(); }
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); }
    });
    fps.addEventListener('input', () => { fpsB.textContent = fps.value; });
    fps.addEventListener('change', () => { escribir(kFps, fps.value); pintar(); ejecutar(); });
    $('.ve-run').onclick = ejecutar;
    $('.ve-reset').onclick = () => { ta.value = presets[actual].codigo; escribir(kCod, ta.value); ejecutar(); };
    $('.ve-copiar').onclick = async (e) => { const ok = await copiar(ta.value); e.target.textContent = ok ? '✓ Copiado' : 'Selecciona y copia'; setTimeout(() => { e.target.textContent = 'Copiar código'; }, 2200); };
    $('.ve-bajar').onclick = () => {
      const html = documento(lib, ta.value, fps.value, { standalone: true });
      const a = document.createElement('a');
      a.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      a.download = 'index.html'; document.body.appendChild(a); a.click(); a.remove();
      estado.className = 've-estado'; estado.textContent = esPropia()
        ? 'index.html lleva tu imagen dentro: ábrelo con doble clic.'
        : 'index.html busca base.webp: pon tu imagen con ese nombre en la misma carpeta.';
      if (/CAPAS/.test(ta.value)) estado.textContent += ' Las capas van en la carpeta recursos-capas/ (descárgala de Materiales).';
    };
    pintar(); ejecutar();
    return { ejecutar };
  }

  return { base, esPropia, guardar, olvidar, cargar, copiar, editor, EJEMPLO, COMUN };
})();
