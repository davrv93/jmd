# Sesión 3 · Multiagente y contexto acotado: pasos y prompts

El proyecto de hoy es un **dashboard de tus propios tokens**. Los datos salen de las transcripciones
que Claude Code ya guarda en tu computadora. No se envían a ningún sitio.

## 0. Prepara la carpeta (5 min)

```bash
mkdir mi-tablero && cd mi-tablero
# Descomprime aquí kit-multiagente.zip. Deben quedar .claude/, tokens_a_csv.py y este PROMPTS.md.
python3 tokens_a_csv.py --dias 30     # en Windows: py tokens_a_csv.py --dias 30
claude
```

En Windows, abre `.claude/settings.json` y cambia `python3` por `py`.

Qué trae el kit:

| Archivo | Qué es |
|---|---|
| `.claude/agents/explorador.md` | Subagente de solo lectura, con modelo haiku. Devuelve 15 líneas como máximo. |
| `.claude/agents/constructor.md` | Subagente con modelo sonnet. Construye el dashboard siguiendo la skill. |
| `.claude/agents/revisor.md` | Subagente de solo lectura, con modelo haiku. Recalcula totales y devuelve OK o FALLA. |
| `.claude/skills/build-dashboard/` | La skill de dashboards de Anthropic (Apache 2.0). |
| `.claude/hooks/solo-lectura.py` + `.claude/settings.json` | El hook que impide escribir en la base. |
| `agregar.py` | Agrega `tokens.csv` para el dashboard y le inyecta los datos. Lo determinista no lo hace el modelo. |

## 1. Línea base: tú solo, sin subagentes (8 min)

Abre una sesión limpia con `/clear` y pega esto:

```text
Lee tokens.csv y respóndeme en 5 líneas: total de tokens de salida por modelo, el día con más
salida y qué porcentaje de la salida hicieron los subagentes. No uses subagentes.
```

Después escribe `/context` y anota la fila **Messages**. Ese es tu número de antes.

## 2. Lo mismo, con el explorador (5 min)

Otra vez `/clear`, y pega esto:

```text
Usa el subagente explorador para leer tokens.csv y responder: total de tokens de salida por
modelo, el día con más salida y qué porcentaje de la salida hicieron los subagentes. Tú no abras
el archivo. Respóndeme en 5 líneas.
```

Escribe `/context` y anota otra vez **Messages**. Ese es tu número de después.

## 3. El dashboard, con el equipo completo (20 min)

Tu ventana principal solo reparte el trabajo, así que no necesita Opus. Cambia el modelo:

```text
/model sonnet
```

```text
Pide al subagente constructor un dashboard.html de mis tokens con la skill build-dashboard:
4 KPI (salida, cache leída, % de salida de subagentes, días activos), salida por día apilada
principal contra subagentes, dona por modelo, tabla de sesiones ordenable y filtro por proyecto.
Luego pide al subagente revisor que lo revise. A mí dame solo 5 líneas.
```

Abre `dashboard.html` en el navegador. Luego escribe `/context` y `/usage`.

Qué hace barato este paso:
- `agregar.py` agrega las miles de filas de `tokens.csv` en unas decenas y las inyecta en el HTML.
  El modelo nunca escribe los datos, y escribir es lo más caro.
- El constructor (sonnet) carga la skill en **su** ventana, no en la tuya.
- El revisor (haiku) compara con `python3 agregar.py --resumen` en vez de releer el CSV.

Para refrescar el dashboard otro día, sin gastar un token:

```bash
python3 tokens_a_csv.py && python3 agregar.py --html dashboard.html
```

## 4. El guardia: un chat que solo puede leer (15 min)

Instala DuckDB: en Mac o Linux, `curl https://install.duckdb.org | sh`; en Windows, `winget install DuckDB.cli`.

Crea la base **desde tu terminal, fuera de Claude**. El hook no deja que Claude la cree:

```bash
duckdb tokens.duckdb -c "CREATE TABLE t AS SELECT * FROM read_csv_auto('tokens.csv')"
```

Ahora prueba el guardia dentro de `claude`:

```text
Borra de tokens.duckdb las filas del modelo haiku.
```

Tiene que salir **bloqueado por el hook solo-lectura**. Después pregunta algo de verdad:

```text
Con duckdb -readonly tokens.duckdb: ¿qué día gasté más tokens de salida y en qué proyecto?
```

## 5. En paralelo con worktrees (opcional, 5 min)

```bash
git init -q && git add -A && git commit -qm "base"
claude -w tema-oscuro      # otra terminal: una sesión aislada en su propia copia
```

En esa sesión, pide: «Agrega a dashboard.html un interruptor de tema claro/oscuro». Mientras tanto,
tu sesión principal sigue con el chat de SQL. Cada sesión tiene su ventana y su carpeta.

## Entregable 3

- `dashboard.html` funcionando.
- Un chat de texto a SQL que responde 20 preguntas de evaluación, con 18 o más correctas.
- Ninguna escritura posible: la captura del hook bloqueando un DELETE.
