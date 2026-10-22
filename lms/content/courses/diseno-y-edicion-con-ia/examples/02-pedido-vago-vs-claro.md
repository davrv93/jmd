---
id: de-ej-pedido
title: "Pedido vago contra pedido claro: tres pares"
summary: El mismo encargo pedido mal y pedido con las seis partes, para una interfaz, una landing y un video, más la lista de comprobación.
tags: [prompts, skills]
level: básico
lesson: de-01
phase: conceptualizacion
order: 2
---
Un pedido vago hace que el agente rellene los huecos con suposiciones: colores al azar, pantallas
que nadie pidió, datos inventados. Después cuesta más corregir que empezar. Un pedido claro lleva
seis partes: rol, contexto, tarea, límites, formato y comprobación. La skill `pedido-seis-partes`
convierte el primero en el segundo; aquí van tres pares para que veas la diferencia.

## 1. Interfaz

**Vago:** «Hazme una app de citas bonita.»

**Claro:**

```text
Rol: Eres diseñador de apps iOS.
Contexto: Una clínica de barrio quiere que sus pacientes reserven citas de pediatría desde el teléfono.
Tarea: Diseña el flujo Inicio → Especialidad → Horario → Datos → Confirmación.
Límites: No inventes médicos ni precios. Usa los tokens del estilo.
Formato: Wireframe en gris, 390 × 844, con barra de cuatro pestañas y sus estados vacío, cargando y error.
Comprobación: La cita se reserva en cinco toques o menos, recorriendo el prototipo en «Presentar».
```

## 2. Landing

**Vago:** «Una página para mi cafetería que se vea moderna.»

**Claro:**

```text
Rol: Eres maquetador web y redactor.
Contexto: Cafetería en Miraflores que tuesta cada lunes granos de Cajamarca; quiere pedidos por WhatsApp.
Tarea: Convierte este mensaje del cliente en el contenido de la landing siguiendo la plantilla: [pegar el mensaje].
Límites: No inventes precios ni testimonios. Un solo punto focal; botones con verbo y objeto de 25 caracteres o menos.
Formato: Un index.html por secciones (portada, beneficios, prueba social, preguntas, contacto), primero para 393 px.
Comprobación: Se abre desde una URL en un teléfono, el botón de WhatsApp abre el chat del negocio y no hay desborde horizontal a 393 px.
```

## 3. Video

**Vago:** «Anima a Mickey con música, algo rápido.»

**Claro:**

```text
Rol: Eres animador 2D y desarrollador front-end; solo herramientas abiertas.
Contexto: Taller de diseño; la pieza se ve en el visor del aula y en un teléfono.
Tarea: Crea willie/index.html, 20 s con Willie (Steamboat Willie, 1928) al timón, al pulso de 120 bpm.
Límites: Solo el diseño de 1928; sin CDN; ningún corte menor de 0,25 s; sin destellos; un solo reloj.
Formato: Un HTML; cada escena es <section class="clip" data-start data-duration>; ?t= fija y pausa.
Comprobación: ?t=7 muestra el paneo quieto a mitad; la pieza dura 20,0 s y termina en «¡No!».
```

## Qué cambia entre los dos

| Vago | Claro |
|---|---|
| «bonita», «moderna», «rápido» | medidas, colores, segundos |
| El agente elige por ti | Tú decides y dejas corchetes solo para lo que tú sabes |
| No hay forma de decir «está mal» | La comprobación se ejecuta o se ve sin opinar |
| Tres cosas en una frase | Una tarea por pedido |

## Lista de comprobación del pedido

- ¿Un solo verbo en la tarea?
- ¿Dice para quién es y dónde se verá?
- ¿Nombra lo que no debe inventar?
- ¿Nombra archivos y medidas?
- ¿La comprobación se puede ejecutar o ver sin opinar?
- ¿Pide que informe qué archivos tocó?

## El segundo pedido

Cuando algo sale mal, no se repite el pedido entero ni se dice «mejóralo». Se señala el lugar, el
cambio y el límite:

```text
En la pantalla Datos, a 393 px, el botón «Reservar cita» queda debajo del teclado. Súbelo sobre el
teclado y no cambies nada más. Dime qué archivos tocaste.
```
