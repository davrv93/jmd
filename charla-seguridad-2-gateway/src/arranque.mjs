// Levanta las cuatro piezas en un solo proceso. Las pruebas la usan con puertos libres.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crearConfig } from "./config.mjs";
import { crearCredenciales, crearDatos } from "./datos.mjs";
import { crearCaptura } from "./captura.mjs";
import { crearRegistro } from "./registro.mjs";
import { crearBackend } from "./backend-interno.mjs";
import { crearDirecta } from "./api-directa.mjs";
import { crearGateway } from "./gateway.mjs";
import { crearPanel } from "./panel.mjs";
import { escuchar } from "./http.mjs";

const publico = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "publico");
const POLITICAS = { autorizacion: true, listadoV2: false, gatewayCaido: false, saltoRuta: 0 };

export async function arrancar(cambios = {}) {
  const config = crearConfig(cambios);
  const politicas = { ...POLITICAS };
  const tiendaDirecta = { datos: crearDatos() };
  const tiendaInterna = { datos: crearDatos() };
  const credenciales = crearCredenciales(config.claveDemo);
  const captura = crearCaptura();
  const registro = crearRegistro(config.archivoRegistro);
  const urls = {};

  const backend = crearBackend({ config, politicas, tienda: tiendaInterna });
  const directa = crearDirecta({ config, politicas, tienda: tiendaDirecta, credenciales, captura, publico });
  const gateway = crearGateway({ config, politicas, tienda: tiendaInterna, credenciales, registro, captura, urlBackend: () => urls.backend, publico });

  const ctx = {
    config, politicas, registro, captura, urls, tiendaDirecta, tiendaInterna,
    reiniciar() {
      tiendaDirecta.datos = crearDatos();
      tiendaInterna.datos = crearDatos();
      Object.assign(politicas, POLITICAS, { saltoRuta: politicas.saltoRuta });
    },
  };
  const panel = crearPanel({ ctx, publico });

  const url = (p) => `http://${config.host}:${p}`;
  urls.backend = url(await escuchar(backend, config.puertos.backend, config.host));
  urls.directo = url(await escuchar(directa, config.puertos.directo, config.host));
  urls.gateway = url(await escuchar(gateway, config.puertos.gateway, config.host));
  urls.panel = url(await escuchar(panel, config.puertos.panel, config.host));

  ctx.detener = () => Promise.all([backend, directa, gateway, panel].map((s) => new Promise((ok) => { s.closeAllConnections?.(); s.close(ok); })));
  return ctx;
}
