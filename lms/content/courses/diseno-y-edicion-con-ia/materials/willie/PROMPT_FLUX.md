# Imagen base con FLUX (Cloudflare Workers AI) · versión guiada

La versión guiada de la pieza empieza con una **imagen base** generada con FLUX.1 schnell en la capa
gratuita de Cloudflare Workers AI (10.000 neuronas al día; unas 4,8 por imagen). Luego el agente la
anima en HTML: cámara, grano, balanceo, notas del silbido. Si Cloudflare no responde, la base es el
dibujo vectorial `willie-1928.svg`, que ya viene en Materiales.

## 1 · Generar la base

**En el aula del LIVE** el servicio de imagen de la clase ya tiene la clave de Cloudflare. Pídele a
tu agente, con la skill `s2-robo-imagen` o directo:

```text
Usa el servicio de imagen de la clase en calidad máxima (FLUX) con el prompt de PROMPT_FLUX.txt,
orientación horizontal. Guarda el resultado como willie-base.png junto a index.html.
```

**En tu laptop**, con tu cuenta de Cloudflare (la clave va en variables de entorno, nunca en un
archivo del proyecto):

```bash
export CF_ACCOUNT_ID=tu_account_id     # Cloudflare → Workers & Pages → Account ID
export CF_API_TOKEN=tu_token           # token con permiso Workers AI · Read
node flux-willie.mjs willie-base.png --n 4   # cuatro variantes; elige la más fiel
```

El prompt de la imagen está en `PROMPT_FLUX.txt`. Describe el diseño de 1928 sin nombrar al
personaje: así los filtros no se disparan y el resultado es más fiel que con el nombre.

## 2 · Revisar la fidelidad (lista de 1928)

- Ojos de pastel: óvalos negros altos con cuña; sin pupilas.
- Manos negras desnudas, cuatro dedos. Si salen guantes blancos, falló (son de 1929).
- Pantalón claro con dos botones oscuros; zapatos grandes claros; cola de cuerda; gorra plana.
- Trazo parejo, rellenos planos, nada de volumen. Cuadro 4:3 con grano, sin color.

Si falla uno, repite con el mismo prompt (schnell no acepta semilla) o añade el rasgo al final del
prompt en mayúsculas: «NO GLOVES».

## 3 · Animarla: el pedido al agente

```text
Rol: Eres animador 2D y desarrollador front-end. Solo HTML, CSS, SVG y JavaScript sin librerías.
Contexto: Taller «¿Difícil de explicar? ¡No!», sesión 1; la pieza se ve en el visor del aula.
Tarea: Crea willie-timon/index.html: 16 s con la imagen willie-base.png como fondo, Willie
silbando al timón. Si no existe willie-base.png, usa willie-1928.svg inline como escena.
Límites: Un solo reloj; nada se anima por su cuenta. Pulso de 120 bpm. Sin CDN. Sin destellos.
Grano con feTurbulence a opacidad 0,15. Con reducir movimiento, storyboard quieto.
Formato: Cámara como transform del mundo: plano general 0–4 s, travelling a plano medio 4–8 s,
plano medio con actuación 8–14 s, iris out 14–16 s. Sobre la imagen, capas SVG: notas del silbido
que salen de la boca en cada negra y viajan en arco; balanceo de toda la escena ±1,5° con ciclo de
2 s; viñeta. Botones Reproducir y Pausa; ?t= fija y pausa; window.willie.seek(t) y ?render=1.
Comprobación: ?t=6 muestra el travelling a mitad; ?t=10.5 muestra una nota a mitad de su arco;
dura 16,0 s; con reducir movimiento nada se mueve. Dime qué archivos creaste.
```

## 4 · Exportar

```bash
node render.mjs willie-timon/index.html willie-timon.mp4
```
