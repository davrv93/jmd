# Prompts afinados · render con pocos tokens (Claude en la web)

Un prompt barato es como un pedido en una cafetería: dices qué quieres, de qué tamaño y para llevar.
No cuentas tu vida. Cinco líneas bastan.

## La receta de cinco líneas

1. **Qué** · una sola cosa. «Cambia los datos del gráfico por estos: …»
2. **Dónde** · la plantilla y el bloque. «En la plantilla, bloque DATOS.»
3. **Con qué** · lo que ya existe. «Usa la plantilla del proyecto tal como está.»
4. **Límites** · lo que NO quieres. «Nada más. Sin explicar. Actualiza el artefacto, no lo reescribas.»
5. **Cómo lo compruebo** · lo que debo ver. «Compruebo: en el artefacto veo 6 barras con mis meses.»

## Antes de pedir (cuesta cero y ahorra mucho)

- En claude.ai crea un **Proyecto** (por ejemplo «Mi render»). En **Instrucciones** pega `reglas-de-la-casa.md`.
  En **Conocimiento** sube UNA plantilla (`plantilla-p5.html`, `plantilla-three.html` o `plantilla-gsap.html`).
- Cada pedido, en un **chat nuevo dentro del proyecto**. La mochila vacía, las reglas y la plantilla ya puestas.
- Modelo liviano para cambios pequeños: en el selector de modelo del chat elige **Sonnet**. Opus solo para el pedido difícil.
- Mide: copia la respuesta de Claude y el código del artefacto y pégalos en el medidor del LMS (escenas 3 y 9).
  Tokens de salida ≈ letras ÷ 4. Tu cuota del día está en Configuración → Uso.

## Prompt base por librería

### p5.js · mis números en 3D
```
En la plantilla, bloque DATOS: cambia titulo por «Ventas 2025» y los items por
Ene 120, Feb 95, Mar 140, Abr 160, May 130, Jun 175.
No toques nada más. No expliques. Actualiza el artefacto.
Compruebo: en el artefacto veo 6 barras girando con esos valores.
```

### three.js · la maqueta 3D
```
En la plantilla, bloque DATOS: pon mis 8 valores (Lun 4, Mar 7, Mié 5, Jue 9, Vie 6, Sáb 2, Dom 1, Prom 5).
Cambia colorB a #4fd37a. Nada más. Sin explicar. Actualiza el artefacto.
Compruebo: 8 cajas de alturas distintas, verdes, girando despacio.
```

### GSAP · lo que ya existe, se mueve
```
En la plantilla: las barras deben entrar una por una desde abajo, 0.4 s cada una, con rebote suave.
Solo toca la función animar(). No cambies el HTML ni el CSS. Sin explicar. Actualiza el artefacto.
Compruebo: al recargar el artefacto, las barras aparecen en cascada de izquierda a derecha.
```

## Prompts por perfil (cambia solo la línea de datos)

- **Contabilidad / oficina** · «gastos por mes», «facturas pendientes por cliente», «horas por proyecto».
- **Sistemas / desarrollo** · «tickets cerrados por sprint», «usuarios por módulo», «tiempo de respuesta por servicio».
- **Diseño** · «colores: fondo #14122b, barras degradé de #a99cff a #4fd1c5; letra más grande en el título».
- **Entusiasta** · «pasos por día», «horas de sueño», «partidos ganados por equipo».

Ejemplo completo (contabilidad, p5):
```
En la plantilla, bloque DATOS: titulo «Gastos 2025» e items Ene 2300, Feb 1950, Mar 2800, Abr 2100, May 2600, Jun 3100.
Formato de los valores con separador de miles. Nada más. Sin explicar. Actualiza el artefacto.
Compruebo: 6 barras con «2 300», «1 950»… en la leyenda.
```

## Lo que encarece un prompt (evítalo)

| Caro | Barato |
| --- | --- |
| «Hazme algo bonito que se mueva» | «6 barras 3D con estos datos, girando» |
| «Explícame cómo funciona todo» | «Sin explicar» |
| «Mejora lo que quieras» | «Cambia solo el bloque DATOS» |
| «Vuelve a generar todo el artefacto» | «Actualiza el artefacto» |
| Pegar la plantilla entera en el chat | Tenerla en el conocimiento del proyecto |
| Diez mensajes de ida y vuelta en el mismo chat | Un pedido completo de cinco líneas, en un chat nuevo |

## El segundo pedido (cuando algo salió mal)

No digas «no funciona». Di qué viste y qué esperabas:
```
En el artefacto las barras no giran. Esperaba que giren despacio sobre su eje.
Arregla solo eso. Sin explicar. Actualiza el artefacto.
```

## Si un día usas Claude Code (la terminal)

Las mismas reglas van en un archivo `CLAUDE.md` en la carpeta del proyecto, y la plantilla como `index.html`.
Todo lo demás es igual.
