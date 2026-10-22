"""JMRV Studio - editor de video local.

Nucleo del editor: persistencia SQLite, constructor de composiciones HyperFrames,
motor de camara/encuadre/transiciones, render con `npx hyperframes render`,
verificacion con ffprobe, storyboard (vocabulario de planos), SFX y hoja de sprites.

La API de generacion de imagen vive en server.py; este modulo la importa de forma
perezosa (dentro de las funciones) para no crear un ciclo de importacion.
"""

from __future__ import annotations

import json
import re
import shutil
import sqlite3
import subprocess
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

HYPERFRAMES_VERSION = "0.8.186"

ROOT: Path = Path(__file__).resolve().parent
OUTPUTS: Path = ROOT / "outputs"
FRAMES_ROOT: Path = OUTPUTS / "frames"
STUDIO_ROOT: Path = OUTPUTS / "studio"
SFX_ROOT: Path = STUDIO_ROOT / "sfx"
DB_FILE: Path = OUTPUTS / "studio.db"

_db_lock = threading.Lock()

# --------------------------------------------------------------------------- catalogos
ASPECTS: dict[str, tuple[int, int]] = {
    "16:9": (1920, 1080),
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
}

FRAMINGS: dict[str, float] = {
    "EWS": 1.0, "WS": 1.0, "LS": 1.02, "MLS": 1.06,
    "MS": 1.12, "MCU": 1.22, "CU": 1.45, "ECU": 1.9,
}
FRAMING_LABEL = {
    "EWS": "Plano general extremo", "WS": "Plano general", "LS": "Plano entero",
    "MLS": "Plano americano", "MS": "Plano medio", "MCU": "Plano medio corto",
    "CU": "Primer plano", "ECU": "Primerisimo plano", "AUTO": "Auto (sin recorte)",
}

ANGLES: dict[str, tuple[float, float, float]] = {
    # x%, y% (object-position), rotate deg
    "eye": (50, 45, 0), "high": (50, 32, 0), "low": (50, 60, 0),
    "birds": (50, 25, 0), "worms": (50, 78, 0), "dutch": (50, 45, -3.5),
    "ots": (42, 40, 0),
}
ANGLE_LABEL = {
    "eye": "A la altura de los ojos", "high": "Picado", "low": "Contrapicado",
    "birds": "Vista de pajaro", "worms": "Vista de gusano", "dutch": "Angulo holandes",
    "ots": "Sobre el hombro",
}

# movimiento -> (magnitud base, eje). El factor de intensidad multiplica la magnitud.
CAMERA_MOVES: dict[str, str] = {
    "static": "Fijo", "zoom-in": "Zoom in", "zoom-out": "Zoom out",
    "dolly-in": "Dolly in", "dolly-out": "Dolly out",
    "pan-left": "Paneo izquierda", "pan-right": "Paneo derecha",
    "pan-up": "Paneo arriba", "pan-down": "Paneo abajo",
    "tilt-up": "Tilt arriba", "tilt-down": "Tilt abajo",
    "orbit-left": "Orbita izquierda", "orbit-right": "Orbita derecha",
    "push-in": "Push in", "pull-out": "Pull out", "shake": "Sacudida",
}

EASINGS: dict[str, str] = {
    "power1.inOut": "power1.inOut (deriva suave)",
    "power2.inOut": "power2.inOut (equilibrado)",
    "power2.out": "power2.out (llegada)",
    "power3.out": "power3.out (llegada marcada)",
    "sine.inOut": "sine.inOut (organico)",
    "expo.out": "expo.out (acento)",
}

TRANSITIONS: dict[str, str] = {
    "cut": "Corte", "fade": "Fundido", "slide-left": "Deslizar izquierda",
    "slide-right": "Deslizar derecha", "wipe": "Barrido",
}

CAMERA_PRESETS: dict[str, dict[str, Any]] = {
    "estatico": {"move": "static", "amount": 0.0, "ease": "power1.inOut"},
    "ken-burns": {"move": "zoom-in", "amount": 0.5, "ease": "power1.inOut"},
    "acercar": {"move": "zoom-in", "amount": 0.9, "ease": "power2.out"},
    "alejar": {"move": "zoom-out", "amount": 0.7, "ease": "power1.inOut"},
    "paneo-lento": {"move": "pan-right", "amount": 0.4, "ease": "sine.inOut"},
    "dolly-in": {"move": "dolly-in", "amount": 0.8, "ease": "power2.out"},
    "orbita": {"move": "orbit-right", "amount": 0.6, "ease": "power1.inOut"},
    "tension": {"move": "shake", "amount": 0.4, "ease": "sine.inOut"},
}


