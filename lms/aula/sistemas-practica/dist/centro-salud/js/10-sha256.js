/*
 * 10-sha256.js · SHA-256 en JavaScript puro (objeto global Sha)
 * ----------------------------------------------------------------------------
 * No usa crypto del navegador: así funciona igual en IE11 y por file://.
 *   Sha.hex(texto)                  → hash SHA-256 en hexadecimal (texto en UTF-8)
 *   Sha.iterado(clave, sal, veces)  → hash con sal repetido `veces` veces
 *                                     (estiramiento de clave, estilo PBKDF1)
 *   Sha.aleatorio(n)                → n bytes aleatorios en hexadecimal
 *   Sha.igual(a, b)                 → comparación sin cortocircuito
 * AVISO: es una protección de demostración. Un sistema real hace esto en el servidor.
 */
(function (global) {
  'use strict';

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  /* Texto → arreglo de bytes UTF-8 (maneja pares sustitutos). */
  function aBytes(texto) {
    var bytes = [], i, c, c2;
    for (i = 0; i < texto.length; i++) {
      c = texto.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < texto.length) {
        c2 = texto.charCodeAt(i + 1);
        if (c2 >= 0xdc00 && c2 <= 0xdfff) {
          c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
          i++;
        }
      }
      if (c < 0x80) { bytes.push(c); }
      else if (c < 0x800) { bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c < 0x10000) { bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
      else { bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return bytes;
  }

  function rotd(x, n) { return (x >>> n) | (x << (32 - n)); }

  /* Calcula el hash de un arreglo de bytes. Devuelve 8 palabras de 32 bits. */
  function sha256(bytes) {
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var largo = bytes.length, bits = largo * 8, w = new Array(64);
    var i, j, a, b, c, d, e, f, g, hh, s0, s1, t1, t2, ch, maj, base;
    bytes = bytes.slice(0);
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) { bytes.push(0); }
    bytes.push(0, 0, 0, 0, (bits >>> 24) & 255, (bits >>> 16) & 255, (bits >>> 8) & 255, bits & 255);
    for (base = 0; base < bytes.length; base += 64) {
      for (i = 0; i < 16; i++) {
        j = base + i * 4;
        w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
      }
      for (i = 16; i < 64; i++) {
        s0 = rotd(w[i - 15], 7) ^ rotd(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        s1 = rotd(w[i - 2], 17) ^ rotd(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      a = h[0]; b = h[1]; c = h[2]; d = h[3]; e = h[4]; f = h[5]; g = h[6]; hh = h[7];
      for (i = 0; i < 64; i++) {
        s1 = rotd(e, 6) ^ rotd(e, 11) ^ rotd(e, 25);
        ch = (e & f) ^ (~e & g);
        t1 = (hh + s1 + ch + K[i] + w[i]) | 0;
        s0 = rotd(a, 2) ^ rotd(a, 13) ^ rotd(a, 22);
        maj = (a & b) ^ (a & c) ^ (b & c);
        t2 = (s0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h;
  }

  function aHex(palabras) {
    var s = '', i, t;
    for (i = 0; i < palabras.length; i++) {
      t = (palabras[i] >>> 0).toString(16);
      while (t.length < 8) { t = '0' + t; }
      s += t;
    }
    return s;
  }

  var Sha = {};

  /** SHA-256 de un texto (UTF-8) en hexadecimal. */
  Sha.hex = function (texto) {
    return aHex(sha256(aBytes(String(texto))));
  };

  /** Hash de clave con sal repetido `veces` veces: h = SHA256(h + ':' + sal + ':' + clave). */
  Sha.iterado = function (clave, sal, veces) {
    var h = Sha.hex(sal + ':' + clave), i;
    for (i = 1; i < veces; i++) { h = Sha.hex(h + ':' + sal + ':' + clave); }
    return h;
  };

  /** n bytes aleatorios en hexadecimal (crypto si existe; si no, Math.random). */
  Sha.aleatorio = function (n) {
    var out = '', i, v, arr, cr = global.crypto || global.msCrypto;
    if (cr && cr.getRandomValues && global.Uint8Array) {
      arr = new Uint8Array(n);
      cr.getRandomValues(arr);
      for (i = 0; i < n; i++) { out += (arr[i] < 16 ? '0' : '') + arr[i].toString(16); }
      return out;
    }
    for (i = 0; i < n; i++) {
      v = Math.floor(Math.random() * 256);
      out += (v < 16 ? '0' : '') + v.toString(16);
    }
    return out;
  };

  /** Compara dos cadenas recorriéndolas completas. */
  Sha.igual = function (a, b) {
    var dif, i;
    a = String(a); b = String(b);
    dif = a.length ^ b.length;
    for (i = 0; i < a.length && i < b.length; i++) { dif |= a.charCodeAt(i) ^ b.charCodeAt(i); }
    return dif === 0;
  };

  global.Sha = Sha;
})(window);
