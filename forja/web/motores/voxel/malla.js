// Forja · voxel · Chunk Mesh Builder. Corre en el Worker (y en Node para las pruebas): recibe el volumen del chunk con
// un borde de 1 bloque de los vecinos (18 × 18 × H) y devuelve buffers listos para la GPU (TypedArrays transferibles).
//   · hidden face removal: una cara solo existe si el vecino deja verla
//   · greedy meshing (M. Lysenko, 0fps.net, 2012): por cada corte, las caras iguales se funden en rectángulos
//   · ambient occlusion por vértice (3 vecinos por esquina) y diagonal girada para que no se vea anisótropo
//   · luz de cielo y de bloques emisivos por inundación (BFS) dentro del volumen, SUAVIZADA por esquina: cada vértice
//     promedia la luz de las 4 celdas que lo rodean (las opacas no cuentan), así las sombras de las copas y la luz de
//     una antorcha bajan en degradado y no a escalones de un bloque
//   · clima por columna (temperatura y humedad del generador, 4 bits cada una) para teñir césped, hojas y agua
//   · espuma en la orilla: en la cara de arriba del agua, cada esquina sabe cuánta tierra la rodea
//   · geometría opaca (incluye «recorte»: hojas, plantas) y transparente (agua, vidrio, hielo) por separado
// Formato de vértice (lo que lee el shader de render.js):
//   aPosition = posición local en el chunk · aNormal = (cara 0..6, loseta del atlas, banderas) · aTexCoord = uv en
//   bloques (se repite con fract) · aVertexColor = (AO 0..1 —en el agua: espuma—, luz de cielo 0..1, luz de bloque 0..1,
//   clima: (temperatura·16 + humedad) / 255)
import { T, LOSETA } from './bloques.js';

export const P = 18;   // lado del volumen con borde
export const FLAG = { agua: 1, emisivo: 2, lava: 4, vaiven: 8 };   // vaivén: hojas y plantas que mueve el viento
const PASE_OPACO = 0, PASE_RECORTE = 1, PASE_TRANSP = 2;

function crecer() {
  let pos = new Float32Array(3 * 1024), nor = new Float32Array(3 * 1024), uv = new Float32Array(2 * 1024), col = new Float32Array(4 * 1024), idx = new Uint32Array(1536), nv = 0, ni = 0;
  const asegurar = (v, i) => {
    if ((nv + v) * 3 > pos.length) { const k = Math.max(pos.length * 2, (nv + v) * 3); const g = (a, n) => { const b = new a.constructor(n); b.set(a); return b; }; pos = g(pos, k); nor = g(nor, k); uv = g(uv, (k / 3) * 2); col = g(col, (k / 3) * 4); }
    if (ni + i > idx.length) { const b = new Uint32Array(Math.max(idx.length * 2, ni + i)); b.set(idx); idx = b; }
  };
  return {
    vert(x, y, z, cara, loseta, flags, u, v, ao, cielo, bloque, clima = 0) {
      const k = nv;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; nor[k * 3] = cara; nor[k * 3 + 1] = loseta; nor[k * 3 + 2] = flags;
      uv[k * 2] = u; uv[k * 2 + 1] = v; col[k * 4] = ao; col[k * 4 + 1] = cielo; col[k * 4 + 2] = bloque; col[k * 4 + 3] = clima; nv++; return k;
    },
    tri(a, b, c) { idx[ni++] = a; idx[ni++] = b; idx[ni++] = c; },
    asegurar,
    cerrar() {
      const ind = nv <= 65535 ? Uint16Array.from(idx.subarray(0, ni)) : idx.slice(0, ni);
      return { pos: pos.slice(0, nv * 3), nor: nor.slice(0, nv * 3), uv: uv.slice(0, nv * 2), col: col.slice(0, nv * 4), idx: ind, nv, nt: ni / 3 };
    },
  };
}

