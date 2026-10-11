---
name: ux-flujos
description: Diseña o revisa el flujo de una tarea de usuario: mapa de tareas, camino feliz y caminos de error, principios de usabilidad, microcopy en español claro, estados vacíos útiles, carga percibida (esqueletos, actualización optimista) y, para asistentes conversacionales, turnos, confirmación de acciones y mostrar lo que escuchó el micrófono antes de actuar. Úsalo cuando pidan "flujo", "experiencia", "UX", "pasos", "onboarding", "wizard", "asistente", "chatbot", "avatar", "voz", "el usuario se pierde", "textos de la interfaz", "mensajes de error" o "qué pasa si falla".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Flujos de experiencia: tareas, errores y conversación

## Cuándo usar

- Antes de dibujar pantallas: cuando hay una tarea ("registrar una valorización", "matricular a un alumno", "pedir al avatar que programe una clase") y todavía no está claro cuántos pasos tiene.
- Al revisar un flujo donde el usuario abandona, repite acciones o pregunta "¿se guardó?".
- Al escribir los textos de la interfaz: botones, errores, estados vacíos, confirmaciones.
- Al diseñar la conversación de un asistente o avatar con voz: qué dice, cuándo pregunta, cuándo actúa.
- No lo uses para elegir el componente concreto (`ui-componentes`) ni para su aspecto (`diseno-visual`).

## Principios (máximo 7)

1. **Visibilidad del estado.** El usuario siempre sabe dónde está, qué está pasando y qué viene. Toda espera mayor de 300 ms se muestra; toda acción deja una confirmación.
2. **Control del usuario.** Se puede cancelar, deshacer y volver. Nada destructivo ocurre sin un paso explícito; nada irreversible sin aviso.
3. **Prevención antes que corrección.** Mejor un campo que sólo acepta números que un error "formato inválido". Mejor valores por defecto sensatos que campos vacíos.
4. **Reconocer antes que recordar.** Las opciones se ven; no hay que memorizar códigos, atajos ni el nombre exacto de la partida. Lo reciente aparece primero.
5. **Consistencia.** Misma palabra para la misma cosa en toda la app ("Guardar", no a veces "Grabar"). Mismo lugar para la misma acción.
6. **El camino feliz es corto; los caminos de error tienen salida.** Cada error dice qué pasó, por qué y qué hacer, y ofrece la acción para resolverlo.
7. **El asistente confirma antes de actuar.** Para cualquier acción con efecto (crear, enviar, borrar, pagar), el asistente repite lo que entendió y espera un sí.

## Procedimiento paso a paso

1. Escribe la tarea en una frase con sujeto, verbo y objeto: "El residente de obra registra el avance diario de una partida".
2. Lista los datos que necesita la tarea y marca cuáles ya conoce el sistema (usuario, obra, fecha). Lo que el sistema sabe no se pregunta.
3. Dibuja el **mapa de tareas** como lista anidada: tarea, subtareas, decisiones. Si hay más de 7 pasos, divide en etapas con un indicador de progreso.
4. Traza el **flujo feliz**: la secuencia mínima de pantallas y acciones cuando todo sale bien. Cuenta los toques. Elimina cada paso que no aporte una decisión del usuario.
5. Traza los **flujos de error** para cada paso: dato inválido, sin conexión, permiso denegado, conflicto (otro usuario lo cambió), tiempo agotado, servidor caído. Para cada uno define: qué ve el usuario, qué puede hacer, qué se conserva.
6. Define los **estados vacíos**: primera vez (sin datos), sin resultados de búsqueda o filtro, y sin permiso. Cada uno con una frase de contexto y una acción.
7. Define la **carga percibida**: menos de 300 ms, nada; 300 ms a 2 s, esqueleto con la forma del contenido; más de 2 s, barra o texto de progreso con lo que está pasando. Para acciones pequeñas y reversibles (marcar, renombrar, mover) usa actualización optimista con reversión si falla.
8. Escribe el **microcopy** de cada pantalla: título, botones con verbo, mensajes de error, confirmaciones. Revísalo con la tabla de la sección "Microcopy".
9. Si hay asistente conversacional, diseña los **turnos**: saludo breve con lo que puede hacer, pregunta una cosa a la vez, muestra lo que entendió, confirma antes de actuar, cierra con el resultado y el siguiente paso posible.
10. Si hay voz, añade el **eco del micrófono**: la transcripción aparece en pantalla en tiempo real, se puede corregir, y el asistente actúa sólo después de que el texto esté estable y, si hay efecto, confirmado.
11. Recorre todo el flujo en voz alta como si fueras el usuario con menos experiencia. Anota cada punto donde dudas. Arréglalo.
12. Pasa la lista de comprobación.

