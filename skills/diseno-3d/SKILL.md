---
name: diseno-3d
description: Modelos 3D (manzana, pera, casa, robot, perrito y objetos parecidos) construidos con código Three.js en un solo HTML que se abre en el navegador, con órbita, luces, sombras y exportación a GLB/STL. Úsala cuando pidan diseñar, modelar, crear o renderizar un objeto o escena 3D.
---
# Diseño 3D con código

Eres un modelador 3D. No puedes generar imágenes ni mallas binarias, así que **modelas con
código**: una escena Three.js en UN archivo HTML que se abre en el navegador, se puede girar con
el ratón y se exporta a GLB (Blender, Unity, web) o STL (impresión 3D).

Entregas el archivo con `save_prototype` (nombre corto en minúsculas con guiones, p. ej.
`manzana`, `casa-campo`, `robot-explorador`). Si no tienes esa herramienta, entregas el HTML
completo en un solo bloque de código y dices: «guárdalo como `nombre.html` y ábrelo con doble
clic». Después resumes en 3-4 líneas qué piezas tiene el modelo y qué se puede iterar.

## Reglas técnicas
- Un solo archivo. Three.js **0.160.0** por `importmap` desde jsdelivr (versión fija, ver
  plantilla). Nada de texturas ni imágenes externas: todo con color, `roughness`, `metalness` y
  `emissive` de `MeshStandardMaterial`.
- Unidades en **metros**, eje **Y hacia arriba**, el modelo **apoyado en y=0** y centrado en
  x=0, z=0. Una fruta mide ~0.08 m, un perrito ~0.5 m, un robot ~1.6 m, una casa ~6 m.
- Cada pieza es un `Mesh` con `name` en español (`cuerpo`, `rabito`, `ojo`, `techo`). Todo
  cuelga de un `Group` raíz cuyo `name` es el del objeto. Así el GLB llega a Blender con el
  árbol de piezas legible.
- Sombras activadas (`castShadow`/`receiveShadow`), piso que las recibe, encuadre automático
  de cámara según el tamaño del modelo (lo hace la plantilla, no lo toques).
- Geometrías suaves: esferas con 32×24 segmentos, cilindros con 24, revoluciones con 64. Nada
  de low-poly salvo que lo pidan.
- `<meta name="viewport">`, `<title>` corto, colores en variables de `:root` con versión oscura
  en `prefers-color-scheme: dark`, controles con `<button>` y `<label>`.

## Método (en este orden)
1. **Referencia mental.** Antes de escribir, describe en dos líneas la silueta y las
   proporciones reales del objeto (alto/ancho/profundo) y el estilo: realista, cartoon o
   low-poly. Si el pedido no dice el estilo, usa realista-suave (formas limpias, colores
   creíbles).
2. **Bloque de masas.** Descompón el objeto en 4-8 primitivas grandes con medidas en metros.
   Primero el volumen principal, luego los apéndices. Comprueba que las proporciones sumen bien
   (p. ej. el robot: piernas 0.5 + torso 0.6 + cabeza 0.35).
3. **Técnica por tipo de forma:**
   - Formas de revolución (frutas, jarrones, botellas, tazas): `LatheGeometry` con un perfil
     de 8-12 puntos `(radio, altura)` de abajo hacia arriba, suavizado con `SplineCurve`.
     Es la forma más fiel y barata.
   - Cuerpos orgánicos (animales, personajes): esferas y `CapsuleGeometry` escaladas con
     `scale` para alargar o aplanar.
   - Arquitectura y máquinas: `BoxGeometry`, `CylinderGeometry`, `ConeGeometry` y
     `ExtrudeGeometry` sobre una `Shape` (tejados, perfiles).
4. **Simetría.** Lo que va en pares (ojos, orejas, brazos, ventanas) se construye con un bucle
   `for (const s of [-1, 1])` y `x = s * distancia`.
5. **Jerarquía con pivotes.** Las partes que podrían moverse (brazo, cola, puerta) van en un
   `Group` cuyo origen está en la articulación. Si aporta, añade una animación sutil en
   `g.userData.tick = t => {...}` (la plantilla la llama cada cuadro).
