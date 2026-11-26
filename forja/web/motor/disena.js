// Forja · «Diseña tu videojuego»: la entrada paso a paso, ANTES del editor de personajes.
//
// Base científica (verificada el 26-11-2026):
//  - Fullerton, T. (2014). Game Design Workshop (3.ª ed.), cap. 3 «Working with Formal Elements». CRC Press.
//    Los elementos formales son los que dan estructura a un juego: jugadores, objetivos, procedimientos, reglas,
//    recursos, conflicto, límites y resultado. Sin ellos un juego deja de ser juego.
//  - Juul, J. (2003). The Game, the Player, the World: Looking for a Heart of Gameness. Proc. DiGRA Level Up,
//    Utrecht. doi:10.26503/dl.v2003i1.65. Seis rasgos necesarios y suficientes: reglas; resultado variable y
//    cuantificable; valor distinto para cada resultado; esfuerzo del jugador; jugador apegado al resultado;
//    consecuencias negociables.
// Un paso = un elemento = una decisión (o, si la plantilla lo trae fijo, ver cómo es). Al final, la prueba de Juul
// y el botón para jugar. Nada se marca por pulsar «Siguiente»: lo que se decide se aplica de verdad al juego.

const HEROES = ['aventurero', 'ninja', 'astronauta', 'futbolista', 'robot', 'gato', 'zorro', 'dinosaurio'];
const VARIANTES = ['clasico', 'fuego', 'hielo', 'bosque', 'real', 'mecanico', 'dulce', 'espacial', 'acuatico', 'electrico', 'dorado', 'arcoiris'];   // amables para empezar
// Lo que cada plantilla trae (leído de plantillas/*.js; si cambia una plantilla, cambia aquí).
const JUEGO = {
  plataformas: { tipo: 'Carrera', objetivo: 'Correr, saltar y llegar a la meta.', recursos: ['Monedas: suman puntos', 'Gemas', 'Vidas (hasta 5)'],
    conflicto: 'Obstáculos y enemigos que patrullan las plataformas.', limites: 'Un nivel de plataformas; la cámara te sigue y el borde no se cruza.',
    gana: 'Llegas a la meta: tus puntos y tu tiempo.', pierde: 'Te quedas sin vidas.' },
  laberinto: { tipo: 'Escape', objetivo: 'Juntar todas las gemas y salir por la meta sin que te atrapen.', recursos: ['Gemas: hay que juntarlas todas', 'Vidas'],
    conflicto: 'Rivales que te buscan por el camino más corto (pathfinding).', limites: 'Un laberinto generado al azar; las paredes no se atraviesan.',
    gana: 'Escapas: tu tiempo en segundos.', pierde: 'Te atrapan cuando no te quedan vidas.' },
  futbol: { tipo: 'Anotar', objetivo: 'Meter el balón en el arco rival más veces que él.', recursos: ['El tiempo: 90 segundos', 'El balón: uno para los cuatro'],
    conflicto: 'Un defensa y un arquero rivales.', limites: 'La cancha y sus dos arcos.',
    gana: 'Llegas a 3 goles o vas arriba cuando acaba el tiempo.', pierde: 'El rival termina arriba (también puede haber empate).' },
  runner: { tipo: 'Aguante', objetivo: 'Llegar lo más lejos posible.', recursos: ['Monedas', 'Vidas'],
    conflicto: 'Bombas que saltar y proyectiles bajo los que agacharte; cada vez más rápido.', limites: 'Un mundo sin fin que se genera al azar.',
    gana: 'No hay meta: tu récord de metros y monedas.', pierde: 'Te quedas sin vidas.' },
};
const RITMO = [{ id: 160, nombre: 'Tranquilo' }, { id: 240, nombre: 'Normal' }, { id: 340, nombre: 'Rápido' }];
const GRAVEDAD = [{ id: 'luna', nombre: 'Luna', d: 'Flotas al saltar', v: { gravedad: 600, salto: 480 } }, { id: 'tierra', nombre: 'Tierra', d: 'Como siempre', v: { gravedad: 1400, salto: 680 } }, { id: 'jupiter', nombre: 'Júpiter', d: 'Caes de golpe', v: { gravedad: 2400, salto: 820 } }];
const ICONOS = { // trazos simples, currentColor
  jugadores: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
  objetivo: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/>',
  procedimientos: '<rect x="3" y="8" width="18" height="10" rx="3"/><path d="M8 11v4M6 13h4M15.5 12.5h.01M17.5 14.5h.01"/>',
  reglas: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/>',
  recursos: '<circle cx="9" cy="12" r="5"/><path d="M15 7a5 5 0 0 1 0 10"/>',
  conflicto: '<path d="M4 20 20 4M14 4h6v6M10 20H4v-6"/>',
  limites: '<rect x="3.5" y="3.5" width="17" height="17" rx="2" stroke-dasharray="3 3"/>',
  resultado: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M12 13v4M8 20h8M7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3"/>',
};

