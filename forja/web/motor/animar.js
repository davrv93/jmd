// Forja · animación con GSAP. Cada animación es una línea de tiempo en pausa de duración 1; posar() la lleva al
// instante u (0..1). Así el estudio en vivo y la hoja de sprites usan exactamente la misma pose, cuadro por cuadro.
// Las reglas dan amplitud, frecuencia, aplastado y rebote; GSAP pone la anticipación, el impulso y el asentado.
const PI = Math.PI, TAU = PI * 2;
const gsap = globalThis.gsap;
gsap?.defaults({ lazy: false, overwrite: false });

export function duracion(spec, anim) { return 1 / spec.anim[anim].fr; }

function crear(pj, spec, anim) {
  const P = pj.P, r = spec.anim[anim], rig = spec.rig, flota = rig === 'flotante';
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'sine.inOut', lazy: false } });
  const a = (obj, vars, en, dur, ease) => { tl.to(obj, { ...vars, duration: dur, ...(ease ? { ease } : {}) }, en); return tl; };
  const fija = (obj, vars) => tl.set(obj, vars, 0);
  const E = (k) => 1 / Math.sqrt(Math.max(0.3, 1 - k)); // al aplastar en Y se ensancha en X y Z: conserva el volumen
  const aplasta = (k, en, dur, ease) => a(P.todo.scale, { y: 1 - k, x: E(k), z: E(k) }, en, dur, ease);
  const y0 = P.todo.position.y, yc = P.cuerpo.position.y;
  const brazos = P.brazos.filter((b) => b.userData.lado && b.children.length && !flota), sueltas = P.brazos.filter((b) => !brazos.includes(b));
  const erguido = rig === 'bipedo' || rig === 'ave';
  // onda de ida y vuelta en cuatro tiempos: 0 → +v → 0 → −v → 0 (fase 0) o al revés (fase 1)
  const onda = (obj, prop, base, v, fase = 0) => { const s = fase ? -1 : 1; for (const [i, k] of [1, 0, -1, 0].entries()) a(obj, { [prop]: base + s * k * v }, i * 0.25, 0.25, i % 2 ? 'sine.in' : 'sine.out'); };

  if (anim === 'quieto') {
    a(P.cuerpo.scale, { y: 1 + r.amp * 0.6 }, 0, 0.5); a(P.cuerpo.scale, { y: 1 }, 0.5, 0.5);
    for (const b of brazos) { const z = b.rotation.z; a(b.rotation, { z: z + b.userData.lado * 0.07 }, 0, 0.5); a(b.rotation, { z }, 0.5, 0.5); }
    for (const b of sueltas) { const y = b.position.y; a(b.position, { y: y + 0.04 }, 0, 0.5); a(b.position, { y }, 0.5, 0.5); }
    if (P.cabeza && erguido) onda(P.cabeza.rotation, 'z', P.cabeza.rotation.z, 0.03);
  } else if (anim === 'caminar' || anim === 'correr') {
    const A = r.amp, corre = anim === 'correr';
    if (corre) fija(P.todo.rotation, { x: flota ? 0.12 : 0.2 });
    if (erguido) {
      P.piernas.forEach((p, i) => onda(p.rotation, 'x', 0, A * (rig === 'ave' ? 0.8 : 1), i));
      brazos.forEach((b, i) => { onda(b.rotation, 'x', 0, A * 0.8 * (rig === 'ave' ? 0.25 : 1), 1 - (i % 2)); if (corre && rig === 'bipedo') fija(b.rotation, { z: b.rotation.z + b.userData.lado * 0.14 }); });
      // el cuerpo baja en cada apoyo (piernas abiertas) y sube al cruzarlas
      tl.fromTo(P.cuerpo.position, { y: yc + r.bo }, { y: yc, duration: 0.25, ease: 'power1.in' }, 0); a(P.cuerpo.position, { y: yc + r.bo }, 0.25, 0.25, 'power1.out'); a(P.cuerpo.position, { y: yc }, 0.5, 0.25, 'power1.in'); a(P.cuerpo.position, { y: yc + r.bo }, 0.75, 0.25, 'power1.out');
      onda(P.todo.rotation, 'z', 0, rig === 'ave' ? 0.13 : 0.035);
    } else if (rig === 'cuadrupedo') {
      [0, 1, 1, 0].forEach((fase, i) => { if (P.piernas[i]) onda(P.piernas[i].rotation, 'x', 0, A * 0.85, fase); });
      tl.fromTo(P.cuerpo.position, { y: yc + r.bo * 0.8 }, { y: yc, duration: 0.25, ease: 'power1.in' }, 0); a(P.cuerpo.position, { y: yc + r.bo * 0.8 }, 0.25, 0.25, 'power1.out'); a(P.cuerpo.position, { y: yc }, 0.5, 0.25, 'power1.in'); a(P.cuerpo.position, { y: yc + r.bo * 0.8 }, 0.75, 0.25, 'power1.out');
      if (P.cabeza) { const x = P.cabeza.rotation.x; a(P.cabeza.rotation, { x: x + 0.08 }, 0, 0.25); a(P.cabeza.rotation, { x }, 0.25, 0.25); a(P.cabeza.rotation, { x: x + 0.08 }, 0.5, 0.25); a(P.cabeza.rotation, { x }, 0.75, 0.25); }
    } else if (flota) {
      if (!corre) fija(P.todo.rotation, { x: 0.16 });
      onda(P.todo.rotation, 'z', 0, 0.06);
      sueltas.forEach((b, i) => onda(b.position, 'y', b.position.y, 0.05, i % 2));
    } else { // blob: avanza a saltitos, aplastándose al caer
      const h = r.bo * 3.2, k = r.sq * 1.7;
      for (const t of [0, 0.5]) {
        tl.fromTo(P.todo.scale, { y: 1 - k, x: E(k), z: E(k) }, { y: 1 + k * 0.6, x: E(-k * 0.6), z: E(-k * 0.6), duration: 0.12, ease: 'power2.out' }, t);
        a(P.todo.scale, { y: 1, x: 1, z: 1 }, t + 0.12, 0.2); aplasta(k, t + 0.4, 0.1, 'power2.in');
        tl.fromTo(P.todo.position, { y: y0 }, { y: y0 + h, duration: 0.24, ease: 'power2.out' }, t + 0.04); a(P.todo.position, { y: y0 }, t + 0.28, 0.2, 'power2.in');
      }
      P.piernas.forEach((p, i) => onda(p.rotation, 'x', 0, 0.5, i));
      brazos.forEach((b, i) => onda(b.rotation, 'x', 0, 0.4, i));
    }
  } else if (anim === 'saltar') {
    const H = r.amp * r.bo * 1.05 / spec.dims.escala * Math.min(1.4, spec.dims.escala);
    aplasta(r.sq, 0, 0.18, 'power2.out');                      // anticipación
    aplasta(-r.sq * 0.6, 0.18, 0.12, 'back.out(2.5)');          // impulso: se estira
    a(P.todo.position, { y: y0 + H }, 0.18, 0.32, 'power2.out'); a(P.todo.position, { y: y0 }, 0.5, 0.32, 'power2.in');
    aplasta(0, 0.3, 0.2); aplasta(-r.sq * 0.35, 0.5, 0.32, 'power1.in');
    aplasta(r.sq * 0.95, 0.82, 0.07, 'power3.out');             // aterrizaje
    a(P.todo.scale, { y: 1, x: 1, z: 1 }, 0.89, 0.11, 'back.out(3)');
    P.piernas.forEach((p, i) => { const v = rig === 'cuadrupedo' ? (i < 2 ? -0.7 : 0.7) : -0.6; a(p.rotation, { x: v }, 0.2, 0.25, 'power2.out'); a(p.rotation, { x: 0 }, 0.6, 0.24, 'power2.in'); });
    for (const b of brazos) { const z = b.rotation.z; a(b.rotation, { z: z - b.userData.lado * 0.25 }, 0, 0.18, 'power2.out'); a(b.rotation, { z: z + b.userData.lado * 1.6 }, 0.18, 0.2, 'back.out(2)'); a(b.rotation, { z }, 0.62, 0.3, 'power2.inOut'); }
    for (const b of sueltas) { const y = b.position.y; a(b.position, { y: y + 0.14 }, 0.2, 0.25, 'power2.out'); a(b.position, { y }, 0.6, 0.3); }
    if (P.cola) { const x = P.cola.rotation.x; a(P.cola.rotation, { x: x + 0.5 }, 0.2, 0.3, 'power2.out'); a(P.cola.rotation, { x }, 0.6, 0.3); }
  } else if (anim === 'golpe') {
    const brazo = brazos.find((b) => b.userData.lado === 1), am = r.amp / 1.2;
    if (brazo && rig !== 'ave') {
      const x = brazo.rotation.x, z = brazo.rotation.z;
      a(brazo.rotation, { x: x + 1.0 * am, z: z + 0.25 }, 0, 0.28, 'power2.out');          // toma impulso hacia atrás
      a(brazo.rotation, { x: x - 2.0 * am, z: z - 0.2 }, 0.28, 0.13, 'power3.in');           // el golpe acelera
      a(brazo.rotation, { x: x - 1.6 * am }, 0.41, 0.14, 'back.out(4)');                     // se pasa y vuelve un poco
      a(brazo.rotation, { x, z }, 0.55, 0.45, 'power2.inOut');
      a(P.todo.rotation, { y: 0.28 }, 0, 0.28, 'power2.out'); a(P.todo.rotation, { y: -0.42 }, 0.28, 0.13, 'power3.in'); a(P.todo.rotation, { y: 0 }, 0.5, 0.5, 'power2.inOut');
      a(P.todo.position, { z: -0.05 }, 0, 0.28, 'power2.out'); a(P.todo.position, { z: 0.16 }, 0.28, 0.13, 'power3.in'); a(P.todo.position, { z: 0 }, 0.5, 0.5, 'elastic.out(1, 0.7)');
      a(P.cuerpo.rotation, { x: 0.14 }, 0.28, 0.13, 'power3.in'); a(P.cuerpo.rotation, { x: 0 }, 0.5, 0.4);
    } else { // embestida, picotazo o mordisco
      a(P.todo.position, { z: -0.12 * am }, 0, 0.28, 'power2.out'); a(P.todo.position, { z: 0.38 * am }, 0.28, 0.13, 'power3.in'); a(P.todo.position, { z: 0 }, 0.45, 0.55, 'elastic.out(1, 0.6)');
      a(P.todo.rotation, { x: -0.12 }, 0, 0.28, 'power2.out'); a(P.todo.rotation, { x: 0.22 }, 0.28, 0.13, 'power3.in'); a(P.todo.rotation, { x: 0 }, 0.45, 0.4, 'power2.out');
      if (rig === 'blob' || flota) { aplasta(0.12, 0, 0.28, 'power2.out'); aplasta(-0.16, 0.28, 0.13, 'power3.in'); a(P.todo.scale, { y: 1, x: 1, z: 1 }, 0.45, 0.5, 'elastic.out(1, 0.5)'); }
      else if (P.cabeza) { const x = P.cabeza.rotation.x; a(P.cabeza.rotation, { x: x - 0.2 }, 0, 0.28, 'power2.out'); a(P.cabeza.rotation, { x: x + 0.6 }, 0.28, 0.13, 'power3.in'); a(P.cabeza.rotation, { x }, 0.45, 0.45, 'back.out(2)'); }
      for (const b of brazos) { const z = b.rotation.z; a(b.rotation, { z: z + b.userData.lado * 0.9 }, 0.28, 0.13, 'power3.in'); a(b.rotation, { z }, 0.45, 0.45, 'power2.out'); }
    }
  } else if (anim === 'dano') {
    a(P.todo.position, { z: -0.18 }, 0, 0.22, 'power3.out'); a(P.todo.position, { z: 0 }, 0.22, 0.78, 'elastic.out(1, 0.5)');
    a(P.todo.rotation, { x: -0.3 }, 0, 0.22, 'power3.out'); a(P.todo.rotation, { x: 0 }, 0.22, 0.6, 'power2.out');
    aplasta(r.sq * 0.9, 0, 0.2, 'power3.out'); a(P.todo.scale, { y: 1, x: 1, z: 1 }, 0.2, 0.6, 'elastic.out(1, 0.45)');
    for (const [i, v] of [0.04, -0.035, 0.025, -0.015, 0].entries()) a(P.cuerpo.position, { x: v }, i * 0.07, 0.07, 'none');
    for (const b of brazos) { const z = b.rotation.z; a(b.rotation, { z: z + b.userData.lado * 1.0 }, 0, 0.2, 'power3.out'); a(b.rotation, { z }, 0.3, 0.6, 'power2.inOut'); }
    if (P.cabeza && erguido) { const x = P.cabeza.rotation.x; a(P.cabeza.rotation, { x: x - 0.3 }, 0, 0.2, 'power3.out'); a(P.cabeza.rotation, { x }, 0.25, 0.6, 'back.out(2)'); }
  } else if (anim === 'morir') {
    if (flota) { a(P.todo.position, { y: y0 - 0.3 }, 0, 0.6, 'power2.in'); a(P.todo.scale, { x: 0.45, y: 0.45, z: 0.45 }, 0, 0.6, 'power2.in'); a(P.todo.rotation, { z: 0.6 }, 0, 0.6, 'power1.in'); }
    else if (rig === 'blob') aplasta(0.72, 0, 0.6, 'bounce.out');
    else if (rig === 'cuadrupedo') { a(P.todo.rotation, { z: PI / 2 }, 0, 0.6, 'bounce.out'); a(P.todo.position, { y: y0 + spec.dims.tw * 0.3 }, 0, 0.3, 'power1.out'); P.piernas.forEach((p, i) => a(p.rotation, { x: i < 2 ? 0.5 : -0.5 }, 0.1, 0.4, 'power2.out')); }
    else { a(P.todo.rotation, { x: -PI / 2 }, 0, 0.6, 'bounce.out'); a(P.todo.position, { y: y0 + spec.dims.tw * 0.36, z: (pj.alto / spec.dims.escala) * 0.42 }, 0, 0.35, 'power1.out'); P.piernas.forEach((p, i) => a(p.rotation, { x: i ? 0.35 : -0.35 }, 0.1, 0.4, 'power2.out')); }
    for (const b of brazos) a(b.rotation, { z: b.rotation.z + b.userData.lado * 1.2 }, 0, 0.35, 'power2.out');
  } else if (anim === 'celebrar') {
    const h = r.bo * r.amp * 0.95, k = r.sq * 0.5;
    for (const t of [0, 0.5]) {
      a(P.todo.position, { y: y0 + h }, t, 0.22, 'power2.out'); a(P.todo.position, { y: y0 }, t + 0.22, 0.2, 'power2.in');
      aplasta(-k, t, 0.12, 'power2.out'); aplasta(0, t + 0.12, 0.26); aplasta(k * 1.4, t + 0.4, 0.05, 'power2.out'); a(P.todo.scale, { y: 1, x: 1, z: 1 }, t + 0.45, 0.05);
    }
    onda(P.todo.rotation, 'z', 0, 0.09);
    brazos.forEach((b, i) => { const z = b.rotation.z + b.userData.lado * 2.25; fija(b.rotation, { z }); onda(b.rotation, 'z', z, 0.28, i % 2); });
    for (const b of sueltas) { fija(b.position, { y: b.position.y + 0.3 }); }
  } else if (anim === 'agachado') {
    const k = r.sq * (erguido ? 0.45 : rig === 'cuadrupedo' ? 0.15 : 1.1);
    if (erguido || rig === 'cuadrupedo') { for (const p of P.piernas) fija(p.scale, { y: 0.55 }); fija(P.cuerpo.position, { y: yc - spec.dims.pierna * (erguido ? 0.28 : 0.32) }); if (erguido) fija(P.cuerpo.rotation, { x: 0.18 }); }
    tl.fromTo(P.todo.scale, { y: 1 - k, x: E(k), z: E(k) }, { y: 1 - k * 1.14, x: E(k * 1.14), z: E(k * 1.14), duration: 0.5 }, 0); aplasta(k, 0.5, 0.5);
    for (const b of brazos) fija(b.rotation, { z: b.rotation.z + b.userData.lado * 0.25 });
  }
  tl.set({}, {}, 1); // la línea dura exactamente 1
  return tl;
}

