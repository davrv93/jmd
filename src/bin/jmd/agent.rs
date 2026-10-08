//! El agente del chat de `jmd`: lista de tareas (como OpenCode) y herramientas MCP.
//!
//! - **Tareas**: el modelo tiene la herramienta `todo_write` y la usa en tareas de varios pasos.
//!   Cada vez que cambia la lista, `jmd` dibuja el panel. `/todos` la vuelve a mostrar.
//! - **MCP**: al entrar al chat se conectan en segundo plano los servidores configurados (ver
//!   `mcp.rs`). Sus herramientas se ofrecen al modelo como `mcp__servidor__herramienta`, y
//!   cada uso pide confirmación salvo con `/auto` (o «a» = siempre para ese servidor).

use crate::client::{ChatMeta, Client, ToolCall};
use crate::mcp::{self, Server, Session, Tool};
use crate::out::{bold, cyan, dim, green, red, yellow};
use anyhow::Result;
use serde_json::{json, Value};
use std::collections::HashSet;
use std::io::{BufRead, IsTerminal, Write};
use std::sync::Arc;
use tokio::sync::Mutex;

pub const SYSTEM: &str = "Eres el asistente de la terminal jmd. Responde en el idioma del usuario.\n\
Para tareas de tres o más pasos, planifica con la herramienta todo_write: escribe la lista completa, \
marca una sola tarea como in_progress al empezarla y como completed al terminarla, y actualiza la \
lista en cuanto cambie el plan. Para preguntas o tareas simples, no la uses.\n\
Si hay herramientas mcp__*, úsalas cuando aporten datos reales en vez de suponer.";

// ---------------------------------------------------------------------------
// Tareas
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq)]
pub struct Todo {
    pub content: String,
    pub status: String,
}

pub fn todo_tool() -> Value {
    json!({"type": "function", "function": {
        "name": "todo_write",
        "description": "Crea o actualiza la lista de tareas de la sesión (reemplaza la lista entera). Úsala para \
            tareas de varios pasos: una sola en in_progress a la vez; marca completed en cuanto termines cada una.",
        "parameters": {"type": "object", "properties": {"todos": {"type": "array", "items": {"type": "object",
            "properties": {
                "content": {"type": "string", "description": "La tarea, en imperativo y breve"},
                "status": {"type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"]},
            }, "required": ["content", "status"]}}}, "required": ["todos"]},
    }})
}

pub fn parse_todos(args: &Value) -> Result<Vec<Todo>, String> {
    let list = args["todos"].as_array().ok_or("falta «todos» (una lista)")?;
    list.iter().map(|t| {
        let content = t["content"].as_str().filter(|c| !c.trim().is_empty()).ok_or("cada tarea necesita «content»")?;
        let status = t["status"].as_str().unwrap_or("pending");
        let status = match status {
            "pending" | "in_progress" | "completed" | "cancelled" => status,
            "done" | "complete" => "completed",
            "doing" | "active" => "in_progress",
            _ => "pending",
        };
        Ok(Todo { content: content.trim().to_string(), status: status.to_string() })
    }).collect()
}

pub fn render_todos(todos: &[Todo]) -> String {
    if todos.is_empty() {
        return dim("(sin tareas)");
    }
    let done = todos.iter().filter(|t| t.status == "completed").count();
    let mut out = format!("{} {}\n", dim("┌"), bold(&format!("Tareas {done}/{}", todos.len())));
    for t in todos {
        let line = match t.status.as_str() {
            "completed" => format!("{} {}", green("✓"), dim(&t.content)),
            "in_progress" => format!("{} {}", yellow("▶"), bold(&t.content)),
            "cancelled" => format!("{} {}", dim("✗"), dim(&t.content)),
            _ => format!("{} {}", dim("○"), t.content),
        };
        out.push_str(&format!("{} {line}\n", dim("│")));
    }
    out.push_str(&dim("└"));
    out
}

// ---------------------------------------------------------------------------
// MCP en segundo plano
// ---------------------------------------------------------------------------

