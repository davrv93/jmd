# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY gol /gol
USER 65534:65534
ENV GOL_DATOS=/datos PORT=18655
EXPOSE 18655
ENTRYPOINT ["/gol"]
