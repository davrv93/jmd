# Arena JMD: el motor de juegos en vivo de JMD Learning

Arena JMD es el motor de los juegos de clase del modo LIVE. Cada alumno es un **robot JMD** con su color y su
accesorio. Se mueve con el teclado, con el mouse o con un joystick en el celular, y **ve a los demás moverse en vivo**.
Un juego nuevo se hace en una escena con unas 60 a 120 líneas de configuración, porque el motor ya trae todo esto:

- **Personajes:** robots con animación quieto, camina, festeja, aturdido y triste; emotes (teclas 1–6) y etiqueta con
  el nombre. El accesorio puede ser casco minero, chullo, gorra, corona, audífonos, birrete, moño o sombrero.
- **Movimiento:** WASD o flechas, clic o toque para ir a un punto y joystick en pantallas táctiles. Los demás se ven
  interpolados, sin saltos.
- **Mundo:** mapa cenital con muros, objetos que se recogen al pasar encima, zonas de entrega y peligros en ruta fija
  (vagoneta, roca o dron). Los peligros nunca eliminan: solo te hacen soltar lo que llevas.
- **Ronda:** el reloj y la semilla son comunes, así que todos ven el mismo mundo. También trae puntos que saltan,
  barra de meta del grupo, tabla en vivo, jugadas recientes y sonidos sintetizados con botón de silencio.
- **Nadie queda fuera:** un error vale 0 y muestra una **lupa** con la explicación. Quien llega tarde entra igual o
  pulsa **«Practicar solo»**. Sin conexión con la clase, el juego pasa solo a práctica.
- **Cierre:** podio, una reflexión que se publica en el muro de la clase (`/muro`) y **«la fotito»**, un PNG de
  1080 × 1350 con la marca JMD, el nombre, el robot, el curso y la sesión, el resultado y la reflexión.
- **Marca:** marco de noche violeta con oro, constelación JMD, el sello «ARENA», el curso y la sesión.

Juego de referencia: `lms/content/courses/goldenquerys-ia/live/gq-02/07-oro-o-pirita/escena.html` («¿Oro o pirita?»,
la mina de los números).

## 1. Dónde vive y cómo se carga

| Pieza | Archivo |
|---|---|
| Motor del cliente (un script clásico, sin módulos) | `lms/api/internal/httpapi/arena/arena-jmd.js` |
| Estilos del motor (los carga el script solo) | `lms/api/internal/httpapi/arena/arena-jmd.css` |
| Sala de tiempo real del servidor | `lms/api/internal/httpapi/live_patio.go` (pruebas en `live_patio_test.go`) |

El motor va **dentro del binario del LMS** (`go:embed`). Hay una sola copia para todos los cursos y siempre tiene la
misma versión que la API con la que habla. Se sirve en `GET /api/v1/live/{lección}/arena/{archivo}`, con sesión, igual
que `/comun/`. Desde cualquier escena se carga con esta ruta relativa:

```html
<script src="../../arena/arena-jmd.js"></script>
```

La escena se abre en `/api/v1/live/{lección}/escenas/{id}/html`, así que `../../arena/` siempre resuelve a la carpeta
del motor. No hay que copiar nada a `_comun`. Cumple la CSP de las escenas: todo del mismo origen, sin CDN ni fuentes
externas, imágenes por canvas y `connect-src 'self'`.

**Ojo al desplegar:** el motor es **código**, no contenido. Una escena nueva que lo usa necesita que el binario
nuevo esté arriba (`desplegar-lms.sh`). Si el contenido llega antes que el código, la escena muestra «El juego se está
actualizando» en vez de romperse. Eso pasa si copias el bloque de respaldo del ejemplo.

## 2. Escena mínima

Carpeta `live/<lección>/<NN-nombre>/` con `escena.yaml` y `escena.html`. Este ejemplo es completo y funciona tal cual:
el alumno recoge afirmaciones y las lleva a «Verdadero» o «Falso».

`escena.yaml`:

```yaml
id: 07-verdadero-o-falso
titulo: "Juego: ¿verdadero o falso?"
fase: conceptualizacion
paso: juego            # debe existir en el ciclo de la lección (o quítalo)
duracion_min: 8
lo_logre: true
evidencia: ninguna
compuerta: ninguna     # el juego no frena la clase
```

