//! El gateway local: `ai-orchestrator` corriendo en segundo plano en esta máquina.
//!
//! Vive en una carpeta de datos por sistema (config.yaml con las claves, admin_token,
//! telemetry.db, gateway.log, jmd-gateway.json con el PID y el puerto):
//!
//! | Sistema | Carpeta |
//! |---|---|
//! | macOS | `~/Library/Application Support/jmd/gateway` |
//! | Linux / WSL | `~/.local/share/jmd/gateway` (o `$XDG_DATA_HOME/jmd/gateway`) |
//! | Windows | `%LOCALAPPDATA%\jmd\gateway` |
//!
//! Escucha solo en 127.0.0.1. Sigue corriendo aunque se cierre la terminal.

use crate::client::home;
use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

pub const DEFAULT_PORT: u16 = 4000;

pub fn data_dir() -> PathBuf {
    if let Some(d) = std::env::var_os("JMD_GATEWAY_DIR") {
        return d.into();
    }
    let base = if cfg!(windows) {
        std::env::var_os("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|| home().join("AppData").join("Local"))
    } else if cfg!(target_os = "macos") {
        home().join("Library").join("Application Support")
    } else {
        std::env::var_os("XDG_DATA_HOME").map(PathBuf::from).unwrap_or_else(|| home().join(".local").join("share"))
    };
    base.join("jmd").join("gateway")
}

/// `ai-orchestrator` junto a `jmd` (así lo deja el instalador) o en el PATH.
pub fn binary() -> Option<PathBuf> {
    let name = if cfg!(windows) { "ai-orchestrator.exe" } else { "ai-orchestrator" };
    if let Some(dir) = std::env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf)) {
        let p = dir.join(name);
        if p.is_file() {
            return Some(p);
        }
    }
    crate::setup::which("ai-orchestrator")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct State {
    pub pid: u32,
    pub port: u16,
}

fn state_path(dir: &Path) -> PathBuf {
    dir.join("jmd-gateway.json")
}

pub fn log_path(dir: &Path) -> PathBuf {
    dir.join("gateway.log")
}

pub fn read_state(dir: &Path) -> Option<State> {
    serde_json::from_str(&std::fs::read_to_string(state_path(dir)).ok()?).ok()
}

pub fn token_path(dir: &Path) -> PathBuf {
    dir.join("admin_token")
}

pub fn read_token(dir: &Path) -> Option<String> {
    std::fs::read_to_string(token_path(dir)).ok().map(|t| t.trim().to_string()).filter(|t| !t.is_empty())
}

#[cfg(unix)]
fn private(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600));
}
#[cfg(not(unix))]
fn private(_: &Path) {}

pub fn write_private(path: &Path, content: &str) -> Result<()> {
    if let Some(d) = path.parent() {
        std::fs::create_dir_all(d)?;
    }
    std::fs::write(path, content).with_context(|| format!("no se pudo escribir {}", path.display()))?;
    private(path);
    Ok(())
}

/// El token de administración del gateway local; lo crea la primera vez.
pub fn ensure_token(dir: &Path) -> Result<String> {
    if let Some(t) = read_token(dir) {
        return Ok(t);
    }
    let t = format!("{}{}", uuid::Uuid::new_v4().simple(), uuid::Uuid::new_v4().simple());
    write_private(&token_path(dir), &t)?;
    Ok(t)
}

pub fn alive(pid: u32) -> bool {
    if cfg!(windows) {
        Command::new("tasklist").args(["/FI", &format!("PID eq {pid}"), "/NH"]).output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
            .unwrap_or(false)
    } else {
        Command::new("kill").args(["-0", &pid.to_string()]).stderr(Stdio::null()).status()
            .map(|s| s.success()).unwrap_or(false)
    }
}

pub fn port_free(port: u16) -> bool {
    std::net::TcpListener::bind(("127.0.0.1", port)).is_ok()
}

/// Primer puerto libre desde `from` (hasta 20 más).
pub fn free_port(from: u16) -> Option<u16> {
    (from..from.saturating_add(20)).find(|p| port_free(*p))
}

pub async fn healthy(port: u16) -> bool {
    let client = reqwest::Client::new();
    client.get(format!("http://127.0.0.1:{port}/health")).timeout(Duration::from_secs(2)).send().await
        .map(|r| r.status().is_success()).unwrap_or(false)
}

/// ¿Está corriendo el gateway local? Devuelve su estado si el proceso vive.
pub fn running(dir: &Path) -> Option<State> {
    read_state(dir).filter(|s| alive(s.pid))
}

/// Arranca el gateway en segundo plano y espera a que responda.
pub async fn start(dir: &Path, port: u16) -> Result<State> {
    let bin = binary().context("no encuentro `ai-orchestrator` (el gateway). Reinstala con el instalador de jmd")?;
    std::fs::create_dir_all(dir)?;
    let log = std::fs::OpenOptions::new().create(true).append(true).open(log_path(dir))
        .with_context(|| format!("no se pudo abrir {}", log_path(dir).display()))?;
    let mut cmd = Command::new(&bin);
    cmd.current_dir(dir)
        .env("DATA_DIR", dir)
        .env("HOST", "127.0.0.1")
        .env("PORT", port.to_string())
        .env("RUST_LOG", "info")
        // Lo que haya en la terminal no debe pisar lo guardado por `jmd init`.
        .env_remove("ADMIN_TOKEN")
        .env_remove("CONFIG_SEED")
        .stdin(Stdio::null())
        .stdout(log.try_clone()?)
        .stderr(log);
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0); // que cerrar la terminal no lo detenga
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;
        cmd.creation_flags(CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP);
    }
    let child = cmd.spawn().with_context(|| format!("no se pudo ejecutar {}", bin.display()))?;
    let state = State { pid: child.id(), port };
    write_private(&state_path(dir), &serde_json::to_string(&state)?)?;
    let t0 = Instant::now();
    while t0.elapsed() < Duration::from_secs(15) {
        if healthy(port).await {
            return Ok(state);
        }
        if !alive(state.pid) {
            break;
        }
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
    let tail = tail(dir, 15);
    bail!("el gateway no arrancó. Últimas líneas de {}:\n{tail}", log_path(dir).display())
}

pub async fn stop(dir: &Path) -> Result<bool> {
    let Some(s) = running(dir) else {
        let _ = std::fs::remove_file(state_path(dir));
        return Ok(false);
    };
    if cfg!(windows) {
        Command::new("taskkill").args(["/PID", &s.pid.to_string(), "/F"]).stdout(Stdio::null()).status()?;
    } else {
        Command::new("kill").args(["-TERM", &s.pid.to_string()]).status()?;
    }
    let t0 = Instant::now();
    while alive(s.pid) && t0.elapsed() < Duration::from_secs(8) {
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
    let _ = std::fs::remove_file(state_path(dir));
    Ok(true)
}

pub fn tail(dir: &Path, n: usize) -> String {
    let text = std::fs::read_to_string(log_path(dir)).unwrap_or_default();
    let lines: Vec<&str> = text.lines().collect();
    lines[lines.len().saturating_sub(n)..].join("\n")
}
