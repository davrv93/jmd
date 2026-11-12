// Forja · GIF animado sin dependencias. Paleta global de hasta 256 colores (los más usados) y compresión LZW.
// cuadros: [ImageData] del mismo tamaño. retraso en centésimas de segundo.
function lzw(indices, minimo) {
  const limpiar = 1 << minimo, fin = limpiar + 1, out = [];
  let bits = minimo + 1, sig = fin + 1, dic = new Map(), acum = 0, n = 0;
  const emite = (c) => { acum |= c << n; n += bits; while (n >= 8) { out.push(acum & 255); acum >>>= 8; n -= 8; } };
  emite(limpiar);
  let prefijo = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], clave = prefijo * 256 + k;
    if (dic.has(clave)) { prefijo = dic.get(clave); continue; }
    emite(prefijo);
    if (sig < 4096) { dic.set(clave, sig++); if (sig > (1 << bits) && bits < 12) bits++; } else { emite(limpiar); dic = new Map(); bits = minimo + 1; sig = fin + 1; }
    prefijo = k;
  }
  emite(prefijo); emite(fin); if (n > 0) out.push(acum & 255);
  return out;
}

export function gif(cuadros, retraso = 7) {
  const w = cuadros[0].width, h = cuadros[0].height, cuenta = new Map();
  const c15 = (d, i) => ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
  for (const f of cuadros) for (let i = 0; i < f.data.length; i += 8) { const k = c15(f.data, i); cuenta.set(k, (cuenta.get(k) || 0) + 1); } // muestrea uno de cada dos píxeles
  const paleta = [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([k]) => [((k >> 10) & 31) << 3 | 4, ((k >> 5) & 31) << 3 | 4, (k & 31) << 3 | 4]);
  while (paleta.length < 256) paleta.push([0, 0, 0]);
  const cache = new Map();
  const cercano = (k) => {
    let v = cache.get(k); if (v !== undefined) return v;
    const r = ((k >> 10) & 31) << 3 | 4, g = ((k >> 5) & 31) << 3 | 4, b = (k & 31) << 3 | 4; let mejor = 0, dm = Infinity;
    for (let i = 0; i < 256; i++) { const p = paleta[i], d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < dm) { dm = d; mejor = i; } }
    cache.set(k, mejor); return mejor;
  };
  const B = []; const u16 = (x) => B.push(x & 255, (x >> 8) & 255), txt = (s) => { for (const ch of s) B.push(ch.charCodeAt(0)); };
  txt('GIF89a'); u16(w); u16(h); B.push(0xf7, 0, 0);
  for (const p of paleta) B.push(p[0], p[1], p[2]);
  B.push(0x21, 0xff, 11); txt('NETSCAPE2.0'); B.push(3, 1, 0, 0, 0); // se repite sin fin
  for (const f of cuadros) {
    const idx = new Uint8Array(w * h); for (let i = 0, j = 0; j < idx.length; i += 4, j++) idx[j] = cercano(c15(f.data, i));
    B.push(0x21, 0xf9, 4, 0); u16(retraso); B.push(0, 0);
    B.push(0x2c); u16(0); u16(0); u16(w); u16(h); B.push(0, 8);
    const datos = lzw(idx, 8); for (let i = 0; i < datos.length; i += 255) { const t = datos.slice(i, i + 255); B.push(t.length, ...t); }
    B.push(0);
  }
  B.push(0x3b);
  return new Blob([new Uint8Array(B)], { type: 'image/gif' });
}
