# Forja · estudio de personajes. El modelo de embeddings NO va en la imagen: se monta en /app/modelos (solo lectura).
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY servidor.mjs ./
COPY web ./web
USER 65534:65534
ENV PORT=18697 FORJA_MODELOS=/app/modelos FORJA_DATOS=/datos NODE_ENV=production
EXPOSE 18697
CMD ["node", "servidor.mjs"]
