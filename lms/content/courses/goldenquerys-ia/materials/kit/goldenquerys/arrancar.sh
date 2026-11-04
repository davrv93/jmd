#!/bin/sh
# GoldenQuerys — arranca (o reinicia) el servidor de consultas en 127.0.0.1:8766.
# Uso:  sh arrancar.sh
cd "$(dirname "$0")" || exit 1
PUERTO="${GQ_PUERTO:-8766}"
PIDF=".servidor.pid"
if [ -d /trabajo ] && [ -w /trabajo ]; then LOG=/trabajo/goldenquerys.log; else LOG="$(pwd)/goldenquerys.log"; fi

if [ -f "$PIDF" ]; then
  VIEJO="$(cat "$PIDF")"
  if [ -n "$VIEJO" ] && kill -0 "$VIEJO" 2>/dev/null; then
    echo "Deteniendo el servidor anterior (pid $VIEJO)…"
    kill "$VIEJO" 2>/dev/null
    i=0; while kill -0 "$VIEJO" 2>/dev/null && [ $i -lt 20 ]; do sleep 0.2; i=$((i+1)); done
  fi
  rm -f "$PIDF"
fi

GQ_PUERTO="$PUERTO" nohup python3 servidor.py > "$LOG" 2>&1 &
echo $! > "$PIDF"

i=0
while [ $i -lt 20 ]; do
  if curl -fs "http://127.0.0.1:$PUERTO/api/salud" > /dev/null 2>&1; then
    echo "Listo: abre goldenquerys/index.html en el visor"
    echo "(servidor en http://127.0.0.1:$PUERTO, pid $(cat "$PIDF"), log en $LOG)"
    exit 0
  fi
  sleep 0.5; i=$((i+1))
done
echo "El servidor no respondió en 10 s. Revisa el log: $LOG"
tail -n 20 "$LOG" 2>/dev/null
exit 1
