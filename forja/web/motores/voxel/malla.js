// Forja · voxel · Chunk Mesh Builder. Corre en el Worker (y en Node para las pruebas): recibe el volumen del chunk con
// un borde de 1 bloque de los vecinos (18 × 18 × H) y devuelve buffers listos para la GPU (TypedArrays transferibles).
//   · hidden face removal: una cara solo existe si el vecino deja verla
//   · greedy meshing (M. Lysenko, 0fps.net, 2012): por cada corte, las caras iguales se funden en rectángulos
//   · ambient occlusion por vértice (3 vecinos por esquina) y diagonal girada para que no se vea anisótropo
//   · luz de cielo y de bloques emisivos por inundación (BFS) dentro del volumen; va por cara en los atributos
//   · geometría opaca (incluye «recorte»: hojas, plantas) y transparente (agua, vidrio, hielo) por separado
// Formato de vértice (lo que lee el shader de render.js):
//   aPosition = posición local en el chunk · aNormal = (cara 0..6, loseta del atlas, banderas) · aTexCoord = uv en
//   bloques (se repite con fract) · aVertexColor = (AO 0..1, luz de cielo 0..1, luz de bloque 0..1, 1)
import { T, LOSETA } from './bloques.js';

export const P = 18;   // lado del volumen con borde
export const FLAG = { agua: 1, emisivo: 2, lava: 4 };
const PASE_OPACO = 0, PASE_RECORTE = 1, PASE_TRANSP = 2;

