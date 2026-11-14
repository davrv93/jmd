// Ficha 3D del sorteo: una medalla naranja brillante que flota, sigue el dedo
// (o la inclinación del teléfono) con un resorte, y gira para mostrar el
// número de cada participante. Usa THREE global (r128).
export function crearHeroe(el) {
  const THREE = window.THREE;
  if (!THREE) return { mostrar() {}, celebrar() {} };
  const W = () => el.clientWidth, H = () => el.clientHeight;
  const escena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, W() / H(), .1, 100);
  cam.position.set(0, 0, 10);
  const rend = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rend.setPixelRatio(Math.min(devicePixelRatio, 2));
  rend.setSize(W(), H());
  rend.outputEncoding = THREE.sRGBEncoding;
  el.append(rend.domElement);

  // Cara de la medalla: un lienzo que se redibuja con el texto.
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 512;
  const cx = lienzo.getContext("2d");
  const textura = new THREE.CanvasTexture(lienzo);
  textura.encoding = THREE.sRGBEncoding;
  // La tapa del cilindro queda girada un cuarto de vuelta al ponerlo de frente.
  textura.center.set(.5, .5);
  textura.rotation = Math.PI / 2;
  function cara(grande, chico) {
    const g = cx.createRadialGradient(200, 170, 40, 256, 256, 300);
    g.addColorStop(0, "#f6a27f"); g.addColorStop(.55, "#d97757"); g.addColorStop(1, "#a8472a");
    cx.fillStyle = g; cx.fillRect(0, 0, 512, 512);
    cx.strokeStyle = "rgba(255,255,255,.35)"; cx.lineWidth = 6;
    cx.beginPath(); cx.arc(256, 256, 214, 0, 6.283); cx.stroke();
    cx.fillStyle = "#fff"; cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.font = `700 ${grande.length > 3 ? 120 : 190}px 'Space Grotesk', system-ui, sans-serif`;
    cx.fillText(grande, 256, chico ? 236 : 262);
    if (chico) {
      cx.font = "700 40px 'JetBrains Mono', monospace";
      cx.fillStyle = "rgba(255,255,255,.85)";
      cx.fillText(chico, 256, 372);
    }
    textura.needsUpdate = true;
  }
  cara("CCP", "SORTEO");

  const borde = new THREE.MeshPhysicalMaterial({ color: 0xc8603f, metalness: .35, roughness: .28, clearcoat: 1, clearcoatRoughness: .15 });
  const frente = new THREE.MeshPhysicalMaterial({ map: textura, metalness: .1, roughness: .35, clearcoat: 1, clearcoatRoughness: .1 });
  const medalla = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, .34, 96, 1), [borde, frente, frente]);
  medalla.rotation.x = Math.PI / 2;
  const aro = new THREE.Mesh(new THREE.TorusGeometry(1.9, .09, 24, 120), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .6, roughness: .2, clearcoat: 1 }));
  const grupo = new THREE.Group();
  grupo.add(medalla, aro);
  escena.add(grupo);

  // Partículas de luz alrededor.
  const N = 140, pos = new Float32Array(N * 3), fase = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 2.6 + Math.random() * 2.4, a = Math.random() * 6.283;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - .5) * 4.4; pos[i * 3 + 2] = Math.sin(a) * r - 1;
    fase[i] = a;
  }
  const geoP = new THREE.BufferGeometry();
  geoP.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const punto = document.createElement("canvas"); punto.width = punto.height = 64;
  const pc = punto.getContext("2d"), pg = pc.createRadialGradient(32, 32, 0, 32, 32, 32);
  pg.addColorStop(0, "rgba(255,230,210,1)"); pg.addColorStop(.4, "rgba(242,165,127,.6)"); pg.addColorStop(1, "rgba(242,165,127,0)");
  pc.fillStyle = pg; pc.fillRect(0, 0, 64, 64);
  const particulas = new THREE.Points(geoP, new THREE.PointsMaterial({ size: .22, map: new THREE.CanvasTexture(punto), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  escena.add(particulas);

  escena.add(new THREE.HemisphereLight(0xffffff, 0xf3d6c4, .9));
  const l1 = new THREE.DirectionalLight(0xffffff, 1.3); l1.position.set(4, 5, 6); escena.add(l1);
  const l2 = new THREE.PointLight(0xffd9c2, 1.4, 30); l2.position.set(-5, -2, 5); escena.add(l2);

  // Resortes: la medalla persigue un objetivo con rebote suave.
  const objetivo = { x: 0, y: 0, giro: 0 }, actual = { x: 0, y: 0, giro: 0 }, vel = { x: 0, y: 0, giro: 0 };
  const seguir = (px, py) => { objetivo.x = py * .5; objetivo.y = px * .7; };
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    seguir((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1);
  });
  el.addEventListener("pointerleave", () => seguir(0, 0));
  el.addEventListener("pointerdown", () => { objetivo.giro += Math.PI * 2; });
  addEventListener("deviceorientation", (e) => { if (e.gamma != null) seguir(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30))); });
  addEventListener("resize", () => { cam.aspect = W() / H(); cam.updateProjectionMatrix(); rend.setSize(W(), H()); });

  let estallido = 0, visible = true;
  new IntersectionObserver(([x]) => { visible = x.isIntersecting; }).observe(el);
  function cuadro(t) {
    requestAnimationFrame(cuadro);
    if (!visible) return;
    for (const k of ["x", "y", "giro"]) {
      vel[k] += (objetivo[k] - actual[k]) * .06; vel[k] *= .82; actual[k] += vel[k];
    }
    const flota = Math.sin(t / 900) * .12;
    grupo.position.y = flota;
    grupo.rotation.set(actual.x + Math.sin(t / 1300) * .08, actual.y + actual.giro + Math.sin(t / 1700) * .15, 0);
    const p = geoP.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] += .004 + estallido * .05;
      if (p[i * 3 + 1] > 2.4) p[i * 3 + 1] = -2.4;
    }
    geoP.attributes.position.needsUpdate = true;
    particulas.rotation.y = t / 9000;
    particulas.material.size = .22 + estallido * .25;
    estallido *= .97;
    rend.render(escena, cam);
  }
  requestAnimationFrame(cuadro);

  return {
    // Gira la medalla una vuelta completa y cambia la cara a mitad del giro.
    mostrar(grande, chico) {
      objetivo.giro += Math.PI * 2;
      setTimeout(() => cara(grande, chico), 260);
    },
    celebrar() { estallido = 1; objetivo.giro += Math.PI * 4; },
  };
}
