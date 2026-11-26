// Forja · motores · Plugin Manager. Un plugin es DATOS (bloques, personajes, biomas, efectos, modos) más, solo si
// viene de un módulo de código de confianza, funciones de gancho. Una configuración JSON nunca trae código: lo que
// llega por JSON pasa por esquema.js y aquí solo se registra.
export function crearPlugins() {
  const lista = new Map(), registros = new Map(), ganchos = new Map();
  const reg = (tipo) => { if (!registros.has(tipo)) registros.set(tipo, new Map()); return registros.get(tipo); };
  const p = {
    instalar(plugin) {
      if (!plugin || !/^[a-z0-9-]{2,40}$/.test(plugin.id || '')) throw new Error('plugin sin id válido');
      if (lista.has(plugin.id)) return false;
      lista.set(plugin.id, plugin);
      for (const [tipo, items] of Object.entries(plugin.aporta || {})) for (const it of items) { if (reg(tipo).has(it.id)) throw new Error(`${tipo} «${it.id}» ya existe`); reg(tipo).set(it.id, { ...it, plugin: plugin.id }); }
      for (const [g, fn] of Object.entries(plugin.ganchos || {})) if (typeof fn === 'function') { if (!ganchos.has(g)) ganchos.set(g, []); ganchos.get(g).push(fn); }
      plugin.alInstalar?.(p);
      return true;
    },
    de(tipo) { return [...reg(tipo).values()]; },
    uno(tipo, id) { return reg(tipo).get(id); },
    emitir(g, ...args) { for (const fn of ganchos.get(g) || []) fn(...args); },
    get instalados() { return [...lista.keys()]; },
  };
  return p;
}
