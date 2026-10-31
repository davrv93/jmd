# Tu aula

- Tu trabajo vive en `/trabajo`. Lo que guardes ahí se queda hasta que termine la clase.
- El código de tu asistente está en `/trabajo/osito`. Para arrancarlo: `aula iniciar`. Para pararlo: `aula parar`.
- El asistente corre en el puerto 8766 en modo nube. Míralo en el panel «Visor».
- Esta terminal no tiene internet directo: sale solo por el proxy de la clase (`HTTPS_PROXY`, puertos 80 y 443) y habla con el gateway de IA de la clase. Programas como `curl`, `bun install` o `dsh` ya usan el proxy solos; lo que no respete `HTTPS_PROXY` no tendrá salida.
- Tus skills están en `~/.config/jmd/skills`. Pídele al agente: `jmd chat "/skill plan-de-trabajo ..."`.
- **Landing sin IA** (si el agente no responde o se acabó la cuota): guarda el texto del cliente con `cat > /trabajo/landing/cliente.txt <<'FIN'` … `FIN` (termina solo en `FIN`, sin Ctrl+D) y corre
  `bun /opt/skills-curso/s1-landing-estilos/motor/extraer.mjs cliente.txt --modelo auto --salida negocio.json` y luego
  `bun /opt/skills-curso/s1-landing-estilos/motor/construir.mjs --negocio negocio.json --estilo apple --imagenes no`.
  Las reglas sacan los datos del texto; si el modelo pequeño de la clase está disponible, redacta los títulos. Nunca inventa precios ni teléfonos.
- Pega solo comandos que entiendas. Si algo falla, copia el error completo y pregúntale al agente.
- No guardes claves ni contraseñas en archivos.
- Si tu terminal se cierra, ábrela de nuevo: tus archivos siguen aquí.
- Para construir tu propio robot (Robo): `aula nuevo plan-robo`, abre `/trabajo/plan-robo/PROMPT_ARMAR_ROBO.md` y pega el prompt a tu agente. Los skills `s2-robo-*` le explican cada pieza.

## Clase 3: tu chatbot de WhatsApp

- Crea el plan: `aula nuevo plan-chatbot`. Abre `plan-chatbot` en el visor y pega a `jmd` el prompt de `/trabajo/plan-chatbot/PROMPT_ARMAR_CHATBOT.md`. Si algo falla, lee `/trabajo/plan-chatbot/INDICACIONES.md`.
- El chatbot se construye en `/trabajo/chatbot` con Lit (front, sin build), Bun + Elysia (API en el puerto 8766) y tu PostgreSQL. `elysia` y `postgres` ya están instalados.
- Skills de la clase, en orden: `s3-chatbot-aula` (siempre primero), `s3-wireframe`, `s3-prototipo`, `s3-whatsapp-qr`, `s3-postgres`, `s3-back-elysia`, `s3-front-lit`, `s3-integracion`, `s3-pruebas-playwright`, `s3-pruebas-uso`.
- Arranca y para tu API con `sh /trabajo/chatbot/chatbot.sh arrancar|parar|reiniciar|estado|log` (no con `aula iniciar`: usa el mismo puerto).
- `aula whatsapp`: estado del número; si no hay sesión, renueva el QR en `/trabajo/qr.png` (unos 2,5 min). También restaura la instancia si se desconectó. Nunca llames a `/instance/connect` a mano.
- `aula db`: abre `psql` en tu base (`DATABASE_URL`). Sal con `\q`.
- El front llama a la API con rutas `/vista/<tú>/api/...` (usa `pedir()` de `api.js`). Pruebas: `cd /trabajo/chatbot && bun test pruebas/`.
- WhatsApp: solo el número de pruebas del equipo; el bot avisa que es un bot y solo responde a quien le escribe. Nunca imprimas `EVO_TOKEN`, `OSITO_TOKEN` ni `DATABASE_URL`.

- Clase 3 paso a paso: `aula paso` (qué toca), `aula paso hacer` (lo hace el agente con su skill s3-* y se comprueba), `aula paso lista`.

## DeepSeek Harness: tu sistema de práctica

Tu tarea es **documentar y auditar** un sistema web ya hecho (no construirlo). Tres comandos para preparar el material:

- `aula sistema`: lista los 15 sistemas (id, rubro, roles).
- `aula sistema <id>`: copia el que elijas a `/trabajo/sistema` (no pisa uno existente), con su `AGENTS.md` y la carpeta `docs/` para tus entregables. Míralo en el panel Visor: `/vista/<tú>/sistema/`.
- `aula sistema foto`: toma la «foto» (inventario verificable) y la deja en `/trabajo/sistema/FOTO/` (`FOTO.md`, `FOTO.json`, `hashes.txt`).

Luego dile a tu agente: «Lee `AGENTS.md` y `FOTO/FOTO.md` y sigue la skill `foto-del-sistema`». Tus entregables van en `/trabajo/sistema/docs/`. Sin la foto leída, el agente no debe leer el código a ciegas; todo lo que afirme lleva `archivo:línea` o dice «por verificar». Si algo falla (no hay sistemas, la foto da error), copia el mensaje completo y avisa al instructor.

### Usar DeepSeek Harness (`dsh`) aquí mismo

`dsh` ya está instalado en el aula (versión fija, con Node). Funciona con **tu propia API key de DeepSeek** y llega a DeepSeek por el proxy de la clase; el consumo se descuenta de TU cuenta.

1. `aula dsh clave`: te pide la API key (no se ve al escribir). Solo queda en la memoria del aula: si el aula se reinicia, la vuelves a pegar. `aula dsh olvidar` la borra.
2. `aula dsh "describe tu tarea"`: `dsh` trabaja en `/trabajo/sistema` (o en `/trabajo` si aún no copiaste un sistema) y te muestra la respuesta y un **resumen de uso** (tokens de entrada con caché acierto/fallo, tokens de salida, llamadas y duración). Sin texto, `aula dsh` abre un modo simple donde cada línea es una tarea nueva.
3. `aula dsh web`: arranca la interfaz web de `dsh` y te imprime el enlace para abrirla en el navegador (el enlace trae tu acceso: no lo compartas). `aula dsh web parar` la apaga.
4. `aula dsh estado`: te dice si hay clave, si hay salida a internet y si la web está arrancada.

**Cuida tu clave:** nunca la pegues en un chat, en un archivo de `/trabajo` ni en un `.env` de `/trabajo` (el Visor muestra `/trabajo` como página web). Pégala solo con `aula dsh clave`. Una tarea de `dsh` puede gastar muchos tokens: empieza con tareas pequeñas y mira el resumen de uso.
