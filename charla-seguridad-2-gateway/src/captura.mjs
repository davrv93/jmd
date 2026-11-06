// Lo que ve quien inspecciona el tráfico: guarda cada petición tal como pasó por la puerta, y calcula las pistas regaladas.
const MAX = 60;

function pistas(e) {
  const p = new Set();
  for (const parte of e.ruta.split("?")[0].split("/")) {
    if (/^[a-záéíóúñ_-]{3,}$/i.test(parte) && !["api", "r", "d"].includes(parte)) p.add("ruta: " + parte);
    if (/^v\d+$/.test(parte)) p.add("versión: " + parte);
    if (/^\d{3,}$/.test(parte) || /^F-\d+$/.test(parte)) p.add("id adivinable: " + parte);
  }
  for (const k of ["x-powered-by", "server", "x-backend"]) if (e.cabecerasRespuesta[k]) p.add(`${k}: ${e.cabecerasRespuesta[k]}`);
  const claves = (o) => {
    if (Array.isArray(o)) return o.forEach(claves);
    if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) {
      if (!["v", "i", "c", "e", "error", "ref"].includes(k)) p.add("campo: " + k);
      claves(v);
    }
  };
  for (const t of [e.cuerpoPeticion, e.cuerpoRespuesta]) { try { claves(JSON.parse(t)); } catch {} }
  return [...p];
}

export function crearCaptura() {
  const puertas = { directo: [], gateway: [] };
  let n = 0;
  return {
    envolver(puerta, req, res, cuerpo) {
      const trozos = [];
      const finOriginal = res.end.bind(res);
      res.end = (t, ...resto) => {
        if (t) trozos.push(Buffer.from(t));
        const e = {
          n: ++n, hora: new Date().toISOString(), metodo: req.method, ruta: req.url, status: res.statusCode,
          cookie: req.headers.cookie ? "sid=… (la manda el navegador)" : "",
          autorizacion: req.headers.authorization ? "Bearer …" + req.headers.authorization.slice(-6) : "",
          cuerpoPeticion: cuerpo, cuerpoRespuesta: Buffer.concat(trozos).toString("utf8"),
          cabecerasRespuesta: Object.fromEntries(Object.entries(res.getHeaders()).map(([k, v]) => [k, String(v)])),
        };
        e.pistas = pistas(e);
        puertas[puerta].unshift(e);
        puertas[puerta].length = Math.min(puertas[puerta].length, MAX);
        return finOriginal(t, ...resto);
      };
    },
    ver: () => puertas,
    limpiar() { puertas.directo.length = 0; puertas.gateway.length = 0; },
  };
}
