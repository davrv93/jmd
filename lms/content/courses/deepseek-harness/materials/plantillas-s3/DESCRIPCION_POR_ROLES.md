# Descripción del sistema por rol

> Sistema: _(nombre)_ · Foto: huella `_(primeros 12 caracteres de huella_global)_` · Autor: _(tu nombre)_
>
> Reglas: todo lo que viste en el código lleva `archivo:línea`. Lo que no verificaste va marcado **por verificar**. Los permisos salen de la **matriz** de `FOTO/FOTO.md` (sección «Matriz de permisos»); no los inventes.

## Resumen en una tabla

| Rol | Quién es | Pantallas que ve | Puede crear/editar/eliminar | No puede |
|---|---|---|---|---|
| _(rol)_ | _(persona de demostración y qué hace en el negocio)_ | _(rutas del menú)_ | _(entidades y operaciones)_ | _(lo vedado)_ |

## Rol: `_(id del rol)_` — _(nombre)_

- **Quién es:** _(descripción del `config` + usuario de demostración; cita `js/config.js:línea`)_
- **Pantallas que ve:** _(tablero, entidades, operaciones, reportes, usuarios, bitácora…; cita dónde se arma el menú: `archivo:línea` o **por verificar**)_

### Qué puede hacer

| Recurso | Ver | Crear | Editar | Eliminar | Otras acciones (emitir, anular, ejecutar) | Evidencia |
|---|---|---|---|---|---|---|
| entidad `_(id)_` | sí/no | sí/no | sí/no | sí/no | — | `js/config.js:_(línea)_` |
| operación `_(id)_` | | | | | _(emitir / anular)_ | `js/config.js:_(línea)_` |
| reporte `_(id)_` | — | — | — | — | ejecutar: sí/no | `js/config.js:_(línea)_` |

### Flujos típicos (máximo 3, cada uno en pasos cortos)

1. _(Ej.: «Registrar una venta»: #/o/ventas/nuevo → elegir cliente → agregar líneas → Emitir)_
2. …

### Qué NO puede hacer (y cómo lo sabes)

- _(Ej.: no puede eliminar productos — `js/config.js:_(línea)_` no lo lista en `eliminar`.)_
- _(Prueba hecha: entré como este rol a la ruta `#/…` y el sistema respondió _(qué)_.)_ **por verificar** si no la hiciste.

### Dudas de este rol

- _(Pasa a `DUDAS_VERIFICABLES.md` lo que no pudiste confirmar.)_

<!-- Copia el bloque «Rol: …» una vez por cada rol de la matriz (todos, incluido el de solo lectura). -->

## Diferencias entre roles que llaman la atención

- _(Ej.: el auditor puede editar productos según `js/config.js:_(línea)_`: es un hallazgo, no una descripción.)_
