// Forja · Anime Battle Engine · traductor de descripciones a configuración (§37). Léxico determinista: cada frase
// reconocida cambia campos concretos de la configuración y queda anotada en «entendido». Sin LLM, sin red.
//   traducir('crea un juego de lucha anime con dos personajes, combate rapido, ataques electricos, arena nocturna y
//            transformacion especial', configBase, 'duelo-anime')
const REGLAS = [
  [/\b(rapid|veloz|frenetic|agil)/, (c) => { c.velocidad = 1.25; }, 'combate rápido'],
  [/\b(lent|pausad|tranquil)/, (c) => { c.velocidad = 0.8; }, 'combate pausado'],
  [/\belectric|\brayo|\btrueno|\brelampag/, (c, x) => { x.elemento = 'electrico'; }, 'ataques eléctricos'],
  [/\bfuego|\bllama|\bbrasa|\bvolcan/, (c, x) => { x.elemento = 'fuego'; }, 'ataques de fuego'],
  [/\b(hielo|helad|escarcha)/, (c, x) => { x.elemento = 'hielo'; }, 'ataques de hielo'],
  [/\bnoct|\bnoche|\bluna/, (c) => { (c.escenario ||= {}).tema = 'noche'; }, 'arena nocturna'],
  [/\bdojo/, (c) => { (c.escenario ||= {}).tema = 'dojo'; }, 'dojo'],
  [/\bpuerto|\bmuelle/, (c) => { (c.escenario ||= {}).tema = 'puerto'; }, 'puerto'],
  [/\bazotea|\btejado|\blluvia/, (c) => { (c.escenario ||= {}).tema = 'azotea'; }, 'azotea con lluvia'],
  [/\btemplo|\bruina|\bcantera/, (c) => { (c.escenario ||= {}).tema = 'templo'; }, 'templo en ruinas'],
  [/\bbosque|\bselva/, (c) => { (c.escenario ||= {}).tema = 'bosque'; }, 'bosque'],
  [/\btransforma/, (c, x) => { x.transformar = true; }, 'transformación especial'],
  [/\bdos jugadores|\b2 jugadores|\bversus|\blocal/, (c) => { c.modo = 'versus'; }, 'dos jugadores'],
  [/\bentrena/, (c) => { c.modo = 'entrenamiento'; }, 'entrenamiento'],
  [/\btorneo/, (c) => { c.modo = 'torneo'; }, 'torneo'],
  [/\bhistoria|\bcapitulo/, (c) => { c.modo = 'historia'; }, 'modo historia'],
  [/\bsupervivencia|\boleada/, (c) => { c.modo = 'supervivencia'; }, 'supervivencia'],
  [/\b(2 contra 2|dos contra dos|equipo|relevo)/, (c) => { c.modo = 'equipos'; }, '2 contra 2'],
  [/\blateral|\bavance|\bscroll/, (c) => { c.modo = 'lateral'; }, 'avance lateral'],
  [/\b2[.,]?5 ?d|\bprofundidad/, (c) => { c.modo = 'arena25d'; }, 'arena 2.5D'],
  [/\b(facil|principiante|tranqui)/, (c) => { c.nivel = 'principiante'; if (c.jefe) c.jefe.danoMul = 0.7; }, 'dificultad fácil'],
  [/\b(dificil|experto|brutal)/, (c) => { c.nivel = 'experto'; if (c.jefe) { c.jefe.danoMul = 1.4; c.jefe.avisoMul = 0.8; } }, 'dificultad alta'],
  [/\bsin destellos|\bfotosensib/, (c) => { c.accesibilidad = { ...(c.accesibilidad || {}), reducirDestellos: true }; }, 'sin destellos'],
  [/\bsin sacudidas|\bmareo|\breducir movimiento/, (c) => { c.accesibilidad = { ...(c.accesibilidad || {}), reducirMovimiento: true }; }, 'sin sacudidas'],
  [/\bmuchas particulas|\bespectacular|\bexplosiv/, (c) => { c.efectos = { ...(c.efectos || {}), intensidad: 1.5, densidad: 1.5 }; }, 'efectos intensos'],
];
export function traducir(t, config, plantilla) {
  const entendido = [], extra = {};
  for (const [re, f, et] of REGLAS) if (re.test(t)) { f(config, extra); entendido.push(et); }
  if (plantilla === 'jefe-titan') { config.modo = 'jefe'; if (/\b(enorme|gigante|colosal)/.test(t)) { config.jefe = { ...(config.jefe || {}), salud: 7000 }; entendido.push('jefe enorme'); } }
  if (extra.elemento) {
    const quien = extra.elemento === 'fuego' ? 'mako' : 'ren';
    config.jugador = quien; config.rival = quien === 'ren' ? 'mako' : 'ren';
    if (!['electrico', 'fuego'].includes(extra.elemento)) config.personajes = { ...(config.personajes || {}), [quien]: { ...(config.personajes?.[quien] || {}), elemento: extra.elemento, efectos: { aura: '#bfefff', estela: '#e6fbff' } } };
  }
  if (extra.transformar) { const q = config.jugador || 'ren'; config.personajes = { ...(config.personajes || {}), [q]: { ...(config.personajes?.[q] || {}), transformacion: { ...(config.personajes?.[q]?.transformacion || {}), costo: 40 } } }; }
  return { config, entendido };
}
