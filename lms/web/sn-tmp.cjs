const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:18690/");
  await p.waitForTimeout(800);
  console.log("bajada:", await p.innerText("#bajada"));
  await p.fill("#nombre", "Prueba Local");
  await p.fill("#whatsapp", "987654322");
  await p.click("#form button");
  await p.waitForTimeout(6000);
  const caps = await p.$$("#boca > *");
  console.log("cápsulas:", caps.length);
  if (caps.length) { await caps[0].click({ force: true }); await p.waitForTimeout(4500); }
  await p.screenshot({ path: "/tmp/sn-3.png", fullPage: true });
  console.log("errores:", errs.join(" | ") || "ninguno");
  await b.close();
})();