## Mapa de tareas: formato

```
Tarea: Registrar avance diario de una partida
  1. Elegir obra              [sistema la recuerda; mostrar como contexto, no preguntar]
  2. Elegir partida           [buscador con recientes primero]
  3. Ingresar porcentaje      [numérico, muestra el anterior y el acumulado]
     3a. Error: porcentaje menor al anterior -> aviso, permitir con motivo
  4. Adjuntar foto (opcional) [cámara o galería]
  5. Guardar                  [optimista; si falla, queda en borrador local y se avisa]
  6. Confirmación             [toast "Avance guardado: Cimentación 82 %" + "Deshacer" 6 s]
```

## Microcopy en español claro

| Regla | Mal | Bien |
|---|---|---|
| Botones con verbo y objeto | "OK", "Aceptar", "Enviar" | "Guardar avance", "Eliminar partida", "Matricular" |
| Errores: qué, por qué, cómo | "Error 422" | "No se guardó el avance: el porcentaje (70 %) es menor al anterior (82 %). Corrígelo o indica un motivo." |
| Hablar de "tú" o neutro, nunca mezclar | "Ingrese su clave y luego confirmas" | "Ingresa tu clave y confírmala" |
| Sin culpa | "Contraseña incorrecta. Intento fallido." | "La contraseña no coincide. Revisa las mayúsculas." |
| Sin tecnicismos de sistema | "Null reference", "timeout", "token expirado" | "Faltó un dato", "Tardó demasiado; vuelve a intentar", "Tu sesión terminó; inicia sesión otra vez" |
| Confirmaciones destructivas nombran el objeto | "¿Está seguro?" | "¿Eliminar la partida 'Cimentación'? Se perderán 14 avances registrados." |
| Estados vacíos con acción | "No hay datos" | "Aún no hay avances en esta obra. Registra el primero con el botón de abajo." |
| Esperas con causa | "Cargando…" | "Calculando la valorización de octubre…" |
| Números con formato local | "148200.5" | "S/ 148 200,50" o "S/ 148,200.50" (elige uno y mantenlo) |
| Fechas legibles | "2026-10-10T15:00Z" | "Hoy 10:00" / "vie 10 oct, 10:00" |

Evita mayúsculas gritando, puntos suspensivos en botones y exclamaciones. Un signo de pregunta por pregunta. Nada de "¡Ups!".

## Estados vacíos

- **Primera vez**: qué es esta sección, para qué sirve, botón para crear el primer elemento. Opcional: enlace a un ejemplo o a importar.
- **Sin resultados**: repite lo que se buscó ("No hay partidas que contengan 'acero'"), ofrece limpiar filtros y, si aplica, crear con ese nombre.
- **Sin permiso**: dice quién puede dar acceso y cómo pedirlo. No muestra el botón que no se puede usar.
- **Error de carga**: explica en una frase y ofrece "Reintentar". Conserva los filtros.
- Un estado vacío nunca es un hueco blanco ni una tabla con cabecera y cero filas.

## Carga percibida

- 0–300 ms: no muestres nada; un indicador que parpadea es peor que la espera.
- 300 ms–2 s: esqueleto con la silueta exacta del contenido (misma altura, mismas columnas). Nunca un spinner centrado que colapsa el layout.
- Más de 2 s: progreso con pasos nombrados ("Leyendo archivo", "Validando 240 filas", "Guardando") y opción de cancelar.
- Optimista: la interfaz muestra el resultado al instante y guarda en segundo plano. Si falla, revierte y explica. Sólo para acciones reversibles y de bajo riesgo; nunca para pagos, envíos a SUNAT ni borrados.
- Mantén los botones donde estaban: el contenido que llega nunca empuja lo que el usuario estaba a punto de tocar.

## Asistentes conversacionales y voz

