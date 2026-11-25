import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const M = require("./hoja-motor.js");

function libroBase() {
  return new M.Libro({
    estilos: [{}, { f: "0.00" }],
    hojas: [{ n: "H", dim: [10, 20], c: [] }]
  });
}

function v(lib, ref) {
  const h = lib.hoja("H");
  return lib.valor(h, ref);
}

// ------------------------------------------------------------ interpretar
{
  const lib = libroBase();
  assert.equal(lib.interpretar("123", 0), 123);
  // El motor no normaliza coma decimal en interpretar()
  assert.equal(lib.interpretar("123.5", 0), 123.5);
  assert.equal(lib.interpretar("=SUMA(1,2)", 0), "=SUMA(1,2)");
  assert.equal(lib.interpretar("'001", 0), "001");
  assert.equal(lib.interpretar("VERDADERO", 0), true);
  assert.equal(lib.interpretar("FALSO", 0), false);
}

// ------------------------------------------------------------ aritmética y referencias
{
  const lib = libroBase();
  lib.poner("H", "A1", 10, 0);
  lib.poner("H", "A2", 5, 0);
  lib.poner("H", "B1", "=A1+A2", 0);
  lib.recalcular();
  assert.equal(v(lib, "B1"), 15);
}

// ------------------------------------------------------------ SUMA y rangos
{
  const lib = libroBase();
  lib.poner("H", "A1", 1, 0);
  lib.poner("H", "A2", 2, 0);
  lib.poner("H", "A3", 3, 0);
  lib.poner("H", "B1", "=SUMA(A1:A3)", 0);
  lib.recalcular();
  assert.equal(v(lib, "B1"), 6);
}

// ------------------------------------------------------------ SI
{
  const lib = libroBase();
  lib.poner("H", "A1", 100, 0);
  lib.poner("H", "B1", "=SI(A1>50,\"OK\",\"NO\")", 0);
  lib.recalcular();
  assert.equal(v(lib, "B1"), "OK");
}

// ------------------------------------------------------------ BUSCARV
{
  const lib = libroBase();
  // tabla D1:E3
  lib.poner("H", "D1", "COD", 0);
  lib.poner("H", "E1", "NOM", 0);
  lib.poner("H", "D2", 1, 0);
  lib.poner("H", "E2", "Uno", 0);
  lib.poner("H", "D3", 2, 0);
  lib.poner("H", "E3", "Dos", 0);

  lib.poner("H", "A1", 2, 0);
  lib.poner("H", "B1", "=BUSCARV(A1,$D$2:$E$3,2,FALSO)", 0);
  lib.recalcular();
  assert.equal(v(lib, "B1"), "Dos");
}

// ------------------------------------------------------------ referencia circular → error
{
  const lib = libroBase();
  lib.poner("H", "A1", "=A1+1", 0);
  lib.recalcular();
  const out = v(lib, "A1");
  assert.ok(M.esErr(out));
}

console.log("OK hoja-motor · pruebas mínimas pasaron");
