# Sistemas de práctica · contrato técnico

15 sistemas web reales (SPA) para que cada alumno **documente y audite un sistema completo** con DeepSeek Harness.
Todos comparten un **núcleo** (`nucleo/`) y cambian solo su **configuración** (`sistemas/<id>/config.js`).
El constructor (`construir.mjs`) arma `dist/<id>/` y `dist/<id>.zip`.

## Reglas duras (compatibilidad)

- Abre con doble clic en `index.html` (protocolo `file://`). Sin servidor, sin red, sin CDN, sin `fetch`, sin módulos ES, sin Web Workers.
- **ES5 puro**: `var`, `function`, concatenación de cadenas. Prohibido: `let`, `const`, `=>`, plantillas con acento grave, `class`, destructuring, spread, `for…of`, `Promise`, `async`, `Map`, `Set`, `Symbol`.
- Prohibidas las APIs que no tiene IE11: `Object.assign`, `Array.from`, `Array.prototype.find/findIndex/includes/fill`, `String.prototype.includes/startsWith/endsWith/repeat/padStart/padEnd`, `Number.isInteger/isNaN`, `Math.trunc/sign`, `NodeList.forEach`, `element.closest/matches` sin prefijo, `classList` en SVG, `Element.remove()`. Si hace falta alguna, está en `nucleo/js/00-util.js` con otro nombre (`U.incluye`, `U.relleno`, …).
- CSS sin variables (`var(--x)`), sin `grid`, sin `gap`, sin `position: sticky` obligatorio. Maqueta con `display: -ms-flexbox; display: flex;` y floats de respaldo. Prefijos `-ms-` y `-webkit-` donde haga falta.
- Gráficos: barras HTML (`div` con ancho en %) y SVG creado con `createElementNS`. Nada de `<canvas>` obligatorio.
- Navegadores objetivo: IE11, Edge (heredado y Chromium), Chrome, Firefox, Safari 10+. Se verifica por análisis estático (acorn con ecmaVersion 5 + lista de APIs prohibidas) y prueba real en Chrome; **no se afirma que se probó en IE real**.
- Persistencia: `localStorage` con respaldo a `window.name` y luego a memoria (si el navegador la bloquea en `file://`). Clave `sis_<id>_v1`. Exportar/importar JSON para respaldo.
- Todo texto que viene de datos se escapa al pintar (`U.esc`). Prohibido `innerHTML` con datos; se arma con `createElement` / `textContent`.
- Etiqueta visible en el pie: «Sistema de práctica · no uses datos reales». La seguridad es de **demostración** (corre en el navegador); el pie lo dice.

## Estructura de salida (`dist/<id>/`)

```
index.html            carga los scripts en orden (sin type=module)
LEEME.txt             cómo abrirlo, usuarios de demostración, navegadores
css/app.css
js/00-util.js … js/80-app.js   el núcleo, un archivo por responsabilidad
js/config.js          window.SISTEMA = {…}  ← lo único que cambia entre sistemas
```

## Módulos del núcleo (`nucleo/js`)

| Archivo | Responsabilidad |
|---|---|
| `00-util.js` | `U`: esc, el, fmt (moneda, fecha, número), incluye, relleno, agrupar, suma, ordenar, hoy(), uid, clonar, polyfills mínimos nombrados |
| `10-sha256.js` | SHA-256 en JS puro (sin `crypto`) |
| `20-almacen.js` | `Almacen`: adaptador de persistencia (localStorage → window.name → memoria), versión de esquema, semillas, respaldo/restauración con checksum |
| `30-seguridad.js` | `Seg`: sal por usuario + 1.000 iteraciones SHA-256, política de contraseña, bloqueo por intentos, expiración por inactividad, sesión, guardia de rol, validación |
| `35-auditoria.js` | `Aud`: bitácora (quién, qué, entidad, id, antes/después, fecha) con **encadenamiento de hashes** y verificación |
| `40-datos.js` | `Datos`: CRUD genérico por entidad con validación, único, integridad referencial, numeración, auditoría |
| `45-calculos.js` | `ctx` para fórmulas del config, totales de operaciones, redondeo a 2 decimales |
| `50-ui.js` | componentes: tabla (buscar, ordenar, paginar), formulario (validación en línea), modal, toast, confirmación, barras |
| `60-vistas.js` | pantallas: login, tablero, lista/ficha de entidad, operaciones con líneas, usuarios, bitácora, respaldo, configuración, perfil |
| `70-reportes.js` | ejecución de reportes, tabla, gráfico, exportar CSV, imprimir |
| `80-app.js` | arranque, router por hash, menú por rol, guardia de ruta |

