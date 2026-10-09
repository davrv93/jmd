//! Skills: instrucciones empaquetadas que el modelo carga cuando las necesita.
//!
//! Mismo formato que Claude Code: una carpeta con `SKILL.md`, cuya cabecera YAML trae `name`
//! y `description`. Se buscan en (gana la primera con ese nombre):
//! 1. `.claude/skills/*/SKILL.md` del proyecto
//! 2. `~/.config/jmd/skills/*/SKILL.md`
//! 3. `~/.claude/skills/*/SKILL.md`
//! 4. Las incluidas en jmd (`prototipo`)
//!
//! El modelo ve la lista (nombre y descripción) en el mensaje de sistema y carga el cuerpo con
//! la herramienta `load_skill`. El prototipado tiene además `save_prototype`, que guarda el HTML
//! en `./prototipos/` y lo abre en el navegador.

use serde_json::{json, Value};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub body: String,
    pub source: String,
}

pub const PROTOTIPO: &str = r#"---
name: prototipo
description: Prototipos y mockups de interfaz (pantallas, dashboards, formularios, landing pages, flujos) como un solo archivo HTML que se abre en el navegador. Úsala cuando pidan diseñar, maquetar, bocetar o prototipar una UI.
---
# Prototipos de UI

Entregas UN archivo HTML autocontenido con `save_prototype` (nombre corto en minúsculas con
guiones, p. ej. `panel-alumnos`). Luego dices en dos líneas qué hiciste y qué se puede iterar.
Para iterar, vuelves a guardar con el mismo nombre (se sobrescribe).

## Reglas técnicas
- Un solo archivo: CSS en `<style>`, JS en `<script>`. Sin build. Si hace falta, solo CDNs con
  versión fija (p. ej. `https://cdn.jsdelivr.net/npm/chart.js@4.4.1`). Nada de imágenes externas:
  usa SVG inline, gradientes o iniciales.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` y un `<title>` corto.
- Colores como variables en `:root` y su versión oscura en
  `@media (prefers-color-scheme: dark)`. Fondo explícito en `body`.
- Debe verse bien desde 360 px de ancho (sin scroll horizontal) hasta escritorio.
- Accesible: contraste AA, `<button>` para acciones, `<label>` en cada campo, foco visible.

## Diseño
- Primero la jerarquía: qué ve la persona primero, qué hace después. Una acción principal por
  pantalla.
- Tipografía del sistema (`system-ui`), escala clara (12/14/16/20/28), espaciado en múltiplos
  de 4. Bordes sutiles y radios coherentes; sombras mínimas.
- Contenido realista en español: nombres, fechas, cifras y textos creíbles del dominio. Nunca
  «Lorem ipsum» ni «Item 1».
- Incluye los estados que importan: vacío, cargando, error, éxito. Muéstralos con un selector
  de estado o datos de ejemplo.
- Interacción con JS sencillo: pestañas, modales, filtros y formularios que respondan (validación
  y mensajes), aunque los datos sean de ejemplo.
- Si es un flujo de varias pantallas, ponlas en un mismo archivo con navegación (pestañas o
  `#hash`).

## Proceso
1. Si falta algo esencial (para quién es, qué tarea principal), pregunta UNA vez; si no, decide
   con criterio y dilo.
2. Guarda con `save_prototype`.
3. Resume: qué pantallas y estados hay, y 2-3 ideas para iterar.
"#;

fn parse(text: &str, source: &str, fallback_name: &str) -> Option<Skill> {
    let rest = text.strip_prefix("---")?;
    let end = rest.find("\n---")?;
    let header = &rest[..end];
    let body = rest[end + 4..].trim_start_matches(['-', '\n', '\r']).trim().to_string();
    let field = |k: &str| header.lines().find_map(|l| {
        l.trim().strip_prefix(&format!("{k}:")).map(|v| v.trim().trim_matches('"').trim_matches('\'').to_string())
    });
    Some(Skill {
        name: field("name").filter(|n| !n.is_empty()).unwrap_or_else(|| fallback_name.to_string()),
        description: field("description").unwrap_or_default(),
        body,
        source: source.to_string(),
    })
}

fn from_dir(dir: &Path, source: &str, out: &mut Vec<Skill>) {
    let Ok(rd) = std::fs::read_dir(dir) else { return };
    let mut entries: Vec<PathBuf> = rd.flatten().map(|e| e.path()).filter(|p| p.is_dir()).collect();
    entries.sort();
    for d in entries {
        let fallback = d.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
        if let Some(s) = std::fs::read_to_string(d.join("SKILL.md")).ok().and_then(|t| parse(&t, source, &fallback)) {
            if !out.iter().any(|o| o.name == s.name) {
                out.push(s);
            }
        }
    }
}

pub fn discover(cwd: &Path) -> Vec<Skill> {
    let home = crate::client::home();
    let mut out = vec![];
    from_dir(&cwd.join(".claude").join("skills"), "proyecto", &mut out);
    from_dir(&cwd.join("skills"), "proyecto (skills/)", &mut out);
    from_dir(&crate::client::config_path().with_file_name("skills"), "jmd", &mut out);
    from_dir(&home.join(".claude").join("skills"), "Claude Code", &mut out);
    if let Some(s) = parse(PROTOTIPO, "incluida", "prototipo") {
        if !out.iter().any(|o| o.name == s.name) {
            out.push(s);
        }
    }
    out
}

