---
id: ipt-01
title: "Sesión 1 · Cuenta, clave y la foto de tu sistema"
published: true
starts_at: 2026-11-15T19:30:00-05:00
objectives:
  - id: ipt-01-o1
    title: Crear tu cuenta de la plataforma de DeepSeek, ver tu saldo y guardar una API key en un gestor de contraseñas sin pegarla en ningún chat
  - id: ipt-01-o2
    title: Abrir DeepSeek Harness (dsh) con tu clave, en tu aula del LIVE (aula dsh clave y aula dsh web) o en tu laptop (npx y Settings → Models), y decidir sobre «Upload Session Log»
  - id: ipt-01-o3
    title: Elegir uno de los 15 sistemas de práctica, usarlo con dos roles y tomar su foto (FOTO/FOTO.md, FOTO.json y hashes.txt)
  - id: ipt-01-o4
    title: Separar lo observado en archivo de lo por verificar en la foto y comprobar 5 afirmaciones contra el código
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: ipt-01-guia-visual
    title: Guía visual de la sesión (12 diapositivas, capturas reales y esquemas rotulados)
    kind: slides
    slides_dir: materials/guia-visual-s1
    objective_ids: [ipt-01-o1, ipt-01-o2, ipt-01-o3]
  - id: ipt-01-guia-texto
    title: "Guía en texto: cuenta, recarga, clave y primer uso de dsh (verificada el 31-10-2026)"
    kind: doc
    file: materials/guia-deepseek-cuenta-recarga-api.md
    objective_ids: [ipt-01-o1, ipt-01-o2]
  - id: ipt-01-kit
    title: Kit «Foto del sistema» (skill, AGENTS.sistema.md y foto.mjs; para tu laptop, Ruta A; el aula ya lo trae)
    kind: zip
    file: materials/kit-foto-del-sistema.zip
    objective_ids: [ipt-01-o3, ipt-01-o4]
  - id: ipt-01-sis-muebleria
    title: "Sistema de práctica «muebleria» · Maderas del Sur · Ventas (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/muebleria.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-papeleria
    title: "Sistema de práctica «papeleria» · Papelería Útil (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/papeleria.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-abogados
    title: "Sistema de práctica «abogados» · Estudio Jurídico Paredes & Asociados (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/abogados.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-centro-salud
    title: "Sistema de práctica «centro-salud» · Centro de Salud Santa Rosa (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/centro-salud.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-consultora-software
    title: "Sistema de práctica «consultora-software» · Nexa Soluciones TI (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/consultora-software.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-fabrica-bi
    title: "Sistema de práctica «fabrica-bi» · DataFactory (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/fabrica-bi.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-lab-redes
    title: "Sistema de práctica «lab-redes» · Laboratorio de Redes Andino (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/lab-redes.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-linea-produccion
    title: "Sistema de práctica «linea-produccion» · Manufacturas Altiplano (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/linea-produccion.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-botica
    title: "Sistema de práctica «botica» · Botica Salud Total (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/botica.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-restaurante
    title: "Sistema de práctica «restaurante» · Sabores del Colca (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/restaurante.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-taller-mecanico
    title: "Sistema de práctica «taller-mecanico» · Taller Automotriz Los Andes (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/taller-mecanico.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-colegio
    title: "Sistema de práctica «colegio» · I.E. San Martín (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/colegio.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-transportes
    title: "Sistema de práctica «transportes» · Transportes Andes Cargo (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/transportes.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-hotel
    title: "Sistema de práctica «hotel» · Hostal Plaza Mayor (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/hotel.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-sis-constructora
    title: "Sistema de práctica «constructora» · Constructora Ingeniería Sur (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/constructora.zip
    objective_ids: [ipt-01-o3]
  - id: ipt-01-m-repo
    title: DeepSeek Harness · repositorio oficial (código, README, licencia MIT)
    kind: repo
    url: https://github.com/deepseek-ai/deepseek-harness
    objective_ids: [ipt-01-o2]
  - id: ipt-01-m-node
    title: "Node.js · descarga (solo para tu laptop, Ruta A: dsh pide 24.9 o más; el aula ya lo trae)"
    kind: link
    url: https://nodejs.org/
    objective_ids: [ipt-01-o2]
  - id: ipt-01-m-agents
    title: AGENTS.md · el formato abierto de instrucciones para agentes
    kind: doc
    url: https://agents.md/
    objective_ids: [ipt-01-o3, ipt-01-o4]
  - id: ipt-01-m-plat
    title: Plataforma de DeepSeek · cuenta, recarga y API keys (escríbela tú mismo)
    kind: link
    url: https://platform.deepseek.com
    objective_ids: [ipt-01-o1]
  - id: ipt-01-m-api
    title: Documentación de la API de DeepSeek · precios, errores y límites
    kind: doc
    url: https://api-docs.deepseek.com
    objective_ids: [ipt-01-o1]
