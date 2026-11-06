#!/usr/bin/env node
// Uso: npm start
import { existsSync } from "node:fs";
import { arrancar } from "./src/arranque.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");

try {
  const ctx = await arrancar({ archivoRegistro: "registro/auditoria.jsonl" });
  const clave = encodeURIComponent(ctx.config.claveDemo);
  console.log(`
  Demo lista. Solo escucha en 127.0.0.1. Datos ficticios.

  Panel lado a lado   ${ctx.urls.panel}
  1 · Sin gateway     ${ctx.urls.directo}/#clave=${clave}
  2 · Con gateway     ${ctx.urls.gateway}/#clave=${clave}

  Usuarios: ana, beto, caja. Clave de esta corrida: ${ctx.config.claveDemo}
  Ruta de entrada de esta corrida: ${ctx.config.rutaOpaca}
  Ctrl+C para salir.
`);
} catch (e) {
  if (e.code === "EADDRINUSE") {
    console.error(`El puerto ${e.port} está ocupado. Cambia PUERTO_PANEL, PUERTO_DIRECTO o PUERTO_GATEWAY en .env (mira .env.example).`);
    process.exit(1);
  }
  throw e;
}
