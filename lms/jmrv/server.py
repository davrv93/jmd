"""JMRV - local image studio backed by the Pollinations API.

Run:  .venv/bin/python server.py   (or ./run.sh)
Docs: see SKILL.md
"""

from __future__ import annotations

import json
import os
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pollinations import Pollinations

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
OUTPUTS = ROOT / "outputs"

load_dotenv(ROOT / ".env")

API_KEY = os.getenv("POLLINATIONS_API_KEY", "").strip()
PUBLIC_KEY = os.getenv("POLLINATIONS_PUBLIC_KEY", "").strip()
CF_TOKEN = os.getenv("CLOUDFLARE_TOKEN", "").strip()
CF_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
PORT = int(os.getenv("JMRV_PORT", "8765"))

OUTPUTS.mkdir(parents=True, exist_ok=True)
INDEX_FILE = OUTPUTS / "index.json"

app = FastAPI(title="JMRV", version="1.0.0")

client = Pollinations(api_key=API_KEY, timeout=300)
_index_lock = threading.Lock()

# ------------------------------------------------------------------- studio (editor)
import studio  # noqa: E402

studio.register(app)

# --------------------------------------------------------------------- balance
BALANCE: dict[str, Any] = {"known": False, "balance": None, "topup": "https://enter.pollinations.ai/top-up"}
BALANCE_FILE = OUTPUTS / "balance.json"

if BALANCE_FILE.exists():
    try:
        BALANCE.update(json.loads(BALANCE_FILE.read_text("utf-8")))
    except json.JSONDecodeError:
        pass


def _save_balance() -> None:
    try:
        BALANCE_FILE.write_text(json.dumps(BALANCE, indent=2), "utf-8")
    except OSError:
        pass


# Coste real por imagen medido a 512x512 (lo que la API cobra de verdad, en pollen).
MEASURED_COST: dict[str, float] = {
    "dreamshaper": 0.0001,
    "sana": 0.0001,
    "flux": 0.0020,
    "z-image": 0.0040,
    "flux-klein": 0.0050,
    "gpt-image-1-mini": 0.0095,
    "microsoft/mai-image-2.6-flash": 0.0159,
    "gpt-image-2": 0.0302,
    "black-forest-labs/flux.1-kontext-pro": 0.0300,
    "microsoft/mai-image-2.6": 0.0337,
}

# Modelos que responden 200 con saldo 0 (generación gratuita).
FREE_GENERATION = {"flux"}


def _pollinations_error(exc: Exception, fallback: str) -> HTTPException:
    """Turn a Pollinations failure into an actionable HTTP error."""
    response = getattr(exc, "response", None)
    if response is not None:
        try:
            payload = response.json()
            err = payload.get("error", payload)
            code = str(err.get("code", ""))
            message = str(err.get("message", fallback))
            if code == "INSUFFICIENT_BALANCE" or "Insufficient balance" in message:
                import re

                match = re.search(r"available balance is ([0-9]*\.?[0-9]+)", message)
                cost = re.search(r"costs ~([0-9]*\.?[0-9]+)", message)
                BALANCE.update(
                    {
                        "known": True,
                        "balance": float(match.group(1)) if match else None,
                        "topup": err.get("fixUrl") or BALANCE["topup"],
                    }
                )
                _save_balance()
                return HTTPException(
                    status_code=402,
                    detail={
                        "error": "insufficient_balance",
                        "balance": BALANCE["balance"],
                        "cost": float(cost.group(1)) if cost else None,
                        "message": message,
                        "topup": BALANCE["topup"],
                        "free_models": sorted(FREE_GENERATION),
                    },
                )
            return HTTPException(status_code=502, detail=message)
        except ValueError:
            pass
    return HTTPException(status_code=502, detail=fallback)


# ------------------------------------------------------------------- cloudflare
# Workers AI: 10.000 neuronas/día gratis (reset 00:00 UTC), Workers Paid $0.011/1.000.
CF_FREE_NEURONS_DAILY = 10_000
CF_NEURON_FILE = OUTPUTS / "neurons.json"

# Precios oficiales de Cloudflare (neurons) para estimar el gasto diario.
CF_IMAGE_MODELS: list[dict[str, Any]] = [
    {
        "id": "@cf/black-forest-labs/flux-1-schnell",
        "label": "FLUX.1 Schnell",
        "multipart": False,
        "image_input": False,
        "accepts_size": False,
        "fixed_size": "1024x1024",
        "steps": 4,
        "per_tile": 4.80,
        "per_step": 9.60,
        "note": "el más barato (~43 neuronas por 1024²)",
    },
    {
        "id": "@cf/black-forest-labs/flux-2-klein-4b",
        "label": "FLUX.2 Klein 4B (genera y edita)",
        "multipart": True,
        "image_input": True,
        "ref_prefix": "input_image_",
        "accepts_size": True,
        "steps": 4,
        "in_tile": 5.37,
        "out_tile": 26.05,
        "note": "genera y edita; ideal para secuencias de cuadros",
    },
    {
        "id": "@cf/black-forest-labs/flux-2-klein-9b",
        "label": "FLUX.2 Klein 9B (genera y edita)",
        "multipart": True,
        "image_input": True,
        "ref_prefix": "input_image_",
        "accepts_size": True,
        "steps": 4,
        "per_mp": 1363.64,
        "note": "alta calidad, caro (~1364 neuronas por 1024²)",
    },
    {
        "id": "@cf/black-forest-labs/flux-2-dev",
        "label": "FLUX.2 Dev (multi-referencia)",
        "multipart": True,
        "image_input": True,
        "ref_prefix": "input_image_",
        "accepts_size": True,
        "steps": 4,
        "in_tile_step": 18.75,
        "out_tile_step": 37.50,
        "note": "multi-referencia, el más caro por paso",
    },
    {
        "id": "@cf/lykon/dreamshaper-8-lcm",
        "label": "DreamShaper 8 LCM",
        "multipart": True,
        "image_input": True,
        "accepts_size": True,
        "steps": 4,
        "per_tile": None,
        "note": "rápido, estilo SD",
    },
    {
        "id": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        "label": "SDXL Base 1.0",
        "multipart": True,
        "image_input": True,
        "accepts_size": True,
        "steps": 4,
        "per_tile": None,
        "note": "SDXL clásico",
    },
    {
        "id": "@cf/bytedance/stable-diffusion-xl-lightning",
        "label": "SDXL Lightning",
        "multipart": True,
        "image_input": True,
        "accepts_size": True,
        "steps": 4,
        "per_tile": None,
        "note": "pocos pasos, muy rápido",
    },
    {
        "id": "@cf/leonardo/lucid-origin",
        "label": "Lucid Origin (Leonardo)",
        "multipart": True,
        "image_input": True,
        "accepts_size": True,
        "steps": 4,
        "per_tile": 636.00,
        "per_step": 12.00,
        "note": "caro: ~2544 neuronas por 1024² (25% de la cuota diaria)",
    },
    {
        "id": "@cf/leonardo/phoenix-1.0",
        "label": "Phoenix 1.0 (Leonardo)",
        "multipart": True,
        "image_input": True,
        "accepts_size": True,
        "steps": 4,
        "per_tile": 530.00,
        "per_step": 10.00,
        "note": "caro: ~2120 neuronas por 1024²",
    },
]


def _cf_spec(model: str) -> dict[str, Any] | None:
    return next((m for m in CF_IMAGE_MODELS if m["id"] == model), None)


