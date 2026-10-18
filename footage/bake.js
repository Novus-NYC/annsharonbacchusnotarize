import * as THREE from "three";
import * as T from "./textures.js";
import { buildStage, makeReflectionEnv } from "/src/stage/build.js";

// Bakes lighting for the live scene's static surfaces and exports every
// texture the site loads. Lighting is accumulated in texture space: each
// surface is rasterised at its UVs with jittered lamp and sky shadows, the
// same way footage/scene.js accumulates frames.

const SAMPLES = 512;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(64, 64);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);

const stage = buildStage({ tex: {}, mode: "bake" });
const { scene, lamp, LAMP, sky } = stage;
// The stamp moves, so its shadow is rendered live, never baked.
stage.stamp.visible = false;
scene.environment = makeReflectionEnv(renderer);
scene.environmentIntensity = 0.55;
scene.updateMatrixWorld(true);
// Lights are culled by camera layers too; the bake camera only sees layer 2.
scene.traverse((o) => { if (o.isLight) o.layers.enable(2); });
// Shadow passes only draw objects the *main* camera can see, so the bake
// camera sees everything; scene meshes write nothing and only cast shadows.
scene.traverse((o) => {
  if (!o.isMesh) return;
  for (const m of [].concat(o.material)) { m.colorWrite = false; m.depthWrite = false; }
});

// Texture-space material: vertices land at their UVs; only up-facing faces
// contribute so bottoms and edges sharing the planar UVs don't overwrite tops.
const bakeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
bakeMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace("void main() {", "varying float vUpY;\nvoid main() {")
    .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n vUpY = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz).y;")
    .replace("#include <project_vertex>", "#include <project_vertex>\n gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);");
  sh.fragmentShader = sh.fragmentShader
    .replace("void main() {", "varying float vUpY;\nvoid main() {\n if (vUpY < 0.3) discard;");
};
const hidden = new THREE.MeshBasicMaterial({ visible: false });

const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const accumMat = new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, weight: { value: 1 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
  fragmentShader: "uniform sampler2D tSrc; uniform float weight; varying vec2 vUv; void main(){ vec4 c = texture2D(tSrc, vUv); gl_FragColor = vec4(c.rgb * weight, c.a * weight); }",
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  depthTest: false, depthWrite: false,
});
const quadScene = new THREE.Scene();
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accumMat));

const cam = new THREE.PerspectiveCamera(40, 1, 1, 400);
cam.position.set(0, 120, 30);
cam.lookAt(0, 0, 0);
cam.layers.set(0);
cam.layers.enable(2);

