# Navegador compartido de las aulas: un Chromium sin interfaz para toda la clase, manejado por HTTP.
# Parte de jmd/render (ya está en el servidor y trae Node 22, las bibliotecas de Chrome y chrome-headless-shell),
# así no hay que bajar otra imagen grande. Ver servidor.mjs y desplegar.sh.
FROM jmd/render:latest

# El Chrome de hyperframes vive en /root/.cache: se copia a /opt para poder correr sin ser root.
RUN mkdir -p /opt/chrome && cp -r /root/.cache/hyperframes/chrome/chrome-headless-shell/*/chrome-headless-shell-linux64/. /opt/chrome/ \
    && chmod -R a+rX /opt/chrome && test -x /opt/chrome/chrome-headless-shell

WORKDIR /nav
RUN npm init -y >/dev/null && npm install --omit=dev puppeteer-core@24 && npm cache clean --force
COPY servidor.mjs /nav/servidor.mjs

ENV NAV_CHROME=/opt/chrome/chrome-headless-shell NAV_PUERTO=8090 HOME=/tmp
USER node
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:8090/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "/nav/servidor.mjs"]