def _cf_estimate(spec: dict[str, Any], width: int, height: int, steps: int, has_input: bool) -> float:
    """Estimate neurons from the published Cloudflare price table."""
    tiles = max(1, -(-width // 512)) * max(1, -(-height // 512))
    if spec.get("per_mp"):
        megapixels = (width * height) / 1_000_000
        return round(spec["per_mp"] * megapixels, 2)
    if spec.get("in_tile_step"):
        est = tiles * spec["out_tile_step"] * steps
        if has_input:
            est += tiles * spec["in_tile_step"] * steps
        return round(est, 2)
    if spec.get("in_tile") or spec.get("out_tile"):
        est = tiles * (spec.get("out_tile") or 0.0)
        if has_input:
            est += tiles * (spec.get("in_tile") or 0.0)
        return round(est, 2)
    if spec.get("per_tile"):
        est = tiles * spec["per_tile"] + steps * (spec.get("per_step") or 0)
        return round(est, 2)
    return 0.0


def _cf_neurons_today() -> dict[str, Any]:
    day = time.strftime("%Y-%m-%d", time.gmtime())
    data = {"date": day, "neurons": 0.0, "requests": 0}
    if CF_NEURON_FILE.exists():
        try:
            stored = json.loads(CF_NEURON_FILE.read_text("utf-8"))
            if stored.get("date") == day:
                data.update(stored)
        except json.JSONDecodeError:
            pass
    return data


def _cf_add_neurons(estimate: float) -> None:
    day = time.strftime("%Y-%m-%d", time.gmtime())
    data = _cf_neurons_today()
    data["neurons"] = round(data.get("neurons", 0.0) + estimate, 2)
    data["requests"] = int(data.get("requests", 0)) + 1
    data["date"] = day
    try:
        CF_NEURON_FILE.write_text(json.dumps(data, indent=2), "utf-8")
    except OSError:
        pass


def _cf_estimate_neurons(model: str, width: int, height: int, steps: int) -> float:
    spec = next((m for m in CF_IMAGE_MODELS if m["id"] == model), None)
    if not spec or not spec.get("per_tile"):
        return 0.0
    tiles = max(1, -(-width // 512)) * max(1, -(-height // 512))
    return round(tiles * spec["per_tile"] + steps * spec["per_step"], 2)


def _fit_ref(data: bytes, max_side: int = 511) -> bytes:
    """FLUX.2 reference images must be strictly smaller than 512x512."""
    from io import BytesIO

    from PIL import Image  # type: ignore

    img = Image.open(BytesIO(data))
    if max(img.size) <= max_side:
        return data
    img = img.convert("RGB")
    img.thumbnail((max_side, max_side))
    out = BytesIO()
    img.save(out, format="JPEG", quality=92)
    return out.getvalue()


def _cf_run(
    model: str,
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    steps: int = 4,
    images: list[bytes] | None = None,
) -> tuple[bytes, str, float, bool]:
    """Call a Workers AI image model.

    Returns (bytes, content_type, neurons, estimated).
    `images` are reference images (image-to-image / editing).
    """
    import base64

    spec = _cf_spec(model)
    if not spec:
        raise HTTPException(status_code=400, detail=f"Modelo de Cloudflare desconocido: {model}")

    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{model}"
    images = images or []

    if spec.get("multipart"):
        data: dict[str, Any] = {"prompt": prompt}
        if spec.get("accepts_size"):
            data["width"] = str(width)
            data["height"] = str(height)
        data["num_steps"] = str(steps)
        # FLUX.2 needs the fields named input_image_0..3 (<512x512); legacy models use `image`.
        prefix = spec.get("ref_prefix")
        files = []
        for i, blob in enumerate(images):
            if prefix:
                files.append((f"{prefix}{i}", (f"ref{i}.jpg", _fit_ref(blob), "image/jpeg")))
            else:
                files.append(("image", (f"ref{i}.jpg", blob, "image/jpeg")))
        resp = requests.post(
            url, data=data, files=files, headers={"Authorization": f"Bearer {CF_TOKEN}"}, timeout=300
        )
    else:
        payload: dict[str, Any] = {"prompt": prompt}
        if steps:
            payload["steps"] = steps
        resp = requests.post(
            url, json=payload, headers={"Authorization": f"Bearer {CF_TOKEN}"}, timeout=300
        )

    if resp.headers.get("content-type", "").startswith("image/"):
        return resp.content, resp.headers["content-type"], 0.0, True
    try:
        data_json = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail=f"Respuesta inválida de Cloudflare: {resp.text[:200]}")
    if not resp.ok or not data_json.get("success", False):
        errors = data_json.get("errors") or [{"message": resp.text[:200]}]
        code = errors[0].get("code")
        message = errors[0].get("message", "error")
        if code in (4006, 429) or "daily" in message.lower():
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "insufficient_balance",
                    "balance": max(0.0, CF_FREE_NEURONS_DAILY - _cf_neurons_today()["neurons"]),
                    "message": f"Workers AI: {message}",
                    "topup": "https://dash.cloudflare.com/",
                },
            )
        raise HTTPException(status_code=502, detail=f"Cloudflare Workers AI: {message}")

    result = data_json.get("result") or {}
    image_b64 = result.get("image") or result.get("b64_json")
    if not image_b64 and isinstance(result, str):
        image_b64 = result
    if not image_b64:
        raise HTTPException(status_code=502, detail="Cloudflare no devolvió imagen")
    if image_b64.startswith("data:"):
        image_b64 = image_b64.split(",", 1)[-1]
    raw = base64.b64decode(image_b64)
    reported = float((result.get("usage") or {}).get("neurons") or 0.0)
    estimated = not reported
    if not reported:
        reported = _cf_estimate(spec, width, height, steps, bool(images))
    content_type = (
        "image/png" if raw[:4] == b"\x89PNG" else "image/jpeg" if raw[:2] == b"\xff\xd8" else "image/webp"
    )
    return raw, content_type, round(reported, 2), estimated


# --------------------------------------------------------------------------- models
class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    negative_prompt: Optional[str] = Field(default=None, max_length=2000)
    model: str = "flux"
    size: str = "1024x1024"
    quality: Optional[str] = None
    seed: Optional[int] = None
    guidance_scale: Optional[float] = None
    nologo: bool = True
    private: bool = True
    nofeed: bool = True
    enhance: bool = False
    safe: bool = False
    image: Optional[str] = None
    background: str = "auto"  # auto | white | green  (solid backdrop for later cutout)
    provider: str = "pollinations"  # pollinations | cloudflare
    steps: Optional[int] = None


class RemoveBgRequest(BaseModel):
    filename: str


# --------------------------------------------------------------------------- helpers
def _read_index() -> list[dict[str, Any]]:
    if not INDEX_FILE.exists():
        return []
    try:
        return json.loads(INDEX_FILE.read_text("utf-8"))
    except json.JSONDecodeError:
        return []


def _write_index(entries: list[dict[str, Any]]) -> None:
    INDEX_FILE.write_text(json.dumps(entries, indent=2, ensure_ascii=False), "utf-8")


def _store(entry: dict[str, Any]) -> None:
    with _index_lock:
        entries = [e for e in _read_index() if e["id"] != entry["id"]]
        entries.insert(0, entry)
        _write_index(entries[:500])


def _remove_entry(filename: str) -> None:
    with _index_lock:
        entries = [e for e in _read_index() if e.get("file") != filename]
        _write_index(entries)


def _safe_name(name: str) -> str:
    parts = [p for p in Path(name).parts if p not in ("..", "/", "\\")]
    return str(Path(*parts)) if parts else ""


def _cutout(src: Path, dst: Path) -> None:
    """Remove the background with rembg (u2netp: small model, fast download).

    Runs in a worker thread so a slow model download cannot hang the API forever.
    """
    from concurrent.futures import ThreadPoolExecutor
    from concurrent.futures import TimeoutError as FutureTimeout

    def work() -> None:
        from PIL import Image  # type: ignore
        from rembg import new_session, remove  # type: ignore

        session = new_session("u2netp")
        data = remove(Image.open(src).convert("RGBA"), session=session)
        data.save(dst)

    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(work)
        try:
            future.result(timeout=300)
        except FutureTimeout as exc:
            future.cancel()
            raise TimeoutError from exc


# --------------------------------------------------------------------------- routes
@app.get("/api/frames/dirs")
def frames_dirs() -> dict[str, Any]:
    """Sequence folders already on disk (jobs live in memory, files persist)."""
    root = OUTPUTS / "frames"
    dirs = []
    if root.exists():
        for d in sorted(root.iterdir(), reverse=True):
            frames = sorted(d.glob("frame-*.jpg"))
            if frames:
                dirs.append({"id": d.name, "frames": len(frames), "url": f"outputs/frames/{d.name}"})
    return {"dirs": dirs}


def _apply_stickers(job_dir: Path, frames: list[Path], stickers: list[dict[str, Any]]) -> list[Path]:
    """Composite sticker PNGs onto every frame (replicated to all frames)."""
    from PIL import Image

    tmp = job_dir / "_stamped"
    if tmp.exists():
        for p in tmp.glob("*"):
            p.unlink(missing_ok=True)
    tmp.mkdir(exist_ok=True)
    out: list[Path] = []
    for f in frames:
        im = Image.open(f).convert("RGBA")
        W, H = im.size
        for s in stickers:
            try:
                st = Image.open(job_dir / str(s.get("file") or "")).convert("RGBA")
            except Exception:
                continue
            pct = max(0.05, min(1.0, float(s.get("scale") or 25) / 100.0))
            sw = max(8, int(W * pct))
            sh = max(8, int(st.height * sw / max(1, st.width)))
            st = st.resize((sw, sh))
            x = int((W - sw) * (float(s.get("x") or 50) / 100.0))
            y = int((H - sh) * (float(s.get("y") or 50) / 100.0))
            im.alpha_composite(st, (max(0, x), max(0, y)))
        p = tmp / f.name
        im.convert("RGB").save(p, "JPEG", quality=92)
        out.append(p)
    return out


def _frame_durations(frames: list[Path], sheet: list[Any], fps: int) -> tuple[list[float], bool]:
    """Per-frame seconds from the sheet; None duration = 1/fps. Returns (durations, variable)."""
    durations: list[float] = []
    variable = False
    for i in range(len(frames)):
        beat = sheet[i] if i < len(sheet) and isinstance(sheet[i], dict) else {}
        d = beat.get("duration")
        if d:
            variable = True
            durations.append(max(0.05, min(5.0, float(d))))
        else:
            durations.append(1.0 / max(1, fps))
    return durations, variable


def _render_sequence(
    job_dir: Path,
    frames: list[Path],
    fps: int,
    fmt: str,
    meta: dict[str, Any],
) -> Path:
    """MP4/GIF with optional per-frame durations (<=10s total), stickers and music."""
    import subprocess

    fps = max(6, min(60, fps))
    req = meta.get("request") or {}
    sheet = req.get("sheet") or []
    stickers = [s for s in (meta.get("stickers") or []) if isinstance(s, dict)]
    music = meta.get("music") or {}
    music_path = job_dir / str(music.get("file") or "") if music.get("file") else None
    if music_path is not None and not music_path.is_file():
        music_path = None

    if stickers:
        frames = _apply_stickers(job_dir, frames, stickers)

    durations, variable = _frame_durations(frames, sheet, fps)
    total = sum(durations)
    if total > 10.0:
        k = 10.0 / total
        durations = [d * k for d in durations]

    out = job_dir / f"sequence.{fmt}"
    pattern = str(job_dir / "frame-%02d.jpg")

    if variable:
        lst = job_dir / ("concat-stamped.txt" if stickers else "concat.txt")
        lines: list[str] = []
        for f, d in zip(frames, durations):
            lines.append(f"file '{f.name}'")
            lines.append(f"duration {d:.4f}")
        lines.append(f"file '{frames[-1].name}'")
        lst.write_text("\n".join(lines), encoding="utf-8")
        video_in = ["-f", "concat", "-safe", "0", "-i", str(lst)]
    else:
        if stickers:
            # stamped dir has explicit files; build pattern-safe sequence via concat too
            lst = job_dir / "concat-stamped.txt"
            lst.write_text(
                "\n".join(f"file '{f.name}'" for f in frames), encoding="utf-8"
            )
            video_in = ["-f", "concat", "-safe", "0", "-i", str(lst)]
        else:
            video_in = ["-framerate", str(fps), "-i", pattern]

    if fmt == "mp4":
        cmd = ["ffmpeg", "-y", *video_in]
        if music_path is not None:
            cmd += ["-i", str(music_path)]
        vf = "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p"
        if music_path is not None:
            cmd += [
                "-map", "0:v:0", "-map", "1:a:0",
                "-vf", vf,
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                "-c:a", "aac", "-shortest",
                str(out),
            ]
        else:
            cmd += [
                "-vf", vf,
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                str(out),
            ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0 or not out.exists():
            raise HTTPException(status_code=500, detail=f"ffmpeg falló: {proc.stderr[-400:]}")
        return out

    # GIF: two-pass palette
    palette = job_dir / "palette.png"
    proc = subprocess.run(
        ["ffmpeg", "-y", *video_in, "-filter_complex", "[0:v]palettegen", str(palette)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0 or not palette.exists():
        raise HTTPException(status_code=500, detail=f"ffmpeg falló: {proc.stderr[-400:]}")
    proc = subprocess.run(
        ["ffmpeg", "-y", *video_in, "-i", str(palette), "-lavfi", "paletteuse", str(out)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0 or not out.exists():
        raise HTTPException(status_code=500, detail=f"ffmpeg falló: {proc.stderr[-400:]}")
    return out


@app.post("/api/frames/export-dir")
def export_dir(payload: dict[str, Any]) -> dict[str, Any]:
    """Build an MP4/GIF from a sequence folder on disk (no job needed)."""
    name = _safe_name(str(payload.get("dir", "")))
    job_dir = OUTPUTS / "frames" / name
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Secuencia no encontrada")
    frames = sorted(job_dir.glob("frame-*.jpg"))
    if not frames:
        raise HTTPException(status_code=404, detail="Sin cuadros")

    fps = int(payload.get("fps", 12))
    fmt = "gif" if payload.get("format") == "gif" else "mp4"
    meta = _load_meta(name) or {}
    out = _render_sequence(job_dir, frames, fps, fmt, meta)
    return {"ok": True, "file": f"frames/{name}/{out.name}", "url": f"outputs/frames/{name}/{out.name}",
            "frames": len(frames)}


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "key_configured": bool(API_KEY), "frames": len(JOBS)}


# --------------------------------------------------------------------- sequence
class SheetBeat(BaseModel):
    action: str = "hold"
    delta: str = ""
    duration: Optional[float] = Field(default=None, ge=0.05, le=5.0)  # seconds; None = 1/fps


class FramesRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    frames: int = Field(default=6, ge=2, le=60)
    motion: str = ""
    sheet: Optional[list[SheetBeat]] = None
    base_image: Optional[str] = None
    model: str = "dreamshaper"
    size: str = "1024x1024"
    quality: Optional[str] = None
    seed: Optional[int] = None
    negative_prompt: Optional[str] = None
    background: str = "auto"
    anchor: str = "first"  # first | previous | both
    nologo: bool = True
    private: bool = True
    nofeed: bool = True
    cutout: bool = False
    provider: str = "pollinations"  # pollinations | cloudflare


JOBS: dict[str, dict[str, Any]] = {}


def _job_dir(job_id: str) -> Path:
    d = OUTPUTS / "frames" / job_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def _patch_meta(job_id: str, extra: dict[str, Any]) -> None:
    """Merge keys into job.json without touching the rest (music/stickers/... survive)."""
    path = _job_dir(job_id) / "job.json"
    payload: dict[str, Any] = {}
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                payload = data
        except ValueError:
            payload = {}
    payload.update(extra)
    payload.setdefault("created_at", time.strftime("%Y-%m-%d %H:%M:%S"))
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _save_meta(job_id: str, req: FramesRequest) -> None:
    """Persist the request so jobs survive a server restart (keeps music/stickers)."""
    _patch_meta(job_id, {"request": req.model_dump()})


def _load_meta(job_id: str) -> dict[str, Any] | None:
    path = _job_dir(job_id) / "job.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def _job_from_disk(job_id: str) -> dict[str, Any]:
    """Rebuild a job view from disk (frames + job.json) when it is not in memory."""
    safe_id = _safe_name(job_id)
    job_dir = OUTPUTS / "frames" / safe_id
    files = sorted(job_dir.glob("frame-*.jpg")) if job_dir.is_dir() else []
    if not files:
        raise HTTPException(status_code=404, detail="Secuencia no encontrada")
    meta = _load_meta(safe_id) or {}
    req = meta.get("request") or {}
    sheet = req.get("sheet") or []
    entries: list[dict[str, Any]] = []
    for i, f in enumerate(files):
        beat = sheet[i] if i < len(sheet) and isinstance(sheet[i], dict) else {}
        delta = str(beat.get("delta") or "")
        prompt = str(req.get("prompt") or "")
        if delta:
            prompt = f"{prompt}. {delta}".strip(". ")
        entries.append(
            {
                "id": f"{safe_id}-{i + 1:02d}",
                "file": f"frames/{safe_id}/{f.name}",
                "url": f"outputs/frames/{safe_id}/{f.name}",
                "prompt": prompt,
                "model": req.get("model", ""),
                "size": req.get("size", ""),
                "job": safe_id,
                "frame": i + 1,
                "action": str(beat.get("action") or ""),
            }
        )
    total = int(req.get("frames") or 0) or len(files)
    complete = len(files) >= total
    out: dict[str, Any] = {
        "id": safe_id,
        "state": "done" if complete else "paused",
        "total": max(total, len(files)),
        "completed": len(files),
        "frames": entries,
        "error": None,
        "request": req,
        "from_disk": True,
    }
    for k in ("music", "stickers", "attachments"):
        if k in meta:
            out[k] = meta[k]
    return out


def _edit_image(references: list[bytes], prompt: str, model: str) -> bytes:
    """Call the OpenAI-compatible edits endpoint (multipart) and return PNG/JPEG bytes."""
    import base64

    boundary = "----jmrv" + uuid.uuid4().hex[:12]
    body = b""
    for name, value in (("model", model), ("prompt", prompt)):
        body += (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n"
        ).encode("utf-8")
    for idx, data in enumerate(references):
        body += (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; "
            f"filename=\"ref{idx}.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n"
        ).encode("utf-8")
        body += data + b"\r\n"
    body += f"--{boundary}--\r\n".encode("utf-8")

    resp = requests.post(
        "https://gen.pollinations.ai/v1/images/edits",
        data=body,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        timeout=300,
    )
    try:
        resp.raise_for_status()
    except requests.HTTPError as exc:
        raise _pollinations_error(exc, "Fallo en /v1/images/edits") from exc
    payload = resp.json()
    item = payload["data"][0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    url = item.get("url")
    if not url:
        raise HTTPException(status_code=502, detail="Respuesta de edits sin imagen")
    return _download_bytes(url)


def _download_bytes(url: str) -> bytes:
    headers = {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}
    try:
        resp = requests.get(url, headers=headers, timeout=300)
        resp.raise_for_status()
    except requests.HTTPError as exc:
        raise _pollinations_error(exc, "Fallo al descargar imagen") from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Fallo al descargar imagen: {exc}") from exc
    return resp.content


def _motion_lines(motion: str, count: int) -> list[str]:
    """One delta prompt per frame; a single line applies to every frame."""
    lines = [ln.strip() for ln in (motion or "").splitlines() if ln.strip()]
    if not lines:
        return [""] * count
    if len(lines) == 1:
        return lines * count
    out = lines[:count]
    while len(out) < count:
        out.append(lines[len(out) % len(lines)])
    return out


EDIT_LOCK = (
    "Exact continuity edit of the reference image. "
    "Keep everything identical: character identity and face, outfit, colors, art style, "
    "background, camera angle, framing and lighting. "
    "Do not redesign, restyle, reframe or replace anything. "
)

# Basic cinematic action vocabulary: key -> (label_es, delta_en).
ACTIONS: dict[str, tuple[str, str]] = {
    "hold": ("Mantener pose", "the scene stays exactly the same, subject static, same pose"),
    "appear": ("Aparecer", "the subject is appearing, materializing from soft light, semi-transparent"),
    "disappear": ("Desaparecer", "the subject is disappearing, fading away, becoming translucent"),
    "enter": ("Entrar en cuadro", "the subject enters the frame from the left edge"),
    "exit": ("Salir del cuadro", "the subject exits the frame toward the right edge"),
    "move-left": ("Mover a la izquierda", "the subject has shifted to the left side of the frame"),
    "move-right": ("Mover a la derecha", "the subject has shifted to the right side of the frame"),
    "walk": ("Caminar", "the subject is walking, mid-stride natural gait"),
    "run": ("Correr", "the subject is running, dynamic full-stride pose with energy"),
    "jump": ("Saltar", "the subject is jumping, airborne with feet off the ground"),
    "turn": ("Girar", "the subject has turned slightly to a three-quarter view"),
    "crouch": ("Agacharse", "the subject is crouching low to the ground"),
    "wave": ("Saludar", "the subject is raising a hand waving"),
    "camera-in": ("Acercar cámara", "camera moved closer, tighter framing on the subject"),
    "camera-out": ("Alejar cámara", "camera moved farther, wider framing"),
    "pan-left": ("Paneo a la izquierda", "camera panned left, background shifted right"),
    "pan-right": ("Paneo a la derecha", "camera panned right, background shifted left"),
    "shake": ("Sacudir cámara", "slight camera shake, subtle dutch tilt"),
}


def _sheet_deltas(req: FramesRequest, count: int) -> list[tuple[str, str]]:
    """(action, delta) per frame: sheet first, then motion lines, else hold."""
    if req.sheet:
        rows = [
            (b.action if b.action in ACTIONS else "custom", b.delta.strip())
            for b in req.sheet
        ][:count]
        rows += [("hold", "")] * (count - len(rows))
        return rows
    return [("", ln) for ln in _motion_lines(req.motion, count)]


def _beat_fragment(action: str, delta: str) -> str:
    if delta:
        return delta
    if action in ACTIONS:
        return ACTIONS[action][1]
    return ACTIONS["hold"][1]


def _edit_prompt(base_prompt: str, frag: str, negative: str = "") -> str:
    """Identity-locked edit prompt: reference stays, only the beat changes.

    The base scene must stay in the prompt: without a subject description the
    model ignores the reference and invents a new one.
    """
    text = (
        EDIT_LOCK
        + f"The exact scene and subject of the reference image: {base_prompt}. "
        + f"Apply only this change: {frag}."
    )
    if negative:
        text += f" Avoid: {negative}"
    return text


def _load_base_image(rel: str) -> bytes:
    parts = [p for p in Path(_safe_name(rel)).parts if p]
    if not parts:
        raise HTTPException(status_code=400, detail="Imagen base no válida")
    target = OUTPUTS.joinpath(*parts)
    if not target.is_file():
        raise HTTPException(status_code=404, detail=f"Imagen base no encontrada: {rel}")
    return target.read_bytes()


def _free_chat(instruction: str, system: str = "", timeout: int = 60) -> str:
    """Free text endpoint (no API key, no balance): text.pollinations.ai."""
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": instruction})
    resp = requests.post(
        "https://text.pollinations.ai/openai",
        json={"model": "openai", "messages": messages},
        timeout=timeout,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return content if isinstance(content, str) else json.dumps(content)


def _run_sequence(job_id: str, req: FramesRequest, start: int = 0) -> None:
    job = JOBS[job_id]
    job["state"] = "running"
    job["error"] = None
    try:
        job_dir = _job_dir(job_id)
        beats = _sheet_deltas(req, req.frames)
        width, height = (int(v) for v in req.size.split("x"))

        # frame 1: plain generation
        base = req.prompt
        if req.background == "white":
            base += ", isolated subject on a solid pure white background, no shadow, full body visible"
        elif req.background == "green":
            base += ", isolated subject on a solid chroma key green background (#00FF00), no shadow, full body visible"

        entries: list[dict[str, Any]] = list(job.get("frames", []))

        if start == 0:
            frame_prompt = f"{base}. {_beat_fragment(*beats[0])}".strip(". ")
            if req.base_image:
                # Image X as frame 1: copied, no cost; every later frame derives from it.
                data = _load_base_image(req.base_image)
            elif req.provider == "cloudflare":
                if not (CF_TOKEN and CF_ACCOUNT_ID):
                    raise HTTPException(status_code=503, detail="Falta CLOUDFLARE_TOKEN o CLOUDFLARE_ACCOUNT_ID")
                spec = _cf_spec(req.model)
                if not spec:
                    raise HTTPException(status_code=400, detail=f"Modelo de Cloudflare desconocido: {req.model}")
                try:
                    data, _ctype, neurons, _est = _cf_run(
                        req.model, frame_prompt, width, height, int(spec.get("steps") or 4), []
                    )
                except HTTPException:
                    raise
                except requests.RequestException as exc:
                    raise RuntimeError(f"frame 1: {exc}") from exc
                _cf_add_neurons(neurons)
            else:
                gen_kwargs: dict[str, Any] = {
                    "prompt": frame_prompt,
                    "model": req.model,
                    "width": width,
                    "height": height,
                    "nologo": req.nologo,
                    "private": req.private,
                    "nofeed": req.nofeed,
                }
                if req.quality:
                    gen_kwargs["quality"] = req.quality
                if req.seed is not None:
                    gen_kwargs["seed"] = req.seed
                if req.negative_prompt:
                    gen_kwargs["negative_prompt"] = req.negative_prompt

                try:
                    url = client.generate_image(**gen_kwargs)
                    data = _download_bytes(url)
                except HTTPException:
                    raise
                except Exception as exc:  # noqa: BLE001
                    raise RuntimeError(f"frame 1: {exc}") from exc

            first = data
            previous = data
        else:
            first = (job_dir / "frame-01.jpg").read_bytes()
            previous = (job_dir / f"frame-{start:02d}.jpg").read_bytes()

        for i in range(start, req.frames):
            action, delta = beats[i]
            if i > 0:
                refs = {"first": [first], "previous": [previous], "both": [first, previous]}[req.anchor]
                prompt = _edit_prompt(base, _beat_fragment(action, delta), req.negative_prompt or "")
                if req.provider == "cloudflare":
                    spec = _cf_spec(req.model)
                    if not spec:
                        raise HTTPException(status_code=400, detail=f"Modelo de Cloudflare desconocido: {req.model}")
                    if not spec.get("image_input"):
                        raise HTTPException(
                            status_code=400,
                            detail=f"{req.model} no edita; usa flux-2-klein-4b para secuencias",
                        )
                    try:
                        data, _ctype, neurons, _est = _cf_run(
                            req.model, prompt, width, height, int(spec.get("steps") or 4), refs
                        )
                    except HTTPException:
                        raise
                    except requests.RequestException as exc:
                        raise RuntimeError(f"frame {i + 1}: {exc}") from exc
                    _cf_add_neurons(neurons)
                else:
                    try:
                        data = _edit_image(refs, prompt, req.model)
                    except HTTPException:
                        raise
                    except Exception as exc:  # noqa: BLE001
                        raise RuntimeError(f"frame {i + 1}: {exc}") from exc
                previous = data

            name = f"frame-{i + 1:02d}.jpg"
            (job_dir / name).write_bytes(data)
            entry = {
                "id": f"{job_id}-{i + 1:02d}",
                "file": f"frames/{job_id}/{name}",
                "url": f"outputs/frames/{job_id}/{name}",
                "prompt": f"{base}. {_beat_fragment(action, delta)}".strip(". "),
                "action": action or "custom",
                "model": req.model,
                "size": req.size,
                "seed": req.seed,
                "background": req.background,
                "job": job_id,
                "frame": i + 1,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
            entries = [e for e in entries if e.get("frame") != i + 1]
            entries.append(entry)
            entries.sort(key=lambda e: e.get("frame", 0))
            job["frames"] = entries
            job["completed"] = i + 1

            if req.cutout:
                try:
                    alpha = job_dir / f"frame-{i + 1:02d}-alpha.png"
                    _cutout(job_dir / name, alpha)
                    entry["alpha_url"] = f"outputs/frames/{job_id}/{alpha.name}"
                except Exception as exc:  # noqa: BLE001
                    entry["alpha_error"] = str(exc)

        for entry in entries:
            _store(entry)

        job["frames"] = entries
        job["state"] = "done"
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
        job["error"] = detail
        job["state"] = "paused" if exc.status_code == 402 else "error"
        if exc.status_code == 402:
            job["paused_at"] = job.get("completed", 0)
    except Exception as exc:  # noqa: BLE001
        job["state"] = "error"
        job["error"] = str(exc)


@app.post("/api/frames/{job_id}/resume")
def resume_frames(job_id: str) -> dict[str, Any]:
    """Continue a paused sequence (after topping up the balance)."""
    job = JOBS.get(job_id) or _job_from_disk(job_id)
    JOBS[job_id] = job
    if job["state"] not in ("paused", "error"):
        raise HTTPException(status_code=409, detail="La secuencia no está pausada")
    if not job.get("request"):
        raise HTTPException(
            status_code=400,
            detail="Sin job.json: esta secuencia antigua no se puede reanudar",
        )
    req = FramesRequest(**job["request"])
    job_dir = _job_dir(job_id)
    start = len(sorted(job_dir.glob("frame-*.jpg")))
    job.update({"state": "queued", "completed": start, "error": None})
    threading.Thread(target=_run_sequence, args=(job_id, req, start), daemon=True).start()
    return {"job_id": job_id, "resuming_from": start + 1, "total": req.frames}


class ExtendRequest(BaseModel):
    frames: int = Field(ge=2, le=60)  # new total
    sheet: Optional[list[SheetBeat]] = None  # beats for the NEW frames only


@app.post("/api/frames/{job_id}/extend")
def extend_frames(job_id: str, body: ExtendRequest) -> dict[str, Any]:
    """Append frames to an existing sequence (works after a server restart)."""
    job = JOBS.get(job_id)
    if not job:
        job = _job_from_disk(job_id)
        if not job.get("request"):
            raise HTTPException(
                status_code=400,
                detail="Sin job.json: esta secuencia antigua no se puede ampliar",
            )
        JOBS[job_id] = job
    if job.get("state") in ("running", "queued"):
        raise HTTPException(status_code=409, detail="La secuencia ya está en marcha")
    if not job.get("request"):
        raise HTTPException(status_code=400, detail="Sin metadatos de la secuencia")
    req = FramesRequest(**job["request"])
    job_dir = _job_dir(job_id)
    existing = len(sorted(job_dir.glob("frame-*.jpg")))
    if existing == 0:
        raise HTTPException(status_code=404, detail="Sin cuadros en disco")
    if body.frames <= existing:
        raise HTTPException(
            status_code=400,
            detail=f"Ya hay {existing} cuadros; pide un total mayor que {existing}",
        )

    needed = body.frames - existing
    new_rows = list(body.sheet or [])
    while len(new_rows) < needed:
        new_rows.append(SheetBeat(action="hold", delta=""))
    new_rows = new_rows[:needed]

    old_sheet = list(req.sheet or [])
    if old_sheet:
        base = old_sheet[:existing]
        base += [SheetBeat(action="hold", delta="")] * (existing - len(base))
        req.sheet = base + new_rows
    elif body.sheet is not None:
        req.sheet = [SheetBeat(action="hold", delta="")] * existing + new_rows
    # else: keep req.sheet None so the motion-lines fallback keeps cycling

    req.frames = body.frames
    _save_meta(job_id, req)
    job.update(
        {
            "state": "queued",
            "total": body.frames,
            "completed": existing,
            "error": None,
            "request": req.model_dump(),
        }
    )
    threading.Thread(target=_run_sequence, args=(job_id, req, existing), daemon=True).start()
    return {"job_id": job_id, "resuming_from": existing + 1, "total": body.frames}


class RegenerateRequest(BaseModel):
    from_frame: int = Field(ge=2, le=60)
    sheet: Optional[list[SheetBeat]] = None  # rows covering from_frame..total


@app.post("/api/frames/{job_id}/regenerate")
def regenerate_frames(job_id: str, body: RegenerateRequest) -> dict[str, Any]:
    """Delete frames >= from_frame and re-render them (works after a restart)."""
    job = JOBS.get(job_id)
    if not job:
        job = _job_from_disk(job_id)
        if not job.get("request"):
            raise HTTPException(
                status_code=400,
                detail="Sin job.json: esta secuencia antigua no se puede regenerar",
            )
        JOBS[job_id] = job
    if job.get("state") in ("running", "queued"):
        raise HTTPException(status_code=409, detail="La secuencia ya está en marcha")
    if not job.get("request"):
        raise HTTPException(status_code=400, detail="Sin metadatos de la secuencia")
    req = FramesRequest(**job["request"])
    job_dir = _job_dir(job_id)
    existing = len(sorted(job_dir.glob("frame-*.jpg")))
    if existing == 0:
        raise HTTPException(status_code=404, detail="Sin cuadros en disco")
    if body.from_frame > existing:
        raise HTTPException(
            status_code=400,
            detail=f"Solo hay {existing} cuadros; usa extend para añadir al final",
        )

    keep = body.from_frame - 1
    if body.sheet is not None:
        rows = list(req.sheet or [])
        replace_n = req.frames - keep
        new_rows = list(body.sheet)
        while len(new_rows) < replace_n:
            new_rows.append(SheetBeat(action="hold", delta=""))
        while len(rows) < keep:
            rows.append(SheetBeat(action="hold", delta=""))
        req.sheet = (rows[:keep] + new_rows[:replace_n])[: req.frames]
    elif req.sheet is not None:
        rows = list(req.sheet)
        while len(rows) < req.frames:
            rows.append(SheetBeat(action="hold", delta=""))
        req.sheet = rows[: req.frames]
    # else: keep req.sheet None so the motion-lines fallback keeps cycling

    for p in sorted(job_dir.glob("frame-*.jpg")):
        try:
            idx = int(p.stem.split("-")[-1])
        except ValueError:
            continue
        if idx >= body.from_frame:
            p.unlink(missing_ok=True)
            (job_dir / f"frame-{idx:02d}-alpha.png").unlink(missing_ok=True)

    _save_meta(job_id, req)
    job.update(
        {
            "state": "queued",
            "total": req.frames,
            "completed": keep,
            "error": None,
            "request": req.model_dump(),
        }
    )
    threading.Thread(target=_run_sequence, args=(job_id, req, keep), daemon=True).start()
    return {"job_id": job_id, "resuming_from": keep + 1, "total": req.frames}


# ------------------------------------------------- timeline edits (music/stickers)
def _editable_job(job_id: str) -> dict[str, Any]:
    job = JOBS.get(job_id)
    if not job:
        job = _job_from_disk(job_id)
        if not job.get("request"):
            raise HTTPException(
                status_code=400,
                detail="Sin job.json: esta secuencia antigua no se puede editar",
            )
        JOBS[job_id] = job
    return job


def _b64(data: str) -> bytes:
    import base64 as b64

    try:
        raw = b64.b64decode(data, validate=False)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="base64 inválido") from exc
    if not raw:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    return raw


class FileUpload(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    data: str  # base64
    x: Optional[float] = None
    y: Optional[float] = None
    scale: Optional[float] = None


class SheetPatch(BaseModel):
    sheet: list[SheetBeat]


@app.patch("/api/frames/{job_id}/sheet")
def patch_sheet(job_id: str, body: SheetPatch) -> dict[str, Any]:
    """Save action/delta/duration edits without regenerating images."""
    job = _editable_job(job_id)
    if job.get("state") in ("running", "queued"):
        raise HTTPException(status_code=409, detail="La secuencia ya está en marcha")
    req = FramesRequest(**job["request"])
    rows = list(body.sheet)
    while len(rows) < req.frames:
        rows.append(SheetBeat(action="hold", delta=""))
    req.sheet = rows[: req.frames]
    job["request"] = req.model_dump()
    _save_meta(job_id, req)
    return {"ok": True, "sheet": [r.model_dump() for r in req.sheet]}


@app.post("/api/frames/{job_id}/music")
def upload_music(job_id: str, body: FileUpload) -> dict[str, Any]:
    job = _editable_job(job_id)
    job_dir = _job_dir(job_id)
    raw = _b64(body.data)
    if len(raw) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio >20MB")
    ext = Path(body.name).suffix.lower() or ".mp3"
    if ext not in (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"):
        raise HTTPException(status_code=400, detail="Formato de audio no soportado")
    fname = f"music{ext}"
    (job_dir / fname).write_bytes(raw)
    meta = {"file": fname, "name": Path(body.name).name}
    job["music"] = meta
    _patch_meta(job_id, {"music": meta})
    return {"ok": True, "music": meta}


@app.delete("/api/frames/{job_id}/music")
def delete_music(job_id: str) -> dict[str, Any]:
    job = _editable_job(job_id)
    job_dir = _job_dir(job_id)
    music = job.get("music") or {}
    if music.get("file"):
        (job_dir / str(music["file"])).unlink(missing_ok=True)
    job.pop("music", None)
    _patch_meta(job_id, {"music": None})
    return {"ok": True}


@app.post("/api/frames/{job_id}/stickers")
def upload_sticker(job_id: str, body: FileUpload) -> dict[str, Any]:
    job = _editable_job(job_id)
    job_dir = _job_dir(job_id)
    raw = _b64(body.data)
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Sticker >5MB")
    ext = Path(body.name).suffix.lower()
    if ext not in (".png", ".webp", ".gif"):
        raise HTTPException(status_code=400, detail="Sticker debe ser PNG/WebP/GIF (con alfa)")
    stickers = [s for s in (job.get("stickers") or []) if isinstance(s, dict)]
    fname = f"sticker-{len(stickers) + 1}{ext}"
    (job_dir / fname).write_bytes(raw)
    meta = {
        "file": fname,
        "name": Path(body.name).name,
        "x": max(0.0, min(100.0, float(body.x if body.x is not None else 50))),
        "y": max(0.0, min(100.0, float(body.y if body.y is not None else 50))),
        "scale": max(5.0, min(100.0, float(body.scale if body.scale is not None else 25))),
    }
    stickers.append(meta)
    job["stickers"] = stickers
    _patch_meta(job_id, {"stickers": stickers})
    return {"ok": True, "stickers": stickers}


@app.put("/api/frames/{job_id}/stickers/{index}")
def update_sticker(job_id: str, index: int, body: FileUpload) -> dict[str, Any]:
    job = _editable_job(job_id)
    stickers = [s for s in (job.get("stickers") or []) if isinstance(s, dict)]
    if index < 0 or index >= len(stickers):
        raise HTTPException(status_code=404, detail="Sticker no encontrado")
    if body.x is not None:
        stickers[index]["x"] = max(0.0, min(100.0, float(body.x)))
    if body.y is not None:
        stickers[index]["y"] = max(0.0, min(100.0, float(body.y)))
    if body.scale is not None:
        stickers[index]["scale"] = max(5.0, min(100.0, float(body.scale)))
    job["stickers"] = stickers
    _patch_meta(job_id, {"stickers": stickers})
    return {"ok": True, "stickers": stickers}


@app.delete("/api/frames/{job_id}/stickers/{index}")
def delete_sticker(job_id: str, index: int) -> dict[str, Any]:
    job = _editable_job(job_id)
    job_dir = _job_dir(job_id)
    stickers = [s for s in (job.get("stickers") or []) if isinstance(s, dict)]
    if index < 0 or index >= len(stickers):
        raise HTTPException(status_code=404, detail="Sticker no encontrado")
    (job_dir / str(stickers[index].get("file") or "")).unlink(missing_ok=True)
    stickers.pop(index)
    job["stickers"] = stickers
    _patch_meta(job_id, {"stickers": stickers})
    return {"ok": True, "stickers": stickers}


@app.post("/api/frames/{job_id}/attachments")
def upload_attachment(job_id: str, body: FileUpload) -> dict[str, Any]:
    job = _editable_job(job_id)
    job_dir = _job_dir(job_id) / "attachments"
    job_dir.mkdir(exist_ok=True)
    raw = _b64(body.data)
    if len(raw) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Archivo >25MB")
    fname = _safe_name(Path(body.name).name)
    (job_dir / fname).write_bytes(raw)
    files = [a for a in (job.get("attachments") or []) if isinstance(a, dict)]
    meta = {"file": f"attachments/{fname}", "name": Path(body.name).name, "bytes": len(raw)}
    files.append(meta)
    job["attachments"] = files
    _patch_meta(job_id, {"attachments": files})
    return {"ok": True, "attachments": files}


@app.delete("/api/frames/{job_id}/attachments/{index}")
def delete_attachment(job_id: str, index: int) -> dict[str, Any]:
    job = _editable_job(job_id)
    job_dir = _job_dir(job_id)
    files = [a for a in (job.get("attachments") or []) if isinstance(a, dict)]
    if index < 0 or index >= len(files):
        raise HTTPException(status_code=404, detail="Adjunto no encontrado")
    (job_dir / str(files[index].get("file") or "")).unlink(missing_ok=True)
    files.pop(index)
    job["attachments"] = files
    _patch_meta(job_id, {"attachments": files})
    return {"ok": True, "attachments": files}


@app.get("/api/frames/{job_id}/states")
def list_states(job_id: str) -> dict[str, Any]:
    job_dir = _job_dir(job_id)
    states = [p.stem.replace("state-", "") for p in job_dir.glob("state-*.json")]
    return {"ok": True, "states": states}


@app.get("/api/frames/{job_id}/state/{name}")
def get_state(job_id: str, name: str) -> dict[str, Any]:
    job_dir = _job_dir(job_id)
    path = job_dir / f"state-{_safe_name(name)}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Estado no encontrado")
    return json.loads(path.read_text(encoding="utf-8"))


@app.post("/api/frames/{job_id}/state")
def save_state(job_id: str, body: dict[str, Any]) -> dict[str, Any]:
    name = _safe_name(body.get("name", "default"))
    sheet = body.get("sheet")
    job_dir = _job_dir(job_id)
    (job_dir / f"state-{name}.json").write_text(json.dumps({"sheet": sheet}, ensure_ascii=False))
    return {"ok": True}
def create_sheet(payload: dict[str, Any]) -> dict[str, Any]:
    """Break a prompt into a frame-by-frame animation sheet using the free text model."""
    prompt = str(payload.get("prompt", "")).strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt vacío")
    count = max(2, min(60, int(payload.get("frames") or 6)))
    motion = str(payload.get("motion", "")).strip()

    keys = ", ".join(ACTIONS)
    instruction = (
        f"Break this sequence request into exactly {count} animation beats (frame 1..{count}). "
        "Frame 1 is the base pose; each later frame progresses one clear cinematic action, "
        "so the whole sheet reads as one short coherent shot.\n"
        f"Allowed action keys: {keys}.\n"
        "Reply with ONLY a raw JSON array of objects, no markdown, no commentary:\n"
        '[{"action": "<key>", "delta": "<one short English phrase: ONLY what changes in this frame>"}]\n'
        "Deltas must never redesign the subject: only motion, pose or camera changes.\n\n"
        f"Request: {prompt}"
    )
    if motion:
        instruction += f"\n\nUser beat lines (keep them, in order):\n{motion}"

    rows: list[dict[str, str]] = []
    try:
        text = _free_chat(
            instruction,
            system="You are a storyboard editor. Reply with raw JSON only.",
        )
        if not isinstance(text, str):
            text = json.dumps(text)
        start_idx = text.find("[")
        end_idx = text.rfind("]")
        parsed = json.loads(text[start_idx : end_idx + 1]) if start_idx >= 0 and end_idx > start_idx else []
        for item in parsed[:count]:
            if not isinstance(item, dict):
                continue
            action = str(item.get("action", "hold"))
            if action not in ACTIONS:
                action = "hold"
            rows.append({"action": action, "delta": str(item.get("delta", "")).strip()[:300]})
    except Exception:  # noqa: BLE001
        rows = []
    if not rows:
        # rule-based fallback: base pose, beats from motion lines or key cycle, closing hold
        lines = _motion_lines(motion, count)
        cycle = ["move-right", "walk", "turn", "camera-in", "run", "jump", "camera-out", "pan-right"]
        for i in range(count):
            if i == 0 or i == count - 1:
                rows.append({"action": "hold", "delta": ""})
            elif lines[i]:
                rows.append({"action": "custom", "delta": lines[i]})
            else:
                key = cycle[(i - 1) % len(cycle)]
                rows.append({"action": key, "delta": ACTIONS[key][1]})
    while len(rows) < count:
        rows.append({"action": "hold", "delta": ""})
    return {"sheet": rows, "actions": [{"key": k, "label": v[0]} for k, v in ACTIONS.items()]}


FRAME_MODELS = [
    "dreamshaper",
    "sana",
    "flux",
    "z-image",
    "gpt-image-1-mini",
    "gpt-image-1.5",
    "gpt-image-2",
    "flux-klein",
    "black-forest-labs/flux.1-kontext-pro",
]


@app.post("/api/frames")
def create_frames(req: FramesRequest) -> dict[str, Any]:
    """Start a frame sequence job (runs in background)."""
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt vacío")
    if req.base_image:
        _load_base_image(req.base_image)  # fail fast: 404 before the job starts
    job_id = f"seq-{int(time.time())}-{uuid.uuid4().hex[:6]}"
    _save_meta(job_id, req)
    JOBS[job_id] = {
        "id": job_id,
        "state": "queued",
        "total": req.frames,
        "completed": 0,
        "frames": [],
        "error": None,
        "request": req.model_dump(),
    }
    thread = threading.Thread(target=_run_sequence, args=(job_id, req), daemon=True)
    thread.start()
    return {"job_id": job_id, "total": req.frames}


@app.get("/api/frames/{job_id}")
def frames_status(job_id: str) -> dict[str, Any]:
    job = JOBS.get(job_id) or _job_from_disk(job_id)
    return job


@app.get("/api/frames/{job_id}/export.mp4")
def export_mp4(job_id: str, fps: int = 12):
    return _export_video(job_id, fps, "mp4")


@app.get("/api/frames/{job_id}/export.gif")
def export_gif(job_id: str, fps: int = 12):
    return _export_video(job_id, fps, "gif")


def _export_video(job_id: str, fps: int, fmt: str):
    job = JOBS.get(job_id)
    if not job or job["state"] != "done":
        raise HTTPException(status_code=409, detail="La secuencia no está lista")
    job_dir = _job_dir(job_id)
    frames = sorted(job_dir.glob("frame-*.jpg"))
    if not frames:
        raise HTTPException(status_code=404, detail="Sin cuadros")

    meta = _load_meta(job_id) or {}
    out = _render_sequence(job_dir, frames, fps, fmt, meta)
    media_type = "video/mp4" if fmt == "mp4" else "image/gif"
    return FileResponse(out, media_type=media_type, filename=out.name)


@app.post("/api/animate-local")
def animate_local(payload: dict[str, Any]) -> dict[str, Any]:
    """Animate a still image locally with ffmpeg (no API, no pollen cost)."""
    import subprocess

    name = _safe_name(str(payload.get("file", "")))
    src = OUTPUTS / name
    if not src.exists():
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    motion = str(payload.get("motion", "zoom_in"))
    seconds = max(1, min(20, int(payload.get("seconds", 4))))
    fps = max(6, min(60, int(payload.get("fps", 24))))
    frames = seconds * fps
    width = int(payload.get("width", 1024))
    height = int(payload.get("height", 1024))

    zoom_expr = {
        "zoom_in": "min(zoom+0.0009,1.6)",
        "zoom_out": "if(eq(on,0),1.6,max(1.001,zoom-0.0009))",
    }.get(motion, "min(zoom+0.0009,1.6)")
    x_expr = {
        "pan_right": "iw/2-(iw/zoom/2)+on*2.2",
        "pan_left": "iw/2-(iw/zoom/2)-on*2.2",
    }.get(motion, "iw/2-(iw/zoom/2)")
    y_expr = {
        "pan_up": "ih/2-(ih/zoom/2)-on*2.2",
        "pan_down": "ih/2-(ih/zoom/2)+on*2.2",
    }.get(motion, "ih/2-(ih/zoom/2)")

    vf = (
        f"scale={width * 2}:{height * 2}:flags=lanczos,"
        f"zoompan=z='{zoom_expr}':d={frames}:x='{x_expr}':y='{y_expr}':s={width}x{height}:fps={fps},"
        f"format=yuv420p"
    )
    out = OUTPUTS / f"{Path(name).stem}-{motion}.mp4"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-loop", "1", "-i", str(src), "-t", str(seconds), "-vf", vf,
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0 or not out.exists():
        raise HTTPException(status_code=500, detail=f"ffmpeg falló: {proc.stderr[-400:]}")

    entry = {
        "id": Path(out.name).stem,
        "file": out.name,
        "url": f"outputs/{out.name}",
        "prompt": f"animación local: {motion}",
        "model": "ffmpeg",
        "size": f"{width}x{height}",
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "video": True,
    }
    _store(entry)
    return entry


@app.get("/api/balance")
def balance() -> dict[str, Any]:
    """Last known pollen balance (learned from API 402 responses)."""
    neurons = _cf_neurons_today()
    return {
        **BALANCE,
        "costs": MEASURED_COST,
        "free_generation": sorted(FREE_GENERATION),
        "cloudflare": {
            "configured": bool(CF_TOKEN and CF_ACCOUNT_ID),
            "account_id": CF_ACCOUNT_ID,
            "date": neurons["date"],
            "neurons_today": neurons["neurons"],
            "requests_today": neurons["requests"],
            "free_daily": CF_FREE_NEURONS_DAILY,
            "remaining": max(0.0, CF_FREE_NEURONS_DAILY - neurons["neurons"]),
        },
    }


@app.get("/api/balance/probe")
def balance_probe() -> dict[str, Any]:
    """Cheap probe (64x64, cheapest paid model) to learn the exact balance.

    Fails without spending when the balance is too low, and the 402 message
    carries the exact remaining balance.
    """
    try:
        url = client.generate_image(
            prompt="a dot", model="dreamshaper", width=64, height=64, nologo=True, private=True, nofeed=True
        )
        _download_bytes(url)
        BALANCE["known"] = True
        BALANCE["balance"] = None
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        BALANCE["known"] = True
        BALANCE["balance"] = detail.get("balance")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"No se pudo consultar el saldo: {exc}") from exc
    return {**BALANCE, "costs": MEASURED_COST, "free_generation": sorted(FREE_GENERATION)}


@app.get("/api/models")
def models() -> dict[str, Any]:
    """Image models available to the current API key."""
    headers = {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}
    try:
        resp = requests.get("https://gen.pollinations.ai/image/models", headers=headers, timeout=30)
        resp.raise_for_status()
        raw = resp.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo consultar /models: {exc}") from exc

    out = []
    for m in raw if isinstance(raw, list) else []:
        out.append(
            {
                "id": m.get("name"),
                "aliases": m.get("aliases") or [],
                "title": m.get("title") or m.get("name"),
                "description": m.get("description") or "",
                "publisher": m.get("publisher") or "",
            }
        )
    out.sort(key=lambda m: (m["publisher"] != "", m["title"].lower()))
    cloudflare = [
        {
            "id": m["id"],
            "title": m["label"],
            "description": "Workers AI · genera" + (" y edita" if "edit" in m["label"].lower() else ""),
            "publisher": "Cloudflare",
            "max_steps": m.get("max_steps"),
        }
        for m in CF_IMAGE_MODELS
    ]
    return {"models": out, "cloudflare": cloudflare, "cloudflare_configured": bool(CF_TOKEN and CF_ACCOUNT_ID)}


@app.post("/api/generate")
def generate(req: GenerateRequest) -> dict[str, Any]:
    """Generate an image and persist it under outputs/."""
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt vacío")

    prompt = req.prompt
    if req.background == "white":
        prompt += ", isolated subject on a solid pure white background, no shadow, full body visible"
    elif req.background == "green":
        prompt += ", isolated subject on a solid chroma key green background (#00FF00), no shadow, full body visible"

    started = time.time()
    neurons = 0.0
    estimated = False
    source_url = ""

    if req.provider == "cloudflare":
        if not (CF_TOKEN and CF_ACCOUNT_ID):
            raise HTTPException(status_code=503, detail="Falta CLOUDFLARE_TOKEN o CLOUDFLARE_ACCOUNT_ID en .env")
        spec = _cf_spec(req.model)
        if not spec:
            raise HTTPException(status_code=400, detail=f"Modelo de Cloudflare desconocido: {req.model}")
        width, height = (int(v) for v in req.size.split("x"))
        refs: list[bytes] = []
        if req.image:
            ref_path = OUTPUTS / _safe_name(req.image)
            if ref_path.exists():
                refs.append(ref_path.read_bytes())
        try:
            data, content_type, neurons, estimated = _cf_run(
                req.model, prompt, width, height, int(req.steps or spec.get("steps") or 4), refs
            )
        except HTTPException:
            raise
        except requests.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"Error de Cloudflare: {exc}") from exc
        source_url = f"workers-ai:{req.model}"
        _cf_add_neurons(neurons)
    else:
        kwargs: dict[str, Any] = {
            "prompt": prompt,
            "model": req.model,
            "width": int(req.size.split("x")[0]),
            "height": int(req.size.split("x")[1]),
            "nologo": req.nologo,
            "private": req.private,
            "nofeed": req.nofeed,
            "enhance": req.enhance,
            "safe": req.safe,
        }
        if req.negative_prompt:
            kwargs["negative_prompt"] = req.negative_prompt
        if req.quality:
            kwargs["quality"] = req.quality
        if req.seed is not None:
            kwargs["seed"] = req.seed
        if req.guidance_scale is not None:
            kwargs["guidance_scale"] = req.guidance_scale
        if req.image:
            kwargs["image"] = req.image

        try:
            image_url = client.generate_image(**kwargs)
        except Exception as exc:  # noqa: BLE001 - surfaced to the UI
            raise _pollinations_error(exc, "Error de Pollinations") from exc

        data = _download_bytes(image_url)
        content_type = "image/jpeg"
        if data[:4] == b"\x89PNG":
            content_type = "image/png"
        elif data[:4] == b"RIFF":
            content_type = "image/webp"
        source_url = image_url

    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[content_type]
    entry_id = f"{int(time.time())}-{uuid.uuid4().hex[:8]}"
    filename = f"{entry_id}.{ext}"
    (OUTPUTS / filename).write_bytes(data)

    entry = {
        "id": entry_id,
        "file": filename,
        "url": f"outputs/{filename}",
        "prompt": req.prompt,
        "negative_prompt": req.negative_prompt,
        "model": req.model,
        "provider": req.provider,
        "size": req.size,
        "quality": req.quality,
        "seed": req.seed,
        "background": req.background,
        "enhanced": req.enhance,
        "content_type": content_type,
        "bytes": len(data),
        "neurons": neurons,
        "neurons_estimated": estimated if req.provider == "cloudflare" else False,
        "source_url": source_url,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "elapsed_s": round(time.time() - started, 2),
    }
    _store(entry)
    return entry


@app.post("/api/enhance")
def enhance(payload: dict[str, Any]) -> dict[str, Any]:
    """Rewrite a rough prompt into a high-quality image prompt."""
    prompt = str(payload.get("prompt", "")).strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt vacío")
    instruction = (
        "Rewrite the following image request as one dense, high-quality image generation prompt. "
        "Add concrete subject, composition, lens/lighting, colour palette, material detail and mood. "
        "Reply with the prompt only, no preamble, no quotes.\n\n"
        f"Request: {prompt}"
    )
    try:
        text = _free_chat(instruction, system="You are an expert image prompt engineer.")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"No se pudo mejorar el prompt: {exc}") from exc
    if isinstance(text, str) and text.strip().startswith("{"):
        try:
            text = json.loads(text).get("choices", [{}])[0].get("message", {}).get("content", text)
        except (json.JSONDecodeError, IndexError, KeyError):
            pass
    return {"prompt": str(text).strip()}


@app.get("/api/history")
def history() -> dict[str, Any]:
    return {"items": _read_index()}


@app.delete("/api/history/{filename}")
def delete_history(filename: str) -> dict[str, Any]:
    name = _safe_name(filename)
    target = OUTPUTS / name
    if target.exists():
        target.unlink()
    _remove_entry(name)
    return {"ok": True}


@app.post("/api/remove-bg")
def remove_bg(req: RemoveBgRequest) -> dict[str, Any]:
    """Cut the background with rembg (optional dependency)."""
    name = _safe_name(req.filename)
    src = OUTPUTS / name
    if not src.exists():
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    try:
        from rembg import remove  # type: ignore
        from PIL import Image  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=501,
            detail="rembg no está instalado. Usa: .venv/bin/pip install 'rembg[cpu]' pillow",
        ) from exc

    out_name = f"{Path(name).stem}-alpha.png"
    try:
        _cutout(src, OUTPUTS / out_name)
    except TimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail="El recorte tardó demasiado (descargando modelo u2netp). Reintenta en unos segundos.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Fallo al recortar fondo: {exc}") from exc

    with _index_lock:
        entries = _read_index()
    for entry in entries:
        if entry.get("file") == out_name:
            return {"ok": True, "entry": entry}
    entry = {
        "id": Path(out_name).stem,
        "file": out_name,
        "url": f"outputs/{out_name}",
        "prompt": "recorte de fondo",
        "model": "rembg",
        "size": "",
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "alpha": True,
    }
    _store(entry)
    return {"ok": True, "entry": entry}


@app.get("/api/proxy")
def proxy(url: str):
    """Stream a remote image through the server (keeps the API key server-side)."""
    headers = {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}
    try:
        resp = requests.get(url, headers=headers, timeout=300, stream=True)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Fallo al.proxy: {exc}") from exc
    from fastapi.responses import StreamingResponse

    return StreamingResponse(
        resp.iter_content(chunk_size=65536),
        media_type=resp.headers.get("content-type", "image/jpeg"),
    )


@app.exception_handler(HTTPException)
def http_error(_request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


app.mount("/outputs", StaticFiles(directory=OUTPUTS), name="outputs")
app.mount("/", StaticFiles(directory=WEB, html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    banner = "JMRV" if API_KEY else "JMRV (SIN API KEY)"
    print(f"  {banner}  ->  http://127.0.0.1:{PORT}")
    uvicorn.run(app, host=os.getenv("JMRV_HOST", "127.0.0.1"), port=PORT, log_level="info")
