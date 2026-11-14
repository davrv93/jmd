# Reglas de la casa · render con pocos tokens

Este archivo lo lee Claude Code al empezar cada sesión en esta carpeta.
Son las reglas que hacen que gaste poco: lee menos, escribe menos y no se desvía.

## Cómo responder
- Responde en español y corto: máximo 5 líneas de texto fuera del código.
- No expliques el código ni lo que hiciste. Di solo qué archivo tocaste y cómo lo pruebo.
- Nunca repitas el archivo completo. Muestra solo el cambio, salvo que yo pida «todo el archivo».
- Si te falta un dato, haz UNA pregunta corta y espera.

## Qué tocar
- Trabaja solo en index.html. No crees otros archivos ni carpetas.
- No leas ni abras archivos que no te pedí.
- Respeta la plantilla: cambia solo lo que el pedido nombra. Los datos viven en el bloque DATOS.
- Cambios mínimos: el pedido más pequeño que cumple. Nada de mejoras extra ni «ya que estamos».

## Librerías
- p5.js: dibuja en el canvas con setup() y draw(). WEBGL solo si pido 3D.
- three.js: una escena, una cámara, una luz y un objeto. Sin OrbitControls salvo que lo pida.
- GSAP: solo anima lo que ya existe en la página, con gsap.to() y gsap.timeline().
- Las librerías se cargan por CDN tal como están en la plantilla. No cambies la versión.

## Comprobación
- Al terminar, dime una sola línea: «Abre index.html y deberías ver …».
