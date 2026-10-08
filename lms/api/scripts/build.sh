#!/bin/sh
# Compila el binario del LMS con el front dentro.
# Antes: cd ../web && npm ci && npm run build   (deja web/dist)
set -eu
cd "$(dirname "$0")/.."
if [ -d ../web/dist ]; then
  rm -rf internal/webdist/dist
  cp -r ../web/dist internal/webdist/dist
else
  echo "aviso: ../web/dist no existe; el binario llevará solo el placeholder (npm run build en ../web)" >&2
fi
mkdir -p bin
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/lms ./cmd/lms
echo "bin/lms listo"
