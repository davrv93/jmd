# Despliegue del modo LIVE (jmd-learn.online)

Esta guía es para desplegar el modo LIVE en el servidor del LMS. No se ejecutó todavía: el despliegue lo autoriza el instructor.
Servidor: EC2 `3.151.56.55` (llave `~/Downloads/curdilmer.pem`, copiarla con `chmod 600`), repo en `~/jmd`, Docker con `sudo`.
Ya está listo en el servidor: el socket de Docker montado en `lms` (`compose.override.yaml`, grupo 109) y `LMS_RUNNER=docker`.

## 0. Antes de empezar

- **Memoria:** el servidor tiene 3,8 GB y usa unos 1,6 GB. Un aula con el asistente en marcha usa unos 52 MiB (medido); diez alumnos suman unos 520 MiB. Cabe, con el gateway (unos 15 MiB).
- **Clave de OpenRouter:** la clave se pone SOLO en `~/jmd/.env` del servidor (permiso 600), nunca en el repo ni en un chat. La clave que se pegó en la conversación de desarrollo debe rotarse en OpenRouter antes de la clase.
- **Repo público:** `davrv93/jmd` es público. No subas `.env`, claves ni capturas pesadas (`docs/capturas-live/` no se sube).

## 1. Subir el código

Desde el Mac, en `~/Documents/jmd` (rama `main`):

```bash
git status --short          # debe estar limpio (las capturas no se versionan)
git push origin main
```

## 2. En el servidor

```bash
ssh -i ~/Downloads/curdilmer.pem ubuntu@3.151.56.55
cd ~/jmd
git status --short          # si hay cambios sin commit, guárdalos antes de seguir
git pull --ff-only
```

### 2.1 Variables nuevas en `.env` (sin imprimirlas)

```bash
# Gateway de IA
OPENROUTER_API_KEY=<la clave nueva>
GATEWAY_API_KEYS=<una clave larga al azar, p. ej. openssl rand -hex 24>
ADMIN_TOKEN=<otra clave larga al azar>
# Aula del LIVE
LMS_AULA_IMAGE=jmd/aula:latest
LMS_AULA_GATEWAY=ai-orchestrator
LMS_AULA_TOKEN=<la misma clave que pusiste en GATEWAY_API_KEYS>
```

`chmod 600 .env` y comprueba que existen sin mostrarlas: `grep -c '^OPENROUTER_API_KEY=.' .env`.

### 2.2 Construir y arrancar

La imagen del LMS (con el front nuevo) y la del aula se construyen en el servidor (tiene 4 GB de swap; no construir en el Mac, el emulador amd64 lo cuelga).

```bash
sudo docker compose build lms                 # unos 5 min
sudo docker build -t jmd/aula:latest lms/aula # usa localhost/ai-orchestrator:latest, ya cargada
sudo docker compose up -d orchestrator        # el gateway, con config.yaml (agente «clase»)
sudo docker compose up -d --no-build lms
sleep 6 && sudo docker logs lms --since 30s | grep -i "aula\|escuchando"
```

Debe verse `aula por alumno activa imagen=jmd/aula:latest`. Si el gateway ya tenía datos de antes (`aio_data`), el agente `clase` no aparece solo: créalo desde la UI del gateway o con `PUT /admin/api/agents/clase` (cadena `qwen-flash`, `deepseek-flash`, `glm-flash`).

### 2.3 Comprobar

```bash
curl -s https://jmd-learn.online/api/v1/health
sudo docker network inspect aula_net --format '{{range .Containers}}{{.Name}} {{end}}'   # ai-orchestrator
```

Entra como un alumno de prueba a `https://jmd-learn.online/live/pa-02/`: abre Terminal, escribe `aula iniciar` y
`curl -s localhost:8766/api/salud` (debe decir `"llm":true,"perfil":"nube"`). Prueba el chat desde el panel Visor.

## 3. Antes de la clase (ensayo)

1. Instructor: abrir `https://jmd-learn.online/live/pa-02/` y pulsar «Iniciar LIVE». Entrar con dos alumnos de prueba.
2. Recorrer las 12 escenas con «Siguiente»; la compuerta debe frenar en las escenas con evidencia.
3. Precalentar: cada alumno abre su terminal y ejecuta `aula iniciar` una vez (así la primera vez en clase no espera).
4. Mirar la memoria: `free -m` y `sudo docker stats --no-stream | grep curso-`.
5. Gasto del gateway: `curl -s https://openrouter.ai/api/v1/auth/key -H "Authorization: Bearer $OPENROUTER_API_KEY"` (campo `usage`, tope `limit`).

## 4. Volver atrás

```bash
cd ~/jmd
sudo docker compose up -d --no-build lms     # tras volver el .env y la imagen anterior (localhost/lms:amd64 sigue ahí)
sudo docker rm -f $(sudo docker ps -aq --filter name=curso-)   # retira las aulas; los volúmenes trabajo-* se conservan
```

Quitar `LMS_AULA_IMAGE` del `.env` apaga el aula sin tocar nada más (el terminal vuelve a la shell aislada de siempre).

## 5. Pendiente conocido

- Todos los alumnos usan la misma clave del gateway; los tokens por alumno y la cuota individual (fase 5) no están hechos.
- **Imágenes en la nube:** funcionan por el gateway (modelo `imagen-flash` = Gemini 3.1 Flash Lite Image por OpenRouter, ya probado: un flyer tarda unos 10 s y cuesta unos 0,034 USD por imagen). Con el tope de 5 USD de la clave alcanzan unas 100 imágenes: conviene que cada alumno genere pocas en clase. No hay modelos de imagen chinos en OpenRouter.
- **Transcripción por servidor:** no está; la voz usa el reconocimiento del navegador (Chrome sobre https).
- `rtk` solo se probó en arm64 (falla por glibc); en amd64 usa el binario musl, sin probar.
