---
id: cs-02
title: "Charla gratuita · Payloads y rutas ofuscadas, con patrón gateway"
published: true
starts_at: 2026-11-06T16:30:00-05:00
duration: 35
objectives:
  - id: cs-02-o1
    title: Distinguir ofuscar, cifrar y proteger, y explicar por qué ofuscar no es seguridad
  - id: cs-02-o2
    title: Reconocer qué centraliza un gateway, qué beneficios da y cuánto cuesta
  - id: cs-02-o3
    title: Ordenar las medidas para llevarlas a la API de tu empresa
recording:
  url: ""
  passcode: ""
materials:
  - id: cs-02-m1
    title: OWASP API Security Top 10 2023
    kind: doc
    url: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
    objective_ids: [cs-02-o1, cs-02-o3]
  - id: cs-02-m2
    title: REST Security Cheat Sheet de OWASP
    kind: doc
    url: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
    objective_ids: [cs-02-o3]
  - id: cs-02-m3
    title: Patrón Gateway Routing · Azure Architecture Center
    kind: doc
    url: https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-routing
    objective_ids: [cs-02-o2]
  - id: cs-02-m4
    title: Proyecto de ejemplo de la charla
    kind: repo
    url: https://github.com/davrv93/jmd/tree/main/charla-seguridad-2-gateway
    objective_ids: [cs-02-o2, cs-02-o3]
cycle:
  - id: ver
    title: Ver la charla
    tool: zoom
    phase: experiencia
    description: Asiste en vivo. Pide el enlace por WhatsApp al 986 149 476.
    check: Has visto la charla
  - id: simular
    title: Correr las simulaciones
    tool: terminal
    phase: experimentacion
    description: Levanta el proyecto de ejemplo con npm start y corre los ataques del panel.
    check: Viste cada ataque en las dos columnas del panel
  - id: aplicar
    title: Llevarlo a tu empresa
    tool: lms
    phase: experimentacion
    description: Toma una API tuya y pásala por la lista de esta página, en orden.
    check: Revisaste los siete puntos de la lista
---

# Ofuscar no es seguridad

Ocultar rutas y cifrar el payload sube el costo y regala menos información. No protege por sí solo: quien controla
el navegador ve la clave y el mensaje antes de cifrar. Lo que protege es la autenticación, la autorización en el
servidor, la validación, TLS, los límites y el registro. El gateway es el lugar para centralizarlo.

**Hoy viernes 6 de noviembre, 4:30 p. m. (Lima), 35 minutos.** Pide el enlace por WhatsApp al 986 149 476.

## Lleva esto a tu empresa, en este orden

1. TLS en todo y cookies HttpOnly, Secure y SameSite
2. Autorización en cada ruta, comprobando al dueño
3. Validación con lista de campos permitidos
4. Límites por IP y por sesión
5. Registro con referencia, sin datos sensibles
6. Backend accesible solo desde el gateway
7. Recién ahí, ofusca si suma

## Cookies HttpOnly y rutas dinámicas

Ayudan, y no hacen imposible robar credenciales. Una cookie HttpOnly no se lee desde JavaScript, pero un script
inyectado puede seguir pidiendo cosas desde tu página. Una ruta dinámica caduca, pero quien tiene la sesión pide
la vigente.

## Simula con responsabilidad

Prueba solo en sistemas tuyos o con permiso escrito. El proyecto de ejemplo corre en tu máquina, con datos ficticios.
