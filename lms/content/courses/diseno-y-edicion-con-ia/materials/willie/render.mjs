#!/usr/bin/env node
// render.mjs · exporta una pieza HTML (con window.willie.seek) a MP4 con Playwright y FFmpeg.
// Uso: node render.mjs willie/index.html salida.mp4 [--fps 30] [--ancho 1920] [--alto 1080] [--inicio 0] [--fin 20]
// Requisitos (una vez): npm i playwright && npx playwright install chromium ; ffmpeg en el PATH.
// Todo abierto: Playwright (Apache-2.0), FFmpeg (LGPL/GPL), Chromium (BSD).
import { chromium } from "playwright";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const [entrada, salida = "salida.mp4"] = args.filter((a) => !a.startsWith("--"));
if (!entrada) { console.error("Uso: node render.mjs pieza.html salida.mp4 [--fps 30] [--ancho 1920] [--alto 1080] [--inicio 0] [--fin 20]"); process.exit(1); }
const opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? Number(args[i + 1]) : d; };
const fps = opt("fps", 30), ancho = opt("ancho", 1920), alto = opt("alto", 1080);
const inicio = opt("inicio", 0);

const dir = mkdtempSync(join(tmpdir(), "willie-"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve(entrada)).href + "?render=1&t=0");
await page.waitForFunction(() => window.willie && typeof window.willie.seek === "function");
const fin = opt("fin", await page.evaluate(() => window.willie.duracion));
const total = Math.round((fin - inicio) * fps);
console.log(`Cuadros: ${total} · ${fps} fps · ${ancho}x${alto} · ${inicio}-${fin} s`);
for (let i = 0; i < total; i++) {
  const t = inicio + i / fps;
  await page.evaluate((tt) => window.willie.seek(tt), t);
  await page.screenshot({ path: join(dir, `f${String(i).padStart(5, "0")}.png`), animations: "disabled" });
  if (i % fps === 0) process.stdout.write(`\r  ${t.toFixed(1)} s`);
}
await browser.close();
console.log("\nUniendo con FFmpeg…");
const ff = spawnSync("ffmpeg", ["-y", "-framerate", String(fps), "-i", join(dir, "f%05d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", salida], { stdio: "inherit" });
rmSync(dir, { recursive: true, force: true });
if (ff.status !== 0) { console.error("FFmpeg falló. ¿Está instalado? (sudo apt install ffmpeg · brew install ffmpeg · winget install ffmpeg)"); process.exit(ff.status ?? 1); }
console.log(`Listo: ${salida}`);
