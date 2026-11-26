# GAME FRAMEWORK EXPANSION — Anime Battle & Infinite Voxel Engine

(Especificación del usuario, copiada tal cual el 26-11-2026. Es el documento que manda.)

Actúa como arquitecto senior de videojuegos, especialista en motores gráficos, generación procedural, matemáticas computacionales, física, inteligencia artificial aplicada a videojuegos y optimización WebGL.

Tu misión es ampliar mi framework de videojuegos existente con dos nuevos motores especializados:

- Anime Battle Engine.
- Infinite Voxel Engine.

No construyas aplicaciones aisladas que ignoren la arquitectura actual. Inspecciona el framework, identifica componentes reutilizables e integra los nuevos motores siguiendo sus convenciones.

## 1. Auditoría inicial

Antes de escribir código:

- Inspecciona la arquitectura actual.
- Identifica el motor de renderizado existente.
- Identifica el sistema de escenas.
- Identifica el gestor de recursos.
- Identifica los sistemas de entrada, audio, animación y física.
- Identifica el sistema de plugins.
- Identifica los componentes reutilizables.
- Detecta dependencias instaladas.
- Detecta posibles cuellos de botella.
- Evita duplicar funcionalidades.

Conserva la compatibilidad con los videojuegos existentes.

No reemplaces componentes funcionales sin justificación técnica.

## 2. Arquitectura general

Implementa una arquitectura modular con las siguientes responsabilidades:

- Game Core.
- Scene Manager.
- Entity Component System.
- Input Manager.
- Physics Engine.
- Animation Controller.
- Audio Manager.
- Asset Manager.
- Particle Engine.
- AI Controller.
- Procedural Generation Engine.
- Seed Manager.
- World Persistence.
- Plugin Manager.
- Performance Monitor.
- Game Editor.
- Anime Battle Engine.
- Infinite Voxel Engine.

Adapta esta estructura a las convenciones del proyecto existente.

Utiliza preferentemente JavaScript o TypeScript, p5.js y WebGL.

Utiliza Web Workers para operaciones computacionalmente intensivas.

No introduzcas dependencias pesadas si una implementación matemática sencilla puede resolver el problema.

# MOTOR A — ANIME BATTLE ENGINE

## 3. Objetivo del motor de combate

Construir un motor reutilizable para generar videojuegos de lucha inspirados en la estética y mecánicas del anime.

Referencias conceptuales:

- Combate rápido y dinámico.
- Personajes con habilidades extraordinarias.
- Transformaciones.
- Ataques energéticos.
- Combos aéreos y terrestres.
- Cinemáticas de ataques definitivos.
- Escenarios destructibles.
- Batallas contra jefes.

Utiliza personajes originales o recursos con licencias apropiadas.

No limites el motor a una única franquicia o estética.

## 4. Modos de combate

Implementa progresivamente:

- Pelea clásica 1 vs. 1.
- Pelea 2 vs. 2.
- Batallas contra CPU.
- Modo entrenamiento.
- Supervivencia.
- Torneos.
- Modo historia.
- Boss battle.
- Combate lateral con desplazamiento.
- Arena de combate 2.5D.

Separa las reglas de cada modo mediante configuraciones declarativas.

## 5. Sistema de personajes

Cada personaje debe definirse mediante un archivo JSON o estructura equivalente.

Propiedades:

- Identificador.
- Nombre.
- Clase.
- Nivel.
- Salud.
- Energía.
- Resistencia.
- Velocidad.
- Aceleración.
- Masa.
- Fuerza.
- Defensa.
- Alcance.
- Velocidad de ataque.
- Capacidad de salto.
- Habilidades.
- Debilidades.
- Transformaciones.
- Sprites.
- Animaciones.
- Efectos visuales.
- Efectos de sonido.
- Hitboxes.
- Hurtboxes.

Permite crear personajes nuevos sin modificar el motor principal.

## 6. Máquina de estados de combate

Implementa una máquina de estados finitos con transiciones explícitas.

Estados mínimos:

- Idle.
- Walk.
- Run.
- Dash.
- Jump.
- Fall.
- Landing.
- Crouch.
- AttackLight.
- AttackMedium.
- AttackHeavy.
- AirAttack.
- Combo.
- Block.
- Parry.
- Dodge.
- Charge.
- SpecialAttack.
- UltimateAttack.
- Transformation.
- HitStun.
- BlockStun.
- Knockback.
- Knockdown.
- Recovery.
- Victory.
- Defeat.

