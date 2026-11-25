# dsh-orquesta 0.1.0

Registro durable y visor independiente para tareas y subagentes de **DeepSeek
Harness 0.2.1-rc.3**.

## Qué ya existe en DSH

La inspección del bundle instalado y de `deepseek-multi-agent-plugin` confirmó:

- `subagent` y `subagent_fork` inician hijos administrados y devuelven su ID de
  inmediato; `send_message`, `interrupt_agent` y `list_agents` los controlan.
- `workflow` acepta `run_in_background: true`, registra un job nativo y expone
  progreso en vivo por fase/agente.
- `job_output` y `job_kill` consultan y cancelan jobs; la cabecera de sesión
  muestra el progreso transitorio.
- `deepseek-multi-agent-plugin` agrega rutas Ollama/OpenRouter/DeepSeek, niveles
  y una política de uso de `workflow`; no persiste una bitácora portable ni
  genera un visor HTML autocontenido.

Por eso este plugin **no reemplaza ni copia** el motor nativo. Añade lo que
faltaba: JSONL por tarea, comandos seguros, nombres de herramienta en español y
un visor exportable que sigue funcionando fuera de DSH.

## Qué agrega

| Herramienta | Función |
| --- | --- |
| `tarea_fondo` | Inicia un subagente mediante `ctx.subagents` o un proceso argv sin shell. Devuelve ID al instante. |
| `tarea_estado` | Resume estado, duración, eventos, tokens y costo conocidos. |
| `tareas_listar` | Lista el registro durable del workspace. |
| `tarea_cancelar` | Interrumpe un subagente o envía `SIGTERM` al proceso activo. |
| `orquesta_visor` | Genera `<workspace>/orquesta-visor.html`, sin CDN. |

Cada tarea escribe `<workspace>/.orquesta/<id>.jsonl`: cola, inicio,
herramienta, mensajes, tokens, fin/fallo/cancelación y duración. DSH 0.2.1 no
publica uso de tokens en `subagent/end`; en ese caso se registra `null`, nunca
una estimación inventada. El visor muestra carriles, estados, mensajes, tiempo,
tokens y costo estimado cuando existe; permite cargar JSONL con un selector de
archivos para actualizar una copia abierta con `file://`.

Incluye la skill `orquesta`, con frontmatter YAML válido.

## Instalación

No está instalado en el perfil desktop. Para enlazar esta carpeta explícitamente:

```bash
/Applications/DeepSeek\ Harness.app/Contents/Resources/runtime/cli/bin/dsh \
  plugin --profile desktop add \
  link:$HOME/Documents/deepseek-harness/default-workspace/plugins/dsh-orquesta
```

Equivalente desde esta carpeta:

```bash
node install.mjs
```

Reinicia DeepSeek Harness después. Para desinstalar:

```bash
/Applications/DeepSeek\ Harness.app/Contents/Resources/runtime/cli/bin/dsh \
  plugin --profile desktop remove dsh-orquesta
```

### Si aparece `ERR_PNPM_UNEXPECTED_STORE`

DSH incluye pnpm 11; un `node_modules` creado por otro store puede bloquear la
instalación. Cierra DSH, conserva la carpeta como respaldo y repite el comando:

```bash
stamp=$(date +%Y%m%d-%H%M%S)
mv "$HOME/.dsh/profiles/desktop/node_modules" \
  "$HOME/.dsh/profiles/desktop/node_modules.bak-$stamp"
/Applications/DeepSeek\ Harness.app/Contents/Resources/runtime/cli/bin/dsh \
  plugin --profile desktop add \
  link:$HOME/Documents/deepseek-harness/default-workspace/plugins/dsh-orquesta
```

No borres el respaldo hasta verificar el perfil.

## Uso recomendado

- Para una orquestación normal, usa primero `workflow` con
  `run_in_background: true`: es el mecanismo nativo y su UI es mejor durante la
  ejecución.
- Usa `tarea_fondo` cuando necesites bitácora JSONL, un proceso local o el visor
  portable.
- `tipo: "comando"` recibe un arreglo argv, no una cadena shell. El cwd debe
  quedar dentro del workspace y el ejecutable debe estar en la allowlist.
- No sondees en bucle: conserva el ID, continúa trabajo útil y consulta una vez.

Ejemplo conceptual:

```json
{
  "tipo": "comando",
  "nombre": "tests",
  "comando": ["npm", "test"],
  "directorio": "frontend"
}
```

## Seguridad y límites

- Los comandos se ejecutan con `spawn(..., { shell: false })` y un entorno
  reducido sin claves de API.
- No se permiten rutas de trabajo fuera del workspace.
- La allowlist predeterminada es `node`, `python3`, `git`, `npm`, `pnpm` y se
  configura en `cordis.patch.yml`.
- Una tarea activa solo puede cancelarse desde el proceso DSH que la creó. Un
  JSONL histórico sigue siendo consultable, pero no reanuda procesos muertos.
- El visor es una instantánea: vuelve a llamar `orquesta_visor` o carga los
  JSONL para refrescarlo.

## Verificación

```bash
npm test
node --check index.js
node --check lib/runtime.js
```

La prueba DSH real usa un `DSH_HOME` temporal y un servidor SSE local
guionizado (`test/modelo_orquesta.py`): no llama a DeepSeek ni consume saldo.
Se lanzan dos tareas, se consultan sus estados, se genera el visor y se abre con
Playwright para comprobar errores JavaScript y producir una captura.

## Empaquetado

```bash
npm run pack:zip
```

Produce `dsh-orquesta-0.1.0.zip` en esta misma carpeta. No publica nada.
