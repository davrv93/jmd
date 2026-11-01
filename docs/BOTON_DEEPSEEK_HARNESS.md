# Botón «Abrir DeepSeek Harness»

Un clic en el LIVE y el alumno tiene DeepSeek Harness (dsh) abierto en una pestaña nueva, ya autenticado, **sin ver
una terminal**. Pensado para cursos de alumnos que no usan la consola (p. ej. `excel-ia-contabilidad`, grupo
`atelecom-1`).

## 1. Qué tiene que poner una escena

### Opción A: el botón en la cabecera de la escena (lo más simple)

En `escena.yaml`:

```yaml
dsh: true
```

El LIVE muestra **«Abrir DeepSeek Harness»** y un candado **«Mi clave»** en la cabecera de esa escena (junto a
«Lo logré»). Nada más que hacer.

### Opción B: un botón grande dentro de `escena.html`

La escena va en un iframe que no puede abrir pestañas, así que le **avisa** al LIVE y el LIVE la abre:

```html
<button type="button" data-jmd-dsh="abrir">Abrir DeepSeek Harness</button>
<button type="button" data-jmd-dsh="clave">Mi clave</button>
<script>
  document.querySelectorAll("[data-jmd-dsh]").forEach(function (b) {
    b.addEventListener("click", function () {
      parent.postMessage({ tipo: b.getAttribute("data-jmd-dsh") === "clave" ? "dsh-clave" : "abrir-dsh" }, location.origin);
    });
  });
</script>
```

- `{tipo: "abrir-dsh"}` abre `/deepseek/` (arranca dsh y entra).
- `{tipo: "dsh-clave"}` abre `/deepseek/?clave=1` (solo la clave: guardar, ver «Clave guardada ✓», olvidar).

Las dos opciones se pueden combinar. **Escena de ejemplo lista para copiar:**
[`docs/ejemplos/escena-boton-dsh/01-abrir-dsh/`](ejemplos/escena-boton-dsh/01-abrir-dsh/) (usa las dos). Cópiala a
`lms/content/courses/<curso>/live/<lección>/` y, si cambias el nombre de la carpeta, cambia también el `id` del yaml.

Fuera del LIVE vale un enlace normal: `<a href="/deepseek/" target="_blank">Abrir DeepSeek Harness</a>`.

## 2. Qué ve el alumno

1. Pulsa el botón → pestaña nueva `/deepseek/`: «Preparando tu DeepSeek Harness…».
2. El LMS enciende su aula (si estaba apagada), elige la clave y arranca `dsh web` dentro (5 a 10 s).
3. Si no hay clave: formulario **«Pega aquí tu clave de DeepSeek»** (campo oculto) → «Guardar y abrir».
4. La pestaña se convierte en dsh (el token de arranque se canjea solo). Volver a pulsar el botón reutiliza el mismo
   dsh; si cambió la clave, lo reinicia con la nueva.

Prioridad de la clave: **la propia del alumno** si la guardó; si no, **la de la clase** si su grupo la tiene; si no, el
formulario. La clave propia vive solo en la memoria del aula (`~/.aula-dsh/clave`, 0600, tmpfs): se pierde cuando el
aula se apaga (15 min sin uso; mientras dsh está abierto el aula no se apaga) y hay que volver a pegarla.

## 3. Clave de la clase (instructor)

Variables del LMS (en el `.env` del servidor; `compose.yaml` ya las pasa):

| Variable | Qué es |
|---|---|
| `LMS_DEEPSEEK_API_KEY` | la clave de DeepSeek de la clase |
| `LMS_IA_GLOBAL_COHORTES` | grupos que la usan, separados por coma: `atelecom-1`. Otra clave por grupo: `grupo-9:LMS_DEEPSEEK_API_KEY_G9` (y define esa variable) |
| `LMS_IA_TOPE_PETICIONES` | peticiones por alumno y día (hora de Lima). Vacío = 600 |
| `LMS_IA_TOPE_TOKENS` | tokens por alumno y día (entrada, caché incluida, + salida). Vacío = 4 000 000 |
| `LMS_IA_SIMULTANEAS` | peticiones a la vez por alumno. Vacío = 4 |
| `LMS_IA_URL_AULA` | raíz del LMS vista desde el aula. Vacío = `LMS_PUBLIC_URL` (el aula sale por `npm-proxy`) |
| `LMS_IA_UPSTREAM` | raíz de la Messages API. Vacío = `https://api.deepseek.com/anthropic` |

Ponerla: añade las dos primeras al `.env` y recrea el LMS (`docker compose up -d --no-build lms`). En el log:
`relé de IA (clave de la clase) activo grupos=atelecom-1`. Quitarla: vacía `LMS_IA_GLOBAL_COHORTES` y recrea; los
tokens dejan de valer al instante (403) y el botón vuelve a pedir la clave propia.

Uso de hoy por alumno (instructor del grupo o admin): `GET /api/v1/ia/uso` → peticiones, tokens de entrada y salida,
rechazadas por tope. Se guarda en `<datos>/ia-uso.json` (sobrevive a reinicios; se vacía a medianoche de Lima). Al
llegar al tope, dsh muestra «Llegaste al tope de hoy de la clave de la clase…» y no reintenta en bucle.

