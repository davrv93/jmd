---
name: pedido-seis-partes
description: Cómo escribir y revisar un pedido a la IA con sus seis partes (rol, contexto, tarea, límites, formato y comprobación). Úsala cuando el usuario diga "arma el pedido", "revisa mi prompt", "pídelo bien", pase un pedido vago, o antes de cualquier tarea de diseño, interfaz, landing, imagen o video que un agente vaya a construir. También para el segundo pedido: corregir con palabras exactas.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Pedido en seis partes

## Cuándo usar

Siempre que el usuario vaya a pedirle algo a un agente o a un modelo y el resultado deba poder
construirse y comprobarse: una pantalla, una landing, una imagen, una pieza animada, un video.
Si el pedido que trae es vago («hazme algo bonito»), esta skill lo convierte en uno completo
antes de construir nada. Si ya está completo, se verifica contra la lista y se ejecuta.

## Las seis partes

| Parte | Responde a | Ejemplo (pieza animada de Willie) |
|---|---|---|
| 1 · Rol | ¿Quién debe ser el agente? | «Eres animador 2D y desarrollador front-end; solo herramientas abiertas.» |
| 2 · Contexto | ¿Para quién y en qué situación? | «Taller de diseño; público que no programa; se ve en el visor y en un teléfono.» |
| 3 · Tarea | ¿Qué, con un solo verbo? | «Crea willie/index.html, una pieza de 20 s con Willie al timón.» |
| 4 · Límites | ¿Qué no debe hacer ni inventar? | «Solo el diseño de 1928. Sin CDN. Ningún corte menor de 0,25 s.» |
| 5 · Formato | ¿Cómo lo recibo? | «Un HTML; cada escena es una section con data-start y data-duration.» |
| 6 · Comprobación | ¿Cómo sabremos que está bien? | «index.html?t=7 muestra el paneo a mitad, quieto; dura 20,0 s.» |

Reglas:

1. Una tarea por pedido. Si son tres cosas, son tres pedidos.
2. La comprobación es algo que se ve o se ejecuta: un archivo que existe, un comando que devuelve
   algo, una pantalla que se abre. «Funciona» o «se ve bien» no son comprobaciones.
3. Los límites dicen qué no inventar: precios, personas, caras, versiones, imágenes ajenas.
4. El formato nombra archivos y medidas: `index.html`, 1920 × 1080, 390 × 844, SVG.
5. El rol incluye con qué herramientas trabaja (abiertas, locales, sin servicios cerrados) si eso
   importa para el resultado.

## Procedimiento

1. Lee el pedido del usuario y marca cuál de las seis partes falta o está vaga.
2. Propón el pedido completo en un bloque de texto, con las seis partes etiquetadas, sin ejecutarlo
   todavía. Deja en `[corchetes]` lo que solo el usuario sabe (su negocio, su mensaje, su número).
3. Pregunta solo por los corchetes. Si el usuario dice «sigue», rellena con lo más neutro y dilo.
4. Ejecuta. Al terminar, corre la comprobación tal como está escrita y pega el resultado.
5. Si algo falló la comprobación, dilo con la palabra «falló» y propón el segundo pedido.

## El segundo pedido: corregir con palabras exactas

Un segundo pedido señala el lugar, dice el cambio, acota y pide el informe:

```text
En la escena 4, el zoom al plano medio llega tarde: debe terminar en el segundo 9,5, no en el 10.
Ajusta solo eso y dime qué línea cambiaste.
```

Nunca «mejóralo» ni «hazlo más bonito». Siempre «en [dónde], [qué] está mal, cámbialo por [qué],
no toques nada más, dime qué cambiaste».

## Versión corta (modelos pequeños, DeepSeek, Ollama)

Si el modelo es pequeño o el contexto escasea, bastan tres partes: tarea, límites y comprobación.
Rol y contexto van en una línea al inicio; el formato, dentro de la tarea.

```text
Tarea: crea willie/index.html, pieza de 20 s con la silueta willie.svg al pulso de 120 bpm.
Límites: sin CDN, cortes de 0,25 s o más, sin destellos, un solo reloj.
Comprobación: ?t=7 queda quieto a mitad del paneo; dura 20,0 s.
```

## Lista de comprobación del pedido

- [ ] ¿Un solo verbo en la tarea?
- [ ] ¿Dice para quién es y dónde se verá?
- [ ] ¿Nombra lo que no debe inventar?
- [ ] ¿Nombra archivos y medidas?
- [ ] ¿La comprobación se puede ejecutar o ver sin opinar?
- [ ] ¿Pide que informe qué archivos tocó?
