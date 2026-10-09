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

// --- La cuenta del LMS: SSO, comandos del LMS, token para el gateway, MCP y logout ----------

mod common;

use axum::extract::Path as AxPath;
use axum::routing::get;

#[derive(Default)]
struct Lms {
    url: Mutex<String>,
    oidc: Option<String>,
    repo: Mutex<String>,
    sha: Mutex<String>,
    questions: Mutex<Vec<Value>>,
    submissions: Mutex<Vec<Value>>,
    polls: Mutex<u32>,
    logins: Mutex<Vec<Value>>,
}

fn authed(headers: &HeaderMap) -> bool {
    let h = headers.get("authorization").and_then(|v| v.to_str().ok()).unwrap_or("");
    h == "Bearer lms_prueba" || (h.starts_with("Bearer ey") && h.matches('.').count() == 2)
}

async fn lms_router(l: Arc<Lms>) -> String {
    use axum::http::StatusCode;
    let deny = || (StatusCode::UNAUTHORIZED, Json(json!({"error": {"code": "unauthorized", "message": "sin sesión"}}))).into_response();
    let app = Router::new()
        .route("/api/v1/auth/config", get(|State(l): State<Arc<Lms>>| async move {
            Json(json!({"local": true, "register": true, "oidc": l.oidc.is_some(), "issuer": l.oidc}))
        }))
        .route("/api/v1/auth/login", post(|State(l): State<Arc<Lms>>, Json(b): Json<Value>| async move {
            l.logins.lock().unwrap().push(b.clone());
            if b["password"] == "secreta" {
                Json(json!({"token": "lms_prueba", "user": {"id": "u-ana", "name": "Ana Local", "email": b["email"], "roles": ["student"]}})).into_response()
            } else {
                (StatusCode::UNAUTHORIZED, Json(json!({"error": {"code": "invalid_credentials", "message": "correo o contraseña incorrectos"}}))).into_response()
            }
        }))
        .route("/api/v1/auth/logout", post(|| async { StatusCode::NO_CONTENT }))
        .route("/api/v1/me", get(move |h: HeaderMap| async move {
            if !authed(&h) { return deny(); }
            Json(json!({"id": "u-ana", "email": "ana@ejemplo.edu", "name": "Ana", "roles": ["student"], "cohorts": ["cohorte-2026-1"]})).into_response()
        }))
        .route("/api/v1/courses", get(|h: HeaderMap| async move {
            if !authed(&h) { return (StatusCode::UNAUTHORIZED, "no").into_response(); }
            Json(json!([{"id": "c1", "slug": "agentica", "title": "Programación agéntica", "role": "student"}])).into_response()
        }))
        .route("/api/v1/courses/:id", get(|| async {
            Json(json!({"id": "c1", "title": "Programación agéntica", "modules": [{"id": "m1", "title": "Módulo 1",
                "lessons": [{"id": "l1", "title": "Clase 1 · Instalación", "starts_at": "2026-10-09T19:00:00Z", "published": true}]}]}))
        }))
        .route("/api/v1/lessons/:id", get(|State(l): State<Arc<Lms>>| async move {
            let u = l.url.lock().unwrap().clone();
            Json(json!({"id": "l1", "title": "Clase 1 · Instalación", "objectives": [{"id": "o1", "title": "Instalar jmd"}],
                "recording": {"url": "https://zoom.us/rec/1", "passcode": "1234"},
                "repo": {"url": l.repo.lock().unwrap().clone(), "ref": l.sha.lock().unwrap().clone()},
                "materials": [{"id": "mat1", "title": "Clase 1 (PDF)", "kind": "file", "objective_ids": ["o1"], "url": format!("{u}/files/c1/clase-01.pdf")},
                              {"id": "mat2", "title": "Vídeo de Zoom", "kind": "link", "objective_ids": [], "url": "https://zoom.us/rec/1"}],
                "assignments": [{"id": "t1", "title": "Tarea 1", "due_at": "2026-10-16T23:59:00Z", "status": "pending"}],
                "progress": {"done": 1, "total": 9}, "open_command": "jmd lesson open l1", "content_html": "<p>hola</p>"}))
        }))
        .route("/api/v1/materials/:id/download", get(|AxPath(id): AxPath<String>| async move {
            if id == "mat1" {
                Json(json!({"url": "/files/c1/clase-01.pdf", "expires_at": "2099-01-01T00:00:00Z", "filename": "clase-01.pdf"}))
            } else {
                Json(json!({"url": "https://zoom.us/rec/1", "expires_at": "2099-01-01T00:00:00Z", "filename": ""}))
            }
        }))
        .route("/files/c1/clase-01.pdf", get(|h: HeaderMap| async move {
            if !authed(&h) { return (StatusCode::UNAUTHORIZED, "no").into_response(); }
            "%PDF-1.4 prueba".into_response()
        }))
        .route("/api/v1/assignments", get(|| async {
            Json(json!([{"id": "t1", "title": "Tarea 1", "due_at": "2026-10-16T23:59:00Z", "status": "pending"}]))
        }))
        .route("/api/v1/assignments/:id", get(|| async {
            Json(json!({"id": "t1", "title": "Tarea 1", "description_md": "Instala **jmd**.", "due_at": "2026-10-16T23:59:00Z",
                "rubric": [{"title": "Instalado", "points": 10}], "autograde": false, "max_score": 10, "status": "pending",
                "my_submissions": [], "submit_command": "jmd submit t1"}))
        }))
        .route("/api/v1/assignments/:id/submissions", post(|State(l): State<Arc<Lms>>, Json(b): Json<Value>| async move {
            l.submissions.lock().unwrap().push(b);
            (StatusCode::CREATED, Json(json!({"id": "s1", "status": "queued"})))
        }))
        .route("/api/v1/submissions/:id", get(|State(l): State<Arc<Lms>>| async move {
            let mut p = l.polls.lock().unwrap();
            *p += 1;
            if *p >= 2 {
                Json(json!({"id": "s1", "status": "graded", "score": 9, "max_score": 10, "feedback_md": "Bien.", "checks": [{"name": "instalado", "ok": true}]}))
            } else {
                Json(json!({"id": "s1", "status": "queued"}))
            }
        }))
        .route("/api/v1/grades", get(|| async {
            Json(json!([{"assignment_id": "t1", "title": "Tarea 1", "score": 9, "max_score": 10, "graded_at": "2026-10-10T10:00:00Z", "status": "graded"}]))
        }))
        .route("/api/v1/lessons/:id/questions", post(|State(l): State<Arc<Lms>>, Json(b): Json<Value>| async move {
            l.questions.lock().unwrap().push(b);
            (StatusCode::CREATED, Json(json!({"id": "q1", "url": "https://lms/lessons/l1#q1"})))
        }))
        .with_state(l.clone());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    *l.url.lock().unwrap() = url.clone();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    url
}

