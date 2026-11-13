#!/usr/bin/env python3
"""Reorganiza los nueve grupos de Programación agéntica (vibecoding), 13-11-2026.

- «Mi ruta» pasa a seis pasos por clase. Los pasos que quedan conservan su id, así el avance ya
  marcado no se pierde; los demás se funden en ellos.
- Las escenas del LIVE que apuntaban a un paso fundido apuntan al paso que lo absorbió. Solo la
  ÚLTIMA escena de cada bloque conserva el paso: «Lo logré» marca el paso al terminar el bloque,
  no en su primera escena.
- Los videos (.mp4) pasan a `kind: video` y al principio de la lista de materiales.

Se puede correr varias veces: una clase que ya tiene seis pasos no se toca.
    python3 lms/scripts/vibecoding_ruta_corta.py [--seco]
"""
import glob, os, re, sys

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "courses")
GRUPOS = ["programacion-agentica"] + [f"programacion-agentica-g{n}" for n in (2, 3, 4, 5, 6, 8, 9, 10)]
SECO = "--seco" in sys.argv


def paso(id, titulo, herramienta, fase, descripcion, comprobacion):
    c = lambda s: '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return (f"  - id: {id}\n    title: {c(titulo)}\n    tool: {herramienta}\n    phase: {fase}\n"
            f"    description: {c(descripcion)}\n    check: {c(comprobacion)}\n")


INSTALAR = paso("opencode", "Instalar VS Code, Docker y OpenCode", "opencode", "experiencia",
    "Instala Visual Studio Code y abre su terminal (Ctrl+ñ); instala Docker Desktop (Windows y macOS) o Docker Engine (Linux); "
    "instala OpenCode y conéctalo al gateway de la clase como proveedor propio. En Windows, añade la extensión WSL.",
    "code --version, docker run --rm hello-world y OpenCode responde una pregunta")

