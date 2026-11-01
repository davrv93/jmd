# Tienda Sol web · taller QA

Servidor Node sin dependencias sobre Alpine. Fuente de la app incluida también en el kit del curso.

- `app/servidor.mjs` exporta una fábrica: cada tienda tiene su propia base, sesiones, modo con bugs y caos.
- `app/web.mjs` asigna códigos criptográficos de 128 bits, reutiliza la cookie HttpOnly y reescribe las rutas de HTML/JS bajo el código.
- El código es una capacidad privada: compartirlo comparte la tienda. No es un identificador público ni se puede elegir por nombre.
- La semilla y el caos solo operan sobre la fábrica de ese código. Los tokens de login no cruzan tiendas.
- TTL: 30 min sin actividad; limpieza cada minuto y también en cada petición. Código vencido: 410.
- Máximo 120 tiendas, 100 sesiones y 1000 ventas por tienda. La latencia artificial se limita a 5 s.
- Datos solo en memoria: reiniciar el contenedor elimina las prácticas.
- Despliegue: puerto del host 18620, verificado libre antes de publicar. Contenedor `qa-tienda-sol` con 192 MiB de memoria y heap de Node de 128 MiB.
- `nginx.conf` se copia como snippet y se incluye en el archivo existente, sin convertirlo en enlace. Validar con `nginx -t` antes de recargar.

## Comprobar

```bash
node comprobar-aislamiento.mjs
WEB_HOST=https://jmd-learn.online node comprobar-aislamiento.mjs
```

Las pruebas crean dos tiendas propias y no tocan datos de otros alumnos.
Para el kit: `BASE_URL=https://jmd-learn.online/tienda-sol/CODIGO npm test`; `BUGS=0` selecciona la variante corregida durante la semilla de cada prueba. Windows: configurar las variables con `$env:BASE_URL` y `$env:BUGS` en PowerShell.

Después de actualizar el catálogo, `sudo python3 qa-tienda-sol/migrar-escena-preparacion.py` corrige solo una referencia antigua de qa-01 si sigue en estado preparando. La lleva a 01-descarga/ver; no modifica sesiones en vivo ni otras lecciones.