function crecer() {
  let pos = new Float32Array(3 * 1024), nor = new Float32Array(3 * 1024), uv = new Float32Array(2 * 1024), col = new Float32Array(4 * 1024), idx = new Uint32Array(1536), nv = 0, ni = 0;
  const asegurar = (v, i) => {
    if ((nv + v) * 3 > pos.length) { const k = Math.max(pos.length * 2, (nv + v) * 3); const g = (a, n) => { const b = new a.constructor(n); b.set(a); return b; }; pos = g(pos, k); nor = g(nor, k); uv = g(uv, (k / 3) * 2); col = g(col, (k / 3) * 4); }
    if (ni + i > idx.length) { const b = new Uint32Array(Math.max(idx.length * 2, ni + i)); b.set(idx); idx = b; }
  };
  return {
    vert(x, y, z, cara, loseta, flags, u, v, ao, cielo, bloque) {
      const k = nv;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; nor[k * 3] = cara; nor[k * 3 + 1] = loseta; nor[k * 3 + 2] = flags;
      uv[k * 2] = u; uv[k * 2 + 1] = v; col[k * 4] = ao; col[k * 4 + 1] = cielo; col[k * 4 + 2] = bloque; col[k * 4 + 3] = 1; nv++; return k;
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
export function mallar(vol, H, { ao = true } = {}) {
  const at = (x, y, z) => (y < 0 || y >= H ? 0 : vol[(x + 1) + (z + 1) * P + y * P * P]);
  const L = luces(vol, H), li = (x, y, z) => (y < 0 ? 0 : y >= H ? -1 : (x + 1) + (z + 1) * P + y * P * P);
  const opa = crecer(), tra = crecer();
  const dim = [16, H, 16];
  const ejes = [[0, 2, 1], [1, 0, 2], [2, 0, 1]];   // [eje normal, eje u, eje v]: en los lados v es siempre la altura
  const pos = [0, 0, 0];
  const PASO = [1, P * P, P];   // zancada de cada eje en el volumen con borde (x, y, z)
  const opq = (i, y) => (y < 0 || y >= H ? 0 : T.opaco[vol[i]]);
  const c = (s1, s2, esq) => (s1 && s2 ? 0 : 3 - s1 - s2 - esq);
  for (const [a, ua, va] of ejes) {
    const du = dim[ua], dv = dim[va], mascara = new Int32Array(du * dv), aos = new Uint8Array(du * dv * 4);
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
            const fuera = yq >= H, cielo = fuera ? 15 : yq < 0 ? 0 : L.cielo[qi], blq = fuera || yq < 0 ? 0 : L.bloque[qi];
            let flags = 0; if (T.liquido[id] && pase === PASE_TRANSP) flags |= FLAG.agua; if (T.luz[id] >= 9) flags |= FLAG.emisivo; if (T.liquido[id] && pase === PASE_OPACO) flags |= FLAG.lava | FLAG.emisivo;
            const m = iu + iv * du; let a0 = 3, a1 = 3, a2 = 3, a3 = 3;
            if (ao && pase !== PASE_TRANSP && !fuera) {
              // vecinos en la capa de la cara: lados u, v y esquina (la v de los lados es la altura: se comprueba el borde)
              const yv = va === 1, ym = yq - 1, yM = yq + 1;
              const uM = opq(qi - su, yq), uP = opq(qi + su, yq), vM = opq(qi - sv, yv ? ym : yq), vP = opq(qi + sv, yv ? yM : yq);
              a0 = c(uM, vM, opq(qi - su - sv, yv ? ym : yq)); a1 = c(uP, vM, opq(qi + su - sv, yv ? ym : yq));
              a2 = c(uP, vP, opq(qi + su + sv, yv ? yM : yq)); a3 = c(uM, vP, opq(qi - su + sv, yv ? yM : yq));
            }
            aos[m * 4] = a0; aos[m * 4 + 1] = a1; aos[m * 4 + 2] = a2; aos[m * 4 + 3] = a3;
            mascara[m] = 1 + (LOSETA[id * 3 + tex] | (a0 << 8) | (a1 << 10) | (a2 << 12) | (a3 << 14) | (cielo << 16) | (blq << 20) | (flags << 24) | (pase << 28));
          }
        }
        // fundir rectángulos de caras idénticas
        for (let iv = 0; iv < dv; iv++) for (let iu = 0; iu < du;) {
          const m = iu + iv * du, k = mascara[m]; if (!k) { iu++; continue; }
          let w = 1; while (iu + w < du && mascara[m + w] === k) w++;
          let h = 1; fuera: while (iv + h < dv) { for (let x = 0; x < w; x++) if (mascara[m + x + h * du] !== k) break fuera; h++; }
          for (let y = 0; y < h; y++) mascara.fill(0, m + y * du, m + y * du + w);
          const v = k - 1, loseta = v & 255, cielo = ((v >> 16) & 15) / 15, blq = ((v >> 20) & 15) / 15, flags = (v >> 24) & 15, pase = (v >> 28) & 3;
          const A = [aos[m * 4], aos[m * 4 + 1], aos[m * 4 + 2], aos[m * 4 + 3]];
          const b = pase === PASE_TRANSP ? tra : opa; b.asegurar(4, 6);
          const plano = d + (s > 0 ? 1 : 0), esq = [[iu, iv], [iu + w, iv], [iu + w, iv + h], [iu, iv + h]], ids = [];
          for (let c = 0; c < 4; c++) {
            pos[a] = plano; pos[ua] = esq[c][0]; pos[va] = esq[c][1];
            ids.push(b.vert(pos[0], pos[1], pos[2], cara, loseta, flags, esq[c][0] - iu, esq[c][1] - iv, A[c] / 3, cielo, blq));
          }
          const giro = A[0] + A[2] < A[1] + A[3];
          const t = giro ? [[1, 2, 3], [1, 3, 0]] : [[0, 1, 2], [0, 2, 3]];
          for (const [x, y, z] of t) invertir ? b.tri(ids[x], ids[z], ids[y]) : b.tri(ids[x], ids[y], ids[z]);
          iu += w;
        }
      }
    }
  }
  // plantas: dos planos en cruz, con las dos caras (sin AO; luz de su propia celda)
  for (let y = 0; y < H; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const id = at(x, y, z); if (T.forma[id] !== 3) continue;
    const k = li(x, y, z), cielo = L.cielo[k] / 15, blq = L.bloque[k] / 15, loseta = LOSETA[id * 3 + 2], flags = T.luz[id] ? FLAG.emisivo : 0;
    opa.asegurar(16, 24);
    for (const [ax, az, bx, bz] of [[0.15, 0.15, 0.85, 0.85], [0.15, 0.85, 0.85, 0.15]]) {
      const v = [[x + ax, y, z + az, 0, 0], [x + bx, y, z + bz, 1, 0], [x + bx, y + 1, z + bz, 1, 1], [x + ax, y + 1, z + az, 0, 1]].map(([px, py, pz, u, w]) => opa.vert(px, py, pz, 6, loseta, flags, u, w, 1, cielo, blq));
      opa.tri(v[0], v[1], v[2]); opa.tri(v[0], v[2], v[3]); opa.tri(v[0], v[2], v[1]); opa.tri(v[0], v[3], v[2]);
    }
  }
  const o = opa.cerrar(), t = tra.cerrar();
  return { opaco: o, transp: t, tris: o.nt + t.nt, verts: o.nv + t.nv };
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
