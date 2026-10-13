---
name: s3-postgres
description: Crea la base del chatbot de WhatsApp en el Postgres del alumno con Bun.sql. Esquema mínimo contactos, conversaciones (modo bot o humano) y mensajes (autor cliente, bot o humano; wa_id único para no duplicar reintentos del webhook), migración idempotente y funciones de acceso en db.ts. Palabras gatillo: postgres, base de datos, esquema, tablas, migración, Bun.sql, DATABASE_URL, psql, aula db, contactos, conversaciones, mensajes, duplicados.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · PostgreSQL con Bun.sql

## Cuándo usar

Antes de `s3-back-elysia`: el servidor importa `db.ts`. Tu base ya existe y su dirección está en `DATABASE_URL`. No instales nada: `Bun.sql` viene con Bun.

## Pasos

1. Comprueba la base: `psql "$DATABASE_URL" -tAc 'select 1'` imprime `1` (o abre una consola con `aula db`).
2. Archivo `/trabajo/chatbot/db.ts`:
   ```ts
   import { SQL } from "bun";
   export const sql = new SQL(process.env.DATABASE_URL ?? "", { max: 3 });   // tu rol admite 15 conexiones; por defecto abriría 10

   // Idempotente: correrla dos veces no rompe nada (IF NOT EXISTS).
   export async function migrar() {
     await sql.unsafe(`
       CREATE TABLE IF NOT EXISTS contactos (
         id serial PRIMARY KEY, jid text UNIQUE NOT NULL, nombre text NOT NULL DEFAULT '',
         creado timestamptz NOT NULL DEFAULT now());
       CREATE TABLE IF NOT EXISTS conversaciones (
         id serial PRIMARY KEY, contacto_id int UNIQUE NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
         modo text NOT NULL DEFAULT 'bot' CHECK (modo IN ('bot', 'humano')),
         no_leidos int NOT NULL DEFAULT 0, actualizado timestamptz NOT NULL DEFAULT now());
       CREATE TABLE IF NOT EXISTS mensajes (
         id serial PRIMARY KEY, conversacion_id int NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
         wa_id text UNIQUE, autor text NOT NULL CHECK (autor IN ('cliente', 'bot', 'humano')),
         texto text NOT NULL, estado text NOT NULL DEFAULT 'ok' CHECK (estado IN ('ok', 'error')),
         creado timestamptz NOT NULL DEFAULT now());
       CREATE INDEX IF NOT EXISTS mensajes_por_conversacion ON mensajes (conversacion_id, id);`);
   }

   // Mensaje del cliente. Devuelve null si ese wa_id ya estaba (Evolution reintenta el webhook).
   export async function guardarEntrante(jid: string, nombre: string, waId: string, texto: string) {
     const [c] = await sql`INSERT INTO contactos (jid, nombre) VALUES (${jid}, ${nombre})
       ON CONFLICT (jid) DO UPDATE SET nombre = CASE WHEN EXCLUDED.nombre <> '' THEN EXCLUDED.nombre ELSE contactos.nombre END
       RETURNING id`;
     const [v] = await sql`INSERT INTO conversaciones (contacto_id) VALUES (${c.id})
       ON CONFLICT (contacto_id) DO UPDATE SET actualizado = now() RETURNING id, modo`;
     const [m] = await sql`INSERT INTO mensajes (conversacion_id, wa_id, autor, texto)
       VALUES (${v.id}, ${waId}, 'cliente', ${texto}) ON CONFLICT (wa_id) DO NOTHING RETURNING id`;
     if (!m) return null;
     await sql`UPDATE conversaciones SET no_leidos = no_leidos + 1, actualizado = now() WHERE id = ${v.id}`;
     return { conversacion: v.id as number, modo: v.modo as string, mensaje: m.id as number };
   }

   export async function guardarSaliente(conversacion: number, autor: "bot" | "humano", texto: string, estado: "ok" | "error") {
     const [m] = await sql`INSERT INTO mensajes (conversacion_id, autor, texto, estado)
       VALUES (${conversacion}, ${autor}, ${texto}, ${estado}) RETURNING id, autor, texto, estado, creado`;
     await sql`UPDATE conversaciones SET actualizado = now() WHERE id = ${conversacion}`;
     return m;
   }

   export const listarConversaciones = () => sql`
     SELECT v.id, c.nombre, c.jid, v.modo, v.no_leidos, v.actualizado,
            (SELECT texto FROM mensajes m WHERE m.conversacion_id = v.id ORDER BY m.id DESC LIMIT 1) AS ultimo
     FROM conversaciones v JOIN contactos c ON c.id = v.contacto_id ORDER BY v.actualizado DESC LIMIT 50`;

   export async function listarMensajes(conversacion: number, desde = 0) {
     await sql`UPDATE conversaciones SET no_leidos = 0 WHERE id = ${conversacion}`;
     return await sql`SELECT id, autor, texto, estado, creado FROM mensajes
       WHERE conversacion_id = ${conversacion} AND id > ${desde} ORDER BY id LIMIT 200`;
   }

   export async function conversacion(id: number) {
     const [v] = await sql`SELECT v.id, v.modo, c.jid, c.nombre FROM conversaciones v
       JOIN contactos c ON c.id = v.contacto_id WHERE v.id = ${id}`;
     return v ?? null;
   }

   export async function cambiarModo(id: number, modo: "bot" | "humano") {
     const [v] = await sql`UPDATE conversaciones SET modo = ${modo} WHERE id = ${id} RETURNING id, modo`;
     return v ?? null;
   }

   // Últimos n mensajes en orden de llegada: el contexto para el modelo.
   export async function historial(conversacion: number, n = 8) {
     const filas = await sql`SELECT autor, texto FROM mensajes
       WHERE conversacion_id = ${conversacion} AND estado = 'ok' ORDER BY id DESC LIMIT ${n}`;
     return [...filas].reverse();
   }

   export async function botYaHablo(conversacion: number) {
     const [r] = await sql`SELECT count(*)::int AS n FROM mensajes WHERE conversacion_id = ${conversacion} AND autor = 'bot'`;
     return r.n > 0;
   }
   ```
