//! MCP (Model Context Protocol): descubrir los servidores configurados y hablar con ellos.
//!
//! Fuentes, de más a menos prioritaria (el nombre repetido gana la primera):
//! 1. `jmd`: `~/.config/jmd/mcp.json` (o `JMD_MCP_CONFIG`), formato `{"mcpServers": {...}}`.
//! 2. Proyecto: `.mcp.json` del directorio actual (el de Claude Code).
//! 3. Claude Code: `~/.claude.json` (`mcpServers` global y el del proyecto actual).
//! 4. OpenCode: `opencode.json` del proyecto y `~/.config/opencode/opencode.json` (`mcp`).
//!
//! Transportes: stdio (JSON-RPC por líneas) y HTTP transmisible. El SSE antiguo no.

use anyhow::{anyhow, bail, Context, Result};
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

const PROTOCOL: &str = "2025-06-18";

#[derive(Debug, Clone, PartialEq)]
pub enum Transport {
    Stdio { command: String, args: Vec<String>, env: BTreeMap<String, String> },
    Http { url: String, headers: BTreeMap<String, String> },
    /// Transporte SSE antiguo: se lista, pero no se usa.
    Sse { url: String },
}

#[derive(Debug, Clone)]
pub struct Server {
    pub name: String,
    pub source: String,
    pub transport: Transport,
    pub enabled: bool,
}

impl Server {
    pub fn kind(&self) -> &'static str {
        match self.transport {
            Transport::Stdio { .. } => "stdio",
            Transport::Http { .. } => "http",
            Transport::Sse { .. } => "sse",
        }
    }

    pub fn target(&self) -> String {
        match &self.transport {
            Transport::Stdio { command, args, .. } => {
                let mut s = command.clone();
                for a in args {
                    s.push(' ');
                    s.push_str(a);
                }
                s
            }
            Transport::Http { url, .. } | Transport::Sse { url } => url.clone(),
        }
    }
}

// ---------------------------------------------------------------------------
// Descubrimiento
// ---------------------------------------------------------------------------

/// `${VAR}`, `${VAR:-por defecto}` (Claude Code) y `{env:VAR}` (OpenCode).
pub fn expand(s: &str) -> String {
    let mut out = String::new();
    let mut rest = s;
    while !rest.is_empty() {
        if let Some(r) = rest.strip_prefix("${") {
            if let Some(end) = r.find('}') {
                let inner = &r[..end];
                let (var, default) = match inner.split_once(":-") {
                    Some((v, d)) => (v, Some(d)),
                    None => (inner, None),
                };
                out.push_str(&std::env::var(var).ok().or(default.map(String::from)).unwrap_or_default());
                rest = &r[end + 1..];
                continue;
            }
        }
        if let Some(r) = rest.strip_prefix("{env:") {
            if let Some(end) = r.find('}') {
                out.push_str(&std::env::var(&r[..end]).unwrap_or_default());
                rest = &r[end + 1..];
                continue;
            }
        }
        let ch = rest.chars().next().unwrap();
        out.push(ch);
        rest = &rest[ch.len_utf8()..];
    }
    out
}

fn str_map(v: &Value) -> BTreeMap<String, String> {
    v.as_object().map(|o| o.iter().filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), expand(s)))).collect())
        .unwrap_or_default()
}

/// Formato de Claude Code / jmd: `{"command", "args", "env"}` o `{"type": "http"|"sse", "url", "headers"}`.
pub fn parse_claude(name: &str, v: &Value, source: &str) -> Option<Server> {
    let kind = v["type"].as_str().unwrap_or(if v.get("url").is_some() { "http" } else { "stdio" });
    let transport = match kind {
        "http" | "streamable-http" => Transport::Http { url: expand(v["url"].as_str()?), headers: str_map(&v["headers"]) },
        "sse" => Transport::Sse { url: expand(v["url"].as_str()?) },
        _ => Transport::Stdio {
            command: expand(v["command"].as_str()?),
            args: v["args"].as_array().map(|a| a.iter().filter_map(|x| x.as_str().map(expand)).collect()).unwrap_or_default(),
            env: str_map(&v["env"]),
        },
    };
    Some(Server { name: name.into(), source: source.into(), transport, enabled: v["disabled"].as_bool() != Some(true) })
}

/// Formato de OpenCode: `{"type": "local", "command": [..], "environment"}` o `{"type": "remote", "url", "headers"}`.
pub fn parse_opencode(name: &str, v: &Value, source: &str) -> Option<Server> {
    let transport = match v["type"].as_str()? {
        "remote" => Transport::Http { url: expand(v["url"].as_str()?), headers: str_map(&v["headers"]) },
        "local" => {
            let cmd: Vec<String> = v["command"].as_array()?.iter().filter_map(|x| x.as_str().map(expand)).collect();
            let (first, rest) = cmd.split_first()?;
            Transport::Stdio { command: first.clone(), args: rest.to_vec(), env: str_map(&v["environment"]) }
        }
        _ => return None,
    };
    Some(Server { name: name.into(), source: source.into(), transport, enabled: v["enabled"].as_bool() != Some(false) })
}

