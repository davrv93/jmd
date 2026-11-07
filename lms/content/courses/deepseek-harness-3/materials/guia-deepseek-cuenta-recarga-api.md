# Guía: cuenta, saldo y clave de DeepSeek, y primer uso de DeepSeek Harness (`dsh`)

Sesión 1 del curso «DeepSeek Harness» · preparada el **31-10-2026** · versión de `dsh` probada: **0.2.1-rc.5**

> **Regla de esta guía.** Cada paso sale de una fuente leída el 31-10-2026 (se cita al final de cada bloque y en la sección «Fuentes») o de una ejecución real de `dsh` en esta misma fecha. Lo que exige iniciar sesión, pagar o crear una cuenta **no se pudo ver** y está marcado **«verifica en tu pantalla»**. Esas pantallas se dibujan solo como **esquema** («Esquema ilustrativo · tu pantalla puede variar»), nunca como captura.
>
> **Quién habla.** Los alumnos son de Perú. Ninguna fuente que leí habla de Perú, de soles ni de Yape/Plin; esas dudas están en «Pendiente de verificar en pantalla».

Materiales visuales relacionados (misma carpeta del curso `deepseek-harness`):

| Qué | Dónde |
|---|---|
| 12 diapositivas WebP 1600×900 | `lms/content/courses/deepseek-harness/materials/guia-visual-s1/01.webp … 12.webp` |
| Plantilla y script de las diapositivas | `…/materials/guia-visual-s1/_fuente/` (`plantilla.html`, `diapositivas.json`, `construir.cjs`) |
| Esquemas SVG | `lms/content/courses/deepseek-harness/live/_comun/img/ds-01-cuenta.svg`, `ds-02-recarga.svg`, `ds-03-api-key.svg`, `dsh-00-flujo.svg` |
| Capturas reales de `dsh` | `…/live/_comun/img/dsh-01-…webp` a `dsh-10-…webp` |

---

## Bloque 1 · Cuenta (plataforma de DeepSeek)

La **plataforma para desarrolladores/API** (`platform.deepseek.com`) no es la misma cosa que el chat de DeepSeek. La API key sale de la plataforma.

**Pasos**

1. Escribe tú mismo `https://platform.deepseek.com` en el navegador (no uses anuncios ni enlaces de terceros).
2. Elige registrarte. Según el FAQ oficial, el acceso puede ser con **correo electrónico**, **teléfono (SMS)** o **Google**; WeChat existe, pero solo funciona con IP de China continental.
3. Si usas correo, prefiere un dominio internacional: el FAQ dice que si aparece «registro fallido, no se admite ese dominio», se recomienda **Gmail, Outlook, Hotmail o Yahoo**.
4. Pide el código de verificación y escríbelo (ver «Si falla»).
5. Pon una contraseña propia y guárdala en tu gestor de contraseñas.

**Qué deberías ver**

- Un código llegando a tu correo o SMS y, tras escribirlo, tu sesión abierta en la plataforma. **Verifica en tu pantalla** el aspecto exacto: `platform.deepseek.com` devolvió **403 (CloudFront)** a mi navegador y a `curl`, así que no pude ver ni capturar sus pantallas (ver «Pendiente»).

**Si falla** (todo del FAQ oficial)

- *No llega el código*: espera (puede tardar); confirma que el correo/teléfono está bien escrito; revisa spam y filtros; si pediste muchos códigos seguidos, espera un rato; si cambiaste de operador, puede tardar hasta 24 h; reinicia el teléfono y pide otro.
- *«Dominio de correo no admitido»*: usa Gmail/Outlook/Hotmail/Yahoo; si sigue, `service@deepseek.com`.
- *«Entorno del dispositivo anómalo»*: el sistema marcó tu IP o número como riesgoso; el FAQ dice que cambies de entorno. (No improvises: si estás en una red de colegio/empresa, prueba otra red normal.)
- *Google no funciona*: el FAQ dice que el inicio con Google **no** se admite con IP de China continental.
- Cuenta «temporalmente suspendida»: hay un formulario de apelación (revisión típica de 3 días hábiles).

**Fuentes (leídas 31-10-2026)**: FAQ oficial `https://static.deepseek.com/faq/index.html?lang=en` (preguntas *verification code*, *WeChat login*, *Google login*, *unsupported email*, *environment error*, *account suspension*).

---

## Bloque 2 · Saldo (recarga)