3. Corre la migración dos veces (la segunda no debe fallar) y cuenta las tablas:
   ```sh
   cd /trabajo/chatbot && bun -e 'import {migrar,sql} from "./db"; await migrar(); await migrar(); await sql.close(); console.log("ok")'
   psql "$DATABASE_URL" -tAc "select count(*) from information_schema.tables where table_name in ('contactos','conversaciones','mensajes')"   # 3
   ```

## Ejemplo real

Un mensaje de WhatsApp trae `Info.ID` (por ejemplo `3EB0C1F2A9`). Si Evolution Go no recibe 200 a tiempo, reenvía el mismo JSON. Con `wa_id UNIQUE` y `ON CONFLICT DO NOTHING`, el segundo intento devuelve `null` y el bot NO responde dos veces.

## Errores típicos

- `password authentication failed` o `ECONNREFUSED`: estás usando otra URL. Usa solo `process.env.DATABASE_URL`; no la copies a un archivo.
- `too many connections`: falta `{ max: 3 }`, o quedaron procesos `bun` viejos (`sh chatbot.sh parar`). Tu rol admite 15.
- Concatenar texto en SQL (`"... WHERE id = " + id`): inyección. Usa siempre la plantilla `` sql`... ${valor}` ``.
- `sql.unsafe` solo para la migración (sin datos del usuario).
- El bot responde dos veces al mismo mensaje: falta `wa_id UNIQUE` o el `ON CONFLICT`.
- Quieres empezar de cero: `psql "$DATABASE_URL" -c 'DROP TABLE mensajes, conversaciones, contactos'` y reinicia (la migración las recrea). Pide confirmación antes.

## Versión corta para modelos pequeños

1. `db.ts` con `new SQL(process.env.DATABASE_URL, { max: 3 })` de `"bun"`.
2. Tres tablas: contactos (jid único), conversaciones (modo bot|humano), mensajes (wa_id único, autor cliente|bot|humano, estado ok|error).
3. `migrar()` usa `CREATE TABLE IF NOT EXISTS`.
4. Valores siempre con `` sql`... ${x}` ``, nunca concatenando.
5. Prueba: la consulta a `information_schema.tables` da `3`.