# firma (ids del ciclo actual) → (ciclo nuevo, {paso fundido: paso que lo absorbe})
# En el ciclo nuevo, una cadena es «conserva el bloque tal cual»; una tupla (id, texto) lo reemplaza.
PLANES = {
    "ver vscode docker opencode practicar skill preguntar entregar": (
        ["ver", ("opencode", INSTALAR), "practicar", "skill", "preguntar", "entregar"],
        {"vscode": "opencode", "docker": "opencode"}),
    "ver vscode docker opencode practicar skill landing-sin-ia preguntar entregar": (
        ["ver", ("opencode", INSTALAR),
         ("practicar", paso("practicar", "Practicar: el agente y una landing sin IA", "terminal", "reflexion",
            "En una carpeta vacía, pide a OpenCode «crea un script que imprima la fecha y la hora en español» y revisa qué archivos crea y qué comandos "
            "ejecuta antes de aceptar. Luego, en la terminal del aula, saca negocio.json del texto de un cliente con el extractor por reglas y construye el sitio con --imagenes no.",
            "El script corre y el sitio abre en el Visor con los datos correctos del cliente")),
         "skill", "preguntar", "entregar"],
        {"vscode": "opencode", "docker": "opencode", "landing-sin-ia": "practicar"}),
    "ver pedir vscode docker opencode practicar clasificar tipos conceptos skill disenar preguntar entregar": (
        ["ver",
         ("opencode", paso("opencode", "Instalar las herramientas y probar el agente", "opencode", "experiencia",
            "Instala VS Code, Docker y OpenCode, y conecta OpenCode al gateway de la clase. Luego, en una carpeta vacía, pídele «crea un script que imprima "
            "la fecha y la hora en español» y revisa qué archivos crea y qué comandos ejecuta antes de aceptar.",
            "code --version, docker run --rm hello-world y el script del agente corre")),
         ("tipos", paso("tipos", "Entender los asistentes: tipos, piezas y caminos gratis", "lms", "conceptualizacion",
            "En el LIVE: escribe en el muro una tarea que le pedirías a tu asistente (E02), clasifica las tareas por tipo de asistente (E07), "
            "elige tu camino de integración gratuito (E11) y juega la Arena de conceptos (E13).",
            "Tu tarea está en el muro, elegiste tu camino en la escena E11 y pulsaste «Lo logré» en la Arena")),
         ("disenar", paso("disenar", "Tu primera skill y el diseño de tu asistente", "opencode", "experimentacion",
            "Crea `.opencode/skills/saludo/SKILL.md` con `name` y `description` y pídele al agente que la use. Después llena el lienzo del LIVE "
            "(negocio, tres tareas, tipo, canal y camino gratis), publícalo y pega en OpenCode el prompt que arma tu primer prototipo.",
            "El agente responde con tu skill, tu diseño está en el muro (E15) y el prototipo responde una pregunta de tu negocio")),
         "preguntar", "entregar"],
        {"pedir": "tipos", "clasificar": "tipos", "conceptos": "tipos", "vscode": "opencode", "docker": "opencode", "practicar": "opencode", "skill": "disenar"}),
    "ver relevar ollama skills plan construir voz-imagen preguntar entregar": (
        ["ver",
         ("relevar", paso("relevar", "Preparar tu máquina: diagnóstico y Ollama", "terminal", "experiencia",
            "Descomprime taller-agentico.zip, crea el entorno virtual, instala los requisitos y corre el diagnóstico: anota el nivel de imagen que te toca. "
            "Instala Ollama desde ollama.com y descarga qwen3:1.7b la noche anterior, nunca en el aula.",
            "python osito/backend/diagnostico.py imprime tu nivel de imagen y ollama list muestra qwen3:1.7b")),
         ("plan", paso("plan", "Instalar los skills y escribir el plan de trabajo", "opencode", "conceptualizacion",
            "Dentro de la carpeta del taller, corre el instalador: copia los 14 skills y genera AGENTS.md y prompts/. Activa el modo piedra y pide a tu agente, "
            "con el skill plan-de-trabajo, un PLAN_TRABAJO.md con seis tareas y criterio de aceptación sí o no.",
            "bash instalar.sh termina con «Skills encontrados : 14» y existe PLAN_TRABAJO.md con 6 tareas")),
         ("construir", paso("construir", "Construir con la obra en vivo y probar voz e imagen", "opencode", "experimentacion",
            "Inicia la obra con las seis tareas, abre obra.html y deja que el agente ejecute el plan marcando cada paso cuando esté verificado. "
            "Después dicta una pregunta por micrófono y pide un flyer con fecha, hora y precio: revisa los datos extraídos y corrige uno a propósito.",
            "Obra al 100 % y una captura del flyer con los datos correctos")),
         "preguntar", "entregar"],
        {"ollama": "relevar", "skills": "plan", "voz-imagen": "construir"}),
    "ver plan wireframe afiliar webhook bandeja bot pruebas preguntar entregar": (
        ["ver",
         ("wireframe", paso("wireframe", "Diseñar: plan, wireframe y prototipo", "jmd", "conceptualizacion",
            "En la terminal del aula, `aula nuevo plan-chatbot`; abre `jmd`, pega el prompt de PROMPT_ARMAR_CHATBOT.md y responde sus 5 preguntas. "
            "Con s3-wireframe y s3-prototipo: FLUJOS.md con el flujo feliz y tres errores, el wireframe en gris de 3 pantallas y el prototipo navegable con tu color.",
            "PLAN_TRABAJO.md no tiene marcadores <<...>> y chatbot/prototipo se recorre en el visor a 393 px sin barra horizontal")),
         ("bot", paso("bot", "Construir el chatbot: WhatsApp, API, bandeja y bot", "jmd", "experiencia",
            "Vincula el teléfono de pruebas (`aula whatsapp` y escanea qr.png). Con s3-postgres y s3-back-elysia, la base y la API en el puerto 8766. "
            "Con s3-front-lit y s3-whatsapp-qr, la bandeja y el chat. Con s3-integracion, el bot responde con el modelo «clase» y una persona puede tomar la conversación.",
            "3 mensajes reales respondidos y una conversación tomada por una persona desde la bandeja")),
         "pruebas", "preguntar", "entregar"],
        {"plan": "wireframe", "afiliar": "bot", "webhook": "bot", "bandeja": "bot"}),
    "ver robo3d mejora imagen-voz whatsapp plan wireframe afiliar webhook bandeja bot pruebas preguntar entregar": (
        ["ver",
         ("mejora", paso("mejora", "Tu Robo: 3D, voz, imagen y WhatsApp", "lms", "experimentacion",
            "En el LIVE, con tus propios prompts: tu Robo en 3D leyendo el asistente.json de la sesión 2; que hable, te escuche y cambie según su ánimo; "
            "su escenario con FLUX; y, con el QR del LIVE, que conteste por WhatsApp avisando que es un bot.",
            "Tu Robo se ve en el Visor, responde con voz y contesta por WhatsApp desde otro celular")),
         ("wireframe", paso("wireframe", "Diseñar: plan, wireframe y prototipo", "jmd", "conceptualizacion",
            "En la terminal del aula, `aula nuevo plan-chatbot`; abre `jmd`, pega el prompt de PROMPT_ARMAR_CHATBOT.md y responde sus 5 preguntas. "
            "Con s3-wireframe y s3-prototipo: FLUJOS.md con el flujo feliz y tres errores, el wireframe en gris de 3 pantallas y el prototipo navegable con tu color.",
            "PLAN_TRABAJO.md no tiene marcadores <<...>> y chatbot/prototipo se recorre en el visor a 393 px sin barra horizontal")),
         ("bot", paso("bot", "Construir y probar el chatbot", "jmd", "experiencia",
            "Vincula el teléfono de pruebas (`aula whatsapp`). Con s3-postgres y s3-back-elysia, la base y la API; con s3-front-lit y s3-whatsapp-qr, la bandeja; "
            "con s3-integracion, el bot responde con el modelo «clase» y una persona puede tomar la conversación. Cierra con `bun test pruebas/` y la prueba de uso con otra persona.",
            "3 mensajes reales respondidos, una conversación tomada por una persona, 6 pass en bun test y PRUEBAS_DE_USO.md con p50 y p95")),
         "preguntar", "entregar"],
        {"robo3d": "mejora", "imagen-voz": "mejora", "whatsapp": "mejora", "plan": "wireframe", "afiliar": "bot", "webhook": "bot", "bandeja": "bot", "pruebas": "bot"}),
}


