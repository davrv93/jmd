# Servicio render: HyperFrames + Chrome + ffmpeg ya instalados, para renderizar sin GPU (SwiftShader).
# La plantilla dibuja con p5.js en 2D, que en CPU va unas 30 veces más rápido que Three.js.
FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg ca-certificates fonts-liberation \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g hyperframes@0.8.216 && npm cache clean --force

WORKDIR /app
COPY plantilla /app/plantilla
COPY servidor.mjs /app/servidor.mjs

# Un render de prueba durante el build deja Chrome descargado dentro de la imagen y comprueba que la
# plantilla funciona; así el primer alumno no espera la descarga.
RUN cp -r /app/plantilla /tmp/prueba && cd /tmp/prueba \
    && hyperframes render -q draft -f 24 -w 2 --no-browser-gpu -o salida.mp4 \
    && test -s salida.mp4 && rm -rf /tmp/prueba

ENV RENDER_TRABAJOS=/trabajos
EXPOSE 8000
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:8000/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "/app/servidor.mjs"]
