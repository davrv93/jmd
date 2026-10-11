---
id: ej-wireframe-gris
title: "Wireframe en gris en 15 minutos"
summary: Qué pedirle al agente, la plantilla de FLUJOS.md con flujo feliz y dos de error, y la lista de comprobación antes de pasar a UI.
tags: [ux, wireframe, skills]
level: básico
lesson: pa-03
phase: conceptualizacion
order: 13
---
Un wireframe es la pantalla en cajas grises con etiquetas. Decide **qué hay y en qué orden**, no
cómo se ve. Aquí lo haces en tres pasos con el agente: los flujos primero, el dibujo después, y
una lista para saber si está terminado.

## 1. Pide los flujos antes que el dibujo

Con los skills `ux-flujos` y `ui-componentes` instalados (`taller-agentico.zip`), en OpenCode:

```
Usa el skill ux-flujos. El sistema es un asistente de WhatsApp para una tienda
(pedidos, precios, stock) con un panel llamado Bandeja para el operador. Escribe
FLUJOS.md con la plantilla del skill: la tarea en una frase, el mapa de tareas, el
flujo feliz y dos flujos de error: «número desconectado» y «el modelo no responde».
No dibujes nada todavía.
```

Lee el resultado. Si el flujo feliz tiene más de cinco pasos, pide que lo recorte.

## 2. Plantilla de FLUJOS.md

```markdown
# Flujos · Bandeja del asistente de la tienda

Tarea: El operador de la tienda revisa las conversaciones de WhatsApp y toma una cuando el bot no basta.

## Mapa de tareas
  1. Ver la lista de conversaciones      [las sin responder, primero]
  2. Abrir una conversación              [mensajes del cliente y del bot, con hora]
  3. Decidir: dejar al bot o tomarla     [interruptor humano/bot, a la vista]
     3a. Tomarla: escribir y enviar      [lo que envía queda registrado igual]
  4. Devolverla al bot                   [mismo interruptor]
  5. Ver el estado del número            [conectado / QR / caído]

## Flujo feliz (4 toques)
  Bandeja -> toca la conversación -> lee -> interruptor a «humano» -> escribe -> «Enviar»
  Confirmación: el mensaje aparece en la conversación con la marca «tú».

## Error 1 · Número desconectado
  Qué pasó: el teléfono de pruebas se desvinculó o se apagó.
  Qué ve el operador: chip rojo «Número desconectado» arriba, con el botón «Ver QR».
  Qué puede hacer: abrir Estado del número, escanear el QR de nuevo.
  Qué se conserva: las conversaciones ya recibidas; los mensajes nuevos llegan al reconectar.

## Error 2 · El modelo no responde
  Qué pasó: Ollama caído o más de 15 s sin respuesta.
  Qué recibe el cliente: «No estoy seguro de eso todavía, te paso con una persona.»
  Qué ve el operador: la conversación marcada «sin responder» y un aviso «Modelo sin respuesta».
  Qué puede hacer: tomar la conversación. Qué se conserva: el mensaje del cliente, siempre.

## Estados vacíos
  Primera vez: «Aún no hay conversaciones. Escribe al número de pruebas para ver la primera.»
  Sin resultados de búsqueda: «Nada con “A-102”. Prueba con el número del cliente.»
```

## 3. Pide el wireframe

```
Usa el skill ui-componentes. A partir de FLUJOS.md genera WIREFRAME.html con tres
pantallas en gris, una debajo de otra: Bandeja, Conversación (con el interruptor
humano/bot y el campo de escribir) y Estado del número (QR / conectado / caído).
Solo cajas con borde gris y etiquetas de texto. Sin color, sin tipografía elegida,
sin datos reales: «Cliente 1», «Último mensaje…». Incluye los estados vacíos.
```

Ábrelo en el navegador. Debe caber la idea completa en una mirada.

## Lista de comprobación

- [ ] La tarea está escrita en una frase con sujeto, verbo y objeto.
- [ ] El flujo feliz tiene cinco pasos o menos y cada paso es una decisión del operador.
- [ ] Los dos errores dicen qué pasó, qué ve el usuario, qué puede hacer y qué se conserva.
- [ ] Cada error tiene su acción al lado (un botón, no solo un texto).
- [ ] Hay tres pantallas como máximo.
- [ ] El interruptor humano/bot está en la conversación, no escondido en ajustes.
- [ ] Los estados vacíos tienen una frase y una acción.
- [ ] No hay color ni tipografía final en el wireframe.
- [ ] Todo botón lleva verbo y objeto («Tomar conversación», no «OK»).
- [ ] El tratamiento es siempre «tú».

Si algo no se marca, corrige en gris. Es más barato que corregirlo con color.
