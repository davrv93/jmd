// Forja · voxel · inventario, herramientas, fabricación, salud/hambre/resistencia, experiencia y misiones.
// Son MÓDULOS ACTIVABLES (config.modulos): con todo apagado queda un sandbox; con todo encendido, supervivencia.
// Objetos, recetas y misiones son tablas de datos; el código solo las interpreta.
import { PORCLAVE, ID, bloque } from './bloques.js';

export const OBJETOS = {
  baya: { nombre: 'Baya', comida: 3 }, pan: { nombre: 'Pan', comida: 7 }, semilla: { nombre: 'Semillas' }, palo: { nombre: 'Palo' },
  carbon: { nombre: 'Carbón' }, hierro: { nombre: 'Hierro' }, oro: { nombre: 'Oro' }, cristal: { nombre: 'Cristal' },
  pico_madera: { nombre: 'Pico de madera', herramienta: 'pico', nivel: 0, vel: 2, dur: 60, dano: 2 }, pico_piedra: { nombre: 'Pico de piedra', herramienta: 'pico', nivel: 1, vel: 3.5, dur: 130, dano: 3 },
  pico_hierro: { nombre: 'Pico de hierro', herramienta: 'pico', nivel: 2, vel: 5.5, dur: 250, dano: 4 }, hacha_madera: { nombre: 'Hacha de madera', herramienta: 'hacha', nivel: 0, vel: 2.5, dur: 60, dano: 3 },
  hacha_piedra: { nombre: 'Hacha de piedra', herramienta: 'hacha', nivel: 1, vel: 4, dur: 130, dano: 4 }, pala_madera: { nombre: 'Pala de madera', herramienta: 'pala', nivel: 0, vel: 3, dur: 60, dano: 1 },
  espada_madera: { nombre: 'Espada de madera', arma: true, dur: 60, dano: 4 }, espada_piedra: { nombre: 'Espada de piedra', arma: true, dur: 130, dano: 6 }, espada_hierro: { nombre: 'Espada de hierro', arma: true, dur: 250, dano: 8 },
};
export const esBloque = (it) => !!PORCLAVE[it] && it !== 'aire';
export const nombreDe = (it) => OBJETOS[it]?.nombre || PORCLAVE[it]?.nombre || it;
// recetas sin forma: entradas → salida; estacion: bloque que debe haber a ≤ 4 bloques
export const RECETAS = [
  { sale: ['tablas', 4], usa: { madera: 1 } }, { sale: ['tablas', 4], usa: { abedul: 1 } }, { sale: ['palo', 4], usa: { tablas: 2 } },
  { sale: ['mesa', 1], usa: { tablas: 4 } }, { sale: ['antorcha', 4], usa: { carbon: 1, palo: 1 } }, { sale: ['escalera', 3], usa: { palo: 7 } },
  { sale: ['cofre', 1], usa: { tablas: 8 }, estacion: 'mesa' }, { sale: ['horno', 1], usa: { piedra: 8 }, estacion: 'mesa' },
  { sale: ['pico_madera', 1], usa: { tablas: 3, palo: 2 }, estacion: 'mesa' }, { sale: ['hacha_madera', 1], usa: { tablas: 3, palo: 2 }, estacion: 'mesa' }, { sale: ['pala_madera', 1], usa: { tablas: 1, palo: 2 }, estacion: 'mesa' },
  { sale: ['espada_madera', 1], usa: { tablas: 2, palo: 1 }, estacion: 'mesa' }, { sale: ['pico_piedra', 1], usa: { piedra: 3, palo: 2 }, estacion: 'mesa' }, { sale: ['hacha_piedra', 1], usa: { piedra: 3, palo: 2 }, estacion: 'mesa' },
  { sale: ['espada_piedra', 1], usa: { piedra: 2, palo: 1 }, estacion: 'mesa' }, { sale: ['pico_hierro', 1], usa: { hierro: 3, palo: 2 }, estacion: 'horno' }, { sale: ['espada_hierro', 1], usa: { hierro: 2, palo: 1 }, estacion: 'horno' },
  { sale: ['vidrio', 2], usa: { arena: 2, carbon: 1 }, estacion: 'horno' }, { sale: ['ladrillos', 2], usa: { arcilla: 2, carbon: 1 }, estacion: 'horno' }, { sale: ['pan', 1], usa: { semilla: 3 }, estacion: 'horno' },
  { sale: ['tallada', 4], usa: { piedra: 4 }, estacion: 'mesa' }, { sale: ['lampara', 2], usa: { cristal: 1, vidrio: 1 }, estacion: 'mesa' }, { sale: ['bandera', 1], usa: { lana: 2, palo: 1 } },
];
// comercio con el mercader: das → recibes
export const OFERTAS = [{ da: ['carbon', 3], recibe: ['antorcha', 6] }, { da: ['hierro', 2], recibe: ['pico_hierro', 1] }, { da: ['oro', 1], recibe: ['pan', 3] }, { da: ['cristal', 1], recibe: ['lampara', 2] }, { da: ['madera', 6], recibe: ['vidrio', 4] }, { da: ['lana', 3], recibe: ['bandera', 2] }];
export const BOTIN = {
  ruina: [['carbon', 2, 5], ['hierro', 1, 3], ['pan', 1, 2], ['tallada', 4, 8]], campamento: [['baya', 3, 6], ['antorcha', 2, 5], ['palo', 2, 6]],
  torre: [['hierro', 2, 4], ['oro', 1, 2], ['vidrio', 2, 4]], templo: [['oro', 2, 5], ['cristal', 1, 3], ['lampara', 1, 2]],
  mazmorra: [['hierro', 2, 5], ['oro', 1, 3], ['espada_piedra', 1, 1]], jefe: [['cristal', 4, 8], ['oro', 4, 8], ['espada_hierro', 1, 1]],
};
const INICIAL = { vacio: [], basico: [['pico_madera', 1], ['hacha_madera', 1], ['pala_madera', 1], ['antorcha', 8], ['tablas', 16], ['pan', 3]], completo: null };

