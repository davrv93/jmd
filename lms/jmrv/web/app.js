const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ══════════════════════════════════════════════════════════════ estado */
const S = {
  // crear
  models: [], cfModels: [], cfConfigured: false, provider: "pollinations",
  current: null, seedLocked: false, busy: false, mode: "single",
  job: null, jobTimer: null, playTimer: null, frames: [], frameIndex: 0,
  // studio
  cat: null, projects: [], proj: null, sel: 0, playing: false, playTimer2: null,
  commitTimer: null, renderTimer: null, fit: "contain", guides: false, zoom: 120,
};

/* ══════════════════════════════════════════════════════════════ util */
async function api(path, options = {}) {
  const rel = String(path || "").replace(/^\/(?!\/)/, "");
  const res = await fetch(rel, { headers: { "Content-Type": "application/json" }, ...options });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { detail: text }; }
  if (!res.ok) {
    const detail = data?.detail;
    if (detail && typeof detail === "object" && detail.error === "insufficient_balance") {
      showBalance({ known: true, balance: detail.balance, cost: detail.cost, topup: detail.topup });
      const err = new Error(detail.message || "Saldo de pollen insuficiente");
      err.balanceInfo = detail;
      throw err;
    }
    throw new Error(typeof detail === "string" ? detail : `HTTP ${res.status}`);
  }
  return data;
}

function setStatus(text, kind = "") {
  for (const id of ["statusText", "statusText2"]) if ($(id)) $(id).textContent = text;
  for (const id of ["pulse", "pulse2"]) if ($(id)) $(id).className = "pulse" + (kind ? " " + kind : "");
}
function setError(msg) {
  let text = msg || "";
  if (/insufficient balance/i.test(text)) text += " → recarga pollen en https://enter.pollinations.ai/top-up";
  if ($("errorBox")) $("errorBox").textContent = text;
}
function showBalance(info) {
  const pill = $("balanceBtn");
  if (pill) pill.textContent = `saldo: ${info && info.known ? (info.balance ?? "≥0") : "?"}`;
  const bar = $("balanceBar");
  if (!info || !info.known) { bar.classList.add("hidden"); return; }
  const cost = info.cost != null ? ` · este modelo cuesta ${info.cost} pollen` : "";
  $("balanceText").textContent = `Saldo pollen: ${info.balance ?? "?"}${cost}.`;
  if (info.topup) $("balanceLink").href = info.topup;
  bar.classList.remove("hidden");
}
function setKeyPill(ok) {
  const pill = $("keyPill");
  pill.classList.toggle("online", ok);
  pill.classList.toggle("offline", !ok);
  pill.lastElementChild.textContent = ok ? "API key lista" : "API key ausente";
}

/* ── modal (sustituye a prompt/confirm nativos) ── */
let modalResolve = null;
function openModal({ title, label = "Valor", value = "", hint = "", ok = "Aceptar" }) {
  $("modalTitle").textContent = title;
  $("modalLabel").textContent = label;
  $("modalInput").value = value;
  $("modalHint").textContent = hint;
  $("modalOk").textContent = ok;
  $("modal").hidden = false;
  setTimeout(() => $("modalInput").focus(), 30);
  return new Promise((resolve) => (modalResolve = resolve));
}
function closeModal(val) {
  $("modal").hidden = true;
  if (modalResolve) { modalResolve(val); modalResolve = null; }
}
$("modalOk").addEventListener("click", () => closeModal($("modalInput").value.trim() || null));
$("modalCancel").addEventListener("click", () => closeModal(null));
$("modalBackdrop").addEventListener("click", () => closeModal(null));
$("modalInput").addEventListener("keydown", (e) => { if (e.key === "Enter") closeModal($("modalInput").value.trim() || null); });

/* ══════════════════════════════════════════════════════════════ pestañas */
function setTab(tab) {
  $("tabBar").querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $("view-studio").classList.toggle("hidden", tab !== "studio");
  $("view-create").classList.toggle("hidden", tab !== "create");
  if (tab === "studio" && !S.proj) loadProjects();
}
$("tabBar").addEventListener("click", (e) => {
  const b = e.target.closest(".seg");
  if (b) setTab(b.dataset.tab);
});

