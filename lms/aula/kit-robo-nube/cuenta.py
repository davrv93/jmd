"""Tu token del curso: se pide una vez, se guarda FUERA de esta carpeta y nunca se imprime.

    python cuenta.py entrar    entra con tu cuenta del curso (la del LMS) y guarda tu token personal
    python cuenta.py pegar     pega un token jg_ que ya tengas (p. ej. de `jmd token`); no se ve al escribir
    python cuenta.py ver       dice si hay token, dónde está y cuándo vence (sin mostrarlo)
    python cuenta.py salir     revoca el token en el servidor y lo borra de tu máquina

Cómo se obtiene: inicio de sesión de dispositivo (OAuth «device grant») contra el Keycloak del curso con el
cliente público «jmd-cli», el mismo que usa `jmd login --sso`. Con ese acceso el gateway del curso emite un
token personal de 30 días (jg_...) con tus cuotas. Ninguna clave de proveedor pasa por tu máquina.

Dónde queda: ~/.config/jmd-robo/token.json (Windows: %APPDATA%\\jmd-robo\\token.json), con permisos 600
(solo tu usuario). Otra carpeta: variable JMD_ROBO_CONFIG.
"""

from __future__ import annotations

import json
import os
import socket
import stat
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

import httpx

if hasattr(sys.stdout, "reconfigure"):  # consola de Windows: que las tildes no revienten
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = Path(__file__).resolve().parent
NUBE = os.environ.get("JMD_NUBE", "https://jmd-learn.online/aula-nube").rstrip("/")
ISSUER = os.environ.get("JMD_SSO_ISSUER", "https://jmd-learn.online/kc/realms/lms").rstrip("/")
CLIENTE = os.environ.get("JMD_SSO_CLIENTE", "jmd-cli")
ALCANCES = "openid profile email ai:use"


def carpeta() -> Path:
    if os.environ.get("JMD_ROBO_CONFIG"):
        return Path(os.environ["JMD_ROBO_CONFIG"]).expanduser()
    if os.name == "nt":
        return Path(os.environ.get("APPDATA") or Path.home() / "AppData" / "Roaming") / "jmd-robo"
    return Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config") / "jmd-robo"


def ruta() -> Path:
    return carpeta() / "token.json"


def _fuera_del_kit(p: Path) -> None:
    try:
        p.resolve().relative_to(AQUI)
    except ValueError:
        return
    raise SystemExit(f"El token no puede guardarse dentro del kit ({p}). Usa una carpeta fuera, p. ej. JMD_ROBO_CONFIG=~/.config/jmd-robo")


