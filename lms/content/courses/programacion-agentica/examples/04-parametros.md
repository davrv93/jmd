---
id: ej-parametros
title: Probar temperature y max_tokens con curl contra el gateway
summary: Dos llamadas al mismo modelo, con temperature 0.1 y 1.0, y un max_tokens que corta.
tags: [modelos, parámetros]
level: básico
lesson: pa-01
phase: conceptualizacion
order: 4
---
Los parámetros de generación van **en cada petición**. Lo más rápido para verlos es llamar al
gateway a mano: habla el formato de OpenAI (`POST /v1/chat/completions`) y con el modelo `auto`
elige el modelo por ti.

## Preparación

```bash
export GATEWAY_API_KEY="pon-aquí-tu-clave"   # la que te dio el instructor
export GATEWAY_URL="https://gateway.tu-dominio/v1/chat/completions"
```

Si usas un gateway local, cambia `GATEWAY_URL` por `http://127.0.0.1:4000/v1/chat/completions`.
`jq` es opcional: solo sirve para leer la respuesta.

## Llamada 1 · temperature 0.1

```bash
curl -s "$GATEWAY_URL" \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "temperature": 0.1,
    "max_tokens": 60,
    "messages": [
      {"role": "system", "content": "Responde en español, con una sola frase."},
      {"role": "user", "content": "Inventa un nombre para una cafetería."}
    ]
  }' | jq -r '.choices[0].message.content'
```

## Llamada 2 · temperature 1.0

```bash
curl -s "$GATEWAY_URL" \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "temperature": 1.0,
    "max_tokens": 60,
    "messages": [
      {"role": "system", "content": "Responde en español, con una sola frase."},
      {"role": "user", "content": "Inventa un nombre para una cafetería."}
    ]
  }' | jq -r '.choices[0].message.content'
```

Repite cada una tres veces. Con **0.1** los nombres se parecen mucho (o son iguales); con **1.0**
cambian en cada intento. Para código quieres lo primero; para ideas, lo segundo.

## max_tokens corta, no resume

```bash
curl -s "$GATEWAY_URL" \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "auto", "max_tokens": 5,
       "messages": [{"role": "user", "content": "Explica qué es Docker."}]}' \
  | jq '{texto: .choices[0].message.content, fin: .choices[0].finish_reason, modelo: .model, uso: .usage}'
```

`fin` sale `"length"`: el modelo no «se ajustó» a 5 tokens, se le cortó la frase. Con espacio
suficiente sale `"stop"`. Mira también `modelo` (cuál eligió `auto`) y `uso` (tokens de entrada y
de salida, que es lo que gasta tu cuota).

## Errores típicos

| Respuesta | Causa |
|---|---|
| `401` | Falta `GATEWAY_API_KEY` o no es válida (`echo $GATEWAY_API_KEY`) |
| `Connection refused` | No hay gateway en esa URL: revisa `GATEWAY_URL` o levanta el gateway de nuevo |
| `429` | Cuota agotada en todos los modelos de la cadena: espera o baja `max_tokens` |
