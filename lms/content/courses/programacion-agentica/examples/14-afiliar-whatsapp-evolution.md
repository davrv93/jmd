---
id: ej-afiliar-whatsapp
title: "Afiliar un número de pruebas a Evolution API"
summary: Levantar Evolution API con Docker, crear la instancia, escanear el QR y registrar el webhook hacia tu laptop con host.docker.internal.
tags: [whatsapp, evolution-api, docker, webhook]
level: básico
lesson: pa-03
order: 14
---
Evolution API corre en Docker en tu laptop y se conecta a WhatsApp como un «dispositivo
vinculado». Aquí la levantas, afilias el número de pruebas y haces que avise a tu backend por
webhook. Sin túneles: todo queda en tu máquina.

Rutas verificadas en el código y la documentación de la v2: `POST /instance/create`,
`GET /instance/connect/{instancia}`, `GET /instance/connectionState/{instancia}`,
`POST /webhook/set/{instancia}`, `POST /message/sendText/{instancia}`. Todas con la cabecera
`apikey`.

## 1. Compose

Evolution v2 necesita **PostgreSQL** y **Redis**. Toma el `docker-compose.yaml` y el
`.env.example` del repositorio oficial: https://github.com/EvolutionAPI/evolution-api. Trae los
servicios `api` (puerto 8080), `redis` y `evolution-postgres`, además de un panel web. Copia los
dos archivos a una carpeta `evolution/` y renombra `.env.example` a `.env`.

En `.env`, cambia al menos estas variables (los nombres son los del archivo oficial):

```bash
AUTHENTICATION_API_KEY=una-clave-larga-que-solo-tu-conoces
SERVER_URL=http://localhost:8080
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI='postgresql://usuario:clave@evolution-postgres:5432/evolution?schema=public'
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/6
```

El host de la base y de Redis es el **nombre del servicio** del compose, no `localhost`. Si usas
Linux, añade al servicio `api`:

```yaml
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Levanta y comprueba:

```bash
cd evolution
docker compose pull          # hazlo en casa: la imagen pesa
docker compose up -d
docker compose ps            # api, redis y evolution-postgres en running/healthy
curl -s http://localhost:8080 # JSON con la versión
```

## 2. Crear la instancia

```bash
export EVOLUTION_URL="http://localhost:8080"
export EVOLUTION_APIKEY="una-clave-larga-que-solo-tu-conoces"

curl -s -X POST "$EVOLUTION_URL/instance/create" \
  -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
  -d '{"instanceName": "tienda", "qrcode": true, "integration": "WHATSAPP-BAILEYS"}'
```

`instanceName` es el nombre que irá en todas las rutas siguientes.

## 3. QR

```bash
curl -s "$EVOLUTION_URL/instance/connect/tienda" -H "apikey: $EVOLUTION_APIKEY" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['base64'])" > qr.txt
```

Abre `qr.txt`, copia el contenido (`data:image/png;base64,...`) y pégalo en la barra de
direcciones del navegador: aparece el QR. En el teléfono de pruebas: WhatsApp → Dispositivos
vinculados → Vincular un dispositivo → escanear. Caduca en menos de un minuto; si tarda, vuelve
a pedirlo.

```bash
curl -s "$EVOLUTION_URL/instance/connectionState/tienda" -H "apikey: $EVOLUTION_APIKEY"
# {"instance":{"instanceName":"tienda","state":"open"}}   <- open = conectado
```

## 4. Webhook hacia tu laptop

Dentro del contenedor, `localhost` es el contenedor. Tu laptop se llama `host.docker.internal`:

```bash
curl -s -X POST "$EVOLUTION_URL/webhook/set/tienda" \
  -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "http://host.docker.internal:8766/api/whatsapp/webhook",
      "byEvents": false,
      "base64": false,
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

Si tu versión responde 400, prueba el mismo cuerpo sin la envoltura `webhook` (una de las
páginas de la documentación lo muestra plano). Revisa la ruta y el cuerpo exactos en la
documentación de la versión que instalaste.

## 5. Comprobación de punta a punta

Backend del asistente arrancado en tu laptop, en el 8766:

```bash
OSITO_PUERTO=8766 ./arrancar.sh
```

Desde el segundo teléfono escribe «hola» al número de pruebas. En la terminal del backend debe
aparecer `POST /api/whatsapp/webhook` (con 404 si la ruta aún no existe: eso está bien, la
petición llegó). Guarda ese primer JSON en `pruebas/webhook-hola.json`.

Prueba de envío desde Evolution, para cerrar el círculo:

```bash
curl -s -X POST "$EVOLUTION_URL/message/sendText/tienda" \
  -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
  -d '{"number": "51999888777", "text": "Hola, soy el asistente de la tienda. Soy un bot."}'
```

`number` es el número con código de país, sin `+` ni `@s.whatsapp.net`.

## Si algo falla

| Síntoma | Qué mirar |
|---|---|
| El webhook no llega | La URL registrada dice `localhost`. Regístrala con `host.docker.internal`. En Linux, `extra_hosts` |
| `connectionState` sigue en `connecting` | No escaneaste o el QR caducó. Pide otro |
| El QR no aparece | `docker compose logs api`: la instancia no existe o el contenedor no sale a internet |
| 401 en cualquier llamada | La cabecera `apikey` no coincide con `AUTHENTICATION_API_KEY` |
| Se desvinculó tras `docker compose down -v` | Borraste el volumen. Usa `stop`, no `down -v` |
