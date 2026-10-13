---
name: s3-prototipo
description: Convierte el wireframe de la bandeja del chatbot en un prototipo navegable en HTML estático (sin backend ni JavaScript): bandeja, conversación, estado del número y las pantallas de error, enlazadas con anclas y con el color, el logo y el fondo del negocio. Sirve para probar el flujo con una persona antes de programar. Palabras gatillo: prototipo, maqueta navegable, mockup, HTML estático, clic a clic, probar el flujo, :target, de wireframe a UI.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · Prototipo navegable (HTML estático)

## Cuándo usar

Después de `s3-wireframe` y antes de `s3-front-lit`. El prototipo se hace con datos inventados y SIN JavaScript: cada pantalla es una `<section id>` y los botones son enlaces `#id`. Así se prueba el flujo en 5 minutos y nada se rompe.

## Pasos

1. Lee `/trabajo/chatbot/FLUJOS.md` y `/trabajo/chatbot/wireframe/index.html`. Cada pantalla y cada error del wireframe será una sección.
2. Comprueba que existen `/trabajo/chatbot/recursos/logo-bot.svg` y `fondo-chat.svg` (si no: `cp -R /trabajo/plan-chatbot/recursos /trabajo/chatbot/`).
3. Crea `/trabajo/chatbot/prototipo/index.html` con este esqueleto. Cambia `--marca` por el color del negocio y los textos por los del negocio:
   ```html
   <!doctype html>
   <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
   <title>Prototipo · bandeja</title>
   <style>
     :root { --marca: #0f766e; --texto: #1c2227; --tenue: #5b6670; --borde: #d7dde2; --saliente: #d9f2ec; --aviso: #ffd166; }
     body { margin: 0; font: 15px/1.45 system-ui, sans-serif; color: var(--texto); background: #f6f7f9; }
     header { display: flex; gap: .6rem; align-items: center; padding: .6rem 1rem; background: var(--marca); color: #fff; }
     header img { width: 32px; } header h1 { font-size: 1.1rem; margin: 0; flex: 1; }
     section { display: none; max-width: 40rem; margin: 0 auto; min-height: 70vh; background: #fff; }
     section:target, body:not(:has(section:target)) #bandeja { display: block; }
     a.fila { display: flex; justify-content: space-between; gap: .5rem; padding: .8rem 1rem; border-bottom: 1px solid var(--borde); color: inherit; text-decoration: none; }
     .etiqueta { font-size: .75rem; padding: .1rem .5rem; border-radius: 999px; border: 1px solid var(--borde); align-self: flex-start; }
     .persona { background: var(--aviso); border-color: transparent; }
     .chat { background: url(../recursos/fondo-chat.svg); padding: 1rem; display: grid; gap: .5rem; min-height: 50vh; align-content: start; }
     .m { max-width: 80%; padding: .5rem .75rem; border-radius: 12px; background: #fff; }
     .m.sale { justify-self: end; background: var(--saliente); } .m.error { outline: 2px solid #d64545; }
     .barra { display: flex; gap: .5rem; padding: .6rem 1rem; border-bottom: 1px solid var(--borde); align-items: center; }
     .boton { padding: .45rem .9rem; border-radius: 8px; background: var(--marca); color: #fff; text-decoration: none; }
     .boton.sec { background: transparent; color: inherit; border: 1px solid var(--borde); }
     a:focus-visible { outline: 3px solid var(--marca); outline-offset: 2px; }
     nav { display: flex; flex-wrap: wrap; gap: .5rem; padding: 1rem; justify-content: center; }
   </style></head><body>
   <header><img src="../recursos/logo-bot.svg" alt=""><h1>Bandeja del bot</h1><a class="boton sec" style="color:#fff" href="#numero">● Conectado</a></header>
   <section id="bandeja" aria-label="Bandeja">
     <a class="fila" href="#conversacion"><span><b>Ana</b><br>¿Hacen delivery?</span><span class="etiqueta">Bot · 1</span></a>
     <a class="fila" href="#conversacion-persona"><span><b>Luis</b><br>Quiero hablar con una persona</span><span class="etiqueta persona">Persona</span></a>
   </section>
   <section id="conversacion" aria-label="Conversación con Ana">
     <div class="barra"><a href="#bandeja">← Volver</a><b style="flex:1">Ana</b><a class="boton sec" href="#conversacion-persona">Responde: bot · Tomar conversación</a></div>
     <div class="chat"><div class="m">¿Hacen delivery?</div><div class="m sale">Hola, soy Lía, el asistente virtual (un bot). Sí, en Miraflores y San Isidro.</div></div>
   </section>
   <section id="conversacion-persona" aria-label="Conversación tomada por una persona">
     <div class="barra"><a href="#bandeja">← Volver</a><b style="flex:1">Luis</b><a class="boton sec" href="#conversacion">Responde: persona · Devolver al bot</a></div>
     <div class="chat"><div class="m">Quiero hablar con una persona</div><div class="m sale">Te paso con una persona del equipo.</div>
       <div class="m sale error">Hola Luis, soy Ana. <small>· no se envió</small></div></div>
   </section>
   <section id="numero" aria-label="Estado del número"><div class="barra"><b>Número sin vincular</b></div>
     <p style="padding:1rem">Escanea el QR desde WhatsApp › Dispositivos vinculados › Vincular un dispositivo.</p>
     <div style="margin:1rem auto;width:200px;height:200px;background:#e5e5e5;display:grid;place-items:center">QR</div>
     <nav><a class="boton" href="#bandeja">Ya lo escaneé</a><a class="boton sec" href="#caido">Simular caída</a></nav></section>
   <section id="caido" aria-label="Número caído"><div class="barra"><b>● Caído, reintentando cada 5 s</b></div>
     <p style="padding:1rem">Evolution no responde. Si sigue así un minuto, avisa al instructor.</p><nav><a class="boton" href="#numero">Pedir otro QR</a></nav></section>
   <nav aria-label="Pantallas"><a href="#bandeja">Bandeja</a><a href="#conversacion">Conversación</a><a href="#conversacion-persona">Persona</a><a href="#numero">Número</a><a href="#caido">Caído</a></nav>
   </body></html>
   ```