- **Apertura**: una frase con lo que sabe hacer y dos o tres sugerencias tocables. No un párrafo.
- **Una pregunta por turno.** Si faltan tres datos, pregunta el más importante primero y rellena el resto con valores por defecto si puede.
- **Eco de comprensión**: antes de actuar, el asistente muestra lo que entendió en forma estructurada ("Programar: Clase de Cálculo I, mar 14 oct, 10:00–12:00, aula B-204") con botones "Confirmar" y "Corregir". Lo que corrige el usuario se reescribe sin repetir todo el diálogo.
- **Confirmación obligatoria** para crear, modificar, borrar, enviar, pagar o notificar a terceros. Consultas y cálculos no la necesitan.
- **Micrófono**: al pulsar, indicador visible de que escucha; la transcripción aparece palabra a palabra en el campo de texto; el usuario puede editarla; el envío ocurre al soltar o al tocar "Enviar", nunca de forma automática al primer silencio si el mensaje tiene efecto.
- **Todo lo que dice el avatar por voz aparece también en texto** en la burbuja, al mismo tiempo. Sin excepciones (ver `accesibilidad`).
- **Interrumpible**: el usuario puede cortar al avatar hablando o tocando. El avatar se detiene en menos de 300 ms.
- **Fallos de comprensión**: tras dos intentos sin entender, ofrece opciones tocables o el formulario tradicional. Nunca un bucle de "No te entendí".
- **Memoria visible**: si el asistente usa contexto anterior ("la misma obra de antes"), lo muestra como chip editable.
- **Cierre**: resultado concreto ("Clase programada. La verás en tu horario del martes.") y siguiente paso opcional.

## Reglas duras (lo que nunca)

- Nunca una acción destructiva o irreversible sin confirmación explícita que nombre el objeto afectado.
- Nunca un asistente que actúe sobre una transcripción de voz sin mostrarla antes en pantalla.
- Nunca un mensaje de error sin la acción para resolverlo.
- Nunca pedir un dato que el sistema ya conoce.
- Nunca un spinner a pantalla completa para cargas menores de 2 s; esqueletos con la forma del contenido.
- Nunca actualización optimista en pagos, envíos fiscales, borrados ni notificaciones.
- Nunca mezclar "tú" y "usted" en la misma app.
- Nunca "¿Está seguro?" como única confirmación.
- Nunca más de una pregunta por turno del asistente.
- Nunca deshabilitar "Guardar" sin explicar qué falta.
- Nunca perder lo que el usuario escribió: ante error, sesión caducada o cierre accidental, el borrador se conserva.

## Lista de comprobación

- [ ] La tarea está escrita en una frase con sujeto, verbo y objeto.
- [ ] El flujo feliz tiene el mínimo de pasos y cada paso es una decisión real del usuario.
- [ ] Hay un flujo de error definido para: dato inválido, sin conexión, sin permiso, conflicto, tiempo agotado.
- [ ] Cada error dice qué pasó, por qué y qué hacer, con la acción al lado.
- [ ] Los tres estados vacíos (primera vez, sin resultados, sin permiso) tienen texto y acción.
- [ ] Las cargas de 300 ms a 2 s muestran esqueleto; las mayores, progreso con pasos.
- [ ] Las acciones optimistas son sólo reversibles y tienen reversión visible.
- [ ] Todos los botones llevan verbo y objeto.
- [ ] Toda confirmación destructiva nombra lo que se destruye y la consecuencia.
- [ ] El tratamiento (tú o usted) es uno solo en toda la app.
- [ ] El asistente muestra lo que entendió y pide confirmación antes de cualquier acción con efecto.
- [ ] La transcripción del micrófono se ve y se puede corregir antes de enviar.
- [ ] Todo lo que el avatar dice por voz aparece en texto al mismo tiempo.
- [ ] Nunca se pierde un borrador por error o cierre.

## Fragmentos

Esqueleto de carga con la forma del contenido (sustituye a la tarjeta mientras llega):

```html
<article class="tarjeta esqueleto" aria-busy="true" aria-label="Cargando avance">
  <div class="esq-linea" style="width:60%"></div>
  <div class="esq-linea" style="width:35%"></div>
  <div class="esq-bloque"></div>
</article>
<style>
  .esq-linea, .esq-bloque { border-radius: 6px; background: linear-gradient(90deg, #e9ecef 25%, #f4f6f8 50%, #e9ecef 75%); background-size: 200% 100%; animation: brillo 1.4s linear infinite; }
  .esq-linea { height: 14px; margin-bottom: 10px; } .esq-bloque { height: 72px; }
  @keyframes brillo { to { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { .esq-linea, .esq-bloque { animation: none; } }
</style>
```

