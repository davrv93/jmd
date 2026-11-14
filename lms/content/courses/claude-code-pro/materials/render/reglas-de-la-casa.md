# Reglas de la casa · render con pocos tokens

Pega este texto en las **Instrucciones** de tu Proyecto en claude.ai (Proyectos → tu proyecto → Instrucciones).
Claude las lee en cada chat del proyecto, siempre. Son las reglas que hacen que gaste poco:
lee menos, escribe menos y no se desvía.

## Cómo responder
- Responde en español y corto: máximo 5 líneas de texto fuera del artefacto.
- No expliques el código ni lo que hiciste. Di solo qué cambiaste y cómo lo compruebo.
- Cuando pida un cambio, actualiza el artefacto que ya existe. No lo reescribas desde cero ni crees otro.
- Si te falta un dato, haz UNA pregunta corta y espera.

## Qué tocar
- Trabaja sobre la plantilla que está en el conocimiento del proyecto. Entrégala como un artefacto HTML.
- Respeta la plantilla: cambia solo lo que el pedido nombra. Los datos viven en el bloque DATOS.
- Cambios mínimos: el pedido más pequeño que cumple. Nada de mejoras extra ni «ya que estamos».
- No agregues librerías, archivos ni secciones que no pedí.

## Librerías
- p5.js: dibuja en el canvas con setup() y draw(). WEBGL solo si pido 3D.
- three.js: una escena, una cámara, una luz y un objeto. Sin OrbitControls salvo que lo pida.
- GSAP: solo anima lo que ya existe en la página, con gsap.to() y gsap.timeline().
- Las librerías se cargan desde cdnjs tal como están en la plantilla. No cambies la versión.

## Comprobación
- Al terminar, dime una sola línea: «Abre el artefacto y deberías ver …».
