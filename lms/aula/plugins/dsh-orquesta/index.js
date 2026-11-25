import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTaskRuntime } from './lib/runtime.js'

export const name = 'dsh-orquesta'
export const inject = ['tools', 'skills', 'workingDirectory', 'subagents']
const ROOT = fileURLToPath(new URL('./', import.meta.url))
const SKILL_FILE = join(ROOT, 'skills', 'orquesta', 'SKILL.md')

export function apply(ctx, config = {}) {
  const runtime = createTaskRuntime(config)
  ctx.on('subagent/end', (info) => runtime.onSubagentEnd(info))
  registerSkill(ctx)

  register(ctx, {
    name: 'tarea_fondo',
    description: 'Inicia una tarea durable en segundo plano. Para orquestaciones grandes prefiere el workflow nativo con run_in_background; usa esta herramienta cuando necesites JSONL persistente o un comando seguro dentro del workspace.',
    parameters: objectSchema({
      tipo: { type: 'string', enum: ['subagente', 'comando'], description: 'Tipo de tarea.' },
      nombre: { type: 'string', minLength: 1, description: 'Etiqueta breve.' },
      instruccion: { type: 'string', description: 'Prompt autocontenido para el subagente.' },
      comando: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'Ejecutable y argumentos, sin shell.' },
      directorio: { type: 'string', description: 'Directorio relativo dentro del workspace.' },
    }, ['tipo', 'nombre']),
    async execute(args, exec) {
      const workspace = await workspaceFor(ctx, exec)
      if (args.tipo === 'comando') return runtime.launchCommand(workspace, args)
      if (!args.instruccion) throw new Error('instruccion es obligatoria para tipo subagente')
      return runtime.launchSubagent(workspace, args, exec, ctx.subagents, config.subagentProvider ?? 'spawn')
    },
    render: (_args, value) => `tarea ${value.id} iniciada (${value.kind})`,
  })

  register(ctx, {
    name: 'tarea_estado',
    description: 'Lee del JSONL el estado, duración, eventos y tokens conocidos de una tarea de orquesta.',
    parameters: objectSchema({ id: { type: 'string' } }, ['id']),
    execute: async (args, exec) => runtime.status(await workspaceFor(ctx, exec), args.id),
    render: (_args, value) => `${value.id}: ${value.status} · ${value.events} eventos`,
  })

  register(ctx, {
    name: 'tareas_listar',
    description: 'Lista las tareas durables registradas en <workspace>/.orquesta.',
    parameters: objectSchema({}, []),
    execute: async (_args, exec) => ({ tasks: await runtime.list(await workspaceFor(ctx, exec)) }),
    render: (_args, value) => value.tasks.length ? value.tasks.map((task) => `${task.id} [${task.status}] — ${task.label}`).join('\n') : '(sin tareas)',
  })

  register(ctx, {
    name: 'tarea_cancelar',
    description: 'Solicita cancelar una tarea activa creada por tarea_fondo.',
    parameters: objectSchema({ id: { type: 'string' } }, ['id']),
    execute: async (args, exec) => runtime.cancel(await workspaceFor(ctx, exec), args.id, exec, ctx.subagents),
    render: (_args, value) => `${value.id}: ${value.detail}`,
  })

  register(ctx, {
    name: 'orquesta_visor',
    description: 'Genera orquesta-visor.html autocontenido con carriles, eventos, mensajes y totales a partir de los JSONL del workspace.',
    parameters: objectSchema({}, []),
    execute: async (_args, exec) => runtime.viewer(await workspaceFor(ctx, exec)),
    render: (_args, value) => `visor generado: ${value.path} (${value.tasks} tareas, ${value.events} eventos)`,
  })
}

function register(ctx, spec) {
  ctx.tools.register({
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters,
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (args, value) => [{ type: 'text', text: spec.render(args, value) }],
    },
    execute: spec.execute,
  })
}

function objectSchema(properties, required) { return { type: 'object', additionalProperties: false, properties, required } }
async function workspaceFor(ctx, exec) {
  if (!exec.agent) throw new Error('la herramienta requiere un agente llamante')
  return ctx.workingDirectory.ensure(exec.agent, exec.signal)
}
function registerSkill(ctx) {
  const metadata = {
    name: 'orquesta',
    description: 'Usa tareas en segundo plano y un visor durable cuando el usuario pida ejecutar en paralelo, seguir subagentes, revisar estados o visualizar el flujo.',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: 'dsh-orquesta', source: 'bundled', rank: 600,
    resourceBase: { kind: 'directory', path: join(ROOT, 'skills', 'orquesta') },
    locator: SKILL_FILE, path: SKILL_FILE,
  }
  ctx.skills.registerProvider(() => ({
    name: 'dsh-orquesta',
    list: async (options) => { options?.signal?.throwIfAborted(); return [metadata] },
    get: async (candidate, options) => {
      if (candidate.name !== 'orquesta') return undefined
      options?.signal?.throwIfAborted()
      const raw = await readFile(SKILL_FILE, 'utf8')
      return { ...metadata, content: raw.replace(/^---[\s\S]*?---\s*/, '').trim() }
    },
  }))
}