pub enum McpState {
    Connecting,
    Ready { session: Box<Session>, tools: Vec<Tool> },
    Failed(String),
    Disabled,
}

pub struct McpServer {
    pub server: Server,
    pub state: McpState,
}

pub type McpPool = Arc<Mutex<Vec<McpServer>>>;

/// Conecta todos los servidores habilitados en segundo plano; el chat no espera.
pub fn start_mcp(servers: Vec<Server>) -> McpPool {
    let pool: McpPool = Arc::new(Mutex::new(servers.iter().map(|s| McpServer {
        server: s.clone(),
        state: if s.enabled { McpState::Connecting } else { McpState::Disabled },
    }).collect()));
    for (i, s) in servers.into_iter().enumerate().filter(|(_, s)| s.enabled) {
        let pool = pool.clone();
        tokio::spawn(async move {
            let fut = async {
                let mut session = Session::connect(&s).await?;
                let tools = session.list_tools().await?;
                Ok::<_, anyhow::Error>((session, tools))
            };
            let state = match tokio::time::timeout(std::time::Duration::from_secs(45), fut).await {
                Ok(Ok((session, tools))) => McpState::Ready { session: Box::new(session), tools },
                Ok(Err(e)) => McpState::Failed(format!("{e:#}")),
                Err(_) => McpState::Failed("no respondió en 45 s".into()),
            };
            pool.lock().await[i].state = state;
        });
    }
    pool
}

pub async fn mcp_summary(pool: &McpPool) -> String {
    let p = pool.lock().await;
    if p.is_empty() {
        return dim("MCP: ningún servidor configurado (jmd mcp add …, o los de Claude Code / OpenCode)");
    }
    let parts: Vec<String> = p.iter().map(|s| match &s.state {
        McpState::Ready { tools, .. } => format!("{} {} ({})", green("✓"), s.server.name, tools.len()),
        McpState::Connecting => format!("{} {}", dim("…"), s.server.name),
        McpState::Failed(_) => format!("{} {}", red("✗"), s.server.name),
        McpState::Disabled => dim(&format!("· {}", s.server.name)),
    }).collect();
    format!("MCP: {}", parts.join("  "))
}

pub async fn mcp_details(pool: &McpPool) -> String {
    let p = pool.lock().await;
    if p.is_empty() {
        return mcp_summary_static();
    }
    let mut out = String::new();
    for s in p.iter() {
        let state = match &s.state {
            McpState::Ready { tools, .. } => green(&format!("activo · {} herramientas", tools.len())),
            McpState::Connecting => dim("conectando…"),
            McpState::Failed(e) => red(&format!("error: {}", e.chars().take(120).collect::<String>())),
            McpState::Disabled => dim("desactivado"),
        };
        out.push_str(&format!("  {} {} {}  {}\n", cyan(&s.server.name), dim(&format!("[{} · {}]", s.server.kind(), s.server.source)), state,
            dim(&s.server.target().chars().take(60).collect::<String>())));
    }
    out
}

fn mcp_summary_static() -> String {
    dim("MCP: ningún servidor configurado (jmd mcp add …, o los de Claude Code / OpenCode)")
}

/// Definiciones de las herramientas MCP listas para ofrecer al modelo.
pub async fn mcp_tool_defs(pool: &McpPool) -> Vec<Value> {
    let p = pool.lock().await;
    let mut defs = vec![];
    for s in p.iter() {
        if let McpState::Ready { tools, .. } = &s.state {
            for t in tools {
                let desc: String = t.description.chars().take(1000).collect();
                defs.push(json!({"type": "function", "function": {
                    "name": mcp::function_name(&s.server.name, &t.name),
                    "description": format!("[MCP {}] {desc}", s.server.name),
                    "parameters": t.input_schema,
                }}));
            }
        }
    }
    defs
}

// ---------------------------------------------------------------------------
// El agente
// ---------------------------------------------------------------------------

