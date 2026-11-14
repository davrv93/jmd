# REVIEW · QA Bots v2 (90 s, 1920×1080, 30 fps)

## Lo que se revisó (capturas en .hyperframes/artifacts/snapshots)
- f0 (0.5 s): escritorio iluminado, iMac/MacBook/iPhone/iPad macro, reloj 23:47. No negro.
- 4 s: «Sacar a producción.» en dos líneas a la izquierda; terminal del deploy avanza.
- 8.6–9 s: ALERTA en rojo sobre el iMac, banners apilados en el iPhone, badge 12, sacudida 6 px.
- 11.8 s: velo, iPad grande con el ticket (17.01 cobrado, 5.00 ingresado) y «y las que nadie vio».
- 24 s: red de neuronas (soma, dendritas, axones, impulsos), «La IA no duerme.»
- 23 s: EXPLORA, iMac con 4 cursores-bot con nombre recorriendo la UI.
- 30 s: VIGILA, iPhone con mensaje de WhatsApp rojo y adjunto de evidencia.
- 36–38.3 s: REPARA, tarjeta de PR; el cursor pulsa «Aprobar y fusionar» → «Fusionado ✓».
- 44 s: claim en tres líneas; 50 s: JMD Learning; 57 s: QA Bots + fechas; 59 s: WhatsApp.

## Sonido
- Narración gpt-audio «onyx» vía OpenRouter (es, grave, pausada), 8 líneas = 79 s, es el reloj del montaje. Archivos en assets/voz/gr/.
- SFX con causa: typing (deploy), notification ×2 + error + glitch (alarmas), ping (ticket), riser hasta el cosmos,
  whoosh (cambio de mundo), pop (etapas), notification (WhatsApp), click (Aprobar), impact (marca).
- Música: piano solo generado con Lyria 3 Pro vía OpenRouter (118 s, assets/musica/piano.mp3), a 0.16 bajo la voz, fundido de salida 4 s. Versión de 70 s guardada como piano-70s.mp3.
- Medido, no escuchado: verificar con `npx hyperframes audio out/*.mp4 --json`.

## Avisos aceptados de `check`
- Texto pequeño dentro de pantallas de dispositivos (banners, horas): textura, no lectura; marcado `data-layout-ignore` donde aplica.
- `line_unread` en burbuja de WhatsApp, PR y ticket: se leen como objetos, la voz dice lo que importa.
- Canvas toca los bordes: es el fondo de estrellas.

## Pendiente si se quiere subir el nivel
- Música de cama a 0.14 bajo la voz.
- Logo real de JMD Learning en el cierre (hoy es el nombre en Outfit 800).
- Voz: ef_dora es neutra; una voz clonada o HeyGen daría más calidez.
