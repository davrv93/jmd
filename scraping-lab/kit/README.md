# Kit del Laboratorio de scraping JMD

Taller «Web scraping ético con IA» · JMD Learning · lección ws-01.

Practicas contra **nuestro** sitio de práctica, <https://jmd-learn.online/scraping-lab/>, con datos ficticios.
Tiene `robots.txt`, términos de uso, límite de pedidos (429 con `Retry-After`), bloqueos temporales (403)
y un panel en vivo: <https://jmd-learn.online/scraping-lab/panel>.

## 1. Prepara el entorno

### En la Terminal del aula (servidor del curso)

```bash
cd /trabajo
curl -fsSLO https://jmd-learn.online/scraping-lab/kit.zip && python3 -m zipfile -e kit.zip . && cd kit-scraping-lab
python3 -m venv .venv && . .venv/bin/activate
pip install --no-cache-dir -r requirements.txt
export ALUMNO=tu-apodo CONTACTO=tu-correo@ejemplo.com
```

Trabaja en `/trabajo`: tu carpeta personal es pequeña y se borra; `/trabajo` se queda.

### En tu laptop (Windows, macOS o Linux)

```bash
python3 -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export ALUMNO=tu-apodo CONTACTO=tu-correo@ejemplo.com     # Windows (PowerShell): $env:ALUMNO="tu-apodo"; $env:CONTACTO="tu-correo"
```

Necesitas Python 3.10 o más nuevo (el servidor MCP lo pide).

**Tu apodo importa.** En el aula todos salen por la misma IP, así que el laboratorio cuenta tus pedidos por
`ALUMNO` (cabecera `X-Alumno`). Con `CONTACTO` tus scripts se identifican en el `User-Agent`, como hace un bot
educado. Búscate en el panel.

## 2. Los retos

| Script | Qué aprendes | Cómo se corre |
|---|---|---|
| `01_catalogo.py` | Leer `robots.txt` (Crawl-delay y Disallow), paginar HTML siguiendo `rel="next"` con pausa, saltarte la trampa y exportar CSV/JSON | `python3 01_catalogo.py` |
| `02_api_sesion.py` | Iniciar sesión con token CSRF y cookie, mandar el token en la cabecera `X-Lab-Token`, paginar con `next_cursor` y **reanudar** tras un corte (checkpoint, saltar lo ya bajado) | `python3 02_api_sesion.py --parar-en 2` y luego `python3 02_api_sesion.py` |
| `03_descarga_cola.py` | Cola `asyncio` con N trabajadores, ritmo compartido, reintentos con espera exponencial, `Retry-After`, saltar lo ya descargado (sha256) y barra de avance | `python3 03_descarga_cola.py` (córrelo dos veces: la segunda salta todo) |
| `04_limites.py` | Chocar con el 429 a propósito, leer `Retry-After` y `X-RateLimit-*`, y luego adaptar el ritmo para tener cero 429 | `python3 04_limites.py` (opcional: `--provocar-bloqueo`) |
| `05_mcp_server.py` | Convertir tu scraper en herramientas MCP (`buscar_productos`, `detalle`, `mi_estado`) para tu asistente | `python3 05_mcp_server.py --probar taza` |
| `tienda_jmd.user.js` | Tampermonkey: juntar productos mientras navegas y exportar CSV/JSON | Ver la sección 4 |

Si te corta un 403, **espera** (dura un minuto). No cambies de apodo para esquivarlo: eso es justo lo que un
sitio real castiga para siempre.

## 3. Registrar el servidor MCP

Usa la ruta completa a tu Python del venv y al script (`pwd` te la da).

**Claude Code**

```bash
claude mcp add tienda-jmd -e ALUMNO=tu-apodo -e CONTACTO=tu-correo -- "$PWD/.venv/bin/python" "$PWD/05_mcp_server.py"
claude mcp list
```

Luego pregúntale: «Usa tienda-jmd y dame las 5 mochilas más baratas con su SKU».

**OpenCode** (`opencode.json` en tu proyecto)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "tienda-jmd": {
      "type": "local",
      "command": ["/ruta/a/.venv/bin/python", "/ruta/a/05_mcp_server.py"],
      "environment": { "ALUMNO": "tu-apodo", "CONTACTO": "tu-correo" },
      "enabled": true
    }
  }
}
```

**Claude Desktop** (`claude_desktop_config.json`: en macOS está en `~/Library/Application Support/Claude/`,
en Windows en `%APPDATA%\Claude\`)

```json
{
  "mcpServers": {
    "tienda-jmd": {
      "command": "/ruta/a/.venv/bin/python",
      "args": ["/ruta/a/05_mcp_server.py"],
      "env": { "ALUMNO": "tu-apodo", "CONTACTO": "tu-correo" }
    }
  }
}
```

Reinicia Claude Desktop después de guardar.

## 4. Tampermonkey

1. Instala la extensión Tampermonkey en Chrome o Firefox.
2. Abre <https://jmd-learn.online/scraping-lab/kit/tienda_jmd.user.js> y pulsa **Instalar**
   (o crea un script nuevo y pega el contenido).
3. Guarda tu apodo en <https://jmd-learn.online/scraping-lab/> y entra a la **Tienda**.
4. Navega: cada página que ves se suma al recolector (abajo a la derecha). «Recorrer solo» avanza una página
   cada 2,5 s y se detiene al final. Exporta con **CSV** o **JSON**.

## 5. Reglas del laboratorio

- Máximo 20 pedidos cada 10 s por alumno. Más que eso: `429` con `Retry-After`.
- Si sigues pidiendo tras más de 10 respuestas 429 en un minuto: `403` durante 60 s.
- `/scraping-lab/privado/` y `/scraping-lab/trampa/` están prohibidas en `robots.txt`. La trampa bloquea al instante.
- Identifícate (`User-Agent` con contacto) y no intentes esquivar los límites.

Variables útiles: `LAB` (otra dirección del laboratorio, p. ej. `http://127.0.0.1:18685/scraping-lab`),
`PAUSA`, `TRABAJADORES`, `REINTENTOS`, `CARPETA`.
