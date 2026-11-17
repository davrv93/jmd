---
name: documenta-sistema
description: "Documenta un sistema web a partir de un caso. Abre un navegador real, inicia sesión con una cuenta de prueba, recorre las pantallas según el caso, saca capturas y escribe en /trabajo/documentacion el proceso en BPMN, el diagrama de clases, la matriz de roles y acciones, los flujos y el manual en PDF. Úsalo cuando pidan documentar un sistema, hacer el manual, sacar el BPMN, el diagrama de clases, los roles y permisos o los flujos, o digan «documenta-sistema», «manual de usuario», «documenta mi sistema» o «los manuales se hacen solos»."
nivel: completo
compat: [deepseek, claude, codex, gpt, glm]
---

# Documenta un sistema a partir de un caso

Tú navegas, miras y escribes un solo archivo (`modelo.json`). Las herramientas dibujan y arman todo lo demás.

Herramientas (en la carpeta de este skill, `herramientas/`; córrelas con `python3`):

- `navega.py web …`: maneja un **navegador real** (un Chromium compartido de la clase). Abre páginas, escribe, hace clic y saca capturas.
- `navega.py` sin `web`: **modo texto**, sin navegador. Lee páginas, scripts y la API con la sesión iniciada. Es el respaldo si el navegador no responde y sirve para comparar permisos por rol.
- `generar.py`: de `modelo.json` saca el BPMN, las clases, la matriz, los flujos, el manual en PDF y el índice.

En lo que sigue, `H` es la carpeta `herramientas` de este skill (en el aula: `/trabajo/.agents/skills/documenta-sistema/herramientas`).

## Reglas que no se negocian

1. **Sistema propio o con permiso.** Si la persona no lo confirma, no entres: pregúntale.
2. **Cuenta de prueba.** Nunca una cuenta personal ni de un cliente real.
3. **Las credenciales no se guardan.** Pásalas solo por el entorno del comando (`DOC_USUARIO=… DOC_CLAVE='…'`) y escríbelas en la página con `--usuario` y `--clave`. Nunca como texto del comando, ni en `modelo.json`, el manual, la evidencia o cualquier archivo. No las repitas en tus respuestas.
4. **Solo navegas y lees.** Nada de crear, editar, borrar, pagar ni enviar. El navegador bloquea todo envío de datos y te lo muestra como `BLOQUEADAS`: no es un error, es la regla. La única excepción es `--ingreso`, para enviar el formulario de ingreso. `--escribir` solo se usa si el caso lo pide con todas sus letras **y** es un ambiente de prueba; avisa antes y anótalo en `por_verificar`.
5. **No inventes.** Lo que no viste en el sistema va como `por-verificar`. Cada acción de la matriz cita su archivo de `evidencia/`.
6. **No sales del sistema.** Solo la dirección que te dieron (mismo dominio). Si un clic te saca, vuelve con `web atras`.
7. **El navegador es un servicio compartido** de toda la clase: no instales Chromium ni Playwright en el aula, abre **un rol a la vez** y ciérralo con `web cerrar` apenas termines con él.
8. **Capturas solo con datos de prueba.** No captures pantallas con datos personales de gente real.

## Paso 1 · Pide lo que falta (una sola pregunta)

Necesitas tres cosas. Si alguna falta, pídela y espera:

- **El caso**: quién, qué quiere lograr y qué puede salir mal.
- **La dirección** del sistema (ambiente de prueba).
- **La cuenta de prueba** de cada rol que entra en el caso, y la confirmación de que el sistema es propio o hay permiso.

## Paso 2 · Abre el sistema en el navegador

```bash
python3 H/navega.py web abrir "DIRECCION" --sesion ROL1
```

Verás la página resumida, con sus elementos numerados:

```
[1] campo «Usuario» (text)
[2] campo «Clave» (password)
[3] botón «Ingresar»
```

**Los números cambian en cada respuesta: usa siempre los del último resumen.** Anota la «Dirección del sistema» que imprime: úsala tal cual para el otro rol (algunos sistemas dan una dirección con código).

Si responde «El navegador de la clase no responde» o «está lleno», espera un minuto y prueba una vez más. Si sigue igual, pasa al **modo texto** (al final) y dilo en tu respuesta.