/// El gateway de verdad, con cuentas del LMS activadas (sin proveedores reales).
async fn start_gateway(issuer: &str) -> (String, Arc<ai_orchestrator::engine::Engine>) {
    let yaml = format!(r#"
providers:
  p: {{base_url: "http://127.0.0.1:9/v1", api_key: k}}
models:
  m: {{capabilities: [text], deployments: [{{provider: p, model: x}}]}}
agents:
  general: {{chain: [m]}}
router:
  judge: {{enabled: false}}
auth:
  issuer: "{issuer}"
  per_user: {{requests_per_day: 50}}
"#);
    let cfg = ai_orchestrator::config::Config::from_yaml(&yaml).unwrap();
    let dir = std::env::temp_dir().join(format!("jmd-gw-{}", uuid::Uuid::new_v4().simple()));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("config.yaml");
    std::fs::write(&path, cfg.to_yaml()).unwrap();
    let engine = Arc::new(ai_orchestrator::engine::Engine::new(cfg, path,
        ai_orchestrator::telemetry::Telemetry::open(":memory:").unwrap(), vec!["clave-fija".into()], "admin".into()));
    let app = ai_orchestrator::api::router(engine.clone());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (url, engine)
}

fn git(dir: &Path, args: &[&str]) -> String {
    let out = Command::new("git").args(args).current_dir(dir)
        .env("GIT_AUTHOR_NAME", "t").env("GIT_AUTHOR_EMAIL", "t@t").env("GIT_COMMITTER_NAME", "t").env("GIT_COMMITTER_EMAIL", "t@t")
        .output().expect("git");
    assert!(out.status.success(), "git {args:?}: {}", String::from_utf8_lossy(&out.stderr));
    String::from_utf8_lossy(&out.stdout).trim().to_string()
}

fn jmd_env(home: &Path, cwd: &Path, gateway: &str, args: &[&str]) -> (i32, String) {
    let out = Command::new(env!("CARGO_BIN_EXE_jmd")).args(args).current_dir(cwd)
        .env("HOME", home).env("USERPROFILE", home).env("APPDATA", home.join("appdata"))
        .env("XDG_CONFIG_HOME", home.join(".config")).env("JMD_MCP_CONFIG", home.join("mcp.json"))
        .env("JMD_URL", gateway).env("JMD_NO_BROWSER", "1").env("NO_COLOR", "1")
        .output().expect("ejecutar jmd");
    (out.status.code().unwrap_or(-1), String::from_utf8_lossy(&out.stdout).to_string() + &String::from_utf8_lossy(&out.stderr))
}

#[tokio::test(flavor = "multi_thread")]
async fn sso_login_lms_commands_gateway_token_setup_and_logout() {
    let (issuer_url, issuer) = common::start_issuer("ana", &["cohorte-2026-1"]).await;
    let lms = Arc::new(Lms { oidc: Some(issuer_url.clone()), ..Default::default() });
    let lms_url = lms_router(lms.clone()).await;
    let (gw, _engine) = start_gateway(&issuer_url).await;
    let home = Tmp::new("sso");
    let work = Tmp::new("work");

    // Un repo de la sesión, local, para `lesson open` y `submit`.
    let repo = work.0.join("origen").join("repo-clase-1");
    std::fs::create_dir_all(&repo).unwrap();
    git(&repo, &["init", "-q"]);
    std::fs::write(repo.join("main.go"), "package main\n").unwrap();
    git(&repo, &["add", "."]);
    git(&repo, &["commit", "-q", "-m", "clase 1"]);
    let sha = git(&repo, &["rev-parse", "HEAD"]);
    *lms.repo.lock().unwrap() = repo.to_string_lossy().to_string();
    *lms.sha.lock().unwrap() = sha.clone();

    // `jmd login --sso --lms …`: sin navegador imprime la URL; la "persona" la visita y el realm
    // redirige al puerto local de jmd con el code.
    let mut child = Command::new(env!("CARGO_BIN_EXE_jmd")).args(["login", "--sso", "--lms", &lms_url])
        .current_dir(&work.0)
        .env("HOME", &home.0).env("USERPROFILE", &home.0).env("APPDATA", home.0.join("appdata"))
        .env("XDG_CONFIG_HOME", home.0.join(".config")).env("JMD_MCP_CONFIG", home.0.join("mcp.json"))
        .env("JMD_URL", &gw).env("JMD_NO_BROWSER", "1").env("NO_COLOR", "1")
        .stdin(std::process::Stdio::null()).stdout(std::process::Stdio::piped()).stderr(std::process::Stdio::piped())
        .spawn().unwrap();
    let stdout = child.stdout.take().unwrap();
    let (tx, rx) = std::sync::mpsc::channel::<String>();
    let reader = std::thread::spawn(move || {
        use std::io::BufRead;
        let mut all = String::new();
        for line in std::io::BufReader::new(stdout).lines().map_while(Result::ok) {
            if line.contains("/authorize?") {
                let _ = tx.send(line.trim().rsplit(' ').next().unwrap_or("").to_string());
            }
            all.push_str(&line);
            all.push('\n');
        }
        all
    });
    let auth_url = tokio::task::spawn_blocking(move || rx.recv_timeout(std::time::Duration::from_secs(30))).await.unwrap()
        .expect("jmd no imprimió la URL de login");
    assert!(auth_url.contains("client_id=jmd-cli") && auth_url.contains("code_challenge_method=S256"), "{auth_url}");
    let page = reqwest::get(&auth_url).await.unwrap();
    assert_eq!(page.status(), 200);
    assert!(page.text().await.unwrap().contains("Listo"));
    let status = child.wait().unwrap();
    let out = reader.join().unwrap();
    assert!(status.success(), "{out}");
    assert!(out.contains("Ana") && out.contains("token personal guardado"), "{out}");
    let tokens_path = home.0.join(".config/jmd/tokens.json");
    let tokens: Value = serde_json::from_str(&std::fs::read_to_string(&tokens_path).unwrap()).unwrap();
    assert!(tokens["gateway_token"].as_str().unwrap().starts_with("jg_"), "{tokens}");
    assert_eq!(tokens["issuer"], issuer_url);
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(std::fs::metadata(&tokens_path).unwrap().permissions().mode() & 0o777, 0o600);
    }

    // whoami: LMS y gateway reconocen la cuenta.
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["whoami", "--json"]);
    assert_eq!(code, 0, "{out}");
    let w: Value = serde_json::from_str(&out).unwrap();
    assert_eq!(w["lms_me"]["name"], "Ana");
    assert_eq!(w["gateway"]["sub"], "ana");
    assert_eq!(w["gateway"]["usage"]["user"]["requests_per_day"], 50);

    // Los comandos del LMS.
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["courses"]);
    assert!(code == 0 && out.contains("Programación agéntica"), "{out}");
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["course", "c1"]);
    assert!(code == 0 && out.contains("Clase 1") && out.contains("l1"), "{out}");
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["lesson", "l1"]);
    assert!(code == 0 && out.contains("Instalar jmd") && out.contains("clave: 1234") && out.contains("jmd lesson open l1"), "{out}");
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["assignments"]);
    assert!(code == 0 && out.contains("Tarea 1") && out.contains("t1"), "{out}");
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["assignment", "t1"]);
    assert!(code == 0 && out.contains("Instala **jmd**") && out.contains("Instalado") && out.contains("jmd submit t1"), "{out}");
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["grades"]);
    assert!(code == 0 && out.contains("9/10"), "{out}");
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["ask", "l1", "¿por", "qué", "falla?", "--line", "main.go:3"]);
    assert!(code == 0 && out.contains("pregunta publicada"), "{out}");
    let q = lms.questions.lock().unwrap().clone();
    assert_eq!(q[0]["body_md"], "¿por qué falla?");
    assert_eq!(q[0]["code_ref"]["line"], 3);

    // lesson open: clona el repo en la ref de la sesión y baja los materiales (con sesión).
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["lesson", "open", "l1"]);
    assert_eq!(code, 0, "{out}");
    let clone = work.0.join("repo-clase-1");
    assert!(clone.join(".git").is_dir() && clone.join("main.go").exists(), "{out}");
    assert_eq!(git(&clone, &["rev-parse", "HEAD"]), sha);
    assert!(out.contains("en la ref"), "{out}");
    assert_eq!(std::fs::read_to_string(work.0.join("materiales/clase-01.pdf")).unwrap(), "%PDF-1.4 prueba");
    assert!(std::fs::read_to_string(work.0.join("materiales/enlaces.md")).unwrap().contains("zoom.us"));

    // submit desde un clon: manda origin y HEAD y sigue el estado hasta la nota.
    let clone2 = work.0.join("entrega");
    git(&work.0, &["clone", "-q", &repo.to_string_lossy(), "entrega"]);
    let (code, out) = jmd_env(&home.0, &clone2, &gw, &["submit", "t1", "-y", "--notes", "lista"]);
    assert_eq!(code, 0, "{out}");
    assert!(out.contains("nota: 9/10") && out.contains("instalado"), "{out}");
    let subs = lms.submissions.lock().unwrap().clone();
    assert_eq!(subs[0]["commit_sha"], sha);
    assert_eq!(subs[0]["notes"], "lista");
    assert!(subs[0]["repo_url"].as_str().unwrap().contains("repo-clase-1"));

    // token: el personal del gateway (lo usa Claude Code como apiKeyHelper).
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["token"]);
    assert!(code == 0 && out.trim().starts_with("jg_"), "{out}");

    // setup: Claude Code con apiKeyHelper y el MCP del LMS; OpenCode con el token personal y el MCP.
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["setup", "all", "-y"]);
    assert_eq!(code, 0, "{out}");
    let cs: Value = serde_json::from_str(&std::fs::read_to_string(home.0.join(".claude/settings.json")).unwrap()).unwrap();
    assert_eq!(cs["apiKeyHelper"], "jmd token");
    assert_eq!(cs["env"]["ANTHROPIC_BASE_URL"], gw);
    let cj: Value = serde_json::from_str(&std::fs::read_to_string(home.0.join(".claude.json")).unwrap()).unwrap();
    assert_eq!(cj["mcpServers"]["lms"]["args"], json!(["mcp", "serve"]));
    let oc: Value = serde_json::from_str(&std::fs::read_to_string(home.0.join(".config/opencode/opencode.json")).unwrap()).unwrap();
    assert!(oc["provider"]["jmd"]["options"]["apiKey"].as_str().unwrap().starts_with("jg_"));
    assert_eq!(oc["mcp"]["lms"]["type"], "local");
    // jmd ve el MCP del LMS entre los configurados y sus herramientas.
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["mcp", "tools", "lms"]);
    assert!(code == 0 && out.contains("lms_courses") && out.contains("lms_ask"), "{out}");

    // Con el access token vencido, `jmd token` refresca solo (sin token personal, da el access token).
    let mut t: Value = serde_json::from_str(&std::fs::read_to_string(&tokens_path).unwrap()).unwrap();
    t["expires_at"] = json!(1.0);
    t.as_object_mut().unwrap().remove("gateway_token");
    std::fs::write(&tokens_path, t.to_string()).unwrap();
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["token"]);
    assert!(code == 0 && out.trim().starts_with("ey"), "{out}");
    assert!(issuer.token_calls.lock().unwrap().iter().any(|c| c.get("grant_type").map(String::as_str) == Some("refresh_token")));

    // logout revoca el refresh token y borra los tokens.
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["logout"]);
    assert!(code == 0 && out.contains("sesión cerrada"), "{out}");
    assert!(!tokens_path.exists());
    assert!(!issuer.revoked.lock().unwrap().is_empty());
    let (code, out) = jmd_env(&home.0, &work.0, &gw, &["courses"]);
    assert!(code != 0 && out.contains("jmd login"), "{out}");
}

