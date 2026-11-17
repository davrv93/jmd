package httpapi

// arenaInstalador se corre en el aula de cada defensor (sh, con /trabajo/monito/.instalar.sh). Deja:
//
//	/trabajo/monito/servidor.js     la tiendita (Bun, 127.0.0.1:7070; GET /salud dice si está sana)
//	/trabajo/monito/crear-base.js   crea tienda.db con 12 productos
//	/trabajo/monito/tienda.db       la base viva
//	/trabajo/monito/respaldo/       copia de tienda.db (el monito nunca la toca)
//	/trabajo/.agents/skills/monito-server/SKILL.md   la receta para DeepSeek Harness
//
// Reinstalar no borra la base si existe; sí quita lo que dejó el monito (relleno de /tmp y lento.flag).
// Termina imprimiendo LAB_OK si la app contesta en /salud.
const arenaInstalador = `set -e
cd /trabajo/monito
mkdir -p config/sesiones respaldo /trabajo/.agents/skills/monito-server

cat > servidor.js <<'FIN_SERVIDOR'
// Tienda del monito: el servidor que tu equipo debe mantener en pie (Laboratorio de caos, JMD Learning).
// Escucha en 127.0.0.1:7070. GET /salud responde 200 si todo está bien y 503 con la lista de fallas.
import { Database } from "bun:sqlite";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";

const DIR = "/trabajo/monito";
const BASE = DIR + "/tienda.db";
const LENTO = DIR + "/config/lento.flag";
const ADMIN = DIR + "/config/admin.json";
const SESIONES = DIR + "/config/sesiones";
const PUBLICO = DIR + "/publico";
const DEBILES = ["123456", "12345678", "123456789", "admin", "password", "monito", "qwerty", "111111", "abc123"];

function sh(cmd) { return Bun.spawnSync(["sh", "-c", cmd]).stdout.toString().trim(); }
// El disco de la tienda es un cupo de 64 MB sobre lo que dicen pesar los archivos de /tmp (ls -la), no el espacio real (df).
const CUPO_MB = 64;
function pesoDe(dir, nivel) {
  let b = 0;
  for (const n of lista(dir)) {
    try { const s = lstatSync(dir + "/" + n); if (s.isDirectory()) { if (nivel < 4) b += pesoDe(dir + "/" + n, nivel + 1); } else if (s.isFile()) b += s.size; } catch {}
  }
  return b;
}
function libreMB() { return CUPO_MB - Math.floor(pesoDe("/tmp", 0) / 1048576); }
function conBase(f) { const db = new Database(BASE, { readonly: true }); try { return f(db); } finally { db.close(); } }
function productos() { return conBase((db) => db.query("select nombre, precio, stock from productos order by nombre").all()); }
function lista(dir) { try { return readdirSync(dir); } catch { return []; } }

function fallas() {
  const f = [];
  if (!existsSync(BASE)) f.push("base");
  else {
    try {
      if (productos().length === 0) f.push("base");
      const malas = conBase((db) => db.query("select count(*) n from productos where precio <= 0 or stock < 0 or trim(nombre) = ''").get().n);
      if (malas > 0) f.push("datos");
    } catch { f.push("base"); }
  }
  if (libreMB() < 8) f.push("disco");
  try {
    const c = String(JSON.parse(readFileSync(ADMIN, "utf8")).clave || "");
    if (c.length < 10 || DEBILES.includes(c.toLowerCase())) f.push("clave");
  } catch { f.push("clave"); }
  if (lista(SESIONES).some((n) => { try { return /nunca/.test(readFileSync(SESIONES + "/" + n, "utf8")); } catch { return false; } })) f.push("sesion");
  if (lista(PUBLICO).length > 0) f.push("fuga");
  if (Number(sh("pgrep -f '[m]onito-clon' | wc -l")) >= 2) f.push("clones");
  return f;
}

Bun.serve({
  hostname: "127.0.0.1",
  port: 7070,
  async fetch(req) {
    const url = new URL(req.url);
    if (existsSync(LENTO)) await Bun.sleep(6000); // alguien dejó la app atascada
    if (url.pathname === "/salud") {
      const f = fallas();
      return Response.json({ ok: f.length === 0, fallas: f, libre_mb: libreMB() }, { status: f.length ? 503 : 200 });
    }
    if (url.pathname.startsWith("/publico/")) { // lo que esté aquí lo ve cualquiera
      const nombre = url.pathname.slice("/publico/".length).replace(/[^\w.-]/g, "");
      if (nombre && existsSync(PUBLICO + "/" + nombre)) return new Response(Bun.file(PUBLICO + "/" + nombre));
      return new Response("no existe", { status: 404 });
    }
    try {
      const filas = productos().map((p) => "<li>" + p.nombre + " · S/ " + p.precio.toFixed(2) + " · stock " + p.stock + "</li>").join("");
      return new Response("<h1>Tienda del monito</h1><ul>" + filas + "</ul>", { headers: { "content-type": "text/html; charset=utf-8" } });
    } catch {
      return new Response("La tienda no encuentra su base de datos", { status: 503 });
    }
  },
});
console.log("tienda del monito en http://127.0.0.1:7070 (" + new Date().toISOString() + ")");
FIN_SERVIDOR

cat > crear-base.js <<'FIN_BASE'
// Crea /trabajo/monito/tienda.db con 12 productos. Uso: bun crear-base.js
import { Database } from "bun:sqlite";
const db = new Database("/trabajo/monito/tienda.db");
db.run("create table if not exists productos (id integer primary key, nombre text not null, precio real not null, stock integer not null)");
const filas = [["Plátano de seda", 0.5, 120], ["Mango ciruelo", 1.2, 60], ["Coco helado", 3.5, 25], ["Papaya", 4.0, 18],
  ["Maracuyá", 0.8, 90], ["Piña golden", 5.5, 15], ["Lúcuma", 2.2, 40], ["Chirimoya", 6.0, 12],
  ["Granadilla", 0.9, 75], ["Aguaymanto (bolsa)", 3.0, 30], ["Camu camu (bolsa)", 7.5, 10], ["Banano orgánico", 0.6, 100]];
if (db.query("select count(*) n from productos").get().n === 0) {
  const ins = db.prepare("insert into productos (nombre, precio, stock) values (?, ?, ?)");
  for (const f of filas) ins.run(...f);
}
db.close();
console.log("base lista");
FIN_BASE

cat > LEEME.md <<'FIN_LEEME'
# Servidor del monito

Tu equipo (Monito Server) debe mantener esta tienda en pie mientras el equipo Monito Tumba Server la ataca.

- App: servidor.js con Bun en http://127.0.0.1:7070 · salud: curl -s http://127.0.0.1:7070/salud
- Base: tienda.db (SQLite) · respaldo: respaldo/tienda.db (no lo borres)
- Arrancar o reiniciar: sh /trabajo/monito/arrancar.sh

Pídele a DeepSeek Harness: «Usa la skill monito-server y cura mi servidor».
FIN_LEEME

cat > arrancar.sh <<'FIN_ARRANCAR'
#!/bin/sh
# Arranca (o reinicia) la tienda del monito. Va en un archivo para que pkill no se mate a sí mismo:
# la línea de comando de quien lo llama no contiene la ruta de la app.
pkill -f "[m]onito/servidor.js"
cd /trabajo/monito && (nohup bun /trabajo/monito/servidor.js >> servidor.log 2>&1 &)
sleep 1
pgrep -f "[m]onito/servidor.js" >/dev/null && echo OK || echo FALLO
FIN_ARRANCAR

cat > /trabajo/.agents/skills/monito-server/SKILL.md <<'FIN_SKILL'
---
name: monito-server
description: "Cura el servidor de práctica del Laboratorio de caos (Suelta al monito) en /trabajo/monito cuando el equipo Monito Tumba Server lo ataca: app apagada, disco lleno, base de datos borrada o app atascada. Úsala cuando pidan revisar, curar, levantar, defender o reparar el servidor, la tienda, la base o el puerto 7070."
---

# Curar el servidor del monito

Eres del equipo Monito Server. Tu servidor es una tienda en Bun con SQLite. Trabaja rápido, en español y corto: diagnostica, arregla y comprueba.

## Cómo es el servidor

- App: /trabajo/monito/servidor.js, escucha en 127.0.0.1:7070. Salud: curl -s -m 3 http://127.0.0.1:7070/salud (200 = sana; 503 trae la lista de fallas).
- Base: /trabajo/monito/tienda.db. Respaldo: /trabajo/monito/respaldo/tienda.db. Nunca borres ni modifiques el respaldo.
- Disco: la tienda tiene un cupo de 64 MB en /tmp y necesita al menos 8 libres. Es un cupo de la tienda, no del sistema: df no lo muestra. /salud lo dice en libre_mb y ls -la muestra cuánto pesa cada archivo.

## 1. Diagnóstico (siempre primero, en un solo comando)

cd /trabajo/monito; pgrep -f "[m]onito/servidor.js" || echo APP_APAGADA; curl -s -m 3 http://127.0.0.1:7070/salud; echo; ls -la . config; ls -laS /tmp /tmp/*/ 2>/dev/null | head -30

## 2. Recetas

- App apagada (no hay proceso): sh /trabajo/monito/arrancar.sh (imprime OK si quedó corriendo).
- Disco lleno (libre_mb menor que 8 en /salud): mira qué archivos pesan más con ls -laS /tmp /tmp/*/ 2>/dev/null | head -30 (du y df no sirven aquí: mira el tamaño que muestra ls) y borra solo lo que sea basura del ataque. No borres nada fuera de /tmp.
- Base borrada o vacía: cp /trabajo/monito/respaldo/tienda.db /trabajo/monito/tienda.db. Si el respaldo no existe: cd /trabajo/monito && bun crear-base.js.
- App atascada (curl tarda más de 3 s o hace timeout): revisa /trabajo/monito/config/; si hay un archivo raro como lento.flag, bórralo. No hace falta reiniciar.

## Fallas sin receta

El equipo Tumba Server tiene ataques que no están aquí. Si /salud trae una falla que no reconoces (por ejemplo datos, clave, sesion, fuga o clones), investiga la causa antes de tocar nada: revisa los procesos (ps -ef), config/ (admin.json y sesiones/), publico/, /tmp y la base (con bun y bun:sqlite). Corrige la causa, no el síntoma, y explica en una línea qué encontraste.

## 3. Comprobación (obligatoria)

curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:7070/salud debe dar 200. Si no, vuelve al paso 1.

## Reglas

- Solo toca /trabajo/monito y los archivos de relleno de /tmp.
- No reinstales Bun ni cambies servidor.js ni arrancar.sh.
- Responde en 3 líneas como máximo: qué estaba roto, qué hiciste y el código de /salud.
FIN_SKILL

# Reinstalar no cura ataques: solo repone lo que falte y reinicia la app.
[ -f config/admin.json ] || echo "{\"usuario\":\"admin\",\"clave\":\"$(head -c 18 /dev/urandom | base64 | tr -d '/+=')\"}" > config/admin.json
# La base solo nace en la primera instalación: si ya hay respaldo, restaurarla es parte del reto.
[ -s tienda.db ] || [ -s respaldo/tienda.db ] || bun crear-base.js >/dev/null
[ -s respaldo/tienda.db ] || cp tienda.db respaldo/tienda.db
# Listo = la app corre (aunque esté enferma: curarla es el juego).
for i in 1 2 3; do
  [ "$(sh arrancar.sh 2>/dev/null)" = "OK" ] && { echo LAB_OK; exit 0; }
  sleep 1
done
echo LAB_FALLO
`
