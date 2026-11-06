import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { arrancar } from "../src/arranque.mjs";
import { ClienteGateway } from "../src/cliente-gateway.mjs";
import { correrEscenario, ESCENARIOS } from "../src/escenarios.mjs";
import { correrAuditoria } from "../src/auditoria.mjs";
import { cifrar, descifrar } from "../src/sobre.mjs";
import { randomBytes } from "node:crypto";

let ctx;
const entrar = async (u = "ana") => {
  const c = new ClienteGateway(ctx.urls.gateway, ctx.config.rutaOpaca);
  await c.entrar(u, ctx.config.claveDemo);
  return c;
};
const motivo = (r) => ctx.registro.porRef(r.json.ref)?.motivo;

before(async () => {
  ctx = await arrancar({
    puertos: { panel: 0, directo: 0, gateway: 0, backend: 0 },
    limites: { sesion: 20, ip: 100_000, entrada: 100_000, ventanaMs: 10_000 },
  });
});
after(() => ctx.detener());
beforeEach(() => ctx.reiniciar());

describe("sobre AES-GCM", () => {
  const k = randomBytes(32);
  it("abre lo que cierra", () => assert.equal(descifrar(k, cifrar(k, "hola", "a"), "a"), "hola"));
  it("falla con otra AAD", () => assert.throws(() => descifrar(k, cifrar(k, "hola", "a"), "b")));
  it("nunca repite el IV", () => assert.notEqual(cifrar(k, "x", "a").i, cifrar(k, "x", "a").i));
});