// ---------------------------------------------------------------- luz (cielo + bloques) por inundación
export function luces(vol, H) {
  const N = P * P * H, cielo = new Uint8Array(N), bloque = new Uint8Array(N), cola = new Int32Array(N * 2);
  for (let z = 0; z < P; z++) for (let x = 0; x < P; x++) {
    let l = 15;
    for (let y = H - 1; y >= 0; y--) {
      const i = x + z * P + y * P * P, id = vol[i];
      if (T.opaco[id]) l = 0; else if (T.liquido[id]) l = Math.max(0, l - 2); else if (T.pase[id] === PASE_RECORTE && T.forma[id] === 1) l = Math.max(0, l - 1);
      cielo[i] = l;
    }
  }
  const inundar = (L, semillas) => {
    let a = 0, b = semillas;
    while (a < b) {
      const i = cola[a++], l = L[i]; if (l <= 1) continue;
      const x = i % P, z = ((i / P) | 0) % P, y = (i / (P * P)) | 0;
      const vec = [x > 0 ? i - 1 : -1, x < P - 1 ? i + 1 : -1, z > 0 ? i - P : -1, z < P - 1 ? i + P : -1, y > 0 ? i - P * P : -1, y < H - 1 ? i + P * P : -1];
      for (const n of vec) { if (n < 0 || T.opaco[vol[n]] || L[n] >= l - 1) continue; L[n] = l - 1; if (b < cola.length) cola[b++] = n; }
    }
  };
  // semillas de cielo: celdas iluminadas con algún vecino horizontal que pueda recibir luz
  let n = 0;
  for (let i = 0; i < N; i++) {
    const l = cielo[i]; if (l < 2) continue;
    const x = i % P, z = ((i / P) | 0) % P;
    if ((x > 0 && cielo[i - 1] < l - 1 && !T.opaco[vol[i - 1]]) || (x < P - 1 && cielo[i + 1] < l - 1 && !T.opaco[vol[i + 1]]) || (z > 0 && cielo[i - P] < l - 1 && !T.opaco[vol[i - P]]) || (z < P - 1 && cielo[i + P] < l - 1 && !T.opaco[vol[i + P]])) cola[n++] = i;
  }
  inundar(cielo, n);
  n = 0;
  for (let i = 0; i < N; i++) { const e = T.luz[vol[i]]; if (e) { bloque[i] = e; cola[n++] = i; } }
  if (n) inundar(bloque, n);
  return { cielo, bloque };
}