cycle:
  - id: ver
    title: Ver la clase y abrir el mapa del día
    tool: zoom
    phase: experiencia
    description: Asiste en vivo (domingo 15 de noviembre, 7:30 pm) o mira la grabación. En la escena 1 marca tu lista previa.
    check: Abriste la terminal de tu aula del LIVE y tienes un gestor de contraseñas
  - id: cuenta
    title: Crear la cuenta y ver el saldo
    tool: lms
    phase: experiencia
    description: En la escena 2 recorre los esquemas y la lista «antes de pagar». Luego, en tu navegador, crea tu cuenta y mira Top Up y Billing. Nadie paga en vivo.
    check: Ves tu saldo en la plataforma, aunque sea 0
  - id: clave
    title: Crear y guardar la API key
    tool: lms
    phase: experiencia
    description: En la escena 3 juega «dónde SÍ y dónde NO». Luego crea tu clave y guárdala en tu gestor de contraseñas.
    check: Colocaste los 8 lugares y tu clave solo existe en tu gestor
  - id: dsh
    title: Abrir dsh y poner la clave
    tool: terminal
    phase: experiencia
    description: "Sigue la escena 4. En tu aula: aula dsh clave, aula dsh web y abre tu enlace. En tu laptop: npx @deepseek-ai/dsh web, clave en Settings → Models y decisión sobre Upload Session Log."
    check: Tu dsh abre (tu enlace del aula o 127.0.0.1:3080) y «Select model» muestra modelos con tu clave
  - id: sistema
    title: Elegir tu sistema y usarlo
    tool: lms
    phase: reflexion
    description: "En la escena 5 elige tu sistema. Ruta B: aula sistema <id> y úsalo en el Visor. Ruta A: descomprime su zip. Entra con dos roles."
    check: Elegiste tu sistema y lo abriste con al menos dos roles
  - id: foto
    title: Tomar y leer la foto
    tool: terminal
    phase: conceptualizacion
    description: "En la escena 6 clasifica las afirmaciones de una foto real. Luego toma la tuya: aula sistema foto o node skills/foto-del-sistema/motor/foto.mjs ."
    check: FOTO/ tiene FOTO.md, FOTO.json y hashes.txt, y tu acuerdo en la escena fue de 80 % o más
  - id: instrucciones
    title: Dar reglas a tu agente
    tool: terminal
    phase: reflexion
    description: En la escena 7 mira las seis reglas de AGENTS.md. Deja AGENTS.md y la skill en tu sistema (en el aula, AGENTS.md ya está y la skill se copia de /opt/skills-curso) y pide la foto a dsh.
    check: AGENTS.md y skills/foto-del-sistema están en la carpeta de tu sistema
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la clase en el hilo de la sesión o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar la foto y tus dudas verificables
    tool: git
    phase: experimentacion
    description: Sube FOTO/, docs/DUDAS_VERIFICABLES.md y una captura de tu sistema a tu repo, y entrégalo desde el LMS (URL + commit o zip).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Hoy dejas todo listo para trabajar: tu cuenta, tu clave, dsh abierto con ella y **la foto de tu sistema**.
DeepSeek Harness está en **developer preview**: si tu pantalla difiere, manda la documentación oficial.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · Mapa del día | Marcas tu lista previa | Aula abierta y gestor listo |
| 2 · Cuenta y saldo | Recorres los esquemas | Ves tu saldo |
| 3 · API key | Juegas «dónde SÍ y dónde NO» | 8 de 8 y clave solo en tu gestor |
| 4 · Abrir dsh | `aula dsh clave` y `aula dsh web` (o npx en tu laptop) | Select model con tu clave |
| 5 · Tu sistema | Eliges 1 de 15 y lo usas | Dos roles probados |
| 6 · La foto | Clasificas y tomas la tuya | FOTO/ con 3 archivos |
| 7 · AGENTS.md y tarea | Ves las 6 reglas | Skill y AGENTS.md en tu carpeta |

Dos rutas, las dos completas:

- **Ruta B · tu aula del LIVE** (la de la clase): todo instalado. El aula sale a internet solo por el proxy de la
  clase y trae Node 24 y dsh 0.2.1-rc.5: no instalas nada en tu laptop. `aula sistema <id>` → `aula dsh clave` →
  `aula dsh web` (o `aula dsh "tarea"` en la terminal). El sistema se usa en el Visor: `/vista/<tú>/sistema/`.
- **Ruta A · tu laptop** (para trabajar en casa): dsh con `npx @deepseek-ai/dsh web` (Node 24.9 o más), el zip de
  tu sistema y el kit.

En las dos, la clave es **la tuya** (tu cuenta y tu saldo en DeepSeek).

## Antes de la clase

- [ ] Sabes entrar a tu aula del LIVE y abrir su terminal (ahí ya están Node 24 y dsh).
- [ ] Tienes un gestor de contraseñas.
- [ ] Tienes con qué recargar saldo en DeepSeek (nadie paga en vivo).
- [ ] Opcional, Ruta A: `node -v` dice v24.9.0 o mayor y corriste `npx @deepseek-ai/dsh web` una vez (la primera
  tarda 5 a 6 minutos); el kit y el zip de tu sistema los bajas en la escena 5.