**Pasos**

1. En la plataforma abre la página **Top Up** (recarga).
2. Mira tu saldo actual. Si el saldo es 0, la API responde **402** (ver bloque 5).
3. Elige el medio de pago. **Publicado en el FAQ oficial (inglés):** «PayPal, bank card, Alipay, or WeChat Pay». No se publica ningún otro (no aparece Yape, Plin ni otras billeteras).
4. **Antes de pagar**, lee en pantalla: moneda, total, comisiones y tipo de cambio. La documentación que leí **no publica** monto mínimo de recarga ni equivalente en soles.
5. Paga. Revisa el resultado en la página **Billing** (el FAQ dice que ahí se consulta).

**Qué deberías ver**

- El saldo actualizado y el movimiento en *Billing*. **Verifica en tu pantalla** monto mínimo, moneda y medios disponibles para tu país.

**Dato útil de la política publicada**

- El saldo recargado **no caduca** («Top-up balances do not expire»).
- El saldo no consumido se puede **reembolsar**: pagos en línea desde *Billing → Refunds*.
- Si hay saldo recargado y saldo de cortesía («granted»), se gasta **primero el de cortesía**.
- Si recargaste con otra cuenta (otro login), el saldo no aparece en la cuenta actual: el FAQ sugiere iniciar sesión con el otro método (Google/correo).

**Recomendación prudente (mía, no de DeepSeek):** empieza con un monto pequeño y confirma con tu tarjeta/banco que acepta pagos internacionales. No pagues en clase si no puedes permitirte el cargo: se puede seguir el curso viendo la demostración.

**Si falla**

- Pago rechazado: lo decide el medio de pago; prueba otro de los listados o consulta con tu banco. No hay mensaje oficial que pueda citar.
- No ves el saldo: revisa que estés en la misma cuenta con la que pagaste y mira *Billing*.

**Fuentes (31-10-2026)**: FAQ oficial (*How to Top Up?*, *Does the balance expire?*, *Is a refund possible?*, *Incorrect Top-up Balance*); `https://api-docs.deepseek.com/quick_start/pricing` (nota sobre saldo recargado y de cortesía).

### Precios publicados (consultados el 31-10-2026)

Fuente: `https://api-docs.deepseek.com/quick_start/pricing`. Moneda: **USD** por millón de tokens. DeepSeek avisa que puede cambiar los precios y recomienda revisar la página.

| | `deepseek-flash` | `deepseek-v4-pro` |
|---|---|---|
| Entrada, caché **acierto** (valle / pico) | $0.003 / $0.006 | $0.022 / $0.044 |
| Entrada, caché **fallo** (valle / pico) | $0.15 / $0.30 | $0.66 / $1.32 |
| Salida (valle / pico) | $0.60 / $1.20 | $1.98 / $3.96 |
| Contexto / salida máx. | 1M / 384K | 1M / 384K |
| Visión | Sí | No |
| Límite de concurrencia | 2500 | 500 |

- **Diferencia de caché:** un token de entrada que acierta la caché cuesta una fracción (en Flash, $0.003 frente a $0.15 en horario valle; ~50 veces menos). «Fallo» es el precio normal de entrada.
- **Pico:** el precio de pico es el doble que el de valle. Pico = 01:00–04:00 y 06:00–10:00 UTC, lunes a viernes, sin contar feriados públicos de China. Mi conversión (verifícala): en hora de Lima corresponde a ~20:00–23:00 y ~01:00–05:00. El día de la semana que cuenta es el UTC.
- Nombres de modelo vigentes en esa página: `deepseek-flash` (servido por DeepSeek-V4.1-Flash-1017) y `deepseek-v4-pro` (DeepSeek-V4-Pro-0813). Los nombres antiguos `deepseek-v4-flash` y `deepseek-v4-flash-vision-exp` siguen funcionando y se cobran como Flash.
- **Búsqueda y descarga web (Search/Fetch):** $0.75 por cada 1 000 peticiones exitosas, cada una. Usándolas desde DeepSeek Harness hoy son **gratis**, pero el cobro por petición empieza a las **00:00 de Pekín del 1-nov-2026** (= 11:00 a. m. del 31-oct-2026 en Lima, según mi conversión). Avisa a los alumnos.
- No hay precio en soles publicado.

---

## Bloque 3 · Clave (API key)

**Pasos**