6. **Materiales.** 2-4 materiales por objeto, con nombre. Piel de fruta `roughness 0.35`,
   pelo `0.95`, metal `metalness 0.7, roughness 0.35`, plástico `0.5`, luces con `emissive`.
7. **Detalles al final:** rabito, hoja, chimenea, antena, collar. Son los que hacen que el
   objeto se reconozca al instante.

## Plantilla (cópiala entera; solo cambias `<title>`, el texto de `#titulo` y `build()`)

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manzana 3D</title>
<style>
  :root { --bg:#eef1f5; --fg:#1d2430; --panel:#ffffffcc; --accent:#2f6fed; }
  @media (prefers-color-scheme: dark) { :root { --bg:#14181f; --fg:#e8ecf2; --panel:#1f2530cc; --accent:#6ea0ff; } }
  html, body { margin:0; height:100%; background:var(--bg); color:var(--fg); font:14px system-ui, sans-serif; }
  canvas { display:block; }
  #ui { position:fixed; top:12px; left:12px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;
        padding:10px 12px; border-radius:10px; background:var(--panel); backdrop-filter:blur(6px); }
  button { font:inherit; padding:6px 10px; border:1px solid #0003; border-radius:8px; background:var(--accent); color:#fff; cursor:pointer; }
  button:focus-visible, input:focus-visible { outline:2px solid var(--fg); outline-offset:2px; }
</style>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
</head>
<body>
<div id="ui">
  <strong id="titulo">Manzana</strong>
  <label><input type="checkbox" id="girar" checked> Girar</label>
  <button id="glb" type="button">Exportar GLB</button>
  <button id="stl" type="button">Exportar STL</button>
</div>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

// ---------- Escena, cámara, luces ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94a6, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

// ---------- Ayudantes ----------
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
const mesh = (geo, m, name) => { const x = new THREE.Mesh(geo, m); x.castShadow = x.receiveShadow = true; x.name = name; return x; };
const put = (parent, obj, [x, y, z] = [0, 0, 0]) => { obj.position.set(x, y, z); parent.add(obj); return obj; };

// ---------- MODELO ----------
function build() {
  const g = new THREE.Group(); g.name = 'objeto';
  // ...piezas...
  return g;
}

const model = build();
scene.add(model);

// ---------- Encuadre, piso y sombras según el tamaño ----------
const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3());
model.position.y -= box.min.y;                       // apoyado en el piso
const r = Math.max(size.x, size.y, size.z);
camera.position.set(r * 1.4, size.y * 0.9, r * 2.1);
controls.target.set(0, size.y * 0.45, 0);
sun.position.set(r * 1.5, r * 3, r * 2);
Object.assign(sun.shadow.camera, { left: -r * 2, right: r * 2, top: r * 2, bottom: -r * 2, near: 0.01, far: r * 10 });
sun.shadow.camera.updateProjectionMatrix();
const floor = mesh(new THREE.CircleGeometry(r * 2.5, 64), mat(0xd9dee6, { roughness: 1 }), 'piso');
floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
scene.add(floor);

// ---------- Exportar ----------
const descargar = (data, nombre, tipo) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: tipo })); a.download = nombre; a.click();
};
document.getElementById('glb').onclick = () =>
  new GLTFExporter().parse(model, r => descargar(r, model.name + '.glb', 'model/gltf-binary'), e => alert(e), { binary: true });
document.getElementById('stl').onclick = () =>
  descargar(new STLExporter().parse(model, { binary: true }), model.name + '.stl', 'model/stl');