/* ══════════════════════════════════════════════════════════════ CREAR */
async function loadModels() {
  try {
    const data = await api("/api/models");
    S.models = (data.models || []).filter((m) => m.id);
    S.cfModels = (data.cloudflare || []).filter((m) => m.id);
    S.cfConfigured = !!data.cloudflare_configured;
    renderModels();
    setKeyPill(true);
  } catch (err) {
    setKeyPill(false);
    setError(err.message);
  }
}
function renderModels() {
  const select = $("model");
  const useCF = S.provider === "cloudflare";
  const list = useCF ? S.cfModels : S.models;
  select.innerHTML = "";
  for (const m of list) {
    const opt = document.createElement("option");
    opt.value = m.id; opt.textContent = m.title || m.id; opt.title = m.id;
    select.appendChild(opt);
  }
  if (useCF && list.length) select.value = list[0].id;
  else if (!useCF) {
    const preferred = ["black-forest-labs/flux.1-schnell", "flux", "tongyi-mai/z-image-turbo", "z-image"];
    const hit = preferred.find((p) => S.models.some((m) => m.id === p || (m.aliases || []).includes(p)));
    if (hit) select.value = S.models.find((m) => m.id === hit || (m.aliases || []).includes(hit)).id;
  }
  onModelChange();
}
function onModelChange() {
  const id = $("model").value;
  if (S.provider === "cloudflare") {
    const m = S.cfModels.find((x) => x.id === id);
    $("modelHint").textContent = m ? `${m.description} · ${S.cfConfigured ? "listo" : "sin credenciales"}` : "";
    return;
  }
  const m = S.models.find((x) => x.id === id);
  $("modelHint").textContent = m ? `${m.description || m.title} · ${m.publisher || "community"}` : "";
}
function setProvider(provider) {
  S.provider = provider;
  $("providerToggle").querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.provider === provider));
  renderModels();
  const cf = provider === "cloudflare";
  $("neuronPill").classList.toggle("hidden", !cf);
  $("balanceBtn").classList.toggle("hidden", cf);
  if (cf) refreshNeurons(); else $("balanceBar").classList.add("hidden");
}
async function refreshNeurons() {
  const bal = await api("/api/balance").catch(() => null);
  const cf = bal?.cloudflare;
  if (!cf) return;
  $("neuronPill").textContent = `neuronas: ${Math.round(cf.neurons_today)} / ${cf.free_daily}`;
}
async function generate() {
  if (S.busy) return;
  const prompt = $("prompt").value.trim();
  if (!prompt) { setError("Escribe un prompt."); $("prompt").focus(); return; }
  const body = {
    prompt, negative_prompt: $("negative").value.trim() || null, provider: S.provider,
    model: $("model").value, size: $("sizeChips").querySelector(".chip.active").dataset.size,
    quality: $("quality").value || null, seed: $("seed").value ? parseInt($("seed").value, 10) : null,
    guidance_scale: parseFloat($("guidance").value), nologo: $("nologo").checked,
    private: $("private").checked, nofeed: $("nofeed").checked, safe: $("safe").checked,
    background: $("background").value, image: null,
  };
  S.busy = true; setError(""); setStatus("Generando…", "busy");
  $("generateBtn").classList.add("loading"); $("generateBtn").disabled = true;
  try {
    const entry = await api("/api/generate", { method: "POST", body: JSON.stringify(body) });
    showResult(entry); setStatus("Listo", "done"); refreshNeurons(); loadHistory();
  } catch (err) { setStatus("Error", "err"); setError(err.message); }
  finally { S.busy = false; $("generateBtn").classList.remove("loading"); $("generateBtn").disabled = false; }
}
function showResult(entry) {
  S.current = entry;
  const img = $("result"); img.src = entry.url; img.hidden = false;
  $("emptyState").classList.add("hidden");
  ["downloadBtn", "copyBtn", "cutoutBtn", "fullscreenBtn", "reuseBtn", "localAnimBtn"].forEach((id) => ($(id).disabled = false));
  $("stageMeta2").textContent = `${entry.model} · ${entry.size || "—"} · ${entry.elapsed_s ?? "?"}s · ${entry.created_at}`;
}
async function loadHistory() {
  const { items } = await api("/api/history");
  const gallery = $("gallery"); gallery.innerHTML = "";
  for (const item of items) {
    const div = document.createElement("div");
    div.className = "gallery-item";
    div.innerHTML = `<img loading="lazy" src="${item.url}" alt=""><span class="tag">${esc(item.model || "")} · ${esc(item.created_at || "")}</span>`;
    div.addEventListener("click", () => {
      showResult(item);
      if (item.prompt && item.model !== "rembg") {
        $("prompt").value = item.prompt; $("negative").value = item.negative_prompt || ""; $("model").value = item.model;
      }
    });
    gallery.appendChild(div);
  }
  const baseSel = $("baseImage"); const cur = baseSel.value;
  baseSel.innerHTML = '<option value="">— generar desde el prompt —</option>';
  for (const item of items.slice(0, 40)) {
    if (!item.file) continue;
    const opt = document.createElement("option");
    opt.value = item.file; opt.textContent = `${item.file} · ${item.model || ""}`;
    baseSel.appendChild(opt);
  }
  if (cur) baseSel.value = cur;
}
async function clearHistory() {
  const { items } = await api("/api/history");
  for (const item of items) await api(`/api/history/${encodeURIComponent(item.file)}`, { method: "DELETE" });
  loadHistory();
}
async function download() {
  if (!S.current) return;
  const res = await fetch(S.current.url);
  const blob = await res.blob();
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = S.current.file; a.click();
  URL.revokeObjectURL(a.href);
}
async function copyUrl() {
  if (!S.current) return;
  await navigator.clipboard.writeText(new URL(S.current.url, location.origin).href);
  const btn = $("copyBtn"); const before = btn.textContent; btn.textContent = "✓ Copiado";
  setTimeout(() => (btn.textContent = before), 1400);
}
async function cutout() {
  if (!S.current) return;
  setStatus("Recortando fondo…", "busy");
  try {
    const { entry } = await api("/api/remove-bg", { method: "POST", body: JSON.stringify({ filename: S.current.file }) });
    showResult(entry); setStatus("Fondo recortado (PNG α)", "done"); loadHistory();
  } catch (err) { setStatus("Error", "err"); setError(err.message); }
}