## Paso 3 · Inicia sesión

```bash
DOC_USUARIO=usuario python3 H/navega.py web escribir 1 --usuario --sesion ROL1
DOC_CLAVE='clave' python3 H/navega.py web escribir 2 --clave --sesion ROL1
DOC_USUARIO=usuario python3 H/navega.py web clic 3 --ingreso --sesion ROL1
```

Debe decir `INGRESO: dentro`. Si dice que no entró, lee el mensaje de la página; no adivines claves: pregunta a la persona. Saca la captura de la pantalla de ingreso **antes** de escribir la clave (`web captura ingresar`).

## Paso 4 · Recorre según el caso y saca capturas

Sigue el caso, no todo el sistema. En cada pantalla que el caso toca:

```bash
python3 H/navega.py web clic 2 --sesion ROL1                # o: web clic "Catálogo"
python3 H/navega.py web captura catalogo --sesion ROL1      # guarda capturas/catalogo.jpg y el resumen
python3 H/navega.py web escribir 5 "inca" --sesion ROL1     # buscar o filtrar: no cambia datos
python3 H/navega.py web elegir 6 "Bebidas" --sesion ROL1
python3 H/navega.py web atras --sesion ROL1
```

- **Una captura por pantalla importante** (3 a 6 en total), con nombres cortos en minúsculas: `ingresar`, `catalogo`, `venta`, `reporte`. Usa `--completa` si la página es larga.
- De cada resumen anota: campos, botones, tablas y sus columnas, menú y mensajes. De ahí salen las pantallas, los flujos y las clases.
- Para saber **qué pasa si algo falla** (el «qué puede salir mal» del caso), prueba lo que no cambia datos: deja un campo vacío, escribe un monto que no alcanza y mira el mensaje. Si para verlo habría que guardar, no lo hagas: va `por-verificar`.
- Si un clic muestra `BLOQUEADAS: POST …`, ese botón guarda datos: anótalo como acción del rol y no insistas.
- El navegador se cierra solo a los 10 minutos sin uso. Si te dice que se cerró, vuelve al paso 2.
- Tope: unas 30 acciones por rol.

Cuando termines con un rol:

```bash
python3 H/navega.py web cerrar --sesion ROL1
```

Repite los pasos 2 a 4 con el **otro rol** (`--sesion ROL2`) usando la misma dirección del sistema. Fíjate en qué cambia: opciones de menú que no aparecen, botones que faltan, pantallas que niega. Eso llena la matriz.

Al terminar muestra `/trabajo/documentacion/evidencia/bitacora.md` y un resumen de pantallas, reglas y diferencias entre roles.

## Paso 5 · Escribe `/trabajo/documentacion/modelo.json`

Copia la estructura de `ejemplo/modelo.json` de este skill (léelo primero) y llénala con lo que viste. Es JSON estricto: comillas dobles, sin comentarios, sin comas finales.

| Clave | Qué va |
|---|---|
| `sistema` | `nombre`, `url`, `caso` (el texto de la persona), `alcance`, `autor` |
| `roles` | `id` (minúsculas, sin espacios), `nombre`, `descripcion` |
| `acciones` | `modulo`, `nombre`, `permisos` (un valor **por cada rol**: `si`, `no`, `lectura` o `por-verificar`) y `evidencia` (archivo de `evidencia/`) |
| `proceso` | `nombre`, `carriles` (uno por rol y uno `sistema`), `nodos` (`id`, `tipo`: `inicio`, `tarea`, `decision` o `fin`; `carril`; `nombre`) y `flujos` (`de`, `a`, `nombre` en las salidas de una decisión) |
| `clases` y `relaciones` | clases con `atributos` («nombre: tipo») y `operaciones`; relaciones con `tipo`: `asociacion`, `composicion`, `agregacion`, `herencia` (de = hija, a = madre) o `dependencia` |
| `flujos` | lista; cada uno con `id`, `nombre`, `rol` y `pasos` (`pantalla`, `accion`, `resultado`) |
| `pantallas` | `id`, `nombre`, `url`, `roles`, `campos`, `botones`, `tablas` (`nombre`, `columnas`), `menu`, `nota` y **`captura`** (`"capturas/catalogo.jpg"`, la que sacaste) |
| `por_verificar` | frases con lo que no se pudo comprobar y por qué |
| `glosario` | `termino`, `definicion` |