// ---------------------------------------------------------------- mallado codicioso
// vol: Uint8Array(18*18*H), índice (x+1) + (z+1)*18 + y*324 con x, z ∈ [-1, 16]
// clima (opcional): Uint8Array(256) con el código de clima de cada columna del chunk (x + z*16) → tiñe césped y hojas
export function mallar(vol, H, { ao = true, clima = null } = {}) {
  const at = (x, y, z) => (y < 0 || y >= H ? 0 : vol[(x + 1) + (z + 1) * P + y * P * P]);
  const L = luces(vol, H), LC = L.cielo, LB = L.bloque, li = (x, y, z) => (y < 0 ? 0 : y >= H ? -1 : (x + 1) + (z + 1) * P + y * P * P);
  const opa = crecer(), tra = crecer();
  const dim = [16, H, 16];
  const ejes = [[0, 2, 1], [1, 0, 2], [2, 0, 1]];   // [eje normal, eje u, eje v]: en los lados v es siempre la altura
  const pos = [0, 0, 0];
  const PASO = [1, P * P, P];   // zancada de cada eje en el volumen con borde (x, y, z)
  const opq = (i, y) => (y < 0 || y >= H ? 0 : T.opaco[vol[i]]);
  const tierra = (i) => { const v = vol[i]; return v && !T.liquido[v] && (T.solido[v] || T.opaco[v]) ? 1 : 0; };
  const c = (s1, s2, esq) => (s1 && s2 ? 0 : 3 - s1 - s2 - esq);
  const lc = (k, y) => (y >= H ? 15 : y < 0 ? 0 : LC[k]), lb = (k, y) => (y >= H || y < 0 ? 0 : LB[k]);
  // luz suavizada de una esquina: la celda de la cara + los dos lados + la diagonal (si no la tapan los dos lados)
  const esquina = (arr, base, o1, k1, y1, o2, k2, y2, od, kd, yd) => {
    let s = base, n = 1;
    if (!o1) { s += arr(k1, y1); n++; } if (!o2) { s += arr(k2, y2); n++; } if (!od && !(o1 && o2)) { s += arr(kd, yd); n++; }
    return Math.round(s / n);
  };
  for (const [a, ua, va] of ejes) {
    const du = dim[ua], dv = dim[va], mascara = new Int32Array(du * dv), luzM = new Int32Array(du * dv);
    const su = PASO[ua], sv = PASO[va], sa = PASO[a];
    for (const s of [1, -1]) {
      const cara = a === 1 ? (s > 0 ? 0 : 1) : a === 0 ? (s > 0 ? 2 : 3) : (s > 0 ? 4 : 5);
      const tex = a === 1 ? (s > 0 ? 0 : 1) : 2;
      // ¿triángulos en sentido antihorario vistos desde fuera? signo de (e_u × e_v)·e_a por s
      const cruz = (ua === 0 && va === 2) ? -1 : (ua === 2 && va === 1) ? -1 : 1, invertir = cruz * s < 0;
      for (let d = 0; d < dim[a]; d++) {
        mascara.fill(0);
        if (a === 1 && s < 0 && d === 0) continue;   // la cara de abajo del fondo del mundo nunca se ve
        for (let iv = 0; iv < dv; iv++) {
          const y = a === 1 ? d : iv, yq = a === 1 ? d + s : y;
          let i = (P + 1) + d * sa + iv * sv;
          for (let iu = 0; iu < du; iu++, i += su) {
            const id = vol[i]; if (!id) continue;
            const forma = T.forma[id]; if (forma !== 1 && forma !== 2) continue;
            const qi = i + s * sa, nb = yq < 0 || yq >= H ? 0 : vol[qi], pase = T.pase[id];
            if (T.opaco[nb] || nb === id) continue;
            if (pase !== PASE_TRANSP && T.pase[nb] === PASE_OPACO && T.forma[nb] === 2 && forma === 2) continue;
            if (pase === PASE_TRANSP && T.pase[nb] === PASE_TRANSP && T.forma[nb] === 1 && forma === 1) continue;   // vidrio junto a hielo
            const fuera = yq >= H, c0 = lc(qi, yq), b0 = lb(qi, yq);
            let flags = 0; if (T.liquido[id] && pase === PASE_TRANSP) flags |= FLAG.agua; if (T.luz[id] >= 9) flags |= FLAG.emisivo; if (T.liquido[id] && pase === PASE_OPACO) flags |= FLAG.lava | FLAG.emisivo; if (T.vaiven[id]) flags |= FLAG.vaiven;
            const m = iu + iv * du; let a0 = 3, a1 = 3, a2 = 3, a3 = 3;
            let l0 = c0, l1 = c0, l2 = c0, l3 = c0, k0 = b0, k1 = b0, k2 = b0, k3 = b0;
            if (pase !== PASE_TRANSP && !fuera) {
              // vecinos en la capa de la cara: lados u, v y esquinas (la v de los lados es la altura: se comprueba el borde)
              const yv = va === 1, yM = yv ? yq - 1 : yq, yP = yv ? yq + 1 : yq;
              const iuM = qi - su, iuP = qi + su, ivM = qi - sv, ivP = qi + sv, dMM = qi - su - sv, dPM = qi + su - sv, dPP = qi + su + sv, dMP = qi - su + sv;
              const uM = opq(iuM, yq), uP = opq(iuP, yq), vM = opq(ivM, yM), vP = opq(ivP, yP), oMM = opq(dMM, yM), oPM = opq(dPM, yM), oPP = opq(dPP, yP), oMP = opq(dMP, yP);
              if (ao) { a0 = c(uM, vM, oMM); a1 = c(uP, vM, oPM); a2 = c(uP, vP, oPP); a3 = c(uM, vP, oMP); }
              l0 = esquina(lc, c0, uM, iuM, yq, vM, ivM, yM, oMM, dMM, yM); l1 = esquina(lc, c0, uP, iuP, yq, vM, ivM, yM, oPM, dPM, yM);
              l2 = esquina(lc, c0, uP, iuP, yq, vP, ivP, yP, oPP, dPP, yP); l3 = esquina(lc, c0, uM, iuM, yq, vP, ivP, yP, oMP, dMP, yP);
              k0 = esquina(lb, b0, uM, iuM, yq, vM, ivM, yM, oMM, dMM, yM); k1 = esquina(lb, b0, uP, iuP, yq, vM, ivM, yM, oPM, dPM, yM);
              k2 = esquina(lb, b0, uP, iuP, yq, vP, ivP, yP, oPP, dPP, yP); k3 = esquina(lb, b0, uM, iuM, yq, vP, ivP, yP, oMP, dMP, yP);
            } else if (flags & FLAG.agua && a === 1 && s > 0) {
              // espuma: tierra alrededor de cada esquina, en la capa del agua (3 = mar abierto, 0 = rincón de la orilla)
              const uM = tierra(i - su), uP = tierra(i + su), vM = tierra(i - sv), vP = tierra(i + sv);
              a0 = c(uM, vM, tierra(i - su - sv)); a1 = c(uP, vM, tierra(i + su - sv)); a2 = c(uP, vP, tierra(i + su + sv)); a3 = c(uM, vP, tierra(i - su + sv));
            }
            pos[a] = d; pos[ua] = iu; pos[va] = iv;
            const clim = clima && T.tinte[id] ? clima[pos[0] + pos[2] * 16] : 0;
            mascara[m] = 1 + (LOSETA[id * 3 + tex] | (a0 << 8) | (a1 << 10) | (a2 << 12) | (a3 << 14) | (clim << 16) | (flags << 24) | (pase << 28));
            luzM[m] = l0 | (l1 << 4) | (l2 << 8) | (l3 << 12) | (k0 << 16) | (k1 << 20) | (k2 << 24) | (k3 << 28);
          }
        }
        // fundir rectángulos de caras idénticas (misma loseta, AO, clima, banderas y luz en las cuatro esquinas)
        for (let iv = 0; iv < dv; iv++) for (let iu = 0; iu < du;) {
          const m = iu + iv * du, k = mascara[m]; if (!k) { iu++; continue; }
          const lk = luzM[m];
          let w = 1; while (iu + w < du && mascara[m + w] === k && luzM[m + w] === lk) w++;
          let h = 1; fuera: while (iv + h < dv) { for (let x = 0; x < w; x++) if (mascara[m + x + h * du] !== k || luzM[m + x + h * du] !== lk) break fuera; h++; }
          for (let y = 0; y < h; y++) mascara.fill(0, m + y * du, m + y * du + w);
          const v = k - 1, loseta = v & 255, clim = ((v >> 16) & 255) / 255, flags = (v >> 24) & 15, pase = (v >> 28) & 3;
          const A = [(v >> 8) & 3, (v >> 10) & 3, (v >> 12) & 3, (v >> 14) & 3];
          const LCq = [lk & 15, (lk >> 4) & 15, (lk >> 8) & 15, (lk >> 12) & 15], LBq = [(lk >> 16) & 15, (lk >> 20) & 15, (lk >> 24) & 15, (lk >>> 28) & 15];
          const b = pase === PASE_TRANSP ? tra : opa; b.asegurar(4, 6);
          const plano = d + (s > 0 ? 1 : 0), esq = [[iu, iv], [iu + w, iv], [iu + w, iv + h], [iu, iv + h]], ids = [];
          for (let q = 0; q < 4; q++) {
            pos[a] = plano; pos[ua] = esq[q][0]; pos[va] = esq[q][1];
            ids.push(b.vert(pos[0], pos[1], pos[2], cara, loseta, flags, esq[q][0] - iu, esq[q][1] - iv, A[q] / 3, LCq[q] / 15, LBq[q] / 15, clim));
          }
          // la diagonal va por las esquinas más parecidas (AO + luz): sin «pliegue» anisótropo
          const br = (q) => A[q] * 5 + LCq[q] + LBq[q];
          const giro = br(0) + br(2) < br(1) + br(3);
          const t = giro ? [[1, 2, 3], [1, 3, 0]] : [[0, 1, 2], [0, 2, 3]];
          for (const [x, y, z] of t) invertir ? b.tri(ids[x], ids[z], ids[y]) : b.tri(ids[x], ids[y], ids[z]);
          iu += w;
        }
      }
    }
  }
  // plantas: dos planos en cruz, con las dos caras (luz de su propia celda; la base un poco más oscura: se asienta)
  for (let y = 0; y < H; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const id = at(x, y, z); if (T.forma[id] !== 3) continue;
    const k = li(x, y, z), cielo = LC[k] / 15, blq = LB[k] / 15, loseta = LOSETA[id * 3 + 2], flags = (T.luz[id] ? FLAG.emisivo : 0) | (T.vaiven[id] ? FLAG.vaiven : 0);
    const clim = clima && T.tinte[id] ? clima[x + z * 16] / 255 : 0, base = T.luz[id] ? 1 : 0.62;
    opa.asegurar(16, 24);
    for (const [ax, az, bx, bz] of [[0.15, 0.15, 0.85, 0.85], [0.15, 0.85, 0.85, 0.15]]) {
      const v = [[x + ax, y, z + az, 0, 0], [x + bx, y, z + bz, 1, 0], [x + bx, y + 1, z + bz, 1, 1], [x + ax, y + 1, z + az, 0, 1]].map(([px, py, pz, u, w]) => opa.vert(px, py, pz, 6, loseta, flags, u, w, w ? 1 : base, cielo, blq, clim));
      opa.tri(v[0], v[1], v[2]); opa.tri(v[0], v[2], v[3]); opa.tri(v[0], v[2], v[1]); opa.tri(v[0], v[3], v[2]);
    }
  }
  const o = opa.cerrar(), t = tra.cerrar();
  return { opaco: o, transp: t, tris: o.nt + t.nt, verts: o.nv + t.nv };
}