## 4. Seguridad: la clave de la clase nunca entra al aula

El alumno tiene shell en su aula (puede leer `env`, `/proc/*/environ` y cualquier archivo suyo). Por eso:

```
 navegador ──/dsh/<sub>/──▶ LMS ──docker exec (relé python3)──▶ aula: dsh web (127.0.0.1:3080)
                                                                   │ x-api-key: jmdia.<sub>.<HMAC>   (token del AULA)
                                                                   ▼
            LMS /api/v1/ia/anthropic/v1/messages ◀── npm-proxy ◀───┘   DEEPSEEK_BASE_URL=<LMS>/api/v1/ia/anthropic
                 │ valida token, grupo y topes; quita cookies y cabeceras
                 ▼ x-api-key: <clave de la clase>   (solo en el entorno del LMS)
            https://api.deepseek.com/anthropic/v1/messages   (SSE sin búfer, de vuelta igual)
```

- **Token del aula** = `jmdia.<sub en base64url>.<HMAC-SHA256(secreto del LMS, sub + hora de arranque del contenedor)>`.
  El LMS no lo guarda (lo recalcula). Caduca solo cuando el aula se apaga o se recrea (cambia la hora de arranque),
  deja de valer si el alumno sale del grupo y solo sirve para este relé, con tope diario. El secreto es el de las
  aulas (`LMS_AULA_SECRETO` o `<datos>/aula-secreto`).
- dsh habla la **Messages API compatible con Anthropic** (`dsh-llm-deepseek`: `POST <base>/v1/messages` con
  `x-api-key`, y `<base>/v1/files` para imágenes). La base sale de `DEEPSEEK_BASE_URL` (la búsqueda web de
  `DEEPSEEK_SEARCH_BASE_URL`); `aula` las exporta solo en modo «clase». El relé deja pasar únicamente
  `POST v1/messages`, `POST v1/messages/count_tokens` y `v1/files` (GET/POST/DELETE); el resto, 404.
- El 401 de DeepSeek trae la clave enmascarada (`****abcd`): el relé lo cambia por su propio mensaje.
- Registro: `msg=ia aula=curso-<hash> grupo=… ruta=… estado=… ms=… tokens_entrada=… tokens_salida=…`. Nunca cuerpos,
  claves, tokens ni el id del alumno.
- La clave **propia** sí entra al aula (es del alumno): llega por stdin de `docker exec` (`aula dsh clave -`), nunca
  por la línea de comandos, los logs ni la base del LMS.
- Riesgo aceptado: el alumno puede leer SU token (`~/.aula-dsh/rele`) y usarlo desde fuera mientras su aula siga
  encendida. Lo limitan los topes por alumno; apagar el aula lo invalida.

## 5. API (todo sobre el aula de quien llama; con cookie exige JSON y Origin propio)

| Ruta | Qué hace |
|---|---|
| `GET /api/v1/dsh` | `{aula, clave: propia\|clase\|ninguna, propia, clase, web}` (sin secretos) |
| `POST /api/v1/dsh/clave` `{"clave":"sk-…"}` | guarda la clave propia en el aula (enciende el aula si hace falta) |
| `POST /api/v1/dsh/olvidar` `{}` | la borra (y para dsh si corría con ella) |
| `POST /api/v1/dsh/abrir` `{}` | enciende el aula, prepara la clave, arranca o reutiliza `dsh web` → `{url, modo}`; 409 `sin_clave` |
| `/api/v1/ia/anthropic/...` | el relé (sin sesión del LMS: token del aula en `x-api-key`) |
| `GET /api/v1/ia/uso` | uso de hoy (instructor del grupo o admin) |

En el aula (`lms/aula/bin/aula`): `aula dsh clave -` (stdin), `aula dsh rele -|borrar`, `aula dsh modo`,
`aula dsh abrir` (última línea `URL <enlace>`).

## 6. Despliegue

1. `jmd/aula` (cambió `bin/aula`): `sudo docker build -t jmd/aula:latest lms/aula`. Las aulas paradas se recrean
   solas con la imagen nueva; las que estén encendidas siguen con la vieja hasta apagarse.
2. LMS (Go + front): `sudo docker compose build lms && sudo docker compose up -d --no-build lms`.
3. nginx del dominio, en lo que lleva a `/api/v1/ia/` (y si no está ya, en `/dsh/`): `client_max_body_size 50m;`
   (dsh manda todo el contexto en cada petición: pasa de 1 MB enseguida), `proxy_read_timeout 300s;` y sin búfer
   (`proxy_buffering off;`; el LMS ya manda `X-Accel-Buffering: no`).
4. El aula debe alcanzar `LMS_IA_URL_AULA` por `npm-proxy` (con `permitidos` abierto, ya lo hace). Alternativa sin
   pasar por internet: conectar el contenedor `lms` a `aula_net` y poner `LMS_IA_URL_AULA=http://lms:8080` (`lms` ya
   está en el `NO_PROXY` de las aulas).
5. Para un grupo con clave de la clase: `LMS_DEEPSEEK_API_KEY` y `LMS_IA_GLOBAL_COHORTES` en el `.env`, y recrear el LMS.