/* ── modo / hoja de frames (crear) ── */
const SHEET_PRESETS = {
  hold: "the scene stays exactly the same, subject static", appear: "the subject is appearing from soft light",
  disappear: "the subject is fading away", enter: "the subject enters from the left edge",
  exit: "the subject exits toward the right edge", "move-left": "the subject has shifted left",
  "move-right": "the subject has shifted right", walk: "the subject is walking, mid-stride",
  run: "the subject is running, dynamic stride", jump: "the subject is jumping, airborne",
  turn: "the subject has turned to a three-quarter view", crouch: "the subject is crouching low",
  wave: "the subject is waving a hand", "camera-in": "camera moved closer, tighter framing",
  "camera-out": "camera moved farther, wider framing", "pan-left": "camera panned left",
  "pan-right": "camera panned right", shake: "slight camera shake",
};
const SHEET_LABEL_ES = {
  hold: "Mantener", appear: "Aparecer", disappear: "Desaparecer", enter: "Entrar", exit: "Salir",
  "move-left": "Mover izq.", "move-right": "Mover der.", walk: "Caminar", run: "Correr", jump: "Saltar",
  turn: "Girar", crouch: "Agacharse", wave: "Saludar", "camera-in": "Zoom in", "camera-out": "Zoom out",
  "pan-left": "Paneo izq.", "pan-right": "Paneo der.", shake: "Sacudir", custom: "Libre",
};
let sheetState = [{ action: "hold", delta: "" }];
const sheetCount = () => Math.min(60, Math.max(2, parseInt($("framesCount").value, 10) || 6));
function syncSheetCount() {
  const n = sheetCount();
  while (sheetState.length < n) sheetState.push({ action: "hold", delta: "" });
  if (sheetState.length > n) sheetState.length = n;
}
function renderSheet() {
  const box = $("sheetRows"); box.innerHTML = "";
  sheetState.forEach((beat, i) => {
    const row = document.createElement("div");
    row.className = "sheet-row";
    const opts = Object.keys(SHEET_LABEL_ES).map((k) => `<option value="${k}"${beat.action === k ? " selected" : ""}>${SHEET_LABEL_ES[k]}</option>`).join("");
    row.innerHTML = `<span class="mono beat-n">${i + 1}</span><select class="beat-action">${opts}</select>
      <input class="beat-delta" type="text" value="${esc(beat.delta)}" placeholder="${SHEET_PRESETS[beat.action] || "qué cambia"}" />
      <button class="beat-del" type="button">×</button>`;
    row.querySelector(".beat-action").addEventListener("change", (e) => { beat.action = e.target.value; renderSheet(); });
    row.querySelector(".beat-delta").addEventListener("input", (e) => (beat.delta = e.target.value));
    row.querySelector(".beat-del").addEventListener("click", () => {
      if (sheetState.length <= 2) return;
      sheetState.splice(i, 1); $("framesCount").value = sheetState.length; renderSheet();
    });
    box.appendChild(row);
  });
}
const readSheet = () => { syncSheetCount(); return sheetState.map((b) => ({ action: b.action, delta: b.delta.trim() })); };
async function autoSheet() {
  const prompt = $("prompt").value.trim();
  if (!prompt) { setError("Escribe un prompt."); return; }
  const btn = $("autoSheet"); btn.disabled = true;
  try {
    const res = await api("/api/frames/sheet", { method: "POST", body: JSON.stringify({ prompt, frames: sheetCount() }) });
    sheetState = res.sheet; $("framesCount").value = res.sheet.length; renderSheet();
  } catch (err) { setError(err.message); } finally { btn.disabled = false; }
}
function setMode(mode) {
  S.mode = mode;
  $("modeToggle").querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  const isSeq = mode === "sequence";
  $("sequenceBlock").classList.toggle("hidden", !isSeq);
  $("generateBtn").classList.toggle("hidden", isSeq);
}
function updateDurHint() {
  const n = Math.max(1, parseInt($("framesCount").value, 10) || 6);
  const fps = parseInt($("framesFps").value, 10) || 12;
  $("fpsDurHint").textContent = `≈${(n / fps).toFixed(1)}s`;
}
async function startSequence() {
  if (S.busy) return;
  const prompt = $("prompt").value.trim();
  if (!prompt) { setError("Escribe un prompt."); $("prompt").focus(); return; }
  const count = Math.min(60, Math.max(2, parseInt($("framesCount").value, 10) || 6));
  const body = {
    prompt, motion: "", sheet: readSheet(), base_image: $("baseImage").value || null,
    provider: $("framesProvider").value, model: $("framesModel").value,
    size: $("sizeChips").querySelector(".chip.active").dataset.size, quality: $("quality").value || null,
    seed: $("seed").value ? parseInt($("seed").value, 10) : null, negative_prompt: $("negative").value.trim() || null,
    background: $("background").value, anchor: $("anchor").value, frames: count,
    nologo: $("nologo").checked, private: $("private").checked, nofeed: $("nofeed").checked, cutout: $("framesCutout").checked,
  };
  S.busy = true; setError(""); setStatus("Generando secuencia…", "busy");
  $("sequenceBtn").classList.add("loading"); $("sequenceBtn").disabled = true;
  $("exportMp4").disabled = true; $("exportGif").disabled = true; $("openFrames").disabled = true;
  $("seqProgress").classList.remove("hidden"); $("seqBar").style.width = "0%"; $("seqStatus").textContent = `0 / ${count}`;
  try {
    const { job_id } = await api("/api/frames", { method: "POST", body: JSON.stringify(body) });
    S.job = job_id; pollSequence(job_id);
  } catch (err) {
    setStatus("Error", "err"); setError(err.message); S.busy = false;
    $("sequenceBtn").classList.remove("loading"); $("sequenceBtn").disabled = false;
  }
}
function pollSequence(job_id) {
  clearInterval(S.jobTimer);
  S.jobTimer = setInterval(async () => {
    let job;
    try { job = await api(`/api/frames/${job_id}`); } catch (err) { setError(err.message); return; }
    const pct = job.total ? Math.round((job.completed / job.total) * 100) : 0;
    $("seqBar").style.width = pct + "%";
    $("seqStatus").textContent = `${job.completed} / ${job.total} · ${job.state}`;
    if (job.state === "running" || job.state === "queued") return;
    clearInterval(S.jobTimer);
    S.busy = false; $("sequenceBtn").classList.remove("loading"); $("sequenceBtn").disabled = false; $("resumeSeq").disabled = true;
    if (job.state === "paused") { setStatus("Pausada por saldo", "err"); $("resumeSeq").disabled = false; setError("Pausada por saldo — pulsa «Continuar»."); return; }
    if (job.state === "error") { setStatus("Error", "err"); setError(typeof job.error === "string" ? job.error : job.error?.message || "Fallo"); $("resumeSeq").disabled = false; return; }
    setStatus("Secuencia lista", "done");
    $("exportMp4").disabled = false; $("exportGif").disabled = false; $("openFrames").disabled = false;
    loadHistory();
    await loadProjects();
    openProject(job_id);
  }, 2000);
}
const downloadExport = (kind) => { if (S.job) window.open(`api/frames/${S.job}/export.${kind}?fps=${$("framesFps").value}`, "_blank"); };

