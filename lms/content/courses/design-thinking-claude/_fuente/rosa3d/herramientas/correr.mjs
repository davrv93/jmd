// Abre una página del servidor de trabajo y muestra window.INFO.  uso: node correr.mjs /build/convertir.html
const { chromium } = (await import(process.env.PLAYWRIGHT || 'playwright')).default || (await import(process.env.PLAYWRIGHT || 'playwright'));
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 800, height: 800 } });
await ctx.addInitScript(() => { try { speechSynthesis.speak = () => {}; } catch (e) {} });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await p.goto('http://127.0.0.1:18745' + process.argv[2]);
await p.waitForFunction(() => document.title === 'listo', null, { timeout: 120000 });
console.log(JSON.stringify(await p.evaluate(() => window.INFO)));
console.log('errores:', errs.filter((e) => !/TGA loader|404/.test(e)).slice(0, 10));
await b.close();
