// El «sobre»: AES-256-GCM de la librería estándar de Node. El navegador hace lo mismo con Web Crypto.
// GCM cifra y además sella: si cambia un solo bit del mensaje, abrirlo falla.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

export const aadPeticion = (sesionId) => `v1|${sesionId}|peticion`;
export const aadRespuesta = (sesionId, nonce) => `v1|${sesionId}|respuesta|${nonce}`;
export const aadEntrada = "v1|entrada|peticion";
export const aadEntradaRespuesta = (nonce) => `v1|entrada|respuesta|${nonce}`;
export const aadRenovar = (sesionId) => `v1|${sesionId}|renovar`;

// Antes del login no hay clave compartida. Cada lado aporta una llave pública (ECDH P-256) y ambos derivan la misma
// clave AES sin enviarla nunca. Frena a quien solo mira el tráfico. A quien se mete en medio y cambia la llave solo lo
// frena TLS: por eso esto se suma a HTTPS y no lo reemplaza.
export const claveDeEntrada = (ecdh, publicaAjena) =>
  Buffer.from(hkdfSync("sha256", ecdh.computeSecret(Buffer.from(publicaAjena, "base64url")), Buffer.alloc(0), "gateway-entrada-v1", 32));

export function cifrar(clave, textoPlano, aad) {
  const iv = randomBytes(12); // nunca se repite con la misma clave: por eso es al azar en cada mensaje
  const c = createCipheriv("aes-256-gcm", clave, iv);
  c.setAAD(Buffer.from(aad));
  const cuerpo = Buffer.concat([c.update(textoPlano, "utf8"), c.final()]);
  return { v: 1, i: iv.toString("base64url"), c: Buffer.concat([cuerpo, c.getAuthTag()]).toString("base64url") };
}

// Devuelve el texto o lanza un error si el sobre fue tocado o no es de esta sesión.
export function descifrar(clave, sobre, aad) {
  const iv = Buffer.from(sobre.i, "base64url");
  const todo = Buffer.from(sobre.c, "base64url");
  if (iv.length !== 12 || todo.length < 17) throw new Error("sobre con tamaño inválido");
  const d = createDecipheriv("aes-256-gcm", clave, iv);
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(todo.subarray(todo.length - 16));
  return Buffer.concat([d.update(todo.subarray(0, todo.length - 16)), d.final()]).toString("utf8");
}

export const sobreValido = (s) =>
  !!s && typeof s === "object" && s.v === 1 && typeof s.i === "string" && typeof s.c === "string";