fn read_json(path: &Path) -> Option<Value> {
    serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()
}

pub fn jmd_config_path() -> PathBuf {
    std::env::var_os("JMD_MCP_CONFIG").map(PathBuf::from)
        .unwrap_or_else(|| crate::client::config_path().with_file_name("mcp.json"))
}

pub fn discover(cwd: &Path) -> Vec<Server> {
    let home = crate::client::home();
    let mut found: Vec<Server> = vec![];
    let mut push = |s: Option<Server>| {
        if let Some(s) = s {
            if !found.iter().any(|f| f.name == s.name) {
                found.push(s);
            }
        }
    };
    let claude_like = |v: &Value| -> Vec<(String, Value)> {
        v["mcpServers"].as_object().map(|o| o.iter().map(|(k, v)| (k.clone(), v.clone())).collect()).unwrap_or_default()
    };
    if let Some(v) = read_json(&jmd_config_path()) {
        for (n, s) in claude_like(&v) {
            push(parse_claude(&n, &s, "jmd"));
        }
    }
    if let Some(v) = read_json(&cwd.join(".mcp.json")) {
        for (n, s) in claude_like(&v) {
            push(parse_claude(&n, &s, ".mcp.json"));
        }
    }
    if let Some(v) = read_json(&home.join(".claude.json")) {
        let key = cwd.to_string_lossy().to_string();
        if let Some(p) = v["projects"].get(&key) {
            for (n, s) in claude_like(p) {
                push(parse_claude(&n, &s, "Claude Code (proyecto)"));
            }
        }
        for (n, s) in claude_like(&v) {
            push(parse_claude(&n, &s, "Claude Code"));
        }
    }
    let oc_global = std::env::var_os("XDG_CONFIG_HOME").map(PathBuf::from).unwrap_or_else(|| home.join(".config"))
        .join("opencode").join("opencode.json");
    for (path, label) in [(cwd.join("opencode.json"), "OpenCode (proyecto)"), (oc_global, "OpenCode")] {
        if let Some(v) = read_json(&path) {
            for (n, s) in v["mcp"].as_object().into_iter().flatten() {
                push(parse_opencode(n, s, label));
            }
        }
    }
    found
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
}

struct StdioConn {
    child: tokio::process::Child,
    stdin: tokio::process::ChildStdin,
    lines: tokio::io::Lines<BufReader<tokio::process::ChildStdout>>,
}

enum Conn {
    Stdio(Box<StdioConn>),
    Http {
        client: reqwest::Client,
        url: String,
        headers: BTreeMap<String, String>,
        session: Option<String>,
    },
}

pub struct Session {
    conn: Conn,
    next_id: u64,
    pub info: Value,
}

fn rpc(id: u64, method: &str, params: Value) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "method": method, "params": params})
}

