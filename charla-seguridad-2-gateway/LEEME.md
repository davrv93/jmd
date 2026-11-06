# Charla 2 de seguridad: gateway, payloads y rutas ofuscadas

Demo educativa. La aplicación es propia, usa datos ficticios y solo escucha en `127.0.0.1`.
No necesita instalar nada ni servicios externos: solo Node 20.12 o superior.

## Levantar

```bash
cd charla-seguridad-2-gateway
npm start
```

La terminal imprime tres direcciones y la clave de esa corrida. Los usuarios son `ana`, `beto` y `caja`.
Los enlaces ya traen la clave, así que basta con pulsar **Entrar**.

| Pieza | Dirección | Qué es |
| --- | --- | --- |
| Panel lado a lado | http://127.0.0.1:4810 | Simulaciones, tráfico en vivo y registro |
| 1 · Sin gateway | http://127.0.0.1:4811 | Cliente que llama directo a la API |
| 2 · Con gateway | http://127.0.0.1:4812 | Cliente con ruta opaca y payload cifrado |
| Backend interno | puerto al azar | No se imprime. Sin secreto interno responde 403 |

Si un puerto está ocupado, copia `.env.example` a `.env` y cámbialo.
Ninguna clave vive en el código: las claves de sesión, el secreto interno y la clave de los usuarios se generan al arrancar.

## Guion de la demo

Abre el panel en una ventana y los clientes en otra. **Reiniciar datos** deja todo como al inicio.

**Escena 3 · Sin gateway.** Abre el cliente 1, F12, pestaña Red. Entra y paga una factura. Lee en voz alta la ruta,
el monto y los campos `costo_interno`, `margen_pct` y `dni`. En la consola: `localStorage.getItem("token")`.

**Escena 5 · Ofuscar no es seguridad.** Abre el cliente 2 y entra. Copia el gancho del final del panel, pégalo en la
consola y paga una factura. Aparece el mensaje antes de cifrar. En Red, la respuesta de entrada trae la clave.

**Escena 7 · Con gateway.** En la pestaña Red solo hay `/d/…` y texto cifrado. Corre «Pagar una factura propia» en el
panel y compara las pistas de cada columna. Abre `app.js` y muestra que los códigos `k4`, `q2` y `z7` están ahí.

**Escena 8 · Simulaciones.** La gente vota primero. Luego corre «Petición manipulada», «Petición repetida» y
«Factura ajena». Lee también la línea de registro: el cliente ve poco, el registro lo explica.

**Escena 9 · Con la clave en la mano.** Corre «Gateway que solo ofusca». Con la autorización apagada, el tráfico sigue
cifrado y los datos salen igual. El panel la vuelve a encender solo.

**Escena 10 · Cookies y rutas.** Corre «Cookie HttpOnly» y «Ruta dinámica». En el cliente 2, escribe `document.cookie`
en la consola: sale vacío. Remarca que un script inyectado igual puede pedir cosas desde la página.

**Escena 11 · Costos.** Corre «Migrar a v2», «Se cae el gateway» y «Medir la latencia». La latencia se mide en ese
momento y en esa máquina, sin red real: no la cites como cifra general.

Sin navegador: `npm run comparar` corre todas las simulaciones en la terminal. Añade `-- --json` para tener los datos.

## Qué hace el gateway, en orden

Tamaño, límite por IP, sesión con cookie HttpOnly, ruta dinámica, límite por sesión, descifrado con AES-256-GCM,
anti-repetición con tiempo y nonce, operación y validación estricta, permiso por rol, traducción a la ruta real,
llamada al backend, filtro de campos, cifrado de la respuesta y registro.

El permiso fino, si la factura es tuya, lo decide el backend. El gateway no lo reemplaza.

## Lo que esta demo no demuestra

- **Ofuscar no es seguridad.** Quien controla el navegador ve la clave, los códigos y el mensaje antes de cifrar.
- **La API sin gateway está mal a propósito.** Todos sus fallos también se corrigen sin gateway. El gateway solo los
  pone en un sitio.
- **HttpOnly y las rutas dinámicas no hacen imposible robar credenciales.** Reducen el daño y suben el costo. Un script
  inyectado actúa desde la página, y con la cookie se pide la ruta vigente.
- **Aquí no hay TLS** porque corre en `127.0.0.1`. Por eso la cookie no lleva `Secure`, y la clave de sesión viaja en la
  respuesta de entrada. En producción: HTTPS siempre y `Secure` en la cookie.
- **No es código para producción.** Las sesiones, los nonces y los límites viven en memoria de un solo proceso. Con
  varias réplicas van en un almacén compartido. Usa un gateway probado en vez de escribir el tuyo.

Prueba estas técnicas solo en sistemas tuyos o con permiso escrito.

## Pruebas

```bash
npm test
```

## Archivos

- `src/gateway.mjs`: el gateway y su tabla de operaciones
- `src/api-directa.mjs`: la API sin gateway, con sus fallos comentados
- `src/backend-interno.mjs`: las reglas de negocio
- `src/sobre.mjs`: AES-256-GCM con la librería estándar de Node
- `src/escenarios.mjs`: las simulaciones del panel
- `publico/`: los dos clientes y el panel
- `pruebas/`: pruebas automáticas

## Fuentes

- OWASP API Security Top 10 2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- NIST SP 800-123, sección 2.4: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-123.pdf
- Gateway Routing, Azure Architecture Center: https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-routing
- API Gateway, microservices.io: https://microservices.io/patterns/apigateway.html

## Inicio de sesión cifrado

El usuario, la clave y la clave de sesión tampoco viajan legibles. El navegador y el gateway derivan una clave con ECDH P-256 y HKDF, sin enviarla, y con ella sellan el login y su respuesta. La renovación de ruta va sellada con la clave de sesión.

Esto frena a quien solo mira el tráfico. No reemplaza HTTPS: sin TLS, quien se mete en medio puede cambiar la llave pública de la página. El navegador y el gateway siguen viendo el mensaje en claro, porque uno lo escribe y el otro lo valida.

## Panel por colores

El panel agrupa las pruebas por color: azul para mirar, rojo para atacar, verde para proteger la sesión, violeta para la verdad sobre ofuscar y ámbar para beneficios y costos. Cada botón abre un diálogo paso a paso: primero la pregunta y luego «Probar». «Empezar recorrido completo» encadena las 17 pruebas. El tráfico sale en «Ver tráfico en vivo».