def _solo_mio(p: Path, es_dir: bool = False) -> None:
    if os.name == "nt":  # en Windows, chmod no basta: se quitan los permisos heredados con icacls
        usuario = os.environ.get("USERNAME", "")
        r = subprocess.run(["icacls", str(p), "/inheritance:r", "/grant:r", f"{usuario}:(OI)(CI)F" if es_dir else f"{usuario}:F"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False) if usuario else None
        if not r or r.returncode:
            print(f"Aviso: no pude dejar {p} solo para tu usuario (icacls). Sigue en tu carpeta de usuario, que ya es privada.")
    else:
        os.chmod(p, 0o700 if es_dir else 0o600)


def guardar(token: str, vence: float, nube: str = NUBE) -> Path:
    p = ruta()
    _fuera_del_kit(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    _solo_mio(p.parent, es_dir=True)
    tmp = p.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump({"token": token, "vence": vence, "nube": nube, "guardado": time.time()}, f)
    os.replace(tmp, p)
    _solo_mio(p)
    return p


def leer() -> dict | None:
    """{token, vence, nube} si hay un token vigente; None si no hay o venció."""
    p = ruta()
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    t = str(d.get("token", "")) if isinstance(d, dict) else ""
    if len(t) < 16 or any(c.isspace() for c in t):  # normalmente jg_... (personal); el instructor puede probar con otra clave
        return None
    if d.get("vence") and float(d["vence"]) < time.time():
        return None
    return d


def _nombre_equipo() -> str:
    return (os.environ.get("COMPUTERNAME") or socket.gethostname() or "equipo")[:30]


def canjear(acceso: str, nube: str = NUBE) -> tuple[str, float]:
    """Access token del realm -> token personal del gateway (jg_...)."""
    r = httpx.post(f"{nube}/v1/auth/exchange", headers={"Authorization": f"Bearer {acceso}"}, timeout=20,
                   json={"label": f"robo-local en {_nombre_equipo()}"})
    if r.status_code == 404:
        raise SystemExit("El servidor del curso aún no acepta cuentas para el kit (la ruta /aula-nube no está publicada). Avisa al instructor.")
    if r.status_code != 201 and r.status_code != 200:
        try:
            msg = r.json()["error"]["message"]
        except Exception:
            msg = f"HTTP {r.status_code}"
        raise SystemExit(f"El gateway no emitió tu token: {msg}")
    d = r.json()
    return d["token"], float(d.get("expires_at") or time.time() + 30 * 86400)


def entrar(nube: str = NUBE, issuer: str = ISSUER, abrir: bool = True) -> Path:
    with httpx.Client(timeout=20) as c:
        try:
            disc = c.get(f"{issuer}/.well-known/openid-configuration").json()
        except (httpx.HTTPError, ValueError) as e:
            raise SystemExit(f"No pude llegar al inicio de sesión del curso ({issuer}): {type(e).__name__}. ¿Tienes internet?")
        r = c.post(disc["device_authorization_endpoint"], data={"client_id": CLIENTE, "scope": ALCANCES})
        if r.status_code != 200:
            raise SystemExit(f"El inicio de sesión del curso no aceptó la petición (HTTP {r.status_code}).")
        d = r.json()
        enlace = d.get("verification_uri_complete") or d["verification_uri"]
        print("\n  1. Abre este enlace en tu navegador:", enlace)
        print("  2. Entra con tu cuenta del curso (la del LMS).")
        print("  3. Si te pide un código, escribe:", d["user_code"])
        print("\n  Esperando a que confirmes... (Ctrl+C para cancelar)", flush=True)
        if abrir:
            try:
                webbrowser.open(enlace)
            except Exception:
                pass
        espera, limite = int(d.get("interval", 5)), time.time() + int(d.get("expires_in", 600))
        while time.time() < limite:
            time.sleep(espera)
            t = c.post(disc["token_endpoint"], data={"grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                                                     "device_code": d["device_code"], "client_id": CLIENTE})
            if t.status_code == 200:
                acceso = t.json()["access_token"]
                break
            err = (t.json() if t.headers.get("content-type", "").startswith("application/json") else {}).get("error", "")
            if err == "authorization_pending":
                continue
            if err == "slow_down":
                espera += 5
                continue
            if err == "access_denied":
                raise SystemExit("Cancelaste el inicio de sesión.")
            raise SystemExit(f"El inicio de sesión falló ({err or t.status_code}).")
        else:
            raise SystemExit("Se acabó el tiempo para confirmar. Vuelve a intentarlo.")
    token, vence = canjear(acceso, nube)
    return guardar(token, vence, nube)


def pegar(nube: str = NUBE) -> Path:
    import getpass

    if sys.stdin.isatty():
        t = getpass.getpass("Pega tu token del curso (empieza por jg_; no se verá): ").strip()
    else:  # jmd token | python cuenta.py pegar
        t = sys.stdin.readline().strip()
    if not t.startswith("jg_") or len(t) < 20:
        raise SystemExit("Eso no parece un token del curso (empieza por jg_).")
    r = httpx.get(f"{nube}/v1/auth/me", headers={"Authorization": f"Bearer {t}"}, timeout=15)
    if r.status_code != 200 or not r.json().get("sub"):
        raise SystemExit("El servidor no reconoce ese token (vencido, revocado o mal copiado).")
    return guardar(t, time.time() + 30 * 86400, nube)


def describir() -> str:
    p, d = ruta(), leer()
    if not d:
        return f"Sin token vigente. Pídelo con: python cuenta.py entrar   (se guardará en {p})"
    dias = (float(d.get("vence", 0)) - time.time()) / 86400
    modo = oct(stat.S_IMODE(p.stat().st_mode))[2:] if os.name != "nt" else "solo tu usuario"
    return f"Token presente: vence el {time.strftime('%d-%m-%Y', time.localtime(float(d['vence'])))} (quedan {dias:.0f} días). Archivo: {p} (permisos {modo})."


def salir() -> None:
    d = leer()
    if d:
        try:
            httpx.request("DELETE", f"{d.get('nube', NUBE)}/v1/auth/token", headers={"Authorization": f"Bearer {d['token']}"}, timeout=10)
        except httpx.HTTPError:
            print("No pude avisar al servidor; el token se borra igual de tu máquina.")
    try:
        ruta().unlink()
    except FileNotFoundError:
        pass
    print("Token borrado.")


if __name__ == "__main__":
    orden = sys.argv[1] if len(sys.argv) > 1 else "ver"
    if orden == "entrar":
        print("Listo. Token guardado en", entrar(abrir="--sin-navegador" not in sys.argv))
    elif orden == "pegar":
        print("Listo. Token guardado en", pegar())
    elif orden == "ver":
        print(describir())
    elif orden == "salir":
        salir()
    elif orden == "ruta":
        print(ruta())
    else:
        print(__doc__)
        sys.exit(2)