/* ══════════════════════════════════════════════════════════════ STUDIO */
async function loadCatalog() {
  try {
    S.cat = await api("/api/studio/camera-presets");
    fillSelect($("fxShot"), S.cat.framings);
    fillSelect($("fxAngle"), S.cat.angles);
    fillSelect($("fxCamera"), S.cat.moves);
    fillSelect($("fxEase"), S.cat.easings);
    fillSelect($("fxTransition"), S.cat.transitions);
    $("fxPresets").innerHTML = Object.keys(S.cat.presets)
      .map((k) => `<button class="chip" data-preset="${k}">${k.replace("-", " ")}</button>`).join("");
    $("hfPill").textContent = `HyperFrames ${S.cat.hyperframes.version}`;
    $("hfPill").title = S.cat.hyperframes.available ? "Motor listo" : "npx no disponible";
  } catch (err) { setError(err.message); }
}
function fillSelect(sel, map) {
  sel.innerHTML = Object.entries(map).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
}

async function loadProjects() {
  const { projects } = await api("/api/studio/projects");
  S.projects = projects;
  const box = $("projectList"); box.innerHTML = "";
  if (!projects.length) { box.innerHTML = '<p class="hint">Sin proyectos — genera una secuencia en «Crear».</p>'; return; }
  for (const p of projects) {
    const div = document.createElement("div");
    div.className = "project-item" + (S.proj && S.proj.id === p.id ? " active" : "");
    div.dataset.id = p.id;
    div.innerHTML = `${p.thumb ? `<img src="${p.thumb}" loading="lazy" alt="">` : '<div style="width:42px"></div>'}
      <div class="pinfo"><span class="pname">${esc(p.name)}</span>
      <span class="pmeta">${p.frames} cuadros · ${esc(p.aspect)} · ${p.fps}fps · ${p.renders} render</span></div>`;
    div.addEventListener("click", () => openProject(p.id));
    box.appendChild(div);
  }
}

async function openProject(id) {
  setStatus("Cargando proyecto…", "busy");
  try {
    S.proj = await api(`/api/studio/projects/${encodeURIComponent(id)}`);
    S.sel = 0;
    $("projName").value = S.proj.name || "";
    $("projAspect").value = S.proj.aspect || "16:9";
    $("projFps").value = String(S.proj.fps || 24);
    $("projSfx").checked = !!S.proj.sfx;
    $("projBadge").textContent = `${S.proj.frames.length} cuadros`;
    renderProjectUI();
    loadStates();
    setTab("studio");
    setStatus(`${S.proj.id} · ${S.proj.frames.length} cuadros`, "done");
    document.querySelectorAll(".project-item").forEach((el) => el.classList.toggle("active", el.dataset.id === id));
  } catch (err) { setStatus("Error", "err"); setError(err.message); }
}

function renderProjectUI() {
  renderViewer(); renderTimeline(); renderInspector(); renderRenders(); renderMusic();
}

const totalDur = () => S.proj?.frames.reduce((a, f) => a + (f.duration || 1 / (S.proj.fps || 24)), 0) || 0;
const frameStart = (i) => S.proj.frames.slice(0, i).reduce((a, f) => a + (f.duration || 1 / (S.proj.fps || 24)), 0);

/* ── visor ── */
function renderViewer() {
  const box = $("vFrameBox");
  const [w, h] = (S.proj.aspect || "16:9").split(":").map(Number);
  box.style.setProperty("--v-aspect", `${w} / ${h}`);
  box.style.setProperty("--v-ratio", String(w / h));
  box.style.setProperty("--v-fit", S.fit);
  const f = S.proj.frames[S.sel];
  const img = $("vFrame");
  if (f && f.url) { img.src = f.url; img.hidden = false; $("vEmpty").classList.add("hidden"); }
  else { img.hidden = true; $("vEmpty").classList.remove("hidden"); }
  $("vTime").textContent = `${fmtTime(frameStart(S.sel))} / ${fmtTime(totalDur())}`;
  $("vScrub").value = totalDur() ? Math.round((frameStart(S.sel) / totalDur()) * 1000) : 0;
  const ph = $("tlPlayhead");
  if (ph) ph.style.left = `${totalDur() ? (frameStart(S.sel) / totalDur()) * 100 : 0}%`;
  $("stageMeta").textContent = S.proj.frames.length
    ? `cuadro ${S.sel + 1}/${S.proj.frames.length} · ${esc(S.proj.aspect)} · ${S.proj.fps}fps · ${totalDur().toFixed(1)}s`
    : "sin cuadros";
}
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;

/* ── timeline ── */
function renderTimeline() {
  const strip = $("tlStrip"); strip.innerHTML = "";
  const frames = S.proj.frames;
  $("tlTotal").textContent = `${frames.length} cuadros · ${totalDur().toFixed(1)}s`;
  if (!frames.length) { strip.innerHTML = '<div class="tl-empty">Sin cuadros. Usa «Storyboard automático» o genera una secuencia.</div>'; return; }
  frames.forEach((f, i) => {
    const dur = f.duration || 1 / (S.proj.fps || 24);
    const w = Math.round(Math.max(56, Math.min(240, dur * 90)) * (S.zoom / 120));
    const card = document.createElement("figure");
    card.className = "tl-frame" + (i === S.sel ? " selected" : "");
    card.style.width = w + "px";
    card.style.height = Math.round(w / (S.proj.aspect === "16:9" ? 1.777 : S.proj.aspect === "9:16" ? 0.5625 : 1)) + "px";
    card.draggable = true;
    card.dataset.i = i;
    card.innerHTML = `<img src="${f.url}" loading="lazy" alt="">
      <span class="fnum">${i + 1}</span>
      <figcaption class="ftags">
        <span class="badge accent">${esc(f.shot || "AUTO")}</span>
        ${f.camera && f.camera !== "static" ? `<span class="badge">${esc(f.camera)}</span>` : ""}
        <span class="badge">${dur.toFixed(1)}s</span>
      </figcaption>`;
    card.addEventListener("click", () => selectFrame(i));
    card.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", String(i)); card.classList.add("dragging"); });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", (e) => { e.preventDefault(); card.classList.add("drop-target"); });
    card.addEventListener("dragleave", () => card.classList.remove("drop-target"));
    card.addEventListener("drop", (e) => {
      e.preventDefault(); card.classList.remove("drop-target");
      const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
      reorder(from, i);
    });
    strip.appendChild(card);
  });
  renderRuler();
}
function renderRuler() {
  const ruler = $("tlRuler");
  ruler.querySelectorAll(".tick,.tick-label").forEach((n) => n.remove());
  const total = totalDur() || 1;
  const secs = Math.ceil(total);
  const step = secs > 24 ? 5 : secs > 12 ? 2 : 1;
  for (let t = 0; t <= secs; t += step) {
    const pct = (t / total) * 100;
    if (pct > 100) break;
    const tick = document.createElement("div"); tick.className = "tick"; tick.style.left = pct + "%";
    const lab = document.createElement("div"); lab.className = "tick-label"; lab.style.left = pct + "%"; lab.textContent = t + "s";
    ruler.appendChild(tick); ruler.appendChild(lab);
  }
  const ph = document.createElement("div"); ph.className = "tl-playhead"; ph.id = "tlPlayhead";
  ruler.appendChild(ph);
  ph.style.left = `${totalDur() ? (frameStart(S.sel) / totalDur()) * 100 : 0}%`;
}
function selectFrame(i) {
  S.sel = Math.max(0, Math.min((S.proj?.frames.length || 1) - 1, i));
  document.querySelectorAll(".tl-frame").forEach((el, n) => el.classList.toggle("selected", n === S.sel));
  renderViewer(); renderInspector();
}
function reorder(from, to) {
  if (from === to || isNaN(from)) return;
  const frames = S.proj.frames;
  const [moved] = frames.splice(from, 1);
  frames.splice(to, 0, moved);
  S.sel = to;
  commitFrames(true);
}

