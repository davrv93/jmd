import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../..');
const webRoot = path.join(repoRoot, 'web');
const capturasDir = path.join(repoRoot, 'sitio', 'pruebas', 'capturas');

function ct(p) {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function safeJoin(root, rel) {
  const p = path.normalize(path.join(root, rel));
  if (!p.startsWith(root)) return null;
  return p;
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (!url.pathname.startsWith('/cursos/')) {
        res.statusCode = 404; res.end('not found');
        return;
      }
      let rel = url.pathname.slice('/cursos/'.length);
      rel = decodeURIComponent(rel);
      if (!rel || rel.endsWith('/')) rel += 'index.html';
      const fp = safeJoin(webRoot, rel);
      if (!fp) { res.statusCode = 400; res.end('bad path'); return; }
      const data = await fs.readFile(fp);
      res.statusCode = 200;
      res.setHeader('Content-Type', ct(fp));
      res.end(data);
    } catch (e) {
      res.statusCode = 404;
      res.end('not found');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, baseURL: `http://127.0.0.1:${port}/cursos/` };
}

function freezeTimeInitScript(iso) {
  // Congela Date.now() y new Date() (sin args) para que ocultar.js filtre con un "ahora" fijo.
  return `(() => {
    const fixed = Date.parse(${JSON.stringify(iso)});
    const RealDate = Date;
    class MockDate extends RealDate {
      constructor(...args){
        if (args.length === 0) super(fixed);
        else super(...args);
      }
      static now(){ return fixed; }
    }
    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;
    MockDate.prototype = RealDate.prototype;
    // @ts-ignore
    window.Date = MockDate;
  })();`;
}

