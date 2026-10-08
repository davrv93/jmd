//! Herramientas propias del agente, como las de OpenCode: ejecutar comandos y leer, escribir y
//! listar archivos. No dependen de ningún servidor MCP. Las que cambian algo piden confirmación
//! (salvo con /auto o «siempre»).

use serde_json::{json, Value};
use std::path::PathBuf;
use std::time::Duration;

/// Tope de salida que se le devuelve al modelo (el resto se resume).
const MAX_OUT: usize = 16_000;

pub fn shell_name() -> &'static str {
    if cfg!(windows) { "PowerShell" } else { "sh" }
}

pub fn defs() -> Vec<Value> {
    vec![
        json!({"type": "function", "function": {
            "name": "shell",
            "description": format!("Ejecuta un comando en {} y devuelve su salida (stdout y stderr) y el código de salida. \
                No es interactivo: usa siempre las opciones que evitan preguntas (--no-interaction, --defaults, -y…). \
                Para crear o editar archivos usa write_file, no echo ni heredocs.", shell_name()),
            "parameters": {"type": "object", "properties": {
                "command": {"type": "string"},
                "cwd": {"type": "string", "description": "Carpeta donde ejecutarlo (admite ~). Por defecto, la actual"},
                "timeout": {"type": "integer", "description": "Segundos (por defecto 120, máximo 900)"},
            }, "required": ["command"]},
        }}),
        json!({"type": "function", "function": {
            "name": "write_file",
            "description": "Crea o sobrescribe un archivo con el contenido dado (crea las carpetas que falten). Admite ~.",
            "parameters": {"type": "object", "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
            }, "required": ["path", "content"]},
        }}),
        json!({"type": "function", "function": {
            "name": "read_file",
            "description": "Lee un archivo de texto (hasta 2000 líneas desde `offset`). Admite ~.",
            "parameters": {"type": "object", "properties": {
                "path": {"type": "string"},
                "offset": {"type": "integer", "description": "Primera línea (desde 1)"},
            }, "required": ["path"]},
        }}),
        json!({"type": "function", "function": {
            "name": "list_dir",
            "description": "Lista una carpeta (las subcarpetas terminan en /). Admite ~.",
            "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]},
        }}),
    ]
}

pub fn is_builtin(name: &str) -> bool {
    matches!(name, "shell" | "write_file" | "read_file" | "list_dir")
}

/// ¿Hace falta confirmar? Leer no cambia nada.
pub fn needs_confirm(name: &str) -> bool {
    matches!(name, "shell" | "write_file")
}

/// `~` y `~/…` → la carpeta personal; lo relativo, desde la carpeta actual.
pub fn expand(p: &str) -> PathBuf {
    let home = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(PathBuf::from);
    let p = p.trim();
    let path = match (p, &home) {
        ("~", Some(h)) => h.clone(),
        (s, Some(h)) if s.starts_with("~/") || s.starts_with("~\\") => h.join(&s[2..]),
        (s, _) => PathBuf::from(s),
    };
    if path.is_absolute() { path } else { std::env::current_dir().unwrap_or_default().join(path) }
}

/// Una línea con lo esencial de la llamada, para mostrarla en la terminal.
pub fn describe(name: &str, args: &Value) -> String {
    let s = |k: &str| args[k].as_str().unwrap_or("").to_string();
    match name {
        "shell" => {
            let cwd = s("cwd");
            if cwd.is_empty() { s("command") } else { format!("(en {cwd}) {}", s("command")) }
        }
        "write_file" => format!("{} ({} líneas)", s("path"), s("content").lines().count()),
        _ => s("path"),
    }
}

/// Ejecuta una herramienta propia. Devuelve (texto para el modelo, ¿error?).
pub async fn run(name: &str, args: &Value) -> (String, bool) {
    match name {
        "shell" => shell(args).await,
        "write_file" => {
            let path = expand(args["path"].as_str().unwrap_or(""));
            let content = args["content"].as_str().unwrap_or("");
            let r = (|| -> std::io::Result<bool> {
                if let Some(dir) = path.parent() {
                    std::fs::create_dir_all(dir)?;
                }
                let existed = path.exists();
                std::fs::write(&path, content)?;
                Ok(existed)
            })();
            match r {
                Ok(existed) => (format!("{} {} ({} bytes)", if existed { "Sobrescrito" } else { "Creado" },
                    path.display(), content.len()), false),
                Err(e) => (format!("No se pudo escribir {}: {e}", path.display()), true),
            }
        }
        "read_file" => {
            let path = expand(args["path"].as_str().unwrap_or(""));
            match std::fs::read_to_string(&path) {
                Ok(t) => {
                    let from = args["offset"].as_u64().unwrap_or(1).max(1) as usize;
                    let total = t.lines().count();
                    let mut out: String = t.lines().enumerate().skip(from - 1).take(2000)
                        .map(|(i, l)| format!("{:>5}  {l}\n", i + 1)).collect();
                    if from - 1 + 2000 < total {
                        out.push_str(&format!("… ({total} líneas; sigue con offset {})\n", from + 2000));
                    }
                    (clip(&out), false)
                }
                Err(e) => (format!("No se pudo leer {}: {e}", path.display()), true),
            }
        }
        "list_dir" => {
            let path = expand(args["path"].as_str().unwrap_or("."));
            match std::fs::read_dir(&path) {
                Ok(rd) => {
                    let mut items: Vec<String> = rd.flatten().map(|e| {
                        let n = e.file_name().to_string_lossy().to_string();
                        if e.path().is_dir() { format!("{n}/") } else { n }
                    }).collect();
                    items.sort();
                    let n = items.len();
                    items.truncate(500);
                    let mut out = format!("{} ({n} elementos)\n{}", path.display(), items.join("\n"));
                    if n > 500 {
                        out.push_str("\n…");
                    }
                    (out, false)
                }
                Err(e) => (format!("No se pudo listar {}: {e}", path.display()), true),
            }
        }
        _ => (format!("herramienta desconocida {name}"), true),
    }
}

