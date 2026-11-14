# Prompts afinados · render con pocos tokens

Un prompt barato es como un pedido en una cafetería: dices qué quieres, de qué tamaño y para llevar.
No cuentas tu vida. Cinco líneas bastan.

## La receta de cinco líneas

1. **Qué** · una sola cosa. «Cambia los datos del gráfico por estos: …»
2. **Dónde** · el archivo. «En index.html, bloque DATOS.»
3. **Con qué** · la librería o la plantilla que ya existe. «Usa la plantilla p5 tal como está.»
4. **Límites** · lo que NO quieres. «No expliques. No toques el resto. Muestra solo el cambio.»
5. **Cómo lo compruebo** · lo que debo ver. «Al abrir index.html veo 6 barras con mis meses.»

## Antes de pedir (cuesta cero y ahorra mucho)

- Carpeta nueva con `index.html` (la plantilla) y `CLAUDE.md` (las reglas de la casa).
- Sesión nueva de Claude Code (`claude`) o `/clear` si ya tenías una.
- Modelo liviano para cambios pequeños: `/model` → Sonnet. Opus solo para el pedido difícil.
- Mide: `/context` antes y después.

## Prompt base por librería

### p5.js · mis números en 3D
```
En index.html, bloque DATOS: cambia titulo por «Ventas 2025» y los items por
Ene 120, Feb 95, Mar 140, Abr 160, May 130, Jun 175.
No toques nada más. No expliques. Muestra solo el bloque cambiado.
Compruebo: abro index.html y veo 6 barras girando con esos valores.
```

### three.js · la maqueta 3D
```
En index.html, bloque DATOS: pon mis 8 valores (Lun 4, Mar 7, Mié 5, Jue 9, Vie 6, Sáb 2, Dom 1, Prom 5).
Cambia el color de las cajas a #4fd37a. Nada más. Sin explicar.
Compruebo: 8 cajas de alturas distintas, verdes, girando despacio.
```

### GSAP · lo que ya existe, se mueve
```
En index.html: las tarjetas deben entrar una por una desde abajo, 0.4 s cada una, con rebote suave.
Solo toca la función animar(). No cambies el HTML ni el CSS. Sin explicar.
Compruebo: al recargar, las tarjetas aparecen en cascada de izquierda a derecha.
```

## Prompts por perfil (cambia solo la línea de datos)

- **Contabilidad / oficina** · «gastos por mes», «facturas pendientes por cliente», «horas por proyecto».
- **Sistemas / desarrollo** · «tickets cerrados por sprint», «usuarios por módulo», «tiempo de respuesta por servicio».
- **Diseño** · «colores: fondo #14122b, barras degradé de #a99cff a #4fd1c5; letra más grande en el título».
- **Entusiasta** · «pasos por día», «horas de sueño», «partidos ganados por equipo».

Ejemplo completo (contabilidad, p5):
```
En index.html, bloque DATOS: titulo «Gastos 2025» e items Ene 2300, Feb 1950, Mar 2800, Abr 2100, May 2600, Jun 3100.
Formato de los valores con separador de miles. Nada más. Sin explicar.
Compruebo: 6 barras con «2 300», «1 950»… encima de cada una.
```

## Lo que encarece un prompt (evítalo)

| Caro | Barato |
| --- | --- |
| «Hazme algo bonito que se mueva» | «6 barras 3D con estos datos, girando» |
| «Explícame cómo funciona todo» | «Sin explicar» |
| «Mejora lo que quieras» | «Cambia solo el bloque DATOS» |
| «Muéstrame todo el archivo otra vez» | «Muestra solo el cambio» |
| Pegar un archivo largo en el chat | Decir el nombre del archivo y la línea |
| Diez mensajes de ida y vuelta | Un pedido completo de cinco líneas |

## El segundo pedido (cuando algo salió mal)

No digas «no funciona». Di qué viste y qué esperabas:
```
Al abrir index.html las barras no giran. Esperaba que giren despacio sobre su eje.
Arregla solo eso. Sin explicar.
```
