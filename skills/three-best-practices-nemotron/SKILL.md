---
name: three-best-practices-nemotron
description: Three.js performance and best-practices guidelines tuned for NVIDIA Nemotron 3 models (Nano, Super, Ultra). Use when writing, reviewing, or optimizing Three.js code. Triggers on 3D scenes, WebGL/WebGPU rendering, geometries, materials, textures, lighting, shaders, TSL, GLTF loading, WebXR, or mobile 3D performance.
license: MIT
metadata:
  author: three-agent-skills (upstream) · jmd (Nemotron fork)
  version: "2.1.0-nemotron.1"
  three-version: "0.182.0+"
  upstream: https://github.com/emalorenzo/three-agent-skills
  target-models: nvidia/nemotron-3-nano, nvidia/nemotron-3-super, nvidia/nemotron-3-ultra
---

# Three.js Best Practices — Nemotron edition

Fork of `three-best-practices` (MIT, emalorenzo/three-agent-skills) rewritten for open
models served through an OpenAI-compatible gateway (jmd → OpenRouter / OpenCode Zen).
Same rules, same rule IDs. Different packaging:

- **Self-contained.** Everything needed to act is in this file. Free endpoints are
  rate-limited per request, so do not spend requests reading `rules/*.md` unless §9 says so.
- **Explicit.** Rules are imperative (MUST / NEVER). Nothing is left to inference.
- **Front-loaded.** Operating rules and the critical rules come first; the long index comes last.
- **Stale-prior override.** §2 lists APIs that older training data still emits and that
  no longer exist in Three.js r182. Never emit them.

## 1. Operating rules (read first, apply always)

1. Target Three.js **r182+** with ES modules. Default to `WebGLRenderer`. Use `WebGPURenderer`
   only when the user asks for WebGPU, TSL, or compute shaders.
2. Before writing or approving code, run the **checklist in §6** silently. Do not print the
   checklist; print only findings.
3. **Output contract**
   - Writing code: the code block first, then at most 5 bullets explaining non-obvious choices.
     No preamble, no restating the request.
   - Reviewing code: the format in §7. Every finding cites one rule ID from this file.
   - Answering a question: the answer in at most 10 lines, then one code block if it helps.
4. **Cite rule IDs** (`memory-dispose-geometry`, `render-pixel-ratio`, …) exactly as written
   here. Do not invent IDs.
5. **Do not read other files by default.** This file is complete for 95% of tasks. Read a
   `rules/*.md` file only in the cases listed in §9, and read all needed files in one turn.
6. **Do not ask questions** unless the answer changes the code materially. State the assumption
   in one line and continue. Default assumptions: desktop + mobile targets, static scene unless
   animation is requested, assets served from `/`, no bundler constraints.
7. **Keep answers short.** Long explanations cost tokens and context on free endpoints.
   Prefer one correct example over three variants.
8. **Never emit a deprecated API from §2.** If the user's code contains one, flag it as a
   finding with the replacement.
9. When unsure whether an API exists in r182, use the form shown in §4 templates rather than
   recalling from memory.

## 2. Deprecated → modern API (stale-prior override)

NEVER emit the left column. ALWAYS use the right column.

| Deprecated / removed | Use instead (r182) |
|---|---|
| `THREE.Geometry`, `Face3` | `BufferGeometry` + attributes |
| `<script src=".../three.min.js">`, `examples/js/*` | Import map + `three` / `three/addons/*` (§4.1) |
| `import ... from 'three/examples/jsm/...'` in browsers without bundler | `three/addons/...` via import map |
| `renderer.outputEncoding = THREE.sRGBEncoding` | `renderer.outputColorSpace = THREE.SRGBColorSpace` (default) |
| `texture.encoding = THREE.sRGBEncoding` | `texture.colorSpace = THREE.SRGBColorSpace` |
| `THREE.LinearEncoding` | `THREE.LinearSRGBColorSpace` or `THREE.NoColorSpace` |
| `renderer.physicallyCorrectLights`, `renderer.useLegacyLights` | Removed. Lights are physically correct by default |
| `renderer.gammaOutput`, `renderer.gammaFactor` | Removed. Use color spaces + `toneMapping` |
| `WebGLMultisampleRenderTarget` | `new WebGLRenderTarget(w, h, { samples: 4 })` |
| `BufferGeometryUtils.mergeBufferGeometries` | `BufferGeometryUtils.mergeGeometries` |
| `Matrix4.getInverse(m)` | `m.clone().invert()` |
| `THREE.Math.*` | `THREE.MathUtils.*` |
| `THREE.ImageUtils.loadTexture` | `new THREE.TextureLoader().load` |
| `JSONLoader`, `ObjectLoader` for models | `GLTFLoader` (+ DRACO / Meshopt / KTX2) |
| `requestAnimationFrame` loop written by hand | `renderer.setAnimationLoop(fn)` |
| `three/examples/jsm/nodes/*`, `three/nodes` | `three/tsl` (nodes) and `three/webgpu` (renderer, node materials) |
| `new THREE.WebGPURenderer()` from `three` | `import { WebGPURenderer } from 'three/webgpu'` then `await renderer.init()` |
| `Mesh.material.vertexColors = THREE.VertexColors` | `material.vertexColors = true` |
| `TextGeometry` from `three` | `three/addons/geometries/TextGeometry.js` |
| `scene.remove(obj)` alone as cleanup | `scene.remove(obj)` + dispose geometry, material, textures (§4.2) |