1. En la plataforma abre la página **API keys**.
2. Crea una clave nueva y ponle un nombre que reconozcas (por ejemplo `curso-dsh`).
3. **Copia la clave en ese momento** y guárdala en un gestor de contraseñas. *(Verifica en tu pantalla si la plataforma advierte que solo se muestra una vez: no lo pude confirmar, pero el FAQ confirma que una clave **borrada** ya no se puede ver. Actúa como si fuera una sola vez.)*
4. Usa una clave distinta para cada uso (curso, proyecto), así revocas solo la que se filtre.

**Qué deberías ver**

- Tu clave en la lista (normalmente parcial/enmascarada). **Verifica en tu pantalla** los nombres exactos de los botones (mi esquema usa «Crear clave nueva» como etiqueta genérica).

**Dónde se ve el uso** (FAQ oficial): página **Usage** → menú «Time» y menú «API Key» para filtrar por clave; «Export» descarga un zip con dos CSV (el llamado *amount* trae el detalle por clave).

**Si se filtra la clave** (FAQ oficial): *API Keys* → icono de papelera de esa clave → confirmar «Revoke». Queda inválida de inmediato; crea otra y reemplázala donde la usabas.

**Datos técnicos para el curso** (`https://api-docs.deepseek.com`, 31-10-2026)

- URL base compatible con OpenAI: `https://api.deepseek.com`; compatible con Anthropic: `https://api.deepseek.com/anthropic`.
- La documentación pide poner la clave en la variable de entorno `DEEPSEEK_API_KEY` para sus ejemplos.

**Consejos de seguridad de la clave**

- **No la pegues en el chat** (ni de un asistente de IA, ni de WhatsApp, ni del curso), ni en capturas o grabaciones de pantalla.
- **No la subas a git.** Si tu proyecto usa un `.env`, ponlo en `.gitignore` y, mejor, fuera del repositorio.
- Para `dsh`, la documentación publicada indica dónde se guarda la clave (ver bloque 4): `$DSH_HOME/.credentials.yaml` (por defecto `~/.dsh/`), o la variable `DEEPSEEK_API_KEY`, o un `.env` en `$DSH_HOME/.env` (preferible) o en la carpeta desde donde lanzas `dsh` (peligroso: puede acabar en git).
- Si la clave se filtró o la viste en pantalla compartida: **revócala ya** y crea otra.
- Recomendación mía: restringe el archivo de credenciales a tu usuario (`chmod 600 ~/.dsh/.credentials.yaml`, en Mac/Linux) y mira la página *Usage* de vez en cuando por si hay consumo que no reconoces.

**Si falla**: respuesta **401** = clave incorrecta (bloque 5).

**Fuentes (31-10-2026)**: FAQ oficial (*What to do if your API Key is leaked*, *How to view usage by API Keys*); Quick Start `https://api-docs.deepseek.com`; `docs/user/guide/providers.md` del repo `deepseek-ai/deepseek-harness`; `apps/cli/reference/README.md`.

---

## Bloque 4 · `dsh` (DeepSeek Harness)

`dsh` es un entorno de agente (preview) de DeepSeek. El repositorio incluye un `SAFETY.md` que dice que es **software experimental, sin auditoría de seguridad**, que puede ejecutar código y comandos generados por el modelo y que conviene usarlo con mínimos privilegios y mejor en un entorno desechable.

### En el aula del LIVE (Ruta B: no instalas nada)

El aula del LIVE de cada alumno ya trae **Node 24 y `dsh` 0.2.1-rc.5** y sale a internet solo por el proxy de la clase
(puertos 80 y 443). Para usar `dsh` en clase no hace falta instalar nada en la laptop. La clave sigue siendo **la tuya**
(tu cuenta y tu saldo de DeepSeek): créala y recárgala con los bloques 1 a 3.

En la terminal del aula:

| Comando | Qué hace |
|---|---|
| `aula sistema <id>` | Copia tu sistema de práctica a `/trabajo/sistema` (ahí trabaja `dsh`; sin él, en `/trabajo`). |
| `aula dsh clave` | Pide tu API key **sin mostrarla**. Queda solo en la memoria del aula: se borra al reiniciarla. Nunca en `/trabajo` ni en un chat. |
| `aula dsh olvidar` | Borra la clave del aula. |
| `aula dsh "tarea"` | Corre una tarea (perfil headless) y muestra la respuesta y un **RESUMEN DE USO**: tokens de entrada (caché acierto y fallo), salida, llamadas al modelo, herramientas y duración. |
| `aula dsh` | Modo interactivo `dsh> `: cada línea es una tarea; al salir, el uso total de la sesión. |
| `aula dsh web` | Abre la **interfaz web** de `dsh` y te imprime tu enlace (`https://jmd-learn.online/dsh/<tú>/?…`). Solo lo abren tú y el instructor: no lo compartas. Es la misma interfaz de las capturas de 4.2 a 4.4, pero la clave ya entró con `aula dsh clave`: no la pegues en Settings. |
| `aula dsh web parar` | Apaga la interfaz web (si cambias de sistema o de clave, párala y vuelve a abrirla). |
| `aula dsh estado` | Versión, si hay clave, si hay salida a internet y si la web está arrancada. |

«Upload Session Log» viene **apagado** en el aula por configuración. Si falla: «Aún no me diste tu clave» → `aula dsh clave`;
401 → clave mal copiada; 402 → sin saldo; «sin salida a internet por el proxy» o «esta aula no tiene la interfaz web» →
cierra la terminal, vuelve a entrar al LIVE y, si sigue, avisa al instructor.

### 4.1 Instalar / abrir (en tu laptop, Ruta A)

**Requisitos (publicados)**: Node.js **>= 24.9.0** (campo `engines` de `apps/cli/package.json`). El README dice «Install Node.js, then run».

**Pasos**

1. Comprueba tu versión: `node -v` (debe ser 24.9 o superior).
2. Crea una carpeta de prueba vacía (será tu espacio de trabajo) y entra en ella.
3. Ejecuta: `npx @deepseek-ai/dsh web`
4. Se abre la interfaz web en `http://127.0.0.1:3080` (puerto por defecto). Con `--no-open` no abre el navegador y solo imprime la URL; esa URL lleva un `?token=…` local: no la compartas.
5. Para detener el servidor: `Ctrl+C` en esa terminal.

**Lo que observé al ejecutarlo hoy (versión 0.2.1-rc.5, `latest` en npm)**

- La primera ejecución descargó muchas dependencias y tardó **varios minutos** (≈5–6 min en esta Mac, con un proxy npm local). Avisa a los alumnos que no cierren la terminal.
- Con Node 24.2.0 no lo probé (queda por debajo del mínimo publicado); lo ejecuté con Node 26.4.0 y funcionó.
- Alternativa documentada: desde un clon, `pnpm install && pnpm run build && pnpm dsh web` (no hizo falta). También existe una app de escritorio (no probada).

**Qué deberías ver** (captura real `dsh-01-aviso-preview.webp`): un aviso «Preview Notice» con el botón **Continue**. Después aparece un diálogo **«Get started»** con **Add API Key** y **Sign in** (`dsh-02-inicio-get-started.webp`).

**Si falla**: «command not found: npx» → falta Node. `EBADENGINE` o errores raros → versión de Node baja. Puerto 3080 ocupado → el propio `dsh` lo informa en el arranque (no lo pude provocar).

### 4.2 Poner la clave (Settings → Models)

**Pasos** (así lo vi en la interfaz real)

1. Si aparece «Get started», elige **Add API Key**: se abre «Add an API key to get started» (`dsh-03-…`). Escribe la clave en el campo y pulsa **Save and continue**. **Configure later** lo deja para después.
2. O, desde el menú inferior izquierdo **More → Settings → Models** (`dsh-05-…`, `dsh-06-…`): tarjeta **DeepSeek** (`deepseek-official`), campo **API key**, botón **Apply** (`dsh-07-…`).
3. El campo es de tipo contraseña (puntos) y tiene un ojo para mostrar. Escribí una clave de **relleno** (`sk-xxxxxxxxxxxxxxxx`) solo para la captura y **no la guardé**.

**Qué documenta el proyecto**

- Las claves son de solo escritura: tras guardar, la página nunca vuelve a mostrar la clave.
- Se guarda en `$DSH_HOME/.credentials.yaml`. El cambio vale sin reiniciar.
- Variable de entorno: `DEEPSEEK_API_KEY`. La interfaz lo dice: si no hay clave guardada, el campo muestra «Leave blank to use env as auth (DEEPSEEK_API_KEY)» y un aviso «Env var not detected…».
- Orden de búsqueda de credenciales: entorno heredado → `$DSH_HOME/.credentials.yaml` → `.env` en la carpeta desde donde lanzas → `$DSH_HOME/.env`. `DSH_HOME` es `~/.dsh` por defecto.
- Sin clave, el selector de modelo mostraba «Select model» (no probé pulsar el botón de enviar). Según la documentación, sin clave la ruta DeepSeek queda oculta en los selectores de modelo.

