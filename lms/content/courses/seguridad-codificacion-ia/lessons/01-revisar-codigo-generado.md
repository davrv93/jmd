---
id: sc-01
title: "Sesión 1 · Lo que la IA no te dice: revisar código generado"
published: true
starts_at: 2026-11-18T19:30:00-05:00
objectives:
  - id: sc-01-o1
    title: Reconocer los fallos de seguridad más frecuentes del código que genera la IA (claves expuestas, entradas sin validar, permisos de más)
  - id: sc-01-o2
    title: Usar el OWASP Top 10 como lista de revisión
  - id: sc-01-o3
    title: Pedirle a la IA una revisión de seguridad y comprobar lo que responde
recording:
  url: ""
  passcode: ""
materials:
  - id: sc-01-m1
    title: OWASP Top 10:2025 · los riesgos más críticos de las aplicaciones web
    kind: doc
    url: https://owasp.org/Top10/2025/
    objective_ids: [sc-01-o1, sc-01-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: lista
    title: Conocer la lista de revisión
    tool: lms
    phase: conceptualizacion
    description: Recorre las diez categorías del OWASP Top 10:2025 y quédate con la pregunta de revisión de las cuatro de hoy (A01, A05, A07 y A10).
    check: Sabes qué pregunta hacerle a tu código en cada una de las cuatro categorías de hoy
  - id: cazar
    title: Cazar los fallos de un login generado
    tool: lms
    phase: reflexion
    description: Marca las líneas con fallo en el login de práctica (PHP o Node), lee por qué lo son y ponles su categoría.
    check: Encontraste al menos 5 de los 7 fallos del login de práctica
  - id: probar
    title: Probar los fallos en el simulador
    tool: lms
    phase: experiencia
    description: Mira cómo queda la consulta concatenada y el texto pintado como HTML, y compáralos con la versión corregida. Todo con datos inventados.
    check: Viste entrar la inyección en el lado vulnerable y quedarse fuera en el corregido
  - id: pedir
    title: Pedirle la revisión a la IA y comprobarla
    tool: lms
    phase: experimentacion
    description: Usa los tres pedidos de la clase en el asistente que prefieras y comprueba la respuesta. Que cite archivo y línea, que el fallo se reproduzca y que el arreglo traiga su prueba.
    check: Sabes qué respuesta aceptar y cuál devolver
  - id: revisar
    title: Revisar un código generado
    tool: lms
    phase: experimentacion
    description: Pide a la IA un formulario de login y revísalo con la lista del OWASP Top 10. Anota cada fallo que encuentres.
    check: Encontraste al menos 3 fallos y sabes en qué categoría cae cada uno
---

# Lo que la IA no te dice

**Miércoles 18 de noviembre, 7:30 – 9:00 p. m. (Lima).**

La IA escribe código que funciona a la primera, y por eso nadie lo revisa. En esta sesión aprendes a
mirarlo antes de usarlo: claves dentro del código, entradas que llegan sin validar, permisos de más y
errores que cuentan demasiado. El OWASP Top 10 es tu lista de revisión.

> **Regla del curso.** Este es un curso defensivo. Todo lo que se prueba en clase son simulaciones con
> datos inventados. Fuera de clase, estas pruebas se hacen solo en tus sistemas o con permiso escrito
> del dueño.

## Qué hacemos en clase (90 minutos)

1. **Bienvenida (4 min).** Por qué «funciona» no es lo mismo que «es seguro», y la regla de permiso.
2. **Lo que dicen los estudios (7 min).** Tres estudios sobre el código que escriben los asistentes,
   cada cifra con su matiz. Las cifras dicen dónde mirar, no cuántos fallos tiene tu sistema.
3. **La lista de revisión (8 min).** Las diez categorías del OWASP Top 10:2025 y las cuatro de hoy.
4. **Caza los fallos (14 min).** Un login «generado por IA» en PHP y otro en Node, con siete fallos
   sembrados. Marcas la línea, lees por qué es un fallo y eliges su categoría.
5. **Tres fallos de cerca (30 min).** Claves expuestas, con un detector de secretos; entradas sin
   validar, con un simulador de inyección SQL y otro de XSS; y permisos de más, con el pedido de otro
   cliente y el error que cuenta demasiado.
6. **Pídele la revisión a la IA… y compruébala (12 min).** Tres pedidos listos para copiar y cómo
   saber si la respuesta sirve.
7. **Repaso y cierre (11 min).** ¿En qué categoría cae?, la tarea y lo que viene.

## La lista de revisión de hoy

El [OWASP Top 10:2025](https://owasp.org/Top10/2025/) es la edición vigente. Los nombres oficiales
están en inglés. Las cuatro categorías que vimos de cerca, cada una con su pregunta:

| Categoría | Qué es | La pregunta que le haces a tu código |
| --- | --- | --- |
| **A01** Broken Access Control | Control de acceso roto | ¿Cada ruta comprueba que esto es tuyo, y no solo que iniciaste sesión? |
| **A05** Injection | Inyección (SQL, XSS) | ¿Algún texto del usuario se pega dentro de una consulta, de una orden o del HTML? |
| **A07** Authentication Failures | Fallos de autenticación | ¿Hay claves, contraseñas o tokens escritos en el código? ¿Quién limita los intentos? |
| **A10** Mishandling of Exceptional Conditions | Mal manejo de errores | ¿Qué ve el usuario cuando algo falla? |

Las otras seis completan la lista: A02 Security Misconfiguration (configuración insegura), A03 Software
Supply Chain Failures (dependencias y cadena de suministro), A04 Cryptographic Failures (fallos
criptográficos), A06 Insecure Design (diseño inseguro), A08 Software or Data Integrity Failures
(integridad del software o de los datos) y A09 Security Logging and Alerting Failures (registro y alerta).

Las categorías se solapan, y OWASP lo dice. Si dudas entre dos, anota las dos: lo que importa es
encontrar el fallo y corregirlo.

## Cómo comprobar lo que responde la IA

- **Cita archivo y línea**, y esa línea existe y dice lo que la IA afirma.
- **El fallo se reproduce:** hay una prueba que hoy falla por culpa de ese fallo.
- **El arreglo trae su prueba:** la misma prueba pasa después del cambio, y no cambió nada más.

Desconfía de dos cosas: los fallos inventados (líneas o archivos que no existen) y el «ya está seguro».
Ninguna revisión demuestra que no quedan fallos. Solo dice que no encontró más.

## Tareas

- **Tarea 1 · Revisa un login generado.** Pide a la IA un formulario de login (en PHP o en Node), sin
  darle instrucciones de seguridad. Revísalo con la lista y anota **al menos 3 fallos**: archivo y
  línea, categoría del OWASP Top 10:2025, por qué es un fallo y cómo lo corregirías. Pruébalo solo en
  tu máquina. Tráela el miércoles 25 de noviembre: la sesión 2 empieza por ahí.