## 3. Hard rules (CRITICAL). Violations are always a finding.

### 3.1 Memory (`memory-*`)
- `memory-dispose-geometry` MUST call `geometry.dispose()` when removing a mesh.
- `memory-dispose-material` MUST call `material.dispose()` and dispose every texture it holds.
- `memory-dispose-render-targets` MUST dispose `WebGLRenderTarget` and `EffectComposer` passes.
- `memory-dispose-recursive` MUST use a recursive disposer for hierarchies (§4.2).
- `memory-renderer-dispose` MUST call `renderer.dispose()` when the view is destroyed (SPA routes, React unmount).
- `memory-reuse-objects` SHOULD share one geometry/material across identical meshes.

### 3.2 Render loop (`render-*`)
- `render-single-raf` MUST have exactly one animation loop: `renderer.setAnimationLoop`.
- `render-conditional` SHOULD render on demand for static scenes (`controls.addEventListener('change', render)`).
- `render-delta-time` MUST scale animation by delta time (`clock.getDelta()`), never per frame.
- `render-avoid-allocations` NEVER `new Vector3()/Color()/Matrix4()` inside the loop. Allocate once, reuse.
- `render-pixel-ratio` MUST clamp: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- `render-update-matrix-manual` SHOULD set `matrixAutoUpdate = false` + `updateMatrix()` on static objects.
- `render-frustum-culling` NEVER disable `frustumCulled` globally.

### 3.3 Draw calls (`drawcall-*`, `geometry-*`)
- `draw-call-optimization` target < 100 draw calls/frame. Check `renderer.info.render.calls`.
- `geometry-instanced-mesh` MUST use `InstancedMesh` for ≥ 50 identical objects.
- `geometry-batched-mesh` SHOULD use `BatchedMesh` for varied geometries sharing a material.
- `geometry-merge-static` SHOULD merge static geometry with `mergeGeometries`.
- `geometry-buffer-geometry` MUST use `BufferGeometry` with indexed attributes.

### 3.4 Materials & textures (`material-*`, `asset-*`)
- `material-reuse` MUST reuse materials; never create one per mesh in a loop.
- `material-simplest-sufficient` use `MeshBasicMaterial` → `Lambert` → `Standard` → `Physical`, cheapest that works.
- `material-texture-size-power-of-two` textures ≤ 2048 px, power of two, mipmaps on.
- `material-texture-compression` SHOULD ship KTX2 (UASTC for quality, ETC1S for size).
- `material-avoid-transparency` minimize `transparent: true`; prefer `alphaTest`.
- `asset-draco` / `asset-meshopt` SHOULD compress GLTF geometry (90%+ smaller).

### 3.5 Lighting & shadows (`lighting-*`)
- `lighting-limit-lights` ≤ 3 real-time lights. Prefer `Environment` / IBL for ambient.
- `lighting-shadow-selective` only `castShadow`/`receiveShadow` where visible. `PointLight` shadows cost 6 passes.
- `lighting-shadow-map-size` 1024 default, 2048 max on mobile, tight `shadow.camera` bounds.
- `lighting-shadow-auto-update` static scenes: `renderer.shadowMap.autoUpdate = false; needsUpdate = true` once.
- `lighting-bake-static` bake lightmaps / use `lighting-fake-shadows` (gradient plane) when possible.

