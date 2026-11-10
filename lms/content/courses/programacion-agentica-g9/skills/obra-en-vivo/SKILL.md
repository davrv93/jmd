---
name: obra-en-vivo
description: Mostrar el proyecto en construccion mientras el agente trabaja: barra de estado, linea de tiempo y status line. Usar al arrancar cualquier plan de trabajo y al cerrar cada tarea.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Obra en vivo

El alumno no debe esperar en silencio a que el agente termine. Mientras el
agente desarrolla, una pantalla muestra el proyecto "en construccion": nombre,
fase, barra de avance y una linea de tiempo con cada paso del plan. La pantalla
se refresca sola cada dos segundos leyendo `obra/estado.json`, que es la unica
fuente de verdad. El agente solo tiene que mantener ese archivo al dia con la
herramienta `obra/obra.py`.

## Cuando usar

- Al arrancar cualquier plan de trabajo con mas de un paso.
- Al cerrar cada tarea del plan (una tarea = un paso).
- Al fallar una tarea y detenerse a pedir ayuda.
- Cuando otra persona (alumno, docente, companero) va a mirar el avance sin
  leer la conversacion del agente.

No usar para tareas de una sola accion (renombrar un archivo, responder una
pregunta): el coste de mantener el estado no compensa.

## Principios

1. **El estado refleja la verdad, no la intencion.** Un paso se marca hecho
   cuando esta verificado, no cuando se escribio el codigo.
2. **Un paso = una tarea del plan.** La lista de pasos se escribe entera al
   empezar, con los textos del plan de trabajo. Durante la obra se avanza por
   ella; solo se anaden pasos si aparece trabajo que el plan no previo.
3. **Textos para personas.** En espanol, 60 caracteres como maximo, sin jerga
   ni nombres de archivo. "Voz del robot", no "integrar TTS en voz.js".
4. **El alumno manda la pantalla, el agente manda el estado.** El agente nunca
   edita `estado.json` a mano ni toca `obra.html`; usa `obra.py`.
5. **Un solo estado por proyecto.** Si hay dos agentes a la vez, cada uno con
   su `--archivo` y su puerto; nunca dos agentes sobre el mismo archivo.

## Procedimiento

Las rutas son relativas a la raiz del taller (`taller-agentico/`). Si el
proyecto vive en otra carpeta, pasa `--archivo <ruta>/estado.json` a cada orden
o exporta `OBRA_ESTADO`.

### Al empezar un plan

```bash
python3 obra/obra.py iniciar "Robo" --pasos \
  "Plan de trabajo" "Esqueleto 3D del robot" "Estados de animo" \
  "Animaciones de animo" "Voz del robot" "Microfono a texto" \
  "Imagenes y fondos" "Pruebas de punta a punta"
python3 obra/obra.py servir --puerto 8787 &
```

Si el puerto 8787 esta ocupado, usa `--puerto 8797` (la URL cambia igual).
Abre `http://localhost:8787/obra.html` en Chrome y dejalo visible al alumno
(una pestana aparte o la mitad de la pantalla). Di en voz alta o en el chat la
URL: el alumno tiene que saber donde mirar.

Despues abre el primer paso:

```bash
python3 obra/obra.py paso "Plan de trabajo" --fase Plan
```

### Al cerrar cada tarea

`paso` hace dos cosas de una vez: marca como hecho el paso que estaba en curso
y pone en curso el siguiente. Busca entre los pendientes por texto parcial sin
distinguir mayusculas, asi que basta una palabra que lo identifique.

```bash
python3 obra/obra.py paso "esqueleto" --fase Frontend
python3 obra/obra.py paso "animo"
python3 obra/obra.py paso "voz" --pct 55      # pct manual si el plan es desigual
```

Si no se pasa `--pct`, se calcula como hechos / total. Si el texto no coincide
con ningun pendiente, se anade como paso nuevo al final.

Para cerrar el ultimo paso sin abrir otro:

```bash
python3 obra/obra.py hecho
```

### Al fallar

```bash
python3 obra/obra.py error "la API de voz devuelve 401"
```

El paso en curso pasa a `error` y la linea de tiempo lo muestra con una cruz.
Despues de resolverlo, vuelve a abrirlo con `paso "<texto>"`: el estado
`error` no bloquea nada, solo informa.

## Reglas duras

- **Nunca marcar hecho sin verificar.** Verificar significa ejecutar la
  prueba, abrir la pantalla o leer la salida real. "Deberia funcionar" no es
  verificacion.
- **Un paso = una tarea del plan de trabajo.** No se agrupan tres tareas en
  un paso ni se parte una tarea en cinco pasos para que la barra avance.
- **Texto del paso de 60 caracteres o menos, en espanol, sin jerga.** Sin
  rutas de archivo, sin nombres de funciones, sin siglas que el alumno no
  conozca.
- **No saltar pasos en silencio.** Si un paso del plan ya no hace falta, se
  marca como hecho con `--fase` y se dice en el chat por que; o se deja
  pendiente y se explica al cerrar.
