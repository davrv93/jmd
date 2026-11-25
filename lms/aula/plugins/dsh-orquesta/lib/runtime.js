import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'
import { spawn } from 'node:child_process'

export const TERMINAL = new Set(['listo', 'fallo', 'cancelado'])

export function createTaskRuntime(options = {}) {
  const active = new Map()
  const childToTask = new Map()
  const appendQueues = new Map()
  const allow = new Set(options.commandAllowlist ?? ['node', 'python3', 'git', 'npm', 'pnpm'])
  const maxTasks = Number.isSafeInteger(options.maxTasks) ? options.maxTasks : 32

  async function append(workspace, id, type, data = {}) {
    const key = `${workspace}\0${id}`
    const event = { ts: new Date().toISOString(), id, type, ...data }
    const write = (appendQueues.get(key) ?? Promise.resolve()).then(async () => {
      await mkdir(join(workspace, '.orquesta'), { recursive: true })
      await appendFile(join(workspace, '.orquesta', `${id}.jsonl`), `${JSON.stringify(event)}\n`, 'utf8')
      return event
    })
    appendQueues.set(key, write.catch(() => undefined))
    return write
  }

  async function launchCommand(workspace, args) {
    if (active.size >= maxTasks) throw new Error(`límite de ${maxTasks} tareas activas alcanzado`)
    const argv = normalizeArgv(args.comando)
    const executable = basename(argv[0])
    if (!allow.has(executable)) throw new Error(`ejecutable no permitido: ${executable}`)
    const cwd = safeCwd(workspace, args.directorio)
    const id = taskId()
    const startedAt = Date.now()
    await append(workspace, id, 'encolada', { status: 'en_cola', kind: 'comando', label: args.nombre, cwd })
    await append(workspace, id, 'herramienta', { status: 'trabajando', tool: executable, argv: redactArgv(argv) })
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      env: safeEnvironment(process.env),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    active.set(id, { id, kind: 'comando', workspace, child, startedAt, label: args.nombre, status: 'trabajando' })
    await append(workspace, id, 'inicio', { status: 'trabajando', pid: child.pid ?? null })
    wireStream(child.stdout, (text) => append(workspace, id, 'mensaje', { status: 'trabajando', channel: 'stdout', text }))
    wireStream(child.stderr, (text) => append(workspace, id, 'mensaje', { status: 'trabajando', channel: 'stderr', text }))
    child.once('error', async (error) => {
      await append(workspace, id, 'fallo', { status: 'fallo', error: error.message, durationMs: Date.now() - startedAt })
      active.delete(id)
    })
    child.once('exit', async (code, signal) => {
      const cancelled = active.get(id)?.status === 'cancelado'
      const status = cancelled ? 'cancelado' : code === 0 ? 'listo' : 'fallo'
      await append(workspace, id, status === 'fallo' ? 'fallo' : 'fin', {
        status,
        code,
        signal,
        durationMs: Date.now() - startedAt,
        tokens: { input: 0, output: 0, total: 0 },
        costUsd: 0,
      })
      active.delete(id)
    })
    return { id, status: 'trabajando', kind: 'comando', log: `.orquesta/${id}.jsonl` }
  }

  async function launchSubagent(workspace, args, exec, subagents, provider = 'spawn') {
    if (!exec.agent) throw new Error('tarea_fondo requiere un agente llamante')
    if (active.size >= maxTasks) throw new Error(`límite de ${maxTasks} tareas activas alcanzado`)
    const id = taskId()
    const startedAt = Date.now()
    const cwd = safeCwd(workspace, args.directorio)
    await append(workspace, id, 'encolada', { status: 'en_cola', kind: 'subagente', label: args.nombre, cwd })
    const receipt = await subagents.startActivation({
      provider,
      label: args.nombre,
      request: {
        cwd,
        prompt: [{ type: 'text', text: args.instruccion }],
        parent: exec.agent,
      },
      signal: exec.signal,
      delivery: 'parent',
    })
    const childId = String(receipt.childId)
    active.set(id, { id, kind: 'subagente', workspace, childId, parent: exec.agent, startedAt, label: args.nombre, status: 'trabajando' })
    childToTask.set(childId, id)
    await append(workspace, id, 'inicio', { status: 'trabajando', childId, provider })
    await append(workspace, id, 'herramienta', { status: 'trabajando', tool: 'subagent', provider })
    return { id, status: 'trabajando', kind: 'subagente', childId, log: `.orquesta/${id}.jsonl` }
  }

  async function onSubagentEnd(info) {
    const id = childToTask.get(String(info.id))
    if (!id) return
    const task = active.get(id)
    if (!task) return
    if (info.lastAssistantMessage) {
      await append(task.workspace, id, 'mensaje', {
        status: 'trabajando',
        channel: 'subagente',
        text: assistantText(info.lastAssistantMessage),
      })
    }
    const status = info.stopReason === 'completed' ? 'listo' : info.stopReason === 'aborted' ? 'cancelado' : 'fallo'
    await append(task.workspace, id, status === 'fallo' ? 'fallo' : 'fin', {
      status,
      stopReason: info.stopReason,
      durationMs: Date.now() - task.startedAt,
      tokens: { input: null, output: null, total: null, source: 'DSH no expone uso en subagent/end' },
      costUsd: null,
    })
    childToTask.delete(String(info.id))
    active.delete(id)
  }

  async function cancel(workspace, id, exec, subagents) {
    const task = active.get(id)
    if (!task) {
      const state = await status(workspace, id)
      return { id, accepted: false, status: state.status, detail: TERMINAL.has(state.status) ? 'la tarea ya terminó' : 'no está activa en este proceso' }
    }
    task.status = 'cancelado'
    if (task.kind === 'comando') task.child.kill('SIGTERM')
    else subagents.interrupt(task.childId, { kind: 'ancestor', agent: exec.agent })
    await append(workspace, id, 'cancelacion', { status: 'cancelado', requestedBy: exec.agent?.id ?? 'unknown' })
    return { id, accepted: true, status: 'cancelado', detail: 'cancelación solicitada' }
  }

  async function status(workspace, id) {
    assertTaskId(id)
    const events = await readEvents(workspace, id)
    if (events.length === 0) throw new Error(`tarea no encontrada: ${id}`)
    return summarize(events)
  }

  async function list(workspace) {
    const dir = join(workspace, '.orquesta')
    let names = []
    try { names = await readdir(dir) } catch (error) { if (error.code !== 'ENOENT') throw error }
    const rows = await Promise.all(names.filter((name) => /^orq-[a-z0-9-]+\.jsonl$/.test(name)).map(async (name) => {
      const id = name.slice(0, -6)
      return status(workspace, id)
    }))
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async function viewer(workspace) {
    const tasks = await list(workspace)
    const allEvents = []
    for (const task of tasks) allEvents.push(...await readEvents(workspace, task.id))
    const output = join(workspace, 'orquesta-visor.html')
    await writeFile(output, renderViewer(allEvents), 'utf8')
    return { path: output, tasks: tasks.length, events: allEvents.length }
  }

  return { launchCommand, launchSubagent, onSubagentEnd, cancel, status, list, viewer, active }
}

export async function readEvents(workspace, id) {
  assertTaskId(id)
  try {
    const raw = await readFile(join(workspace, '.orquesta', `${id}.jsonl`), 'utf8')
    return raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line) } catch { return { ts: new Date(0).toISOString(), id, type: 'fallo', status: 'fallo', error: `JSONL inválido en línea ${index + 1}` } }
    })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