### 3.6 Mobile (`mobile-*`, `shader-*`)
- `mobile-optimization` pixel ratio ≤ 1.5, no post-processing by default, no `PointLight` shadows.
- `shader-precision` `precision mediump float` in custom GLSL for mobile.
- `shader-avoid-branching` replace `if` with `mix` / `step` / `smoothstep`.
- `shader-avoid-discard` prefer `alphaTest`.

### 3.7 Production (`error-*`, `loading-*`, `vitals-*`)
- `error-handling-recovery` MUST handle `webglcontextlost` / `webglcontextrestored`.
- `loading-gltf-preferred` MUST use GLTF/GLB; configure DRACO + KTX2 + Meshopt once on the loader (§4.4).
- `loading-progress-feedback` SHOULD use `LoadingManager` for progress.
- `vitals-lazy-load` SHOULD lazy-init the canvas with `IntersectionObserver` when below the fold.
- `camera-near-far` MUST set tight `near`/`far` (e.g. 0.1 / 100), never 0.001 / 100000.
- `camera-resize-handler` MUST handle resize: update aspect, `updateProjectionMatrix()`, `setSize`.

## 4. Canonical templates (copy these forms)

### 4.1 Modern setup (`setup-use-import-maps`, `setup-animation-loop`, `setup-basic-scene-template`)

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.js"
} }
</script>
```

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 2, 5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  controls.update();
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
```

### 4.2 Disposal (`memory-dispose-recursive`)

```javascript
function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
      m.dispose();
    }
  });
  root.removeFromParent();
}
```

### 4.3 Instancing (`geometry-instanced-mesh`, `render-avoid-allocations`)

```javascript
const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
const dummy = new THREE.Object3D(); // allocated once
for (let i = 0; i < COUNT; i++) {
  dummy.position.set(/* ... */);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;
scene.add(mesh);
```

### 4.4 GLTF with DRACO / KTX2 / Meshopt (`gltf-loading-optimization`)

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
const ktx2 = new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/libs/basis/').detectSupport(renderer);
const loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);

const { scene: model } = await loader.loadAsync('/model.glb');
scene.add(model);
```

### 4.5 Render on demand (`render-conditional`)

```javascript
let needsRender = true;
const invalidate = () => { needsRender = true; };
controls.addEventListener('change', invalidate);
renderer.setAnimationLoop(() => {
  if (!needsRender) return;
  needsRender = false;
  renderer.render(scene, camera);
});
```

### 4.6 TSL + WebGPU (`tsl-why-use`, `webgpu-renderer`)

```javascript
import { WebGPURenderer, MeshStandardNodeMaterial } from 'three/webgpu';
import { texture, uv, color, time, sin } from 'three/tsl';