// ---------------------------------------------------------------- misiones (tipo: condición evaluada con los eventos del juego)
export const MISIONES = {
  exploracion: [
    { id: 'biomas3', texto: 'Descubre 3 biomas distintos', tipo: 'biomas', n: 3 }, { id: 'cima', texto: 'Sube a más de 30 bloques sobre el mar', tipo: 'altura', n: 30 },
    { id: 'cueva', texto: 'Baja a una cueva (20 bloques bajo el mar)', tipo: 'profundidad', n: 20 }, { id: 'aldea', texto: 'Visita una aldea', tipo: 'visitar', estructura: 'aldea' },
    { id: 'construye', texto: 'Pon 20 bloques', tipo: 'poner', n: 20 }, { id: 'biomas6', texto: 'Descubre 6 biomas', tipo: 'biomas', n: 6 },
    { id: 'torre', texto: 'Encuentra una torre', tipo: 'visitar', estructura: 'torre' }, { id: 'cofres', texto: 'Abre 2 cofres', tipo: 'cofres', n: 2 },
    { id: 'lejos', texto: 'Aléjate 500 bloques del inicio', tipo: 'distancia', n: 500 }, { id: 'templo', texto: 'Encuentra un templo', tipo: 'visitar', estructura: 'templo' },
    { id: 'minero', texto: 'Recoge 10 de carbón', tipo: 'recoger', objeto: 'carbon', n: 10 }, { id: 'biomas10', texto: 'Descubre 10 biomas', tipo: 'biomas', n: 10 },
  ],
  supervivencia: [
    { id: 'madera', texto: 'Recoge 6 troncos', tipo: 'recoger', objeto: 'madera', n: 6 }, { id: 'mesa', texto: 'Fabrica una mesa de trabajo', tipo: 'fabricar', objeto: 'mesa' },
    { id: 'pico', texto: 'Fabrica un pico de madera', tipo: 'fabricar', objeto: 'pico_madera' }, { id: 'piedra', texto: 'Recoge 12 de piedra', tipo: 'recoger', objeto: 'piedra', n: 12 },
    { id: 'antorchas', texto: 'Fabrica antorchas', tipo: 'fabricar', objeto: 'antorcha' }, { id: 'noche', texto: 'Sobrevive una noche', tipo: 'noche', n: 1 },
    { id: 'hierro', texto: 'Consigue 3 de hierro', tipo: 'recoger', objeto: 'hierro', n: 3 }, { id: 'horno', texto: 'Fabrica un horno', tipo: 'fabricar', objeto: 'horno' },
    { id: 'pan', texto: 'Hornea pan', tipo: 'fabricar', objeto: 'pan' }, { id: 'pico_h', texto: 'Fabrica un pico de hierro', tipo: 'fabricar', objeto: 'pico_hierro' },
    { id: 'oro', texto: 'Consigue oro', tipo: 'recoger', objeto: 'oro', n: 1 }, { id: 'refugio', texto: 'Pon 40 bloques (tu refugio)', tipo: 'poner', n: 40 },
  ],
  aventura: [
    { id: 'ruina', texto: 'Encuentra las ruinas del reino', tipo: 'visitar', estructura: 'ruina' }, { id: 'cofres', texto: 'Recupera el botín de 2 cofres', tipo: 'cofres', n: 2 },
    { id: 'torre', texto: 'Sube a una torre vigía', tipo: 'visitar', estructura: 'torre' }, { id: 'arma', texto: 'Fabrica o consigue una espada', tipo: 'tener', objetos: ['espada_madera', 'espada_piedra', 'espada_hierro'] },
    { id: 'mazmorra', texto: 'Entra en la mazmorra', tipo: 'visitar', estructura: 'mazmorra', radio: 30 }, { id: 'golems', texto: 'Vence a 3 gólems de barro', tipo: 'vencer', criatura: 'golem', n: 3 },
    { id: 'guardian', texto: 'Vence al guardián de la mazmorra', tipo: 'vencer', criatura: 'guardian', n: 1 }, { id: 'templo', texto: 'Encuentra un templo', tipo: 'visitar', estructura: 'templo' },
    { id: 'comercia', texto: 'Comercia con un mercader', tipo: 'comerciar', n: 1 }, { id: 'cristal', texto: 'Consigue 3 cristales', tipo: 'recoger', objeto: 'cristal', n: 3 },
  ],
  constructor: [
    { id: 'casa', texto: 'Pon 30 bloques: tu casa', tipo: 'poner', n: 30 }, { id: 'alto', texto: 'Construye hasta 25 bloques sobre el mar', tipo: 'construir_alto', n: 25 },
    { id: 'faro', texto: 'Pon 3 lámparas de cristal', tipo: 'poner_bloque', bloque: 'lampara', n: 3 }, { id: 'vidrio', texto: 'Pon 12 de vidrio', tipo: 'poner_bloque', bloque: 'vidrio', n: 12 },
    { id: 'gran', texto: 'Pon 200 bloques', tipo: 'poner', n: 200 },
  ],
  ninguna: [],
};