impl Session {
    pub async fn connect(server: &Server) -> Result<Session> {
        let conn = match &server.transport {
            Transport::Sse { .. } => bail!("transporte SSE antiguo: no soportado (usa http)"),
            Transport::Http { url, headers } => Conn::Http {
                client: reqwest::Client::builder().connect_timeout(Duration::from_secs(10)).build()?,
                url: url.clone(),
                headers: headers.clone(),
                session: None,
            },
            Transport::Stdio { command, args, env } => {
                // En Windows, npx/uvx son .cmd: se lanzan a través de cmd /C.
                let mut cmd = if cfg!(windows) {
                    let mut c = tokio::process::Command::new("cmd");
                    c.arg("/C").arg(command).args(args);
                    c
                } else {
                    let mut c = tokio::process::Command::new(command);
                    c.args(args);
                    c
                };
                cmd.envs(env).stdin(std::process::Stdio::piped()).stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::null()).kill_on_drop(true);
                let mut child = cmd.spawn().with_context(|| format!("no se pudo ejecutar `{command}`"))?;
                let stdin = child.stdin.take().context("sin stdin")?;
                let stdout = child.stdout.take().context("sin stdout")?;
                Conn::Stdio(Box::new(StdioConn { child, stdin, lines: BufReader::new(stdout).lines() }))
            }
        };
        let mut s = Session { conn, next_id: 1, info: Value::Null };
        let init = s.request("initialize", json!({
            "protocolVersion": PROTOCOL, "capabilities": {},
            "clientInfo": {"name": "jmd", "version": env!("CARGO_PKG_VERSION")},
        })).await?;
        s.info = init;
        s.notify("notifications/initialized").await?;
        Ok(s)
    }

    async fn notify(&mut self, method: &str) -> Result<()> {
        let msg = json!({"jsonrpc": "2.0", "method": method});
        match &mut self.conn {
            Conn::Stdio(c) => {
                c.stdin.write_all(format!("{msg}\n").as_bytes()).await?;
                c.stdin.flush().await?;
            }
            Conn::Http { client, url, headers, session } => {
                let mut req = client.post(url.as_str()).json(&msg)
                    .header("accept", "application/json, text/event-stream")
                    .header("mcp-protocol-version", PROTOCOL);
                for (k, v) in headers.iter() {
                    req = req.header(k, v);
                }
                if let Some(sid) = session {
                    req = req.header("mcp-session-id", sid.as_str());
                }
                req.timeout(Duration::from_secs(15)).send().await?;
            }
        }
        Ok(())
    }

    pub async fn request(&mut self, method: &str, params: Value) -> Result<Value> {
        let id = self.next_id;
        self.next_id += 1;
        let msg = rpc(id, method, params);
        let response = match &mut self.conn {
            Conn::Stdio(c) => {
                let StdioConn { stdin, lines, .. } = &mut **c;
                stdin.write_all(format!("{msg}\n").as_bytes()).await?;
                stdin.flush().await?;
                let read = async {
                    loop {
                        let line = lines.next_line().await?.ok_or_else(|| anyhow!("el servidor cerró la conexión"))?;
                        let Ok(v) = serde_json::from_str::<Value>(line.trim()) else { continue }; // logs en stdout
                        if v["id"] == json!(id) && (v.get("result").is_some() || v.get("error").is_some()) {
                            return Ok::<Value, anyhow::Error>(v);
                        }
                        // Peticiones del servidor (ping, roots/list…): respuesta mínima.
                        if let (Some(sid), Some(m)) = (v.get("id"), v["method"].as_str()) {
                            let reply = if m == "ping" {
                                json!({"jsonrpc": "2.0", "id": sid, "result": {}})
                            } else {
                                json!({"jsonrpc": "2.0", "id": sid, "error": {"code": -32601, "message": "no soportado"}})
                            };
                            stdin.write_all(format!("{reply}\n").as_bytes()).await?;
                            stdin.flush().await?;
                        }
                    }
                };
                tokio::time::timeout(Duration::from_secs(60), read).await
                    .map_err(|_| anyhow!("{method}: el servidor no respondió en 60 s"))??
            }
            Conn::Http { client, url, headers, session } => {
                let mut req = client.post(url.as_str()).json(&msg)
                    .header("accept", "application/json, text/event-stream");
                if method != "initialize" {
                    req = req.header("mcp-protocol-version", PROTOCOL);
                }
                for (k, v) in headers.iter() {
                    req = req.header(k, v);
                }
                if let Some(sid) = session.as_ref() {
                    req = req.header("mcp-session-id", sid.as_str());
                }
                let resp = req.timeout(Duration::from_secs(60)).send().await?;
                if let Some(sid) = resp.headers().get("mcp-session-id").and_then(|v| v.to_str().ok()) {
                    *session = Some(sid.to_string());
                }
                let status = resp.status();
                let is_sse = resp.headers().get("content-type").and_then(|v| v.to_str().ok())
                    .is_some_and(|c| c.contains("text/event-stream"));
                let text = resp.text().await?;
                if !status.is_success() {
                    bail!("HTTP {status}: {}", text.chars().take(200).collect::<String>());
                }
                if is_sse {
                    text.lines().filter_map(|l| l.strip_prefix("data:")).filter_map(|d| serde_json::from_str::<Value>(d.trim()).ok())
                        .find(|v| v["id"] == json!(id)).ok_or_else(|| anyhow!("{method}: sin respuesta en el stream"))?
                } else {
                    serde_json::from_str(&text).context("respuesta no JSON")?
                }
            }
        };
        if let Some(e) = response.get("error") {
            bail!("{method}: {}", e["message"].as_str().unwrap_or(&e.to_string()));
        }
        Ok(response["result"].clone())
    }

    pub async fn list_tools(&mut self) -> Result<Vec<Tool>> {
        let mut tools = vec![];
        let mut cursor: Option<String> = None;
        for _ in 0..20 {
            let params = match &cursor { Some(c) => json!({"cursor": c}), None => json!({}) };
            let r = self.request("tools/list", params).await?;
            for t in r["tools"].as_array().into_iter().flatten() {
                tools.push(Tool {
                    name: t["name"].as_str().unwrap_or("").to_string(),
                    description: t["description"].as_str().unwrap_or("").to_string(),
                    input_schema: if t["inputSchema"].is_object() { t["inputSchema"].clone() } else { json!({"type": "object"}) },
                });
            }
            cursor = r["nextCursor"].as_str().map(String::from);
            if cursor.is_none() {
                break;
            }
        }
        Ok(tools)
    }

    /// Devuelve el texto del resultado y si el servidor lo marcó como error.
    pub async fn call_tool(&mut self, name: &str, args: Value) -> Result<(String, bool)> {
        let r = self.request("tools/call", json!({"name": name, "arguments": args})).await?;
        let text = r["content"].as_array().into_iter().flatten().map(|c| match c["type"].as_str() {
            Some("text") => c["text"].as_str().unwrap_or("").to_string(),
            Some(t) => format!("[{t}]"),
            None => String::new(),
        }).collect::<Vec<_>>().join("\n");
        let text = if text.is_empty() && r.get("structuredContent").is_some() { r["structuredContent"].to_string() } else { text };
        Ok((text, r["isError"].as_bool() == Some(true)))
    }

    pub async fn close(self) {
        if let Conn::Stdio(c) = self.conn {
            let StdioConn { mut child, stdin, .. } = *c;
            drop(stdin);
            let _ = tokio::time::timeout(Duration::from_secs(2), child.wait()).await;
            let _ = child.kill().await;
        }
    }
}