## Rutas (hash)

`#/login` · `#/tablero` · `#/e/<entidad>` · `#/e/<entidad>/nuevo` · `#/e/<entidad>/<id>` ·
`#/o/<operacion>` · `#/o/<operacion>/nuevo` · `#/o/<operacion>/<id>` · `#/r/<reporte>` ·
`#/usuarios` · `#/bitacora` · `#/respaldo` · `#/configuracion` · `#/perfil`

Cada ruta pasa por **una** guardia (`App.guardia(ruta)`) que consulta la matriz de permisos.

## Las 10 funcionalidades básicas de cada sistema

1. Inicio de sesión con roles y cierre de sesión.
2. Tablero con 4 a 6 indicadores y un gráfico.
3. a 5. Mantenimiento (CRUD) de **3 a 5 entidades** del negocio, con búsqueda, orden, paginación y validación.
6. Una o dos **operaciones** transaccionales (documento con cabecera + líneas, o ficha de trámite) con **cálculos** propios del rubro.
7. **3 a 5 reportes** con filtros de fecha, gráfico, exportar CSV e imprimir.
8. Gestión de usuarios y roles (solo administración).
9. Bitácora de auditoría con verificación de integridad.
10. Respaldo y restauración, parámetros del negocio y cambio de contraseña.

## Roles

Mínimo 4: `admin`, un jefe o gerente, un operador (puede haber 2) y `auditor` (solo lectura + bitácora). Un usuario de demostración por rol.

## `window.SISTEMA` (el config)

