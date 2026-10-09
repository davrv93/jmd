//! `jmd mcp serve`: el LMS como servidor MCP por stdio, para Claude Code y OpenCode.
//!
//! Usa la cuenta de `jmd login`, así el agente puede leer tus cursos, sesiones, tareas y notas, y
//! publicar preguntas, sin que el LMS tenga aún su propio `/mcp`. JSON-RPC por líneas, protocolo
//! 2025-06-18 (lo que `mcp.rs` sabe hablar como cliente).

use crate::lms::Lms;
use anyhow::Result;
use serde_json::{json, Value};
use std::io::{BufRead, Write};

const PROTOCOL: &str = "2025-06-18";

pub fn tools() -> Vec<Value> {
    let obj = |props: Value, required: &[&str]| json!({"type": "object", "properties": props, "required": required});
    vec![
        json!({"name": "lms_whoami", "description": "Quién soy en el LMS: roles y cohortes.", "inputSchema": obj(json!({}), &[])}),
        json!({"name": "lms_courses", "description": "Mis cursos (id, título, rol).", "inputSchema": obj(json!({}), &[])}),
        json!({"name": "lms_course", "description": "Temario de un curso: módulos y sesiones con sus ids.",
            "inputSchema": obj(json!({"id": {"type": "string"}}), &["id"])}),
        json!({"name": "lms_lesson", "description": "Una sesión: objetivos, grabación, repositorio, materiales, tareas y contenido.",
            "inputSchema": obj(json!({"id": {"type": "string"}}), &["id"])}),
        json!({"name": "lms_assignments", "description": "Tareas de un curso (o de todos) con fecha y estado.",
            "inputSchema": obj(json!({"course": {"type": "string"}}), &[])}),
        json!({"name": "lms_assignment", "description": "El enunciado completo de una tarea, su rúbrica y mis entregas.",
            "inputSchema": obj(json!({"id": {"type": "string"}}), &["id"])}),
        json!({"name": "lms_grades", "description": "Mis notas (de un curso o de todos).",
            "inputSchema": obj(json!({"course": {"type": "string"}}), &[])}),
        json!({"name": "lms_ask", "description": "Publica una pregunta en una sesión; opcionalmente cita un archivo y línea.",
            "inputSchema": obj(json!({"lesson": {"type": "string"}, "body_md": {"type": "string"},
                "path": {"type": "string"}, "line": {"type": "integer"}}), &["lesson", "body_md"])}),
    ]
}

async fn call(l: &Lms, name: &str, a: &Value) -> Result<Value> {
    let id = a["id"].as_str().unwrap_or("");
    let course = a["course"].as_str();
    Ok(match name {
        "lms_whoami" => l.get("/me").await?,
        "lms_courses" => l.get("/courses").await?,
        "lms_course" => l.get(&format!("/courses/{id}")).await?,
        "lms_lesson" => {
            let mut v = l.get(&format!("/lessons/{id}")).await?;
            // El HTML entero no le sirve al modelo.
            if let Some(o) = v.as_object_mut() {
                o.remove("content_html");
            }
            v
        }
        "lms_assignments" | "lms_grades" => {
            let path = if name == "lms_grades" { "grades" } else { "assignments" };
            let ids: Vec<String> = match course {
                Some(c) => vec![c.to_string()],
                None => l.get("/courses").await?.as_array().into_iter().flatten()
                    .filter_map(|c| c["id"].as_str().map(String::from)).collect(),
            };
            let mut all = vec![];
            for c in ids {
                let v = l.get(&format!("/{path}?course={c}")).await?;
                all.extend(v.as_array().cloned().unwrap_or_default());
            }
            json!(all)
        }
        "lms_assignment" => l.get(&format!("/assignments/{id}")).await?,
        "lms_ask" => {
            let lesson = a["lesson"].as_str().unwrap_or("");
            let mut body = json!({"body_md": a["body_md"].as_str().unwrap_or("")});
            if let (Some(p), Some(n)) = (a["path"].as_str(), a["line"].as_u64()) {
                body["code_ref"] = json!({"path": p, "line": n});
            }
            l.post(&format!("/lessons/{lesson}/questions"), &body).await?
        }
        _ => anyhow::bail!("herramienta desconocida: {name}"),
    })
}

fn reply(id: &Value, result: Value) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "result": result})
}

fn rpc_error(id: &Value, code: i64, msg: &str) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": msg}})
}

/// Atiende una petición. Devuelve `None` para las notificaciones.
pub async fn handle(lms: &mut Option<Lms>, msg: &Value) -> Option<Value> {
    let method = msg["method"].as_str().unwrap_or("");
    // Sin id es una notificación (notifications/initialized…): no se contesta.
    let id = msg.get("id").cloned()?;
    Some(match method {
        "initialize" => reply(&id, json!({"protocolVersion": PROTOCOL, "capabilities": {"tools": {}},
            "serverInfo": {"name": "jmd-lms", "version": env!("CARGO_PKG_VERSION")}})),
        "ping" => reply(&id, json!({})),
        "tools/list" => reply(&id, json!({"tools": tools()})),
        "tools/call" => {
            let name = msg["params"]["name"].as_str().unwrap_or("");
            let args = msg["params"]["arguments"].clone();
            if lms.is_none() {
                match Lms::connect().await {
                    Ok(l) => *lms = Some(l),
                    Err(e) => return Some(reply(&id, json!({"content": [{"type": "text", "text": format!("{e:#}")}], "isError": true}))),
                }
            }
            match call(lms.as_ref().unwrap(), name, &args).await {
                Ok(v) => reply(&id, json!({"content": [{"type": "text", "text": serde_json::to_string_pretty(&v).unwrap_or_default()}]})),
                Err(e) => reply(&id, json!({"content": [{"type": "text", "text": format!("{e:#}")}], "isError": true})),
            }
        }
        _ => rpc_error(&id, -32601, &format!("método no soportado: {method}")),
    })
}

pub async fn serve() -> Result<()> {
    let stdin = std::io::stdin();
    let mut stdout = std::io::stdout();
    let mut lms: Option<Lms> = None;
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let msg: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(e) => {
                let r = rpc_error(&Value::Null, -32700, &format!("JSON inválido: {e}"));
                writeln!(stdout, "{r}")?;
                stdout.flush()?;
                continue;
            }
        };
        if let Some(r) = handle(&mut lms, &msg).await {
            writeln!(stdout, "{r}")?;
            stdout.flush()?;
        }
    }
    Ok(())
}
