//! Los comandos del LMS (contrato 2.3): cursos, sesiones, materiales, tareas, entregas, notas y
//! preguntas, contra `/api/v1` con la cuenta de `jmd login`.

use crate::out::{bold, cyan, dim, green, red, table, yellow};
use crate::sso::Tokens;
use anyhow::{anyhow, bail, Context, Result};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::time::Duration;

pub struct Lms {
    pub url: String,
    token: String,
    http: reqwest::Client,
}

impl Lms {
    /// Con la sesión guardada: el token local del LMS, o el access token del SSO (refrescado).
    pub async fn from_tokens(t: &Tokens) -> Result<Self> {
        let url = t.lms_url.clone().context("no sé cuál es tu LMS: `jmd login --sso --lms https://…`")?;
        let token = match &t.lms_token {
            Some(k) => k.clone(),
            None => crate::sso::fresh_access_token().await?.context("no has entrado: `jmd login --sso`")?,
        };
        Ok(Self::new(url, token))
    }

    pub async fn connect() -> Result<Self> {
        Self::from_tokens(&Tokens::load()).await
    }

    pub fn new(url: String, token: String) -> Self {
        let http = reqwest::Client::builder().user_agent(concat!("jmd/", env!("CARGO_PKG_VERSION")))
            .connect_timeout(Duration::from_secs(10)).timeout(Duration::from_secs(60)).build().expect("http");
        Self { url: url.trim_end_matches('/').to_string(), token, http }
    }

    async fn check(r: reqwest::Response) -> Result<Value> {
        let status = r.status();
        let text = r.text().await.unwrap_or_default();
        let v: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
        if !status.is_success() {
            let msg = v["error"]["message"].as_str().unwrap_or(if text.is_empty() { "error" } else { &text });
            if status.as_u16() == 401 {
                bail!("{msg} (HTTP 401): vuelve a entrar con `jmd login --sso`");
            }
            bail!("{msg} (HTTP {status})");
        }
        Ok(v)
    }

    pub async fn get(&self, path: &str) -> Result<Value> {
        let r = self.http.get(format!("{}/api/v1{path}", self.url)).bearer_auth(&self.token).send().await
            .with_context(|| format!("no se pudo llegar al LMS {}", self.url))?;
        Self::check(r).await
    }

    pub async fn post(&self, path: &str, body: &Value) -> Result<Value> {
        let r = self.http.post(format!("{}/api/v1{path}", self.url)).bearer_auth(&self.token).json(body).send().await
            .with_context(|| format!("no se pudo llegar al LMS {}", self.url))?;
        Self::check(r).await
    }

    /// Descarga un archivo del LMS (con sesión) o de una URL externa.
    async fn download(&self, url: &str, to: &Path) -> Result<u64> {
        let full = if url.starts_with('/') { format!("{}{url}", self.url) } else { url.to_string() };
        let mut req = self.http.get(&full);
        if full.starts_with(&self.url) {
            req = req.bearer_auth(&self.token);
        }
        let r = req.send().await?.error_for_status().with_context(|| format!("descargar {full}"))?;
        let bytes = r.bytes().await?;
        if let Some(d) = to.parent() {
            std::fs::create_dir_all(d)?;
        }
        std::fs::write(to, &bytes)?;
        Ok(bytes.len() as u64)
    }
}

