#!/usr/bin/env python3
"""Hook PreToolUse: bloquea cualquier comando que intente ESCRIBIR en la base DuckDB.

Claude Code le pasa por stdin un JSON con tool_name y tool_input. Si el comando de Bash
lleva SQL de escritura, salimos con código 2: Claude Code cancela la herramienta y le
muestra a Claude el mensaje de stderr. El modelo puede olvidar una regla; el hook no.
"""
import json
import re
import sys

ESCRITURA = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|MERGE|ATTACH|DETACH|COPY|EXPORT|IMPORT|INSTALL|LOAD|PRAGMA|SET)\b",
    re.IGNORECASE,
)

d = json.load(sys.stdin)
cmd = (d.get("tool_input") or {}).get("command", "")
if d.get("tool_name") == "Bash" and re.search(r"\bduckdb\b", cmd, re.IGNORECASE):
    if ESCRITURA.search(cmd):
        print("Bloqueado por el hook solo-lectura: el chat solo puede consultar (SELECT) la base, "
              "y siempre con `duckdb -readonly`. Reescribe la consulta como SELECT.", file=sys.stderr)
        sys.exit(2)
    if "-readonly" not in cmd and re.search(r"\.duckdb\b", cmd):
        print("Bloqueado por el hook solo-lectura: abre la base con `duckdb -readonly tokens.duckdb`.",
              file=sys.stderr)
        sys.exit(2)
sys.exit(0)