Cada estado debe definir sus transiciones permitidas, duración, animaciones, eventos y restricciones.

Evita ataques infinitos, bloqueos permanentes y transiciones inconsistentes.

## 7. Combate basado en frames

Implementa un sistema de frame data inspirado en motores profesionales de lucha.

Cada ataque debe contener:

- Startup frames.
- Active frames.
- Recovery frames.
- Hit stun.
- Block stun.
- Hitstop.
- Daño.
- Knockback.
- Prioridad.
- Cancel windows.
- Invulnerability frames.
- Consumo de energía.
- Posibilidad de combo.
- Posibilidad de contraataque.

La animación visual y el estado de combate deben permanecer sincronizados.

No determines el daño únicamente por la superposición visual de sprites.

Utiliza hitboxes y hurtboxes independientes.

## 8. Sistema de combos

Implementa un Input Buffer configurable.

Registra:

- Teclas.
- Direcciones.
- Tiempo.
- Orden.
- Duración.
- Combinaciones simultáneas.

Permite ejecutar movimientos como:

- Ataque ligero + ligero + fuerte.
- Abajo + adelante + ataque.
- Salto + ataque.
- Dash + ataque fuerte.
- Carga + habilidad especial.
- Secuencias aéreas.

Implementa:

- Combo counter.
- Damage scaling.
- Juggle limits.
- Combo cancel.
- Air cancel.
- Recovery cancel configurable.
- Ventanas de ejecución.
- Prevención de combos infinitos.

## 9. Física del combate

Implementa un sistema de física determinista con timestep fijo.

Incluye:

- Gravedad.
- Aceleración.
- Fricción.
- Impulso.
- Masa.
- Colisiones.
- Rebotes.
- Knockback.
- Desplazamiento aéreo.
- Wall bounce.
- Ground bounce.
- Límites de escenario.

Separa el timestep de simulación del framerate de renderizado.

Implementa interpolación visual para evitar movimientos entrecortados.

Utiliza swept AABB o técnicas equivalentes para ataques de alta velocidad cuando sea necesario.

## 10. Efectos visuales anime

Desarrolla un sistema de efectos reutilizable mediante p5.js.

Incluye:

- Speed lines.
- Impact frames.
- Screen shake.
- Afterimages.
- Motion trails.
- Energy aura.
- Electric arcs.
- Fire particles.
- Explosiones.
- Ondas expansivas.
- Rayos de energía.
- Cortes de espada.
- Fragmentos de terreno.
- Distorsión visual.
- Teletransportación.
- Transformaciones.
- Cámara lenta.
- Destellos.
- Efectos de impacto radial.

Utiliza ecuaciones paramétricas, curvas Bézier, funciones trigonométricas, ruido procedural y sistemas de partículas.

Utiliza object pooling para evitar crear y destruir miles de objetos por segundo.

Permite configurar intensidad, color, duración y densidad de cada efecto.

Incluye opciones para reducir destellos y movimientos de cámara.

## 11. Animaciones de personajes

Soporta:

- Sprite sheets.
- Animación cuadro por cuadro.
- Animación mediante articulaciones.
- Interpolación de poses.
- Animación procedural.
- Sprites de alta resolución.
- Pixel art.
- Estética cel shading cuando corresponda.

Permite configurar animaciones independientes para:

- Reposo.
- Caminata.
- Carrera.
- Salto.
- Ataque.
- Defensa.
- Carga.
- Transformación.
- Daño.
- Caída.
- Victoria.

Implementa un editor de animaciones que permita ajustar:

- Frames.
- Velocidad.
- Pivotes.
- Posiciones.
- Eventos.
- Hitboxes.
- Hurtboxes.

El motor debe respetar las proporciones del personaje durante las animaciones.

Evita invertir incorrectamente rostros, extremidades y accesorios al cambiar la orientación.

## 12. Cinemáticas de ataques definitivos

Implementa un Cinematic Director.

Permite:

- Zoom dinámico.
- Cambio temporal de cámara.
- Interpolación de cámara.
- Enfoque en el personaje atacante.
- Retratos dramáticos.
- Cambios de fondo.
- Efectos de energía.
- Cámara lenta.
- Congelación de impacto.
- Transiciones.
- Textos de habilidades.
- Sincronización con audio.

Las cinemáticas deben emitir eventos controlados al motor de combate.

No deben provocar daño duplicado ni inconsistencias físicas.