#[tokio::test(flavor = "multi_thread")]
async fn sso_device_flow_without_browser() {
    let (issuer_url, _issuer) = common::start_issuer("luis", &[]).await;
    let (gw, _e) = start_gateway(&issuer_url).await;
    let home = Tmp::new("device");
    let (code, out) = jmd_env(&home.0, &home.0, &gw, &["login", "--sso", "--device", "--issuer", &issuer_url]);
    assert_eq!(code, 0, "{out}");
    assert!(out.contains("ABCD-1234") && out.contains("device-login") && out.contains("Alumna luis"), "{out}");
    let (code, out) = jmd_env(&home.0, &home.0, &gw, &["whoami"]);
    assert!(code == 0 && out.contains("luis") && out.contains("50"), "{out}");
}

#[tokio::test(flavor = "multi_thread")]
async fn local_login_and_mcp_server_when_lms_has_no_sso() {
    let lms = Arc::new(Lms::default());
    let lms_url = lms_router(lms.clone()).await;
    let home = Tmp::new("local");
    let gw = "http://127.0.0.1:9".to_string();
    let (code, out) = jmd_env(&home.0, &home.0, &gw, &["login", "--sso", "--lms", &lms_url, "--email", "ana@x", "--password", "mala"]);
    assert!(code != 0 && out.contains("incorrectos"), "{out}");
    let (code, out) = jmd_env(&home.0, &home.0, &gw, &["login", "--sso", "--lms", &lms_url, "--email", "ana@x", "--password", "secreta"]);
    assert!(code == 0 && out.contains("SSO todavía no") && out.contains("Ana Local"), "{out}");
    let (code, out) = jmd_env(&home.0, &home.0, &gw, &["courses", "--json"]);
    assert!(code == 0 && out.contains("agentica"), "{out}");

    // El LMS como servidor MCP por stdio: initialize, tools/list, tools/call.
    let mut child = Command::new(env!("CARGO_BIN_EXE_jmd")).args(["mcp", "serve"]).current_dir(&home.0)
        .env("HOME", &home.0).env("USERPROFILE", &home.0).env("APPDATA", home.0.join("appdata"))
        .env("XDG_CONFIG_HOME", home.0.join(".config")).env("JMD_URL", &gw).env("NO_COLOR", "1")
        .stdin(std::process::Stdio::piped()).stdout(std::process::Stdio::piped()).spawn().unwrap();
    let mut stdin = child.stdin.take().unwrap();
    let stdout = child.stdout.take().unwrap();
    let lines = tokio::task::spawn_blocking(move || {
        use std::io::{BufRead, Write};
        for m in [
            json!({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "t", "version": "0"}}}),
            json!({"jsonrpc": "2.0", "method": "notifications/initialized"}),
            json!({"jsonrpc": "2.0", "id": 2, "method": "tools/list"}),
            json!({"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "lms_courses", "arguments": {}}}),
            json!({"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "lms_ask", "arguments": {"lesson": "l1", "body_md": "duda", "path": "a.go", "line": 7}}}),
        ] {
            writeln!(stdin, "{m}").unwrap();
        }
        drop(stdin);
        std::io::BufReader::new(stdout).lines().map_while(Result::ok).collect::<Vec<String>>()
    }).await.unwrap();
    child.wait().unwrap();
    let v: Vec<Value> = lines.iter().map(|l| serde_json::from_str(l).unwrap()).collect();
    assert_eq!(v.len(), 4, "{lines:?}");
    assert_eq!(v[0]["result"]["serverInfo"]["name"], "jmd-lms");
    assert!(v[1]["result"]["tools"].as_array().unwrap().iter().any(|t| t["name"] == "lms_grades"));
    assert!(v[2]["result"]["content"][0]["text"].as_str().unwrap().contains("agentica"));
    assert!(v[3]["result"]["content"][0]["text"].as_str().unwrap().contains("q1"));
    assert_eq!(lms.questions.lock().unwrap()[0]["code_ref"]["path"], "a.go");
}
