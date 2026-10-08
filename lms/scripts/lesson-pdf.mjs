// Genera el PDF de una sesión (objetivos, ciclo, enlaces, contenido y tarea) desde el API del LMS.
//
//   LMS_TOKEN=lms_… node lms/scripts/lesson-pdf.mjs http://localhost:8080 pa-01 clase-01.pdf
//   (o LMS_EMAIL y LMS_PASSWORD para entrar con una cuenta local)
//
// Necesita playwright-core y un Chromium (PLAYWRIGHT_CHROMIUM=/ruta/chrome si no es el del sistema).
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const [base = "http://localhost:8080", lessonId = "pa-01", out = `${lessonId}.pdf`] = process.argv.slice(2);

async function api(path, token, body) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

let token = process.env.LMS_TOKEN;
if (!token) token = (await api("/api/v1/auth/login", null, { email: process.env.LMS_EMAIL, password: process.env.LMS_PASSWORD, label: "pdf" })).token;
const l = await api(`/api/v1/lessons/${lessonId}`, token);
const tasks = await Promise.all(l.assignments.map((a) => api(`/api/v1/assignments/${a.id}`, token)));

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const date = l.starts_at ? new Date(l.starts_at).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" }) : "";
const TOOLS = { zoom: "Zoom", vscode: "VS Code", docker: "Docker", terminal: "Terminal", jmd: "jmd", "claude-code": "Claude Code", opencode: "OpenCode", git: "git", lms: "LMS", lectura: "Lectura" };
const KINDS = { link: "enlace", doc: "documentación", repo: "repositorio", video: "vídeo", slides: "diapositivas", pdf: "PDF" };

const materialsByObjective = l.objectives
  .map((o) => ({ o, items: l.materials.filter((m) => m.objective_ids.includes(o.id)) }))
  .filter((g) => g.items.length);

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(l.title)}</title>
<style>
@page { size: A4; margin: 18mm 16mm 20mm; @bottom-center { content: "${esc(l.course.title)} · ${esc(l.title)} · pág. " counter(page); font: 9px system-ui; color: #777; } }
body { font: 10.5pt/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1b1b1f; }
h1 { font-size: 24pt; line-height: 1.15; margin: 0 0 .3em; } h2 { font-size: 15pt; margin: 1.6em 0 .5em; border-bottom: 1.5px solid #0b57d0; padding-bottom: .15em; color: #0b57d0; page-break-after: avoid; }
h3 { font-size: 12pt; margin: 1.2em 0 .4em; page-break-after: avoid; }
.cover { min-height: 240mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover .course { color: #0b57d0; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; font-size: 10pt; }
.cover .meta { color: #666; margin-top: 1em; } .cover ol { margin-top: 2em; } .cover li { margin: .3em 0; }
code, pre { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 9.2pt; } code { background: #eef0f3; padding: .05em .3em; border-radius: 3px; }
pre { background: #eef0f3; padding: .6em .8em; border-radius: 6px; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; } pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: .6em 0; font-size: 9.5pt; page-break-inside: auto; } th, td { border: 1px solid #ccc; padding: .3em .5em; text-align: left; vertical-align: top; } th { background: #eef0f3; }
tr { page-break-inside: avoid; } blockquote { margin: .8em 0; padding: .2em .9em; border-left: 3px solid #0b57d0; color: #555; }
a { color: #0b57d0; text-decoration: none; } hr { border: 0; border-top: 1px solid #ddd; margin: 1.4em 0; }
.cycle li { margin: .35em 0; } .cycle .tool { display: inline-block; font-size: 8.5pt; border: 1px solid #bbb; border-radius: 999px; padding: 0 .5em; margin-left: .3em; color: #555; }
.cycle .check { color: #555; font-size: 9.5pt; } .links li { margin: .2em 0; } .links .kind { color: #777; font-size: 8.5pt; }
.rubric td:first-child { font-weight: 600; width: 40%; } .box { border: 1px solid #ccc; border-radius: 6px; padding: .6em .9em; margin: .8em 0; background: #fafafa; }
</style></head><body>
<section class="cover">
  <div class="course">${esc(l.course.title)} · ${esc(l.module.title)}</div>
  <h1>${esc(l.title)}</h1>
  <div class="meta">${esc(date)}${l.recording ? " · grabación disponible en el LMS" : ""}</div>
  <h3>Objetivos de la sesión</h3>
  <ol>${l.objectives.map((o) => `<li>${esc(o.title)}</li>`).join("")}</ol>
  <div class="box"><b>En el LMS</b>: marca cada paso del ciclo de aprendizaje, abre los enlaces, pregunta en el hilo de la sesión y entrega la tarea.
  ${l.repo ? `<br>Código de la sesión: <a href="${esc(l.repo.url)}">${esc(l.repo.url)}</a> (<code>${esc(l.repo.ref)}</code>) · en la terminal: <code>${esc(l.open_command)}</code>` : ""}</div>
</section>

<h2>Ciclo de aprendizaje</h2>
<p>Cada paso tiene su herramienta y una comprobación. Hazlos en orden y márcalos en el LMS.</p>
<ol class="cycle">${l.cycle.map((s) => `<li><b>${esc(s.title)}</b><span class="tool">${esc(TOOLS[s.tool] ?? s.tool)}</span><br>${esc(s.description)}${s.check ? `<br><span class="check">Comprobación: <code>${esc(s.check)}</code></span>` : ""}</li>`).join("")}</ol>

<h2>Enlaces y materiales</h2>
${materialsByObjective.map((g) => `<h3>${esc(g.o.title)}</h3><ul class="links">${g.items.map((m) => `<li><a href="${esc(m.url)}">${esc(m.title)}</a> <span class="kind">${esc(KINDS[m.kind] ?? m.kind)} · ${esc(m.url)}</span></li>`).join("")}</ul>`).join("")}

<h2>Contenido de la clase</h2>
${l.content_html}

${tasks.map((a) => `<h2 style="page-break-before: always">${esc(a.title)}</h2>
<p>${a.due_at ? `<b>Fecha límite:</b> ${esc(new Date(a.due_at).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" }))} · ` : ""}<b>Puntaje:</b> ${a.max_score} puntos · entrega en el LMS o con <code>${esc(a.submit_command)}</code></p>
${a.description_html}
${a.rubric.length ? `<h3>Rúbrica</h3><table class="rubric"><tbody>${a.rubric.map((c) => `<tr><td>${esc(c.criterion)}</td><td>${c.levels.map((lv) => `${esc(lv.title)}: <b>${lv.points}</b>`).join(" · ")}</td></tr>`).join("")}</tbody></table>` : ""}`).join("")}
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
await browser.close();
writeFileSync(out + ".html", html);
console.log("PDF listo:", out);
