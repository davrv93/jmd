---
id: dso-01
title: "Sesión 1 · Tu orquesta: subagentes, delegación e IA externa"
starts_at: 2026-11-25T18:30:00-05:00
duration: 75
published: true
objectives:
  - {id: dso-01-o1, title: "Crear subagentes con un rol, un alcance y una salida esperada"}
  - {id: dso-01-o2, title: "Delegar responsabilidades: qué hace cada agente y qué revisa el orquestador"}
  - {id: dso-01-o3, title: "Reutilizar IA externa cuando un modelo especializado lo hace mejor o más barato"}
materials:
  - {id: dso-01-plugin-orquesta, title: "Plugin dsh-orquesta 0.1.0 (tareas en segundo plano y visor de subagentes)", kind: file, file: materials/dsh-orquesta-0.1.0.zip}
---
## Sesión 1 · Tu orquesta: subagentes, delegación e IA externa

**Miércoles 25 de noviembre, 6:30 – 7:45 p. m. (Lima).** En vivo por Zoom; la clase queda grabada.

DeepSeek no tiene que hacerlo todo: dirige. En esta sesión armas tu orquesta.

1. **Crea subagentes.** Cada uno con un rol (programador, probador, revisor), lo que puede tocar y lo que debe entregar.
2. **Delega responsabilidades.** El orquestador reparte el trabajo, no lo hace; y decide quién revisa a quién.
3. **Reutiliza IA externa.** Cuando otro modelo es mejor para una parte (imágenes, voz, búsqueda), la llamas en vez de forzar a DeepSeek.

### Para empezar con tu asistente

```prompt
# Tu primera orquesta
Actúa como orquestador. Tengo que construir <describe tu tarea>. Propón 3 subagentes (programador, probador
y revisor): para cada uno dime su rol, qué archivos puede tocar, qué debe entregar y cómo sé que terminó bien.
Luego reparte el trabajo en pasos y dime en cuál conviene usar una IA externa y por qué.
```
