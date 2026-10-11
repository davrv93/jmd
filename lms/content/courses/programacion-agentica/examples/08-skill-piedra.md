---
id: ej-skill-piedra
title: "Modo piedra: respuestas cortas que ahorran tokens"
summary: Activar y apagar el modo piedra, ver tres respuestas antes y después, y saber cuándo no usarlo.
tags: [skills, piedra, tokens, opencode, claude-code]
level: básico
lesson: pa-02
phase: conceptualizacion
order: 8
---
**Piedra** es una de las 14 skills del taller. Cambia **cómo responde** el agente, no cómo
piensa ni cómo escribe código. Quita cortesías, conectores y artículos; deja exactas las cifras,
las rutas, los comandos y las negaciones.

## 1. Qué cambia

| Se quita | Se conserva tal cual |
|---|---|
| Saludos, agradecimientos, «claro», «por supuesto» | Negaciones y restricciones: no, nunca, solo, excepto, sin, ni |
| «A continuación te explico», «si necesitas algo más» | Números con su unidad (`2,5 s`, `4 GB`) |
| Artículos cuando la frase se entiende igual | Rutas, comandos y mensajes de error, entre comillas invertidas |
| Conectores decorativos: «además», «por otro lado» | Todos los pasos de una secuencia (si son cinco, van cinco) |
| Repetir lo que acabas de decir | Las sugerencias, convertidas en órdenes: «Ejecuta», «Cambia» |

Frases de 20 palabras como máximo. Un fragmento vale como frase: «Falla en línea 42. Variable
sin inicializar.» está completo.

## 2. Instalar

Si corriste `bash instalar.sh .` en la carpeta del taller, ya la tienes. Si no:

```bash
cd taller-agentico
bash instalar.sh .          # copia skills/piedra a ~/.claude/skills y genera prompts/piedra.txt
```

Para OpenCode, la skill queda en `~/.claude/skills/piedra/SKILL.md` (OpenCode también lee esa
ruta) y su versión corta dentro de `AGENTS.md`. Para Ollama, el system prompt está en
`prompts/piedra.txt`.

## 3. Activar y desactivar

```text
/piedra              → «Modo piedra activo.»
modo piedra          → lo mismo
piedra lite          → solo quita cortesías; conserva artículos y frases completas
piedra dura          → 12 palabras por frase, sin ejemplos, una alternativa por decisión
modo normal          → «Modo normal activo.»
```

Queda activo hasta que digas «modo normal». Pruébalo:

```bash
opencode
# dentro: «modo piedra»  y después  «¿está corriendo el contenedor del backend?»
```

## 4. Tres pares antes y después

**Pregunta: «¿Está corriendo el contenedor del backend?»**

> Antes: «Claro, he revisado el estado de los contenedores y parece que el backend está
> corriendo correctamente desde hace unas tres horas, así que no debería haber ningún problema
> por ese lado.»
>
> Piedra: «Sí. `docker ps` muestra `Up 3 hours`.»

**Pregunta: «¿Por qué falla la instalación?»**

> Antes: «Por lo que veo en el error, podría tratarse de que falta un módulo. Te sugeriría que
> consideres volver a instalar las dependencias con `npm ci`, lo cual probablemente lo
> resuelva.»
>
> Piedra: «Falta módulo `fastapi`. Ejecuta `pip install -r osito/backend/requirements.txt`.
> Vuelve a arrancar.»

**Pregunta: «¿Qué hago para cambiar el nombre del asistente?»**

> Antes: «Para cambiar el nombre tienes un par de opciones. Por un lado, puedes usar la
> variable de entorno `OSITO_NOMBRE` al arrancar el backend, y por otro lado el frontend acepta
> el parámetro `nombre` en la URL. Además, el saludo está en el archivo app.js…»
>
> Piedra: «Backend: `OSITO_NOMBRE="Tienda Bot" bash osito/arrancar.sh`. Pantalla:
> `http://localhost:8765/?nombre=Tienda%20Bot`. Saludo: edita `Hola, soy` en
> `osito/frontend/app.js`.»

Fíjate en que ninguna respuesta en piedra perdió un dato: ni un comando, ni una ruta, ni un
«no». Si una se lo lleva, está mal hecha aunque sea corta.

## 5. Por qué ahorra

Un agente gasta tokens de **salida** en cada turno, y los tokens de salida son los más caros y
los más lentos de generar. En una sesión de dos horas con cuota gratuita, piedra puede ser la
diferencia entre terminar el plan y quedarte sin cuota a la mitad. Y lees menos: una respuesta
de dos líneas se verifica más rápido que una de dos párrafos.

## 6. Cuándo NO usarlo

- **Nada que vaya a leer otra persona que no pidió el modo**: documentación, correos, el
  `REFLEXION.md` de tu tarea, mensajes a tu equipo.
- **Código y mensajes de commit**: piedra vive solo en el turno de conversación. El código sale
  siempre en prosa normal, con sus comentarios completos.
- **Antes de borrar, sobrescribir, desplegar o enviar algo**: el agente debe escribir frases
  completas y pedir confirmación. Si piedra está activo, se apaga sola para ese tramo.
- **Cuando no entendiste**: di «no entendí» y el agente vuelve a frases completas hasta que
  digas que entendiste.
- **Junto con `caveman`** (clase 1): es la misma idea y el recorte se aplica dos veces. Deja una.

## Comprobaciones

- Activa piedra y pide los pasos para instalar Ollama: deben salir **todos** los pasos, no
  tres de cinco.
- Pide que borre una carpeta: la respuesta debe volver a prosa completa y pedir confirmación.
- Di «modo normal»: debe responder «Modo normal activo.» y nada más en ese turno.
