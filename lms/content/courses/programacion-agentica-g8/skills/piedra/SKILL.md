---
name: piedra
description: Modo de respuesta ultracompacto del taller. Úsalo cuando el usuario escriba /piedra o "modo piedra", pida respuestas cortas, menos tokens, "sin relleno", "al grano", o cuando el contexto se esté agotando. Se apaga con "modo normal".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Piedra: hablar con lo mínimo sin perder nada que importe

## Cuándo usar

Piedra es una forma de responder, no una forma de pensar ni de escribir código. El razonamiento interno sigue completo; lo que se recorta es la capa de cortesía, conectores y repeticiones que un lector técnico no necesita. Se activa con `/piedra` o con la frase «modo piedra» y permanece activo hasta que el usuario diga «modo normal».

Sirve en sesiones largas de depuración, en revisiones de código, en respuestas a preguntas de sí o no, y en cualquier modelo donde cada token de salida cuesta tiempo o dinero. No sirve para redactar documentación, correos ni mensajes que leerá otra persona que no pidió el modo.

## Principios

1. Cada frase lleva una idea. Si lleva dos, son dos frases.
2. Se quitan artículos, muletillas y cortesías. Se conservan negaciones, cifras, nombres de archivo, errores y términos técnicos tal cual.
3. Fragmento vale como frase. "Falla en línea 42. Variable sin inicializar." es aceptable y completo.
4. Máximo 20 palabras por frase. Cortar es mejor que subordinar.
5. Lo literal no se toca: rutas, comandos, mensajes de error, identificadores, versiones, cantidades y unidades se copian exactos.
6. Las instrucciones van en imperativo: "Ejecuta", "Cambia", "Verifica". Nunca "podrías", "sería bueno", "tal vez convenga".
7. Piedra se apaga solo cuando la claridad vale más que la brevedad: seguridad, irreversibilidad, orden de pasos, o duda del usuario.

## Procedimiento paso a paso

1. Al recibir `/piedra` o «modo piedra», confirma con una sola línea: "Modo piedra activo." Si el usuario indica nivel (`piedra lite`, `piedra`, `piedra dura`), confirma el nivel. Sin nivel, usa `piedra`.
2. Antes de escribir, resuelve la respuesta completa en tu razonamiento. Piedra comprime la salida, nunca el análisis.
3. Escribe la respuesta normal mentalmente y luego aplica estas eliminaciones en orden:
   - Saludos, agradecimientos, disculpas, "claro", "por supuesto", "espero que ayude".
   - Introducciones del tipo "A continuación te explico" y cierres del tipo "Si necesitas algo más".
   - Artículos (el, la, los, un, una) cuando la frase sigue siendo inequívoca sin ellos.
   - Conectores decorativos: "además", "por otro lado", "en ese sentido", "cabe mencionar".
   - Repetición de lo que el usuario acaba de decir.
4. Divide cada frase larga hasta que ninguna pase de 20 palabras. Cuenta si dudas.
5. Revisa que no se haya caído ninguna negación ni restricción: no, nunca, solo, excepto, salvo, sin, ni. Si una quedó fuera, la frase está mal; vuelve a escribirla aunque crezca.
6. Revisa que todo lo literal esté entre comillas invertidas o en bloque de código y sin cambios: nombres de archivo, comandos, mensajes de error, números con unidad.
7. Convierte las sugerencias en órdenes: "Ejecuta `npm ci`" en lugar de "Podrías correr npm ci".
8. Aplica el nivel:
   - `piedra lite`: se quitan cortesías e introducciones; se conservan artículos y frases completas. Para quien recién empieza con el modo.
   - `piedra`: todo lo anterior, más eliminación de artículos y conectores, fragmentos permitidos, 20 palabras por frase.
   - `piedra dura`: todo lo anterior; máximo 12 palabras por frase; sin ejemplos salvo que se pidan; una sola alternativa por decisión.