/* ── inspector ── */
function renderInspector() {
  const f = S.proj.frames[S.sel];
  const has = !!f;
  $("fxIndex").textContent = has ? `${S.sel + 1}/${S.proj.frames.length}` : "—";
  for (const id of ["fxShot", "fxAngle", "fxCamera", "fxEase", "fxTransition", "fxAmount", "fxDuration", "fxAction", "fxDelta", "fxCaption", "fxRegen"])
    $(id).disabled = !has;
  if (!has) return;
  $("fxShot").value = f.shot || "AUTO";
  $("fxAngle").value = f.angle || "eye";
  $("fxCamera").value = f.camera || "static";
  $("fxEase").value = f.camera_ease || "power1.inOut";
  $("fxTransition").value = f.transition || "cut";
  const amt = f.camera_amount ?? 0.5;
  $("fxAmount").value = amt; $("fxAmountVal").textContent = Number(amt).toFixed(2);
  $("fxDuration").value = f.duration ?? "";
  $("fxAction").value = f.action || "";
  $("fxDelta").value = f.delta || "";
  $("fxCaption").value = f.caption || "";
}
function editFrame(key, value) {
  const f = S.proj.frames[S.sel];
  if (!f) return;
  f[key] = value;
  commitFrames(false);
  renderViewer();
  if (["shot", "camera", "duration"].includes(key)) renderTimeline();
}
function commitFrames(structural) {
  if (structural) {
    clearTimeout(S.commitTimer);
    api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/frames`, {
      method: "PATCH", body: JSON.stringify({ frames: S.proj.frames }),
    }).then((res) => { S.proj = res; renderProjectUI(); }).catch((e) => setError(e.message));
    return;
  }
  clearTimeout(S.commitTimer);
  S.commitTimer = setTimeout(() => {
    api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/frames`, {
      method: "PATCH", body: JSON.stringify({ frames: S.proj.frames }),
    }).catch((e) => setError(e.message));
  }, 400);
}

async function frameOp(op) {
  if (!S.proj) return;
  try {
    S.proj = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/frames`, {
      method: "POST", body: JSON.stringify({ op, index: S.sel, count: 1 }),
    });
    if (op !== "append") S.sel = Math.min(S.sel + (op === "insert" ? 0 : 1), S.proj.frames.length - 1);
    renderProjectUI();
    $("projBadge").textContent = `${S.proj.frames.length} cuadros`;
  } catch (e) { setError(e.message); }
}
async function deleteFrame() {
  if (!S.proj || S.proj.frames.length <= 1) { setError("Debe quedar al menos un cuadro."); return; }
  try {
    S.proj = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/frames/${S.sel}`, { method: "DELETE" });
    S.sel = Math.min(S.sel, S.proj.frames.length - 1);
    renderProjectUI(); $("projBadge").textContent = `${S.proj.frames.length} cuadros`;
  } catch (e) { setError(e.message); }
}

/* ── reproducción ── */
function togglePlay() {
  if (S.playing) { S.playing = false; clearTimeout(S.playTimer2); $("vPlay").textContent = "▶"; return; }
  if (!S.proj?.frames.length) return;
  S.playing = true; $("vPlay").textContent = "⏸";
  const step = () => {
    if (!S.playing) return;
    const dur = (S.proj.frames[S.sel]?.duration || 1 / (S.proj.fps || 24)) * 1000;
    S.playTimer2 = setTimeout(() => {
      selectFrame(S.sel + 1 >= S.proj.frames.length ? 0 : S.sel + 1);
      step();
    }, dur);
  };
  step();
}

