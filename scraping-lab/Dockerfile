# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY scraping-lab /scraping-lab
USER 65534:65534
ENV PORT=18685 LAB_LIMITE=20 LAB_VENTANA=10 LAB_TOLERANCIA=10 LAB_CASTIGO=60
EXPOSE 18685
ENTRYPOINT ["/scraping-lab"]