async fn shell(args: &Value) -> (String, bool) {
    let command = args["command"].as_str().unwrap_or("").trim();
    if command.is_empty() {
        return ("Falta `command`".into(), true);
    }
    let cwd = match args["cwd"].as_str().filter(|c| !c.trim().is_empty()) {
        Some(c) => expand(c),
        None => std::env::current_dir().unwrap_or_default(),
    };
    if !cwd.is_dir() {
        return (format!("La carpeta {} no existe. Créala antes (p. ej. con mkdir) o usa otra.", cwd.display()), true);
    }
    let secs = args["timeout"].as_u64().unwrap_or(120).clamp(1, 900);
    let mut cmd = if cfg!(windows) {
        let mut c = tokio::process::Command::new("powershell");
        c.args(["-NoProfile", "-NonInteractive", "-Command", command]);
        c
    } else {
        let mut c = tokio::process::Command::new("sh");
        c.args(["-c", command]);
        c
    };
    cmd.current_dir(&cwd).stdin(std::process::Stdio::null()).kill_on_drop(true)
        // Que las herramientas no se queden esperando respuesta ni pinten colores.
        .env("CI", "1").env("NO_COLOR", "1").env("GIT_TERMINAL_PROMPT", "0");
    let fut = cmd.output();
    match tokio::time::timeout(Duration::from_secs(secs), fut).await {
        Err(_) => (format!("Se cortó a los {secs} s (timeout). Si el comando es largo, sube `timeout`; \
            si esperaba una respuesta, usa sus opciones no interactivas."), true),
        Ok(Err(e)) => (format!("No se pudo ejecutar en {}: {e}", cwd.display()), true),
        Ok(Ok(out)) => {
            let mut text = String::from_utf8_lossy(&out.stdout).to_string();
            let err = String::from_utf8_lossy(&out.stderr);
            if !err.trim().is_empty() {
                if !text.is_empty() && !text.ends_with('\n') {
                    text.push('\n');
                }
                text.push_str(&err);
            }
            let code = out.status.code().map(|c| c.to_string()).unwrap_or_else(|| "señal".into());
            let ok = out.status.success();
            (format!("código de salida: {code}\n{}", clip(&text)), !ok)
        }
    }
}

/// Recorta salidas largas dejando el principio y el final, que es donde suele estar lo útil.
pub fn clip(t: &str) -> String {
    if t.len() <= MAX_OUT {
        return t.to_string();
    }
    let head: String = t.chars().take(MAX_OUT / 4).collect();
    let tail_chars: Vec<char> = t.chars().rev().take(MAX_OUT * 3 / 4).collect();
    let tail: String = tail_chars.into_iter().rev().collect();
    format!("{head}\n… ({} caracteres omitidos) …\n{tail}", t.chars().count() - head.chars().count() - tail.chars().count())
}

/// Primera línea útil del resultado, para la terminal.
pub fn preview(text: &str) -> String {
    let lines: Vec<&str> = text.lines().map(str::trim).filter(|l| !l.is_empty() && !l.starts_with("código de salida")).collect();
    let first: String = lines.first().copied().unwrap_or("(sin salida)").chars().take(110).collect();
    if lines.len() > 1 { format!("{first} … (+{} líneas)", lines.len() - 1) } else { first }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn shell_write_read_list() {
        let dir = std::env::temp_dir().join(format!("jmd-tools-{}", uuid::Uuid::new_v4().simple()));
        let f = dir.join("a/b/hola.txt");
        let (r, err) = run("write_file", &json!({"path": f.to_string_lossy(), "content": "uno\ndos\n"})).await;
        assert!(!err && r.starts_with("Creado"), "{r}");
        let (r, err) = run("read_file", &json!({"path": f.to_string_lossy()})).await;
        assert!(!err && r.contains("    2  dos"), "{r}");
        let (r, _) = run("list_dir", &json!({"path": dir.join("a").to_string_lossy()})).await;
        assert!(r.contains("b/"), "{r}");
        let cmd = if cfg!(windows) { "Write-Output hola; exit 3" } else { "echo hola; exit 3" };
        let (r, err) = run("shell", &json!({"command": cmd, "cwd": dir.to_string_lossy()})).await;
        assert!(err && r.contains("código de salida: 3") && r.contains("hola"), "{r}");
        let (r, err) = run("shell", &json!({"command": "echo x", "cwd": dir.join("no-existe").to_string_lossy()})).await;
        assert!(err && r.contains("no existe"), "{r}");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn clips_and_previews() {
        let long = "x".repeat(MAX_OUT * 2);
        assert!(clip(&long).contains("omitidos"));
        assert_eq!(preview("código de salida: 0\nlinea1\nlinea2\n"), "linea1 … (+1 líneas)");
        assert_eq!(preview(""), "(sin salida)");
    }
}
