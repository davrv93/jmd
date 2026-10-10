---
id: ej-plan-y-obra
title: "Plan de trabajo y obra en vivo"
summary: Un PLAN_TRABAJO.md de seis tareas con criterio sí o no, y la pantalla de obra que lo sigue mientras el agente trabaja.
tags: [plan-de-trabajo, obra-en-vivo, skills, opencode]
level: básico
lesson: pa-02
order: 9
---
Dos skills trabajan juntas: `plan-de-trabajo` convierte el pedido en tareas que se pueden
probar, y `obra-en-vivo` muestra el avance en una pantalla que se refresca sola. El agente
mantiene las dos; tú verificas.

## 1. Pide el plan

Con los skills instalados (`bash instalar.sh .`), en OpenCode o Claude Code:

```text
modo piedra
Usa plan-de-trabajo. Quiero un asistente para una tienda de ropa que responda horarios,
envíos, cambios y tallas. Seis tareas de 15 minutos, cada una con criterio de aceptación
que responda sí o no. Escríbelo en PLAN_TRABAJO.md.
```

## 2. Lo que debe salir

`PLAN_TRABAJO.md` con esta forma (acortado):

```markdown
# PLAN DE TRABAJO: Asistente de la tienda de ropa

Estados válidos: pendiente · en curso · hecha · bloqueada (motivo)
Avance: 0 de 6 tareas hechas (0 %)
Comando de avance: `python3 obra/obra.py paso "<texto>" --pct <pct>`

## Fase 1: Asistente que responde el corpus de la tienda
Hito: mostrar a un compañero, en 3 minutos, el asistente respondiendo por voz una pregunta de envíos.

| ID | Tarea | Criterio de aceptación | Depende de | Estado | Cerrada |
|----|-------|------------------------|------------|--------|---------|
| T1 | Cargar el corpus de la tienda en faq.json | `curl` a `/api/chat` con Ollama apagado devuelve `fuente: "faq"` para «hacen envíos» | — | pendiente | |
| T2 | Cambiar nombre y saludo del asistente | Al abrir `http://localhost:8765` saluda «Hola, soy Ropa Bot» | T1 | pendiente | |
| T3 | Responder tres preguntas del dominio | horario, envíos y cambios devuelven la respuesta del corpus; «¿venden zapatos?» devuelve «No estoy seguro» | T1 | pendiente | |
| T4 | Transcribir el micrófono a texto | Grabar «¿cuál es el horario?» en Chrome muestra ese texto antes de enviar | — | pendiente | |
| T5 | Generar el flyer de la liquidación | Título, «sábado 18 de octubre», «10 am» y «S/ 20» salen exactos en la imagen y en `datos` | T1 | pendiente | |
| T6 | Pasar pruebas de uso con otro equipo | Hoja con 3 tareas, severidad por hallazgo y una mejora propuesta | T3, T5 | pendiente | |

## Registro de avance
| Fecha y hora | Qué se cerró | Quién lo vio | Observación |

## Fuera de alcance (apareció durante la ejecución)
```

Revisa la columna del criterio antes de aceptar. Si lees «funciona», «está listo» o «se ve
bien», devuélvelo: eso no es un criterio.

## 3. Inicia la obra

```bash
cd taller-agentico
python3 obra/obra.py iniciar "Asistente de la tienda" --pasos \
  "Cargar el corpus" "Nombre y saludo" "Tres preguntas del dominio" \
  "Micrófono a texto" "Flyer de la liquidación" "Pruebas de uso"
python3 obra/obra.py servir &
```

Salida esperada:

```text
Obra iniciada: Asistente de la tienda (6 pasos) -> /ruta/taller-agentico/obra/estado.json
Obra en http://localhost:8787/obra.html
Estado en http://localhost:8787/estado.json
```

Abre `http://localhost:8787/obra.html` en Chrome y déjalo visible. Si el puerto está ocupado
(`lsof -i :8787`), usa `servir --puerto 8797`.

## 4. Marca los pasos

`paso` hace dos cosas de una vez: cierra como hecho el paso en curso y abre el que coincide por
texto (parcial, sin distinguir mayúsculas).

```bash
python3 obra/obra.py paso "corpus" --fase Backend       # abre T1
# ... el agente carga faq.json y TÚ corres el curl del criterio ...
python3 obra/obra.py paso "saludo" --fase Frontend      # cierra T1, abre T2
python3 obra/obra.py paso "preguntas"
python3 obra/obra.py paso "micrófono"
python3 obra/obra.py paso "flyer"
python3 obra/obra.py paso "pruebas" --fase Pruebas
python3 obra/obra.py hecho                              # cierra T6: barra al 100 %
python3 obra/obra.py ver
```

`ver` imprime en la terminal:

```text
Asistente de la tienda  |  Pruebas
[##############################] 100%
actualizado: 2026-10-15T20:41:07

  [x] 19:52  Cargar el corpus
  [x] 20:04  Nombre y saludo
  [x] 20:16  Tres preguntas del dominio
  [x] 20:23  Micrófono a texto
  [x] 20:35  Flyer de la liquidación
  [x] 20:41  Pruebas de uso
```

Si una tarea falla y el agente se detiene a pedir ayuda:

```bash
python3 obra/obra.py error "whisper no carga: falta PyAV"
```

El paso queda con una cruz. Cuando se resuelve, `paso "micrófono"` lo reabre.

## 5. Errores típicos

| Qué pasa | Por qué | Qué hacer |
|---|---|---|
| La barra avanza y tú no verificaste nada | El agente marcó «hecho» por suposición | Dile: «reabre el paso, no está verificado». La regla es verificar antes de marcar |
| Dos pasos con el mismo texto | `obra.py` viejo; el nuevo reabre en vez de duplicar | Usa el `obra.py` del zip de la clase |
| `No existe .../estado.json` | No corriste `iniciar` | `obra.py iniciar` primero |
| La pantalla no cambia | `servir` no está corriendo, o la URL tiene otro puerto | `lsof -i :8787`; vuelve a lanzar `servir` |
| Un paso dice «integrar TTS en voz.js» | Texto con jerga y nombre de archivo | 60 caracteres, en español, para personas: «Voz del asistente» |
| El agente edita `estado.json` a mano | No usó `obra.py` | Prohibido. Solo `obra.py` escribe ese archivo |
| Siete pasos en la obra y seis tareas en el plan | Añadió trabajo sin anotarlo en el plan | Lo nuevo va al plan con prefijo `(nueva)` o a «Fuera de alcance» |

## Comprobaciones

- `python3 obra/obra.py ver` muestra 6 pasos y la fase actual.
- `curl -s http://localhost:8787/estado.json` devuelve el mismo JSON que ves en pantalla.
- Al terminar, el servidor se apaga (`kill %1` si lo lanzaste con `&`) y `estado.json` queda con
  el estado final. Nunca se borra.