// Código de clima de una columna (temperatura y humedad del generador, 4 bits cada una): el shader lo convierte en el
// tinte del césped, las hojas y el agua, con transiciones suaves porque el clima es un campo continuo.
const a01 = (v) => Math.max(0, Math.min(1, v));
export const codigoClima = (col) => (Math.round(a01((col.temp + 0.9) / 1.8) * 15) << 4) | Math.round(a01((col.hum + 0.9) / 1.8) * 15);
export function climaDeChunk(gen, cx, cz) {
  const out = new Uint8Array(256);
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) out[x + z * 16] = codigoClima(gen.columna(cx * 16 + x, cz * 16 + z));
  return out;
}
// Conteo de triángulos «ingenuo» (una cara = 2 triángulos, sin fundir): solo para comparar en pruebas y benchmarks.
export function triangulosIngenuos(vol, H) {
  let n = 0; const at = (x, y, z) => (y < 0 || y >= H ? 0 : vol[(x + 1) + (z + 1) * P + y * P * P]);
  for (let y = 0; y < H; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const id = at(x, y, z); if (!id || T.forma[id] === 0) continue;
    if (T.forma[id] === 3) { n += 8; continue; }
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const nb = at(x + dx, y + dy, z + dz); if (!T.opaco[nb] && nb !== id) n += 2; }
  }
  return n;
}
// Volumen con borde a partir de un chunk y sus 8 vecinos (null = aire). bloques: Uint8Array(16*16*H)
export function volumenConBorde(centro, vecinos, H) {
  const vol = new Uint8Array(P * P * H);
  const copia = (src, ox, oz) => {
    if (!src) return;
    for (let y = 0; y < H; y++) for (let z = 0; z < 16; z++) {
      const pz = z + oz * 16 + 1; if (pz < 0 || pz >= P) continue;
      for (let x = 0; x < 16; x++) { const px = x + ox * 16 + 1; if (px < 0 || px >= P) continue; vol[px + pz * P + y * P * P] = src[x + z * 16 + y * 256]; }
    }
  };
  copia(centro, 0, 0);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (dx || dz) copia(vecinos[(dz + 1) * 3 + (dx + 1)], dx, dz);
  return vol;
}