## 2 · Cuenta y saldo

**Objetivo:** tener cuenta y saber cómo recargar sin sorpresas.

1. Escribe tú mismo `platform.deepseek.com`.
2. Regístrate con correo, teléfono o Google.
3. Abre **Top Up** y mira tu saldo.
4. Lee monto, comisión, moneda y tipo de cambio antes de pagar.

**Qué deberías ver:** tu sesión abierta y tu saldo. **Si falla:** el código no llega → espera, revisa spam, pide otro.
Mínimo de recarga, Visa/Mastercard de Perú y Yape/Plin: **verifica en tu pantalla**.

## 3 · API key

**Objetivo:** crear la clave y guardarla donde no se filtre.

1. Abre **API Keys** y crea una clave con nombre (por ejemplo `curso-dsh`).
2. Cópiala al instante y guárdala en tu gestor.
3. Nunca en chats, capturas, git ni README.

**Si falla:** si se filtró, bórrala (papelera → Revoke) y crea otra.

## 4 · Abrir dsh

**Objetivo:** dsh abierto con tu clave.

**En tu aula (Ruta B), tres pasos:**

1. `aula dsh clave`: pega tu API key (no se ve al escribir). Queda solo en la memoria del aula; si el aula se
   reinicia, la vuelves a pegar. `aula dsh olvidar` la borra.
2. `aula dsh web`: arranca la interfaz web de dsh e imprime tu enlace (`https://jmd-learn.online/dsh/<tú>/?…`).
3. Abre el enlace: es la misma interfaz de las capturas. Solo lo abren tú y el instructor; no lo compartas.

«Upload Session Log» viene **apagado** en el aula. Sin web: `aula dsh "tarea"` responde en la terminal con un
resumen de uso, y `aula dsh` a secas abre un modo `dsh> ` donde cada línea es una tarea. `aula dsh estado` te dice
qué hay; `aula dsh web parar` la apaga.

**En tu laptop (Ruta A):**

1. `npx @deepseek-ai/dsh web` → **Continue**.
2. **Add API Key**, o More → Settings → Models → **Apply**.
3. Decide sobre **Upload Session Log** (en la laptop viene activado).
4. **Add workspace…** y elige la carpeta de tu sistema.
5. Primer prompt: `Summarize this repository and identify its main packages.`

**Qué deberías ver:** el agente responde y pide aprobar acciones. **Si falla:** 401 clave mala · 402 sin saldo · 429 demasiadas peticiones. En el aula, «sin salida a internet por el proxy» → avisa al instructor.

## 5 · Tu sistema

**Objetivo:** elegir uno de los 15 y conocerlo por dentro.

1. Filtra por rubro o rol y elige el tuyo.
2. Ruta B: `aula sistema <id>` (y, si ya abriste la web de dsh, `aula dsh web parar` y `aula dsh web` para que trabaje en `/trabajo/sistema`). Ruta A: zip de Materiales.
3. Entra con dos roles y compara el menú.

**Qué deberías ver:** el mismo sistema con menús distintos por rol. **Si falla:** no entra → revisa `LEEME.txt` (usuarios y claves de demostración).

## 6 · La foto

**Objetivo:** tener FOTO/ y leerla con criterio.

1. Aula: `aula sistema foto`. Laptop: `node skills/foto-del-sistema/motor/foto.mjs .`
2. Lee `FOTO/FOTO.md`.
3. Observado = tiene `archivo:línea`. Pista = por verificar.

**Qué deberías ver:** `FOTO/` con `FOTO.md`, `FOTO.json` y `hashes.txt`. **Si falla:** «no existe la carpeta» → estás fuera de tu sistema.

## 7 · AGENTS.md y skill

**Objetivo:** que tu agente lea la foto primero y no invente.

1. Ruta B: `AGENTS.md` ya está; copia la skill con
   `mkdir -p /trabajo/sistema/skills && cp -R /opt/skills-curso/foto-del-sistema /trabajo/sistema/skills/`.
   Ruta A: copia `skills/` y `AGENTS.md` del kit a tu sistema.
2. Dile a dsh (web o `aula dsh "…"`): «Lee AGENTS.md y skills/foto-del-sistema/SKILL.md».
3. El agente `jmd` del aula también trae la skill, por si te quedas sin saldo.

**Qué deberías ver:** el agente abre `FOTO/FOTO.md` antes que el código y cita `archivo:línea`. **Si falla:** inventa rutas → recuérdale la regla «no inventes».

## Tarea

- `FOTO/` de tu sistema.
- `docs/DUDAS_VERIFICABLES.md` con **5 afirmaciones** de la foto comprobadas contra el código.
- Una **captura** de tu sistema funcionando.
- Entrega URL + commit o zip. En la sesión 2 medirás cuánto gasta tu sistema con y sin foto.