Permite omitir las secuencias largas.

## 13. Inteligencia artificial de combate

Implementa enemigos mediante una combinación de:

- Finite State Machines.
- Behavior Trees.
- Utility AI.
- Evaluación de distancia.
- Predicción de movimiento.
- Análisis de patrones recientes.
- Selección de habilidades según contexto.

Niveles:

- Principiante.
- Intermedio.
- Avanzado.
- Experto.
- Jefe.

La CPU debe reaccionar según tiempos humanos configurables.

Evita que conozca instantáneamente todas las acciones del jugador.

Debe poder:

- Acercarse.
- Retroceder.
- Saltar.
- Bloquear.
- Esquivar.
- Cargar energía.
- Ejecutar combos.
- Castigar ataques fallidos.
- Adaptarse a patrones repetitivos.

No dependas de un LLM para controlar cada movimiento.

# MOTOR B — INFINITE VOXEL ENGINE

## 14. Objetivo

Construir un motor de exploración tridimensional inspirado en los videojuegos voxel sandbox.

Debe utilizar p5.js en modo WEBGL como capa principal de renderizado.

El jugador debe poder:

- Explorar terrenos.
- Caminar.
- Correr.
- Saltar.
- Nadar.
- Descender a cuevas.
- Destruir bloques.
- Colocar bloques.
- Recolectar recursos.
- Construir estructuras.
- Descubrir biomas.
- Guardar y continuar partidas.

El mundo debe generarse dinámicamente a partir de una semilla determinista.

No almacenes el mundo completo.

## 15. Sistema de semillas

Implementa un Seed Manager que acepte:

- Números.
- Palabras.
- Frases.
- Semillas aleatorias.

Convierte entradas textuales en semillas numéricas mediante funciones hash estables.

Implementa un PRNG determinista, como PCG32, SplitMix64 o una alternativa equivalente.

La generación debe garantizar que:

- La misma semilla produce el mismo mundo.
- Las coordenadas globales determinan el contenido.
- El resultado no depende del orden de exploración.
- Descargar y regenerar chunks no modifica el terreno original.
- Los chunks vecinos tienen continuidad.
- Las coordenadas negativas funcionan correctamente.

Incluye un identificador de versión del generador.

No utilices Math.random para decisiones que deban permanecer deterministas.

## 16. Generación procedural del terreno

Implementa un pipeline de generación basado en:

- Perlin Noise.
- Simplex Noise u OpenSimplex.
- Fractal Brownian Motion.
- Domain Warping.
- Ridged Noise.
- Voronoi.
- Mapas de humedad.
- Mapas de temperatura.
- Mapas de continentalidad.
- Mapas de erosión.
- Funciones de densidad tridimensional.

Combina múltiples frecuencias de ruido para crear terrenos naturales.

Utiliza frecuencias bajas para continentes y montañas.

Utiliza frecuencias medias para colinas y valles.

Utiliza frecuencias altas para detalles superficiales.

No generes únicamente montañas aleatorias sin coherencia geográfica.

## 17. Biomas

Implementa inicialmente:

- Bosque.
- Pradera.
- Desierto.
- Selva.
- Tundra.
- Taiga.
- Montaña.
- Sabana.
- Pantano.
- Océano.
- Playa.
- Bosque nevado.
- Archipiélago.
- Meseta.
- Cañón.

Cada bioma debe configurar:

- Temperatura.
- Humedad.
- Elevación.
- Vegetación.
- Bloques superficiales.
- Recursos.
- Fauna.
- Color ambiental.
- Niebla.
- Probabilidad de estructuras.
- Precipitaciones.

Las transiciones entre biomas deben evitar fronteras artificiales demasiado abruptas.

## 18. Cuevas y estructuras subterráneas

Utiliza ruido tridimensional y algoritmos de túneles para generar:

- Cuevas.
- Cavernas.
- Galerías.
- Túneles.
- Lagos subterráneos.
- Depósitos minerales.
- Cámaras profundas.
- Ruinas.
- Mazmorras.

Evita agujeros excesivos en la superficie.

Genera minerales según profundidad, bioma y reglas de distribución deterministas.

## 19. Chunks y mundo infinito

Divide el mundo en chunks.

Configuración inicial recomendada:

- 16 × 16 bloques horizontales.
- Altura dividida en secciones de 16 bloques.
- Altura total configurable.
- Distancia de renderizado configurable.
- Generación asíncrona.
- Descarga automática de chunks lejanos.