pub struct Agent {
    pub todos: Vec<Todo>,
    pub mcp: Option<McpPool>,
    pub auto: bool,
    pub trusted: HashSet<String>,
    pub skills: Vec<crate::skills::Skill>,
    pub proto_dir: std::path::PathBuf,
}

impl Agent {
    pub fn new(mcp: Option<McpPool>) -> Self {
        let cwd = std::env::current_dir().unwrap_or_else(|_| ".".into());
        Self { todos: vec![], mcp, auto: false, trusted: HashSet::new(),
            skills: crate::skills::discover(&cwd), proto_dir: cwd.join("prototipos") }
    }

    pub fn system_prompt(&self) -> String {
        format!("{SYSTEM}{}", crate::skills::system_section(&self.skills))
    }

    pub async fn tool_defs(&self) -> Vec<Value> {
        let mut defs = vec![todo_tool()];
        defs.extend(crate::skills::tools());
        if let Some(p) = &self.mcp {
            defs.extend(mcp_tool_defs(p).await);
        }
        defs
    }

    fn confirm(&mut self, server: &str, call: &ToolCall) -> bool {
        if self.auto || self.trusted.contains(server) {
            return true;
        }
        if !std::io::stdin().is_terminal() {
            eprintln!("{} {} denegada: sin terminal para confirmar (usa /auto)", yellow("!"), call.name);
            return false;
        }
        let args: String = call.arguments.chars().take(300).collect();
        print!("{} {} {}\n  ¿Ejecutar? [s]í · [n]o · [a] siempre para «{server}»: ", yellow("?"), cyan(&call.name), dim(&args));
        let _ = std::io::stdout().flush();
        let mut s = String::new();
        let _ = std::io::stdin().lock().read_line(&mut s);
        match s.trim().to_lowercase().as_str() {
            "s" | "si" | "sí" | "y" | "yes" => true,
            "a" | "siempre" => {
                self.trusted.insert(server.to_string());
                true
            }
            _ => false,
        }
    }

    /// Ejecuta una llamada del modelo y devuelve el texto para el mensaje `tool`.
    pub async fn execute(&mut self, call: &ToolCall) -> String {
        let args: Value = serde_json::from_str(if call.arguments.trim().is_empty() { "{}" } else { &call.arguments })
            .unwrap_or_else(|_| json!({}));
        if call.name == "todo_write" {
            return match parse_todos(&args) {
                Ok(t) => {
                    self.todos = t;
                    println!("{}", render_todos(&self.todos));
                    let pending = self.todos.iter().filter(|t| t.status != "completed" && t.status != "cancelled").count();
                    format!("Lista actualizada: {} tareas, {} pendientes.", self.todos.len(), pending)
                }
                Err(e) => format!("Error: {e}"),
            };
        }
        if call.name == "load_skill" {
            let name = args["name"].as_str().unwrap_or("");
            return match self.skills.iter().find(|s| s.name == name) {
                Some(s) => {
                    println!("{} {}", dim("↳ skill"), cyan(&s.name));
                    s.body.clone()
                }
                None => format!("Error: no existe la skill «{name}». Disponibles: {}",
                    self.skills.iter().map(|s| s.name.as_str()).collect::<Vec<_>>().join(", ")),
            };
        }
        if call.name == "save_prototype" {
            let name = args["name"].as_str().unwrap_or("prototipo");
            let html = args["html"].as_str().unwrap_or("");
            return match crate::skills::save_prototype(&self.proto_dir, name, html, true) {
                Ok((path, existed)) => {
                    println!("{} {} {}", green("✓"), if existed { "prototipo actualizado:" } else { "prototipo guardado y abierto:" },
                        cyan(&path.display().to_string()));
                    format!("Guardado en {} ({} caracteres){}.", path.display(), html.len(),
                        if existed { "; ya estaba abierto: la persona debe recargar la pestaña" } else { "; abierto en el navegador" })
                }
                Err(e) => format!("Error: {e}"),
            };
        }
        let Some(pool) = self.mcp.clone() else { return format!("Error: herramienta desconocida {}", call.name) };
        // Buscar a qué servidor y herramienta corresponde el nombre.
        let target = {
            let p = pool.lock().await;
            p.iter().enumerate().find_map(|(i, s)| match &s.state {
                McpState::Ready { tools, .. } => tools.iter()
                    .find(|t| mcp::function_name(&s.server.name, &t.name) == call.name)
                    .map(|t| (i, s.server.name.clone(), t.name.clone())),
                _ => None,
            })
        };
        let Some((idx, server, tool)) = target else { return format!("Error: herramienta desconocida {}", call.name) };
        if !self.confirm(&server, call) {
            return "La persona no autorizó esta herramienta. Sigue sin ella o pregúntale.".into();
        }
        println!("{} {}", dim("↳ ejecutando"), cyan(&format!("{server}/{tool}")));
        let mut p = pool.lock().await;
        let McpState::Ready { session, .. } = &mut p[idx].state else { return "Error: el servidor MCP se desconectó".into() };
        match session.call_tool(&tool, args).await {
            Ok((text, is_error)) => {
                let text: String = text.chars().take(20_000).collect();
                if is_error { format!("Error de la herramienta: {text}") } else { text }
            }
            Err(e) => format!("Error: {e:#}"),
        }
    }
}

