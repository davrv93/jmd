---
id: sor-02
title: "Parte 2 · Juegos que revelan el premio"
published: true
duration: 30
objectives:
  - {id: sor-02-o1, title: "Configurar pesos y topes de premios, y comprobar con pruebas que no se pasan"}
  - {id: sor-02-o2, title: "Usar un mazo fijo barajado una sola vez y una palabra de grupo para entrar"}
  - {id: sor-02-o3, title: "Diseñar una animación que revela un premio ya decidido"}
materials:
  - {id: sor-02-repo, title: "Repo en GitHub · ejemplos 03 (gachapon), 04 (pirámide) y 06 (colibrí)", kind: link, url: https://github.com/davrv93/sorteos-con-ia-ejemplos}
  - {id: sor-02-v03, title: "Video 3 · Gachapon: la máquina de cápsulas", kind: video, file: materials/grabaciones/03-gachapon.mp4, objective_ids: [sor-02-o1]}
  - {id: sor-02-v04, title: "Video 4 · La pirámide de treinta puertas", kind: video, file: materials/grabaciones/04-puertas-piramide.mp4, objective_ids: [sor-02-o2]}
  - {id: sor-02-v06, title: "Video 6 · Detén el aleteo del colibrí", kind: video, file: materials/grabaciones/06-colibri-aleteo.mp4, objective_ids: [sor-02-o3]}
cycle:
  - id: ver
    title: Mira los videos 3, 4 y 6
    tool: lms
    phase: experiencia
    description: Tres maneras de revelar un premio — una cápsula, una puerta y un toque que congela un video.
    check: Viste los tres videos
  - id: jugar
    title: Levanta el gachapon y juega diez veces
    tool: docker
    phase: experiencia
    description: En 03-gachapon, docker compose up -d --build. Juega con diez números distintos y mira en el panel qué descuentos salieron.
    check: El panel muestra diez participantes y los cupones entregados por descuento
  - id: comparar
    title: Pesos o mazo fijo
    tool: lms
    phase: reflexion
    description: El gachapon sortea por pesos; la pirámide reparte un mazo fijo. Anota cuándo te conviene cada uno (pista — ¿sabes cuánta gente va a jugar?).
    check: Tienes una regla para elegir entre los dos
  - id: topes
    title: Topes que no se pasan
    tool: terminal
    phase: conceptualizacion
    description: Abre config.json del gachapon y la pirámide. Cambia un tope, vuelve a construir y mira que las pruebas en Go lo comprueban dentro de Docker.
    check: docker compose up -d --build pasa las pruebas con tu cambio
  - id: crear
    title: Tu juego que revela
    tool: claude-code
    phase: experimentacion
    description: Pide a tu agente un juego que revele el premio con tu propia metáfora (una carta, un cofre, un dado). Usa el pedido del ejemplo más parecido como base.
    check: Tu juego revela un premio que ya estaba guardado en el servidor
---
## Parte 2 · Juegos que revelan el premio

En los tres ejemplos de esta parte la persona siente que juega, pero el premio ya estaba decidido.

- **Gachapon (video 3):** cada descuento sale según su **peso** y nunca pasa su **tope**. Cupón con
  vencimiento y un catálogo con el precio de cada taller con el cupón.
- **Pirámide (video 4):** un **mazo fijo** de 30 puertas (8 trampas) barajado una sola vez. Para
  entrar hace falta la **palabra del grupo**.
- **Colibrí (video 6):** el toque congela el video y revela el premio. Tocar antes o después no cambia nada.

### Pesos o mazo fijo

| | Pesos y topes (gachapon, colibrí) | Mazo fijo (pirámide) |
|---|---|---|
| Cuándo | No sabes cuánta gente jugará | Sabes cuántos intentos habrá |
| Reparto | Aproximado, con techo por premio | Exacto: lo que pusiste en el mazo |
| Dónde se define | `config.json`: `peso` y `tope` | `config.json`: `cantidad` por premio |

### Cambia un tope y comprueba

```bash
cd sorteos-con-ia-ejemplos/03-gachapon
# edita config.json: por ejemplo, el tope del 50 % de 10 a 3
docker compose up -d --build
```

La imagen corre `go test` antes de compilar: si una prueba falla, no se levanta.

### El segundo pedido

Cuando algo sale mal, no pidas «arréglalo» a secas. Di el lugar, el cambio y qué no tocar:

```text
En web/index.html, el botón «Girar» se ve detrás de la ruleta en el celular (pantalla de 390 px).
Muévelo debajo de la ruleta y súbele el contraste. No toques nada más: ni el servidor ni los premios.
Comprobación: una captura a 390 × 844 donde el botón se vea completo.
```

**Entregable:** tu juego que revela un premio, con tus pesos o tu mazo.