Implementa:

- Chunk Manager.
- Chunk Generator.
- Chunk Cache.
- Chunk Scheduler.
- Chunk Mesh Builder.
- Chunk Serialization.
- Chunk Delta Storage.
- Priority Queue.

Prioriza los chunks cercanos al jugador y los que se encuentran en su dirección de movimiento.

No generes regiones lejanas innecesariamente.

Implementa floating origin o coordenadas relativas para reducir problemas de precisión gráfica a grandes distancias.

El concepto de mundo infinito significa generación bajo demanda dentro de los límites numéricos y computacionales del sistema.

## 20. Optimización gráfica con p5.js WEBGL

No renderices cada bloque mediante una llamada individual a box().

Esta restricción es obligatoria.

Implementa:

- Face culling.
- Hidden face removal.
- Greedy meshing.
- Geometry batching.
- Indexed geometry cuando el backend lo permita.
- Vertex buffers.
- Texture atlas.
- UV mapping.
- Frustum culling.
- Distance culling.
- Mesh caching.
- Separación de geometría transparente y opaca.
- Reconstrucción únicamente de chunks modificados.

Investiga las APIs de geometría disponibles en la versión de p5.js instalada.

Utiliza p5.Geometry y las APIs de geometría soportadas.

Si fuera necesario acceder a WebGL directamente, encapsula esa implementación en un adaptador documentado y evita romper el estado gráfico de p5.js.

No dependas innecesariamente de Three.js.

Implementa niveles de detalle para regiones lejanas cuando exista una mejora medible.

## 21. Generación mediante Web Workers

Distribuye las tareas intensivas:

- Cálculo de altura.
- Generación de ruido.
- Generación de biomas.
- Generación de cuevas.
- Construcción de meshes.
- Compresión de bloques.
- Serialización.

Transfiere resultados mediante ArrayBuffer y TypedArray cuando corresponda.

Evita copiar grandes estructuras JSON entre workers.

Mantén el renderizado y la gestión de eventos en el hilo principal salvo que exista una implementación compatible y justificada de OffscreenCanvas.

Implementa cancelación de trabajos cuando el jugador abandone una región.

## 22. Sistema de bloques

Cada bloque debe definirse mediante un registro declarativo.

Propiedades:

- ID.
- Nombre.
- Textura.
- Dureza.
- Transparencia.
- Solidez.
- Fricción.
- Inflamabilidad.
- Emisión de luz.
- Resistencia.
- Herramienta requerida.
- Recursos obtenidos.

Bloques iniciales:

- Aire.
- Tierra.
- Césped.
- Piedra.
- Arena.
- Agua.
- Lava.
- Madera.
- Hojas.
- Nieve.
- Hielo.
- Carbón.
- Hierro.
- Oro.
- Cristales.
- Ladrillos.
- Vidrio.

Utiliza texturas originales o generadas proceduralmente.

Permite agregar bloques mediante plugins.

## 23. Física y cámara del jugador

Implementa:

- Cámara en primera persona.
- Cámara en tercera persona.
- Pointer Lock.
- Controles WASD.
- Salto.
- Gravedad.
- Colisión con bloques.
- Sprint.
- Agacharse.
- Natación.
- Movimiento en escaleras.
- Prevención de atravesar paredes.
- Caída controlada.

Utiliza AABB y consultas eficientes de bloques cercanos.

No realices pruebas de colisión contra todos los bloques del mundo.

## 24. Selección y modificación de bloques

Implementa raycasting mediante un algoritmo voxel DDA.

Permite:

- Identificar el bloque apuntado.
- Resaltar sus bordes.
- Destruir el bloque.
- Colocar un bloque en la cara seleccionada.
- Recoger recursos.
- Aplicar restricciones de distancia.
- Evitar colocar bloques dentro del jugador.

Cuando se modifique un bloque:

- Actualiza su chunk.
- Actualiza los chunks vecinos cuando corresponda.
- Reconstruye únicamente la geometría afectada.
- Persiste el cambio.
- Actualiza iluminación si corresponde.

## 25. Persistencia eficiente

No guardes todos los bloques generados proceduralmente.

Guarda únicamente:

- Semilla.
- Versión del generador.
- Posición del jugador.
- Inventario.
- Bloques modificados.
- Entidades persistentes.
- Estructuras creadas.
- Estado de partida.

Implementa almacenamiento delta.

Utiliza IndexedDB para partidas locales.

Permite exportar e importar mundos.