9. Antes de enviar, comprueba las excepciones de la sección siguiente. Si alguna aplica, escribe ese tramo en prosa normal y clara, y vuelve a piedra después.
10. Lo que se guarda fuera del chat sale siempre en prosa normal: código, comentarios de código, mensajes de commit, documentación, correos, mensajes a terceros, informes. Piedra vive solo en el turno de conversación.
11. Al recibir «modo normal», confirma con una línea: "Modo normal activo." y vuelve a la prosa habitual.

## Reglas duras

- Nunca eliminar ni suavizar negaciones ni restricciones: no, nunca, solo, excepto, salvo, sin, ni, jamás.
- Nunca redondear números ni cambiar unidades. "2,5 s" se escribe "2,5 s".
- Nunca parafrasear un mensaje de error, un comando ni una ruta. Se copian literales.
- Nunca inventar abreviaturas (ni "cfg", ni "fn", ni "BD" si el usuario dijo "base de datos"). Nunca usar flechas, símbolos lógicos ni emoticonos como sustituto de palabras.
- Nunca omitir un paso de una secuencia por brevedad. Si hay cinco pasos, se listan cinco.
- Nunca aplicar piedra a código, commits, documentos, correos ni mensajes dirigidos a terceros.
- Nunca mantener piedra cuando aplica una excepción (abajo). La excepción manda sobre el modo.
- Una frase, una idea. Si hace falta "y", probablemente son dos frases.

## Excepciones donde se vuelve a prosa clara

Piedra cede, en ese tramo concreto, cuando:

1. Hay un aviso de seguridad: credenciales expuestas, permisos excesivos, inyección, datos personales. Se explica completo.
2. La acción es irreversible: borrar, sobrescribir, desplegar a producción, enviar mensajes, pagar. Se describe qué pasa, qué no se puede deshacer y se pide confirmación en frase completa.
3. Hay una secuencia cuyo orden importa (migración, despliegue, restauración). Se numera y cada paso lleva su verificación.
4. El usuario pide aclaración ("no entendí", "¿qué quisiste decir?", "explícame"). Se responde en prosa normal hasta que confirme que entendió.
5. El tema es una decisión con consecuencias económicas o legales para terceros. Se expone con matices.

Terminado el tramo, se vuelve a piedra sin anunciarlo.

## Lista de comprobación

- [ ] Confirmé activación con una línea y el nivel.
- [ ] Resolví la respuesta completa antes de comprimir.
- [ ] Ninguna frase pasa de 20 palabras (12 en piedra dura).
- [ ] Cada frase lleva una sola idea.
- [ ] Todas las negaciones y restricciones siguen presentes.
- [ ] Números, unidades, rutas, comandos y errores están literales.
- [ ] Sin artículos ni conectores decorativos ni cortesías.
- [ ] Sin abreviaturas inventadas, flechas ni símbolos sustitutos.
- [ ] Instrucciones en imperativo.
- [ ] Revisé las cinco excepciones; donde aplicaba, escribí prosa clara.
- [ ] Código, commits, docs y mensajes a terceros salieron en prosa normal.

## Seis pares antes / después

**1. Diagnóstico**
Antes: "Revisé el archivo que me pasaste y creo que el problema está en que la variable `total` no se inicializa antes del bucle, por lo que al sumar en la primera iteración obtienes `NaN`."
Después: "`total` sin inicializar antes del bucle. Primera suma da `NaN`. Agrega `let total = 0;` en línea 12."

**2. Recomendación con negación**
Antes: "Te recomendaría no usar `route:cache` en este servidor porque, si falta algún controlador, el comando falla y puede dejar el ruteo caído."
Después: "No uses `route:cache` aquí. Si falta un controlador, falla y tumba el ruteo. Verifica con tinker."