```js
window.SISTEMA = {
  id: 'muebleria',                 // = nombre de la carpeta
  nombre: 'Maderas del Sur · Ventas',
  rubro: 'Venta de muebles',
  version: '1.0.0',
  moneda: 'S/',
  tema: { primario: '#7a4a2b', acento: '#d9a441', siglas: 'MS' },   // opcional (ver «Tema» abajo)
  parametros: [                    // editables por admin en #/configuracion
    { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18 }
  ],
  seguridad: {                     // omitir una clave = valor seguro por defecto (abajo)
    minClave: 10, intentosMax: 5, bloqueoMin: 5, sesionMin: 15,
    cadenaBitacora: true, confirmarEliminar: true, exigirCambioClave: true,
    ayudaLogin: false, exportaRespetaPermisos: true, cspMeta: true
  },
  roles: [ { id: 'admin', nombre: 'Administrador', descripcion: '…' } ],
  usuarios: [ { usuario: 'admin', nombre: 'Rosa Quispe', rol: 'admin', clave: 'Admin#2026x' } ],
  entidades: [ {
    id: 'productos', nombre: 'Producto', plural: 'Productos', prefijo: 'PRD',
    campos: [
      { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$' },
      { id: 'precio', etiqueta: 'Precio', tipo: 'moneda', min: 0, requerido: true },
      { id: 'categoria', etiqueta: 'Categoría', tipo: 'lista', opciones: ['Sala', 'Comedor'] },
      { id: 'proveedor', etiqueta: 'Proveedor', tipo: 'ref', entidad: 'proveedores', mostrar: 'nombre' }
      // tipos: texto, textarea, numero, entero, moneda, porcentaje, fecha, lista, ref, booleano, email, telefono
    ],
    lista: ['codigo', 'nombre', 'precio', 'stock'],        // columnas de la tabla
    buscar: ['codigo', 'nombre'],
    calculados: [ { id: 'valor', etiqueta: 'Valor en stock', tipo: 'moneda',
                    formula: function (r, ctx) { return ctx.redondear(r.precio * r.stock); } } ],
    reglas: [ { id: 'precio-coherente', mensaje: 'El precio de venta no puede ser menor al costo',
                validar: function (r, ctx) { return !(r.costo && r.precio < r.costo); } } ],
    permisos: { ver: ['admin', 'vendedor'], crear: ['admin'], editar: ['admin'], eliminar: ['admin'] }
  } ],
  operaciones: [ {
    id: 'ventas', nombre: 'Venta', plural: 'Ventas', prefijo: 'VTA', serie: 'F001',
    campos: [ { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy' },
              { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true } ],
    estados: ['Borrador', 'Emitida', 'Anulada'],           // el primero es el inicial
    lineas: { entidad: 'productos', mostrar: 'nombre', precio: 'precio',     // se copia precio al agregar
              campos: [ { id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true },
                        { id: 'descuentoPct', etiqueta: 'Desc. %', tipo: 'porcentaje', min: 0, max: 30 } ] },
    calcular: function (doc, ctx) {                         // devuelve los totales
      var sub = ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio * (1 - (l.descuentoPct || 0) / 100); });
      var igv = ctx.redondear(sub * ctx.param('igv') / 100);
      return { subtotal: ctx.redondear(sub), igv: igv, total: ctx.redondear(sub + igv) };
    },
    totales: [ { id: 'subtotal', etiqueta: 'Subtotal' }, { id: 'igv', etiqueta: 'IGV' }, { id: 'total', etiqueta: 'Total', fuerte: true } ],
    alEmitir: function (doc, ctx) { /* p. ej. descontar stock con ctx.datos.actualizar(…) */ },
    alAnular: function (doc, ctx) { /* revertir */ },
    permisos: { ver: ['admin', 'vendedor'], crear: ['vendedor'], editar: ['vendedor'], emitir: ['vendedor'], anular: ['admin'] }
  } ],
  reportes: [ {
    id: 'ventas-mes', titulo: 'Ventas por mes', descripcion: '…',
    roles: ['admin', 'gerente', 'auditor'],                // omitir `roles` = cualquier usuario con sesión (hallazgo de auditoría)
    parametros: [ { id: 'desde', tipo: 'fecha', defecto: '@-180' }, { id: 'hasta', tipo: 'fecha', defecto: 'hoy' } ],
    ejecutar: function (p, ctx) {
      return { columnas: ['Mes', 'Total'], filas: [['2026-06', 1200.5]], tipos: ['texto', 'moneda'],
               grafico: { tipo: 'barras', etiquetas: ['2026-06'], valores: [1200.5] },
               resumen: [ { etiqueta: 'Total del periodo', valor: 1200.5, tipo: 'moneda' } ] };
    }
  } ],
  tablero: [ { titulo: 'Ventas del mes', tipo: 'moneda', calcular: function (ctx) { return 0; } } ],
  tableroGrafico: { titulo: 'Ventas por mes', calcular: function (ctx) { return { etiquetas: [], valores: [] }; } },
  semillas: { productos: [ { id: 'PRD-0001', codigo: 'SOF-01', nombre: 'Sofá 3 cuerpos', precio: 1290, stock: 8 } ],
              ventas: [ { id: 'VTA-0001', fecha: '@-40', cliente: 'CLI-0001', estado: 'Emitida', lineas: [ { item: 'PRD-0001', cantidad: 1, precio: 1290 } ] } ] }
};
```

### Tema (opcional)

`tema = { primario: '#rrggbb', acento: '#rrggbb', siglas: 'MS' }` da identidad visual propia a cada sistema.
El núcleo lo aplica al arrancar (`App.aplicarTema`) **sin variables CSS** (IE11): calcula en JS los tonos
claro/oscuro, elige texto blanco u oscuro sobre el primario según el contraste (mínimo 4,5:1, AA; si ninguno
llega, oscurece el primario) y garantiza un tono del primario legible como texto de enlace sobre fondo blanco.
Inserta las reglas con `insertRule` en una hoja `<style>` vacía (la CSP solo admite esa hoja, por su hash SHA-256) y
fabrica un favicon SVG de texto con las siglas. `primario` pinta cabecera, botones primarios, enlace activo del menú,
barras y línea de los gráficos; `acento` pinta la insignia redonda de siglas, el borde de los indicadores y los títulos de
tarjeta. `siglas` (1–2 letras) va en la insignia junto al nombre y en el ingreso. Sin `tema`, se usan azul y ámbar.

