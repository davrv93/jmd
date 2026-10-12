# jmd/aula

Imagen del contenedor que recibe cada alumno en el modo LIVE: shell, `jmd`, `rtk`, los 21 skills del curso (14 del taller y 7 `s2-robo-*` para construir a Robo), la plantilla `plan-robo`
y el código del asistente en modo nube. Sin Node, sin modelos y sin el socket de Docker.

Construir para el servidor (amd64; hacerlo en el servidor, no en el Mac):

    docker build -t localhost/ai-orchestrator:latest ..        # desde la raíz del repo, si falta
    docker build -t jmd/aula:latest lms/aula

Construir para probar en el Mac (arm64):

    docker build -t jmd/aula:latest lms/aula

Medir:

    docker image inspect jmd/aula:latest --format '{{.Size}}'
    docker run --rm jmd/aula:latest sh -c 'command -v node || echo sin-node'
    docker run --rm jmd/aula:latest sh -c 'aula iniciar && sleep 4 && curl -s localhost:8766/api/salud; aula parar'
