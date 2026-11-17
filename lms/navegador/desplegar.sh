#!/usr/bin/env bash
# Construye y levanta el navegador compartido de las aulas en el servidor de JMD Learning.
# Uso (desde la Mac): bash lms/navegador/desplegar.sh
#
# Queda solo en aula_net (red interna, sin puertos publicados), sale a internet por npm-proxy como las aulas,
# con raíz de solo lectura, sin privilegios y con tope de memoria y de procesos. Para apagarlo:
#   ssh … 'sudo docker rm -f navegador'
set -euo pipefail
K=${LLAVE:-$HOME/Downloads/curdilmer.pem}
AQUI=$(cd "$(dirname "$0")" && pwd)
COPYFILE_DISABLE=1 tar czf - -C "$AQUI" Dockerfile servidor.mjs | ssh -i "$K" ubuntu@3.151.56.55 'set -e
D=$(mktemp -d); cd "$D"; tar xzf - 2>/dev/null
sudo docker build -t jmd/navegador:1 . 2>&1 | tail -4
sudo docker rm -f navegador >/dev/null 2>&1 || true
sudo docker run -d --name navegador --restart unless-stopped --network aula_net \
  --memory 1500m --memory-swap 1500m --cpus 1.5 --pids-limit 500 \
  --cap-drop ALL --security-opt no-new-privileges --read-only \
  --tmpfs /tmp:rw,exec,size=384m,uid=1000,gid=1000 --shm-size 64m \
  -e NAV_PROXY=http://npm-proxy:8888 -e NAV_MAX=12 -e NAV_MAX_AULA=3 \
  jmd/navegador:1 >/dev/null
rm -rf "$D"
sleep 4
sudo docker ps --filter name=^navegador$ --format "{{.Names}} {{.Status}}"
sudo docker logs navegador 2>&1 | tail -3' </dev/null 2>&1 || true