### Reglas del config

- Funciones **ES5**, sin flechas. `ctx` ofrece: `datos.listar(ent, filtroFn)`, `datos.obtener(ent, id)`, `datos.crear(ent, obj)`, `datos.actualizar(ent, id, parche)`, `datos.eliminar(ent, id)`, `datos.contar(ent)`, `param(id)`, `hoy()`, `usuario()`, `redondear(n)`, `suma(arr, fn)`, `agrupar(arr, fn)`, `fmt.moneda(n)`, `fmt.fecha(s)`, `fmt.num(n, dec)`, `fechaMas(s, dias)`, `mes(s)` (devuelve `AAAA-MM`).
- Fechas ISO `AAAA-MM-DD`. En semillas y valores por defecto: `'hoy'` o `'@-45'` (hoy menos 45 días) se resuelven en el primer arranque.
- Dinero: números con 2 decimales, siempre vía `ctx.redondear`.
- Semillas: **≥ 12 registros** en cada entidad principal y **≥ 30 operaciones** repartidas en los últimos 6 meses, con datos plausibles del Perú (nombres, distritos, RUC de 11 dígitos de ejemplo, DNI de 8, soles, IGV 18 %). Nada de datos reales.
- Cada rubro lleva **fórmulas propias** que se justifican en el negocio (comisión, interés, horas facturables, tiempo de ciclo, SLA, depreciación, ocupación…). No copies la misma fórmula en 15 sistemas.
- Identificadores `id` de entidad y de campo en minúsculas sin tildes. Etiquetas con tildes.

### Seguridad: valores por defecto y qué significa cada clave

| Clave | Seguro por defecto | Si se debilita |
|---|---|---|
| `minClave` | 10 | menos de 10 |
| `intentosMax` | 5 | 0 = sin bloqueo |
| `bloqueoMin` | 5 | — |
| `sesionMin` | 15 | 0 = la sesión no expira |
| `cadenaBitacora` | true | false = la bitácora no se encadena |
| `confirmarEliminar` | true | false = borra sin confirmar |
| `exigirCambioClave` | true | false = no pide cambiar la clave de demostración |
| `ayudaLogin` | false | true = la pantalla de ingreso muestra los usuarios de demostración |
| `exportaRespetaPermisos` | true | false = el CSV incluye columnas que el rol no ve |
| `cspMeta` | true | false = sin Content-Security-Policy |

**Cada sistema debilita 2 o 3 de estas claves a propósito** (o deja un reporte sin `roles`, o fija una constante que el parámetro debería controlar). Son los **hallazgos de la auditoría**. Se declaran **solo** así, como configuración que un auditor puede leer: **no** hay banderas ocultas. La clave de hallazgos del instructor se **deriva** con `construir.mjs --clave <carpeta-fuera-del-repo>`; el repositorio es público, la clave nunca se guarda en él.

## Estructura de `construir.mjs`

`node construir.mjs [--solo <id>] [--clave <carpeta>]` →
`dist/<id>/…`, `dist/<id>.zip`, `dist/indice.json` (id, nombre, rubro, roles, entidades, reportes, tamaño del zip),
copia los zips a `../../content/courses/deepseek-harness/materials/sistemas/`.

## Pruebas

- `pruebas/es5.mjs`: acorn `ecmaVersion: 5` sobre todos los `.js` de `dist/` + lista de APIs prohibidas.
- `pruebas/humo.mjs`: Chrome headless: abre cada `dist/<id>/index.html` por `file://`, entra con cada rol, recorre cada ruta del menú del rol, crea, edita y elimina un registro de cada entidad, emite una operación, ejecuta cada reporte, exporta CSV, hace respaldo y restauración, verifica la bitácora; falla ante cualquier error de consola; comprueba que un rol **no** llega a las rutas que no le tocan.


## Decisiones (tomadas al construir el núcleo)

Cosas que el contrato dejaba abiertas o que había que precisar. Los otros sistemas deben seguirlas.