export function crearSupervivencia(cfg, { alEvento = () => {} } = {}) {
  const M = cfg.modulos, S = cfg.supervivencia, creativo = cfg.modo === 'creativo';
  const inv = new Array(36).fill(null);
  const s = {
    inv, mano: 0, creativo,
    salud: S.saludMax, hambre: 20, resistencia: 10, aire: S.ahogo, xp: 0, muertes: 0, vencidos: {}, cont: { poner: 0, cofres: 0, comerciar: 0, noches: 0, poner_bloque: {}, recoger: {}, fabricado: {} }, biomas: new Set(), visitadas: new Set(),
    misiones: [], completas: new Set(),
    // ---------------------------------------------------------------- inventario
    meter(it, n = 1, dur = null) {
      if (!M.inventario && !creativo) return n;
      if (creativo && esBloque(it)) { if (!inv.some((x) => x?.it === it)) { const i = inv.findIndex((x) => !x); if (i >= 0) inv[i] = { it, n: 1 }; } return 0; }
      const apila = !OBJETOS[it]?.herramienta && !OBJETOS[it]?.arma;
      if (apila) for (const x of inv) if (x && x.it === it && x.n < 64) { const k = Math.min(n, 64 - x.n); x.n += k; n -= k; if (!n) break; }
      while (n > 0) { const i = inv.findIndex((x) => !x); if (i < 0) break; const k = apila ? Math.min(64, n) : 1; inv[i] = { it, n: k, ...(OBJETOS[it]?.dur ? { dur: dur ?? OBJETOS[it].dur } : {}) }; n -= k; }
      s.cont.recoger[it] = (s.cont.recoger[it] || 0) + 1; alEvento('inventario');
      return n;
    },
    cuantos(it) { return inv.reduce((a, x) => a + (x && x.it === it ? x.n : 0), 0); },
    sacar(it, n = 1) { if (creativo && esBloque(it)) return true; if (s.cuantos(it) < n) return false; for (let i = inv.length - 1; i >= 0 && n; i--) { const x = inv[i]; if (x && x.it === it) { const k = Math.min(n, x.n); x.n -= k; n -= k; if (!x.n) inv[i] = null; } } alEvento('inventario'); return true; },
    get enMano() { return inv[s.mano] || null; },
    gastarHerramienta() { const x = s.enMano; if (!x || !x.dur || !M.durabilidad || creativo) return; x.dur--; if (x.dur <= 0) { inv[s.mano] = null; alEvento('aviso', `Se rompió tu ${nombreDe(x.it)}`); } alEvento('inventario'); },
    // ---------------------------------------------------------------- minar: segundos que tarda y si suelta algo
    minado(id) {
      const b = bloque(id); if (b.dureza < 0) return { puede: false };
      if (creativo || M.minado === 'instantaneo') return { puede: true, segundos: 0, suelta: !creativo };
      const t = OBJETOS[s.enMano?.it], buena = !!(M.herramientas && t && t.herramienta === b.herramienta);
      const nivelOk = !M.herramientas || !b.nivel || (buena && t.nivel >= b.nivel);
      const vel = (buena ? t.vel : 1) * S.velocidadMinado;
      return { puede: true, segundos: Math.max(0.05, (b.dureza * 1.2) / vel), suelta: nivelOk && (!b.herramienta || !M.herramientas || b.herramienta !== 'pico' || buena), buena };
    },
    danoArma() { const t = OBJETOS[s.enMano?.it]; return t?.dano || 1; },
    // ---------------------------------------------------------------- fabricar
    recetasDisponibles(estaciones) { return RECETAS.filter((r) => !r.estacion || estaciones.has(r.estacion)).map((r) => ({ ...r, puede: Object.entries(r.usa).every(([k, n]) => s.cuantos(k) >= n) })); },
    fabricar(r, estaciones) {
      if (!M.crafting && !creativo) return false;
      if (r.estacion && !estaciones.has(r.estacion)) return false;
      if (!Object.entries(r.usa).every(([k, n]) => s.cuantos(k) >= n)) return false;
      for (const [k, n] of Object.entries(r.usa)) s.sacar(k, n);
      s.meter(r.sale[0], r.sale[1]); s.cont.fabricado[r.sale[0]] = true; s.ganarXP(1); alEvento('fabricar', r.sale[0]); return true;
    },
    comerciar(o) { if (!s.sacar(o.da[0], o.da[1])) return false; s.meter(o.recibe[0], o.recibe[1]); s.cont.comerciar++; alEvento('comerciar'); return true; },
    // ---------------------------------------------------------------- cuerpo
    dano(n, causa = '') {
      if (!M.salud || creativo || n <= 0) return false;
      const mult = { pacifica: causa === 'criatura' ? 0 : 1, facil: 0.6, normal: 1, dificil: 1.5 }[S.dificultad] ?? 1;
      const d = n * mult; if (!d) return false; s.salud = Math.max(0, s.salud - d); alEvento('dano', d, causa); if (s.salud <= 0) alEvento('muerte', causa); return true;
    },
    comer() { const x = s.enMano, o = OBJETOS[x?.it]; if (!o?.comida || !M.hambre) return false; s.hambre = Math.min(20, s.hambre + o.comida); s.sacar(x.it, 1); alEvento('comer'); return true; },
    ganarXP(n) { if (!M.experiencia) return; const antes = s.nivel; s.xp += n; if (s.nivel > antes) alEvento('nivel', s.nivel); },
    get nivel() { return Math.floor(Math.sqrt(s.xp / 8)); },
    // por paso: hambre, regeneración, resistencia, aire. c: cuerpo (física); dt en s
    paso(dt, c, corriendo) {
      if (creativo) return;
      if (M.hambre) { s.hambre = Math.max(0, s.hambre - dt * S.hambreRitmo * (corriendo ? 0.05 : 0.012)); if (s.hambre <= 0) { s._ham = (s._ham || 0) + dt; if (s._ham > 4) { s._ham = 0; s.dano(1, 'hambre'); } } }
      if (M.salud && s.salud < S.saludMax && (!M.hambre || s.hambre > 12) && S.regeneracion > 0) { s._reg = (s._reg || 0) + dt * S.regeneracion; if (s._reg > 3) { s._reg = 0; s.salud = Math.min(S.saludMax, s.salud + 1); if (M.hambre) s.hambre -= 0.5; } }
      if (M.resistencia) s.resistencia = corriendo ? Math.max(0, s.resistencia - dt * 1.4) : Math.min(10, s.resistencia + dt * 1.1);
      if (M.danoAmbiental) {
        if (c.cabezaAgua) { s.aire = Math.max(0, s.aire - dt); if (s.aire <= 0) { s._ah = (s._ah || 0) + dt; if (s._ah > 1) { s._ah = 0; s.dano(2, 'agua'); } } } else s.aire = Math.min(S.ahogo, s.aire + dt * 4);
        if (c.enLava) { s._lv = (s._lv || 0) + dt; if (s._lv > 0.5) { s._lv = 0; s.dano(2 * S.danoLava, 'lava'); } }
      }
    },
    puedeCorrer() { return !M.resistencia || creativo || s.resistencia > 0.5 || (M.hambre && s.hambre > 6 && s.resistencia > 0.5); },
    inicial(modo = S.inventarioInicial) {
      inv.fill(null);
      const lista = modo === 'completo' || creativo ? (cfg.hotbar?.length ? cfg.hotbar : []).concat(Object.keys(ID).filter((k) => !['aire', 'lecho', 'agua', 'lava'].includes(k))) : INICIAL[modo] || [];
      if (modo === 'completo' || creativo) { const vistos = new Set(); for (const it of lista) if (!vistos.has(it) && PORCLAVE[it]) { vistos.add(it); const i = inv.findIndex((x) => !x); if (i >= 0) inv[i] = { it, n: creativo ? 1 : 64 }; } }
      else for (const [it, n] of lista) s.meter(it, n);
      s.salud = S.saludMax; s.hambre = 20; s.resistencia = 10; s.aire = S.ahogo;
    },
    // ---------------------------------------------------------------- misiones
    prepararMisiones(lista) { s.misiones = (lista || MISIONES[cfg.misiones.lista] || []).slice(0, cfg.misiones.cantidad); },
    progreso(m, ctx) {
      switch (m.tipo) {
        case 'biomas': return [s.biomas.size, m.n]; case 'altura': return [Math.max(0, Math.round(ctx.maxAltura - ctx.mar)), m.n]; case 'profundidad': return [Math.max(0, Math.round(ctx.mar - ctx.minAltura)), m.n];
        case 'visitar': return [s.visitadas.has(m.estructura) ? 1 : 0, 1]; case 'poner': return [s.cont.poner, m.n]; case 'poner_bloque': return [s.cont.poner_bloque[m.bloque] || 0, m.n];
        case 'cofres': return [s.cont.cofres, m.n]; case 'distancia': return [Math.round(ctx.distancia), m.n]; case 'recoger': return [s.cuantos(m.objeto) + (s.completas.has(m.id) ? m.n : 0), m.n];
        case 'fabricar': return [s.cont.fabricado[m.objeto] ? 1 : 0, 1]; case 'noche': return [s.cont.noches, m.n]; case 'tener': return [m.objetos.some((o) => s.cuantos(o)) ? 1 : 0, 1];
        case 'vencer': return [s.vencidos[m.criatura] || 0, m.n]; case 'comerciar': return [s.cont.comerciar, m.n]; case 'construir_alto': return [Math.max(0, Math.round(ctx.maxPuesto - ctx.mar)), m.n];
        default: return [0, 1];
      }
    },
    revisarMisiones(ctx) {
      const nuevas = [];
      for (const m of s.misiones) { if (s.completas.has(m.id)) continue; const [a, b] = s.progreso(m, ctx); if (a >= b) { s.completas.add(m.id); nuevas.push(m); s.ganarXP(Math.round(5 * cfg.misiones.recompensaXP)); } }
      return nuevas;
    },
    get siguiente() { return s.misiones.find((m) => !s.completas.has(m.id)) || null; },
    exportar() { return { inv: inv.map((x) => (x ? { ...x } : null)), mano: s.mano, salud: s.salud, hambre: s.hambre, xp: s.xp, muertes: s.muertes, vencidos: s.vencidos, cont: s.cont, biomas: [...s.biomas], visitadas: [...s.visitadas], completas: [...s.completas] }; },
    importar(o) {
      if (!o) return; inv.fill(null); (o.inv || []).forEach((x, i) => { if (x && i < 36 && (OBJETOS[x.it] || PORCLAVE[x.it])) inv[i] = { it: x.it, n: Math.max(1, Math.min(64, x.n | 0)), ...(x.dur ? { dur: x.dur | 0 } : {}) }; });
      Object.assign(s, { mano: o.mano | 0, salud: +o.salud || S.saludMax, hambre: o.hambre ?? 20, xp: +o.xp || 0, muertes: o.muertes | 0, vencidos: o.vencidos || {}, cont: { ...s.cont, ...(o.cont || {}) } });
      s.biomas = new Set(o.biomas || []); s.visitadas = new Set(o.visitadas || []); s.completas = new Set(o.completas || []);
    },
  };
  return s;
}