# --------------------------------------------------------------------------- DB
SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  prompt TEXT DEFAULT '',
  negative_prompt TEXT DEFAULT '',
  provider TEXT DEFAULT 'pollinations',
  model TEXT DEFAULT '',
  size TEXT DEFAULT '1024x1024',
  aspect TEXT DEFAULT '16:9',
  fps INTEGER DEFAULT 24,
  anchor TEXT DEFAULT 'first',
  base_image TEXT,
  cutout INTEGER DEFAULT 0,
  sfx INTEGER DEFAULT 0,
  config_json TEXT DEFAULT '{}',
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS frames (
  project_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  action TEXT DEFAULT 'hold',
  delta TEXT DEFAULT '',
  duration REAL,
  shot TEXT DEFAULT 'AUTO',
  angle TEXT DEFAULT 'eye',
  camera TEXT DEFAULT 'static',
  camera_amount REAL DEFAULT 0.5,
  camera_ease TEXT DEFAULT 'power1.inOut',
  transition TEXT DEFAULT 'cut',
  caption TEXT DEFAULT '',
  image TEXT DEFAULT '',
  PRIMARY KEY (project_id, idx)
);
CREATE TABLE IF NOT EXISTS assets (
  project_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT,
  name TEXT,
  file TEXT,
  meta_json TEXT DEFAULT '{}',
  PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS states (
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sheet_json TEXT,
  camera_json TEXT,
  updated_at TEXT,
  PRIMARY KEY (project_id, name)
);
CREATE TABLE IF NOT EXISTS presets (
  id TEXT PRIMARY KEY,
  name TEXT,
  kind TEXT DEFAULT 'config',
  config_json TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS renders (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  file TEXT,
  format TEXT,
  fps INTEGER,
  width INTEGER,
  height INTEGER,
  duration REAL,
  status TEXT,
  created_at TEXT,
  meta_json TEXT DEFAULT '{}'
);
"""


def _connect() -> sqlite3.Connection:
    STUDIO_ROOT.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_FILE, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init() -> None:
    STUDIO_ROOT.mkdir(parents=True, exist_ok=True)
    SFX_ROOT.mkdir(parents=True, exist_ok=True)
    with _db_lock, _connect() as conn:
        conn.executescript(SCHEMA)
    _migrate_legacy()


def _rows(conn: sqlite3.Connection, sql: str, args: tuple = ()) -> list[dict[str, Any]]:
    return [dict(r) for r in conn.execute(sql, args).fetchall()]


def _now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


# --------------------------------------------------------------------------- proyectos
def project_dir(pid: str) -> Path:
    return STUDIO_ROOT / _safe(pid)


def assets_dir(pid: str) -> Path:
    d = project_dir(pid) / "assets"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _safe(name: str) -> str:
    parts = [p for p in Path(str(name)).parts if p not in ("..", "/", "\\")]
    return str(Path(*parts)) if parts else ""


def _frame_dir(pid: str) -> Path:
    return FRAMES_ROOT / _safe(pid)


def _project_exists(pid: str) -> bool:
    with _db_lock, _connect() as conn:
        return bool(conn.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone())


def ensure_project(pid: str, force: bool = False) -> dict[str, Any]:
    """Crea/registra un proyecto a partir de una secuencia existente en disco.

    Con force=True vuelve a copiar los cuadros de origen sobre los assets (sync).
    """
    pid = _safe(pid)
    if not pid:
        raise HTTPException(status_code=400, detail="id invalido")
    src = _frame_dir(pid)
    with _db_lock, _connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
        if not row:
            meta = _read_job(pid)
            req = (meta or {}).get("request") or {}
            conn.execute(
                "INSERT INTO projects (id,name,prompt,negative_prompt,provider,model,size,"
                "aspect,fps,anchor,base_image,cutout,sfx,config_json,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    pid, pid, str(req.get("prompt") or ""), str(req.get("negative_prompt") or ""),
                    str(req.get("provider") or "pollinations"), str(req.get("model") or ""),
                    str(req.get("size") or "1024x1024"), "16:9", 24,
                    str(req.get("anchor") or "first"), req.get("base_image"),
                    1 if req.get("cutout") else 0, 0, "{}", _now(), _now(),
                ),
            )
        meta = _read_job(pid)
        assets = assets_dir(pid)
        existing = {r["image"] for r in conn.execute("SELECT image FROM frames WHERE project_id=?", (pid,)).fetchall()}
        for i, f in enumerate(sorted(src.glob("frame-*.jpg")) if src.is_dir() else [], start=1):
            dest_name = f"f{i:04d}.jpg"
            if force or dest_name not in existing:
                shutil.copy2(f, assets / dest_name)
                conn.execute(
                    "INSERT OR IGNORE INTO frames (project_id,idx,image) VALUES (?,?,?)",
                    (pid, i, dest_name),
                )
            if "music" in (meta or {}) and not (assets / "music" + Path(str(meta["music"].get("file"))).suffix).exists():
                mf = src / str(meta["music"]["file"])
                if mf.is_file():
                    shutil.copy2(mf, assets / ("music" + mf.suffix))
        conn.execute("UPDATE projects SET updated_at=? WHERE id=?", (_now(), pid))
    return get_project(pid)


def get_project(pid: str) -> dict[str, Any]:
    pid = _safe(pid)
    with _db_lock, _connect() as conn:
        proj = conn.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        frames = _rows(conn, "SELECT * FROM frames WHERE project_id=? ORDER BY idx", (pid,))
        assets = _rows(conn, "SELECT * FROM assets WHERE project_id=? ", (pid,))
        renders = _rows(conn, "SELECT * FROM renders WHERE project_id=? ORDER BY created_at DESC LIMIT 12", (pid,))
    proj = dict(proj)
    proj["config"] = _json(proj.pop("config_json", "{}"), {})
    proj["frames"] = [_frame_view(f) for f in frames]
    proj["assets"] = assets
    proj["renders"] = renders
    music = next((a for a in assets if a.get("kind") == "music"), None)
    proj["music"] = {"name": music["name"], "file": music["file"]} if music else None
    proj["width"], proj["height"] = ASPECTS.get(proj.get("aspect") or "16:9", ASPECTS["16:9"])
    return proj


def _frame_view(f: dict[str, Any]) -> dict[str, Any]:
    pid = f["project_id"]
    return {
        "idx": f["idx"],
        "action": f.get("action") or "hold",
        "delta": f.get("delta") or "",
        "duration": f.get("duration"),
        "shot": f.get("shot") or "AUTO",
        "angle": f.get("angle") or "eye",
        "camera": f.get("camera") or "static",
        "camera_amount": f.get("camera_amount") if f.get("camera_amount") is not None else 0.5,
        "camera_ease": f.get("camera_ease") or "power1.inOut",
        "transition": f.get("transition") or "cut",
        "caption": f.get("caption") or "",
        "image": f.get("image") or "",
        "url": f"outputs/studio/{pid}/assets/{f.get('image') or ''}",
    }


def list_projects() -> list[dict[str, Any]]:
    ids: set[str] = set()
    if FRAMES_ROOT.is_dir():
        ids.update(d.name for d in FRAMES_ROOT.iterdir() if d.is_dir())
    with _db_lock, _connect() as conn:
        ids.update(r["id"] for r in conn.execute("SELECT id FROM projects").fetchall())
    out: list[dict[str, Any]] = []
    for pid in sorted(ids, reverse=True):
        try:
            p = get_project(pid) if _project_exists(pid) else ensure_project(pid)
        except Exception:
            continue
        first = p["frames"][0]["url"] if p["frames"] else ""
        out.append({
            "id": p["id"], "name": p["name"], "aspect": p["aspect"], "fps": p["fps"],
            "frames": len(p["frames"]), "thumb": first, "music": bool(p.get("music")),
            "updated_at": p.get("updated_at"), "renders": len(p.get("renders") or []),
        })
    return out


def update_project(pid: str, patch: dict[str, Any]) -> dict[str, Any]:
    pid = _safe(pid)
    if not _project_exists(pid):
        ensure_project(pid)
    allowed = {
        "name", "prompt", "negative_prompt", "provider", "model", "size",
        "aspect", "fps", "anchor", "base_image", "cutout", "sfx",
    }
    sets, args = [], []
    for k, v in patch.items():
        if k in allowed:
            sets.append(f"{k}=?")
            args.append(int(bool(v)) if k in ("cutout", "sfx") else v)
        elif k == "config":
            sets.append("config_json=?")
            args.append(json.dumps(v, ensure_ascii=False))
    if not sets:
        return get_project(pid)
    sets.append("updated_at=?")
    args.append(_now())
    args.append(pid)
    with _db_lock, _connect() as conn:
        conn.execute(f"UPDATE projects SET {', '.join(sets)} WHERE id=?", tuple(args))
    return get_project(pid)


def delete_project(pid: str) -> dict[str, Any]:
    pid = _safe(pid)
    with _db_lock, _connect() as conn:
        for t in ("frames", "assets", "states", "renders"):
            conn.execute(f"DELETE FROM {t} WHERE project_id=?", (pid,))
        conn.execute("DELETE FROM projects WHERE id=?", (pid,))
    shutil.rmtree(project_dir(pid), ignore_errors=True)
    return {"ok": True}


# --------------------------------------------------------------------------- frames
def replace_frames(pid: str, frames: list[dict[str, Any]]) -> dict[str, Any]:
    pid = _safe(pid)
    proj = get_project(pid)
    with _db_lock, _connect() as conn:
        conn.execute("DELETE FROM frames WHERE project_id=?", (pid,))
        for i, f in enumerate(frames):
            conn.execute(
                "INSERT INTO frames (project_id,idx,action,delta,duration,shot,angle,camera,"
                "camera_amount,camera_ease,transition,caption,image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    pid, i, str(f.get("action") or "hold"), str(f.get("delta") or ""),
                    _num_or_none(f.get("duration")), str(f.get("shot") or "AUTO"),
                    str(f.get("angle") or "eye"), str(f.get("camera") or "static"),
                    _num_or_none(f.get("camera_amount"), 0.5), str(f.get("camera_ease") or "power1.inOut"),
                    str(f.get("transition") or "cut"), str(f.get("caption") or ""),
                    str(f.get("image") or ""),
                ),
            )
        conn.execute("UPDATE projects SET updated_at=? WHERE id=?", (_now(), pid))
    return get_project(pid)


def add_frames(pid: str, op: str, index: Optional[int], count: int, template: dict[str, Any]) -> dict[str, Any]:
    """op: append | insert | duplicate."""
    pid = _safe(pid)
    proj = get_project(pid)
    frames = proj["frames"]
    if not frames and op != "insert":
        raise HTTPException(status_code=400, detail="El proyecto no tiene cuadros")
    count = max(1, min(60, count))
    src_idx = index if index is not None else (len(frames) - 1)
    src_idx = max(0, min(len(frames) - 1, src_idx)) if frames else 0
    src = frames[src_idx] if frames else {}
    new_rows: list[dict[str, Any]] = []
    for n in range(count):
        image = _copy_asset(pid, src.get("image"), f"add{int(time.time())}_{uuid.uuid4().hex[:4]}")
        row = {
            "action": template.get("action", src.get("action", "hold")),
            "delta": template.get("delta", src.get("delta", "")),
            "duration": template.get("duration", src.get("duration")),
            "shot": template.get("shot", src.get("shot", "AUTO")),
            "angle": template.get("angle", src.get("angle", "eye")),
            "camera": template.get("camera", src.get("camera", "static")),
            "camera_amount": template.get("camera_amount", src.get("camera_amount", 0.5)),
            "camera_ease": template.get("camera_ease", src.get("camera_ease", "power1.inOut")),
            "transition": template.get("transition", src.get("transition", "cut")),
            "caption": template.get("caption", ""),
            "image": image,
        }
        new_rows.append(row)
    if op == "append":
        frames = frames + new_rows
    elif op == "insert":
        at = max(0, min(len(frames), index if index is not None else len(frames)))
        frames = frames[:at] + new_rows + frames[at:]
    elif op == "duplicate":
        at = src_idx + 1
        frames = frames[:at] + new_rows + frames[at:]
    else:
        raise HTTPException(status_code=400, detail="op invalida")
    return replace_frames(pid, frames)


def delete_frame(pid: str, idx: int) -> dict[str, Any]:
    pid = _safe(pid)
    proj = get_project(pid)
    frames = proj["frames"]
    if idx < 0 or idx >= len(frames):
        raise HTTPException(status_code=404, detail="Cuadro no encontrado")
    removed = frames.pop(idx)
    img = removed.get("image")
    if img:
        (assets_dir(pid) / img).unlink(missing_ok=True)
    return replace_frames(pid, frames)


def _copy_asset(pid: str, image: Optional[str], tag: str) -> str:
    if not image:
        return ""
    src = assets_dir(pid) / image
    if not src.is_file():
        return image
    dest = assets_dir(pid) / f"{tag}_{Path(image).suffix or '.jpg'}"
    shutil.copy2(src, dest)
    return dest.name


# --------------------------------------------------------------------------- assets
def set_music(pid: str, name: str, data: bytes) -> dict[str, Any]:
    pid = _safe(pid)
    ext = Path(name).suffix.lower() or ".mp3"
    if ext not in (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"):
        raise HTTPException(status_code=400, detail="Formato de audio no soportado")
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio >20MB")
    for old in assets_dir(pid).glob("music.*"):
        old.unlink(missing_ok=True)
    fname = f"music{ext}"
    (assets_dir(pid) / fname).write_bytes(data)
    with _db_lock, _connect() as conn:
        conn.execute("DELETE FROM assets WHERE project_id=? AND kind='music'", (pid,))
        conn.execute(
            "INSERT INTO assets (project_id,id,kind,name,file,meta_json) VALUES (?,?,?,?,?,?)",
            (pid, "music", "music", Path(name).name, fname, "{}"),
        )
        conn.execute("UPDATE projects SET updated_at=? WHERE id=?", (_now(), pid))
    return get_project(pid)


def delete_music(pid: str) -> dict[str, Any]:
    pid = _safe(pid)
    for old in assets_dir(pid).glob("music.*"):
        old.unlink(missing_ok=True)
    for old in assets_dir(pid).glob("master.*"):
        old.unlink(missing_ok=True)
    with _db_lock, _connect() as conn:
        conn.execute("DELETE FROM assets WHERE project_id=? AND kind='music'", (pid,))
    return get_project(pid)


# --------------------------------------------------------------------------- estados
def save_state(pid: str, name: str, sheet: Any, camera: Any = None) -> dict[str, Any]:
    pid = _safe(pid)
    with _db_lock, _connect() as conn:
        conn.execute(
            "INSERT INTO states (project_id,name,sheet_json,camera_json,updated_at) VALUES (?,?,?,?,?) "
            "ON CONFLICT(project_id,name) DO UPDATE SET sheet_json=excluded.sheet_json,"
            "camera_json=excluded.camera_json, updated_at=excluded.updated_at",
            (pid, name, json.dumps(sheet, ensure_ascii=False), json.dumps(camera or [], ensure_ascii=False), _now()),
        )
    return {"ok": True, "states": list_states(pid)["states"]}


def list_states(pid: str) -> dict[str, Any]:
    pid = _safe(pid)
    with _db_lock, _connect() as conn:
        rows = _rows(conn, "SELECT name,updated_at FROM states WHERE project_id=? ORDER BY updated_at DESC", (pid,))
    return {"states": [r["name"] for r in rows], "detail": rows}


def get_state(pid: str, name: str) -> dict[str, Any]:
    pid = _safe(pid)
    with _db_lock, _connect() as conn:
        row = conn.execute("SELECT * FROM states WHERE project_id=? AND name=?", (pid, name)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Estado no encontrado")
    return {"name": row["name"], "sheet": _json(row["sheet_json"], []), "camera": _json(row["camera_json"], [])}


# --------------------------------------------------------------------------- presets
def save_preset(name: str, config: dict[str, Any]) -> dict[str, Any]:
    pid = uuid.uuid4().hex[:10]
    with _db_lock, _connect() as conn:
        conn.execute(
            "INSERT INTO presets (id,name,kind,config_json,created_at) VALUES (?,?,?,?,?)",
            (pid, name, "config", json.dumps(config, ensure_ascii=False), _now()),
        )
    return {"id": pid, "name": name, "config": config}


def list_presets() -> dict[str, Any]:
    with _db_lock, _connect() as conn:
        rows = _rows(conn, "SELECT * FROM presets ORDER BY created_at DESC", ())
    return {"presets": [{**r, "config": _json(r["config_json"], {})} for r in rows]}


def delete_preset(pid: str) -> dict[str, Any]:
    with _db_lock, _connect() as conn:
        conn.execute("DELETE FROM presets WHERE id=?", (pid,))
    return {"ok": True}


# --------------------------------------------------------------------------- camara
def _mag(amount: Any) -> float:
    try:
        a = float(amount)
    except (TypeError, ValueError):
        a = 0.5
    return 0.5 + max(0.0, min(1.0, a))


def camera_js(fid: str, move: str, amount: Any, dur: float, start: float, ease: str) -> list[str]:
    """Devuelve las lineas GSAP que animan .cam (regla: nunca animar .clip)."""
    m = _mag(amount)
    sel = f"#f{fid} .cam"
    ease = ease if ease in EASINGS else "power1.inOut"

    def tween(frm: dict[str, Any], to: dict[str, Any]) -> str:
        body = {**to, "duration": round(dur, 4), "ease": ease}
        return f"tl.fromTo('{sel}', {_js(frm)}, {_js(body)}, {round(start, 4)});"

    if move in ("static", ""):
        return []
    if move == "zoom-in":
        return [tween({"scale": 1.0}, {"scale": 1 + 0.14 * m})]
    if move == "zoom-out":
        return [tween({"scale": 1 + 0.14 * m}, {"scale": 1.0})]
    if move == "dolly-in":
        return [tween({"scale": 1.0, "yPercent": 0.8 * m}, {"scale": 1 + 0.2 * m, "yPercent": 0})]
    if move == "dolly-out":
        return [tween({"scale": 1 + 0.2 * m, "yPercent": 0}, {"scale": 1.0, "yPercent": 0.8 * m})]
    if move == "push-in":
        return [tween({"scale": 1.02, "xPercent": -0.8 * m}, {"scale": 1 + 0.16 * m, "xPercent": 0.6 * m})]
    if move == "pull-out":
        return [tween({"scale": 1 + 0.16 * m, "xPercent": 0.6 * m}, {"scale": 1.02, "xPercent": -0.8 * m})]
    if move in ("pan-left", "pan-right"):
        a, b = (-1.5 * m, 1.5 * m) if move == "pan-right" else (1.5 * m, -1.5 * m)
        return [tween({"xPercent": a, "scale": 1.04}, {"xPercent": b, "scale": 1.04})]
    if move in ("pan-up", "pan-down", "tilt-up", "tilt-down"):
        k = 1.0 if move.startswith("tilt") else 1.5
        a, b = (-k * m, k * m) if move.endswith("up") else (k * m, -k * m)
        return [tween({"yPercent": a, "scale": 1.04}, {"yPercent": b, "scale": 1.04})]
    if move in ("orbit-left", "orbit-right"):
        sgn = 1 if move == "orbit-right" else -1
        return [tween(
            {"scale": 1.06, "rotate": -1.4 * m * sgn, "xPercent": -1.2 * m * sgn},
            {"scale": 1.12, "rotate": 1.4 * m * sgn, "xPercent": 1.2 * m * sgn},
        )]
    if move == "shake":
        steps = ["-0.6", "0.6", "-0.45", "0.45", "-0.3", "0.3", "0"]
        lines = [f"tl.set('{sel}', {{scale: {1 + 0.06 * m}}}, {round(start, 4)});"]
        seg = max(0.02, dur / (len(steps) + 1))
        for i, v in enumerate(steps):
            at = round(start + seg * (i + 1), 4)
            lines.append(
                f"tl.to('{sel}', {{xPercent: {float(v) * m:.3f}, yPercent: {float(v) * 0.6 * m:.3f}, "
                f"duration: {round(seg, 4)}, ease: 'sine.inOut'}}, {at});"
            )
        return lines
    return []


def transition_js(fid: str, transition: str, dur: float, start: float) -> list[str]:
    sel = f"#f{fid} .enter"
    d = min(0.32, max(0.12, dur * 0.5))
    if transition == "fade":
        return [f"tl.fromTo('{sel}', {{opacity: 0}}, {{opacity: 1, duration: {round(d,3)}, ease: 'power2.out'}}, {round(start,4)});"]
    if transition == "slide-left":
        return [f"tl.fromTo('{sel}', {{xPercent: 100}}, {{xPercent: 0, duration: {round(min(0.45, dur*0.7),3)}, ease: 'power3.out'}}, {round(start,4)});"]
    if transition == "slide-right":
        return [f"tl.fromTo('{sel}', {{xPercent: -100}}, {{xPercent: 0, duration: {round(min(0.45, dur*0.7),3)}, ease: 'power3.out'}}, {round(start,4)});"]
    if transition == "wipe":
        return [f"tl.fromTo('{sel}', {{clipPath: 'inset(0 100% 0 0)'}}, {{clipPath: 'inset(0 0% 0 0)', duration: {round(min(0.5, dur*0.8),3)}, ease: 'power3.inOut'}}, {round(start,4)});"]
    return []


def caption_js(fid: str, start: float) -> list[str]:
    sel = f"#f{fid} .cap"
    return [
        f"tl.fromTo('{sel}', {{opacity: 0, y: 26}}, {{opacity: 1, y: 0, duration: 0.4, ease: 'power3.out'}}, {round(start + 0.08, 4)});"
    ]


def _js(obj: dict[str, Any]) -> str:
    return json.dumps(obj, ensure_ascii=False)


# --------------------------------------------------------------------------- composicion
FRAME_HTML = """  <div class="clip" id="f{fid}" data-start="{start}" data-duration="{dur}" data-track-index="0">
    <div class="enter"><div class="cam"><div class="frame" style="transform: scale({scale}) rotate({rot}deg)"><img src="assets/{image}" style="object-position:{px}% {py}%" alt=""></div></div></div>
{caption}  </div>
"""


def build_composition(pid: str) -> Path:
    """Escribe el proyecto HyperFrames en outputs/studio/<id>/ y devuelve la carpeta."""
    proj = get_project(pid)
    pdir = project_dir(pid)
    pdir.mkdir(parents=True, exist_ok=True)
    fps = int(proj.get("fps") or 24)
    width, height = ASPECTS.get(proj.get("aspect") or "16:9", ASPECTS["16:9"])
    frames = [f for f in proj["frames"] if f.get("image")]

    starts: list[float] = []
    cursor = 0.0
    for f in frames:
        d = f.get("duration") or (1.0 / max(1, fps))
        d = max(0.05, min(10.0, float(d)))
        starts.append(round(cursor, 4))
        cursor = round(cursor + d, 4)
    total = round(max(cursor, 0.5), 4)

    blocks, tweens = [], []
    for i, f in enumerate(frames):
        fid = i + 1
        start = starts[i]
        dur = round((starts[i + 1] - start) if i + 1 < len(starts) else total - start, 4)
        shot = f.get("shot") or "AUTO"
        scale = FRAMINGS.get(shot, 1.0)
        px, py, rot = ANGLES.get(f.get("angle") or "eye", ANGLES["eye"])
        cap = f.get("caption") or ""
        cap_html = f'    <div class="cap">{_esc(cap)}</div>\n' if cap else ""
        blocks.append(FRAME_HTML.format(
            fid=fid, start=start, dur=dur, image=f["image"], scale=scale, rot=rot,
            px=px, py=py, caption=cap_html,
        ))
        tweens += transition_js(fid, f.get("transition") or "cut", dur, start)
        tweens += camera_js(fid, f.get("camera") or "static", f.get("camera_amount"), dur, start, f.get("camera_ease"))
        if cap:
            tweens += caption_js(fid, start)

    audio = ""
    music_file = next((a for a in proj["assets"] if a.get("kind") == "music"), None)
    audio_src = None
    if proj.get("sfx"):
        audio_src = _build_master_audio(pid, frames, starts, total, music_file)
    if audio_src:
        audio = f'  <audio class="clip" data-start="0" data-duration="{total}" data-track-index="9" src="assets/{audio_src}"></audio>\n'
    elif music_file:
        audio = f'  <audio class="clip" data-start="0" data-duration="{total}" data-track-index="9" src="assets/{music_file["file"]}"></audio>\n'

    html = COMP_TEMPLATE.format(
        width=width, height=height, fps=fps, total=total,
        clips="".join(blocks), audio=audio,
        tweens="\n      ".join(tweens) or "// sin animacion",
    )
    (pdir / "index.html").write_text(html, encoding="utf-8")
    (pdir / "hyperframes.json").write_text(json.dumps({
        "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
        "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
        "paths": {"blocks": "compositions", "components": "compositions/components", "assets": "assets"},
        "media": {"autoProxy": True},
    }, indent=2), encoding="utf-8")
    (pdir / "package.json").write_text(json.dumps({
        "name": f"jmrv-{pid}", "private": True, "type": "module",
        "scripts": {"render": f"npx --yes hyperframes@{HYPERFRAMES_VERSION} render"},
    }, indent=2), encoding="utf-8")
    (pdir / "meta.json").write_text(json.dumps({
        "id": pid, "name": proj.get("name") or pid, "createdAt": _now(),
    }, indent=2), encoding="utf-8")
    (pdir / "frame.md").write_text(_design_spec(proj), encoding="utf-8")
    return pdir


COMP_TEMPLATE = """<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={width}, height={height}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {width}px; height: {height}px; overflow: hidden; background: #08080b; }}
      #root {{ position: relative; width: 100%; height: 100%; container-type: size; }}
      .clip {{ position: absolute; inset: 0; overflow: hidden; }}
      .enter {{ position: absolute; inset: 0; will-change: transform, opacity; }}
      .cam {{ position: absolute; inset: 0; will-change: transform; backface-visibility: hidden; transform: translateZ(0); }}
      .frame {{ position: absolute; inset: 0; overflow: hidden; }}
      .frame img {{ width: 100%; height: 100%; object-fit: cover; }}
      .cap {{
        position: absolute; left: 6cqw; right: 6cqw; bottom: 8cqh; z-index: 3; text-align: center;
        font: 600 5cqw/1.25 -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, system-ui, sans-serif;
        color: #fff; letter-spacing: -0.02em; text-shadow: 0 0.4cqw 1.6cqw rgba(0,0,0,0.75);
      }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}"
         data-width="{width}" data-height="{height}" data-fps="{fps}">
{clips}{audio}    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      gsap.set(".cam", {{ force3D: true }});
      {tweens}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""


def _design_spec(proj: dict[str, Any]) -> str:
    return (
        f"# frame.md - {proj.get('name') or proj.get('id')}\n\n"
        f"- Paleta: fondo #08080b, texto #f5f5f7, acento #0a84ff.\n"
        f"- Tipografia: sans del sistema para los rotulos (determinista, sin CDN de fuentes).\n"
        f"- Movimiento: camaras con easing (power1.inOut / power2.out), magnitudes pequenas;\n"
        f"  nunca se anima `.clip`, solo `.enter`/`.cam`.\n"
        f"- Aspecto: {proj.get('aspect')}; fps: {proj.get('fps')}.\n"
    )


def _esc(text: str) -> str:
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# --------------------------------------------------------------------------- audio
def _ffmpeg() -> str:
    return shutil.which("ffmpeg") or "ffmpeg"


def synth_sfx(name: str) -> Path:
    """Sintetiza un SFX libre de derechos con ffmpeg (whoosh/click/riser/impact)."""
    SFX_ROOT.mkdir(parents=True, exist_ok=True)
    out = SFX_ROOT / f"{name}.wav"
    if out.is_file():
        return out
    cmds: dict[str, list[str]] = {
        "whoosh": [_ffmpeg(), "-y", "-f", "lavfi", "-i",
                   "anoisesrc=duration=0.45:color=pink:sample_rate=48000:amplitude=0.5",
                   "-af", "afade=t=in:st=0:d=0.05,afade=t=out:st=0.2:d=0.25,highpass=f=300,lowpass=f=6000", str(out)],
        "click": [_ffmpeg(), "-y", "-f", "lavfi", "-i",
                  "sine=frequency=2200:duration=0.05:sample_rate=48000",
                  "-af", "afade=t=out:st=0.01:d=0.03", str(out)],
        "riser": [_ffmpeg(), "-y", "-f", "lavfi", "-i",
                  "sine=frequency=200:duration=0.9:sample_rate=48000",
                  "-af", "asetrate=48000*2,aeval='val(0)*(t/0.9)',afade=t=in:st=0:d=0.1,highpass=f=200", str(out)],
        "impact": [_ffmpeg(), "-y", "-f", "lavfi", "-i",
                   "sine=frequency=90:duration=0.4:sample_rate=48000",
                   "-af", "afade=t=out:st=0.05:d=0.35,volume=1.4", str(out)],
    }
    if name not in cmds:
        raise HTTPException(status_code=400, detail="SFX desconocido")
    proc = subprocess.run(cmds[name], capture_output=True, text=True)
    if proc.returncode != 0 or not out.is_file():
        raise HTTPException(status_code=500, detail=f"ffmpeg fallo: {proc.stderr[-300:]}")
    return out


def _build_master_audio(pid: str, frames: list[dict[str, Any]], starts: list[float],
                        total: float, music: Optional[dict[str, Any]]) -> Optional[str]:
    """Mezcla musica + whoosh en cada corte en un unico master (adelay + amix)."""
    try:
        whoosh = synth_sfx("whoosh")
    except HTTPException:
        return None
    music_path = assets_dir(pid) / music["file"] if music else None
    base = music_path if (music_path and music_path.is_file()) else None
    inputs = ["-f", "lavfi", "-t", str(total), "-i", "anullsrc=r=48000:cl=stereo"] if not base else ["-i", str(base)]
    cuts = [starts[i] for i in range(1, len(starts))]
    if not cuts:
        return None
    for _ in cuts:
        inputs += ["-i", str(whoosh)]
    filters = []
    for i, cut in enumerate(cuts, start=1):
        ms = int(cut * 1000)
        filters.append(f"[{i}]adelay={ms}|{ms},volume=0.45[w{i}]")
    mixes = "".join(f"[w{i}]" for i in range(1, len(cuts) + 1))
    filters.append(f"[0]{mixes}amix=inputs={len(cuts) + 1}:duration=first:normalize=0[mix]")
    out = assets_dir(pid) / "master.m4a"
    cmd = [_ffmpeg(), "-y", *inputs, "-filter_complex", ";".join(filters),
           "-map", "[mix]", "-c:a", "aac", "-b:a", "192k", str(out)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not out.is_file():
        return None
    return out.name


# --------------------------------------------------------------------------- render
_render_state: dict[str, dict[str, Any]] = {}
_render_lock = threading.Lock()


def start_render(pid: str, fmt: str, fps: Optional[int] = None, quality: str = "looks") -> dict[str, Any]:
    pid = _safe(pid)
    proj = get_project(pid)
    fmt = "gif" if fmt == "gif" else "mp4"
    fps = int(fps or proj.get("fps") or 24)
    rid = uuid.uuid4().hex[:10]
    with _render_lock:
        _render_state[pid] = {"id": rid, "status": "queued", "format": fmt, "fps": fps, "log": "", "file": None, "error": None}
    with _db_lock, _connect() as conn:
        conn.execute(
            "INSERT INTO renders (id,project_id,format,fps,status,created_at,meta_json) VALUES (?,?,?,?,?,?,?)",
            (rid, pid, fmt, fps, "queued", _now(), "{}"),
        )
    threading.Thread(target=_run_render, args=(pid, rid, fmt, fps, quality), daemon=True).start()
    return {"render_id": rid, "status": "queued"}


def render_status(pid: str) -> dict[str, Any]:
    pid = _safe(pid)
    with _render_lock:
        return _render_state.get(pid) or {"status": "idle"}


def _run_render(pid: str, rid: str, fmt: str, fps: int, quality: str) -> None:
    def set_state(**kw: Any) -> None:
        with _render_lock:
            st = _render_state.setdefault(pid, {})
            st.update(kw)
        db_values = {k: v for k, v in kw.items() if k in ("status", "file")}
        if db_values:
            with _db_lock, _connect() as conn:
                conn.execute(f"UPDATE renders SET {', '.join(f'{k}=?' for k in db_values)} WHERE id=?",
                             (*db_values.values(), rid))

    try:
        set_state(status="building")
        pdir = build_composition(pid)
        proj = get_project(pid)
        width, height = ASPECTS.get(proj.get("aspect") or "16:9", ASPECTS["16:9"])
        renders = pdir / "renders"
        renders.mkdir(exist_ok=True)
        ext = "gif" if fmt == "gif" else "mp4"
        out = renders / f"{pid}-{fps}fps.{ext}"
        set_state(status="rendering")
        cmd = ["npx", "-y", f"hyperframes@{HYPERFRAMES_VERSION}", "render", str(pdir),
               "-o", str(out), "--format", fmt, "--fps", str(fps), "--quality", quality]
        if fmt == "gif":
            cmd += ["--gif-loop", "0"]
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(pdir), timeout=1800)
        log = (proc.stdout or "")[-4000:] + (proc.stderr or "")[-2000:]
        if proc.returncode != 0 or not out.is_file():
            raise RuntimeError(f"hyperframes fallo: {log[-500:]}")
        info = probe(out)
        set_state(status="done", file=out.name, log=log, error=None,
                  url=f"outputs/studio/{pid}/renders/{out.name}",
                  width=info.get("width"), height=info.get("height"), duration=info.get("duration"))
        with _db_lock, _connect() as conn:
            conn.execute(
                "UPDATE renders SET status='done', file=?, width=?, height=?, duration=?, meta_json=? WHERE id=?",
                (out.name, info.get("width"), info.get("height"), info.get("duration"),
                 json.dumps(info, ensure_ascii=False), rid),
            )
    except Exception as exc:  # noqa: BLE001
        set_state(status="error", error=str(exc)[:600])
        with _db_lock, _connect() as conn:
            conn.execute("UPDATE renders SET status='error', meta_json=? WHERE id=?",
                         (json.dumps({"error": str(exc)[:600]}), rid))


def probe(path: Path) -> dict[str, Any]:
    ffprobe = shutil.which("ffprobe") or "ffprobe"
    proc = subprocess.run(
        [ffprobe, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        return {"ok": False, "error": proc.stderr[-300:]}
    data = json.loads(proc.stdout or "{}")
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
    a = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
    return {
        "ok": True,
        "width": v.get("width"), "height": v.get("height"),
        "codec": v.get("codec_name"),
        "fps": _fps(v.get("r_frame_rate")),
        "duration": float(data.get("format", {}).get("duration") or 0),
        "audio": bool(a),
        "bytes": int(data.get("format", {}).get("size") or path.stat().st_size),
    }


def _fps(rate: Optional[str]) -> float:
    if not rate or "/" not in rate:
        return 0.0
    num, den = rate.split("/")
    try:
        return round(float(num) / float(den), 3) if float(den) else 0.0
    except ValueError:
        return 0.0


def verify(pid: str) -> dict[str, Any]:
    pid = _safe(pid)
    proj = get_project(pid)
    renders = _rows_pending(pid)
    if not renders:
        raise HTTPException(status_code=404, detail="Sin renders para verificar")
    latest = renders[0]
    path = project_dir(pid) / "renders" / str(latest["file"])
    if not path.is_file():
        raise HTTPException(status_code=404, detail="El archivo del render no existe")
    info = probe(path)
    expected = {
        "width": proj["width"], "height": proj["height"],
        "fps": int(proj.get("fps") or 24),
    }
    checks = [
        {"name": "dimensiones", "ok": info.get("width") == expected["width"] and info.get("height") == expected["height"],
         "detail": f"{info.get('width')}x{info.get('height')} (esperado {expected['width']}x{expected['height']})"},
        {"name": "codec", "ok": info.get("codec") in ("h264", "hevc", "vp9", "gif"), "detail": str(info.get("codec"))},
        {"name": "duracion", "ok": (info.get("duration") or 0) > 0.2, "detail": f"{info.get('duration')}s"},
    ]
    sheet = _contact_sheet(path)
    return {"ok": all(c["ok"] for c in checks), "checks": checks, "info": info,
            "sheet": f"outputs/studio/{pid}/renders/{sheet.name}" if sheet else None}


def _rows_pending(pid: str) -> list[dict[str, Any]]:
    with _db_lock, _connect() as conn:
        return _rows(conn, "SELECT * FROM renders WHERE project_id=? AND file IS NOT NULL ORDER BY created_at DESC", (pid,))


def _contact_sheet(path: Path) -> Optional[Path]:
    out = path.with_name(path.stem + "-sheet.png")
    cmd = [_ffmpeg(), "-y", "-i", str(path), "-vf", "fps=4,scale=300:-1,tile=5x6",
           "-frames:v", "1", str(out)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return out if proc.returncode == 0 and out.is_file() else None


# --------------------------------------------------------------------------- sprites
def sprite_sheet(pid: str, cols: int = 5, frame_w: int = 256) -> dict[str, Any]:
    pid = _safe(pid)
    proj = get_project(pid)
    images = [assets_dir(pid) / f["image"] for f in proj["frames"] if f.get("image")]
    images = [p for p in images if p.is_file()]
    if not images:
        raise HTTPException(status_code=404, detail="Sin cuadros")
    cols = max(1, min(12, int(cols)))
    frame_w = max(64, min(1024, int(frame_w)))
    rows = (len(images) + cols - 1) // cols
    out = project_dir(pid) / "renders" / "spritesheet.png"
    out.parent.mkdir(exist_ok=True)
    inputs: list[str] = []
    for p in images:
        inputs += ["-i", str(p)]
    parts = [f"[{i}:v]scale={frame_w}:-1,format=rgba[s{i}]" for i in range(len(images))]
    chain = "".join(f"[s{i}]" for i in range(len(images)))
    filter_complex = ";".join(parts) + f";{chain}concat=n={len(images)}:v=1:a=0[cat];[cat]tile={cols}x{rows}[out]"
    cmd = [_ffmpeg(), "-y", *inputs, "-filter_complex", filter_complex, "-map", "[out]",
           "-frames:v", "1", str(out)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not out.is_file():
        raise HTTPException(status_code=500, detail=f"ffmpeg fallo: {proc.stderr[-300:]}")
    return {"ok": True, "url": f"outputs/studio/{pid}/renders/{out.name}",
            "cols": cols, "rows": rows, "frames": len(images)}


# --------------------------------------------------------------------------- storyboard
def make_storyboard(pid: str, count: Optional[int] = None) -> dict[str, Any]:
    """Genera un storyboard con el vocabulario de planos de la skill storyboard-creation."""
    pid = _safe(pid)
    proj = get_project(pid)
    frames = proj["frames"]
    n = max(2, min(60, int(count or len(frames) or 6)))
    prompt = proj.get("prompt") or ""
    if not prompt:
        raise HTTPException(status_code=400, detail="El proyecto no tiene prompt")
    existed = {i: f for i, f in enumerate(frames)}
    sheet = _storyboard_llm(prompt, n) or _storyboard_fallback(prompt, n)
    new_frames = []
    for i in range(n):
        prev = existed.get(i, {})
        beat = sheet[i] if i < len(sheet) else {}
        image = prev.get("image")
        if not image and frames:
            image = _copy_asset(pid, frames[-1].get("image"), f"sb{i}")
        new_frames.append({
            "action": beat.get("action", prev.get("action", "hold")),
            "delta": beat.get("delta", ""),
            "duration": beat.get("duration", prev.get("duration")),
            "shot": beat.get("shot", "MS"),
            "angle": beat.get("angle", "eye"),
            "camera": beat.get("camera", "static"),
            "camera_amount": beat.get("camera_amount", 0.5),
            "camera_ease": beat.get("camera_ease", "power1.inOut"),
            "transition": beat.get("transition", "cut"),
            "caption": beat.get("caption", ""),
            "image": image,
        })
    replace_frames(pid, new_frames)
    return get_project(pid)


def _storyboard_llm(prompt: str, count: int) -> Optional[list[dict[str, Any]]]:
    try:
        from server import _free_chat  # import perezoso: evita el ciclo server<->studio
    except Exception:
        return None
    instruction = (
        f"Break this video idea into exactly {count} shots (1..{count}) as a shot list. "
        "Use film shot vocabulary. Reply with ONLY a raw JSON array, no markdown:\n"
        '[{"shot":"MS","angle":"eye","camera":"slow dolly in","duration":2.5,'
        '"action":"walk","caption":"texto corto o vacio","delta":"what changes"}]\n'
        "shot: EWS|WS|LS|MLS|MS|MCU|CU|ECU. angle: eye|high|low|birds|worms|dutch|ots. "
        "camera: static|zoom-in|zoom-out|dolly-in|dolly-out|pan-left|pan-right|pan-up|pan-down|"
        "tilt-up|tilt-down|orbit-left|orbit-right|push-in|pull-out|shake. "
        "duration seconds 0.4-4. caption max 6 words, Spanish. "
        "Keep one subject identity; vary framing and camera; never metronomic.\n\n"
        f"Idea: {prompt}"
    )
    try:
        text = _free_chat(instruction, system="You are a film storyboard editor. Raw JSON only.", timeout=60)
        if not isinstance(text, str):
            text = json.dumps(text)
        start, end = text.find("["), text.rfind("]")
        parsed = json.loads(text[start:end + 1]) if start >= 0 and end > start else []
    except Exception:
        return None
    out: list[dict[str, Any]] = []
    for item in parsed[:count]:
        if not isinstance(item, dict):
            continue
        shot = str(item.get("shot", "MS")).upper()
        cam = str(item.get("camera", "static")).lower().replace("slow ", "").replace(" ", "-")
        cam = cam if cam in CAMERA_MOVES else "static"
        angle = str(item.get("angle", "eye")).lower()
        out.append({
            "shot": shot if shot in FRAMINGS else "MS",
            "angle": angle if angle in ANGLES else "eye",
            "camera": cam,
            "camera_amount": 0.55,
            "camera_ease": "power1.inOut",
            "duration": max(0.4, min(4.0, _float(item.get("duration"), 1.6))),
            "action": str(item.get("action", "hold")),
            "delta": str(item.get("delta", ""))[:300],
            "caption": str(item.get("caption", ""))[:80],
            "transition": "fade" if cam != "static" else "cut",
        })
    return out if len(out) >= 2 else None


def _storyboard_fallback(prompt: str, count: int) -> list[dict[str, Any]]:
    shots = ["WS", "MS", "CU", "MCU", "LS", "ECU", "MS", "WS"]
    cams = ["zoom-in", "pan-right", "static", "dolly-in", "pan-left", "zoom-out", "orbit-right", "push-in"]
    angles = ["eye", "low", "eye", "high", "eye", "dutch", "eye", "low"]
    out = []
    for i in range(count):
        out.append({
            "shot": shots[i % len(shots)], "angle": angles[i % len(angles)],
            "camera": cams[i % len(cams)], "camera_amount": 0.5,
            "camera_ease": "power1.inOut", "duration": round(0.9 + (i % 3) * 0.5, 2),
            "action": "hold", "delta": "", "caption": "",
            "transition": "fade" if i % 3 == 0 else "cut",
        })
    return out


# --------------------------------------------------------------------------- util
def _read_job(pid: str) -> Optional[dict[str, Any]]:
    path = _frame_dir(pid) / "job.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def _json(text: Any, default: Any) -> Any:
    if text is None:
        return default
    if isinstance(text, (dict, list)):
        return text
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        return default


def _num_or_none(value: Any, default: Optional[float] = None) -> Optional[float]:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _migrate_legacy() -> None:
    if not FRAMES_ROOT.is_dir():
        return
    for d in FRAMES_ROOT.iterdir():
        if not d.is_dir():
            continue
        try:
            if not _project_exists(d.name):
                ensure_project(d.name)
        except Exception:
            continue


# --------------------------------------------------------------------------- API
router = APIRouter(prefix="/api/studio", tags=["studio"])


class FramesBody(BaseModel):
    frames: list[dict[str, Any]] = Field(default_factory=list)


class AddBody(BaseModel):
    op: str = "append"
    index: Optional[int] = None
    count: int = 1
    template: dict[str, Any] = Field(default_factory=dict)


class ProjectPatch(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None
    aspect: Optional[str] = None
    fps: Optional[int] = None
    sfx: Optional[bool] = None
    cutout: Optional[bool] = None
    config: Optional[dict[str, Any]] = None


class RenderBody(BaseModel):
    format: str = "mp4"
    fps: Optional[int] = None
    quality: str = "looks"


class MusicBody(BaseModel):
    name: str
    data: str


class StateBody(BaseModel):
    name: str
    sheet: Any = None
    camera: Any = None


class PresetBody(BaseModel):
    name: str
    config: dict[str, Any] = Field(default_factory=dict)


class StoryBody(BaseModel):
    count: Optional[int] = None


@router.get("/camera-presets")
def api_camera_presets() -> dict[str, Any]:
    return {
        "framings": {"AUTO": FRAMING_LABEL["AUTO"], **{k: f"{v} · {FRAMING_LABEL[k]}" for k, v in FRAMINGS.items()}},
        "angles": {k: ANGLE_LABEL[k] for k in ANGLES},
        "moves": CAMERA_MOVES,
        "easings": EASINGS,
        "transitions": TRANSITIONS,
        "presets": CAMERA_PRESETS,
        "aspects": {k: {"width": w, "height": h} for k, (w, h) in ASPECTS.items()},
        "hyperframes": {"version": HYPERFRAMES_VERSION, "available": bool(shutil.which("npx"))},
    }


@router.get("/projects")
def api_projects() -> dict[str, Any]:
    return {"projects": list_projects()}


@router.get("/projects/{pid}")
def api_project(pid: str) -> dict[str, Any]:
    if not _project_exists(pid):
        return ensure_project(pid)
    return get_project(pid)


@router.patch("/projects/{pid}")
def api_patch_project(pid: str, body: ProjectPatch) -> dict[str, Any]:
    return update_project(pid, body.model_dump(exclude_none=True))


@router.delete("/projects/{pid}")
def api_delete_project(pid: str) -> dict[str, Any]:
    return delete_project(pid)


@router.patch("/projects/{pid}/frames")
def api_replace_frames(pid: str, body: FramesBody) -> dict[str, Any]:
    return replace_frames(pid, body.frames)


@router.post("/projects/{pid}/frames")
def api_add_frames(pid: str, body: AddBody) -> dict[str, Any]:
    return add_frames(pid, body.op, body.index, body.count, body.template)


@router.delete("/projects/{pid}/frames/{idx}")
def api_delete_frame(pid: str, idx: int) -> dict[str, Any]:
    return delete_frame(pid, idx)


@router.post("/projects/{pid}/sync")
def api_sync(pid: str) -> dict[str, Any]:
    return ensure_project(pid, force=True)


@router.post("/projects/{pid}/storyboard")
def api_storyboard(pid: str, body: StoryBody) -> dict[str, Any]:
    return make_storyboard(pid, body.count)


@router.get("/projects/{pid}/states")
def api_states(pid: str) -> dict[str, Any]:
    return list_states(pid)


@router.get("/projects/{pid}/states/{name}")
def api_state(pid: str, name: str) -> dict[str, Any]:
    return get_state(pid, name)


@router.post("/projects/{pid}/states")
def api_save_state(pid: str, body: StateBody) -> dict[str, Any]:
    return save_state(pid, body.name, body.sheet, body.camera)


@router.post("/projects/{pid}/music")
def api_music(pid: str, body: MusicBody) -> dict[str, Any]:
    import base64
    try:
        raw = base64.b64decode(body.data, validate=False)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="base64 invalido") from exc
    return set_music(pid, body.name, raw)


@router.delete("/projects/{pid}/music")
def api_delete_music(pid: str) -> dict[str, Any]:
    return delete_music(pid)


@router.post("/projects/{pid}/render")
def api_render(pid: str, body: RenderBody) -> dict[str, Any]:
    return start_render(pid, body.format, body.fps, body.quality)


@router.get("/projects/{pid}/render")
def api_render_status(pid: str) -> dict[str, Any]:
    return render_status(pid)


@router.post("/projects/{pid}/verify")
def api_verify(pid: str) -> dict[str, Any]:
    return verify(pid)


@router.post("/projects/{pid}/sfx")
def api_sfx(pid: str) -> dict[str, Any]:
    for name in ("whoosh", "click", "riser", "impact"):
        synth_sfx(name)
    return {"ok": True, "sfx": [p.name for p in sorted(SFX_ROOT.glob("*.wav"))],
            "url": "outputs/studio/sfx"}


@router.post("/projects/{pid}/spritesheet")
def api_spritesheet(pid: str, cols: int = 5, frame_w: int = 256) -> dict[str, Any]:
    return sprite_sheet(pid, cols, frame_w)


@router.get("/presets")
def api_presets() -> dict[str, Any]:
    return list_presets()


@router.post("/presets")
def api_save_preset(body: PresetBody) -> dict[str, Any]:
    return save_preset(body.name, body.config)


@router.delete("/presets/{pid}")
def api_delete_preset(pid: str) -> dict[str, Any]:
    return delete_preset(pid)


def register(app: Any) -> None:
    init()
    app.include_router(router)
