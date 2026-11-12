# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY isla-gomita /isla-gomita
USER 65534:65534
ENV PORT=18693
EXPOSE 18693
ENTRYPOINT ["/isla-gomita"]