**Config: claves añadidas (todas opcionales salvo indicación)**
- `tema` (ver arriba). `permisosSistema: { usuarios, bitacora, respaldo, configuracion }` (listas de roles); por defecto `usuarios/respaldo/configuracion = ['admin']` y `bitacora = ['admin','auditor']`.
- Campos: `ayuda` (texto bajo el campo), `placeholder`, `mensajePatron` (mensaje cuando falla `patron`), `defecto` (también `true` para booleanos), `max`/`min` de texto = largo; en `fecha`, `min`/`max` pueden ser `'hoy'`/`'@-30'`; **`ver: ['rol',…]`** oculta el campo (tabla, ficha, formulario, CSV) a los demás roles. Los `calculados` aceptan también `ver`.
- Operaciones: `lista` (ids de campos de cabecera que salen en la tabla; por defecto los 3 primeros), `reglas` (como en entidades pero con `validar(doc, ctx)`), `lineas.importe(l, ctx)` (importe de cada línea; por defecto cantidad × precio), `lineas.info(item, ctx)` (texto de ayuda bajo el ítem, p. ej. el stock), `lineas.precioEditable` (por defecto el precio se copia y no se edita), `totales[i].tipo` (por defecto `moneda`). `permisos.eliminar` es opcional: si falta, quien puede `editar` puede eliminar borradores.
- `tablero[i]`: `roles` (quién ve el indicador) y `nota`. `tableroGrafico`: `tipo` (`barras` | `columnas` | `linea`) y `formato` (`moneda` | `entero` | `numero` | `porcentaje`).
- Reportes: parámetros con `tipo` fecha | lista | numero | entero | texto | ref | porcentaje | moneda; `etiqueta` opcional. `ejecutar` puede devolver `tipos` por columna (`texto`, `entero`, `numero`, `moneda`, `porcentaje`, `fecha`) y `grafico.formato`.
- Ids de entidad y de campo: sin tildes ni espacios, empiezan con minúscula; **se permite camelCase** (`descuentoPct`, `limiteCredito`), como en el ejemplo del contrato.

**Operaciones**
- Estados: el primero es el inicial (borrador), el **segundo es «emitida»**, el **último es «anulada»**. Si hay más de tres, los intermedios se pueden alternar con «Cambiar estado» (permiso `emitir`).
- Solo el borrador se edita o elimina. Emitir asigna el número `serie-00000001` (por operación) y llama a `alEmitir(doc, ctx)`; **en ese momento el documento ya está guardado como emitido**, así que una consulta a `ctx.datos.listar` lo incluye. Anular exige un motivo (5–200 caracteres) y llama a `alAnular`.
- **Todo o nada:** si `alEmitir`/`alAnular` lanzan un `Error`, se deshace todo (estado, números, stock y bitácora) y el mensaje del error se muestra a la persona. Usa `throw new Error('…')` para validar existencias, topes de crédito, etc.
- `ctx.datos.crear/actualizar/eliminar` trabajan «como el sistema» (no exigen permisos del rol) pero **sí validan** y lanzan `Error` si falla (`campo: mensaje`). Los cambios que provocan quedan en la bitácora con el detalle «Emisión de F001-…».
- Los totales se guardan en `doc.totales` con **todas** las claves que devuelva `calcular` (aunque no estén en la lista `totales` que se muestra; p. ej. `comision`). Los reportes leen `v.totales.total`.
- La fecha y el número de las semillas emitidas se asignan en el primer arranque (numeración por orden de fecha).

**Semillas y validación del constructor**
- Entidades «principales» = las **3 primeras** de `entidades`: ≥ 12 registros; las demás ≥ 5. La operación principal (la primera) ≥ 30 documentos, las demás ≥ 8, repartidos al menos en 4 meses distintos y dentro de `@-190`.
- Las semillas se validan contra los tipos, `opciones`, `patron`, `min/max`, `unico`, referencias y obligatorios. Los ids deben empezar por `PREFIJO-`.
- Un reporte sin filtros `desde`/`hasta` genera solo un aviso (p. ej. un reporte de existencias).

