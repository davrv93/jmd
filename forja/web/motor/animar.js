// Forja · animación por reglas. posar(personaje, ficha, animación, u) deja la pose del instante u (0..1 del ciclo).
// Es una función pura del tiempo: sirve igual para el estudio en vivo que para sacar cuadros de sprites.
const PI = Math.PI, TAU = PI * 2;
const suave = (x) => x * x * (3 - 2 * x);

export function duracion(spec, anim) { return 1 / spec.anim[anim].fr; }

export function posar(pj, spec, anim, u) {
  const P = pj.P, r = spec.anim[anim], rig = spec.rig, s = Math.sin(TAU * u);
  P.reiniciar();
  const aplasta = (k) => { P.todo.scale.y *= 1 - k; const e = 1 / Math.sqrt(Math.max(0.3, 1 - k)); P.todo.scale.x *= e; P.todo.scale.z *= e; };
  const flota = rig === 'flotante';

  // vida de fondo: siempre presente
  const resp = spec.anim.quieto;
  P.cuerpo.scale.y *= 1 + resp.amp * 0.5 * Math.sin(TAU * u * (anim === 'quieto' ? 1 : 2));
  if (P.cola) P.cola.rotation.y += 0.3 * Math.sin(TAU * u * 2);
  P.antenas.forEach((a, i) => { a.rotation.z += 0.12 * Math.sin(TAU * u * 2 + i); });
  P.alas.forEach((a) => { a.rotation.y += a.userData.lado * (0.25 + 0.5 * Math.sin(TAU * u * 2)); });
  P.tentaculos.forEach((t) => { t.rotation.x += 0.22 * Math.sin(TAU * u + t.userData.fase * 2); t.rotation.z += 0.18 * Math.cos(TAU * u + t.userData.fase * 2); });
  P.llamas.forEach((l, i) => { const k = 1 + 0.14 * Math.sin(TAU * u * 3 + i * 2); l.scale.y *= k; l.scale.x *= 2 - k; });
  P.orejas.forEach((o, i) => { o.rotation.x += 0.05 * Math.sin(TAU * u * 2 + i); });
  if (flota) P.todo.position.y += resp.bo * 1.6 * s;

  if (anim === 'quieto') {
    P.brazos.forEach((b) => { if (b.userData.lado && !flota) b.rotation.z += b.userData.lado * 0.05 * s; else b.position.y += 0.03 * s; });
    if (P.cabeza && rig !== 'blob' && !flota) P.cabeza.rotation.z += 0.025 * s;
  } else if (anim === 'caminar' || anim === 'correr') {
    const f = TAU * u, corre = anim === 'correr';
    if (corre) { P.todo.rotation.x += flota ? 0.12 : 0.2; P.brazos.forEach((b) => { if (b.userData.lado && rig === 'bipedo') b.rotation.z += b.userData.lado * 0.12; }); }
    if (rig === 'bipedo' || rig === 'ave') {
      P.piernas.forEach((p, i) => { p.rotation.x += r.amp * Math.sin(f + i * PI) * (rig === 'ave' ? 0.8 : 1); });
      P.brazos.forEach((b, i) => { b.rotation.x += -r.amp * 0.8 * Math.sin(f + i * PI) * (rig === 'ave' ? 0.2 : 1); });
      P.cuerpo.position.y += r.bo * Math.abs(Math.sin(f));
      P.todo.rotation.z += (rig === 'ave' ? 0.13 : 0.035) * Math.sin(f);
    } else if (rig === 'cuadrupedo') {
      [0, PI, PI, 0].forEach((fase, i) => { if (P.piernas[i]) P.piernas[i].rotation.x += r.amp * 0.85 * Math.sin(f + fase); });
      P.cuerpo.position.y += r.bo * 0.8 * Math.abs(Math.sin(f));
      if (P.cabeza) P.cabeza.rotation.x += 0.07 * Math.sin(f * 2);
    } else if (flota) {
      P.todo.rotation.x += 0.16; P.todo.rotation.z += 0.05 * s;
      P.brazos.forEach((b, i) => { b.position.y += 0.05 * Math.sin(f + i * PI); });
    } else { // blob: avanza a saltitos
      const h = Math.abs(Math.sin(f));
      P.todo.position.y += r.bo * 3.2 * h; aplasta(r.sq * 1.6 * Math.cos(f * 2));
      P.piernas.forEach((p, i) => { p.rotation.x += 0.5 * Math.sin(f + i * PI); });
      P.brazos.forEach((b, i) => { if (b.userData.lado) b.rotation.x += 0.4 * Math.sin(f + i * PI); });
    }
  } else if (anim === 'saltar') {
    const A = 0.2, B = 0.8, altura = r.amp * r.bo * 1.05;
    if (u < A) aplasta(r.sq * Math.sin(PI * (u / A) * 0.5));
    else if (u < B) {
      const v = (u - A) / (B - A);
      P.todo.position.y += 4 * v * (1 - v) * altura / spec.dims.escala * Math.min(1.4, spec.dims.escala);
      aplasta(-r.sq * 0.55 * Math.abs(Math.cos(PI * v)));
      const k = Math.sin(PI * v);
      P.piernas.forEach((p, i) => { p.rotation.x += (rig === 'cuadrupedo' ? (i < 2 ? -0.7 : 0.7) : -0.55) * k; });
      P.brazos.forEach((b) => { if (b.userData.lado && !flota) b.rotation.z += b.userData.lado * 1.5 * k; else b.position.y += 0.12 * k; });
      if (P.cola) P.cola.rotation.x += 0.4 * k;
    } else aplasta(r.sq * Math.sin(PI * (1 - (u - B) / (1 - B)) * 0.5) * 0.9);
  } else if (anim === 'dano') {
    const k = Math.sin(PI * u);
    P.todo.position.z -= 0.16 * k; P.todo.rotation.x -= 0.26 * k; P.todo.position.x += 0.035 * Math.sin(TAU * u * 3) * (1 - u);
    aplasta(r.sq * k * 0.8);
    P.brazos.forEach((b) => { if (b.userData.lado && !flota) b.rotation.z += b.userData.lado * 0.9 * k; });
    if (P.cabeza && rig !== 'blob' && !flota) P.cabeza.rotation.x -= 0.25 * k;
  } else if (anim === 'morir') {
    const k = suave(Math.min(1, u / 0.6)), fin = Math.min(1, Math.max(0, (u - 0.6) / 0.25));
    if (flota) { P.todo.position.y -= 0.3 * k; P.todo.scale.multiplyScalar(1 - 0.55 * k); P.todo.rotation.z += 0.5 * k; }
    else if (rig === 'blob') aplasta(0.72 * k);
    else { P.todo.rotation.x -= (PI / 2) * k; P.todo.position.y += 0.12 * Math.sin(PI * k) + 0.1 * k; P.todo.position.y -= 0.05 * Math.abs(Math.sin(PI * 3 * fin)) * (1 - fin); }
    P.brazos.forEach((b) => { if (b.userData.lado && !flota) b.rotation.z += b.userData.lado * 1.1 * k; });
    P.piernas.forEach((p, i) => { p.rotation.x += (i % 2 ? 0.3 : -0.3) * k; });
  } else if (anim === 'celebrar') {
    const h = Math.abs(Math.sin(TAU * u));
    P.todo.position.y += r.bo * r.amp * 0.9 * h; aplasta(-r.sq * 0.4 * h);
    P.todo.rotation.z += 0.08 * Math.sin(TAU * u);
    P.brazos.forEach((b, i) => { if (b.userData.lado && !flota) { b.rotation.z += b.userData.lado * (2.2 + 0.25 * Math.sin(TAU * u * 2 + i)); } else b.position.y += 0.3 + 0.08 * h; });
    P.alas.forEach((a) => { a.rotation.y += a.userData.lado * 0.4 * h; });
  } else if (anim === 'agachado') {
    const k = 1 + 0.06 * s;
    if (rig === 'bipedo' || rig === 'ave') { P.piernas.forEach((p) => { p.scale.y *= 0.55; }); P.cuerpo.position.y -= spec.dims.pierna * 0.45; P.cuerpo.rotation.x += 0.18; aplasta(r.sq * 0.45 * k); }
    else if (rig === 'cuadrupedo') { P.piernas.forEach((p) => { p.scale.y *= 0.5; }); P.cuerpo.position.y -= spec.dims.pierna * 0.5; if (P.cabeza) P.cabeza.position.y -= 0.08; }
    else aplasta(r.sq * 1.1 * k);
    P.brazos.forEach((b) => { if (b.userData.lado && !flota) b.rotation.z += b.userData.lado * 0.25; });
  } else if (anim === 'golpe') {
    const carga = u < 0.3 ? suave(u / 0.3) : 1, pega = u < 0.3 ? 0 : u < 0.5 ? suave((u - 0.3) / 0.2) : 1 - suave((u - 0.5) / 0.5);
    const vuelta = u < 0.5 ? 1 : 1 - suave((u - 0.5) / 0.5);
    const brazo = P.brazos.find((b) => b.userData.lado === 1 && b.children.length);
    if (brazo && (rig === 'bipedo' || rig === 'blob') && spec.rig !== 'ave' && !flota) {
      brazo.rotation.x += (0.9 * carga * (1 - pega) - 1.9 * pega) * (r.amp / 1.2) * (u < 0.3 ? 1 : vuelta + pega * (1 - vuelta));
      brazo.rotation.z += -0.2 * pega;
      P.todo.rotation.y += 0.25 * carga * (1 - pega) - 0.4 * pega;
      P.todo.position.z += 0.14 * pega; P.cuerpo.rotation.x += 0.12 * pega;
    } else { // embestida, picotazo o mordisco
      P.todo.position.z += (-0.1 * carga * (1 - pega) + 0.36 * pega) * r.amp / 1.2;
      P.todo.rotation.x += -0.1 * carga * (1 - pega) + 0.2 * pega;
      if (P.cabeza && rig !== 'blob' && !flota) { P.cabeza.rotation.x += 0.55 * pega; P.cabeza.scale.multiplyScalar(1 + 0.12 * pega); }
      P.brazos.forEach((b) => { if (b.userData.lado) b.rotation.z += b.userData.lado * 0.9 * pega; });
      if (rig === 'blob' || flota) aplasta(-0.14 * pega);
    }
  }
}
