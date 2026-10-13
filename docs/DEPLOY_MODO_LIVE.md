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

### 2.4 Lecciones del despliegue del 11-10-2026

- **No uses `umask 077` en la misma sesión del `git pull`:** las carpetas nuevas quedan en 700 y el LMS (usuario 10001) no puede leer `lms/content`; el contenedor entra en bucle de reinicio. Si pasa: `chmod -R go+rX lms docs src ui tests instalador` y `sudo docker restart lms`.
- **El gateway copia su configuración semilla desde el binario**, no desde el repo. Para que existan los modelos `qwen-flash`, `imagen-flash` y el agente `clase`: `sudo docker cp config.yaml ai-orchestrator:/data/config.yaml`, `sudo docker exec -u root ai-orchestrator chown aio /data/config.yaml` y `sudo docker restart ai-orchestrator`.
- **`.env` con líneas duplicadas** (la plantilla trae `GATEWAY_API_KEYS=` vacío): al leer una clave con `grep | cut` usa `tail -1`.
- La imagen del aula se construye con el constructor clásico: no uses `TARGETARCH` (ya corregido con `uname -m`).

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

## 6. Clase 3: WhatsApp con Bun + Elysia + PostgreSQL (perfil `clase`)

Qué se añade: `aula-pg` (Postgres 16 de las aulas y de evolution-go), `evogo-clase` (imagen `importking/evogo:latest`, ya
compilada en el servidor) y `npm-proxy` (la única salida a internet de las aulas, solo a `registry.npmjs.org`, para
`bun install`). El LMS crea, al crear cada aula, la base y el rol del alumno (`docker exec aula-pg psql`, sin driver en Go)
y su instancia de Evolution Go (con `LMS_EVO_KEY`, que nunca entra al aula) con el webhook ya guardado, y le pasa `DATABASE_URL`, `EVO_URL`,
`EVO_TOKEN`, `EVO_INSTANCE` y `EVO_WEBHOOK`. Todo en el servidor, con `sudo`, en `~/jmd` y tras el `git pull` del §2.

**Por qué este orden:** las claves de Postgres se leen solo en el primer arranque del volumen `aula_pg_data` (van antes
que el perfil); y la imagen del aula va antes que el LMS, porque el LMS nuevo recrea cada aula vieja la primera vez que
el alumno la abre (cambia la firma: 384 MiB y las variables nuevas) y lo haría con la imagen que encuentre.

```bash
cd ~/jmd
# 1. Variables (no se imprimen). Las tres claves, aleatorias y solo si faltan.
for v in LMS_EVO_KEY AULA_PG_PASSWORD EVOGO_DB_PASSWORD; do
  grep -q "^$v=." .env || echo "$v=$(openssl rand -hex 24)" >> .env
done
grep -q '^LMS_AULA_PG=.' .env    || echo 'LMS_AULA_PG=aula-pg' >> .env
grep -q '^LMS_EVO_URL=.' .env    || echo 'LMS_EVO_URL=http://evogo-clase:8080' >> .env
grep -q '^LMS_AULA_PROXY=.' .env || echo 'LMS_AULA_PROXY=http://npm-proxy:8888' >> .env
chmod 600 .env
for v in LMS_EVO_KEY AULA_PG_PASSWORD EVOGO_DB_PASSWORD LMS_AULA_PG LMS_EVO_URL LMS_AULA_PROXY; do
  printf '%s %s\n' "$v" "$(grep -c "^$v=." .env)"; done                      # todas 1

# 2. Imagen del aula (Bun 1.4.2 musl, psql 16, elysia de respaldo). ~3 min.
sudo docker build -t jmd/aula:latest lms/aula
sudo docker run --rm jmd/aula:latest sh -c 'bun --version; psql --version'   # 1.4.2 · 16.x

# 3. Perfil clase. aula_net ya existe (la crea el LMS); si no: sudo docker network create --internal aula_net
sudo docker image inspect importking/evogo:latest --format '{{.Id}}' >/dev/null && echo evogo-ok
sudo docker compose --profile clase up -d --build aula-pg evogo-clase npm-proxy
sleep 40
sudo docker exec aula-pg psql -U postgres -tAc "select datname from pg_database where datname like 'evogo%'"  # evogo_auth, evogo_users
sudo docker logs evogo-clase --since 2m 2>&1 | grep -iE 'error|license|porta 8080' | tail -5               # «Iniciando servidor na porta 8080»

# 4. Redes: compose ya los pone en aula_net. Comprobar.
sudo docker network inspect aula_net --format '{{range .Containers}}{{.Name}} {{end}}'   # + aula-pg evogo-clase npm-proxy

# 5. LMS nuevo (el visor abierto a /api/*, la firma de las aulas y la clase 3)
sudo docker compose build lms                 # unos 5 min
sudo docker compose up -d --no-build lms      # SIN --profile: no toca el perfil clase
sleep 6 && sudo docker logs lms --since 30s 2>&1 | grep -i 'clase 3\|aula'
# debe decir: clase 3 activa base_por_alumno=true whatsapp_por_alumno=true proxy_npm=true
```

Si evolution-go responde `503 LICENSE_REQUIRED`, pon en `.env` `EVOLUTION_OPERATOR_EMAIL=<el correo de la licencia>` y
repite el `up -d` del paso 3 (en Import King no la pidió).

### 6.1 Comprobar con un alumno de prueba

En su terminal del LIVE (el aula vieja se recrea sola al abrirla; `/trabajo` se conserva):

```sh
env | grep -c '^EVO_\|^DATABASE_URL'     # 5
bun --version                           # 1.4.2
aula db -c 'select current_user'        # alumno_<hash>
mkdir -p /trabajo/bot && cd /trabajo/bot && bun init -y && bun add elysia   # por npm-proxy, ~2 s
aula whatsapp                           # estado + QR en qr.png (NO escanear sin el sí del instructor)
```

Y desde el servidor: `free -m`, `sudo docker stats --no-stream | grep -E 'curso-|aula-pg|evogo-clase|npm-proxy'`.

### 6.2 Volver atrás

```bash
cd ~/jmd
sed -i '/^LMS_AULA_PG=/d;/^LMS_EVO_URL=/d;/^LMS_AULA_PROXY=/d' .env     # las aulas vuelven a crearse sin base ni WhatsApp
sudo docker compose up -d --no-build lms
sudo docker compose --profile clase stop aula-pg evogo-clase npm-proxy   # SIEMPRE nombrando los servicios
```

Los datos quedan en los volúmenes `jmd_aula_pg_data` y `jmd_evogo_clase_data` (sin respaldo: son de clase). La semilla de
las credenciales por alumno está en el volumen del LMS (`aula-secreto`, junto a `lms.db`); si se pierde, las aulas
reciben claves nuevas (aula-pg se corrige solo) y hay que borrar las instancias viejas de `evogo-clase`.