export function summarize(events) {
  const first = events[0]
  const last = events.at(-1)
  const tokenEvents = events.map((event) => event.tokens).filter(Boolean)
  const tokens = tokenEvents.at(-1) ?? { input: 0, output: 0, total: 0 }
  return {
    id: first.id,
    label: first.label ?? first.id,
    kind: first.kind ?? 'desconocido',
    status: last.status ?? 'en_cola',
    startedAt: first.ts,
    updatedAt: last.ts,
    durationMs: last.durationMs ?? Math.max(0, Date.parse(last.ts) - Date.parse(first.ts)),
    tokens,
    costUsd: typeof last.costUsd === 'number' ? last.costUsd : null,
    events: events.length,
    error: last.error ?? null,
  }
}

export function renderViewer(events) {
  const embedded = JSON.stringify(events).replaceAll('<', '<')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orquesta · flujo de agentes</title><style>
  :root{color-scheme:dark;--bg:#09111f;--panel:#111d31;--line:#29405f;--text:#eaf2ff;--muted:#96a9c5;--cyan:#4de3c1;--amber:#ffcb6b;--red:#ff6b7a;--blue:#65a9ff;--viol:#b58bff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% -10%,#16345b 0,transparent 38%),var(--bg);color:var(--text);font:14px ui-monospace,SFMono-Regular,Menlo,monospace}header{padding:28px 32px 18px;border-bottom:1px solid var(--line);display:flex;gap:20px;justify-content:space-between;align-items:end}h1{font:700 clamp(25px,4vw,44px) system-ui;margin:0;letter-spacing:-.04em}.eyebrow{color:var(--cyan);text-transform:uppercase;letter-spacing:.16em;font-size:11px}.actions{display:flex;gap:10px;flex-wrap:wrap}.button{background:#17304e;border:1px solid #3d5e85;color:var(--text);padding:9px 12px;border-radius:8px;cursor:pointer}.button:hover{border-color:var(--cyan)}.button.on{background:#1d4d63;border-color:var(--cyan);color:#eafff9}main{padding:22px 32px 42px}.stats{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px;margin-bottom:18px}.stat,.lane{background:color-mix(in srgb,var(--panel) 92%,transparent);border:1px solid var(--line);border-radius:12px}.stat{padding:14px}.stat b{font-size:22px;display:block}.stat span{color:var(--muted);font-size:11px}
  /* Flujo */
  .flujo{background:color-mix(in srgb,var(--panel) 92%,transparent);border:1px solid var(--line);border-radius:14px;padding:10px;margin-bottom:18px;overflow:auto}
  .flujo svg{display:block;width:100%;height:auto}
  .edge{fill:none;stroke:var(--line);stroke-width:2}
  .edge.trabajando{stroke:var(--blue);stroke-dasharray:7 7;animation:flujo-mar 0.7s linear infinite}
  .edge.listo{stroke:var(--cyan)}.edge.fallo{stroke:var(--red)}.edge.cancelado{stroke:var(--amber)}
  @keyframes flujo-mar{to{stroke-dashoffset:-14}}
  .node{cursor:pointer}.node rect{fill:#0d1b2e;stroke:var(--line);stroke-width:1.5}
  .node.raiz rect{fill:#13294a;stroke:var(--viol);stroke-width:2}
  .node.trabajando rect{stroke:var(--blue);animation:flujo-glow 1.2s ease-in-out infinite}
  .node.listo rect{stroke:var(--cyan)}.node.fallo rect{stroke:var(--red)}.node.cancelado rect{stroke:var(--amber)}.node.en_cola rect{stroke-dasharray:4 4}
  @keyframes flujo-glow{0%,100%{filter:drop-shadow(0 0 0 transparent)}50%{filter:drop-shadow(0 0 6px var(--blue))}}
  .node .t{fill:var(--text);font:600 13px system-ui}.node .s{font:11px ui-monospace,monospace}.node .k{fill:var(--muted);font:10px ui-monospace,monospace}
  .legend{display:flex;gap:16px;flex-wrap:wrap;padding:4px 6px 2px;color:var(--muted);font-size:11px}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:middle}
  .lane{display:grid;grid-template-columns:220px 1fr;margin:10px 0;overflow:hidden}.lane.hl{outline:2px solid var(--cyan)}.meta{padding:15px;border-right:1px solid var(--line)}.meta strong{display:block;margin-bottom:6px}.badge{display:inline-block;padding:3px 7px;border-radius:20px;font-size:10px;background:#253b59}.timeline{position:relative;min-height:92px;padding:14px 14px 14px 30px}.timeline:before{content:"";position:absolute;left:17px;top:14px;bottom:14px;width:1px;background:var(--line)}.event{position:relative;padding:4px 8px;margin:0 0 5px;border-left:3px solid var(--blue);background:#0b1728}.event:before{content:"";position:absolute;width:7px;height:7px;border-radius:50%;background:var(--blue);left:-19px;top:10px}.event small{color:var(--muted)}.event.fin,.event.listo{border-color:var(--cyan)}.event.fallo{border-color:var(--red)}.event.cancelacion,.event.reintento{border-color:var(--amber)}.notice{min-height:20px;color:var(--amber);padding-top:8px}.empty{padding:48px;text-align:center;color:var(--muted)}.hidden{display:none}@media(max-width:760px){header{align-items:start;flex-direction:column}.stats{grid-template-columns:1fr 1fr}.lane{grid-template-columns:1fr}.meta{border-right:0;border-bottom:1px solid var(--line)}}
  </style></head><body><header><div><div class="eyebrow">DeepSeek Harness · registro durable</div><h1>Orquesta</h1><div id="generated"></div><div id="notice" class="notice" aria-live="polite"></div></div><div class="actions"><button class="button on" id="vFlujo">Flujo</button><button class="button" id="vCarriles">Carriles</button><label class="button">Cargar JSONL<input id="files" type="file" accept=".jsonl,application/json" multiple hidden></label><button class="button" id="help">Actualizar</button></div></header><main><section class="stats" id="stats"></section><section id="flujo" class="flujo"><div class="legend"><span><i style="background:var(--viol)"></i>Orquestador</span><span><i style="background:var(--blue)"></i>trabajando</span><span><i style="background:var(--cyan)"></i>listo</span><span><i style="background:var(--red)"></i>fallo</span><span><i style="background:var(--amber)"></i>cancelado</span><span><i style="background:var(--muted)"></i>en cola</span></div><div id="lienzo"></div></section><section id="lanes" class="hidden"></section></main><script>
  const EMBEDDED=${embedded};let events=EMBEDDED;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SVGNS='http://www.w3.org/2000/svg';
  function tareas(){const g=new Map;for(const e of events){if(!g.has(e.id))g.set(e.id,[]);g.get(e.id).push(e)}return [...g.values()].map(es=>({es,first:es[0],last:es.at(-1)})).sort((a,b)=>a.first.ts.localeCompare(b.first.ts))}
  function flujo(){const ts=tareas();const l=document.querySelector('#lienzo');l.innerHTML='';if(!ts.length){l.innerHTML='<div class="empty">Aún no hay subagentes. Lanza una tarea con tarea_fondo.</div>';return}
    const NW=210,NH=64,GAP=28,PAD=24,perRow=Math.max(1,Math.floor((Math.max(l.clientWidth,760)-PAD*2+GAP)/(NW+GAP)));
    const rootX=(perRow*(NW+GAP)-GAP)/2+PAD-NW/2,rootY=PAD,childY0=rootY+NH+72;
    const rows=Math.ceil(ts.length/perRow),W=perRow*(NW+GAP)-GAP+PAD*2,H=childY0+rows*(NH+GAP)+PAD;
    const svg=document.createElementNS(SVGNS,'svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width',W);
    const pos=ts.map((t,i)=>({t,x:PAD+(i%perRow)*(NW+GAP),y:childY0+Math.floor(i/perRow)*(NH+GAP)}));
    for(const p of pos){const st=p.t.last.status||'en_cola';const path=document.createElementNS(SVGNS,'path');const x1=rootX+NW/2,y1=rootY+NH,x2=p.x+NW/2,y2=p.y,my=(y1+y2)/2;path.setAttribute('d','M'+x1+' '+y1+' C'+x1+' '+my+' '+x2+' '+my+' '+x2+' '+y2);path.setAttribute('class','edge '+st);svg.appendChild(path)}
    svg.appendChild(nodo(rootX,rootY,NW,NH,{t:'Orquestador',s:ts.filter(t=>t.last.status==='trabajando').length+' trabajando · '+ts.length+' agentes',k:'DeepSeek Harness',cls:'raiz'}));
    for(const p of pos){const st=p.t.last.status||'en_cola';const tok=p.t.last.tokens&&p.t.last.tokens.total!=null?p.t.last.tokens.total+' tok':'';const dur=p.t.last.durationMs?Math.round(p.t.last.durationMs/100)/10+'s':'';svg.appendChild(nodo(p.x,p.y,NW,NH,{t:p.t.first.label||p.t.first.id,s:st+(dur?' · '+dur:''),k:(p.t.first.kind||'tarea')+(tok?' · '+tok:''),cls:st,id:p.t.first.id}))}
    l.appendChild(svg)}
  function nodo(x,y,w,h,o){const g=document.createElementNS(SVGNS,'g');g.setAttribute('class','node '+(o.cls||''));g.setAttribute('transform','translate('+x+','+y+')');if(o.id){g.style.cursor='pointer';g.onclick=()=>{mostrar('carriles');const el=document.getElementById('lane-'+o.id);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('hl');setTimeout(()=>el.classList.remove('hl'),1600)}}}
    const r=document.createElementNS(SVGNS,'rect');r.setAttribute('width',w);r.setAttribute('height',h);r.setAttribute('rx',11);g.appendChild(r);
    const color={trabajando:'var(--blue)',listo:'var(--cyan)',fallo:'var(--red)',cancelado:'var(--amber)'}[o.cls]||'var(--muted)';
    const t=txt(14,24,'t',corta(o.t,26));g.appendChild(t);
    const s=txt(14,42,'s',corta(o.s,30));s.setAttribute('fill',color);g.appendChild(s);
    g.appendChild(txt(14,56,'k',corta(o.k,30)));return g}
  function txt(x,y,cls,s){const t=document.createElementNS(SVGNS,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('class',cls);t.textContent=s;return t}
  function corta(s,n){s=String(s??'');return s.length>n?s.slice(0,n-1)+'…':s}
  function carriles(){const tasks=tareas().slice().sort((a,b)=>b.last.ts.localeCompare(a.last.ts));document.querySelector('#lanes').innerHTML=tasks.length?tasks.map(t=>'<article class="lane" id="lane-'+esc(t.first.id)+'"><div class="meta"><strong>'+esc(t.first.label||t.first.id)+'</strong><span class="badge">'+esc(t.last.status||'en_cola')+'</span><p><small>'+esc(t.first.kind||'tarea')+' · '+esc(t.first.id)+'</small></p><small>'+esc(t.last.tokens?.total??'tokens no disponibles')+'</small></div><div class="timeline">'+t.es.map(e=>'<div class="event '+esc(e.type)+'"><b>'+esc(e.type)+'</b> <small>'+esc(new Date(e.ts).toLocaleTimeString())+'</small><div>'+esc(e.text||e.tool||e.error||e.stopReason||e.status||'')+'</div></div>').join('')+'</div></article>').join(''):'<div class="empty">No hay tareas registradas.</div>'}
  function stats(){const ts=tareas();const totalTokens=events.reduce((n,e)=>n+(Number(e.tokens?.total)||0),0);const knownCosts=events.filter(e=>typeof e.costUsd==='number');const cost=knownCosts.reduce((n,e)=>n+e.costUsd,0);const duration=ts.reduce((n,t)=>n+(Number(t.last.durationMs)||0),0);document.querySelector('#generated').textContent='Generado '+new Date().toLocaleString();document.querySelector('#stats').innerHTML=[['Agentes',ts.length],['Trabajando',ts.filter(t=>t.last.status==='trabajando').length],['Tokens',totalTokens||'—'],['Tiempo',duration?Math.round(duration/100)/10+' s':'—'],['Costo est.',knownCosts.length?'$'+cost.toFixed(4):'—']].map(([k,v])=>'<div class="stat"><b>'+esc(v)+'</b><span>'+k+'</span></div>').join('')}
  let vista='flujo';function mostrar(v){vista=v;document.querySelector('#vFlujo').classList.toggle('on',v==='flujo');document.querySelector('#vCarriles').classList.toggle('on',v==='carriles');document.querySelector('#flujo').classList.toggle('hidden',v!=='flujo');document.querySelector('#lanes').classList.toggle('hidden',v!=='carriles');render()}
  function render(){stats();if(vista==='flujo')flujo();else carriles()}
  document.querySelector('#vFlujo').onclick=()=>mostrar('flujo');document.querySelector('#vCarriles').onclick=()=>mostrar('carriles');
  window.addEventListener('resize',()=>{if(vista==='flujo')flujo()});render();
  document.querySelector('#help').onclick=()=>{document.querySelector('#notice').textContent='Pide al agente ejecutar orquesta_visor nuevamente, o carga .orquesta/*.jsonl.'};document.querySelector('#files').onchange=async ev=>{events=[];for(const file of ev.target.files){const text=await file.text();for(const line of text.split(/\\r?\\n/).filter(Boolean)){try{events.push(JSON.parse(line))}catch(error){console.error('JSONL inválido',file.name,error)}}}document.querySelector('#notice').textContent=ev.target.files.length+' archivo(s) cargado(s)';render()};
  </script></body></html>`
}

function taskId() { return `orq-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}` }
function assertTaskId(id) { if (!/^orq-[a-z0-9-]+$/.test(id)) throw new Error('id de tarea inválido') }
function normalizeArgv(command) {
  if (!Array.isArray(command) || command.length === 0 || command.some((value) => typeof value !== 'string' || value.includes('\0'))) throw new Error('comando debe ser un arreglo no vacío de argumentos')
  return command
}
function safeCwd(workspace, requested) {
  const root = resolve(workspace)
  const candidate = resolve(root, requested || '.')
  const rel = relative(root, candidate)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('directorio fuera del workspace')
  return candidate
}
function safeEnvironment(env) {
  const kept = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'TERM', 'NODE_PATH']
  return Object.fromEntries(kept.filter((key) => env[key] !== undefined).map((key) => [key, env[key]]))
}
function redactArgv(argv) { return argv.map((value) => /(?:key|token|secret|password)=/i.test(value) ? '[REDACTADO]' : value) }
function wireStream(stream, sink) {
  let buffer = ''
  stream?.setEncoding('utf8')
  stream?.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? ''
    for (const line of lines) if (line) void sink(line.slice(0, 4000))
  })
  stream?.on('end', () => { if (buffer) void sink(buffer.slice(0, 4000)) })
}
function assistantText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return JSON.stringify(content)
  return content.map((block) => block?.text ?? block?.thinking ?? '').filter(Boolean).join('\n').slice(0, 12000)
}