Implementa compresión y migraciones de formato cuando sean necesarias.

## 26. Iluminación y ambiente

Implementa:

- Ciclo día y noche.
- Luz solar.
- Iluminación ambiental.
- Niebla.
- Colores del cielo.
- Estrellas.
- Sol.
- Luna.
- Sombras simplificadas.
- Ambient occlusion por vértice.
- Bloques emisivos.
- Agua animada.

Implementa lluvia y nieve como efectos opcionales.

Prioriza una iluminación voxel eficiente sobre sombras dinámicas costosas.

## 27. Vegetación y estructuras

Genera:

- Árboles.
- Flores.
- Arbustos.
- Rocas.
- Aldeas.
- Puentes.
- Torres.
- Templos.
- Ruinas.
- Campamentos.
- Mazmorras.
- Cofres.
- Caminos.

Utiliza plantillas declarativas y generación procedural.

Las estructuras que cruzan varios chunks deben generarse determinísticamente, sin depender del orden de carga.

Investiga L-systems para árboles y vegetación.

Investiga Wave Function Collapse para estructuras complejas cuando exista una ventaja concreta.

## 28. Criaturas e inteligencia artificial

Implementa:

- Animales pasivos.
- Criaturas neutrales.
- Enemigos.
- Comerciantes.
- Jefes.
- NPC exploradores.

Utiliza:

- Behavior Trees.
- Utility AI.
- A* limitado a regiones activas.
- Steering behaviors.
- Sistemas de percepción.
- Estados de descanso.
- Estados de persecución.
- Estados de huida.

Solo simula completamente entidades cercanas al jugador.

Las entidades lejanas deben utilizar simulación simplificada o permanecer inactivas.

## 29. Inventario y supervivencia

Implementa módulos opcionales:

- Inventario.
- Hotbar.
- Recolección.
- Herramientas.
- Durabilidad.
- Crafting.
- Cofres.
- Salud.
- Hambre.
- Resistencia.
- Daño ambiental.
- Experiencia.
- Progresión.
- Misiones.

Permite activar y desactivar estos sistemas según el tipo de videojuego.

# COMPONENTES COMPARTIDOS

## 30. Game Creator

Amplía el editor visual del framework.

Permite crear proyectos seleccionando:

- Anime Fighting.
- Anime Boss Battle.
- Voxel Exploration.
- Voxel Survival.
- Voxel Creative.
- Voxel Adventure.

Cada plantilla debe producir un proyecto jugable y editable.

El usuario debe poder configurar el videojuego mediante formularios o JSON.

## 31. Generador procedural de recursos

Crea una biblioteca reutilizable de recursos originales.

Incluye:

- Texturas.
- Patrones.
- Partículas.
- Fondos.
- Terrenos.
- Árboles.
- Rocas.
- Edificios.
- Armas ficticias.
- Accesorios.
- Efectos de energía.
- Interfaces.
- Iconos.
- Sonidos procedurales simples.

Aprovecha p5.js, Canvas, SVG, ecuaciones matemáticas y ruido procedural.

Permite importar sprite sheets, imágenes, sonidos y modelos compatibles.

No requieras servicios externos para ejecutar los videojuegos generados.

## 32. Editor de configuración

Incluye editores para:

- Personajes.
- Combos.
- Habilidades.
- Hitboxes.
- Animaciones.
- Escenarios.
- Biomas.
- Bloques.
- Estructuras.
- Criaturas.
- Semillas.
- Física.
- Cámara.
- Iluminación.
- Partículas.
- Audio.

Permite visualizar cambios en tiempo real.

## 33. Optimización general

Objetivo: 60 FPS en dispositivos capaces de soportar la configuración elegida.

Implementa:

- Object pooling.
- TypedArrays.
- Spatial hashing.
- Actualizaciones parciales.
- Fixed timestep.
- Interpolación visual.
- Lazy loading.
- Asset caching.
- Web Workers.
- Render batching.
- Frustum culling.
- Dynamic resolution.
- Presupuesto de partículas.
- Presupuesto de geometría.
- Distancia de simulación adaptable.
- Detección de capacidades WebGL.

Incluye perfiles gráficos:

- Bajo.
- Medio.
- Alto.
- Ultra.
- Automático.

Ajusta la calidad cuando exista una caída sostenida de rendimiento.

No prometas 60 FPS sin ejecutar benchmarks.

## 34. Monitor de rendimiento

Incluye un overlay de desarrollo con:

- FPS.
- Frame time.
- Tiempo de simulación.
- Tiempo de renderizado.
- Número de entidades.
- Número de partículas.
- Draw calls estimadas o medidas.
- Triángulos renderizados.
- Chunks activos.
- Chunks pendientes.
- Chunks en caché.
- Tamaño de geometría.
- Tiempo de generación procedural.
- Uso de memoria cuando exista una API compatible.
- Latencia de entrada.

Permite activar y desactivar el overlay mediante una tecla.

## 35. Testing obligatorio

Para Anime Battle Engine verifica:

- Colisiones coherentes.
- Hitboxes sincronizadas.
- Combos reproducibles.
- Prevención de daño duplicado.
- Límites del escenario.
- Estados válidos.
- Cancelación de ataques.
- Victoria y derrota.
- Comportamiento de CPU.
- Independencia del framerate.

Para Infinite Voxel Engine verifica:

- Determinismo de semillas.
- Continuidad entre chunks.
- Coordenadas negativas.
- Persistencia de modificaciones.
- Destrucción y colocación de bloques.
- Colisiones.
- Generación de cuevas.
- Transiciones entre biomas.
- Reconstrucción parcial de meshes.
- Ausencia de crecimiento ilimitado de memoria.
- Exploración prolongada.
- Recuperación correcta de partidas.

## 36. Demos funcionales

Entrega inicialmente cuatro videojuegos de demostración.

DEMO A — Shadow Warriors

Juego de lucha anime con dos guerreros originales, combos, ataques especiales, transformación, energía y CPU.

DEMO B — Titan Awakening

Batalla contra un jefe de gran tamaño, con varias fases, ataques telegrafiados, esquivas, partículas y cinemáticas.

DEMO C — Infinite Lands

Exploración voxel en primera persona, con semillas configurables, montañas, bosques, océanos, cuevas y construcción.

DEMO D — Lost Kingdom

Exploración voxel con ruinas procedurales, mazmorras, criaturas, recursos y misiones.

No entregues pantallas estáticas que simulen videojuegos.

Cada demo debe ser jugable.

## 37. Integración con agentes de IA

Permite que un agente genere videojuegos mediante una especificación declarativa.

Ejemplo de instrucciones:

Crea un juego de lucha anime con dos personajes, combate rápido, ataques eléctricos, arena nocturna y transformación especial.

Crea un mundo voxel infinito con semilla ANDES-2026, montañas elevadas, lagos, bosques, cuevas y aldeas.

El agente debe traducir la descripción a configuraciones del framework.

Valida las configuraciones mediante esquemas.

No permitas que una configuración inválida ejecute código arbitrario.

El motor debe ejecutar las configuraciones sin depender de consultas continuas a un LLM.

## 38. Eficiencia en consumo de tokens

Durante el desarrollo:

- Inspecciona únicamente archivos relevantes.
- Reutiliza componentes existentes.
- No reescribas todo el framework.
- Evita leer recursos binarios.
- Resume logs.
- Genera benchmarks mediante scripts.
- Mantén un registro compacto de decisiones.
- Realiza cambios pequeños y verificables.
- Ejecuta pruebas automáticamente.
- Registra pendientes y problemas.
- Actualiza CLAUDE.md sin convertirlo en un documento innecesariamente grande.

## 39. Orden de implementación

Fase 1: auditoría y componentes compartidos.

Fase 2: combate básico, personajes, física y animaciones.

Fase 3: combos, habilidades especiales, IA y efectos anime.

Fase 4: generación voxel determinista y chunks.

Fase 5: greedy meshing, optimización WebGL y cámara.

Fase 6: biomas, cuevas, exploración y persistencia.

Fase 7: editores, recursos y generación mediante agentes.

Fase 8: demos jugables, pruebas y optimización.

## 40. Criterios finales

- No romper videojuegos existentes.
- No introducir dependencias innecesarias.
- No simular funcionalidades incompletas.
- No inventar resultados de rendimiento.
- Mantener una arquitectura extensible.
- Utilizar recursos legalmente reutilizables.
- Permitir ejecución offline después de instalar los recursos.
- Documentar decisiones técnicas.
- Entregar demos funcionales.
- Mantener separados los motores especializados y el núcleo compartido.

Comienza inspeccionando mi framework actual.

Después presenta un plan concreto de integración y comienza la implementación.

No te limites a explicar cómo construir los motores. Implementa, ejecuta, prueba y optimiza.