// Vida secundaria: cola, antenas, alas, tentáculos, llamas y el flotar. Se suma encima de la pose de GSAP.
function vida(P, spec, anim, u) {
  const flota = spec.rig === 'flotante', quieto = spec.anim.quieto, muerto = anim === 'morir' ? Math.max(0, 1 - u * 2) : 1;
  if (P.cola) P.cola.rotation.y += 0.32 * Math.sin(TAU * u * 2) * muerto;
  P.antenas.forEach((a, i) => { a.rotation.z += 0.12 * Math.sin(TAU * u * 2 + i) * muerto; });
  P.alas.forEach((a) => { a.rotation.y += a.userData.lado * (0.25 + 0.5 * Math.sin(TAU * u * 2)) * muerto; });
  P.tentaculos.forEach((t) => { t.rotation.x += 0.22 * Math.sin(TAU * u + t.userData.fase * 2); t.rotation.z += 0.18 * Math.cos(TAU * u + t.userData.fase * 2); });
  P.llamas.forEach((l, i) => { const k = 1 + 0.14 * Math.sin(TAU * u * 3 + i * 2); l.scale.y *= k; l.scale.x *= 2 - k; });
  P.orejas.forEach((o, i) => { o.rotation.x += 0.05 * Math.sin(TAU * u * 2 + i) * muerto; });
  if (flota && anim !== 'morir') P.todo.position.y += quieto.bo * 1.6 * Math.sin(TAU * u);
}

export function posar(pj, spec, anim, u) {
  const P = pj.P;
  P.reiniciar();
  const tl = ((pj.tl ??= {})[anim] ??= crear(pj, spec, anim));
  const t = Math.min(0.9999, Math.max(0, u)) * tl.duration();
  if (t < tl.time()) tl.render(0, true, true); // al retroceder (vuelta del ciclo o cambio de animación) se rebobina y se avanza: así ningún tramo ya pasado queda sin aplicar
  tl.render(t, true, true);
  vida(P, spec, anim, u);
}