**Seguridad**
- Política de clave: con `minClave >= 10` se exige mayúscula, minúscula, número y símbolo, que no sea común y que no contenga el usuario; con `minClave < 10` (debilitada) **solo se exige el largo**. Las claves de demostración del config deben cumplir siempre la política segura.
- Hash: SHA-256 iterado 1.000 veces, `h = SHA256(h + ':' + sal + ':' + clave)`; la sal (8 bytes) es por usuario y cambia cada vez que se cambia la clave. La clave en claro **solo** vive en `config.js` (demostración); el almacén guarda sal y hash.
- Bloqueo: el contador es por nombre de usuario escrito (existente o no, tope 200 nombres) y se reinicia al pasar `bloqueoMin`. El mensaje de error no revela si el usuario existe. Con `intentosMax: 0` no hay contador ni bloqueo.
- Sesión: se guarda en `sessionStorage` (por pestaña) y sobrevive a recargar. La actividad (clic, teclado, ratón, scroll, tacto) renueva el reloj, **excepto** mientras se muestra el aviso (últimos 60 s o el 25 % si es menor): ahí hay que pulsar «Seguir conectado». Con `sesionMin: 0` no se crea el temporizador.
- `exigirCambioClave`: los usuarios sembrados nacen con `cambiar: true`; la guardia los encierra en `#/perfil` hasta que cambien la clave. Los usuarios creados por el admin y las claves restablecidas también la obligan siempre.
- Bitácora: cada entrada guarda `prev` y `hash` (SHA-256 del contenido canónico + hash anterior; génesis = SHA-256 de `génesis:<id>`). `bitacoraMeta` {n, ultimo} detecta además el **truncamiento del final**. Se registran ingreso, fallos, bloqueo, expiración, salida, altas/bajas/cambios, emisión/anulación, accesos denegados (ruta y acción), consultas de reportes, exportaciones, respaldos, restauraciones y verificaciones. `antes/después` nunca incluyen sal ni hash.
- CSP: se inserta **al construir** (no en tiempo de ejecución): `default-src 'none'; script-src 'self'; style-src 'self' 'sha256-47DEQpj8…'; img-src 'self' data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`. Por eso el núcleo nunca usa atributos `style` ni `innerHTML`; los anchos de las barras se ponen con `element.style`. `cspMeta: false` omite la etiqueta en el `index.html` generado.
- `exportaRespetaPermisos: false` hace que el CSV de una entidad incluya también los campos (y calculados) con `ver` que el rol no ve.
- Un reporte sin `roles` queda abierto a cualquier usuario con sesión (hallazgo), pero **sigue exigiendo sesión**.

**Interfaz y rutas**
- Se añade la ruta `#/sin-permiso` (a la que la guardia redirige) y se registra el intento. Editar una ficha no cambia la ruta (`#/e/<ent>/<id>`): el modo edición vive en la vista.
- Sin diálogos nativos: `UI.confirmar`, `UI.aviso`, `UI.pedirTexto` y toasts propios. No se usan `classList`, `innerHTML` ni `style=""` (la prueba `es5.mjs` los prohíbe).
- Los botones de un formulario cancelan el `mousedown` para que la validación en línea del campo que pierde el foco no mueva el botón y se pierda el clic.
- Fallback de almacenamiento: `localStorage` → `window.name` → memoria, con aviso visible. Ojo: `window.name` sobrevive a la navegación de la pestaña hacia otros sitios; es un riesgo conocido del respaldo y está documentado en la pantalla de respaldo.
- Un respaldo se rechaza (sin tocar nada) si no es JSON, si el formato/sistema/checksum no coinciden o si la estructura es inválida (usuarios sin hash, roles desconocidos, sin administrador activo…).

**Constructor y pruebas**
- `construir.mjs` evalúa el config en `vm`, lo valida (mensajes `archivo › campo: motivo`) y no escribe nada si hay errores. `--clave <carpeta>` se niega a escribir dentro del repositorio.
- Hallazgos derivados con `--clave`: claves de `seguridad` debilitadas, reportes sin `roles`, literales numéricos que coinciden con un parámetro (p. ej. `0.18` con `igv = 18`), auditor con permisos de escritura, roles no-admin que eliminan, el mismo rol que emite y anula.
- `humo.mjs` acepta `--solo <id>`, `--rol <rol>`, `--capturas <carpeta>`, `--chrome <ruta>` y `--ver`. Las pruebas de negocio de `muebleria` están dentro; para otros sistemas se pueden añadir bloques en `pruebasEspecificas`.
