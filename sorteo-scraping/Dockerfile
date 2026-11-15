# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY sorteo-scraping /sorteo-scraping
USER 65534:65534
ENV GACHAPON_DATOS=/datos PORT=18698
EXPOSE 18698
ENTRYPOINT ["/sorteo-scraping"]