/* ── storyboard ── */
async function runStoryboard() {
  if (!S.proj) { setError("Abre un proyecto."); return; }
  const btn = $("storyboardBtn"); btn.disabled = true; btn.textContent = "✦ Generando…";
  try {
    S.proj = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/storyboard`, {
      method: "POST", body: JSON.stringify({ count: S.proj.frames.length || 6 }),
    });
    S.sel = 0; renderProjectUI(); setStatus("Storyboard listo", "done");
  } catch (e) { setError(e.message); } finally { btn.disabled = false; btn.textContent = "✦ Storyboard automático"; }
}

/* ── versiones ── */
async function loadStates() {
  if (!S.proj) return;
  const { states } = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/states`).catch(() => ({ states: [] }));
  $("stateSel").innerHTML = '<option value="">— versión —</option>' + (states || []).map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
}
async function saveState() {
  const name = await openModal({ title: "Guardar versión", label: "Nombre de la versión", value: `v${new Date().toISOString().slice(11, 16)}` });
  if (!name || !S.proj) return;
  await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/states`, {
    method: "POST", body: JSON.stringify({ name, sheet: S.proj.frames.map((f) => ({ action: f.action, delta: f.delta, duration: f.duration })), camera: S.proj.frames.map((f) => ({ shot: f.shot, angle: f.angle, camera: f.camera })) }),
  }).catch((e) => setError(e.message));
  loadStates(); setStatus("Versión guardada", "done");
}
async function loadState() {
  const name = $("stateSel").value;
  if (!name || !S.proj) return;
  try {
    const st = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/states/${encodeURIComponent(name)}`);
    (st.sheet || []).forEach((b, i) => {
      const f = S.proj.frames[i]; if (!f) return;
      if (b.action != null) f.action = b.action;
      if (b.delta != null) f.delta = b.delta;
      if (b.duration != null) f.duration = b.duration;
    });
    (st.camera || []).forEach((c, i) => {
      const f = S.proj.frames[i]; if (!f) return;
      Object.assign(f, c);
    });
    renderProjectUI(); setStatus("Versión cargada", "done");
  } catch (e) { setError(e.message); }
}

/* ── música ── */
function renderMusic() {
  const m = S.proj?.music;
  $("projMusicName").textContent = m ? m.name : "sin música";
  $("projMusicDel").disabled = !m;
}
async function uploadMusic(file) {
  const data = await b64FromFile(file);
  try {
    S.proj = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/music`, { method: "POST", body: JSON.stringify({ name: file.name, data }) });
    renderMusic(); setStatus("Música añadida", "done");
  } catch (e) { setError(e.message); }
}
const b64FromFile = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] || "");
  r.onerror = reject; r.readAsDataURL(file);
});

/* ── render / verificación ── */
function renderRenders() {
  const box = $("rendersList"); box.innerHTML = "";
  const renders = (S.proj?.renders || []).filter((r) => r.file);
  for (const r of renders) {
    const div = document.createElement("div");
    div.className = "render-item";
    const url = `/outputs/studio/${S.proj.id}/renders/${r.file}`;
    div.innerHTML = `<span class="mono truncate">${esc(r.file)} ${r.width ? `· ${r.width}×${r.height}` : ""} ${r.duration ? `· ${Number(r.duration).toFixed(1)}s` : ""}</span>
      <a href="${url}" target="_blank" rel="noopener">abrir ↗</a>`;
    box.appendChild(div);
  }
  $("exVerify").disabled = !renders.length;
  $("exSheet").disabled = !renders.length;
}
async function startRender() {
  if (!S.proj) return;
  const fmt = $("exFormat").value;
  $("exProgress").classList.remove("hidden");
  $("exBar").style.width = "0%"; $("exStatus").textContent = "encolado…";
  $("exRender").disabled = true;
  try {
    await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/render`, {
      method: "POST", body: JSON.stringify({ format: fmt, fps: S.proj.fps, quality: $("exQuality").value }),
    });
    pollRender();
  } catch (e) { setError(e.message); $("exRender").disabled = false; $("exProgress").classList.add("hidden"); }
}
function pollRender() {
  clearInterval(S.renderTimer);
  S.renderTimer = setInterval(async () => {
    const st = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/render`).catch(() => ({ status: "error" }));
    const map = { queued: 12, building: 30, rendering: 62, done: 100, error: 100 };
    $("exBar").style.width = (map[st.status] ?? 5) + "%";
    $("exStatus").textContent = st.status + (st.fps ? ` · ${st.fps}fps` : "");
    if (st.status === "rendering") $("exStatus").textContent += " · capturando frames";
    if (["done", "error"].includes(st.status)) {
      clearInterval(S.renderTimer); $("exRender").disabled = false;
      if (st.status === "error") { setError(st.error || "Render falló"); setStatus("Error de render", "err"); }
      else { setStatus("Render listo", "done"); S.proj = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}`); renderRenders(); }
    }
  }, 1500);
}
async function verifyRender() {
  try {
    const out = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/verify`, { method: "POST" });
    const box = $("verifyOut"); box.classList.remove("hidden");
    box.innerHTML = out.checks.map((c) => `<div class="verify-row"><span class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "✗"}</span><span>${esc(c.name)}</span><span class="hint mono">${esc(c.detail)}</span></div>`).join("")
      + (out.sheet ? `<img src="${out.sheet}" alt="hoja de contactos">` : "");
    setStatus(out.ok ? "Verificación superada" : "Verificación con avisos", out.ok ? "done" : "err");
  } catch (e) { setError(e.message); }
}
async function spriteSheet() {
  try {
    const r = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/spritesheet?cols=5&frame_w=256`, { method: "POST" });
    window.open(r.url, "_blank");
  } catch (e) { setError(e.message); }
}
async function makeSfx() {
  try { const r = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/sfx`, { method: "POST" }); setStatus(`SFX listos (${r.sfx.length})`, "done"); }
  catch (e) { setError(e.message); }
}
async function regenFrame() {
  if (!S.proj) return;
  const f = S.proj.frames[S.sel];
  setStatus(`Regenerando cuadro ${S.sel + 1}…`, "busy");
  try {
    await api(`/api/frames/${encodeURIComponent(S.proj.id)}/regenerate`, {
      method: "POST", body: JSON.stringify({ from_frame: S.sel + 1, sheet: S.proj.frames.slice(S.sel).map((x) => ({ action: x.action || "hold", delta: x.delta || "", duration: x.duration })) }),
    });
    pollLegacy(S.proj.id, async () => {
      await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/sync`, { method: "POST" });
      await openProject(S.proj.id);
      setStatus("Cuadro regenerado", "done");
    });
  } catch (e) { setError(e.message); }
}
function pollLegacy(id, done) {
  const t = setInterval(async () => {
    const job = await api(`/api/frames/${encodeURIComponent(id)}`).catch(() => null);
    if (!job) return;
    $("exProgress").classList.remove("hidden");
    $("exBar").style.width = (job.total ? Math.round((job.completed / job.total) * 100) : 0) + "%";
    $("exStatus").textContent = `${job.completed} / ${job.total} · ${job.state}`;
    if (job.state === "running" || job.state === "queued") return;
    clearInterval(t); $("exProgress").classList.add("hidden");
    if (job.state === "error") { setError(typeof job.error === "string" ? job.error : "Fallo"); return; }
    if (job.state === "paused") { setError("Pausada por saldo."); return; }
    done(job);
  }, 2000);
}

