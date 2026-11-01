FROM node:20-alpine
WORKDIR /app
COPY --chown=node:node app/ ./
USER node
ENV HOST=0.0.0.0 PORT=3000 SECURE_COOKIE=1 MAX_TIENDAS=120
EXPOSE 3000
CMD ["node", "--max-old-space-size=128", "web.mjs"]
