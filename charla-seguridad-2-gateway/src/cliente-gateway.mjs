// El mismo cliente del navegador, en Node: lo usan las pruebas y los escenarios. Quien tiene la clave puede hacer esto.
import { randomUUID } from "node:crypto";
import { aadPeticion, aadRespuesta, cifrar, descifrar } from "./sobre.mjs";

export class ClienteGateway {
  constructor(base, entrada) { this.base = base; this.entrada = entrada; }

  async entrar(usuario, clave) {
    const r = await fetch(this.base + this.entrada, { method: "POST", body: JSON.stringify({ u: usuario, p: clave }) });
    const j = await r.json();
    if (r.status !== 200) return { status: r.status, json: j };
    this.sesion = j.s;
    this.clave = Buffer.from(j.k, "base64url");
    this.ruta = j.r;
    this.setCookie = r.headers.get("set-cookie");
    this.cookie = this.setCookie.split(";")[0];
    return { status: 200, json: j };
  }

  async renovar() {
    const r = await fetch(this.base + this.entrada, { method: "POST", headers: { Cookie: this.cookie }, body: JSON.stringify({ renovar: true }) });
    const j = await r.json();
    if (r.status === 200) this.ruta = j.r;
    return r.status;
  }

  sellar(o, d = {}, { t = Date.now(), n = randomUUID() } = {}) {
    return { n, cuerpo: JSON.stringify(cifrar(this.clave, JSON.stringify({ o, d, n, t }), aadPeticion(this.sesion))) };
  }

  async enviar(cuerpo, { ruta = this.ruta, cookie = this.cookie } = {}) {
    const r = await fetch(this.base + ruta, { method: "POST", headers: cookie ? { Cookie: cookie } : {}, body: cuerpo });
    return { status: r.status, json: await r.json().catch(() => null) };
  }

  abrir(sobre, n) {
    const claro = JSON.parse(descifrar(this.clave, sobre, aadRespuesta(this.sesion, n)));
    this.ruta = claro.r;
    return claro.d;
  }

  async llamar(o, d = {}, opciones = {}) {
    const { n, cuerpo } = this.sellar(o, d, opciones);
    const r = await this.enviar(cuerpo, opciones);
    return { ...r, cuerpo, datos: r.status === 200 ? this.abrir(r.json, n) : null };
  }
}
