---
id: ej-runner
title: "Probar código aquí mismo"
summary: El LMS ejecuta Python, Node, Bash y Go en un contenedor aislado; cómo se marca un bloque y qué se puede esperar.
tags: [lms, runner]
level: básico
lesson: pa-01
phase: experiencia
order: 7
---
Algunos bloques de este LMS se pueden **editar y ejecutar** sin instalar nada: corren en un
contenedor aislado en el servidor (sin red). Solo llevan botón los bloques que el instructor marcó.

## Python

```run-python
nombre = "mundo"
print(f"hola, {nombre}")
print("el código corre aislado y sin red")
```

## Bash

```run-bash
echo "usuario: $(whoami)"
echo "arquitectura: $(uname -m)"
echo "carpeta: $(pwd)"
```

El botón **Probar** abre el editor; **Ejecutar** manda el código y muestra la salida, el código de
salida y el tiempo. Sirve para practicar algoritmos y experimentar, no para tu máquina: aquí
**no** hay `opencode`, `docker`, `git` ni tus archivos.

> Para los comandos de *instalación* (VS Code, Docker, OpenCode) usa **tu** terminal, no este
> sandbox. Los bloques sin botón «Probar» son solo para leer y copiar.

## Cómo se marca un bloque

Quien escribe pone el lenguaje con un prefijo:

- ```` ```run-python ````, ```` ```run-node ````, ```` ```run-bash ````, ```` ```run-go ```` → editar y ejecutar.
- ```` ```live-html ```` o ```` ```live-css ```` → editar y ver el resultado en un iframe.
- Cualquier otro (```` ```bash ````, ```` ```json ````, ```` ```markdown ````) → solo leer y copiar.