describe("gateway", () => {
  it("camino feliz: lista facturas sin campos internos", async () => {
    const r = await (await entrar()).llamar("k4");
    assert.equal(r.status, 200);
    assert.equal(r.datos.facturas.length, 2);
    assert.deepEqual(Object.keys(r.datos.facturas[0]).sort(), ["estado", "id", "moneda", "total"]);
  });
  it("el tráfico no deja ver ruta real, operación ni datos", async () => {
    const c = await entrar();
    const r = await c.llamar("q2", { id: "F-2001" });
    const visto = c.ruta + r.cuerpo + JSON.stringify(r.json);
    // "q2" va entre comillas: dos letras sueltas pueden salir por azar dentro del texto cifrado.
    for (const t of ["F-2001", '"q2"', "interno", "facturas", "120.5"]) assert.ok(!visto.includes(t), t);
  });
  it("el inicio de sesión y su respuesta tampoco se leen", async () => {
    const c = new ClienteGateway(ctx.urls.gateway, ctx.config.rutaOpaca);
    const r = await c.entrar("ana", ctx.config.claveDemo);
    const visto = c.cuerpoEntrada + JSON.stringify(r.json);
    for (const t of ["ana", ctx.config.claveDemo, c.sesion, c.clave.toString("base64url"), c.ruta]) assert.ok(!visto.includes(t), t);
    assert.deepEqual(Object.keys(JSON.parse(c.cuerpoEntrada)).sort(), ["c", "e", "i", "v"]);
    assert.deepEqual(Object.keys(r.json).sort(), ["c", "i", "v"]);
  });
  it("un inicio de sesión capturado no se puede repetir", async () => {
    const c = new ClienteGateway(ctx.urls.gateway, ctx.config.rutaOpaca);
    await c.entrar("ana", ctx.config.claveDemo);
    const r = await fetch(ctx.urls.gateway + ctx.config.rutaOpaca, { method: "POST", body: c.cuerpoEntrada });
    assert.equal(r.status, 400);
    assert.equal(r.headers.get("set-cookie"), null);
  });
  it("una entrada sin cifrar se rechaza", async () => {
    const r = await fetch(ctx.urls.gateway + ctx.config.rutaOpaca, { method: "POST", body: JSON.stringify({ u: "ana", p: ctx.config.claveDemo }) });
    assert.equal(r.status, 400);
  });
  it("la cookie es HttpOnly y SameSite, y el token no sale en el JSON", async () => {
    const c = new ClienteGateway(ctx.urls.gateway, ctx.config.rutaOpaca);
    const r = await c.entrar("ana", ctx.config.claveDemo);
    assert.match(c.setCookie, /HttpOnly/);
    assert.match(c.setCookie, /SameSite=Strict/);
    assert.ok(!JSON.stringify(r.json).includes(c.cookie.split("=")[1]));
  });
  it("sin cookie: 401", async () => {
    const c = await entrar();
    const r = await c.enviar(c.sellar("k4").cuerpo, { cookie: "" });
    assert.equal(r.status, 401);
  });
  it("clave incorrecta: 401 sin decir cuál dato falló", async () => {
    const r = await new ClienteGateway(ctx.urls.gateway, ctx.config.rutaOpaca).entrar("ana", "mala");
    assert.equal(r.status, 401);
    assert.deepEqual(Object.keys(r.json).sort(), ["error", "ref"]);
  });
  it("un bit manipulado: rechazo y no llega al backend", async () => {
    const c = await entrar();
    const s = JSON.parse(c.sellar("q2", { id: "F-2001" }).cuerpo);
    const b = Buffer.from(s.c, "base64url"); b[2] ^= 1;
    const r = await c.enviar(JSON.stringify({ ...s, c: b.toString("base64url") }));
    assert.equal(r.status, 400);
    assert.match(motivo(r), /GCM/);
    assert.equal(ctx.tiendaInterna.datos.pagos.length, 0);
  });
  it("sobre de otra sesión: rechazo", async () => {
    const ana = await entrar();
    const beto = await entrar("beto");
    const r = await beto.enviar(ana.sellar("k4").cuerpo);
    assert.equal(r.status, 400);
  });
  it("repetida: un solo pago", async () => {
    const c = await entrar();
    const { cuerpo } = c.sellar("q2", { id: "F-2001" });
    assert.equal((await c.enviar(cuerpo)).status, 200);
    const r = await c.enviar(cuerpo);
    assert.equal(r.status, 400);
    assert.match(motivo(r), /nonce/);
    assert.equal(ctx.tiendaInterna.datos.pagos.length, 1);
  });
  it("vencida o del futuro: rechazo", async () => {
    const c = await entrar();
    for (const d of [-300_000, 300_000]) {
      const r = await c.enviar(c.sellar("k4", {}, { t: Date.now() + d }).cuerpo);
      assert.equal(r.status, 400);
      assert.match(motivo(r), /ventana/);
    }
  });
  it("factura ajena: 403 aunque el cifrado sea correcto", async () => {
    const r = await (await entrar()).llamar("m9", { id: "F-2003" });
    assert.equal(r.status, 403);
  });
  it("rol sin permiso: 403; admin sí puede", async () => {
    assert.equal((await (await entrar()).llamar("z7")).status, 403);
    const r = await (await entrar("caja")).llamar("z7");
    assert.equal(r.status, 200);
    assert.ok(!("margen_promedio_pct" in r.datos));
  });
  it("campo de más y operación desconocida: rechazo", async () => {
    const c = await entrar();
    assert.equal((await c.llamar("q2", { id: "F-2001", monto: 0.01 })).status, 400);
    assert.equal((await c.llamar("__proto__")).status, 400);
    assert.equal((await c.llamar("xx")).status, 400);
    assert.equal(ctx.tiendaInterna.datos.pagos.length, 0);
  });
  it("el monto sale de la base, no del cliente", async () => {
    const r = await (await entrar()).llamar("q2", { id: "F-2001" });
    assert.equal(r.datos.pago.monto, 120.5);
  });
  it("cuerpo gigante: 413", async () => {
    const c = await entrar();
    assert.equal((await c.enviar("x".repeat(ctx.config.cuerpoMaxBytes + 1))).status, 413);
  });
  it("límite por sesión: 429", async () => {
    const c = await entrar();
    const estados = [];
    for (let i = 0; i < 25; i++) estados.push((await c.enviar(c.sellar("k4").cuerpo)).status);
    assert.equal(estados.filter((s) => s === 200).length, 20);
    assert.equal(estados.filter((s) => s === 429).length, 5);
  });
  it("límite de inicios de sesión: 429", async () => {
    const original = ctx.config.limites.entrada;
    ctx.config.limites.entrada = 0;
    const r = await new ClienteGateway(ctx.urls.gateway, ctx.config.rutaOpaca).entrar("ana", ctx.config.claveDemo);
    ctx.config.limites.entrada = original;
    assert.equal(r.status, 429);
  });
  it("ruta dinámica: la vieja y la ajena dan 404, la vigente sirve", async () => {
    const c = await entrar();
    const otro = await entrar("beto");
    assert.equal((await c.enviar(c.sellar("k4").cuerpo, { ruta: otro.ruta })).status, 404);
    const vieja = c.ruta;
    ctx.politicas.saltoRuta += 2;
    assert.equal((await c.enviar(c.sellar("k4").cuerpo, { ruta: vieja })).status, 404);
    assert.equal(await c.renovar(), 200);
    assert.equal((await c.llamar("k4")).status, 200);
  });
  it("renovar la ruta exige sesión", async () => {
    const c = await entrar();
    c.cookie = "sid=falsa";
    assert.equal(await c.renovar(), 401);
  });
  it("ruta dinámica: acepta la ventana anterior y la respuesta entrega la vigente", async () => {
    const c = await entrar();
    const vieja = c.ruta;
    ctx.politicas.saltoRuta += 1;
    const r = await c.llamar("k4");
    assert.equal(r.status, 200);
    assert.notEqual(c.ruta, vieja);
  });
  it("el backend sin secreto interno no atiende", async () => {
    const r = await fetch(ctx.urls.backend + "/interno/v1/admin/ventas");
    assert.equal(r.status, 403);
  });
  it("el gateway no cuenta su tecnología", async () => {
    const c = await entrar();
    const r = await fetch(ctx.urls.gateway + c.ruta, { method: "POST", headers: { Cookie: c.cookie }, body: c.sellar("k4").cuerpo });
    for (const h of ["x-powered-by", "server", "x-backend"]) assert.equal(r.headers.get(h), null);
  });
  it("el registro no guarda contenido, token ni clave", async () => {
    const c = await entrar();
    await c.llamar("q2", { id: "F-2001" });
    await c.llamar("m9", { id: "F-2003" });
    const texto = JSON.stringify(ctx.registro.ver());
    assert.ok(!texto.includes(c.cookie.split("=")[1]));
    assert.ok(!texto.includes(c.clave.toString("base64url")));
    assert.ok(!texto.includes("120.5"));
    assert.ok(!texto.includes("F-2003"));
  });
  it("todo rechazo trae referencia que existe en el registro", async () => {
    const r = await (await entrar()).llamar("m9", { id: "F-9999" });
    assert.equal(r.status, 404);
    assert.ok(ctx.registro.porRef(r.json.ref));
  });
});

