#!/bin/sh
# Empaqueta el motor de Rosa 3D en un solo script clásico (IIFE): Three.js r170 + GLTFLoader + RoomEnvironment + motor.js.
# Sale en live/_comun/rosa3d-motor.js. Necesita three@0.170.0 instalado (THREE_NODE_MODULES = la carpeta node_modules
# que lo contiene) y esbuild (ESBUILD; por defecto «npx esbuild»).
#   THREE_NODE_MODULES=/ruta/a/node_modules ./construir.sh
set -e
cd "$(dirname "$0")"
: "${THREE_NODE_MODULES:?indica la carpeta node_modules que tiene three@0.170.0}"
ESB="${ESBUILD:-npx esbuild}"
NODE_PATH="$THREE_NODE_MODULES" $ESB motor.js --bundle --format=iife --target=es2019,safari15 --minify --legal-comments=none \
  --banner:js="/* Rosa 3D · motor 1.3.0 — Three.js r170 (MIT, three.js authors) + motor de JMD Learning. Fuente: _fuente/rosa3d/motor.js. Avatar: Microsoft Rocketbox (MIT). */" \
  --outfile=../../live/_comun/rosa3d-motor.js
ls -l ../../live/_comun/rosa3d-motor.js