/// Un turno completo: el modelo responde y, mientras pida herramientas, se ejecutan y se le
/// devuelven los resultados (hasta 15 vueltas). Devuelve el último `ChatMeta`.
pub async fn run_turn(c: &Client, agent: &mut Agent, history: &mut Vec<Value>, model: &str, hints: &Value)
    -> Result<ChatMeta> {
    let tools = agent.tool_defs().await;
    let mut last = ChatMeta::default();
    for _ in 0..15 {
        let mut messages = vec![json!({"role": "system", "content": agent.system_prompt()})];
        messages.extend(history.iter().cloned());
        let body = json!({"model": model, "stream": true, "messages": messages, "tools": tools, "orchestrator": hints});
        let mut stdout = std::io::stdout();
        let meta = c.chat_stream(&body, |t| {
            let _ = write!(stdout, "{t}");
            let _ = stdout.flush();
        }).await?;
        if !meta.text.is_empty() {
            println!();
        }
        if meta.tool_calls.is_empty() {
            history.push(json!({"role": "assistant", "content": meta.text}));
            return Ok(meta);
        }
        let calls: Vec<ToolCall> = meta.tool_calls.iter().enumerate().map(|(i, tc)| ToolCall {
            id: if tc.id.is_empty() { format!("call_{i}_{}", uuid::Uuid::new_v4().simple()) } else { tc.id.clone() },
            name: tc.name.clone(),
            arguments: if tc.arguments.trim().is_empty() { "{}".into() } else { tc.arguments.clone() },
        }).collect();
        history.push(json!({
            "role": "assistant",
            "content": if meta.text.is_empty() { Value::Null } else { json!(meta.text) },
            "tool_calls": calls.iter().map(|c| json!({"id": c.id, "type": "function",
                "function": {"name": c.name, "arguments": c.arguments}})).collect::<Vec<_>>(),
        }));
        for call in &calls {
            let result = agent.execute(call).await;
            history.push(json!({"role": "tool", "tool_call_id": call.id, "content": result}));
        }
        last = meta;
    }
    eprintln!("{} se alcanzó el máximo de 15 vueltas de herramientas", yellow("!"));
    Ok(last)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_renders_todos() {
        let t = parse_todos(&json!({"todos": [
            {"content": "Revisar login", "status": "completed"},
            {"content": "Corregir token", "status": "in_progress"},
            {"content": "Añadir pruebas", "status": "pending"},
            {"content": "Otra", "status": "done"}]})).unwrap();
        assert_eq!(t[3].status, "completed");
        let r = render_todos(&t);
        assert!(r.contains("Tareas 2/4"));
        assert!(r.contains("▶") && r.contains("○") && r.contains("✓"));
        assert!(parse_todos(&json!({"todos": [{"status": "pending"}]})).is_err());
        assert!(parse_todos(&json!({})).is_err());
    }
}
