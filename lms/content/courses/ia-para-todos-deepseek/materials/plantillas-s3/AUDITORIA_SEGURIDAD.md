# Auditoría de seguridad

> Sistema: _(nombre)_ · Foto: huella `_(12 primeros caracteres)_` · Auditor: _(tu nombre)_
>
> Es un sistema de **práctica**: la seguridad corre en el navegador y es de demostración. Audita igual, como si fuera real, y di qué cambiaría.
> Estado: `presente` · `débil` · `no encontrado` · `por verificar`. Un mecanismo no está «presente» hasta que viste el código (`archivo:línea`) o lo probaste.

## Tabla de mecanismos

| Mecanismo | Estado | Evidencia (`archivo:línea`) | Riesgo | Recomendación | Cómo verificarlo |
|---|---|---|---|---|---|
| Hash de contraseña con sal e iteraciones | | | | | Abrir la función de ingreso; revisar que el hash se compare, no la clave en claro |
| Bloqueo por intentos fallidos | | | | | Fallar la clave N+1 veces y comprobar el bloqueo y su duración |
| Expiración de sesión | | | | | Dejar la sesión inactiva más que `sesionMin` y recargar |
| Guardia de ruta (sesión y rol) | | | | | Pegar `#/usuarios` con un rol sin permiso |
| Escape de salida (`esc(` o nodos de texto) | | | | | Guardar un nombre con `<b>x</b>` y ver cómo se pinta |
| Sin `innerHTML` con datos | | | | | Buscar `innerHTML` y revisar de dónde viene cada dato |
| Sin `eval`/`new Function` | | | | | `grep -n "eval(\|new Function" js/*.js` |
| Content-Security-Policy | | | | | Leer el `<meta>` de `index.html` |
| Bitácora con cadena de hashes | | | | | Alterar un registro guardado y pedir la verificación |
| Checksum del respaldo | | | | | Editar el JSON exportado y restaurarlo |
| Confirmación antes de eliminar | | | | | Eliminar un registro de prueba |
| Validación de entrada | | | | | Enviar vacío, fuera de rango y con patrón inválido |
| Política de contraseña | | | | | Cambiar la clave por una corta |
| Permisos en la capa de datos | | | | | Llamar a la función de datos desde la consola con un rol sin permiso |

## Configuración de seguridad (`seguridad` en `js/config.js`)

| Clave | Valor seguro | Valor efectivo | ¿Desviación? | Evidencia | Riesgo |
|---|---|---|---|---|---|
| | | | | | |

## Otros hallazgos

| Id | Hallazgo | Evidencia | Riesgo | Recomendación | Cómo verificarlo |
|---|---|---|---|---|---|
| _(H-01 de la foto o uno tuyo)_ | | | | | |

## Qué descarté (falsos positivos de la foto)

- _(Pista automática que revisaste y no era un problema: por qué.)_

## Conclusión

- _(3 a 5 líneas: lo más grave, lo que arreglarías primero, lo que no pudiste verificar.)_
