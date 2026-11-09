---
id: pt-01
title: "Clase 1 · Menos tokens: RTK y el ahorro de contexto"
starts_at: 2026-11-08T21:30:00-05:00
published: true
objectives:
  - {id: pt-01-o1, title: "Medir cuánto contexto gasta tu agente hoy, con números"}
  - {id: pt-01-o2, title: "Instalar RTK y comprimir lo que el agente lee"}
  - {id: pt-01-o3, title: "Escribir un pedido que no arrastre media base de código"}
recording:
  url: "/files/potencia-agentes/materials/grabaciones/pt-01-grabacion.mp4"
  passcode: ""
materials:
  - id: pt-01-grabacion
    title: "Grabación de la clase 1 (domingo 8 de noviembre)"
    kind: file
    file: materials/grabaciones/pt-01-grabacion.mp4
    objective_ids: [pt-01-o1, pt-01-o2]
  - id: pt-01-video
    title: "Video: menos tokens en 40 segundos"
    kind: file
    file: materials/video-pt-01.mp4
    objective_ids: [pt-01-o1, pt-01-o2]
  - id: pt-01-rtk
    title: "RTK (Rust Token Killer) · repositorio oficial"
    kind: repo
    url: https://github.com/rtk-ai/rtk
    objective_ids: [pt-01-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: "Asiste en vivo el domingo 8 de noviembre de 9:30 a 10:45 p. m. (hora de Lima) o mira la grabación."
    check: "Viste la clase completa o la grabación"
  - id: medir
    title: Medir tu línea base
    tool: terminal
    phase: experiencia
    description: "Mide en caracteres la salida de git log -n 15 en un repositorio tuyo, sin RTK, y publica tu número en la escena 3."
    check: "Tu número «antes» quedó publicado"
  - id: observar
    title: Ver a dónde se va
    tool: lms
    phase: reflexion
    description: "Compara tu número con el del grupo y escribe en el muro qué te sorprendió."
    check: "Tu línea aparece en el muro de la escena 4"
  - id: rtk
    title: Entender e instalar RTK
    tool: terminal
    phase: conceptualizacion
    description: "Instala RTK, activa el hook de tu agente con rtk init -g y comprueba que rtk rewrite \"git status\" responde rtk git status."
    check: "rtk --version responde y rtk gain muestra comandos"
  - id: pedido
    title: El pedido que no arrastra todo
    tool: lms
    phase: experimentacion
    description: "Juega una partida de «La mochila del agente» y publica qué dejarías fuera mañana."
    check: "Terminaste una partida y tu reflexión está en el muro"
  - id: entregar
    title: Medir después y publicar
    tool: lms
    phase: experimentacion
    description: "Repite la medición con RTK y publica tu antes → después en la escena 9."
    check: "Tu antes → después aparece en el muro de la escena 9"
---

## Clase 1 · Menos tokens: RTK y el ahorro de contexto

**Domingo 8 de noviembre, 9:30 – 10:45 p. m. (hora de Lima).**

Una sesión con agente se paga en contexto: cada archivo que se lee, cada log que se pega,
cada «muéstrame el repo entero». En esta clase se mide ese gasto y se corta.

- **Diagnóstico:** cuántos tokens consume una tarea real, de principio a fin.
- **RTK:** compresión de lo que el agente lee, sin perder lo que decide.
- **El pedido que no arrastra todo:** cómo pedir solo el fragmento que hace falta.

Al terminar vas a poder decir, con número en mano, cuánto gastas y cuánto ahorraste.

## Regla de la clase

**Nada se afirma sin número.** Empezamos con una línea base y terminamos con una medición.
Para contar rápido usamos una aproximación: **1 token ≈ 4 caracteres** de texto en inglés o código.
No es exacta, pero sirve para comparar el antes y el después de la misma salida.

## 1 · Tu línea base (Experiencia)

En una carpeta con un repositorio git tuyo (o clona uno de prueba):

```bash
git log -n 15 | wc -c        # caracteres que el agente leería
```

En Windows usa Git Bash o WSL. En PowerShell: `(git log -n 15 | Out-String).Length`.

Divide entre 4 y tienes los tokens aproximados. Publica tu número en la escena 3.

## 2 · ¿A dónde se va? (Observación)

Lo que más gasta casi nunca es tu pedido: es lo que el agente **lee** para cumplirlo.
Salidas de comandos largas, archivos completos, logs con barras de progreso, el historial del chat.

## 3 · Qué es RTK (Conceptos)

**RTK (Rust Token Killer)** es un programa de terminal que se pone entre tus comandos y el agente.
Su propia ayuda lo define así: *«un proxy de línea de comandos que filtra y resume la salida del
sistema antes de que llegue al contexto de tu modelo»*. Ejecuta el comando de verdad y le entrega al
modelo una versión compacta: sin relleno, agrupada y con los errores a la vista.

- Se usa anteponiendo `rtk`: `rtk git log -n 15`, `rtk ls -la`, `rtk go test ./...`.
- Con `rtk init -g` instala un *hook* en Claude Code (con `--opencode`, también un plugin en OpenCode):
  el agente escribe `git status` y el hook lo reescribe a `rtk git status` sin que tú hagas nada.
  Lo puedes comprobar con `rtk rewrite "git status"`.
- `rtk gain` muestra cuántos tokens te ahorró, por comando.

### Lo que medimos (Mac del instructor, rtk 1.0.1, 08-11-2026)

| Comando | Sin RTK (caracteres) | Con RTK | Ahorro |
|---|---:|---:|---:|
| `git log -n 15` | 6 713 | 3 458 | −48 % |
| `git log -n 200` | 92 409 | 49 474 | −46 % |
| `git diff` de dos commits | 125 454 | 40 558 | −68 % |
| `git status` | 1 551 | 1 064 | −31 % |
| `ls -la` de una carpeta con 90 archivos | 6 548 | 1 447 | −78 % |
| `find` de una carpeta de curso | 1 471 | 559 | −62 % |
| `rtk read -m 40` de un archivo Go | 6 858 | 955 | −86 % |
| `grep` con 2 resultados | 274 | 274 | 0 % |
| `git diff --stat` | 2 101 | 2 101 | 0 % |

Dos lecturas: RTK ahorra mucho en **salidas largas y repetitivas**, y **nada** en salidas que ya son cortas.
En el historial de la máquina del instructor, `rtk gain` marca 12 240 comandos y un 47,9 % ahorrado.

## 4 · El pedido que no arrastra todo (Conceptos)

| En vez de… | Pide así |
|---|---|
| «Revisa todo el proyecto y dime por qué falla el login» | «En `src/auth/login.go`, `Login` devuelve 500 si el correo trae mayúsculas. Este es el error (12 líneas): … Corrige solo esa función y corre `go test ./src/auth/`.» |
| Pegar el log completo | Pegar solo las líneas del error (`rtk err <comando>` o `tail -n 30`) |
| «Lee el archivo» | Ubica primero (`rg -n "Login(" src/`) y lee el fragmento (`rtk read -m 40 archivo`) |
| Seguir en la misma sesión con otro tema | `/clear` al cambiar de tarea |

Cinco reglas: **nombra archivo y función · pega solo el error · ubica antes de leer · una tarea por sesión · nunca pegues secretos**.

## 5 · Instala RTK (Experimentación)

| Sistema | Instalar |
|---|---|
| macOS | `brew install rtk` |
| Linux / WSL | `curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh \| sh` |
| Windows | `winget install rtk-ai.rtk` |

Después:

```bash
rtk --version
rtk init -g                 # hook para Claude Code
rtk init -g --opencode      # además, el plugin de OpenCode
rtk rewrite "git status"    # debe responder: rtk git status
```

Cierra y abre tu agente para que tome el hook.

## 6 · Mide después y publica (Experimentación)

```bash
rtk git log -n 15 | wc -c
rtk gain
```

Publica en la escena 9 tu **antes → después** y el porcentaje. Es tu medición de la clase 1:
la volvemos a usar en la clase 3 para sumar el ahorro de Caveman.

## Para la clase 2

Deja RTK instalado y trabaja con tu agente como siempre. El martes abrimos `rtk gain` y vemos
cuánto ahorró solo, sin que hicieras nada.
