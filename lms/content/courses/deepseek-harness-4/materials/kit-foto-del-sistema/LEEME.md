# Kit «Foto del sistema» (para tu laptop)

> **En el aula del LIVE no necesitas este kit:** ya trae `dsh`, la skill (`/opt/skills-curso/foto-del-sistema/`) y `aula sistema foto`. Este kit es para la Ruta A, cuando trabajas en tu laptop.

Con este kit tomas la **foto** de un sistema web de práctica —un inventario verificable y reproducible— y la usas con tu agente (DeepSeek Harness) para **describir el sistema por roles y auditar su seguridad** sin releer todo el código.

## Qué trae

| Archivo | Para qué |
|---|---|
| `skills/foto-del-sistema/SKILL.md` | El procedimiento que sigue tu agente |
| `skills/foto-del-sistema/motor/foto.mjs` | El script que toma la foto (sin dependencias) |
| `skills/foto-del-sistema/motor/plantillas/` | Las 4 plantillas de entregables |
| `AGENTS.sistema.md` | Las reglas para tu agente (se copia al sistema como `AGENTS.md`) |

## Lo que necesitas

- **Node.js 20 o más** (`node -v` debe decir `v20` o mayor). Descarga en nodejs.org si no lo tienes. (Bun también sirve: cambia `node` por `bun`.)
- Un sistema de práctica descomprimido (el `.zip` de tu sistema: debe quedar una carpeta con `index.html`, `css/` y `js/`).
- DeepSeek Harness instalado y con tu clave configurada. **No pegues tu clave en ningún archivo del sistema ni de este kit.**

## Instalación (una vez)

Descomprime este zip y copia **dentro de la carpeta de tu sistema** la carpeta `skills/` y el archivo `AGENTS.sistema.md` renombrado a `AGENTS.md`. El script ignora `skills/`, `docs/`, `FOTO/` y `AGENTS.md`, así que no alteran la huella del sistema.

**macOS / Linux** (terminal; ajusta las rutas):

```bash
cd ~/Descargas                      # donde descomprimiste el kit
cp -R kit-foto-del-sistema/skills  ~/mi-sistema/skills
cp kit-foto-del-sistema/AGENTS.sistema.md ~/mi-sistema/AGENTS.md
mkdir -p ~/mi-sistema/docs
```

**Windows** (PowerShell):

```powershell
cd $HOME\Downloads
Copy-Item -Recurse kit-foto-del-sistema\skills  $HOME\mi-sistema\skills
Copy-Item kit-foto-del-sistema\AGENTS.sistema.md $HOME\mi-sistema\AGENTS.md
New-Item -ItemType Directory -Force $HOME\mi-sistema\docs | Out-Null
```

Resultado:

```
mi-sistema/
  index.html  css/  js/  LEEME.txt     ← el sistema
  AGENTS.md                            ← reglas para el agente
  skills/foto-del-sistema/             ← la skill y el script
  docs/                                ← aquí van tus entregables
```

## Tomar la foto

Desde la carpeta del sistema:

```bash
cd ~/mi-sistema            # Windows: cd $HOME\mi-sistema
node skills/foto-del-sistema/motor/foto.mjs .
```

Deja una carpeta `FOTO/` con `FOTO.md` (para leer), `FOTO.json` (para el agente) y `hashes.txt`. Tarda menos de un segundo. Repite el comando cuando cambie el código: la **huella global** te dice si cambió algo (mismo código, misma huella, en cualquier computadora y sistema operativo).

Comprobar los hashes: `sha256sum -c FOTO/hashes.txt` (macOS: `shasum -a 256 -c FOTO/hashes.txt`; Windows: `Get-FileHash js\config.js` y compara con la línea de `hashes.txt`).

## Trabajar con DeepSeek Harness

1. Abre una terminal **en la carpeta del sistema** e inicia DeepSeek Harness ahí.
2. Escribe (tu entorno no tiene «skills», por eso se le dice dónde está):

   > Lee `AGENTS.md` y `skills/foto-del-sistema/SKILL.md`. Toma la foto del sistema con `node skills/foto-del-sistema/motor/foto.mjs .`, lee `FOTO/FOTO.md` (no releas el código que la foto ya resume) y sigue el procedimiento: verifica 5 afirmaciones al azar, describe las funcionalidades por rol, audita la seguridad y deja los 4 documentos en `docs/`. Cita `archivo:línea` y marca como «por verificar» lo que no hayas comprobado.

3. Revisa lo que escribe: abre cada `archivo:línea` que cita. **La foto son pistas, no veredictos**: un mecanismo «presente» no es cierto hasta que lo ves en el código.

## Entregables (en `docs/`)

`DESCRIPCION_POR_ROLES.md` · `AUDITORIA_SEGURIDAD.md` · `MAPA_DEL_SISTEMA.md` · `DUDAS_VERIFICABLES.md` (plantillas en `skills/foto-del-sistema/motor/plantillas/`).

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| `node` no se reconoce | Instala Node 20+ y abre una terminal nueva |
| `no existe la carpeta` | Estás fuera de la carpeta del sistema; haz `cd` a ella |
| La foto sale en «modo genérico» | Tu carpeta no tiene `js/config.js` con `window.SISTEMA` (normal si es un sistema que no es de práctica); sigue igual, sin entidades ni matriz |
| Quieres probar el script | `node skills/foto-del-sistema/motor/pruebas/prueba.mjs` debe terminar con `0 con falla` |

Es un sistema de **práctica**: sin datos reales. Nunca imprimas ni guardes tu API key.