Cómo queda bien:

- El proceso cuenta **el caso** de inicio a fin, con 6 a 14 nodos, y al menos una `decision` con lo que puede salir mal (dos salidas con nombre). Cada tarea empieza con verbo.
- Las tareas de personas van en el carril de su rol; lo que valida o calcula el sistema, en el carril `sistema`.
- Cada pantalla con captura lleva su `captura`. Una pantalla sin captura sale con un esquema dibujado.
- Las clases salen de lo que viste: columnas de las tablas y campos de los formularios. Si quieres los nombres exactos de los datos, usa el modo texto (`api GET`).
- Escribe en español claro, para alguien que nunca vio el sistema. Sin jerga de programación en el manual.
- Nunca una clave, un token ni una contraseña en este archivo.

## Paso 6 · Genera

```bash
python3 H/generar.py
```

Si dice «El modelo tiene problemas», corrige exactamente lo que nombra y vuelve a correr. No edites a mano los archivos generados: cambia `modelo.json` y regenera.

## Paso 7 · Comprueba y entrega

`generar.py` termina con la comprobación (también sola: `python3 H/generar.py --comprobar`). Debe decir `COMPROBACIÓN: todo en orden`. En `/trabajo/documentacion/` deben existir:

- `01-proceso.bpmn`, `01-proceso.svg`
- `02-clases.mmd`, `02-clases.svg`
- `03-roles-y-acciones.md`, `03-roles-y-acciones.csv`
- `04-flujos.md`
- `manual.pdf` (y `manual.md`), con las capturas dentro
- `index.html`
- `capturas/` y `evidencia/bitacora.md`

Si avisa «hay capturas que ninguna pantalla del modelo usa», ponlas en su pantalla y regenera.

Cierra todo y responde corto:

```bash
python3 H/navega.py salir --todas
```

Tu respuesta final: qué archivos quedaron, cómo verlos (Visor: `documentacion/index.html`), cuántas capturas hay, qué quedó **por verificar** y qué debería revisar una persona. No pegues los archivos en el chat.

## Modo texto: respaldo y permisos por API

Sin navegador (no hay capturas; el manual sale con esquemas). También sirve, además del navegador, para comparar permisos con datos reales.

```bash
python3 H/navega.py abrir "DIRECCION" --sesion ROL1          # resume la página; guarda la dirección base
python3 H/navega.py ver js/archivo.js --sesion ROL1          # lee scripts: rutas de la API y reglas
DOC_USUARIO=usuario DOC_CLAVE='clave' python3 H/navega.py entrar --sesion ROL1                # formulario HTML
DOC_USUARIO=usuario DOC_CLAVE='clave' python3 H/navega.py entrar --api /api/login --campos usuario,clave --sesion ROL1   # ingreso por API
python3 H/navega.py api GET /api/recurso --sesion ROL1       # la «forma de la respuesta» da los atributos de las clases
python3 H/navega.py matriz /api/recurso1 /api/recurso2       # misma ruta con cada sesión: 200 puede · 401/403 no puede
```

La sesión del modo texto es aparte de la del navegador: hay que ingresar en cada uno. Todo lo que no sea GET está bloqueado igual.

## Si algo falla

| Lo que ves | Qué hacer |
|---|---|
| `El navegador de la clase no responde` o `está lleno` | Espera un minuto y repite una vez. Si sigue, usa el modo texto y avisa que no hay capturas. |
| `El navegador de la sesión … se cerró` | Pasaron 10 minutos sin uso: `web abrir` e ingresa de nuevo. |
| `El navegador no pudo: …` | El número ya no vale: `web ver` y usa los números nuevos. |
| `BLOQUEADAS: POST …` | Ese botón guarda datos. No es un error: anótalo y sigue. |
| Estado 410 o la tienda «venció» | Pide la dirección nueva y vuelve al paso 2. |
| Pide captcha, código por SMS o segundo factor | No lo saltes. Hace falta una cuenta de prueba sin ese paso. |
| `No se pudo conectar` (modo texto) | Revisa la dirección. Del aula solo salen los puertos 80 y 443; el `localhost` de la laptop de la persona no se ve desde aquí. |