export function crearDisena({ el, R, sorpresa, fichaDe, miniatura, plantillasMeta, REGLAS_RIVAL, COL_FONDO, aplicar }) {
  const g = window.gsap, quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let D = { semilla: 1 + Math.floor(Math.random() * 9999), plantilla: 'plataformas', velocidad: 240, gravedad: 'tierra', rival: 'celda', fondo: 'noche' };
  try { Object.assign(D, JSON.parse(localStorage.getItem('forja.disena') || '{}').D || {}); } catch { /* nada */ }
  const recordar = (hecho = false) => { try { const v = JSON.parse(localStorage.getItem('forja.disena') || '{}'); localStorage.setItem('forja.disena', JSON.stringify({ hecho: v.hecho || hecho, D })); } catch { /* nada */ } };
  const capa = el('div', { class: 'disena', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dTitulo', hidden: '' });
  document.body.append(capa);
  let paso = 0, opcionesHeroe = null;
  const juego = () => JUEGO[D.plantilla] || JUEGO.plataformas;
  const metaDe = (id) => plantillasMeta.find((p) => p.id === id) || {};

  // Cada paso: elemento, pregunta, definición (Fullerton) y su contenido.
  const PASOS = [
    { id: 'jugadores', nombre: 'Jugadores', pregunta: '¿Quién juega?', def: 'Quienes aceptan entrar al juego y el papel que toman. En tu juego juega una persona, y su papel es tu héroe.',
      cuerpo: () => {
        opcionesHeroe ??= HEROES.map((f, i) => ({ f, e: sorpresa(R, D.semilla * 13 + i * 101, { familia: f, variante: VARIANTES[(D.semilla * 7 + i * 5) % VARIANTES.length] }) }));
        const caja = el('div', { class: 'd-heroes', role: 'radiogroup', 'aria-label': 'Tu héroe' });
        for (const o of opcionesHeroe) {
          const b = el('button', { type: 'button', class: 'd-heroe', role: 'radio', 'aria-checked': String(D.heroe?.familia === o.e.familia && D.heroe?.semilla === o.e.semilla) });
          const spec = fichaDe(o.e); const img = el('span', { class: 'd-foto' }); setTimeout(() => { img.style.backgroundImage = `url(${miniatura(spec, 150)})`; }, 20);
          b.append(img, el('b', {}, spec.nombre)); b.onclick = () => { D.heroe = o.e; recordar(); mostrar(true); }; caja.append(b);
        }
        const otra = el('button', { type: 'button', class: 'd-enlace' }, 'Ver otros héroes'); otra.onclick = () => { D.semilla++; opcionesHeroe = null; mostrar(true); };
        return [caja, otra];
      }, listo: () => !!D.heroe, falta: 'Elige un héroe para seguir.' },
    { id: 'objetivo', nombre: 'Objetivo', pregunta: '¿Qué tiene que lograr?', def: 'Lo que el jugador intenta conseguir dentro de las reglas. Da el tono de todo el juego.',
      cuerpo: () => [radio(Object.keys(JUEGO).map((id) => ({ id, nombre: metaDe(id).nombre || id, d: `${JUEGO[id].tipo}: ${JUEGO[id].objetivo}` })), D.plantilla, (id) => { D.plantilla = id; })] },
    { id: 'procedimientos', nombre: 'Procedimientos', pregunta: '¿Qué acciones puede hacer?', def: 'Los métodos de juego: quién hace qué, dónde, cuándo y cómo. En un videojuego, los controles.',
      cuerpo: () => [teclas(metaDe(D.plantilla).controles || ''), el('p', { class: 'd-sub' }, '¿A qué ritmo se mueve tu héroe?'), radio(RITMO, D.velocidad, (v) => { D.velocidad = v; })],
      nota: () => D.plantilla === 'plataformas' ? '' : 'El ritmo se usa en Plataformas; en esta plantilla el ritmo lo pone el juego.' },
    { id: 'reglas', nombre: 'Reglas', pregunta: '¿Qué se puede y qué no?', def: 'Las reglas definen los objetos del juego y las acciones permitidas. En un videojuego, el código las hace cumplir.',
      cuerpo: () => [el('p', { class: 'd-sub' }, 'Una regla que tú decides: la gravedad.'), radio(GRAVEDAD, D.gravedad, (v) => { D.gravedad = v; }), lista(['Las paredes y el suelo no se atraviesan.', 'Si un rival o un peligro te toca, pierdes una vida.'])],
      nota: () => D.plantilla === 'plataformas' ? '' : 'La gravedad se usa en Plataformas.' },
    { id: 'recursos', nombre: 'Recursos', pregunta: '¿Qué cosas valen y escasean?', def: 'Lo que sirve para lograr el objetivo y a la vez es escaso: por eso hay que cuidarlo.',
      cuerpo: () => [lista(juego().recursos)] },
    { id: 'conflicto', nombre: 'Conflicto', pregunta: '¿Qué te lo impide?', def: 'Lo que no deja lograr el objetivo de forma directa: obstáculos, oponentes o dilemas. Sin conflicto no hay reto.',
      cuerpo: () => D.plantilla === 'laberinto'
        ? [el('p', {}, juego().conflicto), el('p', { class: 'd-sub' }, '¿Cómo piensan tus rivales?'), radio(Object.entries(REGLAS_RIVAL).map(([id, t]) => ({ id, nombre: t.split(':')[0].replace(/^./, (c) => c.toUpperCase()), d: t.split(':')[1]?.trim().replace(/\bN\b/, '4') })), D.rival, (v) => { D.rival = v; })]
        : [el('p', {}, juego().conflicto)] },
    { id: 'limites', nombre: 'Límites', pregunta: '¿Dónde ocurre?', def: 'Lo que separa el juego de todo lo demás: el espacio donde se juega y el acuerdo de jugar.',
      cuerpo: () => [el('p', {}, juego().limites), el('p', { class: 'd-sub' }, 'Elige el mundo:'), radio(Object.keys(COL_FONDO).map((id) => ({ id, nombre: id[0].toUpperCase() + id.slice(1), color: COL_FONDO[id] })), D.fondo, (v) => { D.fondo = v; })] },
    { id: 'resultado', nombre: 'Resultado', pregunta: '¿Cómo se gana y cómo se pierde?', def: 'El resultado tiene que ser incierto para que valga la pena jugar, y se mide: ganar, perder, puntos.',
      cuerpo: () => [lista(['Ganas: ' + juego().gana, 'Pierdes: ' + juego().pierde, 'Pulsa R para volver a intentarlo.'])] },
  ];
  const JUUL = [
    ['Reglas', 'Las del paso 4, y el código las hace cumplir.'],
    ['Resultado variable y que se mide', () => juego().gana],
    ['Cada resultado vale distinto', 'Ganar es mejor que perder.'],
    ['Esfuerzo del jugador', () => `Tus controles: ${metaDe(D.plantilla).controles || ''}`],
    ['Te importa el resultado', () => `Juegas con tu héroe${D.heroe ? ': ' + fichaDe(D.heroe).nombre : ''}.`],
    ['Las consecuencias se negocian', 'Es un juego: si pierdes, repites con R.'],
  ];

  function radio(lista, actual, fn) {
    const c = el('div', { class: 'd-opciones', role: 'radiogroup' });
    for (const o of lista) {
      const b = el('button', { type: 'button', class: 'd-op', role: 'radio', 'aria-checked': String(o.id === actual) });
      if (o.color) b.append(el('i', { class: 'd-color', style: `--c:${o.color}` }));
      b.append(el('b', {}, o.nombre)); if (o.d) b.append(el('span', {}, o.d));
      b.onclick = () => { fn(o.id); recordar(); mostrar(true); }; c.append(b);
    }
    return c;
  }
  const lista = (xs) => { const u = el('ul', { class: 'd-lista' }); for (const x of xs) u.append(el('li', {}, x)); return u; };
  function teclas(t) { const p = el('p', { class: 'd-teclas' }); for (const parte of t.split('·')) { const s = el('span'); s.textContent = parte.trim(); p.append(s); } return p; }
  const icono = (id) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONOS[id]; return s; };

  function mostrar(mismo = false) {
    const final = paso === PASOS.length, P = PASOS[paso];
    const piezas = el('ol', { class: 'd-piezas', 'aria-label': 'Los 8 elementos de un juego' });
    PASOS.forEach((x, i) => { const li = el('li', { class: i < paso ? 'hecha' : i === paso ? 'ahora' : '' }); li.append(icono(x.id), el('span', {}, x.nombre)); li.onclick = () => { if (i <= paso || PASOS.slice(0, i).every((y) => !y.listo || y.listo())) { paso = i; mostrar(); } }; piezas.append(li); });
    const cuerpo = el('div', { class: 'd-cuerpo' });
    if (!final) {
      cuerpo.append(el('p', { class: 'd-num' }, `Elemento ${paso + 1} de ${PASOS.length}`), Object.assign(el('h2', { id: 'dTitulo' }), { textContent: P.nombre }),
        el('p', { class: 'd-pregunta' }, P.pregunta));
      const def = el('p', { class: 'd-def' }, P.def + ' '); def.append(el('cite', {}, '— según Fullerton, Game Design Workshop (2014)')); cuerpo.append(def);
      cuerpo.append(...P.cuerpo());
      const nota = P.nota?.(); if (nota) cuerpo.append(el('p', { class: 'd-nota' }, nota));
    } else {
      cuerpo.append(el('p', { class: 'd-num' }, 'Prueba final'), Object.assign(el('h2', { id: 'dTitulo' }), { textContent: '¿Ya es un juego?' }),
        el('p', { class: 'd-def' }, 'Jesper Juul (2003) reunió las definiciones de juego de un siglo y propuso seis rasgos que todo juego tiene. Revisemos el tuyo.'));
      const u = el('ul', { class: 'd-juul' });
      JUUL.forEach(([t, d], i) => { const li = el('li'); li.append(el('i', { 'aria-hidden': 'true' }, '✓'), el('b', {}, t), el('span', {}, typeof d === 'function' ? d() : d)); li.style.setProperty('--i', i); u.append(li); });
      cuerpo.append(u, el('p', { class: 'd-ref' }, 'Juul, J. (2003). The Game, the Player, the World: Looking for a Heart of Gameness. DiGRA Level Up, Utrecht.'));
    }
    const pie = el('div', { class: 'd-pie' });
    const saltar = el('button', { type: 'button', class: 'd-enlace' }, 'Ir directo al editor'); saltar.onclick = () => cerrar(false);
    const atras = el('button', { type: 'button', class: 'btn' }, 'Atrás'); atras.disabled = paso === 0; atras.onclick = () => { paso--; mostrar(); };
    const listo = final || !P.listo || P.listo();
    const sig = el('button', { type: 'button', class: 'btn primario' }, final ? '¡Jugar mi juego!' : paso === PASOS.length - 1 ? 'Ver si ya es un juego' : 'Siguiente');
    sig.disabled = !listo; if (!listo) sig.title = P.falta || '';
    sig.onclick = () => { if (final) return cerrar(true); paso++; mostrar(); };
    pie.append(saltar, el('span', { class: 'd-esp' }), atras, sig);
    capa.replaceChildren(piezas, cuerpo, pie);
    if (g && !quieto && !mismo) {
      g.fromTo(cuerpo.children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .05, ease: 'power3.out' });
      g.fromTo(piezas.querySelector('.ahora'), { scale: .85 }, { scale: 1, duration: .5, ease: 'back.out(2)' });
      if (final) g.fromTo(cuerpo.querySelectorAll('.d-juul li'), { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: .45, stagger: .18, delay: .3, ease: 'power2.out' });
    }
    (capa.querySelector('[aria-checked="true"]') || sig).focus({ preventScroll: true });
  }
  function cerrar(aplicarlo) {
    recordar(true); capa.hidden = true;
    if (aplicarlo) aplicar({ heroe: D.heroe, plantilla: D.plantilla, fondo: D.fondo, ajustes: { velocidad: D.velocidad, ...GRAVEDAD.find((x) => x.id === D.gravedad).v, ...(D.plantilla === 'laberinto' ? { rival: { tipo: D.rival, n: 4 } } : {}) } });
  }
  capa.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(false); });
  return {
    abrir: () => { paso = 0; capa.hidden = false; mostrar(); },
    hecho: () => { try { return !!JSON.parse(localStorage.getItem('forja.disena') || '{}').hecho; } catch { return false; } },
  };
}