/* ══════════════════════════════════════════════════════════════ eventos */
$("generateBtn").addEventListener("click", generate);
$("prompt").addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); S.mode === "sequence" ? startSequence() : generate(); }
});
$("modeToggle").addEventListener("click", (e) => { const b = e.target.closest(".seg"); if (b) setMode(b.dataset.mode); });
$("providerToggle").addEventListener("click", (e) => { const b = e.target.closest(".seg"); if (b) setProvider(b.dataset.provider); });
$("model").addEventListener("change", onModelChange);
$("sizeChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip"); if (!chip) return;
  $("sizeChips").querySelectorAll(".chip").forEach((c) => c.classList.remove("active")); chip.classList.add("active");
});
$("guidance").addEventListener("input", (e) => ($("guidanceVal").textContent = parseFloat(e.target.value).toFixed(1)));
$("seedLock").addEventListener("click", () => {
  S.seedLocked = !S.seedLocked;
  $("seedLock").classList.toggle("active", S.seedLocked);
  $("seedLock").textContent = S.seedLocked ? "🔒" : "🔓";
  if (S.seedLocked && !$("seed").value) $("seed").value = Math.floor(Math.random() * 1000000);
});
$("seedDice").addEventListener("click", () => ($("seed").value = Math.floor(Math.random() * 1000000)));
$("enhanceBtn").addEventListener("click", async () => {
  const prompt = $("prompt").value.trim();
  if (!prompt) { setError("Escribe un prompt primero."); return; }
  const btn = $("enhanceBtn"); btn.disabled = true; btn.textContent = "…";
  try { const { prompt: better } = await api("/api/enhance", { method: "POST", body: JSON.stringify({ prompt }) }); $("prompt").value = better; setError(""); }
  catch (e) { setError(e.message); } finally { btn.disabled = false; btn.textContent = "✨ Mejorar prompt"; }
});
$("framesCount").addEventListener("change", () => { syncSheetCount(); renderSheet(); });
$("framesCount").addEventListener("input", updateDurHint);
$("framesFps").addEventListener("change", updateDurHint);
$("addBeat").addEventListener("click", () => { sheetState.push({ action: "hold", delta: "" }); $("framesCount").value = sheetState.length; renderSheet(); });
$("autoSheet").addEventListener("click", autoSheet);
$("refreshBase").addEventListener("click", () => loadHistory());
$("sequenceBtn").addEventListener("click", startSequence);
$("openFrames").addEventListener("click", async () => { if (S.job) { await loadProjects(); openProject(S.job); } });
$("exportMp4").addEventListener("click", () => downloadExport("mp4"));
$("exportGif").addEventListener("click", () => downloadExport("gif"));
$("resumeSeq").addEventListener("click", async () => {
  if (!S.job) return;
  try { await api(`/api/frames/${S.job}/resume`, { method: "POST" }); $("resumeSeq").disabled = true; pollSequence(S.job); }
  catch (e) { setError(e.message); }
});
$("framesProvider").addEventListener("change", () => { renderFrameModels(); if ($("framesProvider").value === "cloudflare") refreshNeurons(); });
$("downloadBtn").addEventListener("click", download);
$("copyBtn").addEventListener("click", copyUrl);
$("cutoutBtn").addEventListener("click", cutout);
$("fullscreenBtn").addEventListener("click", () => { if (!S.current) return; $("lightboxImg").src = S.current.url; $("lightbox").hidden = false; });
$("reuseBtn").addEventListener("click", () => { if (S.current?.prompt) { $("prompt").value = S.current.prompt; $("prompt").focus(); } });
$("clearHistory").addEventListener("click", clearHistory);
$("lightboxClose").addEventListener("click", () => ($("lightbox").hidden = true));
$("lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox" || e.target.id === "lightboxImg") $("lightbox").hidden = true; });
$("localAnimBtn").addEventListener("click", async () => {
  if (!S.current) return;
  const btn = $("localAnimBtn"); btn.disabled = true;
  try {
    const entry = await api("/api/animate-local", { method: "POST", body: JSON.stringify({ file: S.current.file, motion: $("localMotion").value, seconds: parseInt($("localSeconds").value, 10) || 4 }) });
    const link = $("localAnimLink"); link.href = entry.url; link.classList.remove("hidden");
    setStatus("Animación local lista", "done"); loadHistory();
  } catch (e) { setError(e.message); } finally { btn.disabled = false; }
});

