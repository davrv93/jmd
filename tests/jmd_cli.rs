//! Pruebas del binario `jmd` de punta a punta: MCP (HTTP y stdio), skills y el bucle del agente.
//!
//! Cada prueba usa un HOME y una configuración temporales, así que no lee lo que haya
//! configurado en la máquina (Claude Code, OpenCode…).

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};

struct Tmp(PathBuf);
impl Tmp {
    fn new(tag: &str) -> Self {
        let p = std::env::temp_dir().join(format!("jmd-cli-{tag}-{}", uuid::Uuid::new_v4().simple()));
        std::fs::create_dir_all(&p).unwrap();
        Tmp(p)
    }
}
impl Drop for Tmp {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// `jmd` con un entorno aislado; devuelve (código, stdout).
fn jmd(home: &Path, cwd: &Path, args: &[&str]) -> (i32, String) {
    let out = Command::new(env!("CARGO_BIN_EXE_jmd"))
        .args(args)
        .current_dir(cwd)
        .env("HOME", home)
        .env("USERPROFILE", home)
        .env("APPDATA", home.join("appdata"))
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .env("JMD_MCP_CONFIG", home.join("mcp.json"))
        .env("NO_COLOR", "1")
        .output()
        .expect("ejecutar jmd");
    (out.status.code().unwrap_or(-1), String::from_utf8_lossy(&out.stdout).to_string()
        + &String::from_utf8_lossy(&out.stderr))
}

// --- Servidor MCP falso por HTTP transmisible --------------------------------

#[derive(Default)]
struct Mcp {
    calls: Mutex<Vec<Value>>,
}

async fn mcp_http(State(s): State<Arc<Mcp>>, headers: HeaderMap, Json(msg): Json<Value>) -> Response {
    s.calls.lock().unwrap().push(msg.clone());
    let method = msg["method"].as_str().unwrap_or("");
    if msg.get("id").is_none() {
        return StatusCode::ACCEPTED.into_response(); // notificación
    }
    if method != "initialize" && headers.get("mcp-session-id").and_then(|v| v.to_str().ok()) != Some("s-1") {
        return (StatusCode::BAD_REQUEST, "falta la sesión").into_response();
    }
    let id = msg["id"].clone();
    let result = match method {
        "initialize" => json!({"protocolVersion": "2025-06-18", "capabilities": {"tools": {}},
            "serverInfo": {"name": "falso", "version": "9.9"}}),
        "tools/list" => json!({"tools": [
            {"name": "echo", "description": "Repite el texto", "inputSchema": {"type": "object", "properties": {"text": {"type": "string"}}}},
            {"name": "sumar", "description": "Suma dos números", "inputSchema": {"type": "object"}}]}),
        _ => return Json(json!({"jsonrpc": "2.0", "id": id, "error": {"code": -32601, "message": "no"}})).into_response(),
    };
    let body = json!({"jsonrpc": "2.0", "id": id, "result": result});
    if method == "tools/list" {
        // Una respuesta en SSE, para probar ese camino.
        return ([("content-type", "text/event-stream")], format!("event: message\ndata: {body}\n\n")).into_response();
    }
    ([("mcp-session-id", "s-1")], Json(body)).into_response()
}

async fn start_mcp() -> String {
    let app = Router::new().route("/mcp", post(mcp_http)).with_state(Arc::new(Mcp::default()));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    format!("http://{addr}/mcp")
}

#[tokio::test(flavor = "multi_thread")]
async fn mcp_list_tools_add_remove() {
    let url = start_mcp().await;
    let home = Tmp::new("home");
    let cwd = Tmp::new("cwd");
    let h = home.0.clone();
    let c = cwd.0.clone();
    let u = url.clone();
    tokio::task::spawn_blocking(move || {
        // Sin servidores
        let (code, out) = jmd(&h, &c, &["mcp"]);
        assert_eq!(code, 0, "{out}");
        assert!(out.contains("No hay servidores MCP"), "{out}");

        // add por URL, luego list y tools
        let (code, out) = jmd(&h, &c, &["mcp", "add", "web", "--url", &u]);
        assert_eq!(code, 0, "{out}");
        let (code, out) = jmd(&h, &c, &["--json", "mcp", "list"]);
        assert_eq!(code, 0, "{out}");
        let v: Value = serde_json::from_str(&out).unwrap();
        assert_eq!(v[0]["name"], "web");
        assert_eq!(v[0]["ok"], true, "{out}");
        assert_eq!(v[0]["tools"], 2);
        let (code, out) = jmd(&h, &c, &["--json", "mcp", "tools", "web"]);
        assert_eq!(code, 0, "{out}");
        let tools: Value = serde_json::from_str(&out).unwrap();
        assert_eq!(tools[0]["name"], "echo");

        // Un servidor que no existe: falla con su error, sin tumbar la lista
        let (code, _) = jmd(&h, &c, &["mcp", "add", "roto", "--", "comando-que-no-existe-jmd"]);
        assert_eq!(code, 0);
        let (_, out) = jmd(&h, &c, &["--json", "mcp", "list"]);
        let v: Value = serde_json::from_str(&out).unwrap();
        let roto = v.as_array().unwrap().iter().find(|s| s["name"] == "roto").unwrap();
        assert_eq!(roto["ok"], false);

        // El .mcp.json del proyecto (formato de Claude Code) también cuenta
        std::fs::write(c.join(".mcp.json"), json!({"mcpServers": {"proyecto": {"type": "http", "url": u}}}).to_string()).unwrap();
        let (_, out) = jmd(&h, &c, &["--json", "mcp", "list"]);
        let v: Value = serde_json::from_str(&out).unwrap();
        assert!(v.as_array().unwrap().iter().any(|s| s["name"] == "proyecto" && s["source"] == ".mcp.json"));

        let (code, out) = jmd(&h, &c, &["mcp", "remove", "roto"]);
        assert_eq!(code, 0, "{out}");
        assert!(out.contains("quitado"));
    }).await.unwrap();
}

#[cfg(unix)]
#[tokio::test(flavor = "multi_thread")]
async fn mcp_over_stdio() {
    if Command::new("python3").arg("--version").output().is_err() {
        eprintln!("sin python3: se salta la prueba stdio");
        return;
    }
    let home = Tmp::new("home");
    let cwd = Tmp::new("cwd");
    let script = home.0.join("srv.py");
    std::fs::write(&script, r#"
import json, sys
for line in sys.stdin:
    m = json.loads(line)
    if "id" not in m:
        continue
    if m["method"] == "initialize":
        r = {"protocolVersion": "2025-06-18", "capabilities": {}, "serverInfo": {"name": "py", "version": "1"}}
    elif m["method"] == "tools/list":
        print("log que no es JSON", flush=True)
        r = {"tools": [{"name": "hora", "description": "Da la hora", "inputSchema": {"type": "object"}}]}
    else:
        r = {}
    print(json.dumps({"jsonrpc": "2.0", "id": m["id"], "result": r}), flush=True)
"#).unwrap();
    let (h, c, s) = (home.0.clone(), cwd.0.clone(), script.display().to_string());
    tokio::task::spawn_blocking(move || {
        let (code, out) = jmd(&h, &c, &["mcp", "add", "py", "--", "python3", &s]);
        assert_eq!(code, 0, "{out}");
        let (code, out) = jmd(&h, &c, &["--json", "mcp", "tools", "py"]);
        assert_eq!(code, 0, "{out}");
        let tools: Value = serde_json::from_str(&out).unwrap();
        assert_eq!(tools[0]["name"], "hora");
    }).await.unwrap();
}

#[test]
fn skills_include_builtin_and_project() {
    let home = Tmp::new("home");
    let cwd = Tmp::new("cwd");
    let dir = cwd.0.join(".claude").join("skills").join("marca");
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(dir.join("SKILL.md"), "---\nname: marca\ndescription: Colores y tono de la marca\n---\nUsa azul.").unwrap();
    let (code, out) = jmd(&home.0, &cwd.0, &["--json", "skills"]);
    assert_eq!(code, 0, "{out}");
    let v: Value = serde_json::from_str(&out).unwrap();
    let names: Vec<&str> = v.as_array().unwrap().iter().filter_map(|s| s["name"].as_str()).collect();
    assert!(names.contains(&"prototipo") && names.contains(&"marca"), "{names:?}");
}

// --- Gateway falso: el bucle de herramientas del agente ----------------------

/// Un stream SSE de chat/completions con una sola llamada a herramienta.
fn sse_tool_call(name: &str, args: Value) -> Response {
    let chunk = json!({"choices": [{"index": 0, "delta": {"tool_calls": [{"index": 0, "id": "",
        "type": "function", "function": {"name": name, "arguments": args.to_string()}}]}, "finish_reason": "tool_calls"}]});
    ([("content-type", "text/event-stream"), ("x-orchestrator-agent", "coding"), ("x-orchestrator-model", "falso")],
        format!("data: {chunk}\n\ndata: [DONE]\n\n")).into_response()
}

async fn fake_chat(State(s): State<Arc<Mcp>>, Json(body): Json<Value>) -> Response {
    let n = {
        let mut calls = s.calls.lock().unwrap();
        calls.push(body);
        calls.len()
    };
    if n == 1 {
        sse_tool_call("write_file", json!({"path": "out/hola.txt", "content": "hola"}))
    } else {
        // Un modelo atascado: siempre el mismo comando.
        sse_tool_call("shell", json!({"command": "echo repetido"}))
    }
}

#[tokio::test(flavor = "multi_thread")]
async fn agent_runs_builtin_tools_and_stops_repeated_calls() {
    let state = Arc::new(Mcp::default());
    let app = Router::new().route("/v1/chat/completions", post(fake_chat)).with_state(state.clone());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

    let home = Tmp::new("agent");
    let url = format!("http://{addr}");
    let (code, out) = tokio::task::spawn_blocking({
        let home = home.0.clone();
        move || {
            let out = Command::new(env!("CARGO_BIN_EXE_jmd"))
                .args(["chat", "--auto", "crea el archivo y prueba"])
                .current_dir(&home)
                .env("HOME", &home).env("USERPROFILE", &home).env("APPDATA", home.join("appdata"))
                .env("XDG_CONFIG_HOME", home.join(".config")).env("JMD_MCP_CONFIG", home.join("mcp.json"))
                .env("JMD_URL", &url).env("NO_COLOR", "1")
                .output().expect("ejecutar jmd");
            (out.status.code().unwrap_or(-1), String::from_utf8_lossy(&out.stdout).to_string()
                + &String::from_utf8_lossy(&out.stderr))
        }
    }).await.unwrap();
    assert_eq!(code, 0, "{out}");
    assert_eq!(std::fs::read_to_string(home.0.join("out/hola.txt")).unwrap(), "hola");
    // Se ve qué hizo cada herramienta.
    assert!(out.contains("write_file") && out.contains("Creado"), "{out}");
    assert!(out.contains("echo repetido") && out.contains("repetido"), "{out}");
    // El mismo comando se ejecuta dos veces, se rechaza dos y se corta el turno.
    assert_eq!(out.matches("no se ejecuta otra vez").count(), 2, "{out}");
    assert!(out.contains("se corta el turno"), "{out}");
    let calls = state.calls.lock().unwrap();
    assert_eq!(calls.len(), 5, "{out}");
    // A partir de la segunda vuelta, el turno sigue con el perfil elegido en la primera.
    assert!(calls[0]["orchestrator"].get("agent").is_none());
    assert_eq!(calls[1]["orchestrator"]["agent"], "coding");
    // El modelo recibe el resultado del comando y el aviso de que no lo repita.
    let last = calls[4]["messages"].as_array().unwrap();
    let tool_msgs: Vec<&str> = last.iter().filter(|m| m["role"] == "tool").filter_map(|m| m["content"].as_str()).collect();
    assert!(tool_msgs[1].contains("código de salida: 0") && tool_msgs[1].contains("repetido"), "{tool_msgs:?}");
    assert!(tool_msgs[3].starts_with("No se ejecutó"), "{tool_msgs:?}");
    let system = last[0]["content"].as_str().unwrap();
    assert!(system.contains("Entorno:") && system.contains("carpeta personal"), "{system}");
}
