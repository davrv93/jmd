#!/usr/bin/env python3
"""obra: estado del proyecto en construccion.

Mantiene estado.json (fuente unica de verdad) y lo sirve junto a obra.html
para que el alumno vea la obra avanzar mientras el agente trabaja.

Solo biblioteca estandar. Python 3.11 o superior.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

AQUI = Path(__file__).resolve().parent
ESTADO_POR_DEFECTO = AQUI / "estado.json"
ESTADOS = ("hecho", "en_curso", "pendiente", "error")
ANCHO_BARRA = 30


# ---------------------------------------------------------------- utilidades


def ahora() -> datetime:
    """Hora local de la maquina (sin zona, legible por una persona)."""
    return datetime.now()


def hora_corta(momento: datetime | None = None) -> str:
    return (momento or ahora()).strftime("%H:%M")


def marca_iso(momento: datetime | None = None) -> str:
    return (momento or ahora()).strftime("%Y-%m-%dT%H:%M:%S")


def leer(ruta: Path) -> dict:
    if not ruta.exists():
        raise SystemExit(
            f"No existe {ruta}. Crea uno con: obra.py iniciar \"Proyecto\" --pasos a b c"
        )
    with ruta.open(encoding="utf-8") as fh:
        datos = json.load(fh)
    datos.setdefault("proyecto", "")
    datos.setdefault("fase", "")
    datos.setdefault("pct", 0)
    datos.setdefault("actualizado", "")
    datos.setdefault("pasos", [])
    return datos


def escribir(ruta: Path, datos: dict) -> None:
    """Escritura atomica: archivo temporal en la misma carpeta + os.replace."""
    ruta.parent.mkdir(parents=True, exist_ok=True)
    datos["actualizado"] = marca_iso()
    fd, tmp = tempfile.mkstemp(prefix=".estado-", suffix=".tmp", dir=str(ruta.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(datos, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, ruta)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def nuevo_paso(texto: str, estado: str = "pendiente", hora: str = "") -> dict:
    return {"hora": hora, "texto": texto.strip(), "estado": estado}


def recalcular_pct(datos: dict) -> int:
    pasos = datos["pasos"]
    if not pasos:
        return 0
    hechos = sum(1 for p in pasos if p.get("estado") == "hecho")
    return round(hechos / len(pasos) * 100)


def buscar_en_curso(datos: dict) -> dict | None:
    for paso in datos["pasos"]:
        if paso.get("estado") == "en_curso":
            return paso
    return None


def buscar_pendiente(datos: dict, texto: str) -> dict | None:
    """Pendiente cuyo texto coincida (parcial, sin distinguir mayusculas).

    Primero se intenta la coincidencia exacta; luego la parcial en ambos
    sentidos (el texto pedido dentro del paso o el paso dentro del texto).
    """
    clave = texto.strip().casefold()
    if not clave:
        return None
    # Primero los pendientes; si no hay, cualquier paso (hecho o error) con el
    # mismo texto se reabre en vez de duplicarse.
    for grupo in (
        [p for p in datos["pasos"] if p.get("estado") == "pendiente"],
        [p for p in datos["pasos"] if p.get("estado") != "en_curso"],
    ):
        for paso in grupo:
            if paso["texto"].casefold() == clave:
                return paso
        for paso in grupo:
            candidato = paso["texto"].casefold()
            if clave in candidato or candidato in clave:
                return paso
    return None


def cerrar_en_curso(datos: dict, estado_final: str = "hecho") -> dict | None:
    paso = buscar_en_curso(datos)
    if paso is not None:
        paso["estado"] = estado_final
        paso["hora"] = hora_corta()
    return paso


def fijar_pct(datos: dict, pct: int | None) -> None:
    if pct is None:
        datos["pct"] = recalcular_pct(datos)
    else:
        datos["pct"] = max(0, min(100, int(pct)))


# ---------------------------------------------------------------- subcomandos


def cmd_iniciar(args: argparse.Namespace) -> int:
    pasos = [nuevo_paso(t) for t in (args.pasos or []) if t.strip()]
    datos = {
        "proyecto": args.proyecto.strip(),
        "fase": (args.fase or "Plan").strip(),
        "pct": 0,
        "actualizado": "",
        "pasos": pasos,
    }
    escribir(args.archivo, datos)
    print(f"Obra iniciada: {datos['proyecto']} ({len(pasos)} pasos) -> {args.archivo}")
    return 0


def cmd_paso(args: argparse.Namespace) -> int:
    datos = leer(args.archivo)
    cerrado = cerrar_en_curso(datos, "hecho")
    paso = buscar_pendiente(datos, args.texto)
    if paso is None:
        paso = nuevo_paso(args.texto)
        datos["pasos"].append(paso)
        origen = "nuevo"
    else:
        origen = "del plan" if paso["estado"] == "pendiente" else "reabierto"
    paso["estado"] = "en_curso"
    paso["hora"] = hora_corta()
    if args.fase:
        datos["fase"] = args.fase.strip()
    fijar_pct(datos, args.pct)
    escribir(args.archivo, datos)
    if cerrado is not None:
        print(f"hecho     {cerrado['texto']}")
    print(f"en curso  {paso['texto']}  ({origen}, {datos['pct']}%)")
    return 0


def cmd_hecho(args: argparse.Namespace) -> int:
    datos = leer(args.archivo)
    cerrado = cerrar_en_curso(datos, "hecho")
    if cerrado is None:
        print("No hay ningun paso en curso.", file=sys.stderr)
        return 1
    if args.fase:
        datos["fase"] = args.fase.strip()
    fijar_pct(datos, args.pct)
    escribir(args.archivo, datos)
    print(f"hecho     {cerrado['texto']}  ({datos['pct']}%)")
    return 0


def cmd_error(args: argparse.Namespace) -> int:
    datos = leer(args.archivo)
    paso = buscar_en_curso(datos)
    if paso is None:
        paso = nuevo_paso(args.texto, "error", hora_corta())
        datos["pasos"].append(paso)
    else:
        paso["estado"] = "error"
        paso["hora"] = hora_corta()
        if args.texto.strip() and args.texto.strip().casefold() not in paso["texto"].casefold():
            paso["texto"] = f"{paso['texto']} - {args.texto.strip()}"
    fijar_pct(datos, args.pct)
    escribir(args.archivo, datos)
    print(f"error     {paso['texto']}")
    return 0


def barra(pct: int, ancho: int = ANCHO_BARRA) -> str:
    pct = max(0, min(100, int(pct)))
    llenos = round(pct / 100 * ancho)
    return "#" * llenos + "." * (ancho - llenos)


def cmd_ver(args: argparse.Namespace) -> int:
    datos = leer(args.archivo)
    color = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None

    def pinta(codigo: str, texto: str) -> str:
        return f"\033[{codigo}m{texto}\033[0m" if color else texto

    marcas = {
        "hecho": ("[x]", "32"),
        "en_curso": ("[>]", "33"),
        "pendiente": ("[ ]", "90"),
        "error": ("[!]", "31"),
    }
    titulo = datos["proyecto"] or "(sin nombre)"
    fase = datos["fase"] or "-"
    print(pinta("1", titulo) + f"  |  {fase}")
    print(f"[{barra(datos['pct'])}] {int(datos['pct']):3d}%")
    if datos.get("actualizado"):
        print(f"actualizado: {datos['actualizado']}")
    print()
    for paso in datos["pasos"]:
        marca, codigo = marcas.get(paso.get("estado", "pendiente"), ("[?]", "0"))
        hora = (paso.get("hora") or "").ljust(5)
        print(f"  {pinta(codigo, marca)} {hora}  {paso.get('texto', '')}")
    return 0


class ManejadorObra(SimpleHTTPRequestHandler):
    """Sirve la carpeta de la obra sin cache y con CORS abierto."""

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802 (nombre impuesto por http.server)
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("", "/"):
            self.path = "/obra.html"
        super().do_GET()

    def log_message(self, formato: str, *args) -> None:
        if os.environ.get("OBRA_SILENCIO"):
            return
        super().log_message(formato, *args)


def cmd_servir(args: argparse.Namespace) -> int:
    carpeta = args.archivo.parent
    manejador = partial(ManejadorObra, directory=str(carpeta))
    try:
        servidor = ThreadingHTTPServer((args.host, args.puerto), manejador)
    except OSError as exc:
        print(f"No se pudo abrir el puerto {args.puerto}: {exc}", file=sys.stderr)
        return 1
    servidor.daemon_threads = True
    host_url = "localhost" if args.host in ("", "0.0.0.0", "127.0.0.1") else args.host
    print(f"Obra en http://{host_url}:{args.puerto}/obra.html")
    print(f"Estado en http://{host_url}:{args.puerto}/estado.json")
    print("Ctrl+C para detener.", flush=True)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        servidor.server_close()
    return 0


# ---------------------------------------------------------------- argparse


def construir_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="obra.py",
        description="Estado visible del proyecto en construccion.",
    )
    parser.add_argument(
        "--archivo",
        type=Path,
        default=ESTADO_POR_DEFECTO,
        help=f"ruta de estado.json (por defecto {ESTADO_POR_DEFECTO})",
    )
    sub = parser.add_subparsers(dest="orden", required=True)

    p = sub.add_parser("iniciar", help="crea un estado.json nuevo con todos los pasos pendientes")
    p.add_argument("proyecto", help="nombre del proyecto")
    p.add_argument("--pasos", nargs="*", default=[], help="pasos del plan, en orden")
    p.add_argument("--fase", default="Plan", help="fase inicial (por defecto Plan)")
    p.set_defaults(func=cmd_iniciar)

    p = sub.add_parser("paso", help="cierra el paso en curso y abre el siguiente")
    p.add_argument("texto", help="texto del paso (coincidencia parcial con un pendiente)")
    p.add_argument("--pct", type=int, default=None, help="porcentaje manual (0-100)")
    p.add_argument("--fase", default=None, help="fase actual del proyecto")
    p.set_defaults(func=cmd_paso)

    p = sub.add_parser("hecho", help="marca el paso en curso como hecho")
    p.add_argument("--pct", type=int, default=None)
    p.add_argument("--fase", default=None)
    p.set_defaults(func=cmd_hecho)

    p = sub.add_parser("error", help="marca el paso en curso como error y anota el motivo")
    p.add_argument("texto", help="motivo del error")
    p.add_argument("--pct", type=int, default=None)
    p.set_defaults(func=cmd_error)

    p = sub.add_parser("ver", help="muestra barra y pasos en la terminal")
    p.set_defaults(func=cmd_ver)

    p = sub.add_parser("servir", help="sirve obra.html y estado.json por HTTP")
    p.add_argument("--puerto", type=int, default=8787)
    p.add_argument("--host", default="127.0.0.1", help="0.0.0.0 para abrir a la red")
    p.set_defaults(func=cmd_servir)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = construir_parser()
    args = parser.parse_args(argv)
    args.archivo = Path(args.archivo).expanduser().resolve()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