/// Nombre de función para el modelo: `mcp__servidor__herramienta` (solo [A-Za-z0-9_-], ≤ 64).
pub fn function_name(server: &str, tool: &str) -> String {
    let clean = |s: &str| s.chars().map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' }).collect::<String>();
    let mut n = format!("mcp__{}__{}", clean(server), clean(tool));
    n.truncate(64);
    n
}

/// Resultado de conectar y listar herramientas (para `jmd mcp`).
pub struct Probe {
    pub server: Server,
    pub result: Result<(Vec<Tool>, String)>,
    pub seconds: f64,
}

pub async fn probe(server: Server) -> Probe {
    let t0 = std::time::Instant::now();
    let fut = async {
        let mut s = Session::connect(&server).await?;
        let version = s.info["serverInfo"]["version"].as_str().unwrap_or("").to_string();
        let tools = s.list_tools().await;
        s.close().await;
        Ok((tools?, version))
    };
    let result = match tokio::time::timeout(Duration::from_secs(45), fut).await {
        Ok(r) => r,
        Err(_) => Err(anyhow!("no respondió en 45 s")),
    };
    Probe { server, result, seconds: t0.elapsed().as_secs_f64() }
}

/// `jmd mcp add/remove`: el archivo propio de jmd (formato de Claude Code).
pub fn edit_jmd_config(f: impl FnOnce(&mut Map<String, Value>)) -> Result<PathBuf> {
    let path = jmd_config_path();
    let mut root = read_json(&path).unwrap_or_else(|| json!({"mcpServers": {}}));
    if !root["mcpServers"].is_object() {
        root["mcpServers"] = json!({});
    }
    f(root["mcpServers"].as_object_mut().unwrap());
    if let Some(d) = path.parent() {
        std::fs::create_dir_all(d)?;
    }
    std::fs::write(&path, serde_json::to_string_pretty(&root)? + "\n")?;
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expands_env_in_both_formats() {
        std::env::set_var("JMD_TEST_TOKEN", "abc");
        assert_eq!(expand("Bearer ${JMD_TEST_TOKEN}"), "Bearer abc");
        assert_eq!(expand("x{env:JMD_TEST_TOKEN}y"), "xabcy");
        assert_eq!(expand("${JMD_NO_EXISTE:-def}"), "def");
        assert_eq!(expand("ñ sin variables $ {"), "ñ sin variables $ {");
    }

    #[test]
    fn parses_claude_and_opencode_formats() {
        let c = parse_claude("fs", &json!({"command": "npx", "args": ["-y", "@mcp/fs", "."]}), "x").unwrap();
        assert_eq!(c.kind(), "stdio");
        assert_eq!(c.target(), "npx -y @mcp/fs .");
        let h = parse_claude("gh", &json!({"type": "http", "url": "https://api/mcp", "headers": {"A": "b"}}), "x").unwrap();
        assert!(matches!(h.transport, Transport::Http { .. }));
        let o = parse_opencode("pw", &json!({"type": "local", "command": ["uvx", "pw-mcp"], "enabled": false}), "y").unwrap();
        assert_eq!(o.target(), "uvx pw-mcp");
        assert!(!o.enabled);
        let r = parse_opencode("ctx", &json!({"type": "remote", "url": "https://ctx/mcp"}), "y").unwrap();
        assert_eq!(r.kind(), "http");
    }

    #[test]
    fn function_names_are_safe() {
        assert_eq!(function_name("git hub", "create.issue"), "mcp__git_hub__create_issue");
        assert!(function_name(&"x".repeat(80), "y").len() <= 64);
    }
}