describe("api directa: lo que queda expuesto", () => {
  it("regala tecnología y campos internos", async () => {
    const t = (await (await fetch(ctx.urls.directo + "/api/v1/auth/login", { method: "POST", body: JSON.stringify({ usuario: "ana", clave: ctx.config.claveDemo }) })).json()).token;
    const r = await fetch(ctx.urls.directo + "/api/v1/clientes/1042/facturas", { headers: { Authorization: "Bearer " + t } });
    assert.equal(r.headers.get("x-powered-by"), "DemoFramework/1.0");
    assert.ok("costo_interno" in (await r.json()).facturas[0]);
  });
});

describe("escenarios del panel", () => {
  const esperado = {
    manipulada: ["paso", 200, "bloqueado", 400], repetida: ["paso", 200, "bloqueado", 400], vencida: ["paso", 200, "bloqueado", 400],
    "sin-permiso": ["paso", 200, "bloqueado", 403], admin: ["paso", 200, "bloqueado", 403], "campo-extra": ["paso", 200, "bloqueado", 400],
    "ruta-dinamica": ["paso", 200, "bloqueado", 404], error: ["paso", 500, "bloqueado", 404],
    caida: ["normal", 200, "costo", 503], version: ["costo", 410, "ok", 200],
  };
  for (const [id, [vd, sd, vg, sg]] of Object.entries(esperado)) {
    it(id, async () => {
      const r = await correrEscenario(ctx, id);
      assert.deepEqual([r.directo.veredicto, r.directo.status, r.gateway.veredicto, r.gateway.status], [vd, sd, vg, sg]);
    });
  }
  it("solo-ofuscar: sin autorización los datos salen, y la política vuelve a encenderse", async () => {
    const r = await correrEscenario(ctx, "solo-ofuscar");
    assert.equal(r.directo.status, 403);
    assert.equal(r.gateway.status, 200);
    assert.match(r.gateway.respuesta, /F-2003/);
    assert.equal(ctx.politicas.autorizacion, true);
  });
  it("todos corren sin error", async () => {
    for (const e of ESCENARIOS) assert.ok(await correrEscenario(ctx, e.id), e.id);
  });
});

describe("panel", () => {
  it("rechaza otro Host y otro origen", async () => {
    const r = await fetch(ctx.urls.panel + "/api/reiniciar", { method: "POST", headers: { Origin: "https://otro.example" } });
    assert.equal(r.status, 403);
  });
  it("sirve y corre un escenario", async () => {
    assert.equal((await fetch(ctx.urls.panel + "/")).status, 200);
    const r = await fetch(ctx.urls.panel + "/api/escenario/repetida", { method: "POST" });
    assert.equal((await r.json()).gateway.status, 400);
  });
});

describe("auditoría OWASP", () => {
  it("el después pasa todo, el antes no, y no expone la clave", async () => {
    const r = await correrAuditoria(ctx);
    const texto = JSON.stringify(r);
    assert.ok(!texto.includes(ctx.config.claveDemo));
    assert.equal(r.puntaje.despues, r.puntaje.total, JSON.stringify(r.controles.filter((c) => c.despues.ok === false)));
    assert.ok(r.puntaje.antes < r.puntaje.total / 2);
  });
  it("el panel entrega la auditoría control por control", async () => {
    const r = await fetch(ctx.urls.panel + "/api/auditoria", { method: "POST" });
    const lineas = (await r.text()).trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(lineas.filter((l) => l.control).length, 14);
    assert.deepEqual(lineas.filter((l) => l.control).map((l) => l.n), Array.from({ length: 14 }, (_, i) => i + 1));
    assert.equal(lineas.at(-1).fin, true);
  });
  it("bloquea tras cinco fallos y el acierto de otro usuario sigue entrando", async () => {
    const victima = "bloqueo-prueba";
    const estados = [];
    for (let i = 0; i < 6; i++) estados.push((await new ClienteGateway(ctx.urls.gateway, ctx.config.rutaOpaca).entrar(victima, "mal")).status);
    assert.deepEqual(estados, [401, 401, 401, 401, 401, 429]);
    assert.equal((await new ClienteGateway(ctx.urls.gateway, ctx.config.rutaOpaca).entrar("ana", ctx.config.claveDemo)).status, 200);
  });
  it("cerrar sesión deja inútil la cookie", async () => {
    const c = await entrar();
    await c.llamar("x1");
    assert.equal((await c.llamar("k4")).status, 401);
  });
});
