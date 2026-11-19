# Forja · estudio de personajes. El modelo de embeddings NO va en la imagen: se monta en /app/modelos (solo lectura).
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
# onnxruntime-node intenta bajar binarios de GPU (CUDA) al instalarse y esa descarga da 404 (19-11-2026).
# La Forja corre el modelo en CPU: se salta la parte de CUDA, el runtime de CPU viene en el paquete.
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm_config_onnxruntime_node_install_cuda=skip
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY servidor.mjs embeddings-hijo.mjs ./
COPY web ./web
USER 65534:65534
ENV PORT=18697 FORJA_MODELOS=/app/modelos FORJA_DATOS=/datos NODE_ENV=production
EXPOSE 18697
CMD ["node", "servidor.mjs"]
