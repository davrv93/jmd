// Datos ficticios de «Bodega Demo». Ningún nombre, documento ni monto es real.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function crearDatos() {
  return {
    usuarios: [
      { usuario: "ana", clienteId: "1042", rol: "cliente", nombre: "Ana Demo", dni: "00000001" },
      { usuario: "beto", clienteId: "1043", rol: "cliente", nombre: "Beto Demo", dni: "00000002" },
      { usuario: "caja", clienteId: "0", rol: "admin", nombre: "Caja Demo", dni: "00000003" },
    ],
    facturas: [
      { id: "F-2001", clienteId: "1042", total: 120.5, moneda: "PEN", estado: "pendiente", costo_interno: 81.2, margen_pct: 32.6 },
      { id: "F-2002", clienteId: "1042", total: 45, moneda: "PEN", estado: "pagada", costo_interno: 30.1, margen_pct: 33.1 },
      { id: "F-2003", clienteId: "1043", total: 310.75, moneda: "PEN", estado: "pendiente", costo_interno: 240, margen_pct: 22.8 },
    ],
    pagos: [],
  };
}

// Las contraseñas se guardan derivadas con scrypt, nunca en claro.
export function crearCredenciales(clave) {
  const sal = randomBytes(16);
  const huella = scryptSync(clave, sal, 32);
  return { verificar: (intento) => timingSafeEqual(scryptSync(String(intento), sal, 32), huella) };
}
