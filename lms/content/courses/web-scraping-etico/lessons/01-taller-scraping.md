---
id: ws-01
title: "Taller · Scraping ético en el navegador y en el servidor"
published: true
starts_at: 2026-11-08T15:00:00-05:00
objectives:
  - id: ws-01-o1
    title: Decidir qué se puede extraer y cómo, leyendo robots.txt, los términos de uso y los límites del sitio
  - id: ws-01-o2
    title: Extraer datos mientras navegas con un script de Tampermonkey
  - id: ws-01-o3
    title: Extraer con Python en un servidor EC2 usando sesión (cookie y token) y exportar a CSV y JSON
recording:
  url: ""
  passcode: ""
materials:
  - id: ws-01-m1
    title: Tampermonkey · extensión para scripts en el navegador
    kind: link
    url: https://www.tampermonkey.net/
    objective_ids: [ws-01-o2]
  - id: ws-01-m2
    title: robots.txt · cómo funciona (Google Search Central)
    kind: doc
    url: https://developers.google.com/search/docs/crawling-indexing/robots/intro
    objective_ids: [ws-01-o1]
  - id: ws-01-m3
    title: Requests · la librería HTTP de Python
    kind: doc
    url: https://requests.readthedocs.io/
    objective_ids: [ws-01-o3]
  - id: ws-01-video
    title: "Video: scraping ético en 40 segundos"
    kind: file
    file: materials/video-ws-01.mp4
    objective_ids: [ws-01-o1]
  - id: ws-01-m4
    title: Sitio de práctica · quotes.toscrape.com (hecho para practicar scraping)
    kind: link
    url: https://quotes.toscrape.com/
    objective_ids: [ws-01-o2, ws-01-o3]
cycle:
  - id: ver
    title: Ver el taller
    tool: zoom
    phase: experiencia
    description: "Asiste en vivo o mira la grabación. Elige tu arañita y vive la tienda de Rosa: a mano, con un bot apurado y con un bot cortés."
    check: Has visto el taller completo (o la grabación)
  - id: reglas
    title: Revisar las reglas del sitio
    tool: lms
    phase: reflexion
    description: Antes de extraer, lee el robots.txt y los términos del sitio que elegiste y anota qué está permitido. Arma tu semáforo y envía tu ficha.
    check: Tienes anotado qué se puede extraer y a qué ritmo
  - id: navegador
    title: Extraer en el navegador con Tampermonkey
    tool: lms
    phase: experiencia
    description: Instala Tampermonkey, pega el script del taller y recorre tres páginas de quotes.toscrape.com. Exporta lo que juntaste a CSV y JSON.
    check: Tu script junta 30 frases de 3 páginas, sin repetidas, y descarga frases.csv y frases.json
  - id: extraer
    title: Extraer y exportar desde el servidor
    tool: terminal
    phase: experimentacion
    description: Extrae una lista con paginación, pausas y reintentos, con sesión (cookie y token en la cabecera), y expórtala a CSV y JSON.
    check: Tu CSV y tu JSON abren limpios y sin filas repetidas
  - id: ia
    title: Pedirle a la IA el extractor y corregirlo
    tool: lms
    phase: experimentacion
    description: Arma un prompt con las reglas del taller y un solo elemento del HTML, prueba el script con una página y practica una corrección sin pegar cookies, tokens ni datos personales.
    check: Tienes tu prompt con reglas y entendiste la causa de un error que la IA te ayudó a corregir
  - id: compartir
    title: Compartir lo que te llevas
    tool: lms
    phase: reflexion
    description: Publica en el muro qué te llevas del taller y guarda tu fotito con tu resultado y tu reflexión.
    check: Tu reflexión está en el muro y guardaste tu fotito
---

# Agenda del taller (hora de Lima)

- **3:00** · Scraping ético: robots.txt, términos de uso y límites
- **3:30** · Tampermonkey y scripts en el navegador
- **4:15** · Python en el servidor (EC2): sesión, cookies y token en la cabecera; la IA escribe y corrige
- **5:00** · Juego «La telaraña cortés»; limpiar y exportar: CSV y JSON; casos reales
- **5:40** · Cierre, certificado e insignia

## Las cuatro reglas antes de extraer

1. **robots.txt.** Está en `/robots.txt` de cada dominio. `Disallow` dice qué rutas no visitar; `Allow`, cuáles sí. Si existe `Crawl-delay`, es la pausa que el sitio te pide. Que no exista no te da permiso para saturar.
2. **Términos de uso.** Busca «robot», «automatizado», «scraping» o «uso comercial». Si hay una API o una descarga oficial, úsala primero. Si lo prohíben, pide permiso.
3. **Ritmo.** Una pausa de 1 a 3 segundos entre pedidos, con un poco de azar. Si el sitio responde `429`, espera lo que diga `Retry-After`. Usa un `User-Agent` honesto y no pidas dos veces lo que ya tienes.
4. **Datos personales.** Nombre con DNI, teléfono, correo o dirección son datos personales (en el Perú los protege la Ley 29733). Extrae lo mínimo; si no los necesitas, no los guardes.

> Esto es una guía práctica, no asesoría legal. Para un proyecto comercial grande, consulta a un abogado.

## Navegador o servidor

| | Navegador (Tampermonkey) | Servidor (Python) |
|---|---|---|
| Sesión | La tuya, ya iniciada | Cookie o token en la cabecera |
| Ritmo | El tuyo: un clic, una página | Pausas que tú programas |
| Escala | Decenas de páginas | Miles, de noche y sin ti |

La cookie y el token son tu llave: van en una variable de entorno (`read -rs TOKEN && export TOKEN`), nunca en el código, en git ni en el chat de la IA.

## Lo que haces en el taller

- **En el navegador:** un script de Tampermonkey que junta las frases de [quotes.toscrape.com](https://quotes.toscrape.com/) mientras pasas de página, sin repetidas, y las descarga como `frases.csv` y `frases.json`. Si no puedes instalar extensiones, el mismo extractor se pega en la consola (F12).
- **En el servidor:** `extractor.py` lee el robots.txt, inicia sesión con el token CSRF del formulario (la cookie queda en la sesión), recorre las páginas de la API del sitio con pausas y reintentos, limpia y exporta a CSV (UTF-8 con BOM, para que Excel lea las tildes) y JSON.
- **Con la IA:** un prompt con las reglas del taller y un solo elemento del HTML; después, una corrección con el error completo, las líneas donde falla y un pedazo del HTML, sin cookies ni datos personales.
- **Limpiar:** espacios de más, comillas, precios como texto, filas vacías, columnas con datos personales y filas repetidas. Limpia primero y compara después: las repetidas aparecen al normalizar.

## Antes de la próxima vez

Elige un sitio real que te interese, arma su semáforo (robots.txt, términos, API, datos personales y ritmo) y, si da verde, adapta tu extractor con la IA probando primero con una sola página.