**Si falla**: tras guardar, si no hay respuesta, ver el bloque 5 (401/402).

### 4.3 Elegir el espacio de trabajo

**Lo que dice la documentación:** «Click **Choose workspace**, add the project directory where you started `dsh`, and select it. The session composer remains unavailable until a workspace is selected.»

**Lo que vi en 0.2.1-rc.5 (distinto a la guía)**

- Al abrir ya existe un espacio **«Default workspace»** y el compositor está activo; **no apareció el diálogo «Choose workspace»** como paso obligatorio. La documentación del paquete dice que, en una instalación vacía, se crea un espacio por defecto y que «Choose workspace» solo aparece si esa creación falla.
- Para otra carpeta: en el centro de la pantalla, el selector «Default workspace ▾» → **Add workspace…** (`dsh-09-menu-workspace.webp`). La documentación del proyecto dice que ese comando abre el selector de carpetas del sistema operativo (en ejecución local).
- **No pude capturar ese selector del sistema** (es una ventana nativa fuera del navegador): verifica en tu pantalla. Tampoco pude confirmar que mi carpeta temporal quedara como espacio de trabajo.

### 4.4 Primer prompt

**Pasos**

1. Verifica que arriba del cuadro diga el espacio de trabajo elegido.
2. Elige un modelo en **Select model** (verifica en tu pantalla los modelos que aparecen con tu clave; la documentación dice que siguen la lista que publica la API de DeepSeek y, sin lista, usan `deepseek-flash` y `deepseek-v4-pro`).
3. Escribe el prompt oficial de la guía: `Summarize this repository and identify its main packages.` (`dsh-10-compositor-prompt.webp`: **escrito pero sin enviar**, porque no hay clave).
4. Envía. El agente puede leer y editar archivos del espacio, ejecutar comandos y mantener un plan; la interfaz **pide aprobación** para las operaciones que lo requieran según el modo de permisos activo (por defecto vi **«Workspace Write»**).

**Ojo con una carpeta vacía:** el prompt oficial resume «el repositorio»; en una carpeta vacía no hay nada que resumir. Para la práctica, abre una carpeta con algo de contenido de prueba (nunca con datos reales de clientes o contraseñas).

**Privacidad:** en **Settings → General** hay un interruptor «**Upload Session Log when using the official model API – Help improve DeepSeek models and products**» que **venía activado** en mi ejecución (`dsh-08-settings-privacidad-log.webp`). Decide si lo dejas así antes de usarlo con código o datos que no quieras compartir. En el aula del LIVE viene apagado por configuración.

**Si falla**: «Select model» sin opciones → falta clave válida; 401/402/429 → ver abajo.

**Fuentes (31-10-2026)**: `README.md`, `docs/user/guide/index.md`, `docs/user/guide/providers.md`, `apps/cli/README.md`, `apps/cli/reference/README.md`, `packages/llm/llm-deepseek-api-key/README.md`, `packages/client/ui-workspace/README.md`, `SAFETY.md` del repo `https://github.com/deepseek-ai/deepseek-harness` (commit `ce7073d`, 30-10-2026); paquete npm `@deepseek-ai/dsh` 0.2.1-rc.5; ejecución local del 31-10-2026.

---

## Bloque 5 · Errores típicos de la API

Fuente: `https://api-docs.deepseek.com/quick_start/error_codes` y `…/rate_limit` (31-10-2026).

| Código | Nombre | Causa | Qué hacer |
|---|---|---|---|
| 400 | Formato inválido | Cuerpo mal formado | Corregir el cuerpo según el mensaje |
| **401** | Autenticación fallida | Clave incorrecta | Revisa la clave o crea otra |
| **402** | Saldo insuficiente | Se acabó el saldo | Mira tu saldo y recarga (Top Up) |
| 422 | Parámetros inválidos | Parámetros no válidos | Corregirlos según el mensaje |
| **429** | Límite alcanzado | Demasiadas peticiones o concurrencia/QPS excedidos | Espaciar las peticiones |
| 500 | Error del servidor | Falla del lado de DeepSeek | Reintentar tras una espera |
| 503 | Servidor sobrecargado | Mucho tráfico | Reintentar tras una espera |