const renderer = new WebGPURenderer({ antialias: true });
await renderer.init();                         // required before first render
const material = new MeshStandardNodeMaterial();
material.colorNode = texture(map, uv()).mul(color(0xff0000).mul(sin(time).mul(0.5).add(0.5)));
```

Use TSL instead of `onBeforeCompile` for shader modifications. TSL compiles to GLSL on WebGL
and WGSL on WebGPU, so it runs on both renderers.

### 4.7 Mobile detection (`mobile-optimization`)

```javascript
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.shadowMap.enabled = !isMobile;
```

## 5. Rule categories by priority (reference index)

Use the prefix to classify a finding. Higher priority wins when two rules conflict.

| Priority | Category | Impact | Prefix |
|---|---|---|---|
| 0 | Modern Setup & Imports | FUNDAMENTAL | `setup-` |
| 1 | Memory Management & Dispose | CRITICAL | `memory-` |
| 2 | Render Loop | CRITICAL | `render-` |
| 3 | Draw Calls | CRITICAL | `draw-call-`, `geometry-instanced-`, `geometry-batched-` |
| 4 | Geometry & Buffers | HIGH | `geometry-` |
| 5 | Materials & Textures | HIGH | `material-` |
| 6 | Asset Compression | HIGH | `asset-` |
| 7 | Lighting & Shadows | MEDIUM-HIGH | `lighting-` |
| 8 | Scene Graph | MEDIUM | `scene-`, `object-pooling` |
| 9 | Shaders (GLSL) | MEDIUM | `shader-` |
| 10 | TSL | MEDIUM | `tsl-` |
| 11 | WebGPU Renderer | MEDIUM | `webgpu-` |
| 12 | Loading & Assets | MEDIUM | `loading-`, `gltf-` |
| 13 | Core Web Vitals | MEDIUM-HIGH | `vitals-`, `core-web-vitals` |
| 14 | Camera & Controls | LOW-MEDIUM | `camera-` |
| 15 | Animation | MEDIUM | `animation-` |
| 16 | Physics | MEDIUM | `physics-` |
| 17 | WebXR | MEDIUM | `webxr-` |
| 18 | Audio | LOW-MEDIUM | `audio-` |
| 19 | Post-Processing | MEDIUM | `postpro-`, `postprocessing-` |
| 20 | Mobile | HIGH | `mobile-`, `raycasting-` |
| 21 | Production | HIGH | `error-`, `migration-` |
| 22 | Debug & DevTools | LOW | `debug-` |

Full rule IDs not already listed in §3 (one line each, for citation):

- **setup**: `setup-use-import-maps`, `setup-choose-renderer`, `setup-animation-loop`, `setup-basic-scene-template`
- **memory**: `memory-dispose-textures`, `memory-dispose-on-unmount`
- **render**: `render-cache-computations`, `render-antialias-wisely`
- **geometry**: `geometry-lod`, `geometry-index-buffer`, `geometry-vertex-count`, `geometry-attributes-typed`, `geometry-interleaved`
- **material**: `material-texture-mipmaps`, `material-texture-anisotropy`, `material-texture-atlas`, `material-onbeforecompile`
- **asset**: `asset-compression`, `asset-ktx2`, `asset-lod`
- **lighting**: `lighting-shadows-advanced`, `lighting-shadow-camera-tight`, `lighting-shadow-cascade`, `lighting-probe`, `lighting-environment`
- **scene**: `scene-group-objects`, `scene-layers`, `scene-visible-toggle`, `scene-flatten-static`, `scene-name-objects`, `object-pooling`
- **shader**: `shader-mobile`, `shader-precompute-cpu`, `shader-texture-lod`, `shader-uniform-arrays`, `shader-varying-interpolation`, `shader-pack-data`, `shader-chunk-injection`
- **tsl**: `tsl-why-use`, `tsl-setup-webgpu`, `tsl-complete-reference`, `tsl-material-slots`, `tsl-node-materials`, `tsl-basic-operations`, `tsl-functions`, `tsl-conditionals`, `tsl-textures`, `tsl-noise`, `tsl-post-processing`, `tsl-compute-shaders`, `tsl-glsl-to-tsl`
- **webgpu**: `webgpu-renderer`, `webgpu-render-async`, `webgpu-feature-detection`, `webgpu-instanced-array`, `webgpu-storage-textures`, `webgpu-workgroup-memory`, `webgpu-indirect-draws`
- **loading**: `loading-draco-compression`, `gltf-loading-optimization`, `loading-async-await`, `loading-lazy`, `loading-cache-assets`, `loading-dispose-unused`
- **vitals**: `core-web-vitals`, `vitals-code-split`, `vitals-preload`, `vitals-progressive-loading`, `vitals-placeholders`, `vitals-web-workers`, `vitals-streaming`
- **camera**: `camera-fov`, `camera-controls-damping`, `camera-orbit-limits`
- **animation / physics / xr / audio**: `animation-system`, `physics-integration`, `physics-compute-shaders`, `webxr-setup`, `audio-spatial`
- **postpro**: `postprocessing-optimization`, `postpro-renderer-config`, `postpro-merge-effects`, `postpro-selective-bloom`, `postpro-resolution-scaling`, `postpro-webgpu-native`
- **mobile**: `raycasting-optimization` (three-mesh-bvh, layers, GPU picking)
- **production**: `migration-checklist`
- **debug**: `debug-devtools`, `debug-stats-gl`, `debug-lil-gui`, `debug-spector`, `debug-renderer-info`, `debug-three-mesh-bvh`, `debug-context-lost`, `debug-animation-loop-profiling`, `debug-conditional`

## 6. Pre-answer checklist (run silently)

Before emitting code or a verdict, confirm each line. Fix the code; do not print this list.

1. No API from §2 appears in the output.
2. One animation loop, via `setAnimationLoop`, using delta time.
3. No allocation (`new THREE.*`) inside the loop.
4. Pixel ratio clamped to 2 (1.5 on mobile).
5. Every created geometry / material / texture / render target has a disposal path.
6. Repeated objects use `InstancedMesh` or merged geometry.
7. ≤ 3 lights; shadows only where needed; shadow camera bounds tight.
8. Camera `near`/`far` tight; resize handler present.
9. Models are GLTF/GLB with compression configured.
10. Imports resolve under the import map in §4.1 (`three`, `three/addons/`, `three/tsl`, `three/webgpu`).

## 7. Review output format (mandatory when asked to review or score)

```
Score: NN/100

