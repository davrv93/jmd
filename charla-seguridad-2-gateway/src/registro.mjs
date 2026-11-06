// Auditoría del gateway. Guarda decisiones, nunca el contenido descifrado, el token ni la clave.
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export function crearRegistro(archivo = "") {
  const lineas = [];
  return {
    anotar(e) {
      const linea = { hora: new Date().toISOString(), ...e };
      lineas.unshift(linea);
      lineas.length = Math.min(lineas.length, 300);
      if (archivo) {
        mkdir(path.dirname(archivo), { recursive: true })
          .then(() => appendFile(archivo, JSON.stringify(linea) + "\n"))
          .catch(() => {});
      }
    },
    ver: () => lineas,
    porRef: (ref) => lineas.find((l) => l.ref === ref),
    limpiar() { lineas.length = 0; },
  };
}