/* studio */
$("refreshProjects").addEventListener("click", loadProjects);
$("vPrev").addEventListener("click", () => selectFrame(S.sel - 1));
$("vNext").addEventListener("click", () => selectFrame(S.sel + 1));
$("vPlay").addEventListener("click", togglePlay);
$("vScrub").addEventListener("input", (e) => {
  if (!S.proj?.frames.length) return;
  const target = (e.target.value / 1000) * totalDur();
  let acc = 0, idx = 0;
  for (let i = 0; i < S.proj.frames.length; i++) { acc += S.proj.frames[i].duration || 1 / (S.proj.fps || 24); if (acc >= target) { idx = i; break; } idx = i; }
  selectFrame(idx);
});
$("vFit").addEventListener("click", () => { S.fit = S.fit === "contain" ? "cover" : "contain"; $("vFit").textContent = S.fit === "contain" ? "Ajustar" : "Llenar"; renderViewer(); });
$("vGuidesBtn").addEventListener("click", () => { S.guides = !S.guides; $("vGuides").classList.toggle("hidden", !S.guides); });
$("tlRuler").addEventListener("click", (e) => {
  if (!S.proj?.frames.length) return;
  const r = e.currentTarget.getBoundingClientRect();
  const target = ((e.clientX - r.left) / r.width) * totalDur();
  let acc = 0, idx = 0;
  for (let i = 0; i < S.proj.frames.length; i++) { acc += S.proj.frames[i].duration || 1 / (S.proj.fps || 24); if (acc >= target) { idx = i; break; } idx = i; }
  selectFrame(idx);
});
$("tlZoom").addEventListener("input", (e) => { S.zoom = parseInt(e.target.value, 10); renderTimeline(); });
$("tlAdd").addEventListener("click", () => frameOp("append"));
$("tlInsert").addEventListener("click", () => frameOp("insert"));
$("tlDup").addEventListener("click", () => frameOp("duplicate"));
$("tlDel").addEventListener("click", deleteFrame);
$("fxShot").addEventListener("change", (e) => editFrame("shot", e.target.value));
$("fxAngle").addEventListener("change", (e) => editFrame("angle", e.target.value));
$("fxCamera").addEventListener("change", (e) => editFrame("camera", e.target.value));
$("fxEase").addEventListener("change", (e) => editFrame("camera_ease", e.target.value));
$("fxTransition").addEventListener("change", (e) => editFrame("transition", e.target.value));
$("fxAmount").addEventListener("input", (e) => { $("fxAmountVal").textContent = Number(e.target.value).toFixed(2); editFrame("camera_amount", parseFloat(e.target.value)); });
$("fxDuration").addEventListener("change", (e) => editFrame("duration", e.target.value === "" ? null : parseFloat(e.target.value)));
$("fxAction").addEventListener("input", (e) => editFrame("action", e.target.value));
$("fxDelta").addEventListener("input", (e) => editFrame("delta", e.target.value));
$("fxCaption").addEventListener("input", (e) => editFrame("caption", e.target.value));
$("fxPresets").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip"); if (!chip || !S.proj) return;
  const preset = S.cat.presets[chip.dataset.preset];
  if (!preset) return;
  Object.assign(S.proj.frames[S.sel], { camera: preset.move, camera_amount: preset.amount, camera_ease: preset.ease });
  renderInspector(); renderTimeline(); commitFrames(false);
});
$("fxRegen").addEventListener("click", regenFrame);
$("projName").addEventListener("change", async () => { await patchProject({ name: $("projName").value }); });
$("projAspect").addEventListener("change", async () => { S.proj = await patchProject({ aspect: $("projAspect").value }); renderProjectUI(); });
$("projFps").addEventListener("change", async () => { S.proj = await patchProject({ fps: parseInt($("projFps").value, 10) }); renderProjectUI(); });
$("projSfx").addEventListener("change", () => patchProject({ sfx: $("projSfx").checked }));
$("storyboardBtn").addEventListener("click", runStoryboard);
$("stateSave").addEventListener("click", saveState);
$("stateLoad").addEventListener("click", loadState);
$("projMusicPick").addEventListener("click", () => $("projMusicFile").click());
$("projMusicFile").addEventListener("change", (e) => { if (e.target.files[0]) uploadMusic(e.target.files[0]); e.target.value = ""; });
$("projMusicDel").addEventListener("click", async () => { S.proj = await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}/music`, { method: "DELETE" }); renderMusic(); });
$("exRender").addEventListener("click", startRender);
$("exVerify").addEventListener("click", verifyRender);
$("exSheet").addEventListener("click", () => { const r = (S.proj?.renders || []).find((x) => x.file); if (r) window.open(`outputs/studio/${S.proj.id}/renders/${r.file.replace(/\.[a-z0-9]+$/i, "-sheet.png")}`, "_blank"); });
$("exSprite").addEventListener("click", spriteSheet);
$("exSfx").addEventListener("click", makeSfx);
async function patchProject(patch) {
  try { return await api(`/api/studio/projects/${encodeURIComponent(S.proj.id)}`, { method: "PATCH", body: JSON.stringify(patch) }); }
  catch (e) { setError(e.message); return S.proj; }
}
document.addEventListener("keydown", (e) => {
  if (!S.proj || $("view-studio").classList.contains("hidden")) return;
  if (e.target.matches("input,textarea,select")) return;
  if (e.key === "ArrowLeft") selectFrame(S.sel - 1);
  if (e.key === "ArrowRight") selectFrame(S.sel + 1);
  if (e.key === " ") { e.preventDefault(); togglePlay(); }
});

/* ══════════════════════════════════════════════════════════════ arranque */
function renderFrameModels() {
  const select = $("framesModel");
  const provider = $("framesProvider").value;
  const list = provider === "cloudflare" ? S.cfModels : S.models;
  select.innerHTML = "";
  for (const m of list) { const o = document.createElement("option"); o.value = m.id; o.textContent = m.title || m.id; o.title = m.description || m.id; select.appendChild(o); }
  const preferred = provider === "cloudflare" ? ["@cf/black-forest-labs/flux-2-klein-4b"] : ["dreamshaper", "sana", "flux", "z-image"];
  const hit = preferred.find((p) => list.some((m) => m.id === p || (m.aliases || []).includes(p)));
  if (hit) select.value = list.find((m) => m.id === hit || (m.aliases || []).includes(hit)).id;
}

(async function init() {
  setMode("single"); syncSheetCount(); renderSheet(); updateDurHint();
  await loadModels();
  await loadHistory();
  await loadCatalog();
  await loadProjects();
  const { key_configured } = await api("/api/health").catch(() => ({ key_configured: false }));
  setKeyPill(!!key_configured);
  const bal = await api("/api/balance").catch(() => null);
  if (bal) showBalance(bal);
  renderFrameModels();
  const params = new URLSearchParams(location.search);
  const openId = params.get("project") || (location.hash.startsWith("#p=") ? location.hash.slice(3) : "");
  if (openId) openProject(openId);
})();