def bloques(texto):
    """Parte una lista YAML de primer nivel («  - id: x» …) en [(id, texto crudo)]."""
    partes = re.split(r"(?m)^(?=  - id: )", texto)
    assert partes[0] == "", partes[0][:60]
    return [(re.match(r"  - id: (\S+)", p).group(1), p) for p in partes[1:]]


def leccion(grupo, ruta):
    t = open(ruta).read()
    fm, cuerpo = t.split("\n---\n", 1)
    lid = re.search(r"(?m)^id: (\S+)", fm).group(1)
    cab, resto = fm.split("\nmaterials:\n", 1)
    mats, ciclo = resto.split("\ncycle:\n", 1)
    cambios = []

    # videos primero y como video
    bm = bloques(mats + "\n")
    es_video = lambda b: re.search(r"(?m)^    file: \S+\.mp4\s*$", b) is not None
    videos = [(i, re.sub(r"(?m)^    kind: \S+$", "    kind: video", b)) for i, b in bm if es_video(b)]
    if videos and ([i for i, _ in bm][: len(videos)] != [i for i, _ in videos] or any("kind: video" not in b for _, b in bm if es_video(b))):
        bm = videos + [(i, b) for i, b in bm if not es_video(b)]
        cambios.append(f"{len(videos)} video(s) al inicio")
    mats = "".join(b for _, b in bm).rstrip("\n")

    # ciclo de seis pasos
    bc = bloques(ciclo + "\n")
    firma = " ".join(i for i, _ in bc)
    mapa = {}
    if firma in PLANES:
        nuevo, mapa = PLANES[firma]
        crudo = dict(bc)
        bc = [(p, crudo[p]) if isinstance(p, str) else p for p in nuevo]
        cambios.append(f"{len(crudo)} → {len(bc)} pasos")
    elif len(bc) != 6:
        print(f"  !! {lid}: ciclo desconocido ({firma})")
    ciclo = "".join(b for _, b in bc).rstrip("\n")

    # escenas: el paso fundido apunta al que lo absorbió; solo la última escena del bloque lo conserva
    if mapa:
        ultimo = {}
        escenas = sorted(glob.glob(os.path.join(RAIZ, grupo, "live", lid, "*", "escena.yaml")))
        leidas = []
        for e in escenas:
            y = open(e).read()
            m = re.search(r'(?m)^paso:[ \t]*"?([^"\n]*?)"?[ \t]*$', y)
            p = m.group(1) if m else ""
            destino = mapa.get(p, p)
            leidas.append((e, y, m, p, destino))
            if destino:
                ultimo[destino] = e
        absorbentes = set(mapa.values())
        tocadas = 0
        for e, y, m, p, destino in leidas:
            final = destino if (destino not in absorbentes or ultimo.get(destino) == e) else ""
            if m and final != p:
                y = y[: m.start()] + (f"paso: {final}" if final else 'paso: ""') + y[m.end():]
                tocadas += 1
                if not SECO:
                    open(e, "w").write(y)
        if tocadas:
            cambios.append(f"{tocadas} escena(s)")

    if cambios:
        print(f"  {lid}: " + " · ".join(cambios))
        if not SECO:
            open(ruta, "w").write(f"{cab}\nmaterials:\n{mats}\ncycle:\n{ciclo}\n---\n{cuerpo}")


for g in GRUPOS:
    print(g)
    for f in sorted(glob.glob(os.path.join(RAIZ, g, "lessons", "*.md"))):
        leccion(g, f)
