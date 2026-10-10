---
id: ej-herramienta-y-mcp
title: "Herramienta y MCP, con un ejemplo de 20 líneas"
summary: Una función consultar_stock(codigo) que el agente puede llamar, y la misma función expuesta por un servidor MCP. Solo lectura, para entender la idea.
tags: [mcp, herramientas, conceptos]
level: básico
lesson: pa-03
order: 16
---
Este ejemplo **no se instala**. Es para leerlo y entender dos palabras que se repiten todo el
curso: *herramienta* y *MCP*. En clase el instructor muestra un MCP funcionando; aquí ves qué hay
debajo.

## Una herramienta es una función

```python
STOCK = {"A-102": 14, "B-220": 0, "C-015": 3}

def consultar_stock(codigo: str) -> dict:
    """Devuelve las unidades disponibles de un producto por su código."""
    unidades = STOCK.get(codigo.upper())
    if unidades is None:
        return {"codigo": codigo, "error": "no existe ese código"}
    return {"codigo": codigo.upper(), "unidades": unidades}
```

Hasta aquí es Python normal. Se convierte en **herramienta del agente** cuando se la describes
al modelo con un esquema: nombre, para qué sirve y qué parámetros recibe.

```python
HERRAMIENTAS = [{
    "type": "function",
    "function": {
        "name": "consultar_stock",
        "description": "Consulta las unidades disponibles de un producto de la tienda por su código.",
        "parameters": {
            "type": "object",
            "properties": {"codigo": {"type": "string", "description": "Código del producto, p. ej. A-102"}},
            "required": ["codigo"],
        },
    },
}]
```

## Qué pasa en una conversación

```
Cliente:  ¿tienen stock del A-102?
Modelo:   (no responde texto; pide) llamar consultar_stock({"codigo": "A-102"})
Programa: ejecuta la función -> {"codigo": "A-102", "unidades": 14}
Modelo:   (recibe el resultado y ahora sí escribe) Sí, hay 14 unidades del A-102.
```

El modelo **nunca ejecuta** la función. Solo pide llamarla. Tu programa la ejecuta, le devuelve
el resultado, y el modelo redacta la respuesta con el dato real. Sin la herramienta, el modelo
habría inventado un número. Esa es la diferencia entre un chat y un agente.

En el bucle, con el formato de OpenAI que habla el gateway de la clase:

```python
respuesta = cliente.chat.completions.create(
    model="auto", messages=mensajes, tools=HERRAMIENTAS)
llamada = respuesta.choices[0].message.tool_calls[0]           # el modelo pidió una herramienta
if llamada.function.name == "consultar_stock":
    import json
    resultado = consultar_stock(**json.loads(llamada.function.arguments))
    mensajes.append({"role": "tool", "tool_call_id": llamada.id, "content": json.dumps(resultado)})
    # y se vuelve a llamar al modelo con el resultado para que redacte
```

## La misma función, expuesta por MCP

**MCP** es la forma estándar de ofrecer herramientas a cualquier agente. En vez de pegar el
esquema a mano en cada programa, un **servidor MCP** publica sus herramientas y el agente
(OpenCode, Claude Code, otro) las descubre solo. Con el SDK oficial de Python, el mismo
`consultar_stock` queda así:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("tienda")

@mcp.tool()
def consultar_stock(codigo: str) -> dict:
    """Consulta las unidades disponibles de un producto de la tienda por su código."""
    unidades = STOCK.get(codigo.upper())
    if unidades is None:
        return {"codigo": codigo, "error": "no existe ese código"}
    return {"codigo": codigo.upper(), "unidades": unidades}

if __name__ == "__main__":
    mcp.run()                     # habla por stdio: el agente lo arranca como proceso
```

El esquema (`parameters`) sale solo de los tipos de la función y del *docstring*. Y el agente lo
registraría en `opencode.json` como viste en el **Ejemplo 3**:

```json
{ "mcp": { "tienda": { "type": "local", "command": ["python", "stock_mcp.py"], "enabled": true } } }
```

## Lo que debes llevarte

| Palabra | Qué es | En este ejemplo |
|---|---|---|
| Herramienta | Una función que el agente puede pedir que se ejecute | `consultar_stock` |
| Esquema | La descripción de la herramienta que lee el modelo | el JSON de `HERRAMIENTAS` |
| Servidor MCP | Un programa que publica varias herramientas de forma estándar | `FastMCP("tienda")` |
| Cliente MCP | El agente que las descubre y las usa | OpenCode, Claude Code |

En la demostración de clase, el MCP es de **navegador**: sus herramientas son «abrir URL», «hacer
clic», «tomar captura». El agente las usa para probar la bandeja igual que aquí usaría
`consultar_stock` para responder al cliente. Misma idea, distinta herramienta.
