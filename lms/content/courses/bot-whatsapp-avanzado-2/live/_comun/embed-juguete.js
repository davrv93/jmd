/* Embedding de juguete para las escenas de teoría (Bot avanzado · sesión 1).
   Corre entero en el navegador: sin modelo, sin red, sin instalar nada.
   Cada frase se limpia (minúsculas, sin tildes ni signos), se parte en palabras y en trigramas de
   letras («pre», «rec», «eci»…), y cada pieza suma +peso o −peso en una de 64 casillas elegida con
   un hash. El resultado se normaliza a largo 1, así que el coseno entre dos vectores va de −1 a 1.
   Atrapa errores de tipeo («presio» ≈ «precio») pero no sinónimos («cuesta» ≠ «precio»): para eso
   está un modelo real como bge-m3, que se precalculó en bge-mapa.json. */
(function (g) {
  "use strict";
  var DIM = 64;

  function limpiar(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function fnv(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Palabras que aparecen en casi todo y no dicen qué pide el cliente: se descartan.
  var VACIAS = {};
  ("de la el los las un una unos unas y o a al del en por para con que me mi mis se lo le les su sus " +
   "es son esta este hay tienen tiene tengo quiero puedo hacer").split(" ").forEach(function (w) { VACIAS[w] = 1; });

  // Piezas de la frase con su peso: la palabra entera pesa 1, cada trigrama 0,5.
  function rasgos(s) {
    var out = [];
    limpiar(s).split(" ").filter(function (w) { return w && !VACIAS[w]; }).forEach(function (w) {
      out.push(["w:" + w, 1]);
      var p = " " + w + " ";
      for (var i = 0; i + 3 <= p.length; i++) out.push(["c:" + p.substr(i, 3), 0.5]);
    });
    return out;
  }

  function vector(s) {
    var v = new Array(DIM).fill(0);
    rasgos(s).forEach(function (r) {
      var h = fnv(r[0]);
      v[h % DIM] += ((h >>> 16) & 1 ? 1 : -1) * r[1];
    });
    var n = Math.sqrt(v.reduce(function (a, x) { return a + x * x; }, 0)) || 1;
    return v.map(function (x) { return x / n; });
  }

  function coseno(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  function media(vs) {
    var d = vs[0].length, m = new Array(d).fill(0);
    vs.forEach(function (v) { for (var i = 0; i < d; i++) m[i] += v[i] / vs.length; });
    return m;
  }

  function normal(v) {
    var n = Math.sqrt(v.reduce(function (a, x) { return a + x * x; }, 0)) || 1;
    return v.map(function (x) { return x / n; });
  }

  // Dos componentes principales por iteración de potencia: proyecta los vectores a un plano.
  function pca2(vs) {
    var m = media(vs), d = m.length;
    var X = vs.map(function (v) { return v.map(function (x, i) { return x - m[i]; }); });
    function comp(prev) {
      var w = normal(X[0].map(function (_, i) { return Math.sin(i * 12.9898 + prev.length * 78.233); }));
      for (var it = 0; it < 120; it++) {
        var s = X.map(function (x) { return coseno(x, w); });
        var w2 = new Array(d).fill(0);
        X.forEach(function (x, k) { for (var i = 0; i < d; i++) w2[i] += s[k] * x[i]; });
        prev.forEach(function (p) { var dp = coseno(w2, p); for (var i = 0; i < d; i++) w2[i] -= dp * p[i]; });
        w = normal(w2);
      }
      return w;
    }
    var p1 = comp([]), p2 = comp([p1]);
    var xs = X.map(function (x) { return coseno(x, p1); }), ys = X.map(function (x) { return coseno(x, p2); });
    function esc(a) {
      var lo = Math.min.apply(null, a), hi = Math.max.apply(null, a), r = hi - lo || 1;
      return a.map(function (v) { return (v - lo) / r; });
    }
    xs = esc(xs); ys = esc(ys);
    return xs.map(function (x, i) { return [x, ys[i]]; });
  }

  // Probabilidades a partir de similitudes (softmax con temperatura t).
  function softmax(sims, t) {
    var mx = Math.max.apply(null, sims);
    var e = sims.map(function (s) { return Math.exp((s - mx) / t); });
    var z = e.reduce(function (a, x) { return a + x; }, 0);
    return e.map(function (x) { return x / z; });
  }

  g.EmbJuguete = { DIM: DIM, VACIAS: VACIAS, limpiar: limpiar, rasgos: rasgos, vector: vector, coseno: coseno,
                   media: media, normal: normal, pca2: pca2, softmax: softmax };
})(typeof window !== "undefined" ? window : globalThis);
