// Configuración de la demo. Ningún secreto vive en el código: se generan al arrancar y mueren con el proceso.
import { randomBytes } from "node:crypto";

const numero = (nombre, porDefecto) => {
  const v = Number(process.env[nombre]);
  return Number.isFinite(v) && process.env[nombre] ? v : porDefecto;
};

export function crearConfig(cambios = {}) {
  return {
    host: "127.0.0.1", // la demo nunca escucha fuera de esta máquina
    puertos: {
      panel: numero("PUERTO_PANEL", 4810),
      directo: numero("PUERTO_DIRECTO", 4811),
      gateway: numero("PUERTO_GATEWAY", 4812),
      backend: 0, // puerto libre al azar: el cliente no lo conoce
    },
    claveDemo: process.env.CLAVE_DEMO || randomBytes(9).toString("base64url"),
    secretoInterno: randomBytes(32).toString("hex"), // lo comparten gateway y backend
    rutaOpaca: "/r/" + randomBytes(9).toString("base64url"), // entrada fija; cambia en cada arranque
    secretoRutas: randomBytes(32), // firma las rutas dinámicas de cada sesión
    ventanaRutaMs: numero("VENTANA_RUTA_MS", 60_000), // cada cuánto rota la ruta de una sesión
    limites: {
      sesion: numero("LIMITE_SESION", 20),
      ip: 3000, // alto: las simulaciones del panel salen todas de esta máquina
      entrada: numero("LIMITE_ENTRADA", 600), // intentos de inicio de sesión por IP y minuto: alto porque las simulaciones del panel entran muchas veces
      ventanaMs: numero("VENTANA_LIMITE_MS", 10_000),
    },
    ventanaPeticionMs: numero("VENTANA_PETICION_MS", 30_000),
    intentosLogin: 5, // fallos seguidos antes de bloquear ese usuario
    bloqueoMs: numero("BLOQUEO_MS", 60_000),
    sesionMs: 30 * 60_000,
    cuerpoMaxBytes: 16 * 1024,
    timeoutBackendMs: 3000,
    archivoRegistro: "",
    ...cambios,
  };
}