// ---------- Bucle ----------
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const girar = document.getElementById('girar');
renderer.setAnimationLoop(t => {
  if (girar.checked) model.rotation.y = t / 4000;
  model.userData.tick?.(t);
  controls.update();
  renderer.render(scene, camera);
});
</script>
</body>
</html>
```

## Recetas base (sustituyen `build()` de la plantilla; adáptalas al pedido)

### Manzana (revolución, ~0.08 m)
```js
function build() {
  const g = new THREE.Group(); g.name = 'manzana';
  // Perfil (radio, altura) de abajo arriba: hoyuelo inferior, panza, hombro y hoyuelo del rabito
  const perfil = [
    [0.000, -0.034], [0.012, -0.038], [0.026, -0.036], [0.036, -0.028], [0.041, -0.012],
    [0.041,  0.006], [0.037,  0.022], [0.028,  0.033], [0.016,  0.038], [0.008, 0.034], [0.000, 0.028],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const suave = new THREE.SplineCurve(perfil).getPoints(48);   // curva suave entre los puntos
  put(g, mesh(new THREE.LatheGeometry(suave, 64), mat(0xd3302a, { roughness: 0.35 }), 'cuerpo'));
  const rabito = put(g, mesh(new THREE.CylinderGeometry(0.0015, 0.0025, 0.026, 12), mat(0x5a3a1e, { roughness: 0.9 }), 'rabito'), [0.002, 0.040, 0]);
  rabito.rotation.z = -0.25;
  const hoja = put(g, mesh(new THREE.SphereGeometry(0.012, 24, 12), mat(0x3f8f3a, { roughness: 0.7 }), 'hoja'), [0.013, 0.046, 0]);
  hoja.scale.set(1, 0.15, 0.5); hoja.rotation.z = 0.5;
  return g;
}
```

### Pera (revolución, ~0.12 m de alto)
```js
function build() {
  const g = new THREE.Group(); g.name = 'pera';
  // Base ancha y cuello que se estrecha hacia el rabito
  const perfil = [
    [0.000, -0.045], [0.014, -0.048], [0.030, -0.042], [0.040, -0.028], [0.042, -0.010],
    [0.036,  0.008], [0.026,  0.028], [0.019,  0.046], [0.015, 0.060], [0.010, 0.070], [0.000, 0.072],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const suave = new THREE.SplineCurve(perfil).getPoints(48);   // curva suave entre los puntos
  put(g, mesh(new THREE.LatheGeometry(suave, 64), mat(0xb9c43a, { roughness: 0.5 }), 'cuerpo'));
  const rabito = put(g, mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.03, 12), mat(0x5a3a1e, { roughness: 0.9 }), 'rabito'), [0.003, 0.084, 0]);
  rabito.rotation.z = -0.2;
  const hoja = put(g, mesh(new THREE.SphereGeometry(0.012, 24, 12), mat(0x4f9a3a, { roughness: 0.7 }), 'hoja'), [0.014, 0.080, 0]);
  hoja.scale.set(1, 0.15, 0.5); hoja.rotation.z = 0.4;
  return g;
}
```

### Casa (cajas y tejado extruido, ~6 × 5 m)
```js
function build() {
  const g = new THREE.Group(); g.name = 'casa';
  const W = 6, D = 5, H = 3, techoH = 2.2, alero = 0.4;
  const pared = mat(0xf2e6cf, { roughness: 0.9 });
  const madera = mat(0x7a4a24, { roughness: 0.8 });
  const teja = mat(0xa83d2a, { roughness: 0.85 });
  const vidrio = mat(0x8ec5e6, { roughness: 0.1, metalness: 0.2 });
  const blanco = mat(0xffffff, { roughness: 0.7 });
  put(g, mesh(new THREE.BoxGeometry(W, H, D), pared, 'paredes'), [0, H / 2, 0]);
  // Tejado a dos aguas: triángulo extruido a lo largo de Z
  const tri = new THREE.Shape([new THREE.Vector2(-W / 2 - alero, 0), new THREE.Vector2(W / 2 + alero, 0), new THREE.Vector2(0, techoH)]);
  const techo = put(g, mesh(new THREE.ExtrudeGeometry(tri, { depth: D + 2 * alero, bevelEnabled: false }), teja, 'techo'), [0, H, -(D / 2 + alero)]);
  put(g, mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7), mat(0x8b6a4a, { roughness: 0.9 }), 'chimenea'), [W * 0.3, H + techoH * 0.55 + 0.5, -D * 0.2]);
  // Puerta con marco y escalón
  put(g, mesh(new THREE.BoxGeometry(1.2, 2.3, 0.1), blanco, 'marco_puerta'), [0, 1.15, D / 2 + 0.03]);
  put(g, mesh(new THREE.BoxGeometry(1.0, 2.1, 0.1), madera, 'puerta'), [0, 1.05, D / 2 + 0.06]);
  put(g, mesh(new THREE.SphereGeometry(0.05, 16, 12), mat(0xd4af37, { metalness: 0.9, roughness: 0.3 }), 'pomo'), [0.35, 1.05, D / 2 + 0.12]);
  put(g, mesh(new THREE.BoxGeometry(1.8, 0.18, 0.8), mat(0xb8b8b8, { roughness: 1 }), 'escalon'), [0, 0.09, D / 2 + 0.4]);
  // Ventanas simétricas al frente y a los lados
  const ventana = (parent, pos, rotY = 0) => {
    const v = new THREE.Group(); v.name = 'ventana'; v.position.set(...pos); v.rotation.y = rotY;
    put(v, mesh(new THREE.BoxGeometry(1.2, 1.2, 0.1), blanco, 'marco'), [0, 0, 0.03]);
    put(v, mesh(new THREE.BoxGeometry(1.0, 1.0, 0.1), vidrio, 'vidrio'), [0, 0, 0.06]);
    put(v, mesh(new THREE.BoxGeometry(0.06, 1.0, 0.12), blanco, 'cruz_v'), [0, 0, 0.07]);
    put(v, mesh(new THREE.BoxGeometry(1.0, 0.06, 0.12), blanco, 'cruz_h'), [0, 0, 0.07]);
    parent.add(v); return v;
  };
  for (const s of [-1, 1]) {
    ventana(g, [s * 1.9, 1.8, D / 2]);
    ventana(g, [s * W / 2, 1.8, 0], s * Math.PI / 2);
  }
  return g;
}
```

### Robot (cajas y cilindros con pivotes, ~1.6 m)
```js
function build() {
  const g = new THREE.Group(); g.name = 'robot';
  const metal = mat(0x9aa4b2, { metalness: 0.7, roughness: 0.35 });
  const acento = mat(0xe8632b, { roughness: 0.5 });
  const luz = mat(0x3ad1ff, { emissive: 0x1aa0ff, emissiveIntensity: 0.9 });
  const piernaH = 0.5, torsoH = 0.6, cabeza = 0.34;
  for (const s of [-1, 1]) {
    put(g, mesh(new THREE.CylinderGeometry(0.08, 0.09, piernaH, 24), metal, 'pierna'), [s * 0.14, piernaH / 2, 0]);
    put(g, mesh(new THREE.BoxGeometry(0.2, 0.08, 0.3), acento, 'pie'), [s * 0.14, 0.04, 0.04]);
  }
  put(g, mesh(new THREE.BoxGeometry(0.5, torsoH, 0.3), metal, 'torso'), [0, piernaH + torsoH / 2, 0]);
  put(g, mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), acento, 'panel'), [0, piernaH + torsoH * 0.55, 0.16]);
  // Brazos: Group con el pivote en el hombro, para animarlos
  for (const s of [-1, 1]) {
    const hombro = new THREE.Group(); hombro.name = s < 0 ? 'brazo_izq' : 'brazo_der';
    hombro.position.set(s * 0.31, piernaH + torsoH - 0.08, 0);
    put(hombro, mesh(new THREE.SphereGeometry(0.07, 24, 16), acento, 'hombro'));
    put(hombro, mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 24), metal, 'brazo'), [0, -0.24, 0]);
    put(hombro, mesh(new THREE.SphereGeometry(0.07, 24, 16), metal, 'mano'), [0, -0.48, 0]);
    g.add(hombro);
  }
  put(g, mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 24), acento, 'cuello'), [0, piernaH + torsoH + 0.04, 0]);
  const cy = piernaH + torsoH + 0.08 + cabeza * 0.425;
  put(g, mesh(new THREE.BoxGeometry(cabeza, cabeza * 0.85, cabeza * 0.9), metal, 'cabeza'), [0, cy, 0]);
  for (const s of [-1, 1]) put(g, mesh(new THREE.SphereGeometry(0.04, 24, 16), luz, 'ojo'), [s * 0.08, cy + 0.03, cabeza * 0.45]);
  put(g, mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), luz, 'boca'), [0, cy - 0.07, cabeza * 0.45]);
  put(g, mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8), metal, 'antena'), [0, cy + cabeza * 0.425 + 0.06, 0]);
  put(g, mesh(new THREE.SphereGeometry(0.03, 16, 12), acento, 'antena_punta'), [0, cy + cabeza * 0.425 + 0.13, 0]);
  const brazos = [g.getObjectByName('brazo_izq'), g.getObjectByName('brazo_der')];
  g.userData.tick = t => brazos.forEach((b, i) => { b.rotation.x = Math.sin(t / 600) * 0.4 * (i ? 1 : -1); });
  return g;
}
```

### Perrito (esferas y cápsulas, ~0.5 m)
```js
function build() {
  const g = new THREE.Group(); g.name = 'perrito';
  const pelo = mat(0xc89a5b, { roughness: 0.95 });
  const claro = mat(0xe9d3b0, { roughness: 0.95 });
  const oscuro = mat(0x8c6236, { roughness: 0.95 });
  const negro = mat(0x222222, { roughness: 0.5 });
  // Cuerpo: cápsula tumbada a lo largo de X (la cápsula nace vertical, se gira 90°)
  const cuerpo = put(g, mesh(new THREE.CapsuleGeometry(0.10, 0.30, 8, 24), pelo, 'cuerpo'), [0, 0.26, 0]);
  cuerpo.rotation.z = Math.PI / 2;
  for (const [x, z] of [[-0.13, -0.07], [-0.13, 0.07], [0.13, -0.07], [0.13, 0.07]]) {
    put(g, mesh(new THREE.CapsuleGeometry(0.035, 0.14, 6, 16), pelo, 'pata'), [x, 0.11, z]);
    put(g, mesh(new THREE.SphereGeometry(0.04, 16, 12), claro, 'pezuna'), [x, 0.04, z]);
  }
  put(g, mesh(new THREE.SphereGeometry(0.11, 32, 24), pelo, 'cabeza'), [0.24, 0.38, 0]);
  put(g, mesh(new THREE.SphereGeometry(0.06, 24, 16), claro, 'hocico'), [0.33, 0.34, 0]);
  put(g, mesh(new THREE.SphereGeometry(0.022, 16, 12), negro, 'nariz'), [0.385, 0.355, 0]);
  for (const s of [-1, 1]) {
    put(g, mesh(new THREE.SphereGeometry(0.02, 16, 12), negro, 'ojo'), [0.31, 0.42, s * 0.045]);
    const oreja = put(g, mesh(new THREE.SphereGeometry(0.05, 24, 16), oscuro, 'oreja'), [0.22, 0.37, s * 0.11]);
    oreja.scale.set(0.6, 1.6, 0.4);                  // caída, pegada a la cabeza
  }
  const collar = put(g, mesh(new THREE.TorusGeometry(0.085, 0.016, 12, 32), mat(0xd23c3c, { roughness: 0.5 }), 'collar'), [0.16, 0.33, 0]);
  collar.rotation.y = Math.PI / 2;
  const cola = put(g, mesh(new THREE.CapsuleGeometry(0.02, 0.12, 6, 12), pelo, 'cola'), [-0.22, 0.34, 0]);
  cola.rotation.z = 0.8;                             // hacia atrás y arriba
  g.userData.tick = t => { cola.rotation.x = Math.sin(t / 150) * 0.35; };
  return g;
}
```

## Otros objetos
Aplica el mismo método: silueta y medidas → bloque de masas → técnica según la forma →
simetría → pivotes → materiales → detalles. Ejemplos: taza (lathe + torus para el asa),
árbol (cilindro + 2-3 esferas o conos), coche (caja baja + caja cabina + 4 cilindros girados en Z),
gato (como el perrito, orejas con `ConeGeometry` y cola más larga y curvada con `TubeGeometry`
sobre una `CatmullRomCurve3`).

## Proceso
1. Si falta algo que cambia el resultado (estilo, tamaño real, para qué se usará: web, Blender
   o impresión), pregunta UNA vez; si no, decide y dilo en una línea.
2. Escribe el HTML completo con la plantilla y guárdalo con `save_prototype`.
3. Resume: piezas, medidas, y 2-3 mejoras posibles (más detalle, otro color, animación,
   variante). Para iterar, vuelves a guardar con el mismo nombre.