fn s(v: &Value, k: &str) -> String {
    match &v[k] {
        Value::String(x) => x.clone(),
        Value::Null => String::new(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        x => x.to_string(),
    }
}

fn print_json(v: &Value) {
    println!("{}", serde_json::to_string_pretty(v).unwrap_or_default());
}

/// La fecha ISO en corto («2026-10-15 19:00»).
fn when(v: &Value) -> String {
    match v.as_str() {
        Some(x) if x.len() >= 16 => x[..16].replace('T', " "),
        Some(x) => x.to_string(),
        None => String::new(),
    }
}

// ---------------------------------------------------------------------------
// Cursos y sesiones
// ---------------------------------------------------------------------------

pub async fn courses(as_json: bool) -> Result<()> {
    let l = Lms::connect().await?;
    let v = l.get("/courses").await?;
    if as_json {
        print_json(&v);
        return Ok(());
    }
    let rows: Vec<Vec<String>> = v.as_array().into_iter().flatten()
        .map(|c| vec![s(c, "id"), s(c, "title"), s(c, "role")]).collect();
    if rows.is_empty() {
        println!("{}", dim("no estás en ningún curso"));
        return Ok(());
    }
    table(&["id", "curso", "rol"], &rows);
    println!("{}", dim("jmd course <id> · jmd assignments --course <id>"));
    Ok(())
}

pub async fn course(id: &str, as_json: bool) -> Result<()> {
    let l = Lms::connect().await?;
    let v = l.get(&format!("/courses/{id}")).await?;
    if as_json {
        print_json(&v);
        return Ok(());
    }
    println!("{}", bold(&s(&v, "title")));
    for m in v["modules"].as_array().into_iter().flatten() {
        println!("\n{}", cyan(&s(m, "title")));
        for le in m["lessons"].as_array().into_iter().flatten() {
            let mark = if le["published"].as_bool() == Some(false) { yellow("borrador") } else { String::new() };
            println!("  {}  {}  {} {mark}", dim(&s(le, "id")), s(le, "title"), dim(&when(&le["starts_at"])));
        }
    }
    println!("\n{}", dim("jmd lesson <id> · jmd lesson open <id>"));
    Ok(())
}

pub async fn lesson(id: &str, as_json: bool) -> Result<()> {
    let l = Lms::connect().await?;
    let v = l.get(&format!("/lessons/{id}")).await?;
    if as_json {
        print_json(&v);
        return Ok(());
    }
    println!("{} {}", bold(&s(&v, "title")), dim(&when(&v["starts_at"])));
    let obj = v["objectives"].as_array().cloned().unwrap_or_default();
    if !obj.is_empty() {
        println!("\n{}", cyan("Objetivos"));
        for o in &obj {
            println!("  {} {}", dim(&s(o, "id")), s(o, "title"));
        }
    }
    if v["recording"].is_object() {
        let r = &v["recording"];
        println!("\n{} {}{}", cyan("Grabación"), s(r, "url"),
            r["passcode"].as_str().map(|p| format!("  {}", dim(&format!("(clave: {p})")))).unwrap_or_default());
    }
    if v["repo"].is_object() {
        println!("\n{} {} {}", cyan("Repositorio"), s(&v["repo"], "url"), dim(&format!("@{}", s(&v["repo"], "ref"))));
    }
    let mats = v["materials"].as_array().cloned().unwrap_or_default();
    if !mats.is_empty() {
        println!("\n{}", cyan("Materiales"));
        for m in &mats {
            println!("  {} {} {} {}", dim(&s(m, "id")), s(m, "title"), dim(&format!("[{}]", s(m, "kind"))), dim(&s(m, "url")));
        }
    }
    let asg = v["assignments"].as_array().cloned().unwrap_or_default();
    if !asg.is_empty() {
        println!("\n{}", cyan("Tareas"));
        for a in &asg {
            println!("  {} {} {} {}", dim(&s(a, "id")), s(a, "title"), dim(&when(&a["due_at"])), status_mark(&s(a, "status")));
        }
    }
    if let Some(p) = v["progress"].as_object() {
        println!("\n{} {}/{}", dim("ciclo de aprendizaje:"), p.get("done").and_then(Value::as_u64).unwrap_or(0),
            p.get("total").and_then(Value::as_u64).unwrap_or(0));
    }
    println!("\n{}", dim(&format!("{}   (clona el repo y baja los materiales)", s(&v, "open_command"))));
    Ok(())
}

fn status_mark(st: &str) -> String {
    match st {
        "graded" => green("calificada"),
        "overdue" => red("vencida"),
        "queued" | "running" => yellow("entregada"),
        "failed" => red("falló"),
        "" => String::new(),
        o => dim(o),
    }
}

fn run_git(args: &[&str], cwd: Option<&Path>) -> Result<String> {
    let mut c = std::process::Command::new("git");
    c.args(args).env("GIT_TERMINAL_PROMPT", "0");
    if let Some(d) = cwd {
        c.current_dir(d);
    }
    let out = c.output().with_context(|| "no se pudo ejecutar git (¿está instalado?)")?;
    if !out.status.success() {
        bail!("git {}: {}", args.join(" "), String::from_utf8_lossy(&out.stderr).trim());
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

fn repo_dir_name(url: &str) -> String {
    let last = url.trim_end_matches('/').rsplit('/').next().unwrap_or("repo");
    let name = last.trim_end_matches(".git");
    if name.is_empty() { "repo".into() } else { name.to_string() }
}

/// `jmd lesson open <id>`: clona el repo en la ref de la sesión y baja los materiales a ./materiales/.
pub async fn lesson_open(id: &str) -> Result<()> {
    let l = Lms::connect().await?;
    let v = l.get(&format!("/lessons/{id}")).await?;
    println!("{}", bold(&s(&v, "title")));
    if v["repo"].is_object() {
        let url = s(&v["repo"], "url");
        let r = s(&v["repo"], "ref");
        let dir = PathBuf::from(repo_dir_name(&url));
        if dir.join(".git").is_dir() {
            println!("{} {} ya está clonado; actualizo", dim("·"), dir.display());
            let _ = run_git(&["fetch", "--all", "--quiet"], Some(&dir));
        } else {
            print!("{} git clone {url} → {}… ", dim("·"), dir.display());
            run_git(&["clone", "--quiet", &url, &dir.to_string_lossy()], None)?;
            println!("{}", green("✓"));
        }
        if !r.is_empty() {
            match run_git(&["checkout", "--quiet", &r], Some(&dir)) {
                Ok(_) => println!("{} en la ref {}", green("✓"), cyan(&r)),
                Err(e) => println!("{} {e}", yellow("!")),
            }
        }
    } else {
        println!("{}", dim("esta sesión no tiene repositorio"));
    }
    pull_materials(&l, &v, Path::new("materiales")).await?;
    println!("\n{}", dim("jmd lesson <id> para ver objetivos y tareas · jmd submit <tarea> para entregar"));
    Ok(())
}

pub async fn materials_pull(lesson: &str) -> Result<()> {
    let l = Lms::connect().await?;
    let v = l.get(&format!("/lessons/{lesson}")).await?;
    pull_materials(&l, &v, Path::new("materiales")).await
}

async fn pull_materials(l: &Lms, lesson: &Value, dir: &Path) -> Result<()> {
    let mats = lesson["materials"].as_array().cloned().unwrap_or_default();
    if mats.is_empty() {
        println!("{}", dim("sin materiales"));
        return Ok(());
    }
    std::fs::create_dir_all(dir)?;
    let mut links = String::from("# Enlaces de la sesión\n\n");
    let mut files = 0;
    for m in &mats {
        let id = s(m, "id");
        let d = l.get(&format!("/materials/{id}/download")).await;
        let (url, filename) = match &d {
            Ok(d) => (s(d, "url"), s(d, "filename")),
            Err(_) => (s(m, "url"), String::new()),
        };
        let is_file = url.starts_with('/') || (!filename.is_empty() && !matches!(s(m, "kind").as_str(), "link" | "video" | "recording"));
        if is_file && !url.is_empty() {
            let name = if filename.is_empty() { repo_dir_name(&url) } else { filename };
            let to = dir.join(&name);
            match l.download(&url, &to).await {
                Ok(n) => {
                    files += 1;
                    println!("{} {} {}", green("✓"), to.display(), dim(&format!("({n} bytes)")));
                }
                Err(e) => println!("{} {}: {e}", yellow("!"), name),
            }
        } else {
            links.push_str(&format!("- [{}]({url}) ({})\n", s(m, "title"), s(m, "kind")));
        }
    }
    if links.lines().count() > 2 {
        std::fs::write(dir.join("enlaces.md"), &links)?;
        println!("{} {}", green("✓"), dir.join("enlaces.md").display());
    }
    println!("{}", dim(&format!("{files} archivo(s) en {}", dir.display())));
    Ok(())
}

// ---------------------------------------------------------------------------
// Tareas, entregas y notas
// ---------------------------------------------------------------------------

async fn course_ids(l: &Lms, course: Option<&str>) -> Result<Vec<(String, String)>> {
    if let Some(c) = course {
        return Ok(vec![(c.to_string(), String::new())]);
    }
    let v = l.get("/courses").await?;
    Ok(v.as_array().into_iter().flatten().map(|c| (s(c, "id"), s(c, "title"))).collect())
}

pub async fn assignments(course: Option<&str>, as_json: bool) -> Result<()> {
    let l = Lms::connect().await?;
    let mut all = vec![];
    for (id, title) in course_ids(&l, course).await? {
        let v = l.get(&format!("/assignments?course={id}")).await?;
        for a in v.as_array().into_iter().flatten() {
            let mut a = a.clone();
            a["course_id"] = json!(id);
            a["course_title"] = json!(title);
            all.push(a);
        }
    }
    if as_json {
        print_json(&json!(all));
        return Ok(());
    }
    if all.is_empty() {
        println!("{}", dim("no hay tareas"));
        return Ok(());
    }
    let rows: Vec<Vec<String>> = all.iter().map(|a| vec![s(a, "id"), s(a, "title"), when(&a["due_at"]), status_mark(&s(a, "status"))]).collect();
    table(&["id", "tarea", "vence", "estado"], &rows);
    println!("{}", dim("jmd assignment <id> · jmd submit <id>"));
    Ok(())
}

pub async fn assignment(id: &str, as_json: bool) -> Result<()> {
    let l = Lms::connect().await?;
    let v = l.get(&format!("/assignments/{id}")).await?;
    if as_json {
        print_json(&v);
        return Ok(());
    }
    println!("{} {} {}", bold(&s(&v, "title")), dim(&format!("vence {}", when(&v["due_at"]))), status_mark(&s(&v, "status")));
    let desc = s(&v, "description_md");
    if !desc.is_empty() {
        println!("\n{desc}");
    }
    let rubric = v["rubric"].as_array().cloned().unwrap_or_default();
    if !rubric.is_empty() {
        println!("\n{}", cyan("Rúbrica"));
        for r in &rubric {
            let pts = r["points"].as_f64().or(r["max"].as_f64()).map(|p| format!(" ({p} pts)")).unwrap_or_default();
            println!("  - {}{}", r["title"].as_str().or(r["criterion"].as_str()).or(r["name"].as_str()).unwrap_or(""), dim(&pts));
        }
    }
    let subs = v["my_submissions"].as_array().cloned().unwrap_or_default();
    if !subs.is_empty() {
        println!("\n{}", cyan("Mis entregas"));
        for su in &subs {
            println!("  {} {} {} {}", dim(&s(su, "id")), status_mark(&s(su, "status")),
                su["score"].as_f64().map(|x| format!("{x}/{}", su["max_score"].as_f64().unwrap_or(0.0))).unwrap_or_default(),
                dim(&s(su, "commit_sha").chars().take(8).collect::<String>()));
        }
    }
    println!("\n{}", dim(&format!("{}   (desde la carpeta de tu repo)", s(&v, "submit_command"))));
    Ok(())
}

fn confirm(q: &str) -> bool {
    use std::io::{BufRead, IsTerminal, Write};
    if !std::io::stdin().is_terminal() {
        return false;
    }
    print!("{q} [s/N]: ");
    let _ = std::io::stdout().flush();
    let mut s = String::new();
    let _ = std::io::stdin().lock().read_line(&mut s);
    matches!(s.trim().to_lowercase().as_str(), "s" | "si" | "sí" | "y" | "yes")
}

/// `jmd submit <tarea>`: manda el origin y el HEAD del repo actual y sigue el estado.
pub async fn submit(id: &str, notes: Option<String>, yes: bool, as_json: bool) -> Result<()> {
    let l = Lms::connect().await?;
    let repo_url = run_git(&["remote", "get-url", "origin"], None)
        .map_err(|e| anyhow!("esta carpeta no es un repo con `origin`: entra en la carpeta de tu proyecto ({e})"))?;
    let sha = run_git(&["rev-parse", "HEAD"], None)?;
    let dirty = run_git(&["status", "--porcelain"], None).map(|o| !o.is_empty()).unwrap_or(false);
    let unpushed = run_git(&["rev-list", "--count", "@{u}..HEAD"], None).ok().and_then(|o| o.parse::<u64>().ok());
    println!("{} {} {}", dim("repo:  "), repo_url, dim(&format!("@ {}", &sha[..8.min(sha.len())])));
    let mut warn = vec![];
    if dirty {
        warn.push("hay cambios sin commit");
    }
    match unpushed {
        Some(n) if n > 0 => warn.push("hay commits sin push: el LMS no los verá"),
        None => warn.push("no sé si está subido (la rama no sigue a ninguna remota)"),
        _ => {}
    }
    for w in &warn {
        println!("{} {w}", yellow("!"));
    }
    if !warn.is_empty() && !yes && !confirm("¿Entregar igual?") {
        bail!("entrega cancelada: haz commit y push, o repite con -y");
    }
    let mut body = json!({"repo_url": repo_url, "commit_sha": sha});
    if let Some(n) = notes {
        body["notes"] = json!(n);
    }
    let r = l.post(&format!("/assignments/{id}/submissions"), &body).await?;
    let sid = s(&r, "id");
    println!("{} entrega {} enviada ({})", green("✓"), sid, s(&r, "status"));
    // Seguir el estado un rato: con runner cambia en segundos; sin él se queda en cola.
    let mut last = r.clone();
    for _ in 0..8 {
        tokio::time::sleep(Duration::from_millis(750)).await;
        last = l.get(&format!("/submissions/{sid}")).await?;
        if matches!(s(&last, "status").as_str(), "graded" | "failed") {
            break;
        }
    }
    if as_json {
        print_json(&last);
        return Ok(());
    }
    match s(&last, "status").as_str() {
        "graded" => {
            println!("{} nota: {}/{}", green("✓"), last["score"].as_f64().unwrap_or(0.0), last["max_score"].as_f64().unwrap_or(0.0));
            if let Some(f) = last["feedback_md"].as_str().filter(|f| !f.is_empty()) {
                println!("{f}");
            }
        }
        "failed" => println!("{} la revisión falló: {}", red("✗"), s(&last, "feedback_md")),
        st => println!("{} estado: {st} · la nota saldrá en `jmd grades`", dim("·")),
    }
    for c in last["checks"].as_array().into_iter().flatten() {
        let ok = c["ok"].as_bool().or(c["passed"].as_bool()).unwrap_or(false);
        println!("  {} {}", if ok { green("✓") } else { red("✗") }, c["name"].as_str().or(c["title"].as_str()).unwrap_or(""));
    }
    Ok(())
}

pub async fn grades(course: Option<&str>, as_json: bool) -> Result<()> {
    let l = Lms::connect().await?;
    let mut all = vec![];
    for (id, title) in course_ids(&l, course).await? {
        let v = l.get(&format!("/grades?course={id}")).await?;
        for g in v.as_array().into_iter().flatten() {
            let mut g = g.clone();
            g["course_title"] = json!(title);
            all.push(g);
        }
    }
    if as_json {
        print_json(&json!(all));
        return Ok(());
    }
    if all.is_empty() {
        println!("{}", dim("todavía no hay notas"));
        return Ok(());
    }
    let rows: Vec<Vec<String>> = all.iter().map(|g| vec![s(g, "title"),
        g["score"].as_f64().map(|x| format!("{x}/{}", g["max_score"].as_f64().unwrap_or(0.0))).unwrap_or_else(|| "—".into()),
        status_mark(&s(g, "status")), when(&g["graded_at"])]).collect();
    table(&["tarea", "nota", "estado", "fecha"], &rows);
    Ok(())
}

/// `jmd ask <sesión> "…" [--line archivo:N]`: publica una pregunta en la sesión.
pub async fn ask(lesson: &str, text: &str, line: Option<&str>, as_json: bool) -> Result<()> {
    if text.trim().is_empty() {
        bail!("escribe la pregunta: jmd ask {lesson} \"¿…?\"");
    }
    let l = Lms::connect().await?;
    let mut body = json!({"body_md": text});
    if let Some(ln) = line {
        let (path, n) = ln.rsplit_once(':').context("--line va como archivo:N")?;
        let n: u64 = n.parse().context("--line: N debe ser un número")?;
        body["code_ref"] = json!({"path": path, "line": n});
    }
    let r = l.post(&format!("/lessons/{lesson}/questions"), &body).await?;
    if as_json {
        print_json(&r);
        return Ok(());
    }
    println!("{} pregunta publicada {}", green("✓"), dim(&s(&r, "url")));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn helpers() {
        assert_eq!(repo_dir_name("https://github.com/x/mi-repo.git"), "mi-repo");
        assert_eq!(repo_dir_name("git@github.com:x/otro"), "otro");
        assert_eq!(when(&json!("2026-10-15T19:00:00Z")), "2026-10-15 19:00");
        assert_eq!(s(&json!({"a": 3}), "a"), "3");
    }
}
