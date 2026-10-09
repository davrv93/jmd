// Solo en el build (Node): enumera cursos, sesiones y tareas desde ../content para que el
// adaptador estático genere /courses/<slug>/, /lessons/<id>/ y /assignments/<id>/.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

const CONTENT = process.env.LMS_CONTENT_DIR || join(process.cwd(), "..", "content");

async function courses(): Promise<{ dir: string; slug: string }[]> {
  const out: { dir: string; slug: string }[] = [];
  for (const e of await readdir(join(CONTENT, "courses"), { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = join(CONTENT, "courses", e.name);
    const c = parse(await readFile(join(dir, "course.yaml"), "utf8")) ?? {};
    out.push({ dir, slug: c.slug || c.id || e.name });
  }
  return out;
}

async function frontMatterIds(dir: string): Promise<string[]> {
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const ids: string[] = [];
  for (const f of files) {
    const raw = (await readFile(join(dir, f), "utf8")).replace(/\r\n/g, "\n");
    if (!raw.startsWith("---\n")) continue;
    const end = raw.indexOf("\n---\n", 4);
    if (end < 0) continue;
    const fm = parse(raw.slice(4, end)) ?? {};
    if (fm.id) ids.push(String(fm.id));
  }
  return ids;
}

export async function courseSlugs(): Promise<string[]> {
  return (await courses()).map((c) => c.slug);
}

export async function lessonIds(): Promise<string[]> {
  const out: string[] = [];
  for (const c of await courses()) out.push(...(await frontMatterIds(join(c.dir, "lessons"))));
  return out;
}

export async function assignmentIds(): Promise<string[]> {
  const out: string[] = [];
  for (const c of await courses()) out.push(...(await frontMatterIds(join(c.dir, "assignments"))));
  return out;
}