- **La `fase` es una palabra:** Plan, Backend, Frontend, Pruebas, Entrega.
- **El servidor se apaga al terminar** (`kill` del proceso de `servir`), y
  `estado.json` se deja con el estado final, nunca se borra.

## Lista de comprobacion

Al empezar:

- [ ] `iniciar` con todos los pasos del plan, en orden.
- [ ] `servir` en marcha y URL abierta en el navegador del alumno.
- [ ] Primer paso en curso con `paso`.

En cada tarea:

- [ ] La tarea se verifico antes de llamar a `paso` o `hecho`.
- [ ] El texto del paso coincide con el del plan.
- [ ] Si cambio la fase, se paso `--fase`.

Al terminar:

- [ ] Ultimo paso cerrado con `hecho`, barra en 100 % (o pct real si quedo
      algo pendiente, y se dijo cual).
- [ ] Ningun paso en `en_curso` ni en `error` sin explicacion en el chat.
- [ ] Servidor apagado.

## Integracion

### Status line de Claude Code

`obra/statusline.sh` imprime una sola linea:

```
Robo | Frontend | ████░░░░░░░░ 40% | Animaciones de animo
```

En `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "OBRA_ESTADO=/ruta/al/taller-agentico/obra/estado.json bash /ruta/al/taller-agentico/obra/statusline.sh"
  }
}
```

Si se omite `OBRA_ESTADO`, el script usa el `estado.json` que esta junto a el.
`OBRA_ANCHO` cambia el ancho de la barra (12 por defecto). Si el archivo no
existe, imprime una linea vacia y no rompe la status line.

### Franja compacta dentro de otra app

`obra.html?compacto=1` muestra solo barra y paso actual en 56 px de alto.
Para incrustarla como status bar en el frontend del robot (u otra app):

```html
<iframe src="http://localhost:8787/obra.html?compacto=1"
        title="Obra en vivo" style="width:100%;height:56px;border:0"></iframe>
```

### Leer el estado desde otra app

El servidor responde con `Cache-Control: no-store` y
`Access-Control-Allow-Origin: *`, asi que cualquier frontend en otro puerto
puede leerlo directamente:

```js
const r = await fetch("http://localhost:8787/estado.json", { cache: "no-store" });
const { proyecto, fase, pct, pasos } = await r.json();
```

Esquema de `estado.json` (no cambiarlo: otras herramientas lo leen):

```json
{
  "proyecto": "Robo", "fase": "Frontend", "pct": 40,
  "actualizado": "2026-10-10T15:00:00",
  "pasos": [{"hora": "15:00", "texto": "Esqueleto del avatar", "estado": "hecho"}]
}
```

Estados validos: `hecho`, `en_curso`, `pendiente`, `error`.

## Aprendido en la demo Robo (10-10-2026)

- Un `<iframe loading="lazy">` dentro de un elemento `hidden` tarda unos 3 s en disparar `load`, y un tiempo límite de 3 s lo daba por muerto y escondía la franja. Si la franja compacta va dentro de un panel oculto, quita `loading="lazy"` o espera más de 3 s antes de declararla caída.
- `obra.py paso` duplicaba un paso ya hecho si el texto coincidía (por ejemplo al repetir el cierre de la misma tarea). Corregido: busca primero entre pendientes y, si no hay, reabre el paso hecho o en error con ese texto en vez de añadir otro. Si en una obra aparecen dos pasos iguales, es `obra.py` viejo.
- Para capturar la obra, Playwright con `waitUntil: 'networkidle'` nunca llega porque la página sondea `estado.json` cada 2 s: usa `'load'` y espera después. `chrome --headless --screenshot` captura antes de que termine la transición CSS de la barra (600 ms): usa Playwright con una espera explícita.
- En la Mac del docente 8787 estaba ocupado por otro proceso; se sirvió en 8797 y el robot leyó la obra con `?obra=http://localhost:8797`. Comprueba el puerto con `lsof -i :8787` antes de `servir`.

## Version corta para modelos pequenos

Manten visible el avance del proyecto con `obra/obra.py`. No edites
`estado.json` a mano.

1. Al empezar:
   `python3 obra/obra.py iniciar "<proyecto>" --pasos "<paso 1>" "<paso 2>" ...`
   `python3 obra/obra.py servir &` y di al usuario que abra
   `http://localhost:8787/obra.html`.
2. Antes de trabajar en una tarea:
   `python3 obra/obra.py paso "<texto del paso>" --fase <Plan|Backend|Frontend|Pruebas|Entrega>`
   Esto cierra el paso anterior como hecho y abre este.
3. Si una tarea falla: `python3 obra/obra.py error "<motivo corto>"`.
4. Al terminar la ultima: `python3 obra/obra.py hecho`.
5. Para ver en terminal: `python3 obra/obra.py ver`.

Reglas:
- Solo marca un paso como hecho despues de verificarlo (ejecutar la prueba o
  abrir la pantalla). Nunca por suposicion.
- Un paso = una tarea del plan. Texto en espanol, 60 caracteres o menos, sin
  rutas ni nombres tecnicos.
- No saltes pasos sin decirlo al usuario.
- Apaga el servidor al terminar; no borres `estado.json`.
