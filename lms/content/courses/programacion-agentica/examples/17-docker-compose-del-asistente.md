---
id: ej-compose-asistente
title: "docker compose del asistente con Evolution API"
summary: Un compose.yaml con el backend, Evolution API, Postgres y Redis; el .env fuera de git; docker compose config, up -d, comprobar /api/salud y parar sin perder la sesión.
tags: [docker, compose, despliegue, evolution-api]
level: intermedio
lesson: pa-03
phase: experimentacion
order: 17
---
Desplegar es sincronizar, hornear, levantar y comprobar. Aquí el asistente y Evolution API
quedan en un solo `compose.yaml`, con los secretos en `.env`, y una comprobación de salud al
final.

## Servicios

Cuatro: tu backend, Evolution (`api`), Postgres y Redis. Dentro de un compose, los servicios se
ven **por nombre**: `api` llega a tu backend como `http://backend:8766`, sin
`host.docker.internal`. Lo único que sigue fuera es **Ollama**, que corre en tu laptop; el
backend lo alcanza con `host.docker.internal`.

```yaml
# compose.yaml
services:
  backend:
    build: ./osito                       # el Dockerfile del backend del asistente
    ports:
      - "8766:8766"
    env_file: .env
    environment:
      OSITO_PUERTO: "8766"
      OSITO_OLLAMA_URL: "http://host.docker.internal:11434"
      EVOLUTION_URL: "http://api:8080"
      EVOLUTION_INSTANCIA: "tienda"
    extra_hosts:
      - "host.docker.internal:host-gateway"   # necesario en Linux; inocuo en Desktop

  api:
    image: evoapicloud/evolution-api:latest  # el repo oficial fija la versión; copia la suya
    ports:
      - "127.0.0.1:8080:8080"                 # solo desde tu máquina
    env_file: .env
    depends_on: [postgres, redis]

  postgres:
    image: postgres:15
    env_file: .env
    environment:
      POSTGRES_DB: ${POSTGRES_DATABASE}
      POSTGRES_USER: ${POSTGRES_USERNAME}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:latest
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Los nombres de las variables son los del `docker-compose.yaml` y el `.env.example` del
repositorio oficial (https://github.com/EvolutionAPI/evolution-api). El resto, de ahí, no de memoria.

## `.env` (fuera de git)

```bash
# Evolution API (nombres del .env.example oficial)
AUTHENTICATION_API_KEY=una-clave-larga-que-solo-tu-conoces
SERVER_URL=http://localhost:8080
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI='postgresql://evolution:clave-postgres@postgres:5432/evolution?schema=public'
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/6

# Postgres (las lee el servicio postgres)
POSTGRES_DATABASE=evolution
POSTGRES_USERNAME=evolution
POSTGRES_PASSWORD=clave-postgres

# Backend del asistente
EVOLUTION_APIKEY=una-clave-larga-que-solo-tu-conoces
```

`EVOLUTION_APIKEY` y `AUTHENTICATION_API_KEY` llevan el mismo valor (una la lee tu backend, la
otra Evolution). El archivo no se sube:

```bash
echo ".env" >> .gitignore
sed 's/=.*/=/' .env > .env.example      # nombres sin valores: eso sí se sube
git status                              # .env no debe aparecer
```

## Comprobar antes de levantar

```bash
docker compose config
```

Imprime el compose resuelto. Si falta una variable o el YAML está mal, lo dice aquí y no a medio
arranque. Las URLs internas deben decir `postgres`, `redis` y `api`, no `localhost`.

## Levantar

```bash
docker compose build backend
docker compose up -d
docker compose ps                        # los cuatro en running/healthy
```

## Comprobar

```bash
curl -s http://127.0.0.1:8766/api/salud
# {"ollama": true, "whisper": true, "imagen": "...", "modelo": "qwen3:1.7b", ...}
```

`ollama: false` significa que el backend no llega a tu Ollama: revisa `OSITO_OLLAMA_URL` y que
Ollama esté arrancado en la laptop. Luego, como el backend ya vive dentro del compose, registra el
webhook con la URL **interna**:

```bash
curl -s -X POST http://127.0.0.1:8080/webhook/set/tienda \
  -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
  -d '{"webhook": {"enabled": true, "url": "http://backend:8766/api/whatsapp/webhook", "byEvents": false, "base64": false, "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]}}'
```

Y manda un mensaje real desde el teléfono. Si responde, está desplegado. Captura de la bandeja.

## Parar

```bash
docker compose stop        # conserva volúmenes: la sesión de WhatsApp sigue viva
docker compose start       # vuelve sin escanear el QR
```

Nunca `docker compose down -v`: se lleva la sesión de WhatsApp y tendrás que volver a vincular.
Si algo no arranca, `docker compose logs <servicio>` dice por qué; lo demás está en la sección 10 de la clase.