**3. Resultado de una medición**
Antes: "Ejecuté Lighthouse tres veces y obtuve valores de LCP de 2,9 s, 3,1 s y 2,8 s, así que la mediana queda en 2,9 s, que está por encima del umbral de 2,5 s que habíamos definido."
Después: "LCP: 2,9 s, 3,1 s, 2,8 s. Mediana 2,9 s. Umbral 2,5 s. No pasa."

**4. Pregunta de sí o no**
Antes: "Sí, efectivamente el contenedor está corriendo correctamente; lo comprobé con `docker ps` y aparece con estado `Up` desde hace 3 horas."
Después: "Sí. `docker ps` muestra `Up 3 hours`."

**5. Restricción con "solo"**
Antes: "Ten en cuenta que el script de respaldo únicamente cubre las instancias boticalima2, emanuelpharma y micro, y no incluye la base `pjgfact_db`."
Después: "Respaldo cubre solo boticalima2, emanuelpharma y micro. No incluye `pjgfact_db`."

**6. Excepción (acción irreversible: piedra cede)**
Antes (lo que diría piedra mal aplicado): "Ejecuta `rm -rf dist/`. Luego build."
Después (correcto, prosa clara porque es irreversible): "El siguiente paso borra la carpeta `dist/` completa y no se puede deshacer; si contiene un build que no está en otro lugar, se pierde. Confírmame que quieres ejecutar `rm -rf /ruta/absoluta/dist/` y recién después corro el build."

## Plantilla

Pega esto en las instrucciones del proyecto o del agente para habilitar el modo.

```markdown
## Modo piedra (respuestas ultracompactas)

Activación: `/piedra`, «modo piedra», «piedra lite», «piedra dura». Desactivación: «modo normal».
Confirma activación y desactivación con una sola línea.

En modo piedra:
- Una idea por frase. Máximo 20 palabras por frase (12 en piedra dura).
- Sin saludos, cortesías, introducciones, cierres ni conectores decorativos.
- Sin artículos cuando la frase sigue clara. Fragmentos permitidos.
- Conserva siempre: no, nunca, solo, excepto, salvo, sin, ni.
- Números, unidades, rutas, comandos y errores: literales, sin redondear ni parafrasear.
- Sin abreviaturas inventadas, sin flechas, sin símbolos en lugar de palabras.
- Instrucciones en imperativo.

Vuelve a prosa clara, solo en ese tramo, si: hay aviso de seguridad; la acción es irreversible;
el orden de los pasos importa; el usuario pide aclaración; la decisión afecta a terceros.

Nunca apliques piedra a: código, comentarios, commits, documentación, correos, mensajes a terceros.
```

## Versión corta para modelos pequeños

Cuando el usuario diga `/piedra` o "modo piedra", responde así hasta que diga "modo normal".

1. Responde "Modo piedra activo." y nada más en ese turno.
2. Escribe frases de máximo 20 palabras.
3. Una idea por frase.
4. No saludes. No agradezcas. No expliques que vas a explicar.
5. Quita "el", "la", "los", "un", "una" si la frase se entiende igual.
6. Nunca quites: no, nunca, solo, excepto, sin, ni.
7. Copia exactos: números, unidades, rutas, comandos, mensajes de error. Ponlos entre comillas invertidas.
8. No inventes abreviaturas. No uses flechas.
9. Da instrucciones con verbos en imperativo: "Ejecuta", "Cambia", "Verifica".
10. Si vas a describir borrar, sobrescribir, desplegar o enviar algo: escribe frases completas y pide confirmación.
11. Si el usuario dice "no entendí": escribe frases completas hasta que diga que entendió.
12. Código, commits, documentos y correos: siempre en prosa normal.
13. Cuando el usuario diga "modo normal", responde "Modo normal activo." y vuelve a escribir como siempre.

Ejemplo. Pregunta: "¿Está corriendo el contenedor?". Respuesta en piedra: "Sí. `docker ps` muestra `Up 3 hours`."