function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
const srgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function bake([key, mesh, w, h, group]) {
  const proxy = new THREE.Mesh(mesh.geometry, group === undefined ? bakeMat : mesh.material.map((_, i) => (i === group ? bakeMat : hidden)));
  proxy.matrixAutoUpdate = false;
  proxy.matrix.copy(mesh.matrixWorld);
  proxy.layers.set(2);
  proxy.receiveShadow = true;
  scene.add(proxy);

  const rtOpts = { type: THREE.FloatType, colorSpace: THREE.NoColorSpace, depthBuffer: false };
  const sampleRT = new THREE.WebGLRenderTarget(w, h, rtOpts);
  const accumRT = new THREE.WebGLRenderTarget(w, h, rtOpts);
  accumMat.uniforms.tSrc.value = sampleRT.texture;
  renderer.setRenderTarget(accumRT);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  for (let i = 0; i < SAMPLES; i++) {
    const n = i + 1;
    const la = halton(n, 11) * Math.PI * 2, lr = Math.sqrt(halton(n, 13)) * 6;
    lamp.position.set(LAMP.x + Math.cos(la) * lr, LAMP.y, LAMP.z + Math.sin(la) * lr);
    const u1 = halton(n, 17), u2 = halton(n, 19);
    const sr = Math.sqrt(u1), sp = u2 * Math.PI * 2;
    sky.position.copy(sky.target.position).addScaledVector(new THREE.Vector3(sr * Math.cos(sp), Math.sqrt(1 - u1), sr * Math.sin(sp)), 120);

    renderer.setRenderTarget(sampleRT);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, cam);

    accumMat.uniforms.weight.value = 1 / SAMPLES;
    renderer.autoClear = false;
    renderer.setRenderTarget(accumRT);
    renderer.render(quadScene, quadCam);
    renderer.autoClear = true;
  }
  scene.remove(proxy);

  const px = new Float32Array(w * h * 4);
  renderer.readRenderTargetPixels(accumRT, 0, 0, w, h, px);
  sampleRT.dispose(); accumRT.dispose();

  // Dilate covered texels outward so filtering never pulls in empty black.
  const covered = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) covered[i] = px[i * 4 + 3] > 0.5 ? 1 : 0;
  for (let pass = 0; pass < 8; pass++) {
    const next = covered.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (covered[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!covered[j]) continue;
        r += px[j * 4]; g += px[j * 4 + 1]; b += px[j * 4 + 2]; n++;
      }
      if (n) { px[i * 4] = r / n; px[i * 4 + 1] = g / n; px[i * 4 + 2] = b / n; next[i] = 1; }
    }
    covered.set(next);
  }

  // Normalise by a high percentile and store sRGB-encoded for shadow detail.
  const peaks = [];
  for (let i = 0; i < w * h; i += 7) peaks.push(Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]));
  peaks.sort((a, b) => a - b);
  const scale = peaks[Math.floor(peaks.length * 0.999)] * 1.05 || 1;

  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((h - 1 - y) * w + x) * 4, d = (y * w + x) * 4;
    for (let k = 0; k < 3; k++) {
      const val = srgb(Math.min(1, Math.max(0, px[s + k] / scale))) * 255 + (Math.random() - 0.5);
      img.data[d + k] = Math.max(0, Math.min(255, Math.round(val)));
    }
    img.data[d + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: c, scale };
}

function rmCanvas(rough, metal) {
  const w = rough.width, h = rough.height;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const r = rough.getContext("2d").getImageData(0, 0, w, h).data;
  const m = metal.getContext("2d").getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    out.data[i * 4] = 0; out.data[i * 4 + 1] = r[i * 4 + 1]; out.data[i * 4 + 2] = m[i * 4]; out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

function grayFromAlpha(src) {
  const w = src.width, h = src.height;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const d = src.getContext("2d").getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const a = d[i * 4 + 3]; out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = a; out.data[i * 4 + 3] = 255; }
  ctx.putImageData(out, 0, 0);
  return c;
}

function resized(src, w) {
  const h = Math.round((src.height / src.width) * w);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

window.runBake = () => {
  const files = {};
  const lightmapScale = {};
  for (const target of stage.bakeTargets) {
    const { canvas, scale } = bake(target);
    files[target[0]] = canvas.toDataURL("image/png");
    lightmapScale[target[0]] = scale;
  }
  const paper = T.affidavit(190).canvas;
  const cm = T.clothMaps(1024, 1400);
  Object.assign(files, {
    desk: T.walnut(2048, 1024).toDataURL("image/png"),
    padColor: T.leatherColor(2048, 1408).toDataURL("image/png"),
    paper: resized(paper, 3072).toDataURL("image/png"),
    paperSmall: resized(paper, 2048).toDataURL("image/png"),
    under: T.underSheet(70).toDataURL("image/png"),
    clothColor: cm.color.toDataURL("image/png"),
    clothRM: rmCanvas(cm.rough, cm.metal).toDataURL("image/png"),
    pageEdge: T.pageEdge(512, 256).toDataURL("image/png"),
    woodHandle: T.walnut(512, 1024, true).toDataURL("image/png"),
    brushed: T.brushed(1024, 256).toDataURL("image/png"),
    knurl: T.knurl(1024, 64).toDataURL("image/png"),
    sealInk: grayFromAlpha(T.sealInk(1024)).toDataURL("image/png"),
  });
  return { files, lightmapScale };
};
window.sceneReady = true;