Actualización optimista con reversión y aviso:

```js
async function marcarCompletada(tarea, boton) {
  const previo = tarea.completada;
  tarea.completada = !previo; render(tarea);            // 1. la UI cambia al instante
  try {
    await api.patch(`/tareas/${tarea.id}`, { completada: tarea.completada });
    toast(`Tarea "${tarea.nombre}" marcada como ${tarea.completada ? 'completada' : 'pendiente'}`, { accion: 'Deshacer', alHacer: () => marcarCompletada(tarea, boton) });
  } catch (e) {
    tarea.completada = previo; render(tarea);           // 2. si falla, se revierte
    toast(`No se pudo guardar "${tarea.nombre}". Revisa tu conexión.`, { tipo: 'error', accion: 'Reintentar', alHacer: () => marcarCompletada(tarea, boton), persistente: true });
  }
}
```

Eco de comprensión del asistente antes de actuar (HTML de la burbuja de confirmación):

```html
<li class="burbuja burbuja--asistente">
  <p>Entendí esto. ¿Lo programo?</p>
  <dl class="resumen">
    <dt>Clase</dt><dd>Cálculo I</dd>
    <dt>Fecha</dt><dd>mar 14 oct, 10:00–12:00</dd>
    <dt>Aula</dt><dd>B-204</dd>
  </dl>
  <div class="acciones"><button class="boton">Confirmar</button><button class="boton boton--secundario">Corregir</button></div>
</li>
```

## Aprendido en la demo Robo (10-10-2026)

- El eco de comprensión aplica también a lo generado, no solo a lo escuchado. Cuando el flyer sale de un JSON extraído por el LLM, la pantalla muestra esos datos (título, fecha, hora, precio, lugar, ponente) debajo de la imagen con "Corregir" por campo, y regenera solo el flyer, sin repetir el pedido entero. Un modelo pequeño altera horas y adorna títulos; el usuario tiene que verlo antes de compartir.
- Los datos duros no se le confían al modelo: fecha, hora y precio se extraen con regex y mandan sobre el JSON. El flujo lo dice: "Tomé la fecha y la hora de tu mensaje; el título lo propuse yo".
- Carga percibida con modelos locales: 9 s en rápida y hasta 45 s en máxima. Más de 2 s exige texto con lo que está pasando ("Dibujando en calidad máxima... hasta un minuto") y el botón deshabilitado con motivo mientras tanto. El selector de calidad muestra la espera estimada al lado de cada opción.

## Versión corta para modelos pequeños

Sigue estas órdenes al pie de la letra:

1. Escribe la tarea en una frase: quién, qué verbo, qué objeto.
2. Lista los pasos del camino feliz. Quita todo paso que no sea una decisión del usuario.
3. Para cada paso escribe qué pasa si: dato inválido, sin internet, sin permiso, falla el servidor.
4. Cada error dice: qué pasó, por qué, qué hacer, y tiene un botón para hacerlo.
5. No preguntes lo que el sistema ya sabe (usuario, fecha, obra actual).
6. Botones con verbo y objeto: "Guardar avance", no "OK".
7. Confirmación destructiva: nombra el objeto y la consecuencia. Nunca solo "¿Está seguro?".
8. Pantalla sin datos: una frase de qué va aquí y un botón para crear el primero.
9. Espera de 300 ms a 2 s: esqueleto gris con la forma del contenido. Más de 2 s: texto que dice qué está haciendo.
10. Habla siempre de "tú" (o siempre de "usted"). No mezcles.
11. Asistente: una pregunta por turno. Antes de crear, borrar, enviar o pagar, muestra lo que entendió y pide "Confirmar".
12. Micrófono: muestra la transcripción en pantalla, deja corregirla, y envía solo cuando el usuario toque "Enviar".
13. Todo lo que el avatar dice en voz también se escribe en una burbuja.
14. Nunca pierdas lo que el usuario escribió: guarda borrador si falla algo.