4. Ábrelo en el visor: `chatbot/prototipo/index.html`. Recorre el flujo feliz y los errores con el ratón y después solo con Tab y Enter. Prueba «Móvil» (393 px): sin barra horizontal.
5. Pide a un compañero que haga una tarea («toma la conversación de Luis») sin explicarle nada. Anota dónde dudó y corrige ANTES de programar.

## Ejemplo real

El prototipo de la panadería tiene 5 secciones y 15 enlaces. Si en la prueba un compañero no entiende «Tomar conversación» como interruptor, cámbialo a «Responde: bot · Tomar conversación», que dice el estado y la acción.

## Errores típicos

- Pantalla en blanco al abrir: falta la regla `body:not(:has(section:target)) #bandeja { display: block; }`.
- El fondo o el logo no aparecen: la ruta es `../recursos/...` porque el prototipo está en una subcarpeta.
- Usar JavaScript o `fetch`: no hace falta; el prototipo no habla con el backend.
- Botones `<button>` sin destino: en el prototipo todo es `<a href="#...">`.
- Comprobación rápida: `grep -o 'href="#' /trabajo/chatbot/prototipo/index.html | wc -l` debe dar 10 o más.

## Versión corta para modelos pequeños

1. Un solo archivo `prototipo/index.html`, sin JavaScript.
2. Cada pantalla es `<section id="...">`; se muestra con `section:target`.
3. Pantallas: bandeja, conversacion, conversacion-persona, numero, caido.
4. Color del negocio en `--marca`; logo y fondo desde `../recursos/`.
5. Pruébalo en el visor a 393 px y con Tab.