async function main() {
  await fs.mkdir(capturasDir, { recursive: true });

  let chromium;
  try {
    const require = createRequire(import.meta.url);
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error('No pude cargar Playwright. Ejecuta con NODE_PATH apuntando a un node_modules que tenga playwright.');
    throw e;
  }

  const { server, baseURL } = await startServer();
  const resultados = [];
  const capturas = [];

  const json = JSON.parse(await fs.readFile(path.join(repoRoot, 'datos', 'sitio.json'), 'utf-8'));
  const slug = (json.cursos && json.cursos[0] && json.cursos[0].slug) ? json.cursos[0].slug : null;
  if (!slug) throw new Error('No hay cursos en datos/sitio.json');

  const browser = await chromium.launch();
  try {
    const viewports = [390, 768, 1280];
    const schemes = ['light', 'dark'];

     async function assertNoLayoutBugsIndex(page, label) {
       const problems = await page.evaluate(() => {
         function isVisible(el) {
           if (!el) return false;
           if (el.hidden) return false;
           const cs = getComputedStyle(el);
           if (cs.display === 'none' || cs.visibility === 'hidden') return false;
           const r = el.getBoundingClientRect();
           if (r.width <= 0 || r.height <= 0) return false;
           if (parseFloat(cs.opacity || '1') <= 0) return false;
           return true;
         }
 
         function rectsIntersect(a, b) {
           const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
           const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
           return x > 0 && y > 0;
         }

         function isIdentityTransform(t) {
           if (!t || t === 'none') return true;
           // matrix(a,b,c,d,e,f)
           const m2 = t.match(/^matrix\(([^)]+)\)$/);
           if (m2) {
             const p = m2[1].split(',').map((x) => parseFloat(x.trim()));
             if (p.length !== 6) return false;
             const [a, b, c, d, e, f] = p;
             return Math.abs(a - 1) < 1e-4 && Math.abs(b) < 1e-4 && Math.abs(c) < 1e-4 && Math.abs(d - 1) < 1e-4 && Math.abs(e) < 1e-3 && Math.abs(f) < 1e-3;
           }
           // matrix3d(...)
           const m3 = t.match(/^matrix3d\(([^)]+)\)$/);
           if (m3) {
             const p = m3[1].split(',').map((x) => parseFloat(x.trim()));
             if (p.length !== 16) return false;
             // Identity matrix3d indices: 0,5,10,15 = 1; others 0.
             const id = [
               1,0,0,0,
               0,1,0,0,
               0,0,1,0,
               0,0,0,1
             ];
             for (let i = 0; i < 16; i++) if (Math.abs((p[i] || 0) - id[i]) > (i === 12 || i === 13 || i === 14 ? 1e-3 : 1e-4)) return false;
             return true;
           }
           return false;
         }

         const problems = [];
         const filters = document.querySelector('.filters');
         const heroH1 = document.querySelector('.hero h1');
         const cardsAll = Array.from(document.querySelectorAll('.card'));
         const cardsVisible = cardsAll.filter(isVisible);

         // (d) Opacity/transform final
         for (const el of cardsAll) {
           const cs = getComputedStyle(el);
           const op = parseFloat(cs.opacity || '1');
           if (op < 0.999) problems.push(`Card opacity != 1 (${op}) · ${el.querySelector('b')?.textContent?.slice(0, 40) || '(sin título)'}`);
           if (!isIdentityTransform(cs.transform)) problems.push(`Card transform no-identity (${cs.transform}) · ${el.querySelector('b')?.textContent?.slice(0, 40) || '(sin título)'}`);
         }

         // (b) first card under chips row
         if (filters && cardsVisible.length) {
           const fr = filters.getBoundingClientRect();
           const cr = cardsVisible[0].getBoundingClientRect();
           if (cr.top < fr.bottom - 0.5) problems.push(`First card overlaps chips: card.top=${cr.top.toFixed(1)} < filters.bottom=${fr.bottom.toFixed(1)}`);
         }

         // (c) hero h1 must not intersect any card
         if (heroH1) {
           const hr = heroH1.getBoundingClientRect();
           for (const el of cardsVisible) {
             const r = el.getBoundingClientRect();
             if (rectsIntersect(hr, r)) {
               problems.push(`Hero h1 intersects a card · ${el.querySelector('b')?.textContent?.slice(0, 40) || '(sin título)'}`);
               break;
             }
           }
         }

         // (a) cards must not overlap each other
         for (let i = 0; i < cardsVisible.length; i++) {
           const a = cardsVisible[i].getBoundingClientRect();
           for (let j = i + 1; j < cardsVisible.length; j++) {
             const b = cardsVisible[j].getBoundingClientRect();
             if (rectsIntersect(a, b)) {
               problems.push(`Cards overlap: #${i} and #${j}`);
               i = cardsVisible.length; // break outer
               break;
             }
           }
         }

         return problems;
       });
       if (problems.length) {
         throw new Error(`Layout roto en index (${label}):\n- ${problems.join('\n- ')}`);
       }
      }

      async function assertContrastAAAndNoInternalOverlaps(page, label) {
        const problems = await page.evaluate(() => {
          function isVisible(el) {
            if (!el) return false;
            if (el.hidden) return false;
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) return false;
            if (parseFloat(cs.opacity || '1') <= 0) return false;
            return true;
          }

          function rectsIntersect(a, b) {
            const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            return x > 0 && y > 0;
          }

          function parseColor(s) {
            if (!s) return null;
            s = String(s).trim();
            if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
            const mRgb = s.match(/^rgba?\(([^)]+)\)$/i);
            if (mRgb) {
              const parts = mRgb[1].split(',').map((p) => p.trim());
              const r = parseFloat(parts[0]);
              const g = parseFloat(parts[1]);
              const b = parseFloat(parts[2]);
              const a = parts.length >= 4 ? parseFloat(parts[3]) : 1;
              return { r, g, b, a: isFinite(a) ? a : 1 };
            }
            const mHex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
            if (mHex) {
              let h = mHex[1].toLowerCase();
              if (h.length === 3) h = h.split('').map((c) => c + c).join('');
              const n = parseInt(h, 16);
              return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
            }
            return null;
          }

          function composite(fg, bg) {
            const a = fg.a + bg.a * (1 - fg.a);
            if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
            const r = (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a;
            const g = (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a;
            const b = (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a;
            return { r, g, b, a };
          }

          function srgbToLin(v) {
            v = v / 255;
            return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          }

          function relL(c) {
            const R = srgbToLin(c.r);
            const G = srgbToLin(c.g);
            const B = srgbToLin(c.b);
            return 0.2126 * R + 0.7152 * G + 0.0722 * B;
          }

          function contrastRatio(fg, bg) {
            const L1 = relL(fg);
            const L2 = relL(bg);
            const hi = Math.max(L1, L2);
            const lo = Math.min(L1, L2);
            return (hi + 0.05) / (lo + 0.05);
          }

          function getVar(el, name) {
            const v = getComputedStyle(el).getPropertyValue(name);
            return v ? v.trim() : '';
          }

          function effectiveBg(el) {
            // Fondo base: el gradiente termina en var(--fondo)
            const base = parseColor(getVar(document.documentElement, '--fondo')) || { r: 255, g: 255, b: 255, a: 1 };
            const baseOpaque = { ...base, a: 1 };

            const container = el.closest('.card, .fact, .group, .grupo, .prose, .stat, .empty') || document.body;
            const cs = getComputedStyle(container);

            // 1) background-color opaco
            const bgc = parseColor(cs.backgroundColor);
            if (bgc && bgc.a >= 0.999) return { r: bgc.r, g: bgc.g, b: bgc.b, a: 1 };

            // 2) background-color semitransparente
            if (bgc && bgc.a > 0.001) {
              const out = composite(bgc, baseOpaque);
              return { r: out.r, g: out.g, b: out.b, a: 1 };
            }

            // 3) Gradientes/variables (tarjeta/transparencias)
            const tarjeta = parseColor(getVar(document.documentElement, '--tarjeta'));
            const tarjeta2 = parseColor(getVar(document.documentElement, '--tarjeta2'));
            const layer = (container.classList.contains('card') || container.classList.contains('group') || container.classList.contains('grupo'))
              ? (tarjeta2 || tarjeta)
              : (tarjeta || tarjeta2);
            if (layer) {
              const out = composite(layer, baseOpaque);
              return { r: out.r, g: out.g, b: out.b, a: 1 };
            }
            return baseOpaque;
          }

          function fmt(c) {
            return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${c.a.toFixed(3)})`;
          }

          const problems = [];

          // Contrast AA (4.5:1) for kickers/dates and price texts
          const kickerEls = Array.from(document.querySelectorAll('.when, .ses .cuando, .grupo .ses .cuando')).filter(isVisible);
          const priceEls = Array.from(document.querySelectorAll('.card .pie, .card [data-precio], .fact .price, .card .foot'))
            .filter(isVisible)
            .filter((el) => /S\/\s*\d/.test(el.textContent || ''));

          for (const el of kickerEls) {
            const cs = getComputedStyle(el);
            const fg = parseColor(cs.color);
            if (!fg) continue;
            const bg = effectiveBg(el);
            const ratio = contrastRatio({ ...fg, a: 1 }, bg);
            if (ratio < 4.5) {
              const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
              problems.push(`Contrast < 4.5 (${ratio.toFixed(2)}) · kicker · "${txt}" · fg=${cs.color} bg≈${fmt(bg)}`);
            }
          }
          for (const el of priceEls) {
            const cs = getComputedStyle(el);
            const fg = parseColor(cs.color);
            if (!fg) continue;
            const bg = effectiveBg(el);
            const ratio = contrastRatio({ ...fg, a: 1 }, bg);
            if (ratio < 4.5) {
              const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
              problems.push(`Contrast < 4.5 (${ratio.toFixed(2)}) · price · "${txt}" · fg=${cs.color} bg≈${fmt(bg)}`);
            }
          }

          // No intersections within each card: kicker, title, price
          const cards = Array.from(document.querySelectorAll('.card')).filter(isVisible);
          for (const card of cards) {
            const title = card.querySelector('.main b') || card.querySelector('b');
            const kicker = card.querySelector('.main .when') || card.querySelector('.when');
            const price = Array.from(card.querySelectorAll('.main .pie, .main .foot, .pie, .foot'))
              .filter(isVisible)
              .find((el) => /S\/\s*\d/.test(el.textContent || ''));
            if (!title || !kicker || !price) continue;
            if (!isVisible(title) || !isVisible(kicker) || !isVisible(price)) continue;
            const rt = title.getBoundingClientRect();
            const rk = kicker.getBoundingClientRect();
            const rp = price.getBoundingClientRect();
            const name = (title.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
            if (rectsIntersect(rk, rt)) problems.push(`Card internal overlap · kicker∩title · ${name}`);
            if (rectsIntersect(rt, rp)) problems.push(`Card internal overlap · title∩price · ${name}`);
            if (rectsIntersect(rk, rp)) problems.push(`Card internal overlap · kicker∩price · ${name}`);
          }

          return problems;
        });
        if (problems.length) {
          throw new Error(`AA/overlap checks fallaron (${label}):\n- ${problems.join('\n- ')}`);
        }
      }

      async function assertNoOverlapGroups(page, label) {
        const problems = await page.evaluate(() => {
          function isVisible(el) {
            if (!el) return false;
           if (el.hidden) return false;
           const cs = getComputedStyle(el);
           if (cs.display === 'none' || cs.visibility === 'hidden') return false;
           const r = el.getBoundingClientRect();
           if (r.width <= 0 || r.height <= 0) return false;
           if (parseFloat(cs.opacity || '1') <= 0) return false;
           return true;
         }

         function rectsIntersect(a, b) {
           const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
           const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
           return x > 0 && y > 0;
         }

         const groups = Array.from(document.querySelectorAll('.grupos > .grupo')).filter(isVisible);
         const problems = [];
         for (let i = 0; i < groups.length; i++) {
           const a = groups[i].getBoundingClientRect();
           for (let j = i + 1; j < groups.length; j++) {
             const b = groups[j].getBoundingClientRect();
             if (rectsIntersect(a, b)) {
               problems.push(`Groups overlap: #${i} and #${j}`);
               i = groups.length;
               break;
             }
           }
         }
         return problems;
       });
       if (problems.length) throw new Error(`Layout roto en grupos (${label}):\n- ${problems.join('\n- ')}`);
     }

    for (const w of viewports) {
      for (const scheme of schemes) {
        const ctx = await browser.newContext({
          viewport: { width: w, height: 820 },
          colorScheme: scheme
        });
        const page = await ctx.newPage();

        const errs = [];
        page.on('console', (m) => { if (m.type() === 'error') errs.push(`console:${m.text()}`); });
        page.on('pageerror', (e) => errs.push(`pageerror:${e.message}`));

        await page.goto(baseURL, { waitUntil: 'load' });
        await page.waitForTimeout(2200);

        const okScroll = await page.evaluate(() => {
          const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          return sw <= window.innerWidth + 1;
        });
        if (!okScroll) throw new Error(`Horizontal scroll en index (${w}px, ${scheme})`);
        if (errs.length) throw new Error(`Errores de consola en index (${w}px, ${scheme}):\n- ${errs.join('\n- ')}`);

        await assertNoLayoutBugsIndex(page, `${w}px, ${scheme}`);
        await assertContrastAAAndNoInternalOverlaps(page, `index · ${w}px, ${scheme}`);

        const p1 = path.join(capturasDir, `index-${w}-${scheme}.png`);
        await page.screenshot({ path: p1, fullPage: true });
        capturas.push(p1);
        resultados.push({ caso: `index ${w} ${scheme}`, ok: true });

        await page.goto(baseURL + slug + '/', { waitUntil: 'load' });
        await page.waitForTimeout(2200);

        const okScroll2 = await page.evaluate(() => {
          const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          return sw <= window.innerWidth + 1;
        });
        if (!okScroll2) throw new Error(`Horizontal scroll en curso (${slug}) (${w}px, ${scheme})`);
        if (errs.length) throw new Error(`Errores de consola en curso (${slug}) (${w}px, ${scheme}):\n- ${errs.join('\n- ')}`);

        await assertNoOverlapGroups(page, `${slug} · ${w}px, ${scheme}`);
        await assertContrastAAAndNoInternalOverlaps(page, `curso(${slug}) · ${w}px, ${scheme}`);

        const p2 = path.join(capturasDir, `curso-${slug}-${w}-${scheme}.png`);
        await page.screenshot({ path: p2, fullPage: true });
        capturas.push(p2);
        resultados.push({ caso: `curso ${slug} ${w} ${scheme}`, ok: true });

        await ctx.close();
      }
    }

    // Modal de código (mock)
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 820 }, colorScheme: 'light' });
      const page = await ctx.newPage();
      const errs = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push(`console:${m.text()}`); });
      page.on('pageerror', (e) => errs.push(`pageerror:${e.message}`));

      await page.route('**/inscripcion-web/api/codigo/validar', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, max: 3, restantes: 1, todos: true, vence: '2027-01-01T00:00:00-05:00' })
        });
      });
      await page.route('**/inscripcion-web/api/codigo/canje', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, cuenta: 'nueva', enlace: 'https://jmd-learn.online/?demo=1', cursos: ['Curso demo'], mensaje: 'Demo OK' })
        });
      });

      await page.goto(baseURL, { waitUntil: 'load' });
      await page.waitForSelector('input[data-cohorte]');
      await page.check('input[data-cohorte]');
      await page.waitForSelector('#mc-barra.on');
      await page.click('#mc-abrir');
      await page.fill('#mc-codigo', 'DEMO123');
      await page.locator('#mc-codigo').evaluate((el) => el.blur());
      await page.waitForFunction(() => {
        const e = document.getElementById('mc-estado');
        return e && e.classList.contains('bien');
      });
      await page.fill('#mc-nombre', 'Ada Lovelace');
      await page.fill('#mc-email', 'ada@example.com');
      await page.fill('#mc-tel', '986149476');
      await page.click('#mc-enviar');
      await page.waitForSelector('#mc-paso2:not([hidden])');

      if (errs.length) throw new Error(`Errores de consola en modal: \n- ${errs.join('\n- ')}`);

      const p = path.join(capturasDir, `modal-codigo-exito.png`);
      await page.screenshot({ path: p, fullPage: true });
      capturas.push(p);
      resultados.push({ caso: 'modal codigo (mock)', ok: true });
      await ctx.close();
    }

    // Filtro por tiempo (reloj fijo)
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 820 }, colorScheme: 'light' });
      const page = await ctx.newPage();
      await page.addInitScript(freezeTimeInitScript('2026-12-06T12:00:00-05:00'));
      await page.goto(baseURL, { waitUntil: 'load' });
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const ahora = Date.now();
        const els = Array.from(document.querySelectorAll('[data-inicio]'));
        let conPasadas = 0;
        let mal = 0;
        for (const e of els) {
          const t = Date.parse(e.getAttribute('data-inicio'));
          if (!isNaN(t) && t <= ahora) {
            conPasadas++;
            if (!e.hidden) mal++;
          }
        }
        return { total: els.length, conPasadas, mal };
      });
      if (r.conPasadas === 0) throw new Error('No encontré ningún elemento con data-inicio pasado para verificar el filtro.');
      if (r.mal !== 0) throw new Error(`Filtro por tiempo falló: ${r.mal} elementos pasados siguen visibles (de ${r.conPasadas}).`);
      const p = path.join(capturasDir, `index-reloj-fijo.png`);
      await page.screenshot({ path: p, fullPage: true });
      capturas.push(p);
      resultados.push({ caso: 'filtro por tiempo (reloj fijo)', ok: true, detalle: r });
      await ctx.close();
    }

  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\nRESULTADOS');
  for (const r of resultados) console.log(`- ${r.ok ? 'OK' : 'FAIL'} · ${r.caso}${r.detalle ? ' · ' + JSON.stringify(r.detalle) : ''}`);
  console.log('\nCAPTURAS');
  for (const p of capturas) console.log('- ' + p);
}

main().catch((e) => {
  console.error('\nSMOKE FAIL');
  console.error(e && e.stack ? e.stack : String(e));
  process.exitCode = 1;
});