`escena.html`:

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Escena · ¿Verdadero o falso?</title>
<link rel="icon" href="data:,">
<style>html, body { margin: 0; height: 100%; background: #14122b; }</style>
</head>
<body>
<div id="juego">Cargando…</div>
<script src="../../arena/arena-jmd.js"></script>
<script>
(function () {
  if (!window.ArenaJMD) { document.getElementById("juego").textContent = "El juego se está actualizando: recarga en un minuto."; return; }

  var FRASES = [
    { t: "Un agente puede usar herramientas", v: true, x: "Sí: lee archivos, corre comandos y llama APIs." },
    { t: "Un modelo recuerda todo para siempre", v: false, x: "No: solo ve lo que cabe en su contexto." },
    { t: "Un skill es un archivo de instrucciones", v: true, x: "Sí: SKILL.md con pasos que el agente sigue." },
    { t: "MCP es un modelo de lenguaje", v: false, x: "No: es un protocolo para conectar herramientas." },
  ];

  var juego = ArenaJMD.crear({
    raiz: "#juego",
    titulo: "¿Verdadero o falso?",
    curso: "Programación agéntica", sesion: "Sesión 2 · Agentes y herramientas",
    mundo: { ancho: 1600, alto: 1000, tema: "patio" },
    reglas: ["Pasa sobre una burbuja para recogerla.", "Llévala a «Verdadero» o a «Falso».", "Errar no resta: lee la lupa y sigue."],
    zonas: [
      { id: "v", x: 1300, y: 80, w: 240, h: 220, nombre: "Verdadero", color: "#2fa35f", icono: "✅" },
      { id: "f", x: 1300, y: 700, w: 240, h: 220, nombre: "Falso", color: "#e3262e", icono: "❌" },
    ],
    muros: [[600, 300, 160, 120], [700, 650, 180, 100]],
    peligros: [{ tipo: "dron", ruta: [[1100, 120], [1100, 880]], vel: 130, aviso: "¡El dron te hizo soltarla! Volvió a su lugar." }],
    objetos: {
      cantidad: 6,
      crear: function (i, v, rnd, M) {            // usa SIEMPRE rnd, nunca Math.random: así todos ven lo mismo
        var k = (i + v * 6) % FRASES.length, p = M.lugarLibre(rnd, 40, { x: 60, y: 60, w: 1150, h: 880 });
        return { x: p.x, y: p.y, forma: "orbe", color: "#7b6cf0", frase: k, texto: FRASES[k].t.slice(0, 18) + "…" };
      },
    },
    tarjeta: function (ob) { return { etiqueta: "Afirmación", titulo: FRASES[ob.frase].t, pie: "¿Verdadero o falso? Llévala a su zona." }; },
    entregar: function (ob, zona) {
      var f = FRASES[ob.frase], ok = (zona.id === "v") === f.v;
      return ok ? { ok: true, puntos: 10, titulo: "¡Bien! +10", explicacion: f.x }
                : { ok: false, puntos: 0, titulo: "Casi", explicacion: f.x };
    },
    meta: { contador: "clase", texto: "Meta del grupo", unidad: "pts", objetivo: function (n) { return n * 30; } },
    reflexion: { clave: "g802-juego", pregunta: "¿Qué te llevas de este juego?", placeholder: "Me llevo…" },
    resultado: function (s) { return { etiqueta: "Mi ronda", resultado: juego.puntos + " puntos", detalle: s.aciertos + " aciertos de " + s.entregas }; },
  });
})();
</script>
</body>
</html>
```

Con esto ya funcionan la sala en vivo, el panel del instructor, la práctica, el final, el muro y la fotito.

## 3. `ArenaJMD.crear(opciones)`

Coordenadas en **unidades de mundo**. El tamaño por defecto es 1600 × 1000, con el origen arriba a la izquierda. Un
robot mide unas 90 unidades de alto y sus pies son el punto (x, y).

| Opción | Qué es |
|---|---|
| `raiz` | Selector o elemento donde se monta todo; el motor lo llena. |
| `titulo`, `subtitulo` | Nombre del juego (marco y entrada) y una línea debajo, que se oculta en el celular. |
| `curso`, `sesion` | Etiqueta de marca: el curso y la sesión, en el marco y en la fotito. |
| `fecha`, `hashtag` | Fecha de la fotito (por defecto, hoy en Lima) y su pie (`#ArenaJMD`). |
| `leccion`, `escena` | Salen solas de la URL; solo para pruebas fuera del LMS. |
| `duracion`, `duraciones` | Segundos por ronda (180) y los botones del instructor (`[180, 300]`). |
| `duracionPractica` | Segundos de la práctica sola (120 como máximo por defecto). |
| `mundo` | `{ ancho, alto, tema }`; `tema` es `"patio"` (lavanda de la marca) o `"mina"`. |
| `fondo(g, ayudas, rnd, mundo)` | Pinta encima del suelo (se pinta una vez por ronda: ahí va el arte fijo). |
| `jugador` | `{ accesorio, velocidad }`: accesorio inicial (`"casco"`…) y unidades por segundo (270). |
| `salida` | Rectángulo `{x, y, w, h}` donde aparecen los robots. |
| `reglas` | Tres líneas; salen en la entrada y en «Cómo se juega». |
| `muros` | `[{x, y, w, h}]` o `[[x, y, w, h]]`: bloquean el paso. |
| `zonas` | `[{ id, x, y, w, h, nombre, color, colorTexto, icono, entrega, pintar }]`. Al entrar con algo en la mano se llama `entregar`. `entrega: false` la vuelve decorativa. `pintar(g, zona, t, resalta)` dibuja tu propio arte. |
| `peligros` | `[{ tipo, ruta, vel, radio, circular, nombre, aviso, avisoSinCarga }]`. `tipo` es `"vagoneta"` (pinta sus rieles), `"roca"` o `"dron"`. `ruta` es `[[x, y], …]` y la recorre de ida y vuelta, o en vuelta si `circular: true`. Va sincronizada por la hora del servidor. |
| `decor` | `[{ tipo, x, y, s, color, texto, px }]`. `tipo` es `"farol"`, `"cristal"`, `"roca"`, `"planta"` o `"texto"`. |
| `generar(rnd, ayudas)` | En vez de lo fijo, devuelve `{ muros, zonas, peligros, decor, salida }` con la semilla de la ronda. |
| `objetos` | `{ cantidad, prefijo, crear(i, v, rnd, ayudas) }`. Ver §4. |
| `tarjeta(ob, api)` | Lo que se ve mientras lo llevas: `{ etiqueta, color, titulo, destacadoEtiqueta, destacado, lineas: [código], pie }`. |
| `entregar(ob, zona, api)` | Decide la jugada. Ver §5. |
| `meta` | `{ contador, texto, unidad, objetivo, fija, logro }`. Es la barra del grupo. `objetivo` es un número o `fn(activos)`. `fija` se manda al servidor al iniciar. `logro` es el texto al llenarla. |
| `reflexion` | `{ clave, pregunta, placeholder, porDefecto }`. `clave` es la escena del muro (`/muro`) y `porDefecto` el texto de la fotito si no escribe. |
| `resultado(stats, api)` | Devuelve `{ etiqueta, titulo, resultado, detalle }` para el final y la fotito. `stats` = `{ aciertos, fallos, entregas, bonus, golpes, puntos }`. |
| `alRonda`, `alTomar`, `alEntregar`, `alGolpe`, `alEvento`, `alReflexion` | Avisos, por si el juego lleva su propia cuenta. |

## 4. Objetos: deterministas y compartidos

Hay `cantidad` objetos con id `prefijo + i` (`ob0`, `ob1`…). Cada uno tiene una **versión** `v`: `crear(i, v, rnd, ayudas)`
describe el objeto `i` en su versión `v`. Esa descripción es `{ x, y, texto, forma, color, pintar, …tus datos }`, donde
`forma` es `"pepita"`, `"gema"`, `"carta"` u `"orbe"`.

- **Usa solo `rnd`**, que es el generador sembrado con la semilla de la ronda, `i` y `v`. Así todos los navegadores
  ven el mismo objeto en el mismo lugar.
- `ayudas.lugarLibre(rnd, radio, zona?)` da un punto lejos de muros, zonas y rutas de peligros.
- El servidor reparte los objetos. El primero que pasa encima se lo lleva (`tomar`); al otro le sale «¡Te lo ganaron!».
- Al entregar, el objeto se **consume**: pasa a `v + 1`, que es otro contenido en otro lugar. Si lo sueltas (Espacio o
  «Soltar») o te choca un peligro, vuelve a su lugar en la misma versión.
- Lo que lleva cada uno viaja en el instante, y los demás lo ven flotando sobre su cabeza.

## 5. `entregar`: lo que devuelve

```js
{ ok: true|false,          // acierto o error (el error nunca resta)
  puntos: 10,              // se suman a los tuyos y a la meta del grupo
  titulo: "¡Bien! +10",    // aviso corto
  explicacion: "…",        // la lupa: por qué (aparece también al acertar)
  real: "El número real: …",
  feed: "cazó pirita",     // la línea en «Jugadas» que ven todos
  meta: 10,                // cuánto suma a la meta (por defecto, los puntos; false para no sumar)
  rechazar: true, mensaje: "Aquí no va",   // no entrega: el objeto sigue en tu mano
  bonus: { pregunta, opciones: [..], correcta: 2, puntos: 5, codigo: true, segundos: 14, explicacion } }
```

`bonus` abre una pregunta rápida al acertar. En «¿Oro o pirita?» es «¿qué línea tiene la impureza?». Se responde con
clic o con las teclas 1–9. Con `codigo: true` las opciones se ven en monoespaciada.

## 6. Lo que devuelve `crear` (la `api`)

`puntos`, `stats`, `yo()`, `ronda()`, `ahora()` (hora del servidor), `sumarPuntos(n)`, `popup(x, y, texto, color)`,
`toast(texto, "bien"|"mal", ms)`, `lupa({ titulo, texto, real, icono, tipo, ms })`, `anuncio(grande, chico)`,
`sonido(nombre)`, `festejar()`, `emitir(tipo, texto, valor, x, y)`, `bono({...})`, `soltar()`, `sumarMeta(n)`,
`practicar()`, `entrar()` y `objeto(id)`.

Los sonidos son `tomar`, `bien`, `bonus`, `mal`, `golpe`, `emote`, `soltar`, `tic`, `inicio`, `fin` y `meta`.

`window.ArenaJMD` también expone `pintarRobot(ctx, x, y, escala, { color, accesorio, dir, anim })`,
`robotCanvas(px, opciones)`, `colores`, `accesorios`, `emotes`, `rng(semilla)` y `hash(texto)`.

## 7. El servidor: la sala `/patio`

Las reglas de acceso son las del LIVE: sesión iniciada y lección visible para el alumno, y la escena tiene que existir.
La sala vive en memoria, una por lección y escena, y dura lo que dura la clase. El servidor **no conoce las reglas del
juego**. Solo guarda el último estado de cada jugador, la ronda, los contadores y quién tiene cada objeto.

| Método y ruta | Qué hace |
|---|---|
| `GET /api/v1/live/{lección}/patio/stream?escena=…` | SSE. Al conectar llega `hola` `{yo, staff, nombre, t}` y luego `instante` unas 10 veces por segundo mientras haya cambios, más uno cada 2 s con la sala quieta. Hay ping cada 15 s. |
| `GET /api/v1/live/{lección}/patio?escena=…` | Devuelve `{yo, staff, instante}`, sin SSE. |
| `POST /api/v1/live/{lección}/patio` | `{escena, accion, …}`. Acciones del alumno: `estado` (por defecto), `evento`, `tomar`, `soltar`, `sumar` y `salir`. Acciones del staff: `iniciar`, `terminar` y `reiniciar`. |
| `GET /api/v1/live/{lección}/arena/{archivo}` | El motor (`arena-jmd.js`, `arena-jmd.css`). |

Campos de cada acción del `POST`:

- `estado`: `x`, `y`, `dir` (0–7), `anim`, `emote`, `carga`, `equipo`, `puntos` (0–1 000 000) y
  `avatar {color 0–31, accesorio}`. Solo cambia lo que se manda.
- `evento`: `tipo`, `texto` (80 caracteres como máximo), `valor`, `ex` y `ey`. Viaja en el siguiente instante.
- `tomar`: `objeto` y `v`. Devuelve 409 si es de otro o si ya cambió de versión. `soltar`: `objeto` y `consumir`.
- `sumar`: `contador` y `valor` (de −100 a 100). El contador nunca baja de 0.
- `iniciar`: `duracion_s` (de 20 a 1800; si falta o está fuera de rango, 180), `semilla?` y `meta?`. Pone puntos,
  objetos y contadores a cero, y los jugadores se quedan. `terminar` cierra el reloj; `reiniciar` vuelve al
  calentamiento con otra semilla.
- En `final` no se puede `tomar` ni `sumar`. Moverse y saludar sí.

**Límites:**

- Cuerpo de 2 KB como máximo (si no, 413).
- 40 jugadores por sala. Si llega uno más, sale el que lleva más tiempo inactivo; si todos están activos, 409.
- 120 conexiones SSE por sala (429).
- Un jugador sale de la sala tras 20 s sin mandar nada y suelta lo que tenía.
- Límite por alumno con cubeta de fichas: `estado` 15/s (ráfaga de 20), `evento` 2/s (ráfaga de 6) y `tomar`,
  `soltar` y `sumar` 6/s (ráfaga de 12). Al pasarse, 429.
- 300 objetos y 8 contadores por sala; la tabla muestra los 10 primeros.
- Los ids (`anim`, `emote`, `carga`, objeto, contador, tipo) son `[a-z0-9][a-z0-9_-]{0,23}`.

**El instante** usa claves cortas, porque viaja unas 10 veces por segundo y pesa unos 4 KB con 25 jugadores:

```
{ t, r: {n, estado: espera|jugando|final, semilla, inicio_ms, fin_ms, duracion_s, meta},
  c: {contador: n}, j: [{id, n, c, a, x, y, d, m, e, es, k, q, p}],     // n nombre, c color, a accesorio, d dir, m anim, k carga, p puntos
  tb: [{id, n, c, a, p, on}], tt, o: [{id, v, d}], ev: [{n, de, tipo, texto, valor, x, y}] }
```

El cliente manda su estado cada 100 ms como máximo mientras se mueve y cada 3 s si está quieto. Dibuja a los demás
140 ms en el pasado, interpolando entre instantes.

## 8. Probar

- `?demo=1` entra solo; `?sinred=1` fuerza la práctica local sin API; `?fps=1` muestra los cuadros por segundo.
- `window.__arenaJMD` trae `fps`, `ms` (costo medio de un cuadro), `msMax`, `jugadores`, `dpr` y `errores`, además de
  `yo()`, `libres()` (objetos libres en coordenadas de pantalla) e `ir(x, y)`, que sirven para Playwright.
- API local con contenido de prueba: `LMS_CONTENT_DIR` apuntando a una copia con solo tu curso. Con
  `LMS_INVITE_CODE` y `LMS_COHORT` los alumnos se registran. Hay que crear archivos de relleno para los materiales que
  no copies.
- Mide en 390 px y en 1440 px, con `reducedMotion: "reduce"` y con 25 páginas a la vez.
- `go test ./internal/httpapi -run Patio` prueba la sala.

Medido el 08-11-2026 con 25 alumnos en Chrome sin pantalla en un Mac:

- Pintar un cuadro con 25 robots cuesta **0,35 ms** a 1440 px y **1 ms** en un teléfono de 390 px con la CPU
  4 veces más lenta. El presupuesto a 60 fps es de 16,7 ms.
- Los fps medidos (52–57) los pone el compositor sin pantalla con 26 pestañas abiertas, no el motor.
- Si un cuadro pasa de 9 ms durante 3 s seguidos, el motor baja solo la resolución (DPR 1).

## 9. Reglas de diseño (no negociables)

- **Nunca frustrante:** sin eliminación, los errores no restan y cada error enseña con una lupa corta. Los peligros
  solo te hacen soltar lo que llevas.
- **Que cualquiera entienda en 5 segundos:** tres reglas, con verbos (recoge, lleva, toca). La tarjeta de lo que llevas
  dice adónde va.
- **Texto en español del Perú**, cercano y claro. Nunca «ya pe».
- **Contenido real de la clase** en los objetos: números, código, conceptos o comandos de esa sesión.
- **Movimiento reducido:** el motor ya respeta `prefers-reduced-motion`, y tu arte en `pintar` también debe hacerlo.
  Si `t` anima algo, que no sea imprescindible.
- **Un juego por escena:** la sala es por lección y escena. Si dos escenas usan Arena, cada una tiene su propia mina.

## 10. Lista para un juego nuevo

1. Copia el ejemplo del §2 o la escena de referencia y cambia `curso`, `sesion`, `titulo` y `reglas`.
2. Pon el contenido de la clase en `objetos.crear` (con `rnd`) y la decisión en `entregar`, con `explicacion` siempre.
3. Pon zonas claras (`nombre` + `icono`), uno o dos peligros y algún muro que obligue a moverse sin laberintos.
4. Define `meta`, `reflexion` (con la `clave` del muro de esa escena) y `resultado`, de modo que todos reciban un título.
5. Prueba con `?sinred=1` y luego contra la API local con varios alumnos. Mira las capturas en 390 y 1440 px.
6. Despliega primero el código (si el motor cambió) y después el contenido.