Sobre el 429: el límite es de **concurrencia por cuenta** (no por clave): 2500 para `deepseek-flash` y 500 para `deepseek-v4-pro`. Una petición cuenta hasta que termina la respuesta. Se puede pedir ampliación sin costo adicional.

---

## Pendiente de verificar en pantalla

Nada de esto lo pude confirmar. Pídele al instructor o a quien tenga la cuenta que lo valide antes de la clase:

1. **Pantallas de la plataforma** (`platform.deepseek.com`): devolvió **403 de CloudFront** (a Chrome headless y a `curl`) desde esta máquina; no pude ver ni el registro ni sus pestañas. Sus nombres «Top Up», «Billing», «Usage», «API Keys» salen del FAQ oficial, no de una pantalla vista.
2. **Registro desde Perú**: si Perú está admitido y qué métodos aparecen (correo, teléfono, Google). El FAQ en chino menciona **verificación de identidad («实名认证») antes de recargar con Alipay/WeChat**; el FAQ en inglés no la menciona. No sé si aplica a quien paga con tarjeta/PayPal.
3. **Recarga**: monto mínimo (no publicado en nada que leí), moneda (USD), comisiones, tipo de cambio, si **Visa/Mastercard** emitidas en Perú pasan (el FAQ solo dice «bank card»), y si **Yape/Plin/billeteras** funcionan (no figuran; probablemente no, salvo vía PayPal).
4. **Clave**: el texto exacto del botón de creación y la advertencia de «se muestra una sola vez».
5. **`dsh`**: el diálogo del sistema de «Add workspace…», que la carpeta elegida quede seleccionada, qué modelos aparecen en «Select model» **con una clave real**, y la respuesta real del primer prompt (no envié nada, no tenía clave ni saldo).
6. **«Sign in»** de `dsh` (inicio de sesión con cuenta DeepSeek en vez de clave): existe en la interfaz y en la documentación («DeepSeek account models»), pero no lo probé. El curso usa clave de API.
7. **Node 24.2.0 vs 24.9.0**: el mínimo publicado es 24.9.0; no probé qué falla con una versión menor.
8. **Precios**: pueden cambiar; confirma la página el día de la clase. No hay precio en soles.

---

## Fuentes consultadas (todas el 31-10-2026)

- `https://api-docs.deepseek.com` (Quick Start): URL base y nombres de modelo.
- `https://api-docs.deepseek.com/quick_start/pricing`: precios, caché, horas pico, saldo de cortesía, Search/Fetch.
- `https://api-docs.deepseek.com/quick_start/error_codes`: códigos de error.
- `https://api-docs.deepseek.com/quick_start/rate_limit`: concurrencia y 429.
- `https://api-docs.deepseek.com/faq` y `…/quick_start/faq`: solo redirigen o no tratan recargas.
- `https://static.deepseek.com/faq/index.html?lang=en`: el FAQ oficial es una página que se arma con JavaScript; leí su contenido directamente del paquete `main.86961ff339.js` (versiones en inglés y chino de las preguntas de registro, recarga, saldo, reembolso, uso por clave y revocación de claves).
- `https://platform.deepseek.com`: **403 CloudFront**; no se pudo leer.
- `https://deepseek-harness.github.io/deepseek-harness/`: carga un sitio VitePress que no entrega el texto sin JavaScript; usé en su lugar los mismos documentos del repositorio.
- `https://github.com/deepseek-ai/deepseek-harness` (commit `ce7073d`, 30-10-2026): `README.md`, `docs/user/guide/index.md`, `docs/user/guide/providers.md`, `apps/cli/README.md`, `apps/cli/reference/README.md`, `packages/llm/llm-deepseek-api-key/README.md`, `packages/client/ui-workspace/README.md`, `SAFETY.md`.
- npm: `@deepseek-ai/dsh` (`latest` = 0.2.1-rc.5; `alpha` = 0.2.2-alpha.2).
- Ejecución local de `npx @deepseek-ai/dsh@0.2.1-rc.5 web --no-open` con Playwright + Chrome a 1440×900 (capturas `dsh-*.webp`).
- Búsqueda web general sobre medios de pago/mínimos: solo trajo guías de terceros y contradictorias; **no se usó como fuente**.
