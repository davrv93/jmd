#!/bin/sh
# Etapa «dsh» del Dockerfile: instala DeepSeek Harness FIJADO en /opt/dsh y lo adelgaza para el aula.
# Uso: sh instalar.sh <version>
set -eu
V="${1:?falta la versión de @deepseek-ai/dsh}"

# --ignore-scripts: koffi intenta compilar con CMake si su postinstall no carga el binario; los binarios
# (koffi, node-pty, sharp, system.node) ya vienen como paquetes opcionales musl/glibc y se eligen solos.
# Reintenta: son ~600 paquetes y la red del servidor a veces corta (ECONNRESET). La caché de npm hace que cada
# intento retome lo ya bajado.
n=0
until npm install --prefix /opt/dsh --omit=dev --ignore-scripts --no-audit --no-fund --no-update-notifier \
        --fetch-retries=5 --fetch-retry-mintimeout=2000 --fetch-timeout=120000 --loglevel=error "@deepseek-ai/dsh@${V}"; do
  n=$((n+1)); [ "$n" -ge 3 ] && { echo "npm install falló 3 veces" >&2; exit 1; }
  echo "npm install falló; reintento $n/3" >&2; sleep 5
done
rm -rf /root/.npm /opt/dsh/package-lock.json
cd /opt/dsh/node_modules

# 0) node-pty (lo usa dsh-subprocess-local para la shell del agente) solo trae prebuilds de glibc para linux-x64 y
#    linux-arm64. Con el Node de Alpine (musl) + gcompat el .node CARGA, pero el primer pty.spawn da «Segmentation
#    fault»: dsh web se cae sin decir nada al mandar el primer mensaje (medido en el e2e del 31-10-2026, exit 139).
#    Se compila para musl (node-pty busca build/Release antes que prebuilds/) y se borran los prebuilds, para que un
#    fallo futuro sea un error legible y no un segfault. Las herramientas de compilación no pasan a la imagen final.
apk add --no-cache --virtual .gyp python3 make g++ >/dev/null
( cd node-pty && node /usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --nodedir=/usr/local --loglevel=error )
mv node-pty/build/Release/pty.node /tmp/pty.node && rm -rf node-pty/build node-pty/prebuilds \
 && mkdir -p node-pty/build/Release && mv /tmp/pty.node node-pty/build/Release/pty.node
apk del .gyp >/dev/null
rm -rf /root/.cache/node-gyp

# 0b) koffi (FFI de dsh): su paquete de plataforma prueba PRIMERO el binario de glibc (linux_<arch>/koffi.node) y solo si
#     falla pasa al de musl. En Alpine puro falla y cae bien, pero la imagen final lleva gcompat (para rtk): con él el
#     de glibc CARGA y revienta en su constructor (SIGSEGV dentro de dlopen, visto con gdb en el e2e del 31-10-2026,
#     al mandar el primer mensaje desde dsh web). Se borra el de glibc para que cargue siempre el de musl.
rm -rf @koromix/koffi-linux-*/linux_*
test -n "$(ls -d @koromix/koffi-linux-*/musl_* 2>/dev/null)"

# 1) zod 4.4.3 viene copiado dentro de ~50 paquetes (6,5 MB cada uno, ~330 MB): se deja UNA copia compartida.
primero=$(ls -d @deepseek-ai/*/node_modules/zod | head -1)
mv "$primero" .zod-4.4.3
for d in @deepseek-ai/*/node_modules/zod; do
  [ -L "$d" ] && continue
  v=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$d/package.json" | head -1)
  if [ "$v" = 4.4.3 ]; then rm -rf "$d"; ln -s /opt/dsh/node_modules/.zod-4.4.3 "$d"; fi
done
ln -s /opt/dsh/node_modules/.zod-4.4.3 "$primero"

# 2) Lo que el aula no usa: LibreOffice en WASM (vista previa de documentos Office, 149 MB) y el
#    reconocimiento de voz (sherpa-onnx). Más mapas de código y READMEs.
rm -rf @deepseek-ai/libreoffice-kit-wasm sherpa-onnx*
find . -name '*.map' -type f -delete
find . \( -name 'README*' -o -name 'CHANGELOG*' \) -type f -delete

# 3) Comprobación: arranca, es la versión fijada y node-pty abre una shell (sin segfault).
test "$(/opt/dsh/node_modules/.bin/dsh --version)" = "$V"
test "$(node -e 'const p=require("/opt/dsh/node_modules/node-pty").spawn("/bin/sh",["-c","echo pty-ok"],{cwd:"/",env:process.env});let o="";p.onData(d=>o+=d);p.onExit(()=>process.stdout.write(o.trim()))')" = pty-ok
du -sh /opt/dsh