/// Lo que va en el mensaje de sistema: qué skills hay y cómo cargarlas.
pub fn system_section(skills: &[Skill]) -> String {
    if skills.is_empty() {
        return String::new();
    }
    let mut s = String::from("\n\nSkills disponibles (carga la que encaje con load_skill ANTES de hacer la tarea):\n");
    for k in skills {
        let d: String = k.description.chars().take(300).collect();
        s.push_str(&format!("- {}: {d}\n", k.name));
    }
    s
}

pub fn tools() -> Vec<Value> {
    vec![
        json!({"type": "function", "function": {
            "name": "load_skill",
            "description": "Carga las instrucciones completas de una skill de la lista del mensaje de sistema.",
            "parameters": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]},
        }}),
        json!({"type": "function", "function": {
            "name": "save_prototype",
            "description": "Guarda un prototipo de UI (un archivo HTML completo) en ./prototipos/<name>.html y lo abre en el navegador. Con el mismo nombre se sobrescribe.",
            "parameters": {"type": "object", "properties": {
                "name": {"type": "string", "description": "Nombre corto en minúsculas con guiones"},
                "html": {"type": "string", "description": "El documento HTML completo"},
            }, "required": ["name", "html"]},
        }}),
    ]
}

pub fn slug(name: &str) -> String {
    let s: String = name.to_lowercase().chars()
        .map(|c| match c {
            'á' | 'à' | 'ä' => 'a', 'é' | 'è' | 'ë' => 'e', 'í' | 'ì' | 'ï' => 'i',
            'ó' | 'ò' | 'ö' => 'o', 'ú' | 'ù' | 'ü' => 'u', 'ñ' => 'n',
            c if c.is_ascii_alphanumeric() => c,
            _ => '-',
        }).collect();
    let s = s.split('-').filter(|p| !p.is_empty()).collect::<Vec<_>>().join("-");
    let s: String = s.chars().take(60).collect();
    if s.is_empty() { "prototipo".into() } else { s }
}

/// Guarda el HTML y devuelve la ruta. Abre el navegador la primera vez que se crea el archivo.
pub fn save_prototype(dir: &Path, name: &str, html: &str, open: bool) -> anyhow::Result<(PathBuf, bool)> {
    let html = html.trim();
    if !(html.to_lowercase().contains("<html") || html.to_lowercase().starts_with("<!doctype")) {
        anyhow::bail!("el contenido no parece un documento HTML completo (falta <html>)");
    }
    std::fs::create_dir_all(dir)?;
    let path = dir.join(format!("{}.html", slug(name)));
    let existed = path.exists();
    std::fs::write(&path, html)?;
    if open && !existed {
        open_in_browser(&path);
    }
    Ok((path, existed))
}

pub fn open_in_browser(path: &Path) {
    let target = path.to_string_lossy().to_string();
    let _ = if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(&target).spawn()
    } else if cfg!(windows) {
        std::process::Command::new("cmd").args(["/C", "start", "", &target]).spawn()
    } else if std::env::var_os("WSL_DISTRO_NAME").is_some() {
        // En WSL, el navegador está en Windows.
        std::process::Command::new("wslview").arg(&target).spawn()
            .or_else(|_| std::process::Command::new("explorer.exe").arg(&target).spawn())
    } else {
        std::process::Command::new("xdg-open").arg(&target).spawn()
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builtin_skill_parses() {
        let s = parse(PROTOTIPO, "incluida", "x").unwrap();
        assert_eq!(s.name, "prototipo");
        assert!(s.description.contains("mockups"));
        assert!(s.body.starts_with("# Prototipos de UI"));
    }

    #[test]
    fn skill_from_claude_format() {
        let t = "---\nname: \"diseño\"\ndescription: Guía de diseño\n---\n\nCuerpo";
        let s = parse(t, "p", "dir").unwrap();
        assert_eq!((s.name.as_str(), s.description.as_str(), s.body.as_str()), ("diseño", "Guía de diseño", "Cuerpo"));
        let t = "---\ndescription: sin nombre\n---\nB";
        assert_eq!(parse(t, "p", "carpeta").unwrap().name, "carpeta");
        assert!(parse("sin cabecera", "p", "x").is_none());
    }

    #[test]
    fn slugs_and_saving() {
        assert_eq!(slug("Panel de Alumnos (v2)"), "panel-de-alumnos-v2");
        assert_eq!(slug("Diseño ñandú"), "diseno-nandu");
        let dir = std::env::temp_dir().join(format!("jmd-proto-{}", std::process::id()));
        assert!(save_prototype(&dir, "x", "hola", false).is_err());
        let (p, existed) = save_prototype(&dir, "Mi Panel", "<!doctype html><html><body>hi</body></html>", false).unwrap();
        assert!(p.ends_with("mi-panel.html") && !existed);
        let (_, existed) = save_prototype(&dir, "Mi Panel", "<html></html>", false).unwrap();
        assert!(existed);
        let _ = std::fs::remove_dir_all(dir);
    }
}