| # | Rule | Location | Severity | Fix |
|---|------|----------|----------|-----|
| 1 | memory-dispose-geometry | src/scene.js:42 | CRITICAL | call geometry.dispose() in removeMesh() |
| 2 | render-pixel-ratio | src/main.js:10 | HIGH | setPixelRatio(Math.min(devicePixelRatio, 2)) |

Good: <one line, what is already right>
Top fix: <the single change with the biggest impact, with a code block ≤ 15 lines>
```

Scoring rubric: start at 100. Subtract 15 per CRITICAL (priority 0–3), 8 per HIGH
(priority 4–6, 20, 21), 4 per MEDIUM, 1 per LOW. Minimum 0. List at most 10 findings,
highest severity first. If no findings: `Score: 100/100` and one line of confirmation.

## 8. Nemotron runtime notes (for the operator, not the model's output)

These apply when the agent runs on Nemotron 3 through jmd or any OpenAI-compatible endpoint.

- **Sampling.** NVIDIA's model cards recommend `temperature: 1.0`, `top_p: 0.95` for Nemotron 3
  Super and Ultra in every mode. For Nemotron 3 Nano in thinking mode use `temperature: 0.6`,
  `top_p: 0.95`. Do not reuse the `temperature: 0.2` that works for other coding models: it
  makes Nemotron repetitive.
- **Reasoning toggle.** Nemotron 3 reasons by default. The chat template reads `/think` or
  `/no_think` from the **system** message, or `chat_template_kwargs: {enable_thinking: false}`
  (vLLM / SGLang). Through OpenRouter send `"reasoning": {"enabled": true|false}`. Use
  reasoning ON for reviews and architecture, OFF for one-line fixes and lookups.
- **Context.** Hosted free endpoints expose 128K–256K tokens, not the 1M of the weights.
  This file is ~1/10 of that budget with the user's code; do not also load `rules/*.md`.
- **Tool calling.** OpenAI `tools` / `tool_choice` are supported (vLLM `qwen3_coder` parser).
  Each file read is one request against the provider quota, so batch reads (rule 5 in §1).
- **Request quota.** OpenRouter's free tier allows ~50 requests/day per key. Short answers
  (rule 7 in §1) and no exploratory reads keep a review inside that budget.

## 9. When to read a `rules/*.md` file (optional deep dive)

Only if the upstream `rules/` directory is installed next to this file and one of these holds.
Read every needed file in a single turn.

| User asks about | Read |
|---|---|
| Full TSL type system, swizzles, `Fn()`, loops | `rules/tsl-complete-reference.md`, `rules/tsl-material-slots.md` |
| GPGPU / particles / compute | `rules/tsl-compute-shaders.md` |
| Bloom / DoF / AO on WebGPU | `rules/tsl-post-processing.md`, `rules/postprocessing-optimization.md` |
| VR / AR / controllers / hit test | `rules/webxr-setup.md` |
| Rapier / Cannon integration | `rules/physics-integration.md` |
| AnimationMixer, blending, morph targets | `rules/animation-system.md` |
| Spatial audio / HRTF | `rules/audio-spatial.md` |
| Breaking changes between versions | `rules/migration-checklist.md` |
| Cascaded shadows, fake shadows | `rules/lighting-shadows-advanced.md` |
| Core Web Vitals for 3D pages | `rules/core-web-vitals.md` |

For everything else, this file is sufficient. Do not read `THREE_BEST_PRACTICES.md`
(1900 lines): it exceeds the useful context budget on free endpoints.

## Sources & Credits

- Upstream skill: [emalorenzo/three-agent-skills](https://github.com/emalorenzo/three-agent-skills) (MIT)
- Three.js `llms` branch guidelines maintained by [mrdoob](https://github.com/mrdoob)
- [100 Three.js Tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) by Utsubo
- Nemotron 3 sampling and reasoning controls: NVIDIA model cards (Nano 30B-A3B, Super 120B-A12B, Ultra 550B-A55B)
