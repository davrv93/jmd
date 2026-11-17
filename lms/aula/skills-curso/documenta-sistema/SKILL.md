---
name: documenta-sistema
description: "Documenta un sistema web a partir de un caso. Entra con una cuenta de prueba, recorre las pantallas y la API con la sesión iniciada y escribe en /trabajo/documentacion el proceso en BPMN, el diagrama de clases, la matriz de roles y acciones, los flujos y el manual en PDF. Úsalo cuando pidan documentar un sistema, hacer el manual, sacar el BPMN, el diagrama de clases, los roles y permisos o los flujos, o digan «documenta-sistema», «manual de usuario», «documenta mi sistema» o «los manuales se hacen solos»."
nivel: completo
compat: [deepseek, claude, codex, gpt, glm]
---

# Documenta un sistema a partir de un caso

Tú navegas, lees y escribes un solo archivo (`modelo.json`). Las herramientas dibujan y arman todo lo demás.

Herramientas (en la carpeta de este skill, `herramientas/`; córrelas con `python3`):

- `navega.py`: navegador de texto con sesión. Entra, sigue enlaces, lee páginas, scripts y la API. Guarda evidencia.
- `generar.py`: de `modelo.json` saca el BPMN, las clases, la matriz, los flujos, el manual en PDF y el índice.

En lo que sigue, `H` es la carpeta `herramientas` de este skill (en el aula: `/trabajo/.agents/skills/documenta-sistema/herramientas`).

## Reglas que no se negocian

1. **Sistema propio o con permiso.** Si la persona no lo confirma, no entres: pregúntale.
2. **Cuenta de prueba.** Nunca una cuenta personal ni de un cliente real.
3. **Las credenciales no se guardan.** Pásalas solo por el entorno del comando (`DOC_USUARIO=… DOC_CLAVE='…'`). Nunca en `modelo.json`, en el manual, en la evidencia ni en ningún archivo. No las repitas en tus respuestas.
4. **Solo navegas y lees.** Nada de crear, editar, borrar, pagar ni enviar. `navega.py` bloquea todo lo que no sea GET. Solo se usa `--escribir` si el caso lo pide con todas sus letras **y** es un ambiente de prueba; avisa antes y anótalo en `por_verificar`.
5. **No inventes.** Lo que no viste en una respuesta real del sistema va como `por-verificar`. Cada acción de la matriz cita su archivo de `evidencia/`.
6. **No sales del sistema.** Solo la dirección que te dieron (mismo dominio).
7. En el aula **no hay navegador gráfico**: no instales Chromium ni Playwright, no hay capturas. Las pantallas se documentan con esquemas.

## Paso 1 · Pide lo que falta (una sola pregunta)

Necesitas tres cosas. Si alguna falta, pídela y espera:

- **El caso**: quién, qué quiere lograr y qué puede salir mal.
- **La dirección** del sistema (ambiente de prueba).
- **La cuenta de prueba** de cada rol que entra en el caso, y la confirmación de que el sistema es propio o hay permiso.

## Paso 2 · Abre el sistema

```bash
python3 H/navega.py abrir "DIRECCION" --sesion ROL1
```

Lee el resumen: título, formularios, botones, menú, scripts y «rutas que nombra el código». Anota la **dirección base** que imprime: úsala tal cual para las demás sesiones (algunos sistemas dan una dirección con código).

## Paso 3 · Inicia sesión con cada rol

Una sesión por rol (`--sesion cajero`, `--sesion administrador`…).

- Si el formulario de ingreso dice «envía POST a …»:
  ```bash
  DOC_USUARIO=usuario DOC_CLAVE='clave' python3 H/navega.py entrar --sesion ROL1
  ```
- Si dice «lo maneja JavaScript»: lee los scripts de la página con `ver` hasta encontrar la ruta de ingreso y los nombres de los campos, y entra por la API:
  ```bash
  python3 H/navega.py ver js/archivo.js --sesion ROL1
  DOC_USUARIO=usuario DOC_CLAVE='clave' python3 H/navega.py entrar --api /api/login --campos usuario,clave --sesion ROL1
  ```

Debe decir `INGRESO: dentro como «…»`. Si dice que no entró, no adivines claves: revisa ruta y campos, y si sigue igual pregunta a la persona. Para el segundo rol: `abrir` la **dirección base** con `--sesion ROL2` y repite el ingreso.

## Paso 4 · Recorre según el caso

Sigue el caso, no todo el sistema. Para cada pantalla que el caso toca:

```bash
python3 H/navega.py ver pantalla.html --sesion ROL1     # campos, botones, tablas, menú, scripts
python3 H/navega.py ver js/pantalla.js --sesion ROL1    # reglas y rutas de API que usa
python3 H/navega.py api GET /api/recurso --sesion ROL1  # datos reales: de aquí salen las clases
```

- La «forma de la respuesta» de cada `api GET` te da los atributos de cada clase.
- Las reglas (validaciones, cálculos, qué pasa si falla) están en los scripts y en los mensajes: léelos, no las supongas.
- Compara roles con la misma ruta para todas las sesiones:
  ```bash
  python3 H/navega.py matriz /api/recurso1 /api/recurso2 /pantalla.html
  ```
  200 = puede · 401 o 403 = no puede. Las acciones que cambian datos no se prueban: van `por-verificar` salvo que el código muestre la regla.
- Tope: unas 25 peticiones. Si el caso pide más, dilo.

Al terminar muestra `/trabajo/documentacion/evidencia/bitacora.md` y un resumen de pantallas, rutas y reglas encontradas.

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
| `pantallas` | `id`, `nombre`, `url`, `roles`, `campos`, `botones`, `tablas` (`nombre`, `columnas`), `menu`, `nota` |
| `por_verificar` | frases con lo que no se pudo comprobar y por qué |
| `glosario` | `termino`, `definicion` |

Cómo queda bien:

- El proceso cuenta **el caso** de inicio a fin, con 6 a 14 nodos, y al menos una `decision` con lo que puede salir mal (dos salidas con nombre). Cada tarea empieza con verbo.
- Las tareas de personas van en el carril de su rol; lo que valida o calcula el sistema, en el carril `sistema`.
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
- `manual.pdf` (y `manual.md`)
- `index.html`
- `evidencia/bitacora.md`

Cierra la sesión y responde corto:

```bash
python3 H/navega.py salir --todas
```

Tu respuesta final: qué archivos quedaron, cómo verlos (Visor: `documentacion/index.html`), qué quedó **por verificar** y qué debería revisar una persona. No pegues los archivos en el chat.

## Si algo falla

| Lo que ves | Qué hacer |
|---|---|
| `No se pudo conectar` | Revisa la dirección. Del aula solo salen los puertos 80 y 443. Un sistema en `localhost` de la laptop de la persona no se ve desde el aula. |
| Estado 410 o la sesión se pierde | La tienda o la sesión venció: pide la dirección nueva y vuelve al paso 2. |
| «la página casi no trae contenido» | Es una aplicación de una sola página: lee sus scripts con `ver` y trabaja con `api`. |
| Pide captcha, código por SMS o segundo factor | No lo saltes. Dile a la persona que hace falta una cuenta de prueba sin ese paso. |
| 401 o 403 con un rol | No es un error: es un dato para la matriz (`no`). |
| No hay API y los formularios son HTML | Mejor: `entrar` sin `--api` y recorre con `ver`. |
