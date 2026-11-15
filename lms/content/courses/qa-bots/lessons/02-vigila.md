---
id: qab-02
title: "Sesión 2 · Vigila: cada fallo a tu WhatsApp con la evidencia"
published: true
starts_at: 2026-11-22T15:00:00-05:00
duration: 90
objectives:
  - id: qab-02-o1
    title: "Dejar un robot que corre la suite todo el día, con una página de estado para el equipo"
  - id: qab-02-o2
    title: "Mandar cada caída y cada fallo nuevo a WhatsApp por webhook, con captura y pasos"
  - id: qab-02-o3
    title: "Avisar solo cuando algo cambia: fallo nuevo, conocido o resuelto"
recording:
  url: ""
  passcode: ""
materials:
  - id: kit
    title: "Kit de práctica (con los bots y el robot)"
    kind: zip
    file: materials/qa-bots-kit.zip
    objective_ids: [qab-02-o1, qab-02-o2]
  - id: wa-cloud
    title: "WhatsApp Cloud API: enviar mensajes"
    kind: doc
    url: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
    objective_ids: [qab-02-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo el domingo de 3:00 a 4:30 p. m. (hora de Lima) o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: robot
    title: Encender el robot
    tool: terminal
    phase: experiencia
    description: "`CADA_MIN=5 BASE_URL=https://jmd-learn.online/tienda-sol/ node robot/robot.mjs` y abre http://localhost:3200."
    check: El semáforo muestra al menos dos corridas en la tira de las últimas 24 h
  - id: alerta
    title: Recibir la primera alerta
    tool: terminal
    phase: experimentacion
    description: "Apunta el vigía o el robot a tu webhook (`node monitoreo/vigia.mjs --webhook=…`), rompe la tienda con el interruptor «Con bugs» y espera el mensaje."
    check: Llega a tu WhatsApp un mensaje con la regla rota y la captura
  - id: reglas
    title: Decidir cuándo avisar
    tool: lms
    phase: conceptualizacion
    description: Escribe en el hilo tu regla de alertas para que el chat no se inunde (qué avisas, a quién y cada cuánto).
    check: Tu regla aparece en el hilo de la sesión
---

## Objetivo

Que te enteres antes que tu cliente. Las pruebas E2E revisan antes de desplegar; el robot las repite
después, todo el día, y avisa cuando algo se rompe aunque nadie haya tocado el código: un cambio de datos,
un servidor caído, un certificado vencido.

## Tres piezas

1. **El robot** corre la suite cada N minutos y publica una página con el semáforo, la tira de 24 h y la
   película paso a paso de cada prueba que falla.
2. **El vigía** consulta `/salud` y avisa solo cuando el estado cambia: de arriba a caído y de caído a
   arriba.
3. **El webhook** recibe el aviso y lo reenvía a WhatsApp: por la WhatsApp Cloud API de Meta, por Twilio o
   por una pasarela propia.

## Un aviso que sirve

Un buen mensaje dice qué se rompió, dónde y cómo verlo: la regla, la pantalla, la hora y el enlace a la
captura o a la película. Los fallos ya conocidos no vuelven a sonar; el aviso de «resuelto» cierra el ciclo.

Ojo con WhatsApp: los mensajes automáticos fuera de la ventana de 24 horas requieren plantillas aprobadas.

## Entregable 2

La URL (o captura) de tu página de estado con el robot corriendo y la captura del mensaje que te llegó a
WhatsApp cuando rompiste la tienda.
